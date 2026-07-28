// Document to deal: the multi-product scan, the extraction parser and the
// upload reader.
//
// Run: npx tsx lib/products/__tests__/document.test.ts
//
// Criteria 4, 5, 7 and 10 of the AI product intake decision are pinned here:
//
//   4. A multi-product document produces multiple identified products.
//   5. Uploading a document extracts structured product and commercial terms.
//   7. The multi-product fixture identifies EN 590, D6 and Jet A-1 separately.
//  10. Extracted claims are not represented as verified facts.
//
// Not one of these calls a model. Product identification is deterministic by
// design, and the parser rules are pure, so the acceptance case is a property of
// this repository rather than of a service's mood on the day.
//
// The fixture is sanitised. It reproduces the structure of the offer the owner
// supplied and none of its identifying detail: no real company, person, licence,
// website, address, recipient or signatory appears in it.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { readDocument, extensionOf, MAX_UPLOAD_BYTES } from "../../documents/read";
import { emptyTerms, openTerms, parseExtraction, TERM_KEYS, type RawExtraction } from "../extract-document";
import { reviewForExtraction } from "../intake";
import { scanForProducts } from "../scan";

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

const FIXTURE = readFileSync("lib/products/__tests__/fixtures/multi-product-sco.txt", "utf8");
const bytes = (s: string) => new Uint8Array(Buffer.from(s, "utf8"));

// ---- acceptance criteria 4 and 7 -------------------------------------------

test("the multi-product fixture yields exactly three products", () => {
  const found = scanForProducts(FIXTURE);
  assert.equal(
    found.length,
    3,
    `expected three products, got ${found.length}: ${found.map((f) => f.product.key).join(", ")}`,
  );
});

test("the three products are EN 590, D6 and Jet A-1, each identified separately", () => {
  const keys = scanForProducts(FIXTURE).map((f) => f.product.key).sort();
  assert.deepEqual(keys, ["d6-virgin-fuel-oil", "gasoil-10ppm-en590", "jet-a1"]);
});

test("each product carries the verbatim line it was found on, never a paraphrase", () => {
  for (const found of scanForProducts(FIXTURE)) {
    assert.ok(found.quote.length > 0, `${found.product.key} came back with no quote`);
    assert.ok(
      FIXTURE.includes(found.quote.replace(/\.\.\.$/, "")),
      `${found.product.key}'s quote is not in the document`,
    );
  }
});

test("each product states the catalogue terms that found it", () => {
  const byKey = new Map(scanForProducts(FIXTURE).map((f) => [f.product.key, f]));
  const gasoil = byKey.get("gasoil-10ppm-en590")!;
  const joined = gasoil.terms.join(" | ").toLowerCase();
  // Four different spellings of one product appear in this document, and the
  // scan is expected to know they are one thing rather than four.
  assert.match(joined, /ulsd/);
  assert.match(joined, /en 590/);
  assert.ok(byKey.get("d6-virgin-fuel-oil")!.terms.some((t) => /d6/i.test(t)));
  assert.ok(byKey.get("jet-a1")!.terms.some((t) => /jet/i.test(t)));
});

test("a single-product document yields one product, not three", () => {
  const found = scanForProducts("We can supply Jet A-1 to ASTM D1655, 50,000 MT per month.");
  assert.equal(found.length, 1);
  assert.equal(found[0].product.key, "jet-a1");
});

test("a document naming nothing in the catalogue yields nothing, and does not throw", () => {
  assert.deepEqual(scanForProducts("Dear Sir, please find attached our corporate brochure."), []);
  assert.deepEqual(scanForProducts(""), []);
});

// ---- acceptance criterion 5 and the anti-invention rule ---------------------

const RAW: RawExtraction = {
  intent: { value: "offer", quote: "confirm the availability of Gasoil 10ppm" },
  products: [
    {
      wording: "Gasoil 10ppm (ULSD EN590)",
      catalogueKey: "gasoil-10ppm-en590",
      standard: { value: "EN 590", quote: "Gasoil 10ppm (Ultra Low Sulfur Diesel - ULSD EN590)" },
      grade: { value: "10 ppm", quote: "a maximum sulfur content of 10 ppm" },
      attributes: [{ label: "Sulphur", value: "10 ppm maximum" }],
    },
  ],
  terms: {
    quantity: { value: "200,000 MT", quote: "Quantity available: 200,000 MT per month, per product" },
    recurrence: { value: "Monthly", quote: "200,000 MT per month" },
    incoterm: { value: "CIF", quote: "immediate shipment on CIF basis to Houston Port" },
    destination: { value: "Houston Port", quote: "CIF basis to Houston Port" },
    contractTerm: { value: "24 months", quote: "Contract structure: 24-month term contract" },
    // The two the parser must discard: a value the model could not point at.
    pricingBasis: { value: "Platts minus 50 USD per MT" },
    origin: { value: "Nigeria" },
  },
};

