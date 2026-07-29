// Ponte Integrity: the four prohibitions, enforced rather than asserted.
//
// Run: npx tsx lib/deal-room/__tests__/integrity.test.ts
//
// AI may compare, explain and recommend. It may not label a participant a
// scammer, produce an opaque Trust Score, admit or reject a party
// autonomously, or make a binding commercial decision. Those are the four
// things this file exists to check, and three of them are checked structurally
// - by proving the shape has nowhere to put the answer - rather than by reading
// wording.

import assert from "node:assert/strict";
import { integrityPreflight, invitationIsPermitted, sanctionsPositionFrom, type IntegrityInput } from "../integrity";

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

const BASE: IntegrityInput = {
  organisationName: "Atlantico Comercio Ltda",
  declaredCapacity: null,
  jurisdiction: "BR",
  verificationLevel: "company_verified",
  verificationEvidence: [
    { kind: "company_registry", source: "Junta Comercial", result: "passed", checkedAt: "2026-07-20" },
  ],
  dealOriginCountry: "BR",
  declaredRole: "Seller",
  authorityDeclared: true,
  sanctions: { screened: true, checkedAt: "2026-07-20", source: "Ponte sanctions screening", clean: true, strongCount: 0 },
};

// ---------------------------------------------------------------------------
// Prohibition 2: no Trust Score. Proved structurally.
// ---------------------------------------------------------------------------

test("the result has no score, rating, verdict or confidence field", () => {
  const result = integrityPreflight(BASE);
  const keys = Object.keys(result);
  assert.deepEqual(keys.sort(), ["action", "checked", "declared", "inconsistencies", "limitation", "unproved"]);

  const serialised = JSON.stringify(result).toLowerCase();
  for (const banned of ["trust score", "trustscore", "\"score\"", "\"rating\"", "\"verdict\"", "\"risk_level\""]) {
    assert.ok(!serialised.includes(banned), `the pre-flight contains '${banned}'`);
  }
});

test("nothing in the result is a number that could be read as a rating", () => {
  const result = integrityPreflight(BASE);
  const numbers: unknown[] = [];
  JSON.parse(JSON.stringify(result), (_key, value) => {
    if (typeof value === "number") numbers.push(value);
    return value;
  });
  assert.deepEqual(numbers, [], "a numeric field in an integrity report becomes a score, whatever it is called");
});

// ---------------------------------------------------------------------------
// Prohibition 1: no accusation.
// ---------------------------------------------------------------------------

const ACCUSATIONS = [
  "scam",
  "scammer",
  "fraud",
  "fraudster",
  "dishonest",
  "untrustworthy",
  "suspicious person",
  "criminal",
  "liar",
  "avoid this",
  "do not trust",
];

test("no wording accuses anybody, even in the worst case", () => {
  const worst = integrityPreflight({
    ...BASE,
    verificationLevel: "unverified",
    verificationEvidence: [
      { kind: "company_registry", source: "Registry", result: "failed", checkedAt: "2026-07-20" },
    ],
    jurisdiction: "PA",
    dealOriginCountry: "BR",
    sanctions: { screened: true, checkedAt: "2026-07-20", source: "Ponte sanctions screening", clean: false, strongCount: 1 },
  });
  const text = JSON.stringify(worst).toLowerCase();
  for (const word of ACCUSATIONS) {
    assert.ok(!text.includes(word), `the pre-flight says '${word}'`);
  }
});

test("a failed check is reported as proving nothing either way", () => {
  const result = integrityPreflight({
    ...BASE,
    verificationEvidence: [{ kind: "vat", source: "VIES", result: "failed", checkedAt: "2026-07-20" }],
  });
  const item = result.unproved.find((f) => f.label === "VAT registration");
  assert.ok(item);
  assert.match(item!.statement, /Nothing is proved either way/);
});

// ---------------------------------------------------------------------------
// Prohibition 3: no autonomous admission or rejection.
// ---------------------------------------------------------------------------

test("the only action is ever about the invitation, never about the person", () => {
  for (const input of [
    BASE,
    { ...BASE, verificationLevel: "unverified" as const },
    { ...BASE, sanctions: { screened: true as const, checkedAt: "2026-07-20", source: "Ponte sanctions screening", clean: false, strongCount: 1 } },
  ]) {
    const action = integrityPreflight(input).action.label.toLowerCase();
    for (const word of ["reject", "approve this party", "admit", "block this member", "decline"]) {
      assert.ok(!action.includes(word), `the action says '${word}': that is a decision, not a recommendation`);
    }
  }
});

