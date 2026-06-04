// Pure analytics helpers for the admin dashboard. No I/O — the data layer feeds
// these arrays/counts; these shape them into metrics.
import { PLANS } from "@/lib/plans";
import type { Plan, RiskCategory, VerificationLevel } from "@/lib/types/network";

// Trust-score distribution by risk band (same thresholds as the engine).
export interface TrustDistribution { blocked: number; high: number; medium: number; low: number }
export function bucketTrustScores(scores: number[]): TrustDistribution {
  const d: TrustDistribution = { blocked: 0, high: 0, medium: 0, low: 0 };
  for (const s of scores) {
    if (s <= 0) d.blocked++;
    else if (s < 40) d.high++;
    else if (s < 70) d.medium++;
    else d.low++;
  }
  return d;
}

// Verification rate = share of accounts at company_verified or above.
export function verificationRate(levels: VerificationLevel[]): number {
  if (levels.length === 0) return 0;
  const verified = levels.filter((l) => l === "company_verified" || l === "fully_verified").length;
  return Number((verified / levels.length).toFixed(4));
}

// Count profiles per plan.
export function planDistribution(plans: Plan[]): Record<Plan, number> {
  const dist: Record<Plan, number> = { free: 0, starter: 0, pro: 0, enterprise: 0 };
  for (const p of plans) dist[p] = (dist[p] ?? 0) + 1;
  return dist;
}

// Monthly recurring revenue (cents) from active paid subscriptions.
export function planMrrCents(activePlanCounts: Partial<Record<Plan, number>>): number {
  let total = 0;
  for (const plan of ["starter", "pro", "enterprise"] as Plan[]) {
    total += (activePlanCounts[plan] ?? 0) * PLANS[plan].monthlyPriceCents;
  }
  return total;
}

// Signups grouped by YYYY-MM (UTC), for a simple growth series.
export function growthByMonth(createdAtIso: string[]): { month: string; count: number }[] {
  const map = new Map<string, number>();
  for (const iso of createdAtIso) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) continue;
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return Array.from(map.entries()).map(([month, count]) => ({ month, count })).sort((a, b) => a.month.localeCompare(b.month));
}

// Risk-category tally (when you already have categories rather than raw scores).
export function riskTally(cats: RiskCategory[]): Record<RiskCategory, number> {
  const t: Record<RiskCategory, number> = { low: 0, medium: 0, high: 0, blocked: 0 };
  for (const c of cats) t[c] = (t[c] ?? 0) + 1;
  return t;
}
