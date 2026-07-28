// The product intake surface, against the rules the Design Constitution makes
// non-negotiable and the acceptance criteria the decision record sets for it.
//
// Run: npx tsx --tsconfig tsconfig.ui-test.json components/products/intake/__tests__/intake-ui.test.tsx
//
// Pinned here:
//
//   * the approved Bridge organises the intake; no card grid, tab strip or
//     generic stepper stands in for it (Constitution 8 and 23);
//   * both product intents mount the SAME component with the same three
//     methods, so there is one resolver and one taxonomy (criterion 4);
//   * browse is present and is not the default (the decision record's order);
//   * no percentage is rendered before the first meaningful action, and never
//     zero (Constitution 9);
//   * nothing is pre-selected in the ambiguous state (the rejected approach);
//   * the four provenance states are visually distinct (Constitution 14);
//   * no component in this directory contains a hand-authored <svg>
//     (Constitution 7, and the governance ratchet that enforces it).
//
// The renderer is the project's own: elements are plain objects, so a handler
// found in the tree is the handler the browser would call.

import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";

// A browser-shaped global, installed before the components are imported.
(globalThis as Record<string, unknown>).window = {
  matchMedia: () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} }),
  sessionStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
  setTimeout: (fn: () => void, ms?: number) => setTimeout(fn, ms),
  clearTimeout: (id: unknown) => clearTimeout(id as ReturnType<typeof setTimeout>),
};
(globalThis as Record<string, unknown>).fetch = () =>
  Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ ok: false }) });

/* eslint-disable import/first */
import BridgeRoute from "../../../ponte/bridge/BridgeRoute";
import LifecycleState from "../../../ponte/state/LifecycleState";
import CandidateRows from "../CandidateRows";
import ProductIntake from "../ProductIntake";
import ReviewPanel, { PROVENANCE_WORD } from "../ReviewPanel";
import { TERM_KEYS } from "../../../../lib/products/terms";
import { mount, fire, type Mounted, type TestElement } from "../../../../lib/landing/__tests__/render";
import { parseExtraction } from "../../../../lib/products/extract-document";
import {
  intakeReducer,
  newSession,
  rehydrate,
  serialise,
  type IntakeAction,
  type ProductIntent,
} from "../../../../lib/products/intake";
import { resolveProduct } from "../../../../lib/products/resolve";
import { scanForProducts } from "../../../../lib/products/scan";
/* eslint-enable import/first */

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

const noop = () => {};

function open(intent: ProductIntent): Mounted {
  return mount(ProductIntake as unknown as (p: Record<string, unknown>) => unknown, {
    intent,
    renderBrowse: () => "the HS drill-down",
    onResolved: noop,
  });
}

const bridges = (page: Mounted): TestElement[] => page.all().filter((el) => el.type === BridgeRoute);
const states = (page: Mounted): TestElement[] => page.all().filter((el) => el.type === LifecycleState);
const text = (page: Mounted): string => JSON.stringify(page.tree);

/**
 * Render one child component of an already-mounted tree.
 *
 * The renderer deliberately does not render children: only the component under
 * test is invoked, and nested components appear as elements whose props can be
 * read. That is the right default, and it means a panel the intake composes has
 * to be mounted on its own to see inside it. Its element carries both the
 * function and the exact props the parent passed, so this renders precisely
 * what the browser would.
 */
function descend(page: Mounted, match: (el: TestElement) => boolean, what: string): Mounted {
  const el = page.find(match, what);
  return mount(el.type as (p: Record<string, unknown>) => unknown, el.props);
}

// ---- Constitution 8 and 23: the Bridge organises the intake ------------------

test("the three intake methods are an approved Bridge, not a card grid", () => {
  const page = open("offer_product");
  const found = bridges(page);
  assert.equal(found.length, 1, "the intake did not render exactly one Bridge");
  const stations = found[0].props.stations as { key: string }[];
  assert.deepEqual(
    stations.map((s) => s.key),
    ["describe", "upload", "browse"],
    "the intake methods are not the three the decision record fixes, in its order",
  );
  assert.equal(found[0].props.mode, "select");
});

