// The contract between the TypeScript domain and the migration SQL.
//
// Run: npx tsx lib/deal-room/__tests__/rls-contract.test.ts
//
// ## Why this file exists
//
// Two failure modes, both silent, both expensive.
//
// **Vocabulary drift.** A state added in `states.ts` and not in the CHECK
// constraint produces a row the application believes it wrote and Postgres
// refused. A value in the constraint and not in `states.ts` produces a row
// nothing can render. Neither shows up in a type check, and neither shows up
// until it happens to a real member.
//
// **A security property quietly removed.** "No member INSERT policy on the
// activity table" and "no UPDATE policy on evidence versions" are invariants,
// not preferences. They are one careless `create policy` away from being
// untrue, and nothing else in the repository would notice.
//
// ## What it cannot do
//
// It reads SQL as text. It does not execute anything, and it is not a
// substitute for testing the policies against a running Postgres with two real
// member sessions - which is a Gate C verification step, because no
// non-production database exists to run it against (PL-002) and applying SQL to
// production is prohibited until the owner approves it.
//
// A textual contract test is worth having anyway: it catches the drift class
// cheaply and on every run, which is exactly when drift is introduced.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  AGREEMENT_KINDS,
  BLOCKER_CATEGORIES,
  BLOCKER_STATES,
  CLARIFICATION_STATES,
  ENTITLEMENT_KINDS,
  ENTITLEMENT_STATES,
  EVIDENCE_PROVENANCES,
  EVIDENCE_STATES,
  EVIDENCE_VISIBILITIES,
  INVITATION_STATES,
  OPERATING_MODES,
  PARTICIPANT_CLASSES,
  PARTICIPANT_STATES,
  PROCEDURE_STATES,
  ROOM_STATES,
  STEP_STATES,
  SUB_ROOM_KINDS,
  SUB_ROOM_STATES,
  APPROVAL_RESPONSES,
} from "../states";
import { ACTIVITY_EVENT_TYPES } from "../activity";

let passed = 0;
function test(name: string, fn: () => void): void {
  try {
    fn();
    passed++;
  } catch (err) {
    console.error(`FAIL  ${name}`);
    console.error(`      ${(err as Error).message}`);
    process.exitCode = 1;
  }
}

const core = readFileSync("supabase/migrations/20260729a_deal_room_core.sql", "utf8");
const rls = readFileSync("supabase/migrations/20260729b_deal_room_rls.sql", "utf8");
const storage = readFileSync("supabase/migrations/20260729c_deal_room_storage.sql", "utf8");
const all = core + rls + storage;

/**
 * SQL with its comments removed.
 *
 * The "must not contain" assertions below are about what the database is asked
 * to DO, not about what the file says. These migrations explain themselves at
 * length - why the orphan `ponte-deal-docs` bucket is left alone, that there is
 * no Stripe identifier anywhere, that Supabase grants privileges to `anon` by
 * default and RLS is what closes them - and every one of those sentences would
 * otherwise fail the very check it exists to describe.
 *
 * Scanning the executable text keeps the invariant strict while letting the
 * files stay explicit about their own reasoning.
 */
function executable(sql: string): string {
  return sql.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/--[^\n]*/g, " ");
}

const coreSql = executable(core);
const rlsSql = executable(rls);
const storageSql = executable(storage);
const allSql = coreSql + rlsSql + storageSql;

const TABLES = [
  "deal_rooms",
  "deal_room_entitlements",
  "deal_room_sub_rooms",
  "deal_room_participants",
  "deal_room_invitations",
  "deal_room_agreement_acceptances",
  "deal_room_procedures",
  "deal_room_procedure_steps",
  "deal_room_procedure_approvals",
  "deal_room_evidence",
  "deal_room_evidence_versions",
  "deal_room_clarifications",
  "deal_room_blockers",
  "deal_room_activity_events",
];

// ---------------------------------------------------------------------------
// Vocabulary: every TypeScript value appears in the SQL
// ---------------------------------------------------------------------------

