// Keeps our profiles.plan / subscriptions table in step with Stripe.
// Called from the Stripe webhook (service-role context, bypasses RLS).

import type Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";
import { planFromPriceId, type BillingInterval } from "@/lib/plans";
import type { Plan } from "@/lib/types/network";

export function isSupabaseAdminConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}

type PlanStatus = "inactive" | "trialing" | "active" | "past_due" | "canceled";

// Map a Stripe subscription status to our smaller enum.
function mapStatus(s: Stripe.Subscription.Status): PlanStatus {
  switch (s) {
    case "active": return "active";
    case "trialing": return "trialing";
    case "past_due":
    case "unpaid": return "past_due";
    case "canceled":
    case "incomplete_expired": return "canceled";
    default: return "inactive"; // incomplete, paused
  }
}

// Resolve the profile id for a subscription: prefer metadata, fall back to the
// customer's stored stripe_customer_id.
async function resolveProfileId(
  sb: ReturnType<typeof createAdminClient>,
  sub: Stripe.Subscription,
): Promise<string | null> {
  const fromMeta = (sub.metadata?.profile_id as string | undefined) ?? null;
  if (fromMeta) return fromMeta;
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  const { data } = await sb.from("profiles").select("id").eq("stripe_customer_id", customerId).maybeSingle();
  return data?.id ?? null;
}

export async function syncSubscriptionFromStripe(sub: Stripe.Subscription): Promise<void> {
  if (!isSupabaseAdminConfigured()) {
    console.log("[ponte] subscription sync skipped (Supabase admin not configured):", sub.id);
    return;
  }
  const sb = createAdminClient();
  const profileId = await resolveProfileId(sb, sub);
  if (!profileId) {
    console.warn("[ponte] could not resolve profile for subscription", sub.id);
    return;
  }

  const priceId = sub.items.data[0]?.price?.id;
  const mapped = priceId ? planFromPriceId(priceId) : null;
  const plan: Plan = mapped?.plan ?? "free";
  const interval: BillingInterval | null = mapped?.interval ?? null;
  const status = mapStatus(sub.status);
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  const periodEnd = sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null;
  const live = status === "active" || status === "trialing";

  // Upsert the subscriptions row (one per stripe_subscription_id).
  await sb.from("subscriptions").upsert(
    {
      profile_id: profileId,
      stripe_customer_id: customerId,
      stripe_subscription_id: sub.id,
      plan: plan === "free" ? "starter" : plan, // table only allows paid plans; guard
      status,
      billing_interval: interval,
      current_period_end: periodEnd,
      cancel_at_period_end: sub.cancel_at_period_end ?? false,
    },
    { onConflict: "stripe_subscription_id" },
  );

  // Reflect the entitlement on the profile. When a subscription ends, drop to free.
  await sb.from("profiles").update({
    plan: live ? plan : "free",
    plan_status: status,
    stripe_subscription_id: sub.id,
    stripe_customer_id: customerId,
    plan_renews_at: periodEnd,
    // Pro plan confers the verified-broker badge eligibility; actual badge still
    // requires COMPANY_VERIFIED (set by the verification flow in Phase 3).
  }).eq("id", profileId);
}

// On checkout.session.completed (mode=subscription), fetch the subscription and sync.
export async function handleSubscriptionCheckout(session: Stripe.Checkout.Session): Promise<void> {
  if (session.mode !== "subscription" || !session.subscription) return;
  const stripe = getStripe();
  const subId = typeof session.subscription === "string" ? session.subscription : session.subscription.id;
  const sub = await stripe.subscriptions.retrieve(subId);
  // Stamp the profile id onto the subscription metadata for future events.
  const profileId = session.client_reference_id;
  if (profileId && !sub.metadata?.profile_id) {
    await stripe.subscriptions.update(subId, { metadata: { ...sub.metadata, profile_id: profileId } });
    sub.metadata = { ...sub.metadata, profile_id: profileId };
  }
  await syncSubscriptionFromStripe(sub);
}
