/**
 * Stand a real Deal Room up, and take it down again.
 *
 *   node scripts/deal-room-live-room.mjs build
 *   node scripts/deal-room-live-room.mjs remove
 *
 * ## Why this exists
 *
 * `e2e/deal-room-bridge.spec.ts` says, in its own words, that it photographs the
 * state gallery "because at Gate B the `deal_room_*` tables exist in no
 * database". That stopped being true on 31 July 2026: the schema is applied, the
 * loop completes end to end, and `npm run deal-room:negative-access` passes 97
 * assertions against it. The surfaces have still never been rendered against a
 * real room, and every defect the surface review found - an approver the
 * counterparty could not name, a Bridge that drew one person twice, a room that
 * said "2 participants" to somebody sitting alone - was the kind a person with
 * the page open would have seen in seconds.
 *
 * This builds the room those captures need: two real members, a published Deal,
 * an invitation, the four-agreement admission gate, an agreed procedure, an
 * evidence item taken through clarification and acceptance, and an open blocker.
 * Then it stops, and leaves the room standing.
 *
 * ## Its relationship to the proof fixture
 *
 * `deal-room-negative-access.mjs` is Gate C evidence and must not be disturbed to
 * serve a screenshot, so this is a separate script rather than a flag on that
 * one. It drives the same commands through the same member sessions - it is the
 * happy path with the refusals removed - and asserts nothing. **A failure here is
 * a broken fixture, not a finding.** Anything this discovers about the product
 * belongs in the proof fixture, as an assertion, before it is believed.
 *
 * ## What it writes
 *
 * `e2e/.deal-room-live.json`, gitignored: the ids the capture navigates to, and
 * the cookies that carry each member's session. The cookies are produced by
 * `@supabase/ssr` itself rather than hand-assembled, so their names, encoding and
 * chunking are whatever the installed version actually uses.
 *
 * **That file holds live session tokens for two throwaway `@example.invalid`
 * accounts.** It is gitignored, never printed, and `remove` deletes both the
 * accounts and the file.
 *
 * Environment: as `deal-room-negative-access.mjs`, including
 * SUPABASE_ACCESS_TOKEN and SUPABASE_PROJECT_REF for removal, and the same
 * deliberate PONTE_ALLOW_PRODUCTION_DB override.
 */

import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { existsSync, readFileSync, writeFileSync, rmSync } from "node:fs";

/* ------------------------------------------------------------------ */
/* Environment                                                         */
/* ------------------------------------------------------------------ */

if (existsSync(".env.local")) {
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
}

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const MANAGEMENT_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const PROJECT_REF = process.env.SUPABASE_PROJECT_REF;

if (!URL_ || !ANON || !SERVICE || !MANAGEMENT_TOKEN || !PROJECT_REF) {
  console.error(
    "Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,\n" +
      "SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ACCESS_TOKEN and SUPABASE_PROJECT_REF.\n\n" +
      "The last two are needed to REMOVE the room: deleting one cascades to\n" +
      "deal_room_activity_events, which is append-only to every application role.",
  );
  process.exit(2);
}

if (URL_.includes("cptglsmjmzcfpjndqfmc") && process.env.PONTE_ALLOW_PRODUCTION_DB !== "i-understand") {
  console.error(
    "Refusing to run against the production project.\n\n" +
      "This creates two accounts, a listing and a Deal Room, and LEAVES THEM\n" +
      "STANDING until `remove` is run. Set PONTE_ALLOW_PRODUCTION_DB=i-understand\n" +
      "to do that deliberately.",
  );
  process.exit(2);
}

const admin = createClient(URL_, SERVICE, { auth: { persistSession: false } });

const MANIFEST = "e2e/.deal-room-live.json";
const FIXTURE_MARKER = "Live-room capture fixture. Fictional.";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function must(result, what) {
  if (result.error) throw new Error(`${what}: ${result.error.message}`);
  return result.data;
}

function uuid(value) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(value))) {
    throw new Error(`refusing to interpolate a non-UUID into SQL: ${JSON.stringify(value)}`);
  }
  return value;
}