test("every extracted term keeps the words it came from", () => {
  const extraction = parseExtraction(RAW, { filename: "offer.pdf", scanned: [], modelRead: true });
  for (const key of TERM_KEYS) {
    const term = extraction.shared[key];
    if (term.provenance === "extracted") {
      assert.ok(term.quote, `${key} was extracted with no quote, so nothing supports it`);
    }
  }
});

test("a term the model could not quote is discarded, not repeated", () => {
  const extraction = parseExtraction(RAW, { filename: "offer.pdf", scanned: [], modelRead: true });
  // Both arrived with a value and no quote. Both must be missing, because a
  // fact Ponte cannot show the member is a fact Ponte does not state.
  assert.equal(extraction.shared.pricingBasis.provenance, "missing");
  assert.equal(extraction.shared.pricingBasis.value, null);
  assert.equal(extraction.shared.origin.provenance, "missing");
  // And the quoted ones survive.
  assert.equal(extraction.shared.quantity.value, "200,000 MT");
  assert.equal(extraction.shared.incoterm.value, "CIF");
});

test("a discarded term becomes an open gap rather than disappearing", () => {
  const extraction = parseExtraction(RAW, { filename: "offer.pdf", scanned: [], modelRead: true });
  const open = openTerms(extraction.shared);
  assert.ok(open.includes("pricingBasis"));
  assert.ok(open.includes("origin"));
  assert.ok(!open.includes("quantity"));
});

test("the commercial intent is only accepted when the document is quoted for it", () => {
  const withQuote = parseExtraction(RAW, { filename: "o.pdf", scanned: [], modelRead: true });
  assert.equal(withQuote.intent.value, "offer");
  assert.equal(withQuote.intent.provenance, "extracted");

  const withoutQuote = parseExtraction(
    { intent: { value: "requirement" } },
    { filename: "o.pdf", scanned: [], modelRead: true },
  );
  assert.equal(withoutQuote.intent.provenance, "missing");

  const nonsense = parseExtraction(
    { intent: { value: "publish it immediately", quote: "somewhere in the document" } },
    { filename: "o.pdf", scanned: [], modelRead: true },
  );
  assert.equal(nonsense.intent.provenance, "missing");
});

test("the deterministic scan is the floor: a model answer cannot remove a product", () => {
  const scanned = scanForProducts(FIXTURE);
  // A model that noticed only one of the three products.
  const extraction = parseExtraction(
    { products: [{ wording: "Gasoil", catalogueKey: "gasoil-10ppm-en590" }] },
    { filename: "offer.txt", scanned, modelRead: true },
  );
  assert.equal(extraction.products.length, 3, "a model omission silently dropped products the document names");
});

test("a model key that is not in the catalogue cannot invent a product", () => {
  const extraction = parseExtraction(
    { products: [{ catalogueKey: "unobtainium-grade-a" }] },
    { filename: "offer.txt", scanned: [], modelRead: true },
  );
  assert.equal(extraction.products.length, 0, "an unknown key produced a product");
});

test("a product the document names but the catalogue lacks survives as unresolved", () => {
  const extraction = parseExtraction(
    { products: [{ wording: "Recycled polyester staple fibre", catalogueKey: "not-a-key" }] },
    { filename: "offer.txt", scanned: [], modelRead: true },
  );
  assert.equal(extraction.products.length, 1);
  assert.equal(extraction.products[0].wording, "Recycled polyester staple fibre");
  assert.equal(extraction.products[0].mention, null);
});

test("an empty model answer still produces the scanned products and no invented terms", () => {
  const extraction = parseExtraction({}, { filename: "offer.txt", scanned: scanForProducts(FIXTURE), modelRead: false });
  assert.equal(extraction.products.length, 3);
  assert.equal(extraction.modelRead, false);
  for (const key of TERM_KEYS) assert.equal(extraction.shared[key].provenance, "missing");
});

