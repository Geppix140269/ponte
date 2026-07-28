import { unstable_noStore as noStore } from "next/cache";
import { createAdminClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/auth";
import { isMissingColumnError } from "@/lib/listings/classification";
import {
  PUBLIC_SIGNAL_COLUMNS,
  isPubliclyVisible,
  mapSignalRow,
  type MarketSignal,
  type SignalRow,
} from "@/lib/market-signals/logic";
import type { MarketFamily } from "@/lib/taxonomy/market";

/**
 * The Market Signals inventory, searched by canonical category across the
 * complete record set.
 *
 * Two things separate this from the reads it sits beside.
 *
 * **It searches the whole table, not the page.** `readMarketSignals` takes the
 * sixty newest and every filter above it ran in memory over those sixty, so a
 * member filtering for a corridor was filtering a sample and being shown the
 * result as if it were the market. Every filter here is applied in the query,
 * and the count is an exact count over the complete inventory rather than the
 * length of what came back.
 *
 * **It filters on stable keys, not on prose.** A signal tagged
 * `freight / freight.ocean` matches a search for ocean freight whether the
 * description says "sea shipping", "ocean freight" or nothing at all. That is
 * the whole point of storing keys, and it is why an `ilike` over the product
 * text is kept as a separate, additional filter rather than as the mechanism.
 *
 * ---------------------------------------------------------------------------
 * The state that tells the truth
 * ---------------------------------------------------------------------------
 * The classification columns are added by `20260728a_market_classification.sql`,
 * which is written and NOT applied: a merge applies no migration in this
 * repository. Until an owner runs it by hand, `desk_radar` has no
 * `service_category_key`, and a category filter cannot be applied at all.
 *
 * Reporting that as an empty result would be Ponte stating a finding it never
 * made: "no signal matches ocean freight" and "Ponte cannot yet tell which
 * signals are about ocean freight" are different sentences with different next
 * actions. So the third state exists, and every surface that filters must
 * render it rather than an empty board.
 *
 * Even once the migration runs, no existing signal carries a category, because
 * nothing has classified them and writing a guess into those columns would
 * invent the finding a second time. `unclassified` is therefore the honest
 * answer for as long as it is true, and it stops being true only when signals
 * are actually classified.
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
  side: "offer" | "requirement" | null;
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
    side: null,
  };
}

/** Does this query ask for anything the classification columns must answer? */
export function usesCanonicalKeys(query: InventoryQuery): boolean {
  return Boolean(
    query.family ||
      query.serviceCategory ||
      query.serviceSubcategory ||
      query.partnerType ||
      query.sector ||
      query.territory,
  );
}

export type SignalInventory =
  /** The read succeeded. `total` counts the complete inventory, not the page. */
  | { state: "ok"; signals: MarketSignal[]; total: number }
  /**
   * The read could not be filtered as asked, because Market Signals do not
   * carry this classification yet. Not an empty result, and never printed as
   * one.
   */
  | { state: "unclassified" }
  /** The sources could not be read. A technical failure, not a finding. */
  | { state: "unavailable" };

/**
 * Search the Market Signals inventory.
 *
 * `limit` bounds what is RENDERED. It does not bound what is searched: the
 * filters and the count both run over the whole table.
 */
export async function searchSignalInventory(
  query: InventoryQuery,
  opts: { limit?: number; offset?: number } = {},
): Promise<SignalInventory> {
  noStore();
  if (!isSupabaseConfigured()) return { state: "ok", signals: [], total: 0 };

  const limit = opts.limit ?? 60;
  const offset = opts.offset ?? 0;

  try {
    const sb = createAdminClient();
    let q = sb
      .from("desk_radar")
      .select(PUBLIC_SIGNAL_COLUMNS, { count: "exact" })
      .eq("status", "approved_signal");

    if (query.family) q = q.eq("market_family", query.family);
    if (query.serviceCategory) q = q.eq("service_category_key", query.serviceCategory);
    if (query.serviceSubcategory) {
      q = q.contains("service_subcategory_keys", [query.serviceSubcategory]);
    }
    if (query.partnerType) q = q.eq("distribution_partner_type_key", query.partnerType);
    if (query.sector) q = q.eq("product_sector_key", query.sector);
    if (query.territory) q = q.contains("territory_codes", [query.territory]);
    if (query.side) q = q.eq("side", query.side);
    if (query.product) q = q.ilike("product", `%${query.product}%`);

    const { data, error, count } = await q
      .order("spotted_at", { ascending: false })
      .range(offset, offset + limit - 1);
    if (error) throw error;

    const now = Date.now();
    const signals = (data ?? [])
      .filter((r) => isPubliclyVisible(r as SignalRow, now))
      .map((r) => mapSignalRow(r as SignalRow));

    return { state: "ok", signals, total: count ?? signals.length };
  } catch (error) {
    // A missing column is a specific, expected and temporary condition, and it
    // is not the same as the sources failing. Saying so lets the surface tell a
    // member why their filter returned nothing instead of implying the market
    // is quiet.
    if (isMissingColumnError(error) && usesCanonicalKeys(query)) {
      return { state: "unclassified" };
    }
    return { state: "unavailable" };
  }
}

/**
 * How many approved signals exist in total, filters aside.
 *
 * Printed beside a filtered count so a member can see the size of what they
 * are filtering. `head: true` fetches no rows: this is a count and nothing
 * else, and it should not pull sixty records to produce a number.
 */
export async function countSignalInventory(): Promise<number | null> {
  noStore();
  if (!isSupabaseConfigured()) return null;
  try {
    const sb = createAdminClient();
    const { count, error } = await sb
      .from("desk_radar")
      .select("id", { count: "exact", head: true })
      .eq("status", "approved_signal");
    if (error) throw error;
    return count ?? null;
  } catch {
    return null;
  }
}
