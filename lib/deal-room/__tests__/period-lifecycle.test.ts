// Expiry and reactivation: what a lapsed Deal Room still is, and what resuming
// it costs.
//
// The property that matters most here is not a price. It is that no reachable
// combination of inputs produces a room a member cannot read.
//
// Run: npx tsx lib/deal-room/__tests__/period-lifecycle.test.ts

import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ROOM_PERIOD_STATES } from "../billing";
import {
  CHANGED_ON_EXPIRY,
  PRESERVED_ON_EXPIRY,
  RENEWAL_POLICY,
  activeDaysRemaining,
  branchActivationNeedsPayment,
  reactivationQuote,
  roomAccessAt,
  type PeriodFacts,
} from "../period-lifecycle";

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

const SOURCE = readFileSync(join(process.cwd(), "lib/deal-room/period-lifecycle.ts"), "utf8");

const START = new Date("2026-08-01T00:00:00.000Z");
const MID = new Date("2026-08-15T00:00:00.000Z");
const END = new Date("2026-08-31T00:00:00.000Z");
const AFTER = new Date("2026-09-05T00:00:00.000Z");

function period(over: Partial<PeriodFacts> = {}): PeriodFacts {
  return {
    state: "active",
    periodStart: START,
    periodEnd: END,
    purchasedBranchCapacity: 5,
    ...over,
  };
}

/* ------------------------------------------------------------------ *
 * 1. The guarantee: a Deal Room is always readable
 * ------------------------------------------------------------------ */

test("no combination of period state and instant makes a room unreadable", () => {
  // Authority section 12: "The commercial record must never be held hostage
  // behind a continuing subscription." This walks every state against every
  // instant either side of the window, plus the no-period case.
  const instants = [
    new Date("2026-07-01T00:00:00.000Z"),
    START,
    MID,
    END,
    AFTER,
  ];
  for (const state of ROOM_PERIOD_STATES) {
    for (const at of instants) {
      const access = roomAccessAt(period({ state }), at);
      assert.equal(access.readable, true, `${state} at ${at.toISOString()}`);
    }
  }
  for (const at of instants) {
    assert.equal(roomAccessAt(null, at).readable, true, "no period at all");
  }
});

test("every room period state is decided, and none is unclassified", () => {
  assert.equal(ROOM_PERIOD_STATES.length, 4);
  for (const state of ROOM_PERIOD_STATES) {
    const access = roomAccessAt(period({ state }), MID);
    assert.ok(
      ["period_active", "period_expired", "period_pending_confirmation", "period_cancelled"].includes(
        access.reason,
      ),
      `${state} produced ${access.reason}`,
    );
  }
});

/* ------------------------------------------------------------------ *
 * 2. When a room is writable
 * ------------------------------------------------------------------ */

test("an active period inside its window is writable", () => {
  assert.deepEqual(roomAccessAt(period(), MID), {
    readable: true,
    writable: true,
    reason: "period_active",
  });
});

test("the window is half-open: the start is in, the end is out", () => {
  assert.equal(roomAccessAt(period(), START).writable, true, "the first instant is paid for");
  assert.equal(roomAccessAt(period(), END).writable, false, "the end instant belongs to nobody");
});

test("a row still marked active past its end does not keep a room writable", () => {
  // A sweep that has not run yet is not a commercial entitlement. Both the
  // state and the window are required.
  assert.equal(roomAccessAt(period({ state: "active" }), AFTER).writable, false);
  assert.equal(roomAccessAt(period({ state: "active" }), AFTER).reason, "period_expired");
});

test("a pending period enables nothing", () => {
  // Authority section 9: a browser return is not authoritative.
  const access = roomAccessAt(period({ state: "pending" }), MID);
  assert.equal(access.writable, false);
  assert.equal(access.reason, "period_pending_confirmation");
});

test("a cancelled period enables nothing and is named as cancelled", () => {
  const access = roomAccessAt(period({ state: "cancelled" }), MID);
  assert.equal(access.writable, false);
  assert.equal(access.reason, "period_cancelled");
});

test("a room that never bought a period is readable and not writable", () => {
  assert.deepEqual(roomAccessAt(null, MID), {
    readable: true,
    writable: false,
    reason: "no_period_purchased",
  });
});

test("an expired period is readable, not writable, and says so plainly", () => {
  const access = roomAccessAt(period({ state: "expired" }), AFTER);
  assert.equal(access.readable, true);
  assert.equal(access.writable, false);
  assert.equal(access.reason, "period_expired");
});

