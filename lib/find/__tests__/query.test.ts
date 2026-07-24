// Tests for the Find query: URL round-trip and the board lane matcher.
//
// Run: npx tsx lib/find/__tests__/query.test.ts
//
// Pure logic (lib/find/query.ts). node:assert, non-zero exit on failure.

import assert from "node:assert/strict";
import {
  parseFindQuery,
  buildFindHref,
  matchesFindQuery,
  type FindQuery,
} from "../query";

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

// ---- parse -----------------------------------------------------------------
test("parseFindQuery reads the fields and defaults the rest to null", () => {
  const q = parseFindQuery({ product: "almonds", intent: "requirement", minQty: "500" });
  assert.equal(q.product, "almonds");
  assert.equal(q.intent, "requirement");
  assert.equal(q.minQty, 500);
  assert.equal(q.market, null);
  assert.equal(q.lane, null);
});

test("parseFindQuery rejects junk intent, lane and quantity", () => {
  const q = parseFindQuery({ intent: "nonsense", lane: "both", minQty: "-3" });
  assert.equal(q.intent, null);
  assert.equal(q.lane, null);
  assert.equal(q.minQty, null);
});

test("parseFindQuery takes the first value of a repeated param", () => {
  const q = parseFindQuery({ product: ["almonds", "pistachios"] });
  assert.equal(q.product, "almonds");
});

// ---- build -----------------------------------------------------------------
test("buildFindHref omits empty params and survives a round-trip", () => {
  assert.equal(buildFindHref({}), "/find");
  const href = buildFindHref({ product: "refined sugar", intent: "offer", lane: "signals" });
  const sp = Object.fromEntries(new URLSearchParams(href.split("?")[1]));
  const q = parseFindQuery(sp);
  assert.equal(q.product, "refined sugar");
  assert.equal(q.intent, "offer");
  assert.equal(q.lane, "signals");
});

// ---- matcher ---------------------------------------------------------------
function deal(over: Record<string, unknown> = {}) {
  return {
    type: "requirement",
    product: "Refined cane sugar ICUMSA 45",
    hsCode: "1701.99",
    quantity: "25000",
    originText: "Brazil",
    destinationText: "Algeria",
    originCode: "BR",
    destinationCode: "DZ",
    ...over,
  } as Parameters<typeof matchesFindQuery>[0];
}
const Q = (over: Partial<FindQuery> = {}): FindQuery => ({
  product: null, intent: null, market: null, origin: null, minQty: null, lane: null, ...over,
});

test("product matches product text or HS code", () => {
  assert.equal(matchesFindQuery(deal(), Q({ product: "sugar" })), true);
  assert.equal(matchesFindQuery(deal(), Q({ product: "1701" })), true);
  assert.equal(matchesFindQuery(deal(), Q({ product: "almonds" })), false);
});

test("intent must equal the row type when set", () => {
  assert.equal(matchesFindQuery(deal(), Q({ intent: "requirement" })), true);
  assert.equal(matchesFindQuery(deal(), Q({ intent: "offer" })), false);
});

test("market and origin match corridor text or code", () => {
  assert.equal(matchesFindQuery(deal(), Q({ market: "algeria" })), true);
  assert.equal(matchesFindQuery(deal(), Q({ market: "DZ" })), true);
  assert.equal(matchesFindQuery(deal(), Q({ origin: "india" })), false);
});

test("minQty excludes smaller stated quantities but keeps unstated ones", () => {
  assert.equal(matchesFindQuery(deal(), Q({ minQty: 10000 })), true);
  assert.equal(matchesFindQuery(deal(), Q({ minQty: 50000 })), false);
  // Quantity absent -> unknown, not zero: not excluded.
  assert.equal(matchesFindQuery(deal({ quantity: null }), Q({ minQty: 50000 })), true);
});

console.log(`find/query: ${passed} passed`);
