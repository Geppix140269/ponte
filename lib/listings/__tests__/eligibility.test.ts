// Automated publication eligibility: what publishes, what does not, and why.
//
// Run: npx tsx lib/listings/__tests__/eligibility.test.ts
//
// The load-bearing tests here are the family ones. The failure the brief names
// by name is forcing product rules onto a trade service or a distribution
// listing: an HS classification and a shipped quantity are facts a service does
// not have, and demanding them blocks a legitimate member from publishing while
// inviting an invented answer.

import assert from "node:assert/strict";
import {
  evaluateListing, outcomeStatus, completenessBand, familyOf,
  DECLARATION_VERSION, type EligibilityListing, type EligibilityContext,
} from "../eligibility";
import { runSafetyChecks, flagsBlockPublication } from "../safety";
import { canTransition, isMemberWritableStatus, memberStatusLabel } from "../status";
import { meetsMemberBusinessFloor } from "../../verification/level";

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

/** A submitter whose member-business verification is current and clean. */
const VERIFIED: EligibilityContext = {
  submitter: {
    verificationLevel: "company_verified",
    business_verification_id: "v-1",
    verification: {
      purpose: "member_business",
      status: "verified",
      sanctions_hits: { clean: true, strongCount: 0 },
    },
  },
  now: Date.parse("2026-07-28T00:00:00Z"),
};

/** A complete product listing from a verified member. */
function productListing(over: Partial<EligibilityListing> = {}): EligibilityListing {
  return {
    type: "offer",
    market_family: "products",
    product: "Refined sugar ICUMSA 45",
    details: "Supplier offer for refined sugar.",
    quantity_mode: "exact",
    quantity: 25000,
    unit: "MT",
    frequency: "Monthly",
    payment_terms: "LC at sight",
    submitter_role: "Producer",
    origin: "Brazil",
    // ADR-0026 promoted the delivery basis into the minimum for products.
    incoterm: "FOB",
    validity_type: "standing",
    valid_until: null,
    desk_version: { qualification: "Confirmed by the member.", limitations: "Not independently verified." },
    declaration_accepted_at: "2026-07-28T00:00:00Z",
    declaration_version: DECLARATION_VERSION,
    ...over,
  } as EligibilityListing;
}

// ---- the normal path -------------------------------------------------------

test("a complete listing from a verified member publishes with nobody approving it", () => {
  const r = evaluateListing(productListing(), VERIFIED);
  assert.deepEqual(r.blockingIssues.map((i) => i.code), []);
  assert.equal(r.publishable, true);
  assert.equal(outcomeStatus(r), "approved");
});

test("a publishable listing still carries recommendations that do not block it", () => {
  const r = evaluateListing(productListing(), VERIFIED);
  assert.ok(r.recommendations.length > 0, "an incomplete-but-valid listing has room to improve");
  assert.equal(r.publishable, true, "a recommendation must never block publication");
});

// ---- incompleteness --------------------------------------------------------

test("an incomplete listing does not publish and names the exact field", () => {
  const r = evaluateListing(productListing({ payment_terms: null }), VERIFIED);
  assert.equal(r.publishable, false);
  assert.equal(outcomeStatus(r), "needs_information");
  const codes = r.blockingIssues.map((i) => i.code);
  assert.ok(codes.includes("missing_payment_terms"), `expected the payment field, got ${codes}`);
  // Every blocking issue says what to do. "Validation failed" is banned.
  for (const issue of r.blockingIssues) {
    assert.ok(issue.message.length > 15, `issue ${issue.code} must carry an actionable sentence`);
    assert.ok(!/failed validation/i.test(issue.message));
  }
});

test("a quantity that is on request is a complete answer, not a gap", () => {
  const r = evaluateListing(
    productListing({ quantity_mode: "on_request", quantity: null, unit: null }),
    VERIFIED,
  );
  assert.equal(r.publishable, true, "a member who has not fixed a figure may still publish");
});

test("an inverted quantity range blocks publication", () => {
  const r = evaluateListing(
    productListing({ quantity_mode: "range", quantity: null, quantity_min: 1000, quantity_max: 500 }),
    VERIFIED,
  );
  assert.equal(r.publishable, false);
  assert.ok(r.blockingIssues.some((i) => i.code === "quantity_range_invalid"));
});

test("an extracted quantity must be confirmed by the member before it publishes", () => {
  // Extraction is not a statement by anybody until the person responsible for
  // the listing says it is.
  const r = evaluateListing(
    productListing({ quantity_extracted: true, quantity_confirmed_at: null }),
    VERIFIED,
  );
  assert.equal(r.publishable, false);
  assert.ok(r.blockingIssues.some((i) => i.code === "extracted_quantity_unconfirmed"));

  const confirmed = evaluateListing(
    productListing({ quantity_extracted: true, quantity_confirmed_at: "2026-07-28T00:00:00Z" }),
    VERIFIED,
  );
  assert.equal(confirmed.publishable, true);
});

