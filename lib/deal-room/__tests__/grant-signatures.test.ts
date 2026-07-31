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
import { readFileSync, readdirSync } from "node:fs";

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

// ---------------------------------------------------------------------------
// A later migration may REDEFINE a function. It must not change its signature.
// ---------------------------------------------------------------------------
//
// `create or replace function` keyed on a different argument list does not
// replace anything - it creates an OVERLOAD, silently, and every existing grant
// still points at the old one. That is LB-005 with the failure deferred: instead
// of a 42883 at apply time you get two functions, one of them ungranted, and the
// symptom surfaces as a permission error for a member later.
//
// So every `deal_room_*` redefinition in any later migration is compared against
// the signature `20260729b` declared. The set of files is discovered rather than
// listed, so a new migration cannot opt out by not being mentioned here.

const LATER_MIGRATIONS = readdirSync("supabase/migrations")
  .filter((f) => /^\d{8}[a-z]_.*\.sql$/.test(f))
  .filter((f) => f > "20260729b_deal_room_rls.sql")
  .sort();

/**
 * `deal_room_*` functions legitimately introduced AFTER `20260729b`.
 *
 * The signature check exists to catch an accidental **overload** - a redefinition
 * keyed on a different argument list, which replaces nothing and leaves every
 * grant pointing at the old function. A genuinely new function is a different
 * thing and is not that defect.
 *
 * It still must not appear silently, because a new `deal_room_*` function is a
 * new privilege surface: that is precisely what LB-008 was. So each one is
 * listed here with what it is and what it is granted, and the check below fails
 * on a name that is neither declared by `20260729b` nor classified here.
 */
const NEW_SINCE_20260729B: Record<string, string> = {
  deal_room_billing_append_only:
    "20260731e (WRITTEN, NOT APPLIED): the append-only trigger guard for " +
    "deal_room_billing_events, mirroring deal_room_events_append_only. It has no " +
    "caller - the trigger fires it - and the file revokes it from public, anon " +
    "and authenticated.",
};

test("every later migration redefining a deal_room function keeps the declared signature", () => {
  const original = declaredSignatures();
  const problems: string[] = [];
  let redefinitions = 0;

  for (const file of LATER_MIGRATIONS) {
    const text = readFileSync(`supabase/migrations/${file}`, "utf8");
    const pattern = /create or replace function public\.(deal_room_\w+)\(([\s\S]*?)\)\s*returns/g;
    for (const m of Array.from(text.matchAll(pattern))) {
      redefinitions++;
      const name = m[1];
      const types = typeList(m[2]);
      if (!original.has(name)) {
        if (!NEW_SINCE_20260729B[name]) {
          problems.push(
            `${file} declares ${name}, which 20260729b never declared. Classify it deliberately ` +
              `by adding it to NEW_SINCE_20260729B with what it is and what it is granted`,
          );
        }
        continue;
      }
      if (original.get(name) !== types) {
        problems.push(
          `${file} redefines ${name}(${types}) but 20260729b declares ${name}(${original.get(name)}). ` +
            `This creates an overload rather than replacing it, and every existing grant keeps pointing at the old one`,
        );
      }
    }
  }
  assert.deepEqual(problems, []);
  // The check is worthless if it silently scanned nothing.
  assert.ok(redefinitions > 0, "no redefinitions found in later migrations; the scan has drifted from the tree");
});

