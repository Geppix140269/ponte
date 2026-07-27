/**
 * Weighted deterministic completion — the value H01 follows.
 *
 * This is gap G2 from the Phase 1 audit: the Constitution has a progress law
 * (section 9) and the delivered motion specification has an engine contract
 * (`motion/js/ponte-flow-progress.md`), and the product had no compliant
 * primitive for either. Start a Deal, verification and Opportunities all need
 * one, so it is built here, once, before any of them.
 *
 * ## The law, and how each clause is enforced
 *
 * > Before meaningful action, show a neutral state and no percentage.
 * > Ponte must never display 0%.
 *
 * `progressValue` returns **null**, not zero, when nothing is complete. A
 * function that returned 0 would put the caller one careless template literal
 * away from rendering "0%", and the rule would depend on every caller
 * remembering it. `null` has no rendering: the caller must handle the neutral
 * state, and the type system makes them.
 *
 * > the first visible completion value normally begins between 18% and 25%.
 *
 * The floor is **20**, which is the approved value in two places: the
 * `--pf-progress-floor` token, and the engine contract's "value is 20–100.
 * Values below 20 are a defect: entering the experience is already an
 * intentional act". 20 sits inside the Constitution's 18–25 band, so the two
 * authorities agree and the narrower one wins.
 *
 * > deterministic and stable for the same completed state
 *
 * Pure function of `(steps, completed)`. No clock, no randomness, no memo, no
 * accumulation across calls. `completed` is read into a Set, so neither the
 * order it arrives in nor a repeated id changes the answer. Re-rendering cannot
 * move the number, which is the property the "no regeneration on render"
 * requirement is really asking for.
 *
 * > result from weighted completed work · use irregular, non-mechanical
 * > increments · avoid equal ladders such as 20, 40, 60, 80
 *
 * Weights are supplied per procedure and must sum to exactly 100. A uniform
 * weight set is **rejected**, because uniform weights are precisely how the
 * mechanical ladder the Constitution names gets built. See `assertWeights`.
 *
 * > reach 100% only when the defined task or agreed procedure is complete
 *
 * 100 is returned only when every step is complete. An incomplete procedure is
 * capped at 99 however close it gets, so rounding can never manufacture a
 * finished record. This is the single most important line in the file.
 *
 * > Completion percentage never means probability of success, credibility,
 * > risk, transaction value, verification or likelihood of closing.
 *
 * Nothing here knows anything about a deal's quality, and it must stay that
 * way. The band copy below is the guard on the other end: at 100 the label is
 * "Ready to submit for review" or "Draft complete", never *verified*, *trusted*
 * or *safe*. Completeness and verification are different axes, and the state
 * definitions are explicit that 100% completeness may not be rendered as
 * verified.
 */

/** The approved non-zero floor. Mirrors `--pf-progress-floor` in the token file. */
export const PROGRESS_FLOOR = 20;

/** One weighted step of a defined procedure. */
export interface ProgressStep {
  /** Stable identifier. What `completed` refers to. */
  id: string;
  /**
   * Share of the whole procedure, in points. The set must sum to exactly 100.
   *
   * Weights are what make the increments irregular, and they are a product
   * judgement rather than a design one: naming a company matters more than
   * adding a second photograph, and the progress line should say so.
   */
  weight: number;
}

/**
 * Rejects a weight set that cannot produce a lawful progress line.
 *
 * Exported so a procedure's step table can be validated once by its own test,
 * rather than only when someone happens to render it.
 *
 * The uniformity rule deserves its reasoning stated, because it is the one that
 * will surprise someone. Constitution section 9 requires irregular increments
 * and names "20, 40, 60, 80" as the thing to avoid. Equal weights are the only
 * way to produce an even ladder, so rejecting them enforces the rule at the one
 * point where it is decidable — a validator downstream would be guessing at
 * intent from rendered numbers. A single-step procedure is exempt: there is no
 * ladder to be regular about.
 */
