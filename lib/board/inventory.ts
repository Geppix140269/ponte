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
  /**
   * Records matching the rest of this search that carry a value on the axis
   * being filtered.
   */
  classified: number;
  /**
   * Records matching the rest of this search, classified or not.
   *
   * Deliberately NOT "records in this market". Both numbers are measured over
   * the member's own slice with only the tested axis dropped, so a search for
   * ocean freight inside services compares against the services signals, not
   * against the whole board. The first version compared against the board and
   * printed a denominator that was not the member's market at all.
   */
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
  /**
   * The read succeeded; the coverage measurement did not.
   *
   * The records returned are real. What is unknown is how much of the slice the
   * filter could see, so an empty result here is not "no match" either: it is a
   * result Ponte cannot vouch for the completeness of.
   *
   * This exists because the alternative is worse in one specific direction. A
   * failed count that fell through to `ok` would silently upgrade a partial
   * answer into a conclusive one, and "no match" is the answer a member is most
   * likely to act on.
   */
  | { state: "coverage_unknown"; signals: MarketSignal[]; total: number; offset: number }
  /** The sources could not be read. A technical failure, not a finding. */
  | { state: "unavailable" };

/**
 * Apply the query's filters, optionally leaving one axis out.
 *
 * `omit` is what makes a coverage count mean anything. Coverage has to be
 * measured over the SAME slice the search ran on, minus only the axis being
 * tested: "of the signals matching everything else you asked for, how many
 * carry a category at all?". Counting the whole board instead answers a
 * question nobody asked, and prints a denominator that is not the member's
 * market.
 *
 * One function, so the search and the two counts cannot drift into applying
 * slightly different filters, which is exactly how the first version came to
 * compare a handful of classified rows against three and a half thousand
 * unrelated ones.
 */
type Filterable = {
  eq(column: string, value: unknown): Filterable;
  contains(column: string, value: unknown): Filterable;
  ilike(column: string, value: string): Filterable;
};

function applySignalFilters<T>(builder: T, query: InventoryQuery, omit: string | null): T {
  let q = builder as unknown as Filterable;
  if (query.family && omit !== "market_family") q = q.eq("market_family", query.family);
  if (query.serviceCategory && omit !== "service_category_key") {
    q = q.eq("service_category_key", query.serviceCategory);
  }
  if (query.serviceSubcategory && omit !== "service_subcategory_keys") {
    q = q.contains("service_subcategory_keys", [query.serviceSubcategory]);
  }
  if (query.partnerType && omit !== "distribution_partner_type_key") {
    q = q.eq("distribution_partner_type_key", query.partnerType);
  }
  if (query.sector && omit !== "product_sector_key") {
    q = q.eq("product_sector_key", query.sector);
  }
  if (query.territory && omit !== "territory_codes") {
    q = q.contains("territory_codes", [query.territory]);
  }
  // Direction and free-text product are not classification axes, so they are
  // never omitted: they are part of what the member asked for either way.
  if (query.side) q = q.eq("side", query.side);
  if (query.product) q = q.ilike("product", `%${query.product}%`);
  return q as unknown as T;
}

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
    const q = applySignalFilters(
      sb
        .from("desk_radar")
        .select(PUBLIC_SIGNAL_COLUMNS, { count: "exact" })
        .eq("status", "approved_signal")
        // Eligibility, in the query. Not applied afterwards to the page.
        .or(publicWindowPredicate(nowIso)),
      query,
      null,
    );

    const { data, error, count } = await q
      .order("spotted_at", { ascending: false })
      .range(offset, offset + limit - 1);
    if (error) throw error;

    const signals = (data ?? []).map((r) => mapSignalRow(r as SignalRow));
    const total = count ?? signals.length;

    /**
     * How much of the member's own slice this filter could see.
     *
     * Measured on EVERY category-filtered read, not only when the result is
     * empty. Asking only on zero held for exactly as long as nothing was
     * classified: from the first classified record onwards, every filter would
     * have returned small, confident results over an inventory still almost
     * entirely unclassified, and nothing would have said so.
     */
    const column = canonicalColumnFor(query);
    if (column) {
      const coverage = await signalCoverage(sb, query, column, nowIso);

      // An unmeasurable coverage is not a complete one. Falling through to `ok`
      // here would let a failed count upgrade a partial answer into a
      // conclusive "no match", which is the one direction that must never
      // happen by accident.
      if (coverage === null) return { state: "coverage_unknown", signals, total, offset };
      if (coverage.classified === 0) {
        return { state: "unclassified", reason: "nothing_classified", eligible: coverage.eligible };
      }
      if (coverage.classified < coverage.eligible) {
        return { state: "partial", signals, total, offset, coverage };
      }
    }

    return { state: "ok", signals, total, offset };
  } catch (error) {
    // A missing column is a specific, expected and temporary condition, and it
    // is not the same as the sources failing. Saying so lets the surface tell a
    // member why their filter returned nothing instead of implying the market
    // is quiet.
    if (isMissingColumnError(error) && usesCanonicalKeys(query)) {
      return { state: "unclassified", reason: "columns_absent", eligible: null };
    }
    return { state: "unavailable" };
  }
}

/**
 * Coverage, over the same slice the search ran on.
 *
 * Both counts apply every one of the member's other filters; only the axis
 * being tested is dropped. So the pair answers "of the signals matching the
 * rest of this search, how many carry a value here?" rather than comparing
 * against the whole board.
 *
 * Returns null when either count fails. Unknown is not zero and it is not
 * complete: the caller must not resolve it in either direction.
 */
async function signalCoverage(
  sb: ReturnType<typeof createAdminClient>,
  query: InventoryQuery,
  column: string,
  nowIso: string,
): Promise<{ classified: number; eligible: number } | null> {
  const slice = () =>
    applySignalFilters(
      sb
        .from("desk_radar")
        .select("id", { count: "exact", head: true })
        .eq("status", "approved_signal")
        .or(publicWindowPredicate(nowIso)),
      query,
      column,
    );

  const [classifiedRead, eligibleRead] = await Promise.all([
    slice().not(column, "is", null),
    slice(),
  ]);

  // A missing column must reach the caller's catch, where it becomes
  // `columns_absent`, rather than being swallowed into an unknown coverage.
  if (classifiedRead.error && isMissingColumnError(classifiedRead.error)) throw classifiedRead.error;
  if (eligibleRead.error && isMissingColumnError(eligibleRead.error)) throw eligibleRead.error;
  if (classifiedRead.error || eligibleRead.error) return null;
  if (typeof classifiedRead.count !== "number" || typeof eligibleRead.count !== "number") {
    return null;
  }
  return { classified: classifiedRead.count, eligible: eligibleRead.count };
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