test("every classified new function is actually declared by a later migration", () => {
  // Keeps NEW_SINCE_20260729B from rotting into a list of names that grant
  // permission to nothing, which is how an allowlist stops being read.
  const declared = new Set<string>();
  for (const file of LATER_MIGRATIONS) {
    const text = readFileSync(`supabase/migrations/${file}`, "utf8");
    for (const m of Array.from(
      text.matchAll(/create or replace function public\.(deal_room_\w+)\(/g),
    )) {
      declared.add(m[1]);
    }
  }
  const stale = Object.keys(NEW_SINCE_20260729B).filter((name) => !declared.has(name));
  assert.deepEqual(stale, [], "classified but no longer declared by any later migration");
});

test("a classified new function still has to state what it is", () => {
  for (const [name, reason] of Object.entries(NEW_SINCE_20260729B)) {
    assert.ok(reason.length > 40, `${name} needs a real classification, not a placeholder`);
    assert.match(reason, /^\d{8}[a-z]/, `${name} must name the migration that introduces it`);
  }
});

test("20260731b fixes the initiator identity constraint and changes nothing else", () => {
  const FILE = "supabase/migrations/20260731b_deal_room_propose_initiator_capacity.sql";
  const patched = readFileSync(FILE, "utf8");

  // The defect Approval 3 found: the initiator was admitted with neither an
  // org_id nor a declared_capacity, so the identity CHECK rejected every room.
  const inserts = Array.from(
    patched.matchAll(/insert into public\.deal_room_participants[\s\S]*?;/g),
  ).map((m) => m[0]);
  assert.equal(inserts.length, 2, `expected the two initiator inserts, found ${inserts.length}`);
  for (const stmt of inserts) {
    assert.ok(stmt.includes("declared_capacity"), "an initiator insert still omits declared_capacity");
    assert.ok(/'Deal owner'[\s\S]*'Deal owner'/.test(stmt), "the initiator insert does not supply a declared capacity value");
    assert.ok(stmt.includes("'admitted'"), "the initiator insert no longer admits at 'admitted'; that changes the journey");
  }

  // Nothing else drifted: the body must equal 20260729b's with only those edits.
  const originalFn = sql.slice(
    sql.indexOf("create or replace function public.deal_room_propose("),
    sql.indexOf("\n$$;\n", sql.indexOf("create or replace function public.deal_room_propose(")) + 5,
  );
  const patchedFn = patched.slice(
    patched.indexOf("create or replace function public.deal_room_propose("),
    patched.indexOf("\n$$;\n", patched.indexOf("create or replace function public.deal_room_propose(")) + 5,
  );
  const normalise = (s: string) =>
    s
      .replace(/participation_authority, declared_capacity, is_required_approver, is_room_administrator,\s*\n\s*state, admitted_at\)/g,
        "participation_authority, is_required_approver, is_room_administrator, state, admitted_at)")
      .replace(/'Owner of the published Deal', 'Deal owner',/g, "'Owner of the published Deal',");
  assert.equal(
    normalise(patchedFn),
    originalFn,
    "20260731b differs from 20260729b's deal_room_propose by more than the declared_capacity fix",
  );

  // It must not touch anything but that one function.
  const code = patched.replace(/--[^\n]*/g, "");
  for (const forbidden of [/create policy/i, /drop policy/i, /alter table/i, /create table/i, /create trigger/i, /create index/i, /alter default privileges/i, /\bgrant\s/i, /\brevoke\s/i]) {
    assert.equal(forbidden.test(code), false, `20260731b contains ${forbidden} - it must only replace one function`);
  }
});

