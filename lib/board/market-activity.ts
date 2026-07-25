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
}

/**
 * Recent public market activity, newest first.
 *
 * `limit` trims the merged stream for the caller (the landing band wants a
 * dozen; Explore wants the lot within the cap).
 */
export async function getMarketActivity(limit?: number): Promise<MarketActivity> {
  const [deals, signals] = await Promise.all([
    getLiveDeals(ACTIVITY_SOURCE_CAP),
    getMarketSignals(ACTIVITY_SOURCE_CAP),
  ]);

  return {
    items: mergeActivity(deals, signals, limit),
    capped: deals.length >= ACTIVITY_SOURCE_CAP || signals.length >= ACTIVITY_SOURCE_CAP,
  };
}
