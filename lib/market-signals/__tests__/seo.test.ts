import test from "node:test";
import assert from "node:assert/strict";
import {
  isIndexableSignal,
  indexRisk,
  signalTitle,
  signalDescription,
  signalJsonLd,
} from "../seo";
import { INTERNAL_SIGNAL_COLUMNS, type MarketSignal } from "../logic";

/**
 * What a crawler may be told about a Market Signal.
 *
 * The indexing rule is asserted rather than trusted because it decides what
 * Ponte says about a market in a search result it does not control, and because
 * it reverses a previous blanket `noindex`. The reversal is only safe while
 * every one of these holds.
 */

const NOW = Date.parse("2026-07-30T12:00:00.000Z");

function signal(over: Partial<MarketSignal> = {}): MarketSignal {
  return {
    id: "11111111-2222-3333-4444-555555555555",
    canonicalId: "PONTE-SUP-1940393",
    side: "offer",
    product: "Basmati Rice (Golden Sella)",
    hsCode: "10",
    chapter: "10",
    chapterTitle: "Cereals",
    quantity: "20",
    unit: "MT",
    incoterm: "FOB",
    payment: null,
    originText: "Maharashtra, India",
    destinationText: null,
    originCode: "IN",
    destinationCode: null,
    spottedAt: "2026-07-28T00:00:00.000Z",
    publicExpiresAt: null,
    status: "approved_signal",
    description: null,
    summaryLine: "Basmati Rice (Golden Sella)",
    category: "Rice & Grains",
    ...over,
  };
}

// ---- the gate ---------------------------------------------------------------

test("an approved, product-bearing signal is indexable", () => {
  assert.equal(isIndexableSignal(signal(), { nowMs: NOW }), true);
});

test("only an approved signal is ever indexable", () => {
  for (const status of ["private", "under_investigation", "withdrawn", "expired", "unavailable"] as const) {
    assert.equal(
      isIndexableSignal(signal({ status }), { nowMs: NOW }),
      false,
      `${status} must never be indexable`,
    );
  }
});

test("an expired signal is not indexable, whatever its status says", () => {
  assert.equal(
    isIndexableSignal(signal({ publicExpiresAt: "2026-07-01T00:00:00.000Z" }), { nowMs: NOW }),
    false,
  );
  assert.equal(
    isIndexableSignal(signal({ publicExpiresAt: "2026-12-01T00:00:00.000Z" }), { nowMs: NOW }),
    true,
  );
});

test("the desk's per-row indexable flag can veto, and absent is not a veto", () => {
  assert.equal(isIndexableSignal(signal(), { indexable: false, nowMs: NOW }), false);
  assert.equal(isIndexableSignal(signal(), { indexable: true, nowMs: NOW }), true);
  // Unknown must not silently suppress: the board already decided this row is
  // public, and a missing column is not a decision to hide it.
  assert.equal(isIndexableSignal(signal(), { indexable: null, nowMs: NOW }), true);
});

test("a signal with no usable product is never indexable", () => {
  // The title would be the record class rather than the record.
  assert.equal(isIndexableSignal(signal({ product: "" }), { nowMs: NOW }), false);
  assert.equal(isIndexableSignal(signal({ product: "  " }), { nowMs: NOW }), false);
  assert.equal(isIndexableSignal(signal({ product: "Oi" }), { nowMs: NOW }), false);
});

test("a signal with no expiry is flagged as a standing-URL risk", () => {
  assert.equal(indexRisk(signal()), "no_expiry");
  assert.equal(indexRisk(signal({ publicExpiresAt: "2026-12-01T00:00:00.000Z" })), null);
});

// ---- what it says -----------------------------------------------------------

test("the title names the product and the side, not the record class", () => {
  assert.equal(
    signalTitle(signal()),
    "Basmati Rice (Golden Sella): seller offer from Maharashtra, India",
  );
  assert.match(
    signalTitle(signal({ side: "requirement", originText: null, destinationText: "Bangladesh" })),
    /^Basmati Rice \(Golden Sella\): buyer requirement from Bangladesh$/,
  );
});

test("the description states only facts the record carries", () => {
  const full = signalDescription(signal());
  assert.match(full, /Quantity 20 MT/);
  assert.match(full, /Origin Maharashtra, India/);
  assert.match(full, /Delivery FOB/);

  // An absent fact is absent, never padded with "available on request".
  const bare = signalDescription(
    signal({ quantity: null, unit: null, incoterm: null, originText: null, category: null }),
  );
  assert.doesNotMatch(bare, /Quantity/);
  assert.doesNotMatch(bare, /Delivery/);
  assert.doesNotMatch(bare, /request/i);
});

test("every description carries the read date and the unconfirmed caveat", () => {
  const text = signalDescription(signal());
  assert.match(text, /Read from a public source on 28 July 2026/);
  assert.match(text, /has not confirmed it/i);
});

// ---- the structured data ----------------------------------------------------

test("an offer is an Offer and a requirement is a Demand", () => {
  const url = "https://ponte.trade/market-signals/abc";
  assert.equal(signalJsonLd(signal(), url)["@type"], "Offer");
  assert.equal(signalJsonLd(signal({ side: "requirement" }), url)["@type"], "Demand");
});

test("the JSON-LD carries the quantity, the market and the caveat", () => {
  const node = signalJsonLd(signal(), "https://ponte.trade/market-signals/abc");
  assert.deepEqual(node.eligibleQuantity, {
    "@type": "QuantitativeValue",
    value: "20",
    unitText: "MT",
  });
  assert.equal((node.itemOffered as Record<string, unknown>).category, "Rice & Grains");
  assert.match(String(node.disambiguatingDescription), /has not confirmed it/i);
  assert.equal(node.availabilityStarts, "2026-07-28T00:00:00.000Z");
});

test("validThrough appears only when an expiry actually exists", () => {
  const url = "https://ponte.trade/market-signals/abc";
  assert.equal("validThrough" in signalJsonLd(signal(), url), false);
  assert.equal(
    signalJsonLd(signal({ publicExpiresAt: "2026-12-01T00:00:00.000Z" }), url).validThrough,
    "2026-12-01T00:00:00.000Z",
  );
});

/**
 * The one that matters most.
 *
 * JSON-LD is built to be machine-harvested, so a counterparty leaking into it
 * would be the worst possible place for the leak. `MarketSignal` carries no
 * counterparty field at all, and this asserts the serialised output mentions
 * none of the internal column names either, so a future field added to the
 * type cannot quietly reach a crawler.
 */
test("no internal or counterparty field ever reaches the structured data", () => {
  const node = signalJsonLd(signal(), "https://ponte.trade/market-signals/abc");
  const serialised = JSON.stringify(node).toLowerCase();
  for (const column of INTERNAL_SIGNAL_COLUMNS) {
    assert.equal(
      serialised.includes(column.toLowerCase()),
      false,
      `${column} must never appear in JSON-LD`,
    );
  }
  for (const word of ["seller", "buyer", "counterparty", "source_url", "go4world"]) {
    assert.equal(
      Object.keys(node).some((k) => k.toLowerCase() === word),
      false,
      `${word} must not be a JSON-LD key`,
    );
  }
});
