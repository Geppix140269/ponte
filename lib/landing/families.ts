import { marketEntrances } from "@/lib/desk/entrances";
import type { LandingFamily } from "@/components/ponte/bridge/LandingBridges";
import type { MarketIntent } from "@/lib/taxonomy/market";

/**
 * The three market families as the landing's Family Bridge renders them.
 *
 * The page and its tests read this one function rather than two copies of the
 * same mapping. Nothing here builds a URL: `marketEntrances()` derives every
 * href from the canonical family/intent pair, so this cannot express a
 * destination the taxonomy does not already produce.
 *
 * ## The copy is the approved reference's own
 *
 * `SCOPE` and `NOTE` below are transcribed from the owner-approved reference
 * renders in `design/authority/bridge/v1/reference/`, which are now in the
 * repository and match `SOURCE-MANIFEST.md`. They are not written here.
 *
 * That matters for two reasons beyond fidelity.
 *
 * **No HS language reaches the landing.** The approved description of Products
 * is "Requirements and offers for physical goods." — it does not mention the HS
 * taxonomy, and neither does any action note. HS classification is a property of
 * the product composer, not of choosing a market family, and the earlier landing
 * copy ("Physical goods, classified against the HS taxonomy", "No HS code is
 * asked for") put a classification vocabulary in front of members who had not
 * yet chosen anything. Trade services and distribution never touch HS at all,
 * and saying so on the landing only raised the question.
 *
 * **The two-action variant is deliberate.** Trade services has two actions and
 * the approved reference states, under that bridge, that "A third is not
 * withheld, there is no third." A member should not read two actions as a
 * truncated three. `COUNT_NOTE` carries that.
 *
 * Ordering is the taxonomy's own: discovery first where a family has any, then
 * the creation entrances. Only Products has externally observed inventory, so
 * only Products opens with "Explore Market Signals"; fabricating a discovery
 * entrance for the other two would lead a member into an empty result.
 */
export function landingFamilies(): LandingFamily[] {
  return marketEntrances().map((family) => ({
    key: family.key,
    label: family.label,
    scope: SCOPE[family.key],
    abutment: ABUTMENT[family.key],
    countNote: COUNT_NOTE[family.key] ?? null,
    actions: [
      ...(family.discovery
        ? [
            {
              key: `${family.key}-discovery`,
              label: family.discovery.label,
              note: DISCOVERY_NOTE,
              href: family.discovery.href,
            },
          ]
        : []),
      ...family.create.map((entrance) => ({
        key: entrance.intent,
        label: entrance.label,
        note: NOTE[entrance.intent],
        href: entrance.href,
      })),
    ],
  }));
}

/** What each family covers. Approved reference copy. */
const SCOPE: Record<string, string> = {
  products: "Requirements and offers for physical goods.",
  services: "Freight, inspection, certification, clearance, finance.",
  distribution: "Agency, distribution and market coverage.",
};

/**
 * The abutment where a family's Action Bridge begins.
 *
 * The crossing starts at the family the member chose and ends at the structured
 * journey, which is what `STRUCTURED_JOURNEY` names on the far side.
 */
const ABUTMENT: Record<string, string> = {
  products: "Products",
  services: "Trade services",
  distribution: "Distribution and representation",
};

/**
 * Why a family has the number of actions it has.
 *
 * Only Trade services needs one, and only because two actions beside two
 * three-action families invites the reading that something is missing.
 */
const COUNT_NOTE: Record<string, string | null> = {
  products: null,
  services: "This family has two actions. A third is not withheld, there is no third.",
  distribution: null,
};

/** Approved reference copy for the one discovery entrance. */
const DISCOVERY_NOTE = "Read what Ponte has detected.";

/**
 * What each action means, in the member's own position.
 *
 * Approved reference copy. Each says which side of the trade the member is on,
 * which is the question a member actually has at this point. None mentions HS
 * classification, and none may: it is not asked for by services, distribution or
 * representation at all, and for products it belongs to the composer.
 */
const NOTE: Record<MarketIntent, string> = {
  source_product: "You are buying.",
  offer_product: "You are selling.",
  seek_trade_service: "You need a service performed.",
  offer_trade_service: "You perform the service.",
  seek_distribution_partner: "You hold the product.",
  offer_distribution_or_representation: "You hold the market.",
  seek_brands_or_products_to_represent: "You are looking for a line.",
};

/**
 * The abutment every Action Bridge crosses to.
 *
 * "Private Deal Room", not "Structured journey", per the owner's design package
 * — `Ponte Deal Room - Design Review v3.html`, deliverable I, which recommends
 * Option A, the destination node:
 *
 *   "The Action Bridge's right abutment already existed and already read
 *   'Structured journey' — relabelling it 'Private Deal Room' is the smallest
 *   possible change with the largest gain in meaning, because the member is
 *   looking at that deck at the moment they decide."
 *
 * This is how the Deal Room becomes visible on the entrance without a section
 * or a control: the crossing a member has just chosen is shown ending at the
 * room. A journey that is merely "structured" names a quality; a Private Deal
 * Room names a place, and the place is the product.
 */
export const STRUCTURED_JOURNEY = "Private Deal Room";

/** The abutments of the Family Bridge itself. Approved reference copy. */
export const FAMILY_BRIDGE_ABUTMENTS = { left: "Intent", right: "Private Deal Room" } as const;
