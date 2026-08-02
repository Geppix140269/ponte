// The credible-interest boundary, and the family separation it must preserve.
//
// Run: npx tsx lib/deal-room/__tests__/interest.test.ts
//
// Most of these assertions are negative. The product contract's rule is about
// what must NOT create a room - "a public Market Signal, search result,
// expression of curiosity or incomplete draft" - so a test suite that only
// proved the happy path would be testing the wrong half.

import assert from "node:assert/strict";
import { assessCredibleInterest, dealSnapshot, type DealFacts, type InterestFacts } from "../interest";

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

const EMPTY: DealFacts = {
  id: "deal-1",
  status: "approved",
  marketFamily: null,
  marketIntent: null,
  product: null,
  ownerProfileId: "owner",
  validUntil: null,
  withdrawnAt: null,
  quantity: null,
  unit: null,
  incoterm: null,
  originCountry: null,
  destinationCountry: null,
  serviceCategoryKey: null,
  coverageScopeKey: null,
  distributionPartnerTypeKey: null,
  territoryCodes: null,
  productSectorKey: null,
};

const PRODUCTS: DealFacts = {
  ...EMPTY,
  marketFamily: "products",
  marketIntent: "offer_product",
  product: "Refined cane sugar",
  quantity: 500,
  unit: "MT",
  incoterm: "CIF",
  originCountry: "BR",
  destinationCountry: "ES",
};

const SERVICES: DealFacts = {
  ...EMPTY,
  marketFamily: "services",
  marketIntent: "offer_trade_service",
  serviceCategoryKey: "freight_forwarding",
  coverageScopeKey: "europe_south_america",
};

const DISTRIBUTION: DealFacts = {
  ...EMPTY,
  marketFamily: "distribution",
  marketIntent: "seek_distribution_partner",
  distributionPartnerTypeKey: "importer_distributor",
  productSectorKey: "food_and_beverage",
  territoryCodes: ["ES", "PT"],
};

const INTEREST: InterestFacts = {
  route: "accepted_introduction",
  interestedParty: "Iberia Importaciones SL",
  role: "Buyer",
  statedObjective: "Source 500 MT of refined cane sugar for Q4 delivery into Valencia.",
  counterpartyProfileId: "counterparty",
};

// ---------------------------------------------------------------------------
// The happy path, once per family
// ---------------------------------------------------------------------------

for (const [name, deal] of [
  ["products", PRODUCTS],
  ["services", SERVICES],
  ["distribution", DISTRIBUTION],
] as const) {
  test(`${name}: a complete published Deal with real interest is eligible`, () => {
    const result = assessCredibleInterest(deal, INTEREST);
    assert.equal(result.eligible, true, result.blockers.map((b) => b.message).join("; "));
    assert.equal(result.scope?.family, name);
    assert.ok(result.scope?.subject);
  });
}

// ---------------------------------------------------------------------------
// The negatives the product contract names
// ---------------------------------------------------------------------------

test("an unpublished draft cannot create a room", () => {
  const result = assessCredibleInterest({ ...PRODUCTS, status: "draft" }, INTEREST);
  assert.equal(result.eligible, false);
  assert.ok(result.blockers.some((b) => b.code === "deal_not_published"));
});

test("a withdrawn Deal cannot create a room", () => {
  const result = assessCredibleInterest({ ...PRODUCTS, withdrawnAt: "2026-07-01T00:00:00Z" }, INTEREST);
  assert.ok(result.blockers.some((b) => b.code === "deal_withdrawn"));
});

test("an expired Deal cannot create a room", () => {
  const result = assessCredibleInterest({ ...PRODUCTS, validUntil: "2026-01-01" }, INTEREST);
  assert.ok(result.blockers.some((b) => b.code === "deal_expired"));
});