test("exactly one action is offered", () => {
  const result = integrityPreflight(BASE);
  assert.equal(typeof result.action.label, "string");
  assert.ok(result.action.because.length > 0, "an action without a reason is an instruction");
});

// ---------------------------------------------------------------------------
// The four buckets
// ---------------------------------------------------------------------------

test("a passed external check lands in checked, with its source and date", () => {
  const result = integrityPreflight(BASE);
  const fact = result.checked.find((f) => f.label === "Company registry record");
  assert.ok(fact);
  assert.equal(fact!.source, "Junta Comercial");
  assert.equal(fact!.checkedAt, "2026-07-20");
});

test("an unverified named entity is declared, not checked", () => {
  const result = integrityPreflight({ ...BASE, verificationLevel: "unverified", verificationEvidence: [] });
  assert.ok(result.declared.some((f) => f.label === "Legal entity"));
  assert.ok(!result.checked.some((f) => f.label === "Legal entity"));
});

test("ability to perform is always unproved, in every case", () => {
  for (const input of [BASE, { ...BASE, verificationLevel: "unverified" as const }]) {
    const result = integrityPreflight(input);
    assert.ok(
      result.unproved.some((f) => f.label === "Ability to perform"),
      "Ponte never checks solvency, stock, ownership or capacity, and must always say so",
    );
  }
});

test("document authenticity is always unproved", () => {
  assert.ok(integrityPreflight(BASE).unproved.some((f) => f.label === "Document authenticity"));
});

test("a declared professional capacity is accepted in place of an organisation", () => {
  const result = integrityPreflight({ ...BASE, organisationName: null, declaredCapacity: "Independent broker" });
  assert.ok(result.declared.some((f) => f.label === "Professional capacity"));
  assert.ok(!result.unproved.some((f) => f.label === "Legal entity"));
});

test("neither an organisation nor a capacity leaves the entity unproved", () => {
  const result = integrityPreflight({ ...BASE, organisationName: null, declaredCapacity: null });
  assert.ok(result.unproved.some((f) => f.label === "Legal entity"));
});

// ---------------------------------------------------------------------------
// Inconsistencies: observations, with a question attached
// ---------------------------------------------------------------------------

test("a jurisdiction that differs from the Deal origin is an observation with a question", () => {
  const result = integrityPreflight({ ...BASE, jurisdiction: "PA", dealOriginCountry: "BR" });
  const item = result.inconsistencies.find((i) => i.label === "Jurisdiction and Deal origin");
  assert.ok(item);
  assert.match(item!.observation, /states a jurisdiction/);
  assert.ok(item!.clarification.length > 0);
  // It must not be treated as wrongdoing: a trading company in one country
  // supplying from another is ordinary.
  assert.match(item!.clarification, /ordinary/);
});

test("consistent records raise no inconsistency", () => {
  assert.deepEqual(integrityPreflight(BASE).inconsistencies, []);
});

test("a named entity with no identity check is an observation, not a refusal", () => {
  const result = integrityPreflight({ ...BASE, verificationLevel: "unverified" });
  assert.ok(result.inconsistencies.some((i) => i.label === "Named entity, no identity check"));
  assert.equal(invitationIsPermitted(result), true, "an unverified counterparty may still be invited");
});

// ---------------------------------------------------------------------------
// The one gate, and it is a compliance boundary
// ---------------------------------------------------------------------------

test("an open sanctions candidate is the only thing that stops an invitation", () => {
  const result = integrityPreflight({ ...BASE, sanctions: { screened: true as const, checkedAt: "2026-07-20", source: "Ponte sanctions screening", clean: false, strongCount: 1 } });
  assert.equal(invitationIsPermitted(result), false);
  assert.equal(result.action.clarificationFirst, true);
});

test("the sanctions wording describes a name similarity, not a person", () => {
  const result = integrityPreflight({ ...BASE, sanctions: { screened: true as const, checkedAt: "2026-07-20", source: "Ponte sanctions screening", clean: false, strongCount: 1 } });
  const item = result.inconsistencies.find((i) => i.label === "Sanctions screening")!;
  assert.match(item.observation, /similar to an entry/);
});

test("everything else permits the invitation", () => {
  for (const input of [
    BASE,
    { ...BASE, verificationLevel: "unverified" as const },
    { ...BASE, jurisdiction: "PA" },
    { ...BASE, authorityDeclared: false },
    { ...BASE, sanctions: { screened: false as const } },
  ]) {
    assert.equal(invitationIsPermitted(integrityPreflight(input)), true);
  }
});

