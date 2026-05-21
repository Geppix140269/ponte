import type Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/server";
import { getProductBySku } from "@/lib/catalogue";
import { formatPrice } from "@/lib/format";
import {
  sendOrderConfirmation,
  sendProcessing,
  sendAdminAlert,
} from "@/lib/email";

export function isSupabaseAdminConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}

interface ParsedItem {
  sku: string;
  config: Record<string, string>;
}

function parseItemsFromMetadata(
  metadata: Stripe.Metadata | null,
): ParsedItem[] {
  if (!metadata) return [];
  const items: ParsedItem[] = [];
  for (const [key, value] of Object.entries(metadata)) {
    if (!key.startsWith("item_")) continue;
    try {
      const parsed = JSON.parse(value);
      if (parsed?.sku) items.push({ sku: parsed.sku, config: parsed.config ?? {} });
    } catch {
      // ignore malformed metadata entries
    }
  }
  return items;
}

// Persist a paid Stripe Checkout session as an order + order_items.
// Delivery (signed URLs / emails) is wired in the Resend + storage phase;
// for now SLA items are marked 'processing' and instant items 'ready'.
export async function persistPaidOrder(
  session: Stripe.Checkout.Session,
): Promise<void> {
  const sb = createAdminClient();
  const items = parseItemsFromMetadata(session.metadata);

  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : (session.payment_intent?.id ?? null);

  const { data: order, error: orderError } = await sb
    .from("orders")
    .insert({
      user_id: session.client_reference_id ?? null,
      stripe_session_id: session.id,
      stripe_payment_intent_id: paymentIntentId,
      status: "paid",
      total_cents: session.amount_total ?? 0,
      currency: (session.currency ?? "eur").toUpperCase(),
    })
    .select("id")
    .single();

  if (orderError || !order) {
    console.error("[ponte] failed to insert order:", orderError);
    return;
  }

  const buyerEmail =
    session.customer_details?.email ?? session.customer_email ?? null;
  const lines: string[] = [];
  let hasProcessing = false;

  for (const item of items) {
    const product = getProductBySku(item.sku);
    const { data: dbProduct } = await sb
      .from("products")
      .select("id")
      .eq("sku", item.sku)
      .maybeSingle();

    const deliveryStatus =
      product?.deliveryType === "instant" ? "ready" : "processing";

    await sb.from("order_items").insert({
      order_id: order.id,
      product_id: dbProduct?.id ?? null,
      quantity: 1,
      unit_price_cents: product?.priceCents ?? 0,
      config_values: { sku: item.sku, ...item.config },
      delivery_status: deliveryStatus,
    });

    const cfg = Object.entries(item.config)
      .map(([k, v]) => `${k}: ${v}`)
      .join(", ");
    lines.push(
      `${product?.title ?? item.sku}${cfg ? ` (${cfg})` : ""}`,
    );

    if (deliveryStatus === "processing") {
      hasProcessing = true;
      await sendAdminAlert({
        orderId: order.id,
        sku: item.sku,
        config: item.config,
      });
    }
  }

  if (buyerEmail) {
    await sendOrderConfirmation(buyerEmail, {
      orderId: order.id,
      lines,
      total: formatPrice(
        session.amount_total ?? 0,
        (session.currency ?? "eur").toUpperCase(),
      ),
    });
    if (hasProcessing) {
      await sendProcessing(buyerEmail, { sla: "24–48 hours" });
    }
  }
}
