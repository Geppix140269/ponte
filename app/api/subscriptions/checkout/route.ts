import { NextRequest, NextResponse } from "next/server";
import { getStripe, isStripeConfigured } from "@/lib/stripe";
import { getUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";
import { priceIdFor, isSubscribablePlan, PLANS, type BillingInterval } from "@/lib/plans";
import { track } from "@/lib/analytics/track";
import { EVENT } from "@/lib/analytics/events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST { plan: "starter"|"pro"|"enterprise", interval?: "month"|"year" }
export async function POST(req: NextRequest) {
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }

  const user = await getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let plan: string;
  let interval: BillingInterval;
  try {
    const body = await req.json();
    plan = body.plan;
    interval = body.interval === "year" ? "year" : "month";
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  if (!isSubscribablePlan(plan)) {
    return NextResponse.json({ error: "invalid_plan" }, { status: 400 });
  }
  // Enterprise is sales-assisted; point the UI at contact sales instead.
  if (PLANS[plan].contactSales) {
    return NextResponse.json({ error: "contact_sales" }, { status: 409 });
  }

  let priceId: string;
  try {
    priceId = priceIdFor(plan, interval);
  } catch {
    return NextResponse.json({ error: "price_not_configured" }, { status: 503 });
  }

  await track(EVENT.subscribe_started, { plan, interval }, { profileId: user.id });
  const stripe = getStripe();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin;

  // Reuse an existing Stripe customer if we have one on the profile.
  let customerId: string | undefined;
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const sb = createAdminClient();
    const { data } = await sb.from("profiles").select("stripe_customer_id").eq("id", user.id).maybeSingle();
    customerId = data?.stripe_customer_id ?? undefined;
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      client_reference_id: user.id,
      subscription_data: { metadata: { profile_id: user.id, plan } },
      success_url: `${appUrl}/account?subscription=success`,
      cancel_url: `${appUrl}/pricing`,
      billing_address_collection: "required",
      ...(customerId ? { customer: customerId } : { customer_email: user.email ?? undefined }),
    });
    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("Stripe subscription checkout error:", err);
    return NextResponse.json({ error: "stripe_error" }, { status: 500 });
  }
}
