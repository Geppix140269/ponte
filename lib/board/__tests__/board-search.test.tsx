// The searchable board, as a member meets it: the form, the truthful empty
// states, the order control and the pager.
//
// Run: npx tsx --tsconfig tsconfig.ui-test.json lib/board/__tests__/board-search.test.tsx
//
// Two kinds of assertion live here, and both exist because a screenshot cannot
// make them. The rendered ones prove that a control is present, labelled,
// submittable and carries the state it must carry. The source ones prove the
// board still cannot say "no signal is currently live on the public board"
// because somebody's spelling was wrong.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

/* eslint-disable import/first */
import SignalSearch from "../../../components/desk/SignalSearch";
import SortLinks from "../../../components/desk/SortLinks";
import BoardPager from "../../../components/desk/BoardPager";
import { mount, type TestElement } from "../../landing/__tests__/render";
import { presentBoard } from "../presentation";
import { parseFindQuery, PAGE_SIZE, type FindQuery } from "../../find/query";
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

/** The whole tree, kept so text can be read from the root exactly once. */
const trees = new WeakMap<object, unknown>();

function render(Component: unknown, props: unknown): TestElement[] {
  const mounted = mount(Component as (p: unknown) => unknown, props);
  const els = mounted.all();
  if (els.length > 0) trees.set(els, mounted.tree as object);
  return els;
}

/**
 * Everything a member would read, in order, once.
 *
 * Walked from the ROOT, not from every element: `all()` is a flattened depth-
 * first list, so walking each entry's children re-reads every nested string
 * once per ancestor. The first version did that and produced
 * "page 2 of 59 · page 2 of 59", which would have hidden a genuine duplicate.
 */
function text(els: TestElement[]): string {
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
      walk((node as TestElement).props.children);
    }
  };
  walk(trees.get(els) ?? els.map((el) => el.props.children));
  return out.join(" ").replace(/\s+/g, " ").trim();
}

const byType = (els: TestElement[], type: string) => els.filter((el) => el.type === type);
const hrefs = (els: TestElement[]) =>
  els.map((el) => el.props.href).filter((h): h is string => typeof h === "string");

// ---------------------------------------------------------------------------
// The form
// ---------------------------------------------------------------------------

test("the board carries a labelled search field and a visible action", () => {
  const els = render(SignalSearch, { q: Q() });
  const input = byType(els, "input").find((el) => el.props.name === "q");
  assert.ok(input, "there is no search input");
  assert.equal(input!.props.type, "search");
  assert.equal(input!.props.id, "signal-q");

  const label = byType(els, "label")[0];
  assert.ok(label, "the field has no label");
  assert.equal(label.props.htmlFor, "signal-q", "the label is not bound to the field");
  assert.ok(String(label.props.children).trim().length > 0, "the label is empty");

  const button = byType(els, "button")[0];
  assert.ok(button, "there is no search action");
  assert.equal(button.props.type, "submit");
});

test("it is a GET form, so Enter submits it and it works without JavaScript", () => {
  // Not a detail. Enter-to-submit, a shareable URL, Back and Forward, and a
  // working search on a page whose bundle has not loaded are all one property:
  // this is a form, and the browser owns it.
  const els = render(SignalSearch, { q: Q() });
  const form = byType(els, "form")[0];
  assert.ok(form, "the search is not a form");
  assert.equal(String(form.props.method).toLowerCase(), "get");
  assert.equal(form.props.action, "/market-signals");
  assert.equal(form.props.role, "search");
  // No handler anywhere: a click or keypress handler would mean the control
  // depends on hydration.
  for (const el of els) {
    for (const key of Object.keys(el.props)) {
      assert.ok(!/^on[A-Z]/.test(key), `${String(el.type)} carries ${key}`);
    }
  }
});

test("the field is restored from the URL", () => {
  const els = render(SignalSearch, { q: Q({ q: "gas oil" }) });
  const input = byType(els, "input").find((el) => el.props.name === "q");
  assert.equal(input!.props.defaultValue, "gas oil");
});

test("searching does not discard the filters, and does not keep the page", () => {
  // A GET form replaces the query string wholesale, so anything not carried
  // across is destroyed by the act of searching. The page is destroyed on
  // purpose: page 4 of the old result set means nothing in the new one.
  const els = render(
    SignalSearch,
    { q: Q({ q: "gas oil", family: "services", serviceCategory: "freight", territory: "de", sort: "oldest", page: "4" }) },
  );
  const hidden = byType(els, "input").filter((el) => el.props.type === "hidden");
  const carried = Object.fromEntries(hidden.map((el) => [el.props.name, el.props.value]));
  assert.equal(carried.family, "services");
  assert.equal(carried.serviceCategory, "freight");
  assert.equal(carried.territory, "DE");
  assert.equal(carried.sort, "oldest");
  assert.equal(carried.page, undefined, "a new search would have landed on page 4");
  assert.equal(carried.q, undefined, "the query is the field, not a hidden copy");
});

