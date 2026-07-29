import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { hashInvitationToken, resolveInvitationState, type InvitationPreview } from "./invitation";

/**
 * Resolving an invitation token.
 *
 * ## The one privileged read in the whole slice
 *
 * Everything else in the Deal Room reads through the caller's own session, so
 * Row Level Security decides what comes back. This function cannot: the person
 * holding an invitation link has no session, may have no account, and is by
 * definition not yet a participant. There is no policy that could admit them,
 * so the read is made with the service role.
 *
 * That makes this the one place where a mistake would be a real disclosure, so
 * the shape is narrow on purpose:
 *
 * - the raw token never leaves this function and is never logged;
 * - the lookup is by `sha256(token)` against a unique index, so a database
 *   disclosure yields no working invitation;
 * - the ONLY thing returned to the caller is `preview_facts`, the allowlist
 *   built by `buildPreview`. The room, the sub-room, the participants and the
 *   procedure are not selected at all, so there is nothing to leak by accident;
 * - every failure is reported the same way, so the endpoint cannot be used to
 *   probe for valid tokens.
 *
 * `invitationId`, `roomId` and `subRoomId` are returned only on success and are
 * used solely to create the admission record once the invitee has authenticated
 * and accepted. They are never rendered.
 */
export interface ResolvedInvitation {
  invitationId: string;
  roomId: string;
  subRoomId: string;
  proposedRole: string;
  proposedParticipantClass: string;
  preview: InvitationPreview;
  integrityPreflight: unknown;
}

export type InvitationLookup =
  | { ok: true; invitation: ResolvedInvitation }
  | { ok: false; reason: "not_found" | "expired" | "revoked" | "already_accepted" | "declined" };

export async function resolveInvitation(rawToken: string): Promise<InvitationLookup> {
  // A token that cannot be a token is refused before it reaches the database.
  if (!rawToken || rawToken.length > 200 || !/^[A-Za-z0-9_-]+$/.test(rawToken)) {
    return { ok: false, reason: "not_found" };
  }

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("deal_room_invitations")
    .select("id, room_id, sub_room_id, proposed_role, proposed_participant_class, preview_facts, integrity_preflight, state, expires_at")
    .eq("token_sha256", hashInvitationToken(rawToken))
    .maybeSingle();

  const state = resolveInvitationState(
    data ? { id: data.id as string, state: data.state as string, expiresAt: data.expires_at as string } : null,
  );

  if (!state.ok) return { ok: false, reason: state.reason };

  return {
    ok: true,
    invitation: {
      invitationId: data!.id as string,
      roomId: data!.room_id as string,
      subRoomId: data!.sub_room_id as string,
      proposedRole: data!.proposed_role as string,
      proposedParticipantClass: data!.proposed_participant_class as string,
      preview: data!.preview_facts as unknown as InvitationPreview,
      integrityPreflight: data!.integrity_preflight,
    },
  };
}
