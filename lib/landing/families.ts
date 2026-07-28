import { marketEntrances } from "@/lib/desk/entrances";
import type { LandingFamily } from "@/components/ponte/bridge/LandingBridges";

/**
 * The three market families as the landing's Family Bridge renders them.
 *
 * This exists so the page and its tests read the same function rather than two
 * copies of the same mapping. A test that rebuilt the list itself would assert
 * that its own copy is correct, which is the one thing worth nothing here: what
 * matters is that **every destination is the one the taxonomy already
 * produces**, and that only holds if there is a single place they come from.
 *
 * Nothing here builds a URL. `marketEntrances()` derives every href from the
 * canonical family/intent pair, so this cannot express a destination the
 * taxonomy does not, and replacing the card grid with the Bridge could not have
 * silently rerouted anything.
 *
 * Ordering is deliberate and is the order a member reads:
 *
 *   1. **Discovery first, where a family has any.** Only Products has external
 *      inventory — 3,517 observed Market Signals — so only Products opens with
 *      "Explore Market Signals". Fabricating a discovery entrance for the other
 *      two would lead a member into an empty result.
 *   2. **Then the creation entrances**, in the taxonomy's own intent order.
 *
 * That is exactly the order the replaced three-column grid used, so the reading
 * order of the nine destinations is unchanged by the redesign.
 */
export function landingFamilies(): LandingFamily[] {
  return marketEntrances().map((family) => ({
    key: family.key,
    label: family.label,
    scope: FAMILY_SCOPE[family.key],
    icon: family.icon,
    actions: [
      ...(family.discovery
        ? [
            {
              key: `${family.key}-discovery`,
              label: family.discovery.label,
              note: family.discovery.note,
              href: family.discovery.href,
            },
          ]
        : []),
      ...family.create.map((entrance) => ({
        key: entrance.intent,
        label: entrance.label,
        note: entrance.note,
        href: entrance.href,
      })),
    ],
  }));
}

/**
 * What each family covers, in the member's own vocabulary.
 *
 * Rendered under the station title. These are descriptions of scope, not
 * claims about activity: none of them says how busy a market is, because
 * nothing in production can currently answer that.
 */
const FAMILY_SCOPE: Record<string, string> = {
  products: "Physical goods, classified against the HS taxonomy",
  services: "Freight, customs, inspection, certification, finance",
  distribution: "Distributors, agents, representation, market entry",
};
