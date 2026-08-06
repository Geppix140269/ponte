// The listing path's rules, held to the brief.
//
// Run: npx tsx lib/publish/__tests__/publish-path.test.ts
//
// Every assertion here corresponds to a sentence in
// `docs/ponte/PONTE-BUILD-1-LISTING-PATH-v2.md` or to a defect found by
// RENDERING the path rather than reading it. The ones marked FOUND BY RENDERING
// are the important ones: each passed a plausible source test before it was
// caught in a browser.

import assert from "node:assert/strict";

import {
  CAPACITIES,
  CHAIN_LABEL_MARKERS,
  capacityColumns,
  capacityComplete,
  capacityOutstanding,
  capacityForLabel,
  emptyCapacity,
  suggestionFrom,
} from "../capacity";
import {
  VALIDITY_DAYS,
  DEFAULT_VALIDITY_DAYS,
  expiryIsoDate,
  expiryLongDate,
  expirySentence,
  validityColumns,
} from "../validity";
import {
  CHECK_ORDER,
  FORBIDDEN_VERDICT_WORDS,
  VERDICT_LABEL,
  PERIMETER,
  CONFIRMATION_PERIMETER,
  NO_RESPONSE_PROMISE,
  checkedCount,
  mayPublish,
  pendingChecks,
  screeningSettled,
} from "../screening";
import {
  SAVED_ANONYMOUS,
  SAVED_SIGNED_IN,
  daysRemaining,
  keep,
  openDraft,
  retentionSentence,
  startClock,
  touch,
  warningAt,
} from "../retention";
import { NODES, STAGES, backLabel, backNode, nextNode, pathFor } from "../steps";
import { VISIBILITY_LEVELS, uploadPermitted, assetSummary } from "../assets";

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

/* ------------------------------------------------------------------ *
 * B01b Capacity
 * ------------------------------------------------------------------ */

test("a previous answer is a suggestion, and it says Ponte has not applied it", () => {
  const suggestion = suggestionFrom("Authorised representative");
  assert.ok(suggestion, "a known previous role produces no suggestion");
  assert.match(suggestion!.disclaimer, /Ponte has not applied this/);
  // Nothing here returns a pre-selected answer. A helper that did would
  // eventually be wired to initial state, which is the defect the rule bans.
  assert.equal(emptyCapacity().key, null);
});

test("the chain-depth flag and the stored label cannot disagree", () => {
  /*
    `roleNeedsChain` in lib/listings/approval-minimum.ts tests the STORED LABEL
    for "broker" or "intermediary". If a capacity declares requiresChainDepth
    but its label carries neither word, the surface asks for a chain depth that
    the approval minimum will not require, or worse the reverse: the surface
    stays silent and the record is refused later for a field never asked for.
  */
  for (const capacity of CAPACITIES) {
    const label = capacity.label.toLowerCase();
    const marked = CHAIN_LABEL_MARKERS.some((word) => label.includes(word));
    assert.equal(
      marked,
      capacity.requiresChainDepth,
      `${capacity.label}: label markers say ${marked}, the flag says ${capacity.requiresChainDepth}`,
    );
  }
});

test("a representative owes both the company and the assertion", () => {
  const base = { ...emptyCapacity(), key: "authorised_representative" as const };
  assert.equal(capacityComplete(base), false);
  assert.match(capacityOutstanding(base)!, /Both are needed/);

  const named = { ...base, authority: { company: "Mekong Delta Rice Co.", held: false } };
  assert.equal(capacityComplete(named), false);
  assert.match(capacityOutstanding(named)!, /Confirm you hold/);

  const done = { ...base, authority: { company: "Mekong Delta Rice Co.", held: true } };
  assert.equal(capacityComplete(done), true);
  assert.equal(capacityOutstanding(done), null);
});

test("a broker owes a chain depth and a principal owes nothing extra", () => {
  const broker = { ...emptyCapacity(), key: "broker_or_intermediary" as const };
  assert.equal(capacityComplete(broker), false);
  assert.match(capacityOutstanding(broker)!, /how far you sit/);
  assert.equal(capacityComplete({ ...broker, chainDepthKey: "direct" }), true);

  assert.equal(capacityComplete({ ...emptyCapacity(), key: "principal" }), true);
});

test("mandate_sighted is never written from the member's surface", () => {
  /*
    The production schema says so in its own comment: "Set by the desk only. A
    sighted mandate is the desk's statement, never the poster's claim." The
    brief names the column alongside submitter_role and chain_depth; the schema
    wins. The member's assertion travels as their own words instead.
  */
  const columns = capacityColumns({
    key: "authorised_representative",
    authority: { company: "Mekong Delta Rice Co.", held: true },
    chainDepthKey: null,
  });
  assert.ok(!("mandate_sighted" in columns), "the member's surface writes the desk's column");
  assert.match(columns.authority_statement!, /Not sighted by Ponte/);
  assert.equal(columns.submitter_role, "Authorised representative");
});

