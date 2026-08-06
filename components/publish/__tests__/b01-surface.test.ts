// B01's surface obeys the constitution and carries none of the thirteen.
//
// Run: npx tsx components/publish/__tests__/b01-surface.test.ts
//
// Structural assertions on the source, for the same reason as the route-manifest
// and action-gate tests: these components import CSS, so they cannot be mounted
// under tsx, and a test that needs a browser is a test that runs once.
//
// The thirteen are in the brief because every one of them is LIVE in production
// right now on the screens this replaces. A build that reproduced any of them
// would have replaced a screen with the same screen.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

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

const CSS = readFileSync("components/publish/publish.css", "utf8");
const B01 = readFileSync("components/publish/ChooseDealIntent.tsx", "utf8");
const ENTRY = readFileSync("components/publish/PublishFlow.tsx", "utf8");
const PAGE = readFileSync("app/[locale]/publish/page.tsx", "utf8");
const ALL = [CSS, B01, ENTRY, PAGE].join("\n");

/** CSS with comments removed, so a comment explaining a ban is not a ban. */
const CSS_CODE = CSS.replace(/\/\*[\s\S]*?\*\//g, "");
/** TSX with comments removed, for the same reason. */
const TSX_CODE = [B01, ENTRY, PAGE]
  .join("\n")
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/^\s*\/\/[^\n]*$/gm, "");

/* ------------------------------------------------------------------ *
 * NO BOXES. The absolute rule, from ADR-0002 and the reference's own header.
 * ------------------------------------------------------------------ */

test("nothing is rounded", () => {
  // Item 2 of the thirteen. `border-radius: 0` on the action is allowed and is
  // the point - it states the intent rather than relying on a default.
  const radii = Array.from(CSS_CODE.matchAll(/border-radius:\s*([^;]+);/g)).map((m) => m[1].trim());
  const nonZero = radii.filter((r) => r !== "0" && r !== "0px");
  assert.deepEqual(nonZero, [], `rounded corners found: ${nonZero.join(", ")}`);
});

test("nothing casts a shadow", () => {
  assert.ok(!/box-shadow/.test(CSS_CODE), "a box-shadow is a box with the edges blurred");
});

test("structure comes from hairlines and tone, never from a border on four sides", () => {
  /*
    A `border:` shorthand on four sides IS a box, whatever it is called. Every
    rule of this surface separates with a SINGLE edge - block-start, block-end -
    or with a tone shift.

    ONE exemption, and it is narrow on purpose: `.mk`, the state mark. It is an
    18px indicator, the shape equivalent of a checkbox, and shape is how it
    carries state so that colour is never doing it alone (ADR-0002). It is not
    structure and it holds nothing.

    The exemption is granted by SELECTOR and then immediately fenced by the next
    assertion, which pins the mark to a fixed size. A mark that could grow could
    become a container, and then this would be an exemption for boxes.
  */
  const offenders: string[] = [];
  for (const rule of CSS_CODE.split("}")) {
    const [selector, body] = rule.split("{");
    if (!body) continue;
    if (/\.mk/.test(selector)) continue;
    for (const m of Array.from(body.matchAll(/(^|[^-\w])border:\s*([^;]+);/g))) {
      if (m[2].trim() !== "0") offenders.push(`${selector.trim()} -> ${m[2].trim()}`);
    }
  }
  assert.deepEqual(offenders, [], `four-sided borders found:\n  ${offenders.join("\n  ")}`);
});

test("the state mark cannot become a container", () => {
  // The fence on the exemption above. Fixed on both axes, so nothing can be
  // laid out inside it and it can never grow into structure.
  const mark = CSS_CODE.match(/\.pb \.mk\s*\{([^}]*)\}/)?.[1] ?? "";
  assert.match(mark, /inline-size:\s*18px/, "the mark has no fixed inline size");
  assert.match(mark, /block-size:\s*18px/, "the mark has no fixed block size");
});

/* ------------------------------------------------------------------ *
 * Typography, items 1 and 12 of the thirteen
 * ------------------------------------------------------------------ */

test("the frame DEFINES the type faces, rather than hoping to inherit them", () => {
  /*
    The assertion below this one - that the statement references `--f-serif` -
    passed while the page rendered in Inter, because the alias is defined on
    `.ponte-desk` and this route is not inside it. An undefined variable in
    `font-family` falls back silently to the next entry, so item 1 of the
    thirteen came back on the surface built to remove it, and only rendering the
    page caught it.

    Referencing a token is not the same as having one.
  */
  const frame = CSS_CODE.match(/^\.pb \{([\s\S]*?)\}/m)?.[1] ?? "";
  for (const token of ["--f-serif", "--f-sans", "--f-mono"]) {
    assert.ok(
      new RegExp(`${token}:`).test(frame),
      `.pb does not define ${token}, so it will fall back to whatever is inherited`,
    );
  }
});

