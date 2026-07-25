/**
 * A direct bridge entrance: what happens when the visitor deliberately picks
 * one of the four routes instead of describing an objective.
 *
 * The four routes across the bridge are real entrances, so a click is the whole
 * decision: it leaves the landing page at once for the journey that owns the
 * route. No product, company or typed objective is required first; the
 * destination journey collects whatever it still needs.
 *
 * Destinations are never restated here. `destinationFor` stays the single
 * authority, so the journey feature flags keep deciding between the new surface
 * and its fallback.
 *
 * Analytics follow the existing landing convention:
 *   route_suggested  - the route became the active one;
 *   route_confirmed  - the visitor chose it deliberately;
 *   intent_submitted - only when an objective was actually supplied, so a bare
 *                      route click is never reported as a submitted objective.
 */

import type { LandingEvent, LandingEventMeta } from "./analytics";
import type { ExtractedFacts, RouteKey } from "./intent";
import { destinationFor } from "./routing";

export interface DirectRouteNavigation {
  /** Locale-relative path to push, from `destinationFor`. */
  destination: string;
  /** Events to emit, in order. */
  events: { name: LandingEvent; meta: LandingEventMeta }[];
}

/**
 * Resolve a deliberate route click into its destination and its events.
 *
 * `facts` are the facts already read from an objective the visitor happened to
 * type or speak before clicking; they ride along so nothing is lost. Absent
 * facts are normal, not an error state.
 */
export function directRouteNavigation(
  route: RouteKey,
  facts?: ExtractedFacts,
): DirectRouteNavigation {
  const events: { name: LandingEvent; meta: LandingEventMeta }[] = [
    { name: "route_suggested", meta: { route } },
    { name: "route_confirmed", meta: { route } },
  ];
  if (facts?.raw?.trim()) events.push({ name: "intent_submitted", meta: { route } });

  return { destination: destinationFor(route, facts), events };
}
