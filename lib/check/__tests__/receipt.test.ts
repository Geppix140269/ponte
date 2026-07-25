// The evidence receipt (K07) must state dated, source-named evidence and never
// a score or a "verified" badge, and must distinguish "unavailable" (source not
// reached) from "not confirmed" (source reached, no record). It must also never
// claim beneficial ownership.
//
// Run: npx tsx lib/check/__tests__/receipt.test.ts

import assert from "node:assert/strict";
import { buildReceipt } from "../receipt";
import type { VerificationCase } from "@/lib/verification/decision-notes";

const tests: { name: string; fn: () => void }[] = [];
function test(name: string, fn: () => void): void {
  tests.push({ name, fn });
}

const CONFIRMED: VerificationCase = {
  subject_name: "Cosan Alimentos S.A.",
  subject_country: "BR",
  registry: {
    source: "opencorporates",
    available: true,
    status: "active",
    companyName: "Cosan Alimentos S.A.",
    regNumber: "12345678",
    checkedAt: "2026-07-21T14:57:46Z",
  },
  vies: { available: true, valid: true, vatNumber: "BR123", checkedAt: "2026-07-21T14:57:50Z" },
  sanctions_hits: { clean: true, strongCount: 0, screened: ["OFAC_SDN", "EU_CFSL", "UN_SC", "UK_OFSI"] },
};

test("names each source and dates each check", () => {
  const r = buildReceipt(CONFIRMED);
  const registry = r.checks.find((c) => c.key === "registry")!;
  assert.equal(registry.source, "OpenCorporates");
  assert.equal(registry.checkedOn, "21 July 2026");
  assert.equal(registry.result, "confirmed");
  assert.equal(r.checkedOn, "21 July 2026");
  assert.ok(r.sources.includes("OFAC SDN"), "names the sanctions lists screened");
});

test("distinguishes unavailable (not reached) from not_confirmed (reached, no record)", () => {
  const unavailable = buildReceipt({
    subject_name: "X Ltd",
    registry: { source: "companies_house", available: false, reason: "timeout", checkedAt: "2026-07-21T00:00:00Z" },
  });
  assert.equal(unavailable.checks.find((c) => c.key === "registry")!.result, "unavailable");

  const notConfirmed = buildReceipt({
    subject_name: "X Ltd",
    registry: { source: "companies_house", available: true, status: "not_found", checkedAt: "2026-07-21T00:00:00Z" },
  });
  assert.equal(notConfirmed.checks.find((c) => c.key === "registry")!.result, "not_confirmed");
});

test("screens directors/officers, never claims beneficial ownership", () => {
  const r = buildReceipt(CONFIRMED);
  const sanctions = r.checks.find((c) => c.key === "sanctions")!;
  assert.match(sanctions.label, /directors\/officers/i);
  assert.doesNotMatch(sanctions.label, /beneficial owner/i);
  assert.ok(
    r.unknowns.some((u) => /beneficial ownership was not established/i.test(u)),
    "the unknowns section states beneficial ownership was not established",
  );
});

test("always lists what remains unknown, including the not-a-guarantee line", () => {
  const r = buildReceipt(CONFIRMED);
  assert.ok(r.unknowns.length >= 1);
  assert.ok(r.unknowns.some((u) => /not a guarantee/i.test(u)));
});

test("never emits a numeric score or a 'verified' badge", () => {
  const blob = JSON.stringify(buildReceipt(CONFIRMED));
  // No generic "verified" badge language anywhere in the receipt.
  assert.doesNotMatch(blob, /verified/i);
  // No score/percentage/rating field or value.
  assert.doesNotMatch(blob, /"score"|"rating"|"trust[_-]?score"|\d+\s*%|\d+\s*\/\s*100/i);
});

let passed = 0;
for (const t of tests) {
  try {
    t.fn();
    passed++;
  } catch (err) {
    console.error(`FAIL  ${t.name}`);
    console.error(`      ${(err as Error).message}`);
    process.exitCode = 1;
  }
}
console.log(`\n${passed}/${tests.length} passed`);
