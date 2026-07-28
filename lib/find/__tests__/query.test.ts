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
  findQueryIsAnswerable,
  toInventoryQuery,
  type FindQuery,
} from "../query";
import { TRADE_SERVICE_CATEGORIES } from "../../taxonomy/services";
import { DISTRIBUTION_PARTNER_TYPES } from "../../taxonomy/distribution";

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
  family: null, serviceCategory: null, serviceSubcategory: null, partnerType: null,
  sector: null, territory: null,
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

// ---------------------------------------------------------------------------
// 11 and 17. Find reads the canonical taxonomy, and searches on its keys
// ---------------------------------------------------------------------------

test("Find reads the same category authority the composer stores from", () => {
  // Not a copy that happens to match today. The keys Find accepts in a URL are
  // exactly the keys lib/taxonomy declares, so a category added there is
  // searchable without touching Find at all.
  for (const category of TRADE_SERVICE_CATEGORIES) {
    const q = parseFindQuery({ family: "services", serviceCategory: category.key });
    assert.equal(q.serviceCategory, category.key, `${category.key} is not searchable`);
  }
  for (const type of DISTRIBUTION_PARTNER_TYPES) {
    const q = parseFindQuery({ family: "distribution", partnerType: type.key });
    assert.equal(q.partnerType, type.key, `${type.key} is not searchable`);
  }
});

test("a category that does not exist is not read as a filter", () => {
  // Otherwise Find prints a confident empty result for a category nobody has.
  const q = parseFindQuery({ family: "services", serviceCategory: "banana" });
  assert.equal(q.serviceCategory, null);
});

test("a subcategory is only read inside its own category", () => {
  const right = parseFindQuery({
    family: "services",
    serviceCategory: "freight",
    serviceSubcategory: "freight.ocean",
  });
  assert.equal(right.serviceSubcategory, "freight.ocean");

  // A subcategory from another category is a contradiction, not a narrowing.
  const wrong = parseFindQuery({
    family: "services",
    serviceCategory: "customs",
    serviceSubcategory: "freight.ocean",
  });
  assert.equal(wrong.serviceSubcategory, null);

  const orphan = parseFindQuery({ family: "services", serviceSubcategory: "freight.ocean" });
  assert.equal(orphan.serviceSubcategory, null);
});

test("the canonical keys survive the URL round trip", () => {
  const href = buildFindHref({
    family: "services",
    serviceCategory: "freight",
    serviceSubcategory: "freight.ocean",
    territory: "ES",
  });
  assert.ok(href.indexOf("family=services") > 0, href);
  assert.ok(href.indexOf("serviceCategory=freight") > 0, href);
  assert.ok(href.indexOf("serviceSubcategory=freight.ocean") > 0, href);
  assert.ok(href.indexOf("territory=ES") > 0, href);
});

test("a territory is stored as an ISO-2 code, upper-cased, or not at all", () => {
  assert.equal(parseFindQuery({ territory: "es" }).territory, "ES");
  assert.equal(parseFindQuery({ territory: "Spain" }).territory, null);
});

test("each family knows what it needs before it can answer", () => {
  // The whole reason Trade services and Distribution had no working search:
  // Find demanded a typed product, and neither family has one.
  const services = parseFindQuery({ family: "services" });
  assert.equal(findQueryIsAnswerable(services), false);
  assert.equal(
    findQueryIsAnswerable(parseFindQuery({ family: "services", serviceCategory: "freight" })),
    true,
  );

  const distribution = parseFindQuery({ family: "distribution" });
  assert.equal(findQueryIsAnswerable(distribution), false);
  assert.equal(
    findQueryIsAnswerable(parseFindQuery({ family: "distribution", partnerType: "distributor" })),
    true,
  );

  // Products is unchanged: it still needs a product, and a legacy link that
  // names one without a family still works.
  assert.equal(findQueryIsAnswerable(parseFindQuery({ family: "products" })), false);
  assert.equal(findQueryIsAnswerable(parseFindQuery({ product: "sugar" })), true);
});

test("the search that runs is the one the URL described", () => {
  // One translation, in one place, so the two lanes and the Market Signals
  // board cannot interpret the same URL differently.
  const q = parseFindQuery({
    family: "services",
    serviceCategory: "freight",
    serviceSubcategory: "freight.ocean",
    territory: "es",
    intent: "offer",
  });
  const inventory = toInventoryQuery(q);
  assert.equal(inventory.family, "services");
  assert.equal(inventory.serviceCategory, "freight");
  assert.equal(inventory.serviceSubcategory, "freight.ocean");
  assert.equal(inventory.territory, "ES");
  assert.equal(inventory.side, "offer");
  // A service filter has no partner type and no sector to narrow by.
  assert.equal(inventory.partnerType, null);
  assert.equal(inventory.sector, null);
});

console.log(`find/query: ${passed} passed`);
