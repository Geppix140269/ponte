/**
 * The Deal Room state vocabularies and their lawful transitions.
 *
 * Every list here is transcribed from the accepted product definition,
 * `docs/ponte-authority/PT-PRODUCT-2026-07-27-04-DEAL-ROOM-DETAILED-PRODUCT-DEFINITION-V1.md`
 * section 6. Nothing is invented, shortened or renamed, and the launch slice
 * uses a subset rather than a different set: a state this file omits is a state
 * the slice cannot reach, not a state the product does not have.
 *
 * These are also the values the database CHECK constraints carry. The two must
 * agree, so `__tests__/states.test.ts` asserts the vocabulary and the migration
 * writes the same strings. If they ever diverge, a row the application believes
 * it wrote will have been refused by Postgres.
 *
 * Pure module: no database, no React, no server imports.
 */

/* ------------------------------------------------------------------ *
 * Master room - product definition section 6.1
 * ------------------------------------------------------------------ */

export const ROOM_STATES = [
  "draft",
  "proposed",
  "awaiting_principal_admission",
  "activation_pending",
  "active_procedure_not_agreed",
  "active_procedure_agreed",
  "blocked",
  "paused",
  "read_only",
  "ready_to_proceed",
  "completed",
  "closed",
  "declined_before_activation",
  "cancelled_before_activation",
  "expired_before_activation",
  "withdrawn",
] as const;

export type RoomState = (typeof ROOM_STATES)[number];

/**
 * States in which the room accepts a mutation.
 *
 * This is the application's copy of the rule; `deal_room_is_writable()` in the
 * database is the enforcement. A stale tab holding an old room state cannot
 * write to an expired room, because the policy re-reads the state at statement
 * time. This list exists so the interface can explain *why* an action is
 * unavailable rather than merely disabling it, which Experience Design DR-11
 * requires.
 */
const WRITABLE_ROOM_STATES = new Set<RoomState>([
  "draft",
  "proposed",
  "awaiting_principal_admission",
  "activation_pending",
  "active_procedure_not_agreed",
  "active_procedure_agreed",
  "blocked",
  "ready_to_proceed",
]);

export function roomIsWritable(state: RoomState): boolean {
  return WRITABLE_ROOM_STATES.has(state);
}

/**
 * Read-only continuity: history stays visible, mutation stops.
 *
 * `paused` is deliberately here and not in the writable set. A paused room is a
 * recorded decision to stop, and letting work continue through it would make
 * the pause a label rather than a control.
 */
export function roomIsReadOnly(state: RoomState): boolean {
  return !WRITABLE_ROOM_STATES.has(state);
}

/** Named commercial stage, distinct from procedural completion. */
export const ROOM_STAGE_LABEL: Record<RoomState, string> = {
  draft: "Draft",
  proposed: "Room proposed",
  awaiting_principal_admission: "Awaiting principal participant",
  activation_pending: "Activation pending",
  active_procedure_not_agreed: "Active, procedure not agreed",
  active_procedure_agreed: "Procedure agreed",
  blocked: "Blocked",
  paused: "Paused",
  read_only: "Read-only",
  ready_to_proceed: "Ready to proceed",
  completed: "Completed",
  closed: "Closed",
  declined_before_activation: "Declined before activation",
  cancelled_before_activation: "Cancelled before activation",
  expired_before_activation: "Expired before activation",
  withdrawn: "Withdrawn",
};

/* ------------------------------------------------------------------ *
 * Sub-room - section 6.2
 * ------------------------------------------------------------------ */

export const SUB_ROOM_STATES = [
  "draft",
  "invitation_pending",
  "awaiting_admission",
  "active",
  "blocked",
  "paused",
  "outcome_reached",
  "closed",
] as const;

export type SubRoomState = (typeof SUB_ROOM_STATES)[number];

export const SUB_ROOM_KINDS = ["counterparty", "provider", "adviser", "internal"] as const;
export type SubRoomKind = (typeof SUB_ROOM_KINDS)[number];