async function managementSql(sql) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${MANAGEMENT_TOKEN}` },
    body: JSON.stringify({ query: sql }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`management API HTTP ${res.status}: ${text.slice(0, 400)}`);
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/**
 * The cookies a browser needs to be this member.
 *
 * Produced by `@supabase/ssr` rather than assembled here, because the cookie
 * name, the `base64-` encoding and the chunk size are its business and have
 * changed between versions. Whatever it writes into the jar is what the app
 * will read back out.
 */
async function sessionCookies(session) {
  let jar = [];
  const client = createServerClient(URL_, ANON, {
    cookies: {
      getAll: () => jar,
      setAll: (list) => {
        for (const { name, value } of list) {
          jar = jar.filter((c) => c.name !== name).concat([{ name, value }]);
        }
      },
    },
  });
  const { error } = await client.auth.setSession({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
  });
  if (error) throw new Error(`could not encode the session: ${error.message}`);
  if (jar.length === 0) throw new Error("@supabase/ssr wrote no cookies; the capture would be anonymous");
  return jar;
}

async function member(label) {
  const email = `deal-room-live+${label}-${randomUUID()}@example.invalid`;
  const password = randomBytes(18).toString("base64url");

  const { data: created, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) throw new Error(`could not create ${label}: ${error.message}`);
  await admin.from("profiles").upsert({ id: created.user.id, full_name: label === "owner" ? "Marta Ferreira" : "Diego Alonso" });

  const client = createClient(URL_, ANON, { auth: { persistSession: false } });
  const signIn = await client.auth.signInWithPassword({ email, password });
  if (signIn.error) throw new Error(`could not sign in ${label}: ${signIn.error.message}`);

  return { id: created.user.id, email, client, session: signIn.data.session };
}

/* ------------------------------------------------------------------ */
/* Build                                                               */
/* ------------------------------------------------------------------ */

/**
 * Remove whatever was created, in the order the foreign keys allow.
 *
 * Shared by the failure path and by `remove`, because a build that dies half
 * way through must not strand rows either. The first version of the proof
 * fixture's teardown was never exercised, and the run that finally exercised it
 * put four accounts and two rooms into production permanently.
 */
async function removeCreated({ rooms = [], listings = [], users = [] }) {
  const problems = [];

  for (const roomId of rooms) {
    const guard = await managementSql(
      `select count(*)::int as n from public.deal_rooms r
         join public.listings l on l.id = r.listing_id
        where r.id = '${uuid(roomId)}' and l.details = '${FIXTURE_MARKER}'`,
    );
    if ((guard?.[0]?.n ?? 0) === 0) {
      problems.push(`room ${roomId} is not this fixture's room; refusing to delete it`);
      continue;
    }
    // A room cannot be deleted by any application role: the cascade reaches
    // `deal_room_activity_events`, which is append-only to everyone including
    // the service role. Same route as the proof fixture's teardown, and the
    // same reasoning - the ability to erase Deal Room history stays outside the
    // application, with whoever holds the management token.
    await managementSql(`
      begin;
      alter table public.deal_room_activity_events disable trigger deal_room_activity_append_only;
      delete from public.deal_room_activity_events where room_id = '${uuid(roomId)}';
      delete from public.deal_rooms where id = '${uuid(roomId)}';
      alter table public.deal_room_activity_events enable trigger deal_room_activity_append_only;
      commit;
    `);
  }

  for (const listingId of listings) {
    const { error } = await admin.from("listings").delete().eq("id", listingId);
    if (error) problems.push(`listing ${listingId}: ${error.message}`);
  }
  for (const userId of users) {
    const { error } = await admin.auth.admin.deleteUser(userId);
    if (error) problems.push(`user ${userId}: ${error.message}`);
  }

  const left = await managementSql(
    `select
       (select count(*)::int from public.deal_rooms where id in (${idList(rooms)})) as rooms,
       (select count(*)::int from public.listings where id in (${idList(listings)})) as listings,
       (select count(*)::int from auth.users where id in (${idList(users)})) as users,
       (select count(*)::int from public.deal_room_activity_events where room_id in (${idList(rooms)})) as activity`,
  );
  const stranded = Object.entries(left?.[0] ?? {}).filter(([, v]) => Number(v) > 0);
  return { problems, stranded };
}

/** A SQL id list that is still valid SQL when the array is empty. */
function idList(ids) {
  return ids.length ? ids.map((id) => `'${uuid(id)}'`).join(", ") : "null";
}

async function build() {
  const state = { users: [], listings: [], rooms: [] };
  try {
    return await assemble(state);
  } catch (err) {
    console.error(`\nBuild failed: ${err.message}\n\nRemoving what it had already created.`);
    const { problems, stranded } = await removeCreated(state);
    if (problems.length || stranded.length) {
      console.error(
        "AND THE CLEANUP DID NOT COMPLETE. The database still holds:\n" +
          stranded.map(([k, v]) => `  ${v} ${k}`).join("\n") +
          (problems.length ? `\n${problems.map((p) => `  - ${p}`).join("\n")}` : ""),
      );
    } else {
      console.error("Nothing was left behind.");
    }
    process.exit(1);
  }
}

