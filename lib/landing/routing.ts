/**
 * Maps a chosen route plus extracted facts onto an existing production URL.
 *
 * The four routes are real entry points, not decorative links. Each lands on
 * the live workflow that already handles it, using the query params those pages
 * already read:
 *
 *   find        -> /find                             (Journey 1)
 *   structure   -> /structure                        (Journey 2)
 *   check       -> /verify?for=counterparty          (counterparty due diligence)
 *   investigate -> /market-signals                   (external signals board)
 *
 * Neither Find nor Structure has a seam to fall back TO any more, so neither
 * branch reads its flag.
 *
 * Find's fallback was the obsidian board, retired in cutover PR 5: that path is
 * now a permanent redirect to /find. Structure's was the legacy editor, a
 * redirect to the composer since LB-013. A flag whose "off" position forwards
 * to its "on" position is not a safe-disable. It is a second hop and a false
 * promise that a previous surface is still there, so NEXT_PUBLIC_FIND_JOURNEY
 * and NEXT_PUBLIC_STRUCTURE_JOURNEY no longer govern a destination.
 *
 * Closing the Structure seam also fixes a silent loss: see `baseFor`.
 *
 * The user's own words and any facts read from them ride along as query params
 * so nothing is lost across the navigation, and, because the destinations gate
 * saving/sending behind /login?next=<same-site-path>, the context survives the
 * authentication boundary too. Destinations that do not yet read these params
 * simply ignore them; no page breaks on an unknown query key.
 */

import type { ExtractedFacts, RouteKey } from "./intent";

/**
 * The base path for a route, read from the journey flags. Each
 * `process.env.NEXT_PUBLIC_*` reference stays a literal member expression so
 * the Next build still inlines it into the client bundle; reading it per call
 * (rather than once at module load) changes nothing at runtime and lets the
 * tests prove both flag states in one process.
 */
function baseFor(route: RouteKey): string {
  switch (route) {
    // Journey 1 is unconditional: the surface its flag used to fall back to is
    // retired. See the module comment.
    case "find":
      return "/find";
    // Journey 2 is unconditional for the same reason Journey 1 is. The seam is
    // closed rather than flipped (cutover PR 3).
    //
    // The fallback was the legacy editor path, which has itself been a redirect
    // to the composer since LB-013. So the flag never chose between two
    // surfaces: it chose between reaching /structure directly and reaching it
    // through a hop. That hop was not free. The redirect deliberately discards
    // every query key except `id`/`edit`, so the intent, product and company
    // this function appends were dropped on the flag-off path and the member
    // arrived at an empty composer having already said what they wanted.
    //
    // Naming /structure here is what fixes that, and it is why this is a code
    // change and not a deployment-host flag flip: with both branches leading to
    // the same surface, the flag governed nothing, and setting it could not
    // have restored anything.
    case "structure":
      return "/structure";
    // Check & Verify (Journey 3) when its flag is on; else the counterparty
    // handoff to the existing /verify surface. Turning the flag off restores the
    // previous behaviour with no other change (the journey's safe-disable).
    case "check":
      return process.env.NEXT_PUBLIC_CHECK_JOURNEY === "on" ? "/check" : "/verify?for=counterparty";
    case "investigate":
      return "/market-signals";
  }
}

/**
 * Build the locale-relative destination path for a route. The returned path is
 * fed to the next-intl locale-aware router, which prefixes the active locale.
 */
export function destinationFor(route: RouteKey, facts?: ExtractedFacts): string {
  const base = baseFor(route);
  const params = new URLSearchParams();

  const raw = facts?.raw?.trim();
  if (raw) params.set("intent", raw);
  if (facts?.product) params.set("product", facts.product);
  if (facts?.company) params.set("company", facts.company);

  const query = params.toString();
  if (!query) return base;
  return base.includes("?") ? `${base}&${query}` : `${base}?${query}`;
}
