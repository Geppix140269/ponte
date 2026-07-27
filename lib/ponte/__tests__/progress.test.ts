// The progress engine: every boundary the Constitution's progress law names.
//
// Run: npx tsx lib/ponte/__tests__/progress.test.ts
//
// Progress is the place this product is most likely to tell a lie by accident.
// A number that rounds up, a bar that fills on re-render, a 100% that reads as
// "verified" — none of these look like defects in review, and all of them make
// the interface claim something that has not happened. So the assertions here
// are about truthfulness first and arithmetic second.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  PROGRESS_FLOOR,
  assertWeights,
  progressBand,
  progressValue,
  type ProgressStep,
} from "../progress";

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

/** A realistic irregular procedure: five steps, no two of the same weight. */
const STEPS: ProgressStep[] = [
  { id: "subject", weight: 28 },
  { id: "facts", weight: 24 },
  { id: "detail", weight: 19 },
  { id: "evidence", weight: 17 },
  { id: "preview", weight: 12 },
];

// ---------------------------------------------------------------------------
// The floor, and the two authorities that set it
// ---------------------------------------------------------------------------

test("the floor is the approved token value, not a number chosen here", () => {
  const tokens = readFileSync("design-system/ponte-flow/tokens/ponte-flow-tokens.css", "utf8");
  const declared = /--pf-progress-floor:\s*(\d+)/.exec(tokens);
  assert.ok(declared, "--pf-progress-floor is no longer declared in the approved token file");
  assert.equal(
    PROGRESS_FLOOR,
    Number(declared![1]),
    "the engine's floor has drifted from the approved token",
  );
});

test("the floor sits inside the Constitution's stated band", () => {
  // Section 9: "the first visible completion value normally begins between 18%
  // and 25%". The engine contract narrows that to exactly 20. Both must hold.
  assert.ok(PROGRESS_FLOOR >= 18 && PROGRESS_FLOOR <= 25, `floor ${PROGRESS_FLOOR} is outside the 18–25 band`);
});

// ---------------------------------------------------------------------------
// Never zero, never a percentage before meaningful action
// ---------------------------------------------------------------------------

test("nothing completed is null, not zero", () => {
  assert.equal(progressValue(STEPS, []), null);
});

test("no completed set can produce a value below the floor", () => {
  // Every non-empty subset, exhaustively. 31 of them, so there is no need to
  // sample: the claim is universal and can be proved rather than spot-checked.
  for (let mask = 1; mask < 1 << STEPS.length; mask++) {
    const done = STEPS.filter((_, i) => mask & (1 << i)).map((s) => s.id);
    const value = progressValue(STEPS, done)!;
    assert.ok(value >= PROGRESS_FLOOR, `${done.join("+")} produced ${value}, below the floor`);
    assert.ok(value <= 100, `${done.join("+")} produced ${value}, above 100`);
  }
});

test("the lightest single step still clears the floor", () => {
  const value = progressValue(STEPS, ["preview"])!;
  assert.ok(value >= PROGRESS_FLOOR, `the smallest step produced ${value}`);
  assert.equal(value, 30); // 20 + 80 * 12/100
});

// ---------------------------------------------------------------------------
// 100 means the procedure is complete, and nothing else
// ---------------------------------------------------------------------------

test("100 is reached only when every step is complete", () => {
  assert.equal(progressValue(STEPS, STEPS.map((s) => s.id)), 100);

  for (let mask = 1; mask < (1 << STEPS.length) - 1; mask++) {
    const done = STEPS.filter((_, i) => mask & (1 << i)).map((s) => s.id);
    assert.notEqual(progressValue(STEPS, done), 100, `${done.join("+")} reached 100 without completing the procedure`);
  }
});

test("an almost-complete procedure is capped at 99 and never rounds up", () => {
  // A procedure whose last step is worth a single point: by weight it is 99%
  // done, which rounds to 100 without the cap. This is the exact arithmetic
  // that would let an unfinished record render as finished.
  const nearly: ProgressStep[] = [
    { id: "bulk", weight: 99 },
    { id: "last", weight: 1 },
  ];
  assert.equal(progressValue(nearly, ["bulk"]), 99);
  assert.equal(progressValue(nearly, ["bulk", "last"]), 100);
});

