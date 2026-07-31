// Deal Room charging: the gate, what a checkout would charge, and what a
// webhook should do with a verified event.
//
// Charging is OFF. These tests exercise the decisions a charge would take, not
// a charge. No Stripe object exists, no key is set, and no route can run.
//
// Run: npx tsx lib/deal-room/__tests__/charging.test.ts

import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  additionalBranchCharge,
  chargingEnabled,
  chargingUnavailableReason,
  fulfilmentDecision,
  reactivationCharge,
  roomActivationCharge,
  shouldProviderRetry,
  type BillingRecordFacts,
  type FulfilmentDecision,
  type ProviderEventFacts,
} from "../charging";

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

const SOURCE = readFileSync(join(process.cwd(), "lib/deal-room/charging.ts"), "utf8");

/** Restore the environment after a test that moves it. */
function withEnv(vars: Record<string, string | undefined>, fn: () => void): void {
  const keys = [
    "DEAL_ROOM_BILLING",
    "NEXT_PUBLIC_DEAL_ROOM",
    "STRIPE_SECRET_KEY",
    "STRIPE_WEBHOOK_SECRET",
  ];
  const saved: Record<string, string | undefined> = {};
  for (const k of keys) saved[k] = process.env[k];
  try {
    for (const k of keys) delete process.env[k];
    for (const [k, v] of Object.entries(vars)) {
      if (v !== undefined) process.env[k] = v;
    }
    fn();
  } finally {
    for (const k of keys) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  }
}

const ALL_ON = {
  DEAL_ROOM_BILLING: "on",
  NEXT_PUBLIC_DEAL_ROOM: "on",
  STRIPE_SECRET_KEY: "sk_test_not_a_real_key",
  STRIPE_WEBHOOK_SECRET: "whsec_not_a_real_secret",
};

/* ------------------------------------------------------------------ *
 * 1. The gate is off, and every condition is load-bearing
 * ------------------------------------------------------------------ */

test("charging is off in this repository as it stands", () => {
  // The condition that matters most: with the environment as any contributor
  // or CI actually has it, Ponte cannot create a charge.
  assert.equal(chargingEnabled(), false);
  assert.notEqual(chargingUnavailableReason(), null);
});

test("charging is off unless all four conditions hold", () => {
  withEnv(ALL_ON, () => assert.equal(chargingEnabled(), true, "all four on"));

  for (const missing of Object.keys(ALL_ON)) {
    const partial = { ...ALL_ON, [missing]: undefined };
    withEnv(partial, () => {
      assert.equal(chargingEnabled(), false, `must be off without ${missing}`);
      assert.match(chargingUnavailableReason() ?? "", new RegExp(missing));
    });
  }
});

test("a charge cannot be started when it could not be confirmed", () => {
  // The webhook secret gates CHECKOUT, not only fulfilment. Taking money that
  // cannot be verifiably fulfilled trades a member's money for a log line.
  withEnv({ ...ALL_ON, STRIPE_WEBHOOK_SECRET: undefined }, () => {
    assert.equal(chargingEnabled(), false);
    assert.match(chargingUnavailableReason() ?? "", /STRIPE_WEBHOOK_SECRET/);
  });
});

test("the billing switch is server-only and cannot be set from a browser", () => {
  assert.ok(
    !SOURCE.includes("NEXT_PUBLIC_DEAL_ROOM_BILLING"),
    "the charging switch must not be a NEXT_PUBLIC_ variable",
  );
  assert.ok(SOURCE.includes('process.env.DEAL_ROOM_BILLING !== "on"'));
});

test("anything other than exactly `on` is off", () => {
  for (const value of ["", "off", "true", "1", "ON", "yes"]) {
    withEnv({ ...ALL_ON, DEAL_ROOM_BILLING: value }, () => {
      assert.equal(chargingEnabled(), false, `DEAL_ROOM_BILLING=${value} must be off`);
    });
  }
});

/* ------------------------------------------------------------------ *
 * 2. What a checkout would charge
 * ------------------------------------------------------------------ */

test("opening a room charges $79 and says so", () => {
  const intent = roomActivationCharge({ requestedCapacity: 5 });
  assert.equal(intent.chargeable, true);
  if (!intent.chargeable) return;
  assert.equal(intent.amountCents, 7900);
  assert.equal(intent.currency, "usd");
  assert.equal(intent.kind, "room_activation");
  assert.match(intent.description, /\$79 USD/);
  assert.match(intent.description, /30 active days/);
});

