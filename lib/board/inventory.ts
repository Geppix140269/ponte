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
import {
  canonicalColumnFor,
  usesCanonicalKeys,
  type InventoryQuery,
} from "@/lib/board/inventory-query";

// The query shape and the rules over it are pure and live next door, so a unit
// test can reach them without this module's database client coming with them.
export {
  canonicalColumnFor,
  usesCanonicalKeys,
  emptyInventoryQuery,
  type InventoryQuery,
} from "@/lib/board/inventory-query";

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

/**
 * How much of the eligible inventory this filter could actually see.
 *
 * The number that decides whether a result means anything. A category filter
 * runs over the records that carry a category; it is blind to the rest, and
 * how blind is not a detail a member can be left to guess.
 */
export type Coverage = {
  /** Eligible records carrying any value on the axis being filtered. */
  classified: number;
  /** Eligible records in this market, classified or not. */
  eligible: number;
};

export type SignalInventory =
  /**
   * The read succeeded AND the filter could see everything it needed to. A
   * result of zero here is conclusive: there really is no match.
   */
  | { state: "ok"; signals: MarketSignal[]; total: number; offset: number }
  /**
   * The read succeeded over PART of the inventory.
   *
   * Some records carry this classification and some do not, so the filter ran
   * over a subset. The records found are real and are returned; what cannot be
   * claimed is that they are all of them. An empty result in this state is not
   * "no match", it is "no match among the ones Ponte can see", and the two are
   * different answers to the member's question.
   *
   * This state is the whole inventory's condition for as long as classification
   * is incomplete, which is from the moment the first record is classified
   * until the moment the last one is. It is not an edge case; it is where the
   * product will live for a while.
   */
  | {
      state: "partial";
      signals: MarketSignal[];
      total: number;
      offset: number;
      coverage: Coverage;
    }
  /**
   * The read could not be answered as asked, because NO Market Signal carries
   * this classification. Never printed as an empty result.
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

    /**
     * How much of the inventory this filter could see.
     *
     * Measured on EVERY category-filtered read, not only when the result is
     * empty. An earlier version asked only on zero, which held for exactly as
     * long as nothing was classified: the moment one record was classified,
     * every other category filter would have started returning small, confident
     * results over an inventory that was still almost entirely unclassified,
     * and nothing would have said so. A result of three out of four thousand
     * unclassified records is not three matches; it is three matches and a
     * blind spot.
     *
     * Two head counts against indexed columns, and only on a filtered read.
     */
    const column = canonicalColumnFor(query);
    if (column) {
      const [classified, eligible] = await Promise.all([
        countClassified(sb, column, nowIso),
        countSignalInventory(nowIso),
      ]);

      if (classified === 0) {
        return { state: "unclassified", reason: "nothing_classified", eligible };
      }

      // Unknown is not full coverage. A failed probe leaves the result as it
      // is rather than asserting completeness nobody measured.
      if (classified !== null && eligible !== null && classified < eligible) {
        return { state: "partial", signals, total, offset, coverage: { classified, eligible } };
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
