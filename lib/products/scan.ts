/**
 * The deterministic multi-product scan.
 *
 * ## Why this exists beside the model extraction
 *
 * The acceptance case the owner set is a real supply offer naming three
 * products: a 10 ppm gasoil, a D6 residual fuel oil and Jet A-1. The required
 * outcome is three identified products, not one generic listing. If the only
 * thing that could produce that answer were a model call, then the acceptance
 * criterion could only ever be checked by hand against a service that may be
 * down, rate limited or differently tuned next week.
 *
 * So the *identification* of products in a document is deterministic: it is
 * this module, running the catalogue's own synonym index over the extracted
 * text. `./extract-document.ts` uses the model for the commercial terms, which
 * genuinely need reading comprehension, and folds this scan's products in. The
 * three-product test therefore proves a property of the repository rather than
 * a property of a model's mood.
 *
 * ## Longest match wins
 *
 * "Gasoil 10ppm (ULSD EN590)" contains `gasoil`, `gasoil 10ppm`, `ulsd` and
 * `en590`, all four of which are terms of one product, and "D6 Virgin Fuel Oil"
 * contains both `d6` and `virgin fuel oil`. Counting every term separately
 * would rank a thoroughly catalogued product above a thinly catalogued one for
 * reasons that have nothing to do with the document. Terms are therefore
 * matched longest-first and a matched span is consumed, so each mention is
 * counted once.
 */

import { PRODUCT_CATALOGUE } from "./catalogue";
import type { CatalogueProduct } from "./model";

/** One product found in a document, with the evidence that found it. */
export interface ProductMention {
  product: CatalogueProduct;
  /**
   * The document's own words for this product, verbatim and in its own casing.
   *
   * Not the catalogue term that matched. Two reasons, and both are rules rather
   * than preferences. North Star 3.4 puts the user's language above the
   * database's, and this is the value the review screen prints as "Your words".
   * And the longest term matching Jet A-1 in the acceptance fixture is
   * `DEF STAN 91-091`: a standard designation is strong evidence and a useless
   * name, so a review headed with a defence standard instead of a fuel would be
   * unreadable.
   *
   * So the span is taken from the document itself, preferring a match on a
   * synonym over one on a standard. The standards stay in `terms`, which is
   * where evidence belongs.
   */
  label: string;
  /** The catalogue terms that matched, longest first. */
  terms: readonly string[];
  /** How many distinct, non-overlapping spans matched. */
  mentions: number;
  /** The verbatim line the product first appeared on. Never paraphrased. */
  quote: string;
  /** Ordering weight: specificity of the terms, then how often they appeared. */
  score: number;
}

interface Token {
  /** Normalised, lower case, letters or digits only. */
  t: string;
  start: number;
  end: number;
}

function fold(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "");
}

/**
 * Split into letter runs and digit runs, keeping each token's offset in the
 * original text so a match can be quoted verbatim rather than reconstructed.
 * The letter/digit split is what makes `EN590` and `EN 590`, and `10ppm` and
 * `10 ppm`, the same sequence.
 */
function tokenise(raw: string): Token[] {
  const out: Token[] = [];
  const re = /[A-Za-z]+|\d+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw)) !== null) {
    out.push({ t: fold(m[0]), start: m.index, end: m.index + m[0].length });
  }
  return out;
}

/**
 * Tidy a span lifted out of a document.
 *
 * A matched token range can start inside a bracket and end outside it, because
 * the match is on words and the punctuation between them is not part of the
 * comparison. "Gasoil 10ppm (ULSD EN590)" matched from `Gasoil` to `EN590`
 * yields "Gasoil 10ppm (ULSD EN590", and printing that back to a member as
 * their own words looks like a bug because it is one. Cutting at the unmatched
 * bracket leaves "Gasoil 10ppm", which is what the document actually calls it.
 */
function tidySpan(span: string): string {
  let text = span.trim();
  const opens = (text.match(/\(/g) ?? []).length;
  const closes = (text.match(/\)/g) ?? []).length;
  if (opens > closes) text = text.slice(0, text.lastIndexOf("(")).trim();
  else if (closes > opens) text = text.slice(text.indexOf(")") + 1).trim();
  return text.replace(/^[\s,;:/-]+|[\s,;:/-]+$/g, "");
}

