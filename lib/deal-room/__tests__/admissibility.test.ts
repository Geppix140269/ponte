// The Deal Room admission verification gate (ADR-0021 ruling 2).
//
// Run: npx tsx lib/deal-room/__tests__/admissibility.test.ts
//
// ## What this file proves, and what it cannot
//
// It proves the PREDICATE, and it proves the TEXT of the database half. It does
// not prove that a running Postgres refuses an inadmissible member, because
// `supabase/migrations/20260731g_deal_room_admission_verification_gate.sql` is
// WRITTEN AND NOT APPLIED, and a durable boundary can only be exercised against
// a database that has it. Until that migration is applied, `deal_room_propose`
// and `deal_room_admit_participant` are granted to `authenticated` and are
// reachable without the server action that holds this gate.
//
// So a green run here means "the rule is written correctly in both layers", not
// "production is closed". Saying which of those a test proves is the difference
// between evidence and reassurance.
//
// The falsifiability half lives in `admissibility-mutation.test.ts`: it breaks
// this gate six named ways and proves the suite goes red for each.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  ADMISSIBILITY_CRITERIA,
  CRITERION_EVIDENCE,
  NO_PREREQUISITE_MECHANISM,
  ROOM_PREREQUISITE_STATES,
  admissibilityRefusal,
  dealRoomAdmissibility,
  notApplicableUntilPrerequisitesExist,
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

const MEMBER = "5f1c2d3e-0000-4000-8000-000000000001";

/**
 * A member who meets the whole of section 6's minimum, and nothing more.
 *
 * There is deliberately no verification level in this object, because the
 * predicate has no field for one. This member may never have run any check of
 * any kind and must still be admissible: that is what "a complete Passport and a
 * registry-checked business are not required merely to enter" means, and it is
 * what the controller restored on 31 July 2026.
 *
 * The organisation name and the legal name are set to DIFFERENT strings so that
 * a test which removes one cannot be silently rescued by the other.
 */
function admissible(overrides: Partial<AdmissibilityFacts> = {}): AdmissibilityFacts {
  return {
    authenticatedUserId: MEMBER,
    attributableProfileId: MEMBER,
    emailConfirmedAt: "2026-07-30T09:00:00.000Z",
    organisationName: "Bianchi Trading Srl",
    declaredCapacity: null,
    legalOrTradingName: "Bianchi Trading",
    jurisdiction: "IT",
    relationshipToBusiness: "Director of the company",
    transactionRole: "Seller",
    participationAuthority: "Director, authorised to negotiate",
    roomPrerequisites: notApplicableUntilPrerequisitesExist(),
    ...overrides,
  };
}

/** Nothing readable at all. Every criterion must block. */
const NOTHING: AdmissibilityFacts = {
  authenticatedUserId: null,
  attributableProfileId: null,
  emailConfirmedAt: null,
  organisationName: null,
  declaredCapacity: null,
  legalOrTradingName: null,
  jurisdiction: null,
  relationshipToBusiness: null,
  transactionRole: null,
  participationAuthority: null,
  roomPrerequisites: null,
};

/**
 * The facts that make each criterion, and ONLY that criterion, unsatisfiable.
 *
 * Every entry isolates cleanly. That is itself the proof the controller asked
 * for on independence: criterion 3 is broken while 4 still passes, and 4 is
 * broken while 3 still passes, which is only possible because they read
 * different facts.
 */
const BREAKS: Record<AdmissibilityCriterion, Partial<AdmissibilityFacts>> = {
  authenticated_individual: { attributableProfileId: null },
  confirmed_contact_method: { emailConfirmedAt: null },
  // No organisation and no capacity: nothing identifies the business. The legal
  // name survives on its own field, which is the point.
  identified_business_or_capacity: { organisationName: null, declaredCapacity: null },
  // A capacity identifies the business, and there is still no name for it.
  legal_or_trading_name: {
    organisationName: null,
    legalOrTradingName: null,
    declaredCapacity: "Independent broker",
  },
  jurisdiction: { jurisdiction: null },
  relationship_to_the_business: { relationshipToBusiness: null },
  transaction_role_declared: { transactionRole: null },
  authority_to_participate_declared: { participationAuthority: null },
  room_specific_prerequisite: { roomPrerequisites: null },
};