/* ------------------------------------------------------------------ *
 * Participant - section 6.3
 * ------------------------------------------------------------------ */

export const PARTICIPANT_STATES = [
  "invited",
  "prerequisites_pending",
  "terms_pending",
  "admitted",
  "active",
  "suspended",
  "removed",
  "withdrawn",
] as const;

export type ParticipantState = (typeof PARTICIPANT_STATES)[number];

/**
 * The single rule behind acceptance criterion 4: a participant cannot act
 * before admission and agreement acceptance.
 *
 * Only two states may act. `invited`, `prerequisites_pending` and
 * `terms_pending` are all inside the admission gate, and the last of those is
 * the one worth naming: a person who has completed every prerequisite but has
 * not accepted the NDA is still outside the room.
 */
export function participantMayAct(state: ParticipantState): boolean {
  return state === "admitted" || state === "active";
}

export const PARTICIPANT_CLASSES = [
  "principal",
  "intermediary",
  "provider",
  "adviser",
  "ponte_facilitator",
  "observer",
] as const;

export type ParticipantClass = (typeof PARTICIPANT_CLASSES)[number];

export const PARTICIPANT_CLASS_LABEL: Record<ParticipantClass, string> = {
  principal: "Principal commercial party",
  intermediary: "Intermediary or representative",
  provider: "Supporting service provider",
  adviser: "Adviser",
  ponte_facilitator: "Ponte facilitator",
  observer: "Observer",
};

/* ------------------------------------------------------------------ *
 * Entitlement - section 6.4
 *
 * Held separately from room lifecycle, which is a required domain property of
 * issue #97 and the reason this is its own vocabulary and its own table rather
 * than two more values on `RoomState`.
 * ------------------------------------------------------------------ */

export const ENTITLEMENT_STATES = [
  "eligible",
  "reserved",
  "active",
  "grace",
  "expired",
  "suspended",
  "restored",
  "closed",
] as const;

export type EntitlementState = (typeof ENTITLEMENT_STATES)[number];

/** Launch slice: Starter and authorised waiver only. No paid kind, no Stripe. */
export const ENTITLEMENT_KINDS = ["starter", "sponsored", "waived"] as const;
export type EntitlementKind = (typeof ENTITLEMENT_KINDS)[number];

const ENTITLEMENT_PERMITS_MUTATION = new Set<EntitlementState>(["reserved", "active", "grace", "restored"]);

export function entitlementPermitsMutation(state: EntitlementState): boolean {
  return ENTITLEMENT_PERMITS_MUTATION.has(state);
}

/* ------------------------------------------------------------------ *
 * Procedure - section 6.5
 * ------------------------------------------------------------------ */

export const PROCEDURE_STATES = [
  "draft",
  "proposed",
  "amendment_requested",
  "approved",
  "superseded",
  "completed",
] as const;

export type ProcedureState = (typeof PROCEDURE_STATES)[number];

/**
 * Acceptance criteria 6 and 7: the procedure does not govern before approval,
 * and no percentage appears before it does.
 */
export function procedureGoverns(state: ProcedureState): boolean {
  return state === "approved" || state === "completed";
}

/* ------------------------------------------------------------------ *
 * Step - section 6.6
 * ------------------------------------------------------------------ */

export const STEP_STATES = [
  "not_ready",
  "ready",
  "in_progress",
  "evidence_submitted",
  "review_required",
  "clarification_required",
  "completed",
  "blocked",
  "waived",
  "not_applicable",
  "cancelled",
] as const;

export type StepState = (typeof STEP_STATES)[number];

/**
 * Which step states have earned their weight.
 *
 * `completed` is obvious. `waived` earns only through the required waiver
 * approval, which section 7.3 states and which the approval is responsible for
 * recording before the state is written; by the time a step reads `waived` that
 * approval exists. `not_applicable` and `cancelled` earn nothing and are instead
 * removed from the denominator - see `procedure.ts`.
 *
 * Everything else earns nothing, including `blocked`. A blocked step keeps the
 * progress already earned elsewhere but does not earn its own: section 7.3's
 * "blocked items retain previously earned progress" is about the room's total,
 * not about crediting incomplete work.
 */
