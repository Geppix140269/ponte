// The Deal Room admission verification gate (ADR-0021 ruling 2).
//
// Run: npx tsx lib/deal-room/__tests__/admissibility.test.ts
//
// ## What this file proves, and what it cannot
//
// It proves the PREDICATE. It does not prove the database refuses an
// inadmissible member, because the same rule in
// `supabase/migrations/20260731g_deal_room_admission_verification_gate.sql` is
// WRITTEN AND NOT APPLIED, and RLS can only be tested against a running
// Postgres. Until that migration is applied, `deal_room_propose` and
// `deal_room_admit_participant` are granted to `authenticated` and are
// reachable without the server action that holds this gate. That gap is real,
// and stating it here is the honest version of a green test run.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  ADMISSIBILITY_CRITERIA,
  CRITERION_EVIDENCE,
  DEAL_ROOM_IDENTITY_MIN_LEVEL,
  admissibilityRefusal,
  dealRoomAdmissibility,
  type AdmissibilityCriterion,
  type AdmissibilityFacts,
} from "../admissibility";
import {
  canAcceptEvidence,
  canApproveProcedure,
  canMutate,
  canOpenBlocker,
  canProposeProcedure,
  canUploadEvidence,
  type RoomContext,
  type Viewer,
} from "../permissions";
import { VERIFICATION_LEVELS } from "../../verification/level";

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

/**
 * A member who meets the whole of section 6's minimum, and nothing more.
 *
 * `identity_verified`, deliberately: this member has never had a business
 * matched to a registry, and must still be admissible. If a future edit made
 * `company_verified` the floor, every test built on this object fails.
 */
function admissible(overrides: Partial<AdmissibilityFacts> = {}): AdmissibilityFacts {
  return {
    verificationLevel: "identity_verified",
    emailConfirmedAt: "2026-07-30T09:00:00.000Z",
    organisationName: "Bianchi Trading Srl",
    declaredCapacity: null,
    jurisdiction: "IT",
    relationshipToBusiness: "Director",
    transactionRole: "Seller",
    participationAuthority: "Director, authorised to negotiate",
    outstandingPrerequisites: [],
    ...overrides,
  };
}

/** The facts that make each criterion, and only that criterion, unsatisfiable. */
const BREAKS: Record<AdmissibilityCriterion, Partial<AdmissibilityFacts>> = {
  authenticated_individual: { verificationLevel: "unverified" },
  confirmed_contact_method: { emailConfirmedAt: null },
  // 3 and 4 rest on the same two declared facts by design, so removing both is
  // what isolates them; each is still reported separately, which the test below
  // asserts.
  identified_business_or_capacity: { organisationName: null, declaredCapacity: null },
  legal_or_trading_name: { organisationName: null, declaredCapacity: null },
  jurisdiction: { jurisdiction: null },
  relationship_to_the_business: { relationshipToBusiness: null },
  transaction_role_declared: { transactionRole: null },
  authority_to_participate_declared: { participationAuthority: null },
  room_specific_prerequisite: { outstandingPrerequisites: null },
};

// ---------------------------------------------------------------------------
// The baseline: the floor is reachable, and it is the floor the authority set
// ---------------------------------------------------------------------------

test("a member at the floor with the declared facts is admissible", () => {
  const result = dealRoomAdmissibility(admissible());
  assert.equal(result.admissible, true);
  assert.deepEqual(result.pending, []);
  assert.equal(result.summary, "");
  assert.equal(result.findings.length, ADMISSIBILITY_CRITERIA.length);
});

test("the floor is identity_verified, not the publication floor", () => {
  assert.equal(DEAL_ROOM_IDENTITY_MIN_LEVEL, "identity_verified");
  // Every level at or above the floor passes; every level below it does not.
  for (const level of VERIFICATION_LEVELS) {
    const result = dealRoomAdmissibility(admissible({ verificationLevel: level }));
    assert.equal(result.admissible, level !== "unverified", `level ${level}`);
  }
});