test("the active query is stated, with a way to clear it", () => {
  const els = render(SignalSearch, { q: Q({ q: "gas oil", family: "services" }) });
  const body = text(els);
  assert.ok(body.includes("gas oil"), "the active query is not shown");
  assert.ok(body.includes("Clear search"), "there is no way to clear the search alone");
  assert.ok(body.includes("Clear all"), "there is no way to clear the search and the filters");

  // Clearing the search keeps the filter; clearing all keeps nothing.
  const links = hrefs(els);
  assert.ok(
    links.some((h) => h.includes("family=services") && !h.includes("q=")),
    `no clear-search link kept the filter: ${links.join(" ")}`,
  );
  assert.ok(links.includes("/market-signals"), "no clear-all link");
});

test("a widened search says so", () => {
  // A member who searched for `gas oil` and is shown `Diesel EN590` has been
  // given a correct answer that looks like a wrong one. The vocabulary is only
  // defensible if it is visible.
  const body = text(render(SignalSearch, { q: Q({ q: "gas oil" }) }));
  assert.ok(/also searching/i.test(body), "the widening is silent");
});

test("an HS code is not reported as a widened search", () => {
  // The format variants of one code are the same code, written the way
  // different sources stored it. Listing them told somebody who had typed
  // 99999999 that Ponte was "also searching 9999.9999", which is true and a
  // strange thing to say about a number they had just typed in full.
  const body = text(render(SignalSearch, { q: Q({ q: "99999999" }) }));
  assert.ok(body.includes("99999999"), "the active query is not shown");
  assert.ok(!/also searching/i.test(body), `a code was reported as widened: ${body}`);
});

test("a widened search lists the terms once each", () => {
  const body = text(render(SignalSearch, { q: Q({ q: "gas oil" }) }));
  assert.ok(/also searching/i.test(body), "the widening is silent");
  assert.ok(body.includes("diesel"), "the widening does not name what it added");
  // `en590` and `en 590` are one term to a reader, however many phrases they
  // are to the database.
  const listed = body.slice(body.indexOf("also searching"));
  assert.ok(!/en590.*en 590|en 590.*en590/.test(listed), `near-duplicates listed: ${listed}`);
  // And the member's own words are not read back to them as an addition.
  assert.ok(!/also searching[^.]*gas oil/.test(listed), `own words listed: ${listed}`);
});

test("a query too short to run is not presented as a result", () => {
  const body = text(render(SignalSearch, { q: Q({ q: "a" }) }));
  assert.ok(/at least two/i.test(body), "a one-character query was run silently");
});

// ---------------------------------------------------------------------------
// Order
// ---------------------------------------------------------------------------

test("relevance is offered only when there is something to be relevant to", () => {
  const searching = text(render(SortLinks, { q: Q({ q: "gas oil" }) }));
  assert.ok(searching.includes("Relevance"));
  assert.ok(searching.includes("Newest") && searching.includes("Oldest"));

  const browsing = text(render(SortLinks, { q: Q() }));
  assert.ok(!browsing.includes("Relevance"), "Relevance was offered with no query");
  assert.ok(browsing.includes("Newest") && browsing.includes("Oldest"));
});

test("the current order is marked in more than colour", () => {
  // Constitution 11.4: a selection has to survive a monochrome reading.
  const els = render(SortLinks, { q: Q({ q: "gas oil" }) });
  const current = els.filter((el) => el.props["aria-current"] === "true");
  assert.equal(current.length, 1, "the current order is not announced");
  assert.ok(String(current[0].props.className).includes("sortlinks__o--on"));
  const css = readFileSync("components/desk/desk.css", "utf8");
  const rule = css.slice(css.indexOf(".ponte-desk .sortlinks__o--on"));
  assert.ok(/font-weight/.test(rule.slice(0, 220)), "weight does not mark the selection");
  assert.ok(/text-decoration/.test(rule.slice(0, 220)), "no non-colour marker");
});

test("changing the order keeps the search and the filters", () => {
  const els = render(SortLinks, { q: Q({ q: "gas oil", family: "services", page: "3" }) });
  for (const href of hrefs(els)) {
    assert.ok(href.includes("q=gas+oil"), `${href} dropped the search`);
    assert.ok(href.includes("family=services"), `${href} dropped the filter`);
    assert.ok(!href.includes("page="), `${href} kept a page from another order`);
  }
});

// ---------------------------------------------------------------------------
// The pager
// ---------------------------------------------------------------------------

test("one page of results needs no pager", () => {
  assert.equal(
    mount(BoardPager as unknown as (p: unknown) => unknown, {
      q: Q(), total: 40, offset: 0, pageSize: PAGE_SIZE,
    }).tree,
    null,
  );
});

