// Partial classification coverage, as a member sees it.
//
// Run: npx tsx --tsconfig tsconfig.ui-test.json lib/board/__tests__/coverage.test.tsx
//
// This branch cannot be reached on a live page today: no published record
// carries a category, so every category filter lands in `unclassified` instead.
// It becomes reachable the moment the first record is classified, and stays
// reachable until the last one is, which is where the product will live for a
// while. A state that ships untested because the data has not caught up with it
// is a state that will be wrong when it does.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

/* eslint-disable import/first */
import CoverageNotice, { coverageValues } from "../../../components/find/CoverageNotice";
import { mount } from "../../landing/__tests__/render";
import { presentBoard } from "../presentation";
import { hasActiveFilters, parseFindQuery } from "../../find/query";
/* eslint-enable import/first */

const tests: { name: string; fn: () => void }[] = [];
function test(name: string, fn: () => void): void {
  tests.push({ name, fn });
}

/** The real English copy, so the assertions are about what a member reads. */
const MESSAGES = JSON.parse(
  require("node:fs").readFileSync("messages/en.json", "utf8"),
).find.partial as Record<string, string>;

/** Interpolate ICU-style {name} placeholders, as next-intl would. */
function fill(template: string, values: Record<string, number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) =>
    key in values ? String(values[key]) : `{${key}}`,
  );
}

function labelsFor(coverage: { classified: number; eligible: number }) {
  const values = coverageValues(coverage);
  return {
    badge: MESSAGES.badge,
    heading: fill(MESSAGES.heading, values),
    body: fill(MESSAGES.body, values),
    emptyHeading: MESSAGES.emptyHeading,
    emptyBody: fill(MESSAGES.emptyBody, values),
  };
}

function render(coverage: { classified: number; eligible: number }, empty: boolean): string {
  const page = mount(CoverageNotice as unknown as (p: unknown) => unknown, {
    coverage,
    empty,
    labels: labelsFor(coverage),
  });
  return page
    .all()
    .map((el) => el.props.children)
    .filter((c): c is string => typeof c === "string")
    .join(" | ");
}

// ---------------------------------------------------------------------------
// The numbers
// ---------------------------------------------------------------------------

test("the unclassified figure is derived, so the three cannot disagree", () => {
  assert.deepEqual(coverageValues({ classified: 12, eligible: 3491 }), {
    classified: 12,
    eligible: 3491,
    unclassified: 3479,
  });
});

test("a classified count above the eligible count never prints a negative", () => {
  // The two counts are separate reads and could in principle race. A page that
  // printed "-4 were not searched" would be worse than one that printed zero.
  assert.equal(coverageValues({ classified: 10, eligible: 4 }).unclassified, 0);
});

// ---------------------------------------------------------------------------
// What the member actually reads
// ---------------------------------------------------------------------------

test("a partial result states both numbers", () => {
  const text = render({ classified: 12, eligible: 3491 }, false);
  assert.ok(text.includes("12"), text);
  assert.ok(text.includes("3491"), text);
  assert.ok(text.includes("Partial coverage"), text);
});

test("an empty partial result is never presented as no match", () => {
  // The whole point. "No match" over a partly classified inventory is a
  // conclusion about the market drawn from a fraction of it.
  const text = render({ classified: 12, eligible: 3491 }, true);
  assert.ok(
    text.indexOf("No match among the records Ponte can filter") >= 0,
    `the empty wording is not qualified: ${text}`,
  );
  assert.ok(
    text.indexOf("were not searched") >= 0 || text.indexOf("not searched") >= 0,
    `the empty state does not say what was left out: ${text}`,
  );
  // And it says how much was left out, rather than gesturing at it.
  assert.ok(text.includes("3479"), text);
});

test("the empty and non-empty wordings are different", () => {
  const full = render({ classified: 12, eligible: 3491 }, false);
  const empty = render({ classified: 12, eligible: 3491 }, true);
  assert.notEqual(full, empty);
});

