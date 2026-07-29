// Persisted saved-draft resume, and the canonical family boundary.
//
// Run: npx tsx lib/structure/__tests__/resume.test.ts
//
// Two faults are pinned here.
//
// The composer had no persisted resume at all. `/structure` mounted with a
// family entrance and nothing else, so a member who saved a freight-forwarding
// draft and came back started from an empty record. What existed was the
// account-gate continuation, which replays an IN-MEMORY draft across sign-in
// and is a different thing entirely.
//
// And `familyOf` fell through to Products for any value it did not recognise.
// A trade service read as a product is asked for a shipped quantity, an
// Incoterm and an HS classification it does not have, and the fallback made
// that failure silent. It now fails closed.

import assert from "node:assert/strict";
import { draftFromRow, validityFromRow, type ResumableRow } from "../resume";
import {
  openGaps,
  blockers,
  toSubmitPayload,
  submitPayloads,
  synthesiseDetails,
  askKeyFor,
} from "../draft";
import { discardedByFamilyChange } from "../discard";
import { familyOf } from "../procedures/registry";
import {
  normaliseMarketFamily,
  isMarketFamily,
  UnknownMarketFamilyError,
} from "../../taxonomy/market";

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

const NOW = Date.parse("2026-07-28T00:00:00.000Z");
const PRODUCT_ONLY = ["quantity", "unit", "hsCode", "incoterm"];

/* ------------------------------------------------------------------ */
/* A. The canonical family boundary                                    */
/* ------------------------------------------------------------------ */

test("the canonical key is services, and trade_services normalises onto it", () => {
  assert.equal(normaliseMarketFamily("services"), "services");
  assert.equal(normaliseMarketFamily("trade_services"), "services");
  assert.equal(normaliseMarketFamily("products"), "products");
  assert.equal(normaliseMarketFamily("distribution"), "distribution");
  // The alias is legacy input only; it is never a canonical key.
  assert.equal(isMarketFamily("trade_services"), false);
  assert.equal(isMarketFamily("services"), true);
});

test("absent is null, not products, and not an error", () => {
  // Absent and unrecognised are different things. A record with no family
  // predates the family entrances and is legitimately product-shaped.
  assert.equal(normaliseMarketFamily(null), null);
  assert.equal(normaliseMarketFamily(undefined), null);
  assert.equal(normaliseMarketFamily(""), null);
});

test("an unknown family fails closed rather than becoming a product", () => {
  for (const bad of ["Services", "service", "goods", "trade-services", "PRODUCTS", 7, {}, []]) {
    assert.throws(
      () => normaliseMarketFamily(bad),
      UnknownMarketFamilyError,
      `expected ${JSON.stringify(bad)} to be refused`,
    );
  }
});

test("the error names the value and the accepted keys", () => {
  try {
    normaliseMarketFamily("trade-services");
    assert.fail("should have thrown");
  } catch (err) {
    const m = (err as Error).message;
    assert.match(m, /trade-services/, "must name the offending value");
    assert.match(m, /products, services, distribution/, "must name the accepted keys");
  }
});

test("familyOf resolves a draft through the same boundary", () => {
  const at = (family: unknown) =>
    familyOf({ canonical: { family, intent: "x" } } as never);
  assert.equal(at("services"), "services");
  assert.equal(at("trade_services"), "services", "legacy spelling resolves, it does not fall through");
  assert.equal(at("distribution"), "distribution");
  // No canonical entrance at all is the documented legacy product record.
  assert.equal(familyOf({ canonical: null } as never), "products");
  assert.throws(() => at("nonsense"), UnknownMarketFamilyError);
});

/* ------------------------------------------------------------------ */
/* B. Persisted resume                                                 */
/* ------------------------------------------------------------------ */

