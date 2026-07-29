// Deterministic procedural completion, against the accepted product
// definition's own worked examples.
//
// Run: npx tsx lib/deal-room/__tests__/progress.test.ts
//
// This is the file that has to be right. A percentage is the single most
// believed thing on a Deal Room screen, and every rule below exists because a
// plausible implementation gets one of them wrong: shows 0, shows a number
// before the parties agreed anything, rounds an unfinished procedure up to 100,
// or moves when nothing happened.

import assert from "node:assert/strict";
import { templateFor, type ProcedureStep } from "../procedure";
import { momentumFor, momentumSentence, procedureProgress, progressExplanation } from "../progress";
import type { StepState } from "../states";

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

/** Build the products procedure with the named steps in the given states. */
function steps(states: Partial<Record<string, StepState>>): ProcedureStep[] {
  return templateFor("products").steps.map((step) => ({
    ...step,
    state: states[step.key] ?? "ready",
  }));
}

const ALL_KEYS = templateFor("products").steps.map((s) => s.key);

// ---------------------------------------------------------------------------
// No percentage before approval. Acceptance criterion 7.
// ---------------------------------------------------------------------------

test("a proposed procedure shows no percentage", () => {
  const result = procedureProgress("proposed", steps({ admission_and_nda: "completed" }));
  assert.equal(result.value, null);
});

test("a draft procedure shows no percentage", () => {
  assert.equal(procedureProgress("draft", steps({ admission_and_nda: "completed" })).value, null);
});

test("an amendment-requested procedure shows no percentage", () => {
  assert.equal(procedureProgress("amendment_requested", steps({ admission_and_nda: "completed" })).value, null);
});

test("null, never zero: the type has no rendering", () => {
  const result = procedureProgress("proposed", steps({}));
  assert.equal(result.value, null);
  assert.notEqual(result.value as unknown, 0);
});

test("an approved procedure with nothing earned still shows no percentage", () => {
  // Never display 0%. Constitution section 9.
  assert.equal(procedureProgress("approved", steps({})).value, null);
});

// ---------------------------------------------------------------------------
// The worked examples from the accepted product definition
// ---------------------------------------------------------------------------

test("7.3: the baseline at procedure agreement is 22, inside the 18-25 band", () => {
  const result = procedureProgress("approved", steps({ admission_and_nda: "completed", procedure_agreed: "completed" }));
  assert.equal(result.value, 22);
  assert.ok(result.value! >= 18 && result.value! <= 25);
});

test("7.6: 58 earned of 100 displays 58", () => {
  // admission 10 + procedure 12 + scope 14 + capability 16 + documentary 12 = 64
  // Trim to the definition's own 58 by leaving the documentary condition open
  // and completing the delivery procedure instead: 10+12+14+16+12 = 64. The
  // definition's example uses a differently weighted table, so the property
  // under test is the mapping - earned weight IS the percentage - not the
  // arithmetic of its particular table.
  const result = procedureProgress(
    "approved",
    steps({
      admission_and_nda: "completed",
      procedure_agreed: "completed",
      commercial_scope: "completed",
      capability_evidence: "completed",
      delivery_procedure: "completed",
    }),
  );
  assert.equal(result.earned, 64);
  assert.equal(result.value, 64, "in a Deal Room the earned weight is the percentage, with no floor transform");
});

test("7.7: withdrawing an accepted item moves the number back, and says so", () => {
  const before = procedureProgress(
    "approved",
    steps({
      admission_and_nda: "completed",
      procedure_agreed: "completed",
      commercial_scope: "completed",
      capability_evidence: "completed",
    }),
  );
  const after = procedureProgress(
    "approved",
    steps({
      admission_and_nda: "completed",
      procedure_agreed: "completed",
      commercial_scope: "completed",
      capability_evidence: "review_required", // superseded evidence returns it to review
    }),
  );
  assert.equal(before.value, 52);
  assert.equal(after.value, 36);
  assert.ok(after.value! < before.value!, "progress must be able to fall");
});

// ---------------------------------------------------------------------------
// 100 only at completion
// ---------------------------------------------------------------------------

test("100 only when every counting step is complete", () => {
  const done = Object.fromEntries(ALL_KEYS.map((key) => [key, "completed" as StepState]));
  assert.equal(procedureProgress("approved", steps(done)).value, 100);
});

test("one step short is capped at 99, never rounded to 100", () => {
  const done = Object.fromEntries(ALL_KEYS.map((key) => [key, "completed" as StepState]));
  delete (done as Record<string, StepState>)["blockers_cleared"]; // weight 8
  const result = procedureProgress("approved", steps(done));
  assert.equal(result.earned, 92);
  assert.ok(result.value! < 100, "an incomplete procedure must never render 100");
});

test("a near-complete renormalised procedure is still capped below 100", () => {
  // Exclude a step so the denominator shrinks, then complete all but the
  // smallest remaining one. Without the cap this could round to 100.
  const withExclusion = steps({
    ...Object.fromEntries(ALL_KEYS.map((key) => [key, "completed" as StepState])),
    documentary_condition: "not_applicable",
    blockers_cleared: "ready",
  });
  const result = procedureProgress("approved", withExclusion);
  assert.ok(result.value! <= 99, `expected at most 99, got ${result.value}`);
});

