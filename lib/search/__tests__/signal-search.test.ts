// Free-text Market Signal search: normalisation, the alias vocabulary, the
// database predicate and the relevance order.
//
// Run: npx tsx lib/search/__tests__/signal-search.test.ts
//
// Everything under test is pure, so nothing here opens a Supabase client. The
// two facts this file exists to pin are the ones a screenshot cannot show: that
// a search reaches a record the member did not spell the way the source did,
// and that it cannot reach a column the public read contract excludes.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  parseSignalSearch,
  normaliseSearchText,
  searchPredicate,
  relevanceOf,
  compareByRelevance,
  matchesSearch,
  foldPunctuation,
  stripAccents,
  accentVariants,
  SEARCHABLE_COLUMNS,
  MAX_QUERY_LENGTH,
  MAX_SLOTS,
  MAX_GROUP_VARIANTS,
  MAX_EXPANDED_GROUPS,
  MAX_PREDICATE_CHARS,
  RANK,
  type RankableSignal,
} from "../signal-search";
import {
  ALIAS_GROUPS,
  aliasGroupFor,
  allAliasTerms,
  LONGEST_ALIAS_WORDS,
  LARGEST_ALIAS_GROUP,
} from "../aliases";
import { PUBLIC_SIGNAL_COLUMNS, INTERNAL_SIGNAL_COLUMNS } from "../../market-signals/logic";

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

/** A signal fixture. Only the fields relevance actually reads. */
function sig(over: Partial<RankableSignal> = {}): RankableSignal {
  return {
    id: "00000000-0000-4000-8000-000000000001",
    product: "Refined white sugar ICUMSA 45",
    hsCode: "1701.99",
    canonicalId: "EXT-G4WB-000001",
    category: "Sugar and confectionery",
    summaryLine: null,
    description: null,
    originText: "Brazil",
    destinationText: "Netherlands",
    side: "requirement",
    spottedAt: "2026-07-10T00:00:00Z",
    ...over,
  };
}

const must = (raw: string) => {
  const s = parseSignalSearch(raw);
  assert.ok(s, `"${raw}" should parse as a search`);
  return s!;
};

// ---------------------------------------------------------------------------
// Normalisation
// ---------------------------------------------------------------------------

test("normalisation folds case, accents, punctuation and spacing", () => {
  assert.equal(normaliseSearchText("Gas-Oil"), "gas oil");
  assert.equal(normaliseSearchText("  GAS   OIL  "), "gas oil");
  assert.equal(normaliseSearchText("Café"), "cafe");
  assert.equal(normaliseSearchText("Aceite de Oliva!"), "aceite de oliva");
  assert.equal(normaliseSearchText("olive/oil"), "olive oil");
  // The same query written four ways is one query. This is the whole of
  // "tolerant of common punctuation and spacing differences".
  const forms = ["gas oil", "Gas-Oil", "GAS  OIL", "gas.oil"];
  const normalised = forms.map(normaliseSearchText);
  assert.deepEqual(new Set(normalised).size, 1, `${normalised.join(" / ")} did not agree`);
});

test("the LIKE wildcards cannot survive normalisation", () => {
  // Not cosmetic. These two characters are what an injected `%` would use to
  // turn a narrow filter into a full scan, and `_` to match any character.
  assert.equal(normaliseSearchText("100%"), "100");
  assert.equal(normaliseSearchText("gas_oil"), "gas oil");
  assert.ok(!normaliseSearchText("a%b_c").includes("%"));
  assert.ok(!normaliseSearchText("a%b_c").includes("_"));
});

test("a non-Latin query survives normalisation", () => {
  // A keep-list of [a-z0-9] would delete these entirely and turn a member's
  // search into an empty string. Multilingual INPUT is explicitly preserved by
  // the English-only interface policy.
  assert.equal(normaliseSearchText("Подсолнечное масло"), "подсолнечное масло");
  assert.equal(normaliseSearchText("食用油"), "食用油");
  assert.ok(parseSignalSearch("橄榄油") !== null, "a CJK query is not a search");
});

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

test("an absent, blank or one-character query is not a search", () => {
  assert.equal(parseSignalSearch(null), null);
  assert.equal(parseSignalSearch(undefined), null);
  assert.equal(parseSignalSearch(""), null);
  assert.equal(parseSignalSearch("   "), null);
  assert.equal(parseSignalSearch("a"), null);
  // Punctuation alone normalises to nothing, and nothing is not a query.
  assert.equal(parseSignalSearch("!!!"), null);
});

