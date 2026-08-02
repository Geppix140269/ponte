/**
 * Deal Room charging: the decisions a checkout and a webhook have to make.
 *
 * Authority: `PT-COMMERCIAL-2026-07-31-01`, recorded by ADR-0020. Stage 4 of
 * `docs/plans/active/deal-room-transaction-pricing.md`.
 *
 * ## Charging is OFF, and this module cannot turn it on
 *
 * `chargingEnabled()` below is the gate, and it is off unless **four** separate
 * things are true at once. This pull request supplies none of them, and Ponte
 * has never taken a Deal Room payment. Enabling it is Stage 9 and is an owner
 * approval per authority section 20.
 *
 * ## Why the decisions live here and not in the route
 *
 * Everything in this file is a **pure function of its arguments**: no database,
 * no network, no clock, no environment except inside `chargingEnabled()` itself,
 * which reads nothing else. So every branch a real charge can take — a replayed
 * webhook, a session with no record, a capacity increase on a room already at
 * the cap, an event arriving after the period expired — is reachable in a test
 * without Stripe, without a database and without a server.
 *
 * The route is then a thin adapter: gate, authorise, load state, call one of
 * these, act on the verdict. A route that decides is a route whose decisions
 * are only ever exercised by an integration test that nobody runs.
 *
 * ## The two rules that make this safe
 *
 * **The client never names an amount.** Every function here derives money from
 * `./pricing` and server-held capacity. There is no parameter anywhere in this
 * module through which a browser could propose what it would like to pay.
 *
 * **A browser return is not a payment.** Authority section 9. Nothing here
 * treats a redirect as fulfilment; only `fulfilmentDecision` grants, and only on
 * a verified provider event whose payment status is settled.
 */

import { BILLING_EVENT_KINDS, type BillingEventKind } from "./billing";
import { dealRoomRoutesEnabled } from "./flags";
import {
  MAXIMUM_ROOM_PERIOD_PRICE_CENTS,
  additionalBranchChargeCents,
  formatUsd,
  roomPeriodPriceCents,
} from "./pricing";

/* ------------------------------------------------------------------ *
 * 1. The gate
 * ------------------------------------------------------------------ */

/**
 * Whether Ponte may create a Deal Room charge at all.
 *
 * Four conditions, all required, none of them supplied by the pull request that
 * introduced this file:
 *
 * 1. `DEAL_ROOM_BILLING === "on"` — the charging switch. Server-only: no
 *    `NEXT_PUBLIC_` prefix, so it is never inlined into the browser bundle and
 *    cannot be read or set by a client.
 * 2. `NEXT_PUBLIC_DEAL_ROOM === "on"` — the Deal Room itself must exist. Billing
 *    for a product nobody can reach is a contradiction, and this makes it an
 *    impossible one.
 * 3. `STRIPE_SECRET_KEY` present — no key, no charge.
 * 4. `STRIPE_WEBHOOK_SECRET` present — a charge that cannot be *confirmed* must
 *    never be *started*. Without this the webhook cannot verify a signature, so
 *    a payment could be taken with no trustworthy way to fulfil it.
 *
 * The fourth is the one worth arguing for. It would be easy to gate checkout on
 * the secret key alone and let fulfilment fail later. That trades a member's
 * money for a log line.
 */
/** Why charging is unavailable, for a log line. Never shown to a member. */
export function chargingUnavailableReason(): string | null {
  if (process.env.DEAL_ROOM_BILLING !== "on") return "DEAL_ROOM_BILLING is not on";
  if (!dealRoomRoutesEnabled()) return "NEXT_PUBLIC_DEAL_ROOM is not on";
  if (!process.env.STRIPE_SECRET_KEY) return "STRIPE_SECRET_KEY is absent";
  if (!process.env.STRIPE_WEBHOOK_SECRET) return "STRIPE_WEBHOOK_SECRET is absent";
  return null;
}

/**
 * Derived from the reason above rather than restating the four conditions, so
 * the gate and the explanation cannot drift into disagreeing about whether
 * charging is on.
 */
export function chargingEnabled(): boolean {
  return chargingUnavailableReason() === null;
}

/* ------------------------------------------------------------------ *
 * 2. What a checkout would charge
 * ------------------------------------------------------------------ */

