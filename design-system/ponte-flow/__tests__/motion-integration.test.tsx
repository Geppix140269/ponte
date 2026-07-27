// The motion layer, and the meanings it must not reinterpret.
//
// Run: npx tsx --tsconfig tsconfig.ui-test.json design-system/ponte-flow/__tests__/motion-integration.test.tsx
//
// The Phase 1 audit reported that the Flow motion CSS was imported nowhere and
// that all twelve components were 0% implemented. The first half of that was
// wrong: `app/globals.css` has imported the Flow bundle since commit 0bb84fa,
// and the bundle imports both the motion stylesheet and the reduced-motion
// contract. The audit grepped for the leaf filenames under `app/` and
// `components/`, which the barrel file legitimately hides.
//
// That is worth a test rather than a correction in prose, because the thing that
// misled the audit will mislead the next reader too. The import chain is three
// files deep and entirely invisible from any component. So it is asserted end to
// end, from globals.css to the keyframes.
//
// The rest of this file guards the meanings. `lib/ponte/motion.ts` reads
// motion-spec.json rather than restating it, so what needs proving is that the
// specification still says what the product believes it says: twelve components,
// H01 alone engine-driven, and every CSS component's class actually present in
// the delivered stylesheet and on its delivered drawing.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import {
  MOTION_COMPONENTS,
  motionClass,
  motionClassName,
  motionComponent,
  REDUCED_MOTION_ATTRIBUTE,
  REDUCED_MOTION_ON,
  REDUCED_MOTION_QUERY,
  type MotionId,
} from "@/lib/ponte/motion";
import FlowMotion from "@/components/ponte/motion/FlowMotion";

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

const globalsCss = readFileSync("app/globals.css", "utf8");
const flowCss = readFileSync("design-system/ponte-flow/ponte-flow.css", "utf8");
const motionCss = readFileSync("design-system/ponte-flow/motion/css/ponte-flow-motion.css", "utf8");
const reducedCss = readFileSync("design-system/ponte-flow/motion/reduced-motion/ponte-flow-reduced-motion.css", "utf8");

test("the motion stylesheet reaches production, through the whole import chain", () => {
  assert.match(globalsCss, /@import\s+"\.\.\/design-system\/ponte-flow\/ponte-flow\.css"/, "globals.css no longer imports the Flow bundle");
  assert.match(flowCss, /@import\s+"\.\/motion\/css\/ponte-flow-motion\.css"/, "the Flow bundle no longer imports the motion stylesheet");
  assert.match(motionCss, /@keyframes pf-draw/, "the motion stylesheet has no keyframes");
});

test("the reduced-motion contract reaches production too, and ships both hooks", () => {
  assert.match(flowCss, /@import\s+"\.\/motion\/reduced-motion\/ponte-flow-reduced-motion\.css"/, "the Flow bundle no longer imports the reduced-motion contract");
  // The delivered file requires both: the OS setting and the in-product toggle,
  // producing identical output. One without the other is half a contract.
  assert.match(reducedCss, /@media\s*\(prefers-reduced-motion:\s*reduce\)/, "the OS media query is missing");
  assert.match(reducedCss, /\[data-reduced-motion="1"\]/, "the in-product toggle hook is missing");
});

test("the module reads the same reduced-motion conditions the stylesheet does", () => {
  assert.equal(REDUCED_MOTION_ATTRIBUTE, "data-reduced-motion");
  assert.equal(REDUCED_MOTION_ON, "1");
  assert.ok(
    reducedCss.includes(`[${REDUCED_MOTION_ATTRIBUTE}="${REDUCED_MOTION_ON}"]`),
    "the attribute the module exports is not the one the stylesheet matches",
  );
  assert.ok(reducedCss.includes(REDUCED_MOTION_QUERY), "the media query the module exports is not the one the stylesheet uses");
});

test("reduced motion removes movement without redrawing anything", () => {
  // The contract is that reduced motion is a REMOVAL. A rule that set a new
  // position, colour or shape would be a redraw, and the authored end state on
  // disk would no longer be what a reduced-motion reader sees.
  assert.match(reducedCss, /animation:\s*none\s*!important/, "reduced motion does not stop the animations");
  const declarations = Array.from(reducedCss.matchAll(/^\s*([a-z-]+):/gm)).map((m) => m[1]);
  const allowed = new Set(["animation", "stroke-dasharray", "offset-distance"]);
  for (const property of declarations) {
    assert.ok(
      allowed.has(property),
      `the reduced-motion stylesheet sets '${property}', which redraws rather than removes`,
    );
  }
});

