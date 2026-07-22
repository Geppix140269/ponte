import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe, isStripeConfigured } from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Stripe webhook.
 *
 * The endpoint stays although the shop that used it is gone, because the URL
 * is registered in the Stripe dashboard and an endpoint that starts answering
 * 404 gets retried, alarmed on, and eventually disabled by Stripe. It
 * verifies the signature, logs the event, and acknowledges.
 *
 * Nothing is fulfilled from here any more. The report shop this endpoint used
 * to persist orders for was removed in July 2026 with zero orders ever taken.
 * When credits or retainers become purchasable, their fulfilment lands here,
 * behind the same signature check.
 */
export async function POST(req: NextRequest) {
  if (!isStripeConfigured() || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }

  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "missing_signature" }, { status: 400 });
  }

  const rawBody = await req.text();
  const stripe = getStripe();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET,
    );
  } catch (err) {
    console.error("Stripe webhook signature verification failed:", err);
    return NextResponse.json({ error: "invalid_signature" }, { status: 400 });
  }

  // A completed checkout with nothing listening is worth a loud log line, not
  // a silent acknowledgement: if this ever fires, someone has paid for
  // something no code fulfils.
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    console.error(
      `[ponte] checkout.session.completed received with no fulfilment wired: ${session.id}`,
    );
  } else {
    console.log(`[ponte] stripe event acknowledged: ${event.type}`);
  }

  return NextResponse.json({ received: true });
}