/** The line a character offset falls on, trimmed and capped. */
function lineAt(raw: string, offset: number): string {
  const start = raw.lastIndexOf("\n", offset) + 1;
  const end = raw.indexOf("\n", offset);
  const line = raw.slice(start, end === -1 ? raw.length : end).trim();
  return line.length > 220 ? `${line.slice(0, 217)}...` : line;
}

/** A catalogue term as its token sequence, with the weight of its class. */
interface Term {
  product: CatalogueProduct;
  original: string;
  tokens: string[];
  /** A named standard is stronger evidence than a colloquial synonym. */
  weight: number;
}

function termsIndex(): Term[] {
  const terms: Term[] = [];
  for (const product of PRODUCT_CATALOGUE) {
    const add = (original: string, weight: number) => {
      const tokens = tokenise(original).map((x) => x.t);
      if (tokens.length === 0) return;
      terms.push({ product, original, tokens, weight });
    };
    add(product.name, 1);
    for (const s of product.standards) add(s, 1);
    for (const s of product.synonyms) add(s, 0.7);
  }
  // Longest first so a specific term consumes the span before a generic one
  // inside it can claim it.
  return terms.sort((a, b) => b.tokens.length - a.tokens.length || b.weight - a.weight);
}

const TERMS = termsIndex();

export interface ScanOptions {
  /** Drop products whose only evidence is a single weak mention. */
  minScore?: number;
}

/**
 * Find every catalogue product named in a block of text.
 *
 * Returns them ranked, with the terms and the verbatim line that found each.
 * An empty array means the text named nothing in the catalogue, which the
 * caller must render as an explained outcome rather than a blank screen.
 */
export function scanForProducts(raw: string, options: ScanOptions = {}): ProductMention[] {
  const minScore = options.minScore ?? 0.7;
  const tokens = tokenise(raw);
  if (tokens.length === 0) return [];

  const words = tokens.map((x) => x.t);
  /** Spans already claimed, so an inner term cannot double-count a mention. */
  const claimed: boolean[] = new Array(tokens.length).fill(false);

  const found = new Map<
    string,
    {
      product: CatalogueProduct;
      terms: Set<string>;
      mentions: number;
      weight: number;
      firstOffset: number;
      /** The verbatim span that best names the product, and how good it is. */
      label: string;
      labelRank: number;
    }
  >();

  for (const term of TERMS) {
    const n = term.tokens.length;
    for (let i = 0; i + n <= words.length; i++) {
      let hit = true;
      for (let k = 0; k < n; k++) {
        if (claimed[i + k] || words[i + k] !== term.tokens[k]) {
          hit = false;
          break;
        }
      }
      if (!hit) continue;
      for (let k = 0; k < n; k++) claimed[i + k] = true;

      const entry = found.get(term.product.key) ?? {
        product: term.product,
        terms: new Set<string>(),
        mentions: 0,
        weight: 0,
        firstOffset: tokens[i].start,
        label: "",
        labelRank: -1,
      };
      entry.terms.add(term.original);
      entry.mentions += 1;

      // A synonym names the product; a standard identifies it. Rank names
      // above identifiers, then prefer the longer span, so "Jet Fuel" beats
      // "DEF STAN 91-091" and "D6 Virgin Fuel Oil" beats a bare "D6".
      const isStandard = term.product.standards.includes(term.original);
      const rank = (isStandard ? 0 : 100) + n;
      if (rank > entry.labelRank) {
        entry.labelRank = rank;
        entry.label = tidySpan(raw.slice(tokens[i].start, tokens[i + n - 1].end));
      }
      // A longer term is stronger evidence: "ultra low sulphur diesel" in a
      // document says more than "diesel" does.
      entry.weight += term.weight * Math.min(2, 0.6 + 0.25 * n);
      entry.firstOffset = Math.min(entry.firstOffset, tokens[i].start);
      found.set(term.product.key, entry);
    }
  }

  return Array.from(found.values())
    .map((e) => {
      return {
        product: e.product,
        label: e.label || e.product.name,
        terms: Array.from(e.terms).sort((a, b) => b.length - a.length),
        mentions: e.mentions,
        quote: lineAt(raw, e.firstOffset),
        score: Number(e.weight.toFixed(3)),
      };
    })
    .filter((m) => m.score >= minScore)
    .sort((a, b) => b.score - a.score || a.product.name.localeCompare(b.product.name));
}
