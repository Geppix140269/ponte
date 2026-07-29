import { bridgeModel, type BridgeModel } from "@/lib/deal-room/bridge";
import { procedureProgress } from "@/lib/deal-room/progress";
import { templateFor } from "@/lib/deal-room/procedure";
import type { ProcedureStep } from "@/lib/deal-room/procedure";
import type { StepState } from "@/lib/deal-room/states";

/**
 * The Deal Room states, produced from the real domain rather than mocked.
 *
 * Nothing here is a hand-written fixture of what a bridge "should" look like.
 * Each state is a `bridgeModel(...)` call over a real step table from
 * `templateFor("products")`, with progress from `procedureProgress(...)`. If the
 * weights change, the numbers in the evidence change with them; if a rule
 * changes, the evidence stops matching, which is the property that makes a
 * screenshot worth keeping.
 *
 * The transaction is the reference prototype from the accepted product
 * contract, section 16: 500 metric tonnes of refined cane sugar from a
 * Brazilian manufacturer to a Spanish importer, with an independent inspection
 * provider. **Every organisation named here is fictional**, which that section
 * requires explicitly.
 */

const FICTIONAL_NOTE =
  "Fictional transaction from the approved reference prototype. Atlantico Comercio, Iberia Importaciones and Sondagem Inspecoes do not exist.";

function steps(states: Partial<Record<string, StepState>>): ProcedureStep[] {
  return templateFor("products").steps.map((step) => ({ ...step, state: states[step.key] ?? "ready" }));
}

const SELLER = { role: "Seller", principal: true, state: "joined" as const, ownsNextAction: false };
const BUYER = { role: "Buyer", principal: true, state: "joined" as const, ownsNextAction: false };
const INSPECTOR = { role: "Inspection provider", principal: false, state: "joined" as const, ownsNextAction: false };

export interface DealRoomState {
  id: string;
  title: string;
  note: string;
  model: BridgeModel;
  /** The named commercial stage, shown beside the bridge. */
  stage: string;
  progressLabel: string;
}

function build(
  id: string,
  title: string,
  note: string,
  stage: string,
  input: Parameters<typeof bridgeModel>[0],
  progressLabel: string,
): DealRoomState {
  return { id, title, note, stage, model: bridgeModel(input), progressLabel };
}

const BEFORE_APPROVAL = procedureProgress("proposed", steps({ admission_and_nda: "completed" }));
const AT_APPROVAL = procedureProgress(
  "approved",
  steps({ admission_and_nda: "completed", procedure_agreed: "completed" }),
);
const IN_EVIDENCE = procedureProgress(
  "approved",
  steps({
    admission_and_nda: "completed",
    procedure_agreed: "completed",
    commercial_scope: "completed",
    capability_evidence: "completed",
  }),
);
const COMPLETE = procedureProgress(
  "approved",
  steps(Object.fromEntries(templateFor("products").steps.map((s) => [s.key, "completed" as StepState]))),
);