test("curiosity with no stated objective cannot create a room", () => {
  const result = assessCredibleInterest(PRODUCTS, { ...INTEREST, statedObjective: "   " });
  assert.equal(result.eligible, false);
  assert.ok(result.blockers.some((b) => b.code === "no_objective"));
});

test("no identified counterparty means there is nobody to invite", () => {
  const result = assessCredibleInterest(PRODUCTS, { ...INTEREST, counterpartyProfileId: null });
  assert.ok(result.blockers.some((b) => b.code === "no_counterparty"));
});

test("a member cannot open a room against themselves", () => {
  const result = assessCredibleInterest(PRODUCTS, { ...INTEREST, counterpartyProfileId: "owner" });
  assert.ok(result.blockers.some((b) => b.code === "self_counterparty"));
});

test("a Deal with no family cannot resolve a procedure", () => {
  const result = assessCredibleInterest({ ...PRODUCTS, marketFamily: null }, INTEREST);
  assert.ok(result.blockers.some((b) => b.code === "no_family"));
  assert.equal(result.scope, null);
});

test("every blocker is returned, not just the first", () => {
  const result = assessCredibleInterest({ ...EMPTY, status: "draft" }, { ...INTEREST, counterpartyProfileId: null });
  assert.ok(result.blockers.length >= 3, `expected several blockers, got ${result.blockers.length}`);
});

// ---------------------------------------------------------------------------
// ADR-0014: no family is judged by another family's facts
// ---------------------------------------------------------------------------

test("a services Deal is never blocked for a missing quantity", () => {
  const result = assessCredibleInterest(SERVICES, INTEREST);
  assert.equal(result.eligible, true);
  const text = JSON.stringify(result.blockers).toLowerCase();
  for (const word of ["quantity", "incoterm", "hs code", "packaging"]) {
    assert.ok(!text.includes(word), `a services Deal was assessed against '${word}'`);
  }
});

test("a distribution Deal is never blocked for a missing quantity or Incoterm", () => {
  const result = assessCredibleInterest(DISTRIBUTION, INTEREST);
  assert.equal(result.eligible, true);
  const text = JSON.stringify(result.blockers).toLowerCase();
  for (const word of ["quantity", "incoterm", "hs code"]) {
    assert.ok(!text.includes(word), `a distribution Deal was assessed against '${word}'`);
  }
});

test("a services Deal missing its own facts IS blocked, on its own terms", () => {
  const result = assessCredibleInterest({ ...SERVICES, serviceCategoryKey: null }, INTEREST);
  assert.equal(result.eligible, false);
  assert.ok(result.blockers.some((b) => b.code === "services_no_category"));
});

test("a distribution Deal missing a territory IS blocked", () => {
  const result = assessCredibleInterest({ ...DISTRIBUTION, territoryCodes: [] }, INTEREST);
  assert.ok(result.blockers.some((b) => b.code === "distribution_no_territory"));
});

test("a products Deal missing a quantity IS blocked", () => {
  const result = assessCredibleInterest({ ...PRODUCTS, quantity: null }, INTEREST);
  assert.ok(result.blockers.some((b) => b.code === "products_no_quantity"));
});

// ---------------------------------------------------------------------------
// The snapshot: the room's immutable copy of the Deal
// ---------------------------------------------------------------------------

test("a services snapshot has no product keys at all, not even null ones", () => {
  const snapshot = dealSnapshot(SERVICES, "services");
  for (const key of ["quantity", "unit", "incoterm", "product", "origin_country", "destination_country"]) {
    assert.ok(
      !(key in snapshot),
      `'${key}' is present in a services snapshot. A null key still lets a reader print "Quantity: not stated".`,
    );
  }
});

test("a distribution snapshot has no product keys", () => {
  const snapshot = dealSnapshot(DISTRIBUTION, "distribution");
  for (const key of ["quantity", "unit", "incoterm", "product"]) {
    assert.ok(!(key in snapshot), `'${key}' is present in a distribution snapshot`);
  }
});

