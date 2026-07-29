/**
 * Entitlement, held apart from the room lifecycle.
 *
 * Issue #97 lists "Entitlement state is separate from room lifecycle state" as
 * a required domain property, and ADR-0009 says the same. This module and its
 * own table are what that separation looks like: a room can be `active` while
 * its entitlement is `expired`, and the result is a readable room that refuses
 * writes - not a deleted room, and not a room that quietly keeps working.
 *
 * ## What this is not
 *
 * There is no price, no currency, no Stripe identifier, no invoice and no
 * charge anywhere in this module or its table. Launch scope is Starter and
 * authorised waiver. ADR-0006 accepted the Starter *principle*; its numeric
 * limits are recorded as **proposed, not owner-accepted**, so the constants
 * below carry that status in their names and are read from one place, ready to
 * be changed by a decision rather than by a search-and-replace.
 */

import type { EntitlementKind, EntitlementState } from "./states";

/**
 * The proposed Starter limits, from
 * `PT-COMMERCIAL-2026-07-27-03-STARTER-DEAL-ROOM-ACCESS.md` and
 * `CURRENT-STATE.md`.
 *
 * **Proposed, not owner-accepted.** They are applied by the launch slice
 * because a Starter room has to have some bound, and they are the only numbers
 * any authority has written down. Changing them is a commercial decision.
 */
export const STARTER_LIMITS_PROPOSED = {
  activeDays: 30,
  subRooms: 3,
  externalOrganisations: 2,
  internalUsers: 2,
} as const;

export interface Entitlement {
  kind: EntitlementKind;
  state: EntitlementState;
  /** Set when the term began: activation, not proposal. */
  activatedAt: string | null;
  expiresAt: string | null;
}

/**
 * Days left in the term, or null when there is no term running.
 *
 * Rounded up, so a room with four hours left reads "1 day remaining" rather
 * than "0 days remaining", which would be both wrong and alarming.
 */
export function daysRemaining(entitlement: Entitlement, now: Date = new Date()): number | null {
  if (!entitlement.expiresAt) return null;
  const ms = Date.parse(entitlement.expiresAt) - now.getTime();
  if (ms <= 0) return 0;
  return Math.ceil(ms / (24 * 60 * 60 * 1000));
}

/**
 * When the term begins.
 *
 * Product definition Phase F: "Activation begins the Starter or credit-funded
 * term where applicable" - and activation requires the first required external
 * principal to be admitted. So the clock does not start when a room is created
 * and sits waiting for a counterparty who never answers. That would spend the
 * member's one Starter room on an invitation.
 */
export function starterExpiryFrom(activatedAt: Date): Date {
  return new Date(activatedAt.getTime() + STARTER_LIMITS_PROPOSED.activeDays * 24 * 60 * 60 * 1000);
}

/**
 * The transition an expired term causes.
 *
 * Read-only, never deletion. Product definition Phase J is explicit: "the
 * master room and sub-rooms become read-only. No history is deleted. Upgrade or
 * restoration resumes the same room."
 */
export function hasLapsed(entitlement: Entitlement, now: Date = new Date()): boolean {
  if (entitlement.state === "expired" || entitlement.state === "suspended" || entitlement.state === "closed") {
    return true;
  }
  if (!entitlement.expiresAt) return false;
  return Date.parse(entitlement.expiresAt) < now.getTime();
}

export interface EntitlementUsage {
  subRoomsUsed: number;
  externalOrganisationsAdmitted: number;
  internalUsers: number;
}

export interface LimitCheck {
  withinLimit: boolean;
  used: number;
  limit: number;
  /** What the member is told when the limit is reached. Continuity, not loss. */
  message: string | null;
}

export function subRoomLimit(usage: EntitlementUsage, entitlement: Entitlement): LimitCheck {
  if (entitlement.kind !== "starter") {
    return { withinLimit: true, used: usage.subRoomsUsed, limit: Infinity, message: null };
  }
  const limit = STARTER_LIMITS_PROPOSED.subRooms;
  const withinLimit = usage.subRoomsUsed < limit;
  return {
    withinLimit,
    used: usage.subRoomsUsed,
    limit,
    message: withinLimit
      ? null
      : `A Starter Deal Room includes ${limit} private workspaces, and this room is using all ${limit}. Everything already in this room stays exactly as it is.`,
  };
}

export function guestOrganisationLimit(usage: EntitlementUsage, entitlement: Entitlement): LimitCheck {
  if (entitlement.kind !== "starter") {
    return { withinLimit: true, used: usage.externalOrganisationsAdmitted, limit: Infinity, message: null };
  }
  const limit = STARTER_LIMITS_PROPOSED.externalOrganisations;
  const withinLimit = usage.externalOrganisationsAdmitted < limit;
  return {
    withinLimit,
    used: usage.externalOrganisationsAdmitted,
    limit,
    message: withinLimit
      ? null
      : `A Starter Deal Room admits ${limit} external organisations, and this room has admitted ${limit}. Everything already in this room stays exactly as it is.`,
  };
}

/**
 * The usage summary for DR-17, factual and calm.
 *
 * No countdown styling, no urgency, no "act now". The Experience Design calls
 * this screen "factual and calm" and the sentence structure here is the reason
 * it can be.
 */
export function usageSummary(entitlement: Entitlement, usage: EntitlementUsage): string[] {
  if (entitlement.kind !== "starter") {
    return ["This room is open under an authorised waiver. No term is running."];
  }
  const days = daysRemaining(entitlement);
  const lines: string[] = ["Starter Deal Room"];
  if (days === null) {
    lines.push("The term begins when the first invited principal is admitted.");
  } else if (days === 0) {
    lines.push("The term has ended. The room is read-only and nothing has been deleted.");
  } else {
    lines.push(days === 1 ? "1 active day remaining" : `${days} active days remaining`);
  }
  lines.push(`${usage.subRoomsUsed} of ${STARTER_LIMITS_PROPOSED.subRooms} private workspaces used`);
  lines.push(
    `${usage.externalOrganisationsAdmitted} of ${STARTER_LIMITS_PROPOSED.externalOrganisations} external organisations admitted`,
  );
  return lines;
}