/**
 * A charge Ponte is prepared to create, or a reason it will not.
 *
 * `nothing_to_charge` is a success, not a failure: authority section 10 says
 * that once a period has reached $199 USD, further branch activations in that
 * period require no further charge. The branch should simply activate.
 */
export type ChargeIntent =
  | {
      chargeable: true;
      kind: BillingEventKind;
      amountCents: number;
      currency: "usd";
      /** What a member reads before paying. Contains no branch identity. */
      description: string;
      capacityBefore: number;
      capacityAfter: number;
    }
  | { chargeable: false; reason: "nothing_to_charge" | "capacity_not_increasing" };

/**
 * Opening a Master Deal Room for its first 30-day period.
 *
 * Authority section 9. The activation offer states $79 USD and what it
 * includes; the capacity being bought is `max(5, requested)` because the base
 * price already includes five and nothing sells fewer.
 */
export function roomActivationCharge(args: { requestedCapacity: number }): ChargeIntent {
  const capacityAfter = Math.max(5, args.requestedCapacity);
  const amountCents = roomPeriodPriceCents(capacityAfter);
  return {
    chargeable: true,
    kind: "room_activation",
    amountCents,
    currency: "usd",
    description: `Ponte Deal Room activation — ${formatUsd(amountCents)} for 30 calendar days`,
    capacityBefore: 0,
    capacityAfter,
  };
}

/**
 * Raising branch capacity inside a period that is already paid for.
 *
 * Authority section 10: the exact additional capacity and charge must be shown
 * before payment, the client must never determine the amount, and the charge
 * must never be silent. It must also **never expose branch identity or a
 * competing negotiation** — which is why the description below counts slots and
 * names nobody.
 */
export function additionalBranchCharge(args: {
  paidCapacity: number;
  requiredCapacity: number;
}): ChargeIntent {
  if (args.requiredCapacity <= args.paidCapacity) {
    return { chargeable: false, reason: "capacity_not_increasing" };
  }
  const amountCents = additionalBranchChargeCents(args);
  if (amountCents === 0) {
    // At the cap. Authority section 10: no further charge this period.
    return { chargeable: false, reason: "nothing_to_charge" };
  }
  const slots = args.requiredCapacity - args.paidCapacity;
  return {
    chargeable: true,
    kind: "additional_branch",
    amountCents,
    currency: "usd",
    description:
      slots === 1
        ? `One additional active branch for the current room period — ${formatUsd(amountCents)}`
        : `${slots} additional active branches for the current room period — ${formatUsd(amountCents)}`,
    capacityBefore: args.paidCapacity,
    capacityAfter: args.requiredCapacity,
  };
}

/**
 * Reactivating a room whose period has ended.
 *
 * Authority section 12: reactivation creates a **new** paid 30-day period,
 * priced from the branches selected to remain active — not from what the
 * previous period happened to carry.
 */
export function reactivationCharge(args: { branchesToResume: number }): ChargeIntent {
  const capacityAfter = Math.max(5, args.branchesToResume);
  const amountCents = roomPeriodPriceCents(capacityAfter);
  return {
    chargeable: true,
    kind: "reactivation",
    amountCents,
    currency: "usd",
    description: `Ponte Deal Room reactivation — a new 30 calendar day period, ${formatUsd(amountCents)}`,
    capacityBefore: 0,
    capacityAfter,
  };
}

/* ------------------------------------------------------------------ *
 * 3. What a webhook should do
 * ------------------------------------------------------------------ */

/**
 * The provider event, reduced to what the decision needs.
 *
 * Deliberately not a `Stripe.Event`: the decision must be testable without the
 * SDK, and a narrow shape is one that cannot smuggle an unexamined field into a
 * money decision.
 */
export interface ProviderEventFacts {
  /** Stripe's event id. The idempotency key. */
  providerEventId: string;
  type: string;
  /** Stripe's `payment_status`. Only `paid` is settled. */
  paymentStatus: string;
  /** Cents Stripe says were collected. Compared against what Ponte expected. */
  amountTotalCents: number | null;
  /** Ponte's own metadata, set when the session was created. */
  roomId: string | null;
  kind: string | null;
  expectedAmountCents: number | null;
  capacityAfter: number | null;
}

