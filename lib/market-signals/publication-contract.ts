import { createHash } from "node:crypto";
import type { IngestDecision } from "./ingest";

/**
 * The contract a reviewed batch must satisfy before any record becomes public,
 * and the validation that must pass before staged records are activated.
 *
 * Pure. No database, no filesystem, no network. The publication script wires
 * this to PostgREST and to disk; the tests drive it directly. That separation
 * is the point: every refusal below is asserted rather than trusted, because
 * each one is the last thing standing between a reviewed decision and a
 * stranger's commercial indication appearing on Ponte's public board.
 *
 * ---------------------------------------------------------------------------
 * Two phases, and why publication is not a write
 * ---------------------------------------------------------------------------
 * Publication is `reviewed batch -> staged write -> validation -> activation`.
 * The staged write lands every row `status = 'private'`, which no public read
 * selects, so a half-finished or wrong import is invisible rather than live.
 * Only after validation passes does a single statement flip the staged subset
 * to `approved_signal`.
 *
 * There is deliberately NO automatic rollback by deletion. A failed validation
 * leaves the batch staged and private and stops. Deleting production rows to
 * recover from a failed check is a second, larger hazard dressed as a safety
 * measure: the rows are already harmless, and an automated DELETE against
 * production is not.
 *
 * ---------------------------------------------------------------------------
 * Drift is an abort, never a smaller batch
 * ---------------------------------------------------------------------------
 * The reviewed decision vector is immutable. If re-deciding the same input at
 * execution time changes ANY row, including one crossing `current` to `aging`
 * because a week passed, the run aborts and a fresh dry run must be reviewed.
 * Quietly publishing the rows that still qualify would mean the thing published
 * is not the thing that was approved, and the difference would appear nowhere.
 */

// ---------------------------------------------------------------------------
// The decision vector and its checksum
// ---------------------------------------------------------------------------

/**
 * The reviewed decisions, as a stable, order-independent text.
 *
 * Sorted by source id so two runs over the same input produce identical bytes
 * whatever order the rows arrived in. Each line carries the identity, the
 * decision, the reason and the freshness band, because a row that stays
 * published but changes band has still changed, and the checksum must see it.
 */
export function decisionVector(decisions: readonly IngestDecision[]): string {
  return decisions
    .map((d) =>
      [
        d.sourceId ?? "(none)",
        d.decision,
        d.reason ?? "-",
        d.freshness,
        d.side ?? "-",
        d.categoryLabel ?? "-",
      ].join("\t"),
    )
    .sort()
    .join("\n");
}

export function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

/**
 * A fingerprint of the rules that produced the decisions.
 *
 * The input files and the decisions can both be unchanged while the CODE that
 * maps between them has changed: a widened freshness window or an added
 * category slug would produce a different batch from identical bytes. Hashing
 * the governing modules makes that visible, so "the rules are the reviewed
 * rules" is checked rather than assumed.
 */
export function rulesFingerprint(moduleSources: readonly { path: string; text: string }[]): string {
  return sha256(
    moduleSources
      .slice()
      .sort((a, b) => a.path.localeCompare(b.path))
      .map((m) => `${m.path}\n${sha256(m.text)}`)
      .join("\n"),
  );
}

// ---------------------------------------------------------------------------
// The reviewed manifest
// ---------------------------------------------------------------------------

export interface SourceFileFingerprint {
  /** Basename only. A full path can carry a username. */
  name: string;
  sha256: string;
  bytes: number;
  rows: number;
}

export interface BatchManifest {
  batchId: string;
  /** The environment this batch was reviewed for. */
  environment: string;
  /** The Supabase project reference the batch is bound to. */
  projectRef: string;
  /** The clock used for freshness at review, so the vector is reproducible. */
  reviewedAtMs: number;
  reviewedAtIso: string;
  sourceFiles: SourceFileFingerprint[];
  rulesFingerprint: string;
  decisionChecksum: string;
  received: number;
  publishable: number;
  held: number;
  /** Freshness bands in force at review, recorded so a change is visible. */
  freshnessDays: { current: number; aging: number };
}

