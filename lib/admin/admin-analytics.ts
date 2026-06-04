import "server-only";
import { createAdminClient } from "@/lib/supabase/server";
import {
  bucketTrustScores, verificationRate, planDistribution, planMrrCents, growthByMonth,
} from "@/lib/network/analytics";
import type { Plan, VerificationLevel } from "@/lib/types/network";

async function count(table: string, build?: (q: any) => any): Promise<number> {
  const sb = createAdminClient();
  let q = sb.from(table).select("id", { count: "exact", head: true });
  if (build) q = build(q);
  const { count } = await q;
  return count ?? 0;
}

export interface AdminMetrics {
  users: number;
  activeListings: number;
  activeDeals: number;
  completedDeals: number;
  verificationRate: number;
  trust: ReturnType<typeof bucketTrustScores>;
  plans: Record<Plan, number>;
  mrrCents: number;
  growth: { month: string; count: number }[];
}

export async function getAdminMetrics(): Promise<AdminMetrics> {
  const sb = createAdminClient();

  const [users, activeListings, activeDeals, completedDeals] = await Promise.all([
    count("profiles"),
    count("listings", (q) => q.eq("status", "active").eq("moderation_status", "approved")),
    count("deals", (q) => q.not("stage", "in", "(closed,cancelled)")),
    count("deals", (q) => q.eq("stage", "closed")),
  ]);

  const { data: profs } = await sb.from("profiles").select("trust_score, verification_level, plan, created_at").limit(5000);
  const rows = profs ?? [];
  const scores = rows.map((r: { trust_score: number }) => r.trust_score ?? 40);
  const levels = rows.map((r: { verification_level: VerificationLevel }) => r.verification_level ?? "unverified");
  const plans = rows.map((r: { plan: Plan }) => r.plan ?? "free");
  const created = rows.map((r: { created_at: string }) => r.created_at).filter(Boolean);

  // Active paid subscriptions -> MRR.
  const { data: subs } = await sb.from("subscriptions").select("plan").in("status", ["active", "trialing"]);
  const activePlanCounts: Partial<Record<Plan, number>> = {};
  for (const s of subs ?? []) activePlanCounts[s.plan as Plan] = (activePlanCounts[s.plan as Plan] ?? 0) + 1;

  return {
    users, activeListings, activeDeals, completedDeals,
    verificationRate: verificationRate(levels),
    trust: bucketTrustScores(scores),
    plans: planDistribution(plans),
    mrrCents: planMrrCents(activePlanCounts),
    growth: growthByMonth(created),
  };
}
