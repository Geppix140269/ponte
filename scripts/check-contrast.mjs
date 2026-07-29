// Asserts the approved contrast targets against the live token file.
//
//   node scripts/check-contrast.mjs
//
// Constitution section 18a states the targets numerically, and Stage 1 of
// ADR-0015 set values that meet them. Without this, the only thing standing
// between a token edit and a regression is somebody remembering to re-measure.
//
// TWO RULES SHAPE EVERY ASSERTION HERE.
//
// 1. Measure against the DARKEST surface a value is drawn on, not the lightest.
//    A value solved against white and then used in the sunken well fails in the
//    well, and that is the specific defect the 29 July audit found repeatedly.
//    So each row names the ground it must clear, and text and edge tokens are
//    checked against the well as well as against white.
//
// 2. Flatten composited values before measuring. An `opacity` or a
//    `color-mix()` is not a contrast reduction of the same size. Stage 1 removed
//    the opacity-composited structure this used to matter for, and the rule is
//    kept because the next author will reach for opacity again.
//
// Targets, from Constitution section 18a:
//
//   text            4.5:1   SC 1.4.3, at every size this product uses
//   edge            3.0:1   SC 1.4.11, a control boundary or state indicator
//   focus           3.0:1   SC 1.4.11
//   hairline        1.5:1   Ponte rule, a divider inside a module
//   fill            1.15:1  Ponte rule, two adjacent surfaces, plus a 3:1 rule

import { readFileSync } from "node:fs";

const css = readFileSync("design-system/ponte-flow/tokens/ponte-flow-tokens.css", "utf8");

/** The `:root` block only. The dark block is a separate, currently dormant set. */
const root = css.slice(css.indexOf(":root{"), css.indexOf("\n}"));

function token(name) {
  const m = new RegExp(`\\${name}\\s*:\\s*(#[0-9a-fA-F]{3,8})\\s*;`).exec(root);
  if (!m) throw new Error(`token ${name} is not declared as a hex value in :root`);
  return m[1];
}

const srgb = (c) => {
  const n = c / 255;
  return n <= 0.03928 ? n / 12.92 : Math.pow((n + 0.055) / 1.055, 2.4);
};
const parse = (hex) => {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((d) => d + d).join("") : h;
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16));
};
const luminance = (hex) => {
  const [r, g, b] = parse(hex);
  return 0.2126 * srgb(r) + 0.7152 * srgb(g) + 0.0722 * srgb(b);
};
const ratio = (a, b) => {
  const x = luminance(a);
  const y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};

const TARGET = { text: 4.5, edge: 3.0, focus: 3.0, hairline: 1.5, fill: 1.15 };

// [ token, ground, class ]. `ground` is every surface the token is drawn on; the
// tightest of them is what the token has to clear.
const WHITE = "--pf-raised";
const GROUND = "--pf-surface";
const WELL = "--pf-sunken";

const CHECKS = [
  // Text. Every one of these prints on all three surfaces somewhere.
  ["--pf-ink-2", [WHITE, GROUND, WELL], "text"],
  ["--pf-ink-3", [WHITE, GROUND, WELL], "text"],
  ["--pf-mute", [WHITE, GROUND, WELL], "text"], // LB-003: "Not stated"
  ["--pf-gold-ink", [WHITE, GROUND, WELL, "--pf-gold-tint"], "text"],
  ["--pf-declared", [WHITE, GROUND, WELL, "--pf-declared-tint"], "text"],
  ["--pf-positive", [WHITE, GROUND, WELL, "--pf-positive-tint"], "text"],
  ["--pf-review", [WHITE, GROUND, WELL, "--pf-review-tint"], "text"],
  ["--pf-danger", [WHITE, GROUND, WELL, "--pf-danger-tint"], "text"],

  // Edges. A control boundary and a state indicator both owe 3:1.
  // LB-002 lives here: every input boundary is --pf-rule-strong.
  ["--pf-rule-strong", [WHITE, GROUND, WELL], "edge"],
  ["--pf-gold-rule", [WHITE, GROUND, WELL], "edge"],
  ["--pf-positive-line", [WHITE, GROUND, WELL], "edge"],
  ["--pf-review-line", [WHITE, GROUND, WELL], "edge"],
  ["--pf-danger-line", [WHITE, GROUND, WELL], "edge"],

  // Focus.
  ["--pf-focus", [WHITE, GROUND, WELL], "focus"],

  // Hairline dividers. Not a component boundary, so 1.5:1 and not 3:1.
  ["--pf-rule", [WHITE, GROUND, WELL], "hairline"],
];

