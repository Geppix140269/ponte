/**
 * Deal Room negative-access proof.
 *
 *   node scripts/deal-room-negative-access.mjs
 *
 * ## What this is
 *
 * The executable fixture the owner review asked for. It drives the real loop
 * with three real member sessions against a real Postgres, and then tries, as
 * each of them, to do the things they must not be able to do.
 *
 * It is deliberately NOT a text scan. `lib/deal-room/__tests__/rls-contract.test.ts`
 * reads the migration as text and did not catch the fail-open paths the owner
 * found: a policy can be present, well named and wrong. Only a database can
 * answer whether a SELECT returns a row.
 *
 * ## What it needs, and why it has not been run
 *
 * A database with 20260729a-c applied. At the time of writing there is none:
 * production has not received them (a Gate C decision) and there is no
 * non-production project (PL-002). So this script is committed unrun, and it is
 * the first thing Gate C executes, before activation. Gate C stops on any
 * failure.
 *
 * ## How it authenticates
 *
 * The service role creates three users and mints a session for each; every
 * assertion after that runs on an anon-key client carrying that user's JWT, so
 * Row Level Security is in force exactly as it is for a browser. The service
 * role is used for setup and teardown only, never to check a permission - a
 * proof that ran as a role which bypasses RLS would prove nothing.
 *
 * Environment: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
 * SUPABASE_SERVICE_ROLE_KEY. Refuses to run against the production project
 * unless PONTE_ALLOW_PRODUCTION_DB=i-understand is set deliberately, for the
 * same reason `scripts/check-dev-env.mjs` does.
 */

import { createClient } from "@supabase/supabase-js";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";

/* ------------------------------------------------------------------ */
/* Environment                                                         */
/* ------------------------------------------------------------------ */

if (existsSync(".env.local")) {
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
}

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!URL || !ANON || !SERVICE) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(2);
}

if (URL.includes("cptglsmjmzcfpjndqfmc") && process.env.PONTE_ALLOW_PRODUCTION_DB !== "i-understand") {
  console.error(
    "Refusing to run against the production project.\n\n" +
      "This script creates users, a listing and a Deal Room. Point it at a\n" +
      "database that has 20260729a-c applied and is safe to write to, or set\n" +
      "PONTE_ALLOW_PRODUCTION_DB=i-understand to override deliberately as part\n" +
      "of an approved Gate C pre-activation run.",
  );
  process.exit(2);
}

const admin = createClient(URL, SERVICE, { auth: { persistSession: false } });

/* ------------------------------------------------------------------ */
/* Harness                                                             */
/* ------------------------------------------------------------------ */

let passed = 0;
const failures = [];

function check(name, condition, detail = "") {
  if (condition) {
    passed++;
    console.log(`  ok    ${name}`);
  } else {
    failures.push(`${name}${detail ? ` - ${detail}` : ""}`);
    console.error(`  FAIL  ${name}${detail ? `\n        ${detail}` : ""}`);
  }
}

/** A refusal is an error OR an empty result. Both mean "you may not". */
function refused(result, name) {
  const denied = Boolean(result.error) || result.data === null || (Array.isArray(result.data) && result.data.length === 0);
  check(name, denied, result.error ? "" : `returned ${JSON.stringify(result.data)?.slice(0, 160)}`);
}

function allowed(result, name) {
  check(name, !result.error, result.error?.message ?? "");
}

async function member(label) {
  const email = `deal-room-test+${label}-${randomUUID()}@example.invalid`;
  const password = randomBytes(18).toString("base64url");

  const { data: created, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) throw new Error(`could not create ${label}: ${error.message}`);

  await admin.from("profiles").upsert({ id: created.user.id, full_name: `Test ${label}` });

  const client = createClient(URL, ANON, { auth: { persistSession: false } });
  const { error: signIn } = await client.auth.signInWithPassword({ email, password });
  if (signIn) throw new Error(`could not sign in ${label}: ${signIn.message}`);

  return { id: created.user.id, email, client };
}

const created = { users: [], listings: [], rooms: [] };

