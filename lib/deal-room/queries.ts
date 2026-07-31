import "server-only";

import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth";
import { dealRoomAvailableTo } from "./flags";
import { dealRoomAdmissibility, type AdmissibilityResult } from "./admissibility";
import { countMaterialEventsSince, earnedMilestones, type ActivityEvent, type ActivityEventType } from "./activity";
import { bridgeModel, type BridgeModel, type BridgeParticipant } from "./bridge";
import { momentumFor, procedureProgress, type ProcedureProgress } from "./progress";
import { type Viewer, type RoomContext } from "./permissions";
import type { ProcedureStep } from "./procedure";
import type {
  BlockerCategory,
  BlockerState,
  EntitlementKind,
  EntitlementState,
  EvidenceState,
  EvidenceVisibility,
  ParticipantClass,
  ParticipantState,
  ProcedureState,
  RoomState,
  StepState,
  SubRoomState,
} from "./states";
import { roomIsReadOnly } from "./states";
import { onePerPerson } from "./participants";

/**
 * Every Deal Room read, in one place.
 *
 * ## The rule this module exists to keep
 *
 * Every query here uses `createClient()` - the caller's own session, with the
 * anon key - so Row Level Security applies to every row it returns. The
 * service-role client is used in exactly one place in the whole slice, the
 * invitation resolver, and for one reason: the person holding an invitation
 * link has no session yet, so there is no policy that could let them read it.
 *
 * That is also what makes acceptance criterion 14 true. AI context is assembled
 * from these functions, so a summary can only ever mention rows the requesting
 * participant could have read themselves. There is no privileged read to
 * accidentally hand a model.
 *
 * A consequence worth stating: a participant asking for a workspace they are
 * not in gets `null`, not an error. That is the policy returning zero rows, and
 * it is why `notFound()` is the correct response - an "access denied" page that
 * differed from a "no such room" page would confirm the room exists.
 */

export interface RoomAccess {
  room: {
    id: string;
    ref: string;
    title: string;
    purpose: string | null;
    completionCondition: string;
    marketFamily: "products" | "services" | "distribution";
    dealSnapshot: Record<string, unknown>;
    state: RoomState;
    listingId: string;
    initiatorProfileId: string;
    activatedAt: string | null;
    /* The role proposed for the counterparty when the room was opened. The
       invitation command reads it from the row, so this is display only. */
    intendedCounterpartyRole: string;
  };
  entitlement: {
    kind: EntitlementKind;
    state: EntitlementState;
    activatedAt: string | null;
    expiresAt: string | null;
  } | null;
  viewer: Viewer | null;
  context: RoomContext;
  readOnly: boolean;
}

export interface SubRoomRow {
  id: string;
  ref: string;
  purpose: string;
  kind: string;
  state: SubRoomState;
}

export interface ParticipantRow {
  id: string;
  profileId: string;
  subRoomId: string | null;
  name: string;
  organisation: string | null;
  declaredCapacity: string | null;
  participantClass: ParticipantClass;
  transactionRole: string;
  participationAuthority: string | null;
  state: ParticipantState;
  isRequiredApprover: boolean;
  isRoomAdministrator: boolean;
  admittedAt: string | null;
}

export interface EvidenceRow {
  id: string;
  subRoomId: string;
  stepId: string | null;
  title: string;
  providerLabel: string;
  provenance: string;
  visibility: EvidenceVisibility;
  state: EvidenceState;
  currentVersion: number;
  createdBy: string;
  createdAt: string;
}

export interface BlockerRow {
  id: string;
  subRoomId: string | null;
  stepId: string | null;
  title: string;
  description: string;
  category: BlockerCategory;
  ownerParticipantId: string | null;
  resolutionRequirement: string;
  state: BlockerState;
  resolutionNote: string | null;
  resolvedAt: string | null;
}

export interface ProcedureRow {
  id: string;
  version: number;
  state: ProcedureState;
  summary: string;
  completionCondition: string;
  proposedBy: string;
  steps: ProcedureStep[];
  approvals: { participantId: string; response: string; reason: string | null }[];
}