/* ------------------------------------------------------------------ *
 * 3. Days remaining
 * ------------------------------------------------------------------ */

test("days remaining rounds up, so four hours left is one day", () => {
  const nearlyOver = new Date(END.getTime() - 4 * 60 * 60 * 1000);
  assert.equal(activeDaysRemaining(period(), nearlyOver), 1);
});

test("days remaining is 30 at the start and 0 once past the end", () => {
  assert.equal(activeDaysRemaining(period(), START), 30);
  assert.equal(activeDaysRemaining(period(), AFTER), 0);
});

test("days remaining is null when no period is running", () => {
  assert.equal(activeDaysRemaining(null, MID), null);
  assert.equal(activeDaysRemaining(period({ state: "expired" }), MID), null);
  assert.equal(activeDaysRemaining(period({ state: "pending" }), MID), null);
});

/* ------------------------------------------------------------------ *
 * 4. What expiry preserves, and what it changes
 * ------------------------------------------------------------------ */

test("expiry preserves everything authority section 12 lists", () => {
  const expected = [
    "nothing_is_deleted",
    "participants_are_not_removed",
    "agreements_remain_intact",
    "evidence_remains_intact",
    "translations_remain_intact",
    "activity_remains_intact",
    "branch_isolation_stays_enforced",
    "permissions_stay_enforced",
    "authorised_participants_retain_their_record",
  ];
  assert.deepEqual([...PRESERVED_ON_EXPIRY], expected);
});

test("expiry changes exactly one thing", () => {
  // If this list ever grows, the growth is a decision that needs an owner.
  assert.equal(CHANGED_ON_EXPIRY.length, 1);
  assert.deepEqual([...CHANGED_ON_EXPIRY], ["room_and_branches_become_read_only"]);
});

test("nothing in this module deletes, removes or revokes", () => {
  // The guarantee is structural: there is no function here that could take
  // something away, so no caller can be given one by accident.
  for (const forbidden of ["delete", "remove", "revoke", "purge", "destroy", "erase"]) {
    assert.ok(
      !new RegExp(`function \\w*${forbidden}`, "i").test(SOURCE),
      `period-lifecycle must export no ${forbidden} function`,
    );
  }
});

test("renewal is manual, and that is recorded as a decision", () => {
  // Authority section 12: no silent auto-renewal at launch. "We did not build
  // renewal" and "renewal is deliberately manual" look identical in a codebase.
  assert.equal(RENEWAL_POLICY, "manual_only_no_silent_auto_renewal");
  assert.ok(!/autoRenew|auto_renew|renewAutomatically/i.test(SOURCE.replace(/RENEWAL_POLICY|no_silent_auto_renewal|auto-renewal/g, "")));
});

/* ------------------------------------------------------------------ *
 * 5. Reactivation
 * ------------------------------------------------------------------ */

test("resuming nothing costs nothing and keeps the room readable", () => {
  // Authority section 12: "A room with no branch selected for resumption
  // remains readable without payment." Not an error, and not $79 for nothing.
  const quote = reactivationQuote({ branchesToResume: 0, startingAt: AFTER });
  assert.equal(quote.payable, false);
  assert.equal(quote.priceCents, 0);
  assert.equal(quote.periodStart, null);
  assert.match(quote.statement, /stays readable/);
  assert.match(quote.statement, /nothing to pay/);
});

test("resuming one branch buys a new period at the base price", () => {
  const quote = reactivationQuote({ branchesToResume: 1, startingAt: AFTER });
  assert.equal(quote.payable, true);
  assert.equal(quote.priceCents, 7900);
  assert.equal(quote.capacityPurchased, 5, "the base price includes five whatever is resumed");
  assert.match(quote.statement, /\$79 USD/);
  assert.match(quote.statement, /30-day active period/);
});

test("reactivation prices what is resumed, not what the old period carried", () => {
  // A room that ran eight branches and resumes two pays for two - which is the
  // base price. Authority section 12.
  const quote = reactivationQuote({ branchesToResume: 2, startingAt: AFTER });
  assert.equal(quote.priceCents, 7900);

  const busy = reactivationQuote({ branchesToResume: 9, startingAt: AFTER });
  assert.equal(busy.priceCents, 13900);
  assert.equal(busy.capacityPurchased, 9);
});

test("a reactivation is capped like any other period", () => {
  const quote = reactivationQuote({ branchesToResume: 40, startingAt: AFTER });
  assert.equal(quote.priceCents, 19900);
});

