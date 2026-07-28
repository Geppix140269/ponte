/**
 * What a surface renders for a given search state, decided once.
 *
 * This exists because the ordering got it wrong. The Market Signals board
 * tested `records.length === 0` before it reached the coverage notices, so an
 * empty `partial` result rendered "No signal is currently live on the public
 * board": a conclusive claim about the whole board, printed over a filter that
 * had searched a fraction of it. The notices below it were unreachable whenever
 * the result was empty, which is precisely when they matter most.
 *
 * The cause was not the rule but where the rule lived. Nested ternaries in JSX
 * encode precedence in their nesting, and nesting is not something review reads
 * reliably. So the decision is a table now, it is pure, and the matrix is
 * asserted in a test rather than inspected.
 *
 * One rule governs all of it:
 *
 *   **Only `ok` may present an emptiness as a finding about the market.**
 *
 * Every other state either could not search the whole set (`partial`), could
 * not establish how much of it was searched (`coverage_unknown`), could not
 * search it at all (`unclassified`), or could not read it (`unavailable`).
 * None of those is "there is nothing here".
 */

export type SearchState = "ok" | "partial" | "coverage_unknown" | "unclassified" | "unavailable";

export interface BoardPresentation {
  /** The read failed. A technical failure, never a finding. */
  unavailable: boolean;
  /** Nothing carries this classification. Explained, never shown as empty. */
  unclassified: boolean;
  /**
   * The coverage notice to show, if any.
   *
   * Rendered from the STATE alone, never gated on whether records came back.
   * An empty partial result is exactly the case the notice exists for.
   */
  coverageNotice: "partial" | "unknown" | null;
  /** Render the records and their count line. */
  records: boolean;
  /**
   * Render the surface's own "there is nothing here" copy.
   *
   * True only when the search could see everything and still found nothing.
   */
  genuineEmpty: boolean;
}

export function presentBoard(state: SearchState, recordCount: number): BoardPresentation {
  const base: BoardPresentation = {
    unavailable: false,
    unclassified: false,
    coverageNotice: null,
    records: false,
    genuineEmpty: false,
  };

  if (state === "unavailable") return { ...base, unavailable: true };
  if (state === "unclassified") return { ...base, unclassified: true };

  return {
    ...base,
    coverageNotice: state === "partial" ? "partial" : state === "coverage_unknown" ? "unknown" : null,
    records: recordCount > 0,
    // The whole point of the table. `state === "ok"` is not an optimisation
    // here, it is the condition: an empty result under any other state has an
    // explanation above it and must not also carry a conclusion.
    genuineEmpty: state === "ok" && recordCount === 0,
  };
}
