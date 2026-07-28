// The resolution cascade, and the defect that made it necessary.
//
// Run: npx tsx lib/products/__tests__/cascade.test.ts
//
// ## The defect
//
// The owner typed `avocado` into Offer a product and was told:
//
//   > Ponte did not recognise that yet. Ponte looked for avocado in its product
//   > vocabulary and found nothing close.
//
// The model stage could only return keys that already existed in Ponte's
// curated catalogue, so the catalogue was the boundary of everything Ponte
// could understand. That is not "Ponte identifies what you trade"; it is
// "Ponte recognises what Ponte was seeded with".
//
// ## The nine cases required at review, each named in a test below
//
//   1. a known catalogue product
//   2. an ordinary product outside the curated catalogue
//   3. a misspelling
//   4. an ambiguous generic term
//   5. materially different processed forms
//   6. the model unavailable
//   7. a low-confidence identification
//   8. user confirmation
//   9. a downstream HS suggestion
//
// Every stage is injected, so all nine run with no network and no database.
// The model's own behaviour is exercised separately, against the deploy
// preview, and recorded in the pull request.

import assert from "node:assert/strict";
import { LOW_CONFIDENCE, isLowConfidence, pathFor, resolveThroughCascade } from "../cascade";
import { editDistance, fuzzyMatches } from "../fuzzy";
import { groundIdentification, groundProduct, type RawIdentification } from "../identify";
import { intakeReducer, newSession } from "../intake";
import { isIdentified, type ProductCandidate } from "../model";

let passed = 0;
function test(name: string, fn: () => Promise<void> | void): Promise<void> {
  return Promise.resolve()
    .then(fn)
    .then(() => {
      passed++;
    })
    .catch((err: Error) => {
      console.error(`FAIL  ${name}`);
      console.error(`      ${err.message}`);
      process.exitCode = 1;
    });
}

const keys = (o: Awaited<ReturnType<typeof resolveThroughCascade>>): string[] =>
  o.kind === "none" ? [] : o.candidates.map((c) => c.product.key);
const names = (o: Awaited<ReturnType<typeof resolveThroughCascade>>): string[] =>
  o.kind === "none" ? [] : o.candidates.map((c) => c.product.name);

/** A stand-in HS catalogue holding only real HS 2022 codes. */
const HS: Record<string, string> = {
  "080440": "Fruit, edible; avocados, fresh or dried",
  "081190": "Fruit and nuts; frozen, other",
  "200899": "Fruit; otherwise prepared or preserved, other",
  "151590": "Fixed vegetable fats and oils; other",
  "271019": "Petroleum oils, other than crude: gas oils",
};
const hsLookup = async (code: string) => (HS[code] ? { code, description: HS[code] } : null);
/**
 * A word search over those descriptions, standing in for the real RPC.
 *
 * Matches in either direction, because that is what the real index does and
 * because the useful case runs the "wrong" way: a member types `avocado` and
 * the nomenclature says `avocados`.
 */
const hsSearch = async (q: string) => {
  const query = q.toLowerCase().trim();
  if (!query) return [];
  return Object.entries(HS)
    .filter(([, d]) => {
      const description = d.toLowerCase();
      if (description.includes(query)) return true;
      return description.split(/[^a-z]+/).some((w) => w.length > 3 && query.includes(w));
    })
    .map(([code, description]) => ({ code, description }));
};

/** What the model returns for `avocado`, in the shape the prompt asks for. */
const AVOCADO: RawIdentification = {
  isProduct: true,
  products: [
    {
      name: "Avocado, fresh",
      generic: "Avocado",
      sector: "agri",
      group: "Fresh fruit",
      form: "fresh",
      distinguisher: "The fresh fruit, sold by count and size grade, shipped chilled.",
      synonyms: ["avocados", "alligator pear"],
      hsCandidates: ["080440"],
      confidence: 0.92,
    },
    {
      name: "Avocado pulp, frozen",
      generic: "Avocado",
      sector: "food",
      group: "Frozen fruit",
      form: "frozen",
      distinguisher: "Processed pulp or halves, frozen. A different buyer and a different cold chain.",
      hsCandidates: ["081190"],
      confidence: 0.72,
    },
    {
      name: "Avocado oil",
      sector: "food",
      group: "Edible oils",
      form: "refined oil",
      distinguisher: "An extracted oil, not a fruit. Sold on grade and acidity.",
      hsCandidates: ["151590"],
      confidence: 0.6,
    },
  ],
  clarify: null,
};