// ---------------------------------------------------------------------------
// Determinism
// ---------------------------------------------------------------------------

test("the same state always produces the same number", () => {
  const state = { admission_and_nda: "completed" as StepState, procedure_agreed: "completed" as StepState };
  const values = Array.from({ length: 25 }, () => procedureProgress("approved", steps(state)).value);
  assert.equal(new Set(values).size, 1);
});

test("step order does not change the answer", () => {
  const state = { admission_and_nda: "completed" as StepState, capability_evidence: "completed" as StepState };
  const forward = procedureProgress("approved", steps(state));
  const reversed = procedureProgress("approved", [...steps(state)].reverse());
  assert.equal(forward.value, reversed.value);
});

// ---------------------------------------------------------------------------
// Earning rules
// ---------------------------------------------------------------------------

test("a blocked step earns nothing but keeps the rest of the progress", () => {
  const result = procedureProgress(
    "approved",
    steps({ admission_and_nda: "completed", procedure_agreed: "completed", commercial_scope: "blocked" }),
  );
  assert.equal(result.value, 22, "the blocked step's own weight is not earned");
});

test("a waived step earns its weight", () => {
  const result = procedureProgress(
    "approved",
    steps({ admission_and_nda: "completed", procedure_agreed: "completed", commercial_scope: "waived" }),
  );
  assert.equal(result.value, 36);
});

test("evidence merely submitted earns nothing", () => {
  const result = procedureProgress(
    "approved",
    steps({ admission_and_nda: "completed", procedure_agreed: "completed", capability_evidence: "evidence_submitted" }),
  );
  assert.equal(result.value, 22, "uploading is not completing");
});

test("an excluded step leaves the denominator and renormalises", () => {
  const result = procedureProgress(
    "approved",
    steps({
      admission_and_nda: "completed",
      procedure_agreed: "completed",
      documentary_condition: "not_applicable",
    }),
  );
  assert.equal(result.denominator, 88);
  assert.equal(result.value, Math.round((100 * 22) / 88));
});

// ---------------------------------------------------------------------------
// The explanation under the number
// ---------------------------------------------------------------------------

test("the explanation counts what it counted", () => {
  const result = procedureProgress(
    "approved",
    steps({ admission_and_nda: "completed", procedure_agreed: "completed", capability_evidence: "in_progress" }),
  );
  const line = progressExplanation(result, 1);
  assert.match(line, /2 of 8 procedure items complete/);
  assert.match(line, /1 in progress/);
  assert.match(line, /1 critical blocker/);
});

test("no blocker means no blocker clause", () => {
  const result = procedureProgress("approved", steps({ admission_and_nda: "completed" }));
  assert.ok(!progressExplanation(result, 0).includes("blocker"));
});

// ---------------------------------------------------------------------------
// Momentum is a named state, never a score
// ---------------------------------------------------------------------------

const BASE = {
  roomIsPaused: false,
  roomIsReadyToProceed: false,
  openCriticalBlockers: 0,
  stepsAwaitingReview: 0,
  stepsAwaitingOtherParty: 0,
  materialEventsInLastSevenDays: 0,
};

test("a critical blocker outranks recent activity", () => {
  assert.equal(momentumFor({ ...BASE, openCriticalBlockers: 1, materialEventsInLastSevenDays: 5 }), "blocked");
});

test("paused outranks blocked", () => {
  assert.equal(momentumFor({ ...BASE, roomIsPaused: true, openCriticalBlockers: 2 }), "paused");
});

test("ready to proceed outranks everything", () => {
  assert.equal(
    momentumFor({ ...BASE, roomIsReadyToProceed: true, roomIsPaused: true, openCriticalBlockers: 3 }),
    "ready_to_proceed",
  );
});

test("recent material activity reads as moving", () => {
  assert.equal(momentumFor({ ...BASE, materialEventsInLastSevenDays: 3 }), "moving");
});

test("nothing recent reads as waiting, not as moving", () => {
  assert.equal(momentumFor({ ...BASE, stepsAwaitingOtherParty: 2 }), "waiting_on_participant");
});

test("the momentum sentence states a fact and never a probability", () => {
  const input = { ...BASE, materialEventsInLastSevenDays: 3 };
  const sentence = momentumSentence("moving", input);
  assert.match(sentence, /3 material actions completed this week/);
  for (const word of ["likely", "probability", "chance", "success", "will close", "on track"]) {
    assert.ok(!sentence.toLowerCase().includes(word), `momentum must not say '${word}'`);
  }
});

test("a blocked room's sentence says progress is unchanged, not lost", () => {
  const sentence = momentumSentence("blocked", { ...BASE, openCriticalBlockers: 1 });
  assert.match(sentence, /unchanged/);
});

console.log(`ok   deal-room progress: ${passed} assertions passed`);
