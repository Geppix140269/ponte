/**
 * Professional Momentum: the recognition shown at every meaningful completion
 * and recovery state.
 *
 * Issue #69 slice P2-05 and issue #97 both fix the shape exactly:
 *
 * ```text
 * Action completed
 * -> value created
 * -> work preserved
 * -> progress change, when lawful
 * -> one next action
 * ```
 *
 * Five parts, in that order, every time. This module is the single place that
 * builds one, so no route can invent a sixth part, drop the "work preserved"
 * line, or celebrate something that did not happen.
 *
 * ## What is forbidden here, and enforced by test
 *
 * No points, coins, confetti, streaks, badges, leaderboards, artificial
 * urgency or close-probability score. `__tests__/momentum.test.ts` asserts the
 * absence of that vocabulary across every recognition this module can produce,
 * because the prohibition is only worth as much as the thing that checks it.
 *
 * The tone rule is quieter and just as binding. Experience Design 8.2:
 * milestones are "quiet but satisfying... Avoid celebratory animation for
 * routine compliance events." So there is no exclamation mark anywhere in this
 * file, and the test asserts that too.
 *
 * ## "when lawful"
 *
 * `progressDelta` is null whenever a percentage may not be shown - before the
 * procedure is approved, or when the action did not change earned weight. A
 * recognition that invented a number at admission time would breach acceptance
 * criterion 7 in the one place a user is most likely to be looking.
 */

export interface ProfessionalMomentum {
  /** What the participant just did. Past tense, factual, no adjective. */
  actionCompleted: string;
  /** What it made possible. Never a claim about the transaction succeeding. */
  valueCreated: string;
  /** What is now durable and cannot be lost. */
  workPreserved: string;
  /**
   * The completion change, when a percentage may lawfully be shown.
   * `null` before procedure approval and whenever nothing moved.
   */
  progressDelta: { from: number | null; to: number } | null;
  /** Exactly one. Not a list, not a menu. */
  nextAction: { label: string; href: string | null; owner: string };
}

export interface MomentumFacts {
  actionCompleted: string;
  valueCreated: string;
  workPreserved: string;
  previousValue: number | null;
  currentValue: number | null;
  nextActionLabel: string;
  nextActionHref: string | null;
  nextActionOwner: string;
}

/**
 * Build a recognition.
 *
 * The delta is included only when a current value exists. A value that fell -
 * the reversion case in product definition 7.7, where superseded evidence takes
 * 76 back to 66 - is reported exactly as it is, with no softening and no
 * punitive language. The activity record carries the reason; this line carries
 * the number.
 */
export function professionalMomentum(facts: MomentumFacts): ProfessionalMomentum {
  const progressDelta =
    facts.currentValue === null || facts.currentValue === facts.previousValue
      ? null
      : { from: facts.previousValue, to: facts.currentValue };

  return {
    actionCompleted: facts.actionCompleted,
    valueCreated: facts.valueCreated,
    workPreserved: facts.workPreserved,
    progressDelta,
    nextAction: {
      label: facts.nextActionLabel,
      href: facts.nextActionHref,
      owner: facts.nextActionOwner,
    },
  };
}

/**
 * The sentence for the progress line of a recognition.
 *
 * Separate from the component so the wording is testable without rendering,
 * and so a fall is phrased as plainly as a rise.
 */
export function progressDeltaSentence(delta: ProfessionalMomentum["progressDelta"]): string | null {
  if (!delta) return null;
  if (delta.from === null) return `Procedural completion is now ${delta.to}%.`;
  if (delta.to > delta.from) return `Procedural completion moved from ${delta.from}% to ${delta.to}%.`;
  return `Procedural completion moved from ${delta.from}% back to ${delta.to}%, because an earlier item returned to review.`;
}

/* ------------------------------------------------------------------ *
 * The recognitions the launch loop can produce.
 *
 * Each is a named function rather than free-text at the call site, so the five
 * parts are always supplied and the wording lives under test.
 * ------------------------------------------------------------------ */

