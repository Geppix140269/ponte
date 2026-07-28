// The classification a record may be stored with.
//
// Run: npx tsx lib/listings/__tests__/classification.test.ts
//
// Requirements 9 and 10 are the reason this file exists: a Trade Service
// category must not be storable under Distribution, and a Distribution type
// must not be storable under Trade Services. Both journeys share one draft
// object and one submit route, so this is easy to get wrong by accident, and a
// mis-filed key is worse than a missing one because every filter, count and
// match downstream trusts it.

import assert from "node:assert/strict";
import test from "node:test";

import { readClassification, isMissingColumnError } from "../classification";
import {
  emptyDraft,
  toSubmitPayload,
  crossFamilyClassification,
  clearForeignClassification,
  subjectFor,
  type StructureDraft,
} from "../../structure/draft";

const NOW = "2026-07-28T09:00:00.000Z";

function draft(over: Partial<StructureDraft>): StructureDraft {
  return { ...emptyDraft(), ...over };
}

function services(over: Partial<StructureDraft> = {}): StructureDraft {
  return draft({
    canonical: { family: "services", intent: "seek_trade_service" },
    serviceCategory: "freight",
    serviceSubcategories: ["freight.ocean"],
    ...over,
  });
}

function distribution(over: Partial<StructureDraft> = {}): StructureDraft {
  return draft({
    canonical: { family: "distribution", intent: "seek_distribution_partner" },
    distributionPartnerType: "distributor",
    ...over,
  });
}

// ---------------------------------------------------------------------------
// 9 and 10. A category cannot cross a family boundary
// ---------------------------------------------------------------------------

test("a trade service category cannot be stored on a distribution record", () => {
  const result = readClassification({
    market_family: "distribution",
    market_intent: "seek_distribution_partner",
    service_category_key: "freight",
  });
  assert.equal(result.ok, false);
  assert.equal(result.ok === false && result.field, "service_category_key");
});

test("a distribution partner type cannot be stored on a services record", () => {
  const result = readClassification({
    market_family: "services",
    market_intent: "seek_trade_service",
    distribution_partner_type_key: "distributor",
  });
  assert.equal(result.ok, false);
  assert.equal(result.ok === false && result.field, "distribution_partner_type_key");
});

test("neither can be stored on a products record", () => {
  for (const key of ["service_category_key", "distribution_partner_type_key"]) {
    const result = readClassification({
      market_family: "products",
      market_intent: "source_product",
      [key]: key === "service_category_key" ? "freight" : "distributor",
    });
    assert.equal(result.ok, false, `${key} was accepted on a products record`);
  }
});

test("a relationship term or coverage scope is refused outside distribution too", () => {
  const relationship = readClassification({
    market_family: "services",
    distribution_relationship_terms: ["exclusive"],
  });
  assert.equal(relationship.ok, false);
  const coverage = readClassification({
    market_family: "services",
    coverage_scope_key: "worldwide",
  });
  assert.equal(coverage.ok, false);
});

test("the draft refuses to send a foreign classification at all", () => {
  // The same rule, one layer earlier. A back-navigation between families would
  // otherwise leave the previous family's answer attached to the new record.
  const contaminated = distribution({ serviceCategory: "freight", serviceSubcategories: ["freight.ocean"] });
  assert.deepEqual(crossFamilyClassification(contaminated), [
    "serviceCategory",
    "serviceSubcategories",
  ]);

  const cleaned = clearForeignClassification(contaminated);
  assert.equal(cleaned.serviceCategory, null);
  assert.deepEqual(cleaned.serviceSubcategories, []);
  assert.equal(cleaned.distributionPartnerType, "distributor");

  const payload = toSubmitPayload(contaminated, { draft: false, nowIso: NOW });
  assert.equal(payload.service_category_key, null);
  assert.equal(payload.distribution_partner_type_key, "distributor");
});

test("a services record cannot carry an HS code", () => {
  // A trade service has no HS classification, and pushing one onto it puts a
  // false classification on a real record.
  const withCode = services({ hsCode: "100590" });
  assert.ok(crossFamilyClassification(withCode).indexOf("hsCode") >= 0);
  assert.equal(clearForeignClassification(withCode).hsCode, null);
});

// ---------------------------------------------------------------------------
// Every key names something real
// ---------------------------------------------------------------------------

test("an invented key is refused, not stored", () => {
  const bad = readClassification({ market_family: "services", service_category_key: "banana" });
  assert.equal(bad.ok, false);
});

test("a subcategory from another category is refused", () => {
  const bad = readClassification({
    market_family: "services",
    service_category_key: "customs",
    service_subcategory_keys: ["freight.ocean"],
  });
  assert.equal(bad.ok, false);
  assert.equal(bad.ok === false && bad.field, "service_subcategory_keys");
});

test("a subcategory with no category at all is refused", () => {
  const bad = readClassification({
    market_family: "services",
    service_subcategory_keys: ["freight.ocean"],
  });
  assert.equal(bad.ok, false);
});

