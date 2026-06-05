"use server";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/server";
import { assertAdmin } from "@/lib/admin/guard";
import { recordTrustEvent } from "@/lib/network/trust-service";
import { blockEntity } from "@/lib/network/fraud-service";
import { getApprovedVerifications } from "@/lib/network/profile";
import { computeVerificationLevel, isVerifiedTrader } from "@/lib/network/verification-levels";
import type { VerificationKind, AccountType } from "@/lib/types/network";
import type { TrustReason } from "@/lib/network/trust-rules";

const KIND_TO_REASON: Record<VerificationKind, TrustReason> = {
  email: "email_verified",
  phone: "phone_verified",
  company: "company_verified",
  id: "id_verified",
  trade_reference: "trade_reference",
};

async function audit(adminId: string, action: string, targetType: string, targetId: string, metadata?: Record<string, unknown>) {
  const sb = createAdminClient();
  await sb.from("audit_logs").insert({ actor_id: adminId, action, target_type: targetType, target_id: targetId, metadata: metadata ?? null });
}

export async function approveVerification(verificationId: string): Promise<{ ok?: true; error?: string }> {
  let adminId: string;
  try { adminId = await assertAdmin(); } catch { return { error: "forbidden" }; }
  const sb = createAdminClient();
  const { data: v } = await sb.from("verifications").select("id, profile_id, level, status").eq("id", verificationId).maybeSingle();
  if (!v || !v.profile_id) return { error: "not_found" };

  await sb.from("verifications").update({ status: "approved", reviewer_id: adminId }).eq("id", verificationId);
  await recordTrustEvent(v.profile_id as string, KIND_TO_REASON[v.level as VerificationKind], adminId);

  // Recompute the verification level + verified-trader badge from all approvals.
  const approved = await getApprovedVerifications(v.profile_id as string);
  const level = computeVerificationLevel(approved as VerificationKind[]);
  const { data: prof } = await sb.from("profiles").select("account_type").eq("id", v.profile_id).maybeSingle();
  await sb.from("profiles").update({
    verification_level: level,
    verified_trader: isVerifiedTrader(level, (prof?.account_type as AccountType) ?? null),
  }).eq("id", v.profile_id);

  await audit(adminId, "approve_verification", "user", v.profile_id as string, { verificationId, level });
  revalidatePath("/admin/network/verifications");
  return { ok: true };
}

export async function rejectVerification(verificationId: string, notes?: string): Promise<{ ok?: true; error?: string }> {
  let adminId: string;
  try { adminId = await assertAdmin(); } catch { return { error: "forbidden" }; }
  const sb = createAdminClient();
  const { data: v } = await sb.from("verifications").select("id, profile_id").eq("id", verificationId).maybeSingle();
  if (!v || !v.profile_id) return { error: "not_found" };
  await sb.from("verifications").update({ status: "rejected", reviewer_id: adminId, review_notes: notes ?? null }).eq("id", verificationId);
  await recordTrustEvent(v.profile_id as string, "verification_rejected", adminId);
  await audit(adminId, "reject_verification", "user", v.profile_id as string, { verificationId });
  revalidatePath("/admin/network/verifications");
  return { ok: true };
}

export async function suspendUser(profileId: string): Promise<{ ok?: true; error?: string }> {
  let adminId: string;
  try { adminId = await assertAdmin(); } catch { return { error: "forbidden" }; }
  await recordTrustEvent(profileId, "suspension", adminId);
  await audit(adminId, "suspend_user", "user", profileId);
  revalidatePath("/admin/network/users");
  return { ok: true };
}

export async function banUser(profileId: string): Promise<{ ok?: true; error?: string }> {
  let adminId: string;
  try { adminId = await assertAdmin(); } catch { return { error: "forbidden" }; }
  await recordTrustEvent(profileId, "blocked", adminId); // score -> 0, risk blocked
  await blockEntity("user", profileId, "Banned by admin", adminId);
  await audit(adminId, "ban_user", "user", profileId);
  revalidatePath("/admin/network/users");
  return { ok: true };
}

export async function adjustTrust(profileId: string, delta: number, note?: string): Promise<{ ok?: true; error?: string }> {
  let adminId: string;
  try { adminId = await assertAdmin(); } catch { return { error: "forbidden" }; }
  const sb = createAdminClient();
  await sb.rpc("apply_trust_delta", { p_profile: profileId, p_delta: Math.round(delta), p_reason: "admin_adjustment", p_actor: adminId });
  await audit(adminId, "adjust_trust", "user", profileId, { delta, note: note ?? null });
  revalidatePath("/admin/network/users");
  return { ok: true };
}

export async function setListingModeration(listingId: string, status: "approved" | "rejected"): Promise<{ ok?: true; error?: string }> {
  let adminId: string;
  try { adminId = await assertAdmin(); } catch { return { error: "forbidden" }; }
  const sb = createAdminClient();
  await sb.from("listings").update({ moderation_status: status }).eq("id", listingId);
  await audit(adminId, "moderate_listing", "listing", listingId, { status });
  revalidatePath("/admin/network/listings");
  return { ok: true };
}

export async function closeListing(listingId: string): Promise<{ ok?: true; error?: string }> {
  let adminId: string;
  try { adminId = await assertAdmin(); } catch { return { error: "forbidden" }; }
  const sb = createAdminClient();
  await sb.from("listings").update({ status: "closed" }).eq("id", listingId);
  await audit(adminId, "close_listing", "listing", listingId);
  revalidatePath("/admin/network/listings");
  return { ok: true };
}

export async function resolveReport(reportId: string, applyPenalty: boolean): Promise<{ ok?: true; error?: string }> {
  let adminId: string;
  try { adminId = await assertAdmin(); } catch { return { error: "forbidden" }; }
  const sb = createAdminClient();
  const { data: r } = await sb.from("user_reports").select("id, target_type, target_id").eq("id", reportId).maybeSingle();
  if (!r) return { error: "not_found" };
  await sb.from("user_reports").update({ status: "resolved", resolved_by: adminId }).eq("id", reportId);
  if (applyPenalty && r.target_type === "user") {
    await recordTrustEvent(r.target_id as string, "user_report", adminId);
  }
  await audit(adminId, "resolve_report", r.target_type as string, r.target_id as string, { reportId, applyPenalty });
  revalidatePath("/admin/network/reports");
  return { ok: true };
}

export async function dismissReport(reportId: string): Promise<{ ok?: true; error?: string }> {
  let adminId: string;
  try { adminId = await assertAdmin(); } catch { return { error: "forbidden" }; }
  const sb = createAdminClient();
  await sb.from("user_reports").update({ status: "dismissed", resolved_by: adminId }).eq("id", reportId);
  await audit(adminId, "dismiss_report", "report", reportId);
  revalidatePath("/admin/network/reports");
  return { ok: true };
}

export async function reviewFraudFlag(flagId: string, status: "reviewed" | "cleared"): Promise<{ ok?: true; error?: string }> {
  let adminId: string;
  try { adminId = await assertAdmin(); } catch { return { error: "forbidden" }; }
  const sb = createAdminClient();
  await sb.from("fraud_flags").update({ status }).eq("id", flagId);
  await audit(adminId, "review_fraud_flag", "fraud_flag", flagId, { status });
  revalidatePath("/admin/network/fraud");
  return { ok: true };
}
