// The family-aware presentation of a STORED listing row.
//
// Run: npx tsx lib/listings/__tests__/record-facts.test.ts
//
// The negative assertions carry this file. Every surface downstream of the
// composer printed a fixed list of product columns for every record, so a
// freight forwarder's public page answered "Quantity", "Incoterm", "HS code",
// "Origin" and "Destination" with "Not stated" - six invented questions on a
// record that was never asked any of them. The tests below assert those rows do
// not EXIST, not that they render empty, because a row that exists is a row
// some future surface will print.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  presentRecord,
  statedFacts,
  summaryLine,
  familyOfRow,
  routeEndFor,
  FACT_LABELS,
  type FactsRow,
} from "../record-facts";

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

/** The labelled rows of a presentation, by fact key. */
function byKey(row: FactsRow): Record<string, string | null> {
  const out: Record<string, string | null> = {};
  for (const f of presentRecord(row).facts) out[f.key] = f.value;
  return out;
}

const keysOf = (row: FactsRow): string[] => presentRecord(row).facts.map((f) => f.key);

// ---------------------------------------------------------------------------
// Trade services: the freight-forwarding record, as stored
// ---------------------------------------------------------------------------

const FREIGHT: FactsRow = {
  market_family: "services",
  market_intent: "offer_trade_service",
  type: "service",
  product: "Freight forwarding",
  service_category_key: "freight",
  service_subcategory_keys: ["freight.forwarding"],
  submitter_role: "Freight forwarder",
  validity_type: "standing",
  service_terms: {
    scope: "International sea and road freight forwarding",
    engagement: "ongoing",
    coverage_countries: ["ES", "FR", "IT"],
    trade_lanes: "Barcelona to Northern Europe",
    specialisation_keys: ["sea", "road", "temperature_controlled", "perishable"],
    capability: "Up to 40 containers per month",
    pricing_basis: "per_shipment",
    availability: "immediate",
  },
};

test("a stored trade service presents its own facts", () => {
  const f = byKey(FREIGHT);
  assert.equal(f.service, "Freight forwarding");
  assert.equal(f.serviceCategory, "Freight and logistics");
  assert.equal(f.serviceScope, "International sea and road freight forwarding");
  assert.equal(f.serviceCoverage, "Spain, France, Italy · Barcelona to Northern Europe");
  assert.equal(f.serviceSpecialisation, "Sea, Road, Temperature controlled, Perishable and food");
  assert.equal(f.serviceCapability, "Up to 40 containers per month");
  assert.equal(f.servicePricingBasis, "Per shipment");
  assert.equal(f.serviceAvailability, "Available immediately");
  assert.equal(f.serviceEngagement, "Ongoing arrangement");
  assert.equal(f.validity, "Open until withdrawn");
});

test("a stored trade service has NO quantity, Incoterm, HS code, route or frequency row", () => {
  const keys = keysOf(FREIGHT);
  for (const forbidden of ["quantity", "incoterm", "hsCode", "route", "frequency", "origin", "destination", "sector"]) {
    assert.ok(!keys.includes(forbidden), `a service record presented a ${forbidden} row`);
  }
});

test("a trade service leads with its capability, never with a shipment", () => {
  const p = presentRecord(FREIGHT);
  assert.equal(p.family, "services");
  assert.equal(p.kindLabel, "Offer a trade service");
  assert.equal(p.side, "supply");
  assert.equal(p.headline?.key, "serviceCapability");
  assert.equal(summaryLine(FREIGHT), "Offer a trade service · Freight forwarding · Up to 40 containers per month");
});

test("a record SEEKING a service reads as requirements, not as an offer", () => {
  const seeking: FactsRow = { ...FREIGHT, market_intent: "seek_trade_service" };
  const labels: Record<string, string> = {};
  for (const f of presentRecord(seeking).facts) labels[f.key] = f.label;

  assert.equal(labels.serviceScope, "Scope required");
  assert.equal(labels.serviceCoverage, "Coverage required");
  assert.equal(labels.serviceCapability, "Capacity required");
  assert.equal(labels.servicePricingBasis, "Quotation basis expected");
  assert.equal(labels.serviceAvailability, "Required from");
  assert.equal(presentRecord(seeking).kindLabel, "Seek a trade service");
  assert.equal(presentRecord(seeking).side, "demand");
});

test("a service category with no stated specialisation gets no specialisation row", () => {
  const bare: FactsRow = {
    ...FREIGHT,
    service_terms: { ...(FREIGHT.service_terms as object), specialisation_keys: [] },
  };
  assert.ok(!keysOf(bare).includes("serviceSpecialisation"));
});

// ---------------------------------------------------------------------------
// Distribution
// ---------------------------------------------------------------------------

