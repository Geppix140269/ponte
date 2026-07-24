// Load the go4WorldBusiness market-signal seed into desk_radar.
//
//   npx tsx scripts/import-market-signals.ts [--source path/to.xlsx] [--batch g4wb_v2] [--limit N] [--dry]
//
// Idempotent: upserts on canonical_signal_id, so re-running refreshes in place
// rather than doubling. Publication follows the sheet's flags (24 Jul decision):
// publishable && !review_required lands 'approved_signal' (public now), every
// other row — including all review_required — lands 'private'.
//
// SAFE FIRST. Run against a Supabase PREVIEW BRANCH before production, and apply
// supabase/migrations/20260724a_desk_radar_signal_import.sql there first. The
// mapping (safe vs provenance) lives in lib/market-signals/import-map.ts and is
// unit-tested; this script only reads the workbook and writes batches.
//
// Env (read from .env.local when present):
//   NEXT_PUBLIC_SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY   required: RLS grants nobody insert on desk_radar

import { readFileSync, existsSync } from "node:fs";
import AdmZip from "adm-zip";
import { createClient } from "@supabase/supabase-js";
import { mapImportRow, type SignalImportInsert } from "../lib/market-signals/import-map";

const DEFAULT_SRC =
  "C:/Users/gfuna/Dropbox/BUSINESS/Ponte/AAA_Master/Market Signals/PONTE_MARKET_SIGNALS_FINAL_UPLOAD_v2.xlsx";

function loadEnvLocal(): void {
  if (!existsSync(".env.local")) return;
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (!m) continue;
    const value = m[2].trim().replace(/^["']|["']$/g, "");
    if (value && !process.env[m[1]]) process.env[m[1]] = value;
  }
}

// ---- Minimal xlsx reader (adm-zip + regex; no runtime dependency added) -----

function decodeEntities(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&amp;/g, "&"); // last, so "&amp;lt;" is not double-decoded
}

/** Shared strings table: index -> text (runs concatenated). */
function parseSharedStrings(xml: string): string[] {
  const out: string[] = [];
  for (const si of xml.match(/<si>[\s\S]*?<\/si>/g) ?? []) {
    const parts = si.match(/<t[^>]*>([\s\S]*?)<\/t>/g) ?? [];
    out.push(parts.map((p) => decodeEntities(p.replace(/<[^>]+>/g, ""))).join(""));
  }
  return out;
}

/** Spreadsheet column letters ("A","AA") -> zero-based index. */
function colIndex(ref: string): number {
  const letters = ref.match(/^[A-Z]+/)?.[0] ?? "A";
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

/** Parse sheet rows into arrays of cell strings, indexed by column. */
function parseSheetRows(xml: string, shared: string[]): string[][] {
  const rows: string[][] = [];
  for (const rowXml of xml.match(/<row[^>]*>[\s\S]*?<\/row>/g) ?? []) {
    const cells: string[] = [];
    for (const c of rowXml.match(/<c\b[^>]*(?:\/>|>[\s\S]*?<\/c>)/g) ?? []) {
      const ref = c.match(/\br="([A-Z]+\d+)"/)?.[1];
      if (!ref) continue;
      const t = c.match(/\bt="([^"]+)"/)?.[1];
      const idx = colIndex(ref);
      let value = "";
      if (t === "inlineStr") {
        value = decodeEntities((c.match(/<t[^>]*>([\s\S]*?)<\/t>/)?.[1] ?? "").replace(/<[^>]+>/g, ""));
      } else {
        const v = c.match(/<v>([\s\S]*?)<\/v>/)?.[1];
        if (v != null) value = t === "s" ? shared[Number(v)] ?? "" : decodeEntities(v);
      }
      cells[idx] = value;
    }
    rows.push(cells);
  }
  return rows;
}