const VOCABULARIES: [string, readonly string[]][] = [
  ["room state", ROOM_STATES],
  ["sub-room state", SUB_ROOM_STATES],
  ["sub-room kind", SUB_ROOM_KINDS],
  ["participant state", PARTICIPANT_STATES],
  ["participant class", PARTICIPANT_CLASSES],
  ["entitlement state", ENTITLEMENT_STATES],
  ["entitlement kind", ENTITLEMENT_KINDS],
  ["procedure state", PROCEDURE_STATES],
  ["step state", STEP_STATES],
  ["approval response", APPROVAL_RESPONSES],
  ["evidence state", EVIDENCE_STATES],
  ["evidence visibility", EVIDENCE_VISIBILITIES],
  ["evidence provenance", EVIDENCE_PROVENANCES],
  ["clarification state", CLARIFICATION_STATES],
  ["blocker state", BLOCKER_STATES],
  ["blocker category", BLOCKER_CATEGORIES],
  ["agreement kind", AGREEMENT_KINDS],
  ["invitation state", INVITATION_STATES],
  ["operating mode", OPERATING_MODES],
];

for (const [name, values] of VOCABULARIES) {
  test(`${name}: every value is in a CHECK constraint`, () => {
    for (const value of values) {
      assert.ok(
        core.includes(`'${value}'`),
        `'${value}' is in the ${name} vocabulary but nowhere in the core migration. A row carrying it would be refused by Postgres.`,
      );
    }
  });
}

test("every activity event type the application can write is a plain text column, not a constraint", () => {
  // Deliberate: the event vocabulary is closed in TypeScript
  // (`ACTIVITY_EVENT_TYPES`) rather than in a CHECK, so adding an event does
  // not need a production migration. The closure that matters is that only the
  // command functions can insert at all.
  assert.ok(ACTIVITY_EVENT_TYPES.length > 0);
  assert.ok(/event_type\s+text not null/.test(core));
});

// ---------------------------------------------------------------------------
// Structure
// ---------------------------------------------------------------------------

for (const table of TABLES) {
  test(`${table}: created and RLS enabled`, () => {
    assert.ok(core.includes(`create table if not exists public.${table}`), `${table} is not created`);
    assert.ok(
      new RegExp(`alter table public\\.${table}\\s+enable row level security`).test(rls),
      `${table} does not have RLS enabled`,
    );
  });
}

test("all fourteen tables, no more and no fewer", () => {
  const created = Array.from(core.matchAll(/create table if not exists public\.(\w+)/g)).map((m) => m[1]);
  assert.deepEqual(created.sort(), [...TABLES].sort());
});

// ---------------------------------------------------------------------------
// The security invariants
// ---------------------------------------------------------------------------

test("no policy anywhere grants anything to anon", () => {
  assert.ok(!/to\s+anon\b/i.test(allSql), "a Deal Room policy names the anon role");
  assert.ok(!/grant[^;]*to\s+anon\b/i.test(allSql));
});

test("the activity table has no member INSERT, UPDATE or DELETE policy", () => {
  const policies = Array.from(rls.matchAll(/create policy\s+"([^"]+)"\s+on\s+public\.deal_room_activity_events\s+for\s+(\w+)/g));
  const commands = policies.map((m) => m[2].toLowerCase());
  assert.deepEqual(commands, ["select"], `activity policies found: ${commands.join(", ")}`);
});

test("the activity table is append-only against the table owner too", () => {
  assert.ok(core.includes("deal_room_events_append_only"), "the append-only trigger function is missing");
  assert.ok(
    /create trigger deal_room_activity_append_only\s+before update or delete on public\.deal_room_activity_events/.test(
      core,
    ),
    "the append-only trigger is not attached to UPDATE and DELETE",
  );
});

/**
 * The invariant the owner review of 29 July 2026 introduced.
 *
 * Members hold SELECT and nothing else, on every one of the fourteen tables.
 * Every material change runs through a SECURITY DEFINER command that checks
 * authority, performs the transition and writes the activity event in one
 * transaction.
 *
 * This is written as a blanket rule rather than table by table because it is
 * the assertion that would have caught the original `deal_rooms` INSERT policy,
 * the one that let any authenticated member open a room against somebody else's
 * published Deal. A new write policy on any Deal Room table now fails here and
 * has to be argued for.
 */
