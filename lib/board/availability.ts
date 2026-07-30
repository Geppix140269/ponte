import { MARKET_FAMILIES, type MarketFamily } from "../taxonomy/market";

/**
 * Which market families Ponte can actually answer for today.
 *
 * ---------------------------------------------------------------------------
 * Why a taxonomy is not a filter
 * ---------------------------------------------------------------------------
 * The board built its family selector from `MARKET_FAMILIES`, which is the
 * canonical taxonomy and lists all three families because all three are
 * accepted product authority. The public inventory carries product signals and
 * nothing else. So the page offered Trade services and Distribution, and a
 * member who chose either was handed a large box explaining canonical category
 * columns, historical rows and database coverage.
 *
 * That is Ponte showing a customer its own implementation. It is also a broken
 * promise: a control that cannot return a result should not be offered, and the
 * fact that a key exists in code is not evidence that a market exists.
 *
 * So availability is measured against the live eligible inventory and the
 * interface is built from the measurement. When the desk classifies genuine
 * service and distribution signals, the controls appear on their own, with no
 * code change. Nothing here fabricates or infers a family: only a stored
 * canonical `market_family` counts.
 *
 * All three counts are zero today, and that is measured rather than assumed:
 * read-only against production on 30 July 2026, 3,458 eligible signals carry
 * **no** canonical family between them - 0 Products, 0 Trade services, 0
 * Distribution (`scripts/verify-signal-search.ts`, evidence in
 * `docs/codex/audits/market-signals-search/`). So the selector is absent because
 * nothing is classified, not because nothing is there: the records are live and
 * a member reaches every one of them by searching. That is the truthful answer
 * rather than a bug to work around, and PL-020 carries the two pieces of work it
 * implies - classifying the product inventory, and sourcing the other two.
 *
 * Pure, so the rule is unit-tested without a database. The counting lives in
 * `lib/board/inventory.ts`; the DECISIONS live here.
 */

/**
 * Live, publicly eligible, correctly classified signals per family.
 *
 * Every number is a count over the complete `desk_radar` inventory under the
 * board's own eligibility rules, never over the page. `null` in place of the
 * whole object means the measurement failed, which is not the same as zero and
 * must not be resolved into one.
 */
export type FamilyAvailability = {
  products: number;
  services: number;
  distribution: number;
};

/** The canonical family keys, in their accepted order. */
export const FAMILY_KEYS: readonly MarketFamily[] = MARKET_FAMILIES.map((f) => f.key);

/** Zero everywhere. The truthful starting point, not a fallback for a failure. */
export function noFamilyInventory(): FamilyAvailability {
  return { products: 0, services: 0, distribution: 0 };
}

/** The count for one family. */
export function familyCount(
  availability: FamilyAvailability | null,
  family: MarketFamily,
): number | null {
  if (!availability) return null;
  return availability[family];
}

/**
 * The families a member may be offered.
 *
 * Empty when the measurement failed, which is the fail-closed direction: an
 * unmeasurable filter is not offered, while the unfiltered board is untouched.
 * Offering a filter Ponte cannot vouch for is the failure this whole module
 * exists to prevent.
 */
export function availableFamilies(availability: FamilyAvailability | null): MarketFamily[] {
  if (!availability) return [];
  return FAMILY_KEYS.filter((key) => availability[key] > 0);
}

/**
 * Should the family selector be rendered at all?
 *
 * Two or more, because **a selector with one usable option is not a filter.**
 * With only products in the inventory, a panel offering "All signals" and
 * "Products" asks a member to choose between a set and itself. The page moves
 * from the search straight into the results instead.
 */
export function showFamilySelector(availability: FamilyAvailability | null): boolean {
  return availableFamilies(availability).length >= 2;
}

/**
 * Can this family answer a member today?
 *
 * `false` only when the count is known to be zero. An unknown count returns
 * `true` here on purpose: the board must not tell a member a market is empty on
 * the strength of a failed read. It will fall through to the ordinary result
 * states, which are already careful about what they claim.
 */
export function familyHasInventory(
  availability: FamilyAvailability | null,
  family: MarketFamily,
): boolean {
  const count = familyCount(availability, family);
  return count === null ? true : count > 0;
}

/**
 * The classification axis a family's own category controls read.
 *
 * Returned so the board can ask one question before rendering a list of a
 * hundred subcategories: does any live record carry a value here? A taxonomy
 * with no classified records behind it is a list of controls that all return
 * nothing.
 */
export function axisForFamily(family: MarketFamily): string {
  if (family === "services") return "service_category_key";
  if (family === "distribution") return "distribution_partner_type_key";
  return "product_sector_key";
}
