import { aliasGroupFor, type AliasGroup } from "./aliases";

/**
 * Free-text Market Signal search: the pure half.
 *
 * Everything here is a function of its arguments. No database, no Next, no
 * model call. `lib/board/inventory.ts` builds one PostgREST predicate from
 * `searchPredicate` and orders the result with `compareByRelevance`; this file
 * is the definition of what those two mean, and the unit test reaches all of it
 * without a Supabase client.
 *
 * ---------------------------------------------------------------------------
 * Why the search is deterministic and not a model
 * ---------------------------------------------------------------------------
 * A member typing `gas oil` twice must get the same answer twice, and must get
 * it while they are still looking at the page. A generative call per search
 * fails both: it is non-repeatable, it is slow, and it can assert a match that
 * no record supports. So the vocabulary is a table (`./aliases`), the matching
 * is `ilike` at the database, and the ordering is a total order computed from
 * fields the record actually carries.
 *
 * ---------------------------------------------------------------------------
 * The privacy boundary is a constant, not a convention
 * ---------------------------------------------------------------------------
 * `SEARCHABLE_COLUMNS` below is a strict subset of `PUBLIC_SIGNAL_COLUMNS`, and
 * a test asserts that it is. That is the whole disclosure argument for this
 * feature: a column that cannot be selected publicly cannot be searched, so a
 * counterparty name, a source URL or the source's own prose cannot be inferred
 * by asking whether a search matches it. Searching a private column and hiding
 * the result would leak it just as surely as printing it — the presence of a
 * hit is itself the disclosure.
 */

/**
 * The columns a public text search may read.
 *
 * Every one is in `PUBLIC_SIGNAL_COLUMNS`. Adding a column here without adding
 * it there fails `lib/board/__tests__/market-signals.test.ts`, deliberately.
 *
 * `service_subcategory_keys` and `territory_codes` are absent because they are
 * arrays and `ilike` does not apply to them; both are already reachable through
 * the structured filters, which is the better instrument for them anyway.
 */
export const SEARCHABLE_COLUMNS: readonly string[] = [
  "product",
  "hs_code",
  "summary_line",
  "ai_description",
  "origin",
  "destination",
  "category",
  "side",
  "canonical_signal_id",
];

/** Longest query accepted. Anything beyond is truncated, never rejected. */
export const MAX_QUERY_LENGTH = 120;

/**
 * The most phrases one query may be expanded to.
 *
 * Each phrase becomes one `ilike` per searchable column in a single PostgREST
 * `or=`, so the predicate grows as phrases x columns and travels in a URL.
 * Nine columns and eight phrases is roughly two kilobytes, which is
 * comfortable; removing the cap would let one unlucky query build a request
 * large enough to be refused by the gateway, and a search that fails outright
 * is worse than one that is slightly less generous.
 */
export const MAX_PHRASES = 8;

/** A parsed, normalised search. Null everywhere a query was not usable. */
export type SignalSearch = {
  /** Exactly what the member typed, trimmed. Echoed back to them verbatim. */
  raw: string;
  /** Lower-case, unaccented, unpunctuated, single-spaced. */
  normalised: string;
  /** The normalised query split into words of two characters or more. */
  terms: string[];
  /** Every phrase the query is matched against: the query, then its aliases. */
  phrases: string[];
  /** The alias groups this query was widened by. Empty when none applied. */
  groups: AliasGroup[];
  /** Digits of an HS-code-shaped query, or null. */
  hsDigits: string | null;
};

/**
 * Fold a string into the form everything else here compares against.
 *
 * Diacritics are stripped rather than preserved. A buyer typing `cafe` and a
 * source that wrote `café` mean one thing, and the interface being English-only
 * does not make the input English: the multilingual-input capability the policy
 * preserves is exactly this case.
 */
/**
 * Punctuation, symbols and separators. Everything else survives.
 *
 * Stated as what to REMOVE rather than as what to keep, which is the opposite
 * of the obvious `[^a-z0-9]` and is the reason a query in Greek, Cyrillic,
 * Arabic or Chinese remains a query. Those scripts have no ASCII range to be
 * kept by, so a keep-list silently deletes them and turns a member's search
 * into an empty string -- and multilingual INPUT is exactly what the
 * English-only interface policy preserves.
 *
 * The four ASCII runs are the punctuation between the digits and the letters:
 * !-/, :-@, [-` and {-~. Digits,
 * A-Z and a-z fall in the gaps and are untouched. `%` and `_` sit inside the
 * first and third runs, so neither LIKE wildcard can survive normalisation --
 * which is half of why the result is safe to put in a filter. The remaining
 * ranges are Latin-1 punctuation, general punctuation and CJK punctuation.
 *
 * Unicode-property escapes (`\p{L}`) would say all of this in one class and
 * are not available: this repository compiles without an ES2015 target, so the
 * `u` flag they require is a compile error rather than a matter of taste.
 */
