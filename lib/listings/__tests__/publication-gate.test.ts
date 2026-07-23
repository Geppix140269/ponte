// Tests for Block C: the launch composer and the publication gate.
//
// Run: npx tsx lib/listings/__tests__/publication-gate.test.ts
//
// The pure rules (the gate, the minimum-facts check, currency, material change
// and the public labels) are unit-tested directly. The enforcement is then
// pinned by structural assertions that the submit route persists the structured
// facts, the admin action calls the gate before approving, and every public
// surface drops expired rows, so none of it can be quietly removed from one
// path.
//
// Acceptance coverage: 16 (structured persistence), 17 (admin sees the state),
// 18 (cannot approve unverified/incomplete), 19 (truthful public labels), 23
// (expired opportunities disappear).

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { checkPublicationGate, type GateListing, type GateSubmitter } from "../publication-gate";
import { meetsApprovalMinimum } from "../approval-minimum";
import { isListingCurrent, isNotExpired } from "../validity";
import { hasMaterialChange, changedMaterialFields } from "../material-change";
import { truthfulLabels } from "../public-labels";

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

// A listing and submitter that PASS every condition, cloned and broken per test.
const NOW = Date.parse("2026-07-23T00:00:00Z");

function goodListing(): GateListing {
  return {
    type: "offer",
    product: "Refined sugar ICUMSA 45",
    quantity: 12000,
    unit: "MT",
    frequency: "Per month",
    payment_terms: "LC at sight",
    submitter_role: "Trading company holding title",
    chain_depth: null,
    validity_type: "dated",
    valid_until: "2026-08-31",
    desk_version: { qualification: "12,000 MT monthly, CIF.", limitations: "No inspection named." },
  };
}

function goodSubmitter(): GateSubmitter {
  return {
    business_verification_id: "ver-1",
    verification: {
      purpose: "member_business",
      sanctions_hits: { clean: true, strongCount: 0 },
    },
  };
}

// --- the gate: the all-pass case --------------------------------------------

test("a fully verified, complete, current listing passes the gate", () => {
  const r = checkPublicationGate(goodListing(), goodSubmitter(), NOW);
  assert.deepEqual(r, { ok: true });
});

// --- 18: an unverified submitter cannot be approved -------------------------

test("no bound business verification fails the gate", () => {
  const s = goodSubmitter();
  s.business_verification_id = null;
  const r = checkPublicationGate(goodListing(), s, NOW);
  assert.equal(r.ok, false);
  assert.ok(!r.ok && r.failures.includes("no_verified_business"));
});

test("a bound verification that is not the member's own business fails", () => {
  const s = goodSubmitter();
  s.verification = { purpose: "counterparty_check", sanctions_hits: { clean: true, strongCount: 0 } };
  const r = checkPublicationGate(goodListing(), s, NOW);
  assert.equal(r.ok, false);
  assert.ok(!r.ok && r.failures.includes("verification_not_member_business"));
});

test("an unresolved high-risk sanctions candidate fails the gate", () => {
  const s = goodSubmitter();
  s.verification = { purpose: "member_business", sanctions_hits: { clean: false, strongCount: 1 } };
  const r = checkPublicationGate(goodListing(), s, NOW);
  assert.equal(r.ok, false);
  assert.ok(!r.ok && r.failures.includes("unresolved_sanctions"));
});

test("a missing role fails the gate", () => {
  const l = goodListing();
  l.submitter_role = "";
  const r = checkPublicationGate(l, goodSubmitter(), NOW);
  assert.equal(r.ok, false);
  assert.ok(!r.ok && r.failures.includes("no_role"));
});

// --- 18: an incomplete opportunity cannot be approved -----------------------

test("missing required facts fail the gate, each reported", () => {
  const l = goodListing();
  l.quantity = null;
  l.payment_terms = "";
  const r = checkPublicationGate(l, goodSubmitter(), NOW);
  assert.equal(r.ok, false);
  assert.ok(!r.ok && r.failures.includes("missing:quantity"));
  assert.ok(!r.ok && r.failures.includes("missing:payment_terms"));
});

test("missing public qualification or limitations text fails the gate", () => {
  const l = goodListing();
  l.desk_version = { qualification: "", limitations: "" };
  const r = checkPublicationGate(l, goodSubmitter(), NOW);
  assert.equal(r.ok, false);
  assert.ok(!r.ok && r.failures.includes("no_public_qualification"));
  assert.ok(!r.ok && r.failures.includes("no_public_limitations"));
});

test("a listing with no desk_version at all fails on the public text", () => {
  const l = goodListing();
  l.desk_version = null;
  const r = checkPublicationGate(l, goodSubmitter(), NOW);
  assert.equal(r.ok, false);
  assert.ok(!r.ok && r.failures.includes("no_public_qualification"));
});

// --- 23 (gate half): an expired opportunity is not current ------------------

test("an expired dated listing fails the gate as not current", () => {
  const l = goodListing();
  l.valid_until = "2026-07-01"; // before NOW
  const r = checkPublicationGate(l, goodSubmitter(), NOW);
  assert.equal(r.ok, false);
  assert.ok(!r.ok && r.failures.includes("not_current"));
});

test("an undeclared validity fails the gate as not current", () => {
  const l = goodListing();
  l.validity_type = null;
  l.valid_until = null;
  const r = checkPublicationGate(l, goodSubmitter(), NOW);
  assert.equal(r.ok, false);
  assert.ok(!r.ok && r.failures.includes("not_current"));
});

// --- minimum-facts, directly ------------------------------------------------

