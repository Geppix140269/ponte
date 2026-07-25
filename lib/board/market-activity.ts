import { unstable_noStore as noStore } from "next/cache";
import { createAdminClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/auth";
import { getLiveDeals } from "./live-deals";
import { getMarketSignals } from "./market-signals";
import { mergeActivity, type ActivityItem } from "./activity-logic";

export type { ActivityItem, ActivityKind, ActivityBreakdown } from "./activity-logic";
export { breakdown, inChapterRange } from "./activity-logic";

/**
 * The public market-activity read: two existing, rule-filtered queries, merged.
 *
 * It deliberately adds no query of its own. `getLiveDeals` already applies the
 * publication, validity and owner-eligibility rules to member listings, and
 * `getMarketSignals` already restricts Market Signals to approved, unexpired
 * rows selected over the public column list. Reusing them is what keeps this
 * surface from becoming a second, weaker definition of "public".
 *
 * Both readers call `noStore()` and both swallow their own failures into an
 * empty array, so a database outage costs the landing its band, not its render.
 */

/**
 * How many records each source contributes at most.
 *
 * This is the bound the North Star performance rule asks for: two bounded
 * queries per request, no per-category query, and no attempt to pull the whole
 * signal corpus onto a landing page. It is also the reason counts derived from
 * this read are a floor rather than a certified total once a source saturates
 * it; every surface that prints a count must say so.
 */
export const ACTIVITY_SOURCE_CAP = 300;

export interface MarketActivity {
  items: ActivityItem[];
  /** True when a source returned as many rows as the cap allows. */
  capped: boolean;
  /**
   * The real number of public records, from a count query rather than from the
   * length of the capped read.
   *
   * Without this the surfaces printed the cap: a market holding thousands of
   * approved signals reported "300 market records", which reads as the size of
   * the market rather than the size of one page. Counting is two `head: true`
   * queries that return no rows at all, so the honest number costs almost
   * nothing.
   */
  total: number;
}

/**
 * Recent public market activity, newest first.
 *
 * `limit` trims the merged stream for the caller (the landing band wants a
 * dozen; Explore wants the lot within the cap).
 */
export async function getMarketActivity(limit?: number): Promise<MarketActivity> {
  const [deals, signals, total] = await Promise.all([
    getLiveDeals(ACTIVITY_SOURCE_CAP),
    getMarketSignals(ACTIVITY_SOURCE_CAP),
    countPublicRecords(),
  ]);

  const capped = deals.length >= ACTIVITY_SOURCE_CAP || signals.length >= ACTIVITY_SOURCE_CAP;
  return {
    items: mergeActivity(deals, signals, limit),
    capped,
    // Fall back to what was actually read if the count query is unavailable,
    // so a failed count never reports a market smaller than the rows in hand.
    total: total ?? deals.length + signals.length,
  };
}

/**
 * How many public records exist, as a number rather than as a page size.
 *
 * Two `head: true` counts, which return the count in a header and no rows at
 * all, so this is cheap enough to run on every entry render. It applies the
 * same status filters the two readers apply. It cannot apply the per-row
 * validity and owner-eligibility rules without reading the rows, so the
 * listings figure is an upper bound on currently-visible member records; the
 * signals figure is exact, because approval and expiry are both columns.
 *
 * Returns null when the database is unreachable, so the caller can fall back
 * rather than print a zero it cannot justify.
 */
async function countPublicRecords(): Promise<number | null> {
  noStore();
  if (!isSupabaseConfigured()) return null;

  try {
    const sb = createAdminClient();
    const nowIso = new Date().toISOString();

    const [listings, signals] = await Promise.all([
      sb.from("listings").select("id", { count: "exact", head: true }).eq("status", "approved"),
      sb
        .from("desk_radar")
        .select("id", { count: "exact", head: true })
        .eq("status", "approved_signal")
        .or(`public_expires_at.is.null,public_expires_at.gt.${nowIso}`),
    ]);

    if (listings.error || signals.error) return null;
    return (listings.count ?? 0) + (signals.count ?? 0);
  } catch {
    return null;
  }
}
