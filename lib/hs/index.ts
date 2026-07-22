// The HS 2022 catalog, read side.
//
// One rule governs everything here: the catalog is the only source of HS
// codes. Nothing selects a code that is not a row in this table, and no code
// path writes one. A listing's hs_code is either a value that exists here or
// it is null.
//
// Every function degrades to empty rather than throwing when the table is
// absent, because the migration is applied by hand and the composer must keep
// working in the window before somebody runs it.

import { createAdminClient } from "@/lib/supabase/admin";

export type HsCode = {
  code: string;
  display: string;
  description: string;
  short_title: string | null;
  chapter: string;
  chapter_title: string;
  heading: string;
};

export type HsChapter = {
  chapter: string;
  chapter_title: string;
  codes: number;
};

/** Postgres says "relation does not exist"; PostgREST says PGRST205. */
function isMissingTable(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return (
    error.code === "PGRST205" ||
    error.code === "42P01" ||
    /could not find the table|does not exist/i.test(error.message ?? "")
  );
}

let warned = false;
function warnOnce(context: string): void {
  if (warned) return;
  warned = true;
  console.warn(
    `[ponte] hs_codes is not present (${context}). Apply ` +
      "supabase/migrations/20260722b_hs_codes.sql and run npm run hs:import.",
  );
}

/**
 * Search the catalog. Ranked server side by trigram similarity, with an exact
 * code prefix always winning.
 *
 * Search runs in Postgres rather than the browser deliberately: the catalog
 * slimmed to code plus a truncated description is still 484 KB, and the UI
 * brief caps client bundle growth at about 100 KB.
 */
export async function searchHsCodes(query: string, limit = 20): Promise<HsCode[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const sb = createAdminClient();
  const { data, error } = await sb.rpc("hs_search", { q, lim: limit });

  if (error) {
    if (isMissingTable(error)) {
      warnOnce("search");
      return [];
    }
    console.error("[ponte] hs_search failed:", error.message);
    return [];
  }
  return (data ?? []) as HsCode[];
}

/** One code, or null. Used to validate anything a form or an API sends us. */
export async function getHsCode(code: string): Promise<HsCode | null> {
  if (!/^\d{6}$/.test(code)) return null;

  const sb = createAdminClient();
  const { data, error } = await sb
    .from("hs_codes")
    .select("code, display, description, short_title, chapter, chapter_title, heading")
    .eq("code", code)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    if (isMissingTable(error)) warnOnce("lookup");
    else console.error("[ponte] hs lookup failed:", error.message);
    return null;
  }
  return (data as HsCode) ?? null;
}

/**
 * True when this code may be stored on a listing.
 *
 * The one guard every write path calls. It answers false for a code that is
 * well formed but not real, which is the whole point: the shape check alone
 * would accept 999999.
 */
export async function isValidHsCode(code: string): Promise<boolean> {
  return (await getHsCode(code)) !== null;
}

/**
 * The 97 chapters, with how many active codes each holds.
 *
 * This is what the composer's icon tile grid is built from: a trader taps a
 * chapter, then a heading, and only types if neither got them there. Cached
 * for an hour because published nomenclature does not change between
 * requests, and only changes at all when an edition does.
 */
let chapterCache: { at: number; value: HsChapter[] } | null = null;
const CHAPTER_TTL_MS = 60 * 60 * 1000;

export async function listHsChapters(): Promise<HsChapter[]> {
  if (chapterCache && Date.now() - chapterCache.at < CHAPTER_TTL_MS) {
    return chapterCache.value;
  }

  const sb = createAdminClient();
  // Selected rather than aggregated because PostgREST has no group by. 5,613
  // rows of two short columns is a small read, and it happens once an hour.
  const { data, error } = await sb
    .from("hs_codes")
    .select("chapter, chapter_title")
    .eq("is_active", true);

  if (error) {
    if (isMissingTable(error)) warnOnce("chapters");
    else console.error("[ponte] hs chapters failed:", error.message);
    return [];
  }

  const counts = new Map<string, HsChapter>();
  for (const row of (data ?? []) as { chapter: string; chapter_title: string }[]) {
    const existing = counts.get(row.chapter);
    if (existing) existing.codes++;
    else counts.set(row.chapter, { chapter: row.chapter, chapter_title: row.chapter_title, codes: 1 });
  }

  // Array.from rather than a spread: the project targets a level where
  // spreading a Map iterator needs downlevelIteration, and every other call
  // site in the codebase already writes it this way.
  const value = Array.from(counts.values()).sort((a, b) =>
    a.chapter.localeCompare(b.chapter),
  );
  chapterCache = { at: Date.now(), value };
  return value;
}

/** The codes inside one heading, for the second tap of the tile grid. */
export async function listHsCodesInHeading(heading: string): Promise<HsCode[]> {
  if (!/^\d{4}$/.test(heading)) return [];

  const sb = createAdminClient();
  const { data, error } = await sb
    .from("hs_codes")
    .select("code, display, description, short_title, chapter, chapter_title, heading")
    .eq("heading", heading)
    .eq("is_active", true)
    .order("code");

  if (error) {
    if (isMissingTable(error)) warnOnce("heading");
    else console.error("[ponte] hs heading failed:", error.message);
    return [];
  }
  return (data ?? []) as HsCode[];
}

/** Is the catalog loaded at all? Lets a surface hide its HS controls cleanly. */
export async function isHsCatalogReady(): Promise<boolean> {
  const sb = createAdminClient();
  const { error } = await sb.from("hs_codes").select("code").limit(1);
  if (error && isMissingTable(error)) {
    warnOnce("readiness");
    return false;
  }
  return !error;
}
