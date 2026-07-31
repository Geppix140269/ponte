// One person, one entry.
//
// Run: npx tsx lib/deal-room/__tests__/participants.test.ts
//
// ## Why this file exists
//
// The surface review of 31 July 2026, run against a loop that finally completed
// end to end. `deal_room_propose` admits the initiator twice - master level and
// first workspace - so from the moment a room exists one person holds two
// participant rows. Three surfaces counted rows and called them people:
//
//   invitationSent: participants.length > 1     // true on a room nobody joined
//   bridgeParticipants = participants.map(...)  // the initiator drawn twice
//   `${participants.length} participants`       // "2 participants", alone
//
// None of it was visible before, because no room had ever existed in production.
//
// The same mistake had just been fixed one layer down: seeding one procedure
// approval per participant row gave the initiator two obligations for themselves
// and no procedure could ever be approved (LB-001, `20260731c`). A row is a
// membership; a person is a party.

import assert from "node:assert/strict";
import { countPeople, onePerPerson } from "../participants";

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

/** The row shape a real room produces, minus everything these functions ignore. */
function row(profileId: string, subRoomId: string | null, id = `${profileId}-${subRoomId ?? "master"}`) {
  return { id, profileId, subRoomId };
}

// The initiator, immediately after `deal_room_propose`, alone in a new room.
const NEW_ROOM = [row("initiator", null), row("initiator", "W-01")];

// After the counterparty is admitted. They hold one row; the initiator two.
const ADMITTED = [...NEW_ROOM, row("counterparty", "W-01")];

test("a room holding only its creator counts as one person, not two rows", () => {
  assert.equal(countPeople(NEW_ROOM), 1, "this is the count that read '2 participants' to someone sitting alone");
  assert.equal(onePerPerson(NEW_ROOM).length, 1, "this is what drew the initiator on the Bridge twice");
});

test("an admitted counterparty makes it two people", () => {
  assert.equal(countPeople(ADMITTED), 2);
  assert.deepEqual(onePerPerson(ADMITTED).map((r) => r.profileId).sort(), ["counterparty", "initiator"]);
});

test("the row kept is the workspace row, not the master-level one", () => {
  // It carries the permissions the person exercises, and - unlike a master-level
  // row - a co-participant of that workspace is allowed to read it.
  assert.equal(onePerPerson(NEW_ROOM)[0].subRoomId, "W-01");
});

test("the master-level row is kept when it is the only one", () => {
  assert.equal(onePerPerson([row("someone", null)])[0].subRoomId, null);
});

test("the choice does not depend on the order the database returned rows in", () => {
  const forwards = onePerPerson(ADMITTED).map((r) => r.id).sort();
  const backwards = onePerPerson([...ADMITTED].reverse()).map((r) => r.id).sort();
  assert.deepEqual(forwards, backwards, "reversing the input changed which rows were kept");
});

test("several workspace rows for one person still collapse to one, deterministically", () => {
  const many = [row("p", null), row("p", "W-02"), row("p", "W-01")];
  const kept = onePerPerson(many);
  assert.equal(kept.length, 1);
  assert.equal(kept[0].subRoomId, "W-01", "the tie between workspace rows is not broken stably");
  assert.equal(onePerPerson([...many].reverse())[0].subRoomId, "W-01");
});

test("an empty room is zero people, not a crash", () => {
  assert.equal(countPeople([]), 0);
  assert.deepEqual(onePerPerson([]), []);
});

test("rows are returned whole, not reduced to the fields these functions read", () => {
  const wide = [{ id: "a", profileId: "p", subRoomId: "W-01", name: "Ada", state: "admitted" as const }];
  assert.deepEqual(onePerPerson(wide), wide, "callers rely on the rest of the row surviving");
});

console.log(`ok   deal-room participants: ${passed} assertions passed`);
