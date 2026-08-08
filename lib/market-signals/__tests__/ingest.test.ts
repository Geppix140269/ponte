import test from "node:test";
import assert from "node:assert/strict";
import {
  decideRow,
  freshnessOf,
  isActionable,
  isGenericProduct,
  parseSourceDate,
  statedIncoterm,
  statedQuantity,
  HOLD_REASONS,
  type RawRow,
} from "../ingest";
import {
  OBSERVED_SOURCE_TYPES,
  SOURCE_CATEGORIES,
  categoryForSourceSlug,
  intentForSide,
  sideForSourceType,
} from "../source-taxonomy";

/**
 * The rules that decide whether a stranger's commercial indication reaches
 * Ponte's public board.
 *
 * Asserted rather than trusted because every one of them was got wrong once:
 * the side was hardcoded and inverted 636 requirements into offers, the
 * category map covered six slugs of twenty-five and would have dropped 74% of a
 * file, a bare number was stored as a quantity and reached the board reading
 * "Quantity 1", and a 2002 indication was published as a current signal.
 */

// 8 August 2026, the run date these fixtures are written against.
const NOW = Date.parse("2026-08-08T00:00:00.000Z");

// ---- side mapping -----------------------------------------------------------

test("every observed source type maps to a canonical side", () => {
  // The guarantee the hardcode broke: no observed value falls through.
  for (const type of OBSERVED_SOURCE_TYPES) {
    assert.notEqual(sideForSourceType(type), null, `${type} must map`);
  }
  assert.equal(sideForSourceType("sell"), "offer");
  assert.equal(sideForSourceType("seller_offer"), "offer");
  assert.equal(sideForSourceType("buy"), "requirement");
});

test("an unknown type maps to null rather than to a default", () => {
  // A default here would file a buyer's requirement as a seller's offer.
  for (const junk of ["", "  ", "offer", "SELLING", "wanted", null, undefined, 7]) {
    assert.equal(sideForSourceType(junk), null, `${String(junk)} must not map`);
  }
});

test("side mapping is case and whitespace tolerant", () => {
  assert.equal(sideForSourceType("  BUY "), "requirement");
  assert.equal(sideForSourceType("Sell"), "offer");
});

test("intent follows the side within the products family", () => {
  assert.equal(intentForSide("offer"), "offer_product");
  assert.equal(intentForSide("requirement"), "source_product");
});

// ---- category mapping -------------------------------------------------------

test("every mapped category carries a label, and a sector only when determinate", () => {
  for (const [slug, entry] of Object.entries(SOURCE_CATEGORIES)) {
    assert.ok(entry.label.length > 2, `${slug} needs a label`);
    // A chapter without a sector would be a classification with nowhere to sit.
    if (entry.hs) assert.notEqual(entry.sector, null, `${slug} has a chapter but no sector`);
  }
});

test("a cross-sector category states no sector and no chapter", () => {
  // Cement, structural steel and tiles are three sectors. Picking one would
  // file two thirds of those records under a sector they are not in.
  for (const slug of ["construction", "healthcare", "consumer-goods", "industrial-misc", "technology", "packaging"]) {
    const entry = categoryForSourceSlug(slug);
    assert.notEqual(entry, null, `${slug} must be mapped`);
    assert.equal(entry!.sector, null, `${slug} must not claim a sector`);
    assert.equal(entry!.hs, null, `${slug} must not claim a chapter`);
  }
});

test("a category that determines a chapter states it", () => {
  assert.equal(categoryForSourceSlug("rice-grains")!.hs, "10");
  assert.equal(categoryForSourceSlug("edible-oils")!.hs, "15");
  assert.equal(categoryForSourceSlug("pulses")!.hs, "07");
});

test("an unknown slug maps to null rather than to an 'other' bucket", () => {
  for (const junk of ["", "widgets", "misc", null, undefined]) {
    assert.equal(categoryForSourceSlug(junk), null);
  }
});

// ---- source date and freshness ---------------------------------------------

test("the source's own date format is read, including the two-digit year", () => {
  // `new Date("May-08-26")` is 1926 in some engines and invalid in others.
  assert.equal(parseSourceDate("May-08-26"), "2026-05-08");
  assert.equal(parseSourceDate("Jan-29-26"), "2026-01-29");
  assert.equal(parseSourceDate("Mar-28-03"), "2003-03-28");
  assert.equal(parseSourceDate("2026-07-28"), "2026-07-28");
});