test("no member INSERT, UPDATE or DELETE policy exists on ANY Deal Room table", () => {
  const writes = Array.from(
    rlsSql.matchAll(/create policy\s+"([^"]+)"\s+on\s+public\.(deal_rooms|deal_room\w*)\s+for\s+(insert|update|delete)/gi),
  ).map((m) => `${m[2]}: "${m[1]}" (${m[3].toLowerCase()})`);

  assert.deepEqual(
    writes,
    [],
    "a direct member write policy reappeared. Material state changes go through the command functions, which is what keeps the activity event atomic with the change it records.",
  );
});

test("every table has a read policy and nothing but read policies", () => {
  for (const table of TABLES) {
    const commands = Array.from(
      rlsSql.matchAll(new RegExp(`create policy\\s+"([^"]+)"\\s+on\\s+public\\.${table}\\s+for\\s+(\\w+)`, "g")),
    ).map((m) => m[2].toLowerCase());
    assert.ok(commands.length > 0, `${table} has no policy at all, so nobody can read it`);
    assert.deepEqual(
      Array.from(new Set(commands)),
      ["select"],
      `${table} carries a non-select policy: ${commands.join(", ")}`,
    );
  }
});

test("the first draft's write policies are explicitly dropped, not merely absent", () => {
  // A database that received the earlier draft must be corrected by running
  // this file, not by being rebuilt.
  for (const name of [
    "deal room create",
    "entitlement create",
    "participant self progress",
    "evidence author edit",
    "step advance state",
    "blocker update",
  ]) {
    assert.ok(rlsSql.includes(`drop policy if exists "${name}"`), `the earlier policy '${name}' is not dropped`);
  }
});

test("invitations have no member SELECT policy beyond the administrator's", () => {
  const selects = Array.from(rls.matchAll(/create policy\s+"([^"]+)"\s+on\s+public\.deal_room_invitations\s+for\s+select/g)).map((m) => m[1]);
  assert.deepEqual(selects, ["invitation administer read"]);
});

test("the sub-room read policy is the isolation boundary", () => {
  const match = /create policy "sub room read" on public\.deal_room_sub_rooms\s+for select to authenticated\s+using \(([\s\S]*?)\);/.exec(
    rls,
  );
  assert.ok(match, "the sub-room read policy is missing");
  const predicate = match![1];
  assert.ok(predicate.includes("deal_room_is_sub_room_participant(id)"));
  assert.ok(predicate.includes("deal_room_can_administer(room_id)"));
});

test("every helper predicate pins its search_path and is SECURITY DEFINER", () => {
  for (const fn of [
    "deal_room_is_sub_room_participant",
    "deal_room_is_master_participant",
    "deal_room_can_administer",
    "deal_room_is_writable",
    "deal_room_can_read_evidence",
  ]) {
    const body = new RegExp(`create or replace function public\\.${fn}[\\s\\S]*?as \\$\\$`).exec(rls);
    assert.ok(body, `${fn} is missing`);
    assert.ok(body![0].includes("security definer"), `${fn} is not SECURITY DEFINER`);
    assert.ok(body![0].includes("set search_path = public, pg_temp"), `${fn} does not pin search_path`);
  }
});

test("only admitted and active participants satisfy the membership predicates", () => {
  // The single most important string in the whole migration. If this ever
  // included 'terms_pending', a person who had not accepted the NDA would be
  // inside the room.
  const matches = Array.from(rls.matchAll(/state in \('admitted','active'\)/g));
  assert.ok(matches.length >= 5, `expected the admitted/active test throughout, found ${matches.length}`);
  assert.ok(
    !/state in \([^)]*'terms_pending'[^)]*\)\s*\)?\s*;?\s*\$\$/.test(rls),
    "a membership predicate admits a participant who has not accepted the terms",
  );
});

/* ------------------------------------------------------------------ *
 * The five fail-open paths the owner review named
 * ------------------------------------------------------------------ */

test("a missing entitlement fails closed", () => {
  const fn = /create or replace function public\.deal_room_is_writable[\s\S]*?\$\$;/.exec(rlsSql);
  assert.ok(fn);
  assert.ok(
    /join public\.deal_room_entitlements/.test(fn![0]),
    "the entitlement must be joined, not left-joined: a room with no entitlement row is not writable",
  );
  assert.ok(
    !/e\.id is null/.test(fn![0]),
    "treating a missing entitlement row as permission was the third fail-open path",
  );
});