export type AbortReason =
  | "batch_id_mismatch"
  | "missing_confirmation"
  | "wrong_environment"
  | "project_ref_mismatch"
  | "source_file_set_changed"
  | "source_file_changed"
  | "rules_changed"
  | "decision_checksum_changed"
  | "decision_drift"
  | "publishable_count_changed"
  | "accounting_mismatch";

export const ABORT_TEXT: Readonly<Record<AbortReason, string>> = {
  batch_id_mismatch: "the batch id given does not match the reviewed manifest",
  missing_confirmation: "the exact production confirmation phrase was not given",
  wrong_environment: "the environment given does not match the reviewed manifest",
  project_ref_mismatch: "the resolved project does not match the one the batch was reviewed against",
  source_file_set_changed: "the set of source files is not the reviewed set",
  source_file_changed: "a source file's bytes, size or row count differ from the reviewed fingerprint",
  rules_changed: "the governing taxonomy or ingestion rules changed after review",
  decision_checksum_changed: "re-deciding the reviewed input on the reviewed clock did not reproduce the reviewed checksum",
  decision_drift: "re-deciding at execution time changes at least one reviewed decision",
  publishable_count_changed: "the expected publishable count does not match the reviewed manifest",
  accounting_mismatch: "published plus held does not equal received",
};

export interface PreflightInput {
  manifest: BatchManifest;
  /** What the operator typed. Nothing is defaulted or discovered. */
  args: {
    batchId: string;
    expectPublishable: number;
    environment: string;
    confirmation: string | null;
  };
  /** The environment the process actually resolved, not what was asked for. */
  resolvedProjectRef: string;
  /** Fingerprints re-measured from the files on disk, right now. */
  actualSourceFiles: SourceFileFingerprint[];
  /** The rules fingerprint re-measured from the modules on disk, right now. */
  actualRulesFingerprint: string;
  /** Decisions recomputed on the REVIEWED clock. Proves manifest integrity. */
  reviewedClockDecisions: readonly IngestDecision[];
  /** Decisions recomputed on the EXECUTION clock. Proves no drift. */
  executionClockDecisions: readonly IngestDecision[];
}

export interface Abort {
  ok: false;
  reason: AbortReason;
  detail: string;
}
export interface Pass {
  ok: true;
  /** The source ids the reviewed batch says may become public. */
  publishableSourceIds: string[];
}

/** The exact phrase, so a stray `--confirm yes` cannot publish anything. */
export function confirmationPhraseFor(batchId: string): string {
  return `publish ${batchId} to production`;
}

/**
 * Everything that must hold before a single row is staged.
 *
 * Ordered cheapest and most operator-correctable first, so the message a person
 * gets names the thing they can fix rather than the deepest thing that differs.
 */