test("20260731c fixes the procedure approver gate and touches nothing else", () => {
  const FILE = "supabase/migrations/20260731c_deal_room_procedure_approver_gate.sql";
  const patched = readFileSync(FILE, "utf8");

  // Exactly the three functions the defect lives in, and no fourth.
  const replaced = Array.from(patched.matchAll(/create or replace function public\.(deal_room_\w+)\(/g), (m) => m[1]);
  assert.deepEqual(replaced.sort(), [
    "deal_room_admit_participant",
    "deal_room_approve_procedure",
    "deal_room_propose_procedure",
  ]);

  // 1. An admitted principal becomes a required approver, and nothing is demoted.
  assert.match(
    patched,
    /is_required_approver = is_required_approver or v_p\.participant_class = 'principal'/,
    "admission no longer makes an admitted principal a required approver",
  );

  // 2. One approval row per person, deterministically chosen.
  assert.match(
    patched,
    /select distinct on \(p\.profile_id\) v_id, p\.id, 'pending'/,
    "the seed is back to one row per participant row, which issues the initiator two obligations",
  );
  // Which row it prefers is 20260731d's business; that it chooses deterministically
  // is this file's.
  assert.match(patched, /order by p\.profile_id,/, "the seed's choice is not deterministic");

  // 3. Approval is by person, not by whichever participant row `limit 1` found.
  assert.equal(
    /where procedure_id = p_procedure_id and participant_id = v_participant/.test(patched),
    false,
    "the approval update is keyed on a single participant row again; that is the defect",
  );
  assert.match(
    patched,
    /where p\.id = a\.participant_id and p\.profile_id = auth\.uid\(\)/,
    "the approval update no longer joins on the caller's profile",
  );

  // A caller with no row on this version must be refused, not silently ignored -
  // otherwise the outstanding count can reach zero without them.
  assert.match(patched, /This procedure version does not list you as a required approver/);

  // Nothing outside the function bodies. Strip the `$$ ... $$` blocks and what
  // remains must be the three statement headers, `begin;` and `commit;` - no
  // DDL, and in particular no backfill of existing rows.
  const outside = patched.replace(/\$\$[\s\S]*?\$\$/g, " BODY ").replace(/--[^\n]*/g, " ");
  for (const forbidden of [
    /create policy/i, /drop policy/i, /alter table/i, /create table/i, /create trigger/i,
    /create index/i, /alter default privileges/i, /\bgrant\s/i, /\brevoke\s/i,
    /\binsert\s+into\b/i, /\bupdate\s+public\./i, /\bdelete\s+from\b/i,
  ]) {
    assert.equal(forbidden.test(outside), false, `20260731c contains ${forbidden} outside a function body`);
  }
});

test("20260731d seeds an approver row the other approvers can read", () => {
  const FILE = "supabase/migrations/20260731d_deal_room_approver_row_visibility.sql";
  const patched = readFileSync(FILE, "utf8");

  // One function, and it is the one that seeds.
  const replaced = Array.from(patched.matchAll(/create or replace function public\.(deal_room_\w+)\(/g), (m) => m[1]);
  assert.deepEqual(replaced, ["deal_room_propose_procedure"]);

  // The row must be visible to a counterparty. `participant read` allows another
  // person's row only when `sub_room_id is not null`, so a master-level row is
  // readable by a room administrator alone - which left the counterparty looking
  // at an approver the page could not name.
  assert.match(
    patched,
    /order by p\.profile_id,\s*\n\s*\(p\.sub_room_id = p_sub_room_id\) desc nulls last,\s*\n\s*\(p\.sub_room_id is not null\) desc,/,
    "the seed no longer prefers a row the other approvers are allowed to read",
  );
  assert.equal(
    /\(p\.sub_room_id is null\) desc/.test(patched),
    false,
    "the master-level row is preferred again; that is the defect 20260731d exists to fix",
  );

  // Still one row per person, and still deterministic.
  assert.match(patched, /select distinct on \(p\.profile_id\) v_id, p\.id, 'pending'/);
  assert.match(patched, /p\.admitted_at nulls last, p\.id;/);

  // Nothing outside the function body.
  const outside = patched.replace(/\$\$[\s\S]*?\$\$/g, " BODY ").replace(/--[^\n]*/g, " ");
  for (const forbidden of [
    /create policy/i, /drop policy/i, /alter table/i, /create table/i, /create trigger/i,
    /create index/i, /alter default privileges/i, /\bgrant\s/i, /\brevoke\s/i,
    /\binsert\s+into\b/i, /\bupdate\s+public\./i, /\bdelete\s+from\b/i,
  ]) {
    assert.equal(forbidden.test(outside), false, `20260731d contains ${forbidden} outside a function body`);
  }
});

console.log(`ok   deal-room grant signatures: ${passed} assertions passed`);