const PUNCTUATION =
  /[!-/:-@[-`{-~ -¿ -⁯　-〿]+/g;

export function normaliseSearchText(value: string): string {
  return value
    .normalize("NFD")
    // Combining marks, removed after decomposition: é -> e + U+0301 -> e.
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(PUNCTUATION, " ")
    .trim()
    .replace(/\s+/g, " ");
}

/** HS-shaped input: digits, dots, spaces and hyphens only, four digits or more. */
function hsDigitsOf(raw: string): string | null {
  if (!/^[\d.\s-]+$/.test(raw)) return null;
  const digits = raw.replace(/\D/g, "");
  return digits.length >= 4 ? digits.slice(0, 10) : null;
}

/**
 * The forms an HS code is stored in.
 *
 * `desk_radar.hs_code` holds whatever the source gave, which is `1701.99` in
 * some rows and `170199` in others. A member types one and means both, so a
 * search for `170199` looks for the dotted form too. Nothing here decides that
 * a record IS a given HS class; it only looks for the string.
 */
function hsVariants(digits: string): string[] {
  const out: string[] = [];
  const add = (v: string) => {
    if (out.indexOf(v) < 0) out.push(v);
  };
  add(digits);
  if (digits.length > 4) add(`${digits.slice(0, 4)}.${digits.slice(4)}`);
  if (digits.length > 6) add(`${digits.slice(0, 4)}.${digits.slice(4, 6)}`);
  return out;
}

/**
 * Read a member's query into a search, or return null if there is none.
 *
 * Null is returned for an absent, blank or one-character query. A single
 * character matches most of the inventory and orders none of it, so treating it
 * as a search would print a full board under a heading claiming it was a
 * result. Not searching is the truthful answer to it.
 */
export function parseSignalSearch(raw: string | null | undefined): SignalSearch | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.replace(/\s+/g, " ").trim().slice(0, MAX_QUERY_LENGTH);
  if (trimmed.length === 0) return null;

  const normalised = normaliseSearchText(trimmed);
  if (normalised.length < 2) return null;

  const terms = normalised.split(" ").filter((t) => t.length >= 2);
  const hsDigits = hsDigitsOf(trimmed);

  // Aliases are matched on the WHOLE query and on each of its words, so
  // `gas oil` finds the group by its phrase and `diesel delivery rotterdam`
  // finds it by a word. A group found either way contributes all of its terms.
  const groups: AliasGroup[] = [];
  const seenGroup = new Set<string>();
  for (const candidate of [normalised, ...terms]) {
    const group = aliasGroupFor(candidate);
    if (group && !seenGroup.has(group.key)) {
      seenGroup.add(group.key);
      groups.push(group);
    }
  }

  const phrases: string[] = [];
  const push = (p: string) => {
    if (p.length >= 2 && !phrases.includes(p) && phrases.length < MAX_PHRASES) phrases.push(p);
  };

  // The member's own words first, so their query is never crowded out of its
  // own search by the vocabulary that was supposed to help it.
  if (hsDigits) for (const variant of hsVariants(hsDigits)) push(variant);
  else push(normalised);
  for (const group of groups) for (const term of group.terms) push(term);

  return { raw: trimmed, normalised, terms, phrases, groups, hsDigits };
}

/**
 * Quote a value for a PostgREST filter.
 *
 * Values reaching this are already normalised to letters, digits and spaces, so
 * there is nothing left to escape. The quoting is here anyway, because the
 * argument that a value is safe should not have to be reconstructed from two
 * files by whoever next changes the normaliser.
 */
function quoted(value: string): string {
  return `"${value.replace(/["\\]/g, "")}"`;
}

/**
 * The PostgREST `or=` predicate for a search.
 *
 * Read it as: **any phrase anywhere, OR every word somewhere.**
 *
 *     or=( product.ilike."*gas oil*", ... ,          <- phrase, incl. aliases
 *          and( or(product.ilike."*gas*", ...),      <- every word,
 *               or(product.ilike."*oil*", ...) ) )      each in some column
 *
 * The two halves answer different questions and both are needed. The phrase
 * half is what makes an alias work: a record titled `Diesel EN590` contains
 * neither the word `gas` nor the word `oil`, so an all-words rule alone would
 * miss the exact record the alias exists to find. The all-words half is what
 * keeps a multi-word query precise: `olive oil spain` should not return every
 * record mentioning Spain.
 *
 * Both halves run inside the eligibility predicate and inside every structured
 * filter, which are applied with AND. Widening never crosses that line.
 *
 * `columns` is a parameter because the Qualified lane searches `listings` and
 * the board searches `desk_radar`, and the two tables name their public text
 * differently. The RULE is shared so one URL cannot mean two things on two
 * surfaces; only the column list differs, and each caller's list is asserted
 * against its own public-read contract.
 */
