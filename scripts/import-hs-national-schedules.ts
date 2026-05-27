// Imports US HTS (Census Bureau) and UK GTT (UK Trade Tariff) codes into hs_codes + hs_embeddings.
// EU TARIC has no free bulk API — no EU importer at this time.
//
// US HTS source: Census Bureau fixed-width concordance file (20k 10-digit import codes)
//   https://www.census.gov/foreign-trade/schedules/b/2026/sbsdf.zip → iconcord.txt
// UK GTT source: UK Trade Tariff API (https://api.trade-tariff.service.gov.uk/v2)
//
// Usage:
//   npx tsx --env-file=.env.local scripts/import-hs-national-schedules.ts
//   npx tsx --env-file=.env.local scripts/import-hs-national-schedules.ts --schedule US_HTS
//   npx tsx --env-file=.env.local scripts/import-hs-national-schedules.ts --schedule UK_GTT
//
// Cost estimate (text-embedding-3-small):
//   US HTS ~20k codes × ~25 tokens ≈ $0.012
//   UK GTT ~12k codes × ~25 tokens ≈ $0.006

import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";
import AdmZip from "adm-zip";

const EMBEDDING_MODEL = "text-embedding-3-small";
const EMBED_BATCH = 100;
const DB_BATCH = 200;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const openaiKey = process.env.OPENAI_API_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
if (!openaiKey) {
  console.error("Missing OPENAI_API_KEY");
  process.exit(1);
}

const sb = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const openai = new OpenAI({ apiKey: openaiKey });

// ── Types ────────────────────────────────────────────────────────────────────

interface DbCode {
  code: string;
  code_clean: string;
  schedule: string;
  level: number;
  chapter: string;
  chapter_desc: string | null;
  heading: string;
  heading_desc: string | null;
  subheading: string | null;
  subheading_desc: string | null;
  description: string;
  parent_code: string | null;
  notes: string | null;
  unit: string | null;
  is_active: boolean;
  hs_version: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

async function fetchJson<T>(url: string, retries = 4): Promise<T> {
  for (let i = 0; i < retries; i++) {
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (res.ok) return res.json() as Promise<T>;
    if (res.status === 429 || res.status >= 500) {
      await sleep(1500 * (i + 1));
      continue;
    }
    throw new Error(`HTTP ${res.status} ${res.statusText}: ${url}`);
  }
  throw new Error(`Failed after ${retries} retries: ${url}`);
}

async function upsertCodes(codes: DbCode[], schedule: string) {
  console.log(`Upserting ${codes.length} ${schedule} codes…`);
  let n = 0;
  for (let i = 0; i < codes.length; i += DB_BATCH) {
    const chunk = codes.slice(i, i + DB_BATCH);
    const { error } = await sb
      .from("hs_codes")
      .upsert(chunk, { onConflict: "code_clean,schedule", ignoreDuplicates: true });
    if (error) {
      console.error("upsert error:", error);
      process.exit(1);
    }
    n += chunk.length;
    process.stdout.write(`  ${n}/${codes.length}\r`);
  }
  console.log(`\n${schedule}: codes upserted.`);
}

async function fetchIdMap(schedule: string): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  const PAGE = 1000;
  let from = 0;
  while (true) {
    const { data, error } = await sb
      .from("hs_codes")
      .select("id,code_clean")
      .eq("schedule", schedule)
      .range(from, from + PAGE - 1);
    if (error) {
      console.error("ID fetch error:", error);
      process.exit(1);
    }
    if (!data?.length) break;
    for (const r of data) map.set(r.code_clean, r.id);
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return map;
}

async function embedAndInsert(codes: DbCode[], schedule: string) {
  const idMap = await fetchIdMap(schedule);
  const haveEmbedding = new Set<number>();

  const allIds = [...idMap.values()];
  for (let i = 0; i < allIds.length; i += 1000) {
    const { data } = await sb
      .from("hs_embeddings")
      .select("hs_code_id")
      .in("hs_code_id", allIds.slice(i, i + 1000));
    for (const r of data ?? []) haveEmbedding.add(r.hs_code_id);
  }

  const pending: { id: number; text: string }[] = [];
  for (const c of codes) {
    const id = idMap.get(c.code_clean);
    if (id == null || haveEmbedding.has(id)) continue;
    const parts = [c.description];
    if (c.heading_desc && c.heading_desc !== c.description) parts.push(c.heading_desc);
    if (c.chapter_desc && c.chapter_desc !== c.description && c.chapter_desc !== c.heading_desc)
      parts.push(c.chapter_desc);
    pending.push({ id, text: parts.join(". ") });
  }

  console.log(`Need to embed ${pending.length} ${schedule} rows.`);
  let embedded = 0;

  for (let i = 0; i < pending.length; i += EMBED_BATCH) {
    const batch = pending.slice(i, i + EMBED_BATCH);
    let embeddings: number[][] | null = null;
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        const resp = await openai.embeddings.create({
          model: EMBEDDING_MODEL,
          input: batch.map((b) => b.text),
        });
        embeddings = resp.data.map((d) => d.embedding);
        break;
      } catch {
        await sleep(2 ** (attempt + 1) * 1000);
      }
    }
    if (!embeddings) {
      console.error("Embedding failed after retries.");
      process.exit(1);
    }
    const dbRows = batch.map((b, idx) => ({
      hs_code_id: b.id,
      embedding: embeddings![idx],
      model: EMBEDDING_MODEL,
    }));
    const { error } = await sb
      .from("hs_embeddings")
      .upsert(dbRows, { onConflict: "hs_code_id", ignoreDuplicates: true });
    if (error) {
      console.error("embedding insert error:", error);
      process.exit(1);
    }
    embedded += batch.length;
    process.stdout.write(`  embedded ${embedded}/${pending.length}\r`);
  }
  console.log(`\n${schedule}: embeddings complete.`);
}

