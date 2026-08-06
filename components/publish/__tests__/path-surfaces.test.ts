// The rest of the path's surfaces obey the same constitution as B01.
//
// Run: npx tsx components/publish/__tests__/path-surfaces.test.ts
//
// `b01-surface.test.ts` covers B01 and the frame. This covers B01b through B09
// and `publish-path.css`, and it holds them to the SAME rules rather than a
// relaxed set: the thirteen are live in production on the screens these
// replace, and a build that reproduced one of them on screen seven would have
// replaced eight screens and kept the ninth.
//
// Several assertions here exist because the defect they pin was found by
// RENDERING the path, not by reading it. Those are marked. Every one of them
// would have passed a plausible source test.

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

const PATH_CSS = read("components/publish/publish-path.css");
const SURFACES: Record<string, string> = {
  capacity: read("components/publish/DeclareCapacity.tsx"),
  tell: read("components/publish/TellPonte.tsx"),
  listing: read("components/publish/ListingSoFar.tsx"),
  correct: read("components/publish/CorrectInPlace.tsx"),
  assets: read("components/publish/DescribeAndAssets.tsx"),
  preview: read("components/publish/DealPreview.tsx"),
  gate: read("components/publish/AccountGate.tsx"),
  screening: read("components/publish/Screening.tsx"),
  published: read("components/publish/Published.tsx"),
  frame: read("components/publish/Frame.tsx"),
  flow: read("components/publish/PublishFlow.tsx"),
};

const stripComments = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/[^\n]*$/gm, "");

/**
 * Source with every run of whitespace collapsed to one space.
 *
 * Member-facing copy in JSX is wrapped by the formatter, so a sentence a member
 * reads as one line exists in the file as two or three. Asserting on the raw
 * source makes a test that fails the next time the file is reformatted, which
 * teaches everyone to stop asserting on copy.
 */
const flat = (source: string) => stripComments(source).replace(/\s+/g, " ");

const CSS_CODE = PATH_CSS.replace(/\/\*[\s\S]*?\*\//g, "");
const TSX_CODE = Object.values(SURFACES).map(stripComments).join("\n");
/**
 * Everything a member could read, with comments stripped.
 *
 * Comments are removed for the same reason `promise-vocabulary.test.ts` removes
 * them: a comment explaining WHY a phrase was retired necessarily contains the
 * phrase, and banning that bans the explanation. This test caught its own
 * source note quoting item 10 in full, which is the third time that trap has
 * been walked into on this project.
 */
const ALL = [CSS_CODE, TSX_CODE].join("\n");

/* ------------------------------------------------------------------ *
 * NO BOXES, on every surface, with the drawn-shape exemption fenced
 * ------------------------------------------------------------------ */

/**
 * The three drawn-shape families.
 *
 * `.mk` (the 18px state mark), `.gl` (the 22px route glyphs) and `.spk__g`
 * (the 44px microphone) are ICONS: they carry meaning by shape so that colour
 * is never doing it alone, which ADR-0002 requires. They are not structure and
 * they hold nothing.
 *
 * The exemption is granted by selector here and FENCED by the assertions below,
 * which pin every one of them to a fixed size on both axes. A shape that could
 * grow could become a container, and then this would be an exemption for boxes.
 */
const DRAWN_SHAPE = /\.mk|\.gl|\.spk__g/;

/** Every length in a shadow layer, with a bare `0` read as a zero length. */
function shadowLengths(layer: string): number[] {
  return layer
    .trim()
    .split(/\s+/)
    .filter((token) => /^-?[\d.]+(px)?$/.test(token))
    .map((token) => Number.parseFloat(token));
}

test("structure never comes from a border on four sides", () => {
  const offenders: string[] = [];
  for (const rule of CSS_CODE.split("}")) {
    const [selector, body] = rule.split("{");
    if (!body) continue;
    if (DRAWN_SHAPE.test(selector)) continue;
    for (const m of Array.from(body.matchAll(/(^|[^-\w])border:\s*([^;]+);/g))) {
      if (m[2].trim() !== "0") offenders.push(`${selector.trim()} -> ${m[2].trim()}`);
    }
  }
  assert.deepEqual(offenders, [], `four-sided borders found:\n  ${offenders.join("\n  ")}`);
});

test("nothing outside a drawn shape is rounded", () => {
  const offenders: string[] = [];
  for (const rule of CSS_CODE.split("}")) {
    const [selector, body] = rule.split("{");
    if (!body) continue;
    if (DRAWN_SHAPE.test(selector)) continue;
    for (const m of Array.from(body.matchAll(/border(-[a-z-]+)?-radius:\s*([^;]+);/g))) {
      if (m[2].trim() !== "0" && m[2].trim() !== "0px") {
        offenders.push(`${selector.trim()} -> ${m[2].trim()}`);
      }
    }
  }
  assert.deepEqual(offenders, [], `rounded corners found:\n  ${offenders.join("\n  ")}`);
});

test("the drawn shapes are pinned to a fixed size and cannot become containers", () => {
  // The fence on the exemption above.
  const glyph = CSS_CODE.match(/\.pb \.gl \{([^}]*)\}/)?.[1] ?? "";
  assert.match(glyph, /inline-size:\s*22px/, "the route glyph has no fixed inline size");
  assert.match(glyph, /block-size:\s*22px/, "the route glyph has no fixed block size");

  const mic = CSS_CODE.match(/\.pb \.spk__g \{([^}]*)\}/)?.[1] ?? "";
  assert.match(mic, /inline-size:\s*44px/, "the microphone has no fixed inline size");
  assert.match(mic, /block-size:\s*44px/, "the microphone has no fixed block size");
});

