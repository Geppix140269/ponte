/**
 * Permission predicates for the Deal Room interface.
 *
 * ## Read this before using it
 *
 * **This module is not a security boundary.** Row Level Security is. Every
 * predicate here exists so a surface can decide whether to *offer* an action
 * and, when it does not, explain why - which Experience Design DR-11 requires:
 * "The screen explains why an action is unavailable rather than merely
 * disabling it."
 *
 * If this file and the database ever disagree, the database wins and the user
 * sees an error instead of a wrong screen. That is the correct failure. The
 * dangerous inversion - a permissive UI over a permissive database - cannot
 * happen here because no policy is derived from this file.
 *
 * The mirror is deliberate and tested: `__tests__/permissions.test.ts` walks
 * the permission matrix in product definition section 5.2 and asserts each
 * predicate against it, so drift shows up as a failing test rather than as a
 * button that throws.
 *
 * Pure module.
 */

import {
  participantMayAct,
  roomIsWritable,
  entitlementPermitsMutation,
  type EntitlementState,
  type ParticipantClass,
  type ParticipantState,
  type RoomState,
} from "./states";

/**
 * What the caller is, in one object.
 *
 * `subRoomId` is null for a master-level participant. A viewer with no
 * participation at all is represented by `null` rather than by a Viewer with
 * empty fields, so "not a participant" cannot be confused with "a participant
 * with no permissions".
 */
export interface Viewer {
  profileId: string;
  participantId: string;
  participantClass: ParticipantClass;
  participantState: ParticipantState;
  /** Null means admitted at master level rather than to one sub-room. */
  subRoomId: string | null;
  isRequiredApprover: boolean;
  /** Sponsor or initiator of the master room. */
  isRoomAdministrator: boolean;
  /** Named reviewer for evidence on the step in question. */
  isReviewer: boolean;
}

export interface RoomContext {
  roomState: RoomState;
  entitlementState: EntitlementState;
}

/**
 * The one predicate everything else is built on.
 *
 * Three independent conditions, all of which must hold: the participant is
 * through the admission gate, the room lifecycle permits mutation, and the
 * entitlement permits it. They are kept separate because they fail for
 * different reasons and the member is owed the right one.
 */
export function canMutate(viewer: Viewer | null, context: RoomContext): boolean {
  if (!viewer) return false;
  return (
    participantMayAct(viewer.participantState) &&
    roomIsWritable(context.roomState) &&
    entitlementPermitsMutation(context.entitlementState)
  );
}

/** Why a mutation is unavailable, for the sentence beside the disabled action. */
export function mutationBlockedReason(viewer: Viewer | null, context: RoomContext): string | null {
  if (!viewer) return "You are not a participant in this workspace.";

  if (!participantMayAct(viewer.participantState)) {
    switch (viewer.participantState) {
      case "invited":
        return "You have not started admission yet.";
      case "prerequisites_pending":
        return "Complete the admission checklist before acting in this room.";
      case "terms_pending":
        return "Accept the Participation Agreement, the NDA and the room rules before acting in this room.";
      case "suspended":
        return "Your participation is suspended.";
      case "removed":
      case "withdrawn":
        return "You are no longer a participant in this room.";
      default:
        return "You cannot act in this room yet.";
    }
  }

  if (!roomIsWritable(context.roomState)) {
    if (context.roomState === "paused") return "This room is paused. Nothing can change until it resumes.";
    if (context.roomState === "read_only")
      return "This room is read-only. The history stays readable and nothing can be changed.";
    if (context.roomState === "closed" || context.roomState === "completed")
      return "This room is closed. The history stays readable and nothing can be changed.";
    return "This room cannot be changed in its current state.";
  }

  if (!entitlementPermitsMutation(context.entitlementState)) {
    return "The room entitlement has lapsed. The history stays readable and nothing can be changed until it is restored.";
  }

  return null;
}

/* ------------------------------------------------------------------ *
 * Capability predicates, mirroring product definition section 5.2
 * ------------------------------------------------------------------ */

export function canProposeProcedure(viewer: Viewer | null, context: RoomContext): boolean {
  if (!canMutate(viewer, context)) return false;
  const v = viewer!;
  return v.isRoomAdministrator || v.participantClass === "principal" || v.participantClass === "ponte_facilitator";
}

/** Only a designated required approver, and only on a proposed version. */
export function canApproveProcedure(viewer: Viewer | null, context: RoomContext): boolean {
  if (!canMutate(viewer, context)) return false;
  return viewer!.isRequiredApprover;
}

export function canUploadEvidence(viewer: Viewer | null, context: RoomContext): boolean {
  if (!canMutate(viewer, context)) return false;
  return viewer!.participantClass !== "observer";
}

/**
 * Accepting evidence for the procedure is a review act, not a membership one.
 *
 * The matrix marks this `C if reviewer` for every class that can do it at all,
 * so being a principal is not sufficient: the procedure names who reviews what,
 * and only that person may accept.
 */
export function canAcceptEvidence(viewer: Viewer | null, context: RoomContext): boolean {
  if (!canMutate(viewer, context)) return false;
  return viewer!.isReviewer;
}

export function canRequestClarification(viewer: Viewer | null, context: RoomContext): boolean {
  if (!canMutate(viewer, context)) return false;
  return viewer!.isReviewer || viewer!.participantClass === "principal";
}

export function canOpenBlocker(viewer: Viewer | null, context: RoomContext): boolean {
  if (!canMutate(viewer, context)) return false;
  return viewer!.participantClass !== "observer";
}

export function canResolveBlocker(viewer: Viewer | null, context: RoomContext, ownerParticipantId: string): boolean {
  if (!canMutate(viewer, context)) return false;
  return viewer!.participantId === ownerParticipantId || viewer!.isRoomAdministrator;
}

export function canInviteParticipant(viewer: Viewer | null, context: RoomContext): boolean {
  if (!canMutate(viewer, context)) return false;
  return viewer!.isRoomAdministrator;
}

export function canCreateSubRoom(viewer: Viewer | null, context: RoomContext): boolean {
  if (!canMutate(viewer, context)) return false;
  return viewer!.isRoomAdministrator;
}

/**
 * Who may see that private sub-rooms exist at all.
 *
 * This is the interface half of acceptance criterion 13. The database half is
 * the `deal_room_sub_rooms` SELECT policy, which returns zero rows to everyone
 * else - so a bug here shows a member an empty list, not another counterparty's
 * negotiation.
 *
 * The rule is narrow on purpose: an admitted principal in one sub-room is NOT
 * entitled to the portfolio. Only the sponsor team is.
 */
export function canSeeSubRoomPortfolio(viewer: Viewer | null): boolean {
  return Boolean(viewer?.isRoomAdministrator);
}

/**
 * Reading is not gated on entitlement or room state: read-only continuity means
 * an expired room stays readable to the people who were admitted.
 */
export function canReadRoom(viewer: Viewer | null): boolean {
  if (!viewer) return false;
  return viewer.participantState !== "removed" && viewer.participantState !== "withdrawn";
}
