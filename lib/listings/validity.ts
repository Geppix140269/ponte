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
