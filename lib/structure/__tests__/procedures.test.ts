// The family-specific commercial procedures: completion queues, fact buckets,
// blockers, review models and submit payloads, for all seven canonical intents.
//
// Run: npx tsx lib/structure/__tests__/procedures.test.ts
//
// This file exists because of one defect: after the correct family-specific
// classification, every family entered the same product-shaped downstream
// procedure. A freight forwarder was asked for a quantity and an Incoterm, told
// an Incoterm was blocking their publication, and shown a review that printed
// HS code, quantity, frequency, route and Incoterm as "Not stated".
//
// Most of what follows is therefore NEGATIVE. The assertions that matter most
// are the ones that say a field is absent, because a field that is merely
// hidden is still asked, still blocking and still stored.
//
// Pure logic. node:assert, non-zero exit on failure.

import assert from "node:assert/strict";
import {
  emptyDraft,
  openGaps,
  bucketize,
  blockers,
  synthesiseDetails,
  toSubmitPayload,
  procedureFor,
  clearForeignClassification,
  crossFamilyClassification,
  FIELD_FAMILY,
  fieldBelongsTo,
  legacyTypeForIntent,
  type StructureDraft,
  type CompletionField,
} from "../draft";
import { MARKET_INTENTS, type MarketFamily, type MarketIntent } from "../../taxonomy/market";
import { readClassification } from "../../listings/classification";

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

const OPTS = { draft: false, nowIso: "2026-07-28T00:00:00.000Z" };

/** A draft entered at one canonical entrance, exactly as the composer builds it. */
function at(family: MarketFamily, intent: MarketIntent, over: Partial<StructureDraft> = {}): StructureDraft {
  return {
    ...emptyDraft(),
    canonical: { family, intent },
    intent: legacyTypeForIntent(intent),
    ...over,
  };
}

/** Every field name and label key any surface could print for this draft. */
function reviewLabels(draft: StructureDraft): string[] {
  const model = procedureFor(draft).reviewModel(draft);
  return [...model.publicSections, ...model.privateSections].flatMap((s) =>
    s.rows.map((r) => r.labelKey),
  );
}

const ALL_INTENTS = MARKET_INTENTS.map((i) => ({ family: i.family, intent: i.key }));

/** The product-only facts, by the name each layer knows them by. */
const PRODUCT_ONLY_FIELDS: CompletionField[] = ["quantity", "origin", "destination", "incoterm", "payment"];
const PRODUCT_ONLY_LABELS = ["quantity", "hsCode", "incoterm", "route", "frequency", "origin", "destination"];
const PRODUCT_ONLY_COLUMNS = ["hs_code", "quantity", "quantity_mode", "unit", "incoterm", "origin", "destination"];

// ---------------------------------------------------------------------------
// Every canonical entrance reaches exactly one procedure
// ---------------------------------------------------------------------------

test("all seven canonical intents resolve to their own family's procedure", () => {
  assert.equal(ALL_INTENTS.length, 7, "the canonical taxonomy no longer has seven intents");
  for (const { family, intent } of ALL_INTENTS) {
    assert.equal(
      procedureFor(at(family, intent)).family,
      family,
      `${intent} did not reach the ${family} procedure`,
    );
  }
});

test("a draft with no canonical entrance is a products record", () => {
  // The legacy composer entrance. Reading it as anything else would reclassify
  // every record created before the family entrances existed.
  assert.equal(procedureFor(emptyDraft()).family, "products");
});

// ---------------------------------------------------------------------------
// The field ownership map is the one statement of the rule
// ---------------------------------------------------------------------------

test("quantity, Incoterm and the route belong to Products alone", () => {
  for (const field of PRODUCT_ONLY_FIELDS) {
    assert.deepEqual(FIELD_FAMILY[field], ["products"], `${field} is not Products-only`);
    assert.ok(!fieldBelongsTo(field, "services"), `${field} leaked into services`);
    assert.ok(!fieldBelongsTo(field, "distribution"), `${field} leaked into distribution`);
  }
});

test("validity, role and note are the only fields every family shares", () => {
  const shared = (Object.keys(FIELD_FAMILY) as CompletionField[]).filter(
    (f) => FIELD_FAMILY[f].length === 3,
  );
  assert.deepEqual(shared.sort(), ["note", "role", "validity"]);
});

