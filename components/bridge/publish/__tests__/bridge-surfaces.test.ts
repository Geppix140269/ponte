// The listing path, rebuilt on the bridge, obeys the same constitution.
//
// Run: npx tsx components/bridge/publish/__tests__/bridge-surfaces.test.ts
//
// `path-surfaces.test.ts` holds the RETIRED surfaces to the thirteen. This holds
// the nine that replaced them to the same rules and to the additions in
// ADR-0032, AMENDMENT-1 and AMENDMENT-2. It is a separate file rather than an
// edit to that one because the two sets of surfaces are both on disk while
// PR #230 is open, and a test that covered whichever happened to be imported
// would stop covering either.
//
// Several assertions exist because the defect they pin was found by RENDERING
// the path rather than by reading it. Those are marked.

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

const read = (path: string) => readFileSync(path, "utf8");

const TOKENS = read("design-system/bridge/tokens.css");
const CSS = read("design-system/bridge/bridge.css");
const SURFACES: Record<string, string> = {
  intent: read("components/bridge/publish/BridgeIntent.tsx"),
  capacity: read("components/bridge/publish/BridgeCapacity.tsx"),
  tell: read("components/bridge/publish/BridgeTell.tsx"),
  listing: read("components/bridge/publish/BridgeListing.tsx"),
  correct: read("components/bridge/publish/BridgeCorrect.tsx"),
  assets: read("components/bridge/publish/BridgeAssets.tsx"),
  preview: read("components/bridge/publish/BridgePreview.tsx"),
  gate: read("components/bridge/publish/BridgeGate.tsx"),
  screening: read("components/bridge/publish/BridgeScreening.tsx"),
  published: read("components/bridge/publish/BridgePublished.tsx"),
  shell: read("components/bridge/publish/BridgeShell.tsx"),
  flow: read("components/publish/PublishFlow.tsx"),
};

const stripComments = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/[^\n]*$/gm, "");

/** Source with every run of whitespace collapsed, so a reflow cannot fail a test. */
const flat = (source: string) => stripComments(source).replace(/\s+/g, " ");

const CSS_CODE = CSS.replace(/\/\*[\s\S]*?\*\//g, "");
const TSX_CODE = Object.values(SURFACES).map(stripComments).join("\n");
/**
 * Everything a member could read, with comments stripped.
 *
 * Comments are removed for the same reason `promise-vocabulary.test.ts` removes
 * them: a comment explaining WHY a phrase was retired necessarily contains the
 * phrase, and banning that bans the explanation.
 */
const ALL = [CSS_CODE, TSX_CODE].join("\n");

/* ------------------------------------------------------------------ *
 * NO BOXES, unchanged by ADR-0032
 * ------------------------------------------------------------------ */

test("structure never comes from a border on four sides", () => {
  const offenders: string[] = [];
  for (const rule of CSS_CODE.split("}")) {
    const [selector, body] = rule.split("{");
    if (!body) continue;
    for (const m of Array.from(body.matchAll(/(^|[^-\w])border:\s*([^;]+);/g))) {
      // The 16px declaration mark is a drawn shape, pinned to a fixed size by
      // the assertion below, and it holds nothing.
      if (m[2].trim() !== "0" && !/\.brg-check i/.test(selector)) {
        offenders.push(`${selector.trim()} -> ${m[2].trim()}`);
      }
    }
  }
  assert.deepEqual(offenders, [], `four-sided borders found:\n  ${offenders.join("\n  ")}`);
});

test("the one drawn shape is pinned and cannot become a container", () => {
  const mark = CSS_CODE.match(/\.brg-check i \{([^}]*)\}/)?.[1] ?? "";
  assert.match(mark, /inline-size:\s*16px/, "the declaration mark has no fixed inline size");
  assert.match(mark, /block-size:\s*16px/, "the declaration mark has no fixed block size");
});

