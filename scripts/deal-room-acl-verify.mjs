// Prove the Deal Room function ACL against production, from the catalogue.
//
//   node scripts/deal-room-acl-verify.mjs
//
// ## Why this exists
//
// LB-008 was a migration asserting something about itself: `20260729b` said "`anon`
// is granted execute on nothing" and revoked from `PUBLIC`, which does not touch the
// grants Supabase's `alter default privileges` writes to `anon`, `authenticated` and
// `service_role` by name. All 23 functions stayed anon-executable.
//
// The test written to catch that then made the same mistake one level up. It
// asserted "`authenticated` should end with execute on exactly 19" by counting
// `grant` statements in the corrective file - and passed, while production held 22,
// because a text scan cannot see a privilege the file never mentions.
//
// So the lesson is not "add assertions" but "know which instrument can answer the
// question". An ACL is a property of the database. Only the catalogue can be asked.
// This script asks it, and is the thing to run and quote after any ACL migration.
//
// Read-only: `select` against `pg_proc`, `pg_namespace` and `pg_policies`. It writes
// nothing and creates nothing. Exit 0 means every requirement below holds; exit 1
// prints each failure with the offending function.

import { readFileSync, existsSync } from "node:fs";

if (existsSync(".env.local")) {
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (!m) continue;
    const v = m[2].trim().replace(/^["']|["']$/g, "");
    if (v && !process.env[m[1]]) process.env[m[1]] = v;
  }
}

const token = process.env.SUPABASE_ACCESS_TOKEN;
const ref = process.env.SUPABASE_PROJECT_REF;
if (!token || !ref) {
  console.error("SUPABASE_ACCESS_TOKEN and SUPABASE_PROJECT_REF must be in .env.local");
  process.exit(1);
}

async function query(sql) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify({ query: sql }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0, 400)}`);
  return JSON.parse(text);
}

// ---------------------------------------------------------------------------
// The contract, written out rather than derived, so drift is visible
// ---------------------------------------------------------------------------

/** Called inside RLS policy expressions, so `authenticated` MUST hold EXECUTE. */
const RLS_HELPERS = [
  "deal_room_can_administer",
  "deal_room_can_read_evidence",
  "deal_room_is_master_participant",
  "deal_room_is_sub_room_participant",
];

/** Called by the application over RPC, so `authenticated` MUST hold EXECUTE. */
const MEMBER_COMMANDS = [
  "deal_room_accept_agreement",
  "deal_room_accept_evidence_for_procedure",
  "deal_room_accept_invitation",
  "deal_room_admit_participant",
  "deal_room_answer_clarification",
  "deal_room_approve_procedure",
  "deal_room_declare_participation",
  "deal_room_invite",
  "deal_room_open_blocker",
  "deal_room_propose",
  "deal_room_propose_procedure",
  "deal_room_request_clarification",
  "deal_room_resolve_blocker",
  "deal_room_set_read_only",
  "deal_room_submit_evidence",
];

/** Reachable by no member role. The logger is the one that could forge history. */
const INTERNAL = [
  "deal_room_log_event",
  "deal_room_is_writable",
  "deal_room_uuid_or_null",
  "deal_room_events_append_only",
];

const ALLOWED = new Set([...RLS_HELPERS, ...MEMBER_COMMANDS]);

const failures = [];
const notes = [];
function require_(ok, message) {
  if (!ok) failures.push(message);
}

const rows = await query(`
  select p.proname as name,
         pg_get_function_arguments(p.oid) as args,
         has_function_privilege('anon', p.oid, 'execute')          as anon,
         has_function_privilege('authenticated', p.oid, 'execute') as authenticated,
         has_function_privilege('service_role', p.oid, 'execute')  as service_role,
         coalesce(array_to_string(p.proacl, ' ; '), '(null: PUBLIC has EXECUTE by default)') as acl,
         p.prosecdef as security_definer,
         coalesce(array_to_string(p.proconfig, ','), '(none)') as config
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname like 'deal_room%'
  order by p.proname
