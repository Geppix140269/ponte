// The canonical category taxonomy, and the rule that there is only one of it.
//
// Run: npx tsx lib/taxonomy/__tests__/categories.test.ts
//
// Owner requirement, 28 July 2026: Trade services and Distribution must open
// on structured, clickable categories rather than a blank text field, and every
// surface must read the same list. These assertions pin the list itself and the
// single-authority rule; the composer's behaviour is pinned in
// lib/structure/__tests__/classify.test.tsx.

import assert from "node:assert/strict";
import test from "node:test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import {
  TRADE_SERVICE_CATEGORIES,
  TRADE_SERVICE_SUBCATEGORIES,
  subcategoriesFor,
  subcategoryBelongsTo,
  canonicalServiceCategory,
  serviceCategoryNeedsCustomLabel,
  serviceSubcategoryNeedsCustomLabel,
  LEGACY_SERVICE_KEY_MAP,
} from "../services";
import {
  DISTRIBUTION_PARTNER_TYPES,
  DISTRIBUTION_RELATIONSHIP_TERMS,
  DISTRIBUTION_COVERAGE_SCOPES,
  LEGACY_DISTRIBUTION_MAP,
  canonicalPartnerType,
  canonicalRelationshipTerm,
  coverageScopeTakesCountries,
} from "../distribution";
import { CLASSIFICATION_JOURNEYS, firstStepFor, journeyFor } from "../journey";
import { MARKET_INTENTS, TRADE_SERVICES, DISTRIBUTION_MODES } from "../market";

// ---------------------------------------------------------------------------
// 4. Every canonical Trade Service category exists, in the owner's order
// ---------------------------------------------------------------------------

test("the eleven trade service categories are present, in order", () => {
  assert.deepEqual(
    TRADE_SERVICE_CATEGORIES.map((c) => c.label),
    [
      "Freight and logistics",
      "Warehousing and fulfilment",
      "Customs and border services",
      "Inspection, testing and quality",
      "Certification and standards",
      "Cargo insurance and risk",
      "Trade finance and payments",
      "Trade compliance and regulatory support",
      "Trade documentation",
      "Other trade-enabling services",
      "Other",
    ],
  );
});

test("every trade service category carries a plain-English description", () => {
  for (const category of TRADE_SERVICE_CATEGORIES) {
    assert.ok(category.description.length > 12, `${category.key} has no usable description`);
  }
});

// ---------------------------------------------------------------------------
// 5. Every canonical Distribution partner type exists, in the owner's order
// ---------------------------------------------------------------------------

test("the twelve distribution partner types are present, in order", () => {
  assert.deepEqual(
    DISTRIBUTION_PARTNER_TYPES.map((p) => p.label),
    [
      "Distributor",
      "Importer or importer of record",
      "Wholesaler or reseller",
      "Commercial agent",
      "Sales representative",
      "Broker or intermediary",
      "Market-entry or business-development partner",
      "Franchise or licensing partner",
      "E-commerce or marketplace partner",
      "Local operating partner",
      "Regional or multi-market partner",
      "Other distribution arrangement",
    ],
  );
});

test("relationship structures are a separate dimension, not partner types", () => {
  const partners = DISTRIBUTION_PARTNER_TYPES.map((p) => p.key);
  // The defect being corrected: exclusive and non-exclusive were stored as if
  // they named a partner. They describe how an arrangement is structured.
  assert.ok(partners.indexOf("exclusive") < 0);
  assert.ok(partners.indexOf("nonexclusive") < 0);
  assert.ok(DISTRIBUTION_RELATIONSHIP_TERMS.some((r) => r.key === "exclusive"));
  assert.ok(DISTRIBUTION_RELATIONSHIP_TERMS.some((r) => r.key === "non_exclusive"));
});

test("coverage scopes that name countries are the only ones that take codes", () => {
  assert.equal(coverageScopeTakesCountries("countries"), true);
  assert.equal(coverageScopeTakesCountries("country"), true);
  assert.equal(coverageScopeTakesCountries("region"), true);
  assert.equal(coverageScopeTakesCountries("worldwide"), false);
  assert.equal(coverageScopeTakesCountries("online"), false);
  assert.equal(coverageScopeTakesCountries(null), false);
});

// ---------------------------------------------------------------------------
// 6. Other appears last, everywhere
// ---------------------------------------------------------------------------

test("Other is the last option in every category list", () => {
  const lists: { name: string; options: readonly { key: string; isOther?: boolean }[] }[] = [
    { name: "trade service categories", options: TRADE_SERVICE_CATEGORIES },
    { name: "distribution partner types", options: DISTRIBUTION_PARTNER_TYPES },
    { name: "relationship terms", options: DISTRIBUTION_RELATIONSHIP_TERMS },
  ];
  for (const list of lists) {
    const others = list.options.filter((o) => o.isOther);
    assert.equal(others.length, 1, `${list.name} must have exactly one Other`);
    assert.equal(
      list.options[list.options.length - 1].isOther,
      true,
      `${list.name} does not end with Other`,
    );
  }
});

