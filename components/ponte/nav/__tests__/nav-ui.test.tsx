// The shared navigation primitives, driven the way a member drives them.
//
// Run: npx tsx --tsconfig tsconfig.ui-test.json components/ponte/nav/__tests__/nav-ui.test.tsx
//
// The project renderer (lib/landing/__tests__/render.ts) calls the component
// with a real hook dispatcher and re-renders on setState, so a handler found in
// the tree is the same function the browser would call and the state it changes
// is observable. Effects are a no-op here (they belong to a real commit), which
// is exactly right: these assertions are about the guard's DECISIONS and the
// dialog's STRUCTURE, not about the beforeunload listener or focus management,
// which are integration concerns.

import assert from "node:assert/strict";
import React from "react";

/* eslint-disable import/first */
import JourneyBack from "../JourneyBack";
import UnsavedChangesDialog, { type SaveOption } from "../UnsavedChangesDialog";
import { useUnsavedGuard } from "../useUnsavedGuard";
import { mount, type TestElement } from "../../../../lib/landing/__tests__/render";
/* eslint-enable import/first */

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

/** Translations are identity here: the assertions are about structure. */
const t = (key: string): string => key;

const hasClass = (el: TestElement, name: string): boolean =>
  typeof el.props.className === "string" && (el.props.className as string).split(" ").includes(name);

const byClass = (els: TestElement[], name: string): TestElement[] => els.filter((e) => hasClass(e, name));

// -- JourneyBack --------------------------------------------------------------

test("JourneyBack renders a labelled button that never relies on an icon", () => {
  const page = mount(JourneyBack as unknown as (p: unknown) => unknown, {
    label: "Back to Market Signals",
    onClick: () => {},
  });
  const buttons = page.all().filter((e) => e.type === "button");
  assert.equal(buttons.length, 1, "one button");
  // The visible label is present as a child, so it is never icon-only.
  const children = ([] as unknown[]).concat(buttons[0].props.children as unknown[]);
  assert.ok(
    children.includes("Back to Market Signals"),
    "the visible label is rendered as text",
  );
  assert.equal(buttons[0].props.type, "button");
});

test("JourneyBack calls its handler when pressed", () => {
  let clicked = 0;
  const page = mount(JourneyBack as unknown as (p: unknown) => unknown, {
    label: "Back",
    onClick: () => {
      clicked++;
    },
  });
  const button = page.all().find((e) => e.type === "button")!;
  (button.props.onClick as () => void)();
  assert.equal(clicked, 1);
});

// -- useUnsavedGuard ----------------------------------------------------------

function Probe({ dirty, onProceed }: { dirty: boolean; onProceed: () => void }) {
  const { guard, promptOpen, onContinueEditing, leaveNow } = useUnsavedGuard(dirty);
  return React.createElement(
    "div",
    null,
    React.createElement("button", { "data-x": "go", onClick: () => guard(onProceed) }),
    React.createElement("button", { "data-x": "continue", onClick: onContinueEditing }),
    React.createElement("button", { "data-x": "leave", onClick: leaveNow }),
    React.createElement("span", { "data-x": "open" }, String(promptOpen)),
  );
}

const pick = (page: ReturnType<typeof mount>, x: string): TestElement =>
  page.all().find((e) => e.props["data-x"] === x)!;

test("a clean draft leaves at once, with no prompt", () => {
  let proceeded = 0;
  const page = mount(Probe as unknown as (p: unknown) => unknown, {
    dirty: false,
    onProceed: () => {
      proceeded++;
    },
  });
  (pick(page, "go").props.onClick as () => void)();
  assert.equal(proceeded, 1, "navigation ran immediately");
  assert.equal(pick(page, "open").props.children, "false", "no dialog opened");
});

test("a dirty draft holds the navigation behind the dialog", () => {
  let proceeded = 0;
  const page = mount(Probe as unknown as (p: unknown) => unknown, {
    dirty: true,
    onProceed: () => {
      proceeded++;
    },
  });
  (pick(page, "go").props.onClick as () => void)();
  assert.equal(proceeded, 0, "navigation is held, not run");
  assert.equal(pick(page, "open").props.children, "true", "the dialog is open");
});

test("Continue editing drops the held navigation and stays", () => {
  let proceeded = 0;
  const page = mount(Probe as unknown as (p: unknown) => unknown, {
    dirty: true,
    onProceed: () => {
      proceeded++;
    },
  });
  (pick(page, "go").props.onClick as () => void)();
  (pick(page, "continue").props.onClick as () => void)();
  assert.equal(proceeded, 0, "the held navigation never runs");
  assert.equal(pick(page, "open").props.children, "false", "the dialog closes");
});

test("Leave without saving runs the held navigation", () => {
  let proceeded = 0;
  const page = mount(Probe as unknown as (p: unknown) => unknown, {
    dirty: true,
    onProceed: () => {
      proceeded++;
    },
  });
  (pick(page, "go").props.onClick as () => void)();
  (pick(page, "leave").props.onClick as () => void)();
  assert.equal(proceeded, 1, "the held navigation runs exactly once");
  assert.equal(pick(page, "open").props.children, "false", "the dialog closes");
});

// -- UnsavedChangesDialog -----------------------------------------------------

function dialog(open: boolean, save: SaveOption, onContinue = () => {}, onLeave = () => {}) {
  return mount(UnsavedChangesDialog as unknown as (p: unknown) => unknown, {
    open,
    save,
    onContinueEditing: onContinue,
    onLeave,
    t,
  });
}

test("a closed dialog renders nothing", () => {
  const page = dialog(false, null);
  assert.equal(page.all().length, 0);
});

test("an open dialog is an alertdialog with the safe action and the leave action", () => {
  const page = dialog(true, null);
  const panel = page.all().find((e) => e.props.role === "alertdialog");
  assert.ok(panel, "role=alertdialog is present");
  assert.equal(panel!.props["aria-modal"], "true");
  assert.equal(byClass(page.all(), "pux-btn--safe").length, 1, "one safe action");
  assert.equal(byClass(page.all(), "pux-btn--leave").length, 1, "one leave action");
  assert.equal(byClass(page.all(), "pux-btn--draft").length, 0, "no save action when save is null");
});

test("the safe action resolves Continue editing", () => {
  let continued = 0;
  const page = dialog(true, null, () => {
    continued++;
  });
  const safe = byClass(page.all(), "pux-btn--safe")[0];
  (safe.props.onClick as () => void)();
  assert.equal(continued, 1);
});

test("an authenticated journey is offered Save as draft", () => {
  let saved = 0;
  const page = dialog(true, { kind: "draft", onSave: () => saved++ });
  const draftBtn = byClass(page.all(), "pux-btn--draft");
  assert.equal(draftBtn.length, 1, "the draft action is present");
  (draftBtn[0].props.onClick as () => void)();
  assert.equal(saved, 1);
});

test("an anonymous journey is offered Sign in and save with an honest note", () => {
  const page = dialog(true, { kind: "signin", onSignIn: () => {} });
  assert.equal(byClass(page.all(), "pux-btn--draft").length, 1, "the sign-in-and-save action is present");
  const note = byClass(page.all(), "pux__note");
  assert.equal(note.length, 1, "the honest sign-in-to-save note is shown");
});

if (process.exitCode) {
  console.error(`\nnav-ui: ${passed} passed, then a failure`);
} else {
  console.log(`ok   ponte/nav ui (${passed} assertions)`);
}
