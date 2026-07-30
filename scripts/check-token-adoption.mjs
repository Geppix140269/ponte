// Proves the Stage 1 alias conversion was VALUE-NEUTRAL, and stays that way.
//
//   node scripts/check-token-adoption.mjs
//
// ADR-0015 section S-4 approved converting four stylesheets that held literal
// copies of the Brand v5 palette onto the approved `--pf-*` tokens, on the
// condition that the conversion itself changes nothing and that all subsequent
// visual change comes from the central tokens.
//
// "Value-neutral" is a claim about the substitution, not about the rendered
// result: each literal that was removed must have been EQUAL to the approved
// token value as it stood before Stage 1. If it was, the conversion introduced no
// bespoke change and the routes moved because the authority moved, which is the
// whole point. If it was not, the conversion smuggled a design change into a
// mechanical edit.
//
// This file records the pre-Stage-1 approved values and the literal each scope
// used, so the claim is checkable rather than asserted. It also guards the
// property going forward: none of the four scopes may re-introduce a literal
// colour.

import { readFileSync } from "node:fs";

// The approved token values as they stood on origin/main at 0aa1ff9, immediately
// before Stage 1. Transcribed once, here, so the proof does not depend on git.
const PRE_STAGE_1 = {
  "--pf-ink": "#0f0f0e",
  "--pf-ink-2": "#3a3733",
  "--pf-ink-3": "#6e6a61",
  "--pf-mute": "#9a958a",
  "--pf-surface": "#fcfbf7",
  "--pf-raised": "#ffffff",
  "--pf-sunken": "#f2efe6",
  "--pf-rule": "#e5dfd2",
  "--pf-rule-strong": "#d5cebc",
  "--pf-gold": "#c9973a",
  "--pf-gold-ink": "#8a6520",
  "--pf-positive": "#0f6e3d",
  "--pf-review": "#4e6472",
  "--pf-danger": "#b4402a",
  "--pf-declared": "#6f695e",
  "--pf-focus": "#1e5fa8",
  // Promoted from local extensions by ADR-0015. The pre-Stage-1 value is the
  // literal the extensions carried, which is what these scopes also held.
  "--pf-gold-tint": "#f5ecd8",
  "--pf-positive-tint": "#e9f1ec",
  "--pf-positive-line": "#bfd8c7",
  "--pf-danger-tint": "#f7eae6",
  "--pf-danger-line": "#e6c3b8",
  "--pf-review-tint": "#eaeff1",
  "--pf-review-line": "#c4d2d8",
  "--pf-declared-tint": "#f1eee7",
};

