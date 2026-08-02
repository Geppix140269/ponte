/**
 * Deal Room pricing: the pure engine and the billable-branch contract.
 *
 * Authority: `PT-COMMERCIAL-2026-07-31-01`, the Deal Room-Only Pricing
 * Authority, recorded by ADR-0020. Stage 2 of
 * `docs/plans/active/deal-room-transaction-pricing.md`.
 *
 * ## What this module is
 *
 * A **pure** function of its arguments. No database, no network, no clock, no
 * environment. `lib/ponte/progress.ts` set this pattern and it holds for the
 * same reason: a number a member is charged must be reproducible from its
 * inputs alone, in a test, without standing up anything.
 *
 * ## What this module is NOT
 *
 * It does not charge, reserve, record, entitle or write. It computes. Nothing
 * in the repository calls it yet, deliberately: Stage 2 is the engine and its
 * proof, and every one of billing records, Stripe, entitlements and surfaces is
 * a later stage behind its own owner approval.
 *
 * ## The disclosure rule, which is load-bearing
 *
 * Authority section 4 forbids a participant learning that another branch
 * exists, how many there are, or who is in them - and names **"a total billing
 * amount where that amount would reveal branch count"** as one of the things
 * that must not leak. So the price functions take a **count**, never a list of
 * identified branches, and `BranchBillingFacts` carries **no identifier of any
 * kind**: no room id, sub-room ref, profile id, organisation or name. A branch
 * is described to this module only by the facts that decide whether it is
 * billable.
 *
 * That is not decoration. It means an amount computed here physically cannot
 * carry an identity, because none was passed in.
 */

import type {
  AgreementKind,
  InvitationState,
  ParticipantClass,
  ParticipantState,
  SubRoomKind,
  SubRoomState,
} from "./states";

/* ------------------------------------------------------------------ *
 * 1. Canonical constants - authority section 6
 * ------------------------------------------------------------------ */

/**
 * USD only. Authority section 6 and section 13: all canonical money records are
 * USD, and no automatic currency conversion is performed anywhere.
 */
export const CURRENCY = "usd" as const;

/** $79 USD for the 30-day period, including the branches below. */
export const BASE_ROOM_PRICE_CENTS = 7900;

/** Concurrently active principal-counterparty branches included in the base. */
export const INCLUDED_ACTIVE_BRANCHES = 5;

/** $15 USD per additional concurrently active branch, for the current period. */
export const ADDITIONAL_BRANCH_PRICE_CENTS = 1500;

/** $199 USD per Master Deal Room per 30-day period. A price cap, not a limit. */
export const MAXIMUM_ROOM_PERIOD_PRICE_CENTS = 19900;

/**
 * The paid period: 30 **calendar** days, anchored in UTC.
 *
 * Was `ACTIVE_PERIOD_DAYS`, renamed under `ADR-0029`. "Active days" reads as
 * days on which the room was used, and the clock has never worked that way -
 * expiry is `activatedAt + 30 x 24h`, which is elapsed time. The behaviour was
 * always right and only the name was wrong, which is the worst combination:
 * nothing failed, and everyone reading it learned something untrue. `P1` had
 * already retired the phrase from member-facing copy on 2 August.
 *
 * **UTC is not incidental.** 30 x 24h is not 30 civil days in a timezone that
 * observes daylight saving, so an expiry shown in local civil time can be an
 * hour out. `ADR-0029` anchors and displays in UTC, which has no DST, and
 * forbids displaying an expiry in a local civil timezone without its offset.
 *
 * Note that `INCLUDED_ACTIVE_BRANCHES` above keeps "active", correctly: those
 * genuinely are concurrently *active* branches. It is only days that were never
 * counted that way.
 */
export const PERIOD_CALENDAR_DAYS = 30;

/**
 * Every amount is an integer number of cents. Authority section 6 is explicit,
 * and the reason is ordinary: a float cannot represent $0.15 exactly, and a
 * rounding error in a charge is a charge that is wrong.
 */
function assertBranchCount(value: number, label: string): void {
  if (!Number.isInteger(value)) {
    throw new TypeError(`${label} must be an integer, received ${value}`);
  }
  if (value < 0) {
    throw new RangeError(`${label} must not be negative, received ${value}`);
  }
}

