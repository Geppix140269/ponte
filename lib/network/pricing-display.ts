// Pure presentation helpers for the pricing UI.
import { PLANS } from "@/lib/plans";
import type { Plan } from "@/lib/types/network";

export function formatPlanPrice(plan: Plan): string {
  const p = PLANS[plan];
  if (p.monthlyPriceCents === 0) return "Free";
  const amount = new Intl.NumberFormat("en-US", { style: "currency", currency: "EUR", maximumFractionDigits: 0 })
    .format(p.monthlyPriceCents / 100);
  return `${amount}/mo`;
}

// Feature lists per plan (from the spec subscription tiers).
export const PLAN_FEATURES: Record<Plan, string[]> = {
  free: [
    "Identity verification", "3 verifications / mo", "Browse the marketplace", "Read-only deal rooms",
  ],
  starter: [
    "Business verification", "50 verifications / mo", "Post offers & requests", "Deal rooms · 5 active", "Document uploads",
  ],
  pro: [
    "Activity verification (Tier III)", "Unlimited verifications", "ADAMftd discovery (7B records)", "Deal rooms · unlimited", "Verified Trader badge",
  ],
  enterprise: [
    "Institutional verification (Tier IV)", "Bulk verification API", "SSO, audit log, SLA", "Market intelligence access",
  ],
};

export const PLAN_ORDER: Plan[] = ["free", "starter", "pro", "enterprise"];
