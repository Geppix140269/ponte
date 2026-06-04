import "server-only";
import { createAdminClient } from "@/lib/supabase/server";

export async function pendingVerifications() {
  const sb = createAdminClient();
  const { data } = await sb.from("verifications")
    .select("id, profile_id, level, created_at, document_paths, profile:profiles!verifications_profile_id_fkey(full_name, company)")
    .eq("status", "pending").order("created_at", { ascending: true }).limit(200);
  return data ?? [];
}

export async function openReports() {
  const sb = createAdminClient();
  const { data } = await sb.from("user_reports")
    .select("id, target_type, target_id, reason, details, status, created_at")
    .in("status", ["open", "investigating"]).order("created_at", { ascending: true }).limit(200);
  return data ?? [];
}

export async function openFraudFlags() {
  const sb = createAdminClient();
  const { data } = await sb.from("fraud_flags")
    .select("id, subject_type, subject_id, flag_type, severity, detail, status, created_at")
    .eq("status", "open").order("created_at", { ascending: true }).limit(200);
  return data ?? [];
}

export async function recentUsers() {
  const sb = createAdminClient();
  const { data } = await sb.from("profiles")
    .select("id, full_name, company, country, account_type, plan, plan_status, trust_score, risk_category, verification_level, verified_broker, created_at")
    .order("created_at", { ascending: false }).limit(200);
  return data ?? [];
}

export async function flaggedListings() {
  const sb = createAdminClient();
  const { data } = await sb.from("listings")
    .select("id, commodity, listing_type, owner_id, moderation_status, moderation_reasons, status, created_at")
    .in("moderation_status", ["pending", "flagged"]).order("created_at", { ascending: false }).limit(200);
  return data ?? [];
}

export async function adamftdRequests() {
  const sb = createAdminClient();
  const { data } = await sb.from("adamftd_verification_checks")
    .select("id, company_name, country, status, confidence_score, source, created_at")
    .order("created_at", { ascending: false }).limit(100);
  return data ?? [];
}
