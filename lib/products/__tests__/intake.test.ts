// The product intake session: every state reachable, and the boundaries held.
//
// Run: npx tsx lib/products/__tests__/intake.test.ts
//
// Issue #67 lists eighteen states that must exist and be demonstrated. This file
// is what makes that checkable: a state nobody can reach is a failure here
// rather than a gap somebody notices in review. It also pins the three rules the
// journey must not break, whatever the UI later looks like:
//
//   * confirmation precedes draft creation (criterion 11);
//   * a multi-product document does not reach review until the member has said
//     how the products become drafts (criterion 8);
//   * authentication preserves the session (criterion 14).

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseExtraction } from "../extract-document";
import {
  INTAKE_METHODS,
  INTAKE_STEPS,
  completedSteps,
  incompleteTerms,
  intakeReducer,
  isIncomplete,
  newSession,
  rehydrate,
  resumeSummary,
  serialise,
  sessionKey,
  wordingOf,
  type IntakeAction,
  type IntakeSession,
} from "../intake";
import { resolveProduct } from "../resolve";
import { scanForProducts } from "../scan";
import { assertWeights, progressValue } from "../../ponte/progress";

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

const FIXTURE = readFileSync("lib/products/__tests__/fixtures/multi-product-sco.txt", "utf8");
const multiExtraction = parseExtraction(
  {
    terms: {
      quantity: { value: "200,000 MT", quote: "Quantity available: 200,000 MT per month, per product" },
      incoterm: { value: "CIF", quote: "immediate shipment on CIF basis to Houston Port" },
    },
  },
  { filename: "offer.txt", scanned: scanForProducts(FIXTURE), modelRead: true },
);
const singleExtraction = parseExtraction(
  {},
  {
    filename: "one.txt",
    scanned: scanForProducts("We can supply Jet A-1 to ASTM D1655."),
    modelRead: true,
  },
);

/** Apply a run of actions to a fresh session. */
function run(...actions: IntakeAction[]): IntakeSession {
  return actions.reduce(intakeReducer, newSession("offer_product"));
}

// ---- every required state is reachable --------------------------------------

const REACHED = new Map<string, IntakeSession>();
function reach(kind: string, session: IntakeSession): IntakeSession {
  assert.equal(session.stage.kind, kind, `expected to reach ${kind}, reached ${session.stage.kind}`);
  REACHED.set(kind, session);
  return session;
}

test("initial", () => {
  reach("initial", newSession("offer_product"));
});

test("typing, and the member's own words survive it", () => {
  const session = reach("typing", run({ type: "type", wording: "gas oil" }));
  assert.equal(wordingOf(session.stage), "gas oil");
});

test("voice input, and dictation lands in the same editable field", () => {
  const listening = reach("voice", run({ type: "type", wording: "gas" }, { type: "voiceStart" }));
  assert.equal(wordingOf(listening.stage), "gas");
  const heard = run({ type: "voiceStart" }, { type: "voiceResult", wording: "gasolio dieci ppm" });
  reach("typing", heard);
  assert.equal(wordingOf(heard.stage), "gasolio dieci ppm", "the transcript was not carried into the field");
  // A dictation failure is its own state, not a silent nothing.
  const failed = run({ type: "voiceStart" }, { type: "voiceError", reason: "no microphone" });
  reach("voice", failed);
  if (failed.stage.kind === "voice") assert.equal(failed.stage.error, "no microphone");
});

test("upload and analysing", () => {
  const session = reach("analysing", run({ type: "documentChosen", filename: "offer.pdf", bytes: 12_000 }));
  assert.deepEqual(session.document, { filename: "offer.pdf", bytes: 12_000 });
  assert.equal(session.method, "upload");
  reach("analysing", run({ type: "analyse", method: "describe", what: "gas oil" }));
});

test("resolved, candidates and ambiguous are three separate states", () => {
  reach("resolved", run({ type: "resolution", outcome: resolveProduct("ULSD") }));
  reach("candidates", run({ type: "resolution", outcome: resolveProduct("EN 590") }));
  const ambiguous = reach("ambiguous", run({ type: "resolution", outcome: resolveProduct("gas oil") }));
  if (ambiguous.stage.kind === "ambiguous") {
    assert.ok(ambiguous.stage.outcome.question.length > 0, "the ambiguous state carries no question");
  }
});

test("unmatched carries the words and what was tried, never a blank", () => {
  const session = reach("unmatched", run({ type: "resolution", outcome: resolveProduct("intergalactic widgets") }));
  if (session.stage.kind !== "unmatched") return;
  assert.equal(session.stage.wording, "intergalactic widgets");
  assert.ok(session.stage.tried.length > 0);
});

test("browse is still a route, and it is not the default", () => {
  reach("browse", run({ type: "chooseMethod", method: "browse" }));
  assert.equal(newSession("offer_product").method, null, "a method was chosen for the member");
  assert.deepEqual(INTAKE_METHODS, ["describe", "upload", "browse"], "the intake order is not the decided order");
});

