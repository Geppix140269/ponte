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
  return new Set(
    aclStatements("grant").filter((s) => s.roles.includes("authenticated")).map((s) => s.sig),
  );
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

  const expected = new Set(Array.from(commands).concat(Array.from(helpers)));
  const missing = Array.from(expected)
    .filter((sig) => !corrective.has(sig))
    .map((sig) => `${sig} is needed by the application or by an RLS policy but ${ACL} does not grant it to authenticated`);
  const surplus = Array.from(corrective)
    .filter((sig) => !expected.has(sig))
    .map((sig) => `${ACL} grants ${sig} to authenticated, but it is neither called by the application nor used by a policy`);

  assert.deepEqual([...missing, ...surplus], []);
  assert.equal(corrective.size, 19, `the corrective allowlist should be 15 commands + 4 helpers = 19, got ${corrective.size}`);
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
// 6. The file changes nothing but privileges
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
