/**
 * The command bar's entries, in one place, for every shell.
 *
 * ## Why this exists
 *
 * The 7 August 2026 walkthrough found **five different header systems** across
 * the product, with four different navigation vocabularies and two surfaces
 * carrying no header at all. A member crossing from the entrance to
 * verification met a different lockup, a different nav and no way to sign in.
 * Each generation had shipped its own bar instead of replacing the last one.
 *
 * The cause was that every shell decided its own navigation. This module ends
 * that: `PRIMARY_NAV` is the single declaration, and a shell renders it rather
 * than composing one. Adding a destination in one shell and not the others is
 * no longer possible.
 *
 * ## What the entries are, and what they are not
 *
 * `00-NORTH-STAR-ENTRY-ARCHITECTURE.md` section 1: the platform has **two**
 * primary entry journeys and no others — *Explore the market* and *Start a
 * deal*. Owner decision **OD-J** fixes those as the member-visible labels and
 * keeps `/find` and `/publish` as technical routes that are never shown.
 *
 * Market Signals and Deal Rooms follow them as **contextual destinations**.
 * Neither is a third journey:
 *
 *   - **Market Signals** is the unconfirmed lane, reached inside the market.
 *   - **Deal Rooms** is the public explanation of the room (ADR-0036), which is
 *     authorised to be named and explained but is never an entry journey
 *     (ADR-0003, ADR-0021 ruling 4 as amended). Signed in, the same route is
 *     the member's own rooms.
 *
 * The Desk bar previously offered `Open a Deal Room` pointing at
 * `/deal-rooms/propose`. That named the paid product as a navigation
 * destination and sent an anonymous visitor into a proposal flow, which is the
 * defect registered as **JD-09**. The entry here is the explanation, not the
 * proposal; JD-09 itself is R0-B and is untouched.
 */

export interface PrimaryNavEntry {
  /** Stable key, used to mark the current place. Never shown. */
  key: PrimaryNavKey;
  /** What a member reads. The canonical wording, per OD-J. */
  label: string;
  /** Where it goes. A technical route, never shown as a label. */
  href: string;
  /** True for the two North Star entry journeys. */
  journey: boolean;
}

export type PrimaryNavKey = "explore" | "deal" | "signals" | "rooms";

/**
 * The command bar, in order.
 *
 * The two journeys come first and are always both present, including at
 * 390px. The walkthrough found "Find an opportunity" living only in the footer,
 * which demoted half the product below the fold on its own entrance.
 */
export const PRIMARY_NAV: readonly PrimaryNavEntry[] = [
  { key: "explore", label: "Explore the market", href: "/find", journey: true },
  { key: "deal", label: "Start a deal", href: "/publish", journey: true },
  { key: "signals", label: "Market Signals", href: "/market-signals", journey: false },
  { key: "rooms", label: "Deal Rooms", href: "/deal-rooms", journey: false },
];

/** The two primary entry journeys, for surfaces that carry only those. */
export const PRIMARY_JOURNEYS: readonly PrimaryNavEntry[] = PRIMARY_NAV.filter((n) => n.journey);

/**
 * Where signing in should return to.
 *
 * The walkthrough found `/account` redirecting to a bare `/login` while
 * `/workspace` and `/admin` preserved their destination, so a member who was
 * sent to sign in from their account did not come back to it. Every redirect to
 * the sign-in door uses this, so the rule holds in one place rather than being
 * remembered at each call site.
 *
 * The path is used as given and is never taken from user input, so it cannot
 * become an open redirect: callers pass their own route, not a query parameter.
 */
export function signInHref(returnTo?: string | null): string {
  if (!returnTo || !returnTo.startsWith("/") || returnTo.startsWith("//")) return "/login";
  return `/login?next=${encodeURIComponent(returnTo)}`;
}
