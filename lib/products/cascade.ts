/**
 * The resolution cascade. One entry point, six stages, and no ceiling.
 *
 * ```text
 *  1  exact          a curated catalogue name, synonym or standard        free
 *  2  fuzzy          a misspelling of a curated product                   free
 *  3  identify       the model works out what the member named            metered
 *  4  customs        the HS catalogue, when the model is unavailable      free
 *  5  map            the Ponte sector, derived from the HS chapter        free
 *  6  clarify        only where the product itself is ambiguous           free
 * ```
 *
 * Stage 5 is not a step so much as a rule the other stages obey: an identified
 * product's sector comes from the surviving HS chapter through
 * `sectorForChapter`, never from the model's own guess. Stage 6 likewise: a
 * clarification is asked when two candidates are genuinely close, and not
 * merely because a product is not curated.
 *
 * ## Why a cascade rather than one clever function
 *
 * Cost and honesty. Stages 1, 2 and 4 are deterministic and free, so the common
 * cases are reproducible in a unit test and cost nothing. Stage 3 costs tokens
 * and is reached only when the free stages cannot answer. And each stage's
 * answer carries how it was reached, so the surface can be truthful about
 * whether Ponte *knew* the product or *worked it out*.
 *
 * ## The rule that used to be here, and why it is gone
 *
 * The first build let the model return only catalogue keys, which meant the
 * curated catalogue was the boundary of everything Ponte could understand. The
 * owner found it in review by typing `avocado`. The safety property now lives in
 * provenance and confirmation rather than in a ceiling: see the note on
 * `PRODUCED_PROVENANCE` in `./model.ts`.
 *
 * Every dependency is injected, so all six stages are testable with no network
 * and no database.
 */

import { sectorForChapter } from "@/lib/taxonomy/market";
import { sectorLabel } from "./catalogue";
import { fuzzyMatches } from "./fuzzy";
import {
  identifyFromCustomsCatalogue,
  identifyProduct,
  type HsLookup,
  type HsSearch,
  type Identification,
} from "./identify";
import {
  bandFor,
  isIdentified,
  type IdentifiedProduct,
  type ProductCandidate,
  type ResolutionOutcome,
} from "./model";
import { resolveProduct } from "./resolve";

/**
 * How far clear of the runner-up a candidate must be before the answer is
 * treated as settled rather than offered as a choice. Matches `resolve.ts`.
 */
const CONFIRM_MARGIN = 0.3;

/**
 * Below this, an identification is offered but the surface says it is a guess
 * and invites more detail. The member can still take it.
 */
export const LOW_CONFIDENCE = 0.45;

export interface CascadeOptions {
  /** Runs the metered identification stage. Injected for testing. */
  identify?: (raw: string) => Promise<Identification | null>;
  /** Looks a six-digit code up in the real HS catalogue. */
  hsLookup?: HsLookup;
  /** Searches the HS catalogue by words, for the model-unavailable path. */
  hsSearch?: HsSearch;
  userId?: string | null;
}

/**
 * A curated match is confident enough that spending a token on it would buy
 * nothing: the member named a standard, or a term the catalogue holds exactly.
 */
function settled(outcome: ResolutionOutcome): boolean {
  if (outcome.kind === "none" || outcome.kind === "ambiguous") return false;
  const top = outcome.candidates[0];
  return top.matchedOn.some((m) => m.kind === "standard" || m.kind === "exact_name" || m.kind === "exact_synonym");
}