/** The gate every Deal Room route runs first. */
export async function dealRoomGate(): Promise<{ profileId: string; organisationId: string | null } | null> {
  const user = await getUser();
  if (!user) return null;

  const supabase = createClient();
  const { data } = await supabase.from("profiles").select("id, organization_id").eq("id", user.id).maybeSingle();

  const organisationId = (data?.organization_id as string | null) ?? null;
  if (!dealRoomAvailableTo(user.id, organisationId)) return null;
  return { profileId: user.id, organisationId };
}

/**
 * The rooms this member can see.
 *
 * No filter is applied for permission: the policy is the filter. A member with
 * no participation gets an empty list, which is the correct empty state rather
 * than an error.
 */
export async function listRooms(): Promise<{ id: string; ref: string; title: string; state: RoomState }[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("deal_rooms")
    .select("id, ref, title, state")
    .order("created_at", { ascending: false });
  return (data ?? []) as { id: string; ref: string; title: string; state: RoomState }[];
}

export async function loadRoom(roomId: string): Promise<RoomAccess | null> {
  const gate = await dealRoomGate();
  if (!gate) return null;

  const supabase = createClient();

  const { data: room } = await supabase
    .from("deal_rooms")
    .select(
      "id, ref, title, purpose, completion_condition, market_family, deal_snapshot, state, listing_id, initiator_profile_id, activated_at, sponsor_profile_id, intended_counterparty_role",
    )
    .eq("id", roomId)
    .maybeSingle();

  // Zero rows, not an error. The caller answers notFound().
  if (!room) return null;

  const { data: entitlement } = await supabase
    .from("deal_room_entitlements")
    .select("kind, state, activated_at, expires_at")
    .eq("room_id", roomId)
    .maybeSingle();

  const { data: mine } = await supabase
    .from("deal_room_participants")
    .select(
      "id, sub_room_id, participant_class, transaction_role, state, is_required_approver, is_room_administrator",
    )
    .eq("room_id", roomId)
    .eq("profile_id", gate.profileId)
    // A person may hold a master-level row and a sub-room row. The sub-room row
    // is the one that carries their working permissions.
    .order("sub_room_id", { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();

  const isAdministrator =
    room.initiator_profile_id === gate.profileId ||
    room.sponsor_profile_id === gate.profileId ||
    Boolean(mine?.is_room_administrator);

  const viewer: Viewer | null = mine
    ? {
        profileId: gate.profileId,
        participantId: mine.id as string,
        participantClass: mine.participant_class as ParticipantClass,
        participantState: mine.state as ParticipantState,
        subRoomId: (mine.sub_room_id as string | null) ?? null,
        isRequiredApprover: Boolean(mine.is_required_approver),
        isRoomAdministrator: isAdministrator,
        // Set per step by the surface that knows which step is in question.
        isReviewer: false,
      }
    : isAdministrator
      ? {
          profileId: gate.profileId,
          participantId: "",
          participantClass: "principal",
          participantState: "active",
          subRoomId: null,
          isRequiredApprover: false,
          isRoomAdministrator: true,
          isReviewer: false,
        }
      : null;

  const context: RoomContext = {
    roomState: room.state as RoomState,
    entitlementState: (entitlement?.state as EntitlementState) ?? "active",
  };

  return {
    room: {
      id: room.id as string,
      ref: room.ref as string,
      title: room.title as string,
      purpose: (room.purpose as string | null) ?? null,
      completionCondition: room.completion_condition as string,
      marketFamily: room.market_family as RoomAccess["room"]["marketFamily"],
      dealSnapshot: (room.deal_snapshot ?? {}) as Record<string, unknown>,
      state: room.state as RoomState,
      listingId: room.listing_id as string,
      initiatorProfileId: room.initiator_profile_id as string,
      activatedAt: (room.activated_at as string | null) ?? null,
      intendedCounterpartyRole: (room.intended_counterparty_role as string | null) ?? "",
    },
    entitlement: entitlement
      ? {
          kind: entitlement.kind as EntitlementKind,
          state: entitlement.state as EntitlementState,
          activatedAt: (entitlement.activated_at as string | null) ?? null,
          expiresAt: (entitlement.expires_at as string | null) ?? null,
        }
      : null,
    viewer,
    context,
    readOnly: roomIsReadOnly(room.state as RoomState),
  };
}

/**
 * The sub-rooms this member may know exist.
 *
 * Acceptance criterion 13 lives here and in the policy behind it. There is no
 * "all sub-rooms" query anywhere in the codebase to accidentally call, so every
 * count, list and navigation item derives from this filtered read.
 */
export async function listSubRooms(roomId: string): Promise<SubRoomRow[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("deal_room_sub_rooms")
    .select("id, ref, purpose, kind, state")
    .eq("room_id", roomId)
    .order("created_at", { ascending: true });
  return (data ?? []) as SubRoomRow[];
}

export async function loadSubRoom(roomId: string, subRoomId: string): Promise<SubRoomRow | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("deal_room_sub_rooms")
    .select("id, ref, purpose, kind, state")
    .eq("room_id", roomId)
    .eq("id", subRoomId)
    .maybeSingle();
  return (data as SubRoomRow | null) ?? null;
}

export async function listParticipants(roomId: string): Promise<ParticipantRow[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("deal_room_participants")
    .select(
      // `display_label`, not an embed on `profiles`.
      //
      // Two things were wrong here, and only one of them was a typo.
      //
      // `deal_room_participants` has two foreign keys to `profiles` -
      // `profile_id` and `invited_by` - so a bare `profiles(full_name)` was
      // ambiguous and PostgREST refused the WHOLE query, from the day it was
      // written. Every surface that names a participant showed a fallback.
      //
      // Naming the relationship fixed that and revealed the real one: `profiles`
      // is readable only to its owner, so the other party was always "A
      // participant". `20260731f` writes the name onto the participant row from
      // inside the command that proved the identity - the same thing
      // `deal_room_activity_events` does with `actor_label`, which is why the
      // activity feed named people correctly the whole time this could not.
      //
      // No join to `profiles` at all now, so the ambiguity cannot come back.
      "id, profile_id, sub_room_id, org_id, declared_capacity, display_label, participant_class, transaction_role, participation_authority, state, is_required_approver, is_room_administrator, admitted_at, organizations(name)",
    )
    .eq("room_id", roomId);

  return ((data ?? []) as Record<string, unknown>[]).map((row) => ({
    id: row.id as string,
    profileId: row.profile_id as string,
    subRoomId: (row.sub_room_id as string | null) ?? null,
    name: (row.display_label as string | null) ?? "A participant",
    organisation: ((row.organizations as { name?: string } | null)?.name as string) ?? null,
    declaredCapacity: (row.declared_capacity as string | null) ?? null,
    participantClass: row.participant_class as ParticipantClass,
    transactionRole: row.transaction_role as string,
    participationAuthority: (row.participation_authority as string | null) ?? null,
    state: row.state as ParticipantState,
    isRequiredApprover: Boolean(row.is_required_approver),
    isRoomAdministrator: Boolean(row.is_room_administrator),
    admittedAt: (row.admitted_at as string | null) ?? null,
  }));
}

export async function loadGoverningProcedure(roomId: string): Promise<ProcedureRow | null> {
  const supabase = createClient();

  const { data: procedure } = await supabase
    .from("deal_room_procedures")
    .select("id, version, state, summary, completion_condition, proposed_by")
    .eq("room_id", roomId)
    .in("state", ["approved", "proposed", "amendment_requested", "draft"])
    // Approved sorts before proposed sorts before draft, so the governing
    // version wins when both exist.
    .order("state", { ascending: true })
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!procedure) return null;

  const { data: steps } = await supabase
    .from("deal_room_procedure_steps")
    .select(
      "id, step_key, seq, stage_label, title, completion_condition, responsible_role, weight, mandatory, requires_evidence, required_reviewer_role, due_date, state",
    )
    .eq("procedure_id", procedure.id)
    .order("seq", { ascending: true });

  const { data: approvals } = await supabase
    .from("deal_room_procedure_approvals")
    .select("participant_id, response, reason")
    .eq("procedure_id", procedure.id);

  return {
    id: procedure.id as string,
    version: procedure.version as number,
    state: procedure.state as ProcedureState,
    summary: procedure.summary as string,
    completionCondition: procedure.completion_condition as string,
    proposedBy: procedure.proposed_by as string,
    steps: ((steps ?? []) as Record<string, unknown>[]).map((row) => ({
      key: row.step_key as string,
      seq: row.seq as number,
      stageLabel: row.stage_label as string,
      title: row.title as string,
      completionCondition: row.completion_condition as string,
      responsibleRole: row.responsible_role as string,
      weight: row.weight as number,
      mandatory: Boolean(row.mandatory),
      requiresEvidence: Boolean(row.requires_evidence),
      requiredReviewerRole: (row.required_reviewer_role as string | null) ?? null,
      state: row.state as StepState,
    })),
    approvals: ((approvals ?? []) as Record<string, unknown>[]).map((row) => ({
      participantId: row.participant_id as string,
      response: row.response as string,
      reason: (row.reason as string | null) ?? null,
    })),
  };
}