export function admittedMomentum(facts: {
  organisationLabel: string;
  roomHref: string;
  previousValue: number | null;
  currentValue: number | null;
}): ProfessionalMomentum {
  return professionalMomentum({
    actionCompleted: "You were admitted to the private workspace.",
    valueCreated: `${facts.organisationLabel} can now see your role, authority and the agreements you accepted.`,
    workPreserved:
      "Your acceptance of the Participation Agreement, the NDA and the room rules is recorded with its version and date, and stays in the room history.",
    previousValue: facts.previousValue,
    currentValue: facts.currentValue,
    nextActionLabel: "Review the proposed procedure",
    nextActionHref: facts.roomHref,
    nextActionOwner: "You",
  });
}

export function procedureApprovedMomentum(facts: {
  roomHref: string;
  previousValue: number | null;
  currentValue: number | null;
  firstStepTitle: string;
  firstStepOwner: string;
}): ProfessionalMomentum {
  return professionalMomentum({
    actionCompleted: "The procedure was approved by every required approver.",
    valueCreated:
      "The room now has one agreed way of working. Responsibilities, evidence requirements and completion conditions are settled.",
    workPreserved:
      "This procedure version is immutable. Any later change creates a new version and needs fresh approval, and this one stays readable.",
    previousValue: facts.previousValue,
    currentValue: facts.currentValue,
    nextActionLabel: facts.firstStepTitle,
    nextActionHref: facts.roomHref,
    nextActionOwner: facts.firstStepOwner,
  });
}

export function evidenceSubmittedMomentum(facts: {
  evidenceTitle: string;
  reviewerLabel: string;
  href: string;
  previousValue: number | null;
  currentValue: number | null;
}): ProfessionalMomentum {
  return professionalMomentum({
    actionCompleted: `You submitted ${facts.evidenceTitle}.`,
    // The value line is the one that has to resist overstating. Submitting is
    // not evidencing, and this sentence must not imply a check occurred.
    valueCreated: `${facts.reviewerLabel} can now review it. Submitting a document is not a check, and it has not been accepted yet.`,
    workPreserved:
      "The file, its version, its checksum and who supplied it are recorded. A later version supersedes this one rather than replacing it.",
    previousValue: facts.previousValue,
    currentValue: facts.currentValue,
    nextActionLabel: "Await the review decision",
    nextActionHref: facts.href,
    nextActionOwner: facts.reviewerLabel,
  });
}

export function clarificationResolvedMomentum(facts: {
  evidenceTitle: string;
  href: string;
  reviewerLabel: string;
  previousValue: number | null;
  currentValue: number | null;
}): ProfessionalMomentum {
  return professionalMomentum({
    actionCompleted: `You answered the clarification on ${facts.evidenceTitle}.`,
    valueCreated: "The reviewer has what they asked for and can decide.",
    workPreserved: "The question, your answer and the corrected version are all kept, in order, with their dates.",
    previousValue: facts.previousValue,
    currentValue: facts.currentValue,
    nextActionLabel: "Await the review decision",
    nextActionHref: facts.href,
    nextActionOwner: facts.reviewerLabel,
  });
}

export function evidenceAcceptedMomentum(facts: {
  evidenceTitle: string;
  stepTitle: string;
  href: string;
  previousValue: number | null;
  currentValue: number | null;
  nextStepTitle: string;
  nextStepOwner: string;
}): ProfessionalMomentum {
  return professionalMomentum({
    actionCompleted: `${facts.evidenceTitle} was accepted for the procedure.`,
    valueCreated: `${facts.stepTitle} is satisfied. Accepted for the procedure is not a finding that the document is authentic.`,
    workPreserved: "The acceptance, the reviewer and the version accepted are recorded and cannot be edited away.",
    previousValue: facts.previousValue,
    currentValue: facts.currentValue,
    nextActionLabel: facts.nextStepTitle,
    nextActionHref: facts.href,
    nextActionOwner: facts.nextStepOwner,
  });
}