async function assemble(state) {
  const owner = await member("owner");
  const counterparty = await member("counterparty");
  state.users.push(owner.id, counterparty.id);

  // A published Deal, from the reference prototype in the product contract
  // section 16. Every organisation named is fictional, which that section
  // requires.
  //
  // It has to be `approved`: `deal_room_propose` refuses anything else with
  // "Only a published Deal can be taken into a Deal Room", which is correct -
  // a room is opened on a Deal the market can see.
  //
  // But `lib/board/live-deals.ts` selects the live board on exactly that
  // status, and on 31 July 2026 a fixture listing left `approved` put two
  // fictional Deals in front of members for the length of a run. So it is
  // archived again the moment the room exists, a few milliseconds later. The
  // room keeps its own `deal_snapshot` and no Deal Room surface reads the
  // listing back, so nothing downstream notices.
  const listingId = randomUUID();
  must(
    await admin.from("listings").insert({
      id: listingId,
      ref: `LIVE-${listingId.slice(0, 8)}`,
      user_id: owner.id,
      type: "offer",
      product: "Refined cane sugar",
      details: FIXTURE_MARKER,
      status: "approved",
      market_family: "products",
      market_intent: "offer_product",
      quantity: 500,
      unit: "MT",
      origin_country: "BR",
      destination_country: "ES",
      flexibility: {},
    }),
    "seed the listing",
  );
  state.listings.push(listingId);

  const roomId = must(
    await owner.client.rpc("deal_room_propose", {
      p_listing_id: listingId,
      p_counterparty_profile: counterparty.id,
      p_counterparty_email: counterparty.email,
      p_counterparty_name: "Diego Alonso",
      p_counterparty_role: "Buyer",
      p_objective: "Agree terms and evidence for a first 500 MT shipment.",
      p_interest_route: "accepted_introduction",
      p_operating_mode: "ponte_observed",
      p_sub_room_purpose: "Commercial terms and capability evidence",
    }),
    "propose the room",
  );
  state.rooms.push(roomId);

  // Off the board again, now that the room holds its snapshot.
  must(await admin.from("listings").update({ status: "archived" }).eq("id", listingId), "archive the listing");

  const subRooms = must(await owner.client.from("deal_room_sub_rooms").select("id").eq("room_id", roomId), "read sub-rooms");
  const subRoomId = subRooms[0].id;

  // Invitation. The token is never persisted: only its hash reaches the
  // database, and the capture reaches the landing page by presenting it.
  const token = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(token, "utf8").digest("hex");
  must(
    await owner.client.rpc("deal_room_invite", {
      p_sub_room_id: subRoomId,
      p_token_sha256: tokenHash,
      p_expires_at: new Date(Date.now() + 8.64e7).toISOString(),
    }),
    "issue the invitation",
  );

  const participantId = must(
    await counterparty.client.rpc("deal_room_accept_invitation", { p_token_sha256: tokenHash }),
    "accept the invitation",
  );
  must(
    await counterparty.client.rpc("deal_room_declare_participation", {
      p_participant_id: participantId,
      p_org_name: "Iberia Importaciones SL",
      p_org_country: "ES",
      p_declared_capacity: "",
      p_role: "Buyer",
      p_authority: "Director, authorised to negotiate and commit.",
    }),
    "declare participation",
  );
  for (const kind of ["participation", "nda", "room_rules", "authority_declaration"]) {
    must(
      await counterparty.client.rpc("deal_room_accept_agreement", { p_participant_id: participantId, p_kind: kind }),
      `accept ${kind}`,
    );
  }
  must(await counterparty.client.rpc("deal_room_admit_participant", { p_participant_id: participantId }), "admit");

  // The procedure, agreed by both principals - which is only possible at all
  // since 20260731c.
  const steps = [
    { key: "admission_and_nda", seq: 1, stageLabel: "Admission", title: "Admission", completionCondition: "Admitted.", responsibleRole: "principal", weight: 10, mandatory: true, requiresEvidence: false, requiredReviewerRole: null },
    { key: "procedure_agreed", seq: 2, stageLabel: "Admission", title: "Procedure agreed", completionCondition: "Approved.", responsibleRole: "principal", weight: 12, mandatory: true, requiresEvidence: false, requiredReviewerRole: null },
    { key: "capability_evidence", seq: 3, stageLabel: "Evidence", title: "Capability evidenced", completionCondition: "Accepted.", responsibleRole: "principal", weight: 78, mandatory: true, requiresEvidence: true, requiredReviewerRole: "principal" },
  ];
  const procedureId = must(
    await owner.client.rpc("deal_room_propose_procedure", {
      p_room_id: roomId,
      p_sub_room_id: subRoomId,
      p_summary: "Evidence capability, then agree delivery terms.",
      p_completion: "Both principals confirm readiness to contract.",
      p_steps: steps,
    }),
    "propose the procedure",
  );
  must(await owner.client.rpc("deal_room_approve_procedure", { p_procedure_id: procedureId }), "owner approves");
  must(await counterparty.client.rpc("deal_room_approve_procedure", { p_procedure_id: procedureId }), "counterparty approves");

  // Evidence, taken through clarification and acceptance so the reviewer,
  // version and answered-question states all have something to render.
  const evidenceId = must(
    await counterparty.client.rpc("deal_room_submit_evidence", {
      p_sub_room_id: subRoomId,
      p_step_key: "capability_evidence",
      p_title: "Certificate of analysis",
      p_provenance: "member_uploaded",
      p_visibility: "sub_room",
      p_file_name: "certificate-of-analysis.pdf",
      p_mime: "application/pdf",
      p_size: 218_112,
      p_storage_path: `${roomId}/${subRoomId}/${randomUUID()}/1/certificate-of-analysis.pdf`,
      p_checksum: "a".repeat(64),
    }),
    "submit evidence",
  );
  const clarificationId = must(
    await owner.client.rpc("deal_room_request_clarification", {
      p_evidence_id: evidenceId,
      p_question: "Which laboratory issued this, and on what date was the sample drawn?",
    }),
    "request a clarification",
  );
  must(
    await counterparty.client.rpc("deal_room_answer_clarification", {
      p_clarification_id: clarificationId,
      p_answer: "Issued by Sondagem Inspecoes, sample drawn 12 July 2026. Corrected copy attached.",
      p_file_name: "certificate-of-analysis-v2.pdf",
      p_mime: "application/pdf",
      p_size: 221_004,
      p_storage_path: `${roomId}/${subRoomId}/${randomUUID()}/2/certificate-of-analysis-v2.pdf`,
      p_checksum: "b".repeat(64),
    }),
    "answer the clarification",
  );
  must(await owner.client.rpc("deal_room_accept_evidence_for_procedure", { p_evidence_id: evidenceId }), "accept evidence");

  // One open blocker, so the blockers surface is not empty.
  const blockerId = must(
    await owner.client.rpc("deal_room_open_blocker", {
      p_room_id: roomId,
      p_sub_room_id: subRoomId,
      p_step_key: "capability_evidence",
      p_title: "Destination port congestion",
      p_description: "Valencia berthing windows are quoted at 11 days. Confirm before fixing the laycan.",
      p_category: "operational",
      p_requirement: "A written berthing window from the receiving terminal.",
    }),
    "open a blocker",
  );

  const manifest = {
    note: "Live Deal Room for surface capture. Holds session tokens: gitignored, removed by `remove`.",
    roomId,
    subRoomId,
    procedureId,
    evidenceId,
    blockerId,
    participantId,
    invitationToken: token,
    listingId,
    users: state.users,
    owner: { profileId: owner.id, cookies: await sessionCookies(owner.session) },
    counterparty: { profileId: counterparty.id, cookies: await sessionCookies(counterparty.session) },
  };
  writeFileSync(MANIFEST, JSON.stringify(manifest, null, 1));

  // Ids only. No token, no cookie, no address.
  console.log(`
Live room standing.

  room       ${roomId}
  workspace  ${subRoomId}
  procedure  ${procedureId}
  evidence   ${evidenceId}
  blocker    ${blockerId}

  manifest   ${MANIFEST}  (gitignored, holds session cookies)

The dev or preview server must be started with:

  NEXT_PUBLIC_DEAL_ROOM=on
  DEAL_ROOM_ALLOWLIST=${manifest.owner.profileId},${manifest.counterparty.profileId}

Take it down with:  node scripts/deal-room-live-room.mjs remove
`);
}

