// Prepare the immutable review artefacts for a Market Signal batch.
//
//   npx tsx scripts/prepare-batch.ts --batch-id G4WB-2026-08-06 \
//     --file "<a.csv>" --file "<b.csv>" [--archive <dir>]
//
// Writes docs/evidence/batches/<BATCH-ID>/{manifest.json,dry-run.json} and
// nothing else. It touches no database and it publishes nothing.
//
// The two artefacts are separate on purpose. `manifest.json` is what the
// publication command checks against and MUST NOT be rewritten after review:
// this script refuses to overwrite one. `dry-run.json` is the human-readable
// reconciliation beside it. A later real execution adds a third artefact,
// `publication-receipt.json`; it is never an amendment of the manifest.
//
// WHAT MAY NOT ENTER THE REPOSITORY: no source prose, no counterparty name,
// company or contact detail, no credential, no absolute path carrying a user
// name. The evidence carries identities, decisions and counts. The verbatim raw
// rows are archived OUTSIDE git, and the archive path is reported rather than
// recorded, so the evidence cannot become a second copy of the source.

import { readFileSync, writeFileSync, existsSync, mkdirSync, statSync } from "node:fs";
import { basename, join } from "node:path";
import { createHash } from "node:crypto";
import { decideRow, HOLD_REASONS, type IngestDecision, type RawRow } from "../lib/market-signals/ingest";
import { CURRENT_DAYS, AGING_DAYS } from "../lib/market-signals/ingest";
import {
  decisionVector,
  rulesFingerprint,
  sha256,
  type BatchManifest,
  type SourceFileFingerprint,
} from "../lib/market-signals/publication-contract";

const argv = process.argv.slice(2);
const arg = (name: string): string | null => {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] ?? null : null;
};
const files: string[] = [];
for (let i = 0; i < argv.length; i++) if (argv[i] === "--file") files.push(argv[++i]);

const batchId = arg("--batch-id");
const environment = arg("--environment") ?? "production";
const archiveDir = arg("--archive") ?? join(process.env.TEMP ?? ".", "ponte-ingest-archive");

if (!batchId || files.length === 0) {
  console.error("Usage: --batch-id <ID> --file <a.csv> [--file <b.csv>] [--environment production]");
  process.exit(1);
}
if (!/^[A-Z0-9][A-Z0-9-]{4,40}$/.test(batchId)) {
  console.error(`Batch id must be upper-case, digits and hyphens: got "${batchId}"`);
  process.exit(1);
}

/** The project this batch is bound to, read from the environment, never typed. */
function projectRefFromEnv(): string {
  if (existsSync(".env.local")) {
    for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
    }
  }
  const ref = process.env.SUPABASE_PROJECT_REF;
  const fromUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").match(/https:\/\/([a-z0-9]+)\.supabase\.co/)?.[1];
  const resolved = ref || fromUrl;
  if (!resolved) { console.error("Cannot resolve the Supabase project reference."); process.exit(1); }
  return resolved;
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let field = ""; let row: string[] = []; let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else quoted = false; } else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else if (c !== "\r") field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows;
}

const evidenceDir = join("docs", "evidence", "batches", batchId);
const manifestPath = join(evidenceDir, "manifest.json");
if (existsSync(manifestPath)) {
  console.error(`REFUSED: ${manifestPath} already exists.`);
  console.error("A reviewed manifest is immutable. Prepare a new batch id instead of rewriting it.");
  process.exit(2);
}
mkdirSync(evidenceDir, { recursive: true });
if (!existsSync(archiveDir)) mkdirSync(archiveDir, { recursive: true });

// One clock for the whole batch: the reviewed time basis.
const reviewedAtMs = Date.now();
const seen = new Set<string>();
const fingerprints: SourceFileFingerprint[] = [];
const allDecisions: IngestDecision[] = [];
const perFile: Record<string, unknown>[] = [];