test("the stored role round-trips back to its capacity", () => {
  for (const capacity of CAPACITIES) {
    assert.equal(capacityForLabel(capacity.label)?.key, capacity.key);
  }
});

/* ------------------------------------------------------------------ *
 * B07 Validity, and the exact date
 * ------------------------------------------------------------------ */

test("60 is the default and is offered first", () => {
  assert.equal(DEFAULT_VALIDITY_DAYS, 60);
  assert.equal(VALIDITY_DAYS[0], 60);
  assert.deepEqual([...VALIDITY_DAYS].sort((a, b) => a - b), [30, 60, 90]);
});

test("the exact expiry date is computed, never approximated", () => {
  // 6 August 2026, the day this was built, so the numbers are checkable by hand.
  const now = new Date("2026-08-06T09:00:00.000Z");
  assert.equal(expiryIsoDate(30, now), "2026-09-05");
  assert.equal(expiryIsoDate(60, now), "2026-10-05");
  assert.equal(expiryIsoDate(90, now), "2026-11-04");
  assert.equal(expiryLongDate(60, now), "5 October 2026");
  assert.match(expirySentence(60, now), /expires on 5 October 2026/);
});

test("the expiry sentence says what happens after the date, not only the date", () => {
  const sentence = expirySentence(60, new Date("2026-08-06T09:00:00.000Z"));
  assert.match(sentence, /stops appearing in results/);
  assert.match(sentence, /republish/);
});

test("the validity columns are always a shape the CHECK admits", () => {
  // listings_validity_coherent: dated WITH a date, or standing WITHOUT one.
  const now = new Date("2026-08-06T09:00:00.000Z");
  const dated = validityColumns(60, now);
  assert.equal(dated.validity_type, "dated");
  assert.ok(dated.valid_until, "a dated horizon with no date would be refused");

  const standing = validityColumns("standing", now);
  assert.equal(standing.validity_type, "standing");
  assert.equal(standing.valid_until, null);
});

/* ------------------------------------------------------------------ *
 * B09s Screening vocabulary, DECISION-19
 * ------------------------------------------------------------------ */

test("the label is Checked, and none of the words that claim a human judgement", () => {
  assert.equal(VERDICT_LABEL.checked, "Checked");
  const copy = [
    ...Object.values(VERDICT_LABEL),
    PERIMETER,
    CONFIRMATION_PERIMETER,
    NO_RESPONSE_PROMISE,
  ]
    .join(" ")
    .toLowerCase();
  for (const word of FORBIDDEN_VERDICT_WORDS) {
    assert.ok(!copy.includes(word), `screening copy uses "${word}"`);
  }
});

test("the perimeter states what was NOT checked, in the same breath", () => {
  assert.match(PERIMETER, /does not verify your counterparty/);
  assert.match(PERIMETER, /not a safe one/);
  assert.match(CONFIRMATION_PERIMETER, /not a guarantee about anyone who contacts you/);
});

test("publishing is never promised a response", () => {
  assert.match(NO_RESPONSE_PROMISE, /findable, not wanted/);
});

test("a listing publishes only when every check is Checked", () => {
  const all = CHECK_ORDER.map((key) => ({ key, label: key, verdict: "checked" as const }));
  assert.equal(mayPublish(all), true);
  assert.equal(checkedCount(all), "3 of 3");

  // One unrun check holds it. Ponte does not publish on an incomplete check.
  const partial = all.map((c, i) => (i === 2 ? { ...c, verdict: "not_run" as const } : c));
  assert.equal(mayPublish(partial), false);
  assert.equal(screeningSettled(partial), true, "not_run is settled, it just did not pass");

  assert.equal(mayPublish(pendingChecks()), false);
  assert.equal(screeningSettled(pendingChecks()), false);
});

/* ------------------------------------------------------------------ *
 * Retention: the part the brief says is most likely to be got wrong
 * ------------------------------------------------------------------ */

test("the retention sentences are verbatim", () => {
  assert.equal(
    SAVED_ANONYMOUS,
    "Saved only in this browser for up to 7 days. Sign in to keep it longer and continue on another device.",
  );
  assert.equal(retentionSentence(false), SAVED_ANONYMOUS);
  assert.equal(retentionSentence(true), SAVED_SIGNED_IN);
});