test("the state is marked in the markup, so a page test can see it", () => {
  const page = mount(CoverageNotice as unknown as (p: unknown) => unknown, {
    coverage: { classified: 1, eligible: 2 },
    empty: true,
    labels: labelsFor({ classified: 1, eligible: 2 }),
  });
  const root = page.all()[0];
  assert.equal(root.props["data-coverage"], "partial-empty");
});

// ---------------------------------------------------------------------------
// Coverage that could not be established at all
// ---------------------------------------------------------------------------

const UNKNOWN = JSON.parse(
  require("node:fs").readFileSync("messages/en.json", "utf8"),
).find.coverageUnknown as Record<string, string>;

function renderUnknown(empty: boolean): { text: string; marker: unknown } {
  const page = mount(CoverageNotice as unknown as (p: unknown) => unknown, {
    empty,
    labels: {
      badge: UNKNOWN.badge,
      heading: UNKNOWN.heading,
      body: UNKNOWN.body,
      emptyHeading: UNKNOWN.emptyHeading,
      emptyBody: UNKNOWN.emptyBody,
    },
  });
  return {
    text: page
      .all()
      .map((el) => el.props.children)
      .filter((c): c is string => typeof c === "string")
      .join(" | "),
    marker: page.all()[0].props["data-coverage"],
  };
}

test("an unmeasurable coverage renders without inventing numbers", () => {
  // A notice with no figures must not read as a notice claiming zero, so the
  // copy for this state carries no placeholders at all.
  const { text } = renderUnknown(false);
  assert.ok(!/\{\w+\}/.test(text), `an uninterpolated placeholder reached the page: ${text}`);
  assert.ok(!/\b\d+\b/.test(text), `a number appeared where none was measured: ${text}`);
  assert.ok(text.includes("Coverage not established"), text);
});

test("an empty unmeasurable result is not presented as no match either", () => {
  // The same rule as partial coverage, for the same reason: an empty result is
  // the one a member is most likely to act on, and this one is not a finding.
  const { text } = renderUnknown(true);
  assert.ok(text.includes("cannot confirm what was searched"), text);
  assert.ok(
    text.includes("not a finding that the market is empty"),
    `the empty unknown state reads as a finding: ${text}`,
  );
});

test("the two non-conclusive states are distinguishable in the markup", () => {
  // A page test, and a reader, must be able to tell "some of it" from "amount
  // unknown". Collapsing them would hide which one is being shown.
  assert.equal(renderUnknown(false).marker, "unknown");
  assert.equal(renderUnknown(true).marker, "unknown-empty");

  const partial = mount(CoverageNotice as unknown as (p: unknown) => unknown, {
    coverage: { classified: 1, eligible: 2 },
    empty: false,
    labels: labelsFor({ classified: 1, eligible: 2 }),
  });
  assert.equal(partial.all()[0].props["data-coverage"], "partial");
});

// ---------------------------------------------------------------------------
// Which state may claim an emptiness
// ---------------------------------------------------------------------------
//
// The bug this pins was real and shipped: the Market Signals board tested
// `records.length === 0` BEFORE it reached the coverage notices, so an empty
// partial result rendered "No signal is currently live on the public board", a
// conclusive claim about the whole board, and the notice explaining the
// filter's blind spot was unreachable exactly when it mattered most.
//
// The rule was right; its position in a ternary chain was not. So the decision
// is a table, and this is the table.

/** A narrowed search, which is what every filtered surface passes. */
const FILTERED = { filtered: true };
/** An unnarrowed board: nothing was asked of it. */
const WHOLE = { filtered: false };

test("an empty partial result never renders the genuine-empty copy", () => {
  const p = presentBoard("partial", 0, FILTERED);
  assert.equal(p.genuineEmpty, null, "an empty partial claimed the market is empty");
  assert.equal(p.coverageNotice, "partial", "the coverage notice was skipped when it mattered most");
  assert.equal(p.records, false);
});

test("an empty coverage_unknown result never renders the genuine-empty copy", () => {
  const p = presentBoard("coverage_unknown", 0, FILTERED);
  assert.equal(p.genuineEmpty, null, "an empty unknown-coverage result claimed the market is empty");
  assert.equal(p.coverageNotice, "unknown");
  assert.equal(p.records, false);
});

