"use server";

import { randomUUID, createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { dealRoomGate } from "@/lib/deal-room/queries";
import { mintInvitationToken } from "@/lib/deal-room/invitation";
import { templateFor, type MarketFamily } from "@/lib/deal-room/procedure";

/**
 * Every material state change in the Deal Room, as a server action.
 *
 * ## The shape, and why it is this one
 *
 * Each action does three things and nothing else: check the flag and the
 * allowlist, then call one `deal_room_*` command through the CALLER'S OWN
 * session client, then revalidate. The database function is where the authority
 * check, the state transition and the attributable activity event happen, in
 * one transaction.
 *
 * That matters because of what the owner review found in the first draft. There
 * were controls on the surfaces and command functions in the migration, and
 * nothing joined them: `Action` with no `formAction` and no surrounding form is
 * a submit button that submits nothing. Rendering a control is not wiring one.
 *
 * ## Why `.rpc()` and not table writes
 *
 * There are no member INSERT or UPDATE policies left on any Deal Room table.
 * A direct write from here would be refused, which is the point: the only way
 * in is a command, and a command cannot change state without recording it.
 *
 * The session client, never the service role. RLS applies to everything these
 * actions can see, and a command that the caller is not authorised for raises
 * inside Postgres rather than being prevented by this file.
 *
 * ## Errors
 *
 * A command raises with a message written for the member. It is returned as
 * `{ error }` for the surface to print, rather than thrown into an error
 * boundary: "Admission blocked: nda not yet accepted" is the answer to the
 * member's question, and a 500 page is not.
 */

async function gate(): Promise<{ profileId: string } | null> {
  const allowed = await dealRoomGate();
  return allowed ? { profileId: allowed.profileId } : null;
}

/** Turn a Postgres error into the sentence the member should read. */
function readable(error: { message?: string } | null): string {
  const message = (error?.message ?? "").trim();
  return message.length > 0 ? message : "That action could not be completed. Nothing has changed.";
}

/**
 * Report a refusal by sending the member back where they were, with the
 * command's own sentence.
 *
 * Every action here returns `void` and redirects, so the whole slice stays
 * server-rendered and no Deal Room surface needs client state. The alternative -
 * returning a result and reading it with `useFormState` - would make each of
 * these surfaces a client component for the sake of one string.
 *
 * The sentence comes from the database function, which is where the rule lives.
 * "Admission blocked: nda not yet accepted" answers the member's question;
 * an error boundary does not.
 */
function fail(returnTo: string, message: string): never {
  const separator = returnTo.includes("?") ? "&" : "?";
  redirect(`${returnTo}${separator}error=${encodeURIComponent(message)}`);
}

function returnTo(formData: FormData, fallback: string): string {
  const value = String(formData.get("returnTo") ?? "");
  // Same-site paths only. A returnTo taken from a form is attacker-controllable,
  // and an open redirect here would be a phishing surface on an authenticated
  // route.
  return value.startsWith("/") && !value.startsWith("//") ? value : fallback;
}

function room(locale: string, roomId: string): string {
  return `/${locale}/deal-rooms/${roomId}`;
}

/* ------------------------------------------------------------------ *
 * 1. Propose the room, its entitlement and the first private workspace
 * ------------------------------------------------------------------ */

export async function proposeRoom(formData: FormData): Promise<void> {
  if (!(await gate())) fail(returnTo(formData, "/"), "The Deal Room is not available to you.");
  const locale = String(formData.get("locale") ?? "en");

  const supabase = createClient();
  const back = returnTo(formData, `/${locale}/deal-rooms/propose`);
  const { data, error } = await supabase.rpc("deal_room_propose", {
    p_listing_id: String(formData.get("listingId") ?? ""),
    p_counterparty_profile: String(formData.get("counterpartyProfileId") ?? "") || null,
    p_counterparty_email: String(formData.get("counterpartyEmail") ?? ""),
    p_counterparty_name: String(formData.get("counterpartyName") ?? ""),
    p_counterparty_role: String(formData.get("counterpartyRole") ?? ""),
    p_objective: String(formData.get("objective") ?? ""),
    p_interest_route: String(formData.get("interestRoute") ?? "accepted_introduction"),
    p_operating_mode: String(formData.get("operatingMode") ?? "software_only"),
    p_sub_room_purpose: String(formData.get("subRoomPurpose") ?? "Counterparty negotiation"),
  });

  if (error) fail(back, readable(error));

  revalidatePath(`/${locale}/deal-rooms`);
  redirect(room(locale, String(data)));
}

/* ------------------------------------------------------------------ *
 * 2. The protected invitation
 * ------------------------------------------------------------------ */

export async function sendInvitation(formData: FormData): Promise<void> {
  const allowed = await gate();
  if (!allowed) fail(returnTo(formData, "/"), "The Deal Room is not available to you.");

  const locale = String(formData.get("locale") ?? "en");
  const roomId = String(formData.get("roomId") ?? "");
  const subRoomId = String(formData.get("subRoomId") ?? "");
  const back = returnTo(formData, `${room(locale, roomId)}/invitation`);

  /*
   * This action mints the token and nothing else.
   *
   * It used to build the invitation preview and the Integrity pre-flight here
   * and pass them as JSON. The owner review of 29 July 2026 found the hole in
   * that: the RPC is granted to `authenticated`, so a room administrator could
   * skip this file entirely and store fabricated "checked" facts, which the
   * invitee is then shown as Ponte's own Integrity statement.
   *
   * Both are now derived inside `deal_room_invite()` from `profiles`,
   * `organizations` and `verifications`, and the recipient's address comes from
   * the room's persisted intended counterparty rather than from a form field.
   * There is no email parameter to disagree with the room's own record.
   *
   * The role and the participant class went the same way in the owner final
   * review: the role is read from the room's proposal and the class is
   * `principal`, so this file no longer has an opinion about either.
   *
   * The raw token is the one thing that cannot come from the database: it must
   * never be stored, so it is generated here and only its digest is sent.
   */
  const minted = mintInvitationToken();

  const supabase = createClient();
  const { error } = await supabase.rpc("deal_room_invite", {
    p_sub_room_id: subRoomId,
    p_token_sha256: minted.tokenSha256,
    p_expires_at: minted.expiresAt.toISOString(),
  });

  if (error) fail(back, readable(error));

  revalidatePath(room(locale, roomId));
  // Shown once, to the sender, so they can pass it on. Never stored, never logged.
  redirect(`${room(locale, roomId)}/invitation?sent=${minted.token}`);
}

/* ------------------------------------------------------------------ *
 * 3. Acceptance, declaration, agreements, admission
 * ------------------------------------------------------------------ *
 *
 * THE FOUR ACTIONS IN THIS SECTION DO NOT CALL `gate()`, ON PURPOSE.
 *
 * An invited counterparty is not necessarily on `DEAL_ROOM_ALLOWLIST`. That is
 * the point of an invitation: the allowlist is a staged-rollout control over who
 * may *open* a Deal Room, not over who may be brought into one. Gating admission
 * would mean a pilot member could invite somebody who then could not accept, and
 * the invitation journey would be unusable for exactly as long as the rollout
 * was staged.
 *
 * They are not ungoverned. Each calls a SECURITY DEFINER command that proves the
 * caller is the person the invitation names, holds the invited address as a
 * confirmed email, and has accepted every current agreement before admission.
 * Row Level Security is the boundary; the flag is routing.
 *
 * `__tests__/action-gate.test.ts` holds this list, so a new action cannot join
 * it silently - adding one to the exception set is a deliberate edit with this
 * comment to answer to.
 *
 * The seven ordinary in-room actions below - approve, clarify, answer, accept
 * evidence, open and resolve a blocker, set read-only - had no such reason and
 * were simply not gated. Until 31 July 2026 that meant turning the flag off did
 * not stop them, which is the property Approval 4's rollback depends on.
 */

export async function acceptInvitation(formData: FormData): Promise<void> {
  const locale = String(formData.get("locale") ?? "en");
  const token = String(formData.get("token") ?? "");

  const supabase = createClient();
  const back = returnTo(formData, `/${locale}/deal-rooms/invitation/${token}`);
  const { data, error } = await supabase.rpc("deal_room_accept_invitation", {
    p_token_sha256: createHash("sha256").update(token, "utf8").digest("hex"),
  });

  if (error) fail(back, readable(error));

  revalidatePath(`/${locale}/deal-rooms`);
  redirect(`/${locale}/deal-rooms/invitation/${token}/admission?participant=${String(data)}`);
}

export async function declareParticipation(formData: FormData): Promise<void> {
  const supabase = createClient();
  const back = returnTo(formData, "/");
  const { error } = await supabase.rpc("deal_room_declare_participation", {
    p_participant_id: String(formData.get("participantId") ?? ""),
    p_org_name: String(formData.get("organisationName") ?? ""),
    p_org_country: String(formData.get("organisationCountry") ?? ""),
    p_declared_capacity: String(formData.get("declaredCapacity") ?? ""),
    p_role: String(formData.get("role") ?? ""),
    p_authority: String(formData.get("authority") ?? ""),
  });

  if (error) fail(back, readable(error));
  revalidatePath(`/${String(formData.get("locale") ?? "en")}/deal-rooms`);
}

/**
 * Accept one agreement.
 *
 * The version and the checksum come from `AGREEMENT_DOCUMENTS`, not from the
 * form: a client that could choose the version it accepted, or the hash
 * recorded against it, would make the record worthless. The member's action is
 * the assent; the identity of what they assented to is the server's to state.
 */
export async function acceptAgreement(formData: FormData): Promise<void> {
  const kind = String(formData.get("kind") ?? "");
  const back = returnTo(formData, "/");

  // No version and no checksum are sent. The command reads the canonical
  // document from `deal_room_agreement_documents`, which no member can write.
  // The first draft passed them from here, and because the RPC is granted to
  // `authenticated` a member could call it directly with any values they liked
  // and still satisfy admission. What this action supplies is the assent; the
  // identity of what was assented to is the database's to state.
  const supabase = createClient();
  const { error } = await supabase.rpc("deal_room_accept_agreement", {
    p_participant_id: String(formData.get("participantId") ?? ""),
    p_kind: kind,
  });

  if (error) fail(back, readable(error));
  revalidatePath(`/${String(formData.get("locale") ?? "en")}/deal-rooms`);
}

export async function completeAdmission(formData: FormData): Promise<void> {
  const locale = String(formData.get("locale") ?? "en");
  const supabase = createClient();
  const back = returnTo(formData, "/");
  const { error } = await supabase.rpc("deal_room_admit_participant", {
    p_participant_id: String(formData.get("participantId") ?? ""),
  });

  if (error) fail(back, readable(error));

  const roomId = String(formData.get("roomId") ?? "");
  revalidatePath(room(locale, roomId));
  redirect(room(locale, roomId));
}

/* ------------------------------------------------------------------ *
 * 4. Procedure
 * ------------------------------------------------------------------ */

export async function proposeProcedure(formData: FormData): Promise<void> {
  if (!(await gate())) fail(returnTo(formData, "/"), "The Deal Room is not available to you.");

  const locale = String(formData.get("locale") ?? "en");
  const roomId = String(formData.get("roomId") ?? "");
  const subRoomId = String(formData.get("subRoomId") ?? "") || null;
  const family = String(formData.get("family") ?? "products") as MarketFamily;

  const template = templateFor(family);

  const supabase = createClient();
  const back = returnTo(formData, `${room(locale, roomId)}/procedure`);
  const { error } = await supabase.rpc("deal_room_propose_procedure", {
    p_room_id: roomId,
    p_sub_room_id: subRoomId,
    p_summary: template.summary,
    p_completion: template.completionCondition,
    p_steps: template.steps,
  });

  if (error) fail(back, readable(error));
  revalidatePath(`${room(locale, roomId)}/procedure`);
}

export async function approveProcedure(formData: FormData): Promise<void> {
  if (!(await gate())) fail(returnTo(formData, "/"), "The Deal Room is not available to you.");
  const locale = String(formData.get("locale") ?? "en");
  const roomId = String(formData.get("roomId") ?? "");

  const supabase = createClient();
  const back = returnTo(formData, `${room(locale, roomId)}/procedure`);
  const { error } = await supabase.rpc("deal_room_approve_procedure", {
    p_procedure_id: String(formData.get("procedureId") ?? ""),
  });

  if (error) fail(back, readable(error));
  revalidatePath(`${room(locale, roomId)}/procedure`);
  revalidatePath(room(locale, roomId));
}

/* ------------------------------------------------------------------ *
 * 5. Evidence
 * ------------------------------------------------------------------ */

const MAX_EVIDENCE_BYTES = 26_214_400;
const ALLOWED_MIME = ["application/pdf", "image/png", "image/jpeg", "image/webp"];

/**
 * Upload the bytes, then record the metadata.
 *
 * The upload goes through the caller's session client, so the storage INSERT
 * policy decides whether it is allowed. Only if the object lands does the
 * command write the row - so a refused upload leaves no evidence record
 * claiming a file that is not there.
 */
async function uploadEvidenceObject(
  supabase: ReturnType<typeof createClient>,
  roomId: string,
  subRoomId: string,
  file: File,
): Promise<{ path: string; checksum: string } | { error: string }> {
  if (file.size === 0) return { error: "Choose a file to submit." };
  if (file.size > MAX_EVIDENCE_BYTES) return { error: "That file is larger than 25 MB." };
  if (!ALLOWED_MIME.includes(file.type)) {
    return { error: "Evidence must be a PDF, PNG, JPEG or WebP." };
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const checksum = createHash("sha256").update(bytes).digest("hex");
  const evidenceId = randomUUID();
  const path = `${roomId}/${subRoomId}/${evidenceId}/1/${file.name}`;

  const { error } = await supabase.storage
    .from("deal-room-evidence")
    .upload(path, bytes, { contentType: file.type, upsert: false });

  if (error) {
    // Never imply the evidence was submitted. The metadata is not written.
    return { error: "The file could not be uploaded, so nothing was submitted. Try again." };
  }
  return { path, checksum };
}

export async function submitEvidence(formData: FormData): Promise<void> {
  if (!(await gate())) fail(returnTo(formData, "/"), "The Deal Room is not available to you.");

  const locale = String(formData.get("locale") ?? "en");
  const roomId = String(formData.get("roomId") ?? "");
  const subRoomId = String(formData.get("subRoomId") ?? "");
  const file = formData.get("file");
  const back = returnTo(formData, `${room(locale, roomId)}/workspaces/${subRoomId}/evidence`);

  if (!(file instanceof File)) fail(back, "Choose a file to submit.");

  const supabase = createClient();
  const uploaded = await uploadEvidenceObject(supabase, roomId, subRoomId, file);
  if ("error" in uploaded) fail(back, uploaded.error);

  const { error } = await supabase.rpc("deal_room_submit_evidence", {
    p_sub_room_id: subRoomId,
    p_step_key: String(formData.get("stepKey") ?? ""),
    p_title: String(formData.get("title") ?? file.name),
    p_provenance: String(formData.get("provenance") ?? "member_uploaded"),
    p_visibility: String(formData.get("visibility") ?? "sub_room"),
    p_file_name: file.name,
    p_mime: file.type,
    p_size: file.size,
    p_storage_path: uploaded.path,
    p_checksum: uploaded.checksum,
  });

  if (error) fail(back, readable(error));
  revalidatePath(`${room(locale, roomId)}/workspaces/${subRoomId}/evidence`);
}

export async function requestClarification(formData: FormData): Promise<void> {
  if (!(await gate())) fail(returnTo(formData, "/"), "The Deal Room is not available to you.");
  const locale = String(formData.get("locale") ?? "en");
  const roomId = String(formData.get("roomId") ?? "");
  const subRoomId = String(formData.get("subRoomId") ?? "");

  const supabase = createClient();
  const back = returnTo(formData, `${room(locale, roomId)}/workspaces/${subRoomId}`);
  const { error } = await supabase.rpc("deal_room_request_clarification", {
    p_evidence_id: String(formData.get("evidenceId") ?? ""),
    p_question: String(formData.get("question") ?? ""),
  });

  if (error) fail(back, readable(error));
  revalidatePath(`${room(locale, roomId)}/workspaces/${subRoomId}/evidence/${String(formData.get("evidenceId"))}`);
}

/** Answer a clarification, optionally with the corrected file in the same act. */
export async function answerClarification(formData: FormData): Promise<void> {
  if (!(await gate())) fail(returnTo(formData, "/"), "The Deal Room is not available to you.");
  const locale = String(formData.get("locale") ?? "en");
  const roomId = String(formData.get("roomId") ?? "");
  const subRoomId = String(formData.get("subRoomId") ?? "");
  const evidenceId = String(formData.get("evidenceId") ?? "");
  const file = formData.get("file");
  const back = returnTo(formData, `${room(locale, roomId)}/workspaces/${subRoomId}/evidence/${evidenceId}`);

  const supabase = createClient();

  let path = "";
  let checksum = "";
  let fileName = "";
  let mime = "";
  let size = 0;

  if (file instanceof File && file.size > 0) {
    const uploaded = await uploadEvidenceObject(supabase, roomId, subRoomId, file);
  const back = returnTo(formData, `${room(locale, roomId)}/workspaces/${subRoomId}`);
    if ("error" in uploaded) fail(back, uploaded.error);
    path = uploaded.path;
    checksum = uploaded.checksum;
    fileName = file.name;
    mime = file.type;
    size = file.size;
  }

  const { error } = await supabase.rpc("deal_room_answer_clarification", {
    p_clarification_id: String(formData.get("clarificationId") ?? ""),
    p_answer: String(formData.get("answer") ?? ""),
    p_file_name: fileName,
    p_mime: mime,
    p_size: size,
    p_storage_path: path,
    p_checksum: checksum,
  });

  if (error) fail(back, readable(error));
  revalidatePath(`${room(locale, roomId)}/workspaces/${subRoomId}/evidence/${evidenceId}`);
}

export async function acceptEvidence(formData: FormData): Promise<void> {
  if (!(await gate())) fail(returnTo(formData, "/"), "The Deal Room is not available to you.");
  const locale = String(formData.get("locale") ?? "en");
  const roomId = String(formData.get("roomId") ?? "");
  const subRoomId = String(formData.get("subRoomId") ?? "");

  const supabase = createClient();
  const back = returnTo(formData, `${room(locale, roomId)}/workspaces/${subRoomId}`);
  const { error } = await supabase.rpc("deal_room_accept_evidence_for_procedure", {
    p_evidence_id: String(formData.get("evidenceId") ?? ""),
  });

  if (error) fail(back, readable(error));
  revalidatePath(`${room(locale, roomId)}/workspaces/${subRoomId}`);
  revalidatePath(room(locale, roomId));
}

/* ------------------------------------------------------------------ *
 * 6. Blockers, and read-only continuity
 * ------------------------------------------------------------------ */

export async function openBlocker(formData: FormData): Promise<void> {
  if (!(await gate())) fail(returnTo(formData, "/"), "The Deal Room is not available to you.");
  const locale = String(formData.get("locale") ?? "en");
  const roomId = String(formData.get("roomId") ?? "");
  const subRoomId = String(formData.get("subRoomId") ?? "");

  const supabase = createClient();
  const back = returnTo(formData, `${room(locale, roomId)}/workspaces/${subRoomId}/blockers`);
  const { error } = await supabase.rpc("deal_room_open_blocker", {
    p_room_id: roomId,
    p_sub_room_id: subRoomId || null,
    p_step_key: String(formData.get("stepKey") ?? ""),
    p_title: String(formData.get("title") ?? ""),
    p_description: String(formData.get("description") ?? ""),
    p_category: String(formData.get("category") ?? "material"),
    p_requirement: String(formData.get("requirement") ?? ""),
  });

  if (error) fail(back, readable(error));
  revalidatePath(`${room(locale, roomId)}/workspaces/${subRoomId}/blockers`);
  revalidatePath(room(locale, roomId));
}

export async function resolveBlocker(formData: FormData): Promise<void> {
  if (!(await gate())) fail(returnTo(formData, "/"), "The Deal Room is not available to you.");
  const locale = String(formData.get("locale") ?? "en");
  const roomId = String(formData.get("roomId") ?? "");
  const subRoomId = String(formData.get("subRoomId") ?? "");

  const supabase = createClient();
  const back = returnTo(formData, `${room(locale, roomId)}/workspaces/${subRoomId}/blockers`);
  const { error } = await supabase.rpc("deal_room_resolve_blocker", {
    p_blocker_id: String(formData.get("blockerId") ?? ""),
    p_note: String(formData.get("note") ?? ""),
  });

  if (error) fail(back, readable(error));
  revalidatePath(`${room(locale, roomId)}/workspaces/${subRoomId}/blockers`);
  revalidatePath(room(locale, roomId));
}

export async function setReadOnly(formData: FormData): Promise<void> {
  if (!(await gate())) fail(returnTo(formData, "/"), "The Deal Room is not available to you.");
  const locale = String(formData.get("locale") ?? "en");
  const roomId = String(formData.get("roomId") ?? "");

  const supabase = createClient();
  const back = returnTo(formData, `${room(locale, roomId)}`);
  const { error } = await supabase.rpc("deal_room_set_read_only", { p_room_id: roomId });

  if (error) fail(back, readable(error));
  revalidatePath(room(locale, roomId));
}