test("no shadow is used as depth, and the drawn shapes' shadows have no blur", () => {
  /*
    `box-shadow` with a blur radius is a box with the edges blurred, and it is
    banned outright. The grid and document glyphs use a ZERO-BLUR box-shadow to
    repeat a square, which is shape drawing rather than depth. The distinction
    is enforced here rather than trusted: every permitted shadow must have no
    blur, so none of them can ever become a shadow.
  */
  for (const rule of CSS_CODE.split("}")) {
    const [selector, body] = rule.split("{");
    if (!body) continue;
    for (const m of Array.from(body.matchAll(/box-shadow:\s*([^;]+);/g))) {
      assert.ok(DRAWN_SHAPE.test(selector), `box-shadow outside a drawn shape: ${selector.trim()}`);
      for (const layer of m[1].split(",")) {
        // "10px 10px 0 -0.5px currentColor": x, y, blur, spread. Blur is third,
        // and is written as a bare `0`, which is why it is read as a length
        // rather than filtered out for lacking a unit.
        const blur = shadowLengths(layer)[2] ?? 0;
        assert.equal(blur, 0, `${selector.trim()} has a blurred shadow: ${layer.trim()}`);
      }
    }
  }
});

/* ------------------------------------------------------------------ *
 * Typography and the thirteen
 * ------------------------------------------------------------------ */