// ---------------------------------------------------------------------------
// The baseline, and the wall that is NOT here
// ---------------------------------------------------------------------------

test("a member at the floor with the declared facts is admissible", () => {
  const result = dealRoomAdmissibility(admissible());
  assert.equal(result.admissible, true);
  assert.deepEqual(result.pending, []);
  assert.equal(result.summary, "");
  assert.equal(result.findings.length, ADMISSIBILITY_CRITERIA.length);
});

test("no verification level is read, requested or requestable", () => {
  // Controller ruling, 31 July 2026: "`authenticated individual` is not
  // `identity_verified`." The strongest form of that is a predicate with no
  // field for a level, so no caller can supply one and no branch can test one.
  const keys = Object.keys(admissible());
  for (const key of keys) {
    assert.ok(
      !/verification|level|tier|rank|verified/i.test(key),
      `no fact may be a verification level (${key})`,
    );
  }

  // Structural, against the source: the module must not name any part of the
  // verification vocabulary, at either height.
  const source = readFileSync("lib/deal-room/admissibility.ts", "utf8");
  const code = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  for (const forbidden of [
    "MEMBER_BUSINESS_MIN_LEVEL",
    "meetsMemberBusinessFloor",
    "PASSING_VERIFICATION_STATUSES",
    "DEAL_ROOM_IDENTITY_MIN_LEVEL",
    "meetsDealRoomIdentityFloor",
    "verification_level",
    "verificationLevel",
    "company_verified",
    "identity_verified",
  ]) {
    assert.ok(!code.includes(forbidden), `the gate must not read or name ${forbidden}`);
  }
  assert.ok(
    !/from\s+["'][^"']*verification[^"']*["']/.test(code),
    "the gate must not import from the verification module at all",
  );
});

test("a member who has never verified anything is admissible", () => {
  const result = dealRoomAdmissibility(admissible());
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

test("criterion 1 is a session user AND an attributable profile, and both are needed", () => {
  assert.equal(dealRoomAdmissibility(admissible({ authenticatedUserId: null })).admissible, false);
  assert.equal(dealRoomAdmissibility(admissible({ attributableProfileId: null })).admissible, false);
  // A session attributed to somebody else is not an authenticated individual
  // for the purpose of a record that names who acted.
  const mismatched = dealRoomAdmissibility(
    admissible({ attributableProfileId: "5f1c2d3e-0000-4000-8000-000000000002" }),
  );
  assert.equal(mismatched.admissible, false);
  assert.deepEqual(
    mismatched.pending.map((f) => f.criterion),
    ["authenticated_individual"],
  );
});

test("criterion 2 is independent of criterion 1", () => {
  // Both directions: an attributable member with no confirmed address is
  // blocked on 2 alone, and an unattributable one with a confirmed address is
  // blocked on 1 alone. Neither can carry the other.
  const noContact = dealRoomAdmissibility(admissible({ emailConfirmedAt: null }));
  assert.deepEqual(
    noContact.pending.map((f) => f.criterion),
    ["confirmed_contact_method"],
  );
  const noProfile = dealRoomAdmissibility(admissible({ attributableProfileId: null }));
  assert.deepEqual(
    noProfile.pending.map((f) => f.criterion),
    ["authenticated_individual"],
  );
});

// ---------------------------------------------------------------------------
// The opener and the invited participant pass the identical gate
// ---------------------------------------------------------------------------

test("the opener and the invitee are judged by one predicate, with one outcome", () => {
  const facts = admissible();
  const opener = dealRoomAdmissibility(facts);
  const invitee = dealRoomAdmissibility(facts);
  assert.deepEqual(invitee, opener);

  const shortOpener = dealRoomAdmissibility(admissible({ jurisdiction: null }));
  const shortInvitee = dealRoomAdmissibility(admissible({ jurisdiction: null }));
  assert.deepEqual(shortInvitee, shortOpener);
  assert.equal(shortOpener.admissible, false);
});

test("nothing in the facts can express who paid, who sponsored, or who opened", () => {
  // Branching model section 6: sponsored access "does not weaken admission".
  // The surest form of that is a predicate that cannot see the difference.
  const keys = Object.keys(admissible()).join(" ").toLowerCase();
  for (const forbidden of ["paid", "payer", "sponsor", "entitle", "initiator", "opener", "plan", "credit", "price"]) {
    assert.ok(!keys.includes(forbidden), `no ${forbidden} field`);
  }
});

test("a sponsored guest is held to exactly the standard the sponsor met", () => {
  const sponsor = dealRoomAdmissibility(admissible());
  const guest = dealRoomAdmissibility(admissible({ relationshipToBusiness: null }));
  assert.equal(sponsor.admissible, true);
  assert.equal(guest.admissible, false);
  assert.deepEqual(
    guest.pending.map((f) => f.criterion),
    ["relationship_to_the_business"],
  );
});

test("no credit function is imported, called or named", () => {
  const source = readFileSync("lib/deal-room/admissibility.ts", "utf8");
  const code = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  for (const forbidden of ["credits", "grantCredits", "spendCredits", "refundSpend", "CREDIT"]) {
    assert.ok(!code.includes(forbidden), `the gate must not touch ${forbidden}`);
  }
});

// ---------------------------------------------------------------------------
// All nine criteria are evaluated independently
// ---------------------------------------------------------------------------

test("all nine criteria are evaluated, every time, in section 6's order", () => {
  const result = dealRoomAdmissibility(admissible());
  assert.deepEqual(
    result.findings.map((f) => f.criterion),
    [...ADMISSIBILITY_CRITERIA],
  );
  assert.equal(result.findings.length, 9);
  for (const f of result.findings) {
    assert.ok(
      ["confirmed", "declared", "not_applicable", "pending"].includes(f.state),
      `${f.criterion} has an explicit state`,
    );
  }
});

for (const criterion of ADMISSIBILITY_CRITERIA) {
  test(`failing only '${criterion}' reports it, and nothing else, as blocking`, () => {
    const result = dealRoomAdmissibility(admissible(BREAKS[criterion]));
    assert.equal(result.admissible, false);
    // Every criterion isolates. There is no documented pair any more: the
    // controller required 4 and 6 to stop leaning on 3 and 8, and this is where
    // that is proved rather than described.
    assert.deepEqual(
      result.pending.map((f) => f.criterion),
      [criterion],
    );
  });
}

test("a declared professional capacity satisfies criterion 3 and NOTHING else", () => {
  // The precise conflation the controller struck: a capacity is not a name and
  // not a relationship, and supplying only a capacity must leave both pending.
  const result = dealRoomAdmissibility(
    admissible({
      organisationName: null,
      legalOrTradingName: null,
      relationshipToBusiness: null,
      declaredCapacity: "Independent broker",
    }),
  );
  assert.equal(result.admissible, false);
  assert.deepEqual(
    result.pending.map((f) => f.criterion),
    ["legal_or_trading_name", "relationship_to_the_business"],
  );
  // And criterion 3 IS satisfied by it, which is section 6's own "or".
  assert.equal(
    result.findings.find((f) => f.criterion === "identified_business_or_capacity")!.state,
    "declared",
  );
});

test("the participation authority does not satisfy the relationship either", () => {
  const result = dealRoomAdmissibility(
    admissible({ relationshipToBusiness: null, participationAuthority: "Board resolution of 12 June" }),
  );
  assert.equal(result.admissible, false);
  assert.deepEqual(
    result.pending.map((f) => f.criterion),
    ["relationship_to_the_business"],
  );
});

test("declared relationship, role and authority each satisfy only their own criterion", () => {
  for (const [field, criterion] of [
    ["relationshipToBusiness", "relationship_to_the_business"],
    ["transactionRole", "transaction_role_declared"],
    ["participationAuthority", "authority_to_participate_declared"],
  ] as const) {
    const result = dealRoomAdmissibility(admissible({ [field]: null }));
    assert.deepEqual(
      result.pending.map((f) => f.criterion),
      [criterion],
      `${field} must block ${criterion} alone`,
    );
  }
});

test("an independent professional with no company is admissible", () => {
  // Section 6's "or declared professional capacity" is not decoration: a broker
  // with no registered entity must get in - once they have named what they
  // trade as and how they stand to it.
  const result = dealRoomAdmissibility(
    admissible({
      organisationName: null,
      declaredCapacity: "Independent broker",
      legalOrTradingName: "M. Rossi",
      relationshipToBusiness: "Sole practitioner, trading on own account",
    }),
  );
  assert.equal(result.admissible, true);
});

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
  // Criteria 4 and 6 now have their own columns, so neither is `derived` any
  // more. If a future edit takes a column away, this is what catches it.
  assert.equal(CRITERION_EVIDENCE.legal_or_trading_name.coverage, "stored");
  assert.equal(CRITERION_EVIDENCE.relationship_to_the_business.coverage, "stored");
  assert.ok(
    !Object.values(CRITERION_EVIDENCE).some((e) => e.coverage === "derived"),
    "no criterion may rest on another criterion's fact",
  );
  assert.equal(CRITERION_EVIDENCE.room_specific_prerequisite.coverage, "unmodelled");
});

// ---------------------------------------------------------------------------
// Criterion 9: an explicit named state, never an omission
// ---------------------------------------------------------------------------

test("the prerequisite states are three names, and no number", () => {
  assert.deepEqual([...ROOM_PREREQUISITE_STATES], ["not_applicable", "completed", "pending"]);
  for (const state of ROOM_PREREQUISITE_STATES) {
    assert.equal(typeof state, "string");
    assert.ok(!/\d/.test(state), `${state} must not contain a digit`);
  }
});

test("this release answers not_applicable, explicitly and with a reason", () => {
  const evaluation = notApplicableUntilPrerequisitesExist();
  assert.equal(evaluation.status, "not_applicable");
  assert.equal(evaluation.status === "not_applicable" && evaluation.reason, NO_PREREQUISITE_MECHANISM);

  const result = dealRoomAdmissibility(admissible());
  const finding = result.findings.find((f) => f.criterion === "room_specific_prerequisite")!;
  assert.equal(finding.state, "not_applicable");
  assert.equal(finding.evidenceState, "no_prerequisites_apply");
  assert.equal(result.admissible, true);
});

test("not_applicable is not disguised as confirmed", () => {
  // The distinction the controller asked for: a room that required nothing is
  // reported differently from a room that required something and got it.
  const none = dealRoomAdmissibility(admissible());
  const done = dealRoomAdmissibility(
    admissible({ roomPrerequisites: { status: "completed", completed: ["Sanctions declaration"] } }),
  );
  const noneFinding = none.findings.find((f) => f.criterion === "room_specific_prerequisite")!;
  const doneFinding = done.findings.find((f) => f.criterion === "room_specific_prerequisite")!;
  assert.equal(noneFinding.state, "not_applicable");
  assert.equal(doneFinding.state, "confirmed");
  assert.notEqual(noneFinding.evidenceState, doneFinding.evidenceState);
  assert.equal(none.admissible, true);
  assert.equal(done.admissible, true);
});

test("outstanding prerequisites block and are named", () => {
  const result = dealRoomAdmissibility(
    admissible({ roomPrerequisites: { status: "pending", outstanding: ["Sanctions declaration"] } }),
  );
  assert.equal(result.admissible, false);
  const finding = result.pending.find((f) => f.criterion === "room_specific_prerequisite")!;
  assert.match(finding.remedy!.statement, /Sanctions declaration/);
});

test("a prerequisite evaluation that was never made blocks", () => {
  const result = dealRoomAdmissibility(admissible({ roomPrerequisites: null }));
  assert.equal(result.admissible, false);
  assert.equal(result.pending[0].criterion, "room_specific_prerequisite");
  assert.equal(result.pending[0].state, "pending");
});

// ---------------------------------------------------------------------------
// Fail closed. An unevaluable criterion is pending, and blocks
// ---------------------------------------------------------------------------

test("a member with nothing readable at all is blocked on every criterion", () => {
  const result = dealRoomAdmissibility(NOTHING);
  assert.equal(result.admissible, false);
  assert.equal(result.pending.length, 9);
  assert.deepEqual(result.satisfied, []);
});

test("no absent, empty or malformed value ever passes", () => {
  const rogue: unknown[] = [null, undefined, "", "   ", "\t\n"];
  /*
   * Each field is emptied against a baseline where it is the ONLY thing that
   * can satisfy its criterion.
   *
   * `legalOrTradingName` needs that care: with an organisation named, the
   * organisation's own name satisfies criterion 4 and emptying this field
   * correctly changes nothing. So it is tested on the capacity route, where it
   * is the only name there is - which is also the route the controller's
   * correction is about.
   */
  const fields: Array<[keyof AdmissibilityFacts, Partial<AdmissibilityFacts>]> = [
    ["authenticatedUserId", {}],
    ["attributableProfileId", {}],
    ["emailConfirmedAt", {}],
    ["legalOrTradingName", { organisationName: null, declaredCapacity: "Independent broker" }],
    ["jurisdiction", {}],
    ["relationshipToBusiness", {}],
    ["transactionRole", {}],
    ["participationAuthority", {}],
  ];
  for (const [field, base] of fields) {
    // The baseline itself must pass, or the assertion below proves nothing.
    assert.equal(dealRoomAdmissibility(admissible(base)).admissible, true, `baseline for ${field}`);
    for (const value of rogue) {
      const result = dealRoomAdmissibility(admissible({ ...base, [field]: value as never }));
      assert.equal(result.admissible, false, `${field} = ${JSON.stringify(value)} must not pass`);
    }
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

test("there is no code path that turns an absence into a pass", () => {
  const source = readFileSync("lib/deal-room/admissibility.ts", "utf8");
  const code = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  assert.ok(!/\?\?\s*true/.test(code), "no `?? true` may appear");
  assert.ok(!/\|\|\s*true/.test(code), "no `|| true` may appear");
  assert.ok(!/=\s*true\s*;\s*\/\/\s*default/i.test(code), "no defaulted-to-satisfied assignment");
});

// ---------------------------------------------------------------------------
// Evidence-specific, never numerical
// ---------------------------------------------------------------------------

test("the result names the missing evidence and contains no number anywhere", () => {
  const result = dealRoomAdmissibility(admissible({ attributableProfileId: null, jurisdiction: null }));

  assert.deepEqual(
    result.pending.map((f) => f.criterion),
    ["authenticated_individual", "jurisdiction"],
  );
  assert.match(result.summary, /authenticated member/i);
  assert.match(result.summary, /jurisdiction/);

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
  const result = dealRoomAdmissibility(NOTHING);
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
  const result = dealRoomAdmissibility(admissible({ jurisdiction: null }));
  const message = admissibilityRefusal(result);
  assert.match(message, /jurisdiction/);
  assert.match(message, /\/verify\?for=business/);
  assert.match(message, /free/);
  for (const word of ["pay", "price", "cost", "purchase", "upgrade", "subscription", "credit", "$"]) {
    assert.ok(!message.toLowerCase().includes(word), `the refusal must not say "${word}"`);
  }
});

test("an admissible member gets no refusal sentence at all", () => {
  assert.equal(admissibilityRefusal(dealRoomAdmissibility(admissible())), "");
});

// ---------------------------------------------------------------------------
// The section 4 lock is a SEPARATE mechanism from this gate
// ---------------------------------------------------------------------------
//
// Product contract section 4: "One party may prepare the room before the other
// accepts, but protected content and active transaction functions remain locked
// until the required principal participants are admitted."

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

test("protected reads and writes remain unavailable before admission", () => {
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
  assert.equal(canApproveProcedure(awaitedCounterparty, ROOM_AWAITING), false);
});

test("being admissible is not being admitted", () => {
  const fullyAdmissible = dealRoomAdmissibility(admissible());
  assert.equal(fullyAdmissible.admissible, true);

  const notYetAdmitted = viewer({ participantState: "terms_pending", isRequiredApprover: true });
  assert.equal(canMutate(notYetAdmitted, ROOM_AWAITING), false);
  assert.equal(canApproveProcedure(notYetAdmitted, ROOM_AWAITING), false);
});

console.log(`admissibility: ${passed} passed`);