const DISTRIBUTION: FactsRow = {
  market_family: "distribution",
  market_intent: "seek_distribution_partner",
  type: "requirement",
  product: "Importer or importer of record",
  distribution_partner_type_key: "importer",
  distribution_relationship_terms: ["exclusive"],
  coverage_scope_key: "country",
  territory_codes: ["ES"],
  product_sector_key: "food",
  submitter_role: "Producer / manufacturer",
  validity_type: "dated",
  valid_until: "2026-10-26",
  distribution_terms: {
    objective: "Find an exclusive national distributor",
    product_scope: "Premium Italian food products",
    channel_keys: ["retail", "horeca", "specialist"],
    capability_keys: ["warehousing", "sales_team"],
    commercial_expectations: "Exclusive, subject to performance targets",
    timing: "within_quarter",
  },
};

test("a stored distribution opportunity presents its own facts", () => {
  const f = byKey(DISTRIBUTION);
  assert.equal(f.distributionObjective, "Find an exclusive national distributor");
  assert.equal(f.distributionProductScope, "Premium Italian food products (Food, beverages & tobacco)");
  assert.equal(f.distributionTerritory, "One country (Spain)");
  assert.equal(f.partnerType, "Importer or importer of record");
  assert.equal(f.relationship, "Exclusive");
  assert.equal(f.distributionChannels, "Retail, Hotels, restaurants and catering, Specialist stores");
  assert.equal(f.distributionExpectations, "Exclusive, subject to performance targets");
  assert.equal(f.distributionTiming, "Within three months");
  assert.equal(f.validity, "Open until 2026-10-26");
});

test("a stored distribution opportunity has NO quantity, Incoterm, HS code or route row", () => {
  const keys = keysOf(DISTRIBUTION);
  for (const forbidden of ["quantity", "incoterm", "hsCode", "route", "frequency", "unit"]) {
    assert.ok(!keys.includes(forbidden), `a distribution record presented a ${forbidden} row`);
  }
});

test("capabilities read as required of the partner when sought, and offered when offered", () => {
  const sought: Record<string, string> = {};
  for (const f of presentRecord(DISTRIBUTION).facts) sought[f.key] = f.label;
  assert.equal(sought.distributionCapabilities, "Capabilities");
  assert.equal(sought.distributionChannels, "Channels");

  for (const intent of ["offer_distribution_or_representation", "seek_brands_or_products_to_represent"]) {
    const own: Record<string, string> = {};
    for (const f of presentRecord({ ...DISTRIBUTION, market_intent: intent }).facts) own[f.key] = f.label;
    assert.equal(own.distributionCapabilities, "Capabilities offered", `${intent} inverted the capability`);
    assert.equal(own.distributionChannels, "Channels reached", `${intent} inverted the channels`);
  }
});

test("a distribution opportunity leads with its territory", () => {
  assert.equal(presentRecord(DISTRIBUTION).headline?.key, "distributionTerritory");
  assert.equal(
    summaryLine(DISTRIBUTION),
    "Seek a distributor, agent or representative · Importer or importer of record · One country (Spain)",
  );
});

// ---------------------------------------------------------------------------
// Products, including the one-ended route
// ---------------------------------------------------------------------------

const OFFER: FactsRow = {
  market_family: "products",
  market_intent: "offer_product",
  type: "offer",
  product: "Durum wheat",
  product_sector_key: "agri",
  hs_code: "1001.19",
  quantity: 2500,
  quantity_mode: "exact",
  unit: "MT",
  frequency: "monthly",
  origin: "Argentina",
  incoterm: "FOB",
  payment_terms: "Letter of credit at sight",
  submitter_role: "Producer / manufacturer",
  validity_type: "standing",
};

test("a product offer prints the half of the route it actually decided", () => {
  const f = byKey(OFFER);
  assert.equal(f.route, "Ships from Argentina");
  assert.equal(f.quantity, "2,500 MT per month");
  assert.equal(f.incoterm, "FOB");
  assert.equal(f.hsCode, "HS 1001.19");
  assert.equal(f.sector, "Agriculture & live animals");
});

test("a product requirement prints the delivery end", () => {
  const requirement: FactsRow = {
    ...OFFER,
    market_intent: "source_product",
    type: "requirement",
    origin: null,
    destination: "Italy",
  };
  assert.equal(byKey(requirement).route, "Delivered to Italy");
});

test("a route with both ends stated prints the corridor", () => {
  assert.equal(byKey({ ...OFFER, destination: "Italy" }).route, "Argentina → Italy");
});

test("an offer that stated no route still carries the question", () => {
  // Not the same as a service, which has no route at all: a product movement
  // always has a route, so an unstated one is a genuine gap and a null row is
  // how a gap is reported. `routeEndFor` says which end to reopen.
  const keys = keysOf({ ...OFFER, origin: null });
  assert.ok(keys.includes("route"));
  assert.equal(byKey({ ...OFFER, origin: null }).route, null);
  assert.equal(routeEndFor({ ...OFFER, origin: null }), "origin");
});

