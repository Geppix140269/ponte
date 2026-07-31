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
// The property that matters most is the one that is easiest to lose: **a missing
// or empty `DEAL_ROOM_ALLOWLIST` must mean nobody, not everybody.** An env var
// that is absent in one environment and set in another is exactly the shape of
// mistake that opens an unreleased feature to a whole market, and it is a
// one-character edit away - `allowed.size === 0` returning `true` instead of
// `false` would do it, and nothing would have noticed.

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
// The default is nobody
// ---------------------------------------------------------------------------

test("an absent allowlist means nobody, not everybody", () => {
  withEnv("on", undefined, () => {
    assert.equal(allowlist().size, 0);
    assert.equal(dealRoomAvailableTo(PROFILE, ORG), false, "a missing env var opened the feature");
  });
});

test("an empty or whitespace allowlist means nobody", () => {
  for (const value of ["", "   ", ",", " , , "]) {
    withEnv("on", value, () => {
      assert.equal(allowlist().size, 0, `"${value}" parsed to a non-empty allowlist`);
      assert.equal(dealRoomAvailableTo(PROFILE, ORG), false, `"${value}" opened the feature`);
    });
  }
});

// ---------------------------------------------------------------------------
// The flag
// ---------------------------------------------------------------------------

test("only exactly `on` turns the routes on", () => {
  for (const value of [undefined, "", "off", "ON", "true", "1", "yes", " on"]) {
    withEnv(value, PROFILE, () => {
      assert.equal(dealRoomRoutesEnabled(), false, `"${String(value)}" was treated as on`);
      assert.equal(dealRoomAvailableTo(PROFILE, ORG), false, `"${String(value)}" opened the feature`);
    });
  }
  withEnv("on", PROFILE, () => assert.equal(dealRoomRoutesEnabled(), true));
});

test("the flag alone is not enough, and the allowlist alone is not enough", () => {
  withEnv("on", "", () => assert.equal(dealRoomAvailableTo(PROFILE, ORG), false, "flag on, allowlist empty"));
  withEnv("off", PROFILE, () => assert.equal(dealRoomAvailableTo(PROFILE, ORG), false, "allowlist set, flag off"));
  withEnv("on", PROFILE, () => assert.equal(dealRoomAvailableTo(PROFILE, ORG), true, "both set and still refused"));
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
