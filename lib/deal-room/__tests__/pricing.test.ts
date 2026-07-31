// Deal Room pricing: the engine, the billable-branch contract, and the two
// properties that are not about arithmetic - purity and non-disclosure.
//
// Authority: PT-COMMERCIAL-2026-07-31-01, recorded by ADR-0020.
//
// Run: npx tsx lib/deal-room/__tests__/pricing.test.ts

import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  ACTIVE_PERIOD_DAYS,
  ADDITIONAL_BRANCH_PRICE_CENTS,
  BASE_ROOM_PRICE_CENTS,
  BILLABLE_PARTICIPANT_CLASSES,
  BILLABLE_SUB_ROOM_KINDS,
  BILLABLE_SUB_ROOM_STATES,
  CURRENCY,
  INCLUDED_ACTIVE_BRANCHES,
  MAXIMUM_ROOM_PERIOD_PRICE_CENTS,
  PUBLISHED_PRICE_TABLE,
  REQUIRED_AGREEMENTS_FOR_BILLING,
  additionalBranchChargeCents,
  branchBillingVerdict,
  countBillableBranches,
  formatUsd,
  isAtPeriodCap,
  isBillableBranch,
  roomPeriodPriceCents,
  type BranchBillingFacts,
  type CounterpartyFacts,
} from "../pricing";
import { PARTICIPANT_CLASSES, SUB_ROOM_KINDS, SUB_ROOM_STATES } from "../states";

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

/* ------------------------------------------------------------------ *
 * Fixtures
 * ------------------------------------------------------------------ */

const ALL_AGREEMENTS = [...REQUIRED_AGREEMENTS_FOR_BILLING];

function counterparty(over: Partial<CounterpartyFacts> = {}): CounterpartyFacts {
  return {
    participantClass: "principal",
    participantState: "admitted",
    acceptedAgreements: ALL_AGREEMENTS,
    ...over,
  };
}

/** A branch that is billable in every respect, so each test breaks one thing. */
function billableBranch(over: Partial<BranchBillingFacts> = {}): BranchBillingFacts {
  return {
    subRoomKind: "counterparty",
    subRoomState: "active",
    invitationState: "accepted",
    counterparties: [counterparty()],
    ...over,
  };
}

/* ------------------------------------------------------------------ *
 * 1. Constants match the authority
 * ------------------------------------------------------------------ */

test("the constants are the authority's, to the cent", () => {
  assert.equal(CURRENCY, "usd");
  assert.equal(BASE_ROOM_PRICE_CENTS, 7900);
  assert.equal(INCLUDED_ACTIVE_BRANCHES, 5);
  assert.equal(ADDITIONAL_BRANCH_PRICE_CENTS, 1500);
  assert.equal(MAXIMUM_ROOM_PERIOD_PRICE_CENTS, 19900);
  assert.equal(ACTIVE_PERIOD_DAYS, 30);
});

test("every constant is an integer number of cents", () => {
  for (const [name, value] of [
    ["base", BASE_ROOM_PRICE_CENTS],
    ["additional", ADDITIONAL_BRANCH_PRICE_CENTS],
    ["maximum", MAXIMUM_ROOM_PERIOD_PRICE_CENTS],
  ] as const) {
    assert.ok(Number.isInteger(value), `${name} must be an integer`);
  }
});

/* ------------------------------------------------------------------ *
 * 2. The price
 * ------------------------------------------------------------------ */

test("one to five branches all cost the base $79", () => {
  for (let n = 0; n <= INCLUDED_ACTIVE_BRANCHES; n++) {
    assert.equal(roomPeriodPriceCents(n), 7900, `${n} branches`);
  }
});

test("the sixth branch is the first to add $15", () => {
  assert.equal(roomPeriodPriceCents(6), 9400);
  assert.equal(roomPeriodPriceCents(6) - roomPeriodPriceCents(5), ADDITIONAL_BRANCH_PRICE_CENTS);
});

test("the published price table and the engine agree, row by row", () => {
  for (const row of PUBLISHED_PRICE_TABLE) {
    assert.equal(
      roomPeriodPriceCents(row.branches),
      row.cents,
      `published table says ${row.branches} branches cost ${row.cents}`,
    );
  }
});

