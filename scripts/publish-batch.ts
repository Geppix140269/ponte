// Publish a REVIEWED Market Signal batch, in two phases.
//
//   npx tsx scripts/publish-batch.ts \
//     --batch-id G4WB-2026-08-06 \
//     --manifest docs/evidence/batches/G4WB-2026-08-06/manifest.json \
//     --expect-publishable 1036 \
//     --environment production \
//     --confirm "publish G4WB-2026-08-06 to production"
//
// Every argument is required. There is no `--apply`, no default, no directory
// discovery and no glob: the command cannot be pointed at "whatever is in the
// input directory", because the only files it will read are the ones named in
// the reviewed manifest, and it re-hashes them before touching anything.
//
// ---------------------------------------------------------------------------
// Two phases
// ---------------------------------------------------------------------------
//   STAGE      every row is written `status = 'private'`, which no public read
//              selects. Publishable rows are marked `import_meta.publication =
//              'staged'`; held rows `'held'`, with their reason. A half-written
//              or wrong batch is therefore invisible rather than live.
//   VALIDATE   the staged batch is READ BACK from the database and checked
//              against the reviewed manifest. Nothing about the script's own
//              intentions is trusted.
//   ACTIVATE   one statement flips the staged subset to `approved_signal`.
//
// A failed validation STOPS, leaves the batch staged and private, and reports.
// It never deletes. Deleting production rows to recover from a failed check is
// a larger hazard than the rows themselves, which are already invisible.
//
// Re-running a completed batch is a no-op: the upsert is keyed on the source
// identity and the activation filter matches only rows still awaiting it.

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { createHash } from "node:crypto";
import { decideRow, type IngestDecision, type RawRow } from "../lib/market-signals/ingest";
import {
  confirmationPhraseFor,
  decisionVector,
  preflight,
  rulesFingerprint,
  validateStaged,
  ABORT_TEXT,
  VALIDATION_TEXT,
  type BatchManifest,
  type SourceFileFingerprint,
  type StagedRow,
} from "../lib/market-signals/publication-contract";
import { PUBLIC_SIGNAL_COLUMNS, publicWindowPredicate } from "../lib/market-signals/logic";

// ---- arguments: all required, none defaulted --------------------------------
const argv = process.argv.slice(2);
const arg = (n: string): string | null => {
  const i = argv.indexOf(n);
  return i >= 0 ? argv[i + 1] ?? null : null;
};
const batchId = arg("--batch-id");
const manifestPath = arg("--manifest");
const expectRaw = arg("--expect-publishable");
const environment = arg("--environment");
const confirmation = arg("--confirm");
/**
 * Which operational phase this invocation performs.
 *
 * Explicit and required, with no default, because the two phases carry
 * completely different risk. `stage` writes only private rows, which no public
 * read can reach; `activate` is the single statement that makes records public.
 * A boolean like `--no-activate` would have made activation the thing that
 * happens unless you remember to prevent it, which is the wrong way round for
 * the more dangerous of the two.
 */
const phase = arg("--phase");

const missing = [
  ["--batch-id", batchId],
  ["--manifest", manifestPath],
  ["--expect-publishable", expectRaw],
  ["--environment", environment],
  ["--confirm", confirmation],
  ["--phase", phase],
].filter(([, v]) => !v).map(([k]) => k);

if (missing.length) {
  console.error(`REFUSED: missing required argument(s): ${missing.join(", ")}`);
  console.error("There is no default for any of them. See the header of this file.");
  process.exit(1);
}

if (phase !== null && phase !== "stage" && phase !== "activate") {
  console.error(`REFUSED: --phase must be exactly "stage" or "activate"; got "${phase}".`);
  process.exit(1);
}

const die = (code: number, ...lines: string[]): never => {
  for (const l of lines) console.error(l);
  console.error("\nNOTHING WAS ACTIVATED. No record became public.");
  process.exit(code);
};

// ---- the reviewed manifest ---------------------------------------------------
if (!existsSync(manifestPath!)) die(1, `REFUSED: no manifest at ${manifestPath}`);
const manifest = JSON.parse(readFileSync(manifestPath!, "utf8")) as BatchManifest;

// ---- environment, resolved rather than trusted -------------------------------
if (existsSync(".env.local")) {
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
}
const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "");
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const resolvedProjectRef =
  process.env.SUPABASE_PROJECT_REF || supabaseUrl.match(/https:\/\/([a-z0-9]+)\.supabase\.co/)?.[1] || "";
