// The icon renderer's resolution contract: semantic key in, approved drawing out.
//
// Run: npx tsx --tsconfig tsconfig.ui-test.json design-system/ponte-flow/__tests__/icon-resolution.test.tsx
//
// `flow-integration.test.ts` already asserts that the generated artefacts match
// the delivered registry and that no route bypasses the component. What is
// tested here is the resolution step in between — the part a route depends on
// but never sees:
//
//   1. a semantic key resolves to the registry's own asset, not a guess;
//   2. below the authored threshold the reduced drawing is used, and the
//      threshold is per key, taken from the registry rather than assumed;
//   3. stroke is optical, so an icon scaled up does not thin;
//   4. colour is inherited and never painted on;
//   5. an unregistered key fails loudly rather than rendering a hole.
//
// Point 5 is the one worth stating plainly. The key union is generated, so an
// unknown name is normally a compile error. But the union is generated from the
// registry and the registry is hand-editable, and a generated union plus a
// hand-edited source is exactly the pair that drifts. The runtime guard is what
// catches the drift, and an untested guard is an assumption — so it is asserted
// here by reaching past the type, which is the only way to reach it.

import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import PonteIcon, { prohibitedUseFor } from "../components/PonteIcon";
import { assetFor, byKey, strokeFor, ponteIcons } from "../registry/ponte-flow-registry";
import { FLOW_LABELLED_KEYS } from "../generated/flow-icon-keys";
import type { FlowIconKey, FlowLabelledKey } from "../generated/flow-icon-keys";

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

/** An unlabelled key, i.e. one that always sits beside a visible word. */
const PLAIN = "market.family.products" as Exclude<FlowIconKey, FlowLabelledKey>;

test("a semantic key resolves to the registry's own asset", () => {
  for (const icon of ponteIcons) {
    const resolved = assetFor(icon.key, icon.defaultSize);
    assert.equal(
      resolved,
      icon.reducedAsset && icon.reducedBelow !== null && icon.defaultSize < icon.reducedBelow
        ? icon.reducedAsset
        : icon.standardAsset,
      `${icon.key} resolved to ${resolved}, which is not the asset the registry names`,
    );
  }
});

test("the reduced drawing is used below its own authored threshold, not a global one", () => {
  const withReduced = ponteIcons.filter((i) => i.reducedAsset && i.reducedBelow !== null);
  assert.ok(withReduced.length > 0, "no icon in the registry has a reduced variant to test");

  for (const icon of withReduced) {
    const below = icon.reducedBelow! - 1;
    const at = icon.reducedBelow!;
    assert.equal(assetFor(icon.key, below), icon.reducedAsset, `${icon.key} at ${below}px must use the reduced drawing`);
    assert.equal(assetFor(icon.key, at), icon.standardAsset, `${icon.key} at ${at}px must use the standard drawing`);
  }
});

test("an icon with no reduced variant keeps its standard drawing at every size", () => {
  // Shrinking a drawing that was never authored for the size is the failure the
  // reduced set exists to prevent; silently doing it anyway would be worse.
  const withoutReduced = ponteIcons.filter((i) => !i.reducedAsset);
  for (const icon of withoutReduced) {
    assert.equal(assetFor(icon.key, 12), icon.standardAsset, `${icon.key} has no reduced variant but changed asset at 12px`);
  }
});

test("stroke is optical, so scaling never thins the line", () => {
  const sizes = [16, 20, 24, 32, 40, 48];
  const widths = sizes.map(strokeFor);
  for (let i = 1; i < widths.length; i++) {
    assert.ok(
      widths[i] > widths[i - 1],
      `stroke at ${sizes[i]}px (${widths[i]}) is not heavier than at ${sizes[i - 1]}px (${widths[i - 1]})`,
    );
  }
  // The registry states the scale in prose on every icon; pin the values so a
  // change to one has to be a change to both.
  assert.deepEqual(widths, [1.5, 1.6, 1.75, 2, 2.2, 2.5]);
});

test("the rendered icon inherits colour and paints none of its own", () => {
  const html = renderToStaticMarkup(<PonteIcon name={PLAIN} size={24} />);
  assert.match(html, /stroke="currentColor"/, "the root does not set stroke to currentColor");
  assert.ok(
    !/(stroke|fill)="#[0-9a-fA-F]{3,8}"/.test(html),
    "the rendered icon carries a hard-coded colour, which Constitution section 6 forbids",
  );
  assert.match(html, /stroke-width="1.75"/, "the 24px stroke width is not the optical one");
});

test("an unlabelled icon is hidden from assistive technology, a labelled one names itself", () => {
  const plain = renderToStaticMarkup(<PonteIcon name={PLAIN} size={20} />);
  assert.match(plain, /aria-hidden="true"/, "an icon beside a visible word must not be announced twice");
  assert.ok(!/aria-label=/.test(plain), "an unlabelled icon must not carry a label");

  assert.ok(FLOW_LABELLED_KEYS.length > 0, "no labelled keys in the generated union");
  const labelled = FLOW_LABELLED_KEYS[0] as FlowLabelledKey;
  const html = renderToStaticMarkup(<PonteIcon name={labelled} label="Under review" size={20} />);
  assert.match(html, /role="img"/, "an icon that carries its own meaning must be exposed as an image");
  assert.match(html, /aria-label="Under review"/, "the label did not reach the accessible name");
});

test("an unregistered key fails loudly instead of rendering a hole", () => {
  // Past the type on purpose: the guard exists for registry/union drift, which
  // by definition the type cannot see. This is the only way to exercise it.
  const unregistered = "market.family.nonexistent" as FlowIconKey;
  assert.equal(byKey[unregistered], undefined, "the fixture key is registered after all — pick another");
  assert.throws(
    () => renderToStaticMarkup(<PonteIcon name={unregistered as Exclude<FlowIconKey, FlowLabelledKey>} />),
    /Unknown Ponte Flow icon: market\.family\.nonexistent/,
    "an unknown key did not throw",
  );
  assert.throws(() => assetFor(unregistered, 24), /Unknown Ponte icon/, "the registry resolver did not throw");
});

test("a missing key never falls back to another drawing", () => {
  // The failure this guards is subtler than a crash: resolving an unknown key to
  // a default icon would put a wrong meaning on screen and pass every test that
  // only checks something rendered. There is no fallback path to find, so the
  // assertion is that the resolver has no branch that returns without a match.
  const unregistered = "evidence.definitely-not-a-key";
  let threw = false;
  try {
    assetFor(unregistered, 24);
  } catch {
    threw = true;
  }
  assert.equal(threw, true, "an unknown key resolved to some asset rather than failing");
});

test("the registry's prohibited-use rules are readable next to the usage", () => {
  const constrained = ponteIcons.filter((i) => i.prohibitedUse);
  assert.ok(constrained.length > 0, "no icon records a prohibited use");
  for (const icon of constrained) {
    assert.equal(prohibitedUseFor(icon.key as FlowIconKey), icon.prohibitedUse);
  }
  assert.equal(prohibitedUseFor("nope" as FlowIconKey), null, "an unknown key must report no rule, not throw");
});

if (process.exitCode) console.error(`\n${passed} passed, some failed.`);
else console.log(`ok   ${passed} icon resolution tests passed`);