test("a registry check is never required to enter", () => {
  // The strongest form of ADR-0021's "a complete Passport is not required for
  // entry": the member has no company_verified level and no bound business
  // verification anywhere, and is admissible.
  const result = dealRoomAdmissibility(admissible({ verificationLevel: "identity_verified" }));
  assert.equal(result.admissible, true);
  assert.ok(
    !result.findings.some((f) => f.evidenceState === "business_information_checked"),
    "no criterion may claim the business was CHECKED; nothing here checks one",
  );
  assert.ok(
    !result.findings.some((f) => f.evidenceState === "authority_sighted"),
    "no criterion may claim authority was SIGHTED; Ponte records the declaration only",
  );
});

test("the gate reuses no publication-verification constant", () => {
  // Structural, not a reading of the code: the module must not name the
  // publication floor or the publication status set at all.
  const source = readFileSync("lib/deal-room/admissibility.ts", "utf8");
  const code = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  assert.ok(!code.includes("MEMBER_BUSINESS_MIN_LEVEL"), "publication floor must not be imported or read");
  assert.ok(!code.includes("PASSING_VERIFICATION_STATUSES"), "publication status set must not be read");
  assert.ok(!code.includes("meetsMemberBusinessFloor"), "the publication predicate must not be called");
  assert.ok(!code.includes("company_verified"), "the gate must not test for a registry-checked business");
});

// ---------------------------------------------------------------------------
// Owner proof 1: the opener and the invited participant pass the identical gate
// ---------------------------------------------------------------------------

test("the opener and the invitee are judged by one predicate, with one outcome", () => {
  // The same facts, submitted at the two different doors, must produce results
  // that are identical in every field. There is no parameter distinguishing
  // them, which is the point: the asymmetry cannot be expressed.
  const facts = admissible();
  const opener = dealRoomAdmissibility(facts);
  const invitee = dealRoomAdmissibility(facts);
  assert.deepEqual(invitee, opener);

  const shortOpener = dealRoomAdmissibility(admissible({ verificationLevel: "unverified" }));
  const shortInvitee = dealRoomAdmissibility(admissible({ verificationLevel: "unverified" }));
  assert.deepEqual(shortInvitee, shortOpener);
  assert.equal(shortOpener.admissible, false);
});

test("nothing in the facts can express who paid, who sponsored, or who opened", () => {
  // Branching model section 6: sponsored access "does not weaken admission".
  // The surest form of that is a predicate that cannot see the difference.
  const keys = Object.keys(admissible()).join(" ").toLowerCase();
  for (const forbidden of ["pa", "sponsor", "entitle", "initiator", "owner", "plan", "credit", "price"]) {
    if (forbidden === "pa") {
      assert.ok(!keys.includes("paid") && !keys.includes("payer"), "no payment field");
      continue;
    }
    assert.ok(!keys.includes(forbidden), `no ${forbidden} field`);
  }
});

test("a sponsored guest is held to exactly the standard the sponsor met", () => {
  // The sponsor is admissible; the guest is missing one item. Being sponsored
  // buys the guest nothing.
  const sponsor = dealRoomAdmissibility(admissible());
  const guest = dealRoomAdmissibility(admissible({ verificationLevel: "unverified" }));
  assert.equal(sponsor.admissible, true);
  assert.equal(guest.admissible, false);
  assert.deepEqual(
    guest.pending.map((f) => f.criterion),
    ["authenticated_individual"],
  );
});

// ---------------------------------------------------------------------------
// Owner proof 2: all nine criteria are evaluated independently
// ---------------------------------------------------------------------------