test("100 is never labelled verified, trusted or safe", () => {
  const forbidden = /verified|trusted|safe|guaranteed|approved/i;
  for (const scale of ["opportunity", "profile", "submission"] as const) {
    const label = progressBand(100, scale);
    assert.ok(!forbidden.test(label), `the ${scale} scale labels 100 '${label}'`);
  }
  // The engine contract names the submission wording at 100 exactly.
  assert.equal(progressBand(100, "submission"), "Ready to submit for review");
  assert.equal(progressBand(100, "opportunity"), "Draft complete");
  assert.equal(progressBand(100, "profile"), "Profile information complete");
});

// ---------------------------------------------------------------------------
// Determinism
// ---------------------------------------------------------------------------

test("the same completed state always produces the same value", () => {
  const done = ["facts", "evidence"];
  const first = progressValue(STEPS, done);
  for (let i = 0; i < 100; i++) {
    assert.equal(progressValue(STEPS, done), first, "the value moved between identical calls");
  }
});

test("the order the completed set arrives in does not change the value", () => {
  const a = progressValue(STEPS, ["subject", "facts", "detail"]);
  const b = progressValue(STEPS, ["detail", "subject", "facts"]);
  const c = progressValue(STEPS, ["facts", "detail", "subject"]);
  assert.equal(a, b);
  assert.equal(b, c);
});

test("a repeated id is counted once", () => {
  assert.equal(progressValue(STEPS, ["facts", "facts", "facts"]), progressValue(STEPS, ["facts"]));
});

test("the value is a function of the completed set alone — no hidden state", () => {
  // Interleaving different inputs would expose any memo or accumulator.
  const alone = progressValue(STEPS, ["subject"]);
  progressValue(STEPS, ["subject", "facts", "detail", "evidence"]);
  progressValue(STEPS, []);
  assert.equal(progressValue(STEPS, ["subject"]), alone, "an earlier call changed a later answer");
});

test("progress is monotonic: completing more work never lowers the value", () => {
  for (let mask = 0; mask < 1 << STEPS.length; mask++) {
    for (let bit = 0; bit < STEPS.length; bit++) {
      if (mask & (1 << bit)) continue;
      const before = progressValue(STEPS, STEPS.filter((_, i) => mask & (1 << i)).map((s) => s.id)) ?? PROGRESS_FLOOR;
      const after = progressValue(STEPS, STEPS.filter((_, i) => (mask | (1 << bit)) & (1 << i)).map((s) => s.id))!;
      assert.ok(after >= before, `completing '${STEPS[bit].id}' moved the value from ${before} down to ${after}`);
    }
  }
});

// ---------------------------------------------------------------------------
// Irregular, non-mechanical increments
// ---------------------------------------------------------------------------

test("a uniform weight set is rejected as a mechanical ladder", () => {
  const uniform: ProgressStep[] = [
    { id: "a", weight: 25 },
    { id: "b", weight: 25 },
    { id: "c", weight: 25 },
    { id: "d", weight: 25 },
  ];
  assert.throws(() => assertWeights(uniform), /irregular, non-mechanical increments/);
  assert.throws(() => progressValue(uniform, ["a"]), /irregular, non-mechanical increments/);
});

test("a single-step procedure is exempt — one step is no ladder", () => {
  const single: ProgressStep[] = [{ id: "only", weight: 100 }];
  assert.doesNotThrow(() => assertWeights(single));
  assert.equal(progressValue(single, []), null);
  assert.equal(progressValue(single, ["only"]), 100);
});