/** Step ids, so a surface can link a step to its database row. */
export async function stepIds(procedureId: string): Promise<Map<string, string>> {
  const supabase = createClient();
  const { data } = await supabase
    .from("deal_room_procedure_steps")
    .select("id, step_key")
    .eq("procedure_id", procedureId);
  return new Map(((data ?? []) as { id: string; step_key: string }[]).map((row) => [row.step_key, row.id]));
}

export async function listEvidence(subRoomId: string): Promise<EvidenceRow[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("deal_room_evidence")
    .select(
      "id, sub_room_id, step_id, title, provider_label, provenance, visibility, state, current_version, created_by, created_at",
    )
    .eq("sub_room_id", subRoomId)
    .order("created_at", { ascending: false });

  return ((data ?? []) as Record<string, unknown>[]).map((row) => ({
    id: row.id as string,
    subRoomId: row.sub_room_id as string,
    stepId: (row.step_id as string | null) ?? null,
    title: row.title as string,
    providerLabel: row.provider_label as string,
    provenance: row.provenance as string,
    visibility: row.visibility as EvidenceVisibility,
    state: row.state as EvidenceState,
    currentVersion: row.current_version as number,
    createdBy: row.created_by as string,
    createdAt: row.created_at as string,
  }));
}

export async function loadEvidence(evidenceId: string): Promise<{
  evidence: EvidenceRow;
  versions: { version: number; fileName: string; mimeType: string; sizeBytes: number; uploadedAt: string; storagePath: string }[];
  clarifications: { id: string; question: string; state: string; answer: string | null; raisedAt: string; answeredAt: string | null }[];
} | null> {
  const supabase = createClient();

  const { data: evidence } = await supabase
    .from("deal_room_evidence")
    .select(
      "id, sub_room_id, step_id, title, provider_label, provenance, visibility, state, current_version, created_by, created_at",
    )
    .eq("id", evidenceId)
    .maybeSingle();

  if (!evidence) return null;

  const { data: versions } = await supabase
    .from("deal_room_evidence_versions")
    .select("version, file_name, mime_type, size_bytes, uploaded_at, storage_path")
    .eq("evidence_id", evidenceId)
    .order("version", { ascending: false });

  const { data: clarifications } = await supabase
    .from("deal_room_clarifications")
    .select("id, question, state, answer, raised_at, answered_at")
    .eq("evidence_id", evidenceId)
    .order("raised_at", { ascending: true });

  return {
    evidence: {
      id: evidence.id as string,
      subRoomId: evidence.sub_room_id as string,
      stepId: (evidence.step_id as string | null) ?? null,
      title: evidence.title as string,
      providerLabel: evidence.provider_label as string,
      provenance: evidence.provenance as string,
      visibility: evidence.visibility as EvidenceVisibility,
      state: evidence.state as EvidenceState,
      currentVersion: evidence.current_version as number,
      createdBy: evidence.created_by as string,
      createdAt: evidence.created_at as string,
    },
    versions: ((versions ?? []) as Record<string, unknown>[]).map((row) => ({
      version: row.version as number,
      fileName: row.file_name as string,
      mimeType: row.mime_type as string,
      sizeBytes: row.size_bytes as number,
      uploadedAt: row.uploaded_at as string,
      storagePath: row.storage_path as string,
    })),
    clarifications: ((clarifications ?? []) as Record<string, unknown>[]).map((row) => ({
      id: row.id as string,
      question: row.question as string,
      state: row.state as string,
      answer: (row.answer as string | null) ?? null,
      raisedAt: row.raised_at as string,
      answeredAt: (row.answered_at as string | null) ?? null,
    })),
  };
}