export function preflight(input: PreflightInput): Pass | Abort {
  const { manifest, args } = input;

  if (args.batchId !== manifest.batchId) {
    return abort("batch_id_mismatch", `given ${args.batchId}, reviewed ${manifest.batchId}`);
  }
  if (args.confirmation !== confirmationPhraseFor(manifest.batchId)) {
    return abort("missing_confirmation", `expected exactly: ${confirmationPhraseFor(manifest.batchId)}`);
  }
  if (args.environment !== manifest.environment) {
    return abort("wrong_environment", `given ${args.environment}, reviewed ${manifest.environment}`);
  }
  if (input.resolvedProjectRef !== manifest.projectRef) {
    return abort(
      "project_ref_mismatch",
      `process resolved ${input.resolvedProjectRef}, batch was reviewed against ${manifest.projectRef}`,
    );
  }
  if (args.expectPublishable !== manifest.publishable) {
    return abort(
      "publishable_count_changed",
      `given ${args.expectPublishable}, reviewed ${manifest.publishable}`,
    );
  }

  // The input must be the reviewed input, byte for byte.
  const reviewedNames = manifest.sourceFiles.map((f) => f.name).sort();
  const actualNames = input.actualSourceFiles.map((f) => f.name).sort();
  if (reviewedNames.join("|") !== actualNames.join("|")) {
    return abort("source_file_set_changed", `reviewed [${reviewedNames}], found [${actualNames}]`);
  }
  for (const reviewed of manifest.sourceFiles) {
    const actual = input.actualSourceFiles.find((f) => f.name === reviewed.name)!;
    if (actual.sha256 !== reviewed.sha256 || actual.bytes !== reviewed.bytes || actual.rows !== reviewed.rows) {
      return abort(
        "source_file_changed",
        `${reviewed.name}: reviewed ${reviewed.sha256.slice(0, 12)} ${reviewed.bytes}b ${reviewed.rows} rows, ` +
          `found ${actual.sha256.slice(0, 12)} ${actual.bytes}b ${actual.rows} rows`,
      );
    }
  }

  if (input.actualRulesFingerprint !== manifest.rulesFingerprint) {
    return abort(
      "rules_changed",
      `reviewed ${manifest.rulesFingerprint.slice(0, 12)}, found ${input.actualRulesFingerprint.slice(0, 12)}`,
    );
  }

  // The manifest describes what the reviewed code did to the reviewed input.
  const reviewedVector = decisionVector(input.reviewedClockDecisions);
  if (sha256(reviewedVector) !== manifest.decisionChecksum) {
    return abort(
      "decision_checksum_changed",
      `reviewed ${manifest.decisionChecksum.slice(0, 12)}, recomputed ${sha256(reviewedVector).slice(0, 12)}`,
    );
  }

  // And nothing has moved since. A row crossing current -> aging lands here.
  const executionVector = decisionVector(input.executionClockDecisions);
  if (executionVector !== reviewedVector) {
    return abort("decision_drift", describeDrift(reviewedVector, executionVector));
  }

  const publishing = input.executionClockDecisions.filter((d) => d.decision === "publish");
  const holding = input.executionClockDecisions.filter((d) => d.decision === "hold");
  if (publishing.length + holding.length !== manifest.received) {
    return abort(
      "accounting_mismatch",
      `${publishing.length} + ${holding.length} != ${manifest.received} received`,
    );
  }
  if (publishing.length !== manifest.publishable) {
    return abort("publishable_count_changed", `recomputed ${publishing.length}, reviewed ${manifest.publishable}`);
  }

  return { ok: true, publishableSourceIds: publishing.map((d) => d.sourceId!).sort() };
}

function abort(reason: AbortReason, detail: string): Abort {
  return { ok: false, reason, detail };
}

/** The first few differing lines, so a drift abort names actual records. */
function describeDrift(reviewed: string, actual: string): string {
  const a = reviewed.split("\n");
  const b = actual.split("\n");
  const bSet = new Set(b);
  const aSet = new Set(a);
  const goneAll = a.filter((l) => !bSet.has(l));
  const gone = goneAll.slice(0, 3);
  const came = b.filter((l) => !aSet.has(l)).slice(0, 3);
  const n = goneAll.length;
  return `${n} decision(s) changed since review. was: ${gone.join(" | ")} :: now: ${came.join(" | ")}`;
}

// ---------------------------------------------------------------------------
// Post-stage validation, before activation
// ---------------------------------------------------------------------------

/** One staged row, as read back from the database before activation. */
export interface StagedRow {
  canonical_signal_id: string | null;
  status: string;
  side: string | null;
  market_family: string | null;
  spotted_at: string | null;
  ai_description: string | null;
  import_meta: { publication?: string; hold_reason?: string | null; intent?: string | null; ingested_at?: string | null } | null;
}

export type ValidationFailure =
  | "staged_count_mismatch"
  | "eligible_count_mismatch"
  | "held_row_is_public"
  | "staged_row_is_public"
  | "prose_in_public_field"
  | "missing_source_identity"
  | "missing_source_date"
  | "side_intent_disagreement"
  | "record_not_marked_unconfirmed"
  | "rows_unaccounted";

