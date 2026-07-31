// The landing Family Bridge and Action Bridge.
//
// Run: npx tsx --tsconfig tsconfig.ui-test.json lib/landing/__tests__/family-action-bridges.test.tsx
//
// This slice replaces a visible, working part of the product: nine plain links
// in three columns become a selection bridge that reveals a second bridge. The
// design changed on purpose. **Nothing else was allowed to.**
//
// So the first and largest group of assertions below is not about the bridge at
// all. It is about the nine destinations: that each one is still the exact URL
// the canonical taxonomy produces, that services and distribution still carry no
// HS code, and that the reading order is the one the grid had. A redesign that
// quietly dropped a query parameter would look perfect in a screenshot and would
// break Start a Deal.
//
// The second group is the bridge's own contract from the approved implementation
// notes: a radiogroup of buttons with roving tabindex, one tab stop, arrow-key
// traversal, and focus that survives re-render.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

/* eslint-disable import/first */
import { landingFamilies } from "../families";
import { marketEntrances } from "@/lib/desk/entrances";
import { MARKET_FAMILIES, intentsForFamily } from "@/lib/taxonomy/market";
import LandingBridges from "@/components/ponte/bridge/LandingBridges";
import BridgeRoute from "@/components/ponte/bridge/BridgeRoute";
import { fire, mount, type Mounted, type TestElement } from "./render";
import { DECK_HEIGHT, blockWidth, deckPath, elevationX, stationFractions, subPath } from "@/components/ponte/bridge/geometry";
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

const families = landingFamilies();
const bridgeCss = readFileSync("design/authority/bridge/v1/source/ponte-bridge.css", "utf8");
const integrationCss = readFileSync("components/ponte/bridge/bridge-integration.css", "utf8");
const bridgeRoute = readFileSync("components/ponte/bridge/BridgeRoute.tsx", "utf8");
const landingPage = readFileSync("app/[locale]/page.tsx", "utf8");

/**
 * Top-level rules of a stylesheet, as `[selector, declarations]`.
 *
 * Comments are stripped first; `bridge-integration.css` explains itself at
 * length and several of those explanations quote selectors.
 */
