// The grant contract of the multilingual migration: no function is left callable
// by anon, worker commands are service_role only, and members can call only the
// member commands. This is the guard against reproducing LB-008.
//
// Run: npx tsx lib/deal-room/__tests__/multilingual-grants.test.ts
//
// ## Why this file exists
//
// LB-008 exists because `revoke ... from public` does not remove Supabase's
// default explicit EXECUTE grants to anon and authenticated. So it is not enough
// to revoke from public: every function must be revoked from anon by name. This
// asserts that for every function the migration declares, and pins each function
// to the single role that may call it.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const sql = readFileSync(
  join(__dirname, "../../../supabase/migrations/20260730b_deal_room_multilingual.sql"),
  "utf8",
);

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

// Every deal_room_* function this migration declares.
const declaredFunctions = Array.from(
  sql.matchAll(/create or replace function public\.(deal_room_\w+)\(/g),
).map((m) => m[1]);

const MEMBER_COMMANDS = [
  "deal_room_set_participant_language",
  "deal_room_post_message",
  "deal_room_correct_message",
  "deal_room_confirm_interpretation",
  "deal_room_reject_interpretation",
];
const WORKER_COMMANDS = ["deal_room_record_translation", "deal_room_record_interpretation"];

test("the migration declares the expected commands plus the append-only helper", () => {
  const unique = new Set(declaredFunctions);
  for (const fn of [...MEMBER_COMMANDS, ...WORKER_COMMANDS, "deal_room_row_append_only"]) {
    assert.ok(unique.has(fn), `expected function ${fn} to be declared`);
  }
});

test("every declared function is revoked from anon AND authenticated by name (the LB-008 guard)", () => {
  for (const fn of Array.from(new Set(declaredFunctions))) {
    // A revoke line for this function that names both anon and authenticated.
    const revoke = new RegExp(`revoke all on function public\\.${fn}\\([^)]*\\) from public, anon, authenticated`);
    assert.match(sql, revoke, `${fn} must be revoked from public, anon and authenticated by name`);
  }
});

test("no function is revoked from public alone (the exact LB-008 mistake)", () => {
  const revokes = Array.from(sql.matchAll(/revoke all on function[^;]*;/g)).map((m) => m[0]);
  for (const line of revokes) {
    assert.match(line, /from public, anon, authenticated/, `a revoke must name anon and authenticated: ${line.slice(0, 90)}`);
  }
});

test("member commands are granted to authenticated", () => {
  for (const fn of MEMBER_COMMANDS) {
    const grant = new RegExp(`grant execute on function public\\.${fn}\\([^)]*\\) to authenticated`);
    assert.match(sql, grant, `${fn} must be granted to authenticated`);
  }
});

test("worker commands are granted to service_role and NOT to authenticated", () => {
  for (const fn of WORKER_COMMANDS) {
    const toService = new RegExp(`grant execute on function public\\.${fn}\\([^)]*\\) to service_role`);
    assert.match(sql, toService, `${fn} must be granted to service_role`);
    const toAuth = new RegExp(`grant execute on function public\\.${fn}\\([^)]*\\) to authenticated`);
    assert.doesNotMatch(sql, toAuth, `${fn} must NOT be granted to authenticated (a member could forge)`);
  }
});

test("the append-only helper is granted to no member role", () => {
  assert.match(sql, /revoke all on function public\.deal_room_row_append_only\(\) from public, anon, authenticated/);
  assert.doesNotMatch(sql, /grant execute on function public\.deal_room_row_append_only\(\) to (authenticated|anon)/);
});

test("no worker command is callable by a member, and no member command is callable by anon", () => {
  // Belt and braces: assert there is no grant to anon anywhere in the file.
  assert.doesNotMatch(sql, /grant execute on function[^;]*to anon/, "no function may be granted to anon");
});

console.log(`ok   deal-room multilingual grants: ${passed} assertions passed`);
