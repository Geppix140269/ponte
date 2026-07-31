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
// ## What this file can prove, and what it cannot
//
// **Everything here is a claim about migration TEXT.** That boundary is not a
// caveat, it is the lesson, and it was learned the expensive way twice.
//
// LB-008 was `20260729b` asserting something about itself: it said "`anon` is
// granted execute on nothing" and revoked from `PUBLIC`, which does not touch the
// grants Supabase's `alter default privileges` writes to `anon`, `authenticated`
// and `service_role` by name. All 23 functions stayed anon-executable.
//
// This suite was then written to catch that, and made the same mistake one level
// up. It asserted "authenticated should end with execute on exactly 19" by counting
// `grant` statements - and passed, while production held 22, because `20260730b`
// granted 19 and never mentioned the other three. **A text scan cannot see a
// privilege the file never mentions.** That wording is now corrected everywhere
// below: each assertion says whether it is about the file or about the world.
//
// The end state has exactly one witness: `scripts/deal-room-acl-verify.mjs`, which
// reads `pg_proc.proacl` from production. A test here asserts that script still
// exists and still interrogates the three roles, so the division of labour cannot
// quietly rot. There is no non-production database (PL-002), so this file cannot do
// that job locally and does not pretend to.
//
// ## What "the same function" means here
//
// Postgres identifies a function by name and argument TYPES. Both sides are
// reduced to an ordered type list before comparing, `timestamptz` is normalised,
// and parameter names are dropped.

import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

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
const ACL_C = "supabase/migrations/20260730c_deal_room_internal_acl.sql";

const coreSql = readFileSync(CORE, "utf8");
const rlsSql = readFileSync(RLS, "utf8");
const aclSql = readFileSync(ACL, "utf8");

/** `20260730b` with comments stripped, so a name in prose is never mistaken for a grant. */
const aclCode = aclSql.replace(/--[^\n]*/g, "");

/** `20260729b` likewise: it carries the original grant block as well as the policies. */
const rlsCode = rlsSql.replace(/--[^\n]*/g, "");

const aclCSql = readFileSync(ACL_C, "utf8");
const aclCCode = aclCSql.replace(/--[^\n]*/g, "");

const STORAGE = "supabase/migrations/20260729c_deal_room_storage.sql";
const storageSql = readFileSync(STORAGE, "utf8");

const ACL_D = "supabase/migrations/20260731a_deal_room_storage_policy_helpers.sql";
const aclDSql = readFileSync(ACL_D, "utf8");
const aclDCode = aclDSql.replace(/--[^\n]*/g, "");

/** The three that `20260730b` left with `authenticated`, and `20260730c` removes. */
const RESIDUAL = [
  "deal_room_events_append_only()",
  "deal_room_is_writable(uuid)",
  "deal_room_uuid_or_null(text)",
];

/**
 * Two of that three are required by the `storage.objects` policies in
 * `20260729c`, and `20260731a` grants them back.
 *
 * This is the defect that made `20260731a` necessary, and it is worth naming
 * precisely because it is subtle. `20260730c` revoked them on the ground that
 * they appeared in no policy expression - which was true of the database **as
 * applied**, and false of the repository, where `20260729c` had been sitting
 * unapplied since 29 July. A function called inside a policy expression is
 * privilege-checked against the querying role, so applying `20260729c` without
 * those grants would fail every member evidence upload with 42501.
 *
 * The assertions below therefore read BOTH migration files for policies, not
 * just `20260729b`. A helper allowlist derived only from applied policies is
 * blind to the ones a pending migration will create.
 */
const STORAGE_POLICY_HELPERS = ["deal_room_is_writable(uuid)", "deal_room_uuid_or_null(text)"];

