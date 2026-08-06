// B01: six choices, seven stored values, and the family CHECK that crashed us.
//
// Run: npx tsx lib/structure/__tests__/intent-choice.test.ts
//
// Authority: PONTE-BUILD-1-LISTING-PATH-v2.md, mapping table confirmed by the
// owner 6 August 2026.
//
// Two properties carry the weight here, and both have already cost real time:
//
//   THE AXES MUST NOT COLLAPSE. The live /structure screen offers three options
//   because family and direction were merged into one list and position was
//   lost. Six presented choices against seven stored values is the fix, and a
//   test that only checked "six choices exist" would pass on the broken screen.
//
//   market_family IS A CLOSED SET. `goods`, `trade_services` and `product` are
//   outside the CHECK on both listings and deal_rooms. A row carrying one is
//   what killed the signed-in render of /deal-rooms/propose on 2 August, and
//   the database would have refused to store it - so it came from code.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  PRESENTED_CHOICES,
  POSITION_OPTIONS,
  needsPosition,
  resolveIntent,
  sideFor,
  type Direction,
  type Position,
} from "../intent-choice";
import { MARKET_INTENTS, type MarketFamily } from "@/lib/taxonomy/market";

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

/** The confirmed table, transcribed. Rows 5 and 6 share a presented choice. */
const TABLE: {
  family: MarketFamily;
  direction: Direction;
  position: Position | null;
  stored: string;
}[] = [
  { family: "products", direction: "need", position: null, stored: "source_product" },
  { family: "products", direction: "offer", position: null, stored: "offer_product" },
  { family: "services", direction: "need", position: null, stored: "seek_trade_service" },
  { family: "services", direction: "offer", position: null, stored: "offer_trade_service" },
  { family: "distribution", direction: "need", position: "principal", stored: "seek_distribution_partner" },
  {
    family: "distribution",
    direction: "need",
    position: "distributor_or_representative",
    stored: "seek_brands_or_products_to_represent",
  },
  {
    family: "distribution",
    direction: "offer",
    position: "distributor_or_representative",
    stored: "offer_distribution_or_representation",
  },
];

/* ------------------------------------------------------------------ *
 * The table, row by row
 * ------------------------------------------------------------------ */

test("every row of the confirmed table resolves to the value it names", () => {
  for (const row of TABLE) {
    const result = resolveIntent(row.family, row.direction, row.position);
    assert.equal(
      result.outcome,
      "resolved",
      `${row.family}/${row.direction}/${row.position ?? "-"} did not resolve`,
    );
    assert.equal(
      result.outcome === "resolved" && result.intent,
      row.stored,
      `${row.family}/${row.direction}/${row.position ?? "-"} should store ${row.stored}`,
    );
  }
});

test("all seven stored values are reachable, and they are the database's seven", () => {
  /*
    The count is the point. Six presented choices could reach six values and
    look correct; the seventh exists precisely because one choice splits.

    Compared against MARKET_INTENTS rather than a second hand-written list, so
    the taxonomy and this mapping cannot drift apart silently.
  */
  const reachable = new Set(
    TABLE.map((row) => {
      const r = resolveIntent(row.family, row.direction, row.position);
      return r.outcome === "resolved" ? r.intent : "";
    }),
  );
  assert.equal(reachable.size, 7, `only ${reachable.size} of the seven values are reachable`);
  assert.deepEqual(
    Array.from(reachable).sort(),
    MARKET_INTENTS.map((i) => i.key).slice().sort(),
    "the reachable set is not the taxonomy's set",
  );
});

test("six choices are presented, not seven and not three", () => {
  // Three is the live screen. Seven would leak storage into presentation and
  // ask a member to distinguish two things that read identically until you
  // know which side you are on.
  assert.equal(PRESENTED_CHOICES.length, 6);
  assert.equal(new Set(PRESENTED_CHOICES.map((c) => c.key)).size, 6, "a choice key is duplicated");
});

test("every presented choice reaches a stored value, alone or after the position question", () => {
  for (const choice of PRESENTED_CHOICES) {
    const first = resolveIntent(choice.family, choice.direction, null);
    if (first.outcome === "resolved") continue;
    // The one that asks: it must then resolve for BOTH answers.
    for (const option of POSITION_OPTIONS) {
      const second = resolveIntent(choice.family, choice.direction, option.key);
      assert.equal(second.outcome, "resolved", `${choice.key} + ${option.key} never resolves`);
    }
  }
});

/* ------------------------------------------------------------------ *
 * The position question
 * ------------------------------------------------------------------ */