function rulesOf(css: string): [string, string][] {
  const stripped = css.replace(/\/\*[\s\S]*?\*\//g, "");
  return Array.from(stripped.matchAll(/([^{}]+)\{([^{}]*)\}/g)).map(
    (m) => [m[1].trim().replace(/\s+/g, " "), m[2].trim().replace(/\s+/g, " ")] as [string, string],
  );
}

/** Every station element of a mounted bridge, in render order. */
function stationsOf(bridge: Mounted): TestElement[] {
  return bridge
    .all()
    .filter((el) => typeof el.props.className === "string" && /(^|\s)brst(\s|$)/.test(el.props.className as string));
}

function mountFamilyBridge(selected: string | null = null, onSelect: (key: string) => void = () => {}): Mounted {
  return mount(BridgeRoute as unknown as (p: unknown) => unknown, {
    mode: "select",
    ariaLabel: "Choose a market family",
    stations: families.map((f, i) => ({
      key: f.key,
      title: f.label,
      description: f.scope,
      index: String(i + 1).padStart(2, "0"),
      mark: "Selected route",
    })),
    selected,
    visited: [],
    onSelect,
  });
}

// ---------------------------------------------------------------------------
// Destinations. The part that must not have changed.
// ---------------------------------------------------------------------------

test("every action destination is exactly what the canonical taxonomy produces", () => {
  const entrances = marketEntrances();
  for (const family of families) {
    const canonical = entrances.find((e) => e.key === family.key)!;
    const expected = [
      ...(canonical.discovery ? [canonical.discovery.href] : []),
      ...canonical.create.map((c) => c.href),
    ];
    assert.deepEqual(
      family.actions.map((a) => a.href),
      expected,
      `${family.key} destinations diverged from the taxonomy`,
    );
  }
});

test("the nine destinations are, literally, these nine", () => {
  // Written out so a change to any one of them fails here with the old and new
  // URL side by side, rather than passing because both sides moved together.
  assert.deepEqual(
    families.flatMap((f) => f.actions.map((a) => a.href)),
    [
      "/market-signals",
      "/structure?family=products&intent=source_product",
      "/structure?family=products&intent=offer_product",
      "/structure?family=services&intent=seek_trade_service",
      "/structure?family=services&intent=offer_trade_service",
      "/structure?family=distribution&intent=seek_distribution_partner",
      "/structure?family=distribution&intent=offer_distribution_or_representation",
      "/structure?family=distribution&intent=seek_brands_or_products_to_represent",
    ],
  );
});

test("the required actions are present under the right family, with the approved wording", () => {
  const byFamily = Object.fromEntries(families.map((f) => [f.key, f.actions.map((a) => a.label)]));
  assert.deepEqual(byFamily.products, [
    "Explore Market Signals",
    "Post a product requirement",
    "Post a product offer",
  ]);
  assert.deepEqual(byFamily.services, ["Request a trade service", "Offer a trade service"]);
  assert.deepEqual(byFamily.distribution, [
    "Find a distribution partner",
    "Offer distribution or market coverage",
    "Find products or brands to represent",
  ]);
});

test("actions stay family-specific: no family offers another family's intent", () => {
  for (const family of families) {
    const own = intentsForFamily(family.key as never).map((i) => i.key as string);
    for (const action of family.actions) {
      const intent = /intent=([a-z_]+)/.exec(action.href)?.[1];
      if (!intent) continue; // the discovery entrance carries no intent
      assert.ok(own.includes(intent), `${family.key} offers ${intent}, which belongs to another family`);
      assert.match(action.href, new RegExp(`family=${family.key}\\b`), `${action.href} carries the wrong family`);
    }
  }
});

test("no HS classification is introduced for services or distribution", () => {
  // The composer decides this from `requiresHsClassification`, and the landing
  // must not pre-empt it by smuggling an HS parameter into a destination.
  for (const family of families) {
    for (const action of family.actions) {
      assert.ok(!/\bhs[=_]/i.test(action.href), `${family.key} action carries an HS parameter: ${action.href}`);
    }
  }
});

test("only Products opens with a discovery entrance", () => {
  // The other two families have no externally observed inventory, so a
  // discovery link would lead into an empty result. Their first action is a
  // creation entrance instead, which is what makes them equally actionable.
  assert.equal(families.find((f) => f.key === "products")!.actions[0].href, "/market-signals");
  for (const key of ["services", "distribution"]) {
    const first = families.find((f) => f.key === key)!.actions[0];
    assert.match(first.href, /^\/structure\?/, `${key} opens with something other than a creation entrance`);
  }
});

test("the three canonical families are present, in canonical order, with their approved names", () => {
  assert.deepEqual(
    families.map((f) => f.key),
    MARKET_FAMILIES.map((f) => f.key),
  );
  assert.deepEqual(families.map((f) => f.label), ["Products", "Trade services", "Distribution and representation"]);
  assert.equal(families.length, 3);
});

test("every family carries at least one action, and the two- and three-action variants both exist", () => {
  for (const family of families) assert.ok(family.actions.length > 0, `${family.key} has no way in`);
  const counts = families.map((f) => f.actions.length).sort();
  assert.deepEqual(counts, [2, 3, 3], "the approved two-action and three-action variants are not both exercised");
});

// ---------------------------------------------------------------------------
// The landing composition
// ---------------------------------------------------------------------------

test("the approved headline and its gold italic emphasis are untouched", () => {
  assert.match(
    landingPage,
    /Global trade, from <em>signal to deal\.<\/em>/,
    "the authorised headline structure has been changed",
  );
});

test("the temporary three-column family/action grid is gone", () => {
  assert.ok(!/className="fams"/.test(landingPage), "the replaced card grid is still rendered");
  assert.ok(!/className="fam__go/.test(landingPage), "the replaced action cards are still rendered");
});

test("the rest of the landing is still there", () => {
  // The notes authorise replacing the family/action section and nothing else.
  for (const kept of ["SignalStrip", "Market Signals", "PonteFooter", "DeskShell"]) {
    assert.ok(landingPage.includes(kept), `${kept} was removed from the landing`);
  }
  assert.ok(!/hero__input|<input/.test(landingPage), "a hero input was introduced, which section 5 forbids");
});

test("the product sectors are gone from the landing", () => {
  // Owner decision: non-clickable sectors have no purpose on the landing and
  // create visual noise. They belong in the Explore journey, where they will be
  // clickable and lead somewhere. That journey is NOT built here.
  assert.ok(!/PRODUCT_SECTORS/.test(landingPage), "the sector grid is still rendered");
  assert.ok(!/className="sectors"/.test(landingPage), "the sector grid markup is still present");
  assert.ok(!/The product sectors/.test(landingPage), "the sector section heading is still present");
});

test("no HS language reaches the landing", () => {
  // Owner decision: HS classification applies only to physical-product paths and
  // must never be shown as a requirement on the landing. Checked against the
  // page and against the copy the bridge renders.
  // Comments are stripped first: this file explains at length WHY no HS copy is
  // rendered, and testing the prose would make the explanation fail the rule it
  // is explaining. Only what reaches a member is checked.
  const copy = readFileSync("lib/landing/families.ts", "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "");
  const rendered = copy.slice(copy.indexOf("const SCOPE"));
  for (const [what, text] of [
    ["the landing page", landingPage],
    ["the bridge copy", rendered],
  ] as const) {
    assert.ok(!/\bHS\b/.test(text), `${what} still mentions HS`);
    assert.ok(!/harmonised|harmonized/i.test(text), `${what} still mentions the Harmonised System`);
  }
});

test("all three action bridges are rendered, so no destination depends on JavaScript", () => {
  const page = mount(LandingBridges as unknown as (p: unknown) => unknown, { families });
  const sections = page
    .all()
    .filter((el) => typeof el.props.className === "string" && /(^|\s)brx(\s|$)/.test(el.props.className as string));
  assert.equal(sections.length, 3, "not every family's actions are in the document");
  // With nothing chosen, every one of them is hidden. The noscript rule in the
  // component is what reveals them when scripting is off.
  assert.ok(
    sections.every((s) => s.props.hidden === true),
    "an action bridge is visible before a family has been chosen",
  );
});

test("choosing a family reveals that family's actions and no other", () => {
  const page = mount(LandingBridges as unknown as (p: unknown) => unknown, { families });
  const familyBridge = page.find((el) => el.props.mode === "select", "family bridge");
  fire(familyBridge, "onSelect", "services");

  const sections = page
    .all()
    .filter((el) => typeof el.props.className === "string" && /(^|\s)brx(\s|$)/.test(el.props.className as string));
  const open = sections.filter((s) => s.props.hidden !== true);
  assert.equal(open.length, 1, "exactly one action bridge should be revealed");
  assert.match(String(open[0].props["aria-label"]), /^Trade services/);
  assert.match(String(open[0].props.className), /brx--in/, "the revealed section does not carry the approved reveal");
});

// ---------------------------------------------------------------------------
// The bridge's own contract
// ---------------------------------------------------------------------------

test("the family bridge is a radiogroup, not a list of cards", () => {
  const bridge = mountFamilyBridge();
  const root = bridge.find((el) => typeof el.props.className === "string" && /(^|\s)br(\s|$)/.test(el.props.className as string), "bridge root");
  assert.equal(root.props.role, "radiogroup");
  assert.equal(root.props["aria-label"], "Choose a market family");

  const stations = stationsOf(bridge);
  assert.equal(stations.length, 3);
  for (const station of stations) {
    assert.equal(station.type, "button", "a family station is not a button");
    assert.equal(station.props.role, "radio");
  }
});

test("one tab stop for the whole bridge, and it is the roving one", () => {
  const bridge = mountFamilyBridge();
  const tabbable = stationsOf(bridge).filter((s) => s.props.tabIndex === 0);
  assert.equal(tabbable.length, 1, "a bridge must be a single tab stop");
  assert.equal(stationsOf(bridge).filter((s) => s.props.tabIndex === -1).length, 2);
});

test("the tab stop follows the selection once one is made", () => {
  const bridge = mountFamilyBridge("distribution");
  const stations = stationsOf(bridge);
  assert.equal(stations[2].props.tabIndex, 0, "the tab stop did not move to the chosen station");
  assert.equal(stations[2].props["aria-checked"], true);
  assert.equal(stations[0].props["aria-checked"], false);
});

test("arrow keys traverse the group and select as they go", () => {
  const chosen: string[] = [];
  const bridge = mountFamilyBridge(null, (key: string) => { chosen.push(key); });
  const prevented: string[] = [];
  const event = (key: string) => ({ key, preventDefault: () => prevented.push(key) });

  fire(stationsOf(bridge)[0], "onKeyDown", event("ArrowRight"));
  assert.deepEqual(chosen, ["services"], "ArrowRight did not move to the next station");

  fire(stationsOf(bridge)[1], "onKeyDown", event("ArrowLeft"));
  assert.deepEqual(chosen, ["services", "products"], "ArrowLeft did not move back");

  assert.deepEqual(prevented, ["ArrowRight", "ArrowLeft"], "arrow keys must not also scroll the page");
});

test("traversal wraps at both ends, and Home and End are not bound", () => {
  const chosen: string[] = [];
  const bridge = mountFamilyBridge(null, (key: string) => { chosen.push(key); });
  const event = (key: string) => ({ key, preventDefault: () => {} });

  fire(stationsOf(bridge)[0], "onKeyDown", event("ArrowLeft"));
  assert.equal(chosen.at(-1), "distribution", "ArrowLeft from the first station should wrap to the last");

  fire(stationsOf(bridge)[2], "onKeyDown", event("ArrowRight"));
  assert.equal(chosen.at(-1), "products", "ArrowRight from the last station should wrap to the first");

  // The approved engine binds ArrowRight, ArrowDown, ArrowLeft and ArrowUp and
  // nothing else. Home and End are absent from it, so they are absent here: this
  // is a translation of the engine, not an improvement on it. Asserted so their
  // absence is a recorded decision rather than an oversight.
  const before = chosen.length;
  fire(stationsOf(bridge)[1], "onKeyDown", event("End"));
  fire(stationsOf(bridge)[1], "onKeyDown", event("Home"));
  assert.equal(chosen.length, before, "Home or End changed the selection; the approved engine binds neither");
});

test("a key the bridge does not own is left alone", () => {
  const chosen: string[] = [];
  const bridge = mountFamilyBridge(null, (key: string) => { chosen.push(key); });
  let prevented = false;
  fire(stationsOf(bridge)[0], "onKeyDown", { key: "Tab", preventDefault: () => { prevented = true; } });
  assert.equal(prevented, false, "the bridge swallowed Tab, which would trap focus");
  assert.deepEqual(chosen, []);
});

test("each station names itself, and the decoration does not", () => {
  const bridge = mountFamilyBridge("products");
  for (const station of stationsOf(bridge)) {
    assert.ok(station.props["aria-labelledby"], "a station has no accessible name");
    assert.ok(station.props["aria-describedby"], "a station's description is not associated with it");
  }
  // The gold "Selected" mark is hidden with height 0 and opacity 0, neither of
  // which removes it from the accessibility tree. Without aria-hidden every
  // family would announce itself as selected.
  const marks = bridge
    .all()
    .filter((el) => typeof el.props.className === "string" && (el.props.className as string).includes("brst__mk"));
  assert.ok(marks.length > 0, "no selected-state marker rendered");
  assert.ok(marks.every((m) => m.props["aria-hidden"] === "true"), "the selected marker is announced on every station");
});

test("action stations are real links, so routing behaviour is preserved", () => {
  const products = families.find((f) => f.key === "products")!;
  const bridge = mount(BridgeRoute as unknown as (p: unknown) => unknown, {
    mode: "navigate",
    ariaLabel: "Products actions",
    stations: products.actions.map((a, i) => ({
      key: a.key,
      title: a.label,
      description: a.note,
      index: String(i + 1).padStart(2, "0"),
      href: a.href,
    })),
  });
  const stations = stationsOf(bridge);
  assert.equal(stations.length, 3);
  assert.deepEqual(
    stations.map((s) => s.props.href),
    ["/market-signals", "/structure?family=products&intent=source_product", "/structure?family=products&intent=offer_product"],
  );
  for (const station of stations) {
    assert.notEqual(station.props.role, "radio", "an action station is a destination, not a choice");
    assert.equal(station.props.onClick, undefined, "an action station must navigate by href, not by handler");
  }
});

// ---------------------------------------------------------------------------
// The approved geometry and motion, as the stylesheet defines them
// ---------------------------------------------------------------------------

test("the bridge uses the approved class vocabulary and introduces no substitute", () => {
  const bridge = mountFamilyBridge("products");
  const classNames = bridge
    .all()
    .map((el) => el.props.className)
    .filter((c): c is string => typeof c === "string")
    .flatMap((c) => c.split(/\s+/))
    .filter(Boolean);

  // Constitution section 23 and the Bridge README both prohibit substituting a
  // card grid, tabs or a generic stepper for the bridge.
  for (const banned of ["card", "tab", "tabs", "stepper", "step", "accordion", "fam", "fam__go"]) {
    assert.ok(!classNames.includes(banned), `the bridge rendered a '${banned}' class, which is a prohibited substitute`);
  }

  // Every bridge class it does use must exist in the approved stylesheet.
  for (const name of Array.from(new Set(classNames.filter((c) => /^(br|brst)/.test(c))))) {
    const escaped = name.replace(/[-]/g, "\\-");
    assert.ok(
      // `brst__i` is the fourth implementation-layer class: ADR-0019's category
      // marker, styled in bridge-integration.css rather than in the approved package.
      new RegExp(`\\.${escaped}\\b`).test(bridgeCss) || /^(br__stage|br__vsvg|brst__w|brst__i)$/.test(name),
      `'${name}' is neither defined by the approved Bridge stylesheet nor one of the two ` +
        `hooks the approved engine creates and styles inline (br__stage, br__vsvg, brst__w)`,
    );
  }
});

test("the selected station carries the approved gold, and gold is a signal not a status", () => {
  // The approved stylesheet, not the component, decides this. Asserted here so
  // that a future edit which repainted the chosen node in a status colour, or
  // repainted a status in gold, fails a test rather than a review.
  assert.match(bridgeCss, /\.brst--on \.brst__n\{[^}]*background:var\(--pf-gold-ink\)/);
  assert.match(bridgeCss, /\.br__pt\{fill:var\(--pf-gold-ink\)\}/);
  assert.match(bridgeCss, /\.br__pt--halt\{fill:var\(--pf-review\)\}/, "the halted point must not be gold");
  assert.match(bridgeCss, /\.br__pt--danger\{fill:var\(--pf-danger\)\}/, "danger must not be gold");
});

test("the moving signal is removed when the state settles", () => {
  // `.br__runner` is opacity 0 until `--go` is added, and the component removes
  // the travelling classes once the transition has played. A gold point that
  // kept moving would claim work is happening after the choice was made.
  assert.match(bridgeCss, /\.br__runner\{[^}]*opacity:0\}/);
  assert.match(bridgeCss, /\.br__runner--go\{animation:br-travel 620ms/);
  const source = readFileSync("components/ponte/bridge/BridgeRoute.tsx", "utf8");
  assert.match(source, /setTravel\(0\)/, "the travelling state is never cleared");
});

test("reduced motion is honoured through both approved hooks, and removes only movement", () => {
  assert.match(bridgeCss, /@media \(prefers-reduced-motion:reduce\)/, "the OS setting is not honoured");
  assert.match(bridgeCss, /\.br--still/, "the in-product still variant is missing");

  // Both blocks may only stop things. A rule that repositioned or recoloured
  // anything would be a redraw, and the settled frame would no longer be the
  // authored one.
  const blocks = Array.from(
    bridgeCss.matchAll(/(?:@media \(prefers-reduced-motion:reduce\)\{|\.br--still \*,\.br--still\{)([\s\S]*?)\n(?=\.|@|$)/g),
  );
  assert.ok(blocks.length >= 1, "no reduced-motion block found");
  for (const [, body] of blocks) {
    for (const [, property] of Array.from(body.matchAll(/([a-z-]+)\s*:/g))) {
      assert.ok(
        ["animation", "transition", "display", "stroke-dasharray", "stroke-dashoffset"].includes(property),
        `reduced motion sets '${property}', which redraws rather than removes`,
      );
    }
  }
});

test("the vertical treatment exists for narrow containers and is the approved one", () => {
  assert.match(bridgeCss, /\.br--v \.brst/, "the approved vertical station treatment is missing");
  const geometry = readFileSync("components/ponte/bridge/geometry.ts", "utf8");
  assert.match(geometry, /VERTICAL_BELOW = 460/, "the engine's own 460px threshold is not used");
  const source = readFileSync("components/ponte/bridge/BridgeRoute.tsx", "utf8");
  assert.match(source, /br--v/, "the component never applies the approved vertical class");
});

// ---------------------------------------------------------------------------
// The bridge must be readable before, and if, the measurement ever runs
//
// The horizontal bridge is positioned entirely by a layout effect: it writes an
// inline left, top and width onto every station and then sets the stage's
// height from its lowest child. The approved stylesheet gives `.brst`
// `position: absolute` and no coordinates, so when that effect does not run the
// result is not a plainer layout, it is a pile: every station on the same
// static position, a stage with no height, and the next section drawn over it.
//
// Seen live in Chrome on 31 July 2026 after the deploy of `f26718a`, most
// likely a client chunk that failed mid-deploy, and recovered on its own. The
// `<noscript>` rule answers "scripting is off"; this answers "the script has
// not run yet, or never will", which is the more common case by far.
//
// The behaviour in a real browser is asserted in `e2e/landing-bridges.spec.ts`.
// These are the checks that hold in `npm run verify`.
// ---------------------------------------------------------------------------

test("an unmeasured stage has a CSS-only layout, and it is in the implementation layer", () => {
  // Not in the approved package. `ponte-bridge.css` is an approval record,
  // checksum-pinned by `check-governance.mjs` and diff-pinned by
  // `check-bridge-invariance.mjs`; the fallback belongs beside `br__stage`,
  // which the approved source does not declare either.
  assert.ok(
    !/data-measured/.test(bridgeCss),
    "the fallback was written into the approved authority stylesheet",
  );

  const fallback = rulesOf(integrationCss).filter(([selector]) => selector.includes("br__stage"));
  assert.ok(fallback.length > 0, "there is no fallback layout for an unmeasured stage");

  const stage = fallback.find(([selector]) => !selector.includes(">"));
  assert.ok(stage, "the unmeasured stage itself is not laid out");
  assert.match(stage![1], /display: ?flex|display: ?grid/, "the unmeasured stage does not put its stations in flow");

  // A stage whose children are all out of flow has no height of its own, which
  // is the half of the defect that let the section below overlap the bridge.
  const min = /min-height: ?(\d+)px/.exec(stage![1]);
  assert.ok(min, "the unmeasured stage has no minimum height");
  assert.equal(
    Number(min![1]),
    DECK_HEIGHT,
    "the fallback stage height is not the engine's own deck height",
  );

  // And the stations themselves have to leave `position: absolute`, or they
  // stay stacked on one static position however the stage is laid out.
  const stations = fallback.find(([selector]) => /\.brst\b/.test(selector));
  assert.ok(stations, "the unmeasured stations are never taken out of absolute positioning");
  assert.match(stations![1], /position: ?(relative|static)/, "the unmeasured stations stay absolutely positioned");
});

test("the fallback cannot reach the settled rendering", () => {
  // The approved reference renders in `design/authority/bridge/v1/reference/`
  // are what the settled bridge is compared against, so every fallback rule
  // must be inert the moment the measurement has run. One unguarded selector
  // would change the approved drawing and nothing else here would notice.
  for (const [selector] of rulesOf(integrationCss)) {
    if (!selector.includes("br__stage")) continue;
    assert.ok(
      selector.includes(":not([data-measured])"),
      `'${selector}' is not guarded by :not([data-measured]), so it survives the measurement`,
    );
  }
});

test("the measurement retires the fallback itself, in the right order", () => {
  assert.match(
    bridgeRoute,
    /stage\.setAttribute\("data-measured"/,
    "nothing ever tells the stylesheet that the stage has been measured",
  );

  const positioned = bridgeRoute.indexOf("el.style.left =");
  const retired = bridgeRoute.indexOf('stage.setAttribute("data-measured"');
  const fit = bridgeRoute.indexOf("const fit = ");
  assert.ok(positioned > -1 && retired > -1 && fit > -1, "the horizontal measurement effect has changed shape");

  // After the stations are placed: a measurement that throws must leave the
  // readable fallback standing rather than the pile it replaces.
  assert.ok(retired > positioned, "the fallback is retired before the stations have been positioned");
  // And before `fit`, which reads offsetTop and offsetHeight and would
  // otherwise size the stage from the fallback's flow layout.
  assert.ok(retired < fit, "the stage is measured while the fallback layout is still applying");
});

// ---------------------------------------------------------------------------
// The geometry, pinned to the recovered engine's own numbers
// ---------------------------------------------------------------------------

test("the deck is the approved cubic Bezier arch, not a line", () => {
  // Straight from `deckPath` in ponte-bridge.js. A straight rule was the
  // owner-rejected interpretation, so this pins the curve itself: a cubic with
  // both control points well above the baseline.
  const d = deckPath(1000);
  assert.equal(d, "M1.5,90.5 C260.0,-28.2 740.0,-28.2 998.5,90.5");
  assert.ok(d.includes("C"), "the deck has no curve command at all");
});

test("stations sit at the engine's own fractions, which are not evenly spaced", () => {
  assert.deepEqual(stationFractions(1), [0.5]);
  assert.deepEqual(stationFractions(2), [0.3, 0.7]);
  assert.deepEqual(stationFractions(3), [0.26, 0.5, 0.74]);
  assert.deepEqual(stationFractions(4), [0.16, 0.39, 0.62, 0.85]);

  // The outer stations are pulled inwards so their blocks clear the abutments.
  // Even spacing would put the first at 0 and the last at 1, with half of each
  // block hanging off the end of the deck.
  const three = stationFractions(3);
  assert.notEqual(three[0], 0, "the first station sits at the very end of the deck");
  assert.notEqual(three[2], 1, "the last station sits at the very end of the deck");
});

test("station blocks are sized from the measured gap, never from a constant", () => {
  assert.equal(blockWidth([{ x: 0 }, { x: 300 }]), 176, "a wide gap is capped at the maximum");
  assert.equal(blockWidth([{ x: 0 }, { x: 150 }]), 138, "a 150px gap should give 138");
  assert.equal(blockWidth([{ x: 0 }, { x: 50 }]), 88, "a narrow gap is floored at 88");
  assert.equal(blockWidth([{ x: 0 }]), 176, "a single station has no gap and takes the maximum");
});

test("the elevation curve bows, and returns to its edge at both ends", () => {
  // The mobile route must be one continuous bowed path, not a straight rule
  // with detached items beside it.
  assert.equal(elevationX(0, 800), 6, "the curve should start at X0");
  assert.equal(elevationX(800, 800), 6, "the curve should return to X0");
  assert.equal(elevationX(400, 800), 17, "the curve should bow to X0 + BOW at mid-height");
  assert.ok(elevationX(400, 800) > elevationX(100, 800), "the curve does not bow outwards");
});

test("the runner's path is the deck's own curve, sampled", () => {
  // Not a straight line between two endpoints: `subPath` walks the real path,
  // so the gold signal follows the arch rather than an overlay across it.
  const at = (t: number) => ({ x: t * 100, y: 50 - 40 * Math.sin(Math.PI * t) });
  const d = subPath(at, 0, 1);
  const points = d.split(/[ML]/).filter(Boolean);
  assert.ok(points.length > 50, `expected a sampled path, got ${points.length} points`);
  const ys = points.map((p) => Number(p.split(",")[1]));
  assert.ok(new Set(ys).size > 5, "every sampled point has the same y: the path is straight");
});

if (process.exitCode) console.error(`\n${passed} passed, some failed.`);
else console.log(`ok   ${passed} landing bridge tests passed`);