/* ------------------------------------------------------------------ */
/* Remove                                                              */
/* ------------------------------------------------------------------ */

async function remove() {
  if (!existsSync(MANIFEST)) {
    console.error(`No ${MANIFEST}. Nothing to remove, or it was removed already.`);
    process.exit(2);
  }
  const manifest = JSON.parse(readFileSync(MANIFEST, "utf8"));

  const { problems, stranded } = await removeCreated({
    rooms: [manifest.roomId],
    listings: [manifest.listingId],
    users: manifest.users,
  });

  if (problems.length || stranded.length) {
    console.error(
      "REMOVAL INCOMPLETE. The database still holds:\n" +
        stranded.map(([k, v]) => `  ${v} ${k}`).join("\n") +
        (problems.length ? `\n\nErrors:\n${problems.map((p) => `  - ${p}`).join("\n")}` : "") +
        `\n\n${MANIFEST} has been kept so this can be retried.`,
    );
    process.exit(1);
  }

  rmSync(MANIFEST, { force: true });
  console.log("Room removed. Nothing left behind, and the session tokens are gone with the manifest.");
}

const command = process.argv[2];
if (command === "build") await build();
else if (command === "remove") await remove();
else {
  console.error("Usage: node scripts/deal-room-live-room.mjs build | remove");
  process.exit(2);
}
