// The shared product resolver, and the acceptance criteria it has to satisfy.
//
// Run: npx tsx lib/products/__tests__/resolve.test.ts
//
// Criteria 1 to 3 and 6 of the AI product intake decision are pinned here:
//
//   1. `gas oil` never produces a silent no-op.
//   2. Ranked, relevant candidates come back.
//   3. EN 590 / ULSD is among them where context supports it.
//   6. No HS code is required before Ponte has understood the product.
//
// These are unit tests rather than manual checks against a model because the
// lexical stage is deterministic and free. That was the point of building it
// first: an acceptance criterion that can only be verified by hand against a
// live service is not a criterion, it is a hope.

import assert from "node:assert/strict";
import { PRODUCT_CATALOGUE, catalogueKeys, productByKey, sectorLabel } from "../catalogue";
import { bandFor, resolveFrom } from "../model";
import { categoryPathFor, distinguishingAttribute, normalise, resolveProduct } from "../resolve";
import { PRODUCT_SECTORS } from "../../taxonomy/market";

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

const keysOf = (outcome: ReturnType<typeof resolveProduct>): string[] =>
  outcome.kind === "none" ? [] : outcome.candidates.map((c) => c.product.key);

// ---- the catalogue is well formed ------------------------------------------

test("every catalogue product sits in a sector the canonical taxonomy declares", () => {
  const sectors = new Set(PRODUCT_SECTORS.map((s) => s.key));
  for (const product of PRODUCT_CATALOGUE) {
    assert.ok(
      sectors.has(product.sector),
      `${product.key} claims sector "${product.sector}", which lib/taxonomy/market.ts does not declare`,
    );
    // A sector that resolved to its own key rather than a label means the
    // catalogue and the taxonomy have drifted apart silently.
    assert.notEqual(sectorLabel(product.sector), product.sector);
  }
});

test("no synonym reaches two different products", () => {
  // Two spellings of one term inside ONE product are deliberate and needed: the
  // resolver folds "gas oil" and "gasoil" to the same compact form, but the
  // document scan matches token sequences, where ["gas","oil"] and ["gasoil"]
  // are different and both appear in real documents. What must never happen is
  // one term reaching two products, which would make a ranking unarguable.
  const owner = new Map<string, string>();
  for (const product of PRODUCT_CATALOGUE) {
    for (const synonym of product.synonyms) {
      const key = normalise(synonym).compact;
      const already = owner.get(key);
      assert.ok(
        already === undefined || already === product.key,
        `"${synonym}" belongs to both ${already} and ${product.key}`,
      );
      owner.set(key, product.key);
    }
  }
});

test("every product carries a distinguisher, so an ambiguity screen is answerable", () => {
  for (const product of PRODUCT_CATALOGUE) {
    assert.ok(product.distinguisher.length > 20, `${product.key} has no usable distinguisher`);
  }
});

test("catalogue keys are unique and stable", () => {
  const keys = catalogueKeys();
  assert.equal(new Set(keys).size, keys.length);
  for (const key of keys) assert.ok(productByKey(key), `${key} does not resolve back`);
});

// ---- acceptance criterion 1, 2 and 3 ---------------------------------------

test("`gas oil` is never a silent no-op", () => {
  const outcome = resolveProduct("gas oil");
  assert.notEqual(outcome.kind, "none", "gas oil returned nothing, which is the exact defect this change removes");
  assert.ok(keysOf(outcome).length >= 2, "gas oil returned fewer than two candidates");
});

test("`gas oil` returns EN 590 / ULSD first, and the other gasoil grades with it", () => {
  const outcome = resolveProduct("gas oil");
  const keys = keysOf(outcome);
  assert.equal(keys[0], "gasoil-10ppm-en590", `expected the EN 590 grade first, got ${keys[0]}`);
  assert.ok(keys.includes("gasoil-50ppm"), "the 50 ppm grade was not offered");
  assert.ok(keys.includes("gasoil-500ppm"), "the 500 ppm grade was not offered");
});

test("`gas oil` asks a question rather than picking a grade", () => {
  const outcome = resolveProduct("gas oil");
  assert.equal(
    outcome.kind,
    "ambiguous",
    "three commercially different grades matched and one was chosen silently; the decision record rejects that",
  );
  if (outcome.kind !== "ambiguous") return;
  // The question names the thing the candidates actually differ on, rather than
  // asking a general "which one?" nobody can answer.
  assert.match(outcome.question, /sulphur content/i);
  assert.match(outcome.question, /gas oil/);
});

test("every spelling of the same product reaches the same product", () => {
  for (const term of ["gasoil", "EN590", "EN 590", "ULSD", "ultra low sulphur diesel", "automotive gasoil", "10 ppm diesel"]) {
    const outcome = resolveProduct(term);
    assert.notEqual(outcome.kind, "none", `"${term}" resolved to nothing`);
    assert.equal(keysOf(outcome)[0], "gasoil-10ppm-en590", `"${term}" did not lead to the EN 590 grade`);
  }
});

test("a named standard settles the answer instead of leaving it ambiguous", () => {
  const outcome = resolveProduct("EN 590");
  assert.notEqual(outcome.kind, "ambiguous", "a member who named the standard was asked which standard they meant");
  assert.equal(keysOf(outcome)[0], "gasoil-10ppm-en590");
});

