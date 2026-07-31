import type { LandingEvent, LandingEventMeta } from "./analytics";
import type { ExtractedFacts } from "./intent";
import { destinationFor } from "./routing";

/**
 * The two-route bridge (North Star entry architecture, section 5.1).
 *
 * The landing has exactly two primary entrances:
 *
 *   01 Explore the market -> /explore
 *   02 Start a deal       -> the Structure composer
 *
 * Check a company and Investigate a signal are no longer primary routes. They
 * remain reachable downstream and through search, which still resolves the
 * older `RouteKey` vocabulary in lib/landing/intent.ts; that vocabulary is the
 * search interpreter's, not the bridge's, and the two are deliberately no
 * longer the same list.
 *
 * A click is the whole decision: it leaves the landing page at once. Nothing
 * here keeps the visitor on the landing waiting for a second step.
 *
 * Start a deal does not restate a destination. It asks `destinationFor`, which
 * is still the single destination authority. Since cutover PR 3 that answer is
 * unconditionally the composer: the legacy seam it used to choose between was
 * itself a redirect to the composer, so NEXT_PUBLIC_STRUCTURE_JOURNEY no longer
 * decides anything and is no longer a safe-disable.
 */

export type BridgeRoute = "explore" | "deal";

export const BRIDGE_ROUTES: readonly BridgeRoute[] = ["explore", "deal"];

export interface BridgeNavigation {
  /** Locale-relative path to push. */
  destination: string;
  /** Events to emit, in order. */
  events: { name: LandingEvent; meta: LandingEventMeta }[];
}

/**
 * Where a bridge route opens.
 *
 * Anything the visitor already typed rides along so it is not lost across the
 * navigation: Explore reads it as a query (`q`), and Start a deal keeps the
 * existing `intent` / `product` / `company` contract that the composer and the
 * legacy seam already ignore safely when they do not read a key.
 */
export function bridgeDestination(route: BridgeRoute, facts?: ExtractedFacts): string {
  if (route === "deal") return destinationFor("structure", facts);

  const raw = facts?.raw?.trim();
  const product = facts?.product?.trim();
  const query = product || raw;
  return query ? `/explore?q=${encodeURIComponent(query)}` : "/explore";
}

/**
 * Resolve a deliberate route click into its destination and its events.
 *
 * `intent_submitted` is reported only when the visitor actually supplied an
 * objective, so a bare route click is never counted as a submitted intent.
 */
export function bridgeNavigation(
  route: BridgeRoute,
  facts?: ExtractedFacts,
): BridgeNavigation {
  const events: { name: LandingEvent; meta: LandingEventMeta }[] = [
    { name: "route_suggested", meta: { route } },
    { name: "route_confirmed", meta: { route } },
  ];
  if (facts?.raw?.trim()) events.push({ name: "intent_submitted", meta: { route } });

  return { destination: bridgeDestination(route, facts), events };
}
