import { unstable_noStore as noStore } from "next/cache";
import { createAdminClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/auth";
import { publicWindowPredicate } from "@/lib/market-signals/logic";

/**
 * The signal URLs a crawler is allowed to have.
 *
 * Read by `app/sitemap.ts` and by nothing else. It exists as its own module
 * because the sitemap must apply EXACTLY the predicates the detail page's
 * `robots` directive applies: approved, inside the public window, flagged
 * `indexable`. A sitemap that disagrees with the page it advertises is
 * worse than one that omits the page: it spends crawl budget to be told to go
 * away, and it states that something is public when the page says it is not.
 *
 * Only the two columns a sitemap entry needs are selected. No public signal
 * field is read, so this cannot become a second, quieter route by which a
 * record's facts leave the database.
 */

export type IndexableSignal = { id: string; lastModified: string | null };

export async function listIndexableSignals(limit: number): Promise<IndexableSignal[]> {
  noStore();
  if (!isSupabaseConfigured()) return [];

  try {
    const sb = createAdminClient();
    const { data, error } = await sb
      .from("desk_radar")
      .select("id, spotted_at")
      .eq("status", "approved_signal")
      .or(publicWindowPredicate(new Date().toISOString()))
      // `indexable` is data the desk controls per row, and it is honoured here
      // rather than assumed: a signal may be publicly readable and still not be
      // something Ponte wants standing as a search result.
      .eq("indexable", true)
      // Newest first, so a limit drops the oldest rather than an arbitrary page.
      .order("spotted_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(limit);
    if (error) throw error;

    return (data ?? []).map((row) => ({
      id: String((row as { id: string }).id),
      lastModified: (row as { spotted_at: string | null }).spotted_at ?? null,
    }));
  } catch {
    // The sitemap falls back to its static paths. A sitemap that 500s teaches a
    // crawler to stop asking for it.
    return [];
  }
}