test("extracted, multiProduct, extractionFailed, uploadFailed and blocked", () => {
  reach("extracted", run({ type: "extraction", extraction: singleExtraction }));
  reach("multiProduct", run({ type: "extraction", extraction: multiExtraction }));
  reach("extractionFailed", run({ type: "extractionFailed", filename: "o.pdf", reason: "unreadable" }));
  reach("uploadFailed", run({ type: "uploadFailed", filename: "o.pdf", reason: "network" }));
  reach("blocked", run({ type: "blocked", filename: "o.doc", format: "doc", reason: "legacy binary" }));
});

test("a document Ponte read but recognised nothing in is explained, not blank", () => {
  const nothing = parseExtraction({}, { filename: "brochure.pdf", scanned: [], modelRead: true });
  const session = reach("unmatched", run({ type: "extraction", extraction: nothing }));
  if (session.stage.kind === "unmatched") assert.equal(session.stage.wording, "brochure.pdf");
});

test("review, confirmed, draftCreated and completed", () => {
  const review = reach(
    "review",
    run(
      { type: "resolution", outcome: resolveProduct("ULSD") },
      { type: "chooseCandidate", productKey: "gasoil-10ppm-en590" },
    ),
  );
  const confirmed = reach("confirmed", intakeReducer(review, { type: "confirm" }));
  const drafted = reach("draftCreated", intakeReducer(confirmed, { type: "draftCreated", ref: "PT-1" }));
  reach("completed", intakeReducer(drafted, { type: "complete" }));
});

test("edited is a real, marked state on the review", () => {
  const review = run(
    { type: "resolution", outcome: resolveProduct("ULSD") },
    { type: "chooseCandidate", productKey: "gasoil-10ppm-en590" },
    { type: "editTerm", scope: "shared", key: "incoterm", value: "FOB" },
  );
  assert.equal(review.stage.kind, "review");
  if (review.stage.kind !== "review") return;
  assert.equal(review.stage.review.shared.incoterm.value, "FOB");
  assert.equal(review.stage.review.shared.incoterm.provenance, "member_confirmed");
  assert.ok(review.stage.review.edited.includes("shared:incoterm"), "the edit was not recorded");
  REACHED.set("edited", review);
});

test("incomplete is a real state: a product resolved with decisive terms still open", () => {
  const review = run(
    { type: "resolution", outcome: resolveProduct("ULSD") },
    { type: "chooseCandidate", productKey: "gasoil-10ppm-en590" },
  );
  if (review.stage.kind !== "review") throw new Error("unreachable");
  assert.equal(isIncomplete(review.stage.review), true);
  assert.ok(incompleteTerms(review.stage.review).some((t) => t.key === "quantity"));
  REACHED.set("incomplete", review);
});

test("authentication interruption and resume", () => {
  const working = run({ type: "type", wording: "gas oil" });
  const interrupted = intakeReducer(working, { type: "interrupt" });
  assert.equal(interrupted.interrupted, true);
  // The stage is untouched: the gate must give the work back, not restart it.
  assert.deepEqual(interrupted.stage, working.stage);
  REACHED.set("authInterrupted", interrupted);

  const restored = rehydrate(serialise(interrupted));
  assert.ok(restored, "a serialised session did not come back");
  assert.equal(restored!.resumed, true);
  assert.equal(restored!.interrupted, false, "a resumed session is not still interrupted");
  assert.equal(wordingOf(restored!.stage), "gas oil", "the member's words were lost across authentication");
  REACHED.set("resumed", restored!);
});

test("every state issue #67 names has been reached by this file", () => {
  const required = [
    "initial",
    "typing",
    "voice",
    "analysing",
    "resolved",
    "candidates",
    "ambiguous",
    "incomplete",
    "extractionFailed",
    "uploadFailed",
    "blocked",
    "authInterrupted",
    "resumed",
    "edited",
    "confirmed",
    "draftCreated",
    "completed",
    "extracted",
    "multiProduct",
    "unmatched",
    "browse",
    "review",
  ];
  const gaps = required.filter((state) => !REACHED.has(state));
  assert.deepEqual(gaps, [], `states never reached: ${gaps.join(", ")}`);
});

// ---- the boundaries ---------------------------------------------------------

test("a multi-product document does not reach review before the member chooses a plan", () => {
  const found = run({ type: "extraction", extraction: multiExtraction });
  const premature = intakeReducer(found, { type: "openReview" });
  assert.equal(premature.stage.kind, "multiProduct", "Ponte chose the plan for the member");

  const chosen = intakeReducer(found, { type: "choosePlan", plan: "separate" });
  const review = intakeReducer(chosen, { type: "openReview" });
  assert.equal(review.stage.kind, "review");
  if (review.stage.kind !== "review") return;
  assert.equal(review.stage.review.products.length, 3, "three products collapsed on the way to review");
  assert.equal(review.stage.review.plan, "separate");
});