/* ------------------------------------------------------------------ *
 * 2. The price
 * ------------------------------------------------------------------ */

/**
 * The full price of one 30-day room period, in cents, for a given number of
 * concurrently active billable branches.
 *
 * ```
 * min(19900, 7900 + max(0, branches - 5) * 1500)
 * ```
 *
 * Takes a **count**, never a collection. See the disclosure note at the top.
 *
 * A count of 0 still costs the base price: authority section 9 begins payment
 * when at least one branch is *ready* to enter protected progression, and the
 * room period is bought for the room, not for its occupancy.
 */
export function roomPeriodPriceCents(activeBranchCount: number): number {
  assertBranchCount(activeBranchCount, "activeBranchCount");
  const additional = Math.max(0, activeBranchCount - INCLUDED_ACTIVE_BRANCHES);
  return Math.min(
    MAXIMUM_ROOM_PERIOD_PRICE_CENTS,
    BASE_ROOM_PRICE_CENTS + additional * ADDITIONAL_BRANCH_PRICE_CENTS,
  );
}

/**
 * What it costs to raise purchased branch capacity from `paidCapacity` to
 * `requiredCapacity` inside the current room period.
 *
 * Authority section 10: the exact additional capacity and charge must be shown
 * before payment, each required slot costs $15 USD, and **once total paid
 * room-period value reaches $199 USD, further activations in that period
 * require no additional charge.** The cap falls out of the subtraction rather
 * than being special-cased, so it cannot be forgotten on one path.
 *
 * Never negative. Reducing capacity produces 0 rather than money back:
 * authority section 7 is explicit that closing a branch releases a slot and
 * **does not generate a refund for the current room period**.
 */
export function additionalBranchChargeCents(args: {
  paidCapacity: number;
  requiredCapacity: number;
}): number {
  assertBranchCount(args.paidCapacity, "paidCapacity");
  assertBranchCount(args.requiredCapacity, "requiredCapacity");
  const delta =
    roomPeriodPriceCents(args.requiredCapacity) - roomPeriodPriceCents(args.paidCapacity);
  return Math.max(0, delta);
}

/** True when this period has reached the cap and can accrue no further charge. */
export function isAtPeriodCap(paidCents: number): boolean {
  return paidCents >= MAXIMUM_ROOM_PERIOD_PRICE_CENTS;
}

/**
 * Money for display.
 *
 * Authority section 13: "Use `USD` where `$` alone could be ambiguous." Ponte
 * is a cross-border product whose members read `$` as at least four different
 * currencies, so this always writes it. Whole dollars print without decimals
 * because every price in the model is a whole dollar.
 */
export function formatUsd(cents: number): string {
  if (!Number.isInteger(cents)) {
    throw new TypeError(`cents must be an integer, received ${cents}`);
  }
  const amount = (cents / 100).toFixed(cents % 100 === 0 ? 0 : 2);
  return `$${amount} USD`;
}

/* ------------------------------------------------------------------ *
 * 3. What counts as a billable branch - authority section 7
 * ------------------------------------------------------------------ */

/**
 * The sub-room kinds that can ever be billable.
 *
 * Authority section 5: provider, adviser and internal workspaces - legal,
 * logistics, inspection, insurance, finance, customs, internal approval - are
 * included in the room price and **never** affect the branch count. Only a
 * counterparty branch can be billable, and `deal_room_sub_rooms.kind` already
 * draws exactly that line.
 */
export const BILLABLE_SUB_ROOM_KINDS: readonly SubRoomKind[] = ["counterparty"];

/**
 * The participant classes that make a counterparty branch a *principal*
 * counterparty branch.
 *
 * **Settled by the owner on 31 July 2026 (OD-012, Amendment 1 to the
 * authority): a broker's branch counts.**
 *
 * The question was real. Authority section 7 condition 1 said "principal-
 * counterparty Deal Branch", which reads as `participant_class = 'principal'`
 * alone; section 4, listing what a Master Deal Room may contain, gives "a broker
 * acting for a disclosed or controlled principal" as one of its own examples,
 * and a broker is an `intermediary` in this schema. The two sections pointed
 * different ways and the difference decided what a member is charged.
 *
 * The owner resolved it toward section 4, and amended section 7 to say so, so
 * the authority no longer contradicts itself. The reasoning: a broker fronting a
 * real principal is a live counterparty negotiation consuming the same
 * controlled-progression product, and the alternative would make every brokered
 * negotiation free — an obvious incentive to route through an intermediary.
 *
 * `provider`, `adviser`, `ponte_facilitator` and `observer` never make a branch
 * billable, which was never in question.
 */
