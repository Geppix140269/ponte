// The Structure composer's navigation, as a member actually experiences it.
//
// Run: npx tsx --tsconfig tsconfig.ui-test.json lib/structure/__tests__/composer.test.tsx
//
// Three faults are pinned here, all of them dead ends the member could see but
// not act on:
//
//   1. A seller was asked where the goods GO. They do not decide that.
//   2. The preview printed "not stated" with no control on it, so the last
//      screen before submission was the one screen where a gap could not be
//      closed.
//   3. Resolve on the submit screen stepped back one screen, which landed on
//      the same summary and resolved nothing.
//
// The renderer is the project's own (lib/landing/__tests__/render.ts): elements
// are plain objects, so a handler found in the tree is the handler the browser
// would call.

import assert from "node:assert/strict";

// A browser-shaped global, installed before the component is imported.
(globalThis as Record<string, unknown>).window = {
  setTimeout: (fn: () => void, ms?: number) => setTimeout(fn, ms),
  clearTimeout: (id: unknown) => clearTimeout(id as ReturnType<typeof setTimeout>),
  setInterval: (fn: () => void, ms?: number) => setInterval(fn, ms),
  clearInterval: (id: unknown) => clearInterval(id as ReturnType<typeof setInterval>),
  matchMedia: () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} }),
};
(globalThis as Record<string, unknown>).fetch = () =>
  Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({}) });

/* eslint-disable import/first */
import StructureComposer from "../../../components/structure/StructureComposer";
import { mount, fire, type Mounted, type TestElement } from "../../landing/__tests__/render";
import type { CompletionField, Intent, StructureDraft } from "../draft";
/* eslint-enable import/first */

const tests: { name: string; fn: () => void }[] = [];
function test(name: string, fn: () => void): void {
  tests.push({ name, fn });
}

/**
 * The step element currently mounted inside the composer, found by a prop only
 * that step owns. (The account gate carries an onComplete of its own and is
 * always mounted, so a step is never identified by that name alone.)
 */
function stepWith(page: Mounted, ...propNames: string[]): TestElement {
  return page.find(
    (el) => propNames.every((n) => typeof el.props[n] === "function") && !!el.props.draft,
    propNames.join("+"),
  );
}

/** The visible text of a mounted step, as a single string. */
function textOf(el: TestElement): string {
  return mount(el.type as (p: unknown) => unknown, el.props)
    .all()
    .map((e) => e.props.children)
    .filter((c): c is string => typeof c === "string")
    .join(" | ");
}

/** Drive the composer to the facts screen with an intent and a product chosen. */
function atFacts(intent: Intent): Mounted {
  const page = mount(StructureComposer as unknown as (p: unknown) => unknown, {});
  const intentStep = stepWith(page, "onNext");
  const set = intentStep.props.set as (p: Partial<StructureDraft>) => void;
  set({ intent, product: "Maize (corn)", hsCode: "100590" });
  fire(stepWith(page, "onNext"), "onNext");                       // -> structuring
  fire(page.find((el) => typeof el.props.onDone === "function", "structuring"), "onDone"); // -> facts
  return page;
}

/** The draft as the currently mounted step sees it. */
function draftOf(page: Mounted): StructureDraft {
  return page.find((el) => !!el.props.draft, "a step holding the draft").props
    .draft as StructureDraft;
}

// ---- 1. the end of the route this member decides ---------------------------

test("a seller is never asked where the goods go", () => {
  const text = textOf(stepWith(atFacts("offer"), "onAdd"));
  assert.ok(!text.includes("field.destination"), "a seller is still asked for a destination");
  assert.ok(text.includes("field.origin"), "a seller is not asked where it ships from");
});

test("a buyer is asked where it goes, and not where it comes from", () => {
  const text = textOf(stepWith(atFacts("requirement"), "onAdd"));
  assert.ok(text.includes("field.destination"));
  assert.ok(!text.includes("field.origin"));
});

// ---- 2. every gap can be closed from where it is shown ---------------------

test("Add on a missing fact opens that fact, not the whole queue again", () => {
  const page = atFacts("offer");
  (stepWith(page, "onAdd").props.onAdd as (f: CompletionField) => void)("incoterm");
  const complete = page.find((el) => Array.isArray(el.props.fields), "the completion step");
  assert.deepEqual(complete.props.fields, ["incoterm"]);
});

test("the preview offers a control on every fact it prints, stated or not", () => {
  const page = atFacts("offer");
  fire(stepWith(page, "onComplete", "onAdd"), "onComplete");  // -> complete, full queue
  fire(stepWith(page, "onDone"), "onDone");                   // -> preview

  const preview = stepWith(page, "onEdit");
  const rows = mount(preview.type as (p: unknown) => unknown, preview.props)
    .all()
    .filter((el) => String(el.props.className ?? "") === "lrow__e");
  assert.ok(rows.length >= 4, `expected editable rows on the preview, found ${rows.length}`);
});

// ---- 3. Resolve resolves the thing it names --------------------------------

test("Resolve on a blocker opens that blocker's own field", () => {
  const page = atFacts("offer");
  fire(stepWith(page, "onComplete", "onAdd"), "onComplete");
  fire(stepWith(page, "onDone"), "onDone");                   // -> preview
  fire(stepWith(page, "onNext"), "onNext");                   // -> submit

  const submit = stepWith(page, "onResolve");
  (submit.props.onResolve as (f: CompletionField) => void)("validity");

  const complete = page.find((el) => Array.isArray(el.props.fields), "the completion step");
  assert.deepEqual(complete.props.fields, ["validity"], "Resolve landed somewhere else");
});

test("an edit returns to the screen that asked for it, not onwards to the preview", () => {
  const page = atFacts("offer");
  (stepWith(page, "onAdd").props.onAdd as (f: CompletionField) => void)("role");
  fire(page.find((el) => Array.isArray(el.props.fields), "completion"), "onDone");

  // Back on the facts screen: the edit did not push the member forward.
  assert.ok(
    page.all().some((el) => typeof el.props.onAdd === "function"),
    "an edit did not return to the screen it was opened from",
  );
});

// ---- the draft survives all of it ------------------------------------------

test("the tapped product and intent are never lost by navigating", () => {
  const page = atFacts("offer");
  fire(stepWith(page, "onComplete", "onAdd"), "onComplete");
  fire(stepWith(page, "onDone"), "onDone");
  const d = draftOf(page);
  assert.equal(d.intent, "offer");
  assert.equal(d.product, "Maize (corn)");
  assert.equal(d.hsCode, "100590");
});

let passed = 0;
for (const t of tests) {
  try {
    t.fn();
    passed++;
  } catch (err) {
    console.error(`FAIL  ${t.name}`);
    console.error(`      ${(err as Error).message}`);
    process.exitCode = 1;
  }
}
console.log(`structure/composer: ${passed}/${tests.length} passed`);