const identifyWith = (answer: RawIdentification | null) => async () =>
  answer ? groundIdentification(answer, hsLookup) : null;

async function run(): Promise<void> {
  // ---- 1. a known catalogue product ---------------------------------------

  await test("1. a curated product still resolves without spending a token", async () => {
    let called = false;
    const outcome = await resolveThroughCascade("EN 590", {
      identify: async () => {
        called = true;
        return null;
      },
      hsLookup,
    });
    assert.equal(called, false, "the model was called for a product the catalogue already answers exactly");
    assert.equal(keys(outcome)[0], "gasoil-10ppm-en590");
    assert.ok(!isIdentified(outcome.kind === "none" ? ({} as never) : outcome.candidates[0].product));
  });

  await test("1b. `gas oil` still asks which grade, and does not regress", async () => {
    const outcome = await resolveThroughCascade("gas oil", { identify: identifyWith(null), hsLookup });
    assert.equal(outcome.kind, "ambiguous", "the acceptance case regressed");
    if (outcome.kind !== "ambiguous") return;
    assert.equal(outcome.candidates[0].product.key, "gasoil-10ppm-en590");
    assert.equal(outcome.candidates.length, 3);
    assert.match(outcome.question, /sulphur content/i);
  });

  // ---- 2. an ordinary product outside the curated catalogue ----------------

  await test("2. `avocado` is identified, and is never an unmatched state", async () => {
    const outcome = await resolveThroughCascade("avocado", { identify: identifyWith(AVOCADO), hsLookup });
    assert.notEqual(outcome.kind, "none", "the defect the owner found is still present");
    assert.ok(names(outcome).some((n) => /avocado/i.test(n)));
    assert.equal(names(outcome)[0], "Avocado, fresh", "the fresh fruit is not the primary reading");
  });

  await test("2b. an identified product says it was identified, not confirmed", async () => {
    const outcome = await resolveThroughCascade("avocado", { identify: identifyWith(AVOCADO), hsLookup });
    if (outcome.kind === "none") throw new Error("unreachable");
    const top = outcome.candidates[0];
    assert.ok(isIdentified(top.product), "an identified product did not carry its own marker");
    // And it is ranked below what an exact curated match would score, because
    // Ponte knowing a product is stronger evidence than Ponte working it out.
    assert.ok(top.score < 0.95, `an identified product scored ${top.score}, at or above an exact curated match`);
  });

  await test("2c. `avocado` is not interrogated for a grade or a standard", async () => {
    const outcome = await resolveThroughCascade("avocado", { identify: identifyWith(AVOCADO), hsLookup });
    // The owner's instruction: do not ask for a grade, standard or technical
    // term merely so Ponte can identify an ordinary fruit.
    assert.notEqual(outcome.kind, "ambiguous", "Ponte demanded a decision to identify an ordinary fruit");
    assert.equal(outcome.kind, "candidates");
  });

  await test("2d. the whole avocado family the owner listed produces useful results", async () => {
    const wordings = [
      "avocado",
      "fresh avocados",
      "Hass avocado",
      "avocados from Peru",
      "frozen avocado pulp",
      "avocado oil",
    ];
    for (const wording of wordings) {
      const outcome = await resolveThroughCascade(wording, { identify: identifyWith(AVOCADO), hsLookup });
      assert.notEqual(outcome.kind, "none", `"${wording}" reached the unmatched state`);
      assert.ok(keys(outcome).length > 0, `"${wording}" produced no candidate`);
    }
  });

  // ---- 3. a misspelling ----------------------------------------------------

  await test("3. a misspelling of a CURATED product is corrected with no model call", async () => {
    // Damerau, so a transposition costs one edit rather than two.
    assert.equal(editDistance("gaosil", "gasoil"), 1);
    const matches = fuzzyMatches("gasoill");
    assert.ok(matches.length > 0, "a one-letter slip found nothing");
    assert.equal(matches[0].product.key.startsWith("gasoil"), true);

    let called = false;
    const outcome = await resolveThroughCascade("icumsa 54", {
      identify: async () => {
        called = true;
        return null;
      },
      hsLookup,
    });
    assert.notEqual(outcome.kind, "none");
    assert.ok(keys(outcome).includes("refined-sugar-icumsa-45"));
    assert.equal(called, false, "a near-exact spelling correction still spent a token");
  });

  await test("3b. `avogado` is corrected and the correction is shown, not applied silently", async () => {
    const corrected: RawIdentification = {
      ...AVOCADO,
      products: [{ ...AVOCADO.products![0], correction: "avocado" }, ...AVOCADO.products!.slice(1)],
    };
    const outcome = await resolveThroughCascade("avogado", { identify: identifyWith(corrected), hsLookup });
    assert.notEqual(outcome.kind, "none", "a one-letter slip on a common product hit the unmatched state");
    if (outcome.kind === "none") return;
    const top = outcome.candidates[0].product;
    assert.ok(isIdentified(top));
    assert.equal(isIdentified(top) ? top.correction : null, "avocado", "the correction was not carried to the surface");
  });

  await test("3c. a correction is never suggested towards an unrelated product", async () => {
    // Suggesting `gasoil` to somebody who typed `avocado` would be worse than
    // saying nothing, so fuzzy matches are only used when nothing else answered.
    assert.deepEqual(fuzzyMatches("avocado"), []);
  });

  // ---- 4. an ambiguous generic term ---------------------------------------

  await test("4. a genuinely ambiguous term asks, and the model's question is used", async () => {
    const ambiguous: RawIdentification = {
      isProduct: true,
      products: [
        { name: "Crude palm oil", sector: "food", group: "Edible oils", hsCandidates: ["151590"], confidence: 0.55 },
        { name: "Palm kernel oil", sector: "food", group: "Edible oils", hsCandidates: ["151590"], confidence: 0.5 },
      ],
      clarify: "Do you mean palm oil or palm kernel oil? They are different products.",
    };
    const outcome = await resolveThroughCascade("palm", { identify: identifyWith(ambiguous), hsLookup });
    assert.equal(outcome.kind, "ambiguous");
    if (outcome.kind !== "ambiguous") return;
    assert.match(outcome.question, /palm kernel/i);
  });

  await test("4b. `sugar` still asks which, because two curated products tie", async () => {
    const outcome = await resolveThroughCascade("sugar", { identify: identifyWith(null), hsLookup });
    assert.equal(outcome.kind, "ambiguous");
  });

  // ---- 5. materially different processed forms ----------------------------

  await test("5. fresh, frozen and oil come back as three distinct products", async () => {
    const outcome = await resolveThroughCascade("avocado", { identify: identifyWith(AVOCADO), hsLookup });
    const found = names(outcome);
    assert.equal(found.length, 3, `expected three forms, got ${found.length}`);
    assert.ok(found.some((n) => /fresh/i.test(n)), "the fresh fruit is missing");
    assert.ok(found.some((n) => /frozen/i.test(n)), "the frozen form is missing");
    assert.ok(found.some((n) => /oil/i.test(n)), "the oil is missing");

    // And they are genuinely different records, not one with three labels:
    // different keys, different customs headings.
    if (outcome.kind === "none") return;
    assert.equal(new Set(keys(outcome)).size, 3);
    const codes = outcome.candidates.map((c) => c.product.hs?.code);
    assert.equal(new Set(codes).size, 3, "three forms shared a customs heading");
  });

  // ---- 6. the model unavailable -------------------------------------------

  await test("6. with no model, the customs catalogue still identifies the product", async () => {
    const outcome = await resolveThroughCascade("avocado", {
      identify: async () => null, // unconfigured, failed or timed out
      hsLookup,
      hsSearch,
    });
    assert.notEqual(outcome.kind, "none", "a model outage put the member back at the dead end");
    if (outcome.kind === "none") return;
    const top = outcome.candidates[0].product;
    assert.ok(isIdentified(top));
    assert.equal(isIdentified(top) ? top.basis : null, "customs_catalogue");
    // The member's own words lead; the nomenclature wording is the explanation.
    assert.equal(top.name, "avocado");
    assert.match(top.distinguisher, /avocados, fresh or dried/);
  });

  await test("6b. with no model and no customs catalogue, the outcome is still explained", async () => {
    const outcome = await resolveThroughCascade("something nobody sells", { identify: async () => null });
    assert.equal(outcome.kind, "none");
    if (outcome.kind !== "none") return;
    assert.equal(outcome.wording, "something nobody sells");
    assert.ok(outcome.tried.length > 0);
  });

  await test("6c. a model that throws is an outage, not an error page", async () => {
    const outcome = await resolveThroughCascade("avocado", {
      identify: async () => {
        throw new Error("upstream 503");
      },
      hsLookup,
      hsSearch,
    });
    assert.notEqual(outcome.kind, "none");
  });

  // ---- 7. a low-confidence identification ---------------------------------

  await test("7. a low-confidence identification is offered, and marked as unsure", async () => {
    const vague: RawIdentification = {
      isProduct: true,
      products: [{ name: "Industrial fastener", sector: "metal", group: "Hardware", confidence: 0.3 }],
    };
    const outcome = await resolveThroughCascade("those metal things", { identify: identifyWith(vague), hsLookup });
    assert.notEqual(outcome.kind, "none", "a weak identification was thrown away instead of offered");
    if (outcome.kind === "none") return;
    const candidate = outcome.candidates[0];
    assert.ok(candidate.score < LOW_CONFIDENCE, `scored ${candidate.score}, which reads as confident`);
    assert.equal(isLowConfidence(candidate), true, "a weak identification was not marked as one");
  });

  await test("7b. a curated match is never marked low confidence", async () => {
    const outcome = await resolveThroughCascade("ULSD", { identify: identifyWith(null), hsLookup });
    if (outcome.kind === "none") throw new Error("unreachable");
    assert.equal(isLowConfidence(outcome.candidates[0]), false);
  });

  // ---- 8. user confirmation ------------------------------------------------

  await test("8. an identified product cannot reach a draft without confirmation", async () => {
    const outcome = await resolveThroughCascade("avocado", { identify: identifyWith(AVOCADO), hsLookup });
    if (outcome.kind === "none") throw new Error("unreachable");
    const key = outcome.candidates[0].product.key;

    const review = [
      { type: "resolution" as const, outcome },
      { type: "chooseCandidate" as const, productKey: key },
    ].reduce(intakeReducer, newSession("offer_product"));
    if (review.stage.kind !== "review") throw new Error("the identified product did not reach a review");

    // Before confirming: identified, and said so.
    assert.equal(review.stage.review.products[0].product.provenance, "ai_identified");

    // A draft cannot be created from the review directly.
    const skipped = intakeReducer(review, { type: "draftCreated", ref: "PT-1" });
    assert.equal(skipped.stage.kind, "review", "a draft was created from an unconfirmed identification");

    // Confirming is the member agreeing, and is the only thing that upgrades it.
    const confirmed = intakeReducer(review, { type: "confirm" });
    if (confirmed.stage.kind !== "confirmed") throw new Error("unreachable");
    assert.equal(confirmed.stage.review.products[0].product.provenance, "member_confirmed");
  });

  await test("8b. the category path of an identified product is readable", async () => {
    const outcome = await resolveThroughCascade("avocado", { identify: identifyWith(AVOCADO), hsLookup });
    if (outcome.kind === "none") throw new Error("unreachable");
    const path = pathFor(outcome.candidates[0].product);
    // The sector is derived from the confirmed customs chapter, not taken from
    // the model: 0804 is chapter 8, which is Agriculture & live animals.
    assert.deepEqual(path, ["Products", "Agriculture & live animals", "Fresh fruit", "Avocado, fresh"]);
    // And an unclassifiable product still has a path a person can read.
    const orphan = await resolveThroughCascade("mystery item", {
      identify: identifyWith({ isProduct: true, products: [{ name: "Mystery item", group: "Unknown", confidence: 0.5 }] }),
    });
    if (orphan.kind === "none") throw new Error("unreachable");
    assert.ok(pathFor(orphan.candidates[0].product).includes("Sector not yet assigned"));
  });

  // ---- 9. the downstream HS suggestion ------------------------------------

  await test("9. a customs heading is suggested downstream, never required upfront", async () => {
    const outcome = await resolveThroughCascade("avocado", { identify: identifyWith(AVOCADO), hsLookup });
    if (outcome.kind === "none") throw new Error("unreachable");
    const top = outcome.candidates[0].product;
    assert.equal(top.hs?.code, "080440");
    // Nothing about identification depended on the member knowing it.
    assert.ok(isIdentified(top) && top.hsCandidates.length > 0);
  });

  await test("9b. a customs code the catalogue does not hold is dropped, not shown", async () => {
    const invented: RawIdentification = {
      isProduct: true,
      products: [
        {
          name: "Avocado, fresh",
          sector: "agri",
          group: "Fresh fruit",
          // The first is real; the second and third are not in HS 2022 at all.
          hsCandidates: ["080440", "999999", "12"],
          confidence: 0.9,
        },
      ],
    };
    const grounded = await groundIdentification(invented, hsLookup);
    const product = grounded.products[0].product;
    assert.deepEqual(
      product.hsCandidates.map((c) => c.code),
      ["080440"],
      "a customs classification that does not exist reached the member",
    );
  });

  await test("9c. with no HS lookup at all, no code is asserted", async () => {
    const grounded = await groundIdentification(
      { isProduct: true, products: [{ name: "Avocado", hsCandidates: ["080440"], confidence: 0.9 }] },
      undefined,
    );
    assert.equal(grounded.products[0].product.hs, null, "a code was shown without ever being checked");
  });

  // ---- the invention rules that must survive the new freedom --------------

  await test("the model still cannot invent an attribute the member did not give", async () => {
    const grounded = await groundProduct(
      { name: "Avocado, fresh", attributes: [{ label: "Variety" }, { value: "Hass" }, { label: "Variety", value: "Hass" }] },
      hsLookup,
      "model",
    );
    assert.ok(grounded);
    // Only the complete pair survives; a half-formed attribute is dropped.
    assert.deepEqual(
      grounded!.product.attributes.map((a) => `${a.label}=${a.value}`),
      ["Variety=Hass"],
    );
  });

  await test("a nameless identification is discarded", async () => {
    assert.equal(await groundProduct({ confidence: 0.9 }, hsLookup, "model"), null);
    const grounded = await groundIdentification({ isProduct: true, products: [{ confidence: 1 }] }, hsLookup);
    assert.deepEqual(grounded.products, []);
    assert.equal(grounded.isProduct, false);
  });

  await test("input that names no product at all is reported as such", async () => {
    const grounded = await groundIdentification({ isProduct: false, products: [] }, hsLookup);
    assert.equal(grounded.isProduct, false);
    const outcome = await resolveThroughCascade("hello there", {
      identify: identifyWith({ isProduct: false, products: [] }),
    });
    assert.equal(outcome.kind, "none");
  });

  await test("a curated product the model also recognised keeps its curated identity", async () => {
    const both: RawIdentification = {
      isProduct: true,
      products: [
        {
          name: "Ultra low sulphur diesel",
          catalogueKey: "gasoil-10ppm-en590",
          sector: "min",
          group: "Refined petroleum products",
          hsCandidates: ["271019"],
          confidence: 0.9,
        },
      ],
    };
    const outcome = await resolveThroughCascade("automotive gasoil", { identify: identifyWith(both), hsLookup });
    if (outcome.kind === "none") throw new Error("unreachable");
    const top = outcome.candidates[0];
    assert.equal(top.product.key, "gasoil-10ppm-en590");
    assert.equal(isIdentified(top.product), false, "a curated product was replaced by a re-derivation of itself");
  });

  await test("candidates are ranked, and an identified product never outranks an exact curated match", async () => {
    const outcome = await resolveThroughCascade("ULSD", { identify: identifyWith(AVOCADO), hsLookup });
    if (outcome.kind === "none") throw new Error("unreachable");
    assert.equal(outcome.candidates[0].product.key, "gasoil-10ppm-en590");
    const scores = outcome.candidates.map((c: ProductCandidate) => c.score);
    for (let i = 1; i < scores.length; i++) assert.ok(scores[i - 1] >= scores[i], "candidates were not ranked");
  });

  await test("a curated product the model re-derived under another name is not shown twice", async () => {
    /*
     * Found on the deploy preview. For `gas oil` the model returned its own
     * reading of all three gasoil grades. They arrived with keys like
     * `identified:gasoil-10-ppm-ulsd-en-590`, which are not the curated keys,
     * so the key-based dedupe missed them and the member saw six rows: each
     * grade once as a curated product and once as an identification of itself.
     */
    const echo: RawIdentification = {
      isProduct: true,
      products: [
        { name: "Gasoil 10 ppm (ULSD, EN 590)", sector: "min", group: "Refined petroleum products", hsCandidates: ["271019"], confidence: 0.9 },
        { name: "Gasoil 50 ppm", sector: "min", group: "Refined petroleum products", hsCandidates: ["271019"], confidence: 0.8 },
        { name: "Gasoil 500 ppm", sector: "min", group: "Refined petroleum products", hsCandidates: ["271019"], confidence: 0.7 },
      ],
    };
    const outcome = await resolveThroughCascade("gas oil", { identify: identifyWith(echo), hsLookup });
    if (outcome.kind === "none") throw new Error("unreachable");

    assert.equal(outcome.candidates.length, 3, `expected three grades, got ${outcome.candidates.length}`);
    assert.equal(new Set(names(outcome)).size, 3, "the same product was offered twice under two provenances");
    // And the surviving copies are the curated ones, which know more.
    for (const candidate of outcome.candidates) {
      assert.equal(isIdentified(candidate.product), false, "a curated product was displaced by a re-derivation");
    }
  });

  await test("an identified product with no recalled code is given one from the catalogue", async () => {
    // `avocados from Peru` came back with 0804.40 on the preview and a bare
    // `avocado` came back with none, which reads as Ponte knowing less about
    // the simpler question. The customs index answers it perfectly well.
    const noCode: RawIdentification = {
      isProduct: true,
      products: [{ name: "avocado", generic: "avocado", sector: "agri", group: "Fresh fruit", confidence: 0.9 }],
    };
    const outcome = await resolveThroughCascade("avocado", {
      identify: identifyWith(noCode),
      hsLookup,
      hsSearch,
    });
    if (outcome.kind === "none") throw new Error("unreachable");
    const top = outcome.candidates[0].product;
    assert.equal(top.hs?.code, "080440", "no customs suggestion was offered for a product the catalogue holds");
    // And the sector is still derived from the code, not from the model.
    assert.equal(top.sector, "agri");
  });

  console.log(`ok   ${passed} resolution cascade tests passed`);
}

void run();
