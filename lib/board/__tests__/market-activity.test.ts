// Tests for the North Star market-activity stream and the Explore families.
//
// Run: npx tsx lib/board/__tests__/market-activity.test.ts
//
// The subject is the honesty of the presentation merge: one stream, every item
// still carrying its own true class, no invented classification, no count that
// claims more than the data proves. Pure logic only; no database.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  breakdown,
  fromDeal,
  fromSignal,
  inChapterRange,
  kindForListingType,
  mergeActivity,
  scopeOf,
  type ActivityItem,
} from "../activity-logic";
import {
  busiestSectors,
  familyCounts,
  isFamilyKey,
  itemsInFamily,
  sectorCounts,
} from "../../explore/families";
import type { LiveDeal } from "../live-deals";
import type { MarketSignal } from "../../market-signals/logic";

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

function deal(over: Partial<LiveDeal> = {}): LiveDeal {
  return {
    id: "d1",
    ref: "PT-0001",
    source: "member",
    type: "requirement",
    product: "Almonds",
    hsCode: "0802.11",
    chapter: "08",
    chapterTitle: null,
    quantity: "500",
    unit: "MT",
    incoterm: "CIF",
    payment: null,
    originText: "Spain",
    destinationText: "United Arab Emirates",
    originCode: "ES",
    destinationCode: "AE",
    postedAt: "2026-07-20T10:00:00Z",
    verificationLevel: null,
    href: "/marketplace/l/PT-0001",
    ...over,
  };
}

function signal(over: Partial<MarketSignal> = {}): MarketSignal {
  return {
    id: "s1",
    canonicalId: "EXT-G4WB-000001",
    side: "requirement",
    product: "Almonds",
    hsCode: "0802.11",
    chapter: "08",
    chapterTitle: null,
    quantity: "200",
    unit: "MT",
    incoterm: null,
    payment: null,
    originText: null,
    destinationText: "United Arab Emirates",
    originCode: null,
    destinationCode: "AE",
    spottedAt: "2026-07-22T10:00:00Z",
    publicExpiresAt: null,
    status: "approved_signal",
    description: null,
    summaryLine: null,
    ...over,
  };
}

// ---- classification is truthful ---------------------------------------------

test("a member listing keeps its own class", () => {
  assert.equal(kindForListingType("requirement"), "member_requirement");
  assert.equal(kindForListingType("offer"), "member_offer");
  assert.equal(kindForListingType("service"), "service_requirement");
});

test("an unknown listing type falls back to requirement, never to a review class", () => {
  assert.equal(kindForListingType(""), "member_requirement");
  assert.equal(kindForListingType("something-new"), "member_requirement");
});

test("a Market Signal stays a Market Signal on both sides", () => {
  assert.equal(fromSignal(signal({ side: "requirement" })).kind, "market_signal");
  assert.equal(fromSignal(signal({ side: "offer" })).kind, "market_signal");
});

test("no item is ever classified as reviewed or qualified in this phase", () => {
  const items = mergeActivity([deal(), deal({ id: "d2", type: "offer" })], [signal()]);
  for (const item of items) {
    assert.ok(
      !/reviewed|qualified/.test(item.kind),
      `${item.kind} claims a review this phase cannot prove`,
    );
  }
});

test("the activity item carries no private field", () => {
  const item = fromSignal(signal());
  const keys = Object.keys(item).join(" ");
  for (const banned of ["source", "url", "counterparty", "notes", "raw"]) {
    assert.ok(!keys.includes(banned), `activity item exposes ${banned}`);
  }
});

// ---- facts are only reported when stated ------------------------------------

test("scope is null when the record does not state a quantity", () => {
  assert.equal(scopeOf(null, "MT"), null);
  assert.equal(scopeOf("", "MT"), null);
  assert.equal(scopeOf("500", null), "500");
  assert.equal(scopeOf("500", "MT"), "500 MT");
});

test("geography that was not posted stays null rather than becoming a guess", () => {
  const item = fromSignal(signal({ originText: null, destinationText: null }));
  assert.equal(item.originText, null);
  assert.equal(item.destinationText, null);
});

test("a member record without a ref gets no detail link rather than a broken one", () => {
  assert.equal(fromDeal(deal({ ref: null })).href, null);
  assert.equal(fromDeal(deal()).href, "/marketplace/l/PT-0001");
});

test("a signal links to its own public detail, not to a listing", () => {
  assert.equal(fromSignal(signal()).href, "/market-signals/s1");
});

// ---- the stream ------------------------------------------------------------

test("the stream is newest first across both sources", () => {
  const items = mergeActivity(
    [deal({ id: "d1", postedAt: "2026-07-19T00:00:00Z" })],
    [signal({ id: "s1", spottedAt: "2026-07-22T00:00:00Z" })],
  );
  assert.deepEqual(
    items.map((i) => i.key),
    ["signal:s1", "deal:d1"],
  );
});

test("equal timestamps keep a stable order between renders", () => {
  const at = "2026-07-20T00:00:00Z";
  const a = mergeActivity(
    [deal({ id: "b", postedAt: at }), deal({ id: "a", postedAt: at })],
    [signal({ id: "a", spottedAt: at })],
  );
  const b = mergeActivity(
    [deal({ id: "a", postedAt: at }), deal({ id: "b", postedAt: at })],
    [signal({ id: "a", spottedAt: at })],
  );
  assert.deepEqual(a.map((i) => i.key), b.map((i) => i.key));
});