test("nobody can buy fewer than the five branches the base price includes", () => {
  for (const asked of [0, 1, 4, 5]) {
    const intent = roomActivationCharge({ requestedCapacity: asked });
    assert.equal(intent.chargeable, true);
    if (!intent.chargeable) return;
    assert.equal(intent.capacityAfter, 5, `asked ${asked}`);
    assert.equal(intent.amountCents, 7900);
  }
});

test("opening with eight branches charges $124 up front", () => {
  const intent = roomActivationCharge({ requestedCapacity: 8 });
  assert.equal(intent.chargeable, true);
  if (!intent.chargeable) return;
  assert.equal(intent.amountCents, 12400);
});

test("a sixth branch on a room paid for five charges exactly $15", () => {
  const intent = additionalBranchCharge({ paidCapacity: 5, requiredCapacity: 6 });
  assert.equal(intent.chargeable, true);
  if (!intent.chargeable) return;
  assert.equal(intent.amountCents, 1500);
  assert.equal(intent.kind, "additional_branch");
  assert.match(intent.description, /One additional active branch/);
  assert.match(intent.description, /\$15 USD/);
});

test("three more branches read as one exact amount, shown before payment", () => {
  const intent = additionalBranchCharge({ paidCapacity: 5, requiredCapacity: 8 });
  assert.equal(intent.chargeable, true);
  if (!intent.chargeable) return;
  assert.equal(intent.amountCents, 4500);
  assert.match(intent.description, /3 additional active branches/);
  assert.match(intent.description, /\$45 USD/);
});

test("a branch charge never names a counterparty, a branch or a competitor", () => {
  // Authority section 10: the billing explanation must expose no branch
  // identity and no competing negotiation. It counts slots and nothing else.
  const intent = additionalBranchCharge({ paidCapacity: 5, requiredCapacity: 9 });
  assert.equal(intent.chargeable, true);
  if (!intent.chargeable) return;
  for (const leak of ["buyer", "counterparty", "branch with", "negotiation", "@", "Ltd", "GmbH"]) {
    assert.ok(
      !intent.description.toLowerCase().includes(leak.toLowerCase()),
      `the description must not contain ${leak}`,
    );
  }
});

test("at the cap, an extra branch costs nothing and is not a failure", () => {
  // Authority section 10: once the period reaches $199, further activations
  // during that period require no charge. The branch simply activates.
  const intent = additionalBranchCharge({ paidCapacity: 13, requiredCapacity: 14 });
  assert.deepEqual(intent, { chargeable: false, reason: "nothing_to_charge" });
});

test("a capacity that is not increasing produces no charge", () => {
  assert.deepEqual(additionalBranchCharge({ paidCapacity: 8, requiredCapacity: 8 }), {
    chargeable: false,
    reason: "capacity_not_increasing",
  });
  assert.deepEqual(additionalBranchCharge({ paidCapacity: 8, requiredCapacity: 3 }), {
    chargeable: false,
    reason: "capacity_not_increasing",
  });
});

test("a branch charge is capped even when the increase is large", () => {
  const intent = additionalBranchCharge({ paidCapacity: 5, requiredCapacity: 200 });
  assert.equal(intent.chargeable, true);
  if (!intent.chargeable) return;
  assert.equal(intent.amountCents, 12000, "5 to the cap is $120, never more");
});

test("reactivation prices the branches chosen to resume, not the old period", () => {
  // Authority section 12.
  const intent = reactivationCharge({ branchesToResume: 2 });
  assert.equal(intent.chargeable, true);
  if (!intent.chargeable) return;
  assert.equal(intent.amountCents, 7900, "two branches resume at the base price");
  assert.equal(intent.kind, "reactivation");
  assert.match(intent.description, /new 30-day period/);
});

test("no checkout function accepts an amount from its caller", () => {
  // The client must never determine the amount. Structurally: there is no
  // parameter anywhere in this module through which one could arrive.
  for (const forbidden of ["amountCents:", "priceCents:", "unitAmount", "amount_total:"]) {
    const inParams = new RegExp(`\\(args: \\{[^}]*${forbidden}`, "s").test(SOURCE);
    assert.ok(!inParams, `no function may take ${forbidden} as an argument`);
  }
});

