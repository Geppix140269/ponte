/**
 * What expiry does, and what reactivation costs.
 *
 * Authority: `PT-COMMERCIAL-2026-07-31-01` section 12, recorded by ADR-0020.
 * Stage 5 of `docs/plans/active/deal-room-transaction-pricing.md`.
 *
 * ## The sentence this module exists to enforce
 *
 * > The commercial record must never be held hostage behind a continuing
 * > subscription.
 *
 * Everything below follows from that. Expiry removes the ability to **change**
 * a Deal Room and never the ability to **read** it. No function here returns a
 * state in which a participant loses access to their own history, and one of
 * the tests walks every combination to prove there isn't one.
 *
 * That is a commercial promise as much as a technical one: a member who stops
 * paying has still done the work, signed the agreements and exchanged the
 * evidence, and Ponte holding that record ransom would make the Deal Room a
 * worse place to put a real transaction.
 *
 * ## Pure
 *
 * No database, no network, no clock, no environment. Every function takes the
 * instant it should reason about, so an expiry boundary is reproducible in a
 * test rather than dependent on when the test ran.
 */

import { ROOM_PERIOD_DAYS, periodEndFrom, type RoomPeriodState } from "./billing";
import { INCLUDED_ACTIVE_BRANCHES, formatUsd, roomPeriodPriceCents } from "./pricing";

/* ------------------------------------------------------------------ *
 * 1. What a room period is, at an instant
 * ------------------------------------------------------------------ */

/** A purchased period, reduced to what the lifecycle needs. Carries no identity. */
export interface PeriodFacts {
  state: RoomPeriodState;
  periodStart: Date;
  periodEnd: Date;
  purchasedBranchCapacity: number;
}

/**
 * What a member may do with the room right now.
 *
 * `readable` has no `false` case, and that is the point rather than an
 * oversight. Authority section 12: "authorised participants retain access to
 * their historical record", and a room with no branch selected for resumption
 * "remains readable without payment".
 */
export interface RoomAccess {
  /** Always true. Kept explicit so the guarantee is visible at every call site. */
  readable: true;
  /** Whether protected commercial progression may continue. */
  writable: boolean;
  /** Why, in words a member could be shown. */
  reason:
    | "no_period_purchased"
    | "period_pending_confirmation"
    | "period_active"
    | "period_expired"
    | "period_cancelled";
}

/**
 * Access at an instant.
 *
 * A period is write-enabling only while it is `active` **and** the instant falls
 * inside its window. Both are required: a row left `active` past its end must
 * not keep a room writable, because a sweep that has not run yet is not a
 * commercial entitlement.
 */
export function roomAccessAt(period: PeriodFacts | null, at: Date): RoomAccess {
  if (period === null) {
    return { readable: true, writable: false, reason: "no_period_purchased" };
  }

  if (period.state === "cancelled") {
    return { readable: true, writable: false, reason: "period_cancelled" };
  }

  if (period.state === "pending") {
    // Authority section 9: a browser return is not authoritative, so a period
    // awaiting confirmation enables nothing.
    return { readable: true, writable: false, reason: "period_pending_confirmation" };
  }

  const inWindow =
    at.getTime() >= period.periodStart.getTime() && at.getTime() < period.periodEnd.getTime();

  if (period.state === "active" && inWindow) {
    return { readable: true, writable: true, reason: "period_active" };
  }

  return { readable: true, writable: false, reason: "period_expired" };
}

/** Whole days left, rounded up, or null when no period is running. */
export function activeDaysRemaining(period: PeriodFacts | null, at: Date): number | null {
  if (period === null || period.state !== "active") return null;
  const ms = period.periodEnd.getTime() - at.getTime();
  if (ms <= 0) return 0;
  return Math.ceil(ms / (24 * 60 * 60 * 1000));
}

/* ------------------------------------------------------------------ *
 * 2. What expiry preserves
 * ------------------------------------------------------------------ */

/**
 * Everything authority section 12 says survives expiry, as data.
 *
 * A list rather than prose because it is asserted: the test checks each item
 * against the authority's own sentence, so removing one is a failing test
 * rather than a quiet change of policy.
 */