test("every completion field a procedure asks for is a field it owns", () => {
  for (const { family, intent } of ALL_INTENTS) {
    const draft = at(family, intent);
    for (const field of procedureFor(draft).completionFields(draft)) {
      assert.ok(
        fieldBelongsTo(field, family),
        `${family}/${intent} asks for ${field}, which belongs to ${FIELD_FAMILY[field].join(", ")}`,
      );
    }
  }
});

// ---------------------------------------------------------------------------
// Trade services: the mandatory negative assertions
// ---------------------------------------------------------------------------

const SERVICE_INTENTS: MarketIntent[] = ["offer_trade_service", "seek_trade_service"];

test("a trade service is never asked for a quantity, a unit or an Incoterm", () => {
  for (const intent of SERVICE_INTENTS) {
    const draft = at("services", intent, { serviceCategory: "freight", serviceSubcategories: ["freight.forwarding"] });
    const asked = openGaps(draft);
    for (const forbidden of PRODUCT_ONLY_FIELDS) {
      assert.ok(!asked.includes(forbidden), `${intent} was asked for ${forbidden}`);
    }
  }
});

test("a trade service never shows a product fact as a missing detail", () => {
  const draft = at("services", "offer_trade_service", { serviceCategory: "freight", serviceSubcategories: ["freight.forwarding"] });
  const b = bucketize(draft);
  for (const forbidden of ["quantity", "incoterm", "origin", "destination", "hsCode", "unit"]) {
    assert.ok(!b.missing.includes(forbidden), `a service listing showed "${forbidden} · Add"`);
    assert.ok(!b.commercial.includes(forbidden), `a service listing claimed ${forbidden} as a stated fact`);
  }
});

test("no product field can ever block a trade service publication", () => {
  const draft = at("services", "offer_trade_service");
  const keys = blockers(draft).map((b) => b.key);
  for (const forbidden of ["quantity", "incoterm", "unit", "hsCode", "packaging"]) {
    assert.ok(!keys.includes(forbidden), `an Incoterm-shaped blocker (${forbidden}) held up a service`);
  }
  // What SHOULD block it.
  assert.ok(keys.includes("serviceClassification"));
  assert.ok(keys.includes("serviceScope"));
  assert.ok(keys.includes("serviceCoverage"));
  assert.ok(keys.includes("validity"));
  assert.ok(keys.includes("businessVerification"));
});

test("a trade service review has no row for a product fact, stated or not", () => {
  const labels = reviewLabels(at("services", "offer_trade_service"));
  for (const forbidden of PRODUCT_ONLY_LABELS) {
    assert.ok(!labels.includes(forbidden), `the service review printed a ${forbidden} row`);
  }
  assert.ok(labels.includes("serviceScope"));
  assert.ok(labels.includes("serviceCoverage"));
  assert.ok(labels.includes("serviceCapability"));
  assert.ok(labels.includes("servicePricingBasis"));
});

test("a specialisation question is asked only where the category has one", () => {
  const freight = at("services", "offer_trade_service", { serviceCategory: "freight" });
  assert.ok(procedureFor(freight).completionFields(freight).includes("serviceSpecialisation"));
  // The escape route has no conditioned dimension beyond delivery mode; a
  // category with none at all must not be shown an empty control.
  const none = at("services", "offer_trade_service", { serviceCategory: "no-such-category" });
  assert.ok(!procedureFor(none).completionFields(none).includes("serviceSpecialisation"));
});

// ---------------------------------------------------------------------------
// Distribution: the mandatory negative assertions
// ---------------------------------------------------------------------------

const DISTRIBUTION_INTENTS: MarketIntent[] = [
  "seek_distribution_partner",
  "offer_distribution_or_representation",
  "seek_brands_or_products_to_represent",
];

test("no distribution intent is ever asked for a shipment quantity or an Incoterm", () => {
  for (const intent of DISTRIBUTION_INTENTS) {
    const asked = openGaps(at("distribution", intent));
    for (const forbidden of PRODUCT_ONLY_FIELDS) {
      assert.ok(!asked.includes(forbidden), `${intent} was asked for ${forbidden}`);
    }
  }
});

