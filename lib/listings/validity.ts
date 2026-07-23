// Whether a listing is current, and whether it has expired.
//
// Two related but distinct questions live here, and they are NOT the same test:
//
//   isNotExpired  — the PUBLIC filter. A row is shown unless it carries a
//                   valid_until that has already passed. A row with no date is
//                   standing and stays. This is the exact rule getLiveDeals
//                   already applies, lifted out so the board, the detail page
//                   and the homepage showcase can all share one clock and one
//                   boundary, and so a legacy row with no validity declared is
//                   never hidden.
//
//   isListingCurrent — the APPROVAL test (brief 3.5, "the opportunity is
//                   current"). Stricter: validity must be DECLARED. A dated
//                   listing is current only while its date is in the future; a
//                   standing listing always is; an undeclared validity is not
//                   current, because the desk cannot approve an open-ended
//                   horizon it was never told about.
//
// Pure, and deliberately import-free so the test runner can exercise it
// directly without dragging in the Supabase or Next chain.

export type ValidityType = "dated" | "standing";

/**
 * Reconfirmation window for approved member listings.
 *
 * Policy decision (2026-07): a Qualified Opportunity must be reconfirmed every
 * 90 days to stay public. A standing listing that is not reconfirmed within the
 * window becomes publicly ineligible; a finite listing is additionally capped
 * by its valid_until, and the EARLIER of the two deadlines controls visibility.
 * This applies to member listings, not Market Signals (which have their own
 * 90-day-from-signal-date rule).
 */
export const RECONFIRM_WINDOW_DAYS = 90;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * The public expiry filter. Matches getLiveDeals exactly: a listing is shown
 * unless it has a valid_until strictly in the past. No date means standing,
 * which stays. An unparseable date is not treated as expired: hiding a row on
 * a value we cannot read would be a silent, unexplained disappearance.
 */
export function isNotExpired(
  validUntil: string | null | undefined,
  now: number = Date.now(),
): boolean {
  if (!validUntil) return true;
  const t = Date.parse(validUntil);
  if (!Number.isFinite(t)) return true;
  return t > now;
}

/**
 * The approval-gate currency test. Validity must be declared, and a dated
 * validity must still be in the future. Same boundary as isNotExpired so the
 * two never disagree about a dated listing.
 */
export function isListingCurrent(
  validityType: string | null | undefined,
  validUntil: string | null | undefined,
  now: number = Date.now(),
): boolean {
  if (validityType === "standing") return true;
  if (validityType === "dated") {
    if (!validUntil) return false;
    const t = Date.parse(validUntil);
    return Number.isFinite(t) && t > now;
  }
  // Validity was never declared. Recorded facts only: this is not current.
  return false;
}

/**
 * Whether an approved listing's reconfirmation has lapsed.
 *
 * An approved listing carries a reconfirmed_at stamp. Once it is older than the
 * window, the listing is stale and must not stay public until an owner
 * reconfirms it. A listing with no stamp at all has never been reconfirmed and
 * is treated as lapsed, so nothing is shown on the strength of an absent date.
 */
export function reconfirmationLapsed(
  reconfirmedAt: string | null | undefined,
  now: number = Date.now(),
): boolean {
  if (!reconfirmedAt) return true;
  const t = Date.parse(reconfirmedAt);
  if (!Number.isFinite(t)) return true;
  return t + RECONFIRM_WINDOW_DAYS * DAY_MS <= now;
}

/**
 * Whether an approved listing may be shown on a public surface.
 *
 * The composite of the two deadlines, earlier one controlling: it is hidden if
 * its finite validity has passed OR its reconfirmation has lapsed. Verification
 * currency is enforced separately on the owner (see publication-gate), because
 * it depends on a different record.
 */
export function isPubliclyCurrent(
  row: { valid_until?: string | null; reconfirmed_at?: string | null },
  now: number = Date.now(),
): boolean {
  if (!isNotExpired(row.valid_until, now)) return false;
  if (reconfirmationLapsed(row.reconfirmed_at, now)) return false;
  return true;
}
