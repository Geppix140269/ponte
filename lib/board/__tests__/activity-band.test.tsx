// The recent market activity band: what it claims, and what it does with a
// keyboard and reduced motion.
//
// Run: npx tsx --tsconfig tsconfig.ui-test.json lib/board/__tests__/activity-band.test.tsx
//
// The local development database is usually empty, so this is where the band's
// behaviour with real-shaped records is actually proven.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

/* eslint-disable import/first */
import ActivityBand from "../../../components/home/landing/ActivityBand";
import RecordList from "../../../components/explore/RecordList";
import { toBandItem, toBandItems, geographyOf, daysBetween } from "../activity-view";
import type { ActivityLabels } from "../activity-view";
import { fromDeal, fromSignal, type ActivityItem } from "../activity-logic";
import { mount, type Mounted, type TestElement } from "../../landing/__tests__/render";
/* eslint-enable import/first */

const tests: { name: string; fn: () => void }[] = [];
function test(name: string, fn: () => void): void {
  tests.push({ name, fn });
}

const NOW = Date.parse("2026-07-25T12:00:00Z");

const LABELS: ActivityLabels = {
  kind: {
    market_signal: "Market Signal",
    member_requirement: "Member Requirement",
    member_offer: "Member Offer",
    service_requirement: "Service Requirement",
  },
  route: (from, to) => `${from} to ${to}`,
  today: "Today",
  daysAgo: (days) => `${days} days ago`,
};

function item(over: Partial<ActivityItem> = {}): ActivityItem {
  return {
    key: "deal:1",
    kind: "member_requirement",
    product: "Almonds",
    chapter: "08",
    originText: null,
    destinationText: "United Arab Emirates",
    scope: "500 MT",
    at: "2026-07-22T12:00:00Z",
    href: "/marketplace/l/PT-0001",
    ...over,
  };
}

/** Every string rendered in a tree, so a claim cannot hide in a nested span. */
function textOf(tree: Mounted): string {
  return tree
    .all()
    .flatMap((el: TestElement) => Object.values(el.props))
    .filter((v): v is string => typeof v === "string")
    .join(" ");
}

/**
 * The renderer deliberately does not descend into child components, so a row
 * appears in the band's tree as an element carrying its props. Mounting each
 * one is how the row's own markup gets read.
 */
function rowsOf(tree: Mounted): Mounted[] {
  return tree
    .all()
    .filter((el) => typeof el.type === "function" && "item" in el.props)
    .map((el) => mount(el.type as (p: unknown) => unknown, el.props));
}

function rowText(tree: Mounted): string {
  return rowsOf(tree).map(textOf).join(" ");
}

// ---- the view model ---------------------------------------------------------

test("recency is stated in whole days, computed once on the server", () => {
  assert.equal(daysBetween("2026-07-25T01:00:00Z", NOW), 0);
  assert.equal(daysBetween("2026-07-22T12:00:00Z", NOW), 3);
  // A record stamped slightly in the future (clock skew) is not "-1 days ago".
  assert.equal(daysBetween("2026-07-26T00:00:00Z", NOW), 0);
});

test("geography uses only the ends the record states", () => {
  assert.equal(geographyOf({ originText: "India", destinationText: "Netherlands" }, LABELS), "India to Netherlands");
  assert.equal(geographyOf({ originText: null, destinationText: "UAE" }, LABELS), "UAE");
  assert.equal(geographyOf({ originText: "Spain", destinationText: null }, LABELS), "Spain");
  assert.equal(geographyOf({ originText: null, destinationText: null }, LABELS), null);
});

test("the band item carries the record's own class label", () => {
  assert.equal(toBandItem(item(), NOW, LABELS).kindLabel, "Member Requirement");
  assert.equal(
    toBandItem(item({ kind: "market_signal" }), NOW, LABELS).kindLabel,
    "Market Signal",
  );
});

// ---- the band ---------------------------------------------------------------

function band(items: ActivityItem[]): Mounted {
  return mount(ActivityBand as unknown as (p: unknown) => unknown, {
    items: toBandItems(items, NOW, LABELS),
    labels: { title: "Recent market activity", note: "Not every record is confirmed." },
  });
}

test("an empty band renders nothing rather than claiming an empty market", () => {
  assert.equal(band([]).tree, null);
});