export function stepHasEarned(state: StepState): boolean {
  return state === "completed" || state === "waived";
}

/** A step that is out of the procedure entirely, so out of the denominator. */
export function stepIsExcluded(state: StepState): boolean {
  return state === "not_applicable" || state === "cancelled";
}

export const STEP_STATE_LABEL: Record<StepState, string> = {
  not_ready: "Not ready",
  ready: "Ready",
  in_progress: "In progress",
  evidence_submitted: "Evidence submitted",
  review_required: "Review required",
  clarification_required: "Clarification required",
  completed: "Completed",
  blocked: "Blocked",
  waived: "Waived",
  not_applicable: "Not applicable",
  cancelled: "Cancelled",
};

/* ------------------------------------------------------------------ *
 * Evidence - section 6.8
 * ------------------------------------------------------------------ */

export const EVIDENCE_STATES = [
  "draft",
  "uploaded",
  "disclosed",
  "under_review",
  "clarification_required",
  "accepted_for_procedure",
  "rejected",
  "superseded",
  "withdrawn",
  "independently_verified",
] as const;

export type EvidenceState = (typeof EVIDENCE_STATES)[number];

/**
 * The distinction acceptance criterion 9 exists to protect.
 *
 * `accepted_for_procedure` says the parties agreed this document satisfies a
 * requirement. `independently_verified` says someone checked it against a
 * source. They are different facts about different things, and no label,
 * colour, icon or sentence in this product may collapse them.
 *
 * The wording below is the whole point of the module. `uploaded` reads
 * "Uploaded, not yet reviewed" and never anything that could be mistaken for a
 * check having happened.
 */
export const EVIDENCE_STATE_LABEL: Record<EvidenceState, string> = {
  draft: "Draft, not submitted",
  uploaded: "Uploaded, not yet reviewed",
  disclosed: "Disclosed to selected viewers",
  under_review: "Under review",
  clarification_required: "Clarification required",
  accepted_for_procedure: "Accepted for procedure",
  rejected: "Rejected for procedure",
  superseded: "Superseded",
  withdrawn: "Withdrawn",
  independently_verified: "Independently verified",
};

/**
 * The limitation sentence shown beside the state, so the boundary travels with
 * the label instead of living in a help page nobody opens.
 */
export const EVIDENCE_STATE_LIMITATION: Record<EvidenceState, string> = {
  draft: "Nothing has been submitted to the other participants.",
  uploaded: "Uploading a document is not a check. No one has reviewed this yet.",
  disclosed: "Selected viewers can see this. It has not been reviewed.",
  under_review: "A reviewer is looking at this. No conclusion has been recorded.",
  clarification_required: "A reviewer has asked a question. The item is not accepted.",
  accepted_for_procedure:
    "The parties accepted this for the agreed procedure. That is not a finding that the document is authentic.",
  rejected: "This was not accepted for the agreed procedure.",
  superseded: "A later version replaced this one. The original is retained.",
  withdrawn: "The provider withdrew this item. The record is retained.",
  independently_verified:
    "This was checked against an independent source. The check is recorded with its own date and limitation.",
};

export const EVIDENCE_VISIBILITIES = ["own_org", "sub_room", "principals", "selected", "ponte_only"] as const;
export type EvidenceVisibility = (typeof EVIDENCE_VISIBILITIES)[number];

export const EVIDENCE_VISIBILITY_LABEL: Record<EvidenceVisibility, string> = {
  own_org: "Your organisation only",
  sub_room: "This private workspace",
  principals: "Principal parties only",
  selected: "Selected participants",
  ponte_only: "Ponte only",
};