test("room creation proves ownership, publication and family facts", () => {
  const fn = /create or replace function public\.deal_room_propose[\s\S]*?\$\$;/.exec(rlsSql);
  assert.ok(fn, "deal_room_propose is missing");
  const body = fn![0];
  assert.ok(body.includes("v_l.user_id <> auth.uid()"), "ownership of the listing is not proved");
  assert.ok(body.includes("Only the owner of a Deal can take it into a Deal Room"));
  assert.ok(body.includes("v_l.status <> 'approved'"), "publication is not proved");
  assert.ok(body.includes("already used its Starter Deal Room"), "the Starter is not bounded");
  // The snapshot is built, not accepted, so a caller cannot supply one.
  assert.ok(!/p_deal_snapshot|p_snapshot/.test(body), "the Deal snapshot must not be a parameter");
  assert.ok(body.includes("jsonb_build_object"), "the snapshot is not built from the listing row");
  // Family-correct facts, each family checked on its own terms.
  for (const clause of ["v_l.quantity is null", "v_l.service_category_key is null", "v_l.distribution_partner_type_key is null"]) {
    assert.ok(body.includes(clause), `the family check '${clause}' is missing`);
  }
});

test("no command creates an entitlement other than a bounded Starter", () => {
  const inserts = Array.from(rlsSql.matchAll(/insert into public\.deal_room_entitlements[\s\S]{0,200}/g));
  assert.equal(inserts.length, 1, "an entitlement is created in exactly one place");
  assert.ok(inserts[0][0].includes("'starter'"), "the only entitlement a command may create is a Starter");
});

test("the selected visibility is gone from the constraint and from the predicate", () => {
  const column = /visibility\s+text not null default 'sub_room'[\s\S]{0,200}/.exec(coreSql);
  assert.ok(column);
  assert.ok(!column![0].includes("'selected'"), "`selected` is still an allowed visibility");
  const predicate = /create or replace function public\.deal_room_can_read_evidence[\s\S]*?\$\$;/.exec(rlsSql);
  assert.ok(predicate);
  assert.ok(!predicate![0].includes("'selected'"), "the read predicate still mentions `selected`");
});

test("every command that changes state checks that the room is writable", () => {
  const commands = [
    "deal_room_invite",
    "deal_room_declare_participation",
    "deal_room_accept_agreement",
    "deal_room_admit_participant",
    "deal_room_propose_procedure",
    "deal_room_approve_procedure",
    "deal_room_submit_evidence",
    "deal_room_request_clarification",
    "deal_room_answer_clarification",
    "deal_room_accept_evidence_for_procedure",
    "deal_room_open_blocker",
    "deal_room_resolve_blocker",
  ];
  for (const name of commands) {
    const fn = new RegExp(`create or replace function public\\.${name}[\\s\\S]*?\\$\\$;`).exec(rlsSql);
    assert.ok(fn, `${name} is missing`);
    assert.ok(
      fn![0].includes("deal_room_is_writable"),
      `${name} can change state without checking that the room is writable`,
    );
  }
});

test("the whole loop has a command, so no transition needs a direct write", () => {
  for (const name of [
    "deal_room_propose",
    "deal_room_invite",
    "deal_room_accept_invitation",
    "deal_room_declare_participation",
    "deal_room_accept_agreement",
    "deal_room_admit_participant",
    "deal_room_propose_procedure",
    "deal_room_approve_procedure",
    "deal_room_submit_evidence",
    "deal_room_request_clarification",
    "deal_room_answer_clarification",
    "deal_room_accept_evidence_for_procedure",
    "deal_room_open_blocker",
    "deal_room_resolve_blocker",
    "deal_room_set_read_only",
  ]) {
    assert.ok(
      rlsSql.includes(`create or replace function public.${name}(`),
      `${name} is missing, so that transition has no command path`,
    );
    assert.ok(
      new RegExp(`grant execute on function public\\.${name}\\(`).test(rlsSql),
      `${name} is not granted to authenticated, so the loop cannot call it`,
    );
  }
});

