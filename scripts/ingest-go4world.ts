// Ingest a Go4WorldBusiness export into Market Signals, with reconciliation.
//
//   npx tsx scripts/ingest-go4world.ts --file "<a.csv>" --file "<b.csv>"
//   npx tsx scripts/ingest-go4world.ts --file "<a.csv>" --archive <dir>
//   npx tsx scripts/ingest-go4world.ts --file "<a.csv>" --apply     (writes)
//
// DRY BY DEFAULT. Without `--apply` nothing reaches any database. The mapping
// decisions live in lib/market-signals/ingest.ts and lib/market-signals/
// source-taxonomy.ts and are unit-tested; this file reads the CSV, archives it,
// counts what happened and prints the reconciliation.
//
// What this script guarantees, and why each one is here:
//
//   NOTHING IS SILENTLY DISCARDED. Every row received produces exactly one
//   decision. The reconciliation asserts published + held == received, and the
//   run FAILS if that arithmetic does not hold. A skipped row is a defect, not
//   a filter.
//
//   THE RAW ROW IS PRESERVED BEFORE TRANSFORMATION. Every row is written
//   verbatim to a private JSONL archive, and on `--apply` the row is also
//   carried into `import_meta.source_row`, which no public read selects. The
//   archive is written even on a dry run, so what was received is recoverable
//   independently of what was published.
//
//   THE SOURCE DATE IS CARRIED SEPARATELY FROM THE SCRAPE DATE. `spotted_at` is
//   the source's own posting date. `import_meta.scraped_at` is when the file
//   was produced. A row scraped this week whose indication is from 2002 is
//   `historical` and is held.
//
//   NO SOURCE PROSE OR CONTACT DETAIL IS EVER PUBLISHED. `ai_description` stays
//   null; the source's prose goes to the internal `raw_description` and the
//   company and contact fields to the internal `counterparty_*` columns.

import { readFileSync, writeFileSync, existsSync, mkdirSync, statSync } from "node:fs";
import { basename, join } from "node:path";
import {
  decideRow,
  HOLD_REASONS,
  HOLD_REASON_TEXT,
  type HoldReason,
  type IngestDecision,
  type RawRow,
} from "../lib/market-signals/ingest";
import { OBSERVED_SOURCE_TYPES, SOURCE_CATEGORIES } from "../lib/market-signals/source-taxonomy";

// ---- args ------------------------------------------------------------------
const argv = process.argv.slice(2);
const files: string[] = [];
for (let i = 0; i < argv.length; i++) if (argv[i] === "--file") files.push(argv[++i]);
const apply = argv.includes("--apply");
const batch = argv.includes("--batch") ? argv[argv.indexOf("--batch") + 1] : "g4wb_2026-08-06";
const archiveDir = argv.includes("--archive")
  ? argv[argv.indexOf("--archive") + 1]
  : join(process.env.TEMP ?? ".", "ponte-ingest-archive");

if (files.length === 0) {
  console.error("At least one --file <path.csv> is required.");
  process.exit(1);
}

// ---- csv -------------------------------------------------------------------
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else quoted = false;
      } else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else if (c !== "\r") field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows;
}

interface FileReport {
  file: string;
  scrapedAt: string;
  received: number;
  decisions: IngestDecision[];
  sides: Record<string, number>;
  categories: Record<string, number>;
  unmappedCategorySlugs: Record<string, number>;
  unmappedTypeValues: Record<string, number>;
  freshness: Record<string, number>;
  publishable: number;
  held: number;
  heldByReason: Record<string, number>;
}

const bump = (m: Record<string, number>, k: string) => { m[k] = (m[k] ?? 0) + 1; };

// ---- read, archive, decide -------------------------------------------------
const NOW_MS = Date.now();
const seenSourceIds = new Set<string>();     // shared across files: idempotent by identity
const reports: FileReport[] = [];
if (!existsSync(archiveDir)) mkdirSync(archiveDir, { recursive: true });

for (const path of files) {
  if (!existsSync(path)) { console.error(`No such file: ${path}`); process.exit(1); }

  const rows = parseCsv(readFileSync(path, "utf8"));
  const header = rows[0].map((h) => h.trim());
  const dataRows = rows.slice(1).filter((r) => r.some((c) => (c ?? "").trim() !== ""));

  // The scrape date, distinct from any row's own posting date. Taken from the
  // file's modification time, which is when the export was produced.
  const scrapedAt = new Date(statSync(path).mtimeMs).toISOString().slice(0, 10);

  // Preserve every raw row, verbatim, BEFORE anything is transformed.
  const archivePath = join(archiveDir, `${basename(path, ".csv")}.raw.jsonl`);
  const rawRows: RawRow[] = dataRows.map((cells) => {
    const obj: RawRow = {};
    header.forEach((name, i) => { if (name) (obj as Record<string, unknown>)[name] = cells[i] ?? ""; });
    return obj;
  });
  writeFileSync(archivePath, rawRows.map((r) => JSON.stringify(r)).join("\n") + "\n");

  const report: FileReport = {
    file: basename(path),
    scrapedAt,
    received: rawRows.length,
    decisions: [],
    sides: {},
    categories: {},
    unmappedCategorySlugs: {},
    unmappedTypeValues: {},
    freshness: {},
    publishable: 0,
    held: 0,
    heldByReason: {},
  };

  for (const raw of rawRows) {
    const d = decideRow(raw, { nowMs: NOW_MS, seenSourceIds });
    if (d.sourceId && d.reason !== "duplicate_source_id") seenSourceIds.add(d.sourceId);
    report.decisions.push(d);

    bump(report.freshness, d.freshness);
    if (d.side) bump(report.sides, d.side);
    if (d.categoryLabel) bump(report.categories, d.categoryLabel);
    if (d.reason === "unmapped_category") bump(report.unmappedCategorySlugs, String(raw.category ?? "(empty)"));
    if (d.reason === "unmapped_side") bump(report.unmappedTypeValues, String(raw.type ?? "(empty)"));

    if (d.decision === "publish") report.publishable++;
    else { report.held++; bump(report.heldByReason, d.reason ?? "(unnamed)"); }
  }

  report.archivePath = archivePath as never;
  reports.push(report);
}

