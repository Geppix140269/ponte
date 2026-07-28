// The two faults this hotfix repairs, pinned so they cannot return.
//
// Run: npx tsx lib/listings/__tests__/source-integrity.test.ts
//
// Both reached `main` and neither was caught by anything that already existed,
// for the same underlying reason: the code compiled and behaved, so every
// check that looks at behaviour passed. One of them could not even be READ in
// the pull request that introduced it.

import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { runSafetyChecks } from "../safety";
import { synthesiseDetails, emptyDraft, type StructureDraft } from "../../structure/draft";

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

/* ------------------------------------------------------------------ */
/* 1. Exactly one Quantity clause                                      */
/* ------------------------------------------------------------------ */

function draft(over: Partial<StructureDraft> = {}): StructureDraft {
  return {
    ...emptyDraft(),
    intent: "requirement",
    product: "Refined sugar",
    ...over,
  } as StructureDraft;
}

const countQuantityClauses = (s: string): number =>
  (s.match(/Quantity:/g) ?? []).length;

test("a mode-ful quantity produces exactly one Quantity clause", () => {
  // Before this fix the composer path emitted BOTH the mode-aware clause and a
  // raw quantity/unit/frequency concatenation, so every listing built this way
  // stored "Quantity:" twice in its details.
  const d = synthesiseDetails(
    draft({ quantityMode: "exact", quantity: 25000, unit: "MT", frequency: "Monthly" }),
  );
  assert.equal(countQuantityClauses(d), 1, `expected one clause, got: ${d}`);
  assert.match(d, /Quantity: 25,000 MT per month\./);
});

test("a mode-less quantity still produces exactly one Quantity clause", () => {
  // The AI intake route writes quantity, unit and recurrence from the extracted
  // document and never sets a mode. Removing the raw concatenation without a
  // fallback would have silently dropped the quantity from those records.
  const d = synthesiseDetails(draft({ quantity: 1250, unit: "MT", frequency: "One-off" }));
  assert.equal(countQuantityClauses(d), 1, `expected one clause, got: ${d}`);
  assert.match(d, /Quantity: 1,250 MT\./);
});

test("every quantity mode produces exactly one clause, never zero, never two", () => {
  const cases: Partial<StructureDraft>[] = [
    { quantityMode: "exact", quantity: 500, unit: "MT" },
    { quantityMode: "approximate", quantity: 2500, unit: "MT", frequency: "Monthly" },
    { quantityMode: "minimum", quantity: 20, unit: "pallets" },
    { quantityMode: "maximum", quantity: 5000, unit: "MT" },
    { quantityMode: "range", quantityMin: 500, quantityMax: 1000, unit: "MT" },
    { quantityMode: "negotiable" },
    { quantityMode: "on_request" },
  ];
  for (const over of cases) {
    const d = synthesiseDetails(draft(over));
    assert.equal(
      countQuantityClauses(d), 1,
      `mode ${String(over.quantityMode)} produced ${countQuantityClauses(d)}: ${d}`,
    );
  }
});

test("no quantity at all produces no Quantity clause", () => {
  const d = synthesiseDetails(draft());
  assert.equal(countQuantityClauses(d), 0, `expected none, got: ${d}`);
});

/* ------------------------------------------------------------------ */
/* 2. Phrase masking still works                                       */
/* ------------------------------------------------------------------ */

test("Ivory Coast is masked and does not flag as a restricted good", () => {
  // The masking is why this hotfix could not simply delete the character: the
  // false-positive phrase list rewrites "Ivory Coast" before the term scan, and
  // it must still do so now that the filler is a space rather than a NUL.
  const flags = runSafetyChecks({
    product: "Cocoa beans",
    details: "Origin Ivory Coast, shipped FOB Abidjan.",
  });
  assert.ok(
    !flags.some((f) => f.code === "restricted_goods"),
    `a country name must not read as the wildlife product: ${JSON.stringify(flags)}`,
  );
});

test("the genuine restricted term still flags when it is not part of the phrase", () => {
  // The mask must not blind the scanner to a real hit elsewhere in the text.
  const flags = runSafetyChecks({
    product: "Carvings",
    details: "Origin Ivory Coast. Material: ivory.",
  });
  assert.ok(
    flags.some((f) => f.code === "restricted_goods"),
    "masking the country must not mask a separate real occurrence",
  );
});

test("masking preserves length, so offsets and neighbouring words survive", () => {
  // A same-length filler is what keeps a term adjacent to a masked phrase
  // findable. A zero-length replacement would join its neighbours together.
  const flags = runSafetyChecks({
    product: "Goods",
    details: "Ivory Coast ammunition crates.",
  });
  assert.ok(
    flags.some((f) => f.code === "restricted_goods"),
    "a restricted term immediately after a masked phrase must still be found",
  );
});

/* ------------------------------------------------------------------ */
/* 3. No tracked source file carries a literal NUL                     */
/* ------------------------------------------------------------------ */

const SKIP = new Set([".git", "node_modules", ".next", "out", "build", ".netlify", ".email-preview"]);
const TEXT = /\.(ts|tsx|js|mjs|cjs|json|md|css|html|sql|yml|yaml)$/;

function walk(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(entry.name)) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) walk(path, acc);
    else if (TEXT.test(entry.name)) acc.push(path.split("\\").join("/"));
  }
  return acc;
}

test("no tracked source file contains a literal NUL byte", () => {
  // Git classifies a file containing a NUL as binary. `lib/listings/safety.ts`
  // reached main carrying one, so twelve kilobytes of safety logic rendered in
  // the pull request as "Bin 12173 bytes" and could not be reviewed at all.
  // This is the check that would have caught it.
  const offenders: string[] = [];
  for (const file of walk(".")) {
    const buf = readFileSync(file);
    const at = buf.indexOf(0);
    if (at !== -1) offenders.push(`${file} (byte ${at})`);
  }
  assert.deepEqual(offenders, [], `files containing a raw NUL: ${offenders.join(", ")}`);
});

test("safety.ts specifically is text, not binary", () => {
  const buf = readFileSync("lib/listings/safety.ts");
  assert.equal(buf.indexOf(0), -1, "safety.ts must not contain a NUL byte");
  assert.ok(buf.length > 1000, "and must still be the whole module");
});

console.log(`listings/source-integrity: ${passed} passed`);
