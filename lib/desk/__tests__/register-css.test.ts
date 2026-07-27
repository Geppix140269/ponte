// The register's responsive contract, asserted against the stylesheet itself.
//
// Run: npx tsx lib/desk/__tests__/register-css.test.ts
//
// `factsFor` proves the AUTHORITY returns a prefix. That is only half the
// claim. The register renders the desktop count of facts into one DOM at every
// width and lets CSS drop the tail, so the sentence "a 390px row shows the
// first two of the desktop three" is true only if the stylesheet drops cells
// from the RIGHT. A rule that hid the second fact while keeping the third would
// leave the authority's test green and the rendered row wrong, which is exactly
// the shape of fault the C1 to C10 log records: a check narrower than its own
// description.
//
// So this asserts the property on the stylesheet: at every breakpoint, the set
// of hidden fact cells is a suffix of the fact cells, never a hole in the
// middle and never a prefix.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

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

const css = readFileSync("components/desk/desk.css", "utf8");

/**
 * The fact cells' positions in `.reg__row`.
 *
 * The row is: classification, title, fact, fact, fact, read, action. The three
 * fact cells are therefore children 3, 4 and 5, in the authority's own order.
 * Derived here rather than hardcoded in the assertion so that changing the row
 * shape changes one line.
 */
const FACT_CHILDREN = [3, 4, 5];

