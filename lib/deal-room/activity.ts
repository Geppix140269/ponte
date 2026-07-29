/**
 * The attributable activity record.
 *
 * Two rules govern it, and they pull in opposite directions.
 *
 * **Append-only and attributable.** Every material event names who did it, to
 * what, and when, and nothing can edit or remove it afterwards. The database
 * enforces that with a trigger that refuses UPDATE and DELETE, and by giving
 * members no INSERT policy at all: rows are written only inside the authorised
 * command functions, so a participant cannot forge a history entry. This is the
 * same shape as the merged `listing_events` table.
 *
 * **Not noise.** Experience Design DR-18: "Routine page views and minor edits
 * do not create noise." So the event vocabulary below is closed and short. If
 * an action is not on this list it does not produce an event, and adding one is
 * a deliberate act rather than a side effect of writing a new route.
 */

export const ACTIVITY_EVENT_TYPES = [
  "room_proposed",
  "sub_room_created",
  "invitation_sent",
  "invitation_declined",
  "invitation_expired",
  "participant_admitted",
  "participant_removed",
  "agreement_accepted",
  "room_activated",
  "procedure_proposed",
  "procedure_approval_recorded",
  "procedure_approved",
  "procedure_superseded",
  "step_completed",
  "evidence_submitted",
  "evidence_clarification_requested",
  "evidence_clarification_answered",
  "evidence_accepted_for_procedure",
  "evidence_rejected",
  "evidence_superseded",
  "blocker_opened",
  "blocker_owned",
  "blocker_resolved",
  "room_ready_to_proceed",
  "room_paused",
  "room_resumed",
  "room_read_only",
  "room_closed",
] as const;

export type ActivityEventType = (typeof ACTIVITY_EVENT_TYPES)[number];

/**
 * Human wording for the feed.
 *
 * Past tense, factual, no adjective, no praise. An activity feed that
 * congratulates people stops being a record.
 */
export const ACTIVITY_EVENT_LABEL: Record<ActivityEventType, string> = {
  room_proposed: "Room proposed",
  sub_room_created: "Private workspace created",
  invitation_sent: "Protected invitation sent",
  invitation_declined: "Invitation declined",
  invitation_expired: "Invitation expired",
  participant_admitted: "Participant admitted",
  participant_removed: "Participant removed",
  agreement_accepted: "Agreement accepted",
  room_activated: "Room activated",
  procedure_proposed: "Procedure proposed",
  procedure_approval_recorded: "Procedure approval recorded",
  procedure_approved: "Procedure approved",
  procedure_superseded: "Procedure version superseded",
  step_completed: "Procedure step completed",
  evidence_submitted: "Evidence submitted",
  evidence_clarification_requested: "Clarification requested",
  evidence_clarification_answered: "Clarification answered",
  evidence_accepted_for_procedure: "Evidence accepted for procedure",
  evidence_rejected: "Evidence rejected for procedure",
  evidence_superseded: "Evidence superseded",
  blocker_opened: "Blocker opened",
  blocker_owned: "Blocker owned",
  blocker_resolved: "Blocker resolved",
  room_ready_to_proceed: "Ready to proceed",
  room_paused: "Room paused",
  room_resumed: "Room resumed",
  room_read_only: "Room moved to read-only",
  room_closed: "Room closed",
};

export interface ActivityEvent {
  id: string;
  roomId: string;
  /** Null for a master-room event. Set for anything inside a private workspace. */
  subRoomId: string | null;
  eventType: ActivityEventType;
  actorLabel: string;
  actorOrganisationLabel: string | null;
  summary: string;
  createdAt: string;
}

/**
 * The events that count as "material" for the momentum descriptor.
 *
 * Deliberately narrower than the full vocabulary: an invitation being sent is
 * worth recording but is not the transaction moving, and counting it would let
 * a room look busy while nothing happened.
 */
const MATERIAL_FOR_MOMENTUM = new Set<ActivityEventType>([
  "participant_admitted",
  "procedure_approved",
  "step_completed",
  "evidence_submitted",
  "evidence_clarification_answered",
  "evidence_accepted_for_procedure",
  "blocker_resolved",
  "room_ready_to_proceed",
]);

export function isMaterialForMomentum(type: ActivityEventType): boolean {
  return MATERIAL_FOR_MOMENTUM.has(type);
}

export function countMaterialEventsSince(events: readonly ActivityEvent[], since: Date): number {
  const cutoff = since.getTime();
  return events.filter((event) => isMaterialForMomentum(event.eventType) && Date.parse(event.createdAt) >= cutoff)
    .length;
}

/**
 * The milestones a room can earn, per product definition 7.8.
 *
 * A milestone is a named fact, never an implication beyond it. "Ready to
 * proceed" means the agreed procedure is complete; it does not mean a contract,
 * a payment or a shipment happened, and the label must never be allowed to
 * drift towards suggesting one.
 */
export const MILESTONES = [
  { key: "participants_admitted", label: "Principal participants admitted", from: "participant_admitted" },
  { key: "procedure_agreed", label: "Procedure agreed", from: "procedure_approved" },
  { key: "first_evidence", label: "First evidence supplied", from: "evidence_submitted" },
  { key: "first_clarification", label: "First clarification resolved", from: "evidence_clarification_answered" },
  { key: "first_acceptance", label: "First evidence accepted for procedure", from: "evidence_accepted_for_procedure" },
  { key: "first_blocker_resolved", label: "First blocker resolved", from: "blocker_resolved" },
  { key: "ready_to_proceed", label: "Ready to proceed", from: "room_ready_to_proceed" },
] as const;

export type MilestoneKey = (typeof MILESTONES)[number]["key"];

/** Which milestones the room has earned, derived from its own event history. */
export function earnedMilestones(events: readonly ActivityEvent[]): Set<MilestoneKey> {
  const seen = new Set<string>(events.map((event) => event.eventType));
  const earned = new Set<MilestoneKey>();
  for (const milestone of MILESTONES) {
    if (seen.has(milestone.from)) earned.add(milestone.key);
  }
  return earned;
}
