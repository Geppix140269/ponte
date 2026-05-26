import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe, isStripeConfigured } from "@/lib/stripe";
import { getProductBySku } from "@/lib/catalogue";
import { effectivePriceCents } from "@/lib/format";
import { getUser } from "@/lib/auth";
import type { CartItem } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }

  let items: CartItem[];
  try {
    const body = await req.json();
    items = body.items;
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "empty_cart" }, { status: 400 });
  }

  const resolved = items
    .map((i) => ({ product: getProductBySku(i.sku), config: i.config ?? {} }))
    .filter((x) => x.product);

  if (resolved.length === 0) {
    return NextResponse.json({ error: "no_valid_items" }, { status: 400 });
  }

  // Stripe Checkout sessions can't mix one-time and recurring line items.
  const allSubscription = resolved.every((r) => r.product!.isSubscription);
  const anySubscription = resolved.some((r) => r.product!.isSubscription);
  if (anySubscription && !allSubscription) {
    return NextResponse.json({ error: "mixed_cart" }, { status: 400 });
  }

  // Manual capture decision.
  //
  // For one-time payment orders that include ANY non-instant SKU (24h, 48h,
  // 72h, custom — anything requiring human production), we authorize the
  // card now but capture only when production starts. This lets us void
  // the auth if we can't deliver, without ever charging the customer.
  //
  // Pure-instant payment orders (e.g. credit packs) and subscription orders
  // keep automatic capture.
  //
  // Stripe's hold window is typically 7 days; we must capture or void
  // within that window. See docs/CAPACITY-QUEUE-DESIGN.md for the broader
  // queue model that this is part of.
  const anyNonInstant = resolved.some(
    (r) => !r.product!.isSubscription && r.product!.deliveryType !== "instant",
  );
  const useManualCapture = !allSubscription && anyNonInstant;

  const stripe = getStripe();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin;
  const user = await getUser();

  const line_items: Stripe.Checkout.SessionCreateParams.LineItem[] =
    resolved.map(({ product, config }) => ({
      quantity: 1,
      price_data: {
        currency: (product!.currency || "USD").toLowerCase(),
        unit_amount: effectivePriceCents(product!, config),
        product_data: {
          name: product!.title,
          metadata: { sku: product!.sku },
        },
        ...(product!.isSubscription
          ? { recurring: { interval: "month" as const } }
          : {}),
      },
    }));

  // Store each item's configuration in session metadata for fulfilment.
  const metadata: Record<string, string> = {};
  resolved.forEach(({ product, config }, idx) => {
    metadata[`item_${idx}`] = JSON.stringify({
      sku: product!.sku,
      config,
    }).slice(0, 480);
  });

  try {
    const session = await stripe.checkout.sessions.create({
      mode: allSubscription ? "subscription" : "payment",
      line_items,
      automatic_tax: { enabled: true },
      billing_address_collection: "required",
      success_url: `${appUrl}/order-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/cart`,
      metadata,
      ...(useManualCapture
        ? {
            payment_intent_data: {
              capture_method: "manual",
              metadata: { capture_mode: "manual_review" },
            },
          }
        : {}),
      ...(user
        ? {
            client_reference_id: user.id,
            customer_email: user.email ?? undefined,
          }
        : {}),
    });
    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("Stripe checkout error:", err);
    return NextResponse.json({ error: "stripe_error" }, { status: 500 });
  }
}
