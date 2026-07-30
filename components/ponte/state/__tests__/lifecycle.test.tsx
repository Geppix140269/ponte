// The lifecycle states: distinct, truthful, and readable without colour.
//
// Run: npx tsx --tsconfig tsconfig.ui-test.json components/ponte/state/__tests__/lifecycle.test.tsx
//
// Two kinds of claim are tested here, and the second is the one that matters.
//
// The easy claim is that each state renders. The hard claim is that the seven
// states stay SEPARATE, that nothing collapses "waiting for the member" into
// "under review", or lets a completed stage read as a verified one. Those are
// not styling mistakes; they are the interface asserting something the record
// does not support, which is what Constitution section 14 and the Flow state
// definitions exist to prevent.
//
// So the assertions below are largely about difference: different words,
// different geometry, different announcement, and no shared drawing that would
// let two states be mistaken for one another in greyscale.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import LifecycleState, { type LifecycleStateName } from "../LifecycleState";

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

const css = readFileSync("components/ponte/state/state.css", "utf8");

/**
 * The stylesheet with its comments removed.
 *
 * The comments in `state.css` explain which states may not claim verification,
 * so they legitimately contain the words the assertions below search for.
 * Testing against the prose would make the file's own documentation fail it.
 */
const rules = (() => {
  const stripped = css.replace(/\/\*[\s\S]*?\*\//g, "");
  // Flatten grouped selectors: `.a, .b { … }` is two rules that share a body,
  // and a regex that reads only up to the first `{` sees only `.a`.
  const parsed: { selector: string; body: string }[] = [];
  for (const [, selectors, body] of Array.from(stripped.matchAll(/([^{}]+)\{([^{}]*)\}/g))) {
    for (const selector of selectors.split(",")) {
      const trimmed = selector.trim();
      if (trimmed && !trimmed.startsWith("@") && !/^\d/.test(trimmed)) {
        parsed.push({ selector: trimmed, body });
      }
    }
  }
  return parsed;
})();

/** Every state modifier whose rule body matches a predicate. */
function statesWhere(predicate: (body: string) => boolean): string[] {
  const found = new Set<string>();
  for (const { selector, body } of rules) {
    const match = /\.pst--([a-z]+)/.exec(selector);
    if (match && predicate(body)) found.add(match[1]);
  }
  return Array.from(found).sort();
}

const ALL: LifecycleStateName[] = ["loading", "waiting", "blocked", "active", "review", "completed", "error"];

/** Render helper that satisfies `blocked`'s required detail. */
function render(state: LifecycleStateName, label = "Label", detail?: string): string {
  return state === "blocked"
    ? renderToStaticMarkup(<LifecycleState state="blocked" label={label} detail={detail ?? "A condition"} />)
    : renderToStaticMarkup(
        <LifecycleState state={state as Exclude<LifecycleStateName, "blocked">} label={label} detail={detail} />,
      );
}

test("all seven states exist and render their own modifier", () => {
  assert.equal(ALL.length, 7);
  for (const state of ALL) {
    const html = render(state);
    assert.match(html, new RegExp(`pst--${state === "review" ? "review" : state}`), `${state} has no modifier class`);
    assert.match(html, new RegExp(`data-state="${state}"`), `${state} does not identify itself`);
  }
});

test("every state carries its meaning in words, not only in colour", () => {
  for (const state of ALL) {
    const html = render(state, `The ${state} state`);
    assert.ok(html.includes(`The ${state} state`), `${state} did not render its label`);
    // Strip the tags: what is left is what a greyscale reader gets.
    const text = html.replace(/<[^>]+>/g, "").trim();
    assert.ok(text.length > 0, `${state} renders no text at all, so colour is its only carrier`);
  }
});

test("each state has its own modifier rule in the stylesheet", () => {
  for (const state of ALL) {
    assert.ok(new RegExp(`\\.pst--${state}\\b`).test(css), `${state} has no styling of its own`);
  }
});

// ---------------------------------------------------------------------------
// The distinctions that must not collapse
// ---------------------------------------------------------------------------

test("waiting and under review are different states", () => {
  // Waiting means the member is the blocker. Under review means Ponte has
  // opened a review and a person here must finish it. Both are slate, so the
  // difference has to be carried by geometry and words rather than colour.
  const waiting = render("waiting", "Waiting for you");
  const review = render("review", "Under review");
  assert.notEqual(waiting, review, "waiting and under review render identically");
  assert.ok(/\.pst--review\s+\.pst__mark::before/.test(css), "under review has no ring to distinguish it from waiting");
  assert.ok(
    !/\.pst--waiting\s+\.pst__mark::(before|after)/.test(css),
    "waiting has gained a marker decoration, which is what distinguishes under review from it",
  );
});

test("blocked and error are different states, and different drawings", () => {
  const blocked = render("blocked", "Blocked", "Verification is not complete");
  const error = render("error", "Something went wrong");
  assert.notEqual(blocked, error, "blocked and error render identically");
  // Both are red, so greyscale has to separate them: error hollows its point.
  assert.ok(/\.pst--error\s+\.pst__point\s*\{[^}]*background:\s*var\(--pf-surface\)/.test(css), "error does not hollow its point, so it is the same drawing as blocked in greyscale");
});

test("completed says a stage finished, and offers no way to say verified", () => {
  const html = render("completed", "Draft complete");
  assert.ok(html.includes("Draft complete"));
  // The component has no verified state and must not grow one: verification is
  // a different axis, established by its own event.
  assert.ok(!ALL.includes("verified" as LifecycleStateName), "a verified lifecycle state has been added");
  // Against the selectors and declarations, not the prose: the file's own
  // comments explain why verification language is forbidden, and quoting a rule
  // is not breaking it.
  for (const { selector, body } of rules) {
    assert.ok(
      !/verified|trusted|guaranteed/i.test(`${selector}${body}`),
      `the stylesheet has gained verification language in '${selector}'`,
    );
  }
});

test("the active moving point is gold, and gold is used for nothing else", () => {
  // Amended by ADR-0015 Stage 1. Constitution 6b splits gold into three tokens,
  // because the brand fill cannot carry a line or a small mark: --pf-gold measured
  // 2.54:1 on the page ground and this is an 8px state marker. The point is now
  // --pf-gold-rule, which is 3.03:1 against the darkest surface it prints on. The
  // MEANING is unchanged, and that is what this test is really guarding: gold still
  // marks the moving point and nothing else.
  // Constitution section 6: gold is the brand signal and the moving point. It
  // is never verification, warning, approval, review or success.
  const gold = statesWhere((body) => /var\(--pf-gold(-rule)?\)/.test(body));
  assert.deepEqual(gold, ["active", "loading"], `gold reached states it must not: ${gold.join(", ")}`);
});

test("each state uses the approved semantic token, and no literal colour", () => {
  assert.ok(
    !/#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(/.test(css),
    "the lifecycle stylesheet declares a literal colour instead of an approved token",
  );
  for (const [state, token] of [
    ["waiting", "--pf-review"],
    ["review", "--pf-review"],
    ["blocked", "--pf-danger"],
    ["error", "--pf-danger"],
    ["completed", "--pf-positive"],
    ["active", "--pf-gold-rule"],
    ["loading", "--pf-gold-rule"],
  ] as const) {
    assert.ok(
      statesWhere((body) => body.includes(`var(${token})`)).includes(state),
      `${state} does not take its colour from ${token}`,
    );
  }
});

// ---------------------------------------------------------------------------
// Motion
// ---------------------------------------------------------------------------

test("only the states where work is genuinely happening animate", () => {
  const animated = statesWhere((body) => /animation:\s*(?!none)/.test(body));
  assert.deepEqual(
    animated,
    ["active", "loading"],
    `a state animates that should be still: ${animated.join(", ")}. A halted point means a person ` +
      `must act and must never pulse for attention.`,
  );
});

test("under review and waiting must not animate, no decision exists yet", () => {
  for (const state of ["review", "waiting", "blocked", "completed", "error"]) {
    const moving = rules.some(
      ({ selector, body }) => selector.includes(`.pst--${state}`) && /animation:\s*(?!none)/.test(body),
    );
    assert.equal(moving, false, `${state} animates, implying work is underway that is not`);
  }
});

test("reduced motion removes movement through both approved hooks", () => {
  assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)/, "the OS setting is not honoured");
  assert.match(css, /\[data-reduced-motion="1"\]/, "the in-product toggle is not honoured");
  // Both must stop the animation and do nothing else, a removal, not a redraw.
  const blocks = Array.from(css.matchAll(/(?:@media\s*\(prefers-reduced-motion: reduce\)|\[data-reduced-motion="1"\])[^{]*\{([\s\S]*?)\n\}/g));
  assert.ok(blocks.length >= 2, "one of the two reduced-motion hooks is missing");
  for (const [, body] of blocks) {
    const properties = Array.from(body.matchAll(/^\s*([a-z-]+):/gm)).map((m) => m[1]);
    for (const property of properties) {
      assert.equal(property, "animation", `reduced motion sets '${property}', which redraws rather than removes`);
    }
  }
});

