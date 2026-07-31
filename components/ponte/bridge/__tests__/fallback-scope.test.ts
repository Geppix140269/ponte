// The pre-measurement fallback belongs to `BridgeRoute` alone.
//
// Run: npx tsx components/ponte/bridge/__tests__/fallback-scope.test.ts
//
// `.br__stage` is shared. `BridgeRoute` draws the Family and Action bridges on
// it and sets `data-measured` once its stations are positioned; `DealRoomBridge`
// draws the Multi-party Deal Room Bridge on a stage with the same class, under a
// root of `["br", "brd", ...]`, and measures itself its own way.
//
// DS-10's fallback was written for the first and keyed on `:not([data-measured])`
// alone, so it matched the second permanently - `display: flex`, 32px of
// vertical padding and a 92px floor applied to an approved component at every
// width, measured or not. Invisible, because the Deal Room is behind
// `NEXT_PUBLIC_DEAL_ROOM` and reaches nobody.
//
// A rendered test cannot catch that: the Deal Room bridge is unreachable without
// the flag, and the leak is silent when it is reachable. The property is a
// property of the stylesheet, so it is asserted on the stylesheet, the same way
// `lib/desk/__tests__/register-css.test.ts` asserts the register's breakpoints.

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

const CSS_PATH = "components/ponte/bridge/bridge-integration.css";
const raw = readFileSync(CSS_PATH, "utf8");

// Comments first, and before anything is split. This file documents its own
// selectors in prose, so a comment discussing `[data-measured]` reads as a
// selector to any parser that strips comments afterwards - which is exactly
// what the first version of this test did.
const css = raw.replace(/\/\*[\s\S]*?\*\//g, "");

/** Every selector in the file that guards on the measured state. */
function fallbackSelectors(): string[] {
  const found: string[] = [];
  // Selector lists may span lines, so read up to the opening brace and split.
  for (const block of css.split("{")) {
    const tail = block.slice(block.lastIndexOf("}") + 1);
    for (const selector of tail.split(",")) {
      const clean = selector.trim();
      if (clean.includes("[data-measured]")) found.push(clean.replace(/\s+/g, " "));
    }
  }
  return found;
}

test("the fallback rules exist at all", () => {
  const selectors = fallbackSelectors();
  assert.ok(
    selectors.length > 0,
    `no [data-measured] rule found in ${CSS_PATH}. If the fallback was removed, remove this test with it - ` +
      `but a bridge with no fallback is the 31 July 2026 defect, so removing it is a decision, not a tidy-up.`,
  );
});

test("every fallback rule excludes the Deal Room bridge", () => {
  for (const selector of fallbackSelectors()) {
    assert.ok(
      selector.includes(".br:not(.brd)"),
      `\`${selector}\` reaches any .br__stage, including DealRoomBridge's, which never sets ` +
        `data-measured and would therefore match for ever. Scope it with \`.br:not(.brd)\`.`,
    );
  }
});

test("the guard is on the descendant rules too, not only the container", () => {
  // The container rule is the one that leaked, but a later addition matching a
  // Deal Room child - `.brdp`, `.brd__ms` - would reintroduce it by another
  // route. Both parts of the pair are asserted so neither can drift alone.
  const selectors = fallbackSelectors();
  const descendants = selectors.filter((s) => s.includes(">") || s.split(" ").length > 3);
  assert.ok(descendants.length > 0, "expected the fallback to style children of the stage, not only the stage");
  for (const selector of descendants) {
    assert.ok(selector.includes(".br:not(.brd)"), `descendant rule \`${selector}\` is unscoped`);
  }
});

test("DealRoomBridge still renders the stage this test is about", () => {
  // The premise. If the Deal Room bridge ever stops using `.br__stage`, or stops
  // carrying `brd`, this whole guard is either unnecessary or wrong, and it
  // should be reconsidered rather than left passing for the wrong reason.
  const source = readFileSync("components/ponte/bridge/DealRoomBridge.tsx", "utf8");
  assert.ok(source.includes('className="br__stage"'), "DealRoomBridge no longer renders .br__stage");
  assert.ok(/rootClasses\s*=\s*\[\s*"br",\s*"brd"/.test(source), "DealRoomBridge no longer roots on br + brd");
  assert.ok(
    !source.includes("data-measured"),
    "DealRoomBridge now sets data-measured. If that is deliberate the scoping above may be redundant.",
  );
});

console.log(`ok   ${passed} bridge fallback scope tests passed`);