export async function listBlockers(roomId: string): Promise<BlockerRow[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("deal_room_blockers")
    .select(
      "id, sub_room_id, step_id, title, description, category, owner_participant_id, resolution_requirement, state, resolution_note, resolved_at",
    )
    .eq("room_id", roomId)
    .order("created_at", { ascending: false });

  return ((data ?? []) as Record<string, unknown>[]).map((row) => ({
    id: row.id as string,
    subRoomId: (row.sub_room_id as string | null) ?? null,
    stepId: (row.step_id as string | null) ?? null,
    title: row.title as string,
    description: row.description as string,
    category: row.category as BlockerCategory,
    ownerParticipantId: (row.owner_participant_id as string | null) ?? null,
    resolutionRequirement: row.resolution_requirement as string,
    state: row.state as BlockerState,
    resolutionNote: (row.resolution_note as string | null) ?? null,
    resolvedAt: (row.resolved_at as string | null) ?? null,
  }));
}

export async function listActivity(roomId: string, limit = 100): Promise<ActivityEvent[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("deal_room_activity_events")
    .select("id, room_id, sub_room_id, event_type, actor_label, actor_org_label, summary, created_at")
    .eq("room_id", roomId)
    .order("created_at", { ascending: false })
    .limit(limit);

  return ((data ?? []) as Record<string, unknown>[]).map((row) => ({
    id: row.id as string,
    roomId: row.room_id as string,
    subRoomId: (row.sub_room_id as string | null) ?? null,
    eventType: row.event_type as ActivityEventType,
    actorLabel: row.actor_label as string,
    actorOrganisationLabel: (row.actor_org_label as string | null) ?? null,
    summary: row.summary as string,
    createdAt: row.created_at as string,
  }));
}