test("an unreadable date is null, never today", () => {
  // Defaulting to today would turn an unknown age into a fresh one.
  for (const junk of ["", "   ", "not a date", null, undefined]) {
    assert.equal(parseSourceDate(junk), null);
  }
});

test("freshness is measured from the indication, not from the scrape", () => {
  assert.equal(freshnessOf("2026-08-01", NOW), "current");   // 7 days
  assert.equal(freshnessOf("2026-06-01", NOW), "current");   // 68 days, still inside the window
  assert.equal(freshnessOf("2026-01-15", NOW), "aging");     // 205 days
  assert.equal(freshnessOf("2002-05-01", NOW), "historical");
  assert.equal(freshnessOf(null, NOW), "undated");
});

test("the band boundaries are inclusive at 90 and 365 days", () => {
  const at = (days: number) => new Date(NOW - days * 86_400_000).toISOString().slice(0, 10);
  assert.equal(freshnessOf(at(90), NOW), "current");
  assert.equal(freshnessOf(at(91), NOW), "aging");
  assert.equal(freshnessOf(at(365), NOW), "aging");
  assert.equal(freshnessOf(at(366), NOW), "historical");
});

// ---- quantity ---------------------------------------------------------------

test("a quantity counts only when it carries a recognised unit", () => {
  assert.deepEqual(statedQuantity("20 Metric Tonnes"), { qty: 20, unit: "MT" });
  assert.deepEqual(statedQuantity("2500 Kilograms Foo Ltd"), { qty: 2500, unit: "kg" });
  assert.deepEqual(statedQuantity("1 Twenty-Foot Container"), { qty: 1, unit: "containers" });
  // The palm-oil defect: a bare number is not a quantity.
  assert.equal(statedQuantity("1"), null);
  assert.equal(statedQuantity(""), null);
  assert.equal(statedQuantity("as per requirement"), null);
});

test("a quantity is recovered from the prose when the column is empty", () => {
  assert.deepEqual(
    statedQuantity(null, "$950 - $1.30K / Metric Ton | FOB | 20 Metric Tonnes"),
    { qty: 20, unit: "MT" },
  );
});

test("an incoterm is read from the column or the prose, and never invented", () => {
  assert.equal(statedIncoterm("FOB", null), "FOB");
  assert.equal(statedIncoterm(null, "$550 - $750 / Ton | CIF"), "CIF");
  assert.equal(statedIncoterm("nonsense", "no terms here"), null);
});

test("a bare commodity word is a market, not a record", () => {
  for (const word of ["Wheat", "rice", "Scrap", "Chemicals", "cement"]) {
    assert.equal(isGenericProduct(word), true, `${word} is generic`);
  }
  for (const real of ["Basmati Rice", "PP Scrap", "White Cement Clinker"]) {
    assert.equal(isGenericProduct(real), false, `${real} is specific`);
  }
});

// ---- the per-intent quality rule --------------------------------------------

const facts = (over: Partial<Parameters<typeof isActionable>[1]> = {}) => ({
  product: "Basmati Rice",
  quantity: null,
  incoterm: null,
  destination: null,
  ...over,
});

test("a seller offer needs a quantity with a unit OR a price basis", () => {
  assert.equal(isActionable("offer_product", facts({ quantity: { qty: 20, unit: "MT" } })).ok, true);
  assert.equal(isActionable("offer_product", facts({ incoterm: "FOB" })).ok, true);
  const neither = isActionable("offer_product", facts());
  assert.equal(neither.ok, false);
  assert.equal((neither as { reason: string }).reason, "offer_not_actionable");
});

test("a buyer requirement needs a quantity with a unit OR a destination", () => {
  // The rule that must NOT be the seller's rule: a supplier reading "cotton
  // yarn wanted, delivered Oman" can act on it without a tonnage.
  assert.equal(isActionable("source_product", facts({ destination: "Oman" })).ok, true);
  assert.equal(isActionable("source_product", facts({ quantity: { qty: 5, unit: "containers" } })).ok, true);
  const neither = isActionable("source_product", facts());
  assert.equal(neither.ok, false);
  assert.equal((neither as { reason: string }).reason, "requirement_not_actionable");
});

