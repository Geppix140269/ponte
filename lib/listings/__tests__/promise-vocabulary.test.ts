// What the site PROMISES, held to what the site DOES.
//
// Run: npx tsx lib/listings/__tests__/promise-vocabulary.test.ts
//
// Two corrections from the design director, approved by the owner on 2 August
// 2026, and one guard each so neither can drift back.
//
// ## P1-1: no universal human review
//
// The site said Ponte "reviews it before anything is published". It does not.
// ADR-0013 made publication automatic: a submission clearing the automated
// checks goes live without a person seeing it, and only a flagged one is looked
// at by hand. Advertising a review nobody performs is the worst of both - a
// promise broken on every ordinary submission, spending the credibility of the
// exceptional review that IS performed and is worth selling.
//
// ## P1-2: publish is never the paid room action
//
// "Publish" everywhere else on the internet means make publicly visible. A Deal
// Room is private and stays private, so "$79 when you publish it" could be read
// as "pay $79 to make my confidential deal public" - the opposite of the
// product, at the moment a member decides whether to pay.
//
//   Publish a listing       member opportunity   free
//   Create a Deal Room      draft                free
//   Activate a Deal Room    active               $79 for 30 calendar days
//
// ## Why "30 calendar days" is a correction and not a change
//
// `periodEndFrom` has always been `start + 30 x 24h` of wall time and has never
// paused for anything. "30 active days" described an accounting model the code
// does not implement, so the interface was the thing that was wrong.

import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import { formatRoomMoment, expiryLine } from "../../deal-room/moment";

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

function walk(dir: string, match: RegExp): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      if (entry === "node_modules" || entry === "__tests__") continue;
      out.push(...walk(path, match));
    } else if (match.test(entry)) {
      out.push(path);
    }
  }
  return out;
}

/**
 * Prose a member can read. Comments are stripped, because a comment explaining
 * WHY a phrase was removed necessarily contains the phrase, and banning that
 * would ban the explanation.
 */
function memberFacing(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .split("\n")
    .filter((line) => {
      const t = line.trim();
      return !t.startsWith("//") && !t.startsWith("*");
    })
    .join("\n");
}

const SURFACES = [
  ...walk("app", /\.(tsx|ts)$/),
  ...walk("components", /\.tsx$/),
  ...walk("lib", /\.ts$/),
];
const MESSAGES = walk("messages/_fragments", /\.json$/);

test("the walk reaches the surfaces it is supposed to be checking", () => {
  // A silent zero would make every assertion below pass by finding nothing.
  assert.ok(SURFACES.length > 200, `only ${SURFACES.length} source files found; the walk is broken`);
  assert.ok(MESSAGES.length > 10, `only ${MESSAGES.length} message fragments found; the walk is broken`);
  assert.ok(
    SURFACES.some((f) => f.replace(/\\/g, "/").endsWith("app/[locale]/market-signals/page.tsx")),
    "the route the P1-1 defect was reported on is not in the walk",
  );
});

// ---------------------------------------------------------------------------
// P1-1
// ---------------------------------------------------------------------------

test("nothing promises that a person reviews a standard submission", () => {
  const banned: [RegExp, string][] = [
    [/reviews it before anything is published/i, "the original promise"],
    [/reviewed by the desk before/i, "review by the desk"],
    [/vetted by the desk/i, "vetting by the desk"],
    [/the desk reviews it/i, "the desk reviewing"],
    [/verified by AI and a human desk/i, "a human desk in the metadata"],
    [/reviewed by our team/i, "review by our team"],
    [/\bin vetting\b/i, "a vetting queue as a status"],
    [/submit for vetting/i, "submitting into a vetting queue"],
  ];
  for (const file of [...SURFACES, ...MESSAGES]) {
    const copy = memberFacing(readFileSync(file, "utf8"));
    for (const [pattern, what] of banned) {
      const hit = copy.match(pattern);
      assert.equal(hit, null, `${file} promises ${what}: "${hit?.[0]}"`);
    }
  }
});

