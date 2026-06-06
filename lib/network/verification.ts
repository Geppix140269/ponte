"use server";
import { track } from "@/lib/analytics/track";
import { EVENT } from "@/lib/analytics/events";
import { revalidatePath } from "next/cache";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth";
import { runCounterpartyCheck, currentPeriod, type CheckDeps, type CheckOutcome } from "@/lib/network/adamftd-check";
import type { Principal } from "@/lib/rbac";
import type { VerificationKind } from "@/lib/types/network";
import type { VerificationResult, CounterpartyQuery } from "@/lib/verification/types";

// Cache TTL: ADAMftd data refreshes monthly, so 45 days is safe and keeps a
// counterparty from ever being re-billed within a window.
const CACHE_TTL_DAYS = 45;

async function loadPrincipal(): Promise<Principal | null> {
  const user = await getUser();
  if (!user) return null;
  const sb = createClient();
  const { data } = await sb.from("profiles")
    .select("id, role, account_type, plan, plan_status, verified_trader")
    .eq("id", user.id).maybeSingle();
  return (data as Principal) ?? null;
}

// ---- Request a verification (creates a pending row; admin approves in Phase 7) ----
export async function requestVerification(
  kind: VerificationKind,
  documentPaths: string[] = [],
): Promise<{ ok?: true; error?: string }> {
  const user = await getUser();
  if (!user) return { error: "unauthorized" };
  const sb = createClient();
  const { error } = await sb.from("verifications").insert({
    profile_id: user.id,
    level: kind,
    status: "pending",
    document_paths: documentPaths.length ? documentPaths : null,
  }); // RLS: insert allowed only for own profile_id
  if (error) return { error: error.message };
  revalidatePath("/network/profile/edit");
  return { ok: true };
}

// ---- Supabase-backed deps for the ADAMftd orchestrator ----
function supabaseCheckDeps(): CheckDeps {
  const sb = createAdminClient();
  return {
    async getCachedCheck(key) {
      const { data } = await sb.from("adamftd_verification_checks")
        .select("id, result_json, expires_at")
        .eq("cache_key", key)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!data || !data.result_json) return null;
      if (data.expires_at && new Date(data.expires_at as string) < new Date()) return null;
      return { result: data.result_json as VerificationResult, checkId: data.id as string };
    },
    async getMonthlyUsage(profileId, period) {
      const { data } = await sb.from("adamftd_usage")
        .select("checks_used").eq("profile_id", profileId).eq("period", period).maybeSingle();
      return (data?.checks_used as number) ?? 0;
    },
    async saveCheck({ cacheKey, query, result, requesterId }) {
      const expires = new Date(Date.now() + CACHE_TTL_DAYS * 86_400_000).toISOString();
      const { data, error } = await sb.from("adamftd_verification_checks").insert({
        requester_id: requesterId,
        company_name: query.companyName,
        country: query.country ?? null,
        commodity: query.commodity ?? null,
        hs_code: query.hsCode ?? null,
        claimed_role: query.claimedRole ?? null,
        status: result.status,
        confidence_score: result.confidenceScore,
        result_summary: result.resultSummary,
        signals: result.signals,
        result_json: result,
        cache_key: cacheKey,
        source: result.source,
        expires_at: expires,
      }).select("id").single();
      if (error) throw new Error(error.message);
      return { checkId: data.id as string };
    },
    async incrementUsage(profileId, period) {
      await sb.rpc("increment_adamftd_usage", { p_profile: profileId, p_period: period });
    },
  };
}

// ---- Run a counterparty / company ADAMftd check (mock until ADAMFTD_LIVE) ----
export async function runCompanyAdamftdCheck(
  input: CounterpartyQuery,
): Promise<CheckOutcome | { error: string }> {
  const principal = await loadPrincipal();
  if (!principal) return { error: "unauthorized" };
  if (!input.companyName?.trim()) return { error: "company_name_required" };
  const outcome = await runCounterpartyCheck(principal, input, supabaseCheckDeps());
  await track(EVENT.verify_run, { status: "result" in outcome ? (outcome as { result?: { status?: string } }).result?.status : "blocked", fromCache: (outcome as { fromCache?: boolean }).fromCache ?? false }, { profileId: principal.id });
  revalidatePath("/network/profile/edit");
  return outcome;
}

// re-export for callers that want the current period label
export { currentPeriod };