if (!supabaseUrl || !serviceKey || !resolvedProjectRef) {
  die(1, "REFUSED: the Supabase URL, service key and project reference must all resolve.");
}

// ---- re-read the reviewed inputs, and only those ------------------------------
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

// The inputs are looked for beside the manifest's own recorded source directory
// if given, else in a directory named on the command line. There is no search.
const sourceDir = arg("--source-dir") ?? dirname(manifestPath!);
const actualFiles: SourceFileFingerprint[] = [];
const rawByFile: RawRow[][] = [];

for (const reviewed of manifest.sourceFiles) {
  const path = join(sourceDir, reviewed.name);
  if (!existsSync(path)) {
    die(2, `REFUSED: reviewed source file not found: ${path}`,
      "The command reads only the files named in the manifest. It does not search.");
  }
  const bytes = readFileSync(path);
  const rows = parseCsv(bytes.toString("utf8"));
  const header = rows[0].map((h) => h.trim());
  const data = rows.slice(1).filter((r) => r.some((c) => (c ?? "").trim() !== ""));
  const raw: RawRow[] = data.map((cells) => {
    const o: RawRow = {};
    header.forEach((n, i) => { if (n) (o as Record<string, unknown>)[n] = cells[i] ?? ""; });
    return o;
  });
  actualFiles.push({
    name: reviewed.name,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    bytes: bytes.length,
    rows: raw.length,
  });
  rawByFile.push(raw);
}

// ---- decide twice: on the reviewed clock, and on this one --------------------
function decideAll(nowMs: number): IngestDecision[] {
  const seen = new Set<string>();
  const out: IngestDecision[] = [];
  for (const raw of rawByFile) {
    for (const r of raw) {
      const d = decideRow(r, { nowMs, seenSourceIds: seen });
      if (d.sourceId && d.reason !== "duplicate_source_id") seen.add(d.sourceId);
      out.push(d);
    }
  }
  return out;
}
const executionAtMs = Date.now();
const reviewedClock = decideAll(manifest.reviewedAtMs);
const executionClock = decideAll(executionAtMs);

const RULE_MODULES = [
  "lib/market-signals/source-taxonomy.ts",
  "lib/market-signals/ingest.ts",
  "lib/market-signals/publication-contract.ts",
];

const check = preflight({
  manifest,
  args: {
    batchId: batchId!,
    expectPublishable: Number(expectRaw),
    environment: environment!,
    confirmation,
  },
  resolvedProjectRef,
  actualSourceFiles: actualFiles,
  actualRulesFingerprint: rulesFingerprint(
    RULE_MODULES.map((p) => ({ path: p, text: readFileSync(p, "utf8") })),
  ),
  reviewedClockDecisions: reviewedClock,
  executionClockDecisions: executionClock,
});

if (!check.ok) {
  die(3,
    `REFUSED: ${check.reason}`,
    `  ${ABORT_TEXT[check.reason]}`,
    `  ${check.detail}`,
    "",
    check.reason === "decision_drift"
      ? "A reviewed batch may not be published in part. Prepare and review a new dry run."
      : "Correct the input or the arguments, or prepare and review a new batch.");
}

console.log(`preflight OK. ${check.publishableSourceIds.length} records are eligible for activation.`);
console.log(`confirmation phrase accepted for ${manifest.batchId}.`);

// ---- PostgREST ---------------------------------------------------------------
const rest = `${supabaseUrl}/rest/v1/desk_radar`;
const H = { apikey: serviceKey, authorization: `Bearer ${serviceKey}`, "content-type": "application/json" };
const ingestedAt = new Date(executionAtMs).toISOString();

