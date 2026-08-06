/**
 * Deal Room billing records: the domain vocabulary and the pure derivations.
 *
 * Authority: `PT-COMMERCIAL-2026-07-31-01`, recorded by ADR-0020. Stage 3 of
 * `docs/plans/active/deal-room-transaction-pricing.md`.
 *
 * ## What this module is
 *
 * The TypeScript half of `supabase/pending/20260731e_deal_room_paid_room_periods.sql`,
 * which is **written and not applied**. It is pure, in the same sense as
 * `./pricing`: no database, no network, no clock, no environment. A period end
 * is derived from a start that is *passed in*, never from `new Date()`, so a
 * billing window is reproducible in a test.
 *
 * ## What this module is NOT
 *
 * It does not charge, reserve, write, call Stripe or read a row. Nothing in the
 * repository imports it, and its test asserts that. Stage 4 wires checkout and
 * fulfilment; Stage 5 wires expiry and reactivation. Each is a separate owner
 * approval.
 *
 * ## The disclosure rule still applies
 *
 * `purchasedBranchCapacity` is a branch-count disclosure under authority
 * section 4, and section 11 restricts the capacity, the active-branch count and
 * the billing breakdown to authorised Master Deal Room administrators. The
 * migration enforces that with an administrator-only SELECT policy on both
 * tables. Nothing here should ever be rendered to a branch participant.
 */

import {
  BASE_ROOM_PRICE_CENTS,
  INCLUDED_ACTIVE_BRANCHES,
  MAXIMUM_ROOM_PERIOD_PRICE_CENTS,
  roomPeriodPriceCents,
} from "./pricing";

/* ------------------------------------------------------------------ *
 * 1. Vocabulary - mirrors the CHECK constraints in 20260731e
 * ------------------------------------------------------------------ */

/**
 * A period is `pending` until a verified server-side confirmation arrives, then
 * `active` for its 30 days, then `expired`. `cancelled` covers a checkout that
 * was abandoned or refused before confirmation.
 *
 * Authority section 9: a browser return from a payment provider is not
 * authoritative, so nothing moves a period to `active` except fulfilment. The
 * migration encodes that as a CHECK: `state <> 'active' or confirmed_at is not
 * null`.
 */
export const ROOM_PERIOD_STATES = ["pending", "active", "expired", "cancelled"] as const;
export type RoomPeriodState = (typeof ROOM_PERIOD_STATES)[number];

/**
 * What a billing event was for.
 *
 * `reactivation` is distinct from `room_activation` because authority section 12
 * makes reactivation a *new* paid period rather than an extension, and the two
 * read differently in a history.
 */
export const BILLING_EVENT_KINDS = [
  "room_activation",
  "additional_branch",
  "reactivation",
  "waiver",
] as const;
export type BillingEventKind = (typeof BILLING_EVENT_KINDS)[number];

export const BILLING_PROVIDERS = ["stripe", "ponte_waiver"] as const;
export type BillingProvider = (typeof BILLING_PROVIDERS)[number];

/** The paid period, in days. Authority section 6. */
export const ROOM_PERIOD_DAYS = 30;

/* ------------------------------------------------------------------ *
 * 2. Pure derivations
 * ------------------------------------------------------------------ */

/**
 * When a period bought at `start` ends.
 *
 * Takes the start rather than reading a clock, so the window is a function of
 * its argument. Thirty CALENDAR days: wall time from the start, which does
 * not stop for a paused branch and never did. The authority used to say "30
 * active days", which described an accounting model this function has never
 * implemented; the wording was corrected on owner approval, 2 August 2026, to
 * match what the code has always computed.
 */
export function periodEndFrom(start: Date): Date {
  return new Date(start.getTime() + ROOM_PERIOD_DAYS * 24 * 60 * 60 * 1000);
}

/**
 * Whether a period covers an instant. Both bounds are passed in; nothing here
 * asks what time it is.
 */
export function periodCovers(period: { start: Date; end: Date }, at: Date): boolean {
  return at.getTime() >= period.start.getTime() && at.getTime() < period.end.getTime();
}

/**
 * The amount a member actually owes, after any authorised promotional waiver.
 *
 * Authority section 17 keeps the list price visible and subtracts the waiver, so
 * a 100% launch-partner room still records that a Deal Room costs $79 USD. The
 * migration computes the same value as a stored generated column; this is the
 * application-side mirror, and the two are pinned to each other by test.
 */
export function amountDueCents(listPriceCents: number, discountCents: number): number {
  if (!Number.isInteger(listPriceCents) || !Number.isInteger(discountCents)) {
    throw new TypeError("list price and discount must be integer cents");
  }
  if (discountCents < 0) {
    throw new RangeError("discount must not be negative");
  }
  if (discountCents > listPriceCents) {
    throw new RangeError("discount must not exceed the list price");
  }
  return listPriceCents - discountCents;
}

/**
 * The row a new period would carry, derived from the capacity being bought.
 *
 * One place that decides price, capacity and window together, so a caller
 * cannot assemble a period whose price disagrees with its capacity. The
 * database refuses that combination anyway — this makes it unreachable rather
 * than merely rejected.
 */
export interface RoomPeriodDraft {
  currency: "usd";
  purchasedBranchCapacity: number;
  periodPriceCents: number;
  discountCents: number;
  amountDueCents: number;
  periodStart: Date;
  periodEnd: Date;
  state: RoomPeriodState;
}

export function draftRoomPeriod(args: {
  purchasedBranchCapacity: number;
  periodStart: Date;
  discountCents?: number;
}): RoomPeriodDraft {
  const capacity = Math.max(INCLUDED_ACTIVE_BRANCHES, args.purchasedBranchCapacity);
  const listPrice = roomPeriodPriceCents(capacity);
  const discount = args.discountCents ?? 0;
  return {
    currency: "usd",
    purchasedBranchCapacity: capacity,
    periodPriceCents: listPrice,
    discountCents: discount,
    amountDueCents: amountDueCents(listPrice, discount),
    periodStart: args.periodStart,
    periodEnd: periodEndFrom(args.periodStart),
    // Never `active` on creation. Authority section 9: write-enablement follows
    // a verified server-side confirmation, which has not happened yet.
    state: "pending",
  };
}

/** A 100% launch-partner waiver, preserving the value anchor of section 17. */
export function launchPartnerWaiver(listPriceCents: number): {
  listPriceCents: number;
  discountCents: number;
  amountDueCents: number;
} {
  return {
    listPriceCents,
    discountCents: listPriceCents,
    amountDueCents: 0,
  };
}

/**
 * The base and cap restated for the migration-contract test, so the SQL and the
 * engine are compared against one set of numbers rather than two.
 */
export const SCHEMA_PRICE_BOUNDS = {
  baseCents: BASE_ROOM_PRICE_CENTS,
  capCents: MAXIMUM_ROOM_PERIOD_PRICE_CENTS,
  includedBranches: INCLUDED_ACTIVE_BRANCHES,
} as const;