// ── US HTS (Census Bureau fixed-width concordance) ───────────────────────────
//
// Source: https://www.census.gov/foreign-trade/schedules/b/2026/sbsdf.zip
// File:  iconcord.txt  — HTS import codes, fixed-width layout:
//   col  1-10  : 10-digit HTS code
//   col 15-65  : short description
//   col 70-219 : long description
//   col 225-227: unit 1
//   col 233-235: unit 2

const CENSUS_ZIP_URL =
  "https://www.census.gov/foreign-trade/schedules/b/2026/sbsdf.zip";

async function fetchBuffer(url: string, retries = 4): Promise<Buffer> {
  for (let i = 0; i < retries; i++) {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; tariff-importer/1.0)" },
    });
    if (res.ok) return Buffer.from(await res.arrayBuffer());
    if (res.status === 429 || res.status >= 500) {
      await sleep(1500 * (i + 1));
      continue;
    }
    throw new Error(`HTTP ${res.status} ${res.statusText}: ${url}`);
  }
  throw new Error(`fetchBuffer failed after ${retries} retries: ${url}`);
}

function parseHtsConcordance(text: string): DbCode[] {
  const lines = text.split(/\r?\n/);
  const codes: DbCode[] = [];

  for (const line of lines) {
    if (line.length < 10) continue;
    const code = line.substring(0, 10).trim();
    if (!/^\d{10}$/.test(code)) continue; // skip non-code lines

    const descShort = line.substring(14, 65).trim();
    const descLong = line.length > 69 ? line.substring(69, 219).trim() : "";
    const unit1 = line.length > 224 ? line.substring(224, 227).trim() : "";
    const unit2 = line.length > 232 ? line.substring(232, 235).trim() : "";

    const description = descLong || descShort;
    if (!description) continue;

    const chapter = code.slice(0, 2);
    const heading = code.slice(0, 4);
    const subheading = code.slice(0, 6);
    const unit = [unit1, unit2].filter(Boolean).join(",") || null;

    codes.push({
      code,
      code_clean: code,
      schedule: "US_HTS",
      level: 10,
      chapter,
      chapter_desc: null,
      heading,
      heading_desc: null,
      subheading,
      subheading_desc: description,
      description,
      parent_code: null,
      notes: null,
      unit,
      is_active: true,
      hs_version: "2026",
    });
  }

  return codes;
}

async function importUSHTS(): Promise<DbCode[]> {
  console.log("\n── US HTS ──────────────────────────────────────────────────────");
  console.log(`Downloading Census Bureau HTS concordance…`);

  const zipBuffer = await fetchBuffer(CENSUS_ZIP_URL);
  console.log(`Downloaded ${(zipBuffer.length / 1024).toFixed(0)} KB.`);

  const zip = new AdmZip(zipBuffer);
  const entry = zip.getEntry("iconcord.txt");
  if (!entry) {
    console.error("iconcord.txt not found in ZIP");
    process.exit(1);
  }

  const text = entry.getData().toString("latin1");
  const codes = parseHtsConcordance(text);
  console.log(`Parsed ${codes.length} US HTS codes.`);
  return codes;
}

// ── UK GTT (UK Trade Tariff API) ─────────────────────────────────────────────

const UK_BASE = "https://www.trade-tariff.service.gov.uk/api/v2";

// Determine the "meaningful" length of a 10-digit UK commodity code by stripping trailing zeros.
function ukCodeLevel(itemId: string): number {
  const stripped = itemId.replace(/0+$/, "");
  const len = stripped.length;
  if (len <= 2) return 2;
  if (len <= 4) return 4;
  if (len <= 6) return 6;
  if (len <= 8) return 8;
  return 10;
}