const freightRow: ResumableRow = {
  id: "row-1",
  status: "draft",
  type: "service",
  market_family: "services",
  market_intent: "offer_trade_service",
  service_category_key: "freight_logistics",
  service_subcategory_keys: ["ocean_freight", "air_freight"],
  coverage_scope_key: "multi_country",
  territory_codes: ["NL", "DE"],
  payment_terms: "Net 30",
  submitter_role: "Service provider",
  validity_type: "standing",
  service_terms: {
    scope: "Port-to-door ocean freight, FCL and LCL.",
    engagement: "ongoing",
    coverage_countries: ["NL", "DE"],
    trade_lanes: "Rotterdam to Hamburg",
    specialisation_keys: ["fcl", "lcl"],
    capability: "40 containers a month",
    pricing_basis: "per_container",
    availability: "Weekly sailings",
  },
};

test("a saved freight-forwarding draft restores its service classification", () => {
  const d = draftFromRow(freightRow, NOW);
  assert.deepEqual(d.canonical, { family: "services", intent: "offer_trade_service" });
  assert.equal(d.serviceCategory, "freight_logistics");
  assert.deepEqual(d.serviceSubcategories, ["ocean_freight", "air_freight"]);
  assert.deepEqual(d.territoryCodes, ["NL", "DE"]);
  assert.equal(d.coverageScope, "multi_country");
});

test("a saved freight-forwarding draft restores its service-specific terms", () => {
  const d = draftFromRow(freightRow, NOW);
  assert.equal(d.serviceTerms.scope, "Port-to-door ocean freight, FCL and LCL.");
  assert.equal(d.serviceTerms.engagement, "ongoing");
  assert.deepEqual(d.serviceTerms.coverageCountries, ["NL", "DE"]);
  assert.equal(d.serviceTerms.tradeLanes, "Rotterdam to Hamburg");
  assert.deepEqual(d.serviceTerms.specialisationKeys, ["fcl", "lcl"]);
  // The throughput is a capability, never a quantity.
  assert.equal(d.serviceTerms.capability, "40 containers a month");
  assert.equal(d.serviceTerms.pricingBasis, "per_container");
  assert.equal(d.serviceTerms.availability, "Weekly sailings");
});

test("a resumed freight-forwarding draft never resumes at Quantity or Incoterm", () => {
  // The whole point. A resumed service must not re-enter the product journey.
  const d = draftFromRow(freightRow, NOW);
  const gaps = openGaps(d).map(String);
  const blocked = blockers(d).map((b) => String(b.key));
  for (const field of PRODUCT_ONLY) {
    assert.ok(!gaps.includes(field), `resumed service asked for ${field}: ${gaps}`);
    assert.ok(!blocked.includes(field), `resumed service blocked on ${field}: ${blocked}`);
  }
  assert.equal(d.quantity, null);
  assert.equal(d.quantityMode, null);
  assert.equal(d.unit, null);
  assert.equal(d.incoterm, null);
  assert.equal(d.hsCode, null);
});

test("product columns on a service row are refused, not carried in", () => {
  // A legacy or hand-edited row may hold both. Reading it family-blind is how a
  // service acquires a shipped quantity it never had.
  const contaminated: ResumableRow = {
    ...freightRow,
    quantity: 25000, quantity_mode: "exact", unit: "MT", incoterm: "CIF", hs_code: "170199",
  };
  const d = draftFromRow(contaminated, NOW);
  assert.equal(d.quantity, null, "a service row must not resume with a quantity");
  assert.equal(d.unit, null);
  assert.equal(d.incoterm, null);
  assert.equal(d.hsCode, null);
  assert.equal(d.serviceTerms.capability, "40 containers a month", "its own terms still restore");
});

const distributionRow: ResumableRow = {
  id: "row-2",
  status: "draft",
  type: "offer",
  market_family: "distribution",
  market_intent: "offer_distribution_or_representation",
  distribution_partner_type_key: "distributor",
  distribution_relationship_terms: ["exclusive"],
  coverage_scope_key: "single_country",
  territory_codes: ["ES"],
  product_sector_key: "food_beverage",
  submitter_role: "Distributor",
  validity_type: "standing",
  distribution_terms: {
    objective: "Place a European FMCG portfolio into Spanish retail.",
    product_scope: "Ambient food and beverage",
    channel_keys: ["retail_grocery", "wholesale"],
    capability_keys: ["warehousing", "merchandising"],
    commercial_expectations: "Exclusive, 12-month trial, opening order negotiable",
    timing: "Q4 2026",
  },
};