for (const path of files) {
  if (!existsSync(path)) { console.error(`No such file: ${path}`); process.exit(1); }
  const bytes = readFileSync(path);
  const text = bytes.toString("utf8");
  const rows = parseCsv(text);
  const header = rows[0].map((h) => h.trim());
  const dataRows = rows.slice(1).filter((r) => r.some((c) => (c ?? "").trim() !== ""));

  const raw: RawRow[] = dataRows.map((cells) => {
    const o: RawRow = {};
    header.forEach((n, i) => { if (n) (o as Record<string, unknown>)[n] = cells[i] ?? ""; });
    return o;
  });

  // Preserve verbatim, outside the repository, before anything is transformed.
  writeFileSync(
    join(archiveDir, `${basename(path, ".csv")}.raw.jsonl`),
    raw.map((r) => JSON.stringify(r)).join("\n") + "\n",
  );

  fingerprints.push({
    name: basename(path),
    sha256: createHash("sha256").update(bytes).digest("hex"),
    bytes: bytes.length,
    rows: raw.length,
  });

  const decisions = raw.map((r) => {
    const d = decideRow(r, { nowMs: reviewedAtMs, seenSourceIds: seen });
    if (d.sourceId && d.reason !== "duplicate_source_id") seen.add(d.sourceId);
    return d;
  });
  allDecisions.push(...decisions);

  const count = (pred: (d: IngestDecision) => boolean) => decisions.filter(pred).length;
  const byReason: Record<string, number> = {};
  for (const r of HOLD_REASONS) {
    const n = count((d) => d.reason === r);
    if (n) byReason[r] = n;
  }
  const categories: Record<string, number> = {};
  for (const d of decisions) if (d.categoryLabel) categories[d.categoryLabel] = (categories[d.categoryLabel] ?? 0) + 1;

  perFile.push({
    file: basename(path),
    scrapedAt: new Date(statSync(path).mtimeMs).toISOString().slice(0, 10),
    received: decisions.length,
    sides: { offer: count((d) => d.side === "offer"), requirement: count((d) => d.side === "requirement") },
    categories,
    freshness: {
      current: count((d) => d.freshness === "current"),
      aging: count((d) => d.freshness === "aging"),
      historical: count((d) => d.freshness === "historical"),
      undated: count((d) => d.freshness === "undated"),
    },
    publishable: count((d) => d.decision === "publish"),
    held: count((d) => d.decision === "hold"),
    heldByReason: byReason,
    accounted: count((d) => d.decision === "publish") + count((d) => d.decision === "hold") === decisions.length,
  });
}

const publishable = allDecisions.filter((d) => d.decision === "publish");
const held = allDecisions.filter((d) => d.decision === "hold");
const vector = decisionVector(allDecisions);

const RULE_MODULES = [
  "lib/market-signals/source-taxonomy.ts",
  "lib/market-signals/ingest.ts",
  "lib/market-signals/publication-contract.ts",
];
const fingerprintOfRules = rulesFingerprint(
  RULE_MODULES.map((p) => ({ path: p, text: readFileSync(p, "utf8") })),
);

const manifest: BatchManifest = {
  batchId,
  environment,
  projectRef: projectRefFromEnv(),
  reviewedAtMs,
  reviewedAtIso: new Date(reviewedAtMs).toISOString(),
  sourceFiles: fingerprints,
  rulesFingerprint: fingerprintOfRules,
  decisionChecksum: sha256(vector),
  received: allDecisions.length,
  publishable: publishable.length,
  held: held.length,
  freshnessDays: { current: CURRENT_DAYS, aging: AGING_DAYS },
};

const heldByReason: Record<string, number> = {};
for (const r of HOLD_REASONS) {
  const n = held.filter((d) => d.reason === r).length;
  if (n) heldByReason[r] = n;
}

const dryRun = {
  batchId,
  reviewedAtIso: manifest.reviewedAtIso,
  decisionChecksum: manifest.decisionChecksum,
  rulesFingerprint: fingerprintOfRules,
  ruleModules: RULE_MODULES,
  freshnessDays: manifest.freshnessDays,
  totals: {
    received: manifest.received,
    publishable: manifest.publishable,
    held: manifest.held,
    accounted: manifest.publishable + manifest.held,
    silentlyDiscarded: manifest.received - (manifest.publishable + manifest.held),
  },
  heldByReason,
  perFile,
  // Identities only. These are Ponte-issued references, not source prose and
  // not counterparty data, and they are what makes the batch auditable.
  publishableSourceIds: publishable.map((d) => d.sourceId!).sort(),
};

writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
writeFileSync(join(evidenceDir, "dry-run.json"), JSON.stringify(dryRun, null, 2) + "\n");

console.log(`batch          ${batchId}`);
console.log(`environment    ${manifest.environment}  project ${manifest.projectRef}`);
console.log(`received       ${manifest.received}`);
console.log(`publishable    ${manifest.publishable}`);
console.log(`held           ${manifest.held}`);
console.log(`accounted      ${manifest.publishable + manifest.held} of ${manifest.received}` +
  (manifest.publishable + manifest.held === manifest.received ? "  OK, zero silently discarded" : "  MISMATCH"));
console.log(`checksum       ${manifest.decisionChecksum}`);
console.log(`rules          ${fingerprintOfRules}`);
console.log("");
console.log(`wrote ${manifestPath}`);
console.log(`wrote ${join(evidenceDir, "dry-run.json")}`);
console.log(`raw archive (outside git): ${archiveDir}`);
console.log("");
console.log("Nothing was written to any database.");
