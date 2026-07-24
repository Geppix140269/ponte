// Tests for the Structure & Submit draft logic: buckets, the completion queue,
// blockers, and the details synthesis that keeps typing optional.
//
// Run: npx tsx lib/structure/__tests__/draft.test.ts
//
// Pure logic (lib/structure/draft.ts). node:assert, non-zero exit on failure.

import assert from "node:assert/strict";
import {
  emptyDraft,
  openGaps,
  bucketize,
  blockers,
  synthesiseDetails,
  toSubmitPayload,
  type StructureDraft,
} from "../draft";

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

function draft(over: Partial<StructureDraft> = {}): StructureDraft {
  return { ...emptyDraft(), intent: "requirement", product: "Refined sugar", hsCode: "170199", ...over };
}

const OPTS = { draft: false, nowIso: "2026-07-24T00:00:00.000Z" };

// ---- completion queue ------------------------------------------------------
test("openGaps returns unfilled fields in the fixed order", () => {
  const g = openGaps(draft());
  assert.deepEqual(g, ["quantity", "origin", "destination", "incoterm", "payment", "validity", "role", "note"]);
});

test("openGaps drops fields already filled", () => {
  const g = openGaps(draft({ quantity: 25000, incoterm: "CIF", role: "buyer" }));
  assert.deepEqual(g, ["origin", "destination", "payment", "validity", "note"]);
});

// ---- buckets ---------------------------------------------------------------
test("bucketize puts known facts in commercial and gaps in missing", () => {
  const b = bucketize(draft({ quantity: 25000, incoterm: "CIF" }));
  assert.ok(b.commercial.includes("intent"));
  assert.ok(b.commercial.includes("product"));
  assert.ok(b.commercial.includes("hsCode"));
  assert.ok(b.commercial.includes("quantity"));
  assert.ok(b.commercial.includes("incoterm"));
  assert.ok(b.missing.includes("origin"));
  assert.ok(b.missing.includes("role"));
  assert.ok(!b.missing.includes("quantity"));
});

test("bucketize keeps identity private and defers authority to review", () => {
  const b = bucketize(draft());
  assert.deepEqual(b.keptPrivate, ["identity", "exactCompany"]);
  assert.deepEqual(b.evidence, ["tradeAuthority"]);
  assert.deepEqual(bucketize(draft({ intent: "service" })).evidence, ["serviceAuthority"]);
});

// ---- blockers --------------------------------------------------------------
test("blockers lists open decisive facts plus business verification", () => {
  const keys = blockers(draft()).map((b) => b.key);
  assert.ok(keys.includes("quantity"));
  assert.ok(keys.includes("incoterm"));
  assert.ok(keys.includes("validity"));
  assert.ok(keys.includes("role"));
  assert.ok(keys.includes("businessVerification"));
});

test("a fully tapped draft still blocks on business verification only", () => {
  const full = draft({ quantity: 25000, incoterm: "CIF", validityDays: 30, role: "buyer" });
  assert.deepEqual(blockers(full).map((b) => b.key), ["businessVerification"]);
});

// ---- details synthesis (typing never required) -----------------------------
test("synthesiseDetails is non-empty from product+intent alone", () => {
  const d = synthesiseDetails(draft());
  assert.ok(d.length > 0);
  assert.match(d, /Buyer requirement for Refined sugar\./);
});

test("synthesiseDetails includes present facts and omits absent ones, no invention", () => {
  const d = synthesiseDetails(draft({ quantity: 25000, unit: "MT", frequency: "monthly", incoterm: "CIF" }));
  assert.match(d, /Quantity: 25000 MT \(monthly\)\./);
  assert.match(d, /Incoterm: CIF\./);
  assert.ok(!/Route:/.test(d), "no route when origin and destination are absent");
  assert.ok(!/Payment/.test(d), "no payment when absent");
});

test("synthesiseDetails appends the optional note verbatim", () => {
  const d = synthesiseDetails(draft({ note: "Prefer Bureau Veritas inspection." }));
  assert.match(d, /Prefer Bureau Veritas inspection\.$/);
});

test("offer and service change the opening clause", () => {
  assert.match(synthesiseDetails(draft({ intent: "offer" })), /^Supplier offer for/);
  assert.match(synthesiseDetails(draft({ intent: "service" })), /^Trade service offered/);
});

// ---- submit payload --------------------------------------------------------
test("toSubmitPayload maps fields, derives a dated validity, carries details", () => {
  const p = toSubmitPayload(draft({ quantity: 25000, incoterm: "CIF", validityDays: 30, role: "buyer" }), OPTS);
  assert.equal(p.type, "requirement");
  assert.equal(p.product, "Refined sugar");
  assert.equal(p.hs_code, "170199");
  assert.equal(p.quantity, 25000);
  assert.equal(p.submitter_role, "buyer");
  assert.equal(p.validity_type, "dated");
  assert.equal(p.valid_until, "2026-08-23"); // 2026-07-24 + 30 days
  assert.equal(p.draft, false);
  assert.ok(typeof p.details === "string" && (p.details as string).length > 0);
});

test("toSubmitPayload leaves validity undeclared when no pill was chosen", () => {
  const p = toSubmitPayload(draft(), { draft: true, nowIso: OPTS.nowIso });
  assert.equal(p.validity_type, null);
  assert.equal(p.valid_until, null);
  assert.equal(p.draft, true);
});

console.log(`structure/draft: ${passed} passed`);