/**
 * Everything the command view needs, assembled once.
 *
 * The bridge model is built here rather than in the page so the permission
 * filtering and the presentation cannot drift: the participants handed to the
 * bridge are the ones this reader may see, because they came from
 * `listParticipants`, which the policy filtered.
 */
export interface RoomOverview {
  progress: ProcedureProgress;
  bridge: BridgeModel;
  milestones: Set<string>;
  openBlockers: BlockerRow[];
  procedure: ProcedureRow | null;
  activity: ActivityEvent[];
  participants: ParticipantRow[];
  subRooms: SubRoomRow[];
}

export async function loadOverview(access: RoomAccess): Promise<RoomOverview> {
  const [procedure, participants, subRooms, blockers, activity] = await Promise.all([
    loadGoverningProcedure(access.room.id),
    listParticipants(access.room.id),
    listSubRooms(access.room.id),
    listBlockers(access.room.id),
    listActivity(access.room.id, 50),
  ]);

  const progress = procedure
    ? procedureProgress(procedure.state, procedure.steps)
    : { value: null, earned: 0, denominator: 0, completedCount: 0, inProgressCount: 0, totalCount: 0 };

  const openBlockers = blockers.filter((blocker) => blocker.state !== "resolved" && blocker.state !== "waived");

  const nextStep = procedure?.steps.find(
    (step) => step.state === "ready" || step.state === "in_progress" || step.state === "clarification_required",
  );

  // One entry per PERSON. The initiator holds a master-level row and a workspace
  // row from the moment the room exists, and drawing both put them on the Bridge
  // twice, with the label reading "2 participants" for a room holding one.
  const bridgeParticipants: BridgeParticipant[] = onePerPerson(
    participants.filter((participant) => participant.state !== "removed" && participant.state !== "withdrawn"),
  )
    .map((participant) => ({
      role: participant.transactionRole,
      principal: participant.participantClass === "principal",
      state:
        participant.state === "admitted" || participant.state === "active"
          ? "joined"
          : participant.state === "terms_pending"
            ? "accepted"
            : "awaited",
      ownsNextAction: Boolean(nextStep && participant.transactionRole === nextStep.responsibleRole),
    }));

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const momentum = momentumFor({
    roomIsPaused: access.room.state === "paused",
    roomIsReadyToProceed: access.room.state === "ready_to_proceed" || access.room.state === "completed",
    openCriticalBlockers: openBlockers.filter((blocker) => blocker.category === "critical").length,
    stepsAwaitingReview: procedure?.steps.filter((step) => step.state === "review_required").length ?? 0,
    stepsAwaitingOtherParty: procedure?.steps.filter((step) => step.state === "ready").length ?? 0,
    materialEventsInLastSevenDays: countMaterialEventsSince(activity, weekAgo),
  });

  const bridge = bridgeModel({
    roomState: access.room.state,
    procedureApproved: procedure?.state === "approved" || procedure?.state === "completed",
    procedureProposed: Boolean(procedure),
    counterpartyAdmitted: participants.some(
      (participant) =>
        participant.participantClass === "principal" &&
        participant.profileId !== access.room.initiatorProfileId &&
        (participant.state === "admitted" || participant.state === "active"),
    ),
    // Not `participants.length > 1`: the initiator's own two rows made that true
    // on a room nobody had been invited to, and it stayed true whether or not an
    // invitation was ever sent, so it carried no information at all.
    //
    // `deal_room_invite` creates no participant row - it writes the invitation
    // and moves the sub-room from `draft` to `invitation_pending`. That state
    // change IS the fact, and it is already loaded.
    invitationSent: subRooms.some((subRoom) => subRoom.state !== "draft"),
    anyEvidenceSubmitted: activity.some((event) => event.eventType === "evidence_submitted"),
    completion: progress.value,
    momentum,
    openBlockers: openBlockers.map((blocker) => ({ title: blocker.title, category: blocker.category })),
    participants: bridgeParticipants,
    nextAction: nextStep ? { label: nextStep.title, owner: nextStep.responsibleRole } : null,
  });

  return {
    progress,
    bridge,
    milestones: earnedMilestones(activity) as Set<string>,
    openBlockers,
    procedure,
    activity,
    participants,
    subRooms,
  };
}

