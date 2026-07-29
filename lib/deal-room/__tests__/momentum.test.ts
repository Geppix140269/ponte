// Professional Momentum: five parts, and the vocabulary that must never appear.
//
// Run: npx tsx lib/deal-room/__tests__/momentum.test.ts

import assert from "node:assert/strict";
import {
  admittedMomentum,
  blockerResolvedMomentum,
  clarificationResolvedMomentum,
  evidenceAcceptedMomentum,
  evidenceSubmittedMomentum,
  procedureApprovedMomentum,
  professionalMomentum,
  progressDeltaSentence,
  readOnlyMomentum,
  type ProfessionalMomentum,
} from "../momentum";

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

/** Every recognition the launch loop can produce, in one place. */
const ALL: [string, ProfessionalMomentum][] = [
  ["admitted", admittedMomentum({ organisationLabel: "Atlantico", roomHref: "/x", previousValue: null, currentValue: null })],
  [
    "procedure approved",
    procedureApprovedMomentum({
      roomHref: "/x",
      previousValue: null,
      currentValue: 22,
      firstStepTitle: "Product specification and quantity agreed",
      firstStepOwner: "You",
    }),
  ],
  [
    "evidence submitted",
    evidenceSubmittedMomentum({
      evidenceTitle: "Certificate of analysis",
      reviewerLabel: "Iberia Importaciones",
      href: "/x",
      previousValue: 22,
      currentValue: 22,
    }),
  ],
  [
    "clarification resolved",
    clarificationResolvedMomentum({
      evidenceTitle: "Certificate of analysis",
      href: "/x",
      reviewerLabel: "Iberia Importaciones",
      previousValue: 22,
      currentValue: 22,
    }),
  ],
  [
    "evidence accepted",
    evidenceAcceptedMomentum({
      evidenceTitle: "Certificate of analysis",
      stepTitle: "Supply capability evidenced",
      href: "/x",
      previousValue: 36,
      currentValue: 52,
      nextStepTitle: "Documentary and regulatory requirements agreed",
      nextStepOwner: "Atlantico",
    }),
  ],
  [
    "blocker resolved",
    blockerResolvedMomentum({
      blockerTitle: "Sampling point not agreed",
      href: "/x",
      previousValue: 52,
      currentValue: 60,
      nextStepTitle: "Inspection and delivery procedure agreed",
      nextStepOwner: "Both principals",
    }),
  ],
  ["read-only", readOnlyMomentum({ href: "/x" })],
];

// ---------------------------------------------------------------------------
// The five parts, always
// ---------------------------------------------------------------------------

for (const [name, momentum] of ALL) {
  test(`${name}: all five parts are present`, () => {
    assert.ok(momentum.actionCompleted.length > 0, "action completed");
    assert.ok(momentum.valueCreated.length > 0, "value created");
    assert.ok(momentum.workPreserved.length > 0, "work preserved");
    assert.ok(momentum.nextAction.label.length > 0, "next action");
    assert.ok(momentum.nextAction.owner.length > 0, "next action owner");
    // progressDelta is the "when lawful" part and may legitimately be null.
    assert.ok(momentum.progressDelta === null || typeof momentum.progressDelta.to === "number");
  });

  test(`${name}: exactly one next action`, () => {
    assert.equal(typeof momentum.nextAction.label, "string");
    assert.ok(!Array.isArray(momentum.nextAction as unknown));
  });
}

// ---------------------------------------------------------------------------
// The prohibited vocabulary
// ---------------------------------------------------------------------------

const FORBIDDEN = [
  "points",
  "coins",
  "confetti",
  "streak",
  "badge",
  "leaderboard",
  "level up",
  "reward",
  "congratulations",
  "well done",
  "amazing",
  "great job",
  "hurry",
  "act now",
  "only today",
  "trust score",
  "likelihood",
  "probability",
  "close rate",
  "chance of closing",
];

test("no recognition uses gamified, congratulatory or urgent vocabulary", () => {
  const text = JSON.stringify(ALL.map(([, m]) => m)).toLowerCase();
  for (const word of FORBIDDEN) {
    assert.ok(!text.includes(word), `Professional Momentum says '${word}'`);
  }
});

test("no recognition contains an exclamation mark", () => {
  // Experience Design 8.2: milestones are quiet but satisfying, and celebratory
  // treatment is reserved away from routine compliance events.
  const text = JSON.stringify(ALL.map(([, m]) => m));
  assert.ok(!text.includes("!"), "an exclamation mark is the smallest form of the celebration that is forbidden");
});

