// Trade-network subscription plans and Stripe price mapping.
//
// Prices follow the spec: Starter EUR 49, Pro EUR 149, Enterprise EUR 499 / month.
// The actual amounts live in Stripe Price objects; here we map plan + interval to
// the Stripe price ID via env vars, with a reverse lookup used by the webhook.

import type { Plan } from "@/lib/types/network";

export type BillingInterval = "month" | "year";

export interface PlanDef {
  id: Plan;
  name: string;
  monthlyPriceCents: number; // display only; Stripe is source of truth
  currency: "EUR";
  subscribable: boolean;     // free is not a Stripe subscription
  contactSales: boolean;     // enterprise is sales-assisted
}

export const PLANS: Record<Plan, PlanDef> = {
  free:       { id: "free",       name: "Free",       monthlyPriceCents: 0,     currency: "EUR", subscribable: false, contactSales: false },
  starter:    { id: "starter",    name: "Starter",    monthlyPriceCents: 4900,  currency: "EUR", subscribable: true,  contactSales: false },
  pro:        { id: "pro",        name: "Pro",        monthlyPriceCents: 14900, currency: "EUR", subscribable: true,  contactSales: false },
  enterprise: { id: "enterprise", name: "Enterprise", monthlyPriceCents: 49900, currency: "EUR", subscribable: true,  contactSales: true },
};

export const SUBSCRIBABLE_PLANS: Plan[] = ["starter", "pro", "enterprise"];

// Env var name holding the Stripe price ID for a plan + interval.
function envKey(plan: Plan, interval: BillingInterval): string {
  return `STRIPE_PRICE_${plan.toUpperCase()}_${interval.toUpperCase()}`;
}

// Resolve the Stripe price ID for a plan + interval. Throws if not configured.
export function priceIdFor(plan: Plan, interval: BillingInterval): string {
  const key = envKey(plan, interval);
  const id = process.env[key];
  if (!id) throw new Error(`Missing Stripe price env ${key} for ${plan}/${interval}`);
  return id;
}

// Reverse lookup: which plan + interval does this Stripe price ID belong to?
// Used by the webhook to map a subscription back to our plan enum.
export function planFromPriceId(priceId: string): { plan: Plan; interval: BillingInterval } | null {
  for (const plan of SUBSCRIBABLE_PLANS) {
    for (const interval of ["month", "year"] as BillingInterval[]) {
      if (process.env[envKey(plan, interval)] === priceId) return { plan, interval };
    }
  }
  return null;
}

export function isSubscribablePlan(plan: string): plan is Plan {
  return (SUBSCRIBABLE_PLANS as string[]).includes(plan);
}
