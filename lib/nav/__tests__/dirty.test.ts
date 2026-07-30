// When does leaving the Structure composer risk losing real work?
//
// Run: npx tsx lib/nav/__tests__/dirty.test.ts
//
// The dialog must appear only when it would save the member from a real loss,
// and never as a reflex (brief section 4: "Do not show warnings
// unnecessarily"). So every case below is one of two kinds: an empty-or-just-
// entered draft that must read CLEAN, or a draft carrying one real answer that
// must read DIRTY.

import assert from "node:assert/strict";
import { emptyDraft, type StructureDraft } from "../../structure/draft";
import { structureDirty } from "../dirty";

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

const with_ = (patch: Partial<StructureDraft>): StructureDraft => ({ ...emptyDraft(), ...patch });

test("an empty draft is clean", () => {
  assert.equal(structureDirty(emptyDraft()), false);
});

test("choosing only a family and intent is not yet dirty", () => {
  // The entrance is one tap and is trivially redone; it is not work to mourn.
  assert.equal(
    structureDirty(with_({ canonical: { family: "products", intent: "offer_product" }, intent: "offer" })),
    false,
  );
});

test("a resolved product makes it dirty", () => {
  assert.equal(structureDirty(with_({ product: "EN 590 diesel" })), true);
});

test("a chosen service category makes it dirty", () => {
  assert.equal(structureDirty(with_({ serviceCategory: "freight_forwarding" })), true);
});

test("a chosen distribution partner type makes it dirty", () => {
  assert.equal(structureDirty(with_({ distributionPartnerType: "distributor" })), true);
});

test("a picked quantity mode makes it dirty", () => {
  assert.equal(structureDirty(with_({ quantityMode: "exact", quantity: 1000 })), true);
});

test("typed additional details make it dirty", () => {
  assert.equal(structureDirty(with_({ additionalDetails: "Palletised, food grade." })), true);
});

test("an optional note makes it dirty", () => {
  assert.equal(structureDirty(with_({ note: "Prefer EXW." })), true);
});

test("accepting the declaration makes it dirty", () => {
  assert.equal(structureDirty(with_({ declarationAccepted: true })), true);
});

test("stated service terms make it dirty", () => {
  const base = emptyDraft();
  assert.equal(
    structureDirty({ ...base, serviceTerms: { ...base.serviceTerms, scope: "Regional customs clearance" } }),
    true,
  );
});

test("stated distribution terms make it dirty", () => {
  const base = emptyDraft();
  assert.equal(
    structureDirty({
      ...base,
      distributionTerms: { ...base.distributionTerms, objective: "Enter the DACH market" },
    }),
    true,
  );
});

test("whitespace-only text is not dirty", () => {
  assert.equal(structureDirty(with_({ additionalDetails: "   ", note: "\n\t" })), false);
});

if (process.exitCode) {
  console.error(`\ndirty: ${passed} passed, then a failure`);
} else {
  console.log(`ok   nav/dirty (${passed} assertions)`);
}
