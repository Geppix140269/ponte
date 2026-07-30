// Tests for Block A: Qualified Opportunities and Market Signals are separate,
// and a Market Signal is anonymised, private until approved, and expiring.
//
// Run: npx tsx lib/board/__tests__/market-signals.test.ts
//
// Same shape as the completeness test: node:assert, non-zero exit on failure,
// no test runner. The logic under test is pure (lib/market-signals/logic.ts),
// so nothing here touches a database.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  isPubliclyVisible,
  publicWindowPredicate,
  mapSignalRow,
  chapterOf,
  PUBLIC_SIGNAL_COLUMNS,
  INTERNAL_SIGNAL_COLUMNS,
  type SignalRow,
  type MarketSignal,
} from "../../market-signals/logic";
import { canonicalColumnFor, usesCanonicalKeys, emptyInventoryQuery } from "../inventory-query";

// Active interface locales only. Ponte is English-only; deferred languages
// live in messages/_deferred/ and are not gated for copy truth here.
const LOCALES = ["en"];
function locale(loc: string): Record<string, any> {
  return JSON.parse(readFileSync(`messages/${loc}.json`, "utf8"));
}

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

const DAY = 86400000;
const NOW = Date.parse("2026-07-23T00:00:00Z");

function row(over: Partial<SignalRow> = {}): SignalRow {
  return {
    id: "s1",
    side: "requirement",
    product: "Refined white sugar ICUMSA 45",
    hs_code: "1701.99",
    qty: 25000,
    unit: "MT",
    incoterms: "CIF",
    payment: "LC at sight",
    origin: null,
    destination: "Netherlands",
    spotted_at: "2026-07-10T00:00:00Z",
    public_expires_at: new Date(NOW + 30 * DAY).toISOString(),
    status: "approved_signal",
    ai_description: "A buyer is seeking refined white sugar into the Netherlands.",
    summary_line: "Sugar into NL",
    ...over,
  };
}

// --- Public visibility: approved and unexpired only -------------------------

test("an approved, unexpired signal is publicly visible", () => {
  assert.equal(isPubliclyVisible(row(), NOW), true);
});

test("an approved signal with no expiry is still visible", () => {
  assert.equal(isPubliclyVisible(row({ public_expires_at: null }), NOW), true);
});

test("an approved signal past its public expiry is not visible", () => {
  assert.equal(
    isPubliclyVisible(row({ public_expires_at: new Date(NOW - DAY).toISOString() }), NOW),
    false,
  );
});

test("a private (imported, unapproved) signal is not public", () => {
  assert.equal(isPubliclyVisible(row({ status: "private" }), NOW), false);
});

test("withdrawn, unavailable, expired and under_investigation are all excluded", () => {
  for (const status of ["withdrawn", "unavailable", "expired", "under_investigation", "confirmed"] as const) {
    assert.equal(
      isPubliclyVisible(row({ status }), NOW),
      false,
      `${status} must not be public`,
    );
  }
});

test("only 'approved_signal' can ever be public", () => {
  // Every status except approved_signal is invisible, even with a live expiry.
  const statuses: SignalRow["status"][] = [
    "private", "approved_signal", "under_investigation",
    "confirmed", "unavailable", "expired", "withdrawn",
  ];
  const visible = statuses.filter((status) =>
    isPubliclyVisible(row({ status, public_expires_at: new Date(NOW + DAY).toISOString() }), NOW),
  );
  assert.deepEqual(visible, ["approved_signal"]);
});

// --- Anonymity: no internal provenance in the public shape ------------------

test("the public column list names none of the internal columns", () => {
  const selected = PUBLIC_SIGNAL_COLUMNS.split(",").map((c) => c.trim());
  for (const internal of INTERNAL_SIGNAL_COLUMNS) {
    assert.ok(
      !selected.includes(internal),
      `public read must not select internal column "${internal}"`,
    );
  }
});