export const VALIDATION_TEXT: Readonly<Record<ValidationFailure, string>> = {
  staged_count_mismatch: "the rows staged do not equal the reviewed batch decision",
  eligible_count_mismatch: "the rows eligible for activation do not equal the expected publishable count",
  held_row_is_public: "a held row is already publicly visible",
  staged_row_is_public: "a staged row is publicly visible before activation",
  prose_in_public_field: "source prose reached a public description field",
  missing_source_identity: "a row carries no source identity, so the write is not idempotent",
  missing_source_date: "a row carries no source posting date distinct from its ingestion date",
  side_intent_disagreement: "a row's side and canonical intent do not agree",
  record_not_marked_unconfirmed: "a row is not marked as an unconfirmed Market Signal",
  rows_unaccounted: "staged plus held does not equal the reviewed received count",
};

export interface ValidationResult {
  ok: boolean;
  failures: { failure: ValidationFailure; detail: string }[];
  eligible: number;
  held: number;
}

/**
 * Everything that must be true of the staged batch before activation.
 *
 * Every check reads what is actually in the database rather than what the
 * script believes it wrote. A validation that inspects its own intentions
 * proves nothing.
 */
export function validateStaged(
  manifest: BatchManifest,
  rows: readonly StagedRow[],
): ValidationResult {
  const failures: { failure: ValidationFailure; detail: string }[] = [];
  const add = (failure: ValidationFailure, detail: string) => failures.push({ failure, detail });

  const staged = rows.filter((r) => r.import_meta?.publication === "staged");
  const held = rows.filter((r) => r.import_meta?.publication === "held");

  if (rows.length !== manifest.received) {
    add("staged_count_mismatch", `${rows.length} rows written, ${manifest.received} received at review`);
  }
  if (staged.length + held.length !== rows.length) {
    add("rows_unaccounted", `${staged.length} staged + ${held.length} held != ${rows.length} written`);
  }
  if (staged.length !== manifest.publishable) {
    add("eligible_count_mismatch", `${staged.length} eligible, ${manifest.publishable} expected`);
  }
  if (held.length !== manifest.held) {
    add("staged_count_mismatch", `${held.length} held, ${manifest.held} expected`);
  }

  // Nothing in this batch may be public yet. Activation is the only thing that
  // may make a row public, and it has not run.
  for (const r of rows) {
    if (r.status !== "private") {
      add(
        r.import_meta?.publication === "held" ? "held_row_is_public" : "staged_row_is_public",
        `${r.canonical_signal_id}: status ${r.status}`,
      );
      break;
    }
  }

  for (const r of rows) {
    if (!r.canonical_signal_id) { add("missing_source_identity", "a row has no canonical_signal_id"); break; }
  }
  for (const r of rows) {
    if (!r.spotted_at) { add("missing_source_date", `${r.canonical_signal_id} has no spotted_at`); break; }
    if (!r.import_meta?.ingested_at) {
      add("missing_source_date", `${r.canonical_signal_id} does not record its ingestion date separately`);
      break;
    }
  }
  // The public description must be empty: the desk writes it, never the source.
  for (const r of rows) {
    if (r.ai_description !== null && r.ai_description !== "") {
      add("prose_in_public_field", `${r.canonical_signal_id} carries ai_description`);
      break;
    }
  }
  for (const r of rows) {
    const intent = r.import_meta?.intent ?? null;
    const agrees =
      (r.side === "offer" && intent === "offer_product") ||
      (r.side === "requirement" && intent === "source_product");
    if (!agrees) {
      add("side_intent_disagreement", `${r.canonical_signal_id}: side ${r.side}, intent ${intent}`);
      break;
    }
  }
  // Every record in this table is a Market Signal by construction; the claim
  // that matters is that none of them is presented as anything stronger.
  for (const r of rows) {
    if (r.market_family !== "products") {
      add("record_not_marked_unconfirmed", `${r.canonical_signal_id}: market_family ${r.market_family}`);
      break;
    }
  }

  return { ok: failures.length === 0, failures, eligible: staged.length, held: held.length };
}
