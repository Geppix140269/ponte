/**
 * Deterministic procedural completion for a Deal Room.
 *
 * ## Why this is not a call to `progressValue`
 *
 * `lib/ponte/progress.ts` is the repository's progress authority and this
 * module does not replace, fork or compete with it. It reuses that module's
 * validator, `assertWeights`, which is where the Constitution's weight law
 * actually lives: sum to exactly 100, positive integers, unique ids, and a
 * refusal of the equal ladder section 9 names.
 *
 * What it does not reuse is `progressValue`'s *mapping*, and the reason is that
 * the two are different scales, which the engine contract itself says: profile
 * completion and submission readiness "use this same component with different
 * labels and different band copy - they must not share a single value in
 * state".
 *
 * `progressValue` maps earned weight onto 20..100, because for a draft "entering
 * the experience is already an intentional act" and the floor is the reward for
 * starting. A Deal Room has no such floor, because it shows no number at all
 * until a procedure is approved. Its scale is fixed by the accepted product
 * definition instead:
 *
 * - section 7.3: "The first approved procedure displays a baseline between 18%
 *   and 25% because participant admission, terms and procedure agreement are
 *   meaningful completed work."
 * - section 7.6, worked: earned 58 of 100 displays `58%`.
 * - section 7.7, worked: withdrawing an accepted 10-weight item takes 76 to 66.
 *
 * So in a Deal Room the earned weight **is** the percentage. Running the launch
 * template through it, admission (10) plus procedure agreed (12) gives 22 at
 * the moment of approval, which lands inside the 18-25 band the two authorities
 * agree on. The Constitution is satisfied by construction rather than by a
 * floor: never 0 because nothing is shown before approval, first value 22,
 * irregular increments because the weights are irregular, and 100 only when the
 * completion condition is met.
 *
 * Pure module. Same inputs, same answer, every time, on server or client.
 */

import { assertWeights } from "@/lib/ponte/progress";
import { countingSteps, type ProcedureStep } from "./procedure";
import { procedureGoverns, stepHasEarned, type ProcedureState } from "./states";

export interface ProcedureProgress {
  /** Null before the procedure is approved. There is no percentage yet. */
  value: number | null;
  /** Weight earned, before any renormalisation. Shown in "how this is calculated". */
  earned: number;
  /** Total weight in play. 100 unless steps left the procedure. */
  denominator: number;
  completedCount: number;
  inProgressCount: number;
  totalCount: number;
}

/**
 * The completion value for a procedure version and the current state of its
 * steps.
 *
 * Returns `null` - not zero - whenever no percentage may lawfully be shown.
 * `null` has no rendering, so a caller cannot accidentally print "0%"; the type
 * forces them to handle the named-stage-only case that acceptance criterion 7
 * requires before approval.
 */
export function procedureProgress(
  procedureState: ProcedureState,
  steps: readonly ProcedureStep[],
): ProcedureProgress {
  const counting = countingSteps(steps);
  const totalCount = counting.length;
  const completedCount = counting.filter((step) => stepHasEarned(step.state)).length;
  const inProgressCount = counting.filter(
    (step) =>
      step.state === "in_progress" ||
      step.state === "evidence_submitted" ||
      step.state === "review_required" ||
      step.state === "clarification_required",
  ).length;

  if (!procedureGoverns(procedureState) || totalCount === 0) {
    return { value: null, earned: 0, denominator: 0, completedCount, inProgressCount, totalCount };
  }

  // The full step table must still be a lawful weight set even when some steps
  // have since left the procedure, because that table is what the approvers
  // approved. Validating the reduced set instead would let an amendment quietly
  // produce a set that never summed to 100.
  assertWeights(steps.map((step) => ({ id: step.key, weight: step.weight })));

  const denominator = counting.reduce((sum, step) => sum + step.weight, 0);
  const earned = counting.filter((step) => stepHasEarned(step.state)).reduce((sum, step) => sum + step.weight, 0);

  if (denominator === 0) {
    return { value: null, earned: 0, denominator: 0, completedCount, inProgressCount, totalCount };
  }

  // Nothing earned yet is still a lawful state: a procedure can be approved
  // with its admission step already complete, but an amendment could in
  // principle approve a version where nothing is. Show the named stage, not a
  // zero.
  if (earned === 0) {
    return { value: null, earned: 0, denominator, completedCount, inProgressCount, totalCount };
  }

  if (completedCount === totalCount) {
    return { value: 100, earned, denominator, completedCount, inProgressCount, totalCount };
  }

  // Renormalisation only bites when a step has left the procedure; in the
  // ordinary case the denominator is 100 and this is the identity, which is
  // what makes the authority's worked examples reproduce exactly.
  const raw = Math.round((100 * earned) / denominator);

  // An incomplete procedure never rounds into a finished one. This is the same
  // guard `progressValue` carries, and for the same reason: a 99.6% record
  // rendering 100 would claim a completion that has not happened.
  return { value: Math.min(raw, 99), earned, denominator, completedCount, inProgressCount, totalCount };
}