test("a products snapshot keeps the product facts", () => {
  const snapshot = dealSnapshot(PRODUCTS, "products");
  assert.equal(snapshot.quantity, 500);
  assert.equal(snapshot.incoterm, "CIF");
});

test("every snapshot carries the deal id, family and subject", () => {
  for (const [deal, family] of [
    [PRODUCTS, "products"],
    [SERVICES, "services"],
    [DISTRIBUTION, "distribution"],
  ] as const) {
    const snapshot = dealSnapshot(deal, family);
    assert.equal(snapshot.deal_id, "deal-1");
    assert.equal(snapshot.market_family, family);
    assert.ok(snapshot.subject);
  }
});

// ---------------------------------------------------------------------------
// A stored family this build does not recognise must not end the render
//
// Found by the DECISION-27 human check on PR #225 on 2 August 2026.
// `/deal-rooms/propose` answered "An error occurred in the Server Components
// render" for a signed-in member. The throw was:
//
//     REQUIRED_BY_FAMILY[deal.marketFamily] is not iterable
//
// `DealFacts.marketFamily` is typed `MarketFamily | null`, and every caller
// that builds one from a database row does it with a CAST rather than a check.
// A cast is a claim, not a validation, so whatever the column actually holds
// arrives here wearing a type it may not have. Indexing a three-key map with
// it gives `undefined`, and `for (const x of undefined)` ends the render.
//
// Why nothing caught it: invisible signed out, because the query returns no
// rows and a different branch renders. Invisible in CI, for the same reason.
// Invisible locally, because there is no development database (issue #84), so
// there is no session and there are no rows. Only a person, signed in, against
// a real deployment, could see it - which is the argument for DECISION-27,
// and it was made in the first minute of the first check.
// ---------------------------------------------------------------------------

test("an unrecognised stored family is a blocker, never a throw", () => {
  // Plausible real values: an older taxonomy, a hand-edited row, an import.
  for (const family of ["goods", "trade_services", "product", "PRODUCTS", "services "]) {
    const deal = { ...PRODUCTS, marketFamily: family } as unknown as DealFacts;
    let result: ReturnType<typeof assessCredibleInterest> | null = null;
    assert.doesNotThrow(() => {
      result = assessCredibleInterest(deal, INTEREST);
    }, `a stored family of "${family}" still ends the render`);

    const outcome = result as unknown as ReturnType<typeof assessCredibleInterest>;
    const codes = outcome.blockers.map((b) => b.code);
    assert.ok(codes.includes("unknown_family"), `"${family}" produced no unknown_family blocker`);
    assert.equal(outcome.eligible, false, `"${family}" was judged eligible`);
    // Scope must stay null: `templateFor` indexes another family-keyed map with
    // it, so a scope here would simply move the same crash one line down.
    assert.equal(outcome.scope, null, `"${family}" produced a scope`);
  }
});

test("unknown_family is distinct from no_family, because the causes differ", () => {
  // Absent means the record predates the family entrances and is product
  // shaped, which is ordinary. Unrecognised means a data-integrity problem.
  // One code for both would hide the second behind the first's routine
  // incomplete-record message.
  const absent = assessCredibleInterest({ ...PRODUCTS, marketFamily: null }, INTEREST);
  const codes = absent.blockers.map((b) => b.code);
  assert.ok(codes.includes("no_family"), "an absent family lost its own blocker");
  assert.ok(!codes.includes("unknown_family"), "an absent family is being reported as unrecognised");
});

test("the guard changes nothing for the three real families", () => {
  for (const deal of [PRODUCTS, SERVICES, DISTRIBUTION]) {
    const codes = assessCredibleInterest(deal, INTEREST).blockers.map((b) => b.code);
    assert.ok(!codes.includes("unknown_family"), `${deal.marketFamily} is being treated as unrecognised`);
  }
});

console.log(`ok   deal-room interest: ${passed} assertions passed`);
