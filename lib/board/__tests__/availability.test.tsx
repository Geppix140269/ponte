// Which filters a member is offered, and why a taxonomy is not one.
//
// Run: npx tsx --tsconfig tsconfig.ui-test.json lib/board/__tests__/availability.test.tsx
//
// The defect: the family panel was built from `MARKET_FAMILIES`, which lists all
// three families because all three are accepted product authority. The public
// inventory holds product signals and nothing else, so the page offered Trade
// services and Distribution, and choosing either produced a box explaining
// canonical category columns, historical rows and coverage probes to a customer.
//
// Two things are asserted here. That the controls are drawn from a measurement
// of live eligible inventory, and that no customer-facing surface explains
// Ponte's classification implementation.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

/* eslint-disable import/first */
import SignalFilters from "../../../components/desk/SignalFilters";
import SignalBoard from "../../../components/desk/SignalBoard";
import { mount, type TestElement } from "../../landing/__tests__/render";
import {
  availableFamilies,
  showFamilySelector,
  familyHasInventory,
  familyCount,
  axisForFamily,
  noFamilyInventory,
  FAMILY_KEYS,
  type FamilyAvailability,
} from "../availability";
import { parseFindQuery, type FindQuery } from "../../find/query";
import type { MarketSignal } from "../../market-signals/logic";
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

const Q = (sp: Record<string, string> = {}): FindQuery => parseFindQuery(sp);

/** One live signal, so the records branch has something to render. */
const A_SIGNAL: MarketSignal = {
  id: "00000000-0000-4000-8000-000000000001",
  canonicalId: "EXT-FIX-000001",
  side: "requirement",
  product: "Milling wheat",
  hsCode: "1001.99",
  chapter: "10",
  chapterTitle: null,
  quantity: "3000",
  unit: "MT",
  incoterm: null,
  payment: null,
  originText: "France",
  destinationText: "Egypt",
  originCode: "FR",
  destinationCode: "EG",
  spottedAt: "2026-07-10T00:00:00Z",
  publicExpiresAt: "2026-09-10T00:00:00Z",
  status: "approved_signal",
  description: null,
  summaryLine: null,
  category: "Cereals",
};

/** An availability, written the way the tests read. */
const have = (over: Partial<FamilyAvailability>): FamilyAvailability => ({
  ...noFamilyInventory(),
  ...over,
});

function render(q: FindQuery, availability: FamilyAvailability | null, axis: number | null) {
  const mounted = mount(SignalFilters as unknown as (p: unknown) => unknown, {
    q,
    availability,
    axisClassified: axis,
  });
  return mounted;
}

/** Every option label the panel offers, across all its lists. */
function options(q: FindQuery, availability: FamilyAvailability | null, axis: number | null): string[] {
  const mounted = render(q, availability, axis);
  const out: string[] = [];
  for (const el of mounted.all() as TestElement[]) {
    const items = el.props.items;
    if (!Array.isArray(items)) continue;
    for (const item of items as Array<{ label?: string }>) {
      if (typeof item.label === "string") out.push(item.label);
    }
  }
  return out;
}

/** Every legend the panel renders. */
function legends(q: FindQuery, availability: FamilyAvailability | null, axis: number | null): string[] {
  return (render(q, availability, axis).all() as TestElement[])
    .map((el) => el.props.legend)
    .filter((l): l is string => typeof l === "string");
}

const rendersNothing = (q: FindQuery, a: FamilyAvailability | null, axis: number | null) =>
  render(q, a, axis).tree === null;

// ---------------------------------------------------------------------------
// The rule
// ---------------------------------------------------------------------------

test("only families with live classified inventory are available", () => {
  assert.deepEqual(availableFamilies(have({ products: 3 })), ["products"]);
  assert.deepEqual(availableFamilies(have({ products: 3, services: 1 })), ["products", "services"]);
  assert.deepEqual(availableFamilies(have({ products: 3, distribution: 2 })), [
    "products",
    "distribution",
  ]);
  assert.deepEqual(availableFamilies(have({ products: 1, services: 1, distribution: 1 })), [
    ...FAMILY_KEYS,
  ]);
  assert.deepEqual(availableFamilies(noFamilyInventory()), []);
});

test("an unmeasurable availability offers no filter and claims no emptiness", () => {
  // Fail closed on the optional control, open on the board. A failed count is
  // not evidence that a market is empty.
  assert.deepEqual(availableFamilies(null), []);
  assert.equal(showFamilySelector(null), false);
  assert.equal(familyCount(null, "services"), null);
  assert.equal(
    familyHasInventory(null, "services"),
    true,
    "an unknown count was resolved into a claim that the market is empty",
  );
});