export function blockerResolvedMomentum(facts: {
  blockerTitle: string;
  href: string;
  previousValue: number | null;
  currentValue: number | null;
  nextStepTitle: string;
  nextStepOwner: string;
}): ProfessionalMomentum {
  return professionalMomentum({
    actionCompleted: `The blocker "${facts.blockerTitle}" was resolved.`,
    valueCreated: "The work it was holding up can continue.",
    workPreserved:
      "The blocker, who owned it and how it was resolved stay in the history. Resolving it does not delete it.",
    previousValue: facts.previousValue,
    currentValue: facts.currentValue,
    nextActionLabel: facts.nextStepTitle,
    nextActionHref: facts.href,
    nextActionOwner: facts.nextStepOwner,
  });
}

/**
 * The recognition for the most recent material event in a room.
 *
 * One place that maps an event type onto its recognition, so a surface cannot
 * choose the wrong one or invent a sixth part. Returns null for an event that
 * is not a completion or a recovery: not everything that happens deserves a
 * recognition, and showing one for a routine event is how the pattern becomes
 * noise.
 */
export function momentumFor(
  eventType: string | undefined,
  facts: {
    href: string;
    organisationLabel: string;
    currentValue: number | null;
    nextStepTitle: string;
    nextStepOwner: string;
  },
): ProfessionalMomentum | null {
  switch (eventType) {
    case "participant_admitted":
      return admittedMomentum({
        organisationLabel: facts.organisationLabel,
        roomHref: facts.href,
        previousValue: null,
        currentValue: facts.currentValue,
      });
    case "procedure_approved":
      return procedureApprovedMomentum({
        roomHref: facts.href,
        previousValue: null,
        currentValue: facts.currentValue,
        firstStepTitle: facts.nextStepTitle,
        firstStepOwner: facts.nextStepOwner,
      });
    case "evidence_submitted":
      return evidenceSubmittedMomentum({
        evidenceTitle: "the evidence",
        reviewerLabel: facts.organisationLabel,
        href: facts.href,
        previousValue: facts.currentValue,
        currentValue: facts.currentValue,
      });
    case "evidence_clarification_answered":
      return clarificationResolvedMomentum({
        evidenceTitle: "the evidence",
        href: facts.href,
        reviewerLabel: facts.organisationLabel,
        previousValue: facts.currentValue,
        currentValue: facts.currentValue,
      });
    case "evidence_accepted_for_procedure":
      return evidenceAcceptedMomentum({
        evidenceTitle: "The evidence",
        stepTitle: "The requirement it answered",
        href: facts.href,
        previousValue: null,
        currentValue: facts.currentValue,
        nextStepTitle: facts.nextStepTitle,
        nextStepOwner: facts.nextStepOwner,
      });
    case "blocker_resolved":
      return blockerResolvedMomentum({
        blockerTitle: "the blocker",
        href: facts.href,
        previousValue: null,
        currentValue: facts.currentValue,
        nextStepTitle: facts.nextStepTitle,
        nextStepOwner: facts.nextStepOwner,
      });
    case "room_read_only":
      return readOnlyMomentum({ href: facts.href });
    default:
      return null;
  }
}

/**
 * The recovery state. Issue #97 requires momentum at recovery, not only at
 * completion, and this is the one that proves the room did not lose anything.
 */
export function readOnlyMomentum(facts: { href: string }): ProfessionalMomentum {
  return professionalMomentum({
    actionCompleted: "This room moved to read-only.",
    valueCreated: "Everything agreed, evidenced and decided here stays readable by the people who were admitted.",
    workPreserved:
      "No evidence, decision, clarification or history has been deleted. Restoring the room resumes it as it is, with no re-upload and no re-admission.",
    previousValue: null,
    currentValue: null,
    nextActionLabel: "Review the preserved history",
    nextActionHref: facts.href,
    nextActionOwner: "You",
  });
}