test("an empty ok result DOES render a genuine-empty copy", () => {
  // The other half. A state that could see everything and found nothing is
  // entitled to say so, and suppressing that would be its own defect.
  const p = presentBoard("ok", 0, WHOLE);
  assert.equal(p.genuineEmpty, "board");
  assert.equal(p.coverageNotice, null);
  assert.equal(p.records, false);
});

// ---------------------------------------------------------------------------
// WHICH emptiness. An empty market and an empty answer are different facts.
// ---------------------------------------------------------------------------

test("an unfiltered empty board may say the board is empty", () => {
  // Nothing was asked of it, so "nothing is live" is the whole truth.
  assert.equal(presentBoard("ok", 0, WHOLE).genuineEmpty, "board");
});

test("a filtered empty result must NOT say the board is empty", () => {
  // The board may be full. Printing the whole-board claim here tells a member
  // the market is dead when they asked about one corner of it, and that is the
  // more damaging of the two to get wrong.
  assert.notEqual(
    presentBoard("ok", 0, FILTERED).genuineEmpty,
    "board",
    "a filtered empty result claimed the whole board is empty",
  );
});

test("a filtered empty result says the FILTERS matched nothing", () => {
  assert.equal(presentBoard("ok", 0, FILTERED).genuineEmpty, "filters");
});

test("the scope only decides which emptiness, never whether there is one", () => {
  // A search that found records says nothing about emptiness either way, and a
  // non-conclusive state stays non-conclusive however the search was narrowed.
  for (const scope of [WHOLE, FILTERED]) {
    assert.equal(presentBoard("ok", 3, scope).genuineEmpty, null);
    assert.equal(presentBoard("partial", 0, scope).genuineEmpty, null);
    assert.equal(presentBoard("coverage_unknown", 0, scope).genuineEmpty, null);
    assert.equal(presentBoard("unclassified", 0, scope).genuineEmpty, null);
    assert.equal(presentBoard("unavailable", 0, scope).genuineEmpty, null);
  }
});

test("partial and coverage_unknown are unchanged by the scope", () => {
  // The behaviour accepted in the previous round must not have moved.
  for (const scope of [WHOLE, FILTERED]) {
    for (const count of [0, 1, 60]) {
      const partial = presentBoard("partial", count, scope);
      assert.equal(partial.coverageNotice, "partial");
      assert.equal(partial.genuineEmpty, null);
      assert.equal(partial.records, count > 0);

      const unknown = presentBoard("coverage_unknown", count, scope);
      assert.equal(unknown.coverageNotice, "unknown");
      assert.equal(unknown.genuineEmpty, null);
      assert.equal(unknown.records, count > 0);
    }
  }
});

test("a coverage notice never depends on whether records came back", () => {
  // Gating the notice on results is the shape of the original ordering bug.
  for (const count of [0, 1, 60]) {
    assert.equal(presentBoard("partial", count, FILTERED).coverageNotice, "partial", `count ${count}`);
    assert.equal(
      presentBoard("coverage_unknown", count, FILTERED).coverageNotice,
      "unknown",
      `count ${count}`,
    );
  }
});

test("no state both shows records and claims the market is empty", () => {
  for (const state of ["ok", "partial", "coverage_unknown", "unclassified", "unavailable"] as const) {
    for (const count of [0, 1, 60]) {
      for (const scope of [WHOLE, FILTERED]) {
        const p = presentBoard(state, count, scope);
        assert.ok(!(p.records && p.genuineEmpty), `${state}/${count} does both`);
        // The two head states are exclusive of everything else, because each
        // replaces the result entirely rather than annotating it.
        if (p.unavailable || p.unclassified) {
          assert.equal(p.records, false, `${state} renders records`);
          assert.equal(p.genuineEmpty, null, `${state} claims emptiness`);
          assert.equal(p.coverageNotice, null, `${state} also shows a coverage notice`);
        }
      }
    }
  }
});

