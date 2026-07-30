// The multilingual domain contract: message/translation invariants, provenance,
// cache identity, interpretation evidence, confirmation attribution, and
// disagreement preservation.
//
// Run: npx tsx lib/deal-room/__tests__/multilingual-domain.test.ts
//
// ## Why this file exists
//
// ADR-0016 and the ExecPlan set hard rules: an original is immutable evidence, a
// translation is never labelled a success when it is not, every proposed fact
// cites its source, AI cannot write canonical state, and conflicting positions
// are preserved rather than merged. These are the pure-logic guards that make
// those rules checkable before any UI or database exists.

import assert from "node:assert/strict";
import {
  assertTranslationTextInvariant,
  isCompleteProvenance,
  isSuccessfulTranslation,
  needsTranslation,
  translationCacheKey,
  translationHasText,
  TRANSLATION_STATUSES,
  TRANSLATION_STATUSES_WITH_TEXT,
} from "../messages";
import {
  assertConfirmationComplete,
  assertProposalHasEvidence,
  assertRejectionComplete,
  canConfirm,
  canReject,
  isDisagreement,
  preserveDisagreement,
  proposalHasEvidence,
  type PartyPosition,
  type TermDecision,
} from "../interpretation";
import {
  GLOSSARY_REVIEW_STATUS,
  glossaryFixturesCoverAllLanguages,
  preservedTermsIn,
  preservesTradeTerms,
} from "../glossary";

let passed = 0;
function test(name: string, fn: () => void): void {
  try {
    fn();
    passed++;
  } catch (err) {
    console.error(`FAIL  ${name}`);
    console.error(`      ${(err as Error).message}`);
    process.exitCode = 1;
  }
}

// --- Translation status and the honesty invariant -------------------------

test("only completed is an unqualified success; the caveated states are not", () => {
  assert.ok(isSuccessfulTranslation("completed"));
  for (const status of ["pending", "failed", "provider_unavailable", "source_uncertain", "low_confidence", "ambiguous"] as const) {
    assert.ok(!isSuccessfulTranslation(status), `${status} must not read as success`);
  }
});

test("with-text statuses are exactly completed, low_confidence, ambiguous", () => {
  for (const status of TRANSLATION_STATUSES) {
    assert.equal(translationHasText(status), (TRANSLATION_STATUSES_WITH_TEXT as readonly string[]).includes(status));
  }
});

test("text-presence invariant forbids an untranslated success and a texted failure", () => {
  // completed/low_confidence/ambiguous require text.
  assert.throws(() => assertTranslationTextInvariant("completed", null), /requires non-empty text/);
  assert.throws(() => assertTranslationTextInvariant("completed", ""), /requires non-empty text/);
  assert.throws(() => assertTranslationTextInvariant("low_confidence", null), /requires non-empty text/);
  assert.throws(() => assertTranslationTextInvariant("ambiguous", null), /requires non-empty text/);
  // no-text statuses must not carry text.
  assert.throws(() => assertTranslationTextInvariant("failed", "hola"), /must not carry text/);
  assert.throws(() => assertTranslationTextInvariant("provider_unavailable", "hola"), /must not carry text/);
  assert.throws(() => assertTranslationTextInvariant("pending", "hola"), /must not carry text/);
  assert.throws(() => assertTranslationTextInvariant("source_uncertain", "hola"), /must not carry text/);
  // consistent rows pass.
  assert.doesNotThrow(() => assertTranslationTextInvariant("completed", "hola"));
  assert.doesNotThrow(() => assertTranslationTextInvariant("failed", null));
  assert.doesNotThrow(() => assertTranslationTextInvariant("pending", null));
});

test("needsTranslation is true only across languages", () => {
  assert.ok(needsTranslation("en", "es"));
  assert.ok(!needsTranslation("es", "es"));
});

// --- Provenance and cache identity ---------------------------------------

test("provenance is complete only with every field and a hex64 source hash", () => {
  const hash = "a".repeat(64);
  assert.ok(isCompleteProvenance({ provider: "anthropic", model: "m", modelVersion: "v", glossaryVersion: "g", sourceSha256: hash }));
  assert.ok(!isCompleteProvenance(null));
  assert.ok(!isCompleteProvenance({ provider: "anthropic", model: "m", modelVersion: "v", glossaryVersion: "g", sourceSha256: "short" }));
  assert.ok(!isCompleteProvenance({ provider: "anthropic", model: "m", modelVersion: "v", glossaryVersion: "", sourceSha256: hash }));
});

test("cache identity is stable and distinguishes model and glossary", () => {
  const base = { messageId: "m1", targetLanguage: "es" as const, model: "haiku", glossaryVersion: "v0" };
  assert.equal(translationCacheKey(base), translationCacheKey({ ...base }));
  assert.notEqual(translationCacheKey(base), translationCacheKey({ ...base, model: "sonnet" }));
  assert.notEqual(translationCacheKey(base), translationCacheKey({ ...base, glossaryVersion: "v1" }));
  assert.notEqual(translationCacheKey(base), translationCacheKey({ ...base, targetLanguage: "ru" }));
});

// --- Interpretation evidence ---------------------------------------------

test("a proposal is valid only when every source reference has an id and an excerpt", () => {
  assert.ok(!proposalHasEvidence({ sourceRefs: [] }));
  assert.ok(!proposalHasEvidence({ sourceRefs: [{ messageId: "m1", excerpt: "  ", sourceLanguage: "en" }] }));
  assert.ok(!proposalHasEvidence({ sourceRefs: [{ messageId: "", excerpt: "25 MT", sourceLanguage: "en" }] }));
  assert.ok(proposalHasEvidence({ sourceRefs: [{ messageId: "m1", excerpt: "25 MT", sourceLanguage: "en" }] }));
});