// ---------------------------------------------------------------------------
// Sanctions: the finding the owner review caught
// ---------------------------------------------------------------------------
//
// The first version took two booleans and the invitation surface passed
// `true`/`false` unconditionally, so the pre-flight printed a sanctions
// clearance over nothing at all. These assertions exist so that cannot recur.

test("an unscreened participant is reported as unproved, never as clear", () => {
  const result = integrityPreflight({ ...BASE, sanctions: { screened: false } });

  assert.ok(
    !result.checked.some((f) => f.label === "Sanctions screening"),
    "an unscreened participant must never appear in the checked bucket",
  );

  const item = result.unproved.find((f) => f.label === "Sanctions screening");
  assert.ok(item, "an unscreened participant must appear in the unproved bucket");
  assert.match(item!.statement, /No screening result exists/);
  // The sentence must not read as a clearance in either direction.
  assert.match(item!.statement, /nothing says they are not/);
});

test("no wording anywhere claims a screening that did not happen", () => {
  const result = integrityPreflight({ ...BASE, sanctions: { screened: false } });
  const text = JSON.stringify(result);
  assert.ok(
    !text.includes("Screened against the lists"),
    "the clearance sentence appeared without a screening result behind it",
  );
  assert.ok(!text.includes("no unresolved candidate"));
});

test("an unscreened participant may still be invited", () => {
  // Absence of a screening is not a finding against anybody, so it does not
  // stop an invitation. Only a real unresolved candidate does.
  assert.equal(invitationIsPermitted(integrityPreflight({ ...BASE, sanctions: { screened: false } })), true);
});

test("a screening with candidates is unproved, not checked, and stops the invitation", () => {
  const result = integrityPreflight({
    ...BASE,
    sanctions: { screened: true, checkedAt: "2026-07-20", source: "Ponte sanctions screening", clean: false, strongCount: 2 },
  });
  assert.ok(!result.checked.some((f) => f.label === "Sanctions screening"));
  assert.ok(result.unproved.some((f) => f.label === "Sanctions screening"));
  assert.equal(invitationIsPermitted(result), false);
});

test("a clean screening carries its date and source, so the claim is attributable", () => {
  const fact = integrityPreflight(BASE).checked.find((f) => f.label === "Sanctions screening");
  assert.ok(fact);
  assert.equal(fact!.checkedAt, "2026-07-20");
  assert.equal(fact!.source, "Ponte sanctions screening");
});

test("sanctionsPositionFrom reports absence when no screening was stored", () => {
  assert.deepEqual(sanctionsPositionFrom([]), { screened: false });
  assert.deepEqual(
    sanctionsPositionFrom([{ sanctionsHits: null, rescreenedAt: null, createdAt: "2026-07-20T00:00:00Z" }]),
    { screened: false },
  );
  // A payload that is not a ScreenResult is not a screening this can read.
  assert.deepEqual(
    sanctionsPositionFrom([{ sanctionsHits: { candidates: [] }, rescreenedAt: null, createdAt: "2026-07-20T00:00:00Z" }]),
    { screened: false },
  );
});

test("sanctionsPositionFrom reads a real stored ScreenResult", () => {
  const position = sanctionsPositionFrom([
    { sanctionsHits: { clean: true, candidates: [], strongCount: 0 }, rescreenedAt: "2026-07-25T09:00:00Z", createdAt: "2026-07-20T00:00:00Z" },
  ]);
  assert.equal(position.screened, true);
  if (position.screened) {
    assert.equal(position.clean, true);
    assert.equal(position.checkedAt, "2026-07-25");
  }
});

test("sanctionsPositionFrom carries a non-clean result through", () => {
  const position = sanctionsPositionFrom([
    { sanctionsHits: { clean: false, candidates: [{}], strongCount: 1 }, rescreenedAt: null, createdAt: "2026-07-20T00:00:00Z" },
  ]);
  assert.equal(position.screened, true);
  if (position.screened) {
    assert.equal(position.clean, false);
    assert.equal(position.strongCount, 1);
  }
});

// ---------------------------------------------------------------------------
// The standing limitation
// ---------------------------------------------------------------------------

test("the limitation is present and says Ponte does not vouch", () => {
  const result = integrityPreflight(BASE);
  assert.match(result.limitation, /does not rate, score or vouch/);
  assert.match(result.limitation, /none of this is a judgement about their honesty/);
});

console.log(`ok   deal-room integrity: ${passed} assertions passed`);