test("the position question is asked ONLY in the distribution branch", () => {
  for (const family of ["products", "services"] as const) {
    for (const direction of ["need", "offer"] as const) {
      assert.equal(
        needsPosition(family, direction),
        false,
        `${family}/${direction} asks for a position, which is meaningless outside distribution`,
      );
    }
  }
  assert.equal(needsPosition("distribution", "need"), true);
});

test("it is not asked on the OFFER side, where the answer is already known", () => {
  /*
    Only a distributor or representative can offer distribution. A principal
    with goods to sell is offering a PRODUCT. Asking anyway would collect an
    answer nothing reads, and invite `distribution + offer + principal`, which
    the table deliberately does not contain.
  */
  assert.equal(needsPosition("distribution", "offer"), false);
  const result = resolveIntent("distribution", "offer", null);
  assert.equal(result.outcome === "resolved" && result.intent, "offer_distribution_or_representation");
});

test("distribution + offer ignores a position it did not ask for", () => {
  // Defensive: a stale answer carried forward from a changed mind must not
  // produce a different stored value.
  for (const option of POSITION_OPTIONS) {
    const r = resolveIntent("distribution", "offer", option.key);
    assert.equal(r.outcome === "resolved" && r.intent, "offer_distribution_or_representation");
  }
});

test("the two position answers are counterparties, not synonyms", () => {
  // The whole reason the seventh value exists. If these ever collapse, the
  // board will match a principal seeking a distributor against another
  // principal seeking a distributor.
  const seeking = resolveIntent("distribution", "need", "principal");
  const representing = resolveIntent("distribution", "need", "distributor_or_representative");
  assert.notEqual(
    seeking.outcome === "resolved" && seeking.intent,
    representing.outcome === "resolved" && representing.intent,
  );
});

test("there are exactly two position options and both are offered", () => {
  assert.equal(POSITION_OPTIONS.length, 2);
  assert.deepEqual(
    POSITION_OPTIONS.map((o) => o.key).sort(),
    ["distributor_or_representative", "principal"],
  );
});

/* ------------------------------------------------------------------ *
 * market_family is a closed set
 * ------------------------------------------------------------------ */

test("no resolution can produce a family outside the database CHECK", () => {
  /*
    listings_market_family_check
      CHECK (market_family IS NULL OR market_family IN
             ('products','services','distribution'))

    Validated in production, so no existing row violates it either. A row
    carrying `goods` could never have been stored - which means the value that
    crashed the signed-in path came from code, and this is the assertion that
    stops it coming from here.
  */
  const ALLOWED = new Set(["products", "services", "distribution"]);
  for (const row of TABLE) {
    const r = resolveIntent(row.family, row.direction, row.position);
    assert.ok(r.outcome !== "resolved" || ALLOWED.has(r.family), `produced family ${r.family}`);
  }
  for (const choice of PRESENTED_CHOICES) {
    assert.ok(ALLOWED.has(choice.family), `${choice.key} presents family ${choice.family}`);
  }
});

test("the banned family strings appear nowhere in this module", () => {
  // `goods`, `trade_services` and `product` are outside the CHECK on both
  // listings and deal_rooms. A literal here is a defect whatever it is doing.
  const source = readFileSync("lib/structure/intent-choice.ts", "utf8");
  const code = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
  for (const banned of ['"goods"', '"trade_services"', '"product"']) {
    assert.ok(!code.includes(banned), `the module contains the banned family literal ${banned}`);
  }
});

/* ------------------------------------------------------------------ *
 * Storage vocabulary
 * ------------------------------------------------------------------ */

test("direction maps to the taxonomy's own side vocabulary", () => {
  assert.equal(sideFor("need"), "demand");
  assert.equal(sideFor("offer"), "supply");
});

test("every resolved value agrees with the taxonomy on family and side", () => {
  /*
    Two records of the same fact, checked against each other. `MARKET_INTENTS`
    already carries family and side per value; this mapping derives the value
    from family and direction. If they disagree, one of them is wrong and this
    names which pair.
  */
  for (const row of TABLE) {
    const r = resolveIntent(row.family, row.direction, row.position);
    if (r.outcome !== "resolved") continue;
    const definition = MARKET_INTENTS.find((i) => i.key === r.intent);
    assert.ok(definition, `${r.intent} is not in MARKET_INTENTS`);
    assert.equal(definition.family, row.family, `${r.intent} family disagrees with the taxonomy`);
    assert.equal(definition.side, sideFor(row.direction), `${r.intent} side disagrees with the taxonomy`);
  }
});

console.log(`ok   B01 intent choice: ${passed} assertions passed`);
