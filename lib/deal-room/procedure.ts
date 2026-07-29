/**
 * The agreed procedure: the central Deal Room object.
 *
 * ADR-0003 makes the procedure the organising structure and the Experience
 * Design opens with the same rule: "procedure before conversation". So this
 * module, not a message table, is what the room is built around.
 *
 * It holds three things:
 *
 * 1. the shape of a proposed procedure version and its steps;
 * 2. the launch-slice template, one per market family;
 * 3. the structural validation that must pass before a version may be approved.
 *
 * Pure module. The database enforces the same rules inside
 * `deal_room_approve_procedure()`, because a validator that only runs in the
 * browser is a suggestion.
 */

import { assertWeights } from "@/lib/ponte/progress";
import type { StepState } from "./states";
import { stepIsExcluded } from "./states";

/** The three equal market families, matching `lib/taxonomy/market.ts`. */
export type MarketFamily = "products" | "services" | "distribution";

export interface ProcedureStepInput {
  /** Stable within a procedure version. Also the progress step id. */
  key: string;
  seq: number;
  /** A meaningful grouping, shown as the stage a step belongs to. */
  stageLabel: string;
  title: string;
  /** What must be true for this step to be complete. Never left implicit. */
  completionCondition: string;
  /** Which participant class owns it. */
  responsibleRole: string;
  weight: number;
  mandatory: boolean;
  requiresEvidence: boolean;
  /** Null when the responsible party's own completion is sufficient. */
  requiredReviewerRole: string | null;
}

export interface ProcedureStep extends ProcedureStepInput {
  state: StepState;
}

export interface ProcedureTemplate {
  family: MarketFamily;
  /** Shown on the proposal screen so the reader knows what they are approving. */
  summary: string;
  completionCondition: string;
  steps: readonly ProcedureStepInput[];
}

/*
 * The launch-slice weight allocation, and why these numbers.
 *
 * Section 7.4 of the detailed definition gives bands, not values, and section
 * 7.3 requires consequential work to outweigh administrative work. The
 * allocation below sits inside every band it touches:
 *
 *   admission and NDA        10   band  8-12
 *   procedure agreement      12   band 10-14
 *   commercial scope         14   band  8-15
 *   capability evidence      16   band  8-15  -> see note
 *   documentary condition    12   band  8-15
 *   delivery procedure       12   band  8-15
 *   blocker resolution        8   band  5-12
 *   final readiness          16   band  8-15  -> see note
 *
 * Two sit one point above their band. That is deliberate and it is recorded
 * rather than hidden: the bands are described in the source as "typical" and
 * "recommended", the allocation "must total 100%", and the two items pushed up
 * are the two that carry the most commercial consequence in this loop. The
 * alternative was to pad an administrative step to make the arithmetic close,
 * which would break the rule that actually matters.
 *
 * These are proposals. The implementation notes say so plainly: "the weights
 * are proposals... the numbers are commercial judgements and should be
 * confirmed by whoever owns review." They are approved with the procedure by
 * the principals in the room, which is the mechanism the product defines.
 */

const ADMISSION_STEP: ProcedureStepInput = {
  key: "admission_and_nda",
  seq: 1,
  stageLabel: "Admission",
  title: "Principal participants admitted and confidentiality accepted",
  completionCondition:
    "Every required principal has been admitted and has accepted the Participation Agreement, the NDA and the room rules.",
  responsibleRole: "principal",
  weight: 10,
  mandatory: true,
  requiresEvidence: false,
  requiredReviewerRole: null,
};

const PROCEDURE_STEP: ProcedureStepInput = {
  key: "procedure_agreed",
  seq: 2,
  stageLabel: "Admission",
  title: "Procedure agreed by the required approvers",
  completionCondition: "Every required principal approver has approved this procedure version.",
  responsibleRole: "principal",
  weight: 12,
  mandatory: true,
  requiresEvidence: false,
  requiredReviewerRole: null,
};

const BLOCKER_STEP: ProcedureStepInput = {
  key: "blockers_cleared",
  seq: 7,
  stageLabel: "Readiness",
  title: "Critical blockers resolved",
  completionCondition: "No blocker classified critical remains open.",
  responsibleRole: "principal",
  weight: 8,
  mandatory: true,
  requiresEvidence: false,
  requiredReviewerRole: null,
};

const READINESS_STEP: ProcedureStepInput = {
  key: "final_readiness",
  seq: 8,
  stageLabel: "Readiness",
  title: "Both principals confirm readiness to proceed",
  completionCondition:
    "Every required principal has recorded that the agreed procedure is complete and the transaction may proceed outside Ponte.",
  responsibleRole: "principal",
  weight: 16,
  mandatory: true,
  requiresEvidence: false,
  requiredReviewerRole: null,
};