// ---------------------------------------------------------------------------
// "when lawful"
// ---------------------------------------------------------------------------

test("no progress delta before a procedure is approved", () => {
  const momentum = admittedMomentum({
    organisationLabel: "Atlantico",
    roomHref: "/x",
    previousValue: null,
    currentValue: null,
  });
  assert.equal(momentum.progressDelta, null);
  assert.equal(progressDeltaSentence(momentum.progressDelta), null);
});

test("no progress delta when nothing moved", () => {
  const momentum = evidenceSubmittedMomentum({
    evidenceTitle: "X",
    reviewerLabel: "Y",
    href: "/x",
    previousValue: 22,
    currentValue: 22,
  });
  assert.equal(momentum.progressDelta, null, "submitting evidence does not earn weight, so nothing may be claimed");
});

test("a first value is stated plainly", () => {
  const momentum = procedureApprovedMomentum({
    roomHref: "/x",
    previousValue: null,
    currentValue: 22,
    firstStepTitle: "Next",
    firstStepOwner: "You",
  });
  assert.equal(progressDeltaSentence(momentum.progressDelta), "Procedural completion is now 22%.");
});

test("a rise is stated plainly", () => {
  const momentum = professionalMomentum({
    actionCompleted: "a",
    valueCreated: "b",
    workPreserved: "c",
    previousValue: 36,
    currentValue: 52,
    nextActionLabel: "d",
    nextActionHref: null,
    nextActionOwner: "e",
  });
  assert.equal(progressDeltaSentence(momentum.progressDelta), "Procedural completion moved from 36% to 52%.");
});

test("a fall is stated just as plainly, with its reason and no blame", () => {
  const momentum = professionalMomentum({
    actionCompleted: "a",
    valueCreated: "b",
    workPreserved: "c",
    previousValue: 76,
    currentValue: 66,
    nextActionLabel: "d",
    nextActionHref: null,
    nextActionOwner: "e",
  });
  const sentence = progressDeltaSentence(momentum.progressDelta)!;
  assert.match(sentence, /from 76% back to 66%/);
  assert.match(sentence, /returned to review/);
  for (const word of ["lost", "penalty", "failed", "setback", "regret"]) {
    assert.ok(!sentence.toLowerCase().includes(word), `a fall must not be punitive: it says '${word}'`);
  }
});

// ---------------------------------------------------------------------------
// The truthfulness of specific lines
// ---------------------------------------------------------------------------

test("submitting evidence is never described as verification", () => {
  const momentum = evidenceSubmittedMomentum({
    evidenceTitle: "Certificate",
    reviewerLabel: "Reviewer",
    href: "/x",
    previousValue: null,
    currentValue: null,
  });
  assert.match(momentum.valueCreated, /not a check/);
  assert.match(momentum.valueCreated, /has not been accepted yet/);
  assert.ok(!momentum.valueCreated.toLowerCase().includes("verified"));
});

test("acceptance for a procedure is never described as authenticity", () => {
  const momentum = evidenceAcceptedMomentum({
    evidenceTitle: "Certificate",
    stepTitle: "Capability",
    href: "/x",
    previousValue: 36,
    currentValue: 52,
    nextStepTitle: "Next",
    nextStepOwner: "Owner",
  });
  assert.match(momentum.valueCreated, /not a finding that the document is authentic/);
});

test("a resolved blocker is preserved, not deleted", () => {
  const momentum = blockerResolvedMomentum({
    blockerTitle: "X",
    href: "/x",
    previousValue: 52,
    currentValue: 60,
    nextStepTitle: "Next",
    nextStepOwner: "Owner",
  });
  assert.match(momentum.workPreserved, /Resolving it does not delete it/);
});

test("the read-only recognition is the one that proves nothing was lost", () => {
  const momentum = readOnlyMomentum({ href: "/x" });
  assert.match(momentum.workPreserved, /No evidence, decision, clarification or history has been deleted/);
  assert.match(momentum.workPreserved, /no re-upload and no re-admission/);
  assert.equal(momentum.progressDelta, null);
});

test("admission preserves the acceptance record with its version and date", () => {
  const momentum = admittedMomentum({
    organisationLabel: "Atlantico",
    roomHref: "/x",
    previousValue: null,
    currentValue: null,
  });
  assert.match(momentum.workPreserved, /version and date/);
});

console.log(`ok   deal-room momentum: ${passed} assertions passed`);