/** Rank, then decide between resolved, candidates and ambiguous. */
function finish(
  candidates: ProductCandidate[],
  wording: string,
  clarify: string | null,
): ResolutionOutcome {
  const ranked = [...candidates].sort(
    (a, b) => b.score - a.score || a.product.name.localeCompare(b.product.name),
  );
  if (ranked.length === 0) return { kind: "none", wording, tried: [wording] };
  if (ranked.length === 1) return { kind: "resolved", candidates: ranked, wording };

  const clear = ranked[0].score - ranked[1].score >= CONFIRM_MARGIN;

  /*
   * Stage 6, and the owner's instruction in it: ask only where the product
   * itself is genuinely ambiguous.
   *
   * A model clarification is honoured, because the model saw the words. But a
   * spread of forms of one product is NOT ambiguity: `avocado` returning fresh,
   * frozen and oil is a ranked answer with a sensible leader, and demanding a
   * grade before Ponte will admit it knows what an avocado is would be the
   * interrogation the owner rejected.
   */
  if (clarify) return { kind: "ambiguous", candidates: ranked, wording, question: clarify };
  if (clear) return { kind: "candidates", candidates: ranked, wording };

  // Close scores among CURATED products mean real commercial ambiguity: the
  // three gasoil grades are different products with different buyers. Among
  // identified forms of one product it means the model offered alternatives,
  // which is a ranked list, not a question.
  const curatedTie = !isIdentified(ranked[0].product) && !isIdentified(ranked[1].product);
  if (!curatedTie) return { kind: "candidates", candidates: ranked, wording };

  const lexical = resolveProduct(wording);
  return lexical.kind === "ambiguous"
    ? lexical
    : { kind: "candidates", candidates: ranked, wording };
}

/** Turn an identification into ranked candidates. */
function candidatesFrom(identification: Identification): ProductCandidate[] {
  return identification.products.map((entry, index) => {
    // The model's confidence is used for ORDER, and damped for score, so an
    // identified product never outranks an exact curated match. Ponte knowing a
    // product is stronger evidence than Ponte working it out.
    const score = Math.max(0.3, Math.min(0.88, entry.confidence * 0.9 - index * 0.06));
    const because = entry.product.correction
      ? `read as "${entry.product.correction}"`
      : entry.product.basis === "customs_catalogue"
        ? "matched in the customs nomenclature"
        : "identified from your description";
    return {
      product: entry.product,
      score: Number(score.toFixed(3)),
      band: bandFor(score),
      matchedOn: [{ kind: "semantic" as const, term: because }],
    };
  });
}

/**
 * Resolve a member's words to ranked candidate products.
 *
 * Never returns an unexplained empty result. `none` carries the words that
 * failed, and the surface renders it as a limitation of Ponte's rather than a
 * failure of the member's.
 */