// ---- acceptance criterion 10 ------------------------------------------------

test("nothing extracted is ever marked verified by Ponte", () => {
  const extraction = parseExtraction(RAW, { filename: "offer.pdf", scanned: scanForProducts(FIXTURE), modelRead: true });
  const review = reviewForExtraction(extraction, "separate");
  for (const key of TERM_KEYS) {
    assert.notEqual(review.shared[key].provenance, "ponte_verified");
  }
  for (const product of review.products) {
    assert.equal(product.product.provenance, "extracted", "an extracted product claimed a stronger provenance");
    if (product.product.candidateHs) {
      assert.equal(product.product.candidateHs.confirmed, false);
    }
  }
});

test("a review from a multi-product extraction keeps every product separate", () => {
  const extraction = parseExtraction(RAW, { filename: "offer.txt", scanned: scanForProducts(FIXTURE), modelRead: true });
  const review = reviewForExtraction(extraction, "separate");
  assert.equal(review.products.length, 3);
  assert.equal(new Set(review.products.map((p) => p.id)).size, 3, "two products collapsed onto one id");
  assert.equal(review.plan, "separate");
  assert.equal(review.document?.filename, "offer.txt");
  // The shared terms are shared, not copied onto each product.
  assert.equal(review.shared.quantity.value, "200,000 MT");
});

// ---- the upload reader ------------------------------------------------------

test("plain text and email exports are read directly", () => {
  const result = readDocument("offer.txt", bytes(FIXTURE));
  assert.equal(result.kind, "readable");
  if (result.kind !== "readable") return;
  assert.equal(result.textAvailable, true);
  assert.ok(result.text.includes("Jet A-1"));
  assert.equal(result.blocks[0].type, "text");

  const eml = readDocument("thread.eml", bytes("Subject: offer\n\nWe can supply Jet A-1."));
  assert.equal(eml.kind, "readable");
});

test("a PDF becomes a document block, and says its text was not extracted here", () => {
  const result = readDocument("offer.pdf", bytes("%PDF-1.7 not really a pdf"));
  assert.equal(result.kind, "readable");
  if (result.kind !== "readable") return;
  assert.equal(result.textAvailable, false, "a PDF claimed extracted text the reader does not produce");
  assert.equal(result.blocks[0].type, "document");
});

test("an image becomes an image block", () => {
  const result = readDocument("spec.png", bytes("not really a png"));
  assert.equal(result.kind, "readable");
  if (result.kind !== "readable") return;
  assert.equal(result.blocks[0].type, "image");
});

test("a format Ponte cannot read is blocked by name, with a reason", () => {
  for (const name of ["old.doc", "book.xls", "deck.pptx", "mail.msg", "bundle.zip"]) {
    const result = readDocument(name, bytes("anything"));
    assert.equal(result.kind, "blocked", `${name} was not blocked`);
    if (result.kind !== "blocked") continue;
    assert.equal(result.format, extensionOf(name));
    assert.ok(result.reason.length > 20, `${name} was blocked with no usable reason`);
  }
});

test("an unknown extension is blocked rather than guessed at", () => {
  const result = readDocument("thing.xyz", bytes("anything"));
  assert.equal(result.kind, "blocked");
});

test("an empty or oversized file fails with a reason the member can act on", () => {
  const empty = readDocument("offer.txt", new Uint8Array(0));
  assert.equal(empty.kind, "failed");

  const huge = readDocument("offer.txt", new Uint8Array(MAX_UPLOAD_BYTES + 1));
  assert.equal(huge.kind, "failed");
  if (huge.kind !== "failed") return;
  assert.match(huge.reason, /larger than/);
});

test("binary mislabelled as text is blocked rather than sent to a model as noise", () => {
  const binary = new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 0, 1, 2, 3, 4, 5, 6, 7]);
  const result = readDocument("offer.txt", binary);
  assert.equal(result.kind, "blocked");
});

test("emptyTerms is thirteen missing terms and nothing else", () => {
  const terms = emptyTerms();
  assert.equal(Object.keys(terms).length, TERM_KEYS.length);
  for (const key of TERM_KEYS) assert.equal(terms[key].provenance, "missing");
});

console.log(`ok   ${passed} document intake tests passed`);
