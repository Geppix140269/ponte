/*
 * The fallback cache, and the one place the fail soft rule is implemented.
 *
 * The rule: a dead upstream must never take a Ponte page down with it. A
 * tariff from three weeks ago, clearly labelled three weeks old, is worth more
 * to somebody costing a shipment than a 500. What is never acceptable is
 * showing the old number as though it were today's, which is why nothing in
 * here returns a bare payload. It returns an envelope carrying `stale` and
 * `fetchedAt`, and the surface is expected to show them.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { ok, fail, type DataSourceResult, type SourceMeta } from "./types";

type CacheRow = { payload: unknown; fetched_at: string };

/**
 * A stable cache key. Object key order must not produce two entries for the
 * same question, so the parts are sorted.
 */
export function cacheKey(parts: Record<string, string | number | undefined>): string {
  return Object.entries(parts)
    .filter(([, v]) => v !== undefined && v !== "")
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${String(v).toLowerCase()}`)
    .join("&");
}

export async function readCache(
  sourceId: string,
  key: string,
): Promise<{ payload: unknown; fetchedAt: string; ageSeconds: number } | null> {
  try {
    const db = createAdminClient();
    const { data, error } = await db
      .from("data_source_cache")
      .select("payload, fetched_at")
      .eq("source_id", sourceId)
      .eq("cache_key", key)
      .maybeSingle<CacheRow>();

    if (error || !data) return null;
    return {
      payload: data.payload,
      fetchedAt: data.fetched_at,
      ageSeconds: (Date.now() - Date.parse(data.fetched_at)) / 1000,
    };
  } catch {
    // A cache that is itself down must not be the reason a page fails.
    return null;
  }
}

export async function writeCache(
  sourceId: string,
  key: string,
  payload: unknown,
): Promise<void> {
  try {
    const db = createAdminClient();
    await db
      .from("data_source_cache")
      .upsert(
        { source_id: sourceId, cache_key: key, payload, fetched_at: new Date().toISOString() },
        { onConflict: "source_id,cache_key" },
      );
  } catch {
    // Writing the cache is an optimisation. Failing to write it is not a
    // reason to fail the request that already has its answer.
  }
}

/**
 * Fresh cache, else upstream, else stale cache, else an honest failure.
 *
 * Note the order of the last two. Serving a stale answer is preferred over
 * failing, but only after the live attempt has been made, never instead of it.
 */
export async function withCache<T>(
  meta: Pick<SourceMeta, "id" | "ttlSeconds">,
  key: string,
  fetcher: () => Promise<T>,
): Promise<DataSourceResult<T>> {
  const cached = await readCache(meta.id, key);

  if (cached && cached.ageSeconds < meta.ttlSeconds) {
    return ok(cached.payload as T, meta.id, { fetchedAt: cached.fetchedAt });
  }

  try {
    const fresh = await fetcher();
    await writeCache(meta.id, key, fresh);
    return ok(fresh, meta.id);
  } catch (error) {
    if (cached) {
      return ok(cached.payload as T, meta.id, {
        stale: true,
        fetchedAt: cached.fetchedAt,
      });
    }
    const reason = error instanceof Error ? error.message : "upstream unavailable";
    return fail<T>(meta.id, reason);
  }
}