test("a saved distribution draft restores its classification and its own terms", () => {
  const d = draftFromRow(distributionRow, NOW);
  assert.deepEqual(d.canonical, {
    family: "distribution", intent: "offer_distribution_or_representation",
  });
  assert.equal(d.distributionPartnerType, "distributor");
  assert.deepEqual(d.distributionRelationshipTerms, ["exclusive"]);
  assert.equal(d.productSector, "food_beverage");
  assert.equal(d.distributionTerms.objective, "Place a European FMCG portfolio into Spanish retail.");
  assert.deepEqual(d.distributionTerms.channelKeys, ["retail_grocery", "wholesale"]);
  assert.deepEqual(d.distributionTerms.capabilityKeys, ["warehousing", "merchandising"]);
  // An opening order is a relationship term, never a shipped quantity.
  assert.match(String(d.distributionTerms.commercialExpectations), /opening order/);
});

test("a resumed distribution draft never resumes at Quantity or Incoterm", () => {
  const d = draftFromRow(distributionRow, NOW);
  const gaps = openGaps(d).map(String);
  const blocked = blockers(d).map((b) => String(b.key));
  for (const field of PRODUCT_ONLY) {
    assert.ok(!gaps.includes(field), `resumed distribution asked for ${field}: ${gaps}`);
    assert.ok(!blocked.includes(field), `resumed distribution blocked on ${field}: ${blocked}`);
  }
  assert.equal(d.quantity, null);
  assert.equal(d.incoterm, null);
});

/* ---- Products regression ------------------------------------------ */

const productRow: ResumableRow = {
  id: "row-3",
  status: "draft",
  type: "offer",
  market_family: "products",
  market_intent: "offer_product",
  product: "Refined sugar ICUMSA 45",
  hs_code: "170199",
  quantity_mode: "exact",
  quantity: 25000,
  unit: "MT",
  frequency: "Monthly",
  incoterm: "CIF",
  origin: "Brazil",
  payment_terms: "LC at sight",
  submitter_role: "Producer",
  product_sector_key: "agriculture_food",
  validity_type: "standing",
};

test("a saved product draft still restores quantity, unit, HS code and Incoterm", () => {
  const d = draftFromRow(productRow, NOW);
  assert.deepEqual(d.canonical, { family: "products", intent: "offer_product" });
  assert.equal(d.product, "Refined sugar ICUMSA 45");
  assert.equal(d.hsCode, "170199");
  assert.equal(d.quantityMode, "exact");
  assert.equal(d.quantity, 25000);
  assert.equal(d.unit, "MT");
  assert.equal(d.frequency, "Monthly");
  assert.equal(d.incoterm, "CIF");
  assert.equal(d.origin, "Brazil");
});

test("postgres numeric arriving as a string resumes as a number", () => {
  const d = draftFromRow({ ...productRow, quantity: "1250.75" as never }, NOW);
  assert.equal(d.quantity, 1250.75);
});

test("a legacy row with no family at all resumes as a product", () => {
  // Documented and deliberate: the pre-family composer produced product-shaped
  // records, and reading them as anything else would reclassify all of them.
  const d = draftFromRow({ type: "offer", product: "Sugar", quantity: 100, unit: "MT" }, NOW);
  assert.equal(d.canonical, null);
  assert.equal(d.quantity, 100);
  assert.equal(familyOf(d), "products");
});

test("an unrecognised stored family refuses to resume", () => {
  assert.throws(
    () => draftFromRow({ ...productRow, market_family: "widgets" }, NOW),
    UnknownMarketFamilyError,
  );
});

/* ---- Shared resume behaviour --------------------------------------- */

