// The completion binder, against ADR-0016's decisions.
//
// Run: npx tsx lib/structure/__tests__/completion.test.ts
//
// Pinned here:
//   * the step table for every family/intent sums to exactly 100 and is not an
//     equal ladder, so `assertWeights` (and therefore `progressValue`) accepts it;
//   * `note` (enrichment) is never a completion step, and filling it never moves
//     the percentage — 100 is reachable on required facts alone (interpretation A);
//   * the value is null before the first required field, rises as applicable
//     fields fill, and only reaches 100 when every applicable required field is in;
//   * the route end this member does not decide is never counted.

import assert from "node:assert/strict";
import { emptyDraft, procedureFor, type StructureDraft, type CompletionField } from "../draft";
import {
  completionSteps,
  completionDone,
  completionValue,
  requiredFields,
  recordStrength,
  ENRICHMENT_FIELDS,
} from "../completion";
import { assertWeights } from "@/lib/ponte/progress";
import type { MarketFamily, MarketIntent } from "@/lib/taxonomy/market";

let passed = 0;
function test(name: string, fn: () => void): void {
  try {
    fn();
    passed += 1;
  } catch (err) {
    console.error(`FAIL  ${name}`);
    console.error(`      ${(err as Error).message}`);
    process.exitCode = 1;
  }
}

/** A draft in a given family/intent, with the legacy intent set for Products. */
function draftFor(family: MarketFamily, intent: MarketIntent, legacy?: StructureDraft["intent"]): StructureDraft {
  const d = emptyDraft();
  d.canonical = { family, intent };
  if (legacy) d.intent = legacy;
  d.product = "Ordinary Portland cement 42.5";
  return d;
}

const CASES: { name: string; draft: StructureDraft }[] = [
  { name: "products/source", draft: draftFor("products", "source_product", "requirement") },
  { name: "products/offer", draft: draftFor("products", "offer_product", "offer") },
  { name: "services/offer", draft: draftFor("services", "offer_trade_service", "service") },
  { name: "services/seek", draft: draftFor("services", "seek_trade_service", "service") },
  { name: "distribution/seek-partner", draft: draftFor("distribution", "seek_distribution_partner", "requirement") },
  { name: "distribution/offer-coverage", draft: draftFor("distribution", "offer_distribution_or_representation", "offer") },
];

// ---- the step table is always a valid, irregular, sum-100 procedure ----------

for (const { name, draft } of CASES) {
  test(`${name}: step table sums to 100 and assertWeights accepts it`, () => {
    const steps = completionSteps(draft);
    assert.ok(steps.length > 0, "no completion steps produced");
    const total = steps.reduce((s, step) => s + step.weight, 0);
    assert.equal(total, 100, `weights sum to ${total}, not 100`);
    assert.doesNotThrow(() => assertWeights(steps), "assertWeights rejected the table");
    // Every weight is a positive integer.
    for (const s of steps) {
      assert.ok(Number.isInteger(s.weight) && s.weight > 0, `weight ${s.weight} for ${s.id} is not a positive integer`);
    }
  });
}

// ---- note is enrichment, never a step, never moves the percentage ------------

test("note is never a completion step in any family", () => {
  for (const { name, draft } of CASES) {
    const ids = completionSteps(draft).map((s) => s.id);
    assert.ok(!ids.includes("note" as CompletionField), `${name} counted note as a completion step`);
    assert.ok(!requiredFields(draft).includes("note" as CompletionField), `${name} listed note as required`);
  }
  assert.ok(ENRICHMENT_FIELDS.has("note" as CompletionField), "note is not marked enrichment");
});

// ---- value is null before the first required act -----------------------------

test("value is null on a fresh draft (neutral, no zero)", () => {
  for (const { name, draft } of CASES) {
    assert.equal(completionValue(draft), null, `${name} showed a percentage before any required field`);
  }
});

// ---- fill the required fields; value rises and only reaches 100 when complete -