test("the legacy write-policy check is retained for any policy that reappears", () => {
  // Read-only continuity is a database property, not a UI one.
  const insertsAndUpdates = Array.from(rlsSql.matchAll(/create policy\s+"([^"]+)"\s+on\s+public\.(\w+)\s+for\s+(insert|update)[\s\S]*?;/g));
  const exempt = new Set([
    // A room cannot check that it is writable before it exists. The INSERT is
    // guarded instead by `initiator_profile_id = auth.uid()`, and a new room is
    // created in `draft`, which is a writable state.
    "deal room create",
    // Revoking must keep working when a room is no longer writable: an
    // administrator must still be able to withdraw an outstanding invitation
    // after a room has gone read-only, or the invitation outlives the room.
    "invitation revoke",
    // Entitlement rows are created before the room is active and are advanced
    // thereafter by the command functions, not by members.
    "entitlement create",
  ]);
  for (const [statement, name] of insertsAndUpdates.map((m) => [m[0], m[1]] as const)) {
    if (exempt.has(name)) continue;
    assert.ok(
      statement.includes("deal_room_is_writable"),
      `policy '${name}' can write without checking that the room is writable`,
    );
  }
});

// ---------------------------------------------------------------------------
// The legacy cluster is untouched
// ---------------------------------------------------------------------------

test("no statement touches the legacy Deal-era cluster", () => {
  const legacy = [
    "deals",
    "deal_documents",
    "deal_events",
    "deal_status_history",
    "messages",
    "settlements",
    "settlement_milestones",
    "settlement_events",
  ];
  for (const table of legacy) {
    for (const verb of ["drop table", "alter table"]) {
      assert.ok(
        !new RegExp(`${verb}\\s+(if exists\\s+)?(public\\.)?${table}\\b`, "i").test(allSql),
        `a statement runs '${verb}' on the legacy table ${table}`,
      );
    }
  }
});

test("is_deal_participant is neither dropped nor redefined", () => {
  assert.ok(!/create or replace function public\.is_deal_participant/.test(allSql));
  assert.ok(!/drop function[^;]*is_deal_participant/.test(allSql));
});

test("is_admin and touch_updated_at are reused, not redefined", () => {
  assert.ok(!/create or replace function public\.is_admin/.test(allSql), "is_admin must be reused, not redefined");
  assert.ok(
    !/create or replace function public\.touch_updated_at/.test(allSql),
    "touch_updated_at must be reused, not redefined",
  );
  assert.ok(
    coreSql.includes("execute function public.touch_updated_at()"),
    "the existing trigger function is not reused",
  );
  assert.ok(rlsSql.includes("public.is_admin()"), "the existing admin predicate is not reused");
});

test("the orphan ponte-deal-docs bucket is not touched by any statement", () => {
  assert.ok(
    !storageSql.includes("ponte-deal-docs"),
    "the orphan bucket must be left untouched, per the accepted disposition",
  );
});

test("no existing table is altered anywhere in the three files", () => {
  const alters = Array.from(allSql.matchAll(/alter table\s+(?:if exists\s+)?(?:public\.)?(\w+)/gi)).map((m) => m[1]);
  for (const table of alters) {
    assert.ok(TABLES.includes(table), `'${table}' is altered but is not one of the new Deal Room tables`);
  }
});

// ---------------------------------------------------------------------------
// Storage
// ---------------------------------------------------------------------------

