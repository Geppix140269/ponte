import { unstable_noStore as noStore } from "next/cache";
import { createAdminClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/auth";
import { isoCode, parseVolume } from "@/lib/listing-terms";

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
  "id, user_id, ref, type, product, hs_code, origin, destination, volume, incoterm, valid_until, created_at";

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

    // Current only: an approved listing past its validity date is not a live
    // opportunity, so it is dropped here rather than shown as one. A listing
    // with no date is standing and stays. Same clock the expiry cron reads.
    const now = Date.now();
    const liveRows = (rows ?? []).filter(
      (l) => !l.valid_until || Date.parse(l.valid_until) > now,
    );

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
        // Member listings keep payment terms inside the composed details for
        // now; the v4 column exists but the composer does not write it yet.
        payment: null,
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
