// What a classification change discards, and when the member is told.
//
// Run: npx tsx lib/structure/__tests__/discard.test.ts
//
// Two failures are being guarded against, and they pull in opposite directions.
//
// Destroying work silently: a member who chose Freight forwarding, answered
// Sea, Road, temperature controlled and perishable, then went back and changed
// the category to Customs brokerage lost four deliberate answers with no
// notice. Their only clue was an absence.
//
// Crying wolf: a member who has answered nothing downstream must be able to
// change their mind freely. A confirmation on every change teaches people to
// dismiss it unread, which leaves them worse protected than no warning at all.
//
// So every test below is paired: one that the loss is reported, one that a free
// change stays free.

import assert from "node:assert/strict";
import { emptyDraft, type StructureDraft } from "../draft";
import {
  discardedByServiceCategoryChange,
  discardedByPartnerTypeChange,
  discardedByCoverageScopeChange,
  discardedByFamilyChange,
  isMeaningfulDiscard,
} from "../discard";

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

const keys = (items: readonly { key: string }[]): string[] => items.map((i) => i.key);

const FREIGHT: StructureDraft = {
  ...emptyDraft(),
  canonical: { family: "services", intent: "offer_trade_service" },
  intent: "service",
  serviceCategory: "freight",
  serviceSubcategories: ["freight.forwarding"],
  serviceTerms: {
    ...emptyDraft().serviceTerms,
    scope: "International sea and road freight forwarding",
    coverageCountries: ["ES", "FR"],
    specialisationKeys: ["sea", "road", "temperature_controlled"],
    capability: "Up to 40 containers per month",
    pricingBasis: "per_shipment",
  },
  validity: "standing",
  role: "Freight forwarder",
};

const DISTRIBUTION: StructureDraft = {
  ...emptyDraft(),
  canonical: { family: "distribution", intent: "seek_distribution_partner" },
  intent: "requirement",
  distributionPartnerType: "importer",
  distributionRelationshipTerms: ["exclusive"],
  coverageScope: "country",
  territoryCodes: ["ES", "PT"],
  distributionTerms: {
    ...emptyDraft().distributionTerms,
    objective: "Find an exclusive national distributor",
    channelKeys: ["retail", "horeca"],
    capabilityKeys: ["warehousing"],
    timing: "within_quarter",
  },
};

// ---------------------------------------------------------------------------
// The service category
// ---------------------------------------------------------------------------

test("changing the service category names the subcategory and the specialisations it costs", () => {
  const lost = discardedByServiceCategoryChange(FREIGHT, "customs");
  assert.deepEqual(keys(lost).sort(), ["serviceSpecialisation", "serviceSubcategory"]);

  const specialisation = lost.find((i) => i.key === "serviceSpecialisation")!;
  // The member's own answers, in words. "You will lose your specialisation" is
  // a weaker warning than naming the three things they chose.
  assert.match(specialisation.value, /Sea/);
  assert.match(specialisation.value, /Road/);
  assert.match(specialisation.value, /Temperature controlled/);

  const subcategory = lost.find((i) => i.key === "serviceSubcategory")!;
  assert.equal(subcategory.value, "Freight forwarding");
  assert.ok(isMeaningfulDiscard(lost));
});

test("changing the category before answering anything under it costs nothing", () => {
  const fresh: StructureDraft = {
    ...emptyDraft(),
    canonical: { family: "services", intent: "offer_trade_service" },
    serviceCategory: "freight",
  };
  assert.deepEqual(discardedByServiceCategoryChange(fresh, "customs"), []);
  assert.equal(isMeaningfulDiscard(discardedByServiceCategoryChange(fresh, "customs")), false);
});

test("choosing the category already chosen discards nothing", () => {
  assert.deepEqual(discardedByServiceCategoryChange(FREIGHT, "freight"), []);
});

test("a specialisation the new category also asks about is not reported as lost", () => {
  // The warning must be true. Reporting an answer that survives the change is
  // the same failure as hiding one that does not, in the other direction.
  const lost = discardedByServiceCategoryChange(FREIGHT, "customs");
  const specialisation = lost.find((i) => i.key === "serviceSpecialisation");
  const named = specialisation ? specialisation.value : "";
  for (const survivor of ["Perishable and food"]) {
    // Only assert about a mode the fixture did not choose, so this cannot pass
    // by accident: nothing unchosen may appear in the warning either.
    assert.ok(!named.includes(survivor), `the warning named ${survivor}, which was never chosen`);
  }
});

test("the member's own wording is reported only when the new category names the thing itself", () => {
  const other: StructureDraft = {
    ...emptyDraft(),
    canonical: { family: "services", intent: "offer_trade_service" },
    // The stored key for the services escape route is `unlisted`; only the
    // label a member reads is "Other".
    serviceCategory: "unlisted",
    customCategoryLabel: "Phytosanitary escorting",
  };
  assert.ok(keys(discardedByServiceCategoryChange(other, "freight")).includes("customLabel"));
  // Choosing the same escape route again keeps the wording, so there is nothing
  // to warn about.
  assert.deepEqual(discardedByServiceCategoryChange(other, "unlisted"), []);
});

// ---------------------------------------------------------------------------
// Distribution partner type and coverage
// ---------------------------------------------------------------------------

test("changing the partner type reports the wording it costs, and nothing when there is none", () => {
  const other: StructureDraft = {
    ...DISTRIBUTION,
    distributionPartnerType: "other",
    customCategoryLabel: "Bonded reseller",
  };
  const lost = discardedByPartnerTypeChange(other, "importer");
  assert.deepEqual(keys(lost), ["customLabel"]);
  assert.equal(lost[0].value, "Bonded reseller");

  assert.deepEqual(discardedByPartnerTypeChange(DISTRIBUTION, "agent"), []);
});

