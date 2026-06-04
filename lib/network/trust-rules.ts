// Pure trust-score math. Mirrors the SQL apply_trust_delta thresholds so the
// app and the database agree. No I/O.

import { TRUST_SCORE_RULES, type RiskCategory } from "@/lib/types/network";

export type TrustIncreaseReason = keyof typeof TRUST_SCORE_RULES.increase;
export type TrustDecreaseReason = keyof typeof TRUST_SCORE_RULES.decrease;
export type TrustReason = TrustIncreaseReason | TrustDecreaseReason | "blocked";

export function deltaForReason(reason: TrustReason): number {
  if (reason === "blocked") return 0; // handled as set-to-zero, not a delta
  if (Object.prototype.hasOwnProperty.call(TRUST_SCORE_RULES.increase, reason)) {
    return TRUST_SCORE_RULES.increase[reason as TrustIncreaseReason];
  }
  if (Object.prototype.hasOwnProperty.call(TRUST_SCORE_RULES.decrease, reason)) {
    return TRUST_SCORE_RULES.decrease[reason as TrustDecreaseReason];
  }
  return 0;
}

export function clampScore(n: number): number {
  return Math.max(TRUST_SCORE_RULES.min, Math.min(TRUST_SCORE_RULES.max, Math.round(n)));
}

export function applyDelta(current: number, reason: TrustReason): number {
  if (reason === "blocked") return TRUST_SCORE_RULES.blockedScore;
  return clampScore(current + deltaForReason(reason));
}

// Risk thresholds: blocked (0), high (1-39), medium (40-69), low (70-100).
export function riskFromScore(score: number, blocked = false): RiskCategory {
  if (blocked || score <= 0) return "blocked";
  if (score < 40) return "high";
  if (score < 70) return "medium";
  return "low";
}

// Recompute a score from first principles (reconciliation / backfill).
export interface TrustInputs {
  approvedVerifications: TrustIncreaseReason[]; // email_verified, phone_verified, company_verified, id_verified, trade_reference
  completedDeals: number;
  penalties: TrustDecreaseReason[];
  blocked?: boolean;
}

export function recomputeTrust(inputs: TrustInputs): number {
  if (inputs.blocked) return TRUST_SCORE_RULES.blockedScore;
  let s = TRUST_SCORE_RULES.initial;
  for (const v of inputs.approvedVerifications) {
    if (v === "completed_deal") continue; // counted via completedDeals
    s += TRUST_SCORE_RULES.increase[v] ?? 0;
  }
  s += (inputs.completedDeals || 0) * TRUST_SCORE_RULES.increase.completed_deal;
  for (const p of inputs.penalties) s += TRUST_SCORE_RULES.decrease[p] ?? 0;
  return clampScore(s);
}
