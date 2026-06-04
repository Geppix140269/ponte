// Role-based access control + subscription plan-limit gating.
//
// Pure functions, no I/O — fully unit-testable. Ownership rules are enforced in
// the database via RLS (Phase 1); this layer enforces ROLE capabilities and
// PLAN limits, which RLS cannot express.

import { PLAN_LIMITS, type Plan, type AccountType } from "@/lib/types/network";
import { SUBSCRIBABLE_PLANS } from "@/lib/plans";

// Minimal shape we need from a profile to make decisions.
export interface Principal {
  id: string;
  role: "customer" | "admin";
  account_type: AccountType | null;
  plan: Plan;
  plan_status?: "inactive" | "trialing" | "active" | "past_due" | "canceled";
  verified_broker?: boolean;
}

export interface LimitDecision {
  allowed: boolean;
  limit: number | "unlimited";
  remaining: number | "unlimited";
  reason?: string;
}

export function isAdmin(p: Principal): boolean {
  return p.role === "admin";
}

// A plan only confers its benefits when the subscription is actually live.
// Free needs no active subscription. Admins are unrestricted.
export function effectivePlan(p: Principal): Plan {
  if (p.plan === "free") return "free";
  const live = p.plan_status === "active" || p.plan_status === "trialing";
  return live ? p.plan : "free";
}

function limitOf(plan: Plan, key: "activeListings" | "activeDeals"): number | "unlimited" {
  return PLAN_LIMITS[plan][key];
}

function decide(limit: number | "unlimited", currentCount: number, noun: string): LimitDecision {
  if (limit === "unlimited") return { allowed: true, limit: "unlimited", remaining: "unlimited" };
  const remaining = Math.max(0, limit - currentCount);
  return {
    allowed: currentCount < limit,
    limit,
    remaining,
    reason: currentCount < limit ? undefined : `Plan limit reached: ${limit} active ${noun}. Upgrade to add more.`,
  };
}

// ---- Listings ----
export function canCreateListing(p: Principal, activeListingCount: number): LimitDecision {
  if (isAdmin(p)) return { allowed: true, limit: "unlimited", remaining: "unlimited" };
  return decide(limitOf(effectivePlan(p), "activeListings"), activeListingCount, "listings");
}

// Buyers post requests; sellers/brokers/traders post offers. Admin posts either.
export function canCreateListingType(p: Principal, type: "offer" | "request"): boolean {
  if (isAdmin(p)) return true;
  const at = p.account_type;
  if (!at) return false;
  if (type === "request") return at === "buyer" || at === "broker" || at === "trader" || at === "enterprise";
  return at === "seller" || at === "broker" || at === "trader" || at === "enterprise";
}

// ---- Deals ----
export function canOpenDeal(p: Principal, activeDealCount: number): LimitDecision {
  if (isAdmin(p)) return { allowed: true, limit: "unlimited", remaining: "unlimited" };
  return decide(limitOf(effectivePlan(p), "activeDeals"), activeDealCount, "deals");
}

// ---- Documents ----
export function canUploadDocuments(p: Principal): boolean {
  if (isAdmin(p)) return true;
  return PLAN_LIMITS[effectivePlan(p)].documentUploads;
}

// ---- Contact exchange (spec: free users can never exchange direct contact) ----
export function canExchangeContact(p: Principal): boolean {
  if (isAdmin(p)) return true;
  return effectivePlan(p) !== "free";
}

// ---- ADAMftd verification checks (monthly metered) ----
export function adamftdMonthlyLimit(p: Principal): number | "custom" {
  return PLAN_LIMITS[effectivePlan(p)].adamftdChecksPerMonth;
}

export function canRunAdamftdCheck(p: Principal, usedThisMonth: number): LimitDecision {
  if (isAdmin(p)) return { allowed: true, limit: "unlimited", remaining: "unlimited" };
  const limit = adamftdMonthlyLimit(p);
  if (limit === "custom") return { allowed: true, limit: "unlimited", remaining: "unlimited" };
  if (limit === 0)
    return { allowed: false, limit: 0, remaining: 0, reason: "ADAMftd verification is not included on the Free plan. Upgrade to Starter or above." };
  const remaining = Math.max(0, limit - usedThisMonth);
  return {
    allowed: usedThisMonth < limit,
    limit,
    remaining,
    reason: usedThisMonth < limit ? undefined : `Monthly ADAMftd limit reached (${limit}). Resets next month or upgrade your plan.`,
  };
}

// ---- Admin gate for back-office actions ----
export type AdminAction =
  | "approve_verification" | "reject_verification" | "suspend_user" | "ban_user"
  | "modify_trust_score" | "close_listing" | "review_report" | "manage_fraud_queue";

export function canPerformAdminAction(p: Principal, _action: AdminAction): boolean {
  return isAdmin(p);
}

// Convenience used by UI: is this plan one the user can subscribe to?
export function isUpgradeTarget(current: Plan, target: Plan): boolean {
  const order = ["free", ...SUBSCRIBABLE_PLANS] as Plan[];
  return order.indexOf(target) > order.indexOf(current);
}