/** What Ponte already holds for this event and period. */
export interface BillingRecordFacts {
  /** A billing event already recorded under this `providerEventId`. */
  alreadyRecorded: boolean;
  /** A period row exists for the session. Absent means money with nowhere to land. */
  periodExists: boolean;
  /** Cents already paid for the current period, for the cap check. */
  periodPaidCents: number;
}

export type FulfilmentDecision =
  | { action: "ignore"; reason: string }
  | { action: "already_fulfilled"; reason: string }
  | { action: "orphan"; reason: string }
  | { action: "refuse"; reason: string }
  | { action: "fulfil"; kind: BillingEventKind; amountCents: number; capacityAfter: number | null };

/**
 * What to do with a verified provider event.
 *
 * The order is the order of danger, not the order of likelihood. A replay is
 * checked before anything that could grant, and an amount mismatch is checked
 * before the grant rather than after it.
 *
 * `orphan` is deliberately distinct from `refuse`: money was taken and Ponte has
 * nowhere to attach it. It must be loud and it must **not** be retried, because
 * retrying will not conjure the missing row — the same reasoning the existing
 * credit webhook already applies.
 */
export function fulfilmentDecision(
  event: ProviderEventFacts,
  record: BillingRecordFacts,
): FulfilmentDecision {
  if (event.type !== "checkout.session.completed") {
    return { action: "ignore", reason: `event type ${event.type} is not fulfilled` };
  }

  if (event.paymentStatus !== "paid") {
    return { action: "ignore", reason: `payment status is ${event.paymentStatus}, not paid` };
  }

  // Replay safety first. Stripe retries until it gets a 2xx.
  if (record.alreadyRecorded) {
    return { action: "already_fulfilled", reason: "this provider event is already recorded" };
  }

  if (!event.roomId) {
    return { action: "orphan", reason: "paid session carries no room" };
  }

  if (!record.periodExists) {
    return { action: "orphan", reason: "paid session has no period row to fulfil" };
  }

  if (!event.kind || !(BILLING_EVENT_KINDS as readonly string[]).includes(event.kind)) {
    return { action: "refuse", reason: `unknown billing kind ${event.kind}` };
  }

  // The amount Stripe collected must be the amount Ponte priced. A mismatch is
  // not something to reconcile silently in either direction.
  if (
    event.expectedAmountCents === null ||
    event.amountTotalCents === null ||
    event.amountTotalCents !== event.expectedAmountCents
  ) {
    return {
      action: "refuse",
      reason: `collected ${event.amountTotalCents} does not match the expected ${event.expectedAmountCents}`,
    };
  }

  // Authority section 10: a period already at the cap accrues no further charge.
  // Reaching here means one was collected anyway, which is a defect upstream.
  if (
    event.kind === "additional_branch" &&
    record.periodPaidCents >= MAXIMUM_ROOM_PERIOD_PRICE_CENTS
  ) {
    return { action: "refuse", reason: "the period is already at the cap; no further charge is due" };
  }

  // The cap is a period total, not a per-charge limit.
  if (record.periodPaidCents + event.amountTotalCents > MAXIMUM_ROOM_PERIOD_PRICE_CENTS) {
    return {
      action: "refuse",
      reason: `fulfilling would take the period past the ${MAXIMUM_ROOM_PERIOD_PRICE_CENTS} cap`,
    };
  }

  return {
    action: "fulfil",
    kind: event.kind as BillingEventKind,
    amountCents: event.amountTotalCents,
    capacityAfter: event.capacityAfter,
  };
}

/**
 * Whether the provider should be asked to retry, by answering non-2xx.
 *
 * **No decision on its own warrants a retry.** `ignore`, `already_fulfilled`,
 * `orphan` and `refuse` are all final: retrying will not change the answer. An
 * `orphan` in particular must not retry — the missing row will not appear on the
 * third attempt, and retrying turns one alarming log line into a hundred, which
 * is the reasoning the existing credit webhook already applies.
 *
 * The only thing that should retry is a `fulfil` whose **write then failed**:
 * money was taken, the grant did not land, and Stripe re-delivering is what
 * gives it a second chance. That is a property of the write, not of the
 * decision, so it has to be passed in.
 */
export function shouldProviderRetry(outcome: {
  decision: FulfilmentDecision;
  writeFailed: boolean;
}): boolean {
  return outcome.decision.action === "fulfil" && outcome.writeFailed;
}
