/**
 * The shared product resolver. Both product intents use this and nothing else.
 *
 * ## What replaced what
 *
 * The product entry used to be an HS catalogue lookup: a member typed into
 * `/api/hs/search?q=` and got whatever the WCO's description text happened to
 * match. `gas oil` against that index is two common English words against a
 * customs nomenclature, and what came back was not wrong so much as unrelated
 * to the question. There was no notion of a synonym, a standard or a grade
 * anywhere in the product.
 *
 * This module is deterministic, pure and free. It is **stage one of the cascade
 * in `./cascade.ts`**, which runs fuzzy correction, model identification and a
 * customs-catalogue fallback behind it. It answers over Ponte's *curated*
 * catalogue only, and a member naming something outside it is not this module's
 * failure: it is where the cascade takes over.
 *
 * ## The two rules that shaped the scoring
 *
 * 1. **Never a silent no-op.** Acceptance criterion 1. Every outcome carries
 *    either candidates or the words that failed, and `ResolutionOutcome` has no
 *    variant that a surface can render as blank.
 *
 * 2. **Never a silent pick through material ambiguity.** `gas oil` is three
 *    commercially different products at three sulphur ceilings. Returning the
 *    first one would be the AI overreach `AGENTS.md` forbids, dressed as
 *    helpfulness, and a member who meant 500 ppm would have a 10 ppm draft. So
 *    a top candidate that did not clear the runner-up by the confirmation
 *    margin produces `ambiguous`, and the question names the attribute the
 *    candidates actually differ on rather than asking a vague one.
 *
 * ## Why the rationale is a list and not a sentence
 *
 * `matchedOn` records the catalogue terms that matched, and the surface prints
 * those terms. A generated sentence explaining a match is a claim; the terms
 * are the evidence. North Star 5.2 forbids manufacturing anything on a Ponte
 * surface, and a confidence sentence nobody can check is exactly that.
 */

import { PRODUCT_CATALOGUE, sectorLabel } from "./catalogue";
import {
  bandFor,
  type CatalogueProduct,
  type MatchEvidence,
  type ProductCandidate,
  type ResolutionOutcome,
} from "./model";

/** Below this a match is noise rather than a candidate. */
const MIN_SCORE = 0.28;

/**
 * How far clear of the runner-up a top candidate must be before Ponte treats
 * the answer as settled. Chosen so `gas oil` (0.95 against 0.69) stays
 * ambiguous and `EN 590` does not.
 */
const CONFIRM_MARGIN = 0.3;

/** The most candidates any surface is asked to rank. */
const MAX_CANDIDATES = 6;

/**
 * A containment match on a term shorter than this is coincidence, not a match:
 * "ago" appears inside "cargo" and "d6" inside a reference number. Short terms
 * must arrive as their own whole token instead.
 */
const MIN_CONTAINMENT = 4;

const SCORE = {
  standard: 1,
  exactName: 0.95,
  exactSynonym: 0.95,
  allTokens: 0.7,
  /** Phrase containment is scaled by how much of the term the query covered. */
  phraseBase: 0.5,
  phraseSpan: 0.35,
  partialBase: 0.55,
} as const;

/**
 * Normalise a member's words.
 *
 * Two forms come out, and both are needed. The token form answers "did they
 * name this thing?"; the compact form answers "did they write it as one word?",
 * which is the whole reason `gasoil`, `gas oil` and `Gas-Oil` are one product
 * and `EN590` and `EN 590` are one standard. Splitting a digit run from a
 * letter run before compacting is what makes `10ppm` and `10 ppm` agree.
 */
export function normalise(raw: string): { text: string; tokens: string[]; compact: string } {
  const lowered = raw
    .toLowerCase()
    .normalize("NFKD")
    // Strip combining marks so an accented spelling and a plain one agree.
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  // Split letter/digit boundaries: "en590" -> "en 590", "10ppm" -> "10 ppm".
  const split = lowered.replace(/([a-z])(\d)/g, "$1 $2").replace(/(\d)([a-z])/g, "$1 $2");
  const tokens = split.split(" ").filter(Boolean);
  return { text: split, tokens, compact: lowered.replace(/ /g, "") };
}

