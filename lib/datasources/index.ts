/*
 * The datasource registry.
 *
 * One list of every third party this platform calls, what it costs to call,
 * and whether its licence lets us republish what comes back. New sources are
 * added here and nowhere else, so the question "what are we actually pulling,
 * and are we allowed to resell it" has one answer rather than a grep.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { FX_SOURCES, getFxRate } from "./fx";
import type { SourceMeta } from "./types";

export const SOURCES: SourceMeta[] = [...FX_SOURCES];

export function sourceById(id: string): SourceMeta | undefined {
  return SOURCES.find((s) => s.id === id);
}

/**
 * Whether a source can be called at all right now.
 *
 * A key gated source with no key is not broken, it is simply not set up yet,
 * and the health report says so rather than reporting a failure somebody would
 * waste time investigating.
 */
export function isConfigured(meta: SourceMeta): boolean {
  if (meta.auth === "none") return true;
  return Boolean(meta.envVar && process.env[meta.envVar]);
}

export type HealthReport = {
  id: string;
  provider: string;
  category: string;
  auth: SourceMeta["auth"];
  status: "ok" | "unconfigured" | "failing";
  detail?: string;
  checkedAt: string;
};

/*
 * Health checks are per domain, not generic.
 *
 * A generic HEAD against a base URL proves a server is up, which is not the
 * question. The question is whether a real answer comes back in the shape we
 * parse, so each domain asks its own smallest real question.
 */
const PROBES: Record<string, () => Promise<{ ok: boolean; detail?: string }>> = {
  fx: async () => {
    const result = await getFxRate("USD", "EUR");
    if (!result.ok) return { ok: false, detail: result.error };
    const count = result.data.providers.length;
    return {
      ok: true,
      detail: `${count} provider${count === 1 ? "" : "s"}${result.stale ? ", served stale" : ""}`,
    };
  },
};

export async function checkHealth(): Promise<HealthReport[]> {
  const checkedAt = new Date().toISOString();
  // Deduped without a Set spread: this repo targets a tsconfig where
  // iterating a Set needs downlevelIteration, and a compiler flag is a large
  // change to make for one line.
  const categories = SOURCES.map((s) => s.category).filter(
    (category, index, all) => all.indexOf(category) === index,
  );

  // One probe per category, then the verdict is attributed to each source in
  // it. Probing every FX provider separately would triple the calls to prove
  // the same thing the median already proves.
  const verdicts = new Map<string, { ok: boolean; detail?: string }>();
  await Promise.all(
    categories.map(async (category) => {
      const probe = PROBES[category];
      if (!probe) return;
      try {
        verdicts.set(category, await probe());
      } catch (error) {
        verdicts.set(category, {
          ok: false,
          detail: error instanceof Error ? error.message : "probe threw",
        });
      }
    }),
  );

  const reports = SOURCES.map((meta): HealthReport => {
    if (!isConfigured(meta)) {
      return {
        id: meta.id,
        provider: meta.provider,
        category: meta.category,
        auth: meta.auth,
        status: "unconfigured",
        detail: meta.envVar ? `${meta.envVar} is not set` : "not configured",
        checkedAt,
      };
    }
    const verdict = verdicts.get(meta.category);
    return {
      id: meta.id,
      provider: meta.provider,
      category: meta.category,
      auth: meta.auth,
      status: verdict ? (verdict.ok ? "ok" : "failing") : "unconfigured",
      detail: verdict?.detail ?? "no probe defined",
      checkedAt,
    };
  });

  await recordHealth(reports);
  return reports;
}

/** Best effort. A registry that cannot be written is not a failed health check. */
async function recordHealth(reports: HealthReport[]): Promise<void> {
  try {
    const db = createAdminClient();
    await db.from("data_sources").upsert(
      reports.map((r) => {
        const meta = sourceById(r.id)!;
        return {
          id: meta.id,
          category: meta.category,
          provider: meta.provider,
          auth_class: meta.auth,
          endpoint: meta.endpoint,
          commercial_ok: meta.commercialOk,
          note: meta.note ?? null,
          last_health_at: r.checkedAt,
          last_health_status: r.status,
          updated_at: new Date().toISOString(),
        };
      }),
      { onConflict: "id" },
    );
  } catch {
    // Deliberately silent. See the note above.
  }
}

export { getFxRate };
export * from "./types";