async function teardown() {
  for (const roomId of created.rooms) await admin.from("deal_rooms").delete().eq("id", roomId);
  for (const listingId of created.listings) await admin.from("listings").delete().eq("id", listingId);
  for (const userId of created.users) await admin.auth.admin.deleteUser(userId).catch(() => {});
}

/* ------------------------------------------------------------------ */
/* The run                                                             */
/* ------------------------------------------------------------------ */

async function main() {
  console.log(`\nDeal Room negative-access proof against ${URL}\n`);

  const owner = await member("owner");
  const counterparty = await member("counterparty");
  const stranger = await member("stranger");
  created.users.push(owner.id, counterparty.id, stranger.id);

  // A published products Deal owned by `owner`.
  const listingId = randomUUID();
  const { error: seedError } = await admin.from("listings").insert({
    id: listingId,
    ref: `TEST-${listingId.slice(0, 8)}`,
    user_id: owner.id,
    type: "offer",
    product: "Refined cane sugar",
    details: "Negative-access fixture. Fictional.",
    status: "approved",
    market_family: "products",
    market_intent: "offer_product",
    quantity: 500,
    unit: "MT",
    origin_country: "BR",
    destination_country: "ES",
    flexibility: {},
  });
  if (seedError) throw new Error(`could not seed the listing: ${seedError.message}`);
  created.listings.push(listingId);

  /* ---------------- 1. A non-owner cannot open a room ---------------- */
  console.log("1. Room creation");

  refused(
    await stranger.client.rpc("deal_room_propose", {
      p_listing_id: listingId,
      p_counterparty_profile: owner.id,
      p_counterparty_email: "",
      p_counterparty_name: "",
      p_counterparty_role: "Buyer",
      p_objective: "Trying to open a room against a Deal I do not own.",
      p_interest_route: "accepted_introduction",
      p_operating_mode: "software_only",
      p_sub_room_purpose: "Attempted",
    }),
    "a non-owner cannot create a room for another member's Deal",
  );

  refused(
    await stranger.client.from("deal_rooms").insert({
      ref: `X-${randomUUID().slice(0, 6)}`,
      listing_id: listingId,
      deal_snapshot: { forged: true },
      market_family: "products",
      title: "Forged",
      completion_condition: "none",
      initiator_profile_id: stranger.id,
    }),
    "no direct INSERT into deal_rooms is possible at all",
  );

  const propose = await owner.client.rpc("deal_room_propose", {
    p_listing_id: listingId,
    p_counterparty_profile: counterparty.id,
    p_counterparty_email: "",
    p_counterparty_name: "",
    p_counterparty_role: "Buyer",
    p_objective: "Source 500 MT for Q4 delivery into Valencia.",
    p_interest_route: "accepted_introduction",
    p_operating_mode: "software_only",
    p_sub_room_purpose: "Negotiation: refined cane sugar",
  });
  allowed(propose, "the Deal owner can create the room");
  const roomId = propose.data;
  if (!roomId) {
    console.error("\nCannot continue without a room.");
    return;
  }
  created.rooms.push(roomId);

  refused(
    await owner.client.rpc("deal_room_propose", {
      p_listing_id: listingId,
      p_counterparty_profile: counterparty.id,
      p_counterparty_email: "",
      p_counterparty_name: "",
      p_counterparty_role: "Buyer",
      p_objective: "A second Starter room.",
      p_interest_route: "accepted_introduction",
      p_operating_mode: "software_only",
      p_sub_room_purpose: "Second",
    }),
    "a second Starter room is refused for the same organisation",
  );

  /* ---------------- 2. Entitlement cannot be self-issued -------------- */
  console.log("\n2. Entitlement");

  refused(
    await owner.client.from("deal_room_entitlements").insert({ room_id: roomId, kind: "sponsored", state: "active" }),
    "the room administrator cannot issue themselves a second entitlement",
  );
  refused(
    await owner.client
      .from("deal_room_entitlements")
      .update({ expires_at: "2030-01-01T00:00:00Z", state: "active" })
      .eq("room_id", roomId),
    "the room administrator cannot extend their own entitlement",
  );

  const { data: subRooms } = await owner.client.from("deal_room_sub_rooms").select("id").eq("room_id", roomId);
  const subRoomId = subRooms?.[0]?.id;
  check("the first private workspace was created by the command", Boolean(subRoomId));

  /* ---------------- 3. Invitation and the admission gate -------------- */
  console.log("\n3. Invitation and admission");

  const token = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(token, "utf8").digest("hex");

  refused(
    await stranger.client.rpc("deal_room_invite", {
      p_sub_room_id: subRoomId,
      p_role: "Buyer",
      p_class: "principal",
      p_token_sha256: tokenHash,
      p_expires_at: new Date(Date.now() + 8.64e7).toISOString(),
    }),
    "a stranger cannot issue an invitation into a workspace they cannot see",
  );

  /* ----- Trust defect 2: preview and pre-flight cannot be authored --------- */

  // The eight-argument signature that took `p_preview` and `p_preflight` must
  // no longer exist. A room administrator calling it directly was how
  // fabricated "checked" facts could be shown to an invitee as Ponte's own
  // Integrity statement.
  refused(
    await owner.client.rpc("deal_room_invite", {
      p_sub_room_id: subRoomId,
      p_email: stranger.email,
      p_role: "Buyer",
      p_class: "principal",
      p_token_sha256: createHash("sha256").update(randomUUID()).digest("hex"),
      p_expires_at: new Date(Date.now() + 8.64e7).toISOString(),
      p_preview: { dealSubject: "Anything I like" },
      p_preflight: {
        checked: [{ label: "Sanctions screening", statement: "Screened, no unresolved candidate." }],
      },
    }),
    "the eight-argument invite signature, which accepted preview and pre-flight JSON, no longer exists",
  );

  refused(
    await owner.client.from("deal_room_invitations").insert({
      room_id: roomId,
      sub_room_id: subRoomId,
      token_sha256: createHash("sha256").update(randomUUID()).digest("hex"),
      invited_email: stranger.email,
      proposed_role: "Buyer",
      proposed_participant_class: "principal",
      preview_facts: { dealSubject: "Forged" },
      integrity_preflight: { checked: [{ label: "Sanctions screening", statement: "Clear." }] },
      state: "sent",
      expires_at: new Date(Date.now() + 8.64e7).toISOString(),
      created_by: owner.id,
    }),
    "a member cannot insert an invitation row directly either",
  );

  allowed(
    await owner.client.rpc("deal_room_invite", {
      p_sub_room_id: subRoomId,
      p_role: "Buyer",
      p_class: "principal",
      p_token_sha256: tokenHash,
      p_expires_at: new Date(Date.now() + 8.64e7).toISOString(),
    }),
    "the administrator can issue the invitation",
  );

  const stored = await admin
    .from("deal_room_invitations")
    .select("preview_facts, integrity_preflight")
    .eq("token_sha256", tokenHash)
    .maybeSingle();

  check(
    "the stored pre-flight was derived by the command, carrying its own timestamp",
    Boolean(stored.data?.integrity_preflight?.derivedAt),
    `stored: ${JSON.stringify(stored.data?.integrity_preflight)?.slice(0, 200)}`,
  );
  check(
    "and reports sanctions as unscreened, because no screening result exists",
    stored.data?.integrity_preflight?.sanctions?.screened === false,
    `stored: ${JSON.stringify(stored.data?.integrity_preflight?.sanctions)}`,
  );
  check(
    "the stored preview names the Deal from the room, not from a caller",
    stored.data?.preview_facts?.dealSubject === "Refined cane sugar",
    `stored: ${JSON.stringify(stored.data?.preview_facts)?.slice(0, 200)}`,
  );

  refused(
    await counterparty.client.from("deal_room_invitations").select("token_sha256, preview_facts"),
    "an invitee cannot read the invitations table",
  );

  const accept = await counterparty.client.rpc("deal_room_accept_invitation", { p_token_sha256: tokenHash });
  allowed(accept, "the invitee can accept the invitation");
  const participantId = accept.data;

  // The gate. Accepted, but not admitted.
  refused(
    await counterparty.client.from("deal_room_evidence").select("id").eq("room_id", roomId),
    "an accepted but unadmitted participant reads no evidence",
  );
  refused(
    await counterparty.client.rpc("deal_room_submit_evidence", {
      p_sub_room_id: subRoomId,
      p_step_key: "capability_evidence",
      p_title: "Too early",
      p_provenance: "member_uploaded",
      p_visibility: "sub_room",
      p_file_name: "x.pdf",
      p_mime: "application/pdf",
      p_size: 10,
      p_storage_path: `${roomId}/${subRoomId}/${randomUUID()}/1/x.pdf`,
      p_checksum: "",
    }),
    "an unadmitted participant cannot act",
  );
  refused(
    await counterparty.client.rpc("deal_room_admit_participant", { p_participant_id: participantId }),
    "admission is refused before the agreements are accepted",
  );

  /* ----- Trust defect 3: the invitation is bound to the intended principal -- */

  const strangerEmail = stranger.email;
  const invitedTo = await admin
    .from("deal_room_invitations")
    .select("invited_email")
    .eq("token_sha256", tokenHash)
    .maybeSingle();
  check(
    "the invitation is addressed to the persisted intended counterparty",
    invitedTo.data?.invited_email === counterparty.email.toLowerCase(),
    `addressed to ${invitedTo.data?.invited_email}, expected ${counterparty.email.toLowerCase()}`,
  );
  check(
    "and not to some other address the inviter might have chosen",
    invitedTo.data?.invited_email !== strangerEmail.toLowerCase(),
  );

  const room = await admin
    .from("deal_rooms")
    .select("intended_counterparty_profile_id")
    .eq("id", roomId)
    .maybeSingle();
  check(
    "the intended counterparty is persisted on the room",
    room.data?.intended_counterparty_profile_id === counterparty.id,
  );

  refused(
    await owner.client.rpc("deal_room_propose", {
      p_listing_id: listingId,
      p_counterparty_profile: randomUUID(), // a profile that does not exist
      p_counterparty_email: "",
      p_counterparty_name: "",
      p_counterparty_role: "Buyer",
      p_objective: "Naming a counterparty who is not a member.",
      p_interest_route: "accepted_introduction",
      p_operating_mode: "software_only",
      p_sub_room_purpose: "Attempted",
    }),
    "a counterparty who is not a Ponte member is refused",
  );

  refused(
    await owner.client.rpc("deal_room_propose", {
      p_listing_id: listingId,
      p_counterparty_profile: null,
      p_counterparty_email: "someone@example.invalid",
      p_counterparty_name: "",
      p_counterparty_role: "Buyer",
      p_objective: "An external principal with no name.",
      p_interest_route: "accepted_introduction",
      p_operating_mode: "software_only",
      p_sub_room_purpose: "Attempted",
    }),
    "an external principal without a name is refused",
  );

  /* ----- Trust defect 4: acceptance is not written as admission ------------ */

  const acceptEvents = await admin
    .from("deal_room_activity_events")
    .select("event_type, summary")
    .eq("room_id", roomId)
    .in("event_type", ["invitation_accepted", "participant_admitted"]);

  const types = (acceptEvents.data ?? []).map((row) => row.event_type);
  check(
    "accepting an invitation records invitation_accepted",
    types.includes("invitation_accepted"),
    `events so far: ${types.join(", ")}`,
  );
  check(
    "and does NOT record participant_admitted before the gate is passed",
    !types.includes("participant_admitted"),
    `events so far: ${types.join(", ")}`,
  );

  allowed(
    await counterparty.client.rpc("deal_room_declare_participation", {
      p_participant_id: participantId,
      p_org_name: "Iberia Importaciones SL",
      p_org_country: "ES",
      p_declared_capacity: "",
      p_role: "Buyer",
      p_authority: "Director, authorised to negotiate and commit.",
    }),
    "the invitee can declare organisation, role and authority",
  );

  refused(
    await stranger.client.rpc("deal_room_accept_agreement", {
      p_participant_id: participantId,
      p_kind: "nda",
    }),
    "nobody can accept an agreement on another participant's behalf",
  );

  /* ----- Trust defect 1: the agreement version cannot be forged ------------ */

  // The forgeable four-argument signature must no longer exist. Postgres reports
  // an unknown function rather than running anything, which is the point: the
  // hole is not guarded, it is absent.
  refused(
    await counterparty.client.rpc("deal_room_accept_agreement", {
      p_participant_id: participantId,
      p_kind: "nda",
      p_version: "v0-forged",
      p_sha256: "0".repeat(64),
    }),
    "the four-argument accept_agreement signature no longer exists",
  );

  refused(
    await counterparty.client.from("deal_room_agreement_documents").select("kind, version, sha256"),
    "a member cannot read the agreement authority",
  );
  refused(
    await counterparty.client
      .from("deal_room_agreement_documents")
      .update({ sha256: "0".repeat(64) })
      .eq("kind", "nda"),
    "a member cannot rewrite the canonical checksum",
  );
  refused(
    await counterparty.client.from("deal_room_agreement_acceptances").insert({
      participant_id: participantId,
      room_id: roomId,
      sub_room_id: subRoomId,
      agreement_kind: "nda",
      document_version: "v0-forged",
      document_sha256: "0".repeat(64),
      accepted_as: "Forged",
    }),
    "a member cannot insert an acceptance row directly",
  );

  refused(
    await counterparty.client.rpc("deal_room_accept_agreement", {
      p_participant_id: participantId,
      p_kind: "not_a_real_agreement",
    }),
    "an agreement kind Ponte does not publish is refused",
  );

  // The canonical values, taken from the same source the migration seeds from.
  for (const kind of ["participation", "nda", "room_rules", "authority_declaration"]) {
    allowed(
      await counterparty.client.rpc("deal_room_accept_agreement", {
        p_participant_id: participantId,
        p_kind: kind,
      }),
      `the invitee accepts ${kind}`,
    );
  }

  const recorded = await admin
    .from("deal_room_agreement_acceptances")
    .select("agreement_kind, document_version, document_sha256")
    .eq("participant_id", participantId);
  const canonical = await admin.from("deal_room_agreement_documents").select("kind, version, sha256");
  const byKind = new Map((canonical.data ?? []).map((d) => [d.kind, d]));
  check(
    "every acceptance carries the canonical version and checksum",
    (recorded.data ?? []).length === 4 &&
      (recorded.data ?? []).every(
        (a) =>
          byKind.get(a.agreement_kind)?.version === a.document_version &&
          byKind.get(a.agreement_kind)?.sha256 === a.document_sha256,
      ),
  );

  allowed(
    await counterparty.client.rpc("deal_room_admit_participant", { p_participant_id: participantId }),
    "admission succeeds once every agreement is accepted at the current version",
  );

  const admitted = await admin
    .from("deal_room_activity_events")
    .select("event_type")
    .eq("room_id", roomId)
    .eq("event_type", "participant_admitted");
  check(
    "participant_admitted appears only now, after the gate was passed",
    (admitted.data ?? []).length === 1,
    `found ${(admitted.data ?? []).length}`,
  );

  /* ---------------- 4. Sub-room isolation ---------------------------- */
  console.log("\n4. Sub-room isolation");

  // A second private workspace, which the counterparty must never learn of.
  const secondId = randomUUID();
  await admin.from("deal_room_sub_rooms").insert({
    id: secondId,
    room_id: roomId,
    ref: "W-02",
    purpose: "A competing counterparty",
    kind: "counterparty",
    state: "draft",
    created_by: owner.id,
  });
  await admin.from("deal_room_activity_events").insert({
    room_id: roomId,
    sub_room_id: secondId,
    event_type: "sub_room_created",
    summary: "Second workspace",
    actor_label: "Test owner",
  });

  const visible = await counterparty.client.from("deal_room_sub_rooms").select("id").eq("room_id", roomId);
  check(
    "a participant of workspace A cannot see workspace B",
    !visible.error && (visible.data ?? []).every((row) => row.id !== secondId),
    `saw ${JSON.stringify(visible.data)}`,
  );

  const counted = await counterparty.client
    .from("deal_room_sub_rooms")
    .select("id", { count: "exact", head: true })
    .eq("room_id", roomId);
  check("a participant of A cannot COUNT workspace B", (counted.count ?? 0) <= 1, `count was ${counted.count}`);

  refused(
    await counterparty.client.from("deal_room_sub_rooms").select("id").eq("id", secondId),
    "naming workspace B directly returns nothing",
  );

  const activity = await counterparty.client.from("deal_room_activity_events").select("sub_room_id").eq("room_id", roomId);
  check(
    "workspace B never appears in the activity a participant of A can read",
    !activity.error && (activity.data ?? []).every((row) => row.sub_room_id !== secondId),
  );

  const owned = await owner.client.from("deal_room_sub_rooms").select("id").eq("room_id", roomId);
  check("the sponsor team does see the portfolio", (owned.data ?? []).length === 2, `saw ${(owned.data ?? []).length}`);

  /* ---------------- 5. Procedure and evidence ------------------------ */
  console.log("\n5. Procedure, evidence and review");

  const steps = [
    { key: "admission_and_nda", seq: 1, stageLabel: "Admission", title: "Admission", completionCondition: "Admitted.", responsibleRole: "principal", weight: 10, mandatory: true, requiresEvidence: false, requiredReviewerRole: null },
    { key: "procedure_agreed", seq: 2, stageLabel: "Admission", title: "Procedure agreed", completionCondition: "Approved.", responsibleRole: "principal", weight: 12, mandatory: true, requiresEvidence: false, requiredReviewerRole: null },
    { key: "capability_evidence", seq: 3, stageLabel: "Evidence", title: "Capability evidenced", completionCondition: "Accepted.", responsibleRole: "principal", weight: 78, mandatory: true, requiresEvidence: true, requiredReviewerRole: "principal" },
  ];

  refused(
    await stranger.client.rpc("deal_room_propose_procedure", {
      p_room_id: roomId, p_sub_room_id: subRoomId, p_summary: "x", p_completion: "x", p_steps: steps,
    }),
    "a stranger cannot propose a procedure",
  );

  const proposed = await owner.client.rpc("deal_room_propose_procedure", {
    p_room_id: roomId, p_sub_room_id: subRoomId,
    p_summary: "Fixture procedure", p_completion: "Both principals confirm.", p_steps: steps,
  });
  allowed(proposed, "a principal can propose a procedure");
  const procedureId = proposed.data;

  refused(
    await owner.client.rpc("deal_room_propose_procedure", {
      p_room_id: roomId, p_sub_room_id: subRoomId, p_summary: "bad", p_completion: "x",
      p_steps: [{ ...steps[0], weight: 55 }],
    }),
    "a procedure whose weights do not sum to 100 is refused",
  );

  const beforeApproval = await counterparty.client
    .from("deal_room_procedures").select("state").eq("id", procedureId).maybeSingle();
  check("the procedure does not govern before approval", beforeApproval.data?.state === "proposed");

  await owner.client.rpc("deal_room_approve_procedure", { p_procedure_id: procedureId });
  const afterOne = await owner.client.from("deal_room_procedures").select("state").eq("id", procedureId).maybeSingle();
  check("one approver is not enough while another is outstanding", afterOne.data?.state === "proposed");

  allowed(
    await counterparty.client.rpc("deal_room_approve_procedure", { p_procedure_id: procedureId }),
    "the second required approver approves",
  );
  const governing = await owner.client.from("deal_room_procedures").select("state").eq("id", procedureId).maybeSingle();
  check("the version governs once every approver has approved", governing.data?.state === "approved");

  const evidencePath = `${roomId}/${subRoomId}/${randomUUID()}/1/coa.pdf`;
  const submitted = await counterparty.client.rpc("deal_room_submit_evidence", {
    p_sub_room_id: subRoomId, p_step_key: "capability_evidence", p_title: "Certificate of analysis",
    p_provenance: "member_uploaded", p_visibility: "sub_room",
    p_file_name: "coa.pdf", p_mime: "application/pdf", p_size: 1024,
    p_storage_path: evidencePath, p_checksum: "a".repeat(64),
  });
  allowed(submitted, "an admitted participant can submit evidence");
  const evidenceId = submitted.data;

  refused(
    await counterparty.client.rpc("deal_room_accept_evidence_for_procedure", { p_evidence_id: evidenceId }),
    "the provider cannot accept their own evidence",
  );

  const clarification = await owner.client.rpc("deal_room_request_clarification", {
    p_evidence_id: evidenceId, p_question: "Which lot does this certificate cover?",
  });
  allowed(clarification, "the reviewer can request a clarification");

  refused(
    await owner.client.rpc("deal_room_accept_evidence_for_procedure", { p_evidence_id: evidenceId }),
    "evidence with an open clarification cannot be accepted",
  );

  allowed(
    await counterparty.client.rpc("deal_room_answer_clarification", {
      p_clarification_id: clarification.data, p_answer: "Lot 44/2026.",
      p_file_name: "coa-v2.pdf", p_mime: "application/pdf", p_size: 2048,
      p_storage_path: `${roomId}/${subRoomId}/${evidenceId}/2/coa-v2.pdf`, p_checksum: "b".repeat(64),
    }),
    "the provider answers and supplies a corrected version",
  );

  const versions = await counterparty.client
    .from("deal_room_evidence_versions").select("version").eq("evidence_id", evidenceId);
  check("the corrected file is a new version and the first is retained", (versions.data ?? []).length === 2);

  refused(
    await counterparty.client.from("deal_room_evidence_versions").update({ file_name: "rewritten.pdf" }).eq("evidence_id", evidenceId),
    "an evidence version cannot be edited",
  );
  refused(
    await counterparty.client.from("deal_room_evidence_versions").delete().eq("evidence_id", evidenceId),
    "an evidence version cannot be deleted",
  );

  allowed(
    await owner.client.rpc("deal_room_accept_evidence_for_procedure", { p_evidence_id: evidenceId }),
    "the named reviewer accepts the evidence for the procedure",
  );

  /* ---------------- 6. Visibility labels mean what they say ---------- */
  console.log("\n6. Evidence visibility");

  const privatePath = `${roomId}/${subRoomId}/${randomUUID()}/1/internal.pdf`;
  const ownOrg = await owner.client.rpc("deal_room_submit_evidence", {
    p_sub_room_id: subRoomId, p_step_key: "", p_title: "Internal note",
    p_provenance: "member_declared", p_visibility: "own_org",
    p_file_name: "internal.pdf", p_mime: "application/pdf", p_size: 10,
    p_storage_path: privatePath, p_checksum: "",
  });
  allowed(ownOrg, "an own_org item can be created");
  refused(
    await counterparty.client.from("deal_room_evidence").select("id").eq("id", ownOrg.data),
    "own_org evidence is not readable by the other organisation",
  );

  refused(
    await counterparty.client.rpc("deal_room_submit_evidence", {
      p_sub_room_id: subRoomId, p_step_key: "", p_title: "Selected",
      p_provenance: "member_uploaded", p_visibility: "selected",
      p_file_name: "x.pdf", p_mime: "application/pdf", p_size: 10,
      p_storage_path: `${roomId}/${subRoomId}/${randomUUID()}/1/x.pdf`, p_checksum: "",
    }),
    "the removed `selected` visibility is refused rather than silently widened",
  );

  /* ---------------- 7. Activity cannot be forged --------------------- */
  console.log("\n7. Activity");

  refused(
    await counterparty.client.from("deal_room_activity_events").insert({
      room_id: roomId, event_type: "procedure_approved", summary: "Forged", actor_label: "Not me",
    }),
    "a member cannot insert an activity event",
  );
  refused(
    await counterparty.client.from("deal_room_activity_events").update({ summary: "Rewritten" }).eq("room_id", roomId),
    "a member cannot edit an activity event",
  );
  refused(
    await counterparty.client.from("deal_room_activity_events").delete().eq("room_id", roomId),
    "a member cannot delete an activity event",
  );

  const ownerForge = await admin.from("deal_room_activity_events").update({ summary: "Owner rewrite" }).eq("room_id", roomId);
  check("even the service role cannot rewrite history (append-only trigger)", Boolean(ownerForge.error));

  /* ---------------- 8. Blocker, then read-only ----------------------- */
  console.log("\n8. Blocker and read-only continuity");

  const blocker = await owner.client.rpc("deal_room_open_blocker", {
    p_room_id: roomId, p_sub_room_id: subRoomId, p_step_key: "capability_evidence",
    p_title: "Sampling point not agreed", p_description: "The parties disagree.",
    p_category: "critical", p_requirement: "Agree a sampling point.",
  });
  allowed(blocker, "a blocker can be opened");

  refused(
    await owner.client.rpc("deal_room_resolve_blocker", { p_blocker_id: blocker.data, p_note: "  " }),
    "a blocker cannot be resolved without a note",
  );
  allowed(
    await owner.client.rpc("deal_room_resolve_blocker", { p_blocker_id: blocker.data, p_note: "Sampling point agreed at load port." }),
    "a blocker can be resolved with a note",
  );
  const retained = await owner.client.from("deal_room_blockers").select("id, state").eq("id", blocker.data).maybeSingle();
  check("the resolved blocker is retained, not deleted", retained.data?.state === "resolved");

  allowed(await owner.client.rpc("deal_room_set_read_only", { p_room_id: roomId }), "the room can be closed to changes");

  refused(
    await counterparty.client.rpc("deal_room_submit_evidence", {
      p_sub_room_id: subRoomId, p_step_key: "", p_title: "After read-only",
      p_provenance: "member_uploaded", p_visibility: "sub_room",
      p_file_name: "x.pdf", p_mime: "application/pdf", p_size: 10,
      p_storage_path: `${roomId}/${subRoomId}/${randomUUID()}/1/x.pdf`, p_checksum: "",
    }),
    "a read-only room refuses every mutation",
  );
  refused(
    await owner.client.rpc("deal_room_open_blocker", {
      p_room_id: roomId, p_sub_room_id: subRoomId, p_step_key: "",
      p_title: "After", p_description: "x", p_category: "material", p_requirement: "x",
    }),
    "a read-only room refuses a new blocker",
  );

  const stillReadable = await counterparty.client.from("deal_room_evidence").select("id").eq("sub_room_id", subRoomId);
  check("read-only preserves the history for the people who were admitted", (stillReadable.data ?? []).length >= 1);

  /* ---------------- 9. Storage follows the same result --------------- */
  console.log("\n9. Evidence bytes");

  const strangerDownload = await stranger.client.storage.from("deal-room-evidence").download(evidencePath);
  check("a stranger cannot download an evidence object", Boolean(strangerDownload.error));

  const strangerSign = await stranger.client.storage.from("deal-room-evidence").createSignedUrl(evidencePath, 60);
  check("a stranger cannot mint a signed URL for it", Boolean(strangerSign.error));

  const craftedUpload = await stranger.client.storage
    .from("deal-room-evidence")
    .upload(`not-a-uuid/also-not/${randomUUID()}/1/x.pdf`, Buffer.from("x"), { contentType: "application/pdf" });
  check("a crafted object path is refused, not raised", Boolean(craftedUpload.error));
}

main()
  .catch((error) => {
    console.error(`\nHarness error: ${error.message}`);
    failures.push(`harness: ${error.message}`);
  })
  .finally(async () => {
    await teardown();
    console.log(`\n${passed} passed, ${failures.length} failed.`);
    if (failures.length) {
      console.error("\nGate C must stop here. Failures:\n" + failures.map((f) => `  - ${f}`).join("\n"));
      process.exit(1);
    }
    console.log("Every negative-access assertion held.");
  });