test("every subcategory list ends with its own Other entry", () => {
  for (const category of TRADE_SERVICE_CATEGORIES) {
    if (category.isOther) continue; // the escape route has no subcategories
    const subs = subcategoriesFor(category.key);
    assert.ok(subs.length > 0, `${category.key} has no subcategories`);
    assert.equal(
      subs[subs.length - 1].isOther,
      true,
      `${category.key} does not end with an Other entry`,
    );
  }
});

test("the escape route has no subcategories to choose from", () => {
  assert.equal(subcategoriesFor("unlisted").length, 0);
});

test("the escape route does not reuse a key that already means something", () => {
  // `other` was the tenth entry of the earlier list and meant "Other
  // trade-enabling services". The escape route is stored as `unlisted` so a
  // stored value can never mean two things at once.
  assert.equal(
    TRADE_SERVICE_CATEGORIES.some((c) => c.key === "other"),
    false,
  );
  assert.equal(TRADE_SERVICE_CATEGORIES[TRADE_SERVICE_CATEGORIES.length - 1].key, "unlisted");
});

// ---------------------------------------------------------------------------
// A subcategory only exists inside its own category
// ---------------------------------------------------------------------------

test("every subcategory names a real parent, and only that parent", () => {
  const categories = TRADE_SERVICE_CATEGORIES.map((c) => c.key);
  for (const sub of TRADE_SERVICE_SUBCATEGORIES) {
    assert.ok(categories.indexOf(sub.category) >= 0, `${sub.key} names an unknown category`);
    assert.equal(subcategoryBelongsTo(sub.key, sub.category), true);
  }
  assert.equal(subcategoryBelongsTo("freight.ocean", "customs"), false);
  assert.equal(subcategoryBelongsTo("nonsense", "freight"), false);
});

test("no two options anywhere in the taxonomy share a key", () => {
  const seen: Record<string, string> = {};
  const add = (space: string, keys: readonly string[]) => {
    for (const key of keys) {
      const id = `${space}:${key}`;
      assert.equal(seen[id], undefined, `${id} is declared twice`);
      seen[id] = space;
    }
  };
  add("service", TRADE_SERVICE_CATEGORIES.map((c) => c.key));
  add("sub", TRADE_SERVICE_SUBCATEGORIES.map((s) => s.key));
  add("partner", DISTRIBUTION_PARTNER_TYPES.map((p) => p.key));
  add("relationship", DISTRIBUTION_RELATIONSHIP_TERMS.map((r) => r.key));
  add("coverage", DISTRIBUTION_COVERAGE_SCOPES.map((c) => c.key));
});

// ---------------------------------------------------------------------------
// 7 and 8. Other asks for wording. A recognised category never does.
// ---------------------------------------------------------------------------

test("only the top-level Other asks the member to write anything", () => {
  assert.equal(serviceCategoryNeedsCustomLabel("unlisted"), true);
  for (const category of TRADE_SERVICE_CATEGORIES) {
    if (category.isOther) continue;
    assert.equal(
      serviceCategoryNeedsCustomLabel(category.key),
      false,
      `${category.key} must not require free text`,
    );
  }
});

test("a category's own Other subcategory keeps the parent category", () => {
  // Choosing "Other freight or logistics service" is still freight. The record
  // stays classified; only the specific detail is described in words.
  assert.equal(serviceSubcategoryNeedsCustomLabel("freight.other"), true);
  assert.equal(subcategoryBelongsTo("freight.other", "freight"), true);
});

// ---------------------------------------------------------------------------
// 16. Existing values map without a silent change of meaning
// ---------------------------------------------------------------------------

test("every legacy trade service key maps to a canonical category", () => {
  for (const legacy of TRADE_SERVICES) {
    const mapped = canonicalServiceCategory(legacy.key);
    assert.ok(mapped, `${legacy.key} has no canonical target`);
    assert.ok(
      TRADE_SERVICE_CATEGORIES.some((c) => c.key === mapped),
      `${legacy.key} maps to ${mapped}, which is not a category`,
    );
  }
  assert.equal(Object.keys(LEGACY_SERVICE_KEY_MAP).length, TRADE_SERVICES.length);
});

test("the legacy service `other` means trade-enabling, not the new escape route", () => {
  // The old list's tenth entry was "Other trade-enabling services". Reading it
  // as the new Other would silently reclassify every record that used it.
  assert.equal(canonicalServiceCategory("other"), "enabling");
});

