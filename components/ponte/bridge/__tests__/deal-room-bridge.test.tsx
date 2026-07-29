// The Multi-party Deal Room Bridge: markup, semantics and the approved classes.
//
// Run: npx tsx --tsconfig tsconfig.ui-test.json components/ponte/bridge/__tests__/deal-room-bridge.test.tsx
//
// ## What this covers, and what it does not
//
// `renderToStaticMarkup` gives the DOM the component produces before any layout
// effect runs. So this file can assert everything that does not depend on
// measurement: the accessible name, the semantic structure, that every class
// used exists in the APPROVED stylesheet, and that no percentage reaches the
// markup before a procedure governs.
//
// It cannot assert geometry - the deck path, the station fractions, the pier
// heights - because those are computed from a measured container in a real
// browser. Those are covered twice over instead: the arithmetic is transcribed
// in `geometry.ts` and unit-tested against the engine's own numbers, and the
// rendered result is captured by `e2e/deal-room-bridge.spec.ts` at desktop,
// 390 x 844 and reduced motion.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import DealRoomBridge from "../DealRoomBridge";
import { bridgeModel, type BridgeInput } from "@/lib/deal-room/bridge";

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

const approvedCss = readFileSync("design/authority/bridge/v1/source/ponte-bridge.css", "utf8");
const integrationCss = readFileSync("components/ponte/bridge/bridge-integration.css", "utf8");
const approvedEngine = readFileSync("design/authority/bridge/v1/source/ponte-bridge.js", "utf8");

/** Both stylesheets with comments removed, so their prose cannot satisfy a check. */
const declared = (approvedCss + integrationCss).replace(/\/\*[\s\S]*?\*\//g, "");

/**
 * A class is legitimate when the approved stylesheet declares it, OR when the
 * approved engine itself creates it.
 *
 * The second arm is not a loophole, it is a fact about the package. Some of the
 * engine's class names carry no CSS at all: `.br__stage` and `.br__vsvg` are
 * positioned inline by the engine and exist purely as structural hooks, and
 * `.br__rows` is styled only under `.br--v`. Requiring a declaration for those
 * would fail a component for using the approved vocabulary correctly - and
 * `BridgeRoute`, the already-approved landing bridge, uses the same names.
 *
 * What the check still catches is the thing that matters: a class this
 * component invented, which would be a page-specific visual convention.
 */
function isApprovedClass(name: string): boolean {
  return declared.includes(`.${name}`) || approvedEngine.includes(`'${name}`) || approvedEngine.includes(`"${name}`);
}

const BASE: BridgeInput = {
  roomState: "active_procedure_agreed",
  procedureApproved: true,
  procedureProposed: true,
  counterpartyAdmitted: true,
  invitationSent: true,
  anyEvidenceSubmitted: true,
  completion: 52,
  momentum: "moving",
  openBlockers: [],
  participants: [
    { role: "Seller", principal: true, state: "joined", ownsNextAction: false },
    { role: "Buyer", principal: true, state: "joined", ownsNextAction: true },
    { role: "Inspection provider", principal: false, state: "awaited", ownsNextAction: false },
  ],
  nextAction: { label: "Propose the sampling point", owner: "Inspection provider" },
};

function render(input: Partial<BridgeInput> = {}): string {
  return renderToStaticMarkup(<DealRoomBridge model={bridgeModel({ ...BASE, ...input })} caption="DR-2026-0048" />);
}

// ---------------------------------------------------------------------------
// Accessibility: one role="img" with a full sentence
// ---------------------------------------------------------------------------

test("the bridge is a single role=img, not a pile of unlabelled graphics", () => {
  const html = render();
  assert.equal((html.match(/role="img"/g) ?? []).length, 1);
});

test("the accessible name states the current stage, the next stage and the caveat", () => {
  const html = render();
  const label = /aria-label="([^"]+)"/.exec(html)?.[1] ?? "";
  assert.match(label, /Current stage: Evidence and conditions/);
  assert.match(label, /Next stage: Ready to proceed/);
  assert.match(label, /Later stages are not guaranteed/);
});

test("the drawing itself is hidden from assistive technology", () => {
  const html = render();
  // The SVG carries the shape; the sentence carries the content. A screen
  // reader that met both would hear the same thing twice, badly.
  assert.match(html, /<svg[^>]*aria-hidden="true"/);
  assert.match(html, /focusable="false"/);
});

test("the nodes and piers are decorative and the words are not", () => {
  const html = render();
  assert.match(html, /class="brdp__n" aria-hidden="true"/);
  assert.match(html, /class="brdp__p" aria-hidden="true"/);
  // The role and its state are real text.
  assert.match(html, />Seller<\/div>/);
  assert.match(html, />Joined<\/div>/);
});