test("the price caps at $199 and never exceeds it", () => {
  assert.equal(roomPeriodPriceCents(13), 19900);
  for (const n of [14, 20, 50, 1000]) {
    assert.equal(roomPeriodPriceCents(n), MAXIMUM_ROOM_PERIOD_PRICE_CENTS, `${n} branches`);
  }
});

test("the cap is a price cap, not a branch limit", () => {
  // Authority section 6: "The cap does not create a technical maximum of 13
  // branches." The engine must price 200 branches rather than refuse them.
  assert.equal(roomPeriodPriceCents(200), 19900);
});

test("the price never decreases as branches are added", () => {
  let previous = -1;
  for (let n = 0; n <= 30; n++) {
    const price = roomPeriodPriceCents(n);
    assert.ok(price >= previous, `price fell at ${n} branches`);
    previous = price;
  }
});

test("a non-integer or negative branch count is refused, not rounded", () => {
  assert.throws(() => roomPeriodPriceCents(5.5), TypeError);
  assert.throws(() => roomPeriodPriceCents(-1), RangeError);
  assert.throws(() => roomPeriodPriceCents(Number.NaN), TypeError);
  assert.throws(() => roomPeriodPriceCents(Number.POSITIVE_INFINITY), TypeError);
});

/* ------------------------------------------------------------------ *
 * 3. The additional-branch charge - authority section 10
 * ------------------------------------------------------------------ */

test("raising capacity inside the included five costs nothing", () => {
  assert.equal(additionalBranchChargeCents({ paidCapacity: 5, requiredCapacity: 5 }), 0);
  assert.equal(additionalBranchChargeCents({ paidCapacity: 5, requiredCapacity: 3 }), 0);
  assert.equal(additionalBranchChargeCents({ paidCapacity: 0, requiredCapacity: 5 }), 0);
});

test("a sixth branch costs exactly $15", () => {
  assert.equal(additionalBranchChargeCents({ paidCapacity: 5, requiredCapacity: 6 }), 1500);
});

test("three more branches at once cost $45, shown as one exact amount", () => {
  // Authority section 10: "the exact additional capacity and charge must be
  // shown before payment". One call, one amount, no per-slot round trip.
  assert.equal(additionalBranchChargeCents({ paidCapacity: 5, requiredCapacity: 8 }), 4500);
});

test("the charge stops at the cap even when capacity keeps rising", () => {
  assert.equal(additionalBranchChargeCents({ paidCapacity: 5, requiredCapacity: 13 }), 12000);
  assert.equal(additionalBranchChargeCents({ paidCapacity: 5, requiredCapacity: 99 }), 12000);
});

test("once the period is at the cap, further branches are free", () => {
  // Authority section 10: "Once total paid room-period value reaches $199 USD,
  // additional branch activations during that same period do not require
  // another charge."
  assert.equal(additionalBranchChargeCents({ paidCapacity: 13, requiredCapacity: 14 }), 0);
  assert.equal(additionalBranchChargeCents({ paidCapacity: 13, requiredCapacity: 500 }), 0);
  assert.equal(additionalBranchChargeCents({ paidCapacity: 20, requiredCapacity: 40 }), 0);
});

test("reducing capacity never produces a refund", () => {
  // Authority section 7: closing a branch releases a slot and "does not
  // generate a refund for the current room period".
  assert.equal(additionalBranchChargeCents({ paidCapacity: 10, requiredCapacity: 6 }), 0);
  assert.equal(additionalBranchChargeCents({ paidCapacity: 13, requiredCapacity: 1 }), 0);
});

test("a released slot can be reused inside the period at no charge", () => {
  // Paid for 8, closed one down to 7, now activating another back to 8.
  assert.equal(additionalBranchChargeCents({ paidCapacity: 8, requiredCapacity: 8 }), 0);
});