export const EVIDENCE_PROVENANCES = [
  "member_declared",
  "member_uploaded",
  "third_party_supplied",
  "ponte_checked",
] as const;

export type EvidenceProvenance = (typeof EVIDENCE_PROVENANCES)[number];

export const EVIDENCE_PROVENANCE_LABEL: Record<EvidenceProvenance, string> = {
  member_declared: "Declared by the member",
  member_uploaded: "Supplied by the member",
  third_party_supplied: "Supplied by a third party",
  ponte_checked: "Checked by Ponte",
};

/* ------------------------------------------------------------------ *
 * Clarification, blocker, approval
 * ------------------------------------------------------------------ */

export const CLARIFICATION_STATES = ["open", "answered", "closed"] as const;
export type ClarificationState = (typeof CLARIFICATION_STATES)[number];

/** Section 6.10. */
export const BLOCKER_STATES = ["open", "owned", "resolution_proposed", "resolved", "waived", "escalated"] as const;
export type BlockerState = (typeof BLOCKER_STATES)[number];

/** Ranked by commercial impact, per Experience Design DR-15. */
export const BLOCKER_CATEGORIES = ["critical", "material", "operational"] as const;
export type BlockerCategory = (typeof BLOCKER_CATEGORIES)[number];

export const BLOCKER_CATEGORY_LABEL: Record<BlockerCategory, string> = {
  critical: "Critical",
  material: "Material",
  operational: "Operational",
};

export function blockerIsOpen(state: BlockerState): boolean {
  return state !== "resolved" && state !== "waived";
}

/** Section 6.9, approval half. */
export const APPROVAL_RESPONSES = [
  "pending",
  "approved",
  "objected",
  "amendment_requested",
  "clarification_requested",
] as const;

export type ApprovalResponse = (typeof APPROVAL_RESPONSES)[number];

/* ------------------------------------------------------------------ *
 * Agreements
 * ------------------------------------------------------------------ */

export const AGREEMENT_KINDS = ["participation", "nda", "room_rules", "authority_declaration"] as const;
export type AgreementKind = (typeof AGREEMENT_KINDS)[number];

export const AGREEMENT_KIND_LABEL: Record<AgreementKind, string> = {
  participation: "Deal Room Participation Agreement",
  nda: "Confidentiality and non-disclosure obligations",
  room_rules: "Room rules",
  authority_declaration: "Declaration of authority to participate",
};

/** Every agreement a participant must accept before admission completes. */
export const REQUIRED_AGREEMENT_KINDS: readonly AgreementKind[] = [
  "participation",
  "nda",
  "room_rules",
  "authority_declaration",
];

/* ------------------------------------------------------------------ *
 * Invitation
 * ------------------------------------------------------------------ */

export const INVITATION_STATES = ["sent", "accepted", "declined", "expired", "revoked"] as const;
export type InvitationState = (typeof INVITATION_STATES)[number];

/** Operating modes, product contract section 11. */
export const OPERATING_MODES = [
  "software_only",
  "ponte_observed",
  "ponte_facilitated",
  "ponte_managed_procedure",
  "institutionally_sponsored",
] as const;

export type OperatingMode = (typeof OPERATING_MODES)[number];

/**
 * Launch slice restriction, stated in code rather than only in the plan.
 *
 * Ponte-facilitated and managed modes commit human Ponte work, which the
 * monetisation policy reserves to a paid scope that does not exist yet. Offering
 * the mode in a free Starter room would promise labour nobody has agreed to
 * supply.
 */
export const LAUNCH_OPERATING_MODES: readonly OperatingMode[] = ["software_only", "ponte_observed"];

export const OPERATING_MODE_LABEL: Record<OperatingMode, string> = {
  software_only: "Software only",
  ponte_observed: "Ponte observed",
  ponte_facilitated: "Ponte facilitated",
  ponte_managed_procedure: "Ponte-managed procedure",
  institutionally_sponsored: "Institutionally sponsored",
};
