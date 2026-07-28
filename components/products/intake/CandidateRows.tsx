"use client";

import type { ProductCandidate } from "@/lib/products/model";
import { categoryPathFor } from "@/lib/products/resolve";

/**
 * The ranked candidates, as a register of rows.
 *
 * ## Why a register and not cards
 *
 * Constitution section 15 forbids a generic card grid as a default composition
 * and section 15 again forbids empty space created only to force equal card
 * heights. A candidate for `gas oil` carries three matched terms; one for
 * `EN 590` carries one. Rows let unequal content keep its natural height, which
 * is the same reason the Desk's fact register exists.
 *
 * ## The rationale is the evidence, not prose about it
 *
 * Each row prints the catalogue terms that matched and the attribute that tells
 * this product from its neighbours. It does not print a generated sentence
 * explaining the match and it does not print a percentage. A confidence figure
 * nobody can check is exactly what North Star 5.2 forbids putting on a Ponte
 * surface, and Constitution section 9 reserves a percentage for a position
 * along a defined procedure. The band is a word.
 *
 * ## No pre-selection
 *
 * Nothing is `aria-checked` or visually chosen on arrival, including in the
 * ambiguous state. Pre-selecting the top row is how "do not silently accept the
 * first AI answer" becomes a click nobody noticed they made.
 */

const BAND_WORD: Record<ProductCandidate["band"], string> = {
  close: "Close match",
  likely: "Likely match",
  possible: "Possible match",
};

const KIND_WORD: Record<string, string> = {
  standard: "named standard",
  exact_name: "product name",
  exact_synonym: "trade term",
  all_tokens: "words matched",
  partial_tokens: "partly matched",
  semantic: "read from your description",
};

export interface CandidateRowsProps {
  candidates: readonly ProductCandidate[];
  onChoose: (productKey: string) => void;
  /** Named for assistive technology, since the heading above varies by state. */
  ariaLabel: string;
}

export default function CandidateRows({ candidates, onChoose, ariaLabel }: CandidateRowsProps) {
  return (
    <div className="pcand" role="group" aria-label={ariaLabel}>
      {candidates.map((candidate) => {
        const path = categoryPathFor(candidate.product);
        const terms = candidate.matchedOn.slice(0, 4);
        return (
          <button
            key={candidate.product.key}
            type="button"
            className="pcand__r"
            data-key={candidate.product.key}
            onClick={() => onChoose(candidate.product.key)}
          >
            <span className="pcand__h">
              <span className="pcand__n">{candidate.product.name}</span>
              <span className="pcand__band">{BAND_WORD[candidate.band]}</span>
            </span>

            <span className="pcand__path">{path.join(" / ")}</span>

            <span className="pcand__d">{candidate.product.distinguisher}</span>

            <span className="pcand__why">
              {terms.map((m, i) => (
                <span key={`${m.kind}-${m.term}-${i}`}>
                  {i > 0 ? " " : ""}
                  <b>{m.term}</b>
                  {` (${KIND_WORD[m.kind] ?? m.kind})`}
                  {i < terms.length - 1 ? "," : ""}
                </span>
              ))}
            </span>

            {candidate.product.hs ? (
              <span className="pcand__hs">
                {/* Suggested, and said so. The HS code is downstream of
                    understanding the product, never the gate in front of it. */}
                Suggested customs classification: HS {candidate.product.hs.code}. You confirm it later.
              </span>
            ) : (
              <span className="pcand__hs">No customs classification suggested yet.</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
