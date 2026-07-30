// Compares the rendered Bridge geometry captured before and after Stage 1.
//
//   node scripts/check-bridge-geometry.mjs
//
// ADR-0015 section S-3 requires that the Bridge contrast change move no geometry.
// The stylesheet-level proof is check-bridge-invariance.mjs; this is the rendered
// proof, because the deck is drawn by BridgeRoute.tsx from a measured curve rather
// than by CSS, and a stylesheet that only changed colour could still in principle
// feed a different number into that measurement.
//
// Reads the two files that e2e/stage1-bridge-geometry.spec.ts writes and reports
// any difference in path data, station coordinates, node dimensions, stroke widths,
// dash arrays or the viewBox. Colour is not captured in those files at all, so a
// difference here can only be geometry.
//
// Sub-pixel tolerance: layout is measured in CSS pixels and a browser can land a
// centred element a hundredth of a pixel apart between runs. 0.05px is well below
// anything a reader could see and well above float noise. Path `d` strings, stroke
// widths and dash arrays are compared exactly, since those are authored values
// rather than measured ones.

import { readFileSync, existsSync } from "node:fs";

const BEFORE = "e2e/evidence/stage1/before/bridge-geometry.json";
const AFTER = "e2e/evidence/stage1/after/bridge-geometry.json";
const TOLERANCE = 0.05;

for (const f of [BEFORE, AFTER]) {
  if (!existsSync(f)) {
    console.error(
      `${f} is missing. Capture it first:\n` +
        `  PONTE_EVIDENCE_BASE_URL=<url> PONTE_EVIDENCE_LABEL=${f.includes("before") ? "before" : "after"} \\\n` +
        `    npx playwright test e2e/stage1-bridge-geometry.spec.ts`,
    );
    process.exit(1);
  }
}

const before = JSON.parse(readFileSync(BEFORE, "utf8"));
const after = JSON.parse(readFileSync(AFTER, "utf8"));
const problems = [];
let compared = 0;

/** Walk both trees together. Numbers get the tolerance, everything else is exact. */
function compare(path, a, b) {
  if (typeof a === "number" && typeof b === "number") {
    compared++;
    if (Math.abs(a - b) > TOLERANCE) {
      problems.push(`${path}: ${a} -> ${b} (moved ${Math.abs(a - b).toFixed(3)}px)`);
    }
    return;
  }
  if (a === null || b === null || typeof a !== "object" || typeof b !== "object") {
    compared++;
    if (a !== b) problems.push(`${path}: ${JSON.stringify(a)} -> ${JSON.stringify(b)}`);
    return;
  }
  if (Array.isArray(a) !== Array.isArray(b)) {
    problems.push(`${path}: shape changed between array and object`);
    return;
  }
  if (Array.isArray(a)) {
    if (a.length !== b.length) {
      problems.push(`${path}: ${a.length} items -> ${b.length} items`);
      return;
    }
    a.forEach((item, i) => compare(`${path}[${i}]`, item, b[i]));
    return;
  }
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const key of keys) compare(`${path}.${key}`, a[key], b[key]);
}

const views = new Set([...Object.keys(before), ...Object.keys(after)]);
for (const view of views) {
  if (!(view in before)) problems.push(`${view}: captured after but not before`);
  else if (!(view in after)) problems.push(`${view}: captured before but not after`);
  else compare(view, before[view], after[view]);
}

if (problems.length) {
  console.error(`Bridge geometry check FAILED, ${problems.length} difference(s):\n`);
  for (const p of problems) console.error(`  ${p}`);
  console.error(
    `\nADR-0015 section S-3 permits contrast only. A geometry difference is a` +
      `\nregression under Constitution section 21, not an improvement.`,
  );
  process.exit(1);
}

console.log(
  `ok   bridge geometry: ${views.size} rendered views identical before and after, ` +
    `${compared} values compared (path data, station coordinates, node dimensions, ` +
    `stroke widths, dash arrays, viewBox), tolerance ${TOLERANCE}px`,
);
