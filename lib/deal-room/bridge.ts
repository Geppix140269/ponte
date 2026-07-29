/**
 * The data model behind the Multi-party Deal Room Bridge.
 *
 * Commissioned by the owner on issue #97, decision 2, limited to the ten states
 * the launch slice needs. This module decides *what* the bridge says; the
 * component decides where the pixels go, and the geometry it uses is the
 * approved engine's, transcribed in `components/ponte/bridge/geometry.ts`.
 *
 * Keeping the mapping here and pure is what lets the two hardest rules be
 * tested without a browser:
 *
 * 1. **No percentage before the procedure is approved.** `procedureApproved` is
 *    the only gate on `completion`, and the type makes the null case
 *    unavoidable.
 * 2. **A private sub-room branch appears only when the viewer is authorised to
 *    know it exists.** The bridge is handed an already-filtered list; it never
 *    receives a room's full sub-room set and decides what to hide, because a
 *    component that receives a secret has already leaked it to the client
 *    bundle.
 */

import type { BlockerCategory, RoomState } from "./states";
import type { MomentumState } from "./progress";

/** The ten commissioned states. */
export const BRIDGE_STATES = [
  "credible_interest_confirmed",
  "room_proposed",
  "awaiting_counterparty_admission",
  "counterparty_admitted",
  "procedure_proposed",
  "procedure_agreed",
  "evidence_in_progress",
  "blocked",
  "ready_to_proceed",
  "read_only",
] as const;

export type BridgeState = (typeof BRIDGE_STATES)[number];

/**
 * The eight milestones drawn on the deck.
 *
 * `blocked` and `read_only` are deliberately **not** here. They are conditions
 * of the room, not positions along it: a blocked room is still at whichever
 * milestone it reached, and drawing "blocked" as a station would lose that and
 * imply the room had moved forward into it. They are rendered as the state chip
 * and as the treatment of the deck ahead of the current node, which is what the
 * approved stylesheet's `.d-blocked` and `.brj__state--block` exist for.
 */
export const BRIDGE_MILESTONES: readonly { state: BridgeState; label: string }[] = [
  { state: "credible_interest_confirmed", label: "Credible interest" },
  { state: "room_proposed", label: "Room proposed" },
  { state: "awaiting_counterparty_admission", label: "Awaiting admission" },
  { state: "counterparty_admitted", label: "Counterparty admitted" },
  { state: "procedure_proposed", label: "Procedure proposed" },
  { state: "procedure_agreed", label: "Procedure agreed" },
  { state: "evidence_in_progress", label: "Evidence and conditions" },
  { state: "ready_to_proceed", label: "Ready to proceed" },
];

export interface BridgeParticipant {
  /** The role, not the person. A pier is a party to the transaction. */
  role: string;
  /** Principals get the heavier pier and the solid node. */
  principal: boolean;
  state: "joined" | "awaited" | "accepted";
  /** At most one participant carries this. */
  ownsNextAction: boolean;
}

export interface BridgeModel {
  /** Index into `BRIDGE_MILESTONES`. Never points at a condition. */
  at: number;
  /** The room condition, drawn as the chip and the forward deck treatment. */
  condition: "none" | "blocked" | "read_only" | "paused";
  /** Null until the procedure is approved. Criterion 7, in the type system. */
  completion: number | null;
  momentum: MomentumState;
  participants: BridgeParticipant[];
  /** Shown beside the bridge. Exactly one. */
  nextAction: { label: string; owner: string } | null;
  /** The open blocker with the greatest commercial impact, if any. */
  blocker: { title: string; category: BlockerCategory } | null;
}

export interface BridgeInput {
  roomState: RoomState;
  procedureApproved: boolean;
  procedureProposed: boolean;
  counterpartyAdmitted: boolean;
  invitationSent: boolean;
  anyEvidenceSubmitted: boolean;
  completion: number | null;
  momentum: MomentumState;
  openBlockers: readonly { title: string; category: BlockerCategory }[];
  /** Already permission-filtered by the caller. See the module note. */
  participants: readonly BridgeParticipant[];
  nextAction: { label: string; owner: string } | null;
}

const ORDER: BridgeState[] = BRIDGE_MILESTONES.map((milestone) => milestone.state);

