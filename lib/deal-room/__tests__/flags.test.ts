// The flag and the allowlist, which had no test at all.
//
// Run: npx tsx lib/deal-room/__tests__/flags.test.ts
//
// ## Why this file exists
//
// `dealRoomAvailableTo()` decides whether a member reaches the Deal Room. It is
// the whole of the staged-rollout control that Approval 4 turns on, and on 31
// July 2026 nothing exercised it.
//
// ## The defaults were inverted on 1 August 2026
//
// This file used to assert the opposite of what it asserts now, and the
// original reasoning is kept because it was correct for the situation it was
// written in: a missing `DEAL_ROOM_ALLOWLIST` had to mean NOBODY, because an
// env var absent in one environment and set in another is exactly the shape of
// mistake that opens an unreleased feature to a whole market.
//
// The Deal Room stopped being unreleased. The entrance now makes "Open a Deal
// Room" the largest control on the site, and the empty-means-nobody default
// therefore made the front page lie: on production the list was never
// populated, so the primary call to action was unreachable for every human
// being including the owner. The owner instructed the inversion on 1 August
// 2026 after following his own CTA into a wall.
//
// What still matters, and is asserted below with the same force the old rule
// had:
//
//   1. An anonymous visitor is NEVER admitted. No profile id, no room.
//   2. An explicit `NEXT_PUBLIC_DEAL_ROOM=off` closes it completely, so there
//      is always a way back to closed that does not need a code change.
//   3. A populated allowlist still NARROWS. Setting it must not be a no-op,
//      or the staged-rollout control would be gone rather than inverted.
//
// None of this is a data boundary. RLS is, and it is unchanged: a member let
// through by this function still sees only rooms they participate in.

import assert from "node:assert/strict";
import { allowlist, dealRoomAvailableTo, dealRoomRoutesEnabled } from "../flags";

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

const PROFILE = "11111111-1111-1111-1111-111111111111";
const ORG = "22222222-2222-2222-2222-222222222222";
const OTHER = "33333333-3333-3333-3333-333333333333";

/** Set the two variables for one case and put them back. */
function withEnv(flag: string | undefined, list: string | undefined, fn: () => void): void {
  const before = { flag: process.env.NEXT_PUBLIC_DEAL_ROOM, list: process.env.DEAL_ROOM_ALLOWLIST };
  try {
    if (flag === undefined) delete process.env.NEXT_PUBLIC_DEAL_ROOM;
    else process.env.NEXT_PUBLIC_DEAL_ROOM = flag;
    if (list === undefined) delete process.env.DEAL_ROOM_ALLOWLIST;
    else process.env.DEAL_ROOM_ALLOWLIST = list;
    fn();
  } finally {
    if (before.flag === undefined) delete process.env.NEXT_PUBLIC_DEAL_ROOM;
    else process.env.NEXT_PUBLIC_DEAL_ROOM = before.flag;
    if (before.list === undefined) delete process.env.DEAL_ROOM_ALLOWLIST;
    else process.env.DEAL_ROOM_ALLOWLIST = before.list;
  }
}

// ---------------------------------------------------------------------------
// The default is every signed-in member, and never an anonymous visitor
// ---------------------------------------------------------------------------

test("an absent allowlist admits any signed-in member", () => {
  withEnv(undefined, undefined, () => {
    assert.equal(allowlist().size, 0);
    assert.equal(dealRoomAvailableTo(PROFILE, ORG), true, "an unrestricted deployment refused a member");
    assert.equal(dealRoomAvailableTo(OTHER, null), true, "admission depended on being named somewhere");
  });
});

test("an empty or whitespace allowlist parses to no restriction", () => {
  for (const value of ["", "   ", ",", " , , "]) {
    withEnv(undefined, value, () => {
      assert.equal(allowlist().size, 0, `"${value}" parsed to a non-empty allowlist`);
      assert.equal(dealRoomAvailableTo(PROFILE, ORG), true, `"${value}" refused a signed-in member`);
    });
  }
});

test("an anonymous visitor is never admitted, however open the deployment is", () => {
  // The one rule that did not change, and the one that carries the weight now.
  // There is no profile for the policies to answer for, so there is nothing
  // that could be safely shown.
  for (const list of [undefined, "", PROFILE]) {
    withEnv(undefined, list, () => {
      assert.equal(dealRoomAvailableTo(null, null), false, "an anonymous visitor reached the room");
      assert.equal(dealRoomAvailableTo(null, ORG), false, "an org id stood in for a member");
    });
  }
});

// ---------------------------------------------------------------------------
// The flag
// ---------------------------------------------------------------------------

test("only exactly `off` turns the routes off", () => {
  withEnv("off", undefined, () => {
    assert.equal(dealRoomRoutesEnabled(), false);
    assert.equal(dealRoomAvailableTo(PROFILE, ORG), false, "`off` did not close the feature");
  });
  // Everything else is on, including absent. The one-variable way back to
  // closed has to be unambiguous, so near-misses do NOT close it: a deployment
  // that meant to close the room and typed "OFF" would otherwise think it had.
  for (const value of [undefined, "", "on", "ON", "OFF", "true", "0", "no", " off"]) {
    withEnv(value, undefined, () => {
      assert.equal(dealRoomRoutesEnabled(), true, `"${String(value)}" was treated as off`);
    });
  }
});

test("a populated allowlist still narrows, so the control is inverted and not removed", () => {
  withEnv(undefined, PROFILE, () => {
    assert.equal(dealRoomAvailableTo(PROFILE, null), true, "a listed member was refused");
    assert.equal(dealRoomAvailableTo(OTHER, null), false, "setting the allowlist admitted everybody anyway");
  });
  withEnv("off", PROFILE, () => {
    assert.equal(dealRoomAvailableTo(PROFILE, ORG), false, "the flag lost to the allowlist");
  });
});

// ---------------------------------------------------------------------------
// Who it admits
// ---------------------------------------------------------------------------

test("a member is admitted by their own profile id", () => {
  withEnv("on", PROFILE, () => {
    assert.equal(dealRoomAvailableTo(PROFILE, null), true);
    assert.equal(dealRoomAvailableTo(OTHER, null), false);
  });
});

test("a member is admitted by their organisation id", () => {
  withEnv("on", ORG, () => {
    assert.equal(dealRoomAvailableTo(OTHER, ORG), true, "an allowlisted organisation did not admit its member");
    assert.equal(dealRoomAvailableTo(OTHER, null), false);
  });
});

test("entries are trimmed, so a spaced list still works", () => {
  withEnv("on", ` ${PROFILE} , ${ORG} `, () => {
    assert.equal(allowlist().size, 2);
    assert.equal(dealRoomAvailableTo(PROFILE, null), true);
    assert.equal(dealRoomAvailableTo(OTHER, ORG), true);
  });
});

test("a signed-out visitor is never admitted, whatever the allowlist says", () => {
  withEnv("on", `${PROFILE},${ORG}`, () => {
    assert.equal(dealRoomAvailableTo(null, ORG), false, "a null profile was admitted by its organisation");
    assert.equal(dealRoomAvailableTo(null, null), false);
  });
});

test("an allowlist entry does not match by prefix or substring", () => {
  // `Set.has` is exact, but this is the assertion that would catch a change to
  // `some(entry => id.startsWith(entry))` or a stray `includes`.
  withEnv("on", PROFILE.slice(0, 8), () => {
    assert.equal(dealRoomAvailableTo(PROFILE, null), false, "a partial id admitted a member");
  });
});

console.log(`ok   deal-room flags: ${passed} assertions passed`);