test("assertProposalHasEvidence throws when a value is proposed with no source", () => {
  assert.throws(
    () => assertProposalHasEvidence({ field: "quantity", sourceRefs: [] }),
    /must cite at least one source message/,
  );
});

// --- Confirmation boundary ------------------------------------------------

test("only a proposed proposal can be confirmed or rejected", () => {
  assert.ok(canConfirm("proposed"));
  assert.ok(canReject("proposed"));
  for (const status of ["confirmed", "rejected", "superseded", "disputed"] as const) {
    assert.ok(!canConfirm(status));
    assert.ok(!canReject(status));
  }
});

test("a confirmation must record value, participant, capacity, proposal and timestamp", () => {
  const complete: TermDecision = {
    proposalId: "p1",
    decision: "confirm",
    previousValue: null,
    decidedValue: { amount: "25", unit: "MT" },
    decidedByParticipantId: "part1",
    decidedByProfileId: "prof1",
    capacityLabel: "Managing Director",
    organisationLabel: "Acme SA",
    reason: null,
    createdAt: "2026-07-30T00:00:00Z",
  };
  assert.doesNotThrow(() => assertConfirmationComplete(complete));
  assert.throws(() => assertConfirmationComplete({ ...complete, decidedValue: null }), /decidedValue/);
  assert.throws(() => assertConfirmationComplete({ ...complete, capacityLabel: "" }), /capacityLabel/);
  assert.throws(() => assertConfirmationComplete({ ...complete, proposalId: "" }), /proposalId/);
});

test("a rejection preserves the proposal and records who and when", () => {
  const reject: TermDecision = {
    proposalId: "p1",
    decision: "reject",
    previousValue: null,
    decidedValue: null,
    decidedByParticipantId: "part1",
    decidedByProfileId: "prof1",
    capacityLabel: "Managing Director",
    organisationLabel: null,
    reason: "quantity not agreed",
    createdAt: "2026-07-30T00:00:00Z",
  };
  assert.doesNotThrow(() => assertRejectionComplete(reject));
  assert.throws(() => assertRejectionComplete({ ...reject, decidedByParticipantId: "" }), /decidedByParticipantId/);
});

// --- Disagreement preservation -------------------------------------------

test("two parties with different values on one field is a disagreement", () => {
  const positions: PartyPosition[] = [
    { field: "quantity", party: "buyer", participantId: "b", value: { amount: "25", unit: "MT" }, sourceRefs: [] },
    { field: "quantity", party: "seller", participantId: "s", value: { amount: "30", unit: "MT" }, sourceRefs: [] },
  ];
  assert.ok(isDisagreement(positions));
});

test("value equality ignores object key order, so the same position is not a disagreement", () => {
  const positions: PartyPosition[] = [
    { field: "quantity", party: "buyer", participantId: "b", value: { amount: "25", unit: "MT" }, sourceRefs: [] },
    { field: "quantity", party: "seller", participantId: "s", value: { unit: "MT", amount: "25" }, sourceRefs: [] },
  ];
  assert.ok(!isDisagreement(positions));
});

test("one party alone is never a disagreement", () => {
  assert.ok(!isDisagreement([{ field: "quantity", party: "buyer", participantId: "b", value: 1, sourceRefs: [] }]));
});

test("preserveDisagreement keeps both positions distinct and marks them disputed, never merging", () => {
  const positions: PartyPosition[] = [
    { field: "incoterm", party: "buyer", participantId: "b", value: "CIF", sourceRefs: [{ messageId: "m1", excerpt: "CIF", sourceLanguage: "en" }] },
    { field: "incoterm", party: "seller", participantId: "s", value: "FOB", sourceRefs: [{ messageId: "m2", excerpt: "FOB", sourceLanguage: "es" }] },
  ];
  const preserved = preserveDisagreement(positions);
  assert.equal(preserved.length, 2);
  assert.deepEqual(
    preserved.map((p) => p.status),
    ["disputed", "disputed"],
  );
  assert.deepEqual(
    preserved.map((p) => p.proposedValue).sort(),
    ["CIF", "FOB"],
  );
});

// --- Glossary -------------------------------------------------------------

test("preserved trade terms and coded identifiers are detected", () => {
  const text = "Ponte confirms 25 MT at FOB, HS 2710.19, ref PT-1234, price USD 1,200.";
  const found = preservedTermsIn(text);
  assert.ok(found.includes("Ponte"), "Ponte");
  assert.ok(found.includes("FOB"), "incoterm");
  assert.ok(found.some((t) => t.includes("25 MT")), "unit quantity");
  assert.ok(found.some((t) => t.includes("2710.19")), "HS code");
  assert.ok(found.includes("PT-1234"), "listing ref");
  assert.ok(found.some((t) => t.includes("USD 1,200")), "currency amount");
});

test("a translation that keeps the coded identifiers preserves trade terms; one that drops them does not", () => {
  const source = "Se confirman 25 MT en FOB, ref PT-1234.";
  const good = "[en] Confirmed 25 MT on FOB, ref PT-1234.";
  const bad = "[en] Confirmed twenty five tonnes on free on board, ref PT one two three four.";
  assert.ok(preservesTradeTerms(source, good));
  assert.ok(!preservesTradeTerms(source, bad));
});

test("glossary fixtures cover all five languages, and native review is recorded as outstanding", () => {
  assert.ok(glossaryFixturesCoverAllLanguages());
  assert.equal(GLOSSARY_REVIEW_STATUS, "machine_prepared_pending_native_review");
});

console.log(`ok   deal-room multilingual domain: ${passed} assertions passed`);
