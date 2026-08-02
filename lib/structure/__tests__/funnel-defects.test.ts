// The P0 funnel defects reported by the design director on 2 August 2026.
//
// Run: npx tsx lib/structure/__tests__/funnel-defects.test.ts
//
// One file for the whole set, because they are one walk: home -> Deal Rooms ->
// the composer, which is the only path on the site that reaches a paid moment.
// Each block below names the reported symptom and pins the property that makes
// it impossible rather than the code that happens to fix it today.

import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";

import { composerExit, DEFAULT_COMPOSER_EXIT, COMPOSER_ENTRANCE_KEYS } from "../exit";
import { sourcingProduct, emptyDraft, type StructureDraft } from "../draft";

let passed = 0;
function test(name: string, fn: () => void): void {
  try {
    fn();
    passed++;
  } catch (err) {
    console.error(`FAIL  ${name}\n      ${(err as Error).message}`);
    process.exitCode = 1;
  }
}

const COMPOSER = readFileSync("components/structure/StructureComposer.tsx", "utf8");
const ENTRANCE = readFileSync("components/deal-room/OpenYourFirstRoom.tsx", "utf8");
const BRIDGE = readFileSync("components/ponte/bridge/BridgeRoute.tsx", "utf8");
const DESK_CSS = readFileSync("components/desk/desk.css", "utf8");
const GATES = readFileSync("components/desk/SignalGates.tsx", "utf8");

// ---------------------------------------------------------------------------
// P0-1 — the primary CTA did not respond to the first click
//
// It did respond. It just said nothing while it did, for 2,638 ms measured on
// a warm dev server, because `/structure` is force-dynamic and the App Router
// holds the previous page until the new one is ready. A control that is silent
// for that long has been pressed twice by then.
// ---------------------------------------------------------------------------

test("the composer route has a loading state", () => {
  assert.ok(
    existsSync("app/[locale]/structure/loading.tsx"),
    "there is no loading.tsx, so a navigation to the composer shows the previous page unchanged",
  );
});

test("the composer route has its own error state", () => {
  // The locale boundary already caught this, so the route was never silent.
  // But its only exits are retry and home, and home from a half-built record
  // is the exit the owner called absurd on 1 August 2026.
  assert.ok(existsSync("app/[locale]/structure/error.tsx"), "the composer route has no error boundary");
  const error = readFileSync("app/[locale]/structure/error.tsx", "utf8");
  assert.match(error, /reset/, "the error state offers no retry");
  assert.match(error, /opportunities/, "the error state does not offer the records the member already has");
});

test("the entrance CTA reports that it was pressed", () => {
  assert.match(ENTRANCE, /RouteLink/, "the entrance CTA is a plain Link again, so a slow route is silent");
  const link = readFileSync("components/ponte/nav/RouteLink.tsx", "utf8");
  // `useTransition` and not a hand-held boolean: the state has to clear itself
  // when a navigation fails, or the control is stuck saying "Opening" forever.
  assert.match(link, /useTransition/, "pending is not driven by the router's own transition");
  assert.match(link, /data-pending/, "there is no attribute for the stylesheet to draw");
  // A modifier click still belongs to the browser.
  assert.match(link, /metaKey/, "a command-click is being swallowed");
  assert.match(link, /defaultPrevented/, "a guard above this link can no longer stop it");
});

test("a navigate bridge station reports that it was pressed", () => {
  // The three stations on the Deal Room entrance point at the same slow route.
  assert.match(BRIDGE, /useTransition/, "a navigate station has no pending state");
  assert.match(BRIDGE, /routingKey/, "one transition is drawn on every station rather than the pressed one");
});

test("the pressed state lives beside the class it decorates", () => {
  // Not in a stylesheet of its own. A state rule that can go missing separately
  // from the class it decorates is the exact shape of the P0-6 defect below.
  assert.match(DESK_CSS, /\.ponte-desk \.b:active/, ".b has no pressed state");
  const integration = readFileSync("components/ponte/bridge/bridge-integration.css", "utf8");
  assert.match(integration, /a\.brst:active/, "a navigate station has no pressed state");
});