export async function resolveThroughCascade(
  raw: string,
  options: CascadeOptions = {},
): Promise<ResolutionOutcome> {
  const wording = raw.trim();
  if (wording.length < 2) return { kind: "none", wording, tried: [] };

  // ---- 1. exact, over the curated catalogue -------------------------------
  const lexical = resolveProduct(wording);
  if (settled(lexical)) return lexical;

  // ---- 2. fuzzy, for a misspelling of a curated product -------------------
  const fuzzy = fuzzyMatches(wording);
  const fuzzyCandidates: ProductCandidate[] = fuzzy.map((match) => ({
    product: match.product,
    score: match.score,
    band: bandFor(match.score),
    matchedOn: [{ kind: "partial_tokens" as const, term: `${match.term} (spelling)` }],
  }));

  // A near-exact correction of a curated product is an answer on its own.
  if (fuzzy.length > 0 && fuzzy[0].distance <= 1 && lexical.kind === "none") {
    return finish(fuzzyCandidates, wording, null);
  }

  // ---- 3. identification, metered ----------------------------------------
  const identify = options.identify ?? ((text: string) =>
    identifyProduct(text, { hsLookup: options.hsLookup, userId: options.userId }));

  let identification: Identification | null = null;
  try {
    identification = await identify(wording);
  } catch {
    identification = null;
  }

  // ---- 4. the customs catalogue, when the model could not answer ----------
  if ((!identification || identification.products.length === 0) && options.hsSearch) {
    const fallback = await identifyFromCustomsCatalogue(wording, options.hsSearch);
    if (fallback.products.length > 0) identification = fallback;
  }

  const lexicalCandidates = lexical.kind === "none" ? [] : [...lexical.candidates];
  const identified = identification ? candidatesFrom(identification) : [];

  /*
   * Fill a missing customs suggestion from the catalogue itself.
   *
   * The model recalls a code for most products and not for all: on the deploy
   * preview `avocados from Peru` came back with 0804.40 and a bare `avocado`
   * came back with none, which reads as Ponte knowing less about the simpler
   * question. The HS index answers `avocado` perfectly well, so it is asked.
   *
   * Still only ever a suggestion, still confirmable, and still never a gate.
   */
  if (options.hsSearch) {
    for (const candidate of identified) {
      const product = candidate.product;
      if (!isIdentified(product) || product.hs) continue;
      try {
        const hits = (await options.hsSearch(product.generic ?? product.name)).slice(0, 2);
        if (hits.length === 0) continue;
        const chapter = sectorForChapter(Number(hits[0].code.slice(0, 2)));
        const filled: IdentifiedProduct = {
          ...product,
          hs: hits[0],
          hsCandidates: hits,
          sector: product.sector || chapter?.key || "",
        };
        candidate.product = filled;
      } catch {
        // A catalogue outage leaves the product without a suggestion, which is
        // the honest outcome and not a reason to fail the resolution.
      }
    }
  }

  // A curated product the model recognised as the same thing keeps its curated
  // identity and its stronger score: Ponte knows more about those than it can
  // infer, and the member should get that knowledge rather than a re-derivation
  // of it.
  const curatedKeys = new Set(lexicalCandidates.map((c) => c.product.key));
  const promoted: ProductCandidate[] = [];
  if (identification) {
    for (const entry of identification.products) {
      if (!entry.catalogueKey || curatedKeys.has(entry.catalogueKey)) continue;
      const already = resolveProduct(entry.catalogueKey.replace(/-/g, " "));
      const found =
        already.kind === "none"
          ? null
          : already.candidates.find((c) => c.product.key === entry.catalogueKey) ?? null;
      if (found) {
        curatedKeys.add(entry.catalogueKey);
        promoted.push({ ...found, matchedOn: [...found.matchedOn, { kind: "semantic", term: "identified from your description" }] });
      }
    }
  }

  /*
   * Drop an identified product that is a curated one under another name.
   *
   * Keying on the product key alone was not enough, and the deploy preview
   * showed why: for `gas oil` the model returned its own reading of all three
   * gasoil grades, which arrived as `identified:gasoil-10-ppm-...` beside the
   * curated `gasoil-10ppm-en590`. Different keys, same product, six rows where
   * there should be three.
   *
   * So an identified product is put back through the curated resolver by name.
   * If that lands decisively on a curated product already in the list, the
   * identified copy is the weaker duplicate and goes.
   */
  const duplicatesCurated = (candidate: ProductCandidate): boolean => {
    const byName = resolveProduct(candidate.product.name);
    if (byName.kind === "none") return false;
    const top = byName.candidates[0];
    const decisive = top.matchedOn.some(
      (m) => m.kind === "standard" || m.kind === "exact_name" || m.kind === "exact_synonym",
    );
    return decisive && curatedKeys.has(top.product.key);
  };

  const merged = [
    ...lexicalCandidates,
    ...promoted,
    ...identified.filter((c) => !curatedKeys.has(c.product.key) && !duplicatesCurated(c)),
    // Keep fuzzy corrections below everything real, and only when nothing else
    // answered: suggesting `gasoil` to somebody who typed `avocado` is worse
    // than saying nothing.
    ...(lexicalCandidates.length === 0 && identified.length === 0 ? fuzzyCandidates : []),
  ];

  if (merged.length === 0) {
    return { kind: "none", wording, tried: [wording] };
  }

  return finish(merged, wording, identification?.clarify ?? null);
}

/** The category path for any product, curated or identified. */
export function pathFor(product: ProductCandidate["product"]): string[] {
  const sector = product.sector ? sectorLabel(product.sector) : "Sector not yet assigned";
  return ["Products", sector, product.group, product.name].filter(Boolean);
}

/** True when a candidate is offered but Ponte is not sure of it. */
export function isLowConfidence(candidate: ProductCandidate): boolean {
  return isIdentified(candidate.product) && candidate.score < LOW_CONFIDENCE;
}