test("every legacy distribution value maps, and to the right dimension", () => {
  for (const legacy of DISTRIBUTION_MODES) {
    const mapping = LEGACY_DISTRIBUTION_MAP[legacy.key];
    assert.ok(mapping, `${legacy.key} has no recorded mapping`);
    if (mapping.field === "partner_type") {
      assert.ok(DISTRIBUTION_PARTNER_TYPES.some((p) => p.key === mapping.key));
      assert.equal(canonicalPartnerType(legacy.key), mapping.key);
    } else {
      assert.ok(DISTRIBUTION_RELATIONSHIP_TERMS.some((r) => r.key === mapping.key));
      assert.equal(canonicalRelationshipTerm(legacy.key), mapping.key);
    }
  }
});

test("a stored relationship term is never read back as a partner type", () => {
  // `exclusive` was in the same flat list as `distributor`. Answering "which
  // partner type is this record?" with "exclusive" would keep the original
  // error alive under new names.
  assert.equal(canonicalPartnerType("exclusive"), null);
  assert.equal(canonicalPartnerType("nonexclusive"), null);
  assert.equal(canonicalRelationshipTerm("distributor"), null);
});

test("the one underspecified legacy mapping is flagged, not hidden", () => {
  // The requirement maps `route` to a route-to-market partner, which is not one
  // of the twelve canonical types. It is mapped to the closest exact
  // definition and marked for the owner to confirm.
  const route = LEGACY_DISTRIBUTION_MAP.route;
  assert.equal(route.key, "market_entry");
  assert.equal(route.needsOwnerConfirmation, true);
  assert.ok(route.note && route.note.length > 20);
});

// ---------------------------------------------------------------------------
// 1 and 2, at the contract level: no journey opens on free text
// ---------------------------------------------------------------------------

test("no family or intent opens on a text field", () => {
  for (const intent of MARKET_INTENTS) {
    const first = firstStepFor(intent.family, intent.key);
    assert.ok(first, `${intent.key} has no classification journey`);
    assert.notEqual(first, "details", `${intent.key} opens on free text`);
  }
});

test("every canonical intent has a journey, and no journey is orphaned", () => {
  assert.equal(CLASSIFICATION_JOURNEYS.length, MARKET_INTENTS.length);
  for (const intent of MARKET_INTENTS) {
    const journey = journeyFor(intent.family, intent.key);
    assert.ok(journey, `${intent.key} has no journey`);
    assert.equal(journey.steps.indexOf(journey.first), 0);
    // Details are always offered, always last and never required.
    assert.equal(journey.steps[journey.steps.length - 1], "details");
    assert.equal(journey.required.indexOf("details"), -1);
  }
});

test("a cross-family pair resolves to no journey at all", () => {
  assert.equal(journeyFor("services", "source_product"), null);
  assert.equal(journeyFor("distribution", "seek_trade_service"), null);
  assert.equal(journeyFor(null, "seek_trade_service"), null);
});

// ---------------------------------------------------------------------------
// 11. One taxonomy. Find, the composer and everything else import it.
// ---------------------------------------------------------------------------

/**
 * The single-authority guard.
 *
 * The requirement forbids a separate category array inside Find, Explore, Start
 * a Deal, the composer, filters, search forms or API routes. A competing list
 * is a defect even when its contents happen to match today, because it will
 * stop matching and nothing will notice.
 *
 * This looks for the shape a competing list actually takes: a file outside
 * `lib/taxonomy/` that declares several category labels of its own. Matching on
 * distinctive labels rather than on the word "freight" keeps it from firing on
 * prose, a comment or a single reference.
 */
const TAXONOMY_HOME = join("lib", "taxonomy");
const SIGNATURES: readonly string[] = [
  "Freight and logistics",
  "Customs and border services",
  "Trade finance and payments",
  "Importer or importer of record",
  "E-commerce or marketplace partner",
  "Wholesaler or reseller",
];

function sourceFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === ".next" || entry.startsWith(".")) continue;
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) sourceFiles(path, acc);
    else if (/\.(ts|tsx)$/.test(entry)) acc.push(path.split("\\").join("/"));
  }
  return acc;
}

test("no surface keeps a competing copy of the category taxonomy", () => {
  const home = TAXONOMY_HOME.split("\\").join("/");
  const offenders: string[] = [];

  for (const dir of ["lib", "app", "components"]) {
    for (const file of sourceFiles(dir)) {
      if (file.startsWith(home)) continue;
      if (file.indexOf("__tests__") >= 0) continue;
      const text = readFileSync(file, "utf8");
      const hits = SIGNATURES.filter((label) => text.indexOf(label) >= 0);
      // One label can be a heading or an example. Two or more declared in the
      // same file is a list, and the list belongs in lib/taxonomy.
      if (hits.length >= 2) offenders.push(`${file} (${hits.join(", ")})`);
    }
  }

  assert.deepEqual(
    offenders,
    [],
    `these files declare category labels of their own:\n  ${offenders.join("\n  ")}`,
  );
});