test("only ok can ever claim any emptiness, at any record count", () => {
  const claiming = (["ok", "partial", "coverage_unknown", "unclassified", "unavailable"] as const)
    .filter((state) =>
      [0, 1, 60].some((count) =>
        [WHOLE, FILTERED].some((scope) => presentBoard(state, count, scope).genuineEmpty !== null),
      ),
    );
  assert.deepEqual(claiming, ["ok"]);
});

test("records render whenever there are any, except where the state replaces them", () => {
  assert.equal(presentBoard("ok", 3, FILTERED).records, true);
  assert.equal(presentBoard("partial", 3, FILTERED).records, true);
  assert.equal(presentBoard("coverage_unknown", 3, FILTERED).records, true);
  // These two are explanations, not annotated results: there is nothing to show.
  assert.equal(presentBoard("unclassified", 3, FILTERED).records, false);
  assert.equal(presentBoard("unavailable", 3, FILTERED).records, false);
});

test("a search is narrowed by any dimension, not only a canonical key", () => {
  // A member who narrowed by direction or by a product word and got nothing
  // back has still narrowed, and "the board is empty" would be just as untrue.
  assert.equal(hasActiveFilters(parseFindQuery({})), false);
  for (const params of [
    { family: "services" },
    { family: "services", serviceCategory: "freight" },
    { partnerType: "distributor" },
    { sector: "food" },
    { territory: "IT" },
    { product: "sugar" },
    { intent: "offer" },
    { market: "Italy" },
    { origin: "Brazil" },
    { minQty: "500" },
  ]) {
    assert.equal(
      hasActiveFilters(parseFindQuery(params)),
      true,
      `${JSON.stringify(params)} was not read as a narrowed search`,
    );
  }
  // Junk is not a filter: it narrows nothing, so it must not turn a whole-board
  // emptiness into a filtered one.
  assert.equal(hasActiveFilters(parseFindQuery({ serviceCategory: "banana" })), false);
});

/**
 * The board, as source.
 *
 * The route and its renderer were split so that a development gallery could
 * render the shipped markup over fixtures. "The board" is therefore two files,
 * and a test asserting what a member is shown has to read both or it starts
 * passing for the wrong reason.
 */
function boardSource(): string {
  return (
    readFileSync("app/[locale]/market-signals/page.tsx", "utf8") +
    readFileSync("components/desk/SignalBoard.tsx", "utf8")
  );
}

test("both surfaces read the same table, and the board passes its scope", () => {
  // A rule that held on one page and not the other is how this went wrong the
  // first time: the Find lanes were correct and the board was not.
  const board = boardSource();
  const find = readFileSync("app/[locale]/find/page.tsx", "utf8");
  for (const [name, src] of [["market-signals", board], ["find", find]] as const) {
    assert.ok(src.includes("presentBoard("), `${name} does not use the shared table`);
    assert.ok(src.includes("genuineEmpty"), `${name} decides its empty state some other way`);
  }
  // The board renders both copies, chosen by the table rather than by itself.
  assert.ok(board.includes('genuineEmpty === "board"'), "the board has no whole-board copy");
  assert.ok(board.includes('genuineEmpty === "filters"'), "the board has no filtered-empty copy");
  assert.ok(board.includes("hasActiveFilters(q)"), "the board does not tell the table its scope");
  // And it no longer short-circuits on an empty result before the notices,
  // which is the exact line that caused the ordering bug.
  assert.ok(
    !/\) : records\.length === 0 \? \(/.test(board),
    "the board still tests records.length before reaching the coverage notices",
  );
});

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

let failed = 0;
for (const { name, fn } of tests) {
  try {
    fn();
    console.log(`ok   ${name}`);
  } catch (error) {
    failed++;
    console.error(`FAIL ${name}`);
    console.error(`     ${(error as Error).message.split("\n").join("\n     ")}`);
  }
}
console.log(`\n${tests.length - failed}/${tests.length} coverage checks passed`);
if (failed > 0) process.exit(1);
