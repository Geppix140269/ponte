import { unstable_noStore as noStore } from "next/cache";
import { createAdminClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/auth";
import { isoCode, parseVolume } from "@/lib/listing-terms";
import { isPubliclyCurrent } from "@/lib/listings/validity";
import { eligibleOwnerIds } from "@/lib/listings/public-filter";
import { isMissingColumnError } from "@/lib/listings/classification";
import { usesCanonicalKeys, canonicalColumnFor, type InventoryQuery } from "@/lib/board/inventory";

/**
 * The Qualified Opportunities board: approved, current member listings, and
 * nothing else.
 *
 * ---------------------------------------------------------------------------
 * One source, on purpose (Definitive 1 August brief, Block A)
 * ---------------------------------------------------------------------------
 * This used to merge `desk_radar` rows into the same list under a `source`
 * discriminator. It no longer does. Market Signals are external indications
 * Ponte has not confirmed, they are not Qualified Opportunities, and the two
 * must never share a feed, a status or a CTA. The Market Signal query lives in
 * lib/board/market-signals.ts and returns its own record type.
 *
 * So this reads `listings`, status `approved`, and drops any whose `valid_until`
 * has passed: an expired opportunity is not current, and a board of current
 * opportunities does not show it.
 *
 * Nothing here invents a deal. If the board is empty the caller gets an empty
 * array and every surface that renders it hides itself. There is no demo mode
 * and there must never be one: a fabricated deal on a trading board is the
 * fastest way to lose a trader, and it is the one thing every brief for this
 * product says twice.
 */

export type DealSource = "member" | "radar";

export type LiveDeal = {
  id: string;
  /** Board reference for a member listing. Radar items have their own id. */
  ref: string | null;
  source: DealSource;
  /** "offer" | "requirement" | "service" for members; radar uses side. */
  type: string;
  product: string;
  hsCode: string | null;
  /** HS chapter, two digits, for the category chips. */
  chapter: string | null;
  chapterTitle: string | null;
  quantity: string | null;
  unit: string | null;
  incoterm: string | null;
  /** Payment terms as posted, e.g. "LC at sight". */
  payment: string | null;
  /** Free text as posted, kept for the tooltip and the fallback label. */
  originText: string | null;
  destinationText: string | null;
  /** ISO-2, only where the text actually names a country. */
  originCode: string | null;
  destinationCode: string | null;
  postedAt: string;
  /**
   * Verification level of the member who posted. `null` for radar items and
   * for a level that could not be read: unknown is not zero, and a radar item
   * must never render a tier badge.
   */
  verificationLevel: number | null;
  /** Where the deal opens. Radar items have no public detail page yet. */
  href: string | null;
};

/**
 * Below this the showcase does not render at all. Same floor the board uses,
 * for the same reason: three rows is not a market, and a near-empty
 * centrepiece says "nothing happens here" louder than no centrepiece.
 */
export const SHOWCASE_MIN = 3;

/**
 * A count is a claim about size. It is only printed once it is genuinely a
 * number worth printing, and only when it is real.
 */
export const COUNT_MIN = 8;

const LISTING_COLUMNS =
  "id, user_id, ref, type, product, hs_code, origin, destination, volume, incoterm, payment_terms, validity_type, valid_until, reconfirmed_at, created_at";

/** Two-digit HS chapter from any HS code shape ("1701.99" -> "17"). */
function chapterOf(hsCode: string | null): string | null {
  if (!hsCode) return null;
  const digits = hsCode.replace(/\D/g, "");
  return digits.length >= 2 ? digits.slice(0, 2) : null;
}

/**
 * The live board, newest first.
 *
 * Reads with the admin client because the homepage serves anonymous visitors
 * and RLS would hand them nothing. Only teaser-safe columns are selected:
 * `details`, the member's identity and every internal radar field stay out of
 * the query entirely, so they cannot reach the client even by accident.
 */
export async function getLiveDeals(limit = 40): Promise<LiveDeal[]> {
  // Never cache the board read. supabase-js reads through fetch, and Next's
  // Data Cache will otherwise pin the first result under its URL and keep
  // serving it after an approval or an expiry, even on a force-dynamic page.
  // See the note in lib/board/market-signals.ts.
  noStore();
  if (!isSupabaseConfigured()) return [];

  try {
    const sb = createAdminClient();

    const { data: rows, error } = await sb
      .from("listings")
      .select(LISTING_COLUMNS)
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw error;

    // Current only, on two axes. First the listing itself: an approved listing
    // whose finite validity has passed OR whose 90-day reconfirmation has lapsed
    // is not live. Then the owner: a member whose business verification is no
    // longer passing (suspended, failed, dropped below the member level) loses
    // public visibility for all their listings. Same rules the board and detail
    // page share, so no public surface disagrees.
    const now = Date.now();
    const currentRows = (rows ?? []).filter((l) => isPubliclyCurrent(l, now));
    const eligible = await eligibleOwnerIds(sb, currentRows.map((l) => l.user_id));
    const liveRows = currentRows.filter((l) => eligible.has(l.user_id));

    const deals: LiveDeal[] = liveRows.map((l) => {
      const vol = parseVolume(l.volume);
      return {
        id: l.id,
        ref: l.ref,
        source: "member" as const,
        type: l.type,
        product: l.product,
        hsCode: l.hs_code,
        chapter: chapterOf(l.hs_code),
        chapterTitle: null,
        quantity: vol.quantity,
        unit: vol.unit,
        incoterm: l.incoterm,
        // Payment terms are now a structured column the composer writes.
        payment: l.payment_terms ?? null,
        originText: l.origin,
        destinationText: l.destination,
        originCode: isoCode(l.origin),
        destinationCode: isoCode(l.destination),
        postedAt: l.created_at,
        verificationLevel: null,
        href: `/marketplace/l/${l.ref}`,
      };
    });

    // Verification level is a fact about the counterparty and the only thing
    // about them the board shows. A level that cannot be read stays null, so
    // the card shows no badge rather than claiming "not verified".
    const memberIds = Array.from(
      new Set(liveRows.map((l) => l.user_id).filter(Boolean)),
    );
    if (memberIds.length > 0) {
      const { data: levels } = await sb
        .from("profiles")
        .select("id, verification_level")
        .in("id", memberIds);
      const byUser = new Map<string, number>();
      for (const p of levels ?? []) {
        const n = Number(p.verification_level);
        if (Number.isFinite(n)) byUser.set(p.id, n);
      }
      for (let i = 0; i < deals.length; i++) {
        const level = byUser.get(liveRows[i].user_id);
        deals[i].verificationLevel = level ?? null;
      }
    }

    await decorateChapters(sb, deals);

    return deals
      .sort((a, b) => Date.parse(b.postedAt) - Date.parse(a.postedAt))
      .slice(0, limit);
  } catch {
    // A homepage must render when the database does not. The showcase hides
    // itself on an empty list, which is the correct thing to show when we
    // cannot prove there is anything live.
    return [];
  }
}

/**
 * The Qualified lane for a category search, filtered at the database.
 *
 * The lane used to be `getLiveDeals(60)` followed by an in-memory matcher, so
 * a member searching for ocean freight was searching the sixty most recent
 * approved listings and being shown the answer as if it were the market. The
 * requirement is explicit that a Find query must reach the complete inventory,
 * so every canonical filter is applied in the query here.
 *
 * ---------------------------------------------------------------------------
 * Why the count is what survived, and not a database count
 * ---------------------------------------------------------------------------
 * Two visibility rules cannot be expressed in this query: a listing's validity
 * and reconfirmation clock, and whether its owner's business verification is
 * still passing. Both are applied in memory afterwards, exactly as the board
 * applies them, because a listing that fails either is not public.
 *
 * An exact database count would therefore be a count of rows the member is not
 * allowed to see, printed as if it were the size of the market. So the read is
 * bounded generously rather than by a page, the visibility rules run over the
 * whole matching set, and the number reported is the number of records that
 * actually survived. It is a true count of a bounded read rather than a false
 * count of everything.
 */
export type DealSearch =
  | { state: "ok"; deals: LiveDeal[]; total: number; bounded: boolean }
  /**
   * The filter ran over the records that carry this classification, and some
   * do not. The deals found are real; that they are all of them is not a claim
   * this state makes. See the same reasoning in `lib/board/inventory.ts`.
   */
  | {
      state: "partial";
      deals: LiveDeal[];
      total: number;
      bounded: boolean;
      coverage: { classified: number; eligible: number };
    }
  /**
   * Two reasons, and they outlast each other.
   *
   * `columns_absent` ends when the migration is applied by hand. Applying it
   * does not end `nothing_classified`, because the SQL creates columns and
   * classifies no historical record. Collapsing the two would mean that on the
   * day the migration ran, every category filter would start reporting a
   * confident "no match" over an inventory that had simply never been
   * classified.
   */
  | { state: "unclassified"; reason: "columns_absent" | "nothing_classified" }
  | { state: "unavailable" };

/** The ceiling on a filtered read. Far above any current filtered result set. */
const SEARCH_CEILING = 500;

export async function searchLiveDeals(
  query: InventoryQuery,
  opts: { limit?: number } = {},
): Promise<DealSearch> {
  noStore();
  if (!isSupabaseConfigured()) return { state: "ok", deals: [], total: 0, bounded: false };

  const limit = opts.limit ?? 40;

  try {
    const sb = createAdminClient();
    let q = sb.from("listings").select(LISTING_COLUMNS).eq("status", "approved");

    if (query.family) q = q.eq("market_family", query.family);
    if (query.serviceCategory) q = q.eq("service_category_key", query.serviceCategory);
    if (query.serviceSubcategory) {
      q = q.contains("service_subcategory_keys", [query.serviceSubcategory]);
    }
    if (query.partnerType) q = q.eq("distribution_partner_type_key", query.partnerType);
    if (query.sector) q = q.eq("product_sector_key", query.sector);
    if (query.territory) q = q.contains("territory_codes", [query.territory]);
    if (query.side) q = q.eq("type", query.side);
    if (query.product) q = q.ilike("product", `%${query.product}%`);

    const { data: rows, error } = await q
      .order("created_at", { ascending: false })
      .limit(SEARCH_CEILING);
    if (error) throw error;

    const now = Date.now();
    const currentRows = (rows ?? []).filter((l) => isPubliclyCurrent(l, now));
    const eligible = await eligibleOwnerIds(sb, currentRows.map((l) => l.user_id));
    const liveRows = currentRows.filter((l) => eligible.has(l.user_id));

    const deals: LiveDeal[] = liveRows.map((l) => {
      const vol = parseVolume(l.volume);
      return {
        id: l.id,
        ref: l.ref,
        source: "member" as const,
        type: l.type,
        product: l.product,
        hsCode: l.hs_code,
        chapter: chapterOf(l.hs_code),
        chapterTitle: null,
        quantity: vol.quantity,
        unit: vol.unit,
        incoterm: l.incoterm,
        payment: l.payment_terms ?? null,
        originText: l.origin,
        destinationText: l.destination,
        originCode: isoCode(l.origin),
        destinationCode: isoCode(l.destination),
        postedAt: l.created_at,
        verificationLevel: null,
        href: `/marketplace/l/${l.ref}`,
      };
    });

    await decorateChapters(sb, deals);

    const shown = deals.slice(0, limit);
    const bounded = (rows ?? []).length >= SEARCH_CEILING;

    // How much of the approved set carries this classification, measured on
    // every category-filtered read rather than only on an empty one. A small,
    // confident result over a mostly unclassified board is the failure this
    // prevents: the records found are real, but they are not all of them and
    // the page must not imply they are.
    const column = canonicalColumnFor(query);
    if (column) {
      const [classifiedRead, eligibleRead] = await Promise.all([
        sb
          .from("listings")
          .select("id", { count: "exact", head: true })
          .eq("status", "approved")
          .not(column, "is", null),
        sb.from("listings").select("id", { count: "exact", head: true }).eq("status", "approved"),
      ]);
      const classified = classifiedRead.count;
      const eligible = eligibleRead.count;

      if (classified === 0) return { state: "unclassified", reason: "nothing_classified" };
      // Unknown is not full coverage: a failed count leaves the result alone
      // rather than asserting completeness nobody measured.
      if (typeof classified === "number" && typeof eligible === "number" && classified < eligible) {
        return {
          state: "partial",
          deals: shown,
          total: deals.length,
          bounded,
          coverage: { classified, eligible },
        };
      }
    }

    return { state: "ok", deals: shown, total: deals.length, bounded };
  } catch (error) {
    if (isMissingColumnError(error) && usesCanonicalKeys(query)) {
      return { state: "unclassified", reason: "columns_absent" };
    }
    return { state: "unavailable" };
  }
}

/** Chapter titles for the category chips, from the HS catalog. */
async function decorateChapters(
  sb: ReturnType<typeof createAdminClient>,
  deals: LiveDeal[],
): Promise<void> {
  const chapters = Array.from(
    new Set(deals.map((d) => d.chapter).filter((c): c is string => !!c)),
  );
  if (chapters.length === 0) return;

  try {
    const { data } = await sb
      .from("hs_codes")
      .select("chapter, chapter_title")
      .in("chapter", chapters);
    const titleOf = new Map<string, string>();
    for (const row of data ?? []) {
      if (row.chapter && row.chapter_title && !titleOf.has(row.chapter)) {
        titleOf.set(row.chapter, row.chapter_title);
      }
    }
    for (const d of deals) {
      if (d.chapter) d.chapterTitle = titleOf.get(d.chapter) ?? null;
    }
  } catch {
    // Chips fall back to the chapter number, which is still true.
  }
}

/** Distinct countries touched by a set of deals, for the live count line. */
export function countriesIn(deals: LiveDeal[]): string[] {
  const codes = new Set<string>();
  for (const d of deals) {
    if (d.originCode) codes.add(d.originCode);
    if (d.destinationCode) codes.add(d.destinationCode);
  }
  return Array.from(codes);
}

/** The corridors worth drawing: both ends resolved, and not a loop. */
export function routesIn(
  deals: LiveDeal[],
): { from: string; to: string; id: string }[] {
  const seen = new Set<string>();
  const routes: { from: string; to: string; id: string }[] = [];
  for (const d of deals) {
    if (!d.originCode || !d.destinationCode) continue;
    if (d.originCode === d.destinationCode) continue;
    const key = `${d.originCode}-${d.destinationCode}`;
    if (seen.has(key)) continue;
    seen.add(key);
    routes.push({ from: d.originCode, to: d.destinationCode, id: key });
  }
  return routes;
}