test("a destination does NOT rescue a seller offer, and a price basis does not rescue a requirement", () => {
  // The two rules are genuinely different, not one rule with two names.
  assert.equal(isActionable("offer_product", facts({ destination: "Oman" })).ok, false);
  assert.equal(isActionable("source_product", facts({ incoterm: "CIF" })).ok, false);
});

test("both intents refuse a product that names only its market", () => {
  for (const intent of ["offer_product", "source_product"] as const) {
    const r = isActionable(intent, facts({ product: "Rice", quantity: { qty: 1, unit: "MT" }, destination: "India" }));
    assert.equal(r.ok, false);
    assert.equal((r as { reason: string }).reason, "generic_product");
  }
});

// ---- the row decision --------------------------------------------------------

const row = (over: Partial<RawRow> = {}): RawRow => ({
  deal_id: "PONTE-SUP-1",
  type: "sell",
  product: "Basmati Rice",
  category: "rice-grains",
  quantity: "20 Metric Tonnes",
  incoterms: "FOB",
  destination_country: "",
  raw_description: "",
  posted_date: "Aug-01-26",
  ...over,
});

test("a complete, current, mapped row publishes", () => {
  const d = decideRow(row(), { nowMs: NOW, seenSourceIds: new Set() });
  assert.equal(d.decision, "publish");
  assert.equal(d.reason, null);
  assert.equal(d.side, "offer");
  assert.equal(d.categoryLabel, "Rice & Grains");
  assert.equal(d.freshness, "current");
  assert.equal(d.sourceDate, "2026-08-01");
});

test("a 2002 indication scraped in 2026 is held as historical, never published", () => {
  // The requirement in one assertion.
  const d = decideRow(row({ posted_date: "Mar-28-02" }), { nowMs: NOW, seenSourceIds: new Set() });
  assert.equal(d.decision, "hold");
  assert.equal(d.reason, "historical");
  assert.equal(d.freshness, "historical");
  assert.equal(d.sourceDate, "2002-03-28");
});

test("every row returns a decision, and nothing is ever skipped", () => {
  const junk: RawRow[] = [
    row({ deal_id: "" }),
    row({ type: "barter" }),
    row({ category: "widgets" }),
    row({ product: "" }),
    row({ product: "Rice" }),
    row({ quantity: "", incoterms: "", raw_description: "" }),
    row({ posted_date: "" }),
    row({ posted_date: "Jan-02-26" }),
    row({ posted_date: "Mar-28-02" }),
    row(),
  ];
  const seen = new Set<string>();
  const decisions = junk.map((r) => decideRow(r, { nowMs: NOW, seenSourceIds: seen }));
  assert.equal(decisions.length, junk.length);
  for (const d of decisions) {
    assert.ok(d.decision === "publish" || d.decision === "hold");
    if (d.decision === "hold") {
      assert.ok(HOLD_REASONS.includes(d.reason!), `${d.reason} must be a named reason`);
    }
  }
});

test("a repeated source id is held as a duplicate, so the import is idempotent by identity", () => {
  const seen = new Set<string>();
  const first = decideRow(row(), { nowMs: NOW, seenSourceIds: seen });
  assert.equal(first.decision, "publish");
  seen.add(first.sourceId!);
  const second = decideRow(row(), { nowMs: NOW, seenSourceIds: seen });
  assert.equal(second.decision, "hold");
  assert.equal(second.reason, "duplicate_source_id");
});

test("a row is reported against the reason an operator can act on", () => {
  // Stale AND unusable reports the unusable half: waiting will not fix it, and
  // the operator needs to see how many rows a map or a rule would recover.
  const d = decideRow(
    row({ posted_date: "Mar-28-02", quantity: "", incoterms: "", raw_description: "" }),
    { nowMs: NOW, seenSourceIds: new Set() },
  );
  assert.equal(d.reason, "offer_not_actionable");
});

test("a buyer requirement with a destination and no quantity publishes", () => {
  const d = decideRow(
    row({ type: "buy", quantity: "", incoterms: "", raw_description: "", destination_country: "Oman" }),
    { nowMs: NOW, seenSourceIds: new Set() },
  );
  assert.equal(d.side, "requirement");
  assert.equal(d.intent, "source_product");
  assert.equal(d.decision, "publish");
});