test("charging in steps costs the same as charging at once", () => {
  const atOnce = additionalBranchChargeCents({ paidCapacity: 5, requiredCapacity: 9 });
  let stepwise = 0;
  for (let n = 5; n < 9; n++) {
    stepwise += additionalBranchChargeCents({ paidCapacity: n, requiredCapacity: n + 1 });
  }
  assert.equal(stepwise, atOnce);
  assert.equal(atOnce, 6000);
});

test("isAtPeriodCap recognises the ceiling", () => {
  assert.equal(isAtPeriodCap(19900), true);
  assert.equal(isAtPeriodCap(20000), true);
  assert.equal(isAtPeriodCap(19899), false);
  assert.equal(isAtPeriodCap(7900), false);
});

/* ------------------------------------------------------------------ *
 * 4. Money is written unambiguously
 * ------------------------------------------------------------------ */

test("money always carries USD, because $ alone is ambiguous", () => {
  // Authority section 13.
  assert.equal(formatUsd(7900), "$79 USD");
  assert.equal(formatUsd(1500), "$15 USD");
  assert.equal(formatUsd(19900), "$199 USD");
  assert.equal(formatUsd(0), "$0 USD");
});

test("a part-dollar amount keeps its cents", () => {
  assert.equal(formatUsd(7950), "$79.50 USD");
});

test("the three headline prices print as the authority writes them", () => {
  assert.equal(formatUsd(BASE_ROOM_PRICE_CENTS), "$79 USD");
  assert.equal(formatUsd(ADDITIONAL_BRANCH_PRICE_CENTS), "$15 USD");
  assert.equal(formatUsd(MAXIMUM_ROOM_PERIOD_PRICE_CENTS), "$199 USD");
});

/* ------------------------------------------------------------------ *
 * 5. What counts - authority section 7, condition by condition
 * ------------------------------------------------------------------ */

test("a fully admitted, active counterparty branch is billable", () => {
  assert.deepEqual(branchBillingVerdict(billableBranch()), { billable: true });
});

test("provider, adviser and internal workspaces are never billable", () => {
  // Authority section 5. This is the exclusion that protects the product's
  // whole shape: bringing in a lawyer must not cost $15.
  for (const kind of SUB_ROOM_KINDS.filter((k) => k !== "counterparty")) {
    assert.deepEqual(
      branchBillingVerdict(billableBranch({ subRoomKind: kind })),
      { billable: false, reason: "supporting_workspace" },
      `${kind} workspace must not be billable`,
    );
  }
});

test("every sub-room kind except counterparty is excluded, with none missed", () => {
  const billable = SUB_ROOM_KINDS.filter((kind) =>
    isBillableBranch(billableBranch({ subRoomKind: kind })),
  );
  assert.deepEqual(billable, ["counterparty"]);
  assert.deepEqual([...BILLABLE_SUB_ROOM_KINDS], ["counterparty"]);
});

test("a draft branch is free", () => {
  // Authority section 7: draft branches do not count. Section 8: preparing a
  // room and creating draft branches is part of the free journey.
  assert.deepEqual(branchBillingVerdict(billableBranch({ subRoomState: "draft" })), {
    billable: false,
    reason: "not_write_enabled",
  });
});

test("a branch awaiting admission is free", () => {
  for (const state of ["invitation_pending", "awaiting_admission"] as const) {
    assert.deepEqual(
      branchBillingVerdict(billableBranch({ subRoomState: state })),
      { billable: false, reason: "not_write_enabled" },
      state,
    );
  }
});

test("a closed branch is free", () => {
  assert.deepEqual(branchBillingVerdict(billableBranch({ subRoomState: "closed" })), {
    billable: false,
    reason: "not_write_enabled",
  });
});

test("blocked, paused and outcome-reached branches keep counting", () => {
  // Authority section 7: "Commercially live states such as active, paused,
  // blocked, or outcome-reached-but-not-formally-closed continue to count."
  // A branch does not become free because it hit a problem.
  for (const state of ["active", "blocked", "paused", "outcome_reached"] as const) {
    assert.equal(isBillableBranch(billableBranch({ subRoomState: state })), true, state);
  }
});