test("a distribution listing never shows a product fact as missing", () => {
  for (const intent of DISTRIBUTION_INTENTS) {
    const b = bucketize(at("distribution", intent));
    for (const forbidden of ["quantity", "incoterm", "origin", "destination", "hsCode", "unit"]) {
      assert.ok(!b.missing.includes(forbidden), `${intent} showed "${forbidden} · Add"`);
    }
  }
});

test("no product field can ever block a distribution publication", () => {
  const keys = blockers(at("distribution", "seek_distribution_partner")).map((b) => b.key);
  for (const forbidden of ["quantity", "incoterm", "unit", "hsCode"]) {
    assert.ok(!keys.includes(forbidden), `${forbidden} held up a distribution record`);
  }
  assert.ok(keys.includes("distributionPartner"));
  assert.ok(keys.includes("distributionObjective"));
  assert.ok(keys.includes("distributionTerritory"));
  assert.ok(keys.includes("businessVerification"));
});

test("a distribution review has no row for a product shipment term", () => {
  const labels = reviewLabels(at("distribution", "seek_distribution_partner"));
  for (const forbidden of PRODUCT_ONLY_LABELS) {
    assert.ok(!labels.includes(forbidden), `the distribution review printed a ${forbidden} row`);
  }
  assert.ok(labels.includes("distributionObjective"));
  assert.ok(labels.includes("distributionTerritory"));
  assert.ok(labels.includes("partnerType"));
  assert.ok(labels.includes("distributionChannels"));
});

test("a member seeking brands to represent is not asked to name the products first", () => {
  // Finding them is the point of the record. The sector chosen in the category
  // step is the scope, and asking again would ask the member to name the thing
  // they came to Ponte to find.
  const seek = at("distribution", "seek_brands_or_products_to_represent");
  assert.ok(!procedureFor(seek).completionFields(seek).includes("distributionProductScope"));
  const partner = at("distribution", "seek_distribution_partner");
  assert.ok(procedureFor(partner).completionFields(partner).includes("distributionProductScope"));
});

// ---------------------------------------------------------------------------
// Products: no regression, and no foreign fields either
// ---------------------------------------------------------------------------

test("a product record keeps its own commercial questions, unchanged", () => {
  assert.deepEqual(openGaps(at("products", "offer_product", { product: "Refined sugar" })), [
    "quantity", "origin", "incoterm", "payment", "validity", "role", "note",
  ]);
  assert.deepEqual(openGaps(at("products", "source_product", { product: "Refined sugar" })), [
    "quantity", "destination", "incoterm", "payment", "validity", "role", "note",
  ]);
});

test("a product review shows no service or distribution field", () => {
  const labels = reviewLabels(at("products", "offer_product", { product: "Refined sugar" }));
  for (const forbidden of [
    "partnerType", "relationship", "distributionChannels", "distributionExpectations",
    "servicePricingBasis", "serviceCapability", "serviceScope", "serviceCoverage",
  ]) {
    assert.ok(!labels.includes(forbidden), `the product review printed a ${forbidden} row`);
  }
});

test("the product quantity fix is preserved: a basis with no figure is a stated answer", () => {
  const onRequest = at("products", "offer_product", { product: "Gas oil", quantityMode: "on_request" });
  assert.ok(!openGaps(onRequest).includes("quantity"), "a stated basis was still asked for");
  assert.ok(!blockers(onRequest).some((b) => b.key === "quantity"));
  // And nothing is defaulted: an untouched draft holds no figure at all.
  const fresh = at("products", "offer_product");
  assert.equal(fresh.quantity, null);
  assert.equal(fresh.quantityMode, null);
});

// ---------------------------------------------------------------------------
// Cross-family stale state
// ---------------------------------------------------------------------------