/* ------------------------------------------------------------------ *
 * ADR-0021 ruling 2: the admission verification gate
 * ------------------------------------------------------------------ *
 *
 * Two readers, one predicate. `lib/deal-room/admissibility.ts` decides; these
 * functions only fetch the stored facts it names and hand them over.
 *
 * Both are fail-closed by construction. Every field of `AdmissibilityFacts` is
 * required and `null` means "not readable", so a failed query, a missing row or
 * a policy returning zero rows produces `pending` on the affected criteria and
 * blocks. There is no path through either function that turns an absent value
 * into a pass.
 */

/**
 * The initiator's admissibility, before a room or a participant row exists.
 *
 * The role and the authority are the values `deal_room_propose` itself writes
 * (`20260731b`): `'Deal owner'` and `'Owner of the published Deal'`. They are
 * supplied here ONLY after this function has re-proved the same precondition the
 * command proves - that the caller owns this Deal and it is approved. If that is
 * not established, both are null and the criteria block. They are facts about a
 * proved relationship, not defaults.
 *
 * `relationship_to_the_business` comes from `listings.submitter_role`, which the
 * publication gate requires before a Deal can be approved, so on this path the
 * criterion rests on a real and separate stored fact.
 */
export async function initiatorAdmissibility(listingId: string): Promise<AdmissibilityResult> {
  const user = await getUser();
  const supabase = createClient();

  const { data: profile } = user
    ? await supabase
        .from("profiles")
        .select("verification_level, company, country")
        .eq("id", user.id)
        .maybeSingle()
    : { data: null };

  const { data: listing } = user
    ? await supabase
        .from("listings")
        .select("id, user_id, status, submitter_role")
        .eq("id", listingId)
        .maybeSingle()
    : { data: null };

  const row = (profile ?? {}) as { verification_level?: unknown; company?: string | null; country?: string | null };
  const deal = (listing ?? {}) as { user_id?: string | null; status?: string | null; submitter_role?: string | null };

  // The same precondition `deal_room_propose` proves. Only when it holds do the
  // role and authority the command will write count as established.
  const ownsApprovedDeal = Boolean(user) && deal.user_id === user!.id && deal.status === "approved";

  return dealRoomAdmissibility({
    verificationLevel: row.verification_level ?? null,
    emailConfirmedAt: (user?.email_confirmed_at as string | undefined) ?? null,
    organisationName: row.company ?? null,
    declaredCapacity: null,
    jurisdiction: row.country ?? null,
    relationshipToBusiness: ownsApprovedDeal ? (deal.submitter_role ?? null) : null,
    transactionRole: ownsApprovedDeal ? "Deal owner" : null,
    participationAuthority: ownsApprovedDeal ? "Owner of the published Deal" : null,
    // No prerequisite mechanism exists in the schema, so none can be
    // outstanding. Stated explicitly rather than omitted: the field is required
    // precisely so this is a decision somebody made.
    outstandingPrerequisites: [],
  });
}

