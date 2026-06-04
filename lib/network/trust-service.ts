// Server-side trust engine. Every trust change in the app calls recordTrustEvent,
// which runs the atomic apply_trust_delta function (clamps, updates risk, writes
// the ledger + audit). Other phases call this: verification approval (Phase 7),
// deal completion (Phase 6), admin actions (Phase 7).
import "server-only";
import { createAdminClient } from "@/lib/supabase/server";
import { deltaForReason, type TrustReason } from "@/lib/network/trust-rules";

export async function recordTrustEvent(
  profileId: string,
  reason: TrustReason,
  actorId?: string,
): Promise<{ newScore: number | null; error?: string }> {
  const sb = createAdminClient();
  const { data, error } = await sb.rpc("apply_trust_delta", {
    p_profile: profileId,
    p_delta: deltaForReason(reason),
    p_reason: reason,
    p_actor: actorId ?? null,
  });
  if (error) return { newScore: null, error: error.message };
  return { newScore: (data as number) ?? null };
}

// Convenience wrappers for the common events.
export const onEmailVerified = (id: string) => recordTrustEvent(id, "email_verified");
export const onPhoneVerified = (id: string) => recordTrustEvent(id, "phone_verified");
export const onCompanyVerified = (id: string, actor?: string) => recordTrustEvent(id, "company_verified", actor);
export const onIdVerified = (id: string, actor?: string) => recordTrustEvent(id, "id_verified", actor);
export const onTradeReference = (id: string, actor?: string) => recordTrustEvent(id, "trade_reference", actor);
export const onCompletedDeal = (id: string) => recordTrustEvent(id, "completed_deal");
export const onSuspended = (id: string, actor?: string) => recordTrustEvent(id, "suspension", actor);
export const onBlocked = (id: string, actor?: string) => recordTrustEvent(id, "blocked", actor);
