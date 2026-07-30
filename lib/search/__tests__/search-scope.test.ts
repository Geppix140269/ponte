// Three properties the first draft of the search got wrong, and one it never
// established.
//
// Run: npx tsx lib/search/__tests__/search-scope.test.ts
//
// Kept apart from signal-search.test.ts, which covers the vocabulary and the
// relevance bands, because these are about SCOPE: what a search is allowed to
// return, how large a request it may build, and which accent forms it actually
// reaches. Each section names the defect it exists for.

import assert from "node:assert/strict";
import {
  parseSignalSearch,
  searchPredicate,
  matchesSearch,
  normaliseSearchText,
  foldPunctuation,
  stripAccents,
  accentVariants,
  SEARCHABLE_COLUMNS,
  MAX_QUERY_LENGTH,
  MAX_SLOTS,
  MAX_GROUP_VARIANTS,
  MAX_EXPANDED_GROUPS,
  MAX_PREDICATE_CHARS,
  type RankableSignal,
} from "../signal-search";
import { allAliasTerms, LONGEST_ALIAS_WORDS, LARGEST_ALIAS_GROUP } from "../aliases";

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

/** A record carrying only the public facts a search reads. */
function sig(over: Partial<RankableSignal> & Pick<RankableSignal, "id" | "product">): RankableSignal {
  return {
    hsCode: null,
    canonicalId: null,
    category: null,
    summaryLine: null,
    description: null,
    originText: null,
    destinationText: null,
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

/**
 * How many mandatory concept groups the predicate contains.
 *
 * A single concept is returned unwrapped, because the caller supplies the outer
 * `or=`, so there is no `or(` to count and the answer is one.
 */
const conceptCount = (predicate: string) =>
  predicate.startsWith("and(") ? (predicate.match(/or\(/g) ?? []).length : 1;

// ---------------------------------------------------------------------------
// 1. Qualifiers stay mandatory through alias expansion
//
// The defect: every expanded alias sat at the top level of one OR, so
// `diesel cargo rotterdam` matched any record containing `gas oil` and neither
// qualifier. Widening a concept must not discard the words around it.
// ---------------------------------------------------------------------------

/** Diesel, with no cargo and no Rotterdam anywhere in its public text. */
const DIESEL_ONLY = sig({
  id: "d1",
  product: "Diesel fuel",
  category: "Petroleum products",
  originText: "Netherlands",
  destinationText: "Ghana",
});

/** The same commodity under a sibling name, carrying both qualifiers. */
const EN590_QUALIFIED = sig({
  id: "d2",
  product: "Gas oil EN590 10ppm",
  category: "Petroleum products",
  summaryLine: "Cargo of 50,000 MT, CIF Rotterdam.",
  originText: "United Arab Emirates",
  destinationText: "Netherlands",
});

test("a qualified alias search does not match the alias alone", () => {
  const search = must("diesel cargo rotterdam");
  assert.equal(
    matchesSearch(DIESEL_ONLY, search),
    false,
    "a diesel record with no cargo and no Rotterdam was returned",
  );
});

test("a qualified alias search matches a sibling term carrying the qualifiers", () => {
  // The point of the vocabulary, and the case a plain all-words rule misses:
  // this record contains neither the word `diesel` nor the word `oil` on its
  // own, but it is the same commodity and it satisfies both qualifiers.
  const search = must("diesel cargo rotterdam");
  assert.equal(matchesSearch(EN590_QUALIFIED, search), true);
});

test("an alias-only search still reaches every sibling term", () => {
  const search = must("gas oil");
  assert.equal(matchesSearch(DIESEL_ONLY, search), true, "gas oil no longer reaches diesel");
  assert.equal(matchesSearch(EN590_QUALIFIED, search), true, "gas oil no longer reaches EN590");
  // And the widening is in the predicate, not only in memory.
  const predicate = searchPredicate(search);
  assert.ok(predicate.includes('product.ilike."*diesel*"'), "diesel is not searched");
  assert.ok(predicate.includes('product.ilike."*en590*"'), "EN590 is not searched");
  assert.equal(conceptCount(predicate), 1, "one concept became several");
});

test("the predicate ANDs the concepts and ORs inside them", () => {
  const predicate = searchPredicate(must("diesel cargo rotterdam"));
  assert.ok(predicate.startsWith("and("), `not an AND chain: ${predicate.slice(0, 40)}`);
  assert.equal(conceptCount(predicate), 3, "expected three mandatory concepts");
  assert.ok(predicate.includes('product.ilike."*en590*"'), "the alias is not searched");
  assert.ok(predicate.includes('product.ilike."*cargo*"'), "the qualifier is not searched");
  assert.ok(predicate.includes('product.ilike."*rotterdam*"'), "the qualifier is not searched");
});

test("a territory qualifier is not made optional by a partner-type alias", () => {
  // `distributor` is an alias group. Expanding it must not turn a search for a
  // Spanish distributor into a search for every distributor on earth.
  const search = must("distributor Spain");
  const worldwide = sig({
    id: "p1",
    product: "Distributor sought for packaged foods",
    category: "Distribution and representation",
    destinationText: "Poland",
  });
  const spanish = sig({
    id: "p2",
    product: "Distribution partner sought",
    category: "Distribution and representation",
    destinationText: "Spain",
  });
  assert.equal(matchesSearch(worldwide, search), false, "every distributor matched");
  assert.equal(matchesSearch(spanish, search), true, "the Spanish one did not match");
  assert.equal(conceptCount(searchPredicate(search)), 2);
});

test("a multi-word alias keeps the qualifier that follows it", () => {
  // `freight forwarding` is two words and one concept. The longest-match walk is
  // what stops it becoming `freight` AND `forwarding`, and what stops `morocco`
  // becoming optional.
  const search = must("freight forwarding Morocco");
  assert.equal(search.slots.length, 2, "the alias did not consume both of its words");
  assert.equal(search.slots[0].group?.key, "freight-forwarding");
  assert.equal(search.slots[1].source, "morocco");

  const worldwide = sig({
    id: "f1",
    product: "Ocean freight, FCL",
    category: "Freight and logistics",
    originText: "China",
    destinationText: "Italy",
    summaryLine: "Freight forwarding enquiry.",
  });
  const moroccan = sig({
    id: "f2",
    product: "Freight forwarding, Genoa to Casablanca",
    category: "Freight and logistics",
    originText: "Italy",
    destinationText: "Morocco",
  });
  assert.equal(matchesSearch(worldwide, search), false, "every forwarding record matched");
  assert.equal(matchesSearch(moroccan, search), true, "the Moroccan one did not match");
});

test("a longer alias wins over a shorter one at the same position", () => {
  // `olive oil` and `extra virgin olive oil` are both terms. A query naming the
  // longer one must consume all four words rather than leaving `extra virgin`
  // dangling as two extra mandatory words.
  const search = must("extra virgin olive oil");
  assert.equal(search.slots.length, 1, `expected one concept, got ${search.slots.length}`);
  assert.equal(search.slots[0].group?.key, "olive-oil");
});

test("the group cap narrows rather than broadens", () => {
  // Past MAX_EXPANDED_GROUPS a recognised phrase is searched as itself. That is
  // narrower than its group, so the degradation can never return a record the
  // uncapped search would have excluded.
  const search = must("diesel olive oil freight forwarding distributor");
  assert.equal(search.groups.length, MAX_EXPANDED_GROUPS, "more groups expanded than permitted");
  const capped = search.slots.filter((slot) => slot.group === null);
  assert.ok(capped.length > 0, "nothing fell past the cap in this query");
  for (const slot of capped) {
    assert.deepEqual(
      slot.variants,
      accentVariants(slot.source),
      "a capped concept was still widened",
    );
  }
});

// ---------------------------------------------------------------------------
// 2. The complete predicate is bounded
//
// The defect: the phrase cap did not bound the all-words branch, so a permitted
// 120-character query of two-character words built a filter of roughly ten
// thousand characters and would have been refused by the gateway.
// ---------------------------------------------------------------------------

test("meaningful concepts are capped, deduplicated and dropped from the end", () => {
  const words = Array.from({ length: 40 }, (_, i) => `q${String.fromCharCode(97 + (i % 26))}`);
  const search = must(words.join(" "));
  assert.equal(search.slots.length, MAX_SLOTS, "the concept cap did not apply");
  assert.ok(search.droppedConcepts > 0, "dropped words were not reported");
  // Deterministic: the FIRST MAX_SLOTS unique concepts, in the member's order.
  const unique: string[] = [];
  for (const w of words) if (unique.indexOf(w) < 0) unique.push(w);
  assert.deepEqual(
    search.slots.map((slot) => slot.source),
    unique.slice(0, MAX_SLOTS),
  );
});

test("a repeated term is one concept, and that is not a dropped word", () => {
  const search = must("ab ab ab ab ab ab ab ab ab ab ab ab");
  assert.equal(search.slots.length, 1, "a repeated word became several concepts");
  assert.equal(search.droppedConcepts, 0, "deduplication was reported as dropping");
  assert.deepEqual(search.terms, ["ab"]);
  assert.equal(conceptCount(searchPredicate(search)), 1);
});

test("repeated two-character terms cannot inflate the predicate", () => {
  // The adversarial shape: the maximum query length, filled with the shortest
  // meaningful words, all distinct so deduplication cannot help.
  const distinct: string[] = [];
  for (let i = 0; i < 26 && distinct.length < 60; i += 1) {
    for (let j = 0; j < 26 && distinct.length < 60; j += 1) {
      distinct.push(`${String.fromCharCode(97 + i)}${String.fromCharCode(97 + j)}`);
    }
  }
  const query = distinct.join(" ").slice(0, MAX_QUERY_LENGTH);
  const predicate = searchPredicate(must(query));
  assert.ok(
    predicate.length <= MAX_PREDICATE_CHARS,
    `${predicate.length} characters exceeds the ${MAX_PREDICATE_CHARS} bound`,
  );
});

test("the most expensive predicate the caps permit still fits the bound", () => {
  /*
   * Computed from the constants and the column list rather than sampled, so
   * raising a cap or adding a searchable column fails HERE rather than shipping
   * a request the gateway refuses.
   *
   * Worst case: MAX_EXPANDED_GROUPS slots each carrying MAX_GROUP_VARIANTS of
   * the longest term in the vocabulary, plus the remaining slots each carrying
   * the longest single variant, every variant repeated across every searchable
   * column.
   */
  const longest = allAliasTerms().reduce((a, b) => (b.length > a.length ? b : a), "");
  const columnCost = SEARCHABLE_COLUMNS.reduce((sum, c) => sum + c.length, 0);
  // `.ilike."*` + `*"` + one joining comma, per column.
  const perVariant = columnCost + SEARCHABLE_COLUMNS.length * (12 + longest.length);
  const groupSlot = 4 + perVariant * MAX_GROUP_VARIANTS;
  const plainSlot = 4 + perVariant;
  const worst =
    4 + MAX_EXPANDED_GROUPS * groupSlot + (MAX_SLOTS - MAX_EXPANDED_GROUPS) * plainSlot;

  assert.ok(
    worst <= MAX_PREDICATE_CHARS,
    `the caps permit ${worst} characters, above the ${MAX_PREDICATE_CHARS} bound. ` +
      `Lower MAX_SLOTS (${MAX_SLOTS}), MAX_GROUP_VARIANTS (${MAX_GROUP_VARIANTS}) or ` +
      `MAX_EXPANDED_GROUPS (${MAX_EXPANDED_GROUPS}), or raise the bound only after ` +
      `establishing the real gateway limit.`,
  );

  // And a real query built toward that shape stays under it.
  const heavy = must(`${longest} ${"zz ".repeat(30)}`.slice(0, MAX_QUERY_LENGTH));
  assert.ok(
    searchPredicate(heavy).length <= MAX_PREDICATE_CHARS,
    `a heavy real query built ${searchPredicate(heavy).length} characters`,
  );
});

test("every permitted query stays inside the bound", () => {
  // A sweep rather than one adversarial case, because the expensive shape is not
  // obvious: an alias-heavy query and a word-heavy query cost differently.
  const queries = [
    "gas oil",
    "diesel cargo rotterdam",
    "extra virgin olive oil spain germany bulk tanker",
    "freight forwarding morocco casablanca genoa monthly groupage",
    "distributor spain poland germany italy france portugal greece cyprus malta",
    "commercial agent industrial fasteners france germany spain italy",
    "170199",
    "9".repeat(20),
    "cafe".repeat(30).slice(0, MAX_QUERY_LENGTH),
    "z ".repeat(60).slice(0, MAX_QUERY_LENGTH),
  ];
  for (const query of queries) {
    const search = parseSignalSearch(query);
    if (!search) continue;
    const length = searchPredicate(search).length;
    assert.ok(
      length <= MAX_PREDICATE_CHARS,
      `"${query.slice(0, 30)}" built ${length} characters`,
    );
  }
});

test("the vocabulary cannot outgrow the walk that reads it", () => {
  // The longest-match walk looks LONGEST_ALIAS_WORDS ahead, so a term longer
  // than that could never be found. Derived from the table; asserted here.
  for (const term of allAliasTerms()) {
    assert.ok(term.split(" ").length <= LONGEST_ALIAS_WORDS, `"${term}" is longer than the walk`);
  }
  assert.ok(LARGEST_ALIAS_GROUP >= MAX_GROUP_VARIANTS, "no group can even reach the variant cap");
});

// ---------------------------------------------------------------------------
// 3. Accents: four different things, kept apart
//
// The defect: the claim was accent-insensitive search. What shipped normalised
// the query only, then ran ILIKE against columns stored as the sources wrote
// them. ILIKE folds case, never accents, so the folded query could reach
// NEITHER spelling.
// ---------------------------------------------------------------------------

test("an HS code is found in text that still has its dot", () => {
  // The mirror folded punctuation before comparing, which turns `1701.99` into
  // `1701 99`, so a code could never be found as a substring and the fixture
  // gallery reported no match for a record whose hs_code was exactly the code
  // asked for. The database searches the stored value, so the mirror must too.
  const stored = sig({ id: "h1", product: "Refined white sugar ICUMSA 45", hsCode: "1701.99" });
  assert.equal(matchesSearch(stored, must("170199")), true, "the undotted query missed the dotted value");
  assert.equal(matchesSearch(stored, must("1701.99")), true, "the dotted query missed the dotted value");
  assert.equal(matchesSearch(stored, must("1701")), true, "the chapter prefix missed");
  // And a different code is still a different code.
  assert.equal(matchesSearch(stored, must("99999999")), false);
});

test("the mirror searches the raw text as the database does", () => {
  // Both projections are needed. Raw finds a phrase carrying punctuation or an
  // accent; folded gives the extra accent tolerance the mirror is documented as
  // having. A mirror that used only the folded form would disagree with
  // production on every punctuated value.
  const punctuated = sig({ id: "r1", product: "Gas-oil, EN590 10ppm", hsCode: null });
  assert.equal(matchesSearch(punctuated, must("en590")), true);
  assert.equal(matchesSearch(punctuated, must("10ppm")), true);
});

test("JavaScript normalisation folds accents on both sides", () => {
  // The in-memory layer, used by the matcher and by the fixture gallery.
  // Symmetric, and deliberately MORE permissive than the database.
  assert.equal(normaliseSearchText("Café"), "cafe");
  assert.equal(normaliseSearchText("CAFE"), "cafe");
  const accented = sig({ id: "a1", product: "Café arabica" });
  assert.equal(matchesSearch(accented, must("cafe")), true, "the JS matcher is not accent-folding");
  assert.equal(matchesSearch(accented, must("café")), true);
});

test("the accent-preserving fold keeps the accent and drops the punctuation", () => {
  assert.equal(foldPunctuation("Café-Arabica!"), "café arabica");
  assert.equal(stripAccents("café arabica"), "cafe arabica");
  assert.deepEqual(accentVariants("café"), ["café", "cafe"]);
  // A phrase with nothing to fold yields one variant, not a duplicate pair.
  assert.deepEqual(accentVariants("cafe"), ["cafe"]);
});

test("the database predicate carries both accent forms of an accented query", () => {
  // This is the correction: an exact accented search must be able to reach an
  // accented stored value without depending on the unapplied migration.
  const search = must("café");
  assert.equal(search.accented, "café", "the accent-preserving form was not kept");
  assert.equal(search.normalised, "cafe", "the folded form was not kept");
  const predicate = searchPredicate(search);
  assert.ok(predicate.includes('product.ilike."*café*"'), "the accented form is not searched");
  assert.ok(predicate.includes('product.ilike."*cafe*"'), "the folded form is not searched");
  // One concept, two spellings of it.
  assert.equal(conceptCount(predicate), 1);
});

test("an unaccented query reaches only the unaccented spelling, and nothing claims otherwise", () => {
  // The residual gap, asserted so it cannot quietly be described as closed.
  // Generating every accented spelling of a word is combinatorial; the real fix
  // is folding at the database, which PostgREST's filter grammar cannot express.
  const predicate = searchPredicate(must("cafe"));
  assert.ok(predicate.includes('product.ilike."*cafe*"'));
  assert.ok(!predicate.includes("café"), "an accented variant was invented from a plain query");
});

test("an accented query keeps its qualifiers too", () => {
  const search = must("café brazil");
  assert.equal(search.slots.length, 2);
  const predicate = searchPredicate(search);
  assert.ok(predicate.startsWith("and("), "the accent handling broke the AND chain");
  assert.ok(predicate.includes('product.ilike."*café*"'));
  assert.ok(predicate.includes('product.ilike."*brazil*"'));
  assert.equal(conceptCount(predicate), 2);
});

if (process.exitCode) console.error(`\n${passed} passed, some failed.`);
else console.log(`ok   ${passed} search-scope tests passed`);