/** Every `max-width` block in the sheet, with its own text. */
function mediaBlocks(): { maxWidth: number; body: string }[] {
  const out: { maxWidth: number; body: string }[] = [];
  const re = /@media\s*\(max-width:\s*(\d+)px\)\s*\{/g;
  let m: RegExpExecArray | null;

  while ((m = re.exec(css)) !== null) {
    // Walk braces from the opening one so nested rules are captured whole.
    let depth = 1;
    let i = re.lastIndex;
    while (i < css.length && depth > 0) {
      if (css[i] === "{") depth++;
      else if (css[i] === "}") depth--;
      i++;
    }
    out.push({ maxWidth: Number(m[1]), body: css.slice(re.lastIndex, i - 1) });
  }
  return out;
}

/** The `.reg__row` children a block hides. */
function hiddenIn(body: string): number[] {
  const hidden: number[] = [];
  // Selector lists may span lines and carry several nth-child selectors before
  // one `display: none`, which is how the sheet is actually written.
  const re = /([^{}]*nth-child\([^{}]*)\{([^{}]*)\}/g;
  let m: RegExpExecArray | null;

  while ((m = re.exec(body)) !== null) {
    if (!/display\s*:\s*none/.test(m[2])) continue;
    const selector = m[1];
    if (!selector.includes(".reg__row")) continue;
    const n = /\.reg__row\s*>\s*\*:nth-child\((\d+)\)/g;
    let hit: RegExpExecArray | null;
    while ((hit = n.exec(selector)) !== null) hidden.push(Number(hit[1]));
  }
  return hidden;
}

const BLOCKS = mediaBlocks();

test("the stylesheet has responsive blocks to check at all", () => {
  assert.ok(BLOCKS.length >= 3, "expected desktop, register and narrow breakpoints");
});

test("no rule hides a fact cell outside the three the register renders", () => {
  for (const block of BLOCKS) {
    for (const child of hiddenIn(block.body)) {
      assert.ok(
        FACT_CHILDREN.includes(child),
        `the ${block.maxWidth}px block hides child ${child}, which is not a fact cell`,
      );
    }
  }
});

test("at every width the hidden fact cells are a suffix, so the visible ones stay a prefix", () => {
  // Widths worth checking: just inside each breakpoint, plus the two the
  // handoff names as supported.
  const widths = [1440, 1280, ...BLOCKS.map((b) => b.maxWidth), 390];

  for (const width of widths) {
    const hidden = new Set<number>();
    for (const block of BLOCKS) {
      if (width <= block.maxWidth) for (const child of hiddenIn(block.body)) hidden.add(child);
    }

    const visible = FACT_CHILDREN.filter((c) => !hidden.has(c));

    // A prefix of the fact cells, in order, with nothing missing from inside.
    assert.deepEqual(
      visible,
      FACT_CHILDREN.slice(0, visible.length),
      `at ${width}px the visible fact cells are ${visible.join(",")}, which is not a prefix of ${FACT_CHILDREN.join(",")}`,
    );
    assert.ok(visible.length >= 1, `at ${width}px the register shows no facts at all`);
  }
});

test("the 390px row shows exactly two facts, the first two of the desktop three", () => {
  const hidden = new Set<number>();
  for (const block of BLOCKS) {
    if (390 <= block.maxWidth) for (const child of hiddenIn(block.body)) hidden.add(child);
  }
  const visible = FACT_CHILDREN.filter((c) => !hidden.has(c));
  assert.deepEqual(visible, [3, 4], `390px shows fact cells ${visible.join(",")}, expected 3,4`);
});

test("reduced motion is honoured, and the rail pulse is what it turns off", () => {
  assert.ok(
    /@media\s*\(prefers-reduced-motion:\s*reduce\)/.test(css),
    "the Desk stylesheet has no reduced-motion block",
  );
  const block = css.slice(css.indexOf("prefers-reduced-motion"));
  assert.ok(/animation-duration:\s*0\.001ms\s*!important/.test(block));
  assert.ok(
    /st--active/.test(block),
    "the one looping animation in the system is not addressed under reduced motion",
  );
});

test("the signal strip is escapable, optional, and cannot widen the page", () => {
  // A marquee is hostile in three specific ways, and each has one rule.
  assert.ok(
    /\.strip:hover .strip__track[\s\S]{0,120}animation-play-state:\s*paused/.test(css),
    "the strip does not pause on hover",
  );
  assert.ok(
    /\.strip:focus-within .strip__track[\s\S]{0,120}animation-play-state:\s*paused/.test(css),
    "the strip does not pause on keyboard focus, so tabbing is chased by the animation",
  );

  const reduced = css.slice(css.indexOf("prefers-reduced-motion"));
  assert.ok(
    /\.strip__track\s*\{[^}]*animation:\s*none/.test(reduced),
    "reduced motion slows the strip instead of stopping it",
  );
  assert.ok(
    /\.strip__half\s*\{[^}]*display:\s*none/.test(reduced),
    "reduced motion leaves the duplicated half visible, so the list reads twice",
  );
  assert.ok(
    /\.strip__w\s*\{[^}]*overflow-x:\s*auto/.test(reduced),
    "reduced motion gives no way to reach the rest of the list",
  );

  // The track is deliberately wider than any viewport, so the strip must clip
  // it. Without this the PAGE gains a horizontal scrollbar at every width.
  assert.ok(
    /\.strip__w\s*\{[^}]*overflow:\s*hidden/.test(css),
    "the strip does not clip its own track",
  );
});

test("the Google button is proved by a rendered iframe, never by its container", () => {
  // The fault this guards against was in the VERIFICATION, not the product:
  // checking that the container div exists says nothing, because Google
  // Identity Services creates the iframe and then collapses it to 0x0 on an
  // unauthorised origin without logging anything. Only measured dimensions
  // prove a member has a button to press.
  const form = readFileSync("components/desk/DeskLoginForm.tsx", "utf8");

  assert.ok(form.includes("googleReady"), "there is no explicit readiness state");
  assert.ok(
    /querySelector\(["']iframe["']\)/.test(form),
    "readiness is not established from the rendered iframe",
  );
  assert.ok(
    /getBoundingClientRect\(\)[\s\S]{0,160}width > 0 && height > 0/.test(form),
    "readiness does not require non-zero rendered dimensions",
  );

  // The area and its divider are both gated on that state.
  assert.ok(
    /googleReady \? "dklogin__g" : "dklogin__g dklogin__g--wait"/.test(form),
    "the Google area is not gated on readiness",
  );
  assert.ok(
    /\{googleReady \?[\s\S]{0,200}tracking-label/.test(form),
    "the OR divider is not gated on readiness, so it can be orphaned",
  );

  // The waiting host must stay measurable. display:none has no dimensions,
  // which would make the button permanently unprovable.
  assert.ok(
    /\.dklogin__g--wait\s*\{[^}]*height:\s*0[^}]*overflow:\s*hidden/.test(css),
    "the waiting Google host is not clipped to zero height",
  );
  assert.ok(
    !/\.dklogin__g--wait\s*\{[^}]*display:\s*none/.test(css),
    "the waiting Google host uses display:none, so it can never be measured",
  );

  // Unavailability is not an error. The email code is a complete route.
  assert.ok(
    !/googleDisabled/.test(form),
    "an unavailable Google button still renders a failure notice",
  );

  // The button is Google's own, in the theme that suits the Desk card.
  assert.ok(/theme:\s*"outline"/.test(form), "the Google button is not the outline theme");
  assert.ok(!/filled_black/.test(form), "the obsidian Google theme is still requested");
  assert.ok(/renderButton/.test(form), "the official Google button was replaced by a custom one");
  assert.ok(/signInWithIdToken/.test(form), "the Google identity flow changed");
});

test("focus is never removed, and the ink surfaces get their own ring", () => {
  assert.ok(/focus-visible/.test(css), "no focus-visible styling at all");
  assert.ok(
    /\.dk-ink\s*:where\([^)]*\):focus-visible/.test(css),
    "the rail and the knowledge boundary have no raised-contrast focus ring",
  );
  // The objective field is the one place an outline is suppressed, because it
  // fills its panel edge to edge. That is only acceptable while the panel
  // itself takes the ring, so the exception is asserted rather than trusted.
  const suppressed = /\.ask__in:focus\s*\{[^}]*outline:\s*none/.test(css);
  const replaced = /\.ask:focus-within\s*\{[^}]*box-shadow[^}]*var\(--focus\)/.test(css);
  assert.equal(
    suppressed && !replaced,
    false,
    "the objective field removes its outline and nothing replaces it",
  );
});

console.log(`ok  ${passed} passed`);
