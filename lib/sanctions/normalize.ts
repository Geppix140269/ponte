// Name normalisation for sanctions screening.
//
// Every name written into sanctions_entries and every name screened against it
// passes through normalizeName, so both sides are always folded the same way.
// Consistency matters more than linguistic correctness here. A fold that is a
// little too aggressive costs a human a few extra candidates to look at. A fold
// that is inconsistent silently misses a hit, which is the only failure mode
// that actually matters.
//
// Pure string work: no network, no database. That is why this is the part of
// the engine that carries unit tests.

/** Combining marks left behind by NFD decomposition. */
const COMBINING_MARKS = /[̀-ͯ]/g;

// Punctuation and symbols, turned into spaces. Deliberately an explicit range
// list rather than a "not a letter" rule, so that Cyrillic, Greek, Arabic and
// CJK names survive normalisation instead of collapsing to an empty string.
// Ranges, in order: ASCII punctuation in four blocks, Latin-1 punctuation,
// general punctuation, CJK punctuation, fullwidth forms.
const PUNCTUATION =
  /[!-/:-@[-`{-~¡-¿‐-‧‰-⁞、-〃《-】！-／：-＠]/g;

// Letters that NFD does not decompose, so they need an explicit fold.
const SPECIAL_LETTERS: [RegExp, string][] = [
  [/ß/g, "ss"], // sharp s
  [/æ/g, "ae"],
  [/œ/g, "oe"],
  [/ø/g, "o"],
  [/đ/g, "d"],
  [/ð/g, "d"],
  [/þ/g, "th"],
  [/ł/g, "l"],
  [/ħ/g, "h"],
  [/ŋ/g, "n"],
  [/ſ/g, "s"],
  [/ı/g, "i"], // dotless i
];

/**
 * Legal form suffixes stripped from the tail of a name.
 *
 * Exported so tests and callers can reason about the fold instead of guessing
 * at it. Written in their human form: they are tokenised below, so "s.p.a."
 * and "spa" both end up covered.
 */
export const LEGAL_SUFFIXES: string[] = [
  "ltd",
  "limited",
  "llc",
  "inc",
  "incorporated",
  "corp",
  "corporation",
  "gmbh",
  "ag",
  "sa",
  "s.a.",
  "spa",
  "s.p.a.",
  "srl",
  "s.r.l.",
  "bv",
  "nv",
  "plc",
  "pte",
  "pty",
  "oy",
  "ab",
  "as",
  "kft",
  "sp z oo",
  "ooo",
  "oao",
  "zao",
  "co",
  "company",
  "holding",
  "holdings",
  "group",
  "trading",
  "international",
];

/**
 * Extra spellings of forms already in the list above, for the ones that fall
 * apart into single letters once the dots become spaces. "Sp. z o.o." lands as
 * "sp z o o" and not as "sp z oo", so both have to be registered. Kept as a
 * separate export so LEGAL_SUFFIXES stays the canonical list.
 */
export const LEGAL_SUFFIX_SPELLINGS: string[] = [
  "sp z o o",
  "s a r l",
  "n v",
  "b v",
];

/**
 * Legal forms that lead rather than trail, which is how Russian and other post
 * Soviet company names are usually transliterated: "OOO Rosneft".
 * Kept deliberately short. A word like "group" is never stripped from the
 * front, because "Group 4" is a real company name and not a legal form.
 */
export const LEADING_LEGAL_FORMS: string[] = ["ooo", "oao", "zao", "pao"];

function toTokenSequence(suffix: string): string[] {
  return suffix
    .toLowerCase()
    .replace(PUNCTUATION, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function byLengthDesc(a: string[], b: string[]): number {
  return b.length - a.length;
}

/** Every suffix spelling as token sequences, longest first. For tests. */
export const LEGAL_SUFFIX_TOKENS: string[][] = LEGAL_SUFFIXES.concat(
  LEGAL_SUFFIX_SPELLINGS,
)
  .map(toTokenSequence)
  .sort(byLengthDesc);

const LEADING_LEGAL_TOKENS: string[][] = LEADING_LEGAL_FORMS.map(
  toTokenSequence,
).sort(byLengthDesc);

function foldSpecialLetters(input: string): string {
  let out = input;
  for (let i = 0; i < SPECIAL_LETTERS.length; i++) {
    out = out.replace(SPECIAL_LETTERS[i][0], SPECIAL_LETTERS[i][1]);
  }
  return out;
}

function endsWithSequence(tokens: string[], seq: string[]): boolean {
  const offset = tokens.length - seq.length;
  for (let i = 0; i < seq.length; i++) {
    if (tokens[offset + i] !== seq[i]) return false;
  }
  return true;
}

function startsWithSequence(tokens: string[], seq: string[]): boolean {
  for (let i = 0; i < seq.length; i++) {
    if (tokens[i] !== seq[i]) return false;
  }
  return true;
}

/**
 * Strip legal forms as whole tokens, from the tail, then from the head.
 *
 * Two rules keep this from mangling a real name:
 *   1. only whole tokens are ever removed, so "Grouper" keeps its "group",
 *   2. a sequence is never removed if it would consume the entire name, so
 *      "Group 4" keeps its leading "group" and a company called "Holdings"
 *      stays "holdings".
 */
function stripLegalForms(tokens: string[]): string[] {
  let out = tokens.slice();

  let changed = true;
  while (changed && out.length > 0) {
    changed = false;
    for (let i = 0; i < LEGAL_SUFFIX_TOKENS.length; i++) {
      const seq = LEGAL_SUFFIX_TOKENS[i];
      // Never consume the whole name.
      if (seq.length >= out.length) continue;
      if (endsWithSequence(out, seq)) {
        out = out.slice(0, out.length - seq.length);
        changed = true;
        break;
      }
    }
  }

  changed = true;
  while (changed && out.length > 0) {
    changed = false;
    for (let i = 0; i < LEADING_LEGAL_TOKENS.length; i++) {
      const seq = LEADING_LEGAL_TOKENS[i];
      if (seq.length >= out.length) continue;
      if (startsWithSequence(out, seq)) {
        out = out.slice(seq.length);
        changed = true;
        break;
      }
    }
  }

  return out;
}

/**
 * Lowercase, strip diacritics, strip punctuation, collapse whitespace and
 * strip legal form suffixes as whole words.
 */
export function normalizeName(input: string): string {
  if (!input) return "";

  let s = String(input).toLowerCase();
  // Done before punctuation stripping so "Smith & Co" and "Smith and Co" meet.
  s = s.replace(/&/g, " and ");
  s = s.normalize("NFD").replace(COMBINING_MARKS, "");
  s = foldSpecialLetters(s);
  s = s.replace(PUNCTUATION, " ");
  s = s.replace(/\s+/g, " ").trim();
  if (!s) return "";

  return stripLegalForms(s.split(" ")).join(" ");
}

// Transliteration folds. These are the substitutions that separate two honest
// spellings of the same name once it has crossed an alphabet: Yuri and Juri,
// Vladimir and Wladimir, Yusuf and Iusuf, Mohammed and Mohamed.
const TRANSLITERATION_FOLDS: [RegExp, string][] = [
  [/sch/g, "sh"],
  [/ph/g, "f"],
  [/ck/g, "k"],
  [/kh/g, "k"],
  [/gh/g, "g"],
  [/x/g, "ks"],
  [/j/g, "y"],
  [/w/g, "v"],
  [/y/g, "i"],
];

function foldTransliteration(input: string): string {
  let out = input;
  for (let i = 0; i < TRANSLITERATION_FOLDS.length; i++) {
    out = out.replace(TRANSLITERATION_FOLDS[i][0], TRANSLITERATION_FOLDS[i][1]);
  }
  return out;
}

/** "mohammed" to "mohamed", "philipp" to "philip". */
function collapseDoubledLetters(input: string): string {
  return input.replace(/([a-z0-9])\1+/g, "$1");
}

const LEADING_ARTICLES = ["the", "al", "el"];

function stripLeadingArticles(input: string): string {
  const tokens = input.split(" ");
  while (tokens.length > 1 && LEADING_ARTICLES.indexOf(tokens[0]) !== -1) {
    tokens.shift();
  }
  return tokens.join(" ");
}

/**
 * The normalized form plus a small set of plausible alternative spellings.
 *
 * These are surface spellings, not abstract skeletons: they are compared
 * against normalized names already stored in the database, so a variant only
 * helps if it could plausibly be how somebody else wrote the same name.
 * Deliberately capped and deterministic. Every extra variant is another
 * database round trip at screening time.
 */
export function nameVariants(input: string): string[] {
  const base = normalizeName(input);
  if (!base) return [];

  const out: string[] = [base];
  const add = (candidate: string): void => {
    const v = candidate.replace(/\s+/g, " ").trim();
    if (v && out.indexOf(v) === -1) out.push(v);
  };

  add(collapseDoubledLetters(base));
  add(foldTransliteration(base));
  add(collapseDoubledLetters(foldTransliteration(base)));
  add(stripLeadingArticles(base));
  // Run together spellings: "Al Qaida" against "Alqaida".
  add(base.replace(/ /g, ""));

  return out;
}

/**
 * A local mirror of the pg_trgm similarity function.
 *
 * Postgres remains the authority at screening time. This exists so the
 * threshold rules can be reasoned about and tested without a database, and so
 * a test can assert that two spellings really would clear 0.4.
 *
 * pg_trgm pads each word with two leading spaces and one trailing space, takes
 * the set of distinct trigrams, and scores shared / union. Postgres word
 * splitting outside the Latin alphabet depends on locale, so treat this as an
 * approximation there.
 */
export function trigrams(input: string): string[] {
  const words = String(input || "")
    .toLowerCase()
    .replace(PUNCTUATION, " ")
    .split(/\s+/)
    .filter(Boolean);

  const seen: Record<string, true> = {};
  const out: string[] = [];
  for (let w = 0; w < words.length; w++) {
    const padded = "  " + words[w] + " ";
    for (let i = 0; i + 3 <= padded.length; i++) {
      const g = padded.slice(i, i + 3);
      if (!seen[g]) {
        seen[g] = true;
        out.push(g);
      }
    }
  }
  return out;
}

export function trigramSimilarity(a: string, b: string): number {
  const ta = trigrams(a);
  const tb = trigrams(b);
  if (ta.length === 0 || tb.length === 0) return 0;

  const inA: Record<string, true> = {};
  for (let i = 0; i < ta.length; i++) inA[ta[i]] = true;

  let shared = 0;
  for (let i = 0; i < tb.length; i++) {
    if (inA[tb[i]]) shared++;
  }

  return shared / (ta.length + tb.length - shared);
}

/**
 * Best similarity across the variant sets of two names. This is the number the
 * screening pipeline is effectively working with once each variant is queried
 * separately, so it is what the tests assert against.
 */
export function bestVariantSimilarity(a: string, b: string): number {
  const va = nameVariants(a);
  const vb = nameVariants(b);
  let best = 0;
  for (let i = 0; i < va.length; i++) {
    for (let j = 0; j < vb.length; j++) {
      const score = trigramSimilarity(va[i], vb[j]);
      if (score > best) best = score;
    }
  }
  return best;
}
