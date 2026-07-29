"use server";

import { randomUUID, createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { dealRoomGate } from "@/lib/deal-room/queries";
import { buildPreview, mintInvitationToken } from "@/lib/deal-room/invitation";
import { integrityPreflight, sanctionsPositionFrom } from "@/lib/deal-room/integrity";
import { templateFor, type MarketFamily } from "@/lib/deal-room/procedure";
import { AGREEMENT_DOCUMENTS } from "@/lib/deal-room/agreements";

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
  const email = String(formData.get("email") ?? "");
  const role = String(formData.get("role") ?? "Principal counterparty");

  const supabase = createClient();

  // The pre-flight snapshot travels with the invitation, so what was known at
  // the moment of sending stays readable afterwards. Sanctions state is derived
  // from real screening rows; when none exists it reports as unproved.
  const { data: me } = await supabase
    .from("profiles")
    .select("full_name, country, verification_level, organizations(name, country)")
    .eq("id", allowed.profileId)
    .maybeSingle();

  const { data: verifications } = await supabase
    .from("verifications")
    .select("type, status, created_at, sanctions_hits, rescreened_at")
    .eq("user_id", allowed.profileId)
    .order("created_at", { ascending: false })
    .limit(10);

  const { data: roomRow } = await supabase
    .from("deal_rooms")
    .select("title, market_family, deal_snapshot")
    .eq("id", roomId)
    .maybeSingle();

  const rows = (verifications ?? []) as Record<string, unknown>[];
  const organisationName = ((me?.organizations as { name?: string } | null)?.name as string) ?? null;
  const back = returnTo(formData, `${room(locale, roomId)}/invitation`);

  const preflight = integrityPreflight({
    organisationName,
    declaredCapacity: organisationName ? null : ((me?.full_name as string | null) ?? null),
    jurisdiction:
      ((me?.organizations as { country?: string } | null)?.country as string) ?? ((me?.country as string | null) ?? null),
    verificationLevel: ((me?.verification_level as string) ?? "unverified") as
      | "unverified"
      | "identity_verified"
      | "company_verified",
    verificationEvidence: rows.map((row) => ({
      kind: (row.type as string) ?? "check",
      source: "Ponte verification",
      result:
        row.status === "verified" ? ("passed" as const)
          : row.status === "rejected" ? ("failed" as const)
            : ("in_review" as const),
      checkedAt: String(row.created_at ?? "").slice(0, 10),
    })),
    dealOriginCountry:
      ((roomRow?.deal_snapshot as Record<string, unknown> | null)?.origin_country as string | null) ?? null,
    declaredRole: role,
    authorityDeclared: true,
    sanctions: sanctionsPositionFrom(
      rows.map((row) => ({
        sanctionsHits: row.sanctions_hits,
        rescreenedAt: (row.rescreened_at as string | null) ?? null,
        createdAt: String(row.created_at ?? ""),
      })),
    ),
  });

  if (preflight.action.clarificationFirst) {
    fail(back, "Resolve the sanctions screening candidate before inviting this participant.");
  }

  const minted = mintInvitationToken();
  const preview = buildPreview({
    invitingOrganisation: organisationName ?? ((me?.full_name as string | null) ?? "The inviting organisation"),
    dealSubject: String((roomRow?.deal_snapshot as Record<string, unknown> | null)?.subject ?? roomRow?.title ?? ""),
    marketFamily: (roomRow?.market_family as MarketFamily) ?? "products",
    proposedRole: role,
    proposedParticipantClass: "principal",
    roomSponsor: organisationName ?? ((me?.full_name as string | null) ?? "The inviting organisation"),
    expiresAt: minted.expiresAt,
  });

  const { error } = await supabase.rpc("deal_room_invite", {
    p_sub_room_id: subRoomId,
    p_email: email,
    p_role: role,
    p_class: "principal",
    p_token_sha256: minted.tokenSha256,
    p_expires_at: minted.expiresAt.toISOString(),
    p_preview: preview,
    p_preflight: preflight,
  });

  if (error) fail(back, readable(error));

  revalidatePath(room(locale, roomId));
  // The raw token is returned once, to the sender, so they can pass it on. It
  // is not stored and never appears in a log line.
  redirect(`${room(locale, roomId)}/invitation?sent=${minted.token}`);
}

/* ------------------------------------------------------------------ *
 * 3. Acceptance, declaration, agreements, admission
 * ------------------------------------------------------------------ */

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
  const document = AGREEMENT_DOCUMENTS[kind as keyof typeof AGREEMENT_DOCUMENTS];
  const back = returnTo(formData, "/");
  if (!document) fail(back, "Unknown agreement.");

  const supabase = createClient();
  const { error } = await supabase.rpc("deal_room_accept_agreement", {
    p_participant_id: String(formData.get("participantId") ?? ""),
    p_kind: kind,
    p_version: document.version,
    p_sha256: document.sha256,
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
  const locale = String(formData.get("locale") ?? "en");
  const roomId = String(formData.get("roomId") ?? "");

  const supabase = createClient();
  const back = returnTo(formData, `${room(locale, roomId)}`);
  const { error } = await supabase.rpc("deal_room_set_read_only", { p_room_id: roomId });

  if (error) fail(back, readable(error));
  revalidatePath(room(locale, roomId));
}