test("the mapped signal carries no provenance, identity or contact field", () => {
  const signal = mapSignalRow(row());
  const keys = Object.keys(signal);
  for (const internal of INTERNAL_SIGNAL_COLUMNS) {
    assert.ok(!keys.includes(internal), `mapped signal leaked "${internal}"`);
  }
  // Nor any obvious camelCase equivalent.
  for (const banned of ["sourceUrl", "sourcePlatform", "counterparty", "rawDescription", "notes"]) {
    assert.ok(!keys.includes(banned), `mapped signal leaked "${banned}"`);
  }
});

test("the mapped signal keeps the structured facts and the paraphrase, not the source", () => {
  const signal: MarketSignal = mapSignalRow(row());
  assert.equal(signal.side, "requirement");
  assert.equal(signal.quantity, "25000");
  assert.equal(signal.unit, "MT");
  assert.equal(signal.description, "A buyer is seeking refined white sugar into the Netherlands.");
  assert.equal(signal.chapter, "17");
});

test("a missing quantity maps to null, never a guessed zero", () => {
  assert.equal(mapSignalRow(row({ qty: null })).quantity, null);
});

test("chapterOf reads the two-digit HS chapter from any code shape", () => {
  assert.equal(chapterOf("1701.99"), "17");
  assert.equal(chapterOf("170199"), "17");
  assert.equal(chapterOf(null), null);
  assert.equal(chapterOf("7"), null);
});

// --- The mandatory badge and disclaimer -------------------------------------
// Brief 1.2 requires every Market Signal to show the badge and the disclaimer,
// and preserves their meaning; it does not require them to stay in English, so
// they live in the "marketSignals" message namespace and are localised. The
// badge's original em dash becomes a colon here because check-messages bans the
// em dash in message values; the substantive wording is unchanged.

test("the English badge is the brief's unverified label", () => {
  assert.equal(
    locale("en").marketSignals.badge,
    "External market signal: not yet verified by Ponte",
  );
});

test("the English disclaimer is the brief's exact wording", () => {
  assert.equal(
    locale("en").marketSignals.disclaimer,
    "This information was identified through external market research. Ponte has not yet verified the participant, the continuing availability of the requirement or offer, or their authority to transact.",
  );
});

test("every locale carries a non-empty badge and disclaimer (mandatory presence)", () => {
  for (const loc of LOCALES) {
    const ms = locale(loc).marketSignals;
    assert.ok(
      ms && typeof ms.badge === "string" && ms.badge.trim().length > 0,
      `${loc} is missing marketSignals.badge`,
    );
    assert.ok(
      typeof ms.disclaimer === "string" && ms.disclaimer.trim().length > 0,
      `${loc} is missing marketSignals.disclaimer`,
    );
  }
});

// --- Structural separation from Qualified Opportunities ----------------------

test("getLiveDeals no longer queries desk_radar", () => {
  const src = readFileSync("lib/board/live-deals.ts", "utf8");
  // The prose may explain the split; the code must not read the table. A query
  // is `.from("desk_radar")`, so that is what a leak looks like.
  assert.ok(
    !src.includes('from("desk_radar")'),
    "lib/board/live-deals.ts still queries desk_radar; the feeds are not separated",
  );
});

test("getLiveDeals drops expired member listings", () => {
  const src = readFileSync("lib/board/live-deals.ts", "utf8");
  assert.ok(
    src.includes("valid_until"),
    "lib/board/live-deals.ts does not filter on valid_until; expired opportunities can still show",
  );
});

test("imports still default a signal to private, not public", () => {
  const src = readFileSync("scripts/import-desk-radar.mjs", "utf8");
  assert.ok(src.includes('status: "private"'), "the importer must land rows private");
  assert.ok(!src.includes('status: "live"'), "the importer must not land rows live");
});

// ---------------------------------------------------------------------------
// Eligibility belongs in the query, not in a pass over the page
// ---------------------------------------------------------------------------

test("the public window is expressed as a query predicate", () => {
  // Both halves of the rule: a signal with no expiry is public while approved,
  // and one whose expiry has passed is not.
  const p = publicWindowPredicate("2026-07-28T09:00:00.000Z");
  assert.ok(p.includes("public_expires_at.is.null"), p);
  assert.ok(p.includes("public_expires_at.gt.2026-07-28T09:00:00.000Z"), p);
});

