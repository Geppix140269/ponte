// The Ponte Flow tokens are the production token authority.
//
// Run: npx tsx design-system/ponte-flow/__tests__/token-authority.test.ts
//
// Constitution section 6 makes the approved tokens the sole colour source, and
// section 20 requires shared primitives to be implemented centrally. The Phase 1
// audit (section A.2) found the Desk re-declaring 20 approved colours as literal
// hex under its own names. The values were byte-identical, so nothing looked
// wrong — which is precisely the failure mode: a change to an approved token
// would have drifted silently past the Desk and nobody would have seen it until
// a screenshot diverged.
//
// So the property under test is not "the colours match". Equal values are what
// the audit already found, and asserting equality would pass just as happily
// against two independent copies. The property is **that the Desk does not hold
// a copy at all**: every name with an approved counterpart must resolve through
// `var(--pf-*)`, so there is exactly one place a value can be changed.
//
// The second half tests the import chain, because an alias to a token that never
// reaches the browser is worse than a literal: it renders as nothing.

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

const tokensCss = readFileSync("design-system/ponte-flow/tokens/ponte-flow-tokens.css", "utf8");
const flowCss = readFileSync("design-system/ponte-flow/ponte-flow.css", "utf8");
const globalsCss = readFileSync("app/globals.css", "utf8");
const deskCss = readFileSync("components/desk/desk.css", "utf8");

/** The `.ponte-desk` declaration block, which is where the Desk names are set. */
const deskBlock = (() => {
  const start = deskCss.indexOf(".ponte-desk {");
  assert.ok(start >= 0, "the .ponte-desk token block has been renamed or removed");
  // The block ends at the first line that closes it at column 0.
  const end = deskCss.indexOf("\n}", start);
  return deskCss.slice(start, end);
})();

/**
 * The Desk name -> approved Flow name mapping, as converted.
 *
 * Written out rather than derived, because the point of the test is to pin the
 * mapping. Deriving it from the file would make the file its own oracle: a
 * dropped alias would simply shrink the derived list and the test would pass.
 */
const ALIASED: Record<string, string> = {
  "--surface": "--pf-surface",
  "--raised": "--pf-raised",
  "--sunken": "--pf-sunken",
  "--rule": "--pf-rule",
  "--rule-strong": "--pf-rule-strong",
  "--ink": "--pf-ink",
  "--ink-2": "--pf-ink-2",
  "--ink-3": "--pf-ink-3",
  "--mute": "--pf-mute",
  "--gold": "--pf-gold",
  "--gold-ink": "--pf-gold-ink",
  "--pos": "--pf-positive",
  "--neg": "--pf-danger",
  "--review": "--pf-review",
  "--declared": "--pf-declared",
  "--focus": "--pf-focus",
  "--select": "--pf-select",
  "--dur-1": "--pf-dur-micro",
  "--dur-2": "--pf-dur-enter",
  "--dur-3": "--pf-dur-deliberate",
  "--ease": "--pf-ease",
};

/**
 * Colours the Desk still declares literally, each recorded with its reason.
 *
 * This list is a ratchet, not a permission. A literal colour that is not here
 * fails the test below, so adding one is a deliberate act that shows up in the
 * diff of this file as well as the stylesheet.
 */
const LOCAL_EXTENSIONS = [
  "--gold-tint",
  "--pos-tint",
  "--pos-line",
  "--neg-tint",
  "--neg-line",
  "--review-tint",
  "--review-line",
  "--declared-tint",
  // Elevation, not colour. The Flow set defines no shadow token at all, so
  // there is nothing to alias onto: `--e-2` carries an ink shadow at 16% alpha
  // as part of a box-shadow value. Recorded with the tints because it is the
  // same kind of debt — a derived value the approved set does not yet name.
  "--e-2",
];

test("every approved token the Desk uses is declared once, in the Flow token file", () => {
  for (const pf of Object.values(ALIASED)) {
    assert.ok(
      new RegExp(`${pf}\\s*:`).test(tokensCss),
      `${pf} is aliased by the Desk but is not declared in ponte-flow-tokens.css`,
    );
  }
});