test("the family terms columns may be absent, and resume still works", () => {
  // 20260728d is not applied. Until it is, these columns do not exist and the
  // read falls back to the base column list, so the row arrives without them.
  const { service_terms, ...withoutTerms } = freightRow;
  void service_terms;
  const d = draftFromRow(withoutTerms, NOW);
  assert.deepEqual(d.canonical, { family: "services", intent: "offer_trade_service" });
  assert.equal(d.serviceCategory, "freight_logistics", "classification still restores");
  assert.equal(d.serviceTerms.scope, null, "and the terms are simply empty");
});

test("a dated validity resumes as the days REMAINING, not the days originally set", () => {
  // A draft saved with 30 days and resumed a week later has 23 left. Showing 30
  // would silently extend an horizon the member chose.
  const d = draftFromRow(
    { ...productRow, validity_type: "dated", valid_until: "2026-08-20" },
    NOW,
  );
  assert.equal(d.validity, 23);
});

test("a lapsed validity resumes as undeclared rather than as a negative", () => {
  const d = draftFromRow(
    { ...productRow, validity_type: "dated", valid_until: "2026-07-01" },
    NOW,
  );
  assert.equal(d.validity, null);
  assert.equal(validityFromRow("dated", "2026-07-01", NOW), null);
  assert.equal(validityFromRow("standing", null, NOW), "standing");
});

test("an accepted declaration resumes as accepted", () => {
  const d = draftFromRow({ ...productRow, declaration_accepted_at: "2026-07-28T00:00:00Z" }, NOW);
  assert.equal(d.declarationAccepted, true);
  const fresh = draftFromRow(productRow, NOW);
  assert.equal(fresh.declarationAccepted, false, "and is not assumed when never accepted");
});

/* ------------------------------------------------------------------ */
/* E. Round trips: edit, duplicate, intent change, family change       */
/* ------------------------------------------------------------------ */
//
// Resuming a row is only half the contract. A member who resumes a record then
// SUBMITS it again must get the same record back, and a member who changes
// something on the way through must get exactly the change they asked for and
// no other. These walk the full circle - row -> draft -> payload - because that
// is the loop an edit actually performs, and a fault anywhere in it silently
// rewrites a record the member believed they were only touching.

const OPTS = { draft: false, nowIso: "2026-07-28T00:00:00.000Z" };

// These fixtures use REAL taxonomy keys, unlike the illustrative rows above.
// They have to: a round trip passes through `clearForeignClassification`, which
// validates a specialisation against its category, so a row keyed with an
// invented category would lose its specialisations here for a reason that has
// nothing to do with what is being tested.
//
// That validation is correct, and it exposed something adjacent that is not
// fixed here: `canonicalServiceCategory` and `canonicalPartnerType` exist to
// reconcile a legacy stored key onto its current one, and nothing calls them,
// so a record stored under a superseded key would lose its specialisations on
// edit. Recorded as a Post-Launch ticket rather than changed under this task.
const realFreightRow: ResumableRow = {
  id: "row-r1",
  status: "draft",
  type: "service",
  market_family: "services",
  market_intent: "offer_trade_service",
  product: "Freight forwarding",
  service_category_key: "freight",
  service_subcategory_keys: ["freight.forwarding"],
  payment_terms: "Net 30",
  submitter_role: "Service provider",
  validity_type: "standing",
  service_terms: {
    scope: "Port-to-door ocean freight, FCL and LCL.",
    engagement: "ongoing",
    coverage_countries: ["NL", "DE"],
    trade_lanes: "Rotterdam to Hamburg",
    specialisation_keys: ["sea", "road"],
    capability: "40 containers a month",
    pricing_basis: "per_shipment",
    availability: "immediate",
  },
};

