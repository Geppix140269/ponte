/**
 * How much of the market a category filter could actually see.
 *
 * Its own component, and exported, for two reasons. It is the one place that
 * phrases a claim about coverage, so the wording cannot drift between the two
 * lanes. And it is the only part of the partial-coverage state that can be
 * exercised today: no published record carries a category, so a live page
 * cannot reach this branch, and a state that ships untested because the data
 * has not caught up with it is a state that will be wrong when it does.
 *
 * The empty case gets the stronger wording deliberately. An empty result is the
 * one a member is most likely to act on, and "no match" over a partly
 * classified inventory is the specific false conclusion this exists to prevent.
 */

export interface CoverageNumbers {
  /** Eligible records carrying any value on the axis being filtered. */
  classified: number;
  /** Eligible records in this market, classified or not. */
  eligible: number;
}

export interface CoverageLabels {
  badge: string;
  heading: string;
  body: string;
  emptyHeading: string;
  emptyBody: string;
}

export default function CoverageNotice({
  coverage,
  empty,
  labels,
}: {
  /**
   * The numbers, when they could be established. Omitted when the coverage
   * measurement itself failed, which is a different state and says so: a
   * notice with no numbers must not read as a notice claiming zero.
   */
  coverage?: CoverageNumbers;
  /** True when the filter returned no records at all. */
  empty: boolean;
  labels: CoverageLabels;
}) {
  const state = coverage ? "partial" : "unknown";
  return (
    <div className="fstate" data-coverage={empty ? `${state}-empty` : state}>
      <span className="fstate__badge">{labels.badge}</span>
      <h3 className="fstate__h serif">{empty ? labels.emptyHeading : labels.heading}</h3>
      <p className="fstate__p">{empty ? labels.emptyBody : labels.body}</p>
    </div>
  );
}

/**
 * The values the copy interpolates.
 *
 * `unclassified` is derived rather than passed, so the three numbers cannot
 * disagree with each other on a page.
 */
export function coverageValues(coverage: CoverageNumbers): {
  classified: number;
  eligible: number;
  unclassified: number;
} {
  return {
    classified: coverage.classified,
    eligible: coverage.eligible,
    unclassified: Math.max(0, coverage.eligible - coverage.classified),
  };
}