/**
 * The sentence that sits under the percentage, per Experience Design 8.1.
 *
 * It exists so the number is never the only thing said. A reader who distrusts
 * a percentage - correctly, most of the time - can see what it counted.
 */
export function progressExplanation(progress: ProcedureProgress, openCriticalBlockers: number): string {
  const parts = [
    `${progress.completedCount} of ${progress.totalCount} procedure items complete`,
    `${progress.inProgressCount} in progress`,
  ];
  if (openCriticalBlockers > 0) {
    parts.push(openCriticalBlockers === 1 ? "1 critical blocker" : `${openCriticalBlockers} critical blockers`);
  }
  return parts.join(" · ");
}

/**
 * Momentum: moving, waiting, blocked - never a score.
 *
 * Product contract 10.4 is explicit that this indicates whether the transaction
 * is moving, waiting or inactive "without presenting a probability of success",
 * so this returns a named state and never a number, and nothing in it looks at
 * how likely anything is.
 */
export const MOMENTUM_STATES = [
  "moving",
  "waiting_on_participant",
  "blocked",
  "paused",
  "ready_for_decision",
  "ready_to_proceed",
] as const;

export type MomentumState = (typeof MOMENTUM_STATES)[number];

export const MOMENTUM_LABEL: Record<MomentumState, string> = {
  moving: "Moving",
  waiting_on_participant: "Waiting on participant",
  blocked: "Blocked",
  paused: "Paused",
  ready_for_decision: "Ready for decision",
  ready_to_proceed: "Ready to proceed",
};

export interface MomentumInput {
  roomIsPaused: boolean;
  roomIsReadyToProceed: boolean;
  openCriticalBlockers: number;
  stepsAwaitingReview: number;
  stepsAwaitingOtherParty: number;
  materialEventsInLastSevenDays: number;
}

export function momentumFor(input: MomentumInput): MomentumState {
  if (input.roomIsReadyToProceed) return "ready_to_proceed";
  if (input.roomIsPaused) return "paused";
  if (input.openCriticalBlockers > 0) return "blocked";
  if (input.stepsAwaitingReview > 0) return "ready_for_decision";
  if (input.materialEventsInLastSevenDays > 0) return "moving";
  if (input.stepsAwaitingOtherParty > 0) return "waiting_on_participant";
  return "waiting_on_participant";
}

/**
 * The plain sentence beside the momentum word.
 *
 * "Moving" on its own is a mood. "Moving - three material actions completed
 * this week" is a fact, and it is the form the Experience Design uses in its
 * own composition example.
 */
export function momentumSentence(state: MomentumState, input: MomentumInput): string {
  const events = input.materialEventsInLastSevenDays;
  const recent = events === 1 ? "one material action completed this week" : `${events} material actions completed this week`;

  switch (state) {
    case "ready_to_proceed":
      return "The agreed procedure is complete. Contracting happens outside Ponte.";
    case "paused":
      return "This room is paused. Deadlines are held until it resumes.";
    case "blocked":
      return input.openCriticalBlockers === 1
        ? "One critical blocker is open. Progress already earned is unchanged."
        : `${input.openCriticalBlockers} critical blockers are open. Progress already earned is unchanged.`;
    case "ready_for_decision":
      return input.stepsAwaitingReview === 1
        ? "One item is waiting for a review decision."
        : `${input.stepsAwaitingReview} items are waiting for a review decision.`;
    case "moving":
      return recent.charAt(0).toUpperCase() + recent.slice(1) + ".";
    case "waiting_on_participant":
      return "Nothing has moved recently. The next action is with a participant.";
  }
}
