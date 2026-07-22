import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { getStripe, isStripeConfigured } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/server";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { packById, CREDIT_PACKS } from "@/lib/credits/packs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://ponte.trade";

/**
 * Start a credit pack purchase.
 *
 * Members only, because credits are attached to an account. The price comes
 * from the server-side pack table and never from the request: a client that
 * can name its own amount can buy 150 credits for a dollar.
 *
 * A pending purchase row is written before Stripe is called, so a completed
 * payment always has somewhere to land even if the member closes the tab.
 */
export async function POST(req: NextRequest) {
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: "Payments are not configured." }, { status: 503 });
  }

  const user = await getUser();
  if (!user) {
    return NextResponse.json(
      { error: "Sign in to buy credits." },
      { status: 401 },
    );
  }

  const ip = getClientIp(req);
  if (!checkRateLimit(`credits:${user.id}:${ip}`, 20, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "Too many attempts." }, { status: 429 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const pack = packById(String(body.pack ?? ""));
  if (!pack) {
    return NextResponse.json(
      { error: "Unknown pack.", packs: CREDIT_PACKS.map((p) => p.id) },
      { status: 400 },
    );
  }

  const sb = createAdminClient();
  const stripe = getStripe();

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      // Sent to Stripe so the receipt reaches the member without asking them
      // to type an address they already gave us.
      customer_email: user.email ?? undefined,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: pack.amountCents,
            product_data: {
              name: `${pack.credits} Ponte credits`,
              description:
                "Credits pay for counterparty verification. Browsing, posting and connecting stay free.",
            },
          },
        },
      ],
      // Both sides of the fulfilment read these. The webhook trusts the
      // metadata over the line item, because the line item is display text.
      metadata: {
        user_id: user.id,
        pack: pack.id,
        credits: String(pack.credits),
      },
      success_url: `${APP_URL}/account?credits=added`,
      cancel_url: `${APP_URL}/pricing?credits=cancelled`,
    });

    const { error } = await sb.from("credit_purchases").insert({
      user_id: user.id,
      stripe_session_id: session.id,
      pack: pack.id,
      credits: pack.credits,
      amount_cents: pack.amountCents,
      currency: "usd",
      status: "pending",
    });
    if (error) {
      // The session exists at Stripe but we have nowhere to fulfil it. Say so
      // rather than sending the member to a payment that cannot be honoured.
      console.error("[ponte] credit_purchases insert failed:", error.message);
      return NextResponse.json(
        { error: "Could not start the purchase. Nothing has been charged." },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true, url: session.url });
  } catch (err) {
    console.error("[ponte] credit checkout failed:", err);
    return NextResponse.json(
      { error: "Could not start the purchase. Nothing has been charged." },
      { status: 502 },
    );
  }
}