test("an intent that does not belong to its family is refused", () => {
  const bad = readClassification({
    market_family: "services",
    market_intent: "source_product",
  });
  assert.equal(bad.ok, false);
  assert.equal(bad.ok === false && bad.field, "market_intent");
});

test("a valid services classification is accepted whole", () => {
  const good = readClassification({
    market_family: "services",
    market_intent: "offer_trade_service",
    service_category_key: "freight",
    service_subcategory_keys: ["freight.ocean", "freight.forwarding"],
  });
  assert.equal(good.ok, true);
  if (!good.ok) return;
  assert.equal(good.columns.service_category_key, "freight");
  assert.deepEqual(good.columns.service_subcategory_keys, ["freight.ocean", "freight.forwarding"]);
  assert.equal(good.columns.distribution_partner_type_key, null);
});

// ---------------------------------------------------------------------------
// Custom wording never replaces a key
// ---------------------------------------------------------------------------

test("choosing Other keeps the canonical key and stores the wording apart", () => {
  const result = readClassification({
    market_family: "services",
    service_category_key: "unlisted",
    custom_category_label: "Livestock transport coordination",
  });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.columns.service_category_key, "unlisted");
  assert.equal(result.columns.custom_category_label, "Livestock transport coordination");
});

test("the record still names itself from the tiles, with nothing typed", () => {
  assert.equal(subjectFor(services()), "Ocean freight");
  assert.equal(
    subjectFor(distribution({ productSector: "food" })),
    "Distributor, Food, beverages & tobacco",
  );
});

// ---------------------------------------------------------------------------
// Territories
// ---------------------------------------------------------------------------

test("territory codes are kept only where the scope can hold them", () => {
  const named = readClassification({
    market_family: "distribution",
    distribution_partner_type_key: "distributor",
    coverage_scope_key: "countries",
    territory_codes: ["IT", "ES", "not-a-code"],
  });
  assert.equal(named.ok, true);
  assert.deepEqual(named.ok && named.columns.territory_codes, ["IT", "ES"]);

  // Worldwide has no territories to name. They are dropped rather than
  // refused: the member changed their mind, they did not submit something bad.
  const worldwide = readClassification({
    market_family: "distribution",
    distribution_partner_type_key: "distributor",
    coverage_scope_key: "worldwide",
    territory_codes: ["IT"],
  });
  assert.equal(worldwide.ok, true);
  assert.equal(worldwide.ok && worldwide.columns.territory_codes, null);
});

test("a duplicated territory is stored once", () => {
  const result = readClassification({
    market_family: "distribution",
    coverage_scope_key: "countries",
    territory_codes: ["IT", "IT", "ES"],
  });
  assert.deepEqual(result.ok && result.columns.territory_codes, ["IT", "ES"]);
});

// ---------------------------------------------------------------------------
// 15. Existing records stay readable
// ---------------------------------------------------------------------------

test("a payload carrying no classification at all is still valid", () => {
  // Every existing record, and every record submitted through a path that has
  // not been migrated, has none of these fields. That must remain storable.
  const result = readClassification({ type: "offer", product: "Maize" });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  for (const value of Object.values(result.columns)) assert.equal(value, null);
});

test("a legacy product draft still submits exactly as it did", () => {
  const legacy = draft({ intent: "offer", product: "Maize (corn)", hsCode: "100590" });
  const payload = toSubmitPayload(legacy, { draft: false, nowIso: NOW });
  assert.equal(payload.type, "offer");
  assert.equal(payload.product, "Maize (corn)");
  assert.equal(payload.hs_code, "100590");
  assert.equal(payload.market_family, null);
});

// ---------------------------------------------------------------------------
// The window before the migration is applied
// ---------------------------------------------------------------------------

test("a missing column is recognised however the driver reports it", () => {
  // A merge applies no migration in this repository, so between this code
  // shipping and the SQL being run by hand the columns are absent. A member
  // must not lose a correctly classified submission to that gap.
  assert.equal(isMissingColumnError({ code: "PGRST204" }), true);
  assert.equal(isMissingColumnError({ code: "42703" }), true);
  assert.equal(
    isMissingColumnError({
      message: "Could not find the 'service_category_key' column of 'listings' in the schema cache",
    }),
    true,
  );
  // And an ordinary failure is not mistaken for one, which would hide a real
  // error behind a silent retry.
  assert.equal(isMissingColumnError({ code: "23505", message: "duplicate key" }), false);
  assert.equal(isMissingColumnError(null), false);
  assert.equal(isMissingColumnError("boom"), false);
});

test("the classification reaches the record in words as well as in keys", () => {
  // This is what survives the window above: the details text names the
  // category the member chose even where the column for it does not exist yet.
  const payload = toSubmitPayload(services(), { draft: false, nowIso: NOW });
  const details = String(payload.details);
  assert.ok(details.indexOf("Freight and logistics") >= 0, details);
  assert.ok(details.indexOf("Ocean freight") >= 0, details);
});
