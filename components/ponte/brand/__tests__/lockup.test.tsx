// The brand lockup: one drawing, four surfaces, no redraw.
//
// Run: npx tsx --tsconfig tsconfig.ui-test.json components/ponte/brand/__tests__/lockup.test.tsx
//
// The owner ruled the lockup an identity asset rather than an interface icon:
// it may stay an authored SVG, but it must render through one shared component,
// must not be duplicated locally and must not be redrawn.
//
// The mark was found in four files (DeskShell, FindChrome, PonteShell and
// PonteLanding), drawn identically but dressed by three stylesheets under three
// class vocabularies. Consolidating them is the ruling; doing it without
// changing a pixel is the constraint, because this PR is foundation work and a
// header that shifts is a visual regression whatever its cause.
//
// So these assertions are deliberately literal. They pin the class names each
// stylesheet targets and the two attributes that differed between the copies.
// A prettier component that dropped `strokeLinecap="square"` would look
// harmless in review and would quietly resquare three headers; that is the
// failure this file exists to catch. `check-governance.mjs` covers the other
// half: that no second copy of the arch path exists anywhere.

import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import PonteLockup from "../PonteLockup";

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

/** The arch, the deck line and the keystone, exactly as delivered. */
const ARCH = "M22 98 L22 60 C22 35 98 35 98 60 L98 98";

test("the Desk keeps its class vocabulary and its butt-capped arch", () => {
  const html = renderToStaticMarkup(<PonteLockup />);
  for (const cls of ["cmd__lockup", "cmd__chip", "cmd__dot", "cmd__word", "cmd__tld"]) {
    assert.ok(html.includes(cls), `the Desk lockup lost the ${cls} hook its stylesheet targets`);
  }
  assert.ok(!/stroke-linecap="square"/.test(html), "the Desk arch gained square caps it did not have");
  assert.ok(!/width="20"/.test(html), "the Desk mark is sized by CSS, not by attribute");
  assert.match(html, /class="cmd__word serif"/, "the Desk wordmark lost its serif class");
});

test("the Find chrome keeps its class vocabulary, square caps and attribute sizing", () => {
  const html = renderToStaticMarkup(<PonteLockup scope="find" label="Home" />);
  for (const cls of ["flockup", "flockup__chip", "flockup__dot", "flockup__word", "flockup__tld"]) {
    assert.ok(html.includes(cls), `the Find lockup lost the ${cls} hook its stylesheet targets`);
  }
  assert.match(html, /stroke-linecap="square"/, "the Find arch lost its square caps");
  assert.match(html, /width="20"/, "the Find mark lost its attribute sizing");
  assert.match(html, /class="flockup__word serif"/, "the Find wordmark lost its serif class");
});

test("the landing keeps its class vocabulary, its mark class and its unserifed wordmark", () => {
  const html = renderToStaticMarkup(<PonteLockup scope="landing" label="Home" />);
  for (const cls of ["lockup__chip", "lockup__dot", "lockup__word", "lockup__tld", "lockup__mark"]) {
    assert.ok(html.includes(cls), `the landing lockup lost the ${cls} hook its stylesheet targets`);
  }
  assert.match(html, /stroke-linecap="square"/, "the landing arch lost its square caps");
  // The landing wordmark carries no serif class: recorded drift, not a choice.
  assert.ok(!/class="lockup__word serif"/.test(html), "the landing wordmark gained a serif class it never had");
});

test("every scope draws the same geometry", () => {
  const scopes = ["desk", "find", "landing"] as const;
  for (const scope of scopes) {
    const html = renderToStaticMarkup(<PonteLockup scope={scope} label="Home" />);
    assert.ok(html.includes(ARCH), `the ${scope} lockup no longer draws the approved arch`);
    assert.match(html, /viewBox="0 0 120 120"/, `the ${scope} lockup changed the mark's grid`);
    assert.match(html, /stroke-width="11"/, `the ${scope} arch changed weight`);
    assert.match(html, /x1="12" y1="98" x2="108" y2="98"/, `the ${scope} deck line moved`);
    assert.match(html, /cx="60" cy="41" r="10"/, `the ${scope} keystone moved or resized`);
  }
});

test("the mark is hidden from assistive technology and the link carries the name", () => {
  const html = renderToStaticMarkup(<PonteLockup label="Ponte Trade, home" />);
  assert.match(html, /aria-hidden="true"/, "the mark must not be announced separately from its link");
  assert.match(html, /aria-label="Ponte Trade, home"/, "the link lost its accessible name");
});

test("the arch takes its colour from the chip and paints none of its own", () => {
  // Constitution section 6: the only painted element is the keystone, and it is
  // painted by `--gold` in the stylesheet, never by an attribute here.
  const html = renderToStaticMarkup(<PonteLockup />);
  assert.ok(!/(stroke|fill)="#[0-9a-fA-F]{3,8}"/.test(html), "the lockup hard-codes a colour");
  assert.match(html, /stroke="currentColor"/, "the arch no longer inherits its colour");
});

if (process.exitCode) console.error(`\n${passed} passed, some failed.`);
else console.log(`ok   ${passed} brand lockup tests passed`);