test("a selector needs a choice to be a filter", () => {
  // One usable option asks a member to choose between a set and itself.
  assert.equal(showFamilySelector(have({ products: 3 })), false);
  assert.equal(showFamilySelector(have({ products: 3, services: 1 })), true);
  assert.equal(showFamilySelector(noFamilyInventory()), false);
});

test("each family names the axis its own category controls read", () => {
  assert.equal(axisForFamily("services"), "service_category_key");
  assert.equal(axisForFamily("distribution"), "distribution_partner_type_key");
  assert.equal(axisForFamily("products"), "product_sector_key");
});

// ---------------------------------------------------------------------------
// The rendered panel, case by case
// ---------------------------------------------------------------------------

test("products only: no family panel at all", () => {
  // Today's production condition. The page goes from the search straight into
  // the results.
  assert.ok(rendersNothing(Q(), have({ products: 3458 }), null), "a pointless selector rendered");
});

test("products and services: three options, and distribution is absent", () => {
  const a = have({ products: 3000, services: 40 });
  const labels = options(Q(), a, null);
  assert.deepEqual(labels, ["Products", "Trade services", "All signals"]);
  assert.ok(!labels.includes("Distribution and representation"), "an empty family was offered");
  // Absent, not disabled: nothing renders a greyed or "coming soon" control.
  const mounted = render(Q(), a, null);
  for (const el of mounted.all() as TestElement[]) {
    assert.ok(!el.props.disabled, "a filter was rendered disabled");
  }
});

test("products and distribution: trade services is absent", () => {
  const labels = options(Q(), have({ products: 3000, distribution: 12 }), null);
  assert.deepEqual(labels, ["Products", "Distribution and representation", "All signals"]);
  assert.ok(!labels.includes("Trade services"));
});

test("all three families: all four options", () => {
  const labels = options(Q(), have({ products: 3000, services: 40, distribution: 12 }), null);
  assert.deepEqual(labels, [
    "Products",
    "Trade services",
    "Distribution and representation",
    "All signals",
  ]);
});

test("no inventory at all: no selector", () => {
  assert.ok(rendersNothing(Q(), noFamilyInventory(), null));
  assert.ok(rendersNothing(Q(), null, null), "an unmeasurable availability drew a selector");
});

test("the selector is named for what a member is choosing", () => {
  const shown = legends(Q(), have({ products: 3000, services: 40 }), null);
  assert.ok(shown.includes("Filter by opportunity type"), `legends were ${shown.join(" / ")}`);
  assert.ok(!shown.includes("Filter by market"), "the superseded legend is still rendered");
});

test("the all-families option is named All signals", () => {
  const labels = options(Q(), have({ products: 3000, services: 40 }), null);
  assert.ok(labels.includes("All signals"));
  assert.ok(!labels.includes("Every market"), "the superseded label is still rendered");
});

// ---------------------------------------------------------------------------
// A family's own category axis
// ---------------------------------------------------------------------------

test("a category list is not drawn over an unclassified axis", () => {
  // A hundred and twenty trade-service subcategories that every one return
  // nothing is not a narrowing control.
  const a = have({ products: 3000, services: 40 });
  const q = Q({ family: "services" });
  assert.ok(
    !legends(q, a, 0).some((l) => l.includes("trade service category")),
    "a category list was drawn with nothing classified on its axis",
  );
  assert.ok(
    !legends(q, a, null).some((l) => l.includes("trade service category")),
    "an unmeasurable axis drew its category list",
  );
  // And it appears the moment something is classified there.
  assert.ok(
    legends(q, a, 9).some((l) => l.includes("trade service category")),
    "a classified axis did not draw its list",
  );
});

test("the same rule governs every family's axis", () => {
  const all = have({ products: 3000, services: 40, distribution: 12 });
  const cases: Array<[string, string]> = [
    ["products", "product sector"],
    ["distribution", "partner type"],
  ];
  for (const [family, fragment] of cases) {
    const q = Q({ family });
    assert.ok(!legends(q, all, 0).some((l) => l.includes(fragment)), `${family} drew an empty axis`);
    assert.ok(legends(q, all, 9).some((l) => l.includes(fragment)), `${family} hid a usable axis`);
  }
});

