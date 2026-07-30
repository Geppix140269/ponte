// The Deal Room function ACL is explicit, and closed.
//
// Run: npx tsx lib/deal-room/__tests__/function-acl.test.ts
//
// ## Why this file exists
//
// LB-008. `20260729b_deal_room_rls.sql` claims "`anon` is granted execute on
// nothing" and implements it as:
//
//   revoke all on function public.deal_room_log_event(...) from public;
//
// That statement succeeds, and `PUBLIC` really is absent from the logger's ACL in
// production. But Supabase ships `alter default privileges ... grant execute on
// functions to anon, authenticated, service_role`, so every new function in
// `public` is created with those three grants written into its ACL **by name**,
// and revoking from `PUBLIC` does not touch an explicit role grant. All 23
// `deal_room_*` functions ended up executable by `anon`.
//
// `grant-signatures.test.ts` passes on that file and should: the signatures are
// right. It compares each `grant execute` against the function the same file
// declares, and a revoke naming the wrong grantee is invisible to that check.
//
// So this one asks a different question, and asks it as a CLOSED WORLD: for every
// function the Deal Room declares, what does `20260730b_deal_room_function_acl.sql`
// say about it? A function the corrective migration forgets is a failure here, not
// a silent omission - which is the specific way LB-008 hid.
//
// ## Why a text scan and not a database probe
//
// There is no non-production database (PL-002), and the defect only exists in a
// project whose default privileges grant to `anon`. A local check cannot observe
// that. What it CAN do is prove the corrective migration is complete and internally
// consistent before anybody applies it. The five production probes are listed in
// `docs/codex/DATABASE-STATE.md`, and the decisive one is a real anonymous RPC to
// the logger returning `42501` where today it returns `23503`. Those are Gate C's
// job, not this file's.
//
// ## What "the same function" means here
//
// Postgres identifies a function by name and argument TYPES. Both sides are
// reduced to an ordered type list before comparing, `timestamptz` is normalised,
// and parameter names are dropped.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

let passed = 0;
function test(name: string, fn: () => void): void {
  try {
    fn();
    passed++;
  } catch (err) {
    console.error(`FAIL  ${name}\n      ${(err as Error).message}`);
    process.exitCode = 1;
  }
}

const CORE = "supabase/migrations/20260729a_deal_room_core.sql";
const RLS = "supabase/migrations/20260729b_deal_room_rls.sql";
const ACL = "supabase/migrations/20260730b_deal_room_function_acl.sql";

const coreSql = readFileSync(CORE, "utf8");
const rlsSql = readFileSync(RLS, "utf8");
const aclSql = readFileSync(ACL, "utf8");

/** `20260730b` with comments stripped, so a name in prose is never mistaken for a grant. */
const aclCode = aclSql.replace(/--[^\n]*/g, "");

/** An ordered list of argument types, as Postgres would identify the function. */
function typeList(args: string): string {
  return args
    .split(",")
    .map((arg) => arg.trim())
    .filter(Boolean)
    .map((arg) => {
      const withoutDefault = arg.replace(/\s+default\s+[\s\S]*$/i, "").trim();
      const parts = withoutDefault.replace(/\s+/g, " ").split(" ");
      const type = parts.length > 1 && /^p_/.test(parts[0]) ? parts.slice(1).join(" ") : withoutDefault;
      return type.replace(/\btimestamptz\b/g, "timestamp with time zone").trim();
    })
    .join(", ");
}

/** `name(type, type)` - the key both sides are compared on. */
function key(name: string, args: string): string {
  return `${name}(${typeList(args)})`;
}

// ---------------------------------------------------------------------------
// The inventory: every deal_room_* function the schema declares
// ---------------------------------------------------------------------------

function declaredFunctions(): Set<string> {
  const found = new Set<string>();
  for (const sql of [coreSql, rlsSql]) {
    const pattern = /create or replace function public\.(deal_room_\w+)\(([\s\S]*?)\)\s*returns/g;
    for (const m of Array.from(sql.matchAll(pattern))) found.add(key(m[1], m[2]));
  }
  return found;
}