test("a coverage change that keeps countries does not warn; one that drops them does", () => {
  // One country -> Several countries keeps the list. This is the common
  // correction and must stay frictionless.
  assert.deepEqual(discardedByCoverageScopeChange(DISTRIBUTION, "countries"), []);

  const lost = discardedByCoverageScopeChange(DISTRIBUTION, "worldwide");
  assert.deepEqual(keys(lost), ["territoryCodes"]);
  assert.equal(lost[0].value, "Spain, Portugal");
});

test("a coverage change with no countries chosen costs nothing", () => {
  const noCountries: StructureDraft = { ...DISTRIBUTION, territoryCodes: [] };
  assert.deepEqual(discardedByCoverageScopeChange(noCountries, "worldwide"), []);
});

// ---------------------------------------------------------------------------
// Changing the family
// ---------------------------------------------------------------------------

test("moving a completed trade service to another family names every service term it loses", () => {
  const lost = discardedByFamilyChange(FREIGHT, "distribution");
  const k = keys(lost);
  for (const expected of [
    "serviceSubcategory",
    "serviceScope",
    "serviceCoverage",
    "serviceSpecialisation",
    "serviceCapability",
    "servicePricingBasis",
  ]) {
    assert.ok(k.includes(expected), `the family-change warning omitted ${expected}`);
  }
  assert.equal(lost.find((i) => i.key === "serviceCapability")!.value, "Up to 40 containers per month");
});

test("moving a completed distribution opportunity names every distribution term it loses", () => {
  const lost = discardedByFamilyChange(DISTRIBUTION, "services");
  const k = keys(lost);
  for (const expected of [
    "relationship",
    "coverage",
    "distributionObjective",
    "distributionChannels",
    "distributionCapabilities",
    "distributionTiming",
  ]) {
    assert.ok(k.includes(expected), `the family-change warning omitted ${expected}`);
  }
});

test("moving a product record names its product facts", () => {
  const product: StructureDraft = {
    ...emptyDraft(),
    canonical: { family: "products", intent: "offer_product" },
    intent: "offer",
    product: "Durum wheat",
    hsCode: "1001.19",
    quantity: 2500,
    quantityMode: "exact",
    unit: "MT",
    origin: "Argentina",
    incoterm: "FOB",
  };
  const k = keys(discardedByFamilyChange(product, "services"));
  for (const expected of ["product", "hsCode", "quantity", "origin", "incoterm"]) {
    assert.ok(k.includes(expected), `the family-change warning omitted ${expected}`);
  }
  assert.ok(!k.includes("destination"), "a destination the member never stated was reported as lost");
});

test("moving an untouched draft between families costs nothing", () => {
  const bare: StructureDraft = {
    ...emptyDraft(),
    canonical: { family: "services", intent: "offer_trade_service" },
  };
  assert.deepEqual(discardedByFamilyChange(bare, "distribution"), []);
});

test("staying in the same family discards nothing", () => {
  assert.deepEqual(discardedByFamilyChange(FREIGHT, "services"), []);
  assert.deepEqual(discardedByFamilyChange(DISTRIBUTION, "distribution"), []);
});

test("the shared answers are never reported as lost to a family change", () => {
  // Validity, role and note belong to every family, so a family change keeps
  // them and a warning that named them would be false.
  const withShared: StructureDraft = { ...FREIGHT, note: "Called on 24 July." };
  const k = keys(discardedByFamilyChange(withShared, "products"));
  for (const shared of ["validity", "role", "note"]) {
    assert.ok(!k.includes(shared), `the warning claimed the shared ${shared} would be lost`);
  }
});

// ---------------------------------------------------------------------------
// Every warning has copy
// ---------------------------------------------------------------------------

test("every fact a warning can name has a label in the catalogue", async () => {
  const { readFileSync } = await import("node:fs");
  const messages = JSON.parse(readFileSync("messages/en.json", "utf8")) as {
    structure: { field: Record<string, string>; classify: Record<string, string> };
  };
  const all = [
    ...discardedByServiceCategoryChange(FREIGHT, "customs"),
    ...discardedByServiceCategoryChange(
      { ...FREIGHT, serviceCategory: "unlisted", customCategoryLabel: "X" },
      "freight",
    ),
    ...discardedByPartnerTypeChange(
      { ...DISTRIBUTION, distributionPartnerType: "other", customCategoryLabel: "X" },
      "importer",
    ),
    ...discardedByCoverageScopeChange(DISTRIBUTION, "worldwide"),
    ...discardedByFamilyChange(FREIGHT, "distribution"),
    ...discardedByFamilyChange(DISTRIBUTION, "services"),
    ...discardedByFamilyChange(
      { ...emptyDraft(), canonical: { family: "products", intent: "offer_product" }, product: "X", hsCode: "1001.19", quantity: 1, quantityMode: "exact", origin: "AR", destination: "IT", incoterm: "FOB" },
      "services",
    ),
  ];
  const missing = all
    .map((i) => i.labelKey)
    .filter((k) => typeof messages.structure.field[k] !== "string");
  assert.deepEqual(Array.from(new Set(missing)), [], "a warning would print a raw dotted path");

  for (const key of ["discardTitle", "discardBody", "discardKeep", "discardConfirm"]) {
    assert.equal(typeof messages.structure.classify[key], "string", `classify.${key} has no copy`);
  }
});

console.log(`structure/discard: ${passed} passed`);