test("the crossing states where it begins and where it ends", () => {
  const bridge = bridges(open("offer_product"))[0];
  assert.equal(bridge.props.left, "Your product");
  assert.equal(bridge.props.right, "A structured draft");
  // The far abutment is a reserved crossing: no draft exists yet.
  assert.equal(bridge.props.rightDashed, true);
});

test("no generic stepper, tab strip or card grid stands in for the Bridge", () => {
  const page = open("offer_product");
  for (const el of page.all()) {
    const className = typeof el.props.className === "string" ? el.props.className : "";
    assert.ok(!/\btabs?2?\b/.test(className), `a tab treatment appeared: ${className}`);
    assert.ok(!/\bstepper\b/.test(className), `a generic stepper appeared: ${className}`);
    assert.notEqual(el.props.role, "tablist", "a tablist replaced the Bridge");
  }
});

test("nothing is selected on arrival", () => {
  const bridge = bridges(open("offer_product"))[0];
  assert.equal(bridge.props.selected, null, "a method was chosen for the member");
});

// ---- criterion 4: one resolver for both intents ------------------------------

test("both product intents mount the same intake with the same methods", () => {
  const supply = bridges(open("offer_product"))[0];
  const sourcing = bridges(open("source_product"))[0];
  assert.deepEqual(
    (supply.props.stations as { key: string }[]).map((s) => s.key),
    (sourcing.props.stations as { key: string }[]).map((s) => s.key),
  );
  // The language differs; the mechanism does not.
  assert.match(text(open("offer_product")), /what you supply/i);
  assert.match(text(open("source_product")), /what you need/i);
});

// ---- browse is retained and is not the default -------------------------------

test("browse is offered, and opens the existing HS drill-down unchanged", () => {
  const page = open("offer_product");
  const bridge = bridges(page)[0];
  fire(bridge, "onSelect", "browse");
  assert.match(text(page), /the HS drill-down/, "choosing browse did not render the picker passed in");
});

test("describing is possible without ever touching a customs code", () => {
  const page = open("offer_product");
  fire(bridges(page)[0], "onSelect", "describe");
  const panel = descend(page, (el) => typeof el.props.onVoice === "function", "the describe panel");
  const field = panel.find((el) => el.props.id === "pintake-describe", "the description field");
  // A real label, not a placeholder standing in for one (Constitution 13).
  assert.ok(panel.all().some((el) => el.props.htmlFor === "pintake-describe"), "the field has no visible label");
  fire(field, "onChange", { target: { value: "gas oil" } });
  assert.match(text(page), /gas oil/);
  // Nothing on this route asks for a customs code before Ponte understands the
  // product, which is acceptance criterion 9.
  assert.ok(!/HS code/i.test(text(page)));
  assert.match(text(page), /No customs code needed to begin/);
});

// ---- Constitution 9: no percentage before a meaningful action -----------------

test("no percentage is rendered before anything has been done, and never zero", () => {
  const page = open("offer_product");
  const rendered = text(page);
  assert.ok(!/0%/.test(rendered), "0% was rendered, which the progress law forbids outright");
  assert.match(rendered, /Nothing started yet/, "the neutral state was not stated");
});

test("a value appears only after the first meaningful action, at or above the floor", () => {
  const page = open("offer_product");
  fire(bridges(page)[0], "onSelect", "describe");
  const shown = text(page).match(/"children":\[(\d+),"%"\]/);
  assert.ok(shown, "no completion value appeared after a real action");
  assert.ok(Number(shown![1]) >= 20, `the first value was ${shown![1]}%, below the approved floor`);
});

// ---- the ambiguous state -----------------------------------------------------

test("the ambiguous state asks a question and pre-selects nothing", () => {
  const outcome = resolveProduct("gas oil");
  assert.equal(outcome.kind, "ambiguous");
  if (outcome.kind !== "ambiguous") return;

  const page = mount(CandidateRows as unknown as (p: Record<string, unknown>) => unknown, {
    candidates: outcome.candidates,
    ariaLabel: outcome.question,
    onChoose: noop,
  });
  for (const el of page.all()) {
    assert.notEqual(el.props["aria-checked"], true, "a candidate arrived pre-selected");
    assert.notEqual(el.props["aria-pressed"], true, "a candidate arrived pre-selected");
  }
  // Every candidate is a real button with a real handler.
  const rows = page.all().filter((el) => el.props.className === "pcand__r");
  assert.equal(rows.length, outcome.candidates.length);
  for (const row of rows) assert.equal(typeof row.props.onClick, "function");
});