test("every row prints its classification as words", () => {
  const text = rowText(band([item(), item({ key: "signal:1", kind: "market_signal" })]));
  assert.ok(text.includes("Member Requirement"));
  assert.ok(text.includes("Market Signal"));
});

test("the band never claims a record is verified", () => {
  const text = rowText(band([item()])).toLowerCase();
  for (const claim of ["verified", "qualified", "guaranteed", "safe"]) {
    assert.ok(!text.includes(claim), `the band says "${claim}"`);
  }
});

test("the looping copy is hidden from assistive tech and holds no link", () => {
  const tree = band([item()]);
  const echo = tree.find(
    (el) => String(el.props.className ?? "") === "aband__echo",
    "echo track",
  );
  assert.equal(echo.props["aria-hidden"], "true");

  const echoTree = mount(() => echo.props.children, {});
  for (const el of echoTree.all()) {
    assert.notEqual(el.type, "a", "the echo copy must not be focusable");
    assert.ok(
      !String(el.props.className ?? "").includes("aband__i--link"),
      "the echo copy must not be a link",
    );
  }
});

test("a record with no public detail gets no link rather than a dead one", () => {
  assert.ok(rowText(band([item()])).includes("aband__i--link"));
  assert.ok(!rowText(band([item({ href: null })])).includes("aband__i--link"));
});

test("the band pauses on hover and on keyboard focus, and stops under reduced motion", () => {
  const css = readFileSync("components/home/landing/landing.css", "utf8");
  assert.ok(css.includes(".aband__vp:hover .aband__track"), "no pause on hover");
  assert.ok(css.includes(".aband__vp:focus-within .aband__track"), "no pause on focus");
  const reduced = css.slice(css.indexOf("@media (prefers-reduced-motion: reduce)"));
  assert.ok(reduced.includes(".aband__track"), "the band still animates under reduced motion");
  assert.ok(reduced.includes("animation: none"), "the animation is not dropped");
});

// ---- the Explore record list ------------------------------------------------

test("a market record shows its class, product and only the stated facts", () => {
  const list = mount(RecordList as unknown as (p: unknown) => unknown, {
    items: toBandItems(
      [fromDeal({
        id: "d1",
        ref: null,
        source: "member",
        type: "service",
        product: "Ocean freight",
        hsCode: null,
        chapter: null,
        chapterTitle: null,
        quantity: null,
        unit: null,
        incoterm: null,
        payment: null,
        originText: "India",
        destinationText: "Netherlands",
        originCode: "IN",
        destinationCode: "NL",
        postedAt: "2026-07-25T09:00:00Z",
        verificationLevel: null,
        href: null,
      })],
      NOW,
      LABELS,
    ),
    labels: { view: "View", listLabel: "Market records" },
  });

  const text = textOf(list);
  assert.ok(text.includes("Service Requirement"));
  assert.ok(text.includes("Ocean freight"));
  assert.ok(text.includes("India to Netherlands"));
  // No quantity was posted, so no quantity is printed and no "View" is offered
  // for a record that has no public detail page.
  assert.ok(!text.includes("View"), "a record with no detail must not offer one");
});

test("a signal in the Explore list links to its own public detail", () => {
  const list = mount(RecordList as unknown as (p: unknown) => unknown, {
    items: toBandItems(
      [fromSignal({
        id: "s1",
        canonicalId: null,
        side: "requirement",
        product: "Almonds",
        hsCode: "0802.11",
        chapter: "08",
        chapterTitle: null,
        quantity: "200",
        unit: "MT",
        incoterm: null,
        payment: null,
        originText: null,
        destinationText: "UAE",
        originCode: null,
        destinationCode: "AE",
        spottedAt: "2026-07-25T09:00:00Z",
        publicExpiresAt: null,
        status: "approved_signal",
        description: null,
        summaryLine: null,
      })],
      NOW,
      LABELS,
    ),
    labels: { view: "View", listLabel: "Market records" },
  });

  const text = textOf(list);
  assert.ok(text.includes("Market Signal"));
  assert.ok(text.includes("/market-signals/s1"));
  assert.ok(text.includes("200 MT"));
});

let passed = 0;
for (const t of tests) {
  try {
    t.fn();
    passed++;
  } catch (err) {
    console.error(`FAIL  ${t.name}`);
    console.error(`      ${(err as Error).message}`);
    process.exitCode = 1;
  }
}
console.log(`\n${passed}/${tests.length} passed`);
