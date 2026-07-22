// Tests for the completeness score.
//
// Run: npx tsx lib/writeup/__tests__/completeness.test.ts
//
// No test runner is configured in this project (npm run lint has never worked
// either), and adding one is a separate job. These assert with node:assert and
// exit non-zero, which is enough to gate a build today.

import assert from "node:assert/strict";
import {
  scoreCompleteness,
  meetsWriteupMinimum,
  TOTAL_WEIGHT,
  type DraftForScore,
} from "../completeness";

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

const FULL: DraftForScore = {
  type: "offer",
  product: "Refined sugar ICUMSA 45",
  hs_code: "170199",
  quantity: 12000,
  unit: "MT",
  incoterm: "CIF",
  payment_terms: "LC at sight",
  origin_country: "BR",
  destination_country: "SA",
  details: "A monthly programme of refined cane sugar against a letter of credit.",
  key_notes: "Regular monthly programme, supplied comparable buyers before.",
  submitter_role: "Trading company holding title",
  chain_depth: "Direct to the producer",
  validity_type: "dated",
  valid_until: "2026-08-31",
  flexibility: { price: "fixed", quantity: "negotiable" },
  media_count: 2,
};

test("weights sum to 100, so the score is a percentage and not a coincidence", () => {
  assert.equal(TOTAL_WEIGHT, 100);
});

test("a complete draft scores 100", () => {
  assert.equal(scoreCompleteness(FULL).score, 100);
  assert.equal(scoreCompleteness(FULL).band, "complete");
  assert.deepEqual(scoreCompleteness(FULL).missing, []);
});

test("an empty draft scores 0 and is thin", () => {
  const r = scoreCompleteness({});
  assert.equal(r.score, 0);
  assert.equal(r.band, "thin");
});

test("it is deterministic: the same draft always gives the same number", () => {
  const a = scoreCompleteness(FULL);
  const b = scoreCompleteness({ ...FULL });
  assert.deepEqual(a, b);
});

test("missing fields come back heaviest first, so the nudge is worth taking", () => {
  const r = scoreCompleteness({ type: "offer" });
  assert.equal(r.missing[0], "product");
  assert.equal(r.missing[1], "quantity");
});

test("quantity of zero does not count as declared", () => {
  const withZero = scoreCompleteness({ ...FULL, quantity: 0 });
  assert.ok(withZero.score < 100);
  assert.ok(withZero.missing.includes("quantity"));
});

test("one corridor end scores, both score more", () => {
  const base = { type: "offer", product: "Urea", quantity: 100 };
  const oneEnd = scoreCompleteness({ ...base, destination_country: "IN" });
  const bothEnds = scoreCompleteness({ ...base, origin_country: "AE", destination_country: "IN" });
  assert.ok(bothEnds.score > oneEnd.score);
});

test("a free-text corridor counts, because members type ports not codes", () => {
  const typed = scoreCompleteness({ type: "offer", product: "Urea", quantity: 100, origin: "Jebel Ali" });
  assert.ok(!typed.missing.includes("corridor"));
});

test("an invalid HS code earns nothing, because the shape is not the point", () => {
  assert.ok(scoreCompleteness({ ...FULL, hs_code: "99" }).missing.includes("hs_code"));
  assert.ok(scoreCompleteness({ ...FULL, hs_code: "abcdef" }).missing.includes("hs_code"));
  assert.ok(!scoreCompleteness({ ...FULL, hs_code: "170199" }).missing.includes("hs_code"));
});

test("one flexibility flag is not a declaration, two is", () => {
  const one = scoreCompleteness({ ...FULL, flexibility: { price: "fixed" } });
  assert.ok(one.missing.includes("flexibility"));
  const two = scoreCompleteness({ ...FULL, flexibility: { price: "fixed", incoterm: "open" } });
  assert.ok(!two.missing.includes("flexibility"));
});

test("the score never leaves 0 to 100", () => {
  for (const d of [{}, FULL, { ...FULL, media_count: 99 }, { quantity: -5 }]) {
    const s = scoreCompleteness(d as DraftForScore).score;
    assert.ok(s >= 0 && s <= 100, `score ${s} out of range`);
  }
});

test("photos help but a listing without them still reaches strong", () => {
  const noPhotos = scoreCompleteness({ ...FULL, media_count: 0 });
  assert.ok(noPhotos.score >= 70, `expected strong or better, got ${noPhotos.score}`);
  assert.ok(["strong", "complete"].includes(noPhotos.band));
});

test("the write-up minimum is type, product, quantity and one corridor end", () => {
  assert.equal(meetsWriteupMinimum({}), false);
  assert.equal(meetsWriteupMinimum({ type: "offer", product: "Sugar", quantity: 100 }), false);
  assert.equal(
    meetsWriteupMinimum({ type: "offer", product: "Sugar", quantity: 100, origin: "BR" }),
    true,
  );
  assert.equal(
    meetsWriteupMinimum({ type: "offer", product: "Sugar", quantity: 100, destination_country: "SA" }),
    true,
  );
});

if (process.exitCode) console.error(`\n${passed} passed, some failed.`);
else console.log(`ok   ${passed} completeness tests passed`);