export function assertWeights(steps: readonly ProgressStep[]): void {
  if (steps.length === 0) {
    throw new Error("A progress procedure needs at least one step.");
  }

  const ids = new Set(steps.map((s) => s.id));
  if (ids.size !== steps.length) {
    throw new Error("Progress step ids must be unique; a repeated id would be counted once and silently lose weight.");
  }

  for (const step of steps) {
    if (!Number.isInteger(step.weight) || step.weight <= 0) {
      throw new Error(`Step '${step.id}' has weight ${step.weight}; weights must be positive integers.`);
    }
  }

  const total = steps.reduce((sum, s) => sum + s.weight, 0);
  if (total !== 100) {
    throw new Error(`Progress weights must sum to exactly 100, not ${total}.`);
  }

  if (steps.length > 1 && steps.every((s) => s.weight === steps[0].weight)) {
    throw new Error(
      `All ${steps.length} steps carry weight ${steps[0].weight}. Constitution section 9 requires irregular, ` +
        `non-mechanical increments and names equal ladders such as 20, 40, 60, 80 as the thing to avoid. ` +
        `Weight the steps by how much of the procedure each actually completes.`,
    );
  }
}

/**
 * The completion value for a procedure, or `null` when nothing has been done.
 *
 * `null` is the neutral state: no percentage, no bar, no zero. It is not an
 * error and it is not "unknown" — it is the honest answer before the first
 * meaningful action.
 *
 * An id in `completed` that is not a step is a mistake worth surfacing: it
 * means the caller's idea of the procedure and the step table have diverged,
 * and the value it would otherwise return would be quietly too low.
 */
export function progressValue(steps: readonly ProgressStep[], completed: Iterable<string>): number | null {
  assertWeights(steps);

  const byId = new Map(steps.map((s) => [s.id, s.weight]));
  // A Set, so neither the order the ids arrive in nor a repeated id can change
  // the answer. `Array.from` rather than iterating the Set directly: the
  // repository compiles without downlevelIteration.
  const done = Array.from(new Set(completed));

  for (const id of done) {
    if (!byId.has(id)) {
      throw new Error(`'${id}' is not a step of this procedure; the completed set and the step table have diverged.`);
    }
  }

  if (done.length === 0) return null;

  // Every step complete is the only route to 100.
  if (done.length === steps.length) return 100;

  let earned = 0;
  for (const id of done) earned += byId.get(id)!;

  // The floor is a starting position, not an offset added to the answer: the
  // remaining 80 points are what the procedure's weights are spent on. So a
  // procedure that is 50% done by weight sits at 60, not at 70.
  const value = Math.round(PROGRESS_FLOOR + ((100 - PROGRESS_FLOOR) * earned) / 100);

  // An incomplete procedure never rounds up into a finished one. Without this,
  // a 99.6% record would render 100 and claim a completion that has not
  // happened — the exact class of untruth the Constitution's progress law and
  // the state definitions both exist to prevent.
  return Math.min(value, 99);
}

/**
 * The three label scales the engine contract ships with the component.
 *
 * They are separate on purpose. The delivered specification is explicit that
 * profile completion and submission readiness "use this same component with
 * different labels and different band copy — they must not share a single value
 * in state".
 */
export type ProgressScale = "opportunity" | "profile" | "submission";

const BANDS: Record<ProgressScale, readonly { min: number; label: string }[]> = {
  opportunity: [
    { min: 100, label: "Draft complete" },
    { min: 80, label: "Nearly ready to submit" },
    { min: 60, label: "Good commercial detail" },
    { min: 40, label: "Core information added" },
    { min: PROGRESS_FLOOR, label: "Deal started" },
  ],
  profile: [
    { min: 100, label: "Profile information complete" },
    { min: 80, label: "Nearly complete" },
    { min: 60, label: "Profile taking shape" },
    { min: 40, label: "Basic details recorded" },
    { min: PROGRESS_FLOOR, label: "Profile started" },
  ],
  submission: [
    { min: 100, label: "Ready to submit for review" },
    { min: 80, label: "Ready to save" },
    { min: 60, label: "Ready to preview" },
    { min: 40, label: "Not ready to submit" },
    { min: PROGRESS_FLOOR, label: "Not ready to submit" },
  ],
};

/**
 * The approved wording for a value, transcribed from the engine contract's band
 * table and not paraphrased.
 *
 * Note what the 100 labels say and do not say. "Ready to submit for review" is
 * the end of this procedure and the beginning of someone else's; it is not
 * approval, not verification and not a finished deal. A reviewed record is a
 * different state established by a different event, and the inference matrix in
 * the state definitions answers "no" for every route from completeness to
 * verification.
 */
export function progressBand(value: number, scale: ProgressScale): string {
  if (!Number.isInteger(value) || value < PROGRESS_FLOOR || value > 100) {
    throw new Error(`Progress value ${value} is outside the approved ${PROGRESS_FLOOR}–100 range.`);
  }
  return BANDS[scale].find((band) => value >= band.min)!.label;
}
