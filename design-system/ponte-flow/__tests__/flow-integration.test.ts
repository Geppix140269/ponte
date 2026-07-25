// The Ponte Flow integration, and the truth boundaries it must not cross.
//
// Run: npx tsx design-system/ponte-flow/__tests__/flow-integration.test.ts
//
// The package is delivered with its own validation, which this does not repeat.
// What is tested here is the integration: that the generated artefacts match
// the delivered registry, that no route bypasses the component, and that no
// screen has quietly upgraded a Market Signal into something reviewed.

import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

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

const ROOT = "design-system/ponte-flow";
const registry = JSON.parse(readFileSync(join(ROOT, "registry/ponte-flow-registry.json"), "utf8"));
const icons: {
  key: string;
  standardAsset: string;
  reducedAsset: string | null;
  reducedBelow: number | null;
  accessibilityLabelRequired: boolean;
  prohibitedUse: string | null;
}[] = registry.icons;

const markup = readFileSync(join(ROOT, "generated/flow-icon-markup.ts"), "utf8");
const keysFile = readFileSync(join(ROOT, "generated/flow-icon-keys.ts"), "utf8");

// ---- the generated artefacts match what was delivered -------------------------

test("every registry asset resolves to a delivered file", () => {
  let checked = 0;
  for (const icon of icons) {
    for (const path of [icon.standardAsset, icon.reducedAsset]) {
      if (!path) continue;
      assert.ok(existsSync(join(ROOT, path)), `missing asset ${path} for ${icon.key}`);
      checked++;
    }
  }
  assert.equal(checked, 126, `expected 126 assets, resolved ${checked}`);
});

test("every registered key is in the generated union", () => {
  for (const icon of icons) {
    assert.ok(keysFile.includes(`"${icon.key}"`), `${icon.key} is missing from FlowIconKey`);
  }
});

test("every asset has generated markup", () => {
  for (const icon of icons) {
    assert.ok(markup.includes(`"${icon.standardAsset}"`), `no markup for ${icon.standardAsset}`);
  }
});

test("the label-required set is taken from the registry, not guessed", () => {
  const required = icons.filter((i) => i.accessibilityLabelRequired).map((i) => i.key);
  for (const key of required) {
    assert.ok(
      new RegExp(`FLOW_LABELLED_KEYS[\\s\\S]*"${key.replace(/\./g, "\\.")}"`).test(keysFile),
      `${key} requires a label but is not in FLOW_LABELLED_KEYS`,
    );
  }
  assert.ok(required.length > 0);
});

test("no delivered asset carries a colour of its own", () => {
  for (const icon of icons) {
    const svg = readFileSync(join(ROOT, icon.standardAsset), "utf8");
    assert.ok(!/(?:fill|stroke)="(?!none|currentColor)[^"]+"/.test(svg), `${icon.key} hardcodes a colour`);
    assert.ok(!/#[0-9a-fA-F]{3,8}/.test(svg), `${icon.key} contains a hex colour`);
  }
});

test("no legacy lime value entered the Flow namespace", () => {
  const tokens = readFileSync(join(ROOT, "tokens/ponte-flow-tokens.css"), "utf8");
  for (const legacy of ["--lime", "#c7f", "#d4ff", "lime"]) {
    assert.ok(!tokens.toLowerCase().includes(legacy.toLowerCase()), `Flow tokens contain ${legacy}`);
  }
});

// ---- no route bypasses the component ------------------------------------------

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".next") continue;
      walk(path, out);
    } else if (/\.tsx?$/.test(entry.name)) out.push(path);
  }
  return out;
}

const appFiles = [...walk("app"), ...walk("components")];

test("no screen imports a Flow SVG file directly", () => {
  for (const file of appFiles) {
    const src = readFileSync(file, "utf8");
    assert.ok(
      !/ponte-flow\/icons\//.test(src),
      `${file} reaches for a Flow SVG path instead of using PonteIcon`,
    );
  }
});

test("no screen pastes Flow SVG markup", () => {
  for (const file of appFiles) {
    const src = readFileSync(file, "utf8");
    // The shell's own wordmark is hand-authored brand art, not a Flow asset.
    if (file.includes("PonteShell") || file.includes("PonteLanding") || file.includes("PonteBridge")) continue;
    assert.ok(
      !/stroke-width="1\.75"/.test(src),
      `${file} looks like it contains pasted Flow markup`,
    );
  }
});

// ---- truth boundaries ----------------------------------------------------------

const signalRoute = readFileSync("app/[locale]/market-signals/[id]/page.tsx", "utf8");

test("the signal route claims no review, verification or safety", () => {
  // Match a rendered key (name="..."), not a mention: the file explains in
  // prose why some of these are absent, and prose is not a claim.
  for (const claim of [
    "evidence.evreview",
    "evidence.infocomplete",
    "profile.completion",
    "participation.commson",
  ]) {
    assert.ok(
      !signalRoute.includes(`name="${claim}"`),
      `the signal route renders ${claim}, which asserts a state an unconfirmed signal has not reached`,
    );
  }
});

test("the signal route never animates an unconfirmed signal", () => {
  // `is-run` is the class that starts every Flow animation.
  assert.ok(!/is-run/.test(signalRoute), "the signal route starts a Flow animation");
  const css = readFileSync("components/signals/signal.css", "utf8");
  assert.ok(!/@keyframes|animation:/.test(css), "the signal stylesheet animates something");
});

test("no product surface introduces a verification asset", () => {
  for (const icon of icons) {
    assert.ok(
      !/verified|trusted|safe|score|rating/i.test(icon.key),
      `the registry contains a trust key: ${icon.key}`,
    );
  }
  for (const file of appFiles) {
    const src = readFileSync(file, "utf8");
    assert.ok(!/PonteIcon[\s\S]{0,80}verified/i.test(src), `${file} renders a verification icon`);
  }
});

test("the prohibited-use rules survived the import", () => {
  const withRules = icons.filter((i) => i.prohibitedUse);
  assert.ok(withRules.length > 0, "prohibited-use rules were lost");
  const component = readFileSync(join(ROOT, "components/PonteIcon.tsx"), "utf8");
  assert.ok(
    component.includes("prohibitedUseFor"),
    "the component must expose the registry's prohibited-use rule",
  );
});

test("navigation family icons stay out of the HS sector grid", () => {
  // The registry's own prohibition for market.family.*, asserted against the
  // screen that renders the sector grid.
  const explore = readFileSync("app/[locale]/explore/page.tsx", "utf8");
  const grid = explore.slice(explore.indexOf("exuni"));
  assert.ok(!/market\.family\./.test(grid), "a navigation family icon appears inside the sector grid");
});

if (process.exitCode) console.error(`\n${passed} passed, some failed.`);
else console.log(`ok   ${passed} flow integration tests passed`);