test("a new period runs thirty days from when it starts", () => {
  const quote = reactivationQuote({ branchesToResume: 3, startingAt: AFTER });
  assert.equal(quote.periodStart?.toISOString(), "2026-09-05T00:00:00.000Z");
  assert.equal(quote.periodEnd?.toISOString(), "2026-10-05T00:00:00.000Z");
});

test("a reactivation statement names no branch and no counterparty", () => {
  const quote = reactivationQuote({ branchesToResume: 7, startingAt: AFTER });
  for (const leak of ["buyer", "counterparty", "negotiation", "branch with", "@"]) {
    assert.ok(
      !quote.statement.toLowerCase().includes(leak.toLowerCase()),
      `the statement must not contain ${leak}`,
    );
  }
});

test("a negative or fractional resumption is refused, not rounded", () => {
  assert.throws(() => reactivationQuote({ branchesToResume: -1, startingAt: AFTER }), RangeError);
  assert.throws(() => reactivationQuote({ branchesToResume: 2.5, startingAt: AFTER }), RangeError);
});

/* ------------------------------------------------------------------ *
 * 6. Reusing a released slot inside a paid period
 * ------------------------------------------------------------------ */

test("a released slot is reusable inside the period at no charge", () => {
  // Authority section 7: closing a branch releases a slot, refunds nothing, and
  // the slot may be reused during that paid period without a further charge.
  // Paid for 8, three closed, five live: three slots free.
  assert.deepEqual(
    branchActivationNeedsPayment({ purchasedCapacity: 8, currentlyActiveBranches: 5 }),
    { needsPayment: false, slotsAvailable: 3 },
  );
});

test("payment is needed only when every purchased slot is in use", () => {
  assert.deepEqual(
    branchActivationNeedsPayment({ purchasedCapacity: 5, currentlyActiveBranches: 5 }),
    { needsPayment: true, slotsAvailable: 0 },
  );
  assert.deepEqual(
    branchActivationNeedsPayment({ purchasedCapacity: 5, currentlyActiveBranches: 4 }),
    { needsPayment: false, slotsAvailable: 1 },
  );
});

test("capacity is counted concurrently, never cumulatively", () => {
  // The question is never how many branches a room has ever had. A room that
  // paid for eight, closed three and opens three more pays nothing.
  const afterChurn = branchActivationNeedsPayment({
    purchasedCapacity: 8,
    currentlyActiveBranches: 5,
  });
  assert.equal(afterChurn.needsPayment, false);
});

test("being over capacity never reports negative slots", () => {
  const over = branchActivationNeedsPayment({ purchasedCapacity: 5, currentlyActiveBranches: 9 });
  assert.equal(over.slotsAvailable, 0);
  assert.equal(over.needsPayment, true);
});

/* ------------------------------------------------------------------ *
 * 7. Purity and the stage boundary
 * ------------------------------------------------------------------ */

test("the module is pure: no database, network, clock or environment", () => {
  for (const forbidden of [
    "createAdminClient",
    "createClient",
    "supabase",
    "fetch(",
    "process.env",
    "Date.now",
    "new Date()",
    "Math.random",
  ]) {
    assert.ok(!SOURCE.includes(forbidden), `period-lifecycle must not contain ${forbidden}`);
  }
});

test("every function that reasons about time is given the instant", () => {
  // Nothing here may ask what time it is; an expiry boundary has to be
  // reproducible in a test rather than dependent on when the test ran.
  for (const fn of ["roomAccessAt", "activeDaysRemaining"]) {
    const at = SOURCE.indexOf(`export function ${fn}`);
    assert.notEqual(at, -1, fn);
    const signature = SOURCE.slice(at, SOURCE.indexOf("{", at));
    assert.match(signature, /at: Date|startingAt: Date/, `${fn} must take the instant`);
  }
  assert.match(SOURCE, /startingAt: Date/, "reactivationQuote must take its start");
});

function importersUnder(dir: string): string[] {
  try {
    return execSync(`git grep -l "deal-room/period-lifecycle" -- ${dir}`, {
      encoding: "utf8",
      cwd: process.cwd(),
    })
      .split("\n")
      .filter(Boolean);
  } catch {
    return [];
  }
}

test("nothing is wired to the lifecycle yet, which is the Stage 5 boundary", () => {
  // Stage 6 renders these states. Until then a caller here would be a surface
  // shipped without the Design Constitution work that surface needs.
  const callers = ["app", "components"].flatMap(importersUnder);
  assert.deepEqual(callers, [], `nothing may import period-lifecycle yet, found: ${callers}`);
});

console.log(`ok   deal-room period lifecycle: ${passed} assertions passed`);