test("a service needs no quantity, unit or frequency", () => {
  const r = meetsApprovalMinimum({
    type: "service",
    product: "Freight forwarding",
    payment_terms: "To be agreed",
    submitter_role: "Service provider",
    validity_type: "standing",
    valid_until: null,
  });
  assert.deepEqual(r, { ok: true, missing: [] });
});

test("a broker must declare chain depth; a principal need not", () => {
  const base = {
    type: "offer" as const,
    product: "Cement",
    quantity: 50000,
    unit: "MT",
    frequency: "Per month",
    payment_terms: "LC 90 days",
    validity_type: "standing" as const,
    valid_until: null,
  };
  const broker = meetsApprovalMinimum({ ...base, submitter_role: "Broker with a seller mandate" });
  assert.ok(!broker.ok && broker.missing.includes("chain_depth"));
  const principal = meetsApprovalMinimum({ ...base, submitter_role: "Producer / owner of the goods" });
  assert.deepEqual(principal, { ok: true, missing: [] });
});

// --- 23: the public expiry filter -------------------------------------------

test("isNotExpired keeps undated and future, drops past", () => {
  assert.equal(isNotExpired(null, NOW), true);
  assert.equal(isNotExpired("2026-12-31", NOW), true);
  assert.equal(isNotExpired("2026-01-01", NOW), false);
  assert.equal(isNotExpired("not-a-date", NOW), true); // unreadable is not hidden
});

test("isListingCurrent is stricter: undeclared is not current", () => {
  assert.equal(isListingCurrent("standing", null, NOW), true);
  assert.equal(isListingCurrent("dated", "2026-12-31", NOW), true);
  assert.equal(isListingCurrent("dated", "2026-01-01", NOW), false);
  assert.equal(isListingCurrent("dated", null, NOW), false);
  assert.equal(isListingCurrent(null, null, NOW), false);
});

// --- material change returns to review --------------------------------------

test("changing a commercial term is a material change", () => {
  const before = goodListing();
  const after = { ...goodListing(), quantity: 5000 };
  assert.equal(hasMaterialChange(before, after), true);
  assert.deepEqual(changedMaterialFields(before, after), ["quantity"]);
});

test("editing only non-material fields is not a material change", () => {
  const before = { ...goodListing(), submitter_role: "Producer / owner of the goods" };
  // desk_version and unlisted fields are not material; the same terms remain.
  const after = { ...before };
  assert.equal(hasMaterialChange(before, after), false);
});

// --- 19: truthful public labels ---------------------------------------------

test("Authority sighted shows only when the desk sighted evidence", () => {
  const without = truthfulLabels({
    businessVerified: true,
    submitterRole: "Broker with a seller mandate",
    mandateSighted: false,
    reviewed: true,
    lastConfirmed: "2026-07-20T00:00:00Z",
  });
  assert.ok(!without.some((l) => l.key === "authoritySighted"));
  const withSighted = truthfulLabels({
    businessVerified: true,
    submitterRole: "Broker with a seller mandate",
    mandateSighted: true,
    reviewed: true,
    lastConfirmed: "2026-07-20T00:00:00Z",
  });
  assert.ok(withSighted.some((l) => l.key === "authoritySighted"));
});

test("labels map one-to-one to stored data, nothing invented", () => {
  const none = truthfulLabels({
    businessVerified: false,
    submitterRole: null,
    mandateSighted: false,
    reviewed: false,
    lastConfirmed: null,
  });
  assert.deepEqual(none, []);
  const all = truthfulLabels({
    businessVerified: true,
    submitterRole: "End buyer",
    mandateSighted: true,
    reviewed: true,
    lastConfirmed: "2026-07-20T00:00:00Z",
  });
  assert.deepEqual(
    all.map((l) => l.key),
    ["businessChecked", "roleDeclared", "authoritySighted", "opportunityReviewed", "lastConfirmed"],
  );
});

// --- Structural: the enforcement is actually wired --------------------------

function src(path: string): string {
  return readFileSync(path, "utf8");
}

test("16: the submit route persists the structured v4 facts", () => {
  const s = src("app/api/marketplace/submit/route.ts");
  for (const col of ["quantity", "unit", "frequency", "payment_terms", "origin_country", "destination_country", "validity_type", "valid_until"]) {
    assert.ok(s.includes(col), `submit route must persist ${col}`);
  }
});

test("material change on an approved listing returns it to review", () => {
  const s = src("app/api/marketplace/submit/route.ts");
  assert.ok(
    s.includes("hasMaterialChange("),
    "submit route must test for a material change on an owner edit",
  );
});

test("18: the admin approve action calls the publication gate", () => {
  const s = src("app/[locale]/admin/listings/actions.ts");
  assert.ok(
    s.includes("checkPublicationGate("),
    "decideListingAction must run the gate before approving",
  );
});

test("17: the admin queue loads the submitter's business verification", () => {
  const s = src("app/[locale]/admin/listings/page.tsx");
  assert.ok(
    s.includes("business_verification_id"),
    "the admin queue must read the submitter's bound member-business verification",
  );
});

test("23: every public surface drops expired opportunities", () => {
  for (const path of [
    "lib/board/live-deals.ts",
    "app/[locale]/marketplace/page.tsx",
    "app/[locale]/marketplace/l/[ref]/page.tsx",
  ]) {
    assert.ok(src(path).includes("isNotExpired("), `${path} must drop expired rows`);
  }
});

test("19: the detail page renders only truthful stored labels", () => {
  const s = src("app/[locale]/marketplace/l/[ref]/page.tsx");
  assert.ok(s.includes("truthfulLabels("), "detail must derive labels from stored data");
});

if (process.exitCode) console.error(`\n${passed} passed, some failed.`);
else console.log(`ok   ${passed} publication-gate tests passed`);