test("a candidate prints the terms it matched on, not a manufactured percentage", () => {
  const outcome = resolveProduct("gas oil");
  if (outcome.kind === "none") throw new Error("unreachable");
  const page = mount(CandidateRows as unknown as (p: Record<string, unknown>) => unknown, {
    candidates: outcome.candidates,
    ariaLabel: "candidates",
    onChoose: noop,
  });
  const rendered = text(page);
  assert.match(rendered, /Close match|Likely match|Possible match/, "no confidence band was named");
  assert.ok(!/\d\d?%/.test(rendered), "a confidence percentage was printed on a candidate");
  assert.match(rendered, /gas oil|gasoil/, "the matched term was not shown");
  assert.match(rendered, /You confirm it later/, "the HS code was not marked as downstream and confirmable");
});

// ---- the four provenance states ----------------------------------------------

/** A review built from a document, so every provenance state is present. */
function documentReview() {
  const scanned = scanForProducts(readFileSync("lib/products/__tests__/fixtures/multi-product-sco.txt", "utf8"));
  const extraction = parseExtraction(
    {
      terms: { incoterm: { value: "CIF", quote: "immediate shipment on CIF basis to Houston Port" } },
      products: [
        {
          catalogueKey: "gasoil-10ppm-en590",
          attributes: [{ label: "Sulfur", value: "10 ppm maximum" }],
        },
      ],
    },
    { filename: "offer.txt", scanned, modelRead: true },
  );
  const session = drive(
    { type: "extraction", extraction },
    { type: "choosePlan", plan: "separate" },
    { type: "openReview" },
    // One member correction, so all four provenance states are present at once:
    // extracted from the document, confirmed by the member, verified by Ponte
    // (unavailable) and not stated.
    { type: "editTerm", scope: "shared", key: "origin", value: "United Arab Emirates" },
  );
  if (session.stage.kind !== "review") throw new Error("unreachable");
  return session.stage.review;
}

test("the review shows four provenance states, each distinct in words", () => {
  const session = { stage: { kind: "review" as const, review: documentReview() } };

  const page = mount(ReviewPanel as unknown as (p: Record<string, unknown>) => unknown, {
    review: session.stage.review,
    intentLabel: "This will become a supply offer.",
    onEditShared: noop,
    onEditProduct: noop,
    onToggleProduct: noop,
    onConfirm: noop,
  });

  // Every provenance marker in the tree, and every one a term row would carry.
  const marks = page.all().filter((el) => typeof el.props.provenance === "string");
  const rows = page.all().filter((el) => typeof el.props.onEdit === "function");
  const shown = new Set(marks.map((el) => el.props.provenance as string));
  for (const row of rows) shown.add((row.props.value as { provenance: string }).provenance);

  for (const state of ["extracted", "member_confirmed", "ponte_verified", "missing"]) {
    assert.ok(shown.has(state), `the review never renders the "${state}" provenance`);
  }

  const rendered = text(page);
  // Verification is named as unavailable rather than implied to be obtainable.
  assert.match(rendered, /Not available on this journey/);
  // And nothing has been created at this point.
  assert.match(rendered, /Nothing has been created or published/);
  // Every commercial term the decision record names has a row.
  assert.equal(rows.length, TERM_KEYS.length, "not every commercial term reached the review");
});

