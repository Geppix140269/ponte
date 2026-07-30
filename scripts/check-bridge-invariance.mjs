// Proves that the Stage 1 edit to the approved Bridge stylesheet changed COLOUR
// and nothing else.
//
//   node scripts/check-bridge-invariance.mjs [<git-ref>]
//
// ADR-0015 section S-3 authorised exactly one thing in
// design/authority/bridge/v1/source/ponte-bridge.css: the contrast of the passive
// deck track, the passive station pier, the receded passive pier and the Deal Room
// passive pier. It required geometry, station fractions, node sizes, labels, copy,
// motion, durations, easing, the gold signal, the selected destination and every
// semantic state to be preserved exactly.
//
// A line diff cannot show that. Every one of the four declarations sits on a line
// that also carries a width or a transition, so a reviewer reading `+`/`-` lines
// sees `width:1px` on both sides and has to eyeball whether it moved. This parses
// both versions into declarations and compares the non-colour ones, which is the
// property the ADR actually constrains.
//
// Compares the working tree against a FIXED pre-Stage-1 ref.
//
// It used to default to the merge-base with origin/main, and that defeated the
// check the moment the Stage 1 edit merged. On a branch the merge-base is the
// commit the branch left, so `before` was the un-edited stylesheet and assertion
// 5 below found its four colour changes. On `main` the merge-base is `main`
// itself, so `before` and `after` are the same bytes: the 479 non-colour
// comparisons became vacuously true, and the four authorised selectors reported
// "was NOT changed" because, relative to itself, nothing had. `npm run verify`
// was therefore red on `main` for every task in the repository - LB-006.
//
// Pinning the baseline is not a weakening. Every assertion below is unchanged
// and all of them now actually run: 479 declarations are compared against real
// prior values instead of against themselves. The ref stays overridable as
// argv[2] for investigating a single commit.

import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const FILE = "design/authority/bridge/v1/source/ponte-bridge.css";

/**
 * The approved stylesheet as delivered, immediately before the ADR-0015 Stage 1
 * contrast edit in `f5a3dcd`.
 *
 * A commit, not a vendored copy, because the git object cannot drift and a
 * second copy of the file in the tree could. If the Bridge package is ever
 * re-delivered, this moves in the same change that re-delivers it, and ADR-0015
 * section S-3 requires that change to be recorded in the ADR itself.
 */
const PRE_STAGE_1 = "651ad1c99ecd8fb6bc9683d06dc7f8010d7e3a83";

const ref = process.argv[2] ?? PRE_STAGE_1;

const before = execFileSync("git", ["show", `${ref}:${FILE}`], { encoding: "utf8", maxBuffer: 1 << 24 });
const after = readFileSync(FILE, "utf8");

/**
 * Parse a stylesheet into selector -> { property: value }.
 *
 * Deliberately simple: this file is a flat list of rules plus @keyframes and
 * @media blocks, and it is the approved delivery, so its shape is stable. At-rule
 * bodies are kept whole and compared as text, because a keyframe or a
 * reduced-motion block changing at all is a motion change and must fail.
 */
function parse(css) {
  const stripped = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const rules = new Map();
  const atRules = new Map();

  // Pull at-rules out first, with balanced-brace matching.
  let i = 0;
  let flat = "";
  while (i < stripped.length) {
    if (stripped[i] === "@") {
      const open = stripped.indexOf("{", i);
      if (open < 0) break;
      let depth = 0;
      let j = open;
      for (; j < stripped.length; j++) {
        if (stripped[j] === "{") depth++;
        else if (stripped[j] === "}") {
          depth--;
          if (depth === 0) break;
        }
      }
      const head = stripped.slice(i, open).trim().replace(/\s+/g, " ");
      const body = stripped.slice(open + 1, j).trim().replace(/\s+/g, " ");
      atRules.set(head, body);
      i = j + 1;
      continue;
    }
    flat += stripped[i];
    i++;
  }

  for (const m of flat.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const selector = m[1].trim().replace(/\s+/g, " ");
    const decls = {};
    for (const d of m[2].split(";")) {
      const c = d.indexOf(":");
      if (c < 0) continue;
      decls[d.slice(0, c).trim()] = d.slice(c + 1).trim().replace(/\s+/g, " ");
    }
    // A selector can legitimately appear more than once; merge in source order.
    rules.set(selector, { ...(rules.get(selector) ?? {}), ...decls });
  }
  return { rules, atRules };
}