async function importUKGTT(): Promise<DbCode[]> {
  console.log("\n── UK GTT ──────────────────────────────────────────────────────");

  // Fetch sections to get full chapter list
  const sectionsResp = await fetchJson<{ data: Array<{ attributes: { chapter_from: string; chapter_to: string } }> }>(
    `${UK_BASE}/sections`,
  );

  const chapterIds: string[] = [];
  for (const s of sectionsResp.data) {
    const from = parseInt(s.attributes.chapter_from, 10);
    const to = parseInt(s.attributes.chapter_to, 10);
    for (let i = from; i <= to; i++) chapterIds.push(String(i).padStart(2, "0"));
  }
  chapterIds.sort();
  console.log(`${chapterIds.length} chapters to process.`);

  const allCodes: DbCode[] = [];

  for (let ci = 0; ci < chapterIds.length; ci++) {
    const chId = chapterIds[ci];
    await sleep(150); // ~6 req/s — well within UK API limits

    let chapterData: any;
    try {
      chapterData = await fetchJson<any>(`${UK_BASE}/chapters/${chId}`);
    } catch (err) {
      console.warn(`\n  Chapter ${chId} skipped: ${err}`);
      continue;
    }

    const chapterDesc: string = chapterData.data?.attributes?.formatted_description
      ?? chapterData.data?.attributes?.description ?? "";

    // Extract 4-digit heading codes from included (more reliable than SID-based relationships)
    const headingRefs: string[] = [];
    for (const item of (chapterData.included ?? [])) {
      if (item.type === "heading" && item.attributes?.goods_nomenclature_item_id) {
        headingRefs.push(item.attributes.goods_nomenclature_item_id.slice(0, 4));
      }
    }

    for (const headingId of headingRefs) {
      await sleep(120);

      let hData: any;
      try {
        hData = await fetchJson<any>(`${UK_BASE}/headings/${headingId}`);
      } catch {
        continue;
      }

      const headingDesc: string = hData.data?.attributes?.formatted_description
        ?? hData.data?.attributes?.description ?? "";
      const headingClean = headingId.replace(/[^0-9]/g, "");

      // Push the heading itself
      allCodes.push({
        code: headingId,
        code_clean: headingClean,
        schedule: "UK_GTT",
        level: 4,
        chapter: chId,
        chapter_desc: chapterDesc || null,
        heading: headingClean,
        heading_desc: headingDesc || null,
        subheading: null,
        subheading_desc: null,
        description: headingDesc,
        parent_code: chId,
        notes: null,
        unit: null,
        is_active: true,
        hs_version: "current",
      });

      // Commodities come in the `included` array
      const commodities: any[] = (hData.included ?? []).filter(
        (item: any) => item.type === "commodity",
      );

      for (const c of commodities) {
        const itemId: string = c.attributes?.goods_nomenclature_item_id ?? "";
        if (!itemId) continue;
        const codeClean = itemId.replace(/[^0-9]/g, "");
        const level = ukCodeLevel(itemId);
        const subClean = level >= 6 ? codeClean.slice(0, 6) : null;
        const desc: string = c.attributes?.description ?? "";

        allCodes.push({
          code: itemId,
          code_clean: codeClean,
          schedule: "UK_GTT",
          level,
          chapter: chId,
          chapter_desc: chapterDesc || null,
          heading: headingClean,
          heading_desc: headingDesc || null,
          subheading: subClean,
          subheading_desc: subClean ? desc : null,
          description: desc,
          parent_code: headingClean,
          notes: null,
          unit: null,
          is_active: true,
          hs_version: "current",
        });
      }
    }

    process.stdout.write(`  Chapter ${chId} (${ci + 1}/${chapterIds.length})\r`);
  }

  console.log(`\nUK GTT total: ${allCodes.length} codes.`);
  return allCodes;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const argv = process.argv.slice(2);
  const schedIdx = argv.indexOf("--schedule");
  const scheduleArg = schedIdx !== -1 ? argv[schedIdx + 1] : "all";

  const runUS = scheduleArg === "all" || scheduleArg === "US_HTS";
  const runUK = scheduleArg === "all" || scheduleArg === "UK_GTT";

  if (!runUS && !runUK) {
    console.error(`Unknown --schedule value: ${scheduleArg}. Use US_HTS, UK_GTT, or all.`);
    process.exit(1);
  }

  if (runUS) {
    const codes = await importUSHTS();
    if (codes.length) {
      await upsertCodes(codes, "US_HTS");
      await embedAndInsert(codes, "US_HTS");
    }
  }

  if (runUK) {
    const codes = await importUKGTT();
    if (codes.length) {
      await upsertCodes(codes, "UK_GTT");
      await embedAndInsert(codes, "UK_GTT");
    }
  }

  console.log("\nAll done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