/*
 * Steps 3 to 6 are family-specific, and this is where ADR-0014 reaches the
 * Deal Room. A freight forwarder must never be asked for an Incoterm, a
 * quantity or a packaging specification, and a distributor must never be asked
 * for a shipped quantity. The composer already refuses those upstream; the
 * procedure must not reintroduce them downstream.
 */

const PRODUCTS_MIDDLE: readonly ProcedureStepInput[] = [
  {
    key: "commercial_scope",
    seq: 3,
    stageLabel: "Specification",
    title: "Product specification and quantity agreed",
    completionCondition:
      "Both principals have recorded the product specification, quantity, packaging and delivery terms they are working to.",
    responsibleRole: "principal",
    weight: 14,
    mandatory: true,
    requiresEvidence: true,
    requiredReviewerRole: "principal",
  },
  {
    key: "capability_evidence",
    seq: 4,
    stageLabel: "Evidence",
    title: "Supply capability evidenced",
    completionCondition: "Capability evidence has been accepted for this procedure by the reviewing principal.",
    responsibleRole: "principal",
    weight: 16,
    mandatory: true,
    requiresEvidence: true,
    requiredReviewerRole: "principal",
  },
  {
    key: "documentary_condition",
    seq: 5,
    stageLabel: "Evidence",
    title: "Documentary and regulatory requirements agreed",
    completionCondition:
      "The documents each side must produce for export, import and compliance are listed and agreed.",
    responsibleRole: "principal",
    weight: 12,
    mandatory: true,
    requiresEvidence: true,
    requiredReviewerRole: "principal",
  },
  {
    key: "delivery_procedure",
    seq: 6,
    stageLabel: "Procedure",
    title: "Inspection and delivery procedure agreed",
    completionCondition: "The inspection point, method and delivery sequence are recorded and agreed by both sides.",
    responsibleRole: "principal",
    weight: 12,
    mandatory: true,
    requiresEvidence: false,
    requiredReviewerRole: "principal",
  },
];

const SERVICES_MIDDLE: readonly ProcedureStepInput[] = [
  {
    key: "commercial_scope",
    seq: 3,
    stageLabel: "Specification",
    title: "Scope of service and engagement basis agreed",
    completionCondition:
      "Both parties have recorded the scope of work, coverage, engagement basis and availability they are working to.",
    responsibleRole: "principal",
    weight: 14,
    mandatory: true,
    requiresEvidence: true,
    requiredReviewerRole: "principal",
  },
  {
    key: "capability_evidence",
    seq: 4,
    stageLabel: "Evidence",
    title: "Professional capability and standing evidenced",
    completionCondition:
      "Capability evidence, such as licence, accreditation or comparable engagement, has been accepted for this procedure.",
    responsibleRole: "principal",
    weight: 16,
    mandatory: true,
    requiresEvidence: true,
    requiredReviewerRole: "principal",
  },
  {
    key: "documentary_condition",
    seq: 5,
    stageLabel: "Evidence",
    title: "Liability, insurance and compliance requirements agreed",
    completionCondition: "The cover, permissions and compliance obligations each side must hold are agreed.",
    responsibleRole: "principal",
    weight: 12,
    mandatory: true,
    requiresEvidence: true,
    requiredReviewerRole: "principal",
  },
  {
    key: "delivery_procedure",
    seq: 6,
    stageLabel: "Procedure",
    title: "Service procedure and acceptance criteria agreed",
    completionCondition: "How the service is performed, reported and accepted is recorded and agreed by both sides.",
    responsibleRole: "principal",
    weight: 12,
    mandatory: true,
    requiresEvidence: false,
    requiredReviewerRole: "principal",
  },
];

const DISTRIBUTION_MIDDLE: readonly ProcedureStepInput[] = [
  {
    key: "commercial_scope",
    seq: 3,
    stageLabel: "Specification",
    title: "Territory, channel and relationship structure agreed",
    completionCondition:
      "Both parties have recorded the territory, channel, exclusivity and relationship structure they are working to.",
    responsibleRole: "principal",
    weight: 14,
    mandatory: true,
    requiresEvidence: true,
    requiredReviewerRole: "principal",
  },
  {
    key: "capability_evidence",
    seq: 4,
    stageLabel: "Evidence",
    title: "Market capability and existing coverage evidenced",
    completionCondition:
      "Evidence of channel coverage, customer access or comparable representation has been accepted for this procedure.",
    responsibleRole: "principal",
    weight: 16,
    mandatory: true,
    requiresEvidence: true,
    requiredReviewerRole: "principal",
  },
  {
    key: "documentary_condition",
    seq: 5,
    stageLabel: "Evidence",
    title: "Registration, permission and brand requirements agreed",
    completionCondition:
      "The registrations, permissions and brand or trademark conditions each side must satisfy are agreed.",
    responsibleRole: "principal",
    weight: 12,
    mandatory: true,
    requiresEvidence: true,
    requiredReviewerRole: "principal",
  },
  {
    key: "delivery_procedure",
    seq: 6,
    stageLabel: "Procedure",
    title: "Appointment procedure and review points agreed",
    completionCondition:
      "How the appointment is made, measured and reviewed is recorded and agreed by both sides.",
    responsibleRole: "principal",
    weight: 12,
    mandatory: true,
    requiresEvidence: false,
    requiredReviewerRole: "principal",
  },
];