/* ------------------------------------------------------------------ *
 * 3. What a webhook should do
 * ------------------------------------------------------------------ */

function paidEvent(over: Partial<ProviderEventFacts> = {}): ProviderEventFacts {
  return {
    providerEventId: "evt_1",
    type: "checkout.session.completed",
    paymentStatus: "paid",
    amountTotalCents: 7900,
    roomId: "room-1",
    kind: "room_activation",
    expectedAmountCents: 7900,
    capacityAfter: 5,
    ...over,
  };
}

function record(over: Partial<BillingRecordFacts> = {}): BillingRecordFacts {
  return { alreadyRecorded: false, periodExists: true, periodPaidCents: 0, ...over };
}

test("a paid, matching, first-time event is fulfilled", () => {
  assert.deepEqual(fulfilmentDecision(paidEvent(), record()), {
    action: "fulfil",
    kind: "room_activation",
    amountCents: 7900,
    capacityAfter: 5,
  });
});

test("an event of another type is acknowledged and ignored", () => {
  const d = fulfilmentDecision(paidEvent({ type: "invoice.paid" }), record());
  assert.equal(d.action, "ignore");
});

test("an unpaid session is never fulfilled", () => {
  for (const status of ["unpaid", "no_payment_required", "pending", ""]) {
    const d = fulfilmentDecision(paidEvent({ paymentStatus: status }), record());
    assert.equal(d.action, "ignore", status);
  }
});

test("a replayed event is recognised before anything can grant twice", () => {
  const d = fulfilmentDecision(paidEvent(), record({ alreadyRecorded: true }));
  assert.equal(d.action, "already_fulfilled");
});

test("a replay is checked before the amount, the cap and everything else", () => {
  // Even a malformed replay must not be re-graded and possibly re-granted.
  const d = fulfilmentDecision(
    paidEvent({ amountTotalCents: 999999, kind: "nonsense" }),
    record({ alreadyRecorded: true }),
  );
  assert.equal(d.action, "already_fulfilled");
});

test("money with nowhere to land is an orphan, loud and not retried", () => {
  const noRoom = fulfilmentDecision(paidEvent({ roomId: null }), record());
  assert.equal(noRoom.action, "orphan");

  const noPeriod = fulfilmentDecision(paidEvent(), record({ periodExists: false }));
  assert.equal(noPeriod.action, "orphan");

  assert.equal(shouldProviderRetry({ decision: noPeriod, writeFailed: false }), false);
  assert.equal(shouldProviderRetry({ decision: noPeriod, writeFailed: true }), false);
});

test("an unknown billing kind is refused rather than guessed", () => {
  for (const kind of [null, "", "subscription", "credit_pack", "retainer"]) {
    const d = fulfilmentDecision(paidEvent({ kind }), record());
    assert.equal(d.action, "refuse", String(kind));
  }
});

test("a collected amount that differs from the priced amount is refused", () => {
  // In both directions. Under-collection is a loss; over-collection is worse.
  const under = fulfilmentDecision(
    paidEvent({ amountTotalCents: 100, expectedAmountCents: 7900 }),
    record(),
  );
  assert.equal(under.action, "refuse");

  const over = fulfilmentDecision(
    paidEvent({ amountTotalCents: 79000, expectedAmountCents: 7900 }),
    record(),
  );
  assert.equal(over.action, "refuse");
});

test("a session with no expected amount is refused, not trusted", () => {
  const d = fulfilmentDecision(paidEvent({ expectedAmountCents: null }), record());
  assert.equal(d.action, "refuse");
});

test("a branch charge against a period already at the cap is refused", () => {
  const d = fulfilmentDecision(
    paidEvent({ kind: "additional_branch", amountTotalCents: 1500, expectedAmountCents: 1500 }),
    record({ periodPaidCents: 19900 }),
  );
  assert.equal(d.action, "refuse");
  assert.match((d as { reason: string }).reason, /cap/);
});

test("a charge that would take the period past $199 in total is refused", () => {
  // The cap is a period total, not a per-charge limit. 19000 + 1500 = 20500.
  const d = fulfilmentDecision(
    paidEvent({ kind: "additional_branch", amountTotalCents: 1500, expectedAmountCents: 1500 }),
    record({ periodPaidCents: 19000 }),
  );
  assert.equal(d.action, "refuse");
});