export const BILLABLE_PARTICIPANT_CLASSES: readonly ParticipantClass[] = [
  "principal",
  "intermediary",
];

/**
 * Sub-room states that are write-enabled for protected commercial progression
 * and not closed.
 *
 * Authority section 7 conditions 4 and 5, and its follow-on sentence:
 * "Commercially live states such as active, paused, blocked, or
 * outcome-reached-but-not-formally-closed continue to count." A branch does not
 * stop being paid for because it hit a problem or is waiting.
 *
 * Excluded, by omission: `draft`, `invitation_pending`, `awaiting_admission`
 * (all pre-activation, and section 8 makes the whole pre-activation journey
 * free) and `closed`.
 */
export const BILLABLE_SUB_ROOM_STATES: readonly SubRoomState[] = [
  "active",
  "blocked",
  "paused",
  "outcome_reached",
];

/**
 * The agreements a counterparty must have accepted before the branch counts.
 *
 * Authority section 7 condition 3 requires "admission and required
 * participation agreements are complete". This is the four-agreement admission
 * gate the Deal Room already enforces, and it is a real join in the schema
 * (`deal_room_agreement_acceptances`), not a column read.
 */
export const REQUIRED_AGREEMENTS_FOR_BILLING: readonly AgreementKind[] = [
  "participation",
  "nda",
  "room_rules",
  "authority_declaration",
];

/**
 * One counterparty participant, described only by what pricing needs.
 *
 * No id, no name, no organisation, no email. See the disclosure note at the top
 * of this file.
 */
export interface CounterpartyFacts {
  participantClass: ParticipantClass;
  participantState: ParticipantState;
  /** Which of the four required agreements this participant has accepted. */
  acceptedAgreements: readonly AgreementKind[];
}

/**
 * One branch, described only by what pricing needs. Carries no identifier.
 */
export interface BranchBillingFacts {
  subRoomKind: SubRoomKind;
  subRoomState: SubRoomState;
  /**
   * The invitation that brought the intended counterparty in, or null when no
   * invitation was ever issued. Authority section 7 condition 2.
   */
  invitationState: InvitationState | null;
  counterparties: readonly CounterpartyFacts[];
}

/**
 * Why a branch is not billable.
 *
 * Named rather than boolean so the administrator-only billing breakdown
 * (authority section 11) can explain a charge to somebody entitled to see it,
 * and so every exclusion in section 7 has a test that names it.
 */
export type NotBillableReason =
  | "supporting_workspace"
  | "not_write_enabled"
  | "invitation_not_accepted"
  | "no_admitted_counterparty"
  | "agreements_incomplete";

export type BranchBillingVerdict =
  | { billable: true }
  | { billable: false; reason: NotBillableReason };

function hasAllRequiredAgreements(participant: CounterpartyFacts): boolean {
  const accepted = new Set(participant.acceptedAgreements);
  return REQUIRED_AGREEMENTS_FOR_BILLING.every((kind) => accepted.has(kind));
}

/**
 * Authority section 7's five conditions, in order, each returning the reason it
 * failed.
 *
 * The order matters for the explanation, not the answer: a draft provider
 * workspace is reported as a supporting workspace rather than as not
 * write-enabled, because the first is the reason a member would recognise.
 */