test("no information depends on the animation running", () => {
  // The settled frame is the authored one: label, detail and marker geometry
  // are all in the markup, none of them produced by a keyframe.
  const html = render("active", "Searching", "Checking 3,517 signals");
  assert.ok(html.includes("Searching"));
  assert.ok(html.includes("Checking 3,517 signals"));
  assert.match(html, /class="pst__point"/, "the point is not in the settled markup");
});

// ---------------------------------------------------------------------------
// Accessibility
// ---------------------------------------------------------------------------

test("the marker is hidden from assistive technology, the words are not", () => {
  for (const state of ALL) {
    const html = render(state, "A state");
    assert.match(html, /class="pst__mark" aria-hidden="true"/, `${state}'s marker is announced as well as its label`);
  }
});

test("states that change under the reader announce politely; settled states do not", () => {
  for (const state of ["loading", "active", "error"] as const) {
    assert.match(render(state), /role="status"/, `${state} does not announce when it appears`);
  }
  for (const state of ["waiting", "blocked", "review", "completed"] as const) {
    assert.ok(!/role="status"/.test(render(state)), `${state} announces, though it is read in document order`);
  }
  // Never assertive: none of these justify interrupting the reader.
  for (const state of ALL) {
    assert.ok(!/aria-live="assertive"|role="alert"/.test(render(state)), `${state} interrupts the reader`);
  }
});

test("a status is not a control and takes no tab stop", () => {
  for (const state of ALL) {
    const html = render(state);
    assert.ok(!/tabindex|<button|<a\s/i.test(html), `${state} renders something focusable`);
  }
});

test("blocked always states its condition", () => {
  // Enforced by the type, so this asserts the rendered outcome: the reason
  // reaches the reader rather than being accepted and dropped.
  const html = render("blocked", "Cannot submit", "Your business profile is incomplete");
  assert.ok(html.includes("Your business profile is incomplete"), "the blocking condition was not rendered");
  assert.match(html, /class="pst__detail"/);
});

if (process.exitCode) console.error(`\n${passed} passed, some failed.`);
else console.log(`ok   ${passed} lifecycle state tests passed`);