test("pending is drawn in the interaction family, never in gold", () => {
  // Constitution section 6a: gold is movement across a Bridge and arrival at
  // the completed state. A navigation that has been asked for and not answered
  // is neither, and gold would say a crossing had begun that has not.
  const pendingRule = DESK_CSS.slice(
    DESK_CSS.indexOf('.ponte-desk .b[data-pending="true"]::after'),
    DESK_CSS.indexOf("@keyframes dk-pending"),
  );
  assert.ok(pendingRule.length > 0, "the pending rule is gone");
  assert.ok(!/--gold/.test(pendingRule), "the pending hairline is drawn in gold");
  assert.match(pendingRule, /--pf-interact/, "the pending hairline is not in the interaction family");
});

// ---------------------------------------------------------------------------
// P0-2 — the composer had no way out on its first step
// ---------------------------------------------------------------------------

test("step one carries a labelled Back as well as the wordmark", () => {
  assert.match(COMPOSER, /JourneyBack onClick=\{\(\) => guard\(\(\) => router\.push\(exit\.href\)\)\}/,
    "step one has no Back control");
  assert.match(COMPOSER, /label=\{exit\.label\}/, "the Back control does not name where it goes");
});

test("Back on step one is guarded exactly as the wordmark is", () => {
  // Both go through `guard`, so a member with a part-built record is asked
  // before they leave rather than dropped on the entrance with an empty hand.
  const bar = COMPOSER.slice(COMPOSER.indexOf("<JourneyBack onClick"), COMPOSER.indexOf("sbar__step"));
  assert.equal(
    (bar.match(/guard\(/g) ?? []).length,
    2,
    "one of the two exits on step one leaves without asking",
  );
});

test("the exit destination cannot be set from the URL", () => {
  // `?from=` is attacker-controlled. A "starts with /" test would accept
  // `//evil.example`, which a browser resolves as a host.
  for (const hostile of [
    "//evil.example",
    "/\\evil.example",
    "https://evil.example",
    "javascript:alert(1)",
    "../../etc/passwd",
    "constructor",
    "__proto__",
    "toString",
  ]) {
    assert.deepEqual(
      composerExit(hostile),
      DEFAULT_COMPOSER_EXIT,
      `'${hostile}' resolved to something other than the default exit`,
    );
  }
});

test("every allowlisted exit is an internal path with a label that names it", () => {
  for (const key of COMPOSER_ENTRANCE_KEYS) {
    const exit = composerExit(key);
    assert.ok(exit.href.startsWith("/"), `${key} does not resolve to a path`);
    assert.ok(!exit.href.startsWith("//"), `${key} resolves to a protocol-relative URL`);
    assert.ok(exit.label.length > 4, `${key} has a bare label rather than a named destination`);
  }
});

test("an absent or repeated parameter is not an error", () => {
  assert.deepEqual(composerExit(undefined), DEFAULT_COMPOSER_EXIT);
  assert.deepEqual(composerExit([]), DEFAULT_COMPOSER_EXIT);
  assert.deepEqual(composerExit(["deal-rooms", "home"]), composerExit("deal-rooms"));
});

test("the Deal Room entrance states where it came from", () => {
  // Three links into the composer: two bridge stations and the CTA.
  assert.equal(
    (ENTRANCE.match(/from=deal-rooms/g) ?? []).length,
    3,
    "not every route from the Deal Room entrance into the composer carries its origin",
  );
});

// ---------------------------------------------------------------------------
// P0-5 — choosing an intent gave no feedback
//
// The selected row did take a treatment. What it did NOT do was change the
// heading, which went on saying "Tell Ponte what you supply" to somebody who
// had just pressed "Source a product" - and a screen that contradicts a choice
// reads as a choice that did not register.
// ---------------------------------------------------------------------------

const draftWith = (patch: Partial<StructureDraft>): StructureDraft => ({ ...emptyDraft(), ...patch });

test("the intake reads the intent from whichever picker set it", () => {
  // The legacy three-row picker sets `intent` and never `canonical`.
  assert.equal(sourcingProduct(draftWith({ intent: "requirement" })), true, "'Source a product' reads as supply");
  assert.equal(sourcingProduct(draftWith({ intent: "offer" })), false);
  // A family entrance sets `canonical`, and it wins: it is the richer statement
  // and the one a resumed record carries.
  assert.equal(
    sourcingProduct(draftWith({ canonical: { family: "products", intent: "source_product" }, intent: "offer" })),
    true,
    "the canonical pair lost to the legacy field",
  );
  assert.equal(
    sourcingProduct(draftWith({ canonical: { family: "products", intent: "offer_product" }, intent: "requirement" })),
    false,
  );
});

test("nothing is chosen on arrival, and the intake does not answer for the member", () => {
  const fresh = emptyDraft();
  assert.equal(fresh.intent, null, "an intent is pre-selected on arrival");
  assert.equal(fresh.canonical, null, "a family is pre-selected on arrival");
  // The intake may only own the heading once something has been stated.
  assert.match(
    COMPOSER,
    /const stated = draft\.canonical !== null \|\| draft\.intent !== null;/,
    "the intake still takes the heading before the member has chosen anything",
  );
  assert.match(COMPOSER, /intakeOwnsHeading = classify && !draft\.product && stated/);
});

test("the chosen row says so in a word, not only in a rule and a colour", () => {
  assert.match(COMPOSER, /tapopt__on/, "the chosen row carries no word");
  const css = readFileSync("components/structure/structure.css", "utf8");
  assert.match(css, /\.ponte-find \.tapopt__on/, "the word has no rule");
  assert.match(css, /\.ponte-find \.tapopt:active/, "the rows have no pressed state");
});

// ---------------------------------------------------------------------------
// P0-8 — three search inputs on one page
// ---------------------------------------------------------------------------

test("the Market Signals entrance no longer carries its own search fields", () => {
  assert.ok(!/SideSearch/.test(GATES), "the two side searches are back");
  assert.ok(!/sgate__i/.test(GATES), "the entrance still renders a search input");
  // The side is still one click, from the crossing's own stations.
  assert.match(GATES, /SignalCrossing/, "the two sides are no longer reachable from the entrance");
});

test("the one remaining search carries the side across a submission", () => {
  // Which is what the removed forms were approximating: they set `intent` and
  // dropped every other filter the member had already applied.
  const search = readFileSync("components/desk/SignalSearch.tsx", "utf8");
  assert.match(search, /add\("intent", q\.intent\)/, "searching now drops the chosen side");
});

// ---------------------------------------------------------------------------
// P0-9 and P0-10 — the marquee edge, and the example room as a card
// ---------------------------------------------------------------------------

test("the marquee dissolves at both edges rather than cutting items", () => {
  const window = DESK_CSS.slice(DESK_CSS.indexOf(".ponte-desk .strip__w {"));
  assert.match(window, /mask-image/, "the marquee still guillotines the item crossing its edge");
  assert.match(window, /-webkit-mask-image/, "Safari still needs the prefix and is not given it");
  // Under reduced motion the strip is a list the reader scrolls, and fading the
  // edge would hide the item they just scrolled to.
  const reduced = DESK_CSS.slice(DESK_CSS.indexOf("@media (prefers-reduced-motion: reduce)"));
  assert.match(reduced, /mask-image: none/, "the mask survives into the reduced-motion presentation");
});

test("the example room is separated by hairlines, not drawn as a card", () => {
  const room = DESK_CSS.slice(
    DESK_CSS.indexOf(".ponte-desk .drp__room {"),
    DESK_CSS.indexOf(".ponte-desk .drp__ex"),
  );
  assert.ok(room.length > 0, "the example room rule is gone");
  assert.ok(!/border-radius/.test(room), "the example room still has a corner radius");
  assert.ok(!/^\s*border:/m.test(room), "the example room still has an all-round border");
  assert.match(room, /border-top: 1px solid/, "there is no hairline above the room");
  assert.match(room, /border-bottom: 1px solid/, "there is no hairline below the room");
  // The bleed is what makes those rules full width rather than a card with
  // three sides missing, and it must cancel the section's own gutter exactly.
  assert.match(room, /margin-inline: calc\(var\(--dk-gut\) \* -1\)/, "the hairlines do not reach the full measure");
  assert.match(room, /padding: 26px var\(--dk-gut\) 24px/, "the bleed and the padding do not cancel");
});

console.log(`ok   funnel defects: ${passed} assertions passed`);