test("a query is truncated, never rejected, at the maximum length", () => {
  const long = "sugar ".repeat(200);
  const search = must(long);
  assert.ok(search.raw.length <= MAX_QUERY_LENGTH, `raw was ${search.raw.length}`);
  assert.ok(search.normalised.length <= MAX_QUERY_LENGTH);
});

test("terms are the words of two characters or more", () => {
  const search = must("olive oil a spain");
  assert.deepEqual(search.terms, ["olive", "oil", "spain"]);
});

test("an HS-shaped query yields its stored variants", () => {
  const search = must("170199");
  assert.equal(search.hsDigits, "170199");
  assert.ok(search.phrases.includes("170199"), "the digits as typed");
  assert.ok(search.phrases.includes("1701.99"), "the dotted form the source stored");

  // Typed with the dot, meaning the same thing.
  const dotted = must("1701.99");
  assert.equal(dotted.hsDigits, "170199");
  assert.ok(dotted.phrases.includes("1701.99"));

  // A partial code is a partial code, not a failure.
  assert.equal(must("1701").hsDigits, "1701");
  // Three digits is not an HS code; it is a number in a product name.
  assert.equal(must("590").hsDigits, null);
});

// ---------------------------------------------------------------------------
// The alias vocabulary
// ---------------------------------------------------------------------------

test("every alias term is already normalised", () => {
  // A term that does not survive its own normaliser can never be matched,
  // because the query it is compared against always has been normalised.
  for (const term of allAliasTerms()) {
    assert.equal(normaliseSearchText(term), term, `alias "${term}" is not in normalised form`);
  }
});

test("no alias term belongs to two groups", () => {
  const seen = new Map<string, string>();
  for (const group of ALIAS_GROUPS) {
    for (const term of group.terms) {
      const owner = seen.get(term);
      assert.equal(owner, undefined, `"${term}" is claimed by ${owner} and ${group.key}`);
      seen.set(term, group.key);
    }
  }
});

test("gas oil, gasoil, diesel and EN590 are one vocabulary", () => {
  // The requirement's own example, and the reason this layer exists at all.
  // Every one of these five queries must find the same group.
  for (const query of ["gas oil", "gasoil", "diesel", "EN590", "EN 590"]) {
    const search = must(query);
    assert.equal(search.groups.length, 1, `"${query}" found no group`);
    assert.equal(search.groups[0].key, "gasoil", `"${query}" found ${search.groups[0].key}`);
  }

  // And each must reach the fuel by its other names. Bare `diesel` is NOT in
  // that set: it is trigger-only, because pushing it onto a query that did not
  // use it widens a cargo enquiry into equipment. See the regression case in
  // lib/search/__tests__/search-scope.test.ts.
  for (const query of ["gas oil", "gasoil", "EN590", "EN 590"]) {
    const search = must(query);
    for (const expected of ["gas oil", "gasoil", "en590", "diesel fuel"]) {
      assert.ok(
        search.phrases.includes(expected),
        `"${query}" does not search for "${expected}"`,
      );
    }
    assert.ok(
      !search.phrases.includes("diesel"),
      `"${query}" was widened to bare "diesel"`,
    );
  }

  // A member who typed the word themselves keeps their own literal search.
  const typed = must("diesel");
  assert.ok(typed.phrases.includes("diesel"), "the member's own word was dropped");
  assert.equal(typed.phrases[0], "diesel", "the member's own word is not searched first");
});

test("the other required commercial vocabularies join up", () => {
  const joins: Array<[string, string]> = [
    ["freight forwarding", "freight forwarder"],
    ["freight forwarder", "freight forwarding"],
    ["distributor", "distribution partner"],
    ["commercial agent", "sales agent"],
    ["sales agent", "representative"],
    ["olive oil", "extra virgin olive oil"],
    ["EVOO", "olive oil"],
  ];
  for (const [query, expected] of joins) {
    const search = must(query);
    assert.ok(
      search.phrases.includes(normaliseSearchText(expected)),
      `"${query}" does not reach "${expected}"`,
    );
  }
});