test("exactly four sub-room states are billable, and no state is unclassified", () => {
  const billable = SUB_ROOM_STATES.filter((state) =>
    isBillableBranch(billableBranch({ subRoomState: state })),
  );
  assert.deepEqual(billable, ["active", "blocked", "paused", "outcome_reached"]);
  assert.deepEqual([...BILLABLE_SUB_ROOM_STATES], billable);
  // Every state in the schema is decided one way or the other.
  assert.equal(SUB_ROOM_STATES.length, 8);
});

test("an invitation that was only sent does not start a charge", () => {
  // Authority section 8: "An unanswered, declined or expired pre-activation
  // invitation must never generate a charge."
  assert.deepEqual(branchBillingVerdict(billableBranch({ invitationState: "sent" })), {
    billable: false,
    reason: "invitation_not_accepted",
  });
});

test("a declined, expired or revoked invitation never charges", () => {
  for (const state of ["declined", "expired", "revoked"] as const) {
    assert.deepEqual(
      branchBillingVerdict(billableBranch({ invitationState: state })),
      { billable: false, reason: "invitation_not_accepted" },
      state,
    );
  }
});

test("a counterparty still inside the admission gate is free", () => {
  // Authority section 7 condition 3, and the states the Deal Room already uses
  // for the gate: invited, prerequisites_pending, terms_pending.
  for (const state of ["invited", "prerequisites_pending", "terms_pending"] as const) {
    assert.deepEqual(
      branchBillingVerdict(
        billableBranch({ counterparties: [counterparty({ participantState: state })] }),
      ),
      { billable: false, reason: "no_admitted_counterparty" },
      state,
    );
  }
});

test("a withdrawn, removed or suspended counterparty leaves nothing to bill", () => {
  for (const state of ["withdrawn", "removed", "suspended"] as const) {
    assert.deepEqual(
      branchBillingVerdict(
        billableBranch({ counterparties: [counterparty({ participantState: state })] }),
      ),
      { billable: false, reason: "no_admitted_counterparty" },
      state,
    );
  }
});

test("a branch with no counterparty at all is free", () => {
  assert.deepEqual(branchBillingVerdict(billableBranch({ counterparties: [] })), {
    billable: false,
    reason: "no_admitted_counterparty",
  });
});

test("an incomplete agreement set blocks the charge, one agreement at a time", () => {
  // Authority section 7 condition 3. Each of the four is individually required,
  // so dropping any one must stop the charge.
  for (const missing of REQUIRED_AGREEMENTS_FOR_BILLING) {
    const partial = REQUIRED_AGREEMENTS_FOR_BILLING.filter((k) => k !== missing);
    assert.deepEqual(
      branchBillingVerdict(
        billableBranch({ counterparties: [counterparty({ acceptedAgreements: partial })] }),
      ),
      { billable: false, reason: "agreements_incomplete" },
      `missing ${missing}`,
    );
  }
});

test("all four agreements are required, and there are four", () => {
  assert.deepEqual([...REQUIRED_AGREEMENTS_FOR_BILLING].sort(), [
    "authority_declaration",
    "nda",
    "participation",
    "room_rules",
  ]);
});

test("an observer or facilitator in a counterparty room does not create a charge", () => {
  // Ponte's own facilitator, or a watching party, is not a counterparty
  // negotiation.
  for (const cls of ["observer", "ponte_facilitator", "provider", "adviser"] as const) {
    assert.deepEqual(
      branchBillingVerdict(
        billableBranch({ counterparties: [counterparty({ participantClass: cls })] }),
      ),
      { billable: false, reason: "no_admitted_counterparty" },
      cls,
    );
  }
});

test("a broker fronting a principal counts - the OD-012 reading, made visible", () => {
  // Authority section 4 lists "a broker acting for a disclosed or controlled
  // principal" as a branch the room may contain; section 7 condition 1 says
  // "principal-counterparty". This test pins the reading actually implemented,
  // so a change of owner mind changes a named test rather than silently
  // changing what members are charged.
  assert.equal(
    isBillableBranch(
      billableBranch({ counterparties: [counterparty({ participantClass: "intermediary" })] }),
    ),
    true,
  );
  assert.deepEqual([...BILLABLE_PARTICIPANT_CLASSES], ["principal", "intermediary"]);
  // And the classes that are excluded on either reading stay excluded.
  const excluded = PARTICIPANT_CLASSES.filter((c) => !BILLABLE_PARTICIPANT_CLASSES.includes(c));
  assert.deepEqual(excluded, ["provider", "adviser", "ponte_facilitator", "observer"]);
});