/** Every term that reaches a product, with the weight class it belongs to. */
function termsOf(product: CatalogueProduct): { term: string; standard: boolean }[] {
  return [
    { term: product.name, standard: false },
    ...product.synonyms.map((term) => ({ term, standard: false })),
    ...product.standards.map((term) => ({ term, standard: true })),
  ];
}

/**
 * The token vocabulary of a product, for the partial-match fallback.
 *
 * Attribute values are deliberately excluded. They are prose written for a
 * member to read, not identifiers: the 50 ppm entry's own attribute says
 * "Automotive and industrial where 10 ppm is not required", and including it
 * let a member typing `10 ppm diesel` score a full token match against the
 * product that explicitly is not it. An attribute describes a product; it does
 * not name one.
 */
function tokenSetOf(product: CatalogueProduct): Set<string> {
  const set = new Set<string>();
  for (const { term } of termsOf(product)) for (const token of normalise(term).tokens) set.add(token);
  for (const token of normalise(product.group).tokens) set.add(token);
  return set;
}

/**
 * Score one product against one normalised query, keeping the best evidence of
 * each kind rather than summing. Summing rewards a product for having many
 * synonyms, which is a property of how thoroughly it was catalogued and not of
 * how well it matches.
 */
function scoreProduct(
  product: CatalogueProduct,
  query: ReturnType<typeof normalise>,
): { score: number; matchedOn: MatchEvidence[] } {
  let best = 0;
  const matchedOn: MatchEvidence[] = [];
  const note = (kind: MatchEvidence["kind"], term: string, score: number) => {
    if (score > best) best = score;
    if (!matchedOn.some((m) => m.kind === kind && m.term === term)) matchedOn.push({ kind, term });
  };

  for (const { term, standard } of termsOf(product)) {
    const t = normalise(term);
    if (!t.compact) continue;

    if (t.compact === query.compact) {
      const isName = term === product.name;
      note(
        standard ? "standard" : isName ? "exact_name" : "exact_synonym",
        term,
        standard ? SCORE.standard : isName ? SCORE.exactName : SCORE.exactSynonym,
      );
      continue;
    }

    // The member named a standard inside a longer sentence.
    if (standard && t.compact.length >= MIN_CONTAINMENT && query.compact.includes(t.compact)) {
      note("standard", term, SCORE.standard);
      continue;
    }

    if (t.compact.length >= MIN_CONTAINMENT || query.compact.length >= MIN_CONTAINMENT) {
      // Containment in either direction: the query may be the shorter half
      // ("gasoil" inside "gasoil 50 ppm") or the longer one (a whole sentence
      // containing "ultra low sulphur diesel").
      const inside = query.compact.includes(t.compact) && t.compact.length >= MIN_CONTAINMENT;
      const outside = t.compact.includes(query.compact) && query.compact.length >= MIN_CONTAINMENT;
      if (inside || outside) {
        const covered = inside ? t.compact.length / query.compact.length : query.compact.length / t.compact.length;
        // Note that a standard scores full marks only above, where the member
        // named the whole designation. Reaching this branch means the query is
        // a FRAGMENT of a longer designation: "EN 590" against the 50 ppm
        // entry's "EN 590 (50 ppm variant)". That is a partial match, and
        // scoring it as a named standard made both gasoil grades tie at 1.00
        // on a query that names exactly one of them.
        note("partial_tokens", term, SCORE.phraseBase + SCORE.phraseSpan * covered);
        continue;
      }
    }
  }

  // Token fallback, for a query that named the product in words the catalogue
  // holds separately: "refined white sugar" against "Refined white sugar
  // ICUMSA 45".
  const vocabulary = tokenSetOf(product);
  const hits = query.tokens.filter((token) => vocabulary.has(token));
  if (hits.length > 0 && query.tokens.length > 0) {
    const fraction = hits.length / query.tokens.length;
    if (fraction === 1) note("all_tokens", hits.join(" "), SCORE.allTokens);
    else note("partial_tokens", hits.join(" "), SCORE.partialBase * fraction);
  }

  return { score: Math.min(1, best), matchedOn };
}