test("all nine criteria are evaluated, every time, in section 6's order", () => {
  const result = dealRoomAdmissibility(admissible());
  assert.deepEqual(
    result.findings.map((f) => f.criterion),
    [...ADMISSIBILITY_CRITERIA],
  );
  assert.equal(result.findings.length, 9);
  for (const f of result.findings) {
    assert.ok(["confirmed", "declared", "pending"].includes(f.state), `${f.criterion} has an explicit state`);
  }
});

for (const criterion of ADMISSIBILITY_CRITERIA) {
  test(`failing only '${criterion}' reports it, and nothing else, as blocking`, () => {
    const result = dealRoomAdmissibility(admissible(BREAKS[criterion]));
    assert.equal(result.admissible, false);
    const blocking = result.pending.map((f) => f.criterion);
    assert.ok(blocking.includes(criterion), `${criterion} must be reported`);

    // 3 and 4 are the one documented pair: section 6 lists them separately and
    // they rest on the same two declared facts, so breaking either breaks both.
    // Every other criterion must be the sole blocker.
    const expected =
      criterion === "identified_business_or_capacity" || criterion === "legal_or_trading_name"
        ? ["identified_business_or_capacity", "legal_or_trading_name"]
        : [criterion];
    assert.deepEqual(blocking, expected);
  });
}

test("every criterion has a named evidence source and a stated coverage", () => {
  for (const criterion of ADMISSIBILITY_CRITERIA) {
    const evidence = CRITERION_EVIDENCE[criterion];
    assert.ok(evidence, `${criterion} is described`);
    assert.ok(evidence.source.trim().length > 0, `${criterion} names its stored source`);
    assert.ok(
      ["stored", "derived", "unmodelled"].includes(evidence.coverage),
      `${criterion} states how well the data covers it`,
    );
  }
  // The two the schema cannot support on its own, recorded so a future reader
  // finds out from a test rather than from a criterion that always passes.
  assert.equal(CRITERION_EVIDENCE.relationship_to_the_business.coverage, "derived");
  assert.equal(CRITERION_EVIDENCE.room_specific_prerequisite.coverage, "unmodelled");
});

// ---------------------------------------------------------------------------
// Owner proof 3: fail closed. An unevaluable criterion is pending, and blocks
// ---------------------------------------------------------------------------

test("an unevaluable criterion is 'pending' and blocks", () => {
  // `null` is the caller saying "I could not read this". It is not a pass.
  const result = dealRoomAdmissibility(admissible({ outstandingPrerequisites: null }));
  assert.equal(result.admissible, false);
  assert.equal(result.pending[0].criterion, "room_specific_prerequisite");
  assert.equal(result.pending[0].state, "pending");
});

test("a member with nothing readable at all is blocked on every criterion", () => {
  const result = dealRoomAdmissibility({
    verificationLevel: null,
    emailConfirmedAt: null,
    organisationName: null,
    declaredCapacity: null,
    jurisdiction: null,
    relationshipToBusiness: null,
    transactionRole: null,
    participationAuthority: null,
    outstandingPrerequisites: null,
  });
  assert.equal(result.admissible, false);
  assert.equal(result.pending.length, 9);
  assert.deepEqual(result.satisfied, []);
});

test("an unrecognised stored level never passes", () => {
  for (const rogue of ["2", 2, "COMPANY_VERIFIED", "verified", "", true, {}, [], undefined]) {
    const result = dealRoomAdmissibility(admissible({ verificationLevel: rogue }));
    assert.equal(result.admissible, false, `level ${String(rogue)} must not pass`);
  }
});

test("whitespace is not a declaration", () => {
  const result = dealRoomAdmissibility(admissible({ participationAuthority: "   " }));
  assert.equal(result.admissible, false);
  assert.deepEqual(
    result.pending.map((f) => f.criterion),
    ["authority_to_participate_declared"],
  );
});

// ---------------------------------------------------------------------------
// An unverified member cannot open, and cannot be admitted
// ---------------------------------------------------------------------------

