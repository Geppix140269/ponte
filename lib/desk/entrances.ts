/**
 * The market entrances: how a member gets from "this is my family of trade" to
 * a composer that asks the right questions.
 *
 * Ponte must always lead from information to a meaningful commercial action. A
 * family card that states a market exists and then does nothing is the failure
 * this file exists to prevent, so every entrance here resolves to a real route
 * with a real destination, and a family with no external inventory is still
 * actionable through member creation.
 *
 * The canonical identifiers come from `lib/taxonomy/market.ts` and are never
 * re-declared. A component that writes "products" or "offer_product" as a
 * string literal has forked the taxonomy; it asks this module instead.
 *
 * On HS classification, which is the reason this indirection exists at all:
 * a product record is classified against the HS taxonomy because that is what
 * the WCO nomenclature is for. A trade service and a distribution arrangement
 * are NOT products, have no HS code, and must never be pushed through a
 * six-digit drill-down to reach a composer. `requiresHsClassification` is the
 * single answer to that question, and the composer reads it rather than
 * deciding for itself.
 */

import {
  MARKET_FAMILIES,
  intentsForFamily,
  isIntentForFamily,
  type MarketFamily,
  type MarketIntent,
} from "@/lib/taxonomy/market";

/** One way into the product, as a member would describe it to themselves. */
export interface MarketEntrance {
  family: MarketFamily;
  intent: MarketIntent;
  /** The action, in the member's words. Never an internal identifier. */
  label: string;
  /** What happens next, so nothing is a surprise after the click. */
  note: string;
  /** Locale-relative destination, with the canonical pair carried. */
  href: string;
}

/**
 * Does a family's record need an HS classification to be meaningful?
 *
 * Products: yes. The HS code is how a product record becomes findable and
 * comparable, and it is the shared vocabulary between Ponte and every customs
 * authority in the corridor.
 *
 * Trade services and Distribution: no. There is no HS code for "pre-shipment
 * inspection on West African corridors" or "exclusive distribution across the
 * GCC", and inventing one would be a false classification on a real record. A
 * distribution arrangement that later attaches a specific physical product may
 * classify THAT product; the arrangement itself still has no HS code.
 */
export function requiresHsClassification(family: MarketFamily): boolean {
  return family === "products";
}

/** The composer route for a canonical family and intent. */
export function composerHref(family: MarketFamily, intent: MarketIntent): string {
  if (!isIntentForFamily(family, intent)) {
    // Unreachable through the exported builders, which only pair a family with
    // its own intents. Loud rather than a route that silently drops the intent.
    throw new Error(`Intent ${intent} does not belong to family ${family}`);
  }
  return `/structure?family=${family}&intent=${intent}`;
}

/**
 * The member-creation entrances for one family, derived from the taxonomy.
 *
 * Derived, not listed: adding an intent to `MARKET_INTENTS` adds an entrance
 * here automatically, which is what keeps the landing from drifting away from
 * the accepted market model.
 */
export function creationEntrancesFor(family: MarketFamily): MarketEntrance[] {
  return intentsForFamily(family).map((definition) => ({
    family,
    intent: definition.key,
    label: ENTRANCE_LABEL[definition.key],
    note: ENTRANCE_NOTE[definition.key],
    href: composerHref(family, definition.key),
  }));
}

/**
 * The action wording a member reads.
 *
 * Deliberately separate from the taxonomy's own `label`, which names the intent
 * for an engineer ("Source a product"). These are what the member is about to
 * do, phrased as the act rather than the category.
 */
const ENTRANCE_LABEL: Record<MarketIntent, string> = {
  source_product: "Post a product requirement",
  offer_product: "Post a product offer",
  seek_trade_service: "Request a trade service",
  offer_trade_service: "Offer a trade service",
  seek_distribution_partner: "Find a distribution partner",
  offer_distribution_or_representation: "Offer distribution or market coverage",
  seek_brands_or_products_to_represent: "Find products or brands to represent",
};

const ENTRANCE_NOTE: Record<MarketIntent, string> = {
  source_product: "State what you need to buy, and Ponte structures it for review",
  offer_product: "State what you can supply, and Ponte structures it for review",
  seek_trade_service: "Describe the service you need. No HS code is asked for",
  offer_trade_service: "Describe the service you provide. No HS code is asked for",
  seek_distribution_partner: "Describe the market coverage you are looking for",
  offer_distribution_or_representation: "Describe the territories and categories you cover",
  seek_brands_or_products_to_represent: "Describe what you would take to your market",
};

/** Where a family's existing external inventory is read, when it has any. */
export interface FamilyDiscovery {
  label: string;
  note: string;
  href: string;
}

/**
 * Discovery for a family: the records Ponte has already observed.
 *
 * Only Products has external inventory today. `desk_radar` holds 3,517 public
 * Market Signals, all of them product-shaped, and none of them classified as a
 * service or a distribution arrangement. Returning null for the other two is
 * the truth, and the caller renders creation entrances alone rather than a
 * discovery link into an empty result.
 *
 * This is not a statement that those markets are inactive. It is a statement
 * that Ponte has not yet observed them externally, which is why both remain
 * fully actionable through member creation.
 */
export function discoveryFor(family: MarketFamily): FamilyDiscovery | null {
  if (family !== "products") return null;
  return {
    label: "Explore Market Signals",
    note: "Demand and supply read from named public sources",
    href: "/market-signals",
  };
}

/** How each family behaves at launch, as accepted product behaviour. */
export const FAMILY_LAUNCH_BEHAVIOUR: Record<MarketFamily, string> = {
  products: "Discovery-led and participation-enabled",
  services: "Participation-led",
  distribution: "Matching-led",
};

/** The three families with everything a surface needs to render them. */
export function marketEntrances() {
  return MARKET_FAMILIES.map((family) => ({
    ...family,
    behaviour: FAMILY_LAUNCH_BEHAVIOUR[family.key],
    discovery: discoveryFor(family.key),
    create: creationEntrancesFor(family.key),
    requiresHs: requiresHsClassification(family.key),
  }));
}

/**
 * Read a canonical family and intent back off a composer URL.
 *
 * Returns null unless BOTH are present and the intent genuinely belongs to the
 * family. A half-valid pair is not repaired and not partially applied: the
 * composer opens at its own first step rather than starting a member in a
 * family they did not choose.
 */
export function entranceFromParams(params: {
  family?: string | null;
  intent?: string | null;
}): { family: MarketFamily; intent: MarketIntent } | null {
  const family = MARKET_FAMILIES.find((f) => f.key === params.family)?.key;
  if (!family) return null;
  if (!isIntentForFamily(family, params.intent)) return null;
  return { family, intent: params.intent as MarketIntent };
}