test("the approved replacement is on the route it was reported on", () => {
  const page = readFileSync("app/[locale]/market-signals/page.tsx", "utf8");
  for (const phrase of [
    "automatically checks it for completeness, quality and risk before publication",
    "Flagged submissions may require additional information or human review",
  ]) {
    assert.ok(page.includes(phrase), `the approved wording is missing its clause: "${phrase}"`);
  }
});

test("human review is still claimed for the flagged path, where it is true", () => {
  // The instruction was to remove the UNIVERSAL promise, not the capability.
  // The exceptional review is real and it is a selling point; deleting it
  // everywhere would be the opposite error.
  const page = readFileSync("app/[locale]/market-signals/page.tsx", "utf8");
  assert.match(page, /Flagged submissions/, "the exceptional human review is no longer offered at all");
});

test("a submission that cleared the automated checks is Checked, not Approved", () => {
  const marketplace = readFileSync("messages/_fragments/marketplace.json", "utf8");
  assert.ok(!marketplace.includes('"approved": "Approved'), "the status label still reads Approved");
  assert.match(marketplace, /"approved": "Checked/, "the status label does not read Checked");
});

test("the persisted status vocabulary is NOT swept", () => {
  // The owner's standing instruction: rename an identifier only where it
  // represents the wrong domain state, with a migration. `listings.status =
  // 'approved'` is a stored value behind a CHECK constraint, and the label is
  // what a member reads. Changing the label is the fix; changing the enum
  // would be a migration to fix a caption.
  const eligibility = readFileSync("lib/listings/eligibility.ts", "utf8");
  assert.match(eligibility, /"approved" \| "flagged" \| "needs_information"/, "the persisted status union was renamed");
});

test("the Market Signals honesty disclaimer is untouched", () => {
  // Named explicitly as correct and out of scope.
  const gates = readFileSync("components/desk/SignalGates.tsx", "utf8");
  assert.match(gates, /Nothing here has been confirmed with the/, "the honesty disclaimer was edited");
  assert.match(gates, /nothing here is a Ponte member/, "the honesty disclaimer was edited");
});

// ---------------------------------------------------------------------------
// P1-2
// ---------------------------------------------------------------------------

test("no member-facing string uses publish for a Deal Room", () => {
  /*
    Scoped to the ROOM, deliberately.

    A bare ban on "unpublish" fails on `/admin/signals`, where an operator
    takes a Market Signal off the public board. That control is correct: a
    signal genuinely is published to a public board and genuinely can be
    withdrawn from it. Publishing is the right verb for the thing that becomes
    publicly visible, and the whole point of P1-2 is that a Deal Room is not
    that thing. Banning the word everywhere would be the same category error
    in the other direction.
  */
  const banned = [
    /publish\w*\s+(?:the\s+|this\s+|your\s+|a\s+|it\s+)?(?:deal\s+)?room/i,
    /(?:deal\s+)?room[^.]{0,40}\bunpublish/i,
    /\bunpublish\w*\s+(?:the\s+|this\s+|your\s+|a\s+)?(?:deal\s+)?room/i,
    /when you publish it/i,
    /pay\s+to\s+publish/i,
  ];
  for (const file of [...SURFACES, ...MESSAGES]) {
    const copy = memberFacing(readFileSync(file, "utf8"));
    for (const pattern of banned) {
      const hit = copy.match(pattern);
      assert.equal(hit, null, `${file} uses publish for a room: "${hit?.[0]}"`);
    }
  }
});

test("the landing states the three actions in the approved words", () => {
  const preview = readFileSync("components/home/landing/DealRoomPreview.tsx", "utf8");
  assert.match(preview, /Opening a room and building it are free\./);
  assert.match(preview, /Invited counterparties join free\./);
  assert.match(preview, /to activate it, for \{ACTIVE_PERIOD_DAYS\} calendar days\./);
});

test('"active days" is gone from every member-facing string', () => {
  for (const file of [...SURFACES, ...MESSAGES]) {
    const copy = memberFacing(readFileSync(file, "utf8"));
    const hit = copy.match(/\bactive days?\b/i);
    assert.equal(hit, null, `${file} still says "${hit?.[0]}"`);
  }
});

test("every charge description a member sees on a receipt names the act", () => {
  /*
    These strings LEAVE the product. They land on a card statement and in a
    Stripe receipt with none of our chrome around them to explain them, which
    is why the brief calls a receipt saying "publish" as damaging as a button
    saying it.

    Read as template literals rather than by slicing at the first
    `description:`, which is the type declaration and not a value.
  */
  const charging = readFileSync("lib/deal-room/charging.ts", "utf8");
  const descriptions = Array.from(charging.matchAll(/description:\s*\n?\s*`([^`]+)`/g), (m) => m[1]);
  assert.ok(descriptions.length >= 2, `only ${descriptions.length} charge descriptions found; the read is wrong`);

  for (const description of descriptions) {
    assert.ok(!/publish/i.test(description), `a receipt line says publish: "${description}"`);
    assert.ok(!/\bactive days\b/i.test(description), `a receipt line sells active days: "${description}"`);
  }
  // The two that create or renew a paid period name the act they charge for.
  const periodLines = descriptions.filter((d) => /period|calendar days/i.test(d));
  assert.ok(periodLines.length >= 2, "a paid period is charged for without naming the period");
  for (const line of periodLines) {
    assert.match(line, /activation|reactivation/i, `a period charge does not name the act: "${line}"`);
  }
});

test("the period the interface promises is the period the code computes", () => {
  // The reason "calendar days" is a correction rather than a repricing.
  const billing = readFileSync("lib/deal-room/billing.ts", "utf8");
  assert.match(
    billing,
    /return new Date\(start\.getTime\(\) \+ ROOM_PERIOD_DAYS \* 24 \* 60 \* 60 \* 1000\);/,
    "the period is no longer plain wall time, so the copy and the code have parted",
  );
});

// ---------------------------------------------------------------------------
// P1-3
// ---------------------------------------------------------------------------

test("the non-disclosure statement is stated verbatim at activation", () => {
  const copy = readFileSync("lib/deal-room/screens-example.ts", "utf8");
  assert.match(
    copy,
    /Activating does not make this room public\. Its contents stay visible only to admitted participants\./,
    "the approved non-disclosure statement is missing or reworded",
  );
});

test("it is rendered before the payment control, not after it", () => {
  // A reassurance below the button is read after the decision.
  const screen = readFileSync("components/deal-room/ActivationScreen.tsx", "utf8");
  const privacy = screen.indexOf("ACTIVATION.privacy");
  const control = screen.indexOf("Activate this Deal Room");
  assert.ok(privacy > 0, "the non-disclosure statement is not rendered");
  assert.ok(control > 0, "the activation control is gone");
  assert.ok(privacy < control, "the non-disclosure statement renders after the payment control");
});

test("the exact expiry is shown, and before the control", () => {
  const screen = readFileSync("components/deal-room/ActivationScreen.tsx", "utf8");
  const expiry = screen.indexOf("ACTIVATION.expiry");
  const control = screen.indexOf("Activate this Deal Room");
  assert.ok(expiry > 0, "no expiry is shown before payment");
  assert.ok(expiry < control, "the expiry renders after the payment control");
  const copy = readFileSync("lib/deal-room/screens-example.ts", "utf8");
  assert.match(copy, /expiry: \{/, "the expiry block is gone");
  // A date AND a time, not a duration restated.
  assert.match(copy, /\d{1,2}:\d{2}/, "the expiry states no time of day");
});

// ---------------------------------------------------------------------------
// P1-3 (v2): a Deal Room deadline carries a date, a time AND a zone
// ---------------------------------------------------------------------------

test("the room-moment formatter produces the approved shape", () => {
  const at = new Date("2026-08-01T14:32:00Z");
  assert.equal(formatRoomMoment(at, "Europe/Rome")?.full, "1 August 2026 at 16:32 CEST");
  // The same instant, read by a counterparty on the other side of the world.
  // Both carry a zone, so neither can misread the other's deadline.
  assert.equal(formatRoomMoment(at, "Asia/Singapore")?.full, "1 August 2026 at 22:32 GMT+8");
  // A server render knows no zone. It says UTC rather than saying nothing.
  assert.equal(formatRoomMoment(at)?.full, "1 August 2026 at 14:32 UTC");
});

test("the formatter never throws on bad input", () => {
  assert.equal(formatRoomMoment("not a date"), null);
  assert.equal(formatRoomMoment(new Date("2026-08-01T14:32:00Z"), "Mars/Olympus")?.zone, "UTC");
});

test("a countdown always carries the moment it counts to", () => {
  // "A warning that says only 'three days remaining' is not acceptable."
  const now = new Date("2026-08-29T09:00:00Z");
  const line = expiryLine("2026-09-01T14:32:00Z", now, "Europe/Rome");
  assert.match(line ?? "", /3 days remaining/, "the count is gone");
  assert.match(line ?? "", /1 September 2026 at 16:32 CEST/, "the moment is gone");
  // Zero days is not "0 days remaining", which reads as already expired.
  assert.match(expiryLine("2026-08-29T20:00:00Z", now, "Europe/Rome") ?? "", /^Ends today, /);
});

test("no member-facing countdown states a bare number of days", () => {
  // The rule has to bind the SOURCE, because the warnings that will carry it
  // (DECISION-02) do not exist yet and cannot be tested by running them.
  const entitlement = readFileSync("lib/deal-room/entitlement.ts", "utf8");
  assert.match(entitlement, /expiryLine\(/, "the usage summary no longer formats a moment");
  // The one remaining bare-count string is a fallback for a term with no
  // recorded expiry, where there IS no moment to state.
  const moment = readFileSync("lib/deal-room/moment.ts", "utf8");
  assert.ok(
    !/export function daysRemainingLine|export function countdownOnly/.test(moment),
    "a function that returns a count with no moment has been added",
  );
});

test("the timezone rule is scoped to the room, not to listing validity", () => {
  // DECISION-12: listing validity needs an exact date and no clock. Putting a
  // time on it would imply a precision the validity model does not have.
  const moment = readFileSync("lib/deal-room/moment.ts", "utf8");
  assert.match(moment, /Deal Room activation and expiry ONLY/, "the scope note is gone");
});

// ---------------------------------------------------------------------------
// P1-5 (v2): no unlimited or indefinite storage promises
// ---------------------------------------------------------------------------

test("nothing promises unlimited or indefinite retention", () => {
  // Draft retention is an open parameter (PARAM-02). Copy may not commit to a
  // duration the product has not decided.
  const banned = /(unlimited|indefinitely|forever|always available|permanent)\s+(storage|retention|history|records?|drafts?)|\b(store|keep|kept|retained)\s+(them\s+)?(forever|indefinitely|permanently)|for as long as you like/i;
  for (const file of [...SURFACES, ...MESSAGES]) {
    const copy = memberFacing(readFileSync(file, "utf8"));
    const hit = copy.match(banned);
    assert.equal(hit, null, `${file} promises retention Ponte has not committed to: "${hit?.[0]}"`);
  }
});

test("the free draft room says exactly what is true of it", () => {
  const walk = readFileSync("lib/deal-room/walkthrough.ts", "utf8");
  assert.match(
    walk,
    /Building the room is free\. No activation period begins until payment\./,
    "the approved P1-5 wording for the free draft is missing",
  );
});

console.log(`ok   promise vocabulary: ${passed} assertions passed`);