test("a multilingual input reaches the English vocabulary", () => {
  // The interface stays English; the input does not have to be.
  assert.equal(must("aceite de oliva").groups[0]?.key, "olive-oil");
  assert.equal(must("gasolio").groups[0]?.key, "gasoil");
  assert.equal(must("transitario").groups[0]?.key, "freight-forwarding");
});

test("a group is found by a word inside a longer query", () => {
  const search = must("diesel cargo rotterdam");
  assert.equal(search.groups[0]?.key, "gasoil");
  assert.ok(search.phrases.includes("en590"));
});

/**
 * Ordinary vocabulary that appears in real signals and means none of the
 * groups. Every entry is here because an alias term was, or could be, a
 * substring of it.
 *
 * `ilike '%term%'` has no notion of a word, which is the whole trap: a short
 * alias is not just imprecise, it is silently wrong. `ble`, the French for
 * wheat, matched `available` and `acceptable` and put four unrelated records
 * into every wheat search on the fixture board. It was found by counting rows
 * in an evidence run, not by reading the table.
 */
const ORDINARY_WORDS = [
  "available", "acceptable", "vegetable", "table", "suitable", "negotiable",
  "welcome", "calcium", "falcon", "balcony", "talc",
  "prior", "superior", "interior", "exterior", "warrior", "junior", "senior",
  "chicago", "tobago", "embargo", "cargo cult",
  "capsized", "gypsum", "epsilon",
  "flatfish", "aftermarket",
  "quantity", "requirement", "supplier", "certificate", "insurance", "payment",
  "container", "shipment", "delivery", "packaging", "warehouse", "consignment",
  "agricultural", "industrial", "chemical", "machinery", "equipment",
];

test("no alias term matches inside an ordinary word", () => {
  // The rule that keeps a vocabulary from becoming noise. A term may be a whole
  // word in this list (nothing here is one), but it may never be buried in one.
  for (const term of allAliasTerms()) {
    for (const word of ORDINARY_WORDS) {
      if (word === term) continue;
      assert.ok(
        !word.includes(term),
        `alias "${term}" is a substring of "${word}", so it matches records that do not mean it`,
      );
    }
  }
});

test("a bare commodity word does not drag in an unrelated group", () => {
  // `oil` deliberately belongs to no group. If it did, a search for cooking
  // oil would return middle distillates, which is the failure mode that makes
  // an alias layer worse than none.
  assert.equal(aliasGroupFor("oil"), null);
  assert.deepEqual(must("oil").groups, []);
});


// ---------------------------------------------------------------------------
// The database predicate, and the disclosure boundary
// ---------------------------------------------------------------------------

const publicColumns = PUBLIC_SIGNAL_COLUMNS.split(",").map((c) => c.trim());

test("every searchable column is a public column", () => {
  // The disclosure argument for this whole feature. A search that could test a
  // private column would disclose it: a hit is itself an answer about what that
  // column contains, whether or not the value is ever printed.
  for (const column of SEARCHABLE_COLUMNS) {
    assert.ok(
      publicColumns.includes(column),
      `"${column}" is searched but is not in PUBLIC_SIGNAL_COLUMNS`,
    );
  }
});

test("no internal column is searchable, named or by accident", () => {
  for (const column of INTERNAL_SIGNAL_COLUMNS) {
    assert.ok(
      !SEARCHABLE_COLUMNS.includes(column),
      `"${column}" is internal and must never be searched`,
    );
  }
  // The four that would actually leak something if this ever regressed.
  const predicate = searchPredicate(must("acme trading"));
  for (const forbidden of ["counterparty_name", "counterparty_company", "source_url", "raw_description", "notes"]) {
    assert.ok(!predicate.includes(forbidden), `the predicate names ${forbidden}`);
  }
});