test("an unverified member cannot open a Deal Room", () => {
  const result = dealRoomAdmissibility(admissible({ verificationLevel: "unverified" }));
  assert.equal(result.admissible, false);
  assert.equal(result.pending[0].criterion, "authenticated_individual");
  assert.equal(result.pending[0].evidenceState, "not_confirmed");
});

test("an unverified member cannot be admitted to one either", () => {
  // The invitee's facts come from their own declaration, so this member has
  // declared everything the admission form collects and is still refused.
  const result = dealRoomAdmissibility(
    admissible({
      verificationLevel: "unverified",
      organisationName: null,
      declaredCapacity: "Independent broker",
      relationshipToBusiness: "Independent broker",
    }),
  );
  assert.equal(result.admissible, false);
  assert.deepEqual(
    result.pending.map((f) => f.criterion),
    ["authenticated_individual"],
  );
});

test("an independent professional with no company is admissible", () => {
  // Section 6's "or declared professional capacity" is not decoration: a broker
  // with no registered entity must get in.
  const result = dealRoomAdmissibility(
    admissible({
      organisationName: null,
      declaredCapacity: "Independent broker",
      relationshipToBusiness: "Sole practitioner",
    }),
  );
  assert.equal(result.admissible, true);
});

// ---------------------------------------------------------------------------
// Evidence-specific, never numerical
// ---------------------------------------------------------------------------

test("the result names the missing evidence and contains no number anywhere", () => {
  const result = dealRoomAdmissibility(
    admissible({ verificationLevel: "unverified", jurisdiction: null }),
  );

  // Named, by criterion and by label.
  assert.deepEqual(
    result.pending.map((f) => f.criterion),
    ["authenticated_individual", "jurisdiction"],
  );
  assert.match(result.summary, /identity confirmed/);
  assert.match(result.summary, /jurisdiction/);

  // And no measure, anywhere in the returned shape.
  const walk = (value: unknown, path: string): void => {
    if (typeof value === "number") assert.fail(`a number reached the result at ${path}`);
    if (Array.isArray(value)) value.forEach((v, i) => walk(v, `${path}[${i}]`));
    else if (value && typeof value === "object") {
      for (const [k, v] of Object.entries(value)) {
        assert.ok(
          !/score|percent|ratio|count|total|complete(ness)?|level|tier|band|progress/i.test(k),
          `the result must not carry a measure-shaped key (${path}.${k})`,
        );
        walk(v, `${path}.${k}`);
      }
    }
  };
  walk(result, "result");
  assert.ok(!/\d/.test(result.summary), "the refusal sentence must not contain a digit");
});

test("every blocked criterion carries a remedy, and satisfied ones carry none", () => {
  const result = dealRoomAdmissibility({
    verificationLevel: null,
    emailConfirmedAt: null,
    organisationName: null,
    declaredCapacity: null,
    jurisdiction: null,
    relationshipToBusiness: null,
    transactionRole: null,
    participationAuthority: null,
    outstandingPrerequisites: null,
  });
  for (const f of result.pending) {
    assert.ok(f.remedy, `${f.criterion} must say what to do`);
    assert.ok(f.remedy!.statement.trim().length > 0, `${f.criterion} remedy is not empty`);
    assert.ok(f.remedy!.href.startsWith("/"), `${f.criterion} remedy points somewhere`);
  }
  for (const f of dealRoomAdmissibility(admissible()).satisfied) {
    assert.equal(f.remedy, null, `${f.criterion} is met and needs no remedy`);
  }
});

test("the refusal never implies a cost, and points at the free surface", () => {
  const result = dealRoomAdmissibility(admissible({ verificationLevel: "unverified" }));
  const message = admissibilityRefusal(result);
  assert.match(message, /identity confirmed/);
  assert.match(message, /\/verify\?for=business/);
  assert.match(message, /free/);
  // ADR-0018 made member_business verification free. Any of these words would
  // be untrue on this path.
  for (const word of ["pay", "price", "cost", "purchase", "upgrade", "subscription", "credit", "$"]) {
    assert.ok(!message.toLowerCase().includes(word), `the refusal must not say "${word}"`);
  }
});

