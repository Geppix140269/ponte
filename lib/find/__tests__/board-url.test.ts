// The board URL: what each control keeps, what it resets, and what a shared
// link still means after this change.
//
// Run: npx tsx lib/find/__tests__/board-url.test.ts
//
// These rules are easy to state and were previously enforced one href at a
// time, which is exactly how the board's own builder came to list five
// parameters and silently discard everything else. They are asserted here once,
// as transforms over a query, so a new control cannot reintroduce the defect by
// forgetting a parameter.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  parseFindQuery,
  buildBoardHref,
  buildFindHref,
  withFilters,
  withSearch,
  withSort,
  withPage,
  clearedSearch,
  clearedAll,
  effectiveSort,
  hasActiveFilters,
  hasStructuredFilters,
  toInventoryQuery,
  PAGE_SIZE,
  MAX_PAGE,
  type FindQuery,
} from "../query";
import { clampOffset } from "../../board/inventory";

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

/** Parse a board href back into the query it encodes. Round-trip, in one step. */
function reparse(href: string): FindQuery {
  const qs = href.includes("?") ? href.slice(href.indexOf("?") + 1) : "";
  const params = new URLSearchParams(qs);
  const sp: Record<string, string> = {};
  params.forEach((value, key) => {
    sp[key] = value;
  });
  return parseFindQuery(sp);
}

/** A query with a search, a filter, a sort and a page all set at once. */
function loaded(): FindQuery {
  return parseFindQuery({
    q: "gas oil",
    family: "services",
    serviceCategory: "freight",
    territory: "de",
    intent: "requirement",
    sort: "oldest",
    page: "4",
  });
}

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

test("q is read, cleaned and length-capped", () => {
  assert.equal(parseFindQuery({ q: "  gas   oil  " }).q, "gas oil");
  assert.equal(parseFindQuery({}).q, null);
  assert.equal(parseFindQuery({ q: "   " }).q, null);
  assert.equal(parseFindQuery({ q: "x".repeat(500) }).q!.length, 120);
  // A repeated parameter is one query, not an array.
  assert.equal(parseFindQuery({ q: ["sugar", "wheat"] }).q, "sugar");
});

test("q and product stay separate", () => {
  // `?product=` predates the search and is carried by existing links. Reading
  // one as the other would change what every shared /find URL means.
  const q = parseFindQuery({ q: "gas oil", product: "sugar" });
  assert.equal(q.q, "gas oil");
  assert.equal(q.product, "sugar");
  const inventory = toInventoryQuery(q);
  assert.equal(inventory.text, "gas oil");
  assert.equal(inventory.product, "sugar");
});

test("an invalid page is page one, and a huge one is bounded", () => {
  for (const bad of ["0", "-4", "banana", "", "NaN"]) {
    assert.equal(parseFindQuery({ page: bad }).page, 1, `page=${bad}`);
  }
  assert.equal(parseFindQuery({ page: "3" }).page, 3);
  // A number that is merely absurd is bounded rather than refused: it is still
  // a number, and refusing it would break a link over a value nobody typed.
  assert.equal(parseFindQuery({ page: "99999999" }).page, MAX_PAGE);
  assert.equal(parseFindQuery({ page: "1.9e9" }).page, MAX_PAGE);
  // A fractional page is the page it is inside.
  assert.equal(parseFindQuery({ page: "2.7" }).page, 2);
});

test("an invalid sort is no sort", () => {
  assert.equal(parseFindQuery({ sort: "sideways" }).sort, null);
  assert.equal(parseFindQuery({ sort: "relevance" }).sort, "relevance");
  assert.equal(parseFindQuery({ sort: "oldest" }).sort, "oldest");
});

