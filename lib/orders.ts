import type Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/server";
import { getProductBySku } from "@/lib/catalogue";
import { formatPrice } from "@/lib/format";
import {
  sendOrderConfirmation,
  sendProcessing,
  sendAdminAlert,
} from "@/lib/email";
import {
  computeCaptureDeadline,
  deriveCapacityKind,
  nextAvailableSlot,
} from "@/lib/capacity";

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

/**
 * Detect whether this checkout session was authorized only (manual capture)
 * or already charged (automatic capture).
 *
 * For payment-mode sessions, payment_status === "paid" means the funds
 * have been captured. With manual capture, payment_status is typically
 * "no_payment_required" or null and the payment_intent.status is
 * "requires_capture".
 */
function detectCaptureMethod(
  session: Stripe.Checkout.Session,
): "manual" | "automatic" {
  // Subscriptions are always automatic capture.
  if (session.mode === "subscription") return "automatic";

  // If Stripe says it's paid already, it was auto-captured.
  if (session.payment_status === "paid") return "automatic";

  // Otherwise, treat as manual. The session is created with
  // payment_intent_data.capture_method='manual' upstream when any
  // non-instant SKU is in the cart.
  return "manual";
}

// Persist a completed Stripe Checkout session as an order + order_items.
// Allocates a slot_date per non-instant item using the capacity queue.
// Sets status_v2 based on whether payment was captured or only authorized.
export async function persistPaidOrder(
  session: Stripe.Checkout.Session,
): Promise<void> {
  const sb = createAdminClient();
  const items = parseItemsFromMetadata(session.metadata);

  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : (session.payment_intent?.id ?? null);

  const captureMethod = detectCaptureMethod(session);
  const statusV2 = captureMethod === "manual" ? "authorized" : "captured";
  const createdAt = new Date();
  const captureDeadline =
    captureMethod === "manual" ? computeCaptureDeadline(createdAt) : null;

  const { data: order, error: orderError } = await sb
    .from("orders")
    .insert({
      user_id: session.client_reference_id ?? null,
      email: session.customer_details?.email ?? session.customer_email ?? null,
      stripe_session_id: session.id,
      stripe_payment_intent_id: paymentIntentId,
      status: captureMethod === "manual" ? "pending" : "paid",
      status_v2: statusV2,
      capture_method: captureMethod,
      capture_deadline_at: captureDeadline?.toISOString() ?? null,
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

    // Allocate a slot for non-instant items. Instant items get null
    // slot_date (they don't consume capacity).
    let slotDate: string | null = null;
    if (product) {
      const kind = deriveCapacityKind(product);
      if (kind === "standard" || kind === "custom") {
        try {
          const slot = await nextAvailableSlot(product);
          slotDate = slot.productionDay;
        } catch (err) {
          console.warn("[ponte] slot allocation failed for", item.sku, err);
        }
      }
    }

    await sb.from("order_items").insert({
      order_id: order.id,
      product_id: dbProduct?.id ?? null,
      quantity: 1,
      unit_price_cents: product?.priceCents ?? 0,
      config_values: { sku: item.sku, ...item.config },
      delivery_status: deliveryStatus,
      slot_date: slotDate,
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
      manualCapture: captureMethod === "manual",
    });
    if (hasProcessing) {
      await sendProcessing(buyerEmail, { sla: "24-48 hours" });
    }
  }
}