test("the Desk holds no copy of an approved value — every alias resolves through var(--pf-*)", () => {
  for (const [desk, pf] of Object.entries(ALIASED)) {
    const declaration = new RegExp(`\\${desk}\\s*:\\s*([^;]+);`).exec(deskBlock);
    assert.ok(declaration, `${desk} is no longer declared in the .ponte-desk block`);
    assert.equal(
      declaration![1].trim(),
      `var(${pf})`,
      `${desk} must resolve through var(${pf}), not hold its own value`,
    );
  }
});

test("the Desk declares no literal colour outside the recorded local extensions", () => {
  // Every `--name: <literal>` in the block, where the literal is a colour
  // rather than a length, a font stack or a var() reference.
  const declarations = Array.from(deskBlock.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g));
  const literalColours = declarations.filter(([, , value]) =>
    /#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(/.test(value),
  );

  for (const [, name] of literalColours) {
    assert.ok(
      LOCAL_EXTENSIONS.includes(name),
      `${name} declares a literal colour in the .ponte-desk block. ` +
        `Alias an approved --pf-* token, or record it as a local extension ` +
        `in compatibility-aliases.md and add it to LOCAL_EXTENSIONS here.`,
    );
  }
});

test("each recorded local extension genuinely has no approved counterpart", () => {
  // Guards the list against becoming a dumping ground: if the Flow set ever
  // gains one of these, the extension must be retired rather than kept.
  const counterparts: Record<string, string> = {
    "--gold-tint": "--pf-gold-tint",
    "--pos-tint": "--pf-positive-tint",
    "--pos-line": "--pf-positive-line",
    "--neg-tint": "--pf-danger-tint",
    "--neg-line": "--pf-danger-line",
    "--review-tint": "--pf-review-tint",
    "--review-line": "--pf-review-line",
    "--declared-tint": "--pf-declared-tint",
    "--e-2": "--pf-elevation-2",
  };
  for (const [local, pf] of Object.entries(counterparts)) {
    assert.ok(
      !new RegExp(`${pf}\\s*:`).test(tokensCss),
      `${pf} now exists in the approved set — ${local} must be aliased onto it and retired`,
    );
  }
});

test("the approved tokens actually reach the browser", () => {
  // An alias to a token that is never served renders as nothing at all, so the
  // whole import chain is asserted rather than the leaf file's existence.
  assert.match(
    globalsCss,
    /@import\s+"\.\.\/design-system\/ponte-flow\/ponte-flow\.css"/,
    "app/globals.css no longer imports the Ponte Flow bundle",
  );
  assert.match(
    flowCss,
    /@import\s+"\.\/tokens\/ponte-flow-tokens\.css"/,
    "the Flow bundle no longer imports the token file",
  );
  // The @import has to precede every other statement to be valid CSS.
  const importAt = globalsCss.indexOf("@import");
  const tailwindAt = globalsCss.indexOf("@tailwind");
  assert.ok(importAt >= 0 && importAt < tailwindAt, "the Flow import must precede the Tailwind directives");
});

test("the approved tokens are declared on :root, so a scoped alias can see them", () => {
  // `.ponte-desk` is a class scope. `var(--pf-surface)` only resolves inside it
  // because the Flow set is declared on an ancestor — :root. Scoping the Flow
  // tokens to a class of their own would silently break every alias above.
  assert.match(tokensCss, /:root\s*\{/, "the Flow tokens are no longer declared on :root");
  const root = tokensCss.slice(tokensCss.indexOf(":root"), tokensCss.indexOf("}", tokensCss.indexOf(":root")));
  for (const pf of Object.values(ALIASED)) {
    assert.ok(new RegExp(`${pf}\\s*:`).test(root), `${pf} is declared outside :root and a scoped alias cannot reach it`);
  }
});

if (process.exitCode) console.error(`\n${passed} passed, some failed.`);
else console.log(`ok   ${passed} token authority tests passed`);