/**
 * The attribute the top candidates actually disagree about.
 *
 * This is what turns "which one did you mean?" into an answerable question. If
 * every candidate declares a sulphur content and no two are the same, sulphur
 * is the decision, and saying so is more use than listing four names. Returns
 * null when the candidates share no comparable attribute, in which case the
 * caller asks the general question rather than inventing a distinction.
 */
export function distinguishingAttribute(candidates: readonly ProductCandidate[]): string | null {
  if (candidates.length < 2) return null;
  const first = candidates[0].product.attributes;
  for (const attribute of first) {
    const values = candidates.map(
      (c) => c.product.attributes.find((a) => a.key === attribute.key)?.value ?? null,
    );
    if (values.some((v) => v === null)) continue;
    if (new Set(values).size === values.length) return attribute.label.toLowerCase();
  }
  return null;
}

function buildQuestion(wording: string, candidates: readonly ProductCandidate[]): string {
  const differ = distinguishingAttribute(candidates);
  const group = candidates[0].product.group.toLowerCase();
  const shared = candidates.every((c) => c.product.group === candidates[0].product.group);
  const lead = shared
    ? `More than one ${group.replace(/s$/, "")} matches "${wording}".`
    : `More than one product matches "${wording}".`;
  return differ
    ? `${lead} They differ in ${differ}. Which do you trade?`
    : `${lead} Which do you trade?`;
}

export interface ResolveOptions {
  /** Cap on returned candidates. Defaults to six. */
  limit?: number;
}

/**
 * Resolve a member's words to ranked candidate products.
 *
 * Deterministic and pure: the same words always produce the same answer, in the
 * same order, with the same evidence. That is what makes the `gas oil`
 * acceptance criterion a unit test rather than a manual check against a model.
 */
export function resolveProduct(raw: string, options: ResolveOptions = {}): ResolutionOutcome {
  const wording = raw.trim();
  const query = normalise(wording);
  const limit = options.limit ?? MAX_CANDIDATES;

  if (query.tokens.length === 0) {
    return { kind: "none", wording, tried: [] };
  }

  const scored: ProductCandidate[] = [];
  for (const product of PRODUCT_CATALOGUE) {
    const { score, matchedOn } = scoreProduct(product, query);
    if (score < MIN_SCORE) continue;
    scored.push({ product, score, band: bandFor(score), matchedOn });
  }

  // Ties broken by name so the order is stable across runs and machines.
  scored.sort((a, b) => b.score - a.score || a.product.name.localeCompare(b.product.name));
  const candidates = scored.slice(0, limit);

  if (candidates.length === 0) {
    return { kind: "none", wording, tried: query.tokens };
  }

  const top = candidates[0];
  const runnerUp = candidates[1];

  // A named standard is a decision the member already made. Nothing about a
  // second, weaker match makes it ambiguous.
  const decisive = top.matchedOn.some((m) => m.kind === "standard" || m.kind === "exact_name");

  // One answer and nothing else plausible: resolved. The member still confirms,
  // because confirmation precedes draft creation whatever the resolver thinks.
  if (!runnerUp) return { kind: "resolved", candidates, wording };

  // A clear leader among several: the leader is offered first and the rest stay
  // visible. This is the "multiple candidate products" state, not a settled
  // one, which is why it is a separate kind rather than `resolved` with a long
  // tail nobody looks at.
  if (decisive || top.score - runnerUp.score >= CONFIRM_MARGIN) {
    return { kind: "candidates", candidates, wording };
  }

  return { kind: "ambiguous", candidates, wording, question: buildQuestion(wording, candidates) };
}

/**
 * The category path for a candidate, read from the canonical taxonomy rather
 * than restated. A component that writes "Products" and a sector name itself
 * has forked `lib/taxonomy/market.ts`.
 */
export function categoryPathFor(product: CatalogueProduct): string[] {
  return ["Products", sectorLabel(product.sector), product.group, product.name];
}