/** Reachable by no member role, permanently. */
const PERMANENTLY_INTERNAL = [
  "deal_room_events_append_only()",
  "deal_room_log_event(uuid, uuid, text, text, uuid, text, jsonb)",
  // Reads a name out of `profiles`, which is readable only to its owner. A
  // member who could call it directly could enumerate names - which is exactly
  // what option 1 avoided by not widening the policy. (20260731f)
  "deal_room_display_label(uuid)",
  // The pricing lane's append-only trigger guard for `deal_room_billing_events`,
  // 20260731e. Written, NOT applied. It is here because this file discovers
  // functions from every migration rather than a list, so a lane cannot add one
  // that nothing classifies - which is the property that made it worth widening.
  "deal_room_billing_append_only()",
];

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
  // Every migration, discovered - not a list. Reading only a fixed pair is the
  // same blindness that produced the 20260731a defect one level down: a function
  // introduced by a later migration was invisible, so it could not be classified
  // and its ACL could not be checked. `20260731f` added `deal_room_display_label`
  // and this was the test that noticed, which is the behaviour worth keeping.
  // A replacement declares the same name and argument types, so the Set dedupes.
  const migrations = readdirSync("supabase/migrations")
    .filter((f) => /^\d{8}[a-z]_.*\.sql$/.test(f))
    .sort()
    .map((f) => readFileSync(`supabase/migrations/${f}`, "utf8"));
  for (const sql of migrations) {
    const pattern = /create or replace function public\.(deal_room_\w+)\(([\s\S]*?)\)\s*returns/g;
    for (const m of Array.from(sql.matchAll(pattern))) found.add(key(m[1], m[2]));
  }
  return found;
}

/**
 * Every function a policy expression calls, across EVERY migration that creates
 * policies - not just the ones already applied.
 *
 * Reading only `20260729b` is what produced the `20260731a` defect: the
 * `storage.objects` policies in `20260729c` were invisible, so two helpers looked
 * unused and were revoked. A policy expression is privilege-checked against the
 * querying role, so any function named in one must stay member-executable.
 */