/** Helpers that RLS policy expressions call. Privilege-checked against the querying role. */
function policyHelpers(): Set<string> {
  const declared = declaredFunctions();
  const byName = new Map<string, string>();
  for (const sig of Array.from(declared)) byName.set(sig.slice(0, sig.indexOf("(")), sig);

  const helpers = new Set<string>();
  for (const policy of Array.from(rlsSql.matchAll(/create policy[\s\S]*?;/g))) {
    for (const call of Array.from(policy[0].matchAll(/\b(deal_room_\w+)\s*\(/g))) {
      const sig = byName.get(call[1]);
      if (sig) helpers.add(sig);
    }
  }
  return helpers;
}

/** The member commands, as `20260729b` grants them. */
function memberCommands(): Set<string> {
  const cmds = new Set<string>();
  const pattern = /grant execute on function public\.(deal_room_\w+)\(([^)]*)\) to authenticated/g;
  for (const m of Array.from(rlsSql.matchAll(pattern))) cmds.add(key(m[1], m[2]));
  return cmds;
}

// ---------------------------------------------------------------------------
// What 20260730b says
// ---------------------------------------------------------------------------

type Statement = { sig: string; roles: string[]; index: number };

function aclStatements(verb: "revoke" | "grant"): Statement[] {
  const preposition = verb === "revoke" ? "from" : "to";
  const pattern = new RegExp(
    `${verb} execute on function public\\.(deal_room_\\w+)\\(([^)]*)\\) ${preposition} ([^;]+);`,
    "g",
  );
  return Array.from(aclCode.matchAll(pattern)).map((m) => ({
    sig: key(m[1], m[2]),
    roles: m[3].split(",").map((r) => r.trim()).filter(Boolean),
    index: m.index ?? 0,
  }));
}

const LOGGER = "deal_room_log_event(uuid, uuid, text, text, uuid, text, jsonb)";

// ---------------------------------------------------------------------------
// The parsers themselves have to be trustworthy first
// ---------------------------------------------------------------------------

test("the inventory, the policy helpers and the commands are all found", () => {
  const declared = declaredFunctions();
  assert.equal(declared.size, 23, `expected 23 declared deal_room_* functions, found ${declared.size}`);
  assert.ok(declared.has(LOGGER), "the event logger is not in the declared inventory; the parser has drifted");

  const helpers = policyHelpers();
  assert.deepEqual(
    Array.from(helpers).sort(),
    [
      "deal_room_can_administer(uuid)",
      "deal_room_can_read_evidence(uuid)",
      "deal_room_is_master_participant(uuid)",
      "deal_room_is_sub_room_participant(uuid)",
    ],
    "the set of helpers the RLS policies call has changed; the authenticated allowlist needs the same review the policies did",
  );

  assert.equal(memberCommands().size, 15, "expected 15 member commands granted by 20260729b");
  assert.ok(aclStatements("revoke").length > 0, "no revoke statements found in the ACL migration");
  assert.ok(aclStatements("grant").length > 0, "no grant statements found in the ACL migration");
});

// ---------------------------------------------------------------------------
// 1. Every function is explicitly revoked from PUBLIC and anon
// ---------------------------------------------------------------------------

test("every declared function is explicitly revoked from PUBLIC and from anon", () => {
  const revoked = new Map<string, Set<string>>();
  for (const s of aclStatements("revoke")) {
    if (!revoked.has(s.sig)) revoked.set(s.sig, new Set());
    for (const r of s.roles) revoked.get(s.sig)!.add(r);
  }

  const missing: string[] = [];
  for (const sig of Array.from(declaredFunctions())) {
    const roles = revoked.get(sig);
    if (!roles) {
      missing.push(`${sig} is never revoked at all`);
      continue;
    }
    if (!roles.has("public")) missing.push(`${sig} is not revoked from PUBLIC`);
    if (!roles.has("anon")) missing.push(`${sig} is not revoked from anon`);
  }
  assert.deepEqual(missing, []);
});