function indexOf(state: BridgeState): number {
  return ORDER.indexOf(state);
}

/**
 * Where the room is on the deck.
 *
 * Read downwards, most advanced first, so the answer is the furthest point the
 * room has actually reached rather than the first condition that happens to
 * match. A blocked room in evidence is at "evidence and conditions", blocked -
 * not at some earlier station.
 */
function milestoneIndex(input: BridgeInput): number {
  if (input.roomState === "ready_to_proceed" || input.roomState === "completed") {
    return indexOf("ready_to_proceed");
  }
  if (input.procedureApproved) {
    return input.anyEvidenceSubmitted ? indexOf("evidence_in_progress") : indexOf("procedure_agreed");
  }
  if (input.procedureProposed) return indexOf("procedure_proposed");
  if (input.counterpartyAdmitted) return indexOf("counterparty_admitted");
  if (input.invitationSent) return indexOf("awaiting_counterparty_admission");
  if (input.roomState === "draft") return indexOf("credible_interest_confirmed");
  return indexOf("room_proposed");
}

function conditionOf(input: BridgeInput): BridgeModel["condition"] {
  if (input.roomState === "read_only" || input.roomState === "closed" || input.roomState === "completed") {
    return "read_only";
  }
  if (input.roomState === "paused") return "paused";
  if (input.openBlockers.some((blocker) => blocker.category === "critical")) return "blocked";
  return "none";
}

/** The blocker to name: critical first, then material, then operational. */
function leadBlocker(
  blockers: readonly { title: string; category: BlockerCategory }[],
): { title: string; category: BlockerCategory } | null {
  const rank: Record<BlockerCategory, number> = { critical: 0, material: 1, operational: 2 };
  const sorted = [...blockers].sort((a, b) => rank[a.category] - rank[b.category]);
  return sorted[0] ?? null;
}

export function bridgeModel(input: BridgeInput): BridgeModel {
  return {
    at: milestoneIndex(input),
    condition: conditionOf(input),
    // The single most important line in this file. Even if a caller computes a
    // number, it is discarded until the procedure governs.
    completion: input.procedureApproved ? input.completion : null,
    momentum: input.momentum,
    participants: [...input.participants],
    nextAction: input.nextAction,
    blocker: leadBlocker(input.openBlockers),
  };
}

/**
 * The accessible sentence for the bridge.
 *
 * The implementation notes require a non-interactive bridge to be a single
 * `role="img"` whose label names "the current stage, the next stage, and the
 * caveat that later stages are not guaranteed". The approved engine's own
 * `dealroom()` label states the stage, the participant count and who owns the
 * next action, but omits the next stage and the caveat.
 *
 * Where the two differ this follows the notes, because the notes are the rule
 * and the omission is the kind a caveat exists to prevent: a screen-reader user
 * hearing a list of stages without it could reasonably infer the room is
 * expected to reach them.
 */
export function bridgeAriaLabel(model: BridgeModel): string {
  const current = BRIDGE_MILESTONES[model.at];
  const next = BRIDGE_MILESTONES[model.at + 1] ?? null;

  const parts = [
    `Deal Room progression. Current stage: ${current.label}, stage ${model.at + 1} of ${BRIDGE_MILESTONES.length}.`,
  ];

  if (next) {
    parts.push(`Next stage: ${next.label}.`);
    parts.push("Later stages are not guaranteed and depend on what the participants agree and evidence.");
  } else {
    parts.push(
      "This is the final stage of the agreed procedure. It does not mean a contract, payment or shipment has happened.",
    );
  }

  if (model.condition === "blocked" && model.blocker) {
    parts.push(`The room is blocked: ${model.blocker.title}.`);
  } else if (model.condition === "read_only") {
    parts.push("The room is read-only. The history is preserved and nothing can be changed.");
  } else if (model.condition === "paused") {
    parts.push("The room is paused.");
  }

  if (model.completion !== null) {
    parts.push(`Procedural completion: ${model.completion} per cent of the agreed procedure.`);
  }

  parts.push(
    model.participants.length === 1
      ? "1 participant."
      : `${model.participants.length} participants.`,
  );

  const owner = model.participants.find((participant) => participant.ownsNextAction);
  if (owner) parts.push(`${owner.role} owns the next action.`);

  return parts.join(" ");
}