test("all twelve approved components are present, and H01 alone is engine-driven", () => {
  assert.equal(MOTION_COMPONENTS.length, 12, "the approved specification no longer describes twelve components");
  const ids = MOTION_COMPONENTS.map((c) => c.id);
  assert.deepEqual(ids, ["H01", "H02", "H03", "H04", "H05", "H06", "H07", "H08", "H09", "H10", "H11", "H12"]);

  const engineDriven = MOTION_COMPONENTS.filter((c) => c.cssClass === null);
  assert.deepEqual(
    engineDriven.map((c) => c.id),
    ["H01"],
    "exactly one component is engine-driven, and it is H01 bridge progress",
  );
  assert.equal(motionClass("H01"), null, "H01 must report no CSS class");
});

test("every CSS component's class exists in the stylesheet and on its delivered drawing", () => {
  for (const component of MOTION_COMPONENTS) {
    if (component.cssClass === null) continue;
    const cls = component.cssClass;
    assert.ok(
      new RegExp(`\\.${cls}\\b`).test(motionCss),
      `${component.id} claims class '${cls}' but the motion stylesheet never mentions it`,
    );
    assert.ok(
      new RegExp(`\\[data-reduced-motion="1"\\]\\s*\\.${cls}\\b`).test(reducedCss) ||
        new RegExp(`\\.${cls}\\s*\\*`).test(reducedCss),
      `${component.id} has no reduced-motion rule, so its animation would survive the toggle`,
    );
    // `sourceAsset` is already relative to the package root.
    const svg = readFileSync(`design-system/ponte-flow/${component.sourceAsset}`, "utf8");
    assert.ok(svg.includes(`class="${cls}"`), `${component.id}'s delivered SVG does not carry its own root class`);
  }
});

test("the specification still carries every field a component needs to be implemented", () => {
  // Constitution section 10: every motion component must define trigger, start
  // state, end state, duration, easing, interruption, reverse behaviour and a
  // reduced-motion fallback. A missing field is a stop condition, not something
  // for an implementer to fill in.
  for (const component of MOTION_COMPONENTS) {
    for (const field of ["meaning", "trigger", "startState", "endState", "duration", "easing", "interruption", "reducedMotion", "mustNotBeUsed"] as const) {
      const value = (component as Record<string, unknown>)[field];
      assert.ok(
        typeof value === "string" && value.trim().length > 0,
        `${component.id} has no ${field}; Constitution section 10 requires it before the component can be used`,
      );
    }
  }
});

test("an unknown motion id fails loudly rather than animating something approximate", () => {
  assert.throws(() => motionComponent("H99" as MotionId), /Unknown Ponte Flow motion component: H99/);
  assert.throws(
    () => motionClassName("H01" as Exclude<MotionId, "H01">),
    /engine-driven/,
    "asking for H01's class must explain that it needs the progress engine",
  );
});

test("a mounted component is settled until the caller says work is happening", () => {
  const idle = renderToStaticMarkup(<FlowMotion id="H04">{null}</FlowMotion>);
  assert.match(idle, /class="fs"/, "the idle component lost its own class");
  assert.ok(!/is-run/.test(idle), "a component animates before anything told it work had started");

  const running = renderToStaticMarkup(<FlowMotion id="H04" running>{null}</FlowMotion>);
  assert.match(running, /class="fs is-run"/, "the running component does not carry the play signal");
});

test("motion is hidden from assistive technology unless it is the only carrier", () => {
  const hidden = renderToStaticMarkup(<FlowMotion id="H08">{null}</FlowMotion>);
  assert.match(hidden, /aria-hidden="true"/, "a decorative drawing is announced to screen readers");

  const named = renderToStaticMarkup(<FlowMotion id="H08" label="Market activity detected">{null}</FlowMotion>);
  assert.match(named, /role="img"/);
  assert.match(named, /aria-label="Market activity detected"/);
});

test("no animation runtime has been added", () => {
  // Constitution section 23 prohibits introducing a new motion language, and the
  // delivered documentation records that Lottie was never authored: the CSS and
  // SVG implementations are complete, so an export would be re-authoring.
  const pkg = JSON.parse(readFileSync("package.json", "utf8"));
  const dependencies = { ...pkg.dependencies, ...pkg.devDependencies };
  for (const banned of ["framer-motion", "lottie-web", "lottie-react", "@lottiefiles/react-lottie-player", "gsap", "motion"]) {
    assert.ok(!(banned in dependencies), `${banned} was added; the approved motion layer is CSS plus the H01 engine`);
  }
});

if (process.exitCode) console.error(`\n${passed} passed, some failed.`);
else console.log(`ok   ${passed} motion integration tests passed`);