test("a product named inside a whole sentence is still found", () => {
  const outcome = resolveProduct("I need 5,000 MT of EN 590 diesel delivered CIF to Rotterdam next month");
  assert.equal(keysOf(outcome)[0], "gasoil-10ppm-en590");
});

test("the three acceptance-case products resolve independently", () => {
  assert.equal(keysOf(resolveProduct("Jet A-1"))[0], "jet-a1");
  assert.equal(keysOf(resolveProduct("D6 virgin fuel oil"))[0], "d6-virgin-fuel-oil");
  assert.equal(keysOf(resolveProduct("gasoil 10ppm"))[0], "gasoil-10ppm-en590");
});

test("a genuinely unknown product returns an explained outcome, never a blank", () => {
  const outcome = resolveProduct("intergalactic widgets");
  assert.equal(outcome.kind, "none");
  if (outcome.kind !== "none") return;
  // The words that failed come back, so the surface can say what was looked for.
  assert.equal(outcome.wording, "intergalactic widgets");
  assert.ok(outcome.tried.length > 0, "nothing was reported as tried, so the surface has nothing to say");
});

test("empty and whitespace input resolve to none rather than throwing", () => {
  for (const input of ["", "   ", "\n"]) {
    const outcome = resolveProduct(input);
    assert.equal(outcome.kind, "none");
  }
});

// ---- acceptance criterion 6 -------------------------------------------------

test("no candidate requires an HS code to be produced, and every code is unconfirmed", () => {
  const outcome = resolveProduct("gas oil");
  if (outcome.kind === "none") throw new Error("unreachable");
  for (const candidate of outcome.candidates) {
    const resolved = resolveFrom(candidate, "gas oil", sectorLabel(candidate.product.sector));
    // The code is a suggestion. It arrives unconfirmed, and nothing about the
    // resolution depended on the member knowing it.
    if (resolved.candidateHs) assert.equal(resolved.candidateHs.confirmed, false);
  }
  // A product with no HS code at all still resolves, which is the property that
  // proves classification is downstream.
  const noCode = PRODUCT_CATALOGUE.find((p) => p.hs === null);
  assert.ok(noCode, "the catalogue has no unclassified product, so this property is untested");
  const unclassified = resolveProduct(noCode!.name);
  assert.notEqual(unclassified.kind, "none");
});

// ---- the seven preserved layers --------------------------------------------

test("a confirmed candidate preserves all seven layers the decision record requires", () => {
  const outcome = resolveProduct("gas oil");
  if (outcome.kind === "none") throw new Error("unreachable");
  const candidate = outcome.candidates[0];
  const resolved = resolveFrom(candidate, "gas oil", sectorLabel(candidate.product.sector));

  assert.equal(resolved.originalWording, "gas oil", "the member's own words were lost");
  assert.equal(resolved.normalised, "Gasoil 10 ppm (ULSD, EN 590)");
  assert.ok(resolved.synonyms.includes("ulsd"));
  assert.ok(resolved.synonyms.includes("EN 590"), "the standard was not carried as a trade term");
  assert.deepEqual(resolved.categoryPath, categoryPathFor(candidate.product));
  assert.ok(resolved.attributes.length > 0);
  assert.ok(resolved.candidateHs && resolved.candidateHs.confirmed === false);
  assert.match(resolved.searchText, /gas oil/);
  assert.ok(resolved.searchTerms.length > 0);
  assert.equal(resolved.provenance, "member_confirmed");
});

// ---- the scoring is evidence, not prose -------------------------------------

test("every candidate says what it matched on", () => {
  const outcome = resolveProduct("gas oil");
  if (outcome.kind === "none") throw new Error("unreachable");
  for (const candidate of outcome.candidates) {
    assert.ok(candidate.matchedOn.length > 0, `${candidate.product.key} matched with no stated evidence`);
    for (const evidence of candidate.matchedOn) assert.ok(evidence.term.length > 0);
  }
});

test("candidates come back ranked, highest first, with a stable tiebreak", () => {
  const outcome = resolveProduct("gas oil");
  if (outcome.kind === "none") throw new Error("unreachable");
  const scores = outcome.candidates.map((c) => c.score);
  for (let i = 1; i < scores.length; i++) assert.ok(scores[i - 1] >= scores[i], "candidates were not ranked");
  // Determinism: the same words twice give the same order.
  assert.deepEqual(keysOf(resolveProduct("gas oil")), keysOf(outcome));
});

test("the confidence band is a word derived from the score, never a model claim", () => {
  assert.equal(bandFor(0.95), "close");
  assert.equal(bandFor(0.6), "likely");
  assert.equal(bandFor(0.3), "possible");
});

test("distinguishingAttribute names an attribute the candidates really disagree about", () => {
  const outcome = resolveProduct("gas oil");
  if (outcome.kind === "none") throw new Error("unreachable");
  assert.equal(distinguishingAttribute(outcome.candidates), "sulphur content");
  // One candidate has nothing to disagree with.
  assert.equal(distinguishingAttribute(outcome.candidates.slice(0, 1)), null);
});

// ---- normalisation ----------------------------------------------------------

test("normalisation folds the spellings that mean the same thing", () => {
  assert.equal(normalise("EN590").text, normalise("EN 590").text);
  assert.equal(normalise("10ppm").text, normalise("10 ppm").text);
  assert.equal(normalise("Gas-Oil").compact, normalise("gasoil").compact);
});

console.log(`ok   ${passed} product resolver tests passed`);