/**
 * An invited participant's admissibility, from their own declaration.
 *
 * Read through the caller's own session, so a participant row that is not
 * theirs returns nothing and every criterion blocks.
 *
 * `relationship_to_the_business` has no field on this path. The admission form
 * collects the substance of it under two other labels - the professional
 * capacity, and the authority ("an office you hold, a mandate, an engagement") -
 * so the capacity is used, falling back to the authority for a member who named
 * an organisation instead of a capacity. Both are the member's own declaration,
 * which is what section 6 asks for; neither is independent of another criterion,
 * and `CRITERION_EVIDENCE` records that.
 */
export async function participantAdmissibility(participantId: string): Promise<AdmissibilityResult> {
  const user = await getUser();
  const supabase = createClient();

  const { data: participant } = user && participantId
    ? await supabase
        .from("deal_room_participants")
        .select("id, profile_id, org_id, declared_capacity, transaction_role, participation_authority")
        .eq("id", participantId)
        .maybeSingle()
    : { data: null };

  const part = (participant ?? {}) as {
    profile_id?: string | null;
    org_id?: string | null;
    declared_capacity?: string | null;
    transaction_role?: string | null;
    participation_authority?: string | null;
  };

  // Somebody else's admission is not readable and must not be evaluated.
  const mine = Boolean(user) && part.profile_id === user!.id;

  const { data: profile } = mine
    ? await supabase
        .from("profiles")
        .select("verification_level, company, country")
        .eq("id", user!.id)
        .maybeSingle()
    : { data: null };

  const { data: organisation } = mine && part.org_id
    ? await supabase.from("organizations").select("name, country").eq("id", part.org_id).maybeSingle()
    : { data: null };

  const row = (profile ?? {}) as { verification_level?: unknown; company?: string | null; country?: string | null };
  const org = (organisation ?? {}) as { name?: string | null; country?: string | null };

  if (!mine) {
    // Every fact null: nine pending criteria and a refusal that names them.
    return dealRoomAdmissibility({
      verificationLevel: null,
      emailConfirmedAt: null,
      organisationName: null,
      declaredCapacity: null,
      jurisdiction: null,
      relationshipToBusiness: null,
      transactionRole: null,
      participationAuthority: null,
      outstandingPrerequisites: null,
    });
  }

  return dealRoomAdmissibility({
    verificationLevel: row.verification_level ?? null,
    emailConfirmedAt: (user?.email_confirmed_at as string | undefined) ?? null,
    organisationName: org.name ?? row.company ?? null,
    declaredCapacity: part.declared_capacity ?? null,
    jurisdiction: org.country ?? row.country ?? null,
    relationshipToBusiness: part.declared_capacity ?? part.participation_authority ?? null,
    transactionRole: part.transaction_role ?? null,
    participationAuthority: part.participation_authority ?? null,
    outstandingPrerequisites: [],
  });
}