test("keys cannot collide between a listing and a signal of the same id", () => {
  const items = mergeActivity([deal({ id: "x" })], [signal({ id: "x" })]);
  assert.equal(new Set(items.map((i) => i.key)).size, 2);
});

test("the limit trims the merged stream, not one source", () => {
  const items = mergeActivity(
    [deal({ id: "d1", postedAt: "2026-07-01T00:00:00Z" })],
    [signal({ id: "s1", spottedAt: "2026-07-22T00:00:00Z" })],
    1,
  );
  assert.deepEqual(items.map((i) => i.key), ["signal:s1"]);
});

// ---- counts -----------------------------------------------------------------

const SECTORS = [
  { id: 0, min: 1, max: 14 },
  { id: 1, min: 15, max: 24 },
  { id: 2, min: 25, max: 27 },
];

function items(): ActivityItem[] {
  return mergeActivity(
    [
      deal({ id: "d1", chapter: "08", type: "requirement" }),
      deal({ id: "d2", chapter: "08", type: "offer" }),
      deal({ id: "d3", chapter: "17", type: "requirement" }),
      deal({ id: "d4", chapter: null, hsCode: null, type: "service" }),
    ],
    [signal({ id: "s1", chapter: "08" })],
  );
}

test("a sector count counts market records, split by their real class", () => {
  const counts = sectorCounts(items(), SECTORS);
  const agriculture = counts.find((c) => c.sector.id === 0)!.counts;
  assert.equal(agriculture.total, 3);
  assert.equal(agriculture.demand, 1);
  assert.equal(agriculture.supply, 1);
  assert.equal(agriculture.signals, 1);
});

test("a signal is never counted as member demand or member supply", () => {
  const only = breakdown([fromSignal(signal())]);
  assert.equal(only.demand, 0);
  assert.equal(only.supply, 0);
  assert.equal(only.signals, 1);
});

test("a sector with no records counts zero rather than borrowing from another", () => {
  const counts = sectorCounts(items(), SECTORS);
  assert.equal(counts.find((c) => c.sector.id === 2)!.counts.total, 0);
});

test("chapter filtering is inclusive at both bounds and rejects unknown chapters", () => {
  const set = [
    fromDeal(deal({ id: "a", chapter: "01" })),
    fromDeal(deal({ id: "b", chapter: "14" })),
    fromDeal(deal({ id: "c", chapter: "15" })),
    fromDeal(deal({ id: "d", chapter: null })),
  ];
  assert.equal(inChapterRange(set, 1, 14).length, 2);
});

test("distribution and representation is never given an invented count", () => {
  assert.equal(familyCounts(items()).distribution, null);
});

test("trade services counts member service records only", () => {
  const counts = familyCounts(items());
  assert.equal(counts.services, 1);
  assert.equal(counts.products, 4);
});

// Imported Market Signals carry no HS code, so a products count that required
// a chapter printed "Products 0" next to "Market activity 40" on the live
// preview. A product record is a product record before anyone maps it.
test("a product record with no HS chapter still counts as a product", () => {
  const set = mergeActivity([deal({ id: "d1", chapter: null, hsCode: null })], []);
  const counts = familyCounts(set);
  assert.equal(counts.products, 1);
  assert.equal(counts.unclassified, 1);
  assert.equal(itemsInFamily(set, "products").length, 1);
});

test("unclassified counts only the products no sector can claim", () => {
  const counts = familyCounts(items());
  // d1, d2, d3 and s1 are chaptered; d4 is the service, so none are stranded.
  assert.equal(counts.unclassified, 0);
});

test("busiest sectors are the ones with records, most active first", () => {
  const busiest = busiestSectors(items(), SECTORS, 5);
  assert.deepEqual(busiest.map((s) => s.sector.id), [0, 1]);
});

test("a family listing returns only that family's records", () => {
  assert.equal(itemsInFamily(items(), "services").length, 1);
  assert.equal(itemsInFamily(items(), "products").length, 4);
  assert.deepEqual(itemsInFamily(items(), "distribution"), []);
});

test("only the three approved families are accepted from a URL", () => {
  assert.ok(isFamilyKey("products"));
  assert.ok(isFamilyKey("services"));
  assert.ok(isFamilyKey("distribution"));
  assert.ok(!isFamilyKey("opportunities"));
  assert.ok(!isFamilyKey(null));
});

// ---- the read stays bounded and reuses the rule-filtered sources -------------

test("market activity reads only the two existing public readers", () => {
  const src = readFileSync("lib/board/market-activity.ts", "utf8");
  assert.ok(src.includes("getLiveDeals"), "member records must come from the board reader");
  assert.ok(src.includes("getMarketSignals"), "signals must come from the signals reader");
  assert.ok(
    !src.includes("createAdminClient") && !src.includes(".from("),
    "market-activity must not open a second, weaker definition of public",
  );
});

test("both sources are read under an explicit cap", () => {
  const src = readFileSync("lib/board/market-activity.ts", "utf8");
  assert.ok(src.includes("ACTIVITY_SOURCE_CAP"), "the read must be bounded");
  assert.ok(
    src.includes("getLiveDeals(ACTIVITY_SOURCE_CAP)") &&
      src.includes("getMarketSignals(ACTIVITY_SOURCE_CAP)"),
    "neither source may be read unbounded",
  );
});

if (process.exitCode) console.error(`\n${passed} passed, some failed.`);
else console.log(`ok   ${passed} market-activity tests passed`);