export function branchBillingVerdict(facts: BranchBillingFacts): BranchBillingVerdict {
  // 1. It is a principal-counterparty Deal Branch.
  if (!BILLABLE_SUB_ROOM_KINDS.includes(facts.subRoomKind)) {
    return { billable: false, reason: "supporting_workspace" };
  }

  // 4 and 5. Write-enabled for protected progression, and not closed.
  if (!BILLABLE_SUB_ROOM_STATES.includes(facts.subRoomState)) {
    return { billable: false, reason: "not_write_enabled" };
  }

  // 2. The intended counterparty has accepted the invitation.
  //
  // `null` passes: a branch may be reached without an invitation record in
  // migration or administrative cases, and conditions 3 and 5 still gate it. A
  // declined, expired, revoked or merely sent invitation does not.
  if (facts.invitationState !== null && facts.invitationState !== "accepted") {
    return { billable: false, reason: "invitation_not_accepted" };
  }

  // 3. Admission complete - a counterparty of a billable class, admitted.
  const admitted = facts.counterparties.filter(
    (p) =>
      BILLABLE_PARTICIPANT_CLASSES.includes(p.participantClass) &&
      (p.participantState === "admitted" || p.participantState === "active"),
  );
  if (admitted.length === 0) {
    return { billable: false, reason: "no_admitted_counterparty" };
  }

  // 3, second half. Required participation agreements complete.
  if (!admitted.some(hasAllRequiredAgreements)) {
    return { billable: false, reason: "agreements_incomplete" };
  }

  return { billable: true };
}

/** Convenience over {@link branchBillingVerdict}. */
export function isBillableBranch(facts: BranchBillingFacts): boolean {
  return branchBillingVerdict(facts).billable;
}

/**
 * How many of these branches are concurrently active and billable.
 *
 * This is the **only** bridge from branch facts to a number, and it returns a
 * number and nothing else. Everything downstream prices from the count, so no
 * amount can be traced back to a branch through this module.
 */
export function countBillableBranches(branches: readonly BranchBillingFacts[]): number {
  return branches.reduce((total, branch) => total + (isBillableBranch(branch) ? 1 : 0), 0);
}

/* ------------------------------------------------------------------ *
 * 4. The published price table - authority section 6
 * ------------------------------------------------------------------ */

/**
 * The table printed in the authority, as data.
 *
 * Pinned by test against {@link roomPeriodPriceCents} so the engine and the
 * published price cannot drift apart. If a future edit changes one, the test
 * names the row.
 */
export const PUBLISHED_PRICE_TABLE: readonly { branches: number; cents: number }[] = [
  { branches: 1, cents: 7900 },
  { branches: 2, cents: 7900 },
  { branches: 3, cents: 7900 },
  { branches: 4, cents: 7900 },
  { branches: 5, cents: 7900 },
  { branches: 6, cents: 9400 },
  { branches: 7, cents: 10900 },
  { branches: 8, cents: 12400 },
  { branches: 9, cents: 13900 },
  { branches: 10, cents: 15400 },
  { branches: 11, cents: 16900 },
  { branches: 12, cents: 18400 },
  { branches: 13, cents: 19900 },
];

/* ------------------------------------------------------------------ *
 * 6. The first-activation waiver (ADR-0029)
 *
 * A DISCOUNT ON THE CURVE ABOVE, NOT A SECOND PRODUCT.
 *
 * `ADR-0029` reconciles `AUTH-01`'s free first activation with `ADR-0020`'s
 * branch model. They were treated as a contest between a flat price and a
 * tiered one and they are not in contest: one is a waiver of a fee, the other
 * is what the fee buys.
 *
 * So nothing above changes. `roomPeriodPriceCents` is still the whole price
 * curve, `PUBLISHED_PRICE_TABLE` is still the published table, and everything
 * here computes on top of them. The owner explicitly refused the alternative -
 * charging $15 from the second branch once the waiver lapses - because it would
 * charge separately for branches already inside the standard $79 package and
 * would create a second curve to maintain forever.
 *
 * THE LIST PRICE IS ALWAYS REAL. `ADR-0020` section 17 requires the activation
 * screen to show `$79` list, `minus $79`, `$0` due, and never a silently free
 * room. That presentation needs a genuine list price behind it, which is why
 * nothing here returns a discounted figure without also being able to state
 * what was taken off.
 *
 * A VOCABULARY NOTE, because a test enforces it. The word section 17 uses for
 * that middle line is on the forbidden-vocabulary list in
 * `__tests__/pricing.test.ts`, which exists so the retired usage-currency
 * subsystem cannot reappear inside the pricing engine by drift. The guard is
 * right, and this comment deliberately does not spell out the list it is
 * describing - naming those words here would trip the very check being
 * explained.
 *
 * So: here the reduction is a DISCOUNT. Whatever the activation screen calls
 * it belongs in `messages/en.json`, not in this file.
 *
 * WHAT IS NOT HERE: eligibility. Whether a given organisation still holds its
 * waiver is a database question with an unresolved uniqueness rule behind it -
 * see `docs/codex/audits/pricing/WO-7-1-ORGANISATION-UNIQUENESS-2026-08-02.md`.
 * These functions take eligibility as a BOOLEAN the caller has already decided.
 * That keeps this module what it has always been: pure, clockless, and with no
 * opinion about the database.
 *
 * DISCLOSURE: counts, never collections. `ADR-0020` sections 4 and 11 forbid a
 * participant learning branch count, including through a total. Nothing here
 * accepts or returns a branch identifier.
 * ------------------------------------------------------------------ */

