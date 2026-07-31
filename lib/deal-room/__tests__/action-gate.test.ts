// Every Deal Room server action is behind the flag, or is a named exception.
//
// Run: npx tsx lib/deal-room/__tests__/action-gate.test.ts
//
// ## Why this file exists
//
// Approval 4 turns `NEXT_PUBLIC_DEAL_ROOM` on. The whole case for doing that
// safely is acceptance criterion 16 - turning it off again removes access to the
// unfinished slice - and on 31 July 2026 that was not true.
//
// `lib/deal-room/flags.ts` claimed the allowlist was "checked in every server
// route and command handler". **Eleven of the fifteen server actions did not
// check it.** Four of those are the admission path and have a real reason; the
// other seven - approve a procedure, request and answer a clarification, accept
// evidence, open and resolve a blocker, set a room read-only - had none.
//
// With the flag off the routes 404, so a member cannot reach a form. But a
// server action is an endpoint, not a page: it stays in the deployed bundle and
// stays invokable. So the off switch did not stop seven of the fifteen ways to
// change a room, and neither did removing somebody from the allowlist.
//
// None of it was a security hole - Row Level Security is the boundary and every
// command re-checks participation - but "we can turn it off" was not true, and
// that is the sentence Approval 4 rests on.
//
// A comment saying so would have been worth nothing; the previous comment said
// the opposite of the truth for two days. This reads the file.

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

const FILE = "app/[locale]/deal-rooms/actions.ts";
const source = readFileSync(FILE, "utf8");

/**
 * The admission path, and the only actions permitted to skip the gate.
 *
 * An invited counterparty is not necessarily on `DEAL_ROOM_ALLOWLIST` - the
 * allowlist controls who may OPEN a room, not who may be brought into one.
 * Gating these would mean a pilot member could invite somebody who then could
 * not accept.
 *
 * Adding to this list is a deliberate act. It should need an argument as good as
 * that one, and the same argument written where the action is.
 */
const GATE_EXCEPTIONS = ["acceptInvitation", "declareParticipation", "acceptAgreement", "completeAdmission"];

/** Every exported server action, with its body. */
function actions(): { name: string; body: string }[] {
  const found: { name: string; body: string }[] = [];
  const pattern = /export async function (\w+)\(formData: FormData\)[\s\S]*?\n\}/g;
  for (const match of Array.from(source.matchAll(pattern))) {
    found.push({ name: match[1], body: match[0] });
  }
  return found;
}

test("the actions file is being read, and holds the whole command surface", () => {
  const names = actions().map((a) => a.name);
  assert.ok(names.length >= 15, `found ${names.length} actions; the parser has drifted from the file`);
  for (const expected of ["proposeRoom", "sendInvitation", "setReadOnly"]) {
    assert.ok(names.includes(expected), `${expected} was not found; the parser has drifted from the file`);
  }
});

test("every server action calls the flag gate, or is a named exception", () => {
  const ungated = actions()
    .filter((action) => !GATE_EXCEPTIONS.includes(action.name))
    .filter((action) => !/await gate\(\)/.test(action.body))
    .map(
      (action) =>
        `${action.name} does not call gate(). With the flag off it still runs, so turning the flag off ` +
        `does not turn the Deal Room off. Gate it, or add it to GATE_EXCEPTIONS with the reason.`,
    );
  assert.deepEqual(ungated, []);
});

test("the exceptions are exactly the admission path, and all four still exist", () => {
  // If one is renamed or removed, this fails rather than silently exempting
  // nothing - an exception list that names something absent is not a list.
  const names = actions().map((a) => a.name);
  for (const exception of GATE_EXCEPTIONS) {
    assert.ok(names.includes(exception), `GATE_EXCEPTIONS names ${exception}, which no longer exists`);
  }
});

test("an exempt action is still governed, by the command it calls", () => {
  // The exemption is from routing, not from authorisation. Each of the four
  // reaches the database through a `deal_room_*` command, which re-proves who
  // the caller is.
  for (const action of actions().filter((a) => GATE_EXCEPTIONS.includes(a.name))) {
    assert.match(
      action.body,
      /\.rpc\("deal_room_\w+"/,
      `${action.name} is exempt from the flag gate and does not call a deal_room_* command either`,
    );
  }
});

test("the gate refuses rather than continuing", () => {
  // `gate()` returning null must stop the action. An action that logged and
  // carried on would pass the check above and do nothing.
  const gated = actions().filter((a) => /await gate\(\)/.test(a.body));
  const soft = gated
    .filter((a) => !/if \(!\(await gate\(\)\)\) fail\(/.test(a.body) && !/if \(!allowed\) fail\(/.test(a.body))
    .map((a) => `${a.name} calls gate() but does not fail() when it refuses`);
  assert.deepEqual(soft, []);
});

console.log(`ok   deal-room action gate: ${passed} assertions passed`);