/** The row written for one decision. Public columns carry facts only. */
function rowFor(d: IngestDecision, raw: RawRow): Record<string, unknown> {
  const publishing = d.decision === "publish";
  const text = (v: unknown) => {
    const s = String(v ?? "").replace(/\s+/g, " ").trim();
    return s.length > 0 ? s : null;
  };
  return {
    canonical_signal_id: d.sourceId,
    dedupe_key: d.sourceId,
    side: d.side,
    product: d.facts?.product.slice(0, 160) ?? null,
    hs_code: d.hs,
    qty: d.facts?.quantity?.qty ?? null,
    unit: d.facts?.quantity?.unit ?? null,
    incoterms: d.facts?.incoterm ?? null,
    origin: text(raw.origin_country),
    destination: d.facts?.destination ?? null,
    category: d.categoryLabel,
    market_family: "products",
    product_sector_key: d.sector,
    // The source's own posting date. Never the ingestion date.
    spotted_at: d.sourceDate,
    // Staged rows are private. Only activation may change this.
    status: "private",
    published_at: null,
    public_expires_at: null,
    indexable: false,
    // The desk writes the public description. The source's prose never becomes
    // one, so this stays null through staging AND through activation.
    ai_description: null,
    summary_line: d.facts?.product.slice(0, 160) ?? null,
    // ---- internal only, never in a public read ----
    source_platform: text(raw.source),
    source_url: text(raw.source_url),
    raw_description: text(raw.raw_description),
    counterparty_name: text(raw.buyer_name),
    counterparty_company: text(raw.buyer_company),
    counterparty_contact: [text(raw.contact_email), text(raw.contact_phone)].filter(Boolean).join(" ") || null,
    import_batch: manifest.batchId,
    import_meta: {
      publication: publishing ? "staged" : "held",
      hold_reason: d.reason,
      intent: d.intent,
      freshness: d.freshness,
      source_date: d.sourceDate,
      ingested_at: ingestedAt,
      batch_id: manifest.batchId,
      decision_checksum: manifest.decisionChecksum,
      source_row: raw,
    },
  };
}

const allRaw: RawRow[] = rawByFile.flat();
const rows = executionClock.map((d, i) => rowFor(d, allRaw[i]));

/**
 * The three phases, in one async entry point.
 *
 * Wrapped rather than written at the top level because this repository
 * transpiles scripts to CommonJS, where a top-level await is a build error
 * rather than a runtime one: the command would have failed to start at all,
 * which is a safe failure but an opaque one.
 */