test("a zero-amount branch charge cannot buy capacity on a capped period", () => {
  // This is the case that proves the two cap checks are not redundant, and it
  // was found by deleting the first one and noticing that every test still
  // passed. The total-based check alone lets this through - 19900 + 0 is not
  // greater than 19900 - so a session claiming to have collected nothing would
  // be fulfilled and would grant branch capacity for free. The
  // kind-and-already-at-cap check is what refuses it.
  const d = fulfilmentDecision(
    paidEvent({ kind: "additional_branch", amountTotalCents: 0, expectedAmountCents: 0 }),
    record({ periodPaidCents: 19900 }),
  );
  assert.equal(d.action, "refuse");
  assert.match((d as { reason: string }).reason, /already at the cap/);
});

test("a charge that lands exactly on the cap is fulfilled", () => {
  const d = fulfilmentDecision(
    paidEvent({ kind: "additional_branch", amountTotalCents: 900, expectedAmountCents: 900 }),
    record({ periodPaidCents: 19000 }),
  );
  assert.equal(d.action, "fulfil");
});

test("out-of-order events cannot double-grant, because the record decides", () => {
  // Two deliveries of the same event, the second after the first was recorded.
  const event = paidEvent();
  const first = fulfilmentDecision(event, record());
  assert.equal(first.action, "fulfil");
  const second = fulfilmentDecision(event, record({ alreadyRecorded: true }));
  assert.equal(second.action, "already_fulfilled");
});

test("only a fulfil whose write failed asks the provider to retry", () => {
  const outcomes: FulfilmentDecision[] = [
    { action: "ignore", reason: "x" },
    { action: "already_fulfilled", reason: "x" },
    { action: "orphan", reason: "x" },
    { action: "refuse", reason: "x" },
  ];
  for (const decision of outcomes) {
    assert.equal(shouldProviderRetry({ decision, writeFailed: false }), false, decision.action);
    assert.equal(shouldProviderRetry({ decision, writeFailed: true }), false, decision.action);
  }
  const fulfil: FulfilmentDecision = {
    action: "fulfil",
    kind: "room_activation",
    amountCents: 7900,
    capacityAfter: 5,
  };
  assert.equal(shouldProviderRetry({ decision: fulfil, writeFailed: false }), false);
  assert.equal(shouldProviderRetry({ decision: fulfil, writeFailed: true }), true);
});

/* ------------------------------------------------------------------ *
 * 4. Purity, and the Stage 4 boundary
 * ------------------------------------------------------------------ */

test("the decisions read nothing but their arguments", () => {
  // `process.env` appears only inside the gate. Every other function in this
  // module must be a function of what it was handed.
  const withoutGate = SOURCE.slice(SOURCE.indexOf("2. What a checkout would charge"));
  for (const forbidden of [
    "process.env",
    "createAdminClient",
    "supabase",
    "fetch(",
    "Date.now",
    "new Date(",
    "Math.random",
  ]) {
    assert.ok(!withoutGate.includes(forbidden), `the decisions must not contain ${forbidden}`);
  }
});

test("the module never imports the Stripe SDK", () => {
  // The decision layer has to be testable without it, and a narrow fact shape
  // is one that cannot smuggle an unexamined provider field into a money
  // decision.
  assert.ok(!SOURCE.includes('from "stripe"'), "charging.ts must not import stripe");
  assert.ok(!SOURCE.includes("@/lib/stripe"), "charging.ts must not import the Stripe client");
});

function importersUnder(dir: string): string[] {
  try {
    return execSync(`git grep -l "deal-room/charging" -- ${dir}`, {
      encoding: "utf8",
      cwd: process.cwd(),
    })
      .split("\n")
      .filter(Boolean);
  } catch {
    return [];
  }
}

test("no route or component is wired to charging yet, which is the Stage 4 boundary", () => {
  // Stage 4 delivers the decisions. The HTTP surfaces that could take money are
  // a later step behind the owner gates in authority section 20 - Stripe
  // catalogue, secrets, webhook endpoint. A caller here without those is a
  // scope breach, not progress.
  const callers = ["app", "components"].flatMap(importersUnder);
  assert.deepEqual(callers, [], `nothing may import deal-room/charging yet, found: ${callers}`);
});

console.log(`ok   deal-room charging: ${passed} assertions passed`);
