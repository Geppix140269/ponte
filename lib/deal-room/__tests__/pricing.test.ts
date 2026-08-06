// Deal Room pricing: the engine, the billable-branch contract, and the two
// properties that are not about arithmetic - purity and non-disclosure.
//
// Authority: PT-COMMERCIAL-2026-07-31-01, recorded by ADR-0020.
//
// Run: npx tsx lib/deal-room/__tests__/pricing.test.ts

import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  PERIOD_CALENDAR_DAYS,
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
  FIRST_ACTIVATION_WAIVED_BRANCHES,
  WAIVED_PERIOD_ADDITIONAL_CAP_CENTS,
  amountDueCents,
  periodCharge,
  wouldEndWaiver,
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
  assert.equal(PERIOD_CALENDAR_DAYS, 30);
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

test("a broker fronting a principal counts - settled by the owner, OD-012", () => {
  // Owner decision of 31 July 2026, recorded as Amendment 1 to the authority.
  // Section 7 condition 1 said "principal-counterparty" while section 4 gave "a
  // broker acting for a disclosed or controlled principal" as an example of a
  // branch; a broker is an `intermediary` here. The owner resolved it toward
  // section 4 and amended section 7 to match, because the alternative would make
  // every brokered negotiation free. This test pins the settled reading.
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

/**
 * Every file under `dir` that IMPORTS the pricing module.
 *
 * Two rewrites, both worth recording because each failure mode is worse than
 * the one before it.
 *
 * The first version shelled out to `git grep` for the bare path. It matched
 * PROSE - it reported `deal-rooms/inside/page.tsx`, whose doc comment says the
 * price is read from this module - and it missed every relative import, so
 * `lib/deal-room/walkthrough.ts` was invisible to it. A guard that fires on a
 * comment and stays silent on code trains its reader to work around it.
 *
 * The second version fixed the pattern and broke the shell quoting on Windows.
 * `git grep` exited non-zero, the catch below returned an empty list, and the
 * assertion PASSED. A boundary that reports success when its own machinery has
 * failed is worse than no boundary at all, because it is believed.
 *
 * So there is no shell. It reads the files and matches an import statement.
 */
function importersUnder(dir: string): string[] {
  const out: string[] = [];
  const walk = (path: string) => {
    for (const entry of readdirSync(path, { withFileTypes: true })) {
      if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
      const full = `${path}/${entry.name}`;
      if (entry.isDirectory()) {
        walk(full);
        continue;
      }
      if (!/\.(ts|tsx)$/.test(entry.name)) continue;
      const source = readFileSync(full, "utf8");
      // An import specifier ending in the module, by either route:
      //   "@/lib/deal-room/pricing"   from anywhere
      //   "./pricing"                 from a sibling
      if (/from\s+["'](?:[^"']*deal-room\/pricing|\.\/pricing)["']/.test(source)) {
        out.push(full);
      }
    }
  };
  walk(dir);
  return out;
}

test("nothing is wired to this module yet, which is the Stage 2 boundary", () => {
  // Stage 2 delivers the engine and its proof. Charging, entitlements, Stripe
  // and every surface are later stages behind their own owner approval, so a
  // caller appearing here without one is a scope breach, not progress. When a
  // later stage legitimately wires it, this assertion is the thing that has to
  // be changed deliberately.
  //
  // What this boundary is actually about: SURFACES, and modules outside the
  // pricing engine's own directory. Siblings inside `lib/deal-room/` compose
  // each other by design - billing, charging and period-lifecycle all read the
  // constants, and always did - so scanning them produces noise rather than a
  // finding. They are excluded by path, not listed by name, so a new sibling
  // does not have to be added here to be legitimate.
  //
  // One surface is approved, and only one:
  //
  //   DealRoomPreview.tsx   ADR-0022. The room on the entrance. It prints the
  //                         price, and binding that to this module rather than
  //                         to a literal is precisely how a surface is stopped
  //                         from quoting a figure the product does not charge.
  //
  // `lib/deal-room/walkthrough.ts` also prints prices, under ADR-0028, and is
  // inside the directory. That is deliberate: the walkthrough's copy is data
  // about the commercial model, and it belongs beside the model rather than in
  // a component.
  //
  // Charging, entitlements, Stripe and the room surfaces remain behind their
  // own owner approval. A second SURFACE name here is still a scope breach.
  const APPROVED = ["components/home/landing/DealRoomPreview.tsx"];
  const found = ["app", "components", "lib"].flatMap(importersUnder)
    .map((f) => f.split(String.fromCharCode(92)).join("/"));

  // The machinery proves itself before it is believed.
  //
  // The previous version of this guard broke its own shell command, found
  // nothing, and passed. An empty result is indistinguishable from a working
  // scan unless the scan is known to be able to find something, so it is
  // asserted against the two importers that certainly exist.
  for (const known of ["components/home/landing/DealRoomPreview.tsx", "lib/deal-room/walkthrough.ts"]) {
    assert.ok(
      found.some((f) => f.endsWith(known)),
      `the importer scan is broken: it did not find ${known}, so an empty result proves nothing`,
    );
  }

  const callers = found
    .filter((f) => !f.startsWith("lib/deal-room/"))
    .filter((f) => !APPROVED.some((a) => f.endsWith(a)));
  assert.deepEqual(callers, [], `nothing else may import deal-room/pricing yet, found: ${callers}`);
});

/* ------------------------------------------------------------------ *
 * The first-activation waiver (ADR-0029)
 *
 * The waiver is a DISCOUNT on the curve above, not a second product. Most of
 * what follows exists to keep it that way: if these pass, there is exactly one
 * price curve in this module and the waived path is the same arithmetic with
 * something taken off.
 * ------------------------------------------------------------------ */

test("waiver: one branch, first activation, costs nothing", () => {
  assert.equal(amountDueCents(1, true), 0);
});

test("waiver: one branch WITHOUT the waiver is the ordinary $79", () => {
  // The row that proves the waiver is a discount and not a price. Same input,
  // different eligibility, and the difference is the whole base fee.
  assert.equal(amountDueCents(1, false), 7900);
});

test("waiver: a second branch ends it, and the standard five apply from there", () => {
  // ADR-0029 refuses the alternative - $15 from the second branch - because it
  // would charge for branches already inside the $79 package. So two through
  // five are $79 flat, exactly as in any room.
  for (const branches of [2, 3, 4, 5]) {
    assert.equal(amountDueCents(branches, true), 7900, `${branches} branches under a lapsed waiver`);
  }
});

test("waiver: the $15 charge still begins at the sixth branch", () => {
  assert.equal(amountDueCents(6, true), 9400);
  assert.equal(amountDueCents(7, true), 10900);
  assert.equal(amountDueCents(8, true), 12400);
});

test("waiver: a waived period still reaches the $199 ceiling", () => {
  for (const branches of [13, 14, 20, 100]) {
    assert.equal(amountDueCents(branches, true), 19900, `${branches} branches`);
  }
});

test("waiver: THE identity - the two curves are the same from two branches up", () => {
  /*
    The single most important assertion in this section.

    If it ever fails, a second price curve has been introduced and the thing
    ADR-0029 explicitly refused has happened by accident. Checked well past the
    cap so a divergence cannot hide in the flat tail.
  */
  for (let branches = 2; branches <= 40; branches += 1) {
    assert.equal(
      amountDueCents(branches, true),
      amountDueCents(branches, false),
      `the waived and unwaived curves diverge at ${branches} branches`,
    );
    assert.equal(
      amountDueCents(branches, false),
      roomPeriodPriceCents(branches),
      `the unwaived curve is no longer roomPeriodPriceCents at ${branches} branches`,
    );
  }
});

test("waiver: the list price is always real, so $79 / -$79 / $0 can be shown", () => {
  /*
    ADR-0020 section 17 requires the activation screen to show the list price,
    the reduction and the total, and forbids a silently free room. That needs a
    genuine list price behind it - a function returning only `0` could not
    render the middle line.
  */
  const waived = periodCharge(1, true);
  assert.equal(waived.listCents, 7900, "the list price vanished under the waiver");
  assert.equal(waived.discountCents, 7900, "there is nothing to show on the middle line");
  assert.equal(waived.amountDueCents, 0);
  assert.equal(waived.waiverApplied, true);
  // Rendered by the module's own formatter, so the three lines of section 17
  // are demonstrably producible rather than assumed.
  assert.equal(formatUsd(waived.listCents), "$79 USD");
  assert.equal(formatUsd(waived.amountDueCents), "$0 USD");
});

test("waiver: a charge always reconciles - list minus discount is the total", () => {
  // Cheap, and it catches any future edit that computes the total separately
  // from the two numbers shown to the member.
  for (const eligible of [true, false]) {
    for (let branches = 0; branches <= 20; branches += 1) {
      const c = periodCharge(branches, eligible);
      assert.equal(
        c.listCents - c.discountCents,
        c.amountDueCents,
        `${branches} branches, eligible=${eligible}`,
      );
      assert.ok(c.discountCents >= 0, "a discount may never be negative");
      assert.ok(c.amountDueCents >= 0, "an amount due may never be negative");
      assert.ok(c.discountCents <= c.listCents, "a discount may never exceed the list price");
    }
  }
});

test("waiver: the notice fires BEFORE the second branch, not after", () => {
  // WO-7.5 requires the lapse notice before the action. A member about to owe
  // $79 finds out first.
  assert.equal(wouldEndWaiver(2, true), true);
  assert.equal(wouldEndWaiver(1, true), false, "staying at one branch does not end the waiver");
  assert.equal(wouldEndWaiver(6, true), true);
  // Nothing to end when no waiver is held.
  assert.equal(wouldEndWaiver(2, false), false);
  assert.equal(wouldEndWaiver(9, false), false);
});

test("waiver: the additional-branch cap is derived, not typed", () => {
  // $120, so that $79 + $120 lands exactly on the $199 ceiling. Derived from
  // the two constants so the three numbers cannot drift apart.
  assert.equal(WAIVED_PERIOD_ADDITIONAL_CAP_CENTS, 12000);
  assert.equal(
    BASE_ROOM_PRICE_CENTS + WAIVED_PERIOD_ADDITIONAL_CAP_CENTS,
    MAXIMUM_ROOM_PERIOD_PRICE_CENTS,
    "the waived cap no longer reaches the same ceiling as any other period",
  );
});

test("waiver: it is one branch, and that number is stated once", () => {
  assert.equal(FIRST_ACTIVATION_WAIVED_BRANCHES, 1);
  assert.ok(
    FIRST_ACTIVATION_WAIVED_BRANCHES < INCLUDED_ACTIVE_BRANCHES,
    "the waiver no longer restricts capacity below the standard allowance",
  );
});

test("waiver: it rejects a non-integer or negative count like everything else", () => {
  // The same guard as the rest of the module. A fractional branch is a bug in
  // the caller, and a charge computed from one is a charge that is wrong.
  assert.throws(() => amountDueCents(1.5, true), TypeError);
  assert.throws(() => amountDueCents(-1, true), RangeError);
  assert.throws(() => wouldEndWaiver(2.5, true), TypeError);
});

test("waiver: it stays pure - no clock, no database, no environment", () => {
  /*
    Eligibility is a BOOLEAN the caller decides, deliberately. Whether an
    organisation still holds its waiver is a database question with an
    unresolved uniqueness rule behind it (WO-7.1), and answering it here would
    drag a clock and a connection into a module whose whole value is that it
    has neither.
  */
  const first = periodCharge(1, true);
  const second = periodCharge(1, true);
  assert.deepEqual(first, second, "the same inputs gave different answers");
});

console.log(`ok   deal-room pricing: ${passed} assertions passed`);