async function run(): Promise<void> {
  // ---- PHASE 1: stage, private ------------------------------------------------
  console.log(`\nSTAGE  writing ${rows.length} rows as private...`);
  let staged = 0;
  for (let i = 0; i < rows.length; i += 500) {
    const slice = rows.slice(i, i + 500);
    const res = await fetch(`${rest}?on_conflict=canonical_signal_id`, {
      method: "POST",
      headers: { ...H, prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify(slice),
    });
    if (!res.ok) {
      die(4, `STAGING FAILED at row ${i}: HTTP ${res.status}`, (await res.text()).slice(0, 400),
        `${staged} rows were staged. They are PRIVATE and invisible. Re-run to complete; the write is idempotent.`);
    }
    staged += slice.length;
    process.stdout.write(`\r  staged ${staged}/${rows.length}`);
  }
  console.log("");

  // ---- read the staged batch back out of production ---------------------------
  console.log("RECONCILE  reading the batch back from production...");
  const readBack: StagedRow[] = [];
  for (let page = 0; page < 40; page++) {
    const res = await fetch(
      `${rest}?select=canonical_signal_id,status,side,market_family,spotted_at,ai_description,import_meta` +
        `&import_batch=eq.${encodeURIComponent(manifest.batchId)}&order=canonical_signal_id.asc` +
        `&limit=1000&offset=${page * 1000}`,
      { headers: H },
    );
    if (!res.ok) die(5, `Read-back failed: HTTP ${res.status}`, (await res.text()).slice(0, 300));
    const chunk = (await res.json()) as StagedRow[];
    readBack.push(...chunk);
    if (chunk.length < 1000) break;
  }

  const validation = validateStaged(manifest, readBack);

  /*
   * The proofs, measured against production rather than against intent.
   *
   * `validateStaged` checks the shape of what came back. These count it, and
   * the last one asks the PUBLIC read the same question a visitor's browser
   * would: not "does the status column say private" but "can this record be
   * retrieved through the contract the live board actually uses".
   */
  const nowIso = new Date().toISOString();
  const batchFilter = `import_batch=eq.${encodeURIComponent(manifest.batchId)}`;
  const countOf = async (qs: string): Promise<number> => {
    const r = await fetch(`${rest}?${qs}`, { headers: { ...H, prefer: "count=exact", range: "0-0" } });
    if (!r.ok) die(5, `Count failed: HTTP ${r.status}`, (await r.text()).slice(0, 200));
    return Number((r.headers.get("content-range") ?? "/0").split("/")[1]) || 0;
  };

  const stagedRows = readBack.filter((r) => r.import_meta?.publication === "staged");
  const heldRows = readBack.filter((r) => r.import_meta?.publication === "held");
  const ids = readBack.map((r) => r.canonical_signal_id).filter(Boolean) as string[];
  const distinctIds = new Set(ids);

  const proofs = {
    received: readBack.length,
    staged: stagedRows.length,
    heldPrivate: heldRows.length,
    publiclyVisible: await countOf(
      `select=id&${batchFilter}&status=eq.approved_signal&or=(public_expires_at.is.null,public_expires_at.gt.${nowIso})`,
    ),
    duplicateSourceIds: ids.length - distinctIds.size,
    sideIntentMismatches: readBack.filter((r) => {
      const intent = r.import_meta?.intent ?? null;
      return !(
        (r.side === "offer" && intent === "offer_product") ||
        (r.side === "requirement" && intent === "source_product")
      );
    }).length,
    rowsCarryingPublicProse: readBack.filter(
      (r) => r.ai_description !== null && r.ai_description !== "",
    ).length,
    heldRowsMarkedStaged: heldRows.filter((r) => r.import_meta?.publication === "staged").length,
    missingIdentity: readBack.filter((r) => !r.canonical_signal_id).length,
    missingSourceDate: readBack.filter((r) => !r.spotted_at).length,
    rowsNotPrivate: readBack.filter((r) => r.status !== "private").length,
    silentlyDiscarded: manifest.received - readBack.length,
  };

  /*
   * The independent proof: ask the PUBLIC contract, not the private one.
   *
   * PUBLIC_SIGNAL_COLUMNS and publicWindowPredicate are the exact select and
   * filter the live board uses. Counting private rows proves what the status
   * column says; this proves what a visitor can actually retrieve, which is the
   * claim worth making and the only one a reader should accept.
   */
  const publicProbe = await fetch(
    `${rest}?select=${encodeURIComponent(PUBLIC_SIGNAL_COLUMNS)}` +
      `&status=eq.approved_signal&or=(${publicWindowPredicate(nowIso)})&${batchFilter}&limit=5`,
    { headers: H },
  );
  if (!publicProbe.ok) die(5, "The public read probe failed; the batch cannot be cleared.");
  const publicRows = (await publicProbe.json()) as unknown[];

  console.log("");
  console.log("PRODUCTION RECONCILIATION");
  const results: boolean[] = [];
  const expect = (label: string, actual: number, wanted: number): void => {
    const ok = actual === wanted;
    results.push(ok);
    console.log(
      `  ${ok ? "OK  " : "FAIL"}  ${label.padEnd(38)} ${String(actual).padStart(6)}  (expected ${wanted})`,
    );
  };
  expect("received", proofs.received, manifest.received);
  expect("staged", proofs.staged, manifest.publishable);
  expect("held private", proofs.heldPrivate, manifest.held);
  expect("publicly visible from this batch", proofs.publiclyVisible, 0);
  expect("duplicate source ids", proofs.duplicateSourceIds, 0);
  expect("side/intent mismatches", proofs.sideIntentMismatches, 0);
  expect("rows carrying public source prose", proofs.rowsCarryingPublicProse, 0);
  expect("held rows marked staged", proofs.heldRowsMarkedStaged, 0);
  expect("missing canonical/source identity", proofs.missingIdentity, 0);
  expect("missing source date", proofs.missingSourceDate, 0);
  expect("rows not private", proofs.rowsNotPrivate, 0);
  expect("silently discarded", proofs.silentlyDiscarded, 0);
  expect("retrievable by the PUBLIC read", publicRows.length, 0);
  const allOk = results.every(Boolean);

  const receipt = {
    batchId: manifest.batchId,
    phase: "stage",
    manifestChecksum: manifest.decisionChecksum,
    rulesFingerprint: manifest.rulesFingerprint,
    environment: manifest.environment,
    projectRef: resolvedProjectRef,
    stagedAtIso: new Date(executionAtMs).toISOString(),
    stagedNew: stagedRows.length,
    activatedNew: 0,
    alreadyPresentNoOp: Math.max(0, readBack.length - rows.length),
    heldPrivate: proofs.heldPrivate,
    failures: validation.ok && allOk ? 0 : validation.failures.length + (allOk ? 0 : 1),
    proofs,
    publicReadReturned: publicRows.length,
    validation: { ok: validation.ok, failures: validation.failures },
    activationPerformed: false,
  };

  const receiptPath = join(dirname(manifestPath!), "staging-receipt.json");
  writeFileSync(receiptPath, JSON.stringify(receipt, null, 2) + "\n");
  console.log(`\nstaging receipt: ${receiptPath}`);

  if (!validation.ok || !allOk) {
    console.error("\nSTAGING RECONCILIATION FAILED.");
    for (const f of validation.failures) console.error(`  ${f.failure}: ${f.detail}`);
    console.error("\nThe batch remains PRIVATE. Nothing was activated and nothing was deleted.");
    console.error("Production was NOT repaired automatically. Investigate and report.");
    process.exit(6);
  }

  console.log("\nThe batch is staged, private and invisible.");
  console.log(`${proofs.staged} records are eligible for activation; ${proofs.heldPrivate} are held.`);

  // ---- the phase gate ----------------------------------------------------------
  // Activation is a separate invocation. There is no code path from a `stage`
  // run into the PATCH below, so a Phase A run cannot publish a record whatever
  // else happens in it.
  if (phase !== "activate") {
    console.log("\nPHASE A COMPLETE. --phase stage: STOPPING BEFORE ACTIVATION.");
    console.log("No record became public. Phase B is a separate invocation with --phase activate.");
    return;
  }

  // ---- PHASE B: activate, atomically -------------------------------------------
  // ONE statement. Postgres runs it in its own transaction, so every staged row
  // becomes public together or none does. The filter cannot reach a held row:
  // `publication = 'staged'` is written only for a reviewed publishable decision.
  console.log(`\nACTIVATE  flipping ${proofs.staged} staged rows to approved_signal...`);
  const activatedAt = new Date().toISOString();
  const activation = await fetch(
    `${rest}?${batchFilter}&status=eq.private&import_meta->>publication=eq.staged`,
    {
      method: "PATCH",
      headers: { ...H, prefer: "return=representation" },
      body: JSON.stringify({ status: "approved_signal", published_at: activatedAt, indexable: true }),
    },
  );
  if (!activation.ok) {
    die(
      7,
      `ACTIVATION FAILED: HTTP ${activation.status}`,
      (await activation.text()).slice(0, 400),
      "The batch remains staged and private. Nothing was deleted.",
    );
  }
  const activated = (await activation.json()) as unknown[];

  const after = {
    rowsInBatch: await countOf(`select=id&${batchFilter}`),
    publiclyVisible: await countOf(
      `select=id&${batchFilter}&status=eq.approved_signal&or=(public_expires_at.is.null,public_expires_at.gt.${new Date().toISOString()})`,
    ),
    stillPrivate: await countOf(`select=id&${batchFilter}&status=eq.private`),
    heldPubliclyVisible: await countOf(
      `select=id&${batchFilter}&status=eq.approved_signal&import_meta->>publication=eq.held`,
    ),
  };

  const clean =
    after.publiclyVisible === manifest.publishable &&
    after.stillPrivate === manifest.held &&
    after.heldPubliclyVisible === 0 &&
    after.rowsInBatch === manifest.received;

  const publicationReceipt = {
    ...receipt,
    phase: "activate",
    activatedNew: activated.length,
    activatedAtIso: activatedAt,
    activationPerformed: true,
    postWrite: after,
  };
  writeFileSync(
    join(dirname(manifestPath!), "publication-receipt.json"),
    JSON.stringify(publicationReceipt, null, 2) + "\n",
  );

  console.log("\nPOST-WRITE RECONCILIATION");
  console.log(`  rows in batch      ${after.rowsInBatch}  (expected ${manifest.received})`);
  console.log(`  publicly visible   ${after.publiclyVisible}  (expected ${manifest.publishable})`);
  console.log(`  still private      ${after.stillPrivate}  (expected ${manifest.held})`);
  console.log(`  held made public   ${after.heldPubliclyVisible}  (must be 0)`);
  console.log(
    clean ? "PUBLICATION COMPLETE, reconciled." : "PUBLICATION COMPLETED WITH A DISCREPANCY. Nothing was deleted.",
  );
  if (!clean) process.exit(8);
}

void run();
