// One-off importer for WCO HS 2022 codes + embeddings.
//
// Reads the public WCO HS 2022 dataset, inserts codes into hs_codes, then
// generates OpenAI embeddings and inserts into hs_embeddings.
//
// Idempotent: re-running skips rows that are already in the DB (codes by
// (code_clean, schedule), embeddings by hs_code_id).
//
// Usage (one-time, from the repo root):
//   1. Make sure .env.local has NEXT_PUBLIC_SUPABASE_URL,
//      SUPABASE_SERVICE_ROLE_KEY, and OPENAI_API_KEY.
//   2. Run:  npx tsx scripts/import-hs-codes.ts
//      (or: node --experimental-strip-types scripts/import-hs-codes.ts)
//
// Cost estimate: ~6,900 codes × ~20 tokens/description avg ≈ 140k tokens
//                ≈ $0.003 on text-embedding-3-small. Negligible.

import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

const CSV_URL =
  "https://raw.githubusercontent.com/datasets/harmonized-system/master/data/harmonized-system.csv";
const EMBEDDING_MODEL = "text-embedding-3-small";
const EMBED_BATCH = 100; // OpenAI accepts up to 2048; 100 is conservative
const DB_BATCH = 200;
const SCHEDULE = "WCO";

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

interface CsvRow {
  section: string;
  hscode: string;
  description: string;
  parent: string;
  level: number;
}

function parseCsv(text: string): CsvRow[] {
  const lines = text.split(/\r?\n/).filter(Boolean);
  const rows: CsvRow[] = [];
  // Skip header
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    // Simple CSV: section,hscode,description,parent,level
    // description can contain commas inside quotes.
    const parts: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let c = 0; c < line.length; c++) {
      const ch = line[c];
      if (ch === '"' && line[c + 1] === '"') {
        current += '"';
        c++;
      } else if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === "," && !inQuotes) {
        parts.push(current);
        current = "";
      } else {
        current += ch;
      }
    }
    parts.push(current);
    if (parts.length < 5) continue;
    const [section, hscode, description, parent, levelStr] = parts;
    rows.push({
      section: section.trim(),
      hscode: hscode.trim(),
      description: description.trim(),
      parent: parent.trim(),
      level: parseInt(levelStr.trim(), 10),
    });
  }
  return rows;
}