test("an admissible member gets no refusal sentence at all", () => {
  assert.equal(admissibilityRefusal(dealRoomAdmissibility(admissible())), "");
});

// ---------------------------------------------------------------------------
// Owner proof 4: the section 4 lock is a SEPARATE mechanism from this gate
// ---------------------------------------------------------------------------
//
// Product contract section 4: "One party may prepare the room before the other
// accepts, but protected content and active transaction functions remain locked
// until the required principal participants are admitted."
//
// That is about waiting for the other party. It is not the verification gate,
// and neither substitutes for the other.

const ROOM_AWAITING: RoomContext = {
  roomState: "awaiting_principal_admission",
  entitlementState: "active",
};

function viewer(overrides: Partial<Viewer> = {}): Viewer {
  return {
    profileId: "p1",
    participantId: "part1",
    participantClass: "principal",
    participantState: "admitted",
    subRoomId: "sub1",
    isRequiredApprover: false,
    isRoomAdministrator: false,
    isReviewer: false,
    ...overrides,
  };
}

test("a room with one admitted principal and one not keeps protected content locked", () => {
  const admittedInitiator = viewer({ isRequiredApprover: true, isRoomAdministrator: true });
  const awaitedCounterparty = viewer({
    profileId: "p2",
    participantId: "part2",
    participantState: "terms_pending",
    isRequiredApprover: true,
  });

  // The initiator may PREPARE, which section 4 permits in as many words.
  assert.equal(canProposeProcedure(admittedInitiator, ROOM_AWAITING), true);

  // The counterparty, not yet admitted, can do nothing protected.
  assert.equal(canMutate(awaitedCounterparty, ROOM_AWAITING), false);
  assert.equal(canUploadEvidence(awaitedCounterparty, ROOM_AWAITING), false);
  assert.equal(canAcceptEvidence(awaitedCounterparty, ROOM_AWAITING), false);
  assert.equal(canOpenBlocker(awaitedCounterparty, ROOM_AWAITING), false);

  // And the transaction cannot become active: the procedure only governs once
  // every required approver has approved, and a required approver who is not
  // admitted cannot approve. So the agreed state is unreachable while a required
  // principal is outstanding.
  assert.equal(canApproveProcedure(awaitedCounterparty, ROOM_AWAITING), false);
});

test("being admissible is not being admitted", () => {
  // The two mechanisms are independent in both directions, which is the point:
  // passing verification does not let anyone in, and being inside is not a
  // verification claim.
  const fullyAdmissible = dealRoomAdmissibility(admissible());
  assert.equal(fullyAdmissible.admissible, true);

  const notYetAdmitted = viewer({ participantState: "terms_pending", isRequiredApprover: true });
  assert.equal(canMutate(notYetAdmitted, ROOM_AWAITING), false);
  assert.equal(canApproveProcedure(notYetAdmitted, ROOM_AWAITING), false);
});

// ---------------------------------------------------------------------------
// The migration exists, and says it has not been applied
// ---------------------------------------------------------------------------

test("the database half is written and marked NOT APPLIED", () => {
  const path = "supabase/migrations/20260731g_deal_room_admission_verification_gate.sql";
  const sql = readFileSync(path, "utf8");
  assert.match(sql, /WRITTEN AND NOT APPLIED/);
  assert.match(sql, /deal_room_admission_minimum_missing/);
  // Both doors, one helper.
  assert.ok(sql.includes("create or replace function public.deal_room_propose("));
  assert.ok(sql.includes("create or replace function public.deal_room_admit_participant("));
  // And the same refusal, so the two layers cannot say different things.
  assert.match(sql, /a complete Business Passport is not required/);
});

console.log(`admissibility: ${passed} passed`);
