/**
 * The interpretation, confirmation and canonical-term domain contract (LB-009).
 *
 * Pure types and pure logic. This file encodes the rules that keep AI output
 * advisory and the canonical deal state under human control (ADR-0016 section 3,
 * ExecPlan section 5):
 *
 * - Every proposed fact must reference its source message(s), and every proposed
 *   value must carry an attributable source excerpt, or it is not a valid
 *   proposal. This mirrors the existing document-extraction rule in
 *   lib/products/extract-document.ts (a value without a quote is dropped).
 * - A proposal never writes canonical state. Only a deterministic authorised
 *   command confirms or rejects it.
 * - A confirmation records the previous value, the new value, the confirming
 *   participant, their capacity, the proposal and the timestamp.
 * - Conflicting party positions are preserved as a disagreement and never merged
 *   into a single value.
 */

import type { DealRoomLanguage } from "./language";

/**
 * Interpretation proposal lifecycle.
 *
 * - `proposed` - awaiting an authorised decision. The only state it can be
 *   confirmed or rejected from.
 * - `confirmed` - an authorised participant confirmed it; a canonical term was
 *   written. Terminal.
 * - `rejected` - an authorised participant rejected it. Preserved, terminal.
 * - `superseded` - a later proposal replaced it. Preserved, terminal.
 * - `disputed` - it records a party position that conflicts with another; kept
 *   distinct, never merged.
 */
export const INTERPRETATION_STATUSES = [
  "proposed",
  "confirmed",
  "rejected",
  "superseded",
  "disputed",
] as const;
export type InterpretationStatus = (typeof INTERPRETATION_STATUSES)[number];

/** A decision on a proposal. Both are recorded; neither erases the proposal. */
export const TERM_DECISION_KINDS = ["confirm", "reject"] as const;
export type TermDecisionKind = (typeof TERM_DECISION_KINDS)[number];

/**
 * A reference from a proposed fact back to the message that evidences it, with a
 * verbatim source-language excerpt. A proposal with no such reference is not a
 * valid proposal.
 */
export interface SourceMessageRef {
  messageId: string;
  excerpt: string;
  sourceLanguage: DealRoomLanguage;
}

/** Whether a single source reference is well-formed (has an id and an excerpt). */
export function isValidSourceRef(ref: SourceMessageRef | null | undefined): boolean {
  return !!ref && !!ref.messageId && typeof ref.excerpt === "string" && ref.excerpt.trim().length > 0;
}

/**
 * A structured commercial fact Ponte proposes from the discussion. Advisory: it
 * cannot itself change canonical state. `field` is the canonical (English) field
 * key; `partyPosition` names whose position the value represents.
 */
export interface InterpretationProposal {
  id: string;
  roomId: string;
  subRoomId: string;
  field: string;
  proposedValue: unknown;
  previousValue: unknown | null;
  partyPosition: string;
  partyParticipantId: string | null;
  sourceRefs: SourceMessageRef[];
  status: InterpretationStatus;
  confidence: string | null;
  ambiguity: string | null;
  provider: string | null;
  model: string | null;
  modelVersion: string | null;
  createdAt: string;
}

/**
 * A proposal has attributable evidence when it references at least one source
 * message and every reference is well-formed. Enforced before a proposal is
 * stored so a value can never be proposed without a source excerpt.
 */
export function proposalHasEvidence(proposal: Pick<InterpretationProposal, "sourceRefs">): boolean {
  return proposal.sourceRefs.length > 0 && proposal.sourceRefs.every(isValidSourceRef);
}

/** Throws unless the proposal carries at least one well-formed source excerpt. */
export function assertProposalHasEvidence(proposal: Pick<InterpretationProposal, "field" | "sourceRefs">): void {
  if (!proposalHasEvidence(proposal)) {
    throw new Error(`interpretation proposal for "${proposal.field}" must cite at least one source message excerpt`);
  }
}

/** Only a `proposed` proposal may be confirmed. */
export function canConfirm(status: InterpretationStatus): boolean {
  return status === "proposed";
}

/** Only a `proposed` proposal may be rejected. */
export function canReject(status: InterpretationStatus): boolean {
  return status === "proposed";
}

