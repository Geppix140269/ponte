import type { LiveDeal } from "./live-deals";
import type { MarketSignal } from "../market-signals/logic";

/**
 * One market-activity stream, truthfully classified.
 *
 * The North Star entry architecture (docs/ponte-authority/00-NORTH-STAR-ENTRY-
 * ARCHITECTURE.md, section 3.3) requires Ponte to lead with what is actually
 * happening rather than with the absence of a reviewed opportunity. So the
 * landing band and the Explore surfaces read one stream instead of two lanes.
 *
 * What this module does NOT do is blend the record classes. The founding-launch
 * separation rule still holds: a Market Signal is an external indication Ponte
 * has not confirmed, a member record is a member's own posting, and every item
 * in this stream carries its own class in a field the UI is obliged to print.
 * Merging the presentation is not merging the data.
 *
 * Pure on purpose: no database, no Next, no server import, so the classification
 * rules are unit-tested directly. The database reads live in market-activity.ts.
 */

/**
 * The classifications PR 1 can prove from the current schema.
 *
 * `reviewed_opportunity` and `distribution_opportunity` are named in the North
 * Star copy list but are deliberately absent here: nothing in `listings` or
 * `desk_radar` distinguishes them today, and inventing the distinction would be
 * exactly the false claim the brief forbids. They arrive with PR 3, when the
 * field that proves them exists.
 */
export type ActivityKind =
  | "market_signal"
  | "member_requirement"
  | "member_offer"
  | "service_requirement";

export interface ActivityItem {
  /** Stable within a render; prefixed by source so the two ids cannot collide. */
  key: string;
  kind: ActivityKind;
  /** The product or service as posted. Never rewritten. */
  product: string;
  /** Two-digit HS chapter where known, for sector bucketing. */
  chapter: string | null;
  /** Origin and destination as posted; either may be unknown. */
  originText: string | null;
  destinationText: string | null;
  /** Quantity + unit as posted, joined, or null when not stated. */
  scope: string | null;
  /** ISO timestamp the record entered the market (posted, or spotted). */
  at: string;
  /** Locale-relative path to the public detail, or null when there is none. */
  href: string | null;
}

/** A member listing's `type` mapped onto its true public class. */
export function kindForListingType(type: string): ActivityKind {
  const t = (type ?? "").toLowerCase();
  if (t === "offer") return "member_offer";
  if (t === "service") return "service_requirement";
  return "member_requirement";
}

/** Quantity and unit as one phrase, or null when the record does not state it. */
export function scopeOf(quantity: string | null, unit: string | null): string | null {
  const q = quantity?.trim();
  if (!q) return null;
  const u = unit?.trim();
  return u ? `${q} ${u}` : q;
}

/**
 * A member listing as an activity item.
 *
 * The href points at the existing public listing page, which is the detail the
 * visitor is entitled to see without an account.
 */
export function fromDeal(deal: LiveDeal): ActivityItem {
  return {
    key: `deal:${deal.id}`,
    kind: kindForListingType(deal.type),
    product: deal.product,
    chapter: deal.chapter,
    originText: deal.originText,
    destinationText: deal.destinationText,
    scope: scopeOf(deal.quantity, deal.unit),
    at: deal.postedAt,
    href: deal.ref ? `/marketplace/l/${deal.ref}` : null,
  };
}

/**
 * A Market Signal as an activity item.
 *
 * Both sides (buyer requirement and seller availability) stay `market_signal`:
 * the side is a detail of the signal, but the class the visitor must be told is
 * that Ponte has not confirmed it.
 */
export function fromSignal(signal: MarketSignal): ActivityItem {
  return {
    key: `signal:${signal.id}`,
    kind: "market_signal",
    product: signal.product,
    chapter: signal.chapter,
    originText: signal.originText,
    destinationText: signal.destinationText,
    scope: scopeOf(signal.quantity, signal.unit),
    at: signal.spottedAt,
    href: `/market-signals/${signal.id}`,
  };
}

/**
 * Merge the two sources into one stream, newest first.
 *
 * Ordering is stable: equal timestamps fall back to the key, so two records
 * posted in the same second do not swap places between renders (and between the
 * server render and the client's).
 */
export function mergeActivity(
  deals: LiveDeal[],
  signals: MarketSignal[],
  limit?: number,
): ActivityItem[] {
  const items = [...deals.map(fromDeal), ...signals.map(fromSignal)];
  items.sort((a, b) => {
    const delta = Date.parse(b.at) - Date.parse(a.at);
    if (delta !== 0 && Number.isFinite(delta)) return delta;
    return a.key < b.key ? -1 : a.key > b.key ? 1 : 0;
  });
  return typeof limit === "number" ? items.slice(0, limit) : items;
}

/** The items whose HS chapter falls inside an inclusive chapter range. */
export function inChapterRange(
  items: ActivityItem[],
  min: number,
  max: number,
): ActivityItem[] {
  return items.filter((item) => {
    if (!item.chapter) return false;
    const n = Number(item.chapter);
    return Number.isFinite(n) && n >= min && n <= max;
  });
}

export interface ActivityBreakdown {
  total: number;
  demand: number;
  supply: number;
  services: number;
  /** Market Signals are counted in demand/supply by their own side upstream. */
  signals: number;
}

/**
 * Counts for a set of items. `demand` and `supply` count member records only,
 * because a Market Signal is not a member requirement or a member offer, and a
 * count that pretends otherwise is a claim about liquidity Ponte cannot make.
 */
export function breakdown(items: ActivityItem[]): ActivityBreakdown {
  let demand = 0;
  let supply = 0;
  let services = 0;
  let signals = 0;
  for (const item of items) {
    if (item.kind === "member_requirement") demand++;
    else if (item.kind === "member_offer") supply++;
    else if (item.kind === "service_requirement") services++;
    else signals++;
  }
  return { total: items.length, demand, supply, services, signals };
}