test("the evidence bucket is private", () => {
  assert.ok(storage.includes("'deal-room-evidence'"));
  assert.ok(/values \(\s*'deal-room-evidence',\s*'deal-room-evidence',\s*false/.test(storage), "the bucket is not private");
});

test("the storage read policy joins to the evidence row rather than trusting the path", () => {
  const match = /create policy "deal room evidence read"[\s\S]*?;/.exec(storage);
  assert.ok(match);
  assert.ok(match![0].includes("v.storage_path = storage.objects.name"));
  assert.ok(match![0].includes("deal_room_can_read_evidence"));
});

test("the upload policy uses the non-raising uuid helper", () => {
  const match = /create policy "deal room evidence upload"[\s\S]*?;/.exec(storage);
  assert.ok(match);
  assert.ok(
    match![0].includes("deal_room_uuid_or_null"),
    "a bare ::uuid cast raises 22P02 on a crafted path instead of denying",
  );
  assert.ok(!/\(storage\.foldername\(name\)\)\[\d\]::uuid/.test(match![0]), "a bare cast is present");
});

test("storage has no UPDATE or DELETE policy for members", () => {
  assert.ok(!/create policy[^;]*on storage\.objects\s+for\s+(update|delete)/i.test(storage));
});

test("storage_path is unique, so an object maps to at most one evidence version", () => {
  assert.ok(/storage_path\s+text not null unique/.test(core));
});

// ---------------------------------------------------------------------------
// The commands
// ---------------------------------------------------------------------------

test("admission refuses a participant missing any required agreement", () => {
  const fn = /create or replace function public\.deal_room_admit_participant[\s\S]*?\$\$;/.exec(rls);
  assert.ok(fn);
  for (const kind of AGREEMENT_KINDS) {
    assert.ok(fn![0].includes(`'${kind}'`), `admission does not require the ${kind} agreement`);
  }
});

test("procedure approval enforces the weights rule atomically", () => {
  const fn = /create or replace function public\.deal_room_approve_procedure[\s\S]*?\$\$;/.exec(rls);
  assert.ok(fn);
  assert.ok(fn![0].includes("must sum to exactly 100"));
  assert.ok(fn![0].includes("v_outstanding = 0"), "a version must govern only when every approver has approved");
});

test("evidence cannot be accepted for the procedure by the participant who supplied it", () => {
  const fn = /create or replace function public\.deal_room_accept_evidence_for_procedure[\s\S]*?\$\$;/.exec(rls);
  assert.ok(fn);
  assert.ok(fn![0].includes("v_ev.created_by = auth.uid()"));
  assert.ok(fn![0].includes("cannot be accepted for the procedure by the participant who supplied it"));
});

test("blocker resolution retains the row and requires a note", () => {
  const fn = /create or replace function public\.deal_room_resolve_blocker[\s\S]*?\$\$;/.exec(rls);
  assert.ok(fn);
  assert.ok(!/delete from public\.deal_room_blockers/.test(fn![0]), "resolving a blocker must not delete it");
  assert.ok(fn![0].includes("A resolution note is required"));
});

test("every command writes its activity event in the same transaction", () => {
  for (const fn of [
    "deal_room_admit_participant",
    "deal_room_approve_procedure",
    "deal_room_accept_evidence_for_procedure",
    "deal_room_resolve_blocker",
    "deal_room_set_read_only",
  ]) {
    const body = new RegExp(`create or replace function public\\.${fn}[\\s\\S]*?\\$\\$;`).exec(rls);
    assert.ok(body, `${fn} is missing`);
    assert.ok(body![0].includes("deal_room_log_event"), `${fn} changes state without recording it`);
  }
});

test("the log function is not executable by members directly", () => {
  assert.ok(
    rls.includes("revoke all on function public.deal_room_log_event"),
    "a member who can call the logger directly can forge history",
  );
  assert.ok(!/grant execute on function public\.deal_room_log_event/.test(rls));
});

// ---------------------------------------------------------------------------
// No pricing anywhere
// ---------------------------------------------------------------------------

test("no executable statement mentions Stripe, price or charging", () => {
  // `comment on ... is '...'` is also dropped here. Those are descriptions
  // stored in the database, and one of them says "No pricing or Stripe" -
  // which is a statement of the invariant, not a breach of it. What is under
  // test is that no column, constraint, default or value implements pricing.
  const text = allSql.replace(/comment on[\s\S]*?;/gi, " ").toLowerCase();
  for (const word of ["stripe", "price_cents", "amount_cents", "currency", "invoice", "charge_id"]) {
    assert.ok(!text.includes(word), `the Deal Room migration mentions '${word}'`);
  }
});

test("no IP address or user agent column exists on the acceptance record", () => {
  const table = /create table if not exists public\.deal_room_agreement_acceptances[\s\S]*?\);/.exec(core);
  assert.ok(table);
  for (const word of ["ip_address", "user_agent", "inet"]) {
    assert.ok(!table![0].includes(word), `the acceptance record stores '${word}', against the owner's decision`);
  }
  assert.ok(table![0].includes("document_sha256"));
  assert.ok(table![0].includes("document_version"));
});

console.log(`ok   deal-room rls contract: ${passed} assertions passed`);