export const PRESERVED_ON_EXPIRY = [
  "nothing_is_deleted",
  "participants_are_not_removed",
  "agreements_remain_intact",
  "evidence_remains_intact",
  "translations_remain_intact",
  "activity_remains_intact",
  "branch_isolation_stays_enforced",
  "permissions_stay_enforced",
  "authorised_participants_retain_their_record",
] as const;

export type PreservedOnExpiry = (typeof PRESERVED_ON_EXPIRY)[number];

/**
 * What expiry changes, which is one thing.
 *
 * Deliberately a single-element list. If this ever grows, the growth is the
 * decision that needs an owner, and the test that pins the length is where it
 * will be noticed.
 */
export const CHANGED_ON_EXPIRY = ["room_and_branches_become_read_only"] as const;

/**
 * There is no silent auto-renewal at launch. Authority section 12.
 *
 * A named constant rather than an absence, because "we did not build renewal"
 * and "renewal is deliberately manual" look identical in a codebase, and only
 * one of them is a decision.
 */
export const RENEWAL_POLICY = "manual_only_no_silent_auto_renewal" as const;

/* ------------------------------------------------------------------ *
 * 3. Reactivation
 * ------------------------------------------------------------------ */

/**
 * A quote to reactivate, priced from the branches chosen to resume.
 *
 * Authority section 12: "At renewal, calculate the next 30-day price from the
 * billable branches selected to remain active." Not from what the previous
 * period happened to carry — a room that ran eight branches and wants to resume
 * two pays for two.
 */
export interface ReactivationQuote {
  /** No charge, and no payment step. The room simply stays readable. */
  payable: boolean;
  branchesResuming: number;
  capacityPurchased: number;
  priceCents: number;
  periodStart: Date | null;
  periodEnd: Date | null;
  /** What the member reads. Names no branch and no counterparty. */
  statement: string;
}

/**
 * Quote a new 30-day period.
 *
 * `branchesToResume === 0` is the case authority section 12 calls out
 * explicitly: "A room with no branch selected for resumption remains readable
 * without payment." It is not an error and it is not a $79 charge for nothing —
 * it is a room the member has finished with, still fully legible.
 */
export function reactivationQuote(args: {
  branchesToResume: number;
  startingAt: Date;
}): ReactivationQuote {
  if (!Number.isInteger(args.branchesToResume) || args.branchesToResume < 0) {
    throw new RangeError("branchesToResume must be a non-negative integer");
  }

  if (args.branchesToResume === 0) {
    return {
      payable: false,
      branchesResuming: 0,
      capacityPurchased: 0,
      priceCents: 0,
      periodStart: null,
      periodEnd: null,
      statement:
        "This Deal Room stays readable. Nothing is being resumed, so there is nothing to pay.",
    };
  }

  const capacityPurchased = Math.max(INCLUDED_ACTIVE_BRANCHES, args.branchesToResume);
  const priceCents = roomPeriodPriceCents(capacityPurchased);

  return {
    payable: true,
    branchesResuming: args.branchesToResume,
    capacityPurchased,
    priceCents,
    periodStart: args.startingAt,
    periodEnd: periodEndFrom(args.startingAt),
    statement: `A new ${ROOM_PERIOD_DAYS}-day active period — ${formatUsd(priceCents)}`,
  };
}

/* ------------------------------------------------------------------ *
 * 4. The slot ratchet inside a paid period
 * ------------------------------------------------------------------ */

/**
 * Whether activating another branch needs a payment, given what is already paid
 * for and how many branches are live right now.
 *
 * Authority section 7: "Closing a branch releases one concurrent branch slot. It
 * does not generate a refund for the current room period. The released slot may
 * be reused during that paid period without an additional branch charge."
 *
 * So the question is never "how many branches has this room ever had" but "how
 * many are concurrently active against the capacity already bought". A room that
 * paid for eight, closed three and opens three more pays nothing.
 */
export function branchActivationNeedsPayment(args: {
  purchasedCapacity: number;
  currentlyActiveBranches: number;
}): { needsPayment: boolean; slotsAvailable: number } {
  const slotsAvailable = Math.max(0, args.purchasedCapacity - args.currentlyActiveBranches);
  return { needsPayment: slotsAvailable === 0, slotsAvailable };
}