test("relevance is the default while searching and unavailable otherwise", () => {
  assert.equal(effectiveSort(parseFindQuery({ q: "gas oil" })), "relevance");
  assert.equal(effectiveSort(parseFindQuery({})), "newest");
  // A stale link asking to order by relevance with nothing to be relevant to
  // is answered, not refused.
  assert.equal(effectiveSort(parseFindQuery({ sort: "relevance" })), "newest");
  assert.equal(effectiveSort(parseFindQuery({ sort: "oldest" })), "oldest");
  assert.equal(effectiveSort(parseFindQuery({ q: "sugar", sort: "newest" })), "newest");
});

// ---------------------------------------------------------------------------
// Round-trip
// ---------------------------------------------------------------------------

test("a fully loaded query survives a round-trip through the URL", () => {
  const before = loaded();
  const after = reparse(buildBoardHref(before));
  assert.deepEqual(after, before);
});

test("page one is the absence of a page", () => {
  // So the first page of a search is one URL whether it was reached by
  // searching or by paging back to it.
  assert.ok(!buildBoardHref(parseFindQuery({ q: "sugar" })).includes("page="));
  assert.ok(buildBoardHref(parseFindQuery({ q: "sugar", page: "2" })).includes("page=2"));
});

test("nothing set is the bare board route", () => {
  assert.equal(buildBoardHref(parseFindQuery({})), "/market-signals");
  assert.equal(buildFindHref({}), "/find");
});

test("existing URLs keep working and keep meaning what they meant", () => {
  // Every parameter the board accepted before this change, with no q, no sort
  // and no page. It must parse to the same filters and to page one.
  const legacy = parseFindQuery({
    family: "services",
    serviceCategory: "freight",
    serviceSubcategory: "freight.ocean",
    territory: "es",
    intent: "offer",
    product: "sugar",
    market: "Algeria",
    origin: "Brazil",
    minQty: "500",
    lane: "signals",
  });
  assert.equal(legacy.q, null);
  assert.equal(legacy.sort, null);
  assert.equal(legacy.page, 1);
  assert.equal(legacy.serviceSubcategory, "freight.ocean");
  assert.equal(legacy.territory, "ES");
  // And it round-trips unchanged, so a bookmark is not rewritten by being read.
  assert.deepEqual(reparse(buildBoardHref(legacy)), legacy);
});

test("the board and Find serialise one query identically", () => {
  // Two surfaces, two paths, one meaning. They used to differ: the board's own
  // builder knew five parameters and Find's knew twelve, so the same link
  // meant different things depending on which page had written it.
  const q = loaded();
  const board = buildBoardHref(q);
  const find = buildFindHref(q);
  assert.equal(board.slice("/market-signals?".length), find.slice("/find?".length));
});

// ---------------------------------------------------------------------------
// The transitions
// ---------------------------------------------------------------------------

test("a new search resets the page and keeps the filters", () => {
  const next = withSearch(loaded(), "olive oil");
  assert.equal(next.q, "olive oil");
  assert.equal(next.page, 1);
  assert.equal(next.family, "services");
  assert.equal(next.serviceCategory, "freight");
  assert.equal(next.territory, "DE");
  assert.equal(next.sort, "oldest");
});

test("changing a filter keeps the search and resets the page", () => {
  const next = withFilters(loaded(), { family: "distribution", partnerType: "distributor" });
  assert.equal(next.q, "gas oil", "the search was discarded by a filter");
  assert.equal(next.page, 1);
  assert.equal(next.sort, "oldest", "the sort was discarded by a filter");
  assert.equal(next.family, "distribution");
  assert.equal(next.partnerType, "distributor");
  // REPLACE, not merge: the incompatible children of the old family are gone.
  assert.equal(next.serviceCategory, null);
  assert.equal(next.territory, null);
});

test("changing the sort keeps the search and the filters, and resets the page", () => {
  const next = withSort(loaded(), "newest");
  assert.equal(next.sort, "newest");
  assert.equal(next.page, 1);
  assert.equal(next.q, "gas oil");
  assert.equal(next.family, "services");
  assert.equal(next.serviceCategory, "freight");
});