/**
 * Properties whose values Stage 1 is allowed to change.
 *
 * `transition` is here for one narrow reason: the pier used to animate `opacity`
 * and now animates `background`, because that is the property that carries the
 * state. The DURATION inside it is asserted separately below, so a duration change
 * still fails.
 */
const COLOUR_PROPS = new Set(["stroke", "fill", "background", "background-color", "border-color", "color", "opacity", "transition"]);

const a = parse(before);
const b = parse(after);
const problems = [];

// 1. No selector may appear or disappear. That would be a structural change.
for (const sel of a.rules.keys()) {
  if (!b.rules.has(sel)) problems.push(`selector removed: ${sel}`);
}
for (const sel of b.rules.keys()) {
  if (!a.rules.has(sel)) problems.push(`selector added: ${sel}`);
}

// 2. Within a selector, every non-colour declaration must be byte-identical, and
//    no non-colour declaration may be added or removed.
let compared = 0;
const changed = [];
for (const [sel, beforeDecls] of a.rules) {
  const afterDecls = b.rules.get(sel);
  if (!afterDecls) continue;
  const props = new Set([...Object.keys(beforeDecls), ...Object.keys(afterDecls)]);
  for (const prop of props) {
    const x = beforeDecls[prop];
    const y = afterDecls[prop];
    if (COLOUR_PROPS.has(prop)) {
      if (x !== y) changed.push(`${sel} { ${prop}: ${x ?? "(absent)"} -> ${y ?? "(absent)"} }`);
      continue;
    }
    compared++;
    if (x !== y) {
      problems.push(
        `NON-COLOUR CHANGE in ${sel}: ${prop} was ${x ?? "(absent)"}, is now ${y ?? "(absent)"}. ` +
          `ADR-0015 section S-3 permits contrast only.`,
      );
    }
  }
}

// 3. Motion: every at-rule body identical. Keyframes, reduced motion, media.
for (const [head, body] of a.atRules) {
  if (!b.atRules.has(head)) problems.push(`at-rule removed: ${head}`);
  else if (b.atRules.get(head) !== body) {
    problems.push(`MOTION OR RESPONSIVE CHANGE in ${head}. ADR-0015 section S-3 preserves motion exactly.`);
  }
}
for (const head of b.atRules.keys()) {
  if (!a.atRules.has(head)) problems.push(`at-rule added: ${head}`);
}

// 4. Durations and easings, wherever they appear, must be unchanged as a multiset.
const timings = (css) => (css.match(/(\d+(?:\.\d+)?m?s)|cubic-bezier\([^)]*\)|var\(--pf-dur-[\w-]+\)|var\(--pf-ease[\w-]*\)/g) ?? []).sort();
const tA = timings(before);
const tB = timings(after);
if (tA.join("|") !== tB.join("|")) {
  problems.push(`TIMING CHANGE: the set of durations and easings differs.\n    before: ${tA.join(", ")}\n    after:  ${tB.join(", ")}`);
}

// 5. The four authorised selectors must actually have changed, or the edit did not
//    happen and the audit finding is still open.
const AUTHORISED = [".br__deck .d-track", ".brst__p", ".br--chosen .brst:not(.brst--on) .brst__p", ".brdp__p"];
for (const sel of AUTHORISED) {
  if (!changed.some((c) => c.startsWith(`${sel} {`))) {
    problems.push(`${sel} was NOT changed. ADR-0015 section S-3 requires its contrast to be corrected.`);
  }
}

if (problems.length) {
  console.error(`Bridge invariance check failed, ${problems.length} problem(s):\n`);
  for (const p of problems) console.error(`  ${p}\n`);
  process.exit(1);
}

console.log(`ok   bridge invariance against ${ref.slice(0, 8)}: ${compared} non-colour declarations identical, ` +
  `${a.atRules.size} at-rules identical, ${tA.length} timings identical, ${changed.length} colour changes:`);
for (const c of changed) console.log(`       ${c}`);