async function main() {
  console.log("Fetching WCO HS 2022 CSV...");
  const res = await fetch(CSV_URL);
  if (!res.ok) {
    console.error("CSV fetch failed:", res.status, res.statusText);
    process.exit(1);
  }
  const text = await res.text();
  const rows = parseCsv(text);
  console.log(`Parsed ${rows.length} rows.`);

  // Build lookup: hscode -> description (for chapter_desc / heading_desc).
  const byCode = new Map<string, CsvRow>();
  for (const r of rows) byCode.set(r.hscode, r);

  // Map each row to a DB-shaped record.
  const toInsert = rows.map((r) => {
    const chapter = r.hscode.slice(0, 2);
    const heading = r.hscode.length >= 4 ? r.hscode.slice(0, 4) : chapter;
    const isSub = r.level === 6;
    return {
      code: r.hscode,
      code_clean: r.hscode,
      schedule: SCHEDULE,
      level: r.level as 2 | 4 | 6,
      chapter,
      chapter_desc: byCode.get(chapter)?.description ?? null,
      heading,
      heading_desc:
        heading.length === 4 ? byCode.get(heading)?.description ?? null : null,
      subheading: isSub ? r.hscode : null,
      subheading_desc: isSub ? r.description : null,
      description: r.description,
      parent_code: r.parent === "TOTAL" ? null : r.parent,
      notes: null as string | null,
      unit: null as string | null,
      is_active: true,
      hs_version: "2022",
    };
  });

  // 1) Insert hs_codes in chunks. ON CONFLICT (code_clean, schedule) DO NOTHING.
  console.log(`Inserting ${toInsert.length} hs_codes rows (idempotent)...`);
  let inserted = 0;
  for (let i = 0; i < toInsert.length; i += DB_BATCH) {
    const chunk = toInsert.slice(i, i + DB_BATCH);
    const { error } = await sb
      .from("hs_codes")
      .upsert(chunk, { onConflict: "code_clean,schedule", ignoreDuplicates: true });
    if (error) {
      console.error("hs_codes upsert error:", error);
      process.exit(1);
    }
    inserted += chunk.length;
    process.stdout.write(`  ${inserted}/${toInsert.length}\r`);
  }
  console.log(`\nhs_codes upsert complete.`);

  // 2) Fetch back the IDs we just inserted (mapping code_clean -> id).
  console.log("Fetching back inserted IDs...");
  const idMap = new Map<string, number>();
  {
    const PAGE = 1000;
    let from = 0;
    while (true) {
      const { data, error } = await sb
        .from("hs_codes")
        .select("id, code_clean")
        .eq("schedule", SCHEDULE)
        .range(from, from + PAGE - 1);
      if (error) {
        console.error("ID fetch error:", error);
        process.exit(1);
      }
      if (!data || data.length === 0) break;
      for (const row of data) {
        idMap.set(row.code_clean, row.id);
      }
      if (data.length < PAGE) break;
      from += PAGE;
    }
  }
  console.log(`Have IDs for ${idMap.size} rows.`);

  // 3) Find which IDs are missing embeddings.
  console.log("Checking existing embeddings...");
  const haveEmbedding = new Set<number>();
  {
    const PAGE = 1000;
    let from = 0;
    while (true) {
      const { data, error } = await sb
        .from("hs_embeddings")
        .select("hs_code_id")
        .range(from, from + PAGE - 1);
      if (error) {
        console.error("Embeddings fetch error:", error);
        process.exit(1);
      }
      if (!data || data.length === 0) break;
      for (const row of data) haveEmbedding.add(row.hs_code_id);
      if (data.length < PAGE) break;
      from += PAGE;
    }
  }
  console.log(`Already have ${haveEmbedding.size} embeddings.`);

  // 4) Build list of pending embeddings.
  const pending: { id: number; text: string }[] = [];
  for (const r of rows) {
    const id = idMap.get(r.hscode);
    if (id == null) continue;
    if (haveEmbedding.has(id)) continue;
    const chapter = r.hscode.slice(0, 2);
    const heading = r.hscode.length >= 4 ? r.hscode.slice(0, 4) : null;
    // Compose a richer string so the embedding captures hierarchy.
    const parts = [
      r.description,
      chapter ? byCode.get(chapter)?.description : "",
      heading ? byCode.get(heading)?.description : "",
    ].filter((s): s is string => Boolean(s && s !== r.description));
    const text = parts.length ? `${r.description}. ${parts.join(". ")}` : r.description;
    pending.push({ id, text });
  }
  console.log(`Need to embed ${pending.length} rows.`);

  // 5) Embed in batches and insert.
  let embedded = 0;
  for (let i = 0; i < pending.length; i += EMBED_BATCH) {
    const batch = pending.slice(i, i + EMBED_BATCH);
    let attempts = 0;
    let embeddings: number[][] | null = null;
    while (attempts < 5) {
      try {
        const resp = await openai.embeddings.create({
          model: EMBEDDING_MODEL,
          input: batch.map((b) => b.text),
        });
        embeddings = resp.data.map((d) => d.embedding);
        break;
      } catch (err) {
        attempts++;
        const wait = 2 ** attempts * 1000;
        console.warn(`  embed batch failed (attempt ${attempts}), retry in ${wait}ms`);
        await new Promise((r) => setTimeout(r, wait));
      }
    }
    if (!embeddings) {
      console.error("Embedding failed after retries. Aborting.");
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
      console.error("hs_embeddings upsert error:", error);
      process.exit(1);
    }
    embedded += batch.length;
    process.stdout.write(`  embedded ${embedded}/${pending.length}\r`);
  }
  console.log(`\nEmbeddings complete.`);
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