test("OPENING a draft does not reset the clock; an edit does", () => {
  /*
    The brief: "Opening a draft must not reset the clock. Only a meaningful edit
    or an explicit Keep draft does. That is the part most likely to be
    implemented wrongly by accident."

    It is right that it is the likely accident: the natural implementation
    stamps the clock on every persist, and every screen persists on mount.
  */
  const day = 86_400_000;
  const start = startClock(0);

  const opened = openDraft(start, 40 * day);
  assert.equal(opened.meaningfulAt, 0, "opening a draft moved the horizon");
  assert.equal(opened.touchedAt, 40 * day, "opening a draft did not record the visit");
  assert.equal(daysRemaining(opened, true, 40 * day), 50);

  const navigated = touch(opened, 60 * day);
  assert.equal(navigated.meaningfulAt, 0, "navigating moved the horizon");

  const edited = keep(navigated, 60 * day);
  assert.equal(edited.meaningfulAt, 60 * day, "an edit did not move the horizon");
  assert.equal(daysRemaining(edited, true, 60 * day), 90);
});

test("the warnings fire at 14 and 3 days and keep firing below them", () => {
  const day = 86_400_000;
  const clock = startClock(0);
  assert.equal(warningAt(clock, true, 10 * day), null);
  assert.equal(warningAt(clock, true, 76 * day), 14);
  // The TIGHTEST threshold wins. Read the other way round, a draft with two
  // days left reported the fourteen-day warning: the member is told they have a
  // fortnight on the day before it expires.
  assert.equal(warningAt(clock, true, 88 * day), 3);
  assert.equal(warningAt(clock, true, 89.5 * day), 3);
  // A signed-out draft has a different promise and no warnings to give.
  assert.equal(warningAt(clock, false, 6 * day), null);
});

/* ------------------------------------------------------------------ *
 * The step machine
 * ------------------------------------------------------------------ */

test("the progress rule has five stages and every node sits in one", () => {
  assert.equal(STAGES, 5);
  for (const node of NODES) {
    assert.ok(node.stage >= 1 && node.stage <= STAGES, `${node.node} is outside the rule`);
  }
});

test("a signed-in member never meets the sign-in gate", () => {
  const signedIn = pathFor({ family: "products", signedIn: true });
  assert.ok(!signedIn.includes("gate"), "a signed-in member is walked through a sign-in screen");
  const signedOut = pathFor({ family: "products", signedIn: false });
  assert.ok(signedOut.includes("gate"));
});

test("assets are a product surface and are skipped by the other two families", () => {
  assert.ok(pathFor({ family: "products", signedIn: true }).includes("assets"));
  assert.ok(!pathFor({ family: "services", signedIn: true }).includes("assets"));
  assert.ok(!pathFor({ family: "distribution", signedIn: true }).includes("assets"));
});

test("back goes to a node the member has actually been to", () => {
  const options = { family: "services" as const, signedIn: true };
  // Services skips assets, so preview's back must be listing and not assets.
  assert.equal(backNode("preview", options), "listing");
  assert.equal(backNode("intent", options), null, "there is a way back off the first screen");
  assert.equal(backNode("published", options), null, "a published listing offers a way back");
});

test("every non-terminal node has a forward and the last has none", () => {
  const options = { family: "products" as const, signedIn: false };
  const path = pathFor(options);
  for (const node of path.slice(0, -1)) {
    assert.ok(nextNode(node, options), `${node} has no next`);
  }
  assert.equal(nextNode(path[path.length - 1], options), null);
});

test("the back label names the destination, not the current screen", () => {
  assert.equal(backLabel("capacity", { family: null, signedIn: true }), "Deal intent");
  assert.equal(backLabel("intent", { family: null, signedIn: true }), null);
});

/* ------------------------------------------------------------------ *
 * B06 Assets
 * ------------------------------------------------------------------ */

test("the upload route refuses an unauthenticated session", () => {
  // DECISION-16, and item 11 of the thirteen: ungated document upload.
  const out = uploadPermitted(false);
  assert.equal(out.allowed, false);
  assert.match(out.reason!, /Sign in first/);
  assert.equal(uploadPermitted(true).allowed, true);
});

test("the visibility ladder runs widest to narrowest", () => {
  assert.deepEqual(
    VISIBILITY_LEVELS.map((level) => level.key),
    ["public", "on_accepted_interest", "private"],
  );
  assert.match(VISIBILITY_LEVELS[2].audience, /Only you/);
});

test("an empty asset list has no summary to print", () => {
  assert.equal(assetSummary([]), null);
  assert.equal(
    assetSummary([
      { id: "a", kind: "JPG", name: "a.jpg", bytes: 100, visibility: "public" },
      { id: "b", kind: "PDF", name: "b.pdf", bytes: 100, visibility: "private" },
    ]),
    "2 items · 1 public",
  );
});

console.log(`ok   publish path: ${passed} assertions passed`);
