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
    "Profile creation", "Browse listings", "2 active listings", "2 active enquiries",
    "Basic search", "No direct contact exchange",
  ],
  starter: [
    "10 active listings", "5 active deals", "Document uploads",
    "Company verification request", "Deal room access", "1 ADAMftd check / month",
  ],
  pro: [
    "Unlimited listings", "Unlimited deals", "Advanced search", "Analytics",
    "Trade references", "Verified Trader badge", "10 ADAMftd checks / month",
  ],
  enterprise: [
    "Multi-user access", "Team management", "API access",
    "White-label support", "Enhanced verification allocation",
  ],
};

export const PLAN_ORDER: Plan[] = ["free", "starter", "pro", "enterprise"];