test("one admitted, fully agreed counterparty is enough among several", () => {
  const facts = billableBranch({
    counterparties: [
      counterparty({ participantState: "invited" }),
      counterparty({ acceptedAgreements: ["nda"] }),
      counterparty({ participantState: "active" }),
    ],
  });
  assert.equal(isBillableBranch(facts), true);
});

test("a branch is counted once however many people are in it", () => {
  // Authority section 5: "several participants from the same commercial party"
  // are included. Section 14 forbids any per-user charge.
  const crowded = billableBranch({
    counterparties: [counterparty(), counterparty(), counterparty(), counterparty()],
  });
  assert.equal(countBillableBranches([crowded]), 1);
});

/* ------------------------------------------------------------------ *
 * 6. Counting, and the whole journey end to end
 * ------------------------------------------------------------------ */

test("counting ignores everything that is not billable", () => {
  const branches: BranchBillingFacts[] = [
    billableBranch(),
    billableBranch(),
    billableBranch({ subRoomKind: "provider" }),
    billableBranch({ subRoomKind: "adviser" }),
    billableBranch({ subRoomKind: "internal" }),
    billableBranch({ subRoomState: "draft" }),
    billableBranch({ invitationState: "declined" }),
    billableBranch({ counterparties: [] }),
  ];
  assert.equal(countBillableBranches(branches), 2);
  assert.equal(roomPeriodPriceCents(countBillableBranches(branches)), 7900);
});

test("an empty room still costs the base price", () => {
  assert.equal(countBillableBranches([]), 0);
  assert.equal(roomPeriodPriceCents(countBillableBranches([])), 7900);
});

test("the worked example: five live branches plus a legal and a logistics room", () => {
  const branches: BranchBillingFacts[] = [
    ...Array.from({ length: 5 }, () => billableBranch()),
    billableBranch({ subRoomKind: "provider" }),
    billableBranch({ subRoomKind: "provider" }),
    billableBranch({ subRoomKind: "internal" }),
  ];
  assert.equal(countBillableBranches(branches), 5);
  assert.equal(formatUsd(roomPeriodPriceCents(countBillableBranches(branches))), "$79 USD");
});

test("the worked example: a seventh buyer on a room paid for five", () => {
  const live = Array.from({ length: 7 }, () => billableBranch());
  const required = countBillableBranches(live);
  assert.equal(required, 7);
  assert.equal(
    formatUsd(additionalBranchChargeCents({ paidCapacity: 5, requiredCapacity: required })),
    "$30 USD",
  );
  assert.equal(formatUsd(roomPeriodPriceCents(required)), "$109 USD");
});

/* ------------------------------------------------------------------ *
 * 7. The two properties that are not arithmetic
 * ------------------------------------------------------------------ */

const SOURCE = readFileSync(join(process.cwd(), "lib/deal-room/pricing.ts"), "utf8");

/**
 * `[...s.matchAll(re)]` needs downlevelIteration under this tsconfig, which
 * declares no `target`. An exec loop is the portable form.
 */