const realDistributionRow: ResumableRow = {
  id: "row-r2",
  status: "draft",
  type: "offer",
  market_family: "distribution",
  market_intent: "offer_distribution_or_representation",
  product: "Distributor",
  distribution_partner_type_key: "distributor",
  distribution_relationship_terms: ["exclusive"],
  coverage_scope_key: "country",
  territory_codes: ["ES"],
  product_sector_key: "food",
  submitter_role: "Distributor",
  validity_type: "standing",
  distribution_terms: {
    objective: "Place a European FMCG portfolio into Spanish retail.",
    product_scope: "Ambient food and beverage",
    channel_keys: ["retail", "wholesale"],
    capability_keys: ["warehousing", "marketing"],
    commercial_expectations: "Exclusive, 12-month trial, opening order negotiable",
    timing: "within_quarter",
  },
};

/** The stored row a payload would become, for a second trip round the loop. */
function rowFromPayload(payload: Record<string, unknown>): ResumableRow {
  const terms = (payload.service_terms ?? null) as Record<string, unknown> | null;
  const dist = (payload.distribution_terms ?? null) as Record<string, unknown> | null;
  return {
    ...(payload as ResumableRow),
    service_terms: terms,
    distribution_terms: dist,
  };
}

test("editing a resumed trade service and resubmitting it returns the same record", () => {
  const first = draftFromRow(realFreightRow, NOW);
  const payload = toSubmitPayload(first, OPTS);
  const second = draftFromRow(rowFromPayload(payload), NOW);

  assert.deepEqual(second.canonical, first.canonical);
  assert.equal(second.serviceCategory, first.serviceCategory);
  assert.deepEqual(second.serviceSubcategories, first.serviceSubcategories);
  assert.deepEqual(second.serviceTerms, first.serviceTerms);
  // And the product fields are still absent on the second trip, not resurrected
  // by a round through a payload that has columns for them.
  for (const field of PRODUCT_ONLY) {
    assert.equal(
      (second as unknown as Record<string, unknown>)[field] ?? null,
      null,
      `${field} appeared on a trade service after an edit round trip`,
    );
  }
});

test("editing a resumed distribution opportunity returns the same record", () => {
  const first = draftFromRow(realDistributionRow, NOW);
  const second = draftFromRow(rowFromPayload(toSubmitPayload(first, OPTS)), NOW);
  assert.deepEqual(second.canonical, first.canonical);
  assert.equal(second.distributionPartnerType, first.distributionPartnerType);
  assert.deepEqual(second.territoryCodes, first.territoryCodes);
  assert.deepEqual(second.distributionTerms, first.distributionTerms);
});

test("editing a resumed product record returns the same record", () => {
  const first = draftFromRow(productRow, NOW);
  const second = draftFromRow(rowFromPayload(toSubmitPayload(first, OPTS)), NOW);
  assert.equal(second.product, first.product);
  assert.equal(second.hsCode, first.hsCode);
  assert.equal(second.quantity, first.quantity);
  assert.equal(second.unit, first.unit);
  assert.equal(second.incoterm, first.incoterm);
  assert.equal(second.origin, first.origin);
});

test("changing the intent inside a family keeps every answer and flips the wording", () => {
  // Offering a service and needing one are the same eight facts read from
  // opposite sides. Nothing is discarded, because nothing stops being a fact
  // the member has: what changes is who is being described.
  const offering = draftFromRow(realFreightRow, NOW);
  const needing: typeof offering = {
    ...offering,
    canonical: { family: "services", intent: "seek_trade_service" },
  };

  assert.deepEqual(needing.serviceTerms, offering.serviceTerms, "an intent change lost a service term");
  assert.deepEqual(openGaps(needing), openGaps(offering), "an intent change changed which facts are open");

  // The questions and the review both change side.
  assert.equal(askKeyFor("serviceCapability", offering), "ask.serviceCapability");
  assert.equal(askKeyFor("serviceCapability", needing), "ask.serviceCapabilityNeeded");
  assert.match(synthesiseDetails(needing), /Capacity required:/);
  assert.match(synthesiseDetails(offering), /Service capability:/);

  // And the record it becomes carries the new intent, not the old one.
  const payload = toSubmitPayload(needing, OPTS);
  assert.equal(payload.market_intent, "seek_trade_service");
  assert.equal((payload.service_terms as Record<string, unknown>).capability, "40 containers a month");
});