test("the predicate ANDs the concepts and ORs inside them", () => {
  const predicate = searchPredicate(must("diesel cargo rotterdam"));
  assert.ok(predicate.startsWith("and("), `not an AND chain: ${predicate.slice(0, 40)}`);
  assert.equal((predicate.match(/or\(/g) ?? []).length, 3, "expected three concept groups");
  assert.ok(predicate.includes('product.ilike."*en590*"'), "the alias is not searched");
  assert.ok(predicate.includes('product.ilike."*cargo*"'), "the qualifier is not searched");
  assert.ok(predicate.includes('product.ilike."*rotterdam*"'), "the qualifier is not searched");
});

test("one concept needs no wrapper, because the caller supplies the outer or=", () => {
  const predicate = searchPredicate(must("sugar"));
  assert.ok(!predicate.startsWith("and("), "a single concept was wrapped in an AND");
  assert.ok(!predicate.startsWith("or("), "a single concept was double-wrapped");
  for (const column of SEARCHABLE_COLUMNS) {
    assert.ok(predicate.includes(`${column}.ilike."*sugar*"`), `${column} is not searched`);
  }
});

test("an alias phrase is searched even though its words are absent", () => {
  // The exact record the alias exists to find: `En590 Diesel, 10 PPM` contains
  // neither the word `gas` nor the word `oil`, so an all-words rule alone would
  // miss it. `en590` is what reaches it.
  const predicate = searchPredicate(must("gas oil"));
  assert.ok(predicate.includes('product.ilike."*en590*"'), "EN590 is not searched");
  assert.ok(predicate.includes('product.ilike."*diesel fuel*"'), "the fuel form is not searched");
  // And not the bare word, which would reach a generator.
  assert.ok(
    !predicate.includes('product.ilike."*diesel*"'),
    "a gas oil search still widens to bare diesel",
  );
});

test("a hostile query cannot break out of the filter", () => {
  // PostgREST reads commas, parentheses and dots structurally. None survives
  // normalisation, and the value is quoted on top of that.
  const nasty = must('sugar",counterparty_name.ilike."*a*');
  const predicate = searchPredicate(nasty);
  assert.ok(!predicate.includes("counterparty_name"), "an injected column reached the predicate");
  const values = predicate.match(/ilike\."[^"]*"/g) ?? [];
  for (const value of values) {
    assert.ok(!/[(),.]/.test(value.slice(8, -1).replace(/^\*|\*$/g, "")) || /^\*?[\d.]+\*?$/.test(value.slice(8, -1)),
      `a structural character survived in ${value}`);
  }
});

// ---------------------------------------------------------------------------
// Relevance
// ---------------------------------------------------------------------------

test("an exact HS code outranks everything", () => {
  const search = must("170199");
  assert.equal(relevanceOf(sig({ hsCode: "1701.99" }), search), RANK.hsExact);
  assert.equal(relevanceOf(sig({ hsCode: "1701.9910" }), search), RANK.hsPrefix);
});

test("an exact product name outranks a phrase inside one", () => {
  const search = must("olive oil");
  const exact = relevanceOf(sig({ product: "Olive oil", hsCode: null }), search);
  const prefix = relevanceOf(sig({ product: "Olive oil, extra virgin", hsCode: null }), search);
  const inside = relevanceOf(sig({ product: "Spanish olive oil, bulk", hsCode: null }), search);
  assert.equal(exact, RANK.productExact);
  assert.equal(prefix, RANK.productPrefix);
  assert.equal(inside, RANK.productPhrase);
  assert.ok(exact < prefix && prefix < inside);
});

test("a match in the product outranks the same match in the description", () => {
  const search = must("olive oil");
  const inProduct = relevanceOf(sig({ product: "Bulk olive oil", hsCode: null }), search);
  const inText = relevanceOf(
    sig({ product: "Vegetable fats", hsCode: null, description: "Buyer seeks olive oil." }),
    search,
  );
  assert.ok(inProduct < inText, "the description ranked as highly as the title");
  assert.equal(inText, RANK.textPhrase);
});

test("all the words somewhere outranks only some of them", () => {
  const search = must("olive oil spain");
  const all = relevanceOf(
    sig({ product: "Olive oil", hsCode: null, originText: "Spain", destinationText: null }),
    search,
  );
  const some = relevanceOf(
    sig({ product: "Palm oil", hsCode: null, originText: "Malaysia", destinationText: null, category: null, canonicalId: null }),
    search,
  );
  assert.ok(all < some, "a partial match ranked with a complete one");
});

test("a record matched only on its public category is ranked, not discarded", () => {
  // It was returned by a genuine `ilike` on a public column. Dropping it here
  // would make the count above the list stop matching the list.
  const search = must("confectionery");
  const rank = relevanceOf(
    sig({ product: "Assorted goods", hsCode: null, canonicalId: null }),
    search,
  );
  assert.ok(rank <= RANK.allTerms, `a category match fell to ${rank}`);
});

test("the order is total, so an offset cannot repeat or skip a record", () => {
  // Two records identical in relevance AND in date. Without the id tie-break
  // their order is whatever the sort happened to do, and a page boundary
  // falling between them shows one of them twice or neither.
  const search = must("sugar");
  const a = sig({ id: "aaaa", product: "Sugar", hsCode: null, spottedAt: "2026-07-10T00:00:00Z" });
  const b = sig({ id: "bbbb", product: "Sugar", hsCode: null, spottedAt: "2026-07-10T00:00:00Z" });
  assert.ok(compareByRelevance(a, b, search) > 0, "identical records did not order");
  assert.ok(compareByRelevance(b, a, search) < 0, "the order is not antisymmetric");
  assert.equal(compareByRelevance(a, a, search), 0);
});

test("relevance beats recency, and recency breaks a relevance tie", () => {
  const search = must("olive oil");
  const olderExact = sig({
    id: "a", product: "Olive oil", hsCode: null, spottedAt: "2026-01-01T00:00:00Z",
  });
  const newWeak = sig({
    id: "b", product: "Vegetable fats", hsCode: null, description: "olive oil wanted",
    spottedAt: "2026-07-28T00:00:00Z",
  });
  assert.ok(compareByRelevance(olderExact, newWeak, search) < 0, "recency overrode relevance");

  const newer = sig({ id: "c", product: "Olive oil", hsCode: null, spottedAt: "2026-07-01T00:00:00Z" });
  assert.ok(compareByRelevance(newer, olderExact, search) < 0, "an equal-relevance tie ignored the date");
});

test("a full sort agrees with the documented band order", () => {
  const search = must("gas oil");
  const rows = [
    sig({ id: "d", product: "Marine fuel", hsCode: null, description: "diesel enquiry" }),
    sig({ id: "c", product: "Low sulphur gas oil", hsCode: null }),
    sig({ id: "b", product: "Gas oil", hsCode: null }),
    sig({ id: "a", product: "Gas oil EN590", hsCode: "2710.19" }),
  ];
  rows.sort((x, y) => compareByRelevance(x, y, search));
  assert.deepEqual(
    rows.map((r) => r.product),
    ["Gas oil", "Gas oil EN590", "Low sulphur gas oil", "Marine fuel"],
  );
});

// ---------------------------------------------------------------------------
// The ownership boundary, asserted rather than described
// ---------------------------------------------------------------------------

test("the alias table asserts no classification", () => {
  // An alias may widen the phrases searched. It may never say what a record IS:
  // that is `lib/taxonomy/`, where the family rules apply. An HS code or a
  // taxonomy key appearing here would be Ponte inventing a finding.
  const src = readFileSync("lib/search/aliases.ts", "utf8");
  const table = src.slice(src.indexOf("export const ALIAS_GROUPS"));
  assert.ok(!/hsCode|hs_code|market_family|_key:/.test(table), "the vocabulary carries a classification");
});

test("no component keeps a synonym list of its own", () => {
  // The requirement is explicit: aliases do not live in a React component.
  //
  // Comments are stripped before the check. A component is allowed to EXPLAIN
  // the vocabulary — the one in SignalSearch.tsx names `Diesel EN590` to say
  // why widening has to be visible to a member — and an assertion that
  // punished the explanation would push the reasoning out of the file that
  // needs it. What must not appear is a synonym in executable code.
  const withoutComments = (src: string) =>
    src.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/.*$/gm, "$1");

  for (const file of [
    "components/desk/SignalSearch.tsx",
    "components/desk/SignalFilters.tsx",
    "components/desk/SortLinks.tsx",
    "components/desk/BoardPager.tsx",
    "app/[locale]/market-signals/page.tsx",
    "components/desk/SignalBoard.tsx",
    "lib/board/inventory.ts",
    "lib/find/query.ts",
  ]) {
    const code = withoutComments(readFileSync(file, "utf8"));
    for (const term of allAliasTerms()) {
      assert.ok(
        !code.toLowerCase().includes(`"${term}"`),
        `${file} hard-codes the synonym "${term}"`,
      );
    }
  }
});

if (process.exitCode) console.error(`\n${passed} passed, some failed.`);
else console.log(`ok   ${passed} signal-search tests passed`);
