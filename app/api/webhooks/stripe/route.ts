import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe, isStripeConfigured } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Stripe webhook.
 *
 * Fulfils credit pack purchases. Until 2026-07-22 this verified the signature,
 * logged, and fulfilled nothing: the report shop it was built for was removed
 * in July having taken zero orders, and the endpoint stayed only because one
 * that starts answering 404 gets retried, alarmed on, and eventually disabled
 * by Stripe.
 *
 * It now has something to do.
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

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    try {
      await fulfilCredits(session);
    } catch (err) {
      // Answering non-2xx makes Stripe retry, which is what we want: a paid
      // session that did not grant its credits must be tried again, and the
      // unique stripe_session_id below makes the retry safe.
      console.error(`[ponte] credit fulfilment failed for ${session.id}:`, err);
      return NextResponse.json({ error: "fulfilment_failed" }, { status: 500 });
    }
  } else {
    console.log(`[ponte] stripe event acknowledged: ${event.type}`);
  }

  return NextResponse.json({ received: true });
}

/**
 * Turn a paid checkout into credits.
 *
 * Idempotent, because Stripe retries until it gets a 2xx and a member must
 * never be granted the same pack twice. The purchase row is the record of
 * what has already been done: once it reads 'fulfilled' this returns without
 * touching the ledger.
 */
async function fulfilCredits(session: Stripe.Checkout.Session): Promise<void> {
  if (session.payment_status !== "paid") {
    console.log(`[ponte] session ${session.id} is ${session.payment_status}, not fulfilling`);
    return;
  }

  const sb = createAdminClient();

  const { data: purchase, error: readErr } = await sb
    .from("credit_purchases")
    .select("id, user_id, credits, status")
    .eq("stripe_session_id", session.id)
    .maybeSingle();

  if (readErr) throw new Error(`purchase lookup failed: ${readErr.message}`);

  if (!purchase) {
    // A paid session with no purchase row is money taken with nothing to
    // attach it to. Loud, and not retried: retrying will not conjure the row.
    console.error(
      `[ponte] PAID session ${session.id} has no credit_purchases row. ` +
        `Grant manually: user ${session.metadata?.user_id}, ${session.metadata?.credits} credits.`,
    );
    return;
  }

  if (purchase.status === "fulfilled") {
    console.log(`[ponte] session ${session.id} already fulfilled, ignoring retry`);
    return;
  }

  if (!purchase.user_id) {
    throw new Error(`purchase ${purchase.id} has no user to credit`);
  }

  const { data: ledgerRow, error: grantErr } = await sb
    .from("credit_ledger")
    .insert({
      user_id: purchase.user_id,
      delta: purchase.credits,
      reason: "purchase",
      ref: session.id,
    })
    .select("id")
    .single();

  if (grantErr) throw new Error(`grant failed: ${grantErr.message}`);

  const { error: markErr } = await sb
    .from("credit_purchases")
    .update({
      status: "fulfilled",
      ledger_id: ledgerRow.id,
      fulfilled_at: new Date().toISOString(),
    })
    .eq("id", purchase.id);

  // The credits are already granted at this point. A failure to mark the row
  // would make a retry grant them again, so it has to fail loudly rather than
  // be swallowed.
  if (markErr) {
    throw new Error(
      `credits granted (ledger ${ledgerRow.id}) but purchase ${purchase.id} ` +
        `could not be marked fulfilled: ${markErr.message}`,
    );
  }

  console.log(
    `[ponte] granted ${purchase.credits} credits to ${purchase.user_id} for ${session.id}`,
  );
}
