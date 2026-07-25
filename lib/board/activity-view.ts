import type { ActivityItem, ActivityKind } from "./activity-logic";

/**
 * The market-activity view model.
 *
 * Every string a visitor reads in the activity band or an Explore list is built
 * here, on the server, from facts the record actually states. Two reasons:
 *
 *   1. Hydration. The band is rendered inside a client component. A relative
 *      time computed independently on the server and again in the browser drifts
 *      and mismatches, so recency is computed once, server-side, and shipped as
 *      a string.
 *   2. Honesty is testable. "What does this row claim?" becomes a unit test
 *      over a pure function rather than an inspection of JSX.
 *
 * Nothing here invents a fact. A field the record did not state comes back
 * null and the template simply does not render it.
 */

export interface ActivityLabels {
  /** The truthful class name, e.g. "Market Signal". Keyed by ActivityKind. */
  kind: Record<ActivityKind, string>;
  /** "{from} to {to}" for a route with both ends known. */
  route: (from: string, to: string) => string;
  /** Recency phrases. */
  today: string;
  daysAgo: (days: number) => string;
}

export interface ActivityBandItem {
  key: string;
  /** The product or service, as posted. */
  product: string;
  /** The truthful classification, always rendered as text. */
  kindLabel: string;
  kind: ActivityKind;
  /** "India to Netherlands", "UAE", or null when the record states neither end. */
  geography: string | null;
  /** "500 MT", or null when not stated. */
  scope: string | null;
  /** "Today" / "3 days ago". */
  recency: string;
  href: string | null;
}

/** Whole days between two instants, floored at zero. */
export function daysBetween(at: string, nowMs: number): number {
  const then = Date.parse(at);
  if (!Number.isFinite(then)) return 0;
  return Math.max(0, Math.floor((nowMs - then) / 86400000));
}

/** Origin and destination as one phrase, using only the ends that are stated. */
export function geographyOf(
  item: Pick<ActivityItem, "originText" | "destinationText">,
  labels: Pick<ActivityLabels, "route">,
): string | null {
  const from = item.originText?.trim() || null;
  const to = item.destinationText?.trim() || null;
  if (from && to) return labels.route(from, to);
  return from ?? to;
}

export function toBandItem(
  item: ActivityItem,
  nowMs: number,
  labels: ActivityLabels,
): ActivityBandItem {
  const days = daysBetween(item.at, nowMs);
  return {
    key: item.key,
    product: item.product,
    kind: item.kind,
    kindLabel: labels.kind[item.kind],
    geography: geographyOf(item, labels),
    scope: item.scope,
    recency: days === 0 ? labels.today : labels.daysAgo(days),
    href: item.href,
  };
}

export function toBandItems(
  items: ActivityItem[],
  nowMs: number,
  labels: ActivityLabels,
): ActivityBandItem[] {
  return items.map((item) => toBandItem(item, nowMs, labels));
}