test("a catalogue attribute is never presented as a claim the document made", () => {
  const review = documentReview();
  const product = review.products.find((p) => p.id === "gasoil-10ppm-en590")!;

  // The document said this one, and the parser kept it.
  assert.ok(
    product.documentAttributes.some((a) => /sulfur/i.test(a.label)),
    "the attribute the document stated did not survive as a document attribute",
  );
  // These come from Ponte's product record and must not be mixed in with it.
  assert.ok(product.product.attributes.length > 0);
  const documentLabels = new Set(product.documentAttributes.map((a) => a.label));
  for (const attribute of product.product.attributes) {
    assert.ok(
      !documentLabels.has(attribute.label),
      `${attribute.label} appears in both lists, so its provenance is unarguable`,
    );
  }

  // And the panel renders the catalogue rows without a provenance marker at
  // all, rather than labelling them extracted or confirmed. Both would be
  // untrue: the document did not say them and the member has not agreed yet.
  const page = mount(ReviewPanel as unknown as (p: Record<string, unknown>) => unknown, {
    review,
    intentLabel: "x",
    onEditShared: noop,
    onEditProduct: noop,
    onToggleProduct: noop,
    onConfirm: noop,
  });
  const rendered = text(page);
  assert.match(rendered, /Ponte&#x27;s product record, not claims from your document|Ponte's product record, not claims from your document/);
});

test("a catalogue attribute the document repeated verbatim is not printed twice", () => {
  const review = documentReview();
  const product = review.products.find((p) => p.id === "gasoil-10ppm-en590")!;
  const page = mount(ReviewPanel as unknown as (p: Record<string, unknown>) => unknown, {
    review,
    intentLabel: "x",
    onEditShared: noop,
    onEditProduct: noop,
    onToggleProduct: noop,
    onConfirm: noop,
  });

  // The fixture's model answer states "Sulfur: 10 ppm maximum", and the
  // catalogue holds "Sulphur content: 10 ppm maximum". Same fact, and it was
  // rendered on two consecutive rows on the deploy preview.
  const values = page
    .all()
    .filter((el) => el.props.className === "prow__v")
    .map((el) => String(el.props.children));
  const tenPpm = values.filter((v) => v === "10 ppm maximum");
  assert.equal(tenPpm.length, 1, `"10 ppm maximum" printed ${tenPpm.length} times`);

  // And a disagreement is still shown twice, because it is one the member has
  // to see rather than one the review screen may resolve.
  const disagreeing = {
    ...review,
    products: [{ ...product, documentAttributes: [{ key: "s", label: "Sulphur content", value: "50 ppm maximum" }] }],
  };
  const second = mount(ReviewPanel as unknown as (p: Record<string, unknown>) => unknown, {
    review: disagreeing,
    intentLabel: "x",
    onEditShared: noop,
    onEditProduct: noop,
    onToggleProduct: noop,
    onConfirm: noop,
  });
  const both = second
    .all()
    .filter((el) => el.props.className === "prow__v")
    .map((el) => String(el.props.children));
  assert.ok(both.includes("50 ppm maximum"), "the document's value was hidden");
  assert.ok(both.includes("10 ppm maximum"), "Ponte's differing value was hidden");
});

test("the four provenance words are four different words", () => {
  const words = new Set(Object.values(PROVENANCE_WORD));
  assert.equal(words.size, 4, "two provenance states share one word, which collapses them");
  assert.equal(PROVENANCE_WORD.ponte_verified, "Verified by Ponte");
  assert.notEqual(PROVENANCE_WORD.extracted, PROVENANCE_WORD.member_confirmed);
});

test("each provenance carries its own marker class, so colour is not the only carrier", () => {
  const page = mount(ReviewPanel as unknown as (p: Record<string, unknown>) => unknown, {
    review: documentReview(),
    intentLabel: "x",
    onEditShared: noop,
    onEditProduct: noop,
    onToggleProduct: noop,
    onConfirm: noop,
  });
  // Markers rendered by the panel itself, plus the ones its term rows carry.
  // The renderer does not descend into child components, so both have to be
  // collected or the count is of the panel's own rows only.
  const rendered = new Set(
    page.all().filter((el) => typeof el.props.provenance === "string").map((el) => el.props.provenance as string),
  );
  for (const row of page.all().filter((el) => typeof el.props.onEdit === "function")) {
    rendered.add((row.props.value as { provenance: string }).provenance);
  }
  assert.equal(rendered.size, 4, `the review rendered ${rendered.size} distinguishable provenance markers, not four`);

  // The stylesheet gives each one a different marker geometry, which is what
  // keeps them apart in greyscale, in colour blindness and on a printout.
  const css = readFileSync("components/products/intake/intake.css", "utf8");
  const shapes = new Set<string>();
  for (const modifier of ["extracted", "member", "ponte", "missing"]) {
    const block = css.match(new RegExp(`\\.pprov--${modifier}::before\\s*\\{([^}]*)\\}`));
    assert.ok(block, `pprov--${modifier} has no marker shape of its own`);
    shapes.add(block![1].replace(/\s+/g, " ").trim());
  }
  assert.equal(shapes.size, 4, "two provenance markers are drawn identically");
});

// ---- failure states are explained, never blank -------------------------------

/** Drive a fresh session through a run of real actions. */
function drive(...actions: IntakeAction[]) {
  return actions.reduce(intakeReducer, newSession("offer_product"));
}

/** The intake, opened directly on a state, through the evidence seam. */
function seeded(action: Record<string, unknown>): Mounted {
  const session = intakeReducer(newSession("offer_product"), action as never);
  assert.notEqual(session.stage.kind, "initial", "the action produced no state to render");
  return mount(ProductIntake as unknown as (p: Record<string, unknown>) => unknown, {
    intent: "offer_product",
    renderBrowse: () => null,
    onResolved: noop,
    initialSession: session,
    disableResume: true,
  });
}

test("every failure state names what happened and offers a way on", () => {
  const cases: { action: Record<string, unknown>; names: RegExp; wayOn: RegExp }[] = [
    {
      action: { type: "blocked", filename: "old.doc", format: "doc", reason: "Legacy Word documents are binary." },
      names: /cannot read a \.doc/,
      wayOn: /Describe the product instead|browse the categories/,
    },
    {
      action: { type: "uploadFailed", filename: "o.pdf", reason: "The upload did not reach Ponte." },
      names: /upload did not finish/,
      wayOn: /Try another document/,
    },
    {
      action: { type: "extractionFailed", filename: "o.pdf", reason: "Ponte could not read it." },
      names: /could not read that document/,
      wayOn: /Describe it instead/,
    },
    {
      action: { type: "resolution", outcome: resolveProduct("intergalactic widgets") },
      names: /did not recognise that yet/,
      wayOn: /upload the document|browse/,
    },
  ];

  for (const { action, names, wayOn } of cases) {
    const rendered = text(seeded(action));
    assert.match(rendered, names, `the state did not name what happened: ${JSON.stringify(action.type)}`);
    assert.match(rendered, wayOn, `the state offered no way on: ${JSON.stringify(action.type)}`);
  }
});

test("a blocked format is a blocked state with a reason, not an error", () => {
  const page = seeded({ type: "blocked", filename: "old.doc", format: "doc", reason: "Legacy Word documents are binary." });
  const shown = states(page).find((el) => el.props.state === "blocked");
  assert.ok(shown, "a blocked format did not render the blocked lifecycle state");
  // Constitution 12: an action the member may expect to work needs a reason.
  assert.ok(typeof shown!.props.detail === "string" && (shown!.props.detail as string).length > 10);
});

test("an unmatched product explains what Ponte looked for and refuses to guess", () => {
  const rendered = text(seeded({ type: "resolution", outcome: resolveProduct("intergalactic widgets") }));
  assert.match(rendered, /will not guess a product you did not name/);
});

test("a multi-product document offers both plans and pre-selects neither", () => {
  const scanned = scanForProducts(readFileSync("lib/products/__tests__/fixtures/multi-product-sco.txt", "utf8"));
  const extraction = parseExtraction({}, { filename: "offer.txt", scanned, modelRead: true });
  const page = seeded({ type: "extraction", extraction });
  const choice = descend(page, (el) => typeof el.props.onChoose === "function" && !!el.props.extraction, "the plan choice");
  const rendered = text(choice);
  assert.match(rendered, /Create 3 separate drafts/);
  assert.match(rendered, /Create one supply programme/);
  assert.match(rendered, /will not choose this for you/);
  // All three products are named, not summarised into one line.
  assert.match(rendered, /Gasoil/);
  assert.match(rendered, /D6/);
  assert.match(rendered, /Jet/);

  // The choice is itself an approved Bridge, not two cards.
  const bridge = bridges(choice).find((b) => (b.props.stations as { key: string }[]).some((s) => s.key === "programme"));
  assert.ok(bridge, "the multi-product choice was not rendered as a Bridge");
  assert.equal(bridge!.props.selected, null, "a plan was pre-selected for the member");
});

test("a resumed session says what it restored", () => {
  const restored = rehydrate(serialise({ ...newSession("offer_product"), ...intakeReducer(newSession("offer_product"), { type: "type", wording: "gas oil" }) }));
  assert.ok(restored);
  const page = mount(ProductIntake as unknown as (p: Record<string, unknown>) => unknown, {
    intent: "offer_product",
    renderBrowse: () => null,
    onResolved: noop,
    initialSession: restored,
    disableResume: true,
  });
  assert.match(text(page), /brought you back to it/);
  assert.match(text(page), /gas oil/);
});

test("the analysing state uses the approved lifecycle primitive, not a local spinner", () => {
  const page = seeded({ type: "analyse", method: "describe", what: "gas oil" });
  const shown = states(page);
  assert.equal(shown.length, 1, "analysing rendered no single lifecycle state");
  assert.equal(shown[0].props.state, "active");
  // Motion means work is happening now, and the words say which work.
  assert.match(String(shown[0].props.label), /Identifying your product/);
  assert.match(String(shown[0].props.detail), /gas oil/);
});

test("every state that is not settled resolves through the approved lifecycle primitive", () => {
  const cases: Record<string, unknown>[] = [
    { type: "analyse", method: "upload", what: "offer.pdf" },
    { type: "blocked", filename: "o.doc", format: "doc", reason: "Legacy binary." },
    { type: "uploadFailed", filename: "o.pdf", reason: "No connection." },
    { type: "extractionFailed", filename: "o.pdf", reason: "Unreadable." },
    { type: "resolution", outcome: resolveProduct("gas oil") },
    { type: "resolution", outcome: resolveProduct("intergalactic widgets") },
  ];
  for (const action of cases) {
    const shown = states(seeded(action));
    assert.ok(shown.length >= 1, `${String(action.type)} rendered no lifecycle state of its own`);
  }
});

// ---- Constitution 7 and the governance ratchet -------------------------------

test("no component in the intake contains a hand-authored svg", () => {
  const dir = "components/products/intake";
  for (const entry of readdirSync(dir)) {
    if (!/\.tsx?$/.test(entry)) continue;
    const source = readFileSync(`${dir}/${entry}`, "utf8");
    assert.ok(!/<svg[\s>]/.test(source), `${entry} hand-draws an SVG, which Constitution 7 prohibits`);
  }
});

test("the intake stylesheet declares no colour, font, radius or shadow of its own", () => {
  const css = readFileSync("components/products/intake/intake.css", "utf8");
  const body = css.replace(/\/\*[\s\S]*?\*\//g, "");
  assert.ok(!/#[0-9a-fA-F]{3,8}\b/.test(body), "a hard-coded colour was introduced");
  assert.ok(!/\brgba?\(/.test(body), "a hard-coded colour was introduced");
  assert.ok(!/\bhsla?\(/.test(body), "a hard-coded colour was introduced");
  assert.ok(!/box-shadow\s*:/.test(body), "a page-specific shadow was introduced");
  assert.ok(!/@keyframes/.test(body), "a page-specific animation was introduced");
  assert.ok(!/transition\s*:/.test(body), "a page-specific motion was introduced");

  // Every declared value of these properties must come from a token. Checked by
  // reading each declaration's value rather than with a lookahead, which
  // backtracks past the space and passes anything.
  const declarations = (property: string): string[] =>
    Array.from(body.matchAll(new RegExp(`${property}\\s*:\\s*([^;]+);`, "g"))).map((m) => m[1].trim());

  for (const value of declarations("font-family")) {
    assert.ok(value.startsWith("var("), `font-family: ${value} is not a token`);
  }
  for (const value of declarations("border-radius")) {
    // 50% is a circle, which is geometry rather than a radius token, and it is
    // what distinguishes two provenance markers from each other.
    assert.ok(value === "50%" || value.startsWith("var("), `border-radius: ${value} is not a token`);
  }
});

console.log(`ok   ${passed} product intake UI tests passed`);
