import { unstable_noStore as noStore } from "next/cache";
import { createAdminClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/auth";
import { isMissingColumnError } from "@/lib/listings/classification";
import {
  PUBLIC_SIGNAL_COLUMNS,
  publicWindowPredicate,
  mapSignalRow,
  type MarketSignal,
  type SignalRow,
} from "@/lib/market-signals/logic";
import type { MarketFamily } from "@/lib/taxonomy/market";

/**
 * The Market Signals inventory, searched by canonical category across the
 * complete eligible record set.
 *
 * Three things separate this from the reads it sits beside.
 *
 * **It searches the whole table, not the page.** `readMarketSignals` takes the
 * newest sixty and every filter above it ran in memory over those sixty, so a
 * member filtering for a corridor was filtering a sample and being shown the
 * result as if it were the market. Every filter here is applied in the query.
 *
 * **Eligibility is applied before the page is cut and before the count is
 * taken.** Approval and public expiry are both predicates in the query. Doing
 * the expiry afterwards, in memory, was a real defect with two symptoms: a page
 * of sixty came back as fifty-five, which makes offset paging unstable, and the
 * count included rows nobody may see, which is how the board came to state
 * 3,543 when 3,517 signals were actually public.
 *
 * **It filters on stable keys, not on prose.** A signal tagged
 * `freight / freight.ocean` matches a search for ocean freight whether the
 * description says "sea shipping", "ocean freight" or nothing at all. The
 * `ilike` over the product text is kept as an additional filter, never as the
 * mechanism.
 *
 * ---------------------------------------------------------------------------
 * What this module does NOT do
 * ---------------------------------------------------------------------------
 * It accepts an offset, and it reports a true total, but no surface pages
 * through it yet. Reaching every eligible record is ADR-0011's requirement and
 * it is not met: a member sees the first page and has no way to the rest.
 * Recorded here rather than implied to be finished.
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
  return canonicalColumnFor(query) !== null;
}

/**
 * The most specific classification column this query filters on.
 *
 * Used to ask a precise question when a category search finds nothing: is this
 * a real absence, or has nothing in the inventory been classified on this axis
 * at all? Answering "no match" to the second is Ponte stating a finding it
 * never made.
 */
export function canonicalColumnFor(query: InventoryQuery): string | null {
  if (query.serviceSubcategory) return "service_subcategory_keys";
  if (query.serviceCategory) return "service_category_key";
  if (query.partnerType) return "distribution_partner_type_key";
  if (query.sector) return "product_sector_key";
  if (query.territory) return "territory_codes";
  if (query.family) return "market_family";
  return null;
}

export type SignalInventory =
  /**
   * The read succeeded. `total` counts every eligible record matching the
   * filters, not the page. `shown` is what came back.
   */
  | { state: "ok"; signals: MarketSignal[]; total: number; offset: number }
  /**
   * The read could not be answered as asked, because Market Signals do not
   * carry this classification. Never printed as an empty result.
   *
   * `columns_absent`      the migration has not been applied.
   * `nothing_classified`  the columns exist and every eligible row is null on
   *                       the axis being filtered. This is the state the
   *                       inventory is actually in, and it outlasts the
   *                       migration: applying the SQL creates the columns, it
   *                       does not classify a single historical record.
   */
  | {
      state: "unclassified";
      reason: "columns_absent" | "nothing_classified";
      /** Eligible public signals, none of which carries this classification. */
      eligible: number | null;
    }
  /** The sources could not be read. A technical failure, not a finding. */
  | { state: "unavailable" };

/**
 * Search the Market Signals inventory.
 *
 * `limit` bounds what is RETURNED. It bounds neither what is searched nor what
 * is counted: both run over the whole eligible table.
 */
export async function searchSignalInventory(
  query: InventoryQuery,
  opts: { limit?: number; offset?: number; nowIso?: string } = {},
): Promise<SignalInventory> {
  noStore();
  if (!isSupabaseConfigured()) return { state: "ok", signals: [], total: 0, offset: 0 };

  const limit = opts.limit ?? 60;
  const offset = opts.offset ?? 0;
  const nowIso = opts.nowIso ?? new Date().toISOString();

  try {
    const sb = createAdminClient();
    let q = sb
      .from("desk_radar")
      .select(PUBLIC_SIGNAL_COLUMNS, { count: "exact" })
      .eq("status", "approved_signal")
      // Eligibility, in the query. Not applied afterwards to the page.
      .or(publicWindowPredicate(nowIso));

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

    const signals = (data ?? []).map((r) => mapSignalRow(r as SignalRow));
    const total = count ?? signals.length;

    // A category search that found nothing has two possible meanings, and they
    // are not interchangeable. Asked only when it matters, and it costs one
    // head count.
    const column = canonicalColumnFor(query);
    if (total === 0 && column) {
      const classified = await countClassified(sb, column, nowIso);
      if (classified === 0) {
        return {
          state: "unclassified",
          reason: "nothing_classified",
          eligible: await countSignalInventory(nowIso),
        };
      }
    }

    return { state: "ok", signals, total, offset };
  } catch (error) {
    // A missing column is a specific, expected and temporary condition, and it
    // is not the same as the sources failing. Saying so lets the surface tell a
    // member why their filter returned nothing instead of implying the market
    // is quiet.
    if (isMissingColumnError(error) && usesCanonicalKeys(query)) {
      return {
        state: "unclassified",
        reason: "columns_absent",
        eligible: await countSignalInventory(nowIso).catch(() => null),
      };
    }
    return { state: "unavailable" };
  }
}

/**
 * How many eligible signals carry any value at all on this axis.
 *
 * Zero is the honest answer today and will stay the honest answer after the
 * migration runs, because applying the SQL creates columns and classifies
 * nothing. This is the check that stops a genuine-looking "0 results" from
 * appearing the moment the columns exist.
 */
async function countClassified(
  sb: ReturnType<typeof createAdminClient>,
  column: string,
  nowIso: string,
): Promise<number | null> {
  try {
    const { count, error } = await sb
      .from("desk_radar")
      .select("id", { count: "exact", head: true })
      .eq("status", "approved_signal")
      .or(publicWindowPredicate(nowIso))
      .not(column, "is", null);
    if (error) throw error;
    return count ?? 0;
  } catch {
    // Unknown is not zero. A failed probe must not be read as "nothing is
    // classified", which would hide a real result behind an explanation.
    return null;
  }
}

/**
 * How many signals are eligible in total, filters aside.
 *
 * Approved AND inside the public window, both applied in the query, so this is
 * the number of records a member could in principle reach. `head: true` fetches
 * no rows: this is a count and nothing else.
 */
export async function countSignalInventory(nowIso?: string): Promise<number | null> {
  noStore();
  if (!isSupabaseConfigured()) return null;
  try {
    const sb = createAdminClient();
    const { count, error } = await sb
      .from("desk_radar")
      .select("id", { count: "exact", head: true })
      .eq("status", "approved_signal")
      .or(publicWindowPredicate(nowIso ?? new Date().toISOString()));
    if (error) throw error;
    return count ?? null;
  } catch {
    return null;
  }
}
