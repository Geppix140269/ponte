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
  queueFor,
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
  assert.deepEqual(g, ["quantity", "destination", "incoterm", "payment", "validity", "role", "note"]);
});

test("openGaps drops fields already filled", () => {
  const g = openGaps(draft({ quantityMode: "exact", quantity: 25000, unit: "MT", incoterm: "CIF", role: "buyer" }));
  assert.deepEqual(g, ["destination", "payment", "validity", "note"]);
});

// ---- the end of the route this member actually decides ---------------------
test("a seller is asked where it ships from, never where it goes", () => {
  const q = queueFor("offer");
  assert.ok(q.includes("origin"), "a seller states the origin");
  assert.ok(!q.includes("destination"), "where it goes is the buyer's decision");
  assert.deepEqual(openGaps(draft({ intent: "offer" })), [
    "quantity", "origin", "incoterm", "payment", "validity", "role", "note",
  ]);
});

test("a buyer is asked where it goes, never where it comes from", () => {
  const q = queueFor("requirement");
  assert.ok(q.includes("destination"));
  assert.ok(!q.includes("origin"), "the origin is whoever can supply it");
});

test("a trade service declares both ends of the corridor", () => {
  const q = queueFor("service");
  assert.ok(q.includes("origin") && q.includes("destination"));
});

test("the end that is not asked is never a gap or a blocker", () => {
  const offer = draft({ intent: "offer", quantityMode: "exact", quantity: 25000, unit: "MT", origin: "Argentina" });
  assert.ok(!bucketize(offer).missing.includes("destination"));
  assert.ok(!blockers(offer).some((b) => b.key === "destination"));
});

// ---- buckets ---------------------------------------------------------------
test("bucketize puts known facts in commercial and gaps in missing", () => {
  const b = bucketize(draft({ quantityMode: "exact", quantity: 25000, unit: "MT", incoterm: "CIF" }));
  assert.ok(b.commercial.includes("intent"));
  assert.ok(b.commercial.includes("product"));
  assert.ok(b.commercial.includes("hsCode"));
  assert.ok(b.commercial.includes("quantity"));
  assert.ok(b.commercial.includes("incoterm"));
  assert.ok(b.missing.includes("destination"));
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
  const full = draft({ quantityMode: "exact", quantity: 25000, unit: "MT", incoterm: "CIF", validity: 30, role: "buyer" });
  assert.deepEqual(blockers(full).map((b) => b.key), ["businessVerification"]);
});

// ---- details synthesis (typing never required) -----------------------------
test("synthesiseDetails is non-empty from product+intent alone", () => {
  const d = synthesiseDetails(draft());
  assert.ok(d.length > 0);
  assert.match(d, /Buyer requirement for Refined sugar\./);
});

test("synthesiseDetails includes present facts and omits absent ones, no invention", () => {
  const d = synthesiseDetails(draft({ quantityMode: "exact", quantity: 25000, unit: "MT", frequency: "monthly", incoterm: "CIF" }));
  // The quantity is written with its mode and its recurrence, so the record
  // states the claim the member actually made rather than a bare figure.
  assert.match(d, /Quantity: 25,000 MT per month\./);
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
  const p = toSubmitPayload(draft({ quantityMode: "exact", quantity: 25000, unit: "MT", incoterm: "CIF", validity: 30, role: "buyer" }), OPTS);
  assert.equal(p.type, "requirement");
  assert.equal(p.product, "Refined sugar");
  assert.equal(p.hs_code, "170199");
  assert.equal(p.quantity, 25000);
  assert.equal(p.quantity_mode, "exact");
  assert.equal(p.unit, "MT");
  assert.equal(p.submitter_role, "buyer");
  assert.equal(p.validity_type, "dated");
  assert.equal(p.valid_until, "2026-08-23"); // 2026-07-24 + 30 days
  assert.equal(p.draft, false);
  assert.ok(typeof p.details === "string" && (p.details as string).length > 0);
});

test("a standing validity is a declared horizon with no end date", () => {
  const p = toSubmitPayload(draft({ validity: "standing" }), OPTS);
  assert.equal(p.validity_type, "standing");
  assert.equal(p.valid_until, null);
  assert.match(synthesiseDetails(draft({ validity: "standing" })), /Open until withdrawn\./);
});

test("a half-stated route is written as the half it is, with nothing invented", () => {
  const d = synthesiseDetails(draft({ intent: "offer", origin: "Argentina" }));
  assert.match(d, /Ships from: Argentina\./);
  assert.ok(!/unspecified/.test(d), "no unspecified end is printed as a fact");
  assert.match(synthesiseDetails(draft({ destination: "Italy" })), /Delivered to: Italy\./);
});

test("toSubmitPayload leaves validity undeclared when no pill was chosen", () => {
  const p = toSubmitPayload(draft(), { draft: true, nowIso: OPTS.nowIso });
  assert.equal(p.validity_type, null);
  assert.equal(p.valid_until, null);
  assert.equal(p.draft, true);
});

console.log(`structure/draft: ${passed} passed`);