// What each converted scope used to declare, and the approved token it now
// resolves through. Every pair is asserted below.
const CONVERSIONS = [
  ["components/find/find.css", ".ponte-find", {
    "--surface": ["#fcfbf7", "--pf-surface"],
    "--raised": ["#ffffff", "--pf-raised"],
    "--sunken": ["#f2efe6", "--pf-sunken"],
    "--rule": ["#e5dfd2", "--pf-rule"],
    "--rule-strong": ["#d5cebc", "--pf-rule-strong"],
    "--ink": ["#0f0f0e", "--pf-ink"],
    "--ink-2": ["#3a3733", "--pf-ink-2"],
    "--ink-3": ["#6e6a61", "--pf-ink-3"],
    "--mute": ["#9a958a", "--pf-mute"],
    "--gold": ["#c9973a", "--pf-gold"],
    "--gold-ink": ["#8a6520", "--pf-gold-ink"],
    "--gold-tint": ["#f5ecd8", "--pf-gold-tint"],
    "--pos": ["#0f6e3d", "--pf-positive"],
    "--pos-tint": ["#e9f1ec", "--pf-positive-tint"],
    "--pos-line": ["#bfd8c7", "--pf-positive-line"],
    "--neg": ["#b4402a", "--pf-danger"],
    "--neg-tint": ["#f7eae6", "--pf-danger-tint"],
    "--neg-line": ["#e6c3b8", "--pf-danger-line"],
    "--review": ["#4e6472", "--pf-review"],
    "--review-tint": ["#eaeff1", "--pf-review-tint"],
    "--review-line": ["#c4d2d8", "--pf-review-line"],
    "--declared": ["#6f695e", "--pf-declared"],
    "--declared-tint": ["#f1eee7", "--pf-declared-tint"],
    "--focus": ["#1e5fa8", "--pf-focus"],
  }],
  ["components/home/landing/landing.css", ".ponte-landing", {
    "--surface": ["#fcfbf7", "--pf-surface"],
    "--raised": ["#ffffff", "--pf-raised"],
    "--sunken": ["#f2efe6", "--pf-sunken"],
    "--rule": ["#e5dfd2", "--pf-rule"],
    "--rule-strong": ["#d5cebc", "--pf-rule-strong"],
    "--ink": ["#0f0f0e", "--pf-ink"],
    "--ink-2": ["#3a3733", "--pf-ink-2"],
    "--ink-3": ["#6e6a61", "--pf-ink-3"],
    "--mute": ["#9a958a", "--pf-mute"],
    "--gold": ["#c9973a", "--pf-gold"],
    "--gold-ink": ["#8a6520", "--pf-gold-ink"],
    "--gold-tint": ["#f5ecd8", "--pf-gold-tint"],
    "--pos": ["#0f6e3d", "--pf-positive"],
    "--review": ["#4e6472", "--pf-review"],
    "--neg": ["#b4402a", "--pf-danger"],
    "--focus": ["#1e5fa8", "--pf-focus"],
  }],
  ["components/legal/legal.css", ".ponte-legal", {
    "--lg-surface": ["#fcfbf7", "--pf-surface"],
    "--lg-rule": ["#e5dfd2", "--pf-rule"],
    "--lg-ink": ["#0f0f0e", "--pf-ink"],
    "--lg-ink-2": ["#3a3733", "--pf-ink-2"],
    "--lg-ink-3": ["#6e6a61", "--pf-ink-3"],
    "--lg-gold-ink": ["#8a6520", "--pf-gold-ink"],
  }],
  // `.pfooter` is a different case and the reason this check exists at all. It
  // did not copy the palette under its own names: it re-declared the APPROVED
  // names, `--pf-surface`, `--pf-ink`, `--pf-ink-2`, `--pf-ink-3`, `--pf-rule`
  // and `--pf-gold-ink`, as literals scoped to itself. So the footer shadowed the
  // token authority with a stale copy of it, and `var(--pf-ink-3)` meant one
  // thing inside the footer and another everywhere else.
  //
  // An alias cannot fix a name collision: `--pf-ink: var(--pf-ink)` is circular.
  // The six colour declarations are therefore removed outright, which lets the
  // footer inherit the real tokens from `:root`. The font-stack customs it also
  // declares under the `--pf-` prefix are left alone: they collide with nothing
  // in the approved set, and renaming them would be scope the ADR does not cover.
  ["components/pfooter.css", ".pfooter", {}],
];

/** The declaration block for a scope, up to the first line that closes it. */
function scopeBlock(css, selector) {
  const start = css.indexOf(`${selector} {`);
  if (start < 0) return null;
  const end = css.indexOf("\n}", start);
  return css.slice(start, end < 0 ? undefined : end);
}

/**
 * The same block with comments removed.
 *
 * Scanning raw text finds "colours" inside prose. The note in `.pfooter`
 * explaining why an alias could not be used has to write the circular
 * declaration in order to explain that it is circular, and a check that reads
 * its own documentation as a live declaration is failing on nothing.
 */