const problems = [];
const rows = [];

for (const [name, grounds, kind] of CHECKS) {
  const fg = token(name);
  for (const groundName of grounds) {
    const bg = token(groundName);
    const r = ratio(fg, bg);
    const need = TARGET[kind];
    rows.push({ name, groundName, fg, bg, r, need, kind });
    if (r < need) {
      problems.push(
        `${name} (${fg}) on ${groundName} (${bg}) is ${r.toFixed(2)}:1, ` +
          `below the ${kind} target of ${need}:1. Constitution section 18a.`,
      );
    }
  }
}

// Adjacent surface pairs: a fill delta AND a rule that clears 3:1 against both.
const PAIRS = [
  [WHITE, GROUND],
  [GROUND, WELL],
  [WHITE, WELL],
];
for (const [a, b] of PAIRS) {
  const r = ratio(token(a), token(b));
  rows.push({ name: a, groundName: b, fg: token(a), bg: token(b), r, need: TARGET.fill, kind: "fill" });
  if (r < TARGET.fill) {
    problems.push(
      `${a} and ${b} differ by only ${r.toFixed(2)}:1, below the ${TARGET.fill}:1 fill target. ` +
        `Constitution section 15a.`,
    );
  }
}

// Section 15a is a conjunction: the fill delta is not enough on its own, the pair
// must also be separated by a rule that clears 3:1 against both surfaces. That is
// already asserted for --pf-rule-strong above; this states the dependency so the
// two halves cannot drift apart.
for (const surface of [WHITE, GROUND, WELL]) {
  const r = ratio(token("--pf-rule-strong"), token(surface));
  if (r < TARGET.edge) {
    problems.push(
      `section 15a requires every adjacent surface pair to carry a rule at 3:1, but ` +
        `--pf-rule-strong is only ${r.toFixed(2)}:1 on ${surface}.`,
    );
  }
}

// Gold must not be usable as a rule, or 6b collapses back into one token.
const goldAsRule = ratio(token("--pf-gold"), token(GROUND));
if (goldAsRule >= TARGET.edge) {
  problems.push(
    `--pf-gold now clears ${goldAsRule.toFixed(2)}:1 on the page ground. That is not a failure of ` +
      `contrast, but Constitution 6b splits gold into three tokens precisely because the brand ` +
      `fill cannot carry a rule. If gold has been darkened, --pf-gold-rule is redundant and the ` +
      `split should be revisited deliberately rather than left implicit.`,
  );
}

// --pf-focus must stay distinct from anything that means "selected", or a focused
// control and a selected one look the same. Stage 2 adds --pf-interact-border; the
// guard is written now so it is in place before that lands.
if (/--pf-interact-border\s*:/.test(root)) {
  const d = ratio(token("--pf-focus"), token("--pf-interact-border"));
  if (d < 1.15) {
    problems.push(
      `--pf-focus and --pf-interact-border are only ${d.toFixed(2)}:1 apart. Constitution 6a ` +
        `requires focus to stay visually distinct from selection.`,
    );
  }
}

if (problems.length) {
  console.error(`Contrast check failed, ${problems.length} problem(s):\n`);
  for (const p of problems) console.error(`  ${p}\n`);
  process.exit(1);
}

const worst = rows
  .filter((r) => r.kind !== "fill")
  .reduce((a, b) => (b.r - b.need < a.r - a.need ? b : a));

console.log(
  `ok   contrast: ${rows.length} token pairs meet Constitution section 18a. ` +
    `Tightest margin ${worst.name} on ${worst.groundName} at ${worst.r.toFixed(2)}:1 ` +
    `against ${worst.need}:1.`,
);

if (process.argv.includes("--table")) {
  console.log("\ntoken                ground            value    on        ratio   target  class");
  for (const r of rows) {
    console.log(
      `${r.name.padEnd(20)} ${r.groundName.padEnd(17)} ${r.fg.padEnd(8)} ${r.bg.padEnd(9)} ` +
        `${r.r.toFixed(2).padStart(6)}  ${r.need.toFixed(2).padStart(6)}  ${r.kind}`,
    );
  }
}
