import type { MarketFamily } from "@/lib/taxonomy/market";

/**
 * The shape of an inventory search, and the pure rules over it.
 *
 * Separate from `inventory.ts` because that module opens a Supabase client and
 * imports `next/cache`. These three functions touch nothing but their argument,
 * and they are exactly the ones a unit test wants: which classification axis a
 * query is really asking about is a decision worth pinning, and pinning it
 * should not require a database.
 */

export type InventoryQuery = {
  family: MarketFamily | null;
  serviceCategory: string | null;
  serviceSubcategory: string | null;
  partnerType: string | null;
  sector: string | null;
  /** ISO-2. */
  territory: string | null;
  /** Free-text product match, still supported alongside the keys. */
  product: string | null;
  /**
   * The source category label, matched exactly (e.g. "Rice & Grains").
   *
   * A stored value on `desk_radar.category`, and the axis the category browse
   * navigates on. It is deliberately NOT `product_sector_key`: the sector is
   * Ponte's fifteen-way HS classification, while this is the market vocabulary
   * the inventory actually carries, and the two answer different questions. A
   * member browsing "Coffee & Tea" is asking for that market, not for HS 09.
   */
  category: string | null;
  side: "offer" | "requirement" | null;
  /**
   * The member's own words, matched across every public field.
   *
   * Separate from `product`, which is a structured filter on one column that
   * existing links and existing shared URLs already carry. This one is the
   * search: it widens through the governed alias vocabulary and it decides the
   * ordering when it is set.
   */
  text: string | null;
};

export function emptyInventoryQuery(): InventoryQuery {
  return {
    family: null,
    serviceCategory: null,
    serviceSubcategory: null,
    partnerType: null,
    sector: null,
    territory: null,
    product: null,
    category: null,
    side: null,
    text: null,
  };
}

/**
 * The most specific classification column this query filters on.
 *
 * Used to ask a precise question when a category search finds nothing: is this
 * a real absence, or has nothing in the inventory been classified on this axis
 * at all? Answering "no match" to the second is Ponte stating a finding it
 * never made.
 *
 * Most specific first. A search for ocean freight inside freight is not
 * answered by asking whether anything at all carries a category: it has to ask
 * whether anything carries a subcategory, or a record classified only to
 * `freight` would make the narrower search look answerable when it is not.
 */
export function canonicalColumnFor(query: InventoryQuery): string | null {
  if (query.serviceSubcategory) return "service_subcategory_keys";
  if (query.serviceCategory) return "service_category_key";
  if (query.partnerType) return "distribution_partner_type_key";
  if (query.sector) return "product_sector_key";
  if (query.territory) return "territory_codes";
  if (query.family) return "market_family";
  // `category` is deliberately absent. The coverage machinery exists for the
  // canonical classification axes, which a record may simply not carry; the
  // category browse is built FROM the stored values, so every option it offers
  // is one the inventory demonstrably has. Treating it as a classification axis
  // would ask "is anything classified here?" about a list derived from the
  // answer.
  return null;
}

/** Does this query ask for anything the classification columns must answer? */
export function usesCanonicalKeys(query: InventoryQuery): boolean {
  return canonicalColumnFor(query) !== null;
}
