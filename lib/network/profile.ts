// Server-side profile data helpers for the trade network.
import "server-only";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth";
import type { NetworkProfile } from "@/lib/types/network";

// Columns safe to expose on a PUBLIC profile (no billing / PII-ish fields).
const PUBLIC_COLUMNS =
  "id, full_name, company, country, account_type, verified_trader, trust_score, " +
  "verification_level, verification_tier, risk_category, completed_deals, title, languages, " +
  "commodities, regions_served, years_active, typical_deal_size, bio, organization_id";

export async function getOwnProfile(): Promise<NetworkProfile | null> {
  const user = await getUser();
  if (!user) return null;
  const sb = createClient();
  const { data } = await sb.from("profiles").select("*").eq("id", user.id).maybeSingle();
  return (data as NetworkProfile) ?? null;
}

// Public profile: read server-side with the service role but only the safe
// column whitelist, since the profiles RLS policy is own-or-admin. (A dedicated
// public view is a clean future refinement.)
export async function getPublicProfile(id: string): Promise<Partial<NetworkProfile> | null> {
  const sb = createAdminClient();
  const { data } = await sb.from("profiles").select(PUBLIC_COLUMNS).eq("id", id).maybeSingle();
  return (data as Partial<NetworkProfile>) ?? null;
}

// Approved verification kinds for a profile (drives the level badge).
export async function getApprovedVerifications(profileId: string): Promise<string[]> {
  const sb = createAdminClient();
  const { data } = await sb.from("verifications")
    .select("level").eq("profile_id", profileId).eq("status", "approved");
  return (data ?? []).map((r: { level: string }) => r.level);
}
