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

/* eslint-disable import/first */
import CoverageNotice, { coverageValues } from "../../../components/find/CoverageNotice";
import { mount } from "../../landing/__tests__/render";
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