function policyHelpers(): Set<string> {
  const declared = declaredFunctions();
  const byName = new Map<string, string>();
  for (const sig of Array.from(declared)) byName.set(sig.slice(0, sig.indexOf("(")), sig);

  const helpers = new Set<string>();
  // Comments stripped first: a function named in prose is not a policy dependency.
  for (const sql of [rlsSql, storageSql]) {
    const code = sql.replace(/--[^\n]*/g, "");
    for (const policy of Array.from(code.matchAll(/create policy[\s\S]*?;/g))) {
      for (const call of Array.from(policy[0].matchAll(/\b(deal_room_\w+)\s*\(/g))) {
        const sig = byName.get(call[1]);
        if (sig) helpers.add(sig);
      }
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
// The third source: what the application actually calls
// ---------------------------------------------------------------------------
//
// `memberCommands()` above reads the grant list out of the migration, which makes
// it a restatement of that file rather than an independent check: if the grant
// list were wrong, comparing it with itself would agree. So the allowlist is also
// derived from the other end - the `.rpc("deal_room_*")` call sites in the
// shipped application - and the two are required to agree.
//
// That is what turns "these 15 are the commands" from an assertion into a
// finding, and it is what fails when somebody adds an RPC call without a grant,
// or deletes a call and leaves the grant behind.

const SOURCE_ROOTS = ["app", "lib"];

/** Production TypeScript only: no tests, fixtures, generated output or vendored code. */
function isProductionSource(path: string): boolean {
  const normalised = path.replace(/\\/g, "/");
  if (!/\.tsx?$/.test(normalised)) return false;
  if (/\.d\.ts$/.test(normalised)) return false;
  return !/(^|\/)(__tests__|__mocks__|__fixtures__|node_modules|\.next|dist|build|coverage|generated|e2e|scripts|supabase|docs)(\/|$)/.test(
    normalised,
  );
}

function sourceFiles(): string[] {
  const out: string[] = [];
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      const normalised = full.replace(/\\/g, "/");
      if (entry.isDirectory()) {
        if (
          /(^|\/)(__tests__|__mocks__|__fixtures__|node_modules|\.next|dist|build|coverage|generated)(\/|$)/.test(
            normalised,
          )
        ) {
          continue;
        }
        walk(full);
      } else if (isProductionSource(normalised)) {
        out.push(normalised);
      }
    }
  };
  for (const root of SOURCE_ROOTS) walk(root);
  return out;
}

/** Every `.rpc("deal_room_*")` / `.rpc('deal_room_*')` name, with the file it came from. */
function applicationRpcCalls(): { name: string; file: string }[] {
  const calls: { name: string; file: string }[] = [];
  for (const file of sourceFiles()) {
    const source = readFileSync(file, "utf8");
    const pattern = /\.rpc\(\s*("deal_room_\w+"|'deal_room_\w+')/g;
    for (const m of Array.from(source.matchAll(pattern))) {
      calls.push({ name: m[1].slice(1, -1), file });
    }
  }
  return calls;
}

/** Declared signatures grouped by bare function name, so ambiguity is visible. */
function declaredByName(): Map<string, string[]> {
  const byName = new Map<string, string[]>();
  for (const sig of Array.from(declaredFunctions())) {
    const name = sig.slice(0, sig.indexOf("("));
    byName.set(name, (byName.get(name) ?? []).concat(sig));
  }
  return byName;
}

/**
 * The commands the application calls, resolved to declared signatures.
 *
 * A name that resolves to zero signatures, or to more than one, is returned as a
 * problem rather than silently dropped - an unresolvable name is exactly the
 * case where a comparison of sets would otherwise quietly agree.
 */
function applicationCommands(): { commands: Set<string>; problems: string[] } {
  const byName = declaredByName();
  const commands = new Set<string>();
  const problems: string[] = [];
  for (const call of applicationRpcCalls()) {
    const matches = byName.get(call.name) ?? [];
    if (matches.length === 1) {
      commands.add(matches[0]);
    } else if (matches.length === 0) {
      problems.push(`${call.file} calls ${call.name}(), which no Deal Room migration declares`);
    } else {
      problems.push(
        `${call.file} calls ${call.name}(), which resolves to ${matches.length} declared signatures ` +
          `(${matches.join(" / ")}). An overloaded command cannot be granted unambiguously`,
      );
    }
  }
  return { commands, problems };
}

/** Signatures `20260730b` grants to `authenticated`. */
function correctiveAllowlist(): Set<string> {
  // `aclCode` explicitly, NOT the every-migration default. This is a claim about
  // what one file - `20260730b` - says, and the test that uses it is scoped to
  // what that file could know when it was written. Letting it drift to every
  // migration made `20260731a`'s two storage-helper grants look like surplus in
  // a file that never mentioned them.
  return new Set(
    aclStatements("grant").filter((s) => s.roles.includes("authenticated")).map((s) => s.sig),
  );
}

// ---------------------------------------------------------------------------
// What 20260730b says
// ---------------------------------------------------------------------------

type Statement = { sig: string; roles: string[]; index: number };

/**
 * Every ACL migration, concatenated, in date order.
 *
 * The default used to be `20260730b` alone. A revoke written in any later
 * migration was invisible to the two assertions that use the default, so a
 * correctly-locked function read as "never revoked at all" - a false finding,
 * and a false finding in this file is expensive, because this file is what says
 * whether LB-008 has come back.
 */
const allAclCode = readdirSync("supabase/migrations")
  .filter((f) => /^\d{8}[a-z]_.*\.sql$/.test(f))
  .sort()
  .map((f) => readFileSync(`supabase/migrations/${f}`, "utf8").replace(/--[^\n]*/g, ""))
  .join("\n");

function aclStatements(verb: "revoke" | "grant", code: string = aclCode): Statement[] {
  const preposition = verb === "revoke" ? "from" : "to";
  // `execute` OR `all`. On a function the two are the same privilege, and both
  // forms are in the tree: `20260730b` and `20260730c` write `revoke execute`,
  // `20260731e` writes `revoke all`. Matching only one made a correctly-locked
  // function read as "never revoked at all" - a false finding in the file whose
  // job is to say whether LB-008 has come back.
  const pattern = new RegExp(
    `${verb} (?:execute|all) on function public\\.(deal_room_\\w+)\\(([^)]*)\\) ${preposition} ([^;]+);`,
    "g",
  );
  return Array.from(code.matchAll(pattern)).map((m) => ({
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
  // 25: the original 23, plus `deal_room_display_label` (20260731f) and the
  // pricing lane's `deal_room_billing_append_only` (20260731e). Neither is
  // applied yet. The number is asserted rather than derived so that a function
  // appearing or vanishing is a failure somebody has to look at - which is how
  // both of these were noticed at all.
  assert.equal(declared.size, 25, `expected 25 declared deal_room_* functions, found ${declared.size}`);
  assert.ok(declared.has(LOGGER), "the event logger is not in the declared inventory; the parser has drifted");

  const helpers = policyHelpers();
  assert.deepEqual(
    Array.from(helpers).sort(),
    [
      "deal_room_can_administer(uuid)",
      "deal_room_can_read_evidence(uuid)",
      "deal_room_is_master_participant(uuid)",
      "deal_room_is_sub_room_participant(uuid)",
      "deal_room_is_writable(uuid)",
      "deal_room_uuid_or_null(text)",
    ],
    "the set of functions called by a policy expression has changed. Four come from the Deal Room table policies in 20260729b; two more from the storage.objects policies in 20260729c. Any addition needs the same review the policies did",
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
  // Every migration: the question is whether the function is revoked ANYWHERE,
  // not whether one file did it. `20260731f` revokes `deal_room_display_label`,
  // and reading `20260730b` alone would have reported it as never revoked.
  for (const s of aclStatements("revoke", allAclCode)) {
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
  const revokedSigs = new Set(aclStatements("revoke", allAclCode).map((s) => s.sig));

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

/**
 * The `authenticated` EXECUTE set the migrations actually produce, in order.
 *
 * This models the real mechanism rather than any single file's intent, which is
 * what both ACL defects turned on. The starting state is NOT empty: Supabase's
 * `alter default privileges` grants EXECUTE to `anon`, `authenticated` and
 * `service_role` on every new function in `public`, so every declared function
 * begins granted. Each migration then revokes and grants in file order.
 *
 * A file-by-file assertion cannot express this. `20260730b` is applied and
 * immutable, and was written before the `storage.objects` policies were known to
 * need two of the helpers; requiring it alone to grant them would be asking an
 * already-executed file to have known the future.
 */
function effectiveAuthenticatedGrants(): Set<string> {
  const effective = new Set(Array.from(declaredFunctions())); // Supabase default: all of them
  // Every migration in date order, discovered rather than listed, for the same
  // reason `declaredFunctions()` is. A revoke written in a migration this list
  // did not name would be invisible, and the function would look member-callable
  // when it is not - a false finding, which erodes the value of a true one.
  const allCode = readdirSync("supabase/migrations")
    .filter((f) => /^\d{8}[a-z]_.*\.sql$/.test(f))
    .sort()
    .map((f) => readFileSync(`supabase/migrations/${f}`, "utf8").replace(/--[^\n]*/g, ""));
  for (const code of allCode) {
    for (const s of aclStatements("revoke", code)) {
      if (s.roles.includes("authenticated")) effective.delete(s.sig);
    }
    for (const s of aclStatements("grant", code)) {
      if (s.roles.includes("authenticated")) effective.add(s.sig);
    }
  }
  return effective;
}

test("every function a policy expression calls remains executable by authenticated", () => {
  const effective = effectiveAuthenticatedGrants();
  const missing = Array.from(policyHelpers())
    .filter((sig) => !effective.has(sig))
    .map(
      (sig) =>
        `${sig} is called by a policy expression but authenticated does not end with EXECUTE on it. ` +
        `Every read or write through that policy would fail with 42501 - this is exactly the 20260731a defect`,
    );
  assert.deepEqual(missing, []);
});

test("the migrations together leave authenticated with exactly the 21", () => {
  const effective = effectiveAuthenticatedGrants();
  const expected = new Set(Array.from(policyHelpers()).concat(Array.from(memberCommands())));

  const surplus = Array.from(effective)
    .filter((sig) => !expected.has(sig))
    .map((sig) => `authenticated would end with EXECUTE on ${sig}, which no policy calls and no command needs`);
  const missing = Array.from(expected)
    .filter((sig) => !effective.has(sig))
    .map((sig) => `authenticated would NOT end with EXECUTE on ${sig}, which a policy or the application needs`);
  assert.deepEqual([...surplus, ...missing], []);
  assert.equal(effective.size, 21, `expected 21, the migrations produce ${effective.size}`);

  for (const sig of PERMANENTLY_INTERNAL) {
    assert.ok(!effective.has(sig), `${sig} must never end up executable by authenticated`);
  }
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

test("the migration text GRANTS authenticated nothing beyond the helpers and the commands", () => {
  // The wording matters. An earlier version of this test asserted that
  // "authenticated should end with execute on exactly 19 Deal Room functions".
  // That claim was false in production and unprovable here: `20260730b` grants 19
  // and Supabase's default privileges had already granted all 23, so the real
  // figure was 22. A text scan cannot see a privilege the file never mentions.
  //
  // What follows is therefore scoped to what the file SAYS. The end state is
  // proved by `scripts/deal-room-acl-verify.mjs` against `pg_proc.proacl`, and
  // nothing in this suite may be read as a substitute for it.
  const allowed = new Set(Array.from(policyHelpers()).concat(Array.from(memberCommands())));
  assert.equal(
    allowed.size,
    21,
    `the allowlist should be 4 RLS helpers + 2 Storage policy helpers + 15 commands = 21, got ${allowed.size}`,
  );

  // `aclCode`, not the every-migration default: the two assertions below are
  // claims about what `20260730b` contains, and the message says so.
  const grantedToAuth = aclStatements("grant").filter((s) => s.roles.includes("authenticated"));
  const surplus = grantedToAuth
    .filter((s) => !allowed.has(s.sig))
    .map((s) => `${s.sig} is granted to authenticated but is neither an RLS helper nor a member command`);
  assert.deepEqual(surplus, []);
  assert.equal(
    new Set(grantedToAuth.map((s) => s.sig)).size,
    19,
    `${ACL} should contain grant statements for exactly the 19 allowlisted functions. This is a claim about the file, not about the resulting ACL`,
  );
});

test("the migration text never GRANTS a member role an internal function", () => {
  const allowed = new Set(Array.from(policyHelpers()).concat(Array.from(memberCommands())));
  const internal = Array.from(declaredFunctions()).filter((sig) => !allowed.has(sig));
  assert.deepEqual(
    internal.sort(),
    PERMANENTLY_INTERNAL.slice().sort(),
    "the set of functions no member may execute has changed. Only the event logger and the append-only trigger function belong here: is_writable and uuid_or_null are called by the storage.objects policies and must stay member-executable",
  );

  const grantedToAuth = new Set(
    aclStatements("grant").filter((s) => s.roles.includes("authenticated")).map((s) => s.sig),
  );
  const leaked = internal.filter((sig) => grantedToAuth.has(sig)).map((sig) => `${sig} is granted to authenticated`);
  assert.deepEqual(leaked, []);
});

// ---------------------------------------------------------------------------
// 5. The allowlist agrees with the application, independently derived
// ---------------------------------------------------------------------------
//
// Three sets, from three different places, required to be identical:
//
//   1. what the application calls        - `.rpc("deal_room_*")` under app/ and lib/
//   2. what the applied migration grants - `20260729b`, live in production
//   3. what the corrective migration grants - `20260730b`, this branch
//
// Any two agreeing proves little; all three agreeing is the claim.

test("the source scan reaches real production code and excludes tests and fixtures", () => {
  const files = sourceFiles();
  assert.ok(files.length > 50, `only ${files.length} source files scanned; the walker is not reaching the tree`);
  assert.deepEqual(
    files.filter((f) => /__tests__|__mocks__|__fixtures__|\.d\.ts$|node_modules|\/scripts\/|\/supabase\/|\/docs\//.test(f)),
    [],
    "the scan is picking up test, fixture, generated or non-application files",
  );
  assert.ok(
    files.some((f) => f.includes("deal-rooms/actions.ts")),
    "the scan does not reach app/[locale]/deal-rooms/actions.ts, which is where the Deal Room RPCs are called",
  );

  const calls = applicationRpcCalls();
  assert.ok(calls.length >= 15, `expected at least 15 Deal Room RPC call sites, found ${calls.length}`);
});

test("every Deal Room RPC the application calls resolves to exactly one declared signature", () => {
  // Zero matches means the application calls something no migration creates.
  // More than one means an overload, which cannot be granted unambiguously and is
  // the shape of the LB-005 defect.
  assert.deepEqual(applicationCommands().problems, []);
});

test("the application calls exactly the 15 commands the applied migration grants", () => {
  const { commands } = applicationCommands();
  const granted = memberCommands();

  const calledNotGranted = Array.from(commands)
    .filter((sig) => !granted.has(sig))
    .map((sig) => `${sig} is called by the application but not granted to authenticated by ${RLS}. The call would fail with 42501`);
  const grantedNotCalled = Array.from(granted)
    .filter((sig) => !commands.has(sig))
    .map((sig) => `${sig} is granted to authenticated by ${RLS} but called nowhere in the application. A grant with no caller is reachable surface nobody needs`);

  assert.deepEqual([...calledNotGranted, ...grantedNotCalled], []);
  assert.equal(commands.size, 15, `expected 15 Deal Room commands, the application calls ${commands.size}`);
});

test("the corrective migration grants exactly the commands the application calls, plus the policy helpers", () => {
  const { commands } = applicationCommands();
  const helpers = policyHelpers();
  const corrective = correctiveAllowlist();

  // Scoped to what 20260730b could know when it was written: the commands, and
  // the four helpers the Deal Room TABLE policies call. The two storage.objects
  // helpers arrive in 20260731a, and are asserted by the effective-grants test
  // above rather than demanded of an applied file retrospectively.
  const tableHelpers = new Set(
    Array.from(helpers).filter((sig) => !STORAGE_POLICY_HELPERS.includes(sig)),
  );
  const expected = new Set(Array.from(commands).concat(Array.from(tableHelpers)));
  const missing = Array.from(expected)
    .filter((sig) => !corrective.has(sig))
    .map((sig) => `${sig} is needed by the application or by a table policy but ${ACL} does not grant it to authenticated`);
  const surplus = Array.from(corrective)
    .filter((sig) => !expected.has(sig))
    .map((sig) => `${ACL} grants ${sig} to authenticated, but it is neither called by the application nor used by a policy`);

  assert.deepEqual([...missing, ...surplus], []);
  assert.equal(corrective.size, 19, `20260730b should grant 15 commands + 4 table helpers = 19, got ${corrective.size}`);
});

test("the applied grant list and the corrective allowlist do not diverge", () => {
  // 20260730b must not quietly widen or narrow what 20260729b already granted.
  // The only intended difference between the two files, for commands, is none.
  const applied = memberCommands();
  const corrective = correctiveAllowlist();
  const helpers = policyHelpers();

  const correctiveCommands = new Set(Array.from(corrective).filter((sig) => !helpers.has(sig)));
  const divergence = [
    ...Array.from(applied)
      .filter((sig) => !correctiveCommands.has(sig))
      .map((sig) => `${sig} is granted by ${RLS} but dropped by ${ACL}. That is a member journey broken, not a security fix`),
    ...Array.from(correctiveCommands)
      .filter((sig) => !applied.has(sig))
      .map((sig) => `${sig} is granted by ${ACL} but not by ${RLS}. The corrective migration is widening access`),
  ];
  assert.deepEqual(divergence, []);
  assert.equal(correctiveCommands.size, 15);
});

test("all three sources agree, function for function", () => {
  const fromApp = Array.from(applicationCommands().commands).sort();
  const fromApplied = Array.from(memberCommands()).sort();
  const helpers = policyHelpers();
  const fromCorrective = Array.from(correctiveAllowlist())
    .filter((sig) => !helpers.has(sig))
    .sort();

  assert.deepEqual(fromApplied, fromApp, "the applied migration and the application disagree about the command set");
  assert.deepEqual(fromCorrective, fromApp, "the corrective migration and the application disagree about the command set");
  assert.equal(fromApp.length, 15);
});

// ---------------------------------------------------------------------------
// 6. `20260730c`: the residual three, and the limits of a text scan
// ---------------------------------------------------------------------------
//
// `20260730b` closed the anonymous path but left `authenticated` holding EXECUTE on
// 22 functions rather than 19, because granting 19 cannot remove grants Supabase's
// defaults had already written onto all 23. `20260730c` revokes those three.
//
// Everything below is a claim about migration TEXT. The end state is a property of
// the database and is proved by `scripts/deal-room-acl-verify.mjs`.

test("20260730c revokes authenticated on exactly the three residual functions", () => {
  const revokes = aclStatements("revoke", aclCCode);
  const fromAuth = revokes.filter((s) => s.roles.includes("authenticated"));
  assert.deepEqual(
    Array.from(new Set(fromAuth.map((s) => s.sig))).sort(),
    RESIDUAL,
    "20260730c must revoke authenticated on exactly deal_room_is_writable, deal_room_uuid_or_null and deal_room_events_append_only",
  );
  assert.equal(revokes.length, 3, `20260730c should contain exactly 3 revoke statements, found ${revokes.length}`);
});

test("20260730c re-asserts authenticated on exactly the 19 it could know about", () => {
  // Scoped to the allowlist as it stood when 20260730c was written and applied:
  // the commands, plus the four helpers the Deal Room TABLE policies call. The
  // two storage.objects helpers were revoked here and restored by 20260731a; an
  // applied file cannot be asked retrospectively to have known that.
  const allowed = new Set(
    Array.from(policyHelpers())
      .filter((sig) => !STORAGE_POLICY_HELPERS.includes(sig))
      .concat(Array.from(memberCommands())),
  );
  const granted = aclStatements("grant", aclCCode).filter((s) => s.roles.includes("authenticated"));
  const sigs = new Set(granted.map((s) => s.sig));

  const surplus = Array.from(sigs)
    .filter((sig) => !allowed.has(sig))
    .map((sig) => `${ACL_C} grants ${sig} to authenticated, which is not on the allowlist`);
  const missing = Array.from(allowed)
    .filter((sig) => !sigs.has(sig))
    .map((sig) => `${ACL_C} does not re-assert ${sig}; the contract it states would be incomplete`);
  assert.deepEqual([...surplus, ...missing], []);
  assert.equal(sigs.size, 19);

  // A file that both revokes and grants the same signature would be ambiguous to
  // read even though Postgres would resolve it by order.
  const revoked = new Set(aclStatements("revoke", aclCCode).map((s) => s.sig));
  const both = Array.from(sigs).filter((sig) => revoked.has(sig));
  assert.deepEqual(both, [], "20260730c both revokes and grants the same function");
});

test("20260730c leaves the residual three granted to nobody, and never mentions the logger in a grant", () => {
  const granted = new Set(aclStatements("grant", aclCCode).map((s) => s.sig));
  const leaked = RESIDUAL.filter((sig) => granted.has(sig)).map((sig) => `${sig} is granted back by ${ACL_C}`);
  assert.deepEqual(leaked, []);

  assert.ok(!granted.has(LOGGER), `${ACL_C} grants the event logger`);
  const looseGrant = /grant[^;]*deal_room_log_event[^;]*;/i.exec(aclCCode);
  assert.equal(looseGrant, null, `a grant statement in ${ACL_C} mentions the event logger: ${looseGrant?.[0]}`);
});

test("20260730c is grants and revokes only, touches no default privileges and names no other object", () => {
  const statements = aclCCode
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);
  const offending = statements
    .filter((s) => !/^(revoke|grant|begin|commit)\b/i.test(s))
    .map((s) => `unexpected statement: ${s.slice(0, 90).replace(/\s+/g, " ")}`);
  assert.deepEqual(offending, []);

  assert.equal(/alter\s+default\s+privileges/i.test(aclCCode), false, `${ACL_C} changes project-wide default privileges`);
  assert.equal(
    /\bservice_role\b/.test(aclCCode),
    false,
    `${ACL_C} names service_role. It bypasses RLS by design and the negative-access fixture needs it; narrowing it is a separate owner decision`,
  );

  const names = Array.from(aclCCode.matchAll(/on function public\.(\w+)\(/g)).map((m) => m[1]);
  assert.deepEqual(names.filter((n) => !n.startsWith("deal_room_")), [], `${ACL_C} names a function outside deal_room_*`);
  assert.ok(names.length > 0, "no function names parsed from 20260730c; the parser has drifted");
});

test("the ACL migrations together account for every declared function, by outcome not by statement", () => {
  // A closed world across ALL the ACL migrations, judged on the END STATE rather
  // than on which file said what. Revoking in one file and granting in a later
  // one is legitimate history - it is exactly what 20260730c and 20260731a do -
  // so the old "never both" rule was wrong once a correction existed. What must
  // hold is that every declared function ends up deliberately on one side.
  const allowed = new Set(Array.from(policyHelpers()).concat(Array.from(memberCommands())));
  const effective = effectiveAuthenticatedGrants();

  const unaccounted = Array.from(declaredFunctions())
    .filter((sig) => !allowed.has(sig) && effective.has(sig))
    .map((sig) => `${sig} ends up executable by authenticated but is on no allowlist`);
  assert.deepEqual(unaccounted, []);

  const lost = Array.from(allowed)
    .filter((sig) => !effective.has(sig))
    .map((sig) => `${sig} is allowlisted but the migrations leave authenticated without it`);
  assert.deepEqual(lost, []);

  const denied = Array.from(declaredFunctions()).filter((sig) => !effective.has(sig));
  assert.deepEqual(
    denied.slice().sort(),
    PERMANENTLY_INTERNAL.slice().sort(),
    "exactly two functions should end up denied to authenticated: the event logger and the append-only trigger function",
  );
  assert.equal(allowed.size + denied.length, declaredFunctions().size);
});

test("the catalogue verification procedure exists and checks what this suite cannot", () => {
  // The honest division of labour, asserted so it cannot quietly rot: this suite
  // reads migration text, and only the catalogue can report privileges. If the
  // script disappears or stops checking the roles, the end state has no witness.
  const script = "scripts/deal-room-acl-verify.mjs";
  const source = readFileSync(script, "utf8");
  for (const needle of [
    "pg_proc",
    "proacl",
    "has_function_privilege",
    "'anon'",
    "'authenticated'",
    "'service_role'",
  ]) {
    assert.ok(source.includes(needle), `${script} no longer references ${needle}; it cannot prove the ACL state`);
  }
  // Strip BOTH comment forms before looking for write verbs. Stripping only `//`
  // made the guard fire on a `/** ... */` block that merely described a revoke -
  // a false positive that would push the next person to reword documentation
  // instead of trusting the check.
  const executable = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
  assert.ok(
    /select|SELECT/.test(executable) && !/\b(insert|update|delete|drop|alter|grant|revoke)\s/i.test(executable),
    `${script} must be read-only`,
  );
});

// ---------------------------------------------------------------------------
// 7. The file changes nothing but privileges
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