test("no function is revoked that the schema does not declare, and none is omitted", () => {
  const declared = declaredFunctions();
  const revokedSigs = new Set(aclStatements("revoke").map((s) => s.sig));

  const unexpected = Array.from(revokedSigs)
    .filter((sig) => !declared.has(sig))
    .map((sig) => `${ACL} revokes on ${sig}, which no migration declares. A wrong arity is a 42883 on apply`);
  const omitted = Array.from(declared)
    .filter((sig) => !revokedSigs.has(sig))
    .map((sig) => `${sig} is declared but absent from ${ACL}. This is exactly how LB-008 hid`);

  assert.deepEqual([...unexpected, ...omitted], []);
});

// ---------------------------------------------------------------------------
// 2. anon ends up with nothing
// ---------------------------------------------------------------------------

test("no Deal Room function is granted to anon anywhere in the file", () => {
  const toAnon = aclStatements("grant")
    .filter((s) => s.roles.includes("anon") || s.roles.includes("public"))
    .map((s) => `${s.sig} is granted execute to anon or PUBLIC`);
  assert.deepEqual(toAnon, []);
});

test("nothing is granted to anon by the applied migration either, so the revoke is the whole story", () => {
  const pattern = /grant execute on function public\.(deal_room_\w+)\([^)]*\) to (\w+)/g;
  const toAnon = Array.from(rlsSql.matchAll(pattern))
    .filter((m) => m[2] === "anon" || m[2] === "public")
    .map((m) => `${RLS} grants ${m[1]} to ${m[2]}`);
  assert.deepEqual(toAnon, []);
});

// ---------------------------------------------------------------------------
// 3. The event logger is executable by no member role
// ---------------------------------------------------------------------------

test("the event logger is revoked from PUBLIC, anon AND authenticated", () => {
  const roles = new Set<string>();
  let revokedAt = -1;
  for (const s of aclStatements("revoke")) {
    if (s.sig !== LOGGER) continue;
    for (const r of s.roles) roles.add(r);
    revokedAt = Math.max(revokedAt, s.index);
  }
  assert.ok(revokedAt >= 0, "the event logger is never revoked");
  for (const role of ["public", "anon", "authenticated"]) {
    assert.ok(
      roles.has(role),
      `the event logger is not revoked from ${role}. Revoking only from PUBLIC is LB-008: Supabase's default privileges grant to anon and authenticated by name`,
    );
  }
});

test("the event logger is never granted to any role, at any point in the file", () => {
  const granted = aclStatements("grant")
    .filter((s) => s.sig === LOGGER)
    .map((s) => `the event logger is granted to ${s.roles.join(", ")} at index ${s.index}, undoing its revoke`);
  assert.deepEqual(granted, []);

  // Belt and braces: the name must not appear in any executable grant line, even
  // on a signature this parser would not recognise.
  const looseGrant = /grant[^;]*deal_room_log_event[^;]*;/gi.exec(aclCode);
  assert.equal(looseGrant, null, `a grant statement mentions the event logger: ${looseGrant?.[0]}`);
});

test("a member calling the logger has no path: it is in neither allowlist", () => {
  assert.ok(!policyHelpers().has(LOGGER), "the event logger appears in an RLS policy expression, which would force a member grant");
  assert.ok(!memberCommands().has(LOGGER), "the event logger is granted to authenticated by the applied migration");
});

// ---------------------------------------------------------------------------
// 4. authenticated keeps exactly the helpers and the commands
// ---------------------------------------------------------------------------

test("every RLS helper the policies need remains executable by authenticated", () => {
  const grantedToAuth = new Set(
    aclStatements("grant").filter((s) => s.roles.includes("authenticated")).map((s) => s.sig),
  );
  const missing = Array.from(policyHelpers())
    .filter((sig) => !grantedToAuth.has(sig))
    .map((sig) => `${sig} is called by an RLS policy but not granted to authenticated. Every member read through that policy would fail`);
  assert.deepEqual(missing, []);
});

test("every intended member command is granted to authenticated exactly once", () => {
  const counts = new Map<string, number>();
  for (const s of aclStatements("grant")) {
    if (!s.roles.includes("authenticated")) continue;
    counts.set(s.sig, (counts.get(s.sig) ?? 0) + 1);
  }
  const problems: string[] = [];
  for (const sig of Array.from(memberCommands())) {
    const n = counts.get(sig) ?? 0;
    if (n !== 1) problems.push(`${sig} is granted to authenticated ${n} times, expected exactly 1`);
  }
  for (const [sig, n] of Array.from(counts)) {
    if (n !== 1) problems.push(`${sig} is granted to authenticated ${n} times, expected exactly 1`);
  }
  assert.deepEqual(problems, []);
});