test("a product draft that becomes a service loses its quantity and Incoterm", () => {
  const asProduct = at("products", "offer_product", {
    product: "Refined sugar",
    hsCode: "170199",
    quantityMode: "exact",
    quantity: 25000,
    unit: "MT",
    incoterm: "CIF",
    origin: "Brazil",
    payment: "Irrevocable LC at sight",
  });
  const asService: StructureDraft = {
    ...asProduct,
    canonical: { family: "services", intent: "offer_trade_service" },
    serviceCategory: "freight",
    serviceSubcategories: ["freight.forwarding"],
  };

  const wrong = crossFamilyClassification(asService);
  for (const field of ["quantity", "unit", "incoterm", "hsCode", "origin", "payment"]) {
    assert.ok(wrong.includes(field), `${field} was not detected as a foreign field`);
  }

  const cleaned = clearForeignClassification(asService);
  assert.equal(cleaned.quantity, null);
  assert.equal(cleaned.quantityMode, null);
  assert.equal(cleaned.unit, null);
  assert.equal(cleaned.incoterm, null);
  assert.equal(cleaned.hsCode, null);
  assert.equal(cleaned.origin, null);
  assert.equal(cleaned.payment, null);
  // The service's own classification survives.
  assert.equal(cleaned.serviceCategory, "freight");

  // And none of it reaches the payload or the record's own text.
  const payload = toSubmitPayload(asService, OPTS);
  for (const column of PRODUCT_ONLY_COLUMNS) {
    assert.ok(
      payload[column] === undefined || payload[column] === null,
      `${column} survived into a service payload as ${JSON.stringify(payload[column])}`,
    );
  }
  const details = synthesiseDetails(asService);
  assert.ok(!/Incoterm/.test(details), "an Incoterm was written into a service record's own text");
  assert.ok(!/Quantity/.test(details), "a quantity was written into a service record's own text");
});

test("a service draft that becomes distribution loses its service terms", () => {
  const asService = at("services", "offer_trade_service", {
    serviceCategory: "freight",
    serviceSubcategories: ["freight.forwarding"],
    serviceTerms: {
      scope: "International sea and road freight forwarding",
      engagement: "ongoing",
      coverageCountries: ["ES", "FR", "IT"],
      tradeLanes: null,
      specialisationKeys: ["sea", "road"],
      capability: "Up to 40 containers per month",
      pricingBasis: "per_shipment",
      availability: "immediate",
    },
  });
  const asDistribution: StructureDraft = {
    ...asService,
    canonical: { family: "distribution", intent: "seek_distribution_partner" },
    distributionPartnerType: "distributor",
  };

  const cleaned = clearForeignClassification(asDistribution);
  assert.equal(cleaned.serviceCategory, null);
  assert.deepEqual(cleaned.serviceSubcategories, []);
  assert.equal(cleaned.serviceTerms.scope, null);
  assert.deepEqual(cleaned.serviceTerms.specialisationKeys, []);
  assert.equal(cleaned.serviceTerms.capability, null);

  const payload = toSubmitPayload(asDistribution, OPTS);
  assert.equal(payload.service_terms, undefined, "service terms survived onto a distribution payload");
  assert.equal(payload.service_category_key, null);
});

test("a distribution draft that becomes a product loses its partner and relationship", () => {
  const asDistribution = at("distribution", "seek_distribution_partner", {
    distributionPartnerType: "distributor",
    distributionRelationshipTerms: ["exclusive"],
    coverageScope: "country",
    territoryCodes: ["ES"],
    distributionTerms: {
      objective: "Find an exclusive national distributor",
      productScope: "Premium Italian food products",
      channelKeys: ["retail", "horeca"],
      capabilityKeys: ["warehousing", "sales_team"],
      commercialExpectations: "Exclusive, subject to performance targets",
      timing: "within_quarter",
    },
  });
  const asProduct: StructureDraft = {
    ...asDistribution,
    canonical: { family: "products", intent: "offer_product" },
    product: "Refined sugar",
  };

  const cleaned = clearForeignClassification(asProduct);
  assert.equal(cleaned.distributionPartnerType, null);
  assert.deepEqual(cleaned.distributionRelationshipTerms, []);
  assert.equal(cleaned.coverageScope, null);
  assert.deepEqual(cleaned.territoryCodes, []);
  assert.equal(cleaned.distributionTerms.objective, null);
  assert.deepEqual(cleaned.distributionTerms.channelKeys, []);

  const payload = toSubmitPayload(asProduct, OPTS);
  assert.equal(payload.distribution_terms, undefined);
  assert.equal(payload.distribution_partner_type_key, null);
});