test("changing the distribution intent flips whose capability is being described", () => {
  const seeking = draftFromRow(
    { ...realDistributionRow, market_intent: "seek_distribution_partner" },
    NOW,
  );
  const representing = {
    ...seeking,
    canonical: { family: "distribution", intent: "seek_brands_or_products_to_represent" },
  };
  // Seeking brands to represent is the member stating their OWN channels, so it
  // reads like offering representation and not like requiring it.
  assert.equal(askKeyFor("distributionCapabilities", seeking), "ask.distributionCapabilitiesSought");
  assert.equal(
    askKeyFor("distributionCapabilities", representing),
    "ask.distributionCapabilitiesOffered",
  );
  assert.match(synthesiseDetails(representing), /Capabilities offered:/);
  assert.match(synthesiseDetails(seeking), /Capabilities expected of the partner:/);
});

test("changing the family discards the old family's answers and nothing else", () => {
  const service = draftFromRow(realFreightRow, NOW);
  // What the member is told they will lose, before it happens.
  const warned = discardedByFamilyChange(service, "distribution").map((i) => i.key);
  assert.ok(warned.includes("serviceScope"), "the warning omitted the service scope");
  assert.ok(warned.includes("serviceCapability"), "the warning omitted the service capability");

  const moved = { ...service, canonical: { family: "distribution", intent: "seek_distribution_partner" } };
  const payload = toSubmitPayload(moved, OPTS);

  // Everything warned about is gone from the record...
  assert.equal(payload.service_terms, undefined);
  assert.equal(payload.service_category_key, null);
  assert.deepEqual(payload.service_subcategory_keys, []);
  assert.ok(!/Port-to-door ocean freight/.test(payload.details as string), "a discarded service scope survived into the record's text");

  // ...and everything shared is kept, which is why the warning must not name it.
  assert.equal(payload.submitter_role, "Service provider");
  assert.equal(payload.validity_type, "standing");
  assert.equal(payload.market_family, "distribution");
});

test("a multi-product draft duplicates into one clean record per product", () => {
  // The composer's only duplication path: a member who uploaded a document
  // naming several products and chose separate records. Each becomes its own
  // record carrying the shared commercial terms, and each has to be as
  // family-clean as a record built one at a time.
  const base = draftFromRow(productRow, NOW);
  const resolution = (name: string, hs: string) => ({
    originalWording: name,
    normalised: name,
    productKey: name.toLowerCase().replace(/\s+/g, "_"),
    synonyms: [],
    categoryPath: [],
    sector: "agri",
    attributes: [],
    candidateHs: { code: hs, description: name, confirmed: true },
    searchText: name,
    searchTerms: [name],
  });
  const multi = {
    ...base,
    resolution: resolution("Refined sugar ICUMSA 45", "1701.99"),
    siblings: [resolution("Raw cane sugar", "1701.14")],
    programme: false,
  };

  const payloads = submitPayloads(multi, OPTS);
  assert.equal(payloads.length, 2, "the separate-records choice produced one record");
  assert.deepEqual(
    payloads.map((p) => p.product),
    ["Refined sugar ICUMSA 45", "Raw cane sugar"],
  );
  for (const p of payloads) {
    assert.equal(p.market_family, "products");
    assert.equal(p.submitter_role, "Producer", "a duplicated record lost the shared terms");
    assert.equal(p.service_terms, undefined, "a duplicated product record carried service terms");
    assert.equal(p.distribution_terms, undefined);
  }
  // The two records carry their OWN classifications, which is the whole reason
  // they are separate records rather than one generic listing.
  assert.equal(payloads[0].hs_code, "1701.99");
  assert.equal(payloads[1].hs_code, "1701.14");

  // And the combined programme, which is the member's own choice, is one record
  // that names the others rather than two.
  const programme = submitPayloads({ ...multi, programme: true }, OPTS);
  assert.equal(programme.length, 1);
  assert.match(programme[0].details as string, /Raw cane sugar/);
});

console.log(`structure/resume: ${passed} passed`);