test("a single family with a classified axis still draws no family selector", () => {
  // The two controls are independent: one family is not a choice, but its
  // categories may still be worth narrowing by.
  const q = Q({ family: "products" });
  const shown = legends(q, have({ products: 3458 }), 9);
  assert.ok(!shown.includes("Filter by opportunity type"), "a one-family selector rendered");
  assert.ok(shown.some((l) => l.includes("product sector")), "the usable axis was hidden");
});

// ---------------------------------------------------------------------------
// No customer-facing implementation detail
// ---------------------------------------------------------------------------

/**
 * The board, rendered, as one string of everything a member would read.
 *
 * Rendered rather than pattern-matched out of the source. An earlier version of
 * this check scanned the file for text between tags and flagged
 * `) : presentation.unclassified ? (` — a fragment of a ternary that happens to
 * sit between a closing and an opening tag. A copy rule enforced against source
 * text ends up demanding that identifiers be renamed, which is the wrong thing
 * to change.
 */
function boardText(over: Partial<Record<string, unknown>> = {}): string {
  const mounted = mount(SignalBoard as unknown as (p: unknown) => unknown, {
    q: Q(),
    board: { state: "ok", signals: [], total: 0, offset: 0, ordering: "newest", rankedFully: true },
    everything: 3458,
    availability: have({ products: 3458 }),
    axisClassified: null,
    ...over,
  });
  const out: string[] = [];
  const walk = (node: unknown): void => {
    if (typeof node === "string" || typeof node === "number") {
      out.push(String(node));
      return;
    }
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    if (node && typeof node === "object" && "props" in (node as TestElement)) {
      const el = node as TestElement;
      // Accessible names are read out loud, so they are customer copy too.
      for (const key of ["label", "aria-label", "legend", "placeholder"]) {
        const value = el.props[key];
        if (typeof value === "string") out.push(value);
      }
      walk(el.props.children);
    }
  };
  walk(mounted.tree);
  return out.join(" | ");
}

/** Every state a kept URL can land a member in, rendered. */
function everyBoardState(): string {
  return [
    // A family with nothing live, for each family.
    ...(["products", "services", "distribution"] as const).map((family) =>
      boardText({ q: Q({ family }), availability: noFamilyInventory() }),
    ),
    // An axis with nothing classified and no family to name.
    boardText({
      q: Q({ territory: "DE" }),
      board: { state: "unclassified", reason: "nothing_classified", eligible: 3458 },
    }),
    boardText({
      q: Q({ territory: "DE" }),
      board: { state: "unclassified", reason: "columns_absent", eligible: null },
    }),
    // A partial coverage, which used to print its own measurement.
    boardText({
      q: Q({ family: "products" }),
      availability: have({ products: 3000, services: 40 }),
      board: {
        state: "partial",
        signals: [],
        total: 0,
        offset: 0,
        coverage: { classified: 12, eligible: 3458 },
        ordering: "newest",
        rankedFully: true,
      },
    }),
    // An unmeasurable coverage.
    boardText({
      q: Q({ family: "products" }),
      availability: have({ products: 3000, services: 40 }),
      board: {
        state: "coverage_unknown",
        signals: [],
        total: 0,
        offset: 0,
        ordering: "newest",
        rankedFully: true,
      },
    }),
    // A failed read.
    boardText({ board: { state: "unavailable" } }),
  ].join(" | ");
}

test("the technical classification box is gone from the public journey", () => {
  const rendered = everyBoardState();
  for (const gone of [
    "Ponte cannot filter signals by this category yet",
    "gap in what Ponte has classified",
    "Ponte cannot confirm how much of the board this filter searched",
    "The category fields are not yet live on the database",
    "carries a category in this taxonomy",
    "This filter can see",
  ]) {
    assert.ok(!rendered.includes(gone), `the public journey still renders: ${gone}`);
  }
  // And no parallel copy survives anywhere in the board's own source.
  const src = readFileSync("components/desk/SignalBoard.tsx", "utf8");
  assert.ok(!src.includes("Ponte cannot filter"), "a parallel version remains in the source");
});

test("no rendered word explains the classification implementation", () => {
  const rendered = everyBoardState();
  for (const word of [
    "taxonomy",
    "classified",
    "classification",
    "coverage",
    "migration",
    "database",
    "column",
    "backfill",
  ]) {
    assert.ok(
      !new RegExp(word, "i").test(rendered),
      `"${word}" reaches a customer. Move the explanation into a comment or a log.`,
    );
  }
});