test("a specialisation its category does not offer is dropped, not stored", () => {
  const customs = at("services", "offer_trade_service", {
    serviceCategory: "customs",
    serviceSubcategories: ["customs.brokerage"],
    // Transport modes, left behind by a member who started on freight.
    serviceTerms: { ...emptyDraft().serviceTerms, specialisationKeys: ["sea", "road", "import"] },
  });
  const cleaned = clearForeignClassification(customs);
  assert.deepEqual(cleaned.serviceTerms.specialisationKeys, ["import"]);
});

// ---------------------------------------------------------------------------
// The submit payload, and what the API will accept
// ---------------------------------------------------------------------------

test("each family's payload carries its own terms and no other family's", () => {
  const service = toSubmitPayload(
    at("services", "offer_trade_service", {
      serviceCategory: "freight",
      serviceSubcategories: ["freight.forwarding"],
      serviceTerms: { ...emptyDraft().serviceTerms, scope: "Sea and road forwarding", pricingBasis: "per_shipment" },
    }),
    OPTS,
  );
  assert.ok(service.service_terms, "a service payload carried no service terms");
  assert.equal(service.distribution_terms, undefined);
  for (const column of PRODUCT_ONLY_COLUMNS) {
    assert.ok(service[column] === undefined || service[column] === null, `${column} on a service payload`);
  }

  const distribution = toSubmitPayload(
    at("distribution", "seek_distribution_partner", {
      distributionPartnerType: "distributor",
      distributionTerms: { ...emptyDraft().distributionTerms, objective: "Find a national distributor" },
    }),
    OPTS,
  );
  assert.ok(distribution.distribution_terms, "a distribution payload carried no distribution terms");
  assert.equal(distribution.service_terms, undefined);

  const product = toSubmitPayload(
    at("products", "offer_product", { product: "Refined sugar", quantityMode: "exact", quantity: 25000, unit: "MT", incoterm: "FOB" }),
    OPTS,
  );
  assert.equal(product.quantity, 25000);
  assert.equal(product.incoterm, "FOB");
  assert.equal(product.service_terms, undefined);
  assert.equal(product.distribution_terms, undefined);
});

test("the API refuses a product-only field on a non-product record", () => {
  for (const family of ["services", "distribution"]) {
    for (const [field, value] of [["incoterm", "FOB"], ["quantity", 25000], ["hs_code", "170199"], ["unit", "MT"]] as const) {
      const result = readClassification({ market_family: family, [field]: value });
      assert.equal(result.ok, false, `${family} accepted a ${field}`);
      if (!result.ok) assert.equal(result.field, field);
    }
  }
});

test("the API refuses one family's terms on another family's record", () => {
  const service = readClassification({ market_family: "distribution", service_terms: { scope: "x" } });
  assert.equal(service.ok, false);
  const distribution = readClassification({ market_family: "services", distribution_terms: { objective: "x" } });
  assert.equal(distribution.ok, false);
});

test("the API refuses a specialisation the chosen category does not offer", () => {
  const wrong = readClassification({
    market_family: "services",
    service_category_key: "customs",
    service_subcategory_keys: ["customs.brokerage"],
    service_terms: { specialisation_keys: ["sea"] },
  });
  assert.equal(wrong.ok, false, "a transport mode was accepted on a customs record");

  const right = readClassification({
    market_family: "services",
    service_category_key: "freight",
    service_subcategory_keys: ["freight.forwarding"],
    service_terms: { specialisation_keys: ["sea", "road"], pricing_basis: "per_shipment" },
  });
  assert.equal(right.ok, true);
  if (right.ok) {
    assert.deepEqual(right.columns.service_terms?.specialisation_keys, ["sea", "road"]);
  }
});

test("a product payload is still accepted exactly as it was", () => {
  const result = readClassification({
    market_family: "products",
    market_intent: "offer_product",
    product_sector_key: "food",
    hs_code: "170199",
    quantity: 25000,
    incoterm: "FOB",
  });
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.columns.product_sector_key, "food");
});

console.log(`structure/procedures: ${passed} passed`);