/**
 * The attribution a confirmation or rejection must record. Capacity and
 * organisation are the professional context in which the participant decided.
 */
export interface TermDecision {
  proposalId: string;
  decision: TermDecisionKind;
  previousValue: unknown | null;
  decidedValue: unknown | null;
  decidedByParticipantId: string;
  decidedByProfileId: string;
  capacityLabel: string;
  organisationLabel: string | null;
  reason: string | null;
  createdAt: string;
}

/**
 * A confirmed canonical structured term. English-canonical. `current` marks the
 * value in force; superseded values keep `current = false` and remain in
 * history with the previous value they replaced.
 */
export interface CanonicalTerm {
  id: string;
  roomId: string;
  field: string;
  value: unknown;
  language: "en";
  current: boolean;
  previousValue: unknown | null;
  confirmedByParticipantId: string;
  capacityLabel: string;
  sourceProposalId: string;
  createdAt: string;
}

/**
 * Whether a confirmation decision records everything the canonical change must
 * carry: previous value (may be null for a first value), the confirmed value,
 * the participant, their capacity, the proposal and a timestamp. Throws
 * otherwise. A rejection is validated by `assertRejectionComplete`.
 */
export function assertConfirmationComplete(decision: TermDecision): void {
  if (decision.decision !== "confirm") {
    throw new Error("assertConfirmationComplete called on a non-confirm decision");
  }
  const missing: string[] = [];
  if (decision.decidedValue === null || decision.decidedValue === undefined) missing.push("decidedValue");
  if (!decision.decidedByParticipantId) missing.push("decidedByParticipantId");
  if (!decision.capacityLabel) missing.push("capacityLabel");
  if (!decision.proposalId) missing.push("proposalId");
  if (!decision.createdAt) missing.push("createdAt");
  if (missing.length > 0) {
    throw new Error(`confirmation is missing required attribution: ${missing.join(", ")}`);
  }
}

/** A rejection must reference the proposal, the participant and a timestamp; the proposal is preserved. */
export function assertRejectionComplete(decision: TermDecision): void {
  if (decision.decision !== "reject") {
    throw new Error("assertRejectionComplete called on a non-reject decision");
  }
  const missing: string[] = [];
  if (!decision.decidedByParticipantId) missing.push("decidedByParticipantId");
  if (!decision.proposalId) missing.push("proposalId");
  if (!decision.createdAt) missing.push("createdAt");
  if (missing.length > 0) {
    throw new Error(`rejection is missing required attribution: ${missing.join(", ")}`);
  }
}

/** A single party's stated position on a field, with its source evidence. */
export interface PartyPosition {
  field: string;
  party: string;
  participantId: string | null;
  value: unknown;
  sourceRefs: SourceMessageRef[];
}

/**
 * Whether a set of positions on the same field constitutes a disagreement: two
 * or more distinct values held by different parties. Values are compared by
 * canonical JSON so `{a:1,b:2}` and `{b:2,a:1}` are the same value.
 */
export function isDisagreement(positions: PartyPosition[]): boolean {
  if (positions.length < 2) return false;
  const parties = new Set(positions.map((p) => p.party));
  if (parties.size < 2) return false;
  const values = new Set(positions.map((p) => stableStringify(p.value)));
  return values.size >= 2;
}

/**
 * Preserve a disagreement rather than resolving it: return one proposal per
 * party position, each marked `disputed`, so both incompatible positions remain
 * in history and neither is presented as the agreed value. Never merges.
 */
export function preserveDisagreement(
  positions: PartyPosition[],
): Array<Pick<InterpretationProposal, "field" | "partyPosition" | "partyParticipantId" | "proposedValue" | "sourceRefs" | "status">> {
  return positions.map((position) => ({
    field: position.field,
    partyPosition: position.party,
    partyParticipantId: position.participantId,
    proposedValue: position.value,
    sourceRefs: position.sourceRefs,
    status: "disputed" as const,
  }));
}

/** Deterministic JSON with sorted object keys, for value equality of positions. */
function stableStringify(value: unknown): string {
  return JSON.stringify(sortKeys(value));
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === "object") {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = sortKeys((value as Record<string, unknown>)[key]);
        return acc;
      }, {});
  }
  return value;
}
