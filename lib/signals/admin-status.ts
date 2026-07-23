/**
 * The admin's Market Signal status vocabulary and the promotion rule (brief
 * Block D). Pure logic so the allowed transitions and the "confirmed links a
 * Qualified Opportunity" rule are unit-tested, not trusted to the form.
 *
 * The full status set lives in lib/market-signals/logic.ts (MarketSignalStatus).
 * This module names the subset an admin may SET from the queue and the one rule
 * that has a side effect: confirmation.
 */

import type { MarketSignalStatus } from "@/lib/market-signals/logic";

/**
 * The statuses an admin may move a signal to from the review queue. Approval to
 * 'approved_signal' is a separate, dedicated action (approveSignalAction) that
 * also stamps the expiry, so it is deliberately NOT in this set. Everything
 * here is a non-publishing move or an investigation-lifecycle move.
 *
 *   private             unpublish, back to the holding state
 *   under_investigation the desk has taken the ask up
 *   confirmed           established and promoted to a real listing (see below)
 *   unavailable         learned it is not current
 *   expired             aged out / no longer worth pursuing
 *   withdrawn           removed for source, legal or quality reasons
 */
export const ADMIN_SETTABLE_STATUSES: readonly MarketSignalStatus[] = [
  "private",
  "under_investigation",
  "confirmed",
  "unavailable",
  "expired",
  "withdrawn",
];

export function isAdminSettableStatus(v: unknown): v is MarketSignalStatus {
  return typeof v === "string" && (ADMIN_SETTABLE_STATUSES as readonly string[]).includes(v);
}

/** English labels for the admin buttons. */
export const SIGNAL_STATUS_LABELS: Record<string, string> = {
  private: "Unpublish",
  under_investigation: "Mark under investigation",
  confirmed: "Confirm and link opportunity",
  unavailable: "Mark unavailable",
  expired: "Mark expired",
  withdrawn: "Withdraw",
};

/** The only status that keeps a signal on the public board. */
export const PUBLIC_SIGNAL_STATUS: MarketSignalStatus = "approved_signal";

/**
 * A confirmed signal must CREATE OR LINK a normal Qualified Opportunity rather
 * than inherit a badge (brief Block D, test 10). It never becomes a public
 * opportunity itself. In practice the desk confirms the requirement with the
 * identified participant, that participant's own verified member listing is the
 * Qualified Opportunity, and it is linked here via promoted_listing_id.
 *
 * This predicate answers whether a confirmation is being recorded WITH its
 * link. A confirmation without a linked listing id is still allowed (the desk
 * may confirm the fact before the member listing exists), so this is used to
 * decide whether to write promoted_listing_id, not to block the transition.
 */
export function confirmationLinksListing(
  status: MarketSignalStatus,
  promotedListingId: string | null | undefined,
): boolean {
  return status === "confirmed" && !!promotedListingId;
}
