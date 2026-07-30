import {
  aliasGroupFor,
  LONGEST_ALIAS_WORDS,
  type AliasGroup,
} from "./aliases";

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

// ---------------------------------------------------------------------------
// The bounds, and why each one exists
// ---------------------------------------------------------------------------
/**
 * The most concepts one query may be reduced to.
 *
 * A 120-character query can hold forty two-character words. Each becomes one
 * mandatory group of nine `ilike` filters, so an unbounded query builds a
 * PostgREST filter of roughly ten kilobytes and is refused by the gateway. A
 * search that fails outright is worse than one that is slightly less generous.
 *
 * Six rather than eight because the two expanded groups dominate the budget: at
 * five variants across nine columns each costs about two kilobytes, so the
 * concept count is what had to give to keep the worst case provably inside
 * `MAX_PREDICATE_CHARS`. A six-concept query is already highly specific.
 *
 * Excess words are dropped from the END, which is deterministic and keeps the
 * leading words a member actually led with. Dropping a mandatory word BROADENS
 * the result, so it is the one degradation here that could mislead, and the
 * surface says so when it happens (`droppedConcepts`).
 */
export const MAX_SLOTS = 6;

/**
 * The most alternatives one alias group may contribute.
 *
 * Bounds the widening rather than the query. The member's own words are always
 * first in a slot, so this can only ever cut vocabulary terms, which narrows.
 */
export const MAX_GROUP_VARIANTS = 5;

/**
 * The most alias groups one query may expand.
 *
 * A third group would add another nine-times-five filters. Past this cap a
 * recognised phrase is searched as itself, which is narrower than its group and
 * therefore always safe.
 */
export const MAX_EXPANDED_GROUPS = 2;

/**
 * The documented safe size of the generated PostgREST filter, in characters.
 *
 * The filter travels in the URL. Supabase fronts PostgREST with Kong, whose
 * default header and request-line buffers are 8 KB, and the rest of the request
 * (the public column list, the status and expiry predicates, the order and the
 * exact count) costs several hundred characters more. Six kilobytes leaves room
 * for all of it with about two to spare.
 *
 * The number is not a guess: `scripts/verify-signal-search.ts` sends the
 * longest query the caps permit to the real gateway, reports the byte size it
 * built and whether PostgREST accepted it, and that evidence is recorded in the
 * pull request. Move this only with a fresh run.
 *
 * This is not enforced at runtime, deliberately: the caps above make the worst
 * case reachable by construction, and
 * `lib/search/__tests__/signal-search.test.ts` builds the single most expensive
 * query the caps permit and asserts the result fits. Raising a cap, or adding a
 * searchable column, fails that test rather than shipping a request the gateway
 * will refuse.
 */
export const MAX_PREDICATE_CHARS = 6144;

/**
 * One concept the member asked for, and every phrase that satisfies it.
 *
 * A slot is MANDATORY. The predicate ANDs the slots and ORs within them, which
 * is the whole correction: an alias group substitutes for the concept that
 * triggered it and leaves every other word the member typed in force.
 *
 * The first draft treated each expanded alias as an independent top-level OR,
 * so `diesel cargo rotterdam` matched any record containing `gas oil` and
 * neither qualifier. That is not a widened search, it is a different one.
 */
export type SearchSlot = {
  /** The words from the query this slot stands for, accents intact. */
  source: string;
  /** The group this slot expanded to, or null when it is the words themselves. */
  group: AliasGroup | null;
  /**
   * Every phrase that satisfies this slot, ORed at the database.
   *
   * Always includes the member's own words first, in both their accented and
   * accent-folded forms where those differ. See `accentVariants` for why both.
   */
  variants: string[];
};

