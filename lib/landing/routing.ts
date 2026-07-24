/**
 * Maps a chosen route plus extracted facts onto an existing production URL.
 *
 * The four routes are real entry points, not decorative links. Each lands on
 * the live workflow that already handles it, using the query params those pages
 * already read:
 *
 *   find        -> /find  (Journey 1)  or  /marketplace  (the seam)
 *   structure   -> /structure (Journey 2)  or  /marketplace/new (the seam)
 *   check       -> /verify?for=counterparty          (counterparty due diligence)
 *   investigate -> /market-signals                   (external signals board)
 *
 * Find (Journey 1) and Structure (Journey 2) each point at their new surface
 * when their flag is "on" (NEXT_PUBLIC_FIND_JOURNEY / NEXT_PUBLIC_STRUCTURE_
 * JOURNEY), and fall back to the old seam otherwise. Each flag is that
 * journey's safe-disable: turning it off restores the previous handoff with no
 * other change.
 *
 * The user's own words and any facts read from them ride along as query params
 * so nothing is lost across the navigation, and, because the destinations gate
 * saving/sending behind /login?next=<same-site-path>, the context survives the
 * authentication boundary too. Destinations that do not yet read these params
 * simply ignore them; no page breaks on an unknown query key.
 */

import type { ExtractedFacts, RouteKey } from "./intent";

const FIND_JOURNEY_ON = process.env.NEXT_PUBLIC_FIND_JOURNEY === "on";
const STRUCTURE_JOURNEY_ON = process.env.NEXT_PUBLIC_STRUCTURE_JOURNEY === "on";

const BASE: Record<RouteKey, string> = {
  find: FIND_JOURNEY_ON ? "/find" : "/marketplace",
  structure: STRUCTURE_JOURNEY_ON ? "/structure" : "/marketplace/new?type=requirement",
  check: "/verify?for=counterparty",
  investigate: "/market-signals",
};

/**
 * Build the locale-relative destination path for a route. The returned path is
 * fed to the next-intl locale-aware router, which prefixes the active locale.
 */
export function destinationFor(route: RouteKey, facts?: ExtractedFacts): string {
  const base = BASE[route];
  const params = new URLSearchParams();

  const raw = facts?.raw?.trim();
  if (raw) params.set("intent", raw);
  if (facts?.product) params.set("product", facts.product);
  if (facts?.company) params.set("company", facts.company);

  const query = params.toString();
  if (!query) return base;
  return base.includes("?") ? `${base}&${query}` : `${base}?${query}`;
}