test("the statement is serif, and body copy is not monospace", () => {
  // Item 1: sans-serif headline where the constitution requires serif.
  assert.match(CSS_CODE, /\.pb \.stmt\s*\{[^}]*--f-serif/, "the statement is not set in the serif");
  // Item 12: body copy set in monospace. Mono is for labels and identifiers
  // only, and `--t5` is its floor.
  assert.match(CSS_CODE, /\.pb \.prose\s*\{[^}]*var\(--t4\)/, "prose is not set at the prose step");
  assert.ok(!/\.pb \.prose\s*\{[^}]*--f-mono/.test(CSS_CODE), "prose is set in monospace");
});

/* ------------------------------------------------------------------ *
 * The vocabulary the thirteen bans
 * ------------------------------------------------------------------ */

test("none of the retired words appears on this surface", () => {
  const banned: [RegExp, string][] = [
    [/\bworkspace\b/i, 'item 6: "workspace" means a sub-room inside a room'],
    [/in five languages/i, "item 7: an unverified claim"],
    [/three ways in/i, "item 9"],
    [/Ponte does the classification/i, "item 9"],
    [/Choose a route above/i, "item 10"],
    [/customs code is needed/i, "item 10"],
    [/Nothing started yet/i, "item 13: self-contradictory"],
  ];
  for (const [pattern, why] of banned) {
    const hit = ALL.match(pattern);
    assert.equal(hit, null, `${why} - found ${JSON.stringify(hit?.[0])}`);
  }
});

test('"publish" is never used for the paid room action', () => {
  /*
    Item 4, and `P1-2`. The route is called /publish because publishing an
    opportunity is FREE and PUBLIC, which is exactly what the word means. What
    must never appear is publish attached to the Deal Room.
  */
  assert.ok(!/publish[^.]{0,40}deal room/i.test(ALL), '"publish" is attached to the Deal Room');
  assert.ok(!/deal room[^.]{0,40}publish/i.test(ALL), '"publish" is attached to the Deal Room');
});

test("no free-first-room text, per ADR-0030", () => {
  /*
    The brief of 2 August said this path may state "first activation free while
    it has one active branch". ADR-0030 of 6 August withdraws that: no surface
    may state, imply or hint at a free first Deal Room until the waiver is
    enabled, because the waiver is LEI-only in practice and would be a promise
    the system refuses.

    Publishing IS free and saying so is correct. A free ROOM is not.
  */
  assert.ok(!/free[^.]{0,30}(deal room|activation|first room)/i.test(ALL), "a free room is implied");
  assert.ok(!/first activation free/i.test(ALL), "the withdrawn waiver line is present");
});

test("no price is typed into the surface", () => {
  // Item 5. Where a price appears on this path at all it is read from
  // lib/deal-room/pricing.ts. B01 states no price, so no numeral should exist.
  assert.ok(!/\$\s*\d/.test(TSX_CODE), "a price literal is typed into the surface");
  assert.ok(!/\b79\b|\b199\b/.test(TSX_CODE), "a price numeral is typed into the surface");
});

/* ------------------------------------------------------------------ *
 * The six choices, and the axes that must not collapse
 * ------------------------------------------------------------------ */

test("the six choices come from the pinned mapping, not from a local list", () => {
  // Item 8: three opportunity types instead of six. The surface must not carry
  // its own list, or the mapping test stops protecting it.
  assert.match(B01, /PRESENTED_CHOICES/, "the surface does not read the pinned choice list");
  assert.match(B01, /resolveIntent/, "the surface does not use the pinned resolver");
  assert.match(B01, /POSITION_OPTIONS/, "the surface does not read the pinned position options");
});

test("the surface never writes a market_family literal of its own", () => {
  // Every family it renders comes from the mapping. A literal here could
  // reintroduce `goods`, which is outside the CHECK on listings and deal_rooms.
  for (const banned of ['"goods"', '"trade_services"', "'goods'"]) {
    assert.ok(!TSX_CODE.includes(banned), `a banned family literal is present: ${banned}`);
  }
});