export function searchPredicate(
  search: SignalSearch,
  columns: readonly string[] = SEARCHABLE_COLUMNS,
): string {
  const anyColumn = (value: string) =>
    columns.map((c) => `${c}.ilike.${quoted(`*${value}*`)}`);

  const clauses: string[] = [];
  for (const phrase of search.phrases) clauses.push(...anyColumn(phrase));

  // Only when there is more than one word. With one word the phrase half above
  // is already exactly this clause, and repeating it doubles the predicate for
  // no additional row.
  if (search.terms.length > 1) {
    const perTerm = search.terms.map((t) => `or(${anyColumn(t).join(",")})`);
    clauses.push(`and(${perTerm.join(",")})`);
  }

  return clauses.join(",");
}

// ---------------------------------------------------------------------------
// Relevance
// ---------------------------------------------------------------------------

/**
 * The relevance bands, best first.
 *
 * Numbers rather than names in the comparison, so the order is the arithmetic
 * and cannot drift from a separate table saying what the order should be.
 */
export const RANK = {
  hsExact: 0,
  productExact: 1,
  productPrefix: 2,
  hsPrefix: 3,
  productPhrase: 4,
  textPhrase: 5,
  allTerms: 6,
  partial: 7,
  none: 8,
} as const;

/** The public facts a signal is ranked on. A subset of `MarketSignal`. */
export type RankableSignal = {
  id: string;
  product: string;
  hsCode: string | null;
  canonicalId: string | null;
  category: string | null;
  summaryLine: string | null;
  description: string | null;
  originText: string | null;
  destinationText: string | null;
  side: string;
  spottedAt: string;
};

/** Everything about a signal a member's words are compared against. */
function searchableText(signal: RankableSignal): string {
  return normaliseSearchText(
    [
      signal.product,
      signal.hsCode,
      signal.canonicalId,
      signal.category,
      signal.summaryLine,
      signal.description,
      signal.originText,
      signal.destinationText,
      signal.side,
    ]
      .filter(Boolean)
      .join(" "),
  );
}

/**
 * How well this signal answers this search. Lower is better.
 *
 * The bands follow the requirement's order: an exact HS code beats an exact
 * product name, which beats a phrase inside the product name, which beats the
 * same phrase found only in the description, which beats a record that merely
 * contains all the words somewhere.
 *
 * A record scoring `none` was returned by the database predicate but cannot be
 * placed by any band here. It is kept and sorted last rather than dropped:
 * the database found a genuine `ilike` match in a public column, and discarding
 * it would mean the count above the list stopped matching the list.
 */
export function relevanceOf(signal: RankableSignal, search: SignalSearch): number {
  const product = normaliseSearchText(signal.product ?? "");
  const hs = (signal.hsCode ?? "").replace(/\D/g, "");

  if (search.hsDigits && hs) {
    if (hs === search.hsDigits) return RANK.hsExact;
    if (hs.startsWith(search.hsDigits) || search.hsDigits.startsWith(hs)) return RANK.hsPrefix;
  }

  for (const phrase of search.phrases) {
    if (product === phrase) return RANK.productExact;
  }
  for (const phrase of search.phrases) {
    if (product.startsWith(`${phrase} `)) return RANK.productPrefix;
  }
  for (const phrase of search.phrases) {
    if (product.includes(phrase)) return RANK.productPhrase;
  }

  const text = searchableText(signal);
  for (const phrase of search.phrases) {
    if (text.includes(phrase)) return RANK.textPhrase;
  }

  if (search.terms.length > 0) {
    const present = search.terms.filter((t) => text.includes(t));
    if (present.length === search.terms.length) return RANK.allTerms;
    if (present.length > 0) return RANK.partial;
  }

  return RANK.none;
}

/**
 * Does this signal match this search at all?
 *
 * The in-memory statement of the rule `searchPredicate` asks the database, and
 * it has to say the same thing: **any phrase anywhere, or every word
 * somewhere.** `RANK.allTerms` is the last band either half of that predicate
 * can produce, so the threshold is the boundary between them.
 *
 * `RANK.partial` sits below it deliberately. A row matching only SOME of the
 * words is not returned by the database predicate and so cannot appear in a
 * production result. The band exists so that a row which somehow arrives
 * anyway is ranked last rather than treated as a match, which is the safer of
 * the two ways to be wrong.
 */
export function matchesSearch(signal: RankableSignal, search: SignalSearch): boolean {
  return relevanceOf(signal, search) <= RANK.allTerms;
}

/**
 * A total order over the matched set: relevance, then newest, then id.
 *
 * The last two are not decoration. Offset pagination over a non-total order is
 * unstable — a record can appear on page one and again on page two, or on
 * neither — so every comparison has to end in a tie-break that no two records
 * can share. `id` is the primary key, so it always separates them.
 */
export function compareByRelevance(
  a: RankableSignal,
  b: RankableSignal,
  search: SignalSearch,
): number {
  const ra = relevanceOf(a, search);
  const rb = relevanceOf(b, search);
  if (ra !== rb) return ra - rb;
  if (a.spottedAt !== b.spottedAt) return a.spottedAt < b.spottedAt ? 1 : -1;
  return a.id < b.id ? 1 : a.id > b.id ? -1 : 0;
}