// ---------------------------------------------------------------------------
// No percentage before approval, in the markup
// ---------------------------------------------------------------------------

test("no percentage reaches the markup before the procedure is approved", () => {
  const html = render({ procedureApproved: false, completion: 52 });
  assert.ok(!html.includes("52"), "a caller's number survived into the DOM before the procedure governed");
  assert.ok(!/per cent/.test(html));
});

test("the milestone label names the stage and the position, never a number", () => {
  const html = render();
  assert.match(html, /<b>Evidence and conditions<\/b>/);
  assert.match(html, /Stage 7 of 8/);
});

// ---------------------------------------------------------------------------
// Every class exists in the approved stylesheet
// ---------------------------------------------------------------------------

test("every class the component emits is declared in an approved stylesheet", () => {
  const html = render({ roomState: "blocked", openBlockers: [{ title: "X", category: "critical" }] });
  const classes = new Set<string>();
  for (const match of Array.from(html.matchAll(/class="([^"]+)"/g))) {
    for (const name of match[1].split(/\s+/)) if (name) classes.add(name);
  }
  for (const name of Array.from(classes)) {
    assert.ok(
      isApprovedClass(name),
      `'${name}' is neither declared in an approved stylesheet nor created by the approved engine. A class invented here is a page-specific visual convention, which Constitution section 20 forbids.`,
    );
  }
});

test("the only classes outside the approved package are the documented wrapper", () => {
  // The wrapper rules live in `bridge-integration.css`, which exists for
  // exactly this: layout the approved source does not express. They must be
  // declared there and nowhere else.
  const html = render();
  const local = Array.from(html.matchAll(/class="([^"]+)"/g))
    .flatMap((match) => match[1].split(/\s+/))
    .filter((name) => name.startsWith("pf-dealroom-bridge"));
  assert.ok(local.length > 0, "the wrapper is missing");
  for (const name of local) {
    assert.ok(
      integrationCss.includes(`.${name}`),
      `'${name}' is used but not declared in bridge-integration.css`,
    );
  }
});

test("the participant classes are the approved Deal Room ones", () => {
  const html = render();
  assert.match(html, /class="brdp brdp--prin"/);
  assert.match(html, /brdp--add/);
  assert.match(html, /brdp--wait/);
  assert.match(html, /brdp--next/);
});

test("the owner of the next action gets the approved gold cap and tag", () => {
  const html = render();
  assert.match(html, /class="brdp__cap"/);
  assert.match(html, /Owns next action/);
  // Exactly one participant may own it.
  assert.equal((html.match(/Owns next action/g) ?? []).length, 1);
});

// ---------------------------------------------------------------------------
// Conditions are stated in words, never only in colour
// ---------------------------------------------------------------------------

test("a blocked room says the word Blocked", () => {
  const html = render({ roomState: "blocked", openBlockers: [{ title: "X", category: "critical" }] });
  assert.match(html, />Blocked</);
  assert.match(html, /brj__state--block/);
});

test("a read-only room says so in words", () => {
  const html = render({ roomState: "read_only" });
  assert.match(html, />Read-only</);
  assert.match(html, /brj__state--off/);
});

test("momentum is always printed as a word", () => {
  assert.match(render({ momentum: "moving" }), />Moving</);
  assert.match(render({ momentum: "waiting_on_participant" }), />Waiting on participant</);
  assert.match(render({ momentum: "ready_to_proceed" }), />Ready to proceed</);
});

test("no state is carried by a colour class alone", () => {
  // Every chip modifier that appears must be accompanied by its own text.
  const html = render({ roomState: "blocked", openBlockers: [{ title: "X", category: "critical" }] });
  const chips = Array.from(html.matchAll(/class="brj__state[^"]*"[^>]*>(?:<i[^>]*><\/i>)?([^<]*)/g));
  for (const chip of chips) {
    assert.ok(chip[1].trim().length > 0, "a state chip rendered with no word in it");
  }
});

// ---------------------------------------------------------------------------
// The room reference
// ---------------------------------------------------------------------------

test("the caption renders as the room reference", () => {
  assert.match(render(), /pf-dealroom-bridge__ref">DR-2026-0048/);
});

test("a bridge with one participant renders without collapsing", () => {
  const html = render({ participants: [BASE.participants[0]] });
  assert.equal((html.match(/class="brdp /g) ?? []).length, 1);
});

console.log(`ok   deal room bridge markup: ${passed} assertions passed`);