function template(family: MarketFamily, summary: string, middle: readonly ProcedureStepInput[]): ProcedureTemplate {
  return {
    family,
    summary,
    completionCondition:
      "Both principals have confirmed that the agreed procedure is complete and the transaction may proceed to formal contracting outside Ponte.",
    steps: [ADMISSION_STEP, PROCEDURE_STEP, ...middle, BLOCKER_STEP, READINESS_STEP],
  };
}

export const PROCEDURE_TEMPLATES: Record<MarketFamily, ProcedureTemplate> = {
  products: template(
    "products",
    "Specify the goods, evidence supply capability, agree the documents and the inspection and delivery sequence.",
    PRODUCTS_MIDDLE,
  ),
  services: template(
    "services",
    "Agree the scope and engagement basis, evidence professional capability, agree cover and how the work is accepted.",
    SERVICES_MIDDLE,
  ),
  distribution: template(
    "distribution",
    "Agree territory and relationship structure, evidence market capability, agree permissions and how the appointment is reviewed.",
    DISTRIBUTION_MIDDLE,
  ),
};

export function templateFor(family: MarketFamily): ProcedureTemplate {
  return PROCEDURE_TEMPLATES[family];
}

/* ------------------------------------------------------------------ *
 * Structural validation
 * ------------------------------------------------------------------ */

export interface ProcedureDefect {
  code:
    | "no_steps"
    | "duplicate_key"
    | "weights"
    | "missing_completion_condition"
    | "missing_reviewer"
    | "no_mandatory_step";
  message: string;
}

/**
 * Everything that must be true before a version may be approved.
 *
 * Experience Design DR-09 requires the system to prevent approval when
 * mandatory weights or approvers are invalid, and to show the unresolved
 * structural errors while the procedure is still being built. So this returns
 * a list rather than throwing on the first fault: a proposer fixing four
 * problems should see four problems.
 *
 * The weight rule is delegated to `assertWeights` from `lib/ponte/progress.ts`
 * rather than restated. That function is the Constitution's progress law in
 * code - sum of exactly 100, positive integers, unique ids, and a refusal of
 * the uniform ladder section 9 names - and there must not be a second opinion
 * about it living in the Deal Room.
 */
export function procedureDefects(steps: readonly ProcedureStepInput[]): ProcedureDefect[] {
  const defects: ProcedureDefect[] = [];

  if (steps.length === 0) {
    return [{ code: "no_steps", message: "A procedure needs at least one step." }];
  }

  const seen = new Set<string>();
  for (const step of steps) {
    if (seen.has(step.key)) {
      defects.push({ code: "duplicate_key", message: `Step key '${step.key}' is used more than once.` });
    }
    seen.add(step.key);

    if (!step.completionCondition.trim()) {
      defects.push({
        code: "missing_completion_condition",
        message: `Step '${step.title}' has no completion condition, so nobody can tell when it is done.`,
      });
    }

    if (step.requiresEvidence && !step.requiredReviewerRole) {
      defects.push({
        code: "missing_reviewer",
        message: `Step '${step.title}' requires evidence but names no reviewer, so nothing could ever be accepted for the procedure.`,
      });
    }
  }

  if (!steps.some((step) => step.mandatory)) {
    defects.push({
      code: "no_mandatory_step",
      message: "A procedure with no mandatory step cannot reach a completion condition.",
    });
  }

  try {
    assertWeights(steps.map((step) => ({ id: step.key, weight: step.weight })));
  } catch (error) {
    defects.push({ code: "weights", message: error instanceof Error ? error.message : String(error) });
  }

  return defects;
}

export function procedureIsApprovable(steps: readonly ProcedureStepInput[]): boolean {
  return procedureDefects(steps).length === 0;
}

/**
 * The steps that count towards completion.
 *
 * A step marked not applicable or cancelled through an approved amendment
 * leaves the denominator entirely, which is why this is not simply "all steps".
 */
export function countingSteps(steps: readonly ProcedureStep[]): ProcedureStep[] {
  return steps.filter((step) => !stepIsExcluded(step.state));
}