test("every family with no live inventory gets its own commercial state", () => {
  const cases: Array<[string, string, string]> = [
    ["products", "No live product signals are currently available", "Post a product opportunity"],
    ["services", "No live trade-service signals are currently available", "Post a trade-service opportunity"],
    ["distribution", "No live distribution opportunities are currently available", "Post a distribution opportunity"],
  ];
  for (const [family, heading, action] of cases) {
    const rendered = boardText({ q: Q({ family }), availability: noFamilyInventory() });
    assert.ok(rendered.includes(heading), `${family} is missing its heading`);
    assert.ok(rendered.includes(action), `${family} is missing its creation action`);
    assert.ok(rendered.includes("View all signals"), `${family} offers no route back`);
  }
});

test("an unmeasurable availability never claims a family is empty", () => {
  // Fail closed on the filter, open on the board. A failed count must not become
  // "this market is empty", which is a finding Ponte did not make.
  const rendered = boardText({ q: Q({ family: "services" }), availability: null });
  assert.ok(
    !rendered.includes("No live trade-service signals are currently available"),
    "a failed measurement was printed as an empty market",
  );
});

test("an availability failure does not suppress the unfiltered board", () => {
  // Fail closed on the optional filter, open on the board itself. A member whose
  // availability read failed still sees every signal and a truthful count.
  const rendered = boardText({
    availability: null,
    board: {
      state: "ok",
      signals: [A_SIGNAL],
      total: 3458,
      offset: 0,
      ordering: "newest",
      rankedFully: true,
    },
  });
  assert.ok(rendered.includes("3,458"), "the board's own count was suppressed by a failed count");
  assert.ok(
    !rendered.includes("No live"),
    "a failed availability read printed an empty-market claim",
  );
});

test("a product-only board renders its records with no family panel", () => {
  // Today's production condition, end to end: search and results, no selector,
  // and none of the superseded copy.
  const mounted = mount(SignalBoard as unknown as (p: unknown) => unknown, {
    q: Q(),
    board: {
      state: "ok",
      signals: [A_SIGNAL],
      total: 3458,
      offset: 0,
      ordering: "newest",
      rankedFully: true,
    },
    everything: 3458,
    availability: have({ products: 3458 }),
    axisClassified: null,
  });
  // The filters element is still in the tree; it is the panel that renders
  // nothing, which is what keeps the decision in one place.
  const filters = (mounted.all() as TestElement[]).filter((el) => el.type === SignalFilters);
  assert.equal(filters.length, 1, "the board stopped delegating to the filter panel");
  assert.equal(
    render(Q(), have({ products: 3458 }), null).tree,
    null,
    "the panel drew a one-option selector",
  );
  const rendered = boardText({
    board: {
      state: "ok",
      signals: [A_SIGNAL],
      total: 3458,
      offset: 0,
      ordering: "newest",
      rankedFully: true,
    },
  });
  assert.ok(rendered.includes("3,458"), "the count line is missing");
  assert.ok(!rendered.includes("All signals"), "an all-families option rendered with one family");
});

test("the family-unavailable copy is commercial and offers a way forward", () => {
  const src = readFileSync("components/desk/SignalBoard.tsx", "utf8");
  for (const heading of [
    "No live product signals are currently available",
    "No live trade-service signals are currently available",
    "No live distribution opportunities are currently available",
  ]) {
    assert.ok(src.includes(heading), `missing the commercial heading: ${heading}`);
  }
  assert.ok(src.includes("View all signals"), "no route back to the whole board");
  for (const action of [
    "Post a product opportunity",
    "Post a trade-service opportunity",
    "Post a distribution opportunity",
  ]) {
    assert.ok(src.includes(action), `missing the creation action: ${action}`);
  }
  // And it is gated on a MEASURED zero, not on a filter merely being set.
  assert.ok(src.includes("familyHasInventory(availability, q.family)"), "the gate is not the measurement");
});

test("an empty search and an unavailable family stay different statements", () => {
  // One is about the query, the other about that board family. Collapsing them
  // would tell a member their words failed when the market is simply not there,
  // or the reverse.
  const src = readFileSync("components/desk/SignalBoard.tsx", "utf8");
  assert.ok(src.includes("No signal matches this search"), "the search-empty copy has gone");
  assert.ok(src.includes("No live trade-service signals are currently available"));
  // The family state is decided BEFORE the result states, so a kept URL for an
  // empty family never renders as a failed search.
  assert.ok(
    src.indexOf("unavailableFamily ?") < src.indexOf('genuineEmpty === "search"'),
    "a search-empty state can preempt an unavailable family",
  );
});

if (process.exitCode) console.error(`\n${passed} passed, some failed.`);
else console.log(`ok   ${passed} availability tests passed`);