`);

console.log(`project ${ref}: ${rows.length} deal_room_* functions\n`);

// 1. The inventory itself. A function that appears or disappears invalidates the
//    lists above, and silently passing the rest would be worse than failing here.
require_(rows.length === 23, `expected 23 deal_room_* functions, found ${rows.length}`);
const found = new Set(rows.map((r) => r.name));
for (const name of [...ALLOWED, ...INTERNAL]) {
  require_(found.has(name), `${name} is named in this contract but does not exist in production`);
}
for (const r of rows) {
  require_(
    ALLOWED.has(r.name) || INTERNAL.includes(r.name),
    `${r.name} exists in production but this contract does not classify it. Classify it deliberately`,
  );
}

// 2. anon holds nothing.
const anonHolders = rows.filter((r) => r.anon);
require_(anonHolders.length === 0, `anon holds EXECUTE on ${anonHolders.length}: ${anonHolders.map((r) => r.name).join(", ")}`);

// 3. PUBLIC holds nothing. A null ACL means the default applies, which grants
//    PUBLIC; an empty grantee before `=X` is an explicit PUBLIC grant.
const publicHolders = rows.filter((r) => r.acl.includes("(null:") || /(^|;)\s*=X\//.test(r.acl));
require_(
  publicHolders.length === 0,
  `PUBLIC holds EXECUTE on ${publicHolders.length}: ${publicHolders.map((r) => r.name).join(", ")}`,
);

// 4. authenticated holds exactly the 19.
const authHolders = rows.filter((r) => r.authenticated).map((r) => r.name);
const surplus = authHolders.filter((n) => !ALLOWED.has(n));
const missing = Array.from(ALLOWED).filter((n) => !authHolders.includes(n));
require_(surplus.length === 0, `authenticated holds EXECUTE it should not: ${surplus.join(", ")}`);
require_(
  missing.length === 0,
  `authenticated has LOST EXECUTE it needs: ${missing.join(", ")} - this breaks member journeys, not just the contract`,
);
require_(authHolders.length === 19, `authenticated holds EXECUTE on ${authHolders.length}, expected exactly 19`);

// 5. The four internal functions are reachable by neither member role.
for (const name of INTERNAL) {
  const r = rows.find((x) => x.name === name);
  if (!r) continue;
  require_(!r.anon, `${name} is executable by anon`);
  require_(!r.authenticated, `${name} is executable by authenticated`);
}

// 6. service_role untouched. It bypasses RLS by design and the negative-access
//    fixture needs it; narrowing it is a separate decision, so a change here is a
//    failure even though it would look like tightening.
const svc = rows.filter((r) => r.service_role).length;
require_(svc === 23, `service_role holds EXECUTE on ${svc}, expected 23 (unchanged)`);

// 7. Hardening that is easy to lose in an ACL edit.
const definers = rows.filter((r) => r.security_definer);
const unpinned = rows.filter((r) => !r.config.includes("search_path=public, pg_temp"));
require_(definers.length === 21, `expected 21 SECURITY DEFINER functions, found ${definers.length}`);
require_(
  unpinned.length === 0,
  `functions without a pinned search_path: ${unpinned.map((r) => r.name).join(", ")}`,
);

// 8. The policies the helpers serve, so a helper revoke can never be read as safe
//    while policies still depend on it.
const pol = await query(`
  select count(*)::int as total,
         count(*) filter (where cmd <> 'SELECT')::int as non_select,
         count(*) filter (where 'anon' = any(roles))::int as naming_anon
  from pg_policies where schemaname = 'public' and tablename like 'deal_room%'
`);
require_(pol[0].total === 14, `expected 14 Deal Room policies, found ${pol[0].total}`);
require_(pol[0].non_select === 0, `${pol[0].non_select} non-SELECT Deal Room policies exist`);
require_(pol[0].naming_anon === 0, `${pol[0].naming_anon} Deal Room policies name anon`);

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

const width = Math.max(...rows.map((r) => r.name.length));
for (const r of rows) {
  const role = ALLOWED.has(r.name) ? (RLS_HELPERS.includes(r.name) ? "rls helper" : "command") : "internal";
  const holders = [r.anon && "anon", r.authenticated && "authenticated", r.service_role && "service_role"]
    .filter(Boolean)
    .join(" ");
  console.log(`  ${r.name.padEnd(width)}  ${role.padEnd(10)}  ${holders}`);
}

console.log("");
console.log(`  anon           : ${anonHolders.length} of ${rows.length}`);
console.log(`  PUBLIC         : ${publicHolders.length} of ${rows.length}`);
console.log(`  authenticated  : ${authHolders.length} of ${rows.length}  (expected 19)`);
console.log(`  service_role   : ${svc} of ${rows.length}  (expected 23, unchanged)`);
console.log(`  policies       : ${pol[0].total}, ${pol[0].non_select} non-SELECT, ${pol[0].naming_anon} naming anon`);
for (const n of notes) console.log(`  note: ${n}`);

if (failures.length) {
  console.error(`\nFAIL  deal-room ACL: ${failures.length} problem(s)\n`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}

console.log(`\nok   deal-room ACL in production: anon 0, PUBLIC 0, authenticated exactly 19, service_role unchanged`);