const stripComments = (block) => block.replace(/\/\*[\s\S]*?\*\//g, "");

/**
 * Elevation is not colour.
 *
 * `--e-1`, `--e-2` and `--e-3` carry ink at low alpha inside a `box-shadow`
 * value. The approved Flow set defines no shadow token, so there is nothing to
 * alias onto, and ADR-0015 covers colour and deliberately does not promote one.
 * This is the same recorded debt that `LOCAL_EXTENSIONS` in
 * token-authority.test.ts still holds. Listed rather than pattern-matched, so a
 * new one has to be argued for here.
 */
const ELEVATION = new Set(["--e-1", "--e-2", "--e-3"]);

const problems = [];
let checked = 0;

for (const [file, selector, map] of CONVERSIONS) {
  let css;
  try {
    css = readFileSync(file, "utf8");
  } catch {
    problems.push(`${file} is missing`);
    continue;
  }
  const raw = scopeBlock(css, selector);
  if (raw === null) {
    problems.push(`${file}: the ${selector} declaration block was renamed or removed`);
    continue;
  }
  const block = stripComments(raw);

  // 1. Every recorded pair must be value-neutral: the literal that was removed
  //    equalled the approved token value before Stage 1.
  for (const [local, [wasLiteral, pf]] of Object.entries(map)) {
    const approvedBefore = PRE_STAGE_1[pf];
    if (approvedBefore === undefined) {
      problems.push(`${file}: ${local} claims to alias ${pf}, which has no recorded pre-Stage-1 value`);
      continue;
    }
    if (wasLiteral.toLowerCase() !== approvedBefore.toLowerCase()) {
      problems.push(
        `${file}: converting ${local} was NOT value-neutral. It held ${wasLiteral}, ` +
          `but ${pf} was ${approvedBefore} before Stage 1, so the conversion changed the rendered colour.`,
      );
    }
    checked++;

    // 2. And it must actually resolve through the token now.
    const decl = new RegExp(`\\${local}\\s*:\\s*([^;]+);`).exec(block);
    if (!decl) {
      problems.push(`${file}: ${local} is no longer declared in ${selector}`);
    } else if (decl[1].trim() !== `var(${pf})`) {
      problems.push(`${file}: ${local} must resolve through var(${pf}), found ${decl[1].trim()}`);
    }
  }

  // 3. No scope may hold a literal colour any more. This is the property that
  //    keeps the conversion from being undone one declaration at a time.
  const literals = [...block.matchAll(/(--[\w-]+)\s*:\s*([^;]*(?:#[0-9a-fA-F]{3,8}|\brgba?\(|\bhsla?\()[^;]*);/g)];
  for (const [, name, value] of literals) {
    if (ELEVATION.has(name)) continue;
    problems.push(
      `${file}: ${selector} declares a literal colour, ${name}: ${value.trim()}. ` +
        `Alias an approved --pf-* token instead. ADR-0015 section S-4.`,
    );
  }
}

// 4. `.pfooter` must not re-declare an approved token name, at any value.
try {
  const footer = readFileSync("components/pfooter.css", "utf8");
  const block = stripComments(scopeBlock(footer, ".pfooter") ?? "");
  for (const name of ["--pf-surface", "--pf-rule", "--pf-ink", "--pf-ink-2", "--pf-ink-3", "--pf-gold-ink"]) {
    if (new RegExp(`\\${name}\\s*:`).test(block)) {
      problems.push(
        `components/pfooter.css: .pfooter re-declares the approved token ${name}, shadowing the ` +
          `authority inside the footer. Remove the declaration so it inherits from :root.`,
      );
    }
  }
} catch {
  problems.push("components/pfooter.css is missing");
}

if (problems.length) {
  console.error(`Token adoption check failed, ${problems.length} problem(s):\n`);
  for (const p of problems) console.error(`  ${p}\n`);
  process.exit(1);
}

console.log(
  `ok   token adoption: ${checked} conversions value-neutral against the pre-Stage-1 ` +
    `approved values, 4 scopes hold no literal colour, .pfooter shadows no approved token`,
);