test("a product record has NO service or distribution row", () => {
  const keys = keysOf(OFFER);
  for (const forbidden of ["serviceScope", "serviceCoverage", "serviceCapability", "distributionObjective", "distributionChannels", "partnerType"]) {
    assert.ok(!keys.includes(forbidden), `a product record presented a ${forbidden} row`);
  }
});

// ---------------------------------------------------------------------------
// Legacy rows, written before the canonical columns existed
// ---------------------------------------------------------------------------

test("a legacy row with no canonical family is read from its type", () => {
  assert.equal(familyOfRow({ type: "service" }), "services");
  assert.equal(familyOfRow({ type: "offer" }), "products");
  assert.equal(familyOfRow({ type: "requirement" }), "products");
  assert.equal(familyOfRow({}), "products");
  // And the legacy spelling is reconciled rather than falling through.
  assert.equal(familyOfRow({ market_family: "trade_services" }), "services");
});

test("a legacy row states the only kind it actually carries", () => {
  assert.equal(presentRecord({ type: "offer", product: "Durum wheat" }).kindLabel, "Offer");
  assert.equal(presentRecord({ type: "requirement" }).kindLabel, "Requirement");
  assert.equal(presentRecord({ type: "service" }).kindLabel, "Trade service");
  assert.equal(presentRecord({ type: "offer" }).side, null, "a legacy row invented a market side");
});

test("the route end a legacy row decided is read from its type", () => {
  assert.equal(routeEndFor({ type: "offer" }), "origin");
  assert.equal(routeEndFor({ type: "requirement" }), "destination");
  assert.equal(routeEndFor({}), "both");
  assert.equal(routeEndFor({ market_intent: "offer_product" }), "origin");
  assert.equal(routeEndFor({ market_intent: "seek_trade_service" }), "both");
});

// ---------------------------------------------------------------------------
// Honesty of the shared parts
// ---------------------------------------------------------------------------

test("every family carries the role and validity the publication gate requires", () => {
  for (const row of [FREIGHT, DISTRIBUTION, OFFER]) {
    const keys = keysOf(row);
    for (const shared of ["payment", "role", "validity"]) {
      assert.ok(keys.includes(shared), `${familyOfRow(row)} dropped the shared ${shared} row`);
    }
  }
});

test("statedFacts returns only what the member actually stated", () => {
  const bare: FactsRow = { market_family: "services", market_intent: "offer_trade_service", product: "Customs brokerage" };
  const stated = statedFacts(bare);
  assert.deepEqual(stated.map((f) => f.key), ["service"]);
  // And the whole presentation still asks the open questions.
  assert.ok(presentRecord(bare).facts.length > 1);
  assert.equal(presentRecord(bare).headline, null, "an unstated headline was printed anyway");
});

test("nothing is invented for an empty row", () => {
  const p = presentRecord({});
  assert.equal(p.subject, null);
  assert.equal(p.headline, null);
  assert.ok(p.facts.every((f) => f.value === null));
});

// ---------------------------------------------------------------------------
// The label catalogue cannot drift from the message catalogue
// ---------------------------------------------------------------------------

test("every fact label matches structure.field in the message catalogue", () => {
  const messages = JSON.parse(readFileSync("messages/en.json", "utf8")) as {
    structure: { field: Record<string, string> };
  };
  const field = messages.structure.field;
  const wrong: string[] = [];
  for (const [key, label] of Object.entries(FACT_LABELS)) {
    if (field[key] === undefined) wrong.push(`${key}: absent from structure.field`);
    else if (field[key] !== label) wrong.push(`${key}: "${label}" vs catalogue "${field[key]}"`);
  }
  assert.deepEqual(wrong, [], `the published record would name a fact differently from the composer:\n  ${wrong.join("\n  ")}`);
});

test("every label a presentation can emit is in the label map", () => {
  const rows: FactsRow[] = [
    FREIGHT,
    { ...FREIGHT, market_intent: "seek_trade_service" },
    DISTRIBUTION,
    { ...DISTRIBUTION, market_intent: "offer_distribution_or_representation" },
    { ...DISTRIBUTION, market_intent: "seek_brands_or_products_to_represent" },
    OFFER,
    { ...OFFER, market_intent: "source_product", origin: null, destination: "Italy" },
    {},
  ];
  for (const row of rows) {
    for (const f of presentRecord(row).facts) {
      assert.equal(f.label, FACT_LABELS[f.labelKey], `${f.key} carried a label off the map`);
    }
  }
});

console.log(`listings/record-facts: ${passed} passed`);