export const STATES: DealRoomState[] = [
  build(
    "credible-interest",
    "1. Credible interest confirmed",
    "No room exists yet. No percentage, and none is possible: nothing has been agreed.",
    "Credible commercial interest",
    {
      roomState: "draft",
      procedureApproved: false,
      procedureProposed: false,
      counterpartyAdmitted: false,
      invitationSent: false,
      anyEvidenceSubmitted: false,
      completion: null,
      momentum: "waiting_on_participant",
      openBlockers: [],
      participants: [SELLER],
      nextAction: { label: "Propose the master Deal Room", owner: "Atlantico Comercio" },
    },
    "No completion value",
  ),
  build(
    "awaiting-admission",
    "3. Awaiting counterparty admission",
    "The invitation is out. The counterparty pier is drawn awaited, in the approved dashed review treatment.",
    "Awaiting principal participant",
    {
      roomState: "awaiting_principal_admission",
      procedureApproved: false,
      procedureProposed: false,
      counterpartyAdmitted: false,
      invitationSent: true,
      anyEvidenceSubmitted: false,
      completion: null,
      momentum: "waiting_on_participant",
      openBlockers: [],
      participants: [SELLER, { ...BUYER, state: "awaited", ownsNextAction: true }],
      nextAction: { label: "Complete admission", owner: "Iberia Importaciones" },
    },
    "No completion value",
  ),
  build(
    "procedure-proposed",
    "5. Procedure proposed",
    "Both principals are admitted and a procedure is on the table. Still no percentage: it does not govern until every required approver has approved it.",
    "Active, procedure not agreed",
    {
      roomState: "active_procedure_not_agreed",
      procedureApproved: false,
      procedureProposed: true,
      counterpartyAdmitted: true,
      invitationSent: true,
      anyEvidenceSubmitted: false,
      completion: BEFORE_APPROVAL.value,
      momentum: "ready_for_decision",
      openBlockers: [],
      participants: [SELLER, { ...BUYER, ownsNextAction: true }],
      nextAction: { label: "Approve the proposed procedure", owner: "Iberia Importaciones" },
    },
    "No completion value until the procedure is agreed",
  ),
  build(
    "procedure-agreed",
    "6. Procedure agreed",
    `The first lawful percentage. Admission (10) plus procedure agreement (12) is ${AT_APPROVAL.value}%, inside the approved 18-25 band, derived rather than chosen.`,
    "Procedure agreed",
    {
      roomState: "active_procedure_agreed",
      procedureApproved: true,
      procedureProposed: true,
      counterpartyAdmitted: true,
      invitationSent: true,
      anyEvidenceSubmitted: false,
      completion: AT_APPROVAL.value,
      momentum: "moving",
      openBlockers: [],
      participants: [{ ...SELLER, ownsNextAction: true }, BUYER],
      nextAction: { label: "Agree the product specification", owner: "Atlantico Comercio" },
    },
    `${AT_APPROVAL.value}%`,
  ),
  build(
    "evidence-in-progress",
    "7. Evidence and conditions in progress",
    `Specification and capability evidence accepted for the procedure: ${IN_EVIDENCE.value}%. The inspection provider joins as a supporting pier, lighter than a principal.`,
    "Evidence and conditions in progress",
    {
      roomState: "active_procedure_agreed",
      procedureApproved: true,
      procedureProposed: true,
      counterpartyAdmitted: true,
      invitationSent: true,
      anyEvidenceSubmitted: true,
      completion: IN_EVIDENCE.value,
      momentum: "moving",
      openBlockers: [],
      participants: [SELLER, BUYER, { ...INSPECTOR, ownsNextAction: true }],
      nextAction: { label: "Propose the sampling point", owner: "Sondagem Inspecoes" },
    },
    `${IN_EVIDENCE.value}%`,
  ),
  build(
    "blocked",
    "8. Blocked",
    "A critical blocker. The room stays at the milestone it reached, the deck ahead is drawn in the approved danger treatment, and the percentage does not fall: progress already earned is unchanged.",
    "Blocked",
    {
      roomState: "blocked",
      procedureApproved: true,
      procedureProposed: true,
      counterpartyAdmitted: true,
      invitationSent: true,
      anyEvidenceSubmitted: true,
      completion: IN_EVIDENCE.value,
      momentum: "blocked",
      openBlockers: [{ title: "Sampling point is not accepted by both principals", category: "critical" }],
      participants: [SELLER, BUYER, { ...INSPECTOR, ownsNextAction: true }],
      nextAction: { label: "Propose a revised sampling point", owner: "Sondagem Inspecoes" },
    },
    `${IN_EVIDENCE.value}%, unchanged`,
  ),
  build(
    "ready-to-proceed",
    "9. Ready to proceed",
    "100% only when every step of the agreed procedure is complete. It does not mean a contract, payment or shipment has happened, and the accessible label says so.",
    "Ready to proceed",
    {
      roomState: "ready_to_proceed",
      procedureApproved: true,
      procedureProposed: true,
      counterpartyAdmitted: true,
      invitationSent: true,
      anyEvidenceSubmitted: true,
      completion: COMPLETE.value,
      momentum: "ready_to_proceed",
      openBlockers: [],
      participants: [SELLER, BUYER, INSPECTOR],
      nextAction: null,
    },
    `${COMPLETE.value}%`,
  ),
  build(
    "read-only",
    "10. Read-only",
    "The entitlement term ended. Every fact is where it was, the actions are gone, and nothing has been deleted.",
    "Read-only",
    {
      roomState: "read_only",
      procedureApproved: true,
      procedureProposed: true,
      counterpartyAdmitted: true,
      invitationSent: true,
      anyEvidenceSubmitted: true,
      completion: IN_EVIDENCE.value,
      momentum: "waiting_on_participant",
      openBlockers: [],
      participants: [SELLER, BUYER, INSPECTOR],
      nextAction: null,
    },
    `${IN_EVIDENCE.value}%, preserved`,
  ),
];

export const NOTE = FICTIONAL_NOTE;