/**
 * Active branches permitted while the waiver holds.
 *
 * One. Requesting a second is what ends it.
 */
export const FIRST_ACTIVATION_WAIVED_BRANCHES = 1;

/**
 * The additional-branch charge cap inside a waived period, in cents.
 *
 * $120, so that a waived period reaches the same $199 ceiling as any other at
 * thirteen or more branches: the $79 base becomes due when the waiver lapses,
 * and $79 + $120 = $199. Derived rather than typed, so the three numbers cannot
 * drift apart.
 */
export const WAIVED_PERIOD_ADDITIONAL_CAP_CENTS =
  MAXIMUM_ROOM_PERIOD_PRICE_CENTS - BASE_ROOM_PRICE_CENTS;

/** What a period costs, and what it would have cost. */
export interface PeriodCharge {
  /** Always the real, undiscounted curve price. Never zero. */
  listCents: number;
  /** What the waiver takes off. Zero when no waiver applies. */
  discountCents: number;
  /** `listCents - discountCents`. What is actually taken. */
  amountDueCents: number;
  /** True only when the waiver is both held and still intact. */
  waiverApplied: boolean;
}

/**
 * The charge for one room period, with the waiver applied where it holds.
 *
 * `waiverEligible` means the organisation still holds its once-and-forever
 * waiver. It is the CALLER's job to establish that; see the note above.
 *
 * The waiver survives only at a single active branch. At two or more the base
 * fee becomes due and the standard five-branch allowance applies from that
 * moment - which is simply the unwaived curve, so there is nothing to special
 * case. That is the point of expressing this as a discount.
 */
export function periodCharge(activeBranchCount: number, waiverEligible: boolean): PeriodCharge {
  assertBranchCount(activeBranchCount, "activeBranchCount");
  const listCents = roomPeriodPriceCents(activeBranchCount);

  const waiverApplied = waiverEligible && activeBranchCount <= FIRST_ACTIVATION_WAIVED_BRANCHES;
  // The whole base fee, never a part of it. Below the included five the curve
  // IS the base fee, so this discounts to exactly zero without hard-coding it.
  const discountCents = waiverApplied ? listCents : 0;

  return {
    listCents,
    discountCents,
    amountDueCents: listCents - discountCents,
    waiverApplied,
  };
}

/**
 * What is actually taken for one room period, in cents.
 *
 * The convenience form of {@link periodCharge} for callers that need only the
 * number. Anything rendering an activation screen should use `periodCharge`
 * instead, because section 17 requires the list price and the reduction to be
 * shown alongside the total.
 */
export function amountDueCents(activeBranchCount: number, waiverEligible: boolean): number {
  return periodCharge(activeBranchCount, waiverEligible).amountDueCents;
}

/**
 * Would moving to this many branches end the waiver?
 *
 * For the notice that `WO-7.5` requires **before** the action rather than after
 * it. A member who asks for a second branch is about to owe $79, and finding
 * that out afterwards is the kind of surprise this product does not permit.
 *
 * False when no waiver is held: nothing to end.
 */
export function wouldEndWaiver(requestedBranchCount: number, waiverEligible: boolean): boolean {
  assertBranchCount(requestedBranchCount, "requestedBranchCount");
  return waiverEligible && requestedBranchCount > FIRST_ACTIVATION_WAIVED_BRANCHES;
}