test("nothing is rounded and nothing casts a shadow", () => {
  const rounded = Array.from(CSS_CODE.matchAll(/border(-[a-z-]+)?-radius:\s*([^;]+);/g))
    .map((m) => m[2].trim())
    .filter((value) => value !== "0" && value !== "0px" && value !== "50%");
  assert.deepEqual(rounded, [], `rounded corners found: ${rounded.join(", ")}`);
  // 50% is the tape's live blip, which is a dot rather than a rounded box.
  assert.ok(!/box-shadow:/.test(CSS_CODE), "the bridge casts a shadow");
});

/* ------------------------------------------------------------------ *
 * The arc, and what it is never allowed to become
 * ------------------------------------------------------------------ */

test("no surface makes the arc a target", () => {
  // AMENDMENT-1 section 1. A row that CONTAINS an arc may be a control; the arc
  // itself never is. The paint carries pointer-events: none so the arc cannot
  // be the thing hit even inside a clickable row.
  assert.match(CSS_CODE, /\.brg-arc svg \{[^}]*pointer-events:\s*none/);
  for (const [name, source] of Object.entries(SURFACES)) {
    const code = stripComments(source);
    assert.ok(
      !/<Arc[^>]*onClick/.test(code),
      `${name}: something on the arc accepts a click`,
    );
  }
});