test("a programme is a choice the member makes, never a default", () => {
  const found = run({ type: "extraction", extraction: multiExtraction });
  if (found.stage.kind !== "multiProduct") throw new Error("unreachable");
  assert.equal(found.stage.plan, null, "a plan was pre-selected");

  const programme = intakeReducer(
    intakeReducer(found, { type: "choosePlan", plan: "programme" }),
    { type: "openReview" },
  );
  if (programme.stage.kind !== "review") throw new Error("unreachable");
  assert.equal(programme.stage.review.plan, "programme");
});

test("confirmation precedes draft creation, and cannot be skipped", () => {
  const review = run(
    { type: "resolution", outcome: resolveProduct("ULSD") },
    { type: "chooseCandidate", productKey: "gasoil-10ppm-en590" },
  );
  // A draft cannot be created from the review directly.
  const skipped = intakeReducer(review, { type: "draftCreated", ref: "PT-1" });
  assert.equal(skipped.stage.kind, "review", "a draft was created without confirmation");
  // Nor can completion be claimed without a draft.
  const confirmed = intakeReducer(review, { type: "confirm" });
  assert.equal(intakeReducer(confirmed, { type: "complete" }).stage.kind, "confirmed");
});

test("a product can be left out of a multi-product review", () => {
  const review = intakeReducer(
    intakeReducer(run({ type: "extraction", extraction: multiExtraction }), { type: "choosePlan", plan: "separate" }),
    { type: "openReview" },
  );
  if (review.stage.kind !== "review") throw new Error("unreachable");
  const first = review.stage.review.products[0].id;
  const toggled = intakeReducer(review, { type: "toggleProduct", id: first });
  if (toggled.stage.kind !== "review") throw new Error("unreachable");
  assert.equal(toggled.stage.review.products.find((p) => p.id === first)!.included, false);
  assert.equal(toggled.stage.review.products.filter((p) => p.included).length, 2);
});

test("restart clears the work but remembers that this visit was a resume", () => {
  const working = { ...run({ type: "type", wording: "gas oil" }), resumed: true };
  const fresh = intakeReducer(working, { type: "restart" });
  assert.equal(fresh.stage.kind, "initial");
  assert.equal(fresh.method, null);
  assert.equal(fresh.resumed, true);
});

// ---- resume plumbing --------------------------------------------------------

test("a resume states what it restored", () => {
  const typed = run({ type: "type", wording: "gas oil" });
  assert.match(resumeSummary(typed), /gas oil/);
  const uploaded = run({ type: "documentChosen", filename: "offer.pdf", bytes: 1 });
  assert.match(resumeSummary(uploaded), /offer\.pdf/);
});

test("a session from a different shape is discarded rather than misread", () => {
  assert.equal(rehydrate(null), null);
  assert.equal(rehydrate("not json"), null);
  assert.equal(rehydrate(JSON.stringify({ v: 999, session: {} })), null);
  assert.equal(rehydrate(JSON.stringify({ v: 1, session: {} })), null);
});

test("the two intents keep separate stored sessions", () => {
  assert.notEqual(sessionKey("offer_product"), sessionKey("source_product"));
});

test("the uploaded document is never serialised, only its name and size", () => {
  const session = run({ type: "documentChosen", filename: "offer.pdf", bytes: 12_000 });
  const raw = serialise(session);
  assert.match(raw, /offer\.pdf/);
  assert.ok(!raw.includes("base64"), "something that looks like file content was stored");
  assert.deepEqual(rehydrate(raw)!.document, { filename: "offer.pdf", bytes: 12_000 });
});

// ---- progress ---------------------------------------------------------------

test("the intake progress weights satisfy the progress law", () => {
  assertWeights(INTAKE_STEPS);
});

test("progress is null before the first meaningful action, and never zero", () => {
  assert.equal(progressValue(INTAKE_STEPS, completedSteps(newSession("offer_product"))), null);
});

test("progress rises deterministically and reaches 100 only on completion", () => {
  const chosen = run({ type: "chooseMethod", method: "describe" });
  const early = progressValue(INTAKE_STEPS, completedSteps(chosen));
  assert.ok(early !== null && early >= 20, "the first visible value fell below the approved floor");

  const done = run(
    { type: "resolution", outcome: resolveProduct("ULSD") },
    { type: "chooseCandidate", productKey: "gasoil-10ppm-en590" },
    { type: "confirm" },
    { type: "draftCreated", ref: "PT-1" },
    { type: "complete" },
  );
  assert.equal(progressValue(INTAKE_STEPS, completedSteps({ ...done, method: "describe" })), 100);

  // Same session, same number, every time.
  assert.equal(
    progressValue(INTAKE_STEPS, completedSteps(chosen)),
    progressValue(INTAKE_STEPS, completedSteps(chosen)),
  );
});

console.log(`ok   ${passed} product intake session tests passed`);
