import test from "node:test";
import assert from "node:assert/strict";
import { decideRow, type IngestDecision, type RawRow } from "../ingest";
import {
  confirmationPhraseFor,
  decisionVector,
  preflight,
  rulesFingerprint,
  sha256,
  validateStaged,
  type BatchManifest,
  type PreflightInput,
  type SourceFileFingerprint,
  type StagedRow,
} from "../publication-contract";

/**
 * The last thing standing between a reviewed decision and a stranger's
 * commercial indication appearing on Ponte's public board.
 *
 * Every refusal below is asserted rather than trusted. The nine the controller
 * required are here by name: changed source file, changed checksum, changed
 * count, freshness drift after review, wrong environment, missing confirmation,
 * repeated batch, failed validation publishes nothing, and a held row is never
 * public.
 */

const REVIEWED_MS = Date.parse("2026-08-08T00:00:00.000Z");

const row = (over: Partial<RawRow> = {}): RawRow => ({
  deal_id: "PONTE-SUP-1",
  type: "sell",
  product: "Basmati Rice",
  category: "rice-grains",
  quantity: "20 Metric Tonnes",
  incoterms: "FOB",
  destination_country: "",
  raw_description: "",
  posted_date: "Aug-01-26",
  ...over,
});

/** Two publishable rows and one held, so counts are never coincidentally equal. */
const INPUT: RawRow[] = [
  row({ deal_id: "A-1" }),
  row({ deal_id: "A-2", type: "buy", quantity: "", incoterms: "", destination_country: "Oman" }),
  row({ deal_id: "A-3", quantity: "", incoterms: "", raw_description: "" }), // offer_not_actionable
];

function decide(input: RawRow[], nowMs: number): IngestDecision[] {
  const seen = new Set<string>();
  return input.map((r) => {
    const d = decideRow(r, { nowMs, seenSourceIds: seen });
    if (d.sourceId && d.reason !== "duplicate_source_id") seen.add(d.sourceId);
    return d;
  });
}

const FILES: SourceFileFingerprint[] = [{ name: "a.csv", sha256: "a".repeat(64), bytes: 1234, rows: 3 }];
const RULES = rulesFingerprint([{ path: "lib/x.ts", text: "the reviewed rules" }]);

function manifestFor(nowMs = REVIEWED_MS): BatchManifest {
  const decisions = decide(INPUT, nowMs);
  return {
    batchId: "TEST-2026-08-08",
    environment: "production",
    projectRef: "cptglsmjmzcfpjndqfmc",
    reviewedAtMs: nowMs,
    reviewedAtIso: new Date(nowMs).toISOString(),
    sourceFiles: FILES,
    rulesFingerprint: RULES,
    decisionChecksum: sha256(decisionVector(decisions)),
    received: decisions.length,
    publishable: decisions.filter((d) => d.decision === "publish").length,
    held: decisions.filter((d) => d.decision === "hold").length,
    freshnessDays: { current: 90, aging: 365 },
  };
}

function inputFor(over: Partial<PreflightInput> = {}, manifest = manifestFor()): PreflightInput {
  return {
    manifest,
    args: {
      batchId: manifest.batchId,
      expectPublishable: manifest.publishable,
      environment: "production",
      confirmation: confirmationPhraseFor(manifest.batchId),
    },
    resolvedProjectRef: manifest.projectRef,
    actualSourceFiles: FILES,
    actualRulesFingerprint: RULES,
    reviewedClockDecisions: decide(INPUT, manifest.reviewedAtMs),
    executionClockDecisions: decide(INPUT, manifest.reviewedAtMs),
    ...over,
  };
}

// ---- the happy path, so the refusals below mean something -------------------

test("a reviewed batch, unchanged, passes preflight", () => {
  const r = preflight(inputFor());
  assert.equal(r.ok, true);
  assert.deepEqual((r as { publishableSourceIds: string[] }).publishableSourceIds, ["A-1", "A-2"]);
});

// ---- the nine required refusals ---------------------------------------------

test("changed source file -> abort", () => {
  for (const changed of [
    { ...FILES[0], sha256: "b".repeat(64) },
    { ...FILES[0], bytes: 9999 },
    { ...FILES[0], rows: 4 },
  ]) {
    const r = preflight(inputFor({ actualSourceFiles: [changed] }));
    assert.equal(r.ok, false);
    assert.equal((r as { reason: string }).reason, "source_file_changed");
  }
});

