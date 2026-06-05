// REPLACES the existing app/api/webhooks/stripe/route.ts.
// Adds subscription handling alongside the existing one-time order flow.
import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe, isStripeConfigured } from "@/lib/stripe";
import { isSupabaseAdminConfigured, persistPaidOrder } from "@/lib/orders";
import { handleSubscriptionCheckout, syncSubscriptionFromStripe } from "@/lib/subscriptions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!isStripeConfigured() || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }

  const sig = req.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "missing_signature" }, { status: 400 });

  const rawBody = await req.text();
  const stripe = getStripe();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("Stripe webhook signature verification failed:", err);
    return NextResponse.json({ error: "invalid_signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode === "subscription") {
          // Trade-network plan purchase.
          await handleSubscriptionCheckout(session);
        } else if (isSupabaseAdminConfigured()) {
          // Existing report-store one-time order.
          await persistPaidOrder(session);
        } else {
          console.log("[ponte] checkout.session.completed (Supabase not configured):", session.id);
        }
        break;
      }

      // Keep the profile entitlement in step with the subscription lifecycle.
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await syncSubscriptionFromStripe(sub);
        break;
      }

      case "payment_intent.payment_failed": {
        const pi = event.data.object as Stripe.PaymentIntent;
        console.warn("[ponte] payment failed:", pi.id);
        break;
      }

      case "invoice.paid": {
        // A renewal succeeded; the subscription.updated event that follows
        // refreshes current_period_end, so nothing extra needed here.
        console.log("[ponte] invoice.paid");
        break;
      }

      default:
        break;
    }
  } catch (err) {
    console.error("Stripe webhook handler error:", err);
    return NextResponse.json({ error: "handler_error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