function allMatches(source: string, pattern: RegExp): RegExpExecArray[] {
  const rx = new RegExp(pattern.source, pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`);
  const out: RegExpExecArray[] = [];
  let match: RegExpExecArray | null;
  while ((match = rx.exec(source)) !== null) {
    out.push(match);
    if (match[0] === "") rx.lastIndex++;
  }
  return out;
}

test("the engine is pure: no database, no network, no clock, no environment", () => {
  // The reason a charge is reproducible in a test is that nothing here reads
  // anything. Each of these would break that, quietly.
  for (const forbidden of [
    "createAdminClient",
    "createClient",
    "supabase",
    "fetch(",
    "process.env",
    "Date.now",
    "new Date",
    "Math.random",
    "require(",
  ]) {
    assert.ok(
      !SOURCE.includes(forbidden),
      `lib/deal-room/pricing.ts must not contain ${forbidden}`,
    );
  }
});

test("the engine imports types only, from one module", () => {
  const imports = allMatches(SOURCE, /^import\s+([\s\S]*?)from\s+"([^"]+)";/gm);
  assert.equal(imports.length, 1, "exactly one import");
  assert.equal(imports[0][2], "./states");
  assert.ok(imports[0][1].includes("type"), "the one import must be type-only");
});

test("prices are computed from a count, never from identified branches", () => {
  // Authority section 4 forbids "a total billing amount where that amount would
  // reveal branch count" reaching an unauthorised participant. The structural
  // defence is that the price functions never see a branch at all.
  assert.equal(roomPeriodPriceCents.length, 1);
  assert.equal(typeof roomPeriodPriceCents(3), "number");
  assert.equal(typeof additionalBranchChargeCents({ paidCapacity: 5, requiredCapacity: 6 }), "number");
  // And the one function that does see branches returns a bare number.
  assert.equal(typeof countBillableBranches([billableBranch()]), "number");
});

test("branch facts carry exactly the fields pricing needs, and no identifier", () => {
  // If somebody adds `subRoomRef`, `profileId`, an organisation or a name to
  // the facts types, an amount could start travelling with an identity, and
  // authority section 4 forbids a bill revealing who or how many.
  //
  // This is an allowlist rather than a forbidden-word scan, and deliberately:
  // the first draft of this test scanned for "ref:" and a field called
  // `subRoomRef` walked straight past it on the capital R. Any new field now
  // fails until somebody adds it here on purpose.
  const block = SOURCE.slice(
    SOURCE.indexOf("export interface CounterpartyFacts"),
    SOURCE.indexOf("export type NotBillableReason"),
  );
  assert.ok(block.length > 0, "the facts interfaces must be findable");

  const fields = allMatches(block, /^ {2}(\w+)\??:/gm)
    .map((m) => m[1])
    .sort();
  assert.deepEqual(fields, [
    "acceptedAgreements",
    "counterparties",
    "invitationState",
    "participantClass",
    "participantState",
    "subRoomKind",
    "subRoomState",
  ]);

  // None of them is an identifier, by inspection of the names themselves.
  for (const field of fields) {
    assert.ok(
      !/id$|^id|ref|name|email|org|profile|title|label/i.test(field),
      `branch facts must not carry ${field} - a bill must not reveal who is in a branch`,
    );
  }
});

test("the engine charges for nothing the authority forbids charging for", () => {
  // Authority section 14 and section 15. No per-user, per-document,
  // per-message, per-workspace, per-gigabyte or translation charge can exist
  // here, because no such quantity is an input to any function in this module.
  for (const forbidden of [
    "perUser",
    "perDocument",
    "perMessage",
    "perSeat",
    "gigabyte",
    "storage",
    "translation",
    "subscription",
    "credit",
    "retainer",
    "successFee",
    "commission",
    "percentage",
  ]) {
    assert.ok(
      !SOURCE.includes(forbidden),
      `lib/deal-room/pricing.ts must not reference ${forbidden}`,
    );
  }
});

function importersUnder(dir: string): string[] {
  try {
    const out = execSync(`git grep -l "deal-room/pricing" -- ${dir}`, {
      encoding: "utf8",
      cwd: process.cwd(),
    });
    return out.split("\n").filter(Boolean);
  } catch {
    return []; // git grep exits 1 when it finds nothing, which is the pass.
  }
}

test("nothing is wired to this module yet, which is the Stage 2 boundary", () => {
  // Stage 2 delivers the engine and its proof. Charging, entitlements, Stripe
  // and every surface are later stages behind their own owner approval, so a
  // caller appearing here without one is a scope breach, not progress. When
  // Stage 4 or 6 legitimately wires it, this assertion is the thing that has to
  // be changed deliberately.
  const callers = ["app", "components"].flatMap(importersUnder);
  assert.deepEqual(callers, [], `nothing may import deal-room/pricing yet, found: ${callers}`);
});

console.log(`ok   deal-room pricing: ${passed} assertions passed`);