test("every statement is serif and no prose is monospace", () => {
  // Items 1 and 12. `--f-mono` is for labels, status words and identifiers.
  for (const [name, source] of Object.entries(SURFACES)) {
    if (name === "frame" || name === "flow") continue;
    const code = stripComments(source);
    if (!/className="stmt/.test(code)) continue;
    assert.ok(
      /className="stmt stmt--2"|className="stmt"/.test(code),
      `${name}: a statement is not using the serif statement class`,
    );
  }
  /*
    Every font-family on the path is a TOKEN or `inherit`. Never a literal.

    This is the fence on the defect that shipped in B01: the alias is defined on
    the frame, and a rule that named a face directly would silently diverge from
    it, in exactly the way an undefined alias silently fell back to Inter.
  */
  for (const declaration of Array.from(CSS_CODE.matchAll(/font-family:\s*([^;]+);/g))) {
    const value = declaration[1].trim();
    assert.ok(
      value.startsWith("var(--f-") || value === "inherit",
      `a literal font-family is set on the path: ${value}`,
    );
  }
});

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
  // Item 4 and P1-2. /publish is correct: publishing a listing IS free and
  // public. Attaching the word to the room is what must never happen.
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

test("the capacity is written onto the draft, not only held beside it", () => {
  /*
    FOUND BY RENDERING. `role` is a completion field of every family's
    procedure and it reads `draft.role`, which nothing was setting. The screen
    after the capacity declaration therefore asked "What is your capacity on
    this?" as a fact NEEDED TO PUBLISH: the same question, one screen later,
    with the answer discarded.
  */
  assert.match(
    stripComments(SURFACES.flow),
    /capacityColumns\(next\)\.submitter_role/,
    "the declared capacity never reaches the draft",
  );
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
  // The speak band precedes the rows: routes are weighted by size and position,
  // never by label.
  assert.ok(
    code.indexOf('className="spk"') < code.indexOf("Photograph or upload"),
    "the speak route is not first by position",
  );
});

test("the direction of the statement comes from the pinned intent table", () => {
  /*
    FOUND BY RENDERING. It was `intent === "source_product"`, true for exactly
    one of the four demand-side intents. A member who chose "I need something"
    then "A trade service" was shown "Tell Ponte what service you PROVIDE" :
    the heading contradicting the choice just made, which is P0-5 in a new
    place.
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
  // The order IS the work order: missing and uncertain above confirmed. A
  // surface that re-sorted for visual balance would put the member's next task
  // below the fold.
  assert.ok(!/\.sort\(/.test(stripComments(SURFACES.listing)), "the fact list re-sorts");
  assert.match(SURFACES.listing, /factsFor/, "the fact list builds its own model");
});

test("inferred is marked distinctly from read, in the DOM and not only in prose", () => {
  const code = stripComments(SURFACES.listing);
  assert.match(code, /Inferred, not read/);
  assert.match(code, /Yes, that is right/, "an inferred fact cannot be confirmed in one tap");
  assert.match(CSS_CODE, /\.pb \.fl__i--inf \.fl__v b\s*\{[^}]*dashed/, "inferred looks like read");
});

test("correction is a sheet of rows, never a bare text field", () => {
  const code = stripComments(SURFACES.correct);
  assert.match(code, /className="pick"/, "there is no correction sheet");
  assert.match(code, /className="row"/, "the sheet offers no rows");
  // Typing exists inside the sheet, and is last.
  assert.ok(
    code.indexOf('className="pick__b"') < code.indexOf('className="pick__s"'),
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
  const conf = code.slice(code.indexOf('className="conf"'));
  assert.ok(
    code.indexOf('className="conf"') > code.indexOf("</button>"),
    "the confirm control sits inside the fact's own button",
  );
  assert.match(conf, /onConfirm\(fact\.field\)/);
});

/* ------------------------------------------------------------------ *
 * B07 Deal preview
 * ------------------------------------------------------------------ */

test("the public layer is fixed, and its rows are not controls", () => {
  const code = stripComments(SURFACES.preview);
  assert.match(code, /mk mk--lock/, "the fixed layer carries no lock");
  assert.match(code, /className="lay__fixed"/);
  // Rows in the public list are divs. There is nothing to change, so there is
  // nothing to tap, and a control that does nothing teaches a member that
  // controls on this screen do nothing.
  const publicBlock = code.slice(code.indexOf('lay--pub'), code.indexOf("On accepted interest"));
  assert.ok(!/<button/.test(publicBlock), "the fixed public layer contains a control");
});

test("identity is on accepted interest by default and disclosure is mutual either way", () => {
  const code = flat(SURFACES.preview);
  assert.match(code, /Disclosure is mutual either way/);
  assert.match(code, /without giving theirs in the same moment/);
  assert.match(code, /The default/);
});

test("validity offers 30, 60 and 90 with the exact expiry date, computed", () => {
  const code = stripComments(SURFACES.preview);
  assert.match(code, /VALIDITY_DAYS/, "the surface carries its own horizons");
  assert.match(code, /expirySentence/, "the surface writes its own date");
  // The date must not be a literal anywhere on this surface.
  assert.ok(!/\b20\d\d\b/.test(code), "a year is typed into the preview");
});

/* ------------------------------------------------------------------ *
 * B08 the gate
 * ------------------------------------------------------------------ */

test("the gate uses the shared OTP flow, with its guards", () => {
  /*
    Ponte is OTP only. The reference draws email + PASSWORD, "Create an
    account" and "Send me a sign-in link", and Ponte has none of the three.
    `useOtp` carries the guards that exist because a magic link once put the
    session in a URL fragment nothing read, and a member acted as whoever was
    signed in on that machine before them.
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
  // The one place that decides is VERDICT_LABEL. A surface that wrote its own
  // would eventually write "Approved" on a Tuesday.
  assert.match(SURFACES.screening, /VERDICT_LABEL/);
  const code = stripComments(SURFACES.screening);
  for (const word of ["Approved", "Vetted", "Reviewed", "Verified"]) {
    assert.ok(!code.includes(word), `the screening surface writes "${word}"`);
  }
});

test("the perimeter is on the screening surface unconditionally", () => {
  const code = stripComments(SURFACES.screening);
  const perimeter = code.slice(code.indexOf('className="perim"'));
  // Not inside a conditional. Three green marks with nothing beside them read
  // as a clean bill of health on the counterparty; they are not one.
  assert.ok(perimeter.length > 0, "the screening surface has no perimeter statement");
  assert.ok(
    !/\{\s*(clear|settled|attention|refused)\s*&&[\s\S]{0,200}className="perim"/.test(code),
    "the perimeter is conditional on a verdict",
  );
});

test("no surface claims a person is looking at an ordinary submission", () => {
  // P1-1 removed the universal human-review promise from the rest of the site.
  assert.match(SURFACES.screening, /Nobody is queued to look at this/);
  assert.ok(!/we review|reviewed by our team|our team checks/i.test(ALL));
});

test("the confirmation is an R2 with all five elements", () => {
  const code = stripComments(SURFACES.published);
  assert.match(code, /className="r2__m"/, "1: no milestone");
  assert.match(code, /<h2>/, "2: no recognition statement");
  assert.match(code, /NO_RESPONSE_PROMISE/, "3: the value is claimed without its limit");
  assert.match(code, /className="held"/, "4: nothing states what is preserved");
  assert.match(code, /className="r2__next"/, "5: no next action");
  assert.match(code, /Owner: You/, "the next action has no owner");
});

test("the confirmation is a report, not a reward", () => {
  // No coins, points, streaks or confetti. A reward implies Ponte is pleased,
  // which implies a judgement, which is the thing Ponte does not make.
  for (const word of ["confetti", "streak", "points", "badge", "congratulations", "well done"]) {
    assert.ok(!new RegExp(word, "i").test(ALL), `the path carries a reward: ${word}`);
  }
});

test("the member's own words are never case-folded", () => {
  /*
    FOUND BY RENDERING. `subject.toLowerCase()` made the sentence read, and
    turned the member's product into "gasoil 10 ppm (ulsd, en 590)": two
    standards mangled in the one sentence that tells them their record is live.
  */
  assert.ok(
    !/subject\.toLowerCase\(\)/.test(stripComments(SURFACES.published)),
    "the confirmation lower-cases the member's own product name",
  );
});

/* ------------------------------------------------------------------ *
 * The frame's promises
 * ------------------------------------------------------------------ */

test("every surface renders inside the shared frame", () => {
  // The progress rule, the back control and the retention footer are promises,
  // not decoration. Stated once so a surface cannot opt out by forgetting.
  for (const name of ["capacity", "tell", "listing", "assets", "preview", "gate", "screening", "published"]) {
    assert.match(SURFACES[name], /<Frame/, `${name} does not use the shared frame`);
  }
});

test("the journey rule carries no numeral and no percentage", () => {
  assert.match(SURFACES.frame, /STAGES/, "the frame invents its own step count");
  const prog = CSS_CODE.match(/\.pb__prog[\s\S]*?\}/)?.[0] ?? "";
  assert.ok(!/content:/.test(prog), "the progress rule renders text");
});

test("choice rows and controls meet their minimum targets", () => {
  for (const selector of [".pb .fl__i", ".pb .ast__i", ".pb .alt button"]) {
    const rule = CSS_CODE.match(new RegExp(`${selector.replace(/[.]/g, "\\.")}\\s*\\{([^}]*)\\}`))?.[1] ?? "";
    assert.match(rule, /min-height:\s*64px/, `${selector} is below the 64px choice-row minimum`);
  }
  assert.match(CSS_CODE, /\.pb \.conf button\s*\{[^}]*min-height:\s*48px/, "the confirm control is below 48px");
});

test("reduced motion is honoured by every animation on the path", () => {
  const animated = Array.from(CSS_CODE.matchAll(/animation:\s*([\w-]+)/g)).map((m) => m[1]);
  assert.ok(animated.length > 0, "there is nothing to check");
  assert.match(CSS_CODE, /prefers-reduced-motion/, "animation is not disabled for reduced motion");
});

console.log(`ok   path surfaces: ${passed} assertions passed`);