test("the position question is asked by the resolver, not by a family test", () => {
  /*
    If the surface decided for itself with `family === "distribution"`, it would
    ask on the OFFER side too, where the answer is already known - and collect
    an answer nothing reads.
  */
  assert.ok(
    !/family\s*===\s*["']distribution["']/.test(TSX_CODE),
    "the surface decides the position question itself instead of asking the resolver",
  );
});

/* ------------------------------------------------------------------ *
 * State coverage and the rules
 * ------------------------------------------------------------------ */

test("every tap has somewhere to be acknowledged inside 100ms", () => {
  // P0-1 measured 2,638ms of silence on the old funnel CTA. A transition is
  // where the acknowledgement lives when the next surface is not instant.
  assert.match(B01, /useTransition/, "there is no pending state, so a slow route is silent");
  assert.match(B01, /pending/, "the pending state is never rendered");
});

test("the pending state is not gold", () => {
  // ADR-0015 and the Constitution: gold means arrival at a completed state.
  // A thing still happening is interaction, not arrival.
  assert.match(CSS_CODE, /\.pb \.pending\s*\{[^}]*--pf-interact/, "pending does not use the interaction token");
  assert.ok(!/\.pb \.pending\s*\{[^}]*gold/i.test(CSS_CODE), "pending is gold");
});

test("back never loses work", () => {
  // Going back from position clears the position and nothing else; going back
  // from family clears the family and keeps the direction.
  assert.match(B01, /function back\(\)/, "there is no back handler");
  assert.match(B01, /setPosition\(null\)[\s\S]{0,120}setPhase\("family"\)/, "back from position does not return to family");
});

test("choice rows meet the 64px minimum and actions the 48px one", () => {
  assert.match(CSS_CODE, /\.pb \.row\s*\{[^}]*min-height:\s*64px/, "choice rows are below 64px");
  assert.match(CSS_CODE, /\.pb__back\s*\{[^}]*min-height:\s*48px/, "the back control is below 48px");
});

test("the journey rule carries no numeral", () => {
  // One segmented rule, no percentage, no "2/5" inside it. A step is whole or
  // it is not. The numeral lives in the nav, which is a different thing.
  const prog = CSS_CODE.match(/\.pb__prog[\s\S]*?\}/)?.[0] ?? "";
  assert.ok(!/content:/.test(prog), "the progress rule renders text");
});

test("both themes are carried, and reduced motion is honoured", () => {
  assert.match(CSS_CODE, /data-theme="dark"/, "there is no dark theme");
  assert.match(CSS_CODE, /prefers-color-scheme:\s*dark/, "the system theme is ignored");
  assert.match(CSS_CODE, /prefers-reduced-motion/, "animation is not disabled for reduced motion");
});

test("the frame is fluid, not pinned to the reference's 390px", () => {
  /*
    The reference frames at exactly 390px because it is a spec sheet. A real
    member has a 360px phone, and the brief requires 360px and desktop. A fixed
    width would overflow the first and strand the second.
  */
  assert.ok(!/\.pb\s*\{[^}]*width:\s*390px/.test(CSS_CODE), "the frame is pinned to 390px");
  assert.match(CSS_CODE, /\.pb\s*\{[^}]*max-width/, "the frame has no maximum width");
});

/* ------------------------------------------------------------------ *
 * Retention copy, verbatim
 * ------------------------------------------------------------------ */

test("the seven-day retention sentence is exact", () => {
  // Verbatim from the brief. It is a promise about where a member's work lives
  // and for how long, so it is quoted and not paraphrased.
  assert.ok(
    B01.includes(
      "Saved only in this browser for up to 7 days. Sign in to keep it longer and continue on another device.",
    ),
    "the anonymous retention sentence is not verbatim",
  );
});

test("signed in and signed out differ, and only in the promise", () => {
  assert.match(B01, /SAVED_SIGNED_IN/, "there is no signed-in retention sentence");
  assert.match(B01, /signedIn \? SAVED_SIGNED_IN : SAVED_ANONYMOUS/, "the two are not selected by session");
});

test("the page degrades rather than throwing when Supabase is unconfigured", () => {
  // Three routes answered 500 instead of degrading on 2 August. An unknown
  // session falls back to the anonymous promise, which is the truthful one when
  // nothing is known.
  assert.match(PAGE, /getUser\(\)\.catch\(\(\) => null\)/, "an unconfigured Supabase throws on this route");
});

console.log(`ok   B01 surface: ${passed} assertions passed`);