function readWorkbook(path: string): Record<string, unknown>[] {
  const zip = new AdmZip(path);
  const sharedXml = zip.getEntry("xl/sharedStrings.xml")?.getData().toString("utf8") ?? "";
  const sheetEntry =
    zip.getEntry("xl/worksheets/sheet1.xml") ??
    zip.getEntries().find((e) => /xl\/worksheets\/sheet\d+\.xml$/.test(e.entryName));
  if (!sheetEntry) throw new Error("no worksheet found in workbook");
  const shared = parseSharedStrings(sharedXml);
  const rows = parseSheetRows(sheetEntry.getData().toString("utf8"), shared);
  if (rows.length === 0) return [];
  const header = rows[0].map((h) => (h ?? "").trim());
  return rows.slice(1).map((cells) => {
    const obj: Record<string, unknown> = {};
    header.forEach((name, i) => {
      if (name) obj[name] = cells[i] ?? "";
    });
    return obj;
  });
}

// ---- Import ----------------------------------------------------------------

async function main(): Promise<void> {
  loadEnvLocal();
  const args = process.argv.slice(2);
  const dry = args.includes("--dry");
  const src = args.indexOf("--source") >= 0 ? args[args.indexOf("--source") + 1] : DEFAULT_SRC;
  const batch = args.indexOf("--batch") >= 0 ? args[args.indexOf("--batch") + 1] : "g4wb_v2";
  const limit = args.indexOf("--limit") >= 0 ? Number(args[args.indexOf("--limit") + 1]) : Infinity;

  if (!existsSync(src)) {
    console.error(`Workbook not found at ${src}\nPass --source <path> if it lives elsewhere.`);
    process.exit(1);
  }

  const rawRows = readWorkbook(src);
  console.log(`read ${rawRows.length} rows from ${src}`);

  const nowIso = new Date().toISOString();
  const inserts: SignalImportInsert[] = [];
  const skipped: Record<string, number> = {};
  for (const raw of rawRows) {
    if (inserts.length >= limit) break;
    const res = mapImportRow(raw, { batch, nowIso });
    if (!res.ok) {
      skipped[res.reason] = (skipped[res.reason] ?? 0) + 1;
      continue;
    }
    inserts.push(res.insert);
  }

  const approved = inserts.filter((r) => r.status === "approved_signal").length;
  console.log(`mapped ${inserts.length} rows: ${approved} public (approved_signal), ${inserts.length - approved} private`);
  if (Object.keys(skipped).length) {
    console.log("skipped:", Object.entries(skipped).map(([k, n]) => `${n} (${k})`).join(", "));
  }

  if (dry) {
    console.log("\n--dry: parsed and mapped, nothing written.");
    console.log("sample public row:", JSON.stringify(sampleSafe(inserts[0]), null, 2));
    return;
  }

  await upload(inserts, batch);
}

/** A view of one row with the internal fields dropped, for the dry-run preview. */
function sampleSafe(insert: SignalImportInsert | undefined): Record<string, unknown> {
  if (!insert) return {};
  const { source_platform, source_url, raw_description, import_meta, dedupe_key, ...safe } = insert;
  void source_platform; void source_url; void raw_description; void import_meta; void dedupe_key;
  return safe;
}

async function upload(inserts: SignalImportInsert[], batch: string): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
    process.exit(1);
  }
  const sb = createClient(url, key, { auth: { persistSession: false } });

  const { error: probe } = await sb.from("desk_radar").select("canonical_signal_id").limit(1);
  if (probe) {
    console.error(`Cannot read desk_radar: ${probe.message}`);
    console.error("Apply supabase/migrations/20260724a_desk_radar_signal_import.sql first.");
    process.exit(1);
  }

  const BATCH = 500;
  let written = 0;
  for (let i = 0; i < inserts.length; i += BATCH) {
    const slice = inserts.slice(i, i + BATCH);
    const { error } = await sb
      .from("desk_radar")
      .upsert(slice, { onConflict: "canonical_signal_id", ignoreDuplicates: false });
    if (error) {
      console.error(`\nBatch at row ${i} failed: ${error.message}`);
      console.error(`${written} rows were written before this point.`);
      process.exit(1);
    }
    written += slice.length;
    process.stdout.write(`\r  upserted ${written}/${inserts.length}`);
  }

  const { count } = await sb
    .from("desk_radar")
    .select("*", { count: "exact", head: true })
    .eq("import_batch", batch);
  console.log(`\ndone. desk_radar holds ${count} rows for batch '${batch}'.`);
}

void main();