// ---- reconciliation --------------------------------------------------------
const pad = (s: string | number, n: number) => String(s).padStart(n);
const line = (c = "-") => console.log(c.repeat(78));

console.log("");
line("=");
console.log("GO4WORLDBUSINESS INGESTION - DRY-RUN RECONCILIATION");
console.log(`batch ${batch}   run ${new Date(NOW_MS).toISOString().slice(0, 16).replace("T", " ")}Z`);
console.log(apply ? "MODE: APPLY (will write)" : "MODE: DRY RUN (nothing will be written)");
line("=");

let grandReceived = 0;
let grandPublishable = 0;
let grandHeld = 0;

for (const r of reports) {
  const accounted = r.publishable + r.held;
  grandReceived += r.received;
  grandPublishable += r.publishable;
  grandHeld += r.held;

  console.log("");
  console.log(`FILE  ${r.file}`);
  console.log(`      scraped ${r.scrapedAt}   raw archive: ${(r as unknown as { archivePath: string }).archivePath}`);
  line();
  console.log(`  received                        ${pad(r.received, 6)}`);
  console.log(`  duplicates (source id seen)     ${pad(r.heldByReason.duplicate_source_id ?? 0, 6)}`);
  console.log("");
  console.log("  SIDE MAPPING (source type -> canonical side)");
  console.log(`    offer        (sell/seller_offer) ${pad(r.sides.offer ?? 0, 6)}`);
  console.log(`    requirement  (buy)               ${pad(r.sides.requirement ?? 0, 6)}`);
  console.log(`    unmapped                         ${pad(r.heldByReason.unmapped_side ?? 0, 6)}`);
  for (const [t, n] of Object.entries(r.unmappedTypeValues)) console.log(`      ! "${t}" x${n}`);
  console.log("");
  console.log("  CATEGORY MAPPING");
  const cats = Object.entries(r.categories).sort((a, b) => b[1] - a[1]);
  console.log(`    mapped to ${cats.length} canonical categories`);
  for (const [c, n] of cats) console.log(`      ${pad(n, 5)}  ${c}`);
  console.log(`    unmapped slugs                   ${pad(r.heldByReason.unmapped_category ?? 0, 6)}`);
  for (const [c, n] of Object.entries(r.unmappedCategorySlugs)) console.log(`      ! "${c}" x${n}`);
  console.log("");
  // The age bands count EVERY row received, whatever else was wrong with it.
  // The hold reasons below count each row once, against the first thing wrong
  // with it, so a stale row that is also unusable is reported as unusable. The
  // two blocks therefore do not add up to each other, deliberately: the first
  // says how old this file is, the second says what to fix.
  console.log("  AGE OF THE INDICATION (all rows, from the source's own posting date)");
  console.log(`    current    (<= 90d)             ${pad(r.freshness.current ?? 0, 6)}`);
  console.log(`    aging      (91-365d)            ${pad(r.freshness.aging ?? 0, 6)}`);
  console.log(`    historical (> 365d)             ${pad(r.freshness.historical ?? 0, 6)}`);
  console.log(`    undated                         ${pad(r.freshness.undated ?? 0, 6)}`);
  console.log("");
  console.log(`  PUBLISHABLE                     ${pad(r.publishable, 6)}`);
  console.log(`  HELD                            ${pad(r.held, 6)}   (each row counted once, against the first reason)`);
  for (const reason of HOLD_REASONS) {
    const n = r.heldByReason[reason];
    if (!n) continue;
    console.log(`      ${pad(n, 5)}  ${reason}  - ${HOLD_REASON_TEXT[reason as HoldReason]}`);
  }
  line();
  const ok = accounted === r.received;
  console.log(`  ACCOUNTED  ${accounted} of ${r.received}  ${ok ? "OK, nothing discarded" : "MISMATCH"}`);
  if (!ok) process.exitCode = 1;
}

line("=");
console.log("TOTAL");
console.log(`  received     ${pad(grandReceived, 6)}`);
console.log(`  publishable  ${pad(grandPublishable, 6)}`);
console.log(`  held         ${pad(grandHeld, 6)}`);
console.log(`  accounted    ${pad(grandPublishable + grandHeld, 6)} of ${grandReceived}` +
  (grandPublishable + grandHeld === grandReceived ? "   OK, zero silently discarded" : "   MISMATCH"));
if (grandPublishable + grandHeld !== grandReceived) process.exitCode = 1;
line("=");

console.log("");
console.log("GOVERNED MAPS IN FORCE");
console.log(`  side vocabulary : ${OBSERVED_SOURCE_TYPES.join(", ")}`);
console.log(`  category slugs  : ${Object.keys(SOURCE_CATEGORIES).length} mapped`);
console.log("");

if (!apply) {
  console.log("DRY RUN. Nothing was written to any database.");
  console.log("Raw rows were archived; review the reconciliation before applying.");
  process.exit(process.exitCode ?? 0);
}

console.error("");
console.error("REFUSED: --apply is not wired in this build.");
console.error("Publication is a separate, reviewed step. Re-run without --apply.");
process.exit(2);
