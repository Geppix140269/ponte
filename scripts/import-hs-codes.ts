// Load the official HS 2022 catalog into hs_codes.
//
//   npx tsx scripts/import-hs-codes.ts [--source path/to/hs-codes.csv] [--dry]
//
// Idempotent: upserts on `code`, so running it twice changes nothing. It is
// the one way rows enter this table. Nothing at runtime may insert here.
//
// Preserves decoration: short_title and examples are platform-owned columns
// written by people and by later batch jobs. The upsert never sends them, so
// a re-import refreshes the official WCO wording and leaves the friendly
// titles alone.
//
// Env (read from .env.local when present):
//   NEXT_PUBLIC_SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY   required: RLS grants nobody insert on this table

import { readFileSync, existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const DEFAULT_SRC =
  "C:/Users/gfuna/OneDrive/Documents/Claude/Projects/1402 Celsius/hs-codes.csv";

function loadEnvLocal(): void {
  if (!existsSync(".env.local")) return;
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (!m) continue;
    const value = m[2].trim().replace(/^["']|["']$/g, "");
    if (value && !process.env[m[1]]) process.env[m[1]] = value;
  }
}

/**
 * RFC4180 parser. Not a split on commas: 205 of the official descriptions
 * contain a comma inside quotes, and a naive split shifts every column after
 * the first quoted one, which would classify those codes under the wrong
 * chapter without erroring.
 */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (c !== "\r") field += c;
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.length > 1);
}

type HsRow = {
  code: string;
  display: string;
  chapter: string;
  chapter_title: string;
  heading: string;
  heading_title: string;
  description: string;
  unit: string | null;
  hs_edition: string;
  source: string;
  is_active: boolean;
};

function main(): void {
  loadEnvLocal();

  const args = process.argv.slice(2);
  const dry = args.includes("--dry");
  const srcFlag = args.indexOf("--source");
  const src = srcFlag >= 0 ? args[srcFlag + 1] : DEFAULT_SRC;

  if (!existsSync(src)) {
    console.error(`Catalog not found at ${src}`);
    console.error("Pass --source <path> if it lives somewhere else.");
    process.exit(1);
  }

  const rows = parseCsv(readFileSync(src, "utf8"));
  const header = rows.shift();
  if (!header) {
    console.error("Empty file.");
    process.exit(1);
  }
  const at = Object.fromEntries(header.map((h, i) => [h.trim(), i]));

  for (const required of [
    "code", "display", "chapter", "chapter_title",
    "heading", "heading_title", "description",
  ]) {
    if (!(required in at)) {
      console.error(`Column "${required}" missing. Found: ${header.join(", ")}`);
      process.exit(1);
    }
  }

  const parsed: HsRow[] = [];
  const problems: string[] = [];
  const seen = new Set<string>();

  for (const [i, r] of rows.entries()) {
    const get = (k: string) => (r[at[k]] ?? "").trim();
    const code = get("code");

    // Validated here rather than left to the check constraint, so a bad file
    // is reported as a list of lines instead of one failed statement.
    if (!/^\d{6}$/.test(code)) {
      problems.push(`line ${i + 2}: code "${code}" is not six digits`);
      continue;
    }
    if (seen.has(code)) {
      problems.push(`line ${i + 2}: code ${code} appears twice`);
      continue;
    }
    seen.add(code);

    if (get("chapter") !== code.slice(0, 2) || get("heading") !== code.slice(0, 4)) {
      problems.push(`line ${i + 2}: ${code} disagrees with its own chapter or heading`);
      continue;
    }
    if (!get("description")) {
      problems.push(`line ${i + 2}: ${code} has no description`);
      continue;
    }

    // "n/a" is the file's way of writing "no WCO unit". A column that means
    // "unknown" should hold null, not the string "n/a", or every consumer has
    // to know the sentinel.
    const rawUnit = get("unit");
    const unit = !rawUnit || rawUnit.toLowerCase() === "n/a" ? null : rawUnit;

    parsed.push({
      code,
      display: get("display") || `${code.slice(0, 4)}.${code.slice(4)}`,
      chapter: get("chapter"),
      chapter_title: get("chapter_title"),
      heading: get("heading"),
      heading_title: get("heading_title"),
      description: get("description"),
      unit,
      hs_edition: get("hs_edition") || "HS2022",
      // The file's status_in_platform column labels codes seed or ai_cached,
      // but those labels describe a different platform's existing data. In
      // this database nothing has ever written an HS code, so every row here
      // is official.
      source: "official",
      is_active: true,
    });
  }

  console.log(`parsed ${parsed.length} rows from ${src}`);
  console.log(`chapters ${new Set(parsed.map((p) => p.chapter)).size}, headings ${new Set(parsed.map((p) => p.heading)).size}`);
  if (problems.length) {
    console.error(`\n${problems.length} row(s) rejected:`);
    for (const p of problems.slice(0, 20)) console.error(`  ${p}`);
    if (problems.length > 20) console.error(`  ... and ${problems.length - 20} more`);
    console.error("\nNothing was written. Fix the source file and run again.");
    process.exit(1);
  }

  if (dry) {
    console.log("\n--dry: parsed and validated, nothing written.");
    return;
  }

  void upload(parsed);
}

async function upload(parsed: HsRow[]): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error(
      "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.\n" +
        "RLS grants nobody insert on hs_codes, so the anon key cannot do this.",
    );
    process.exit(1);
  }

  const sb = createClient(url, key, { auth: { persistSession: false } });

  const { error: probe } = await sb.from("hs_codes").select("code").limit(1);
  if (probe) {
    console.error(`Cannot read hs_codes: ${probe.message}`);
    console.error(
      "Apply supabase/migrations/20260722b_hs_codes.sql in the SQL editor first.",
    );
    process.exit(1);
  }

  // Batched because a single 5,613 row request is large enough to be refused
  // and slow enough to be worth showing progress on.
  const BATCH = 500;
  let written = 0;
  for (let i = 0; i < parsed.length; i += BATCH) {
    const slice = parsed.slice(i, i + BATCH);
    const { error } = await sb
      .from("hs_codes")
      .upsert(slice, { onConflict: "code", ignoreDuplicates: false });
    if (error) {
      console.error(`\nBatch at row ${i} failed: ${error.message}`);
      console.error(`${written} rows were written before this point.`);
      process.exit(1);
    }
    written += slice.length;
    process.stdout.write(`\r  upserted ${written}/${parsed.length}`);
  }

  const { count } = await sb
    .from("hs_codes")
    .select("*", { count: "exact", head: true })
    .eq("hs_edition", "HS2022");

  console.log(`\ndone. hs_codes now holds ${count} HS2022 rows.`);
  if (count !== parsed.length) {
    console.warn(
      `Expected ${parsed.length}. A different count means rows exist from another import.`,
    );
  }
}

main();
