// The two downstream journeys the requirement names, end to end, plus the
// guarantee that every screen they reach has copy to render.
//
// Run: npx tsx lib/structure/__tests__/downstream-journeys.test.ts
//
// The freight-forwarding and distribution walks below are the requirement's own
// worked examples. They are asserted on the REVIEW MODEL and the SUBMIT PAYLOAD
// rather than on rendered markup, because that is where the guarantee has to
// hold: a row absent from the model cannot be rendered, whereas a row hidden in
// a component is still asked, still blocking and still stored.
//
// The message-key sweep at the end exists because the failure mode of a
// family-specific copy layer is not a crash. It is a live screen printing
// "structure.ask.serviceCapability" at a member, which no type checker and no
// logic test would catch.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  emptyDraft,
  openGaps,
  blockers,
  bucketize,
  synthesiseDetails,
  toSubmitPayload,
  procedureFor,
  askKeyFor,
  legacyTypeForIntent,
  type StructureDraft,
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

function at(family: MarketFamily, intent: MarketIntent, over: Partial<StructureDraft> = {}): StructureDraft {
  return { ...emptyDraft(), canonical: { family, intent }, intent: legacyTypeForIntent(intent), ...over };
}

/** Every row on the review, by label key, with the value it prints. */
function rows(draft: StructureDraft): Record<string, string | null> {
  const model = procedureFor(draft).reviewModel(draft);
  const out: Record<string, string | null> = {};
  for (const section of [...model.publicSections, ...model.privateSections]) {
    for (const row of section.rows) out[row.labelKey] = row.value;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Offer a trade service -> freight forwarding
// ---------------------------------------------------------------------------

/**
 * The requirement's worked example:
 *   Offer Trade Service -> Freight forwarding -> Sea and road -> Spain, France
 *   and Italy -> Food and temperature-controlled cargo -> 40 containers per
 *   month -> Quotation per shipment -> Available immediately.
 */
const FREIGHT: StructureDraft = at("services", "offer_trade_service", {
  serviceCategory: "freight",
  serviceSubcategories: ["freight.forwarding"],
  serviceTerms: {
    scope: "International sea and road freight forwarding",
    engagement: "ongoing",
    coverageCountries: ["ES", "FR", "IT"],
    tradeLanes: "Barcelona to Northern Europe",
    specialisationKeys: ["sea", "road", "temperature_controlled", "perishable"],
    capability: "Up to 40 containers per month",
    pricingBasis: "per_shipment",
    availability: "immediate",
  },
  validity: "standing",
  role: "Freight forwarder",
});

test("the freight-forwarding journey has nothing left to ask but the optional note", () => {
  assert.deepEqual(openGaps(FREIGHT), ["note"]);
});

test("the freight-forwarding review states the service, not a shipment", () => {
  const r = rows(FREIGHT);
  assert.equal(r.service, "Freight forwarding");
  assert.equal(r.serviceScope, "International sea and road freight forwarding");
  assert.equal(r.serviceCoverage, "Spain, France, Italy · Barcelona to Northern Europe");
  assert.equal(r.serviceSpecialisation, "Sea, Road, Temperature controlled, Perishable and food");
  assert.equal(r.serviceCapability, "Up to 40 containers per month");
  assert.equal(r.servicePricingBasis, "Per shipment");
  assert.equal(r.serviceAvailability, "Available immediately");
  assert.equal(r.serviceEngagement, "Ongoing arrangement");
});

test("the freight-forwarding review has no quantity, unit, Incoterm, HS code or route", () => {
  const printed = Object.keys(rows(FREIGHT));
  for (const forbidden of ["quantity", "unit", "incoterm", "hsCode", "route", "frequency", "origin", "destination"]) {
    assert.ok(!printed.includes(forbidden), `the review printed a ${forbidden} row`);
  }
});

test("the completed freight-forwarding record blocks only on the universal conditions", () => {
  // The declaration and the business verification are publication-gate
  // conditions applying to every family, not facts about the service. What
  // matters here is that no service record is ever blocked on a product fact.
  const keys = blockers(FREIGHT).map((b) => b.key);
  assert.deepEqual(keys, ["declaration", "businessVerification"]);
  assert.equal(procedureFor(FREIGHT).submissionReadiness(FREIGHT).ready, true);
});

test("accepting the declaration leaves freight forwarding on verification alone", () => {
  const declared: StructureDraft = { ...FREIGHT, declarationAccepted: true };
  assert.deepEqual(blockers(declared).map((b) => b.key), ["businessVerification"]);
});

test("the freight-forwarding capacity is stored as a capability, never as a quantity", () => {
  const payload = toSubmitPayload(FREIGHT, OPTS);
  assert.equal(payload.quantity, undefined);
  assert.equal(payload.quantity_mode, undefined);
  assert.equal(payload.unit, undefined);
  assert.equal(payload.incoterm, undefined);
  assert.equal(payload.hs_code, undefined);

  const terms = payload.service_terms as Record<string, unknown>;
  assert.equal(terms.capability, "Up to 40 containers per month");
  assert.equal(terms.pricing_basis, "per_shipment");
  assert.deepEqual(terms.coverage_countries, ["ES", "FR", "IT"]);
  assert.deepEqual(terms.specialisation_keys, ["sea", "road", "temperature_controlled", "perishable"]);

  // And the record's own text says it in words, so the fact survives the window
  // before the storage column exists.
  const details = payload.details as string;
  assert.match(details, /Service capability: Up to 40 containers per month\./);
  assert.match(details, /Engagement basis: Per shipment\./);
  assert.ok(!/Quantity/.test(details), "a quantity clause reached a service record");
  assert.ok(!/Incoterm/.test(details), "an Incoterm clause reached a service record");
});

test("the API accepts the freight-forwarding payload exactly as the composer builds it", () => {
  const result = readClassification(toSubmitPayload(FREIGHT, OPTS));
  assert.equal(result.ok, true, result.ok ? "" : `refused: ${result.error} (${result.field})`);
  if (result.ok) {
    assert.equal(result.columns.market_family, "services");
    assert.equal(result.columns.service_category_key, "freight");
    assert.equal(result.columns.service_terms?.capability, "Up to 40 containers per month");
    assert.equal(result.columns.distribution_terms, null);
  }
});

// ---------------------------------------------------------------------------
// Seek a distribution partner
// ---------------------------------------------------------------------------

/**
 * The requirement's second worked example:
 *   Seek Distribution Partner -> Premium food products -> Spain -> Importer and
 *   national distributor -> Retail, horeca and specialist stores -> Exclusive
 *   subject to performance targets -> Warehousing and local sales team.
 */
const DISTRIBUTION: StructureDraft = at("distribution", "seek_distribution_partner", {
  distributionPartnerType: "importer",
  distributionRelationshipTerms: ["exclusive"],
  coverageScope: "country",
  territoryCodes: ["ES"],
  productSector: "food",
  distributionTerms: {
    objective: "Find an exclusive national distributor",
    productScope: "Premium Italian food products",
    channelKeys: ["retail", "horeca", "specialist"],
    capabilityKeys: ["warehousing", "sales_team", "marketing", "import_licence"],
    commercialExpectations: "Exclusive, subject to performance targets",
    timing: "within_quarter",
  },
  validity: 90,
  role: "Producer / manufacturer",
});

test("the distribution journey has nothing left to ask but the optional note", () => {
  assert.deepEqual(openGaps(DISTRIBUTION), ["note"]);
});

test("the distribution review states the opportunity, not a sale", () => {
  const r = rows(DISTRIBUTION);
  assert.equal(r.distributionObjective, "Find an exclusive national distributor");
  assert.equal(r.distributionProductScope, "Premium Italian food products (Food, beverages & tobacco)");
  assert.equal(r.distributionTerritory, "One country (Spain)");
  assert.equal(r.partnerType, "Importer or importer of record");
  assert.equal(r.relationship, "Exclusive");
  assert.equal(r.distributionChannels, "Retail, Hotels, restaurants and catering, Specialist stores");
  assert.equal(r.distributionExpectations, "Exclusive, subject to performance targets");
  assert.equal(r.distributionTiming, "Within three months");
});

test("the distribution review has no shipment quantity, Incoterm, unit or HS code", () => {
  const printed = Object.keys(rows(DISTRIBUTION));
  for (const forbidden of ["quantity", "unit", "incoterm", "hsCode", "route", "frequency"]) {
    assert.ok(!printed.includes(forbidden), `the review printed a ${forbidden} row`);
  }
});

test("the completed distribution record blocks only on the universal conditions", () => {
  assert.deepEqual(blockers(DISTRIBUTION).map((b) => b.key), ["declaration", "businessVerification"]);
});

test("accepting the declaration leaves distribution on verification alone", () => {
  const declared: StructureDraft = { ...DISTRIBUTION, declarationAccepted: true };
  assert.deepEqual(blockers(declared).map((b) => b.key), ["businessVerification"]);
});

test("an opening-order expectation is a relationship term, never a shipped quantity", () => {
  const withOpeningOrder: StructureDraft = {
    ...DISTRIBUTION,
    distributionTerms: {
      ...DISTRIBUTION.distributionTerms,
      commercialExpectations: "Opening order of 2 pallets, annual target 40,000 units",
    },
  };
  const payload = toSubmitPayload(withOpeningOrder, OPTS);
  assert.equal(payload.quantity, undefined, "an opening order became a shipped quantity");
  assert.equal(payload.unit, undefined);
  const terms = payload.distribution_terms as Record<string, unknown>;
  assert.equal(terms.commercial_expectations, "Opening order of 2 pallets, annual target 40,000 units");
  assert.match(
    payload.details as string,
    /Commercial expectations: Opening order of 2 pallets, annual target 40,000 units\./,
  );
});

test("the API accepts the distribution payload exactly as the composer builds it", () => {
  const result = readClassification(toSubmitPayload(DISTRIBUTION, OPTS));
  assert.equal(result.ok, true, result.ok ? "" : `refused: ${result.error} (${result.field})`);
  if (result.ok) {
    assert.equal(result.columns.market_family, "distribution");
    assert.equal(result.columns.distribution_partner_type_key, "importer");
    assert.deepEqual(result.columns.territory_codes, ["ES"]);
    assert.deepEqual(result.columns.distribution_terms?.channel_keys, ["retail", "horeca", "specialist"]);
    assert.equal(result.columns.service_terms, null);
  }
});

test("capability reads as required of the partner when sought, and offered when offered", () => {
  assert.match(synthesiseDetails(DISTRIBUTION), /Capabilities expected of the partner:/);
  const offering: StructureDraft = {
    ...DISTRIBUTION,
    canonical: { family: "distribution", intent: "offer_distribution_or_representation" },
  };
  assert.match(synthesiseDetails(offering), /Capabilities offered:/);
});

// ---------------------------------------------------------------------------
// Every screen every family can reach has copy to render
// ---------------------------------------------------------------------------

const MESSAGES = JSON.parse(readFileSync("messages/en.json", "utf8")) as {
  structure: Record<string, Record<string, unknown>>;
};

function exists(key: string): boolean {
  const parts = key.split(".");
  let node: unknown = MESSAGES.structure;
  for (const part of parts) {
    if (!node || typeof node !== "object") return false;
    node = (node as Record<string, unknown>)[part];
  }
  return typeof node === "string";
}

test("every question every family asks has copy", () => {
  const missing: string[] = [];
  for (const entry of MARKET_INTENTS) {
    const draft = at(entry.family as MarketFamily, entry.key as MarketIntent, {
      // A category with conditioned dimensions, so the specialisation question
      // is reached rather than filtered out of the sweep.
      serviceCategory: entry.family === "services" ? "freight" : null,
    });
    for (const field of procedureFor(draft).completionFields(draft)) {
      const key = askKeyFor(field, draft);
      if (!exists(key)) missing.push(`${entry.key}: ${key}`);
    }
  }
  assert.deepEqual(missing, [], `questions with no copy:\n  ${missing.join("\n  ")}`);
});

test("every review row, heading and title every family prints has copy", () => {
  const missing: string[] = [];
  for (const entry of MARKET_INTENTS) {
    const draft = at(entry.family as MarketFamily, entry.key as MarketIntent, {
      serviceCategory: entry.family === "services" ? "freight" : null,
      serviceTerms: entry.family === "services"
        ? { ...emptyDraft().serviceTerms, engagement: "ongoing" }
        : emptyDraft().serviceTerms,
    });
    const model = procedureFor(draft).reviewModel(draft);
    if (!exists(`review.${model.titleKey}`)) missing.push(`${entry.key}: review.${model.titleKey}`);
    for (const section of [...model.publicSections, ...model.privateSections]) {
      if (section.headingKey && !exists(`review.${section.headingKey}`)) {
        missing.push(`${entry.key}: review.${section.headingKey}`);
      }
      for (const row of section.rows) {
        if (!exists(`field.${row.labelKey}`)) missing.push(`${entry.key}: field.${row.labelKey}`);
      }
    }
  }
  assert.deepEqual(missing, [], `review rows with no copy:\n  ${missing.join("\n  ")}`);
});

test("every blocker and every fact bucket every family reports has copy", () => {
  const missing: string[] = [];
  for (const entry of MARKET_INTENTS) {
    const draft = at(entry.family as MarketFamily, entry.key as MarketIntent);
    for (const blocker of blockers(draft)) {
      if (!exists(`blocker.${blocker.key}`)) missing.push(`${entry.key}: blocker.${blocker.key}`);
      if (!exists(`blocker.${blocker.key}Desc`)) missing.push(`${entry.key}: blocker.${blocker.key}Desc`);
    }
    const buckets = bucketize(draft);
    for (const key of [...buckets.commercial, ...buckets.missing]) {
      if (!exists(`field.${key}`)) missing.push(`${entry.key}: field.${key}`);
    }
    for (const key of buckets.evidence) {
      if (!exists(`evidence.${key}`)) missing.push(`${entry.key}: evidence.${key}`);
    }
    for (const key of buckets.keptPrivate) {
      if (!exists(`private.${key}`)) missing.push(`${entry.key}: private.${key}`);
    }
  }
  assert.deepEqual(missing, [], `blockers or facts with no copy:\n  ${missing.join("\n  ")}`);
});

console.log(`structure/downstream-journeys: ${passed} passed`);