test("a different set of source files -> abort", () => {
  const r = preflight(inputFor({ actualSourceFiles: [{ ...FILES[0], name: "b.csv" }] }));
  assert.equal(r.ok, false);
  assert.equal((r as { reason: string }).reason, "source_file_set_changed");
});

test("changed decision checksum -> abort", () => {
  // The manifest says one thing; re-deciding the reviewed input says another.
  const m = { ...manifestFor(), decisionChecksum: sha256("something else entirely") };
  const r = preflight(inputFor({}, m));
  assert.equal(r.ok, false);
  assert.equal((r as { reason: string }).reason, "decision_checksum_changed");
});

test("changed governing rules -> abort", () => {
  // Same files, same decisions, different code. The batch is not the reviewed one.
  const r = preflight(inputFor({ actualRulesFingerprint: rulesFingerprint([{ path: "lib/x.ts", text: "widened window" }]) }));
  assert.equal(r.ok, false);
  assert.equal((r as { reason: string }).reason, "rules_changed");
});

test("changed publishable count -> abort", () => {
  const r = preflight(inputFor({ args: { ...inputFor().args, expectPublishable: 99 } }));
  assert.equal(r.ok, false);
  assert.equal((r as { reason: string }).reason, "publishable_count_changed");
});

test("freshness change after review -> abort, and never a smaller batch", () => {
  // The controller's case: a record crosses current -> aging between review and
  // execution. Publishing the remainder would mean the thing published is not
  // the thing approved, so the whole run stops.
  const manifest = manifestFor();
  const later = REVIEWED_MS + 200 * 86_400_000; // 200 days on
  const r = preflight(inputFor({ executionClockDecisions: decide(INPUT, later) }, manifest));
  assert.equal(r.ok, false);
  assert.equal((r as { reason: string }).reason, "decision_drift");
  assert.match((r as { detail: string }).detail, /decision\(s\) changed since review/);
});

test("wrong environment -> abort", () => {
  const r = preflight(inputFor({ args: { ...inputFor().args, environment: "staging" } }));
  assert.equal(r.ok, false);
  assert.equal((r as { reason: string }).reason, "wrong_environment");
});

test("a project other than the reviewed one -> abort", () => {
  const r = preflight(inputFor({ resolvedProjectRef: "someotherproject" }));
  assert.equal(r.ok, false);
  assert.equal((r as { reason: string }).reason, "project_ref_mismatch");
});

test("missing or approximate confirmation -> abort", () => {
  for (const c of [null, "", "yes", "publish", "PUBLISH TEST-2026-08-08 TO PRODUCTION", "publish TEST-2026-08-08 to prod"]) {
    const r = preflight(inputFor({ args: { ...inputFor().args, confirmation: c } }));
    assert.equal(r.ok, false, `"${c}" must not confirm`);
    assert.equal((r as { reason: string }).reason, "missing_confirmation");
  }
});

test("a batch id other than the reviewed one -> abort", () => {
  const r = preflight(inputFor({ args: { ...inputFor().args, batchId: "OTHER-BATCH" } }));
  assert.equal(r.ok, false);
  assert.equal((r as { reason: string }).reason, "batch_id_mismatch");
});

// ---- idempotency -------------------------------------------------------------

test("a repeated batch is idempotent: same input, same reviewed decisions", () => {
  // Re-running produces byte-identical decisions and the same eligible set, so
  // the upsert on source identity is a refresh and never a duplicate.
  const first = preflight(inputFor());
  const second = preflight(inputFor());
  assert.equal(first.ok, true);
  assert.equal(second.ok, true);
  assert.deepEqual(
    (first as { publishableSourceIds: string[] }).publishableSourceIds,
    (second as { publishableSourceIds: string[] }).publishableSourceIds,
  );
  assert.equal(
    sha256(decisionVector(decide(INPUT, REVIEWED_MS))),
    sha256(decisionVector(decide(INPUT, REVIEWED_MS))),
  );
});

test("the decision vector is order independent, so file order cannot change the checksum", () => {
  const forward = decisionVector(decide(INPUT, REVIEWED_MS));
  const reversed = decisionVector(decide([...INPUT].reverse(), REVIEWED_MS));
  assert.equal(sha256(forward), sha256(reversed));
});