test("the increments an irregular procedure produces are themselves irregular", () => {
  // Walk the steps in order and check the gaps are not all equal — the property
  // the weights exist to create, asserted on the output rather than the input.
  const gaps: number[] = [];
  let previous = PROGRESS_FLOOR;
  const done: string[] = [];
  for (const step of STEPS) {
    done.push(step.id);
    const value = progressValue(STEPS, done)!;
    gaps.push(value - previous);
    previous = value;
  }
  assert.ok(new Set(gaps).size > 1, `every increment was the same size: ${gaps.join(", ")}`);
  assert.ok(!gaps.every((g) => g === gaps[0]), "the ladder is mechanical");
});

// ---------------------------------------------------------------------------
// Weight validation
// ---------------------------------------------------------------------------

test("weights must sum to exactly 100", () => {
  assert.throws(() => assertWeights([{ id: "a", weight: 50 }, { id: "b", weight: 30 }]), /sum to exactly 100, not 80/);
  assert.throws(() => assertWeights([{ id: "a", weight: 70 }, { id: "b", weight: 40 }]), /sum to exactly 100, not 110/);
});

test("weights must be positive integers", () => {
  assert.throws(() => assertWeights([{ id: "a", weight: 0 }, { id: "b", weight: 100 }]), /positive integers/);
  assert.throws(() => assertWeights([{ id: "a", weight: -10 }, { id: "b", weight: 110 }]), /positive integers/);
  assert.throws(() => assertWeights([{ id: "a", weight: 33.3 }, { id: "b", weight: 66.7 }]), /positive integers/);
});

test("step ids must be unique", () => {
  assert.throws(() => assertWeights([{ id: "a", weight: 60 }, { id: "a", weight: 40 }]), /unique/);
});

test("an empty procedure is rejected", () => {
  assert.throws(() => assertWeights([]), /at least one step/);
});

test("an unknown completed id is a divergence, not a value to guess around", () => {
  assert.throws(() => progressValue(STEPS, ["subject", "nonexistent"]), /diverged/);
});

// ---------------------------------------------------------------------------
// Band copy
// ---------------------------------------------------------------------------

test("every band boundary carries the approved wording", () => {
  // Transcribed from the engine contract's table, asserted at both edges of
  // each band so an off-by-one in the boundary shows up.
  const expected: [number, string, string, string][] = [
    [20, "Deal started", "Profile started", "Not ready to submit"],
    [39, "Deal started", "Profile started", "Not ready to submit"],
    [40, "Core information added", "Basic details recorded", "Not ready to submit"],
    [59, "Core information added", "Basic details recorded", "Not ready to submit"],
    [60, "Good commercial detail", "Profile taking shape", "Ready to preview"],
    [79, "Good commercial detail", "Profile taking shape", "Ready to preview"],
    [80, "Nearly ready to submit", "Nearly complete", "Ready to save"],
    [99, "Nearly ready to submit", "Nearly complete", "Ready to save"],
    [100, "Draft complete", "Profile information complete", "Ready to submit for review"],
  ];
  for (const [value, opportunity, profile, submission] of expected) {
    assert.equal(progressBand(value, "opportunity"), opportunity, `opportunity at ${value}`);
    assert.equal(progressBand(value, "profile"), profile, `profile at ${value}`);
    assert.equal(progressBand(value, "submission"), submission, `submission at ${value}`);
  }
});

test("a value outside the approved range has no band", () => {
  assert.throws(() => progressBand(0, "opportunity"), /outside the approved/);
  assert.throws(() => progressBand(19, "opportunity"), /outside the approved/);
  assert.throws(() => progressBand(101, "opportunity"), /outside the approved/);
});

test("every value the engine can produce has a band", () => {
  for (let mask = 1; mask < 1 << STEPS.length; mask++) {
    const value = progressValue(STEPS, STEPS.filter((_, i) => mask & (1 << i)).map((s) => s.id))!;
    for (const scale of ["opportunity", "profile", "submission"] as const) {
      assert.doesNotThrow(() => progressBand(value, scale), `no band for ${value} on the ${scale} scale`);
    }
  }
});

if (process.exitCode) console.error(`\n${passed} passed, some failed.`);
else console.log(`ok   ${passed} progress engine tests passed`);