test("paging keeps everything", () => {
  const next = withPage(loaded(), 7);
  assert.equal(next.page, 7);
  assert.equal(next.q, "gas oil");
  assert.equal(next.sort, "oldest");
  assert.equal(next.family, "services");
  assert.equal(next.serviceCategory, "freight");
  assert.equal(next.territory, "DE");
  assert.equal(next.intent, "requirement");
  // And it is bounded on both sides.
  assert.equal(withPage(loaded(), 0).page, 1);
  assert.equal(withPage(loaded(), -3).page, 1);
  assert.equal(withPage(loaded(), 1e9).page, MAX_PAGE);
});

test("clearing the search keeps the filters", () => {
  const next = clearedSearch(loaded());
  assert.equal(next.q, null);
  assert.equal(next.page, 1);
  assert.equal(next.family, "services");
  assert.equal(next.serviceCategory, "freight");
  assert.equal(next.territory, "DE");
});

test("clearing the search drops a relevance sort with it", () => {
  // Relevance to nothing is not a definition, so it does not survive the thing
  // it was relevant to. An explicit newest/oldest choice does.
  const searching = parseFindQuery({ q: "gas oil", sort: "relevance", family: "services" });
  assert.equal(clearedSearch(searching).sort, null);
  const explicit = parseFindQuery({ q: "gas oil", sort: "oldest" });
  assert.equal(clearedSearch(explicit).sort, "oldest");
});

test("clear all removes the search, the filters, the sort and the page", () => {
  const next = clearedAll(loaded());
  assert.equal(buildBoardHref(next), "/market-signals");
  assert.equal(next.q, null);
  assert.equal(next.sort, null);
  assert.equal(next.page, 1);
  assert.equal(next.family, null);
  assert.equal(next.serviceCategory, null);
  assert.equal(next.territory, null);
  assert.equal(next.intent, null);
});

// ---------------------------------------------------------------------------
// Scope
// ---------------------------------------------------------------------------

test("a search counts as narrowing the board", () => {
  // The rule that stops a typo being answered with "no signal is currently
  // live on the public board", which is a claim about the whole market.
  assert.equal(hasActiveFilters(parseFindQuery({})), false);
  assert.equal(hasActiveFilters(parseFindQuery({ q: "zzzzzz" })), true);
  assert.equal(hasStructuredFilters(parseFindQuery({ q: "zzzzzz" })), false);
  assert.equal(hasStructuredFilters(parseFindQuery({ q: "zz", family: "services" })), true);
});

// ---------------------------------------------------------------------------
// Offsets
// ---------------------------------------------------------------------------

test("an offset past the end is pulled back to the last page that exists", () => {
  // A shared link outlives the result set that produced it. Answering page 40
  // of a 3-page set with an empty list, under a count saying 130 records
  // matched, reads as a contradiction rather than as the stale link it is.
  assert.equal(clampOffset(0, 130, 60), 0);
  assert.equal(clampOffset(60, 130, 60), 60);
  assert.equal(clampOffset(120, 130, 60), 120);
  assert.equal(clampOffset(180, 130, 60), 120, "page 4 of a 3-page set");
  assert.equal(clampOffset(2400, 130, 60), 120);
  // An exact multiple: 120 records is exactly two pages, so page 3 is page 2.
  assert.equal(clampOffset(120, 120, 60), 60);
  // An empty result set has no last page to fall back to.
  assert.equal(clampOffset(180, 0, 60), 0);
});

test("the page size is the one the board and the pager both use", () => {
  // Two constants would drift, and the symptom would be a pager whose page
  // numbers disagree with the records above it.
  const page =
    readFileSync("app/[locale]/market-signals/page.tsx", "utf8") +
    readFileSync("components/desk/SignalBoard.tsx", "utf8");
  assert.ok(page.includes("PAGE_SIZE"), "the board hard-codes a page length");
  assert.ok(!/limit:\s*60\b/.test(page), "the board hard-codes 60 as a limit");
  assert.equal(PAGE_SIZE, 60);
});

if (process.exitCode) console.error(`\n${passed} passed, some failed.`);
else console.log(`ok   ${passed} board-url tests passed`);
