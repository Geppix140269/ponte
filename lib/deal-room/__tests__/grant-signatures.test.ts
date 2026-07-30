// Every `grant execute` names a function the same migration declares.
//
// Run: npx tsx lib/deal-room/__tests__/grant-signatures.test.ts
//
// ## Why this file exists
//
// LB-005. Gate C Approval 1 applied `20260729a` to production and then Postgres
// refused `20260729b` outright and rolled the whole file back:
//
//   ERROR: 42883: function public.deal_room_invite(uuid, text, text, text,
//   timestamp with time zone) does not exist
//
// The owner's final trust review had taken `deal_room_invite()` from five
// arguments to three, removing `p_role` and `p_class`, and dropped the
// superseded overload. The `grant execute` block was never updated, so the file
// granted execute on a signature it had itself just dropped.
//
// `rls-contract.test.ts` did not catch it and could not: it checks that each
// command exists by name and that no member holds a write policy. A grant naming
// the right function with the wrong arity passes both of those checks and fails
// in Postgres.
//
// So this compares the two lists the migration itself contains. It needs no
// database, which is the point - the defect reached production DDL precisely
// because everything that could have caught it needed one (PL-002).
//
// ## What "the same" means here
//
// Postgres identifies a function by name and argument TYPES, not names or
// defaults. So both sides are reduced to an ordered type list before comparing,
// `timestamptz` is normalised to `timestamp with time zone`, and a `default`
// clause is dropped - a defaulted argument is still part of the identity.

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

const MIGRATION = "supabase/migrations/20260729b_deal_room_rls.sql";
const sql = readFileSync(MIGRATION, "utf8");

/** An ordered list of argument types, as Postgres would identify the function. */
function typeList(args: string): string {
  return args
    .split(",")
    .map((arg) => arg.trim())
    .filter(Boolean)
    .map((arg) => {
      // `p_name type` or `p_name type default x` -> `type`
      const withoutDefault = arg.replace(/\s+default\s+[\s\S]*$/i, "").trim();
      const parts = withoutDefault.replace(/\s+/g, " ").split(" ");
      // A declaration carries a parameter name; a grant carries only the type.
      const type = parts.length > 1 && /^p_/.test(parts[0]) ? parts.slice(1).join(" ") : withoutDefault;
      return type.replace(/\btimestamptz\b/g, "timestamp with time zone").trim();
    })
    .join(", ");
}

/** Every `create or replace function public.deal_room_*` in this migration. */
function declaredSignatures(): Map<string, string> {
  const declared = new Map<string, string>();
  const pattern = /create or replace function public\.(deal_room_\w+)\(([\s\S]*?)\)\s*returns/g;
  for (const match of Array.from(sql.matchAll(pattern))) {
    declared.set(match[1], typeList(match[2]));
  }
  return declared;
}

/** Every `grant execute on function public.deal_room_*` in this migration. */
function grantedSignatures(): { name: string; types: string; role: string; line: number }[] {
  const grants: { name: string; types: string; role: string; line: number }[] = [];
  const pattern = /grant execute on function public\.(deal_room_\w+)\(([^)]*)\) to (\w+)/g;
  for (const match of Array.from(sql.matchAll(pattern))) {
    grants.push({
      name: match[1],
      types: typeList(match[2]),
      role: match[3],
      line: sql.slice(0, match.index).split("\n").length,
    });
  }
  return grants;
}

// ---------------------------------------------------------------------------
// The check itself
// ---------------------------------------------------------------------------

test("the migration declares functions and grants execute on them", () => {
  const declared = declaredSignatures();
  const granted = grantedSignatures();
  assert.ok(declared.size > 0, "no function declarations were found; the parser has drifted from the file");
  assert.ok(granted.length > 0, "no grant execute statements were found; the parser has drifted from the file");
});

test("every granted function is declared by this same migration", () => {
  const declared = declaredSignatures();
  const missing = grantedSignatures().filter((grant) => !declared.has(grant.name));
  assert.deepEqual(
    missing.map((grant) => `${MIGRATION}:${grant.line} grants on ${grant.name}, which this file never declares`),
    [],
  );
});

test("every grant signature matches the declared one, argument type by argument type", () => {
  const declared = declaredSignatures();
  const mismatched = grantedSignatures()
    .filter((grant) => declared.has(grant.name))
    .filter((grant) => declared.get(grant.name) !== grant.types)
    .map(
      (grant) =>
        `${MIGRATION}:${grant.line} grants execute on ${grant.name}(${grant.types}) ` +
        `but the file declares ${grant.name}(${declared.get(grant.name)}). ` +
        `Postgres refuses the whole migration with 42883.`,
    );
  assert.deepEqual(mismatched, []);
});

test("a signature dropped by this migration is never granted", () => {
  // The file drops superseded overloads on purpose, so that a forgeable path is
  // absent rather than merely unused. Granting one back would undo that, and is
  // also what LB-005 actually was.
  const dropped = Array.from(
    sql.matchAll(/drop function if exists public\.(deal_room_\w+)\(([^)]*)\)/g),
    (match) => ({ name: match[1], types: typeList(match[2]) }),
  );
  assert.ok(dropped.length > 0, "no dropped overloads were found; the parser has drifted from the file");

  const granted = grantedSignatures();
  const revived = dropped
    .filter((drop) => granted.some((grant) => grant.name === drop.name && grant.types === drop.types))
    .map((drop) => `${drop.name}(${drop.types}) is dropped by this migration and then granted execute`);
  assert.deepEqual(revived, []);
});

// ---------------------------------------------------------------------------
// The specific signature LB-005 was about
// ---------------------------------------------------------------------------

test("deal_room_invite is granted on its three-argument signature, not the removed five", () => {
  const declared = declaredSignatures();
  assert.equal(
    declared.get("deal_room_invite"),
    "uuid, text, timestamp with time zone",
    "the invite command no longer takes three arguments; this test's expectation needs the same review the change did",
  );

  const invites = grantedSignatures().filter((grant) => grant.name === "deal_room_invite");
  assert.equal(invites.length, 1, "deal_room_invite should be granted exactly once");
  assert.equal(
    invites[0].types,
    "uuid, text, timestamp with time zone",
    "the grant names the five-argument signature the owner's final trust review removed; this is LB-005",
  );
});

test("every command is granted to authenticated and nothing is granted to anon", () => {
  const grants = grantedSignatures();
  const toAnon = grants.filter((grant) => grant.role === "anon");
  assert.deepEqual(
    toAnon.map((grant) => `${grant.name} is granted execute to anon`),
    [],
  );
  assert.ok(
    grants.every((grant) => grant.role === "authenticated"),
    "a command is granted to a role other than authenticated",
  );
});

console.log(`ok   deal-room grant signatures: ${passed} assertions passed`);