test("the member declaration is required before Ponte publishes on their behalf", () => {
  const r = evaluateListing(productListing({ declaration_accepted_at: null }), VERIFIED);
  assert.equal(r.publishable, false);
  assert.ok(r.blockingIssues.some((i) => i.code === "declaration_required"));
});

// ---- verification stays blocking (owner decision, 28 July 2026) ------------

test("an unverified member does not publish, and is routed to verification", () => {
  const r = evaluateListing(productListing(), {
    ...VERIFIED,
    submitter: { verificationLevel: "unverified", business_verification_id: null, verification: null },
  });
  assert.equal(r.publishable, false);
  const issue = r.blockingIssues.find((i) => i.code === "business_verification_required");
  assert.ok(issue, "an unverified member must be told what to do about it");
  assert.equal(issue?.field, "verification");
});

test("a suspended verification does not publish", () => {
  const r = evaluateListing(productListing(), {
    ...VERIFIED,
    submitter: {
      verificationLevel: "identity_verified",
      business_verification_id: "v-1",
      verification: { purpose: "member_business", status: "review", sanctions_hits: { clean: true, strongCount: 0 } },
    },
  });
  assert.equal(r.publishable, false);
  assert.ok(r.blockingIssues.some((i) => i.code === "business_verification_not_current"));
});

// ---- family conditionality -------------------------------------------------

test("a trade service is not asked for a quantity, a unit or an HS code", () => {
  const service = {
    type: "service",
    market_family: "trade_services",
    product: "Customs brokerage, EU inbound",
    details: "Customs clearance and duty management for EU inbound shipments.",
    payment_terms: "Net 30",
    submitter_role: "Service provider",
    origin: "Netherlands",
    destination: "Germany",
    validity_type: "standing",
    valid_until: null,
    desk_version: { qualification: "Stated by the member.", limitations: "Not independently verified." },
    declaration_accepted_at: "2026-07-28T00:00:00Z",
  } as EligibilityListing;

  const r = evaluateListing(service, VERIFIED);
  const codes = r.blockingIssues.map((i) => i.code);
  for (const forbidden of ["missing_quantity", "missing_quantity_basis", "missing_unit", "missing_frequency"]) {
    assert.ok(!codes.includes(forbidden), `a service must never be blocked on ${forbidden}`);
  }
  assert.equal(r.publishable, true, `service should publish, blocked on: ${codes}`);
});

test("a distribution listing uses its own requirements", () => {
  const distribution = {
    type: "offer",
    market_family: "distribution",
    product: "FMCG distribution, Iberia",
    details: "Offering distribution and market representation across Spain and Portugal.",
    payment_terms: "Commission, to be agreed",
    submitter_role: "Distributor",
    origin: "Spain",
    validity_type: "standing",
    valid_until: null,
    desk_version: { qualification: "Stated by the member.", limitations: "Not independently verified." },
    declaration_accepted_at: "2026-07-28T00:00:00Z",
  } as EligibilityListing;

  const r = evaluateListing(distribution, VERIFIED);
  const codes = r.blockingIssues.map((i) => i.code);
  assert.ok(!codes.some((c) => c.includes("quantity")), `no quantity rule applies: ${codes}`);
  assert.equal(r.publishable, true, `distribution should publish, blocked on: ${codes}`);
});

test("a legacy row with no family is read from its legacy type", () => {
  assert.equal(familyOf({ type: "service" }), "trade_services");
  assert.equal(familyOf({ type: "offer" }), "products");
  assert.equal(familyOf({ market_family: "distribution", type: "offer" }), "distribution");
});

// ---- safety ----------------------------------------------------------------

test("a restricted term holds the listing rather than publishing it", () => {
  const r = evaluateListing(
    productListing({ product: "Ammunition casings", details: "Offer of ammunition casings." }),
    VERIFIED,
  );
  assert.equal(r.publishable, false);
  assert.equal(outcomeStatus(r), "flagged");
  assert.ok(r.flags.some((f) => f.code === "restricted_goods" && f.severity === "high"));
});

test("a flag outranks an incomplete record", () => {
  // Both flagged and short of a field is a case for a person, not a form.
  const r = evaluateListing(
    productListing({ product: "Ivory carvings", payment_terms: null }),
    VERIFIED,
  );
  assert.equal(outcomeStatus(r), "flagged");
});

test("a word boundary stops Ivory Coast matching ivory", () => {
  const flags = runSafetyChecks({ product: "Cocoa beans", details: "Ships from Ivory Coast." });
  assert.ok(!flags.some((f) => f.code === "restricted_goods"), "the corridor is not a restricted good");
});

test("a contact detail in the listing text is held as a disclosure bypass", () => {
  const flags = runSafetyChecks({
    product: "Sugar",
    details: "Contact me on trader@example.com for pricing.",
  });
  assert.ok(flags.some((f) => f.code === "contact_bypass"));
  assert.equal(flagsBlockPublication(flags), true);
});

