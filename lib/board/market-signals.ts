import { createAdminClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/auth";
import {
  PUBLIC_SIGNAL_COLUMNS,
  isPubliclyVisible,
  mapSignalRow,
  type MarketSignal,
  type SignalRow,
} from "@/lib/market-signals/logic";

/**
 * Market Signals: recent external indications of demand or availability that
 * Ponte has NOT independently confirmed. A separate record type from a member
 * listing, on purpose and all the way through (Definitive 1 August brief,
 * Block A). The pure logic (types, the public/internal column split, the
 * visibility and mapping rules) lives in lib/market-signals/logic.ts so it can
 * be unit-tested without a database; this module is the database read.
 *
 * ---------------------------------------------------------------------------
 * Two hard rules this module enforces
 * ---------------------------------------------------------------------------
 *   1. Public means approved. A signal is only ever read here when its status
 *      is 'approved_signal' and it has not passed its public expiry. An import
 *      lands 'private' and stays invisible until an admin approves it, so
 *      "only individually approved signals appear publicly" is enforced by the
 *      query, not by a hope about the UI.
 *   2. Public means anonymised. The select names public columns only.
 *      source_platform, source_url, raw_description, counterparty_name,
 *      counterparty_company, counterparty_contact and notes are never asked
 *      for, so they cannot travel to a client even by accident.
 *
 * A Market Signal never carries a verification level and never links to a
 * member listing: nobody behind it is a Ponte member, and a signal that looks
 * like a Qualified Opportunity is exactly the confusion Block A removes.
 */

export type { MarketSignal, MarketSignalStatus } from "@/lib/market-signals/logic";
export { PUBLIC_SIGNAL_COLUMNS, INTERNAL_SIGNAL_COLUMNS } from "@/lib/market-signals/logic";

/**
 * The public Market Signals board, newest spotted first.
 *
 * Reads with the admin client because the board serves anonymous visitors and
 * RLS on desk_radar grants nobody a direct select. Only the public columns are
 * named, and only approved, unexpired rows survive the filter.
 */
export async function getMarketSignals(limit = 60): Promise<MarketSignal[]> {
  if (!isSupabaseConfigured()) return [];

  try {
    const sb = createAdminClient();
    const { data, error } = await sb
      .from("desk_radar")
      .select(PUBLIC_SIGNAL_COLUMNS)
      .eq("status", "approved_signal")
      .order("spotted_at", { ascending: false })
      .limit(limit);
    if (error) throw error;

    const now = Date.now();
    const signals = (data ?? [])
      .filter((r) => isPubliclyVisible(r as SignalRow, now))
      .map((r) => mapSignalRow(r as SignalRow));

    await decorateChapters(sb, signals);
    return signals;
  } catch {
    // The table or the new columns may not exist yet. An empty board hides
    // itself, which is the correct thing to show when we cannot prove there is
    // an approved signal live.
    return [];
  }
}

export type SignalLookup =
  | { state: "visible"; signal: MarketSignal }
  | { state: "gone" }
  | { state: "missing" };

/**
 * One signal, for the detail page. Distinguishes three cases so the page can
 * answer honestly: a live approved signal, a signal that existed but is no
 * longer public (expired, withdrawn, unavailable, or not yet approved), and no
 * such signal at all.
 */
export async function getMarketSignal(id: string): Promise<SignalLookup> {
  if (!isSupabaseConfigured()) return { state: "missing" };

  try {
    const sb = createAdminClient();
    const { data, error } = await sb
      .from("desk_radar")
      .select(PUBLIC_SIGNAL_COLUMNS)
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    if (!data) return { state: "missing" };

    const row = data as SignalRow;
    if (!isPubliclyVisible(row)) return { state: "gone" };

    const signal = mapSignalRow(row);
    await decorateChapters(sb, [signal]);
    return { state: "visible", signal };
  } catch {
    return { state: "missing" };
  }
}

/** Chapter titles for the category chips, from the HS catalog. */
async function decorateChapters(
  sb: ReturnType<typeof createAdminClient>,
  signals: MarketSignal[],
): Promise<void> {
  const chapters = Array.from(
    new Set(signals.map((s) => s.chapter).filter((c): c is string => !!c)),
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
    for (const s of signals) {
      if (s.chapter) s.chapterTitle = titleOf.get(s.chapter) ?? null;
    }
  } catch {
    // Chips fall back to the chapter number, which is still true.
  }
}