test("the predicate and the in-memory rule agree", () => {
  // They must, because one is used for lists and the other for a single
  // record. If they ever disagreed, a signal would be reachable by one route
  // and not the other.
  const now = Date.parse("2026-07-28T09:00:00.000Z");
  const cases: { expires: string | null; visible: boolean }[] = [
    { expires: null, visible: true },
    { expires: "2026-08-28T09:00:00.000Z", visible: true },
    { expires: "2026-07-27T09:00:00.000Z", visible: false },
  ];
  for (const c of cases) {
    assert.equal(
      isPubliclyVisible({ status: "approved_signal", public_expires_at: c.expires }, now),
      c.visible,
      `expiry ${c.expires}`,
    );
  }
});

test("no board read filters expiry after fetching the page", () => {
  // The defect this pins: fetching sixty approved rows and then dropping the
  // expired ones returns a short page, which makes offset paging unstable, and
  // any count taken from that query counts rows nobody may see. It is how the
  // board came to state 3,543 when 3,517 signals were public.
  for (const file of ["lib/board/market-signals.ts", "lib/board/inventory.ts"]) {
    const src = readFileSync(file, "utf8");
    assert.ok(
      src.includes("publicWindowPredicate"),
      `${file} does not apply the public window in the query`,
    );
    assert.ok(
      !/\.filter\(\(r\) => isPubliclyVisible\(/.test(src),
      `${file} still filters expiry over a fetched page`,
    );
  }
});

test("the inventory count applies the same window as the rows", () => {
  // A count that used a different rule from the list would state an inventory
  // size that no amount of paging could ever reach.
  const src = readFileSync("lib/board/inventory.ts", "utf8");
  const count = src.slice(src.indexOf("export async function countSignalInventory"));
  assert.ok(count.includes('eq("status", "approved_signal")'), "the count ignores approval");
  assert.ok(count.includes("publicWindowPredicate"), "the count ignores expiry");
});

// ---------------------------------------------------------------------------
// Unclassified is a state the migration does not end
// ---------------------------------------------------------------------------

test("the classification probe targets the axis actually being filtered", () => {
  assert.equal(
    canonicalColumnFor({ ...emptyInventoryQuery(), serviceCategory: "freight" }),
    "service_category_key",
  );
  // The most specific wins: a subcategory search is not answered by asking
  // whether anything has a category.
  assert.equal(
    canonicalColumnFor({
      ...emptyInventoryQuery(),
      serviceCategory: "freight",
      serviceSubcategory: "freight.ocean",
    }),
    "service_subcategory_keys",
  );
  assert.equal(
    canonicalColumnFor({ ...emptyInventoryQuery(), partnerType: "distributor" }),
    "distribution_partner_type_key",
  );
  assert.equal(canonicalColumnFor({ ...emptyInventoryQuery(), family: "services" }), "market_family");
  // A free-text product search asks nothing of the classification columns.
  assert.equal(canonicalColumnFor({ ...emptyInventoryQuery(), product: "sugar" }), null);
  assert.equal(usesCanonicalKeys(emptyInventoryQuery()), false);
});

test("an empty category result is checked before it is reported as a result", () => {
  // Returning unclassified only on a missing column would mean that on the day
  // the migration ran, every category filter began answering a confident "no
  // match" over an inventory that had never been classified.
  const src = readFileSync("lib/board/inventory.ts", "utf8");
  assert.ok(src.includes('reason: "nothing_classified"'), "only the columns-absent case exists");
  assert.ok(src.includes('reason: "columns_absent"'), "the columns-absent case is gone");
  assert.ok(
    src.includes("signalCoverage"),
    "nothing asks whether the inventory carries this classification at all",
  );
});

test("coverage is measured on every category read, not only on an empty one", () => {
  // Asking only when the result is empty holds for exactly as long as nothing
  // is classified. The moment one record is classified, every other filter
  // starts returning small confident results over a mostly unclassified
  // inventory, and nothing says so.
  const src = readFileSync("lib/board/inventory.ts", "utf8");
  const body = src.slice(src.indexOf("export async function searchSignalInventory"));
  assert.ok(
    !/if \(total === 0 && column\)/.test(body),
    "coverage is still only measured when the result is empty",
  );
  assert.ok(/if \(column\) \{/.test(body), "coverage is not measured on a filtered read at all");
  assert.ok(body.includes('state: "partial"'), "there is no partial-coverage state");
  assert.ok(
    body.includes("coverage.classified < coverage.eligible"),
    "partial coverage is not detected by comparison",
  );
});

test("partial coverage carries the numbers, not just a flag", () => {
  // A member cannot judge "some records were not searched" without knowing how
  // many, and a flag would let the surface imply a small gap over a large one.
  const src = readFileSync("lib/board/inventory.ts", "utf8");
  assert.ok(src.includes("export type Coverage"), "coverage has no declared shape");
  assert.ok(/state: "partial";[\s\S]{0,200}coverage: Coverage/.test(src), "partial carries no numbers");
  const deals = readFileSync("lib/board/live-deals.ts", "utf8");
  assert.ok(
    /state: "partial";[\s\S]{0,260}coverage: \{ classified: number; eligible: number \}/.test(deals),
    "the Qualified partial state carries no numbers",
  );
});

test("both lanes report partial coverage, not only the signals one", () => {
  // A member reading one lane as complete and the other as partial would draw
  // the wrong conclusion from the pair.
  const src = readFileSync("lib/board/live-deals.ts", "utf8");
  assert.ok(src.includes('state: "partial"'), "the Qualified lane has no partial state");
  assert.ok(
    src.includes("coverage.classified < coverage.eligible"),
    "the Qualified lane does not compare coverage",
  );
});

test("an unknown coverage is its own state, not a fall-through to ok", () => {
  // The failure this pins: an unmeasurable coverage that reached `return
  // { state: "ok" }` would silently upgrade a partial answer into a conclusive
  // "no match", which is the one direction that must never happen by accident.
  for (const file of ["lib/board/inventory.ts", "lib/board/live-deals.ts"]) {
    const src = readFileSync(file, "utf8");
    assert.ok(src.includes('state: "coverage_unknown"'), `${file} has no coverage_unknown state`);
    assert.ok(
      /coverage === null\) return \{ state: "coverage_unknown"|coverage === null\) \{\s*return \{\s*state: "coverage_unknown"/.test(
        src.replace(/\s+/g, " ").replace(/coverage === null\) \{ return/g, "coverage === null) return"),
      ),
      `${file} does not return coverage_unknown when the measurement fails`,
    );
  }
});

test("a coverage read reports its own errors instead of swallowing them", () => {
  // A count that errors must not be read as a number, and a missing column must
  // reach the caller's catch so it becomes `columns_absent` rather than an
  // unknown coverage.
  for (const file of ["lib/board/inventory.ts", "lib/board/live-deals.ts"]) {
    const src = readFileSync(file, "utf8");
    const probe = src.slice(src.indexOf(file.includes("inventory") ? "async function signalCoverage" : "async function dealCoverage"));
    assert.ok(/isMissingColumnError\(/.test(probe), `${file}: the probe ignores a missing column`);
    assert.ok(/error\) return null|error/.test(probe), `${file}: the probe ignores its error`);
    assert.ok(probe.includes("return null"), `${file}: the probe cannot report failure`);
  }
});

test("coverage is measured over the same slice as the search", () => {
  // The defect: the first probe counted the whole public board, so a search
  // inside one family compared a handful of classified rows against thousands
  // of unrelated ones and printed the result as "records in this market".
  for (const file of ["lib/board/inventory.ts", "lib/board/live-deals.ts"]) {
    const src = readFileSync(file, "utf8");
    const applier = file.includes("inventory") ? "applySignalFilters" : "applyDealFilters";
    assert.ok(src.includes(`function ${applier}`), `${file} has no shared filter application`);
    // Called by the search AND by the coverage read. One of them applying a
    // filter the other does not is precisely the bug.
    const uses = src.split(`${applier}(`).length - 1;
    assert.ok(uses >= 2, `${file} calls ${applier} in only ${uses} place(s)`);
    // Only the tested axis is dropped.
    assert.ok(src.includes('omit !== "market_family"'), `${file} does not honour the omitted axis`);
    // Direction and free text are not classification axes and are never omitted.
    assert.ok(
      /if \(query\.side\) q = q\.eq/.test(src),
      `${file} drops the direction filter from the coverage slice`,
    );
  }
});

test("the Qualified coverage cannot be a database count, and says so", () => {
  // Validity and owner eligibility are applied in memory, so an exact count
  // would count rows the member may not see. The read is bounded and returns
  // null rather than reporting a sample as the whole.
  const src = readFileSync("lib/board/live-deals.ts", "utf8");
  const probe = src.slice(src.indexOf("async function dealCoverage"));
  assert.ok(probe.includes("isPubliclyCurrent"), "the probe ignores the validity clock");
  assert.ok(probe.includes("eligibleOwnerIds"), "the probe ignores owner eligibility");
  assert.ok(
    probe.includes("rows.length > SEARCH_CEILING") && probe.includes("return null"),
    "a truncated read is reported as an exact coverage",
  );
});

test("a failed classification probe is not read as nothing classified", () => {
  // Unknown is not zero and it is not complete. Reporting "nothing is
  // classified" because a probe failed would hide a real result behind an
  // explanation; reporting completeness would hide a blind spot behind a
  // conclusion.
  const src = readFileSync("lib/board/inventory.ts", "utf8");
  const probe = src.slice(src.indexOf("async function signalCoverage"));
  assert.ok(probe.includes("return null"), "the probe collapses a failure to a number");
  const caller = src.slice(src.indexOf("const coverage = await signalCoverage"));
  const decision = caller.slice(0, caller.indexOf('return { state: "ok"'));
  assert.ok(
    decision.indexOf("coverage === null") < decision.indexOf("coverage.classified === 0"),
    "an unmeasurable coverage is tested after being treated as a number",
  );
});

// ---------------------------------------------------------------------------
// Free-text search over the complete inventory
// ---------------------------------------------------------------------------

test("the text search runs inside the eligibility predicate, not beside it", () => {
  // The whole disclosure and truthfulness argument depends on the search being
  // one more AND on the same query that already carries approval and the public
  // window. A search applied to a separately-read set would return records that
  // are not publishable, or count records nobody may see.
  const src = readFileSync("lib/board/inventory.ts", "utf8");
  const base = src.slice(src.indexOf("const base = () =>"), src.indexOf("const dbOrdered"));
  assert.ok(base.includes('.eq("status", "approved_signal")'), "approval left the search query");
  assert.ok(base.includes("publicWindowPredicate(nowIso)"), "expiry left the search query");
  assert.ok(base.includes('count: "exact"'), "the count is not exact");
  assert.ok(base.includes("search"), "the search is not part of the base query");

  // And the predicate itself is applied by the one filter function, so the
  // search, the page read and both coverage counts cannot drift apart.
  const filters = src.slice(src.indexOf("function applySignalFilters"));
  assert.ok(
    /if \(search\) q = q\.or\(searchPredicate\(search\)\)/.test(filters),
    "the search is not applied through the shared filter function",
  );
});

test("the search is never dropped from the coverage counts", () => {
  // Coverage answers "of the signals matching the rest of this search, how many
  // carry a value on this axis?". Omitting the search would compare a handful
  // of matches against the whole family and print a denominator that is not the
  // member's question.
  const src = readFileSync("lib/board/inventory.ts", "utf8");
  const coverage = src.slice(src.indexOf("async function signalCoverage"));
  assert.ok(coverage.includes("search,"), "the coverage slice drops the text search");
  const call = src.slice(src.indexOf("const coverage = await signalCoverage"));
  assert.ok(call.slice(0, 120).includes("search"), "the caller does not pass the search");
});

test("the order is total, and the page is cut after it", () => {
  // `spotted_at` alone is not a total order: the import stamps whole dates, so
  // hundreds of rows share one value, and an offset over a non-total order can
  // show a record twice or never.
  const src = readFileSync("lib/board/inventory.ts", "utf8");
  const ordered = src.slice(src.indexOf("const dbOrdered ="), src.indexOf("let signals"));
  assert.ok(ordered.includes('.order("spotted_at"'), "the date is not the primary order");
  assert.ok(ordered.includes('.order("id"'), "there is no deterministic tie-break");
});

test("relevance is bounded, and the bound is disclosed rather than hidden", () => {
  // Ranking happens in memory, so the matched set has to be bounded, so there
  // has to be an answer above the bound. Silently ranking the first thousand
  // and paging through them would hide every record past the thousandth from a
  // member who had just been told the total.
  const src = readFileSync("lib/board/inventory.ts", "utf8");
  assert.ok(/RELEVANCE_CEILING = \d+/.test(src), "the ranked read is unbounded");
  const branch = src.slice(src.indexOf('if (wanted === "relevance"'), src.indexOf("} else {\n      const oldest"));
  assert.ok(branch.includes("total <= RELEVANCE_CEILING"), "the bound is not tested");
  assert.ok(branch.includes("rankedFully = false"), "exceeding the bound is not reported");
  assert.ok(branch.includes('ordering = "newest"'), "an unrankable set keeps claiming relevance");
  // And the board says so.
  const rendered = readFileSync("components/desk/SignalBoard.tsx", "utf8");
  assert.ok(rendered.includes("board.rankedFully"), "the board never tells a member the order changed");
});

test("an empty page is never reached over a non-empty total", () => {
  const src = readFileSync("lib/board/inventory.ts", "utf8");
  // Both ordering branches clamp. The database-ordered branch calls it
  // directly; the ranked branch clamps inside `rankAndPage`, which is the only
  // way it cuts a page at all. A branch that did not would answer a stale link
  // with an empty list under a count saying records are there.
  assert.ok(src.includes("clampOffset(requestedOffset, total, limit)"), "the paged read does not clamp");
  const ranking = src.slice(src.indexOf("export function rankAndPage"));
  assert.ok(
    ranking.slice(0, 500).includes("clampOffset(offset, ordered.length, limit)"),
    "the ranked branch cuts a page without clamping",
  );
  const relevance = src.slice(src.indexOf('if (wanted === "relevance"'));
  assert.ok(relevance.slice(0, 600).includes("rankAndPage("), "the ranked branch pages some other way");
});

test("the Qualified lane searches only its own public columns", () => {
  // `/find` renders both lanes from one query. A `q` that narrowed one lane and
  // was ignored by the other would put a filtered list beside an unfiltered one
  // under a single heading.
  const src = readFileSync("lib/board/live-deals.ts", "utf8");
  const publicColumns = (src.match(/const LISTING_COLUMNS\s*=\s*\n?\s*"([^"]+)"/) ?? [])[1];
  assert.ok(publicColumns, "LISTING_COLUMNS could not be read");
  const allowed = publicColumns.split(",").map((c) => c.trim());

  const searchBlock = (src.match(/const LISTING_SEARCH_COLUMNS[^=]*=\s*\[([^\]]+)\]/) ?? [])[1];
  assert.ok(searchBlock, "the lane declares no search column list");
  const searched = searchBlock.match(/"([^"]+)"/g)!.map((s) => s.slice(1, -1));
  assert.ok(searched.length > 0);
  for (const column of searched) {
    assert.ok(allowed.includes(column), `"${column}" is searched but is not publicly readable`);
  }
  for (const forbidden of ["user_id", "notes", "contact", "email", "phone"]) {
    assert.ok(!searched.includes(forbidden), `"${forbidden}" must never be searched`);
  }
  assert.ok(src.includes("parseSignalSearch(query.text)"), "the lane ignores the shared search");
});

if (process.exitCode) console.error(`\n${passed} passed, some failed.`);
else console.log(`ok   ${passed} market-signals tests passed`);