test("the pager states a truthful range and preserves the whole search", () => {
  const els = render(BoardPager, {
    q: Q({ q: "gas oil", family: "services", sort: "oldest" }),
    total: 3517,
    offset: 60,
    pageSize: PAGE_SIZE,
  });
  const body = text(els);
  assert.ok(body.includes("61"), `range start missing: ${body}`);
  assert.ok(body.includes("120"), `range end missing: ${body}`);
  assert.ok(body.includes("3,517"), `total missing: ${body}`);
  assert.ok(body.includes("page 2 of 59"), `page position missing: ${body}`);

  const links = hrefs(els);
  assert.equal(links.length, 2, "expected a previous and a next");
  for (const href of links) {
    assert.ok(href.includes("q=gas+oil"), `${href} dropped the search`);
    assert.ok(href.includes("family=services"), `${href} dropped the filter`);
    assert.ok(href.includes("sort=oldest"), `${href} dropped the order`);
  }
  assert.ok(links.some((h) => !h.includes("page=")), "previous does not reach page 1");
  assert.ok(links.some((h) => h.includes("page=3")), "next does not reach page 3");
});

test("the ends of the set offer nothing to click", () => {
  const firstPage = render(BoardPager, { q: Q(), total: 130, offset: 0, pageSize: PAGE_SIZE });
  assert.equal(hrefs(firstPage).length, 1, "page one offered a Previous link");
  const lastPage = render(BoardPager, { q: Q(), total: 130, offset: 120, pageSize: PAGE_SIZE });
  assert.equal(hrefs(lastPage).length, 1, "the last page offered a Next link");
  const disabled = lastPage.filter((el) => el.props["aria-disabled"] === "true");
  assert.equal(disabled.length, 1, "the unavailable direction is not marked");
});

test("the pager reads the offset the board used, not the page the URL asked for", () => {
  // A stale link to page 40 of a set that now has 3 pages is answered at page
  // 3. If the pager took its position from the URL instead it would print
  // "page 40 of 3" over the records of page 3.
  const els = render(BoardPager, {
    q: Q({ page: "40" }), total: 130, offset: 120, pageSize: PAGE_SIZE,
  });
  assert.ok(text(els).includes("page 3 of 3"), text(els));
});

// ---------------------------------------------------------------------------
// The states, which is where a wrong answer would actually cost something
// ---------------------------------------------------------------------------

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

test("a zero-result search never claims the board is empty", () => {
  // The single most damaging sentence this page can print. It is a statement
  // about the market, and a member reads it as "this market is dead".
  assert.equal(presentBoard("ok", 0, { filtered: true, searched: true }).genuineEmpty, "search");
  assert.equal(presentBoard("ok", 0, { filtered: true, searched: false }).genuineEmpty, "filters");
  assert.equal(presentBoard("ok", 0, { filtered: false, searched: false }).genuineEmpty, "board");
});

test("a search takes precedence over a filter in the empty copy", () => {
  // Both narrowed the result, but only one of them is a word the member can
  // immediately change, and it is the likelier culprit.
  assert.equal(presentBoard("ok", 0, { filtered: true, searched: true }).genuineEmpty, "search");
});

test("searching does not let a partial or unknown coverage become a finding", () => {
  // The rule the coverage states exist for, re-asserted with a search in play:
  // only `ok` may present an emptiness as a fact about the market.
  for (const state of ["partial", "coverage_unknown"] as const) {
    const p = presentBoard(state, 0, { filtered: true, searched: true });
    assert.equal(p.genuineEmpty, null, `${state} produced a conclusion`);
    assert.ok(p.coverageNotice, `${state} lost its explanation`);
  }
  const unclassified = presentBoard("unclassified", 0, { filtered: true, searched: true });
  assert.equal(unclassified.genuineEmpty, null);
  assert.ok(unclassified.unclassified, "an unclassified axis became an empty search result");

  const unavailable = presentBoard("unavailable", 0, { filtered: true, searched: true });
  assert.equal(unavailable.genuineEmpty, null, "a failed read became a search finding");
  assert.ok(unavailable.unavailable);
});

test("the board hands the table both scopes", () => {
  const src = boardSource();
  assert.ok(src.includes("filtered: hasActiveFilters(q)"), "the board withholds its filter scope");
  assert.ok(src.includes("searched: search !== null"), "the board withholds its search scope");
  // And the search-specific copy exists and says the right thing.
  assert.ok(src.includes("No signal matches this search"), "there is no search-specific empty state");
  // The whole-board claim must be reachable only through the `board` branch.
  const claim = "No signal is currently live on the public board";
  const at = src.indexOf(claim);
  assert.ok(at > 0, "the board emptiness copy has gone missing");
  const guard = src.lastIndexOf('presentation.genuineEmpty === "board"', at);
  assert.ok(guard > 0 && at - guard < 600, "the whole-board claim is not gated on the board branch");
});

test("the count line no longer says the rest is unreachable", () => {
  // It was true and is not any more. A page that keeps telling a member the
  // inventory is out of reach, beside a pager that reaches it, is worse than
  // one that never said it.
  const src = boardSource();
  assert.ok(!src.includes("not yet\n                  reachable"), "the stale limitation is still printed");
  assert.ok(!src.includes("Paging through the whole inventory is not built"));
  assert.ok(src.includes("<BoardPager"), "the board renders no pager");
});

if (process.exitCode) console.error(`\n${passed} passed, some failed.`);
else console.log(`ok   ${passed} board-search tests passed`);