/** A parsed, normalised search. Null everywhere a query was not usable. */
export type SignalSearch = {
  /** Exactly what the member typed, trimmed. Echoed back to them verbatim. */
  raw: string;
  /** Lower-case, accent-FOLDED, unpunctuated, single-spaced. */
  normalised: string;
  /**
   * Lower-case, accent-PRESERVING, unpunctuated, single-spaced.
   *
   * Kept because the database cannot fold accents. See the accent section on
   * `accentVariants`.
   */
  accented: string;
  /** The words actually searched, accent-folded, two characters or more. */
  terms: string[];
  /** The mandatory concepts, in the member's own order. ANDed. */
  slots: SearchSlot[];
  /** Every phrase searched, member's words first. Used for relevance banding. */
  phrases: string[];
  /** The same phrases accent-folded, for comparison against a record in memory. */
  foldedPhrases: string[];
  /** The alias groups this query was widened by. Empty when none applied. */
  groups: AliasGroup[];
  /** Digits of an HS-code-shaped query, or null. */
  hsDigits: string | null;
  /** Words dropped by `MAX_SLOTS`. Non-zero means the search was broadened. */
  droppedConcepts: number;
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

/**
 * Lower-case, unpunctuated, single-spaced, and accents left ALONE.
 *
 * The form the database is actually asked about. See `accentVariants`.
 */
export function foldPunctuation(value: string): string {
  return value
    .toLowerCase()
    .replace(PUNCTUATION, " ")
    .trim()
    .replace(/\s+/g, " ");
}

/** Remove diacritics. Decompose, then drop the combining marks. */
export function stripAccents(value: string): string {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/** Both foldings at once. The form used for every comparison made in memory. */
export function normaliseSearchText(value: string): string {
  return stripAccents(foldPunctuation(value));
}

/**
 * Both accent forms of a phrase, because Postgres cannot fold accents and this
 * repository cannot make it.
 *
 * ---------------------------------------------------------------------------
 * The asymmetry that made the first draft's claim untrue
 * ---------------------------------------------------------------------------
 * In memory, both sides are folded: `normaliseSearchText` is applied to the
 * query AND to the record, so an accented and an unaccented spelling match
 * either way round. That is what the JavaScript matcher and the fixture gallery
 * do, and it is more permissive than production.
 *
 * The database gets no such symmetry. It receives a normalised QUERY and runs
 * `ILIKE` against columns exactly as the sources stored them. `ILIKE` folds
 * case; it does not fold accents. So a folded query cannot reach an accented
 * stored value, and the first draft, which sent only the folded form, could
 * reach neither direction: it had folded the member's accent away before asking.
 *
 * Sending both forms fixes the direction that matters. An accented query reaches
 * an accented value, and a plain query reaches a plain value.
 *
 * The remaining gap is real and is NOT claimed to be closed: an unaccented query
 * cannot reach an accented stored value, because generating every accented
 * spelling of a word is combinatorial. Closing it properly needs the database to
 * do the folding, through `unaccent` on a stored generated column or a search
 * function, and PostgREST's filter grammar can call neither. Recorded as a
 * follow-up rather than described as working.
 */
export function accentVariants(value: string): string[] {
  const folded = stripAccents(value);
  return folded === value ? [value] : [value, folded];
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
 * Reduce a query to the mandatory concepts it names.
 *
 * Walks the words left to right, taking at each position the LONGEST run that
 * names an alias group. That is what lets a multi-word alias keep its
 * qualifiers: `freight forwarding morocco` becomes the freight-forwarding
 * concept AND `morocco`, not three loose words and not a widened phrase with
 * `morocco` made optional.
 *
 * Every slot returned is mandatory. Two degradations are possible and they run
 * in opposite directions, so which is which is stated rather than left implied:
 *
 *   past `MAX_EXPANDED_GROUPS`  a recognised phrase is searched as itself.
 *                              NARROWS. Always safe.
 *   past `MAX_SLOTS`            trailing words are dropped. BROADENS, so the
 *                              count is returned and the surface says so.
 */
function buildSlots(
  accented: string,
  hsDigits: string | null,
): { slots: SearchSlot[]; dropped: number } {
  // An HS code is one concept however it is punctuated. Splitting `1701.99`
  // into `1701` AND `99` would make two mandatory words out of one number.
  if (hsDigits) {
    return {
      slots: [{ source: hsDigits, group: null, variants: hsVariants(hsDigits) }],
      dropped: 0,
    };
  }

  const words = accented.split(" ").filter((w) => w.length > 0);
  const folded = words.map(stripAccents);
  const built: SearchSlot[] = [];
  let expanded = 0;
  let i = 0;

  while (i < words.length) {
    let span = 1;
    let group: AliasGroup | null = null;
    for (let len = Math.min(LONGEST_ALIAS_WORDS, words.length - i); len >= 1; len--) {
      const hit = aliasGroupFor(folded.slice(i, i + len).join(" "));
      if (hit) {
        group = hit;
        span = len;
        break;
      }
    }

    const source = words.slice(i, i + span).join(" ");
    // A one-character word carries no information and would match most of the
    // inventory, so it is not made mandatory.
    if (folded.slice(i, i + span).join(" ").length >= 2) {
      if (group && expanded < MAX_EXPANDED_GROUPS) {
        expanded += 1;
        const variants: string[] = [];
        const add = (v: string) => {
          if (v.length >= 2 && variants.indexOf(v) < 0 && variants.length < MAX_GROUP_VARIANTS) {
            variants.push(v);
          }
        };
        // The member's own words first, always. The vocabulary exists to widen
        // their search, never to replace it: a cap that cut their own phrase
        // would answer a question they did not ask.
        for (const v of accentVariants(source)) add(v);
        for (const term of group.terms) add(term);
        built.push({ source, group, variants });
      } else {
        built.push({ source, group: null, variants: accentVariants(source) });
      }
    }
    i += span;
  }

  // One concept per slot: `diesel diesel cargo` asks for two things, not three.
  const seen = new Set<string>();
  const unique = built.filter((slot) => {
    const key = stripAccents(slot.source);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const kept = unique.slice(0, MAX_SLOTS);
  return { slots: kept, dropped: unique.length - kept.length };
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

  const accented = foldPunctuation(trimmed);
  const normalised = stripAccents(accented);
  if (normalised.length < 2) return null;

  const hsDigits = hsDigitsOf(trimmed);
  const { slots, dropped } = buildSlots(accented, hsDigits);
  if (slots.length === 0) return null;

  const groups: AliasGroup[] = [];
  const phrases: string[] = [];
  const terms: string[] = [];
  for (const slot of slots) {
    if (slot.group) groups.push(slot.group);
    for (const variant of slot.variants) {
      if (phrases.indexOf(variant) < 0) phrases.push(variant);
    }
    for (const word of stripAccents(slot.source).split(" ")) {
      if (word.length >= 2 && terms.indexOf(word) < 0) terms.push(word);
    }
  }

  const foldedPhrases: string[] = [];
  for (const phrase of phrases) {
    const folded = stripAccents(phrase);
    if (foldedPhrases.indexOf(folded) < 0) foldedPhrases.push(folded);
  }

  return {
    raw: trimmed,
    normalised,
    accented,
    terms,
    slots,
    phrases,
    foldedPhrases,
    groups,
    hsDigits,
    droppedConcepts: dropped,
  };
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
 * Read it as: **every concept must be satisfied, by any of its phrases.**
 *
 *     and( or(product.ilike."*diesel*", ... , product.ilike."*en590*", ...),
 *          or(product.ilike."*cargo*", ...),
 *          or(product.ilike."*rotterdam*", ...) )
 *
 * AND between slots, OR inside them. That single shape is the correction: an
 * alias group substitutes for the concept that triggered it, and every other
 * word the member typed stays mandatory. `diesel cargo rotterdam` therefore
 * means
 *
 *     (diesel OR gas oil OR gasoil OR EN590) AND cargo AND rotterdam
 *
 * and not
 *
 *     diesel OR gas oil OR gasoil OR EN590 OR (diesel AND cargo AND rotterdam)
 *
 * which is what the first draft built, and which returned every middle-distillate
 * record on the board to a member asking about one cargo into one port.
 *
 * The string returned is the CONTENTS of `or=(...)`, because the caller passes
 * it to `.or()`. A single concept needs no wrapper; several are wrapped in
 * `and(...)`, which PostgREST nests inside `or=` without complaint.
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

  const clauses = search.slots.map((slot) => {
    const filters: string[] = [];
    for (const variant of slot.variants) filters.push(...anyColumn(variant));
    return `or(${filters.join(",")})`;
  });

  if (clauses.length === 0) return "";
  // Unwrap the lone `or(...)`: the caller supplies the outer one.
  if (clauses.length === 1) return clauses[0].slice(3, -1);
  return `and(${clauses.join(",")})`;
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

/** Every public fact of a signal, as one string, in a fixed order. */
function publicFacts(signal: RankableSignal): string {
  return [
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
    .join(" ");
}

/**
 * A signal's public text with its punctuation and accents INTACT, lower-cased.
 *
 * This is the projection the database actually searches: `ILIKE` runs against
 * the stored value, so a phrase carrying a dot or an accent has to be looked for
 * in text that still has them. Folding first was a real defect in the mirror -
 * `normaliseSearchText` turns `1701.99` into `1701 99`, so an HS code could
 * never be found as a substring of the folded text, and the fixture gallery
 * reported no match for a record whose `hs_code` was exactly the code asked for.
 */
function searchableRaw(signal: RankableSignal): string {
  return publicFacts(signal).toLowerCase();
}

/** The same text folded, for comparisons that should ignore accents. */
function searchableText(signal: RankableSignal): string {
  return normaliseSearchText(publicFacts(signal));
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

  // `foldedPhrases`, not `phrases`: the record side is folded by
  // `normaliseSearchText`, so an accent-preserving phrase would never compare
  // equal to it. Precomputed once per search rather than per row.
  for (const phrase of search.foldedPhrases) {
    if (product === phrase) return RANK.productExact;
  }
  for (const phrase of search.foldedPhrases) {
    if (product.startsWith(`${phrase} `)) return RANK.productPrefix;
  }
  for (const phrase of search.foldedPhrases) {
    if (product.includes(phrase)) return RANK.productPhrase;
  }

  const text = searchableText(signal);
  for (const phrase of search.foldedPhrases) {
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
 * Does this signal satisfy every concept the member asked for?
 *
 * The in-memory mirror of `searchPredicate`: every slot must be satisfied by at
 * least one of its phrases. It is deliberately the same shape, so the fixture
 * gallery and the production board agree about what matches.
 *
 * It is NOT identical, and the two differences are stated rather than glossed:
 *
 *   accents   both sides are folded here, so this is accent-insensitive in both
 *             directions. `ILIKE` at the database is not. See `accentVariants`.
 *   columns   this searches the record's public text as one string, so a phrase
 *             may span two fields. The database requires each phrase to sit
 *             inside a single column. This is therefore slightly more
 *             permissive, which is the safer direction for a mirror used only
 *             to build evidence.
 */
export function matchesSearch(signal: RankableSignal, search: SignalSearch): boolean {
  const raw = searchableRaw(signal);
  const folded = searchableText(signal);
  return search.slots.every((slot) =>
    slot.variants.some(
      // The raw projection is the database's behaviour; the folded one is the
      // extra tolerance this mirror deliberately has. Both are needed: raw
      // finds `1701.99` and an accented spelling, folded finds an unaccented
      // query against an accented value.
      (variant) => raw.includes(variant) || folded.includes(stripAccents(variant)),
    ),
  );
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