// ---- post-stage validation ---------------------------------------------------

const staged = (over: Partial<StagedRow> = {}): StagedRow => ({
  canonical_signal_id: "A-1",
  status: "private",
  side: "offer",
  market_family: "products",
  spotted_at: "2026-08-01",
  ai_description: null,
  import_meta: { publication: "staged", hold_reason: null, intent: "offer_product", ingested_at: "2026-08-08T00:00:00Z" },
  ...over,
});
const heldRow = (over: Partial<StagedRow> = {}): StagedRow =>
  staged({
    canonical_signal_id: "A-3",
    import_meta: { publication: "held", hold_reason: "offer_not_actionable", intent: "offer_product", ingested_at: "2026-08-08T00:00:00Z" },
    ...over,
  });

function goodRows(): StagedRow[] {
  return [
    staged({ canonical_signal_id: "A-1" }),
    staged({ canonical_signal_id: "A-2", side: "requirement", import_meta: { publication: "staged", hold_reason: null, intent: "source_product", ingested_at: "2026-08-08T00:00:00Z" } }),
    heldRow(),
  ];
}

test("a correctly staged batch validates", () => {
  const v = validateStaged(manifestFor(), goodRows());
  assert.equal(v.ok, true, JSON.stringify(v.failures));
  assert.equal(v.eligible, 2);
  assert.equal(v.held, 1);
});

test("failed validation -> nothing public: a staged row already public is caught", () => {
  const rows = goodRows();
  rows[0] = staged({ status: "approved_signal" });
  const v = validateStaged(manifestFor(), rows);
  assert.equal(v.ok, false);
  assert.ok(v.failures.some((f) => f.failure === "staged_row_is_public"));
});

test("a held row that is public -> validation fails, so activation cannot proceed", () => {
  const rows = goodRows();
  rows[2] = heldRow({ status: "approved_signal" });
  const v = validateStaged(manifestFor(), rows);
  assert.equal(v.ok, false);
  assert.ok(v.failures.some((f) => f.failure === "held_row_is_public"));
});

test("source prose in a public description field -> validation fails", () => {
  const rows = goodRows();
  rows[0] = staged({ ai_description: "Product Description The buyer would like to receive quotations" });
  const v = validateStaged(manifestFor(), rows);
  assert.equal(v.ok, false);
  assert.ok(v.failures.some((f) => f.failure === "prose_in_public_field"));
});

test("a side that disagrees with its canonical intent -> validation fails", () => {
  const rows = goodRows();
  rows[0] = staged({ side: "requirement" }); // intent still offer_product
  const v = validateStaged(manifestFor(), rows);
  assert.equal(v.ok, false);
  assert.ok(v.failures.some((f) => f.failure === "side_intent_disagreement"));
});

test("a missing source identity or source date -> validation fails", () => {
  const noId = goodRows(); noId[0] = staged({ canonical_signal_id: null });
  assert.ok(validateStaged(manifestFor(), noId).failures.some((f) => f.failure === "missing_source_identity"));

  const noDate = goodRows(); noDate[0] = staged({ spotted_at: null });
  assert.ok(validateStaged(manifestFor(), noDate).failures.some((f) => f.failure === "missing_source_date"));

  // The source date must be preserved SEPARATELY from the ingestion date.
  const noIngest = goodRows();
  noIngest[0] = staged({ import_meta: { publication: "staged", intent: "offer_product", ingested_at: null } });
  assert.ok(validateStaged(manifestFor(), noIngest).failures.some((f) => f.failure === "missing_source_date"));
});

test("a count that does not match the reviewed batch -> validation fails", () => {
  const short = goodRows().slice(0, 2);
  const v = validateStaged(manifestFor(), short);
  assert.equal(v.ok, false);
  assert.ok(v.failures.some((f) => f.failure === "staged_count_mismatch"));
});

test("the confirmation phrase is bound to the batch id", () => {
  assert.equal(confirmationPhraseFor("G4WB-2026-08-06"), "publish G4WB-2026-08-06 to production");
  assert.notEqual(confirmationPhraseFor("A"), confirmationPhraseFor("B"));
});
