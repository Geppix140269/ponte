// The agreed procedure: weights, structure, and the family separation.
//
// Run: npx tsx lib/deal-room/__tests__/procedure.test.ts

import assert from "node:assert/strict";
import {
  PROCEDURE_TEMPLATES,
  countingSteps,
  procedureDefects,
  procedureIsApprovable,
  templateFor,
  type MarketFamily,
  type ProcedureStep,
  type ProcedureStepInput,
} from "../procedure";

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

const FAMILIES: MarketFamily[] = ["products", "services", "distribution"];

// ---------------------------------------------------------------------------
// The weight law
// ---------------------------------------------------------------------------

for (const family of FAMILIES) {
  test(`${family}: the template is approvable`, () => {
    const defects = procedureDefects(templateFor(family).steps);
    assert.deepEqual(defects, [], `defects: ${defects.map((d) => d.message).join("; ")}`);
  });

  test(`${family}: weights sum to exactly 100`, () => {
    const total = templateFor(family).steps.reduce((sum, step) => sum + step.weight, 0);
    assert.equal(total, 100);
  });

  test(`${family}: the increments are irregular, not a ladder`, () => {
    const weights = templateFor(family).steps.map((step) => step.weight);
    assert.ok(new Set(weights).size > 1, "a uniform weight set is the equal ladder the Constitution names");
  });

  test(`${family}: admission plus procedure agreement lands in the 18-25 band`, () => {
    // Product definition 7.3: the first approved procedure displays a baseline
    // between 18% and 25%, because admission, terms and procedure agreement are
    // meaningful completed work. Those are the first two steps, and their
    // combined weight IS the baseline in the Deal Room's scale.
    const steps = templateFor(family).steps;
    const baseline =
      steps.find((s) => s.key === "admission_and_nda")!.weight +
      steps.find((s) => s.key === "procedure_agreed")!.weight;
    assert.ok(baseline >= 18 && baseline <= 25, `baseline ${baseline} is outside the approved 18-25 band`);
  });

  test(`${family}: every step states a completion condition`, () => {
    for (const step of templateFor(family).steps) {
      assert.ok(step.completionCondition.trim().length > 0, `${step.key} has no completion condition`);
    }
  });

  test(`${family}: every evidence step names a reviewer`, () => {
    for (const step of templateFor(family).steps) {
      if (step.requiresEvidence) {
        assert.ok(step.requiredReviewerRole, `${step.key} requires evidence but names no reviewer`);
      }
    }
  });

  test(`${family}: step keys are unique and sequence is dense`, () => {
    const steps = templateFor(family).steps;
    assert.equal(new Set(steps.map((s) => s.key)).size, steps.length);
    assert.deepEqual(
      steps.map((s) => s.seq),
      steps.map((_, i) => i + 1),
    );
  });
}

// ---------------------------------------------------------------------------
// ADR-0014 reaching the Deal Room: no product shape on the other two families
// ---------------------------------------------------------------------------

const PRODUCT_ONLY_WORDS = ["incoterm", "hs code", "packaging", "quantity", "tonne", "shipment", "container"];

for (const family of ["services", "distribution"] as MarketFamily[]) {
  test(`${family}: no product-only vocabulary appears anywhere in the procedure`, () => {
    const text = JSON.stringify(templateFor(family)).toLowerCase();
    for (const word of PRODUCT_ONLY_WORDS) {
      assert.ok(
        !text.includes(word),
        `'${word}' appears in the ${family} procedure. ADR-0014 removed the product shape from this family upstream; the procedure must not put it back.`,
      );
    }
  });
}

test("products keeps its own vocabulary", () => {
  const text = JSON.stringify(templateFor("products")).toLowerCase();
  assert.ok(text.includes("quantity"), "the products procedure should still specify a quantity");
});

test("the three families differ where they should and agree where they should", () => {
  const scope = FAMILIES.map((f) => templateFor(f).steps.find((s) => s.key === "commercial_scope")!.title);
  assert.equal(new Set(scope).size, 3, "each family must specify its own commercial scope in its own terms");

  const admission = FAMILIES.map((f) => templateFor(f).steps.find((s) => s.key === "admission_and_nda")!.title);
  assert.equal(new Set(admission).size, 1, "admission is the same act in every family");
});

// ---------------------------------------------------------------------------
// Structural validation: the defects that must block approval
// ---------------------------------------------------------------------------

function stepsWith(overrides: Partial<ProcedureStepInput>[]): ProcedureStepInput[] {
  const base = [...templateFor("products").steps].map((s) => ({ ...s }));
  overrides.forEach((patch, index) => Object.assign(base[index], patch));
  return base;
}

test("weights that do not sum to 100 block approval", () => {
  const steps = stepsWith([{ weight: 11 }]);
  const defects = procedureDefects(steps);
  assert.ok(defects.some((d) => d.code === "weights"));
  assert.equal(procedureIsApprovable(steps), false);
});

test("a uniform ladder blocks approval", () => {
  const steps: ProcedureStepInput[] = Array.from({ length: 4 }, (_, i) => ({
    ...templateFor("products").steps[0],
    key: `s${i}`,
    seq: i + 1,
    weight: 25,
  }));
  assert.ok(procedureDefects(steps).some((d) => d.code === "weights"));
});

test("an evidence step with no reviewer blocks approval", () => {
  const steps = stepsWith([{}, {}, { requiresEvidence: true, requiredReviewerRole: null }]);
  assert.ok(procedureDefects(steps).some((d) => d.code === "missing_reviewer"));
});

test("a missing completion condition blocks approval", () => {
  const steps = stepsWith([{ completionCondition: "   " }]);
  assert.ok(procedureDefects(steps).some((d) => d.code === "missing_completion_condition"));
});

test("a duplicate step key blocks approval", () => {
  const steps = stepsWith([{}, { key: "admission_and_nda" }]);
  assert.ok(procedureDefects(steps).some((d) => d.code === "duplicate_key"));
});

test("an empty procedure blocks approval", () => {
  assert.deepEqual(
    procedureDefects([]).map((d) => d.code),
    ["no_steps"],
  );
});

test("every defect is reported, not just the first", () => {
  // DR-09 requires the builder to show unresolved structural errors, plural.
  const steps = stepsWith([{ completionCondition: "" }, { key: "admission_and_nda", completionCondition: "" }]);
  const defects = procedureDefects(steps);
  assert.ok(defects.length >= 3, `expected several defects, got ${defects.length}`);
});

// ---------------------------------------------------------------------------
// Denominator
// ---------------------------------------------------------------------------

test("not applicable and cancelled steps leave the denominator", () => {
  const steps: ProcedureStep[] = templateFor("products").steps.map((s, i) => ({
    ...s,
    state: i === 4 ? "not_applicable" : i === 5 ? "cancelled" : "ready",
  }));
  const counting = countingSteps(steps);
  assert.equal(counting.length, steps.length - 2);
  assert.ok(!counting.some((s) => s.state === "not_applicable" || s.state === "cancelled"));
});

test("a blocked step stays in the denominator", () => {
  const steps: ProcedureStep[] = templateFor("products").steps.map((s, i) => ({
    ...s,
    state: i === 3 ? "blocked" : "ready",
  }));
  assert.equal(countingSteps(steps).length, steps.length);
});

test("all three templates are registered", () => {
  assert.deepEqual(Object.keys(PROCEDURE_TEMPLATES).sort(), ["distribution", "products", "services"]);
});

console.log(`ok   deal-room procedure: ${passed} assertions passed`);
