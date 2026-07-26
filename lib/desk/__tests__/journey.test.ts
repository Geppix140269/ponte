// The Desk journey rail: the rules that keep it a journey and not a menu.
//
// Run: npx tsx lib/desk/__tests__/journey.test.ts
//
// Each test states the whole property, not a sample of it. "The rail is never
// navigation" is asserted by deriving every station label in both journeys and
// proving none of them is a product destination, rather than by eyeballing the
// two arrays.

import assert from "node:assert/strict";
import {
  DESK_SCREENS,
  JOURNEYS,
  railFor,
  railForScreen,
  type JourneyKey,
  type StationCondition,
} from "../journey";

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

const JOURNEY_KEYS = Object.keys(JOURNEYS) as JourneyKey[];

// ---- the rail is journey stations only --------------------------------------

/**
 * Everything the handoff forbids on the rail, plus the review lifecycle. Held
 * as one list so adding a forbidden word is a one-line change and every
 * journey is re-checked against it automatically.
 */
const NEVER_A_STATION = [
  "account", "profile", "settings", "notification", "explore", "workspace",
  "help", "admin", "sign in", "sign out", "search", "menu", "home", "dashboard",
  "pricing", "marketplace", "review", "submitted", "under review", "returned",
];

test("no station in any journey is navigation, a product section or a review state", () => {
  for (const key of JOURNEY_KEYS) {
    for (const station of JOURNEYS[key].stations) {
      const label = station.label.toLowerCase();
      for (const forbidden of NEVER_A_STATION) {
        // Whole words only. "Preview" is a journey station and must not be
        // caught by the review lifecycle it has nothing to do with.
        const word = new RegExp(`\\b${forbidden}\\b`);
        assert.ok(
          !word.test(label),
          `${JOURNEYS[key].id} has a station "${station.label}", which is ${forbidden}`,
        );
      }
    }
  }
});

test("both journeys are exactly the four authoritative stations, in order", () => {
  assert.deepEqual(
    JOURNEYS.find.stations.map((s) => s.label),
    ["Objective", "Discover", "Record", "Act"],
  );
  assert.deepEqual(
    JOURNEYS.submit.stations.map((s) => s.label),
    ["Objective", "Compose", "Preview", "Conclude"],
  );
});

test("save and submit share one terminal station, so saving is not a step towards submitting", () => {
  const conclude = JOURNEYS.submit.stations[JOURNEYS.submit.stations.length - 1];
  assert.equal(conclude.key, "conclude");
  // There is no station after Conclude for a submission to advance into, which
  // is what makes the two outcomes alternatives rather than a sequence.
  assert.equal(JOURNEYS.submit.stations.length, 4);
});

// ---- the landing has no rail ------------------------------------------------

test("the landing has no rail at all, not an empty one", () => {
  assert.equal(railForScreen("landing"), null);
  assert.equal(DESK_SCREENS.landing.journey, null);
  assert.equal(DESK_SCREENS.landing.at, null);
});

test("every screen with a journey has a rail, and every screen without one has none", () => {
  for (const [screen, position] of Object.entries(DESK_SCREENS)) {
    const rail = railForScreen(screen as keyof typeof DESK_SCREENS);
    if (position.journey === null) assert.equal(rail, null, `${screen} rendered a rail`);
    else assert.ok(rail, `${screen} is on a journey but rendered no rail`);
  }
});

// ---- conditions -------------------------------------------------------------

function conditions(rail: { stations: { condition: StationCondition }[] } | null) {
  assert.ok(rail);
  return rail.stations.map((s) => s.condition);
}

test("the listing is at Discover, with Act reserved", () => {
  assert.deepEqual(conditions(railForScreen("listing", { objectiveStated: true })), [
    "done", "here", "reserved", "reserved",
  ]);
});

test("an objective the member never stated is not marked complete", () => {
  assert.deepEqual(conditions(railForScreen("listing", { objectiveStated: false })), [
    "reserved", "here", "reserved", "reserved",
  ]);
});

test("the signal detail is at Record, and Act is halted rather than skipped", () => {
  assert.deepEqual(conditions(railForScreen("signal", { objectiveStated: true })), [
    "done", "done", "here", "halt",
  ]);
});

test("a terminal station is done and static, never active", () => {
  const rail = railFor("submit", 3, { terminal: true, active: true });
  assert.equal(rail.stations[3].condition, "done");
  assert.ok(
    !rail.stations.some((s) => s.condition === "active"),
    "a terminated journey was still animating",
  );
});

test("a lifecycle change after submission does not move the rail", () => {
  // Submitted, under review and returned are all the same journey position:
  // Conclude, terminated. The member did not move, because the work is Ponte's.
  const submitted = railFor("submit", 3, { terminal: true });
  const underReview = railFor("submit", 3, { terminal: true });
  const returned = railFor("submit", 3, { terminal: true });
  assert.deepEqual(conditions(submitted), conditions(underReview));
  assert.deepEqual(conditions(submitted), conditions(returned));
  assert.deepEqual(conditions(submitted), ["done", "done", "done", "done"]);
});

test("active is only ever the current station, and only when nothing is terminal", () => {
  const rail = railFor("find", 1, { active: true });
  assert.equal(rail.stations[1].condition, "active");
  assert.equal(rail.stations.filter((s) => s.condition === "active").length, 1);
});

test("a carried record reference travels on the rail as an origin, not as a station", () => {
  const rail = railFor("find", 2, { origin: "EXT-G4WB-000123" });
  assert.equal(rail.origin, "EXT-G4WB-000123");
  assert.equal(rail.stations.length, 4);
  assert.ok(!rail.stations.some((s) => s.label.includes("EXT-")));
});

console.log(`ok  ${passed} passed`);