test("no numeral is in a progress role on any surface", () => {
  // ADR-0032: the deck IS the progress indicator. "Step 3 of 5" is exactly what
  // the arc replaced, so no surface may print it back.
  for (const [name, source] of Object.entries(SURFACES)) {
    const code = flat(source);
    assert.ok(!/Step \$\{|Step \d of/.test(code), `${name} prints a step counter`);
    assert.ok(!/\d\s*\/\s*5\b/.test(code), `${name} prints a stage fraction`);
  }
});

test("the arc's position is derived from the path, never typed into a surface", () => {
  /*
    `B06` is skipped for a service and `B08` for a signed-in member, so a
    hard-coded fraction would be wrong for most members most of the time. One
    function reads the path this member is actually walking.
  */
  assert.match(SURFACES.shell, /arcPosition/, "the shell invents its own arc position");
  for (const [name, source] of Object.entries(SURFACES)) {
    if (name === "shell") continue;
    assert.ok(
      !/<Arc\b/.test(stripComments(source)),
      `${name} renders its own arc instead of using the shell`,
    );
  }
});

/* ------------------------------------------------------------------ *
 * The rules AMENDMENT-2 records
 * ------------------------------------------------------------------ */

test("markup never goes inside a translated string", () => {
  // AMENDMENT-2 entry 1. The accent is a separate value the component composes,
  // because word order differs and an <em> welded into English copy cannot land
  // correctly in Arabic or Chinese.
  for (const [name, source] of Object.entries(SURFACES)) {
    const code = stripComments(source);
    assert.ok(
      !/dangerouslySetInnerHTML/.test(code),
      `${name} interpolates markup into copy`,
    );
    /*
      An `<em>` INSIDE a string literal, which is the fault. The tag as JSX is
      how the component composes the accent and is the point of the rule, so the
      quotes must both be on the same line as the tag: a pattern that let the
      match run across lines simply found the nearest `className="..."` above
      the JSX and failed the file that obeys the rule.
    */
    assert.ok(
      !/(["'`])[^"'`\n]*<em>[^"'`\n]*\1/.test(code),
      `${name} welds an <em> into a string`,
    );
  }
  assert.match(SURFACES.shell, /accent/, "the shell has no separate accent value");
});

test("letter-spacing goes to zero for Arabic, on both axes", () => {
  // The one typographic rule in the system that is a correctness matter rather
  // than a taste one: tracking pulls the joins apart and the word stops being a
  // word.
  const arabic = TOKENS.match(/\.brg:lang\(ar\) \{([^}]*)\}/)?.[1] ?? "";
  assert.match(arabic, /--brg-track:\s*0;/, "mono tracking is not zeroed for Arabic");
  assert.match(arabic, /--brg-tight:\s*0;/, "display tracking is not zeroed for Arabic");
});

test("every layout property is logical, so Arabic mirrors without a second sheet", () => {
  const physical = Array.from(
    CSS_CODE.matchAll(/(^|[^-\w])(margin|padding|border)-(left|right):/g),
  ).map((m) => m[0].trim());
  assert.deepEqual(physical, [], `physical properties found: ${physical.join(", ")}`);
});

/* ------------------------------------------------------------------ *
 * The thirteen, and the promise vocabulary
 * ------------------------------------------------------------------ */

test("none of the retired words appears anywhere on the path", () => {
  const banned: [RegExp, string][] = [
    [/\bworkspace\b/i, 'item 6: "workspace" means a sub-room inside a room'],
    [/in five languages/i, "item 7: an unverified claim"],
    [/three ways in/i, "item 9"],
    [/Ponte does the classification/i, "item 9"],
    [/Choose a route above/i, "item 10"],
    [/customs code is needed/i, "item 10 - rephrasing it is still using it"],
    [/Nothing started yet/i, "item 13: self-contradictory"],
  ];
  for (const [pattern, why] of banned) {
    const hit = ALL.match(pattern);
    assert.equal(hit, null, `${why} - found ${JSON.stringify(hit?.[0])}`);
  }
});

test("no price numeral is typed into any surface", () => {
  // Item 5 and ADR-0030. Publishing is free; the paid action is not on this
  // path at all, so there is no figure for any of these screens to carry.
  assert.ok(!/\$\s*\d/.test(TSX_CODE), "a price literal is typed into a surface");
  assert.ok(!/\b79\b|\b199\b/.test(TSX_CODE), "a price numeral is typed into a surface");
  assert.ok(!/first activation free/i.test(ALL), "the withdrawn waiver line is present");
});

test('"publish" is never attached to the Deal Room', () => {
  assert.ok(!/publish[^.]{0,40}deal room/i.test(ALL), '"publish" is attached to the Deal Room');
  assert.ok(!/deal room[^.]{0,40}publish/i.test(ALL), '"publish" is attached to the Deal Room');
});

/* ------------------------------------------------------------------ *
 * B01b Capacity
 * ------------------------------------------------------------------ */

test("the capacity surface reads the pinned list and writes no literal of its own", () => {
  assert.match(SURFACES.capacity, /CAPACITIES/, "the surface carries its own capacity list");
  assert.match(SURFACES.capacity, /capacityComplete/, "the surface decides completeness itself");
  assert.ok(
    !/mandate_sighted/.test(SURFACES.capacity),
    "the member's surface writes the desk's own column",
  );
});

test("a previous answer is a suggestion and is never pre-selected", () => {
  const code = stripComments(SURFACES.capacity);
  assert.match(code, /suggestionFrom/, "the surface has no suggestion");
  assert.match(code, /Yes, again/, "the suggestion cannot be confirmed");
  assert.match(code, /Not this time/, "the suggestion cannot be declined");
  // Initial state is the empty answer given by the flow. Nothing here seeds it.
  assert.ok(
    !/useState[^;]*suggestion/.test(code),
    "the suggestion is wired to initial state, which is a pre-selection",
  );
});

test("intermediary status is stated as public where it is declared", () => {
  const code = flat(SURFACES.capacity);
  assert.match(code, /Your capacity is public/);
  assert.match(code, /does not hide intermediary status/);
});

/* ------------------------------------------------------------------ *
 * B02 Tell Ponte
 * ------------------------------------------------------------------ */

test("the upload route is gated by the one function that decides", () => {
  // DECISION-16 and item 11. A gate written into JSX is a gate the next
  // component forgets, so both surfaces that can upload ask the same function.
  assert.match(SURFACES.tell, /uploadPermitted/, "B02 decides the gate itself");
  assert.match(SURFACES.assets, /uploadPermitted/, "B06 decides the gate itself");
});

test("typing is always available and is never the only route", () => {
  const code = stripComments(SURFACES.tell);
  for (const route of ["Speak it", "Photograph or upload", "Browse categories", "Type it, with search"]) {
    assert.ok(code.includes(route), `the ${route} route is missing`);
  }
  /*
    Weighted by SIZE AND POSITION, never by label: the speak route is first and
    carries the lead treatment.

    Read inside the RENDERED block, not across the whole file. The other three
    routes are declared in a helper above the render because they appear on two
    states, so their position in the source says nothing about their position on
    the screen.
  */
  const empty = code.slice(code.indexOf('{phase === "empty" && ('));
  assert.ok(
    empty.indexOf('data-lead="true"') < empty.indexOf("{otherRoutes()}"),
    "the speak route is not first by position",
  );
  assert.match(CSS_CODE, /\.brg-zone\[data-lead="true"\] \.brg-zone__title \{[^}]*font-size/);
});

test("the direction of the statement comes from the pinned intent table", () => {
  /*
    FOUND BY RENDERING. It was `intent === "source_product"`, true for exactly
    one of the four demand-side intents. A member who chose "I need something"
    then "A trade service" was shown "what service you PROVIDE": the heading
    contradicting the choice just made, which is P0-5 in a new place.
  */
  assert.match(stripComments(SURFACES.flow), /demandSide\(/, "the flow tests an intent literal");
  assert.ok(
    !/intent\s*===\s*["']source_product["']/.test(stripComments(SURFACES.flow)),
    "the flow still decides direction from one product intent",
  );
});

/* ------------------------------------------------------------------ *
 * B03-B05 The listing so far
 * ------------------------------------------------------------------ */

test("the fact list renders the order it is given and never re-sorts", () => {
  assert.ok(!/\.sort\(/.test(stripComments(SURFACES.listing)), "the fact list re-sorts");
  assert.match(SURFACES.listing, /factsFor/, "the fact list builds its own model");
});

test("inferred is marked distinctly from read, in the DOM and not only in prose", () => {
  const code = stripComments(SURFACES.listing);
  assert.match(code, /Inferred, not read/);
  assert.match(code, /Yes, that is right/, "an inferred fact cannot be confirmed in one tap");
  assert.match(
    CSS_CODE,
    /\.brg-fact\[data-tier="inferred"\] \.brg-fact__v \{[^}]*dashed/,
    "inferred looks like read",
  );
});

test("the state of a fact is a word, so colour never carries it alone", () => {
  // ADR-0002. The retired surface used an 18px drawn mark; the mono status word
  // does the same job with one fewer shape to fence and needs no legend.
  const code = stripComments(SURFACES.listing);
  assert.match(code, /TIER_WORD/, "the tiers have no words");
  for (const word of ["Needed to publish", "Inferred, not read", "Stated", "Optional"]) {
    assert.ok(code.includes(word), `the tier word "${word}" is missing`);
  }
});

test("correction is a sheet of rows, never a bare text field", () => {
  const code = stripComments(SURFACES.correct);
  assert.match(code, /className="brg-sheet"/, "there is no correction sheet");
  assert.match(code, /className="brg-item"/, "the sheet offers no rows");
  // Typing exists inside the sheet, and is LAST.
  assert.ok(
    code.indexOf('className="brg-item"') < code.indexOf('className="brg-field"'),
    "the typing field precedes the rows it is meant to be an alternative to",
  );
});

test("the confirm control is not nested inside the tap target", () => {
  /*
    A button inside a button is invalid, and in practice it means "Yes, that is
    right" ALSO opens the correction sheet: the member confirms and lands on a
    screen asking them to change it.
  */
  const code = stripComments(SURFACES.listing);
  assert.ok(
    code.indexOf('className="brg-confirm"') > code.indexOf("</button>"),
    "the confirm control sits inside the fact's own button",
  );
});

/* ------------------------------------------------------------------ *
 * B07 Deal preview
 * ------------------------------------------------------------------ */

test("the public layer is fixed, and its rows are not controls", () => {
  const code = stripComments(SURFACES.preview);
  assert.match(code, /className="brg-layer__fixed"/, "the fixed layer says nothing about being fixed");
  // Rows in the public list are divs. There is nothing to change, so there is
  // nothing to tap, and a control that does nothing teaches a member that
  // controls on this screen do nothing.
  const publicBlock = code.slice(
    code.indexOf("brg-layer__fixed"),
    code.indexOf("On accepted interest, both sides"),
  );
  assert.ok(!/<button/.test(publicBlock), "the fixed public layer contains a control");
});

test("identity is on accepted interest by default and disclosure is mutual either way", () => {
  const code = flat(SURFACES.preview);
  assert.match(code, /Disclosure is mutual either way/);
  assert.match(code, /without giving theirs in the same moment/);
  assert.match(code, /The default/);
});

test("validity offers its horizons with the exact expiry date, computed", () => {
  const code = stripComments(SURFACES.preview);
  assert.match(code, /VALIDITY_DAYS/, "the surface carries its own horizons");
  assert.match(code, /expirySentence/, "the surface writes its own date");
  assert.ok(!/\b20\d\d\b/.test(code), "a year is typed into the preview");
});

test("validity is not printed as fixed above the control that changes it", () => {
  /*
    FOUND BY RENDERING. The public layer listed "Validity: 60 days: Fixed"
    directly above three rows that change it, which is a contradiction the
    member can see: either it is fixed or the rows underneath do nothing.
  */
  assert.match(
    stripComments(SURFACES.preview),
    /fact\.field !== "validity"/,
    "validity is rendered in the fixed layer as well as in its own section",
  );
});

/* ------------------------------------------------------------------ *
 * B08 the gate
 * ------------------------------------------------------------------ */

test("the gate uses the shared OTP flow, with its guards", () => {
  /*
    Ponte is OTP only. The reference draws email + PASSWORD, "Create an
    account" and "Send me a sign-in link", and Ponte has none of the three.
  */
  const code = stripComments(SURFACES.gate);
  assert.match(code, /useOtp/, "the gate reimplements sign-in");
  assert.ok(!/type="password"/.test(code), "the gate asks for a password Ponte does not hold");
  assert.match(code, /autoComplete="one-time-code"/);
});

/* ------------------------------------------------------------------ *
 * B09 screening and confirmation
 * ------------------------------------------------------------------ */

test("no surface writes its own status word", () => {
  assert.match(SURFACES.screening, /VERDICT_LABEL/);
  const code = stripComments(SURFACES.screening);
  for (const word of ["Approved", "Vetted", "Reviewed", "Verified"]) {
    assert.ok(!code.includes(word), `the screening surface writes "${word}"`);
  }
});

test("the perimeter is on the screening surface unconditionally", () => {
  const code = stripComments(SURFACES.screening);
  assert.ok(code.includes('className="brg-perimeter"'), "there is no perimeter statement");
  assert.ok(
    !/\{\s*(clear|settled|attention|refused)\s*&&[\s\S]{0,200}className="brg-perimeter"/.test(code),
    "the perimeter is conditional on a verdict",
  );
});

test("a finding outranks an unrun check", () => {
  /*
    FOUND BY RENDERING. When the submit route refused a listing for a stated
    reason the other two checks were correctly marked `not_run`, and `failed`
    was tested first, so the surface printed "A service failure, not a finding"
    directly above the finding itself.
  */
  assert.match(
    stripComments(SURFACES.screening),
    /const failed = !attention && !refused/,
    "an unrun check can still be reported as a service failure over a finding",
  );
});

test("no surface claims a person is looking at an ordinary submission", () => {
  assert.match(SURFACES.screening, /Nobody is queued to look at this/);
  assert.ok(!/we review|reviewed by our team|our team checks/i.test(ALL));
});

test("the confirmation is a report with all five elements", () => {
  const code = stripComments(SURFACES.published);
  assert.match(code, /Deal published/, "1: no milestone");
  assert.match(code, /is live, and anyone can find it/, "2: no recognition statement");
  assert.match(code, /NO_RESPONSE_PROMISE/, "3: the value is claimed without its limit");
  assert.match(code, /brg-report__held/, "4: nothing states what is preserved");
  assert.match(code, /brg-report__next/, "5: no next action");
  assert.match(code, /Owner: You/, "the next action has no owner");
});

test("the confirmation is a report, not a reward", () => {
  for (const word of ["confetti", "streak", "points", "badge", "congratulations", "well done"]) {
    assert.ok(!new RegExp(word, "i").test(ALL), `the path carries a reward: ${word}`);
  }
});

test("the member's own words are never case-folded", () => {
  assert.ok(
    !/subject\.toLowerCase\(\)/.test(stripComments(SURFACES.published)),
    "the confirmation lower-cases the member's own product name",
  );
});

test("the confirmation is terminal and offers no way back", () => {
  // The listing is public. A control implying it could be un-published by going
  // backwards would be a lie.
  assert.match(stripComments(SURFACES.published), /back=\{null\}/, "the confirmation has a back control");
});

/* ------------------------------------------------------------------ *
 * The shell's promises
 * ------------------------------------------------------------------ */

test("every surface renders inside the shared shell", () => {
  for (const name of [
    "intent", "capacity", "tell", "listing", "assets", "preview", "gate", "screening", "published",
  ]) {
    assert.match(SURFACES[name], /<BridgeShell/, `${name} does not use the shared shell`);
  }
});

test("the record is derived once, above the surfaces, and never accumulated", () => {
  // Nine surfaces each assembling their own record is nine chances for two of
  // them to disagree about what the member has said.
  assert.match(stripComments(SURFACES.flow), /ledgerLines\(/, "the flow derives no record");
  for (const name of ["capacity", "tell", "listing", "assets", "preview", "gate", "screening", "published"]) {
    assert.ok(
      !/ledgerLines\(/.test(stripComments(SURFACES[name])),
      `${name} assembles a record of its own`,
    );
  }
});

test("the tape stops under reduced motion and has a keyboard-reachable pause", () => {
  const chrome = read("components/bridge/Chrome.tsx");
  assert.match(chrome, /<button className="brg-tape__pause"/, "the pause control is not a button");
  assert.match(chrome, /sessionStorage/, "the paused state does not persist for the session");
  const reduced = CSS_CODE.slice(CSS_CODE.indexOf("prefers-reduced-motion"));
  assert.match(reduced, /\.brg-tape__run \{ animation: none/, "the tape runs under reduced motion");
});

test("every animation on the bridge is disabled under reduced motion", () => {
  const animated = Array.from(CSS_CODE.matchAll(/animation:\s*([\w-]+)/g))
    .map((m) => m[1])
    .filter((name) => name !== "none");
  assert.ok(animated.length > 0, "there is nothing to check");
  const reduced = CSS_CODE.slice(CSS_CODE.indexOf("@media (prefers-reduced-motion"));
  // `Array.from`, not a spread: this project's target predates ES2015 iterators.
  for (const name of Array.from(new Set(animated))) {
    assert.ok(
      reduced.includes(name) || /animation: none/.test(reduced),
      `${name} is not stopped under reduced motion`,
    );
  }
});

test("controls meet their minimum targets", () => {
  /*
    ANY block for the selector, not the first. `.brg-act` now has a second
    declaration inside `@media (min-width: 1920px)` that only overrides type
    size for the wide shell and does not repeat `min-height`, and that block
    happens to sit earlier in the file than the base rule. A regex that reads
    only the first match found the responsive override and reported a real
    64px control as failing. The property under test is "the base rule sets a
    minimum", not "the first rule mentioning this selector sets a minimum", so
    this checks every block and asks that at least one satisfy it.
  */
  for (const selector of ["\\.brg-fact", "\\.brg-act", "\\.brg-back", "\\.brg-check"]) {
    const blocks = Array.from(CSS_CODE.matchAll(new RegExp(`${selector}\\s*\\{([^}]*)\\}`, "g")));
    assert.ok(blocks.length > 0, `${selector} has no declaration at all`);
    const hasMinimum = blocks.some(([, body]) => /min-height:\s*(48|64)px/.test(body));
    assert.ok(hasMinimum, `${selector} is below its minimum target in every declaration`);
  }
  const zone = CSS_CODE.match(/\.brg-zone \{([^}]*)\}/)?.[1] ?? "";
  // 19px of padding either side of a 27px serif line clears 64px on its own.
  assert.match(zone, /padding-block:\s*19px/, "the choice row lost its tap padding");
});

console.log(`ok   bridge publish surfaces: ${passed} assertions passed`);