/** Fill one required field with a plausible value, so isFilled returns true. */
function fill(draft: StructureDraft, field: CompletionField): void {
  switch (field) {
    case "quantity":
      draft.quantityMode = "exact";
      draft.quantity = 10000;
      draft.unit = "MT";
      break;
    case "origin": draft.origin = "Turkey"; break;
    case "destination": draft.destination = "India"; break;
    case "incoterm": draft.incoterm = "CIF"; break;
    case "payment": draft.payment = "LC at sight"; break;
    case "validity": draft.validity = 30; break;
    case "role": draft.role = "Principal"; break;
    case "serviceScope": draft.serviceTerms.scope = "Full container clearance"; break;
    case "serviceEngagement": draft.serviceTerms.engagement = "per_shipment"; break;
    case "serviceCoverage": draft.serviceTerms.coverageCountries = ["TR"]; break;
    case "serviceSpecialisation": draft.serviceTerms.specialisationKeys = ["sea"]; break;
    case "serviceCapability": draft.serviceTerms.capability = "Up to 40 TEU/month"; break;
    case "servicePricingBasis": draft.serviceTerms.pricingBasis = "per_unit"; break;
    case "serviceAvailability": draft.serviceTerms.availability = "immediate"; break;
    case "distributionObjective": draft.distributionTerms.objective = "Enter the GCC market"; break;
    case "distributionProductScope": draft.distributionTerms.productScope = "Cement and clinker"; break;
    case "distributionChannels": draft.distributionTerms.channelKeys = ["wholesale"]; break;
    case "distributionCapabilities": draft.distributionTerms.capabilityKeys = ["warehousing"]; break;
    case "distributionExpectations": draft.distributionTerms.commercialExpectations = "Exclusive, 2-year"; break;
    case "distributionTiming": draft.distributionTerms.timing = "immediate"; break;
    default: break;
  }
}

for (const { name, draft } of CASES) {
  test(`${name}: value rises with each required field and hits 100 only when complete`, () => {
    const required = requiredFields(draft);
    let previous = -1;
    required.forEach((field, index) => {
      fill(draft, field);
      const filledSoFar = completionDone(draft).length;
      assert.equal(filledSoFar, index + 1, `${name}: ${field} did not register as filled`);
      const value = completionValue(draft);
      assert.notEqual(value, null, `${name}: value went back to null after filling ${field}`);
      if (index + 1 < required.length) {
        assert.ok(value! < 100, `${name}: reached 100 with ${required.length - index - 1} required fields still open`);
        assert.ok(value! > previous, `${name}: value did not increase after ${field} (${previous} -> ${value})`);
      } else {
        assert.equal(value, 100, `${name}: all required fields filled but value is ${value}, not 100`);
      }
      previous = value!;
    });
  });
}

// ---- enrichment does not enter the denominator -------------------------------

test("filling note (enrichment) never changes the completion percentage", () => {
  for (const { name, draft } of CASES) {
    // Fill exactly the required fields, then read the value.
    for (const field of requiredFields(draft)) fill(draft, field);
    const before = completionValue(draft);
    assert.equal(before, 100, `${name}: required fields alone did not reach 100`);
    draft.note = "Some extra colour that is not required.";
    const after = completionValue(draft);
    assert.equal(after, before, `${name}: adding a note moved completion from ${before} to ${after}`);
    // But record-strength notices it.
    const strength = recordStrength(draft);
    assert.ok(strength.filled >= 1, `${name}: record strength did not register the note`);
  }
});

// ---- the un-decided route end is never counted (Products) --------------------

test("Products counts exactly one route end, per intent", () => {
  const source = draftFor("products", "source_product", "requirement");
  const offer = draftFor("products", "offer_product", "offer");
  const sourceIds = completionSteps(source).map((s) => s.id);
  const offerIds = completionSteps(offer).map((s) => s.id);
  assert.ok(sourceIds.includes("destination" as CompletionField) && !sourceIds.includes("origin" as CompletionField),
    "a sourcing requirement should count destination, not origin");
  assert.ok(offerIds.includes("origin" as CompletionField) && !offerIds.includes("destination" as CompletionField),
    "a supply offer should count origin, not destination");
});

console.log(`ok   ${passed} completion binder tests passed`);
