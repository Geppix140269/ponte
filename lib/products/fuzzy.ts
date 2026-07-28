/**
 * Stage 2 of the resolution cascade: the member spelled a catalogue product
 * wrong.
 *
 * `gasoill`, `icumsa 45 suger`, `jet a1 fue` are all one keystroke away from a
 * product Ponte already holds, and none of them matched stage 1, which is exact
 * on the normalised form. Answering them needs edit distance, not another
 * synonym.
 *
 * ## Why this cannot be the whole answer to a misspelling
 *
 * It corrects a misspelling of something **in the catalogue**. `avogado` is a
 * misspelling of a product the catalogue does not hold, so no amount of edit
 * distance over catalogue terms will reach it; that is the identification
 * stage's job. This stage exists so the free, deterministic path handles the
 * cases it genuinely can, and so a typo does not cost a model call.
 *
 * ## Damerau, not plain Levenshtein
 *
 * The transposition case is the common one in typing: `gaosil` for `gasoil`,
 * `avocdao` for `avocado`. Plain Levenshtein charges two edits for a swapped
 * pair and would push real typos past the threshold.
 *
 * No database, no Next, no model. Pure and fast: the catalogue is a few hundred
 * terms and the distance is bounded, so a mistyped word costs microseconds.
 */

import { PRODUCT_CATALOGUE } from "./catalogue";
import type { CatalogueProduct } from "./model";
import { normalise } from "./resolve";

/**
 * Optimal string alignment distance, bounded.
 *
 * Bounded because an unbounded distance over every catalogue term is work
 * spent proving that two obviously different words are different. Once the
 * best possible remaining score exceeds `max` the answer cannot matter, so it
 * returns early.
 */
export function editDistance(a: string, b: string, max = 3): number {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > max) return max + 1;

  const rows: number[][] = [];
  for (let i = 0; i <= a.length; i++) rows.push(new Array<number>(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) rows[i][0] = i;
  for (let j = 0; j <= b.length; j++) rows[0][j] = j;

  for (let i = 1; i <= a.length; i++) {
    let best = Infinity;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let d = Math.min(rows[i - 1][j] + 1, rows[i][j - 1] + 1, rows[i - 1][j - 1] + cost);
      // The transposition, which is what makes this Damerau rather than plain
      // Levenshtein: "gaosil" is one mistake, not two.
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d = Math.min(d, rows[i - 2][j - 2] + 1);
      }
      rows[i][j] = d;
      if (d < best) best = d;
    }
    if (best > max) return max + 1;
  }
  return rows[a.length][b.length];
}

/**
 * How far wrong a word may be and still be that word.
 *
 * Scaled by length, because one wrong letter in a four-letter word is a
 * different word and one wrong letter in a twelve-letter word is a typo.
 */
function tolerance(length: number): number {
  if (length <= 4) return 0;
  if (length <= 7) return 1;
  if (length <= 12) return 2;
  return 3;
}

export interface FuzzyMatch {
  product: CatalogueProduct;
  /** The catalogue term the member was probably reaching for. */
  term: string;
  /** Edits away. Lower is better. */
  distance: number;
  /** [0,1]. Never as high as an exact match: a guess at what was meant. */
  score: number;
}

/**
 * The catalogue products a misspelling probably meant.
 *
 * Returns an empty array rather than a weak guess when nothing is close, so the
 * cascade moves on to identification instead of correcting a member towards a
 * product they did not mean. Suggesting `gasoil` to someone who typed `avocado`
 * would be worse than saying nothing.
 */
export function fuzzyMatches(raw: string, limit = 4): FuzzyMatch[] {
  const query = normalise(raw);
  if (query.compact.length < 4) return [];

  const out = new Map<string, FuzzyMatch>();

  for (const product of PRODUCT_CATALOGUE) {
    const terms = [product.name, ...product.synonyms, ...product.standards];
    for (const term of terms) {
      const t = normalise(term);
      if (!t.compact) continue;
      const max = tolerance(Math.max(t.compact.length, query.compact.length));
      if (max === 0) continue;

      const distance = editDistance(query.compact, t.compact, max);
      if (distance > max) continue;

      // Scaled so a one-edit correction on a long word scores better than a
      // one-edit correction on a short one, and so nothing here can reach the
      // exact-match score in `resolve.ts`. A correction is always a suggestion.
      const score = Math.max(0.4, 0.86 - 0.12 * distance - Math.max(0, 0.02 * (8 - t.compact.length)));
      const existing = out.get(product.key);
      if (!existing || distance < existing.distance) {
        out.set(product.key, { product, term, distance, score: Number(score.toFixed(3)) });
      }
    }
  }

  return Array.from(out.values())
    .sort((a, b) => a.distance - b.distance || b.score - a.score || a.product.name.localeCompare(b.product.name))
    .slice(0, limit);
}