test("authenticated is granted nothing beyond the helpers and the commands", () => {
  const allowed = new Set(Array.from(policyHelpers()).concat(Array.from(memberCommands())));
  assert.equal(allowed.size, 19, `the allowlist should be 4 helpers + 15 commands = 19, got ${allowed.size}`);

  const grantedToAuth = aclStatements("grant").filter((s) => s.roles.includes("authenticated"));
  const surplus = grantedToAuth
    .filter((s) => !allowed.has(s.sig))
    .map((s) => `${s.sig} is granted to authenticated but is neither an RLS helper nor a member command`);
  assert.deepEqual(surplus, []);
  assert.equal(
    new Set(grantedToAuth.map((s) => s.sig)).size,
    19,
    "authenticated should end with execute on exactly 19 Deal Room functions",
  );
});

test("the four internal functions are executable by no member role", () => {
  const allowed = new Set(Array.from(policyHelpers()).concat(Array.from(memberCommands())));
  const internal = Array.from(declaredFunctions()).filter((sig) => !allowed.has(sig));
  assert.deepEqual(
    internal.sort(),
    [
      "deal_room_events_append_only()",
      "deal_room_is_writable(uuid)",
      "deal_room_log_event(uuid, uuid, text, text, uuid, text, jsonb)",
      "deal_room_uuid_or_null(text)",
    ],
    "the set of functions no member may execute has changed; each addition or removal needs its own review",
  );

  const grantedToAuth = new Set(
    aclStatements("grant").filter((s) => s.roles.includes("authenticated")).map((s) => s.sig),
  );
  const leaked = internal.filter((sig) => grantedToAuth.has(sig)).map((sig) => `${sig} is granted to authenticated`);
  assert.deepEqual(leaked, []);
});

// ---------------------------------------------------------------------------
// 5. The file changes nothing but privileges
// ---------------------------------------------------------------------------

test("the ACL migration contains grants and revokes only", () => {
  const statements = aclCode
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);
  const offending = statements
    .filter((s) => !/^(revoke|grant|begin|commit)\b/i.test(s))
    .map((s) => `unexpected statement: ${s.slice(0, 90).replace(/\s+/g, " ")}`);
  assert.deepEqual(offending, []);
});

test("it issues no project-wide alter default privileges, and names nothing outside deal_room_*", () => {
  assert.equal(
    /alter\s+default\s+privileges/i.test(aclCode),
    false,
    "the file changes project-wide default privileges; the instruction is to state the Deal Room's own contract instead",
  );
  const names = Array.from(aclCode.matchAll(/on function public\.(\w+)\(/g)).map((m) => m[1]);
  const foreign = names.filter((n) => !n.startsWith("deal_room_"));
  assert.deepEqual(foreign, [], "the file names a function outside the deal_room_* namespace");
  assert.ok(names.length > 0, "no function names were parsed; the parser has drifted from the file");
});

test("service_role is left alone, deliberately and visibly", () => {
  const touched = aclStatements("revoke").filter((s) => s.roles.includes("service_role"));
  assert.deepEqual(
    touched.map((s) => s.sig),
    [],
    "this file narrows service_role. That bypasses RLS by design and the negative-access fixture needs it; narrowing it is a separate owner decision",
  );
});

test("the applied migration is not edited: its immutable checksum still describes it", () => {
  // 20260729b is in the production ledger. If this branch changed it, the ledger
  // would be lying and this whole correction would be built on a false record.
  const APPLIED_SHA = "b379f869f320e6ea36bdb00e07555079adf6373ff14848d20633afb6cfea3153";
  const actual = require("node:crypto").createHash("sha256").update(readFileSync(RLS)).digest("hex");
  assert.equal(
    actual,
    APPLIED_SHA,
    `${RLS} no longer hashes to the value recorded in public.schema_migrations. It is applied to production and must not be edited`,
  );
});

console.log(`ok   deal-room function ACL: ${passed} assertions passed`);
