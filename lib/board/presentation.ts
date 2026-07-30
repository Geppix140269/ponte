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

/**
 * Which emptiness a complete search found.
 *
 * `board`   nothing is live at all. A statement about the market.
 * `filters` nothing matches the structured filters. A statement about a corner.
 * `search`  nothing matches the member's own words.
 *
 * They are three different facts and they need three different sets of words.
 * "No signal is currently live on the public board" is false the moment
 * anything is asked of it, and it is the most damaging of the three to get
 * wrong: a member reads it as "this market is dead" when it means "not this
 * corner of it", or worse, "not that spelling of it".
 *
 * `search` is separated from `filters` because the actions differ. A member
 * whose filters found nothing should widen a category; a member whose words
 * found nothing should edit or clear the words, and may well have typed a
 * synonym Ponte's vocabulary does not carry yet. Offering "clear the filters"
 * to someone who set no filters is an instruction they cannot follow.
 *
 * Returning which one it is, rather than a boolean, means a caller cannot
 * render the wrong copy without noticing.
 */
export type EmptyKind = "board" | "filters" | "search";

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
   * Which "there is nothing here" copy to render, if any.
   *
   * Set only when the search could see everything and still found nothing, and
   * then it says WHICH nothing: an empty market, or an empty answer to a
   * narrower question.
   */
  genuineEmpty: EmptyKind | null;
}

export function presentBoard(
  state: SearchState,
  recordCount: number,
  scope: {
    /**
     * Did the member narrow the search at all?
     *
     * Without this the table cannot tell an empty market from an empty answer,
     * and a surface reading a boolean would print the stronger claim for both.
     */
    filtered: boolean;
    /**
     * Did they narrow it with their own words?
     *
     * Takes precedence over `filtered` when both are true. A member who typed
     * `EN590` and also had a category selected is far more likely to have been
     * failed by the word than by the category, and the word is the thing they
     * can immediately change.
     */
    searched?: boolean;
  },
): BoardPresentation {
  const base: BoardPresentation = {
    unavailable: false,
    unclassified: false,
    coverageNotice: null,
    records: false,
    genuineEmpty: null,
  };

  if (state === "unavailable") return { ...base, unavailable: true };
  if (state === "unclassified") return { ...base, unclassified: true };

  const empty = recordCount === 0;

  return {
    ...base,
    coverageNotice: state === "partial" ? "partial" : state === "coverage_unknown" ? "unknown" : null,
    records: recordCount > 0,
    // The whole point of the table. `state === "ok"` is not an optimisation
    // here, it is the condition: an empty result under any other state has an
    // explanation above it and must not also carry a conclusion.
    genuineEmpty:
      state === "ok" && empty
        ? scope.searched
          ? "search"
          : scope.filtered
            ? "filters"
            : "board"
        : null,
  };
}