test("a near-duplicate is recorded but does not hold publication", () => {
  const flags = runSafetyChecks({ product: "Sugar", details: "Offer.", duplicateOfRef: "PT-0100" });
  assert.ok(flags.some((f) => f.code === "duplicate_submission"));
  assert.equal(
    flagsBlockPublication(flags), false,
    "holding every near-duplicate for a human rebuilds the queue this work removes",
  );
});

// ---- completeness ----------------------------------------------------------

test("a minimal publishable listing is scored Basic, and that is honest", () => {
  // Publishable and thin are not in tension. The score counts what the member
  // stated; a listing carrying only the required core genuinely is basic, and
  // inflating it so that "published" implies "detailed" would be the exact
  // conflation the band labels exist to avoid.
  // The PROPERTY, not the number. ADR-0026 raised the minimum, which raised
  // the floor score, and the band threshold moved with it. If the minimum ever
  // grows again this fails here rather than quietly telling a member at the
  // floor that their record is Complete.
  const r = evaluateListing(productListing(), VERIFIED);
  assert.equal(r.publishable, true);
  assert.equal(
    completenessBand(r.completenessScore),
    "basic",
    `a minimum-only record banded above basic at ${r.completenessScore}%`,
  );
  assert.ok(r.completenessScore > 0 && r.completenessScore < 100);
});

test("a sparser listing scores lower without becoming unpublishable", () => {
  const sparse = evaluateListing(
    productListing({ key_notes: null, indicative_value_usd: null, hs_code: null }),
    VERIFIED,
  );
  const rich = evaluateListing(
    productListing({ key_notes: "Polarisation 99.8 min.", indicative_value_usd: 12500000, hs_code: "170199", incoterm: "CIF" }),
    VERIFIED,
  );
  assert.ok(rich.completenessScore > sparse.completenessScore);
  assert.equal(sparse.publishable, true);
});

// ---- the lifecycle ---------------------------------------------------------

test("a member cannot move their own listing to a published state", () => {
  assert.equal(canTransition("draft", "approved", "member"), false);
  assert.equal(canTransition("submitted", "approved", "member"), false);
  assert.equal(canTransition("flagged", "approved", "member"), false);
  assert.equal(isMemberWritableStatus("approved"), false);
  assert.equal(isMemberWritableStatus("flagged"), false);
});

test("only a human clears a flag", () => {
  assert.equal(canTransition("flagged", "approved", "system"), false);
  assert.equal(canTransition("flagged", "approved", "admin"), true);
});

test("the validator may publish, and a member may always withdraw", () => {
  assert.equal(canTransition("submitted", "approved", "system"), true);
  assert.equal(canTransition("approved", "withdrawn", "member"), true);
});

test("a member is never shown the raw stored status", () => {
  // `approved` reads as though somebody approved of it. Under automated
  // publication nobody did.
  assert.equal(memberStatusLabel("approved"), "Published");
  assert.equal(memberStatusLabel("needs_information"), "Needs information");
});


// ---- the level floor must fail closed ---------------------------------------

test("the member floor is semantic, and every legacy form fails closed", () => {
  // Two models were wrong here before, in opposite directions. `Number(level) < 2`
  // FAILED OPEN, because `Number("company_verified")` is NaN and `NaN < 2` is
  // false. Requiring a finite number then closed that hole but rejected the real
  // stored values. The vocabulary is semantic now, so both are gone.
  assert.equal(meetsMemberBusinessFloor("company_verified"), true);

  assert.equal(meetsMemberBusinessFloor("identity_verified"), false);
  assert.equal(meetsMemberBusinessFloor("unverified"), false);
  assert.equal(meetsMemberBusinessFloor("verified"), false);
  assert.equal(meetsMemberBusinessFloor(null), false);
  assert.equal(meetsMemberBusinessFloor(undefined), false);
  // The legacy integers, which are exactly what the old writers emitted.
  assert.equal(meetsMemberBusinessFloor(1), false);
  assert.equal(meetsMemberBusinessFloor(2), false);
  assert.equal(meetsMemberBusinessFloor("2"), false);
});

test("the canonical level publishes, and a legacy numeric one does not", () => {
  // This test previously asserted the opposite, under the interim numeric model
  // in which a finite number >= 2 passed and every stored text value failed.
  // The property it protects is unchanged: the level condition must be capable
  // of failing. What changed is which values are real.
  const ok = evaluateListing(productListing(), {
    ...VERIFIED,
    submitter: { ...VERIFIED.submitter, verificationLevel: "company_verified" },
  });
  assert.equal(ok.publishable, true, "company_verified is the floor and must publish");

  for (const legacy of [2, "2", 1, "fully_verified", null]) {
    const r = evaluateListing(productListing(), {
      ...VERIFIED,
      submitter: { ...VERIFIED.submitter, verificationLevel: legacy as never },
    });
    assert.equal(r.publishable, false, `${JSON.stringify(legacy)} must not publish`);
    assert.ok(
      r.blockingIssues.some((i) => i.code === "business_verification_not_current"),
      `${JSON.stringify(legacy)} must fail on the level`,
    );
  }
});

console.log(`listings/eligibility: ${passed} passed`);
