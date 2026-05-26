"use server";

import { revalidatePath } from "next/cache";
import { getUser } from "@/lib/auth";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { uploadReport } from "@/lib/storage";
import { markDelivered } from "@/lib/delivery";
import { watermarkPdf, watermarkText } from "@/lib/watermark";
import { getStripe } from "@/lib/stripe";
import { formatPrice } from "@/lib/format";
import {
  sendSlotConfirmed,
  sendProductionStarted,
  sendOrderVoided,
} from "@/lib/email";

async function requireAdmin(): Promise<boolean> {
  const user = await getUser();
  if (!user) return false;
  const supabase = createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  return profile?.role === "admin";
}

// Admin-only: upload a finished report PDF and deliver it to the buyer.
export async function deliverItemAction(formData: FormData): Promise<void> {
  if (!(await requireAdmin())) return;

  const itemId = String(formData.get("itemId") || "");
  const orderId = String(formData.get("orderId") || "");
  const file = formData.get("file");
  if (!itemId || !orderId || !(file instanceof File) || file.size === 0) return;

  const adminSb = createAdminClient();
  const { data: order } = await adminSb
    .from("orders")
    .select("email, user_id")
    .eq("id", orderId)
    .maybeSingle();
  let buyer = order?.email ?? "Licensed user";
  if (order?.user_id) {
    const { data: prof } = await adminSb
      .from("profiles")
      .select("full_name")
      .eq("id", order.user_id)
      .maybeSingle();
    if (prof?.full_name) buyer = prof.full_name;
  }

  const text = watermarkText({
    buyer,
    orderId,
    date: new Date().toISOString().slice(0, 10),
  });

  let upload: File | Blob = file;
  try {
    const stamped = await watermarkPdf(await file.arrayBuffer(), text);
    upload = new Blob([stamped], { type: "application/pdf" });
  } catch (err) {
    console.error("[ponte] watermarking failed, uploading original:", err);
  }

  const path = `${orderId}/${itemId}.pdf`;
  const { error: uploadError } = await uploadReport(path, upload);
  if (uploadError) {
    console.error("[ponte] report upload failed:", uploadError);
    return;
  }

  await markDelivered(itemId, path);
  revalidatePath("/admin/orders");
}

/**
 * Confirm the delivery date for an authorized order. Sets
 * orders.confirmed_delivery_at, moves status_v2 from 'authorized' to
 * 'confirmed', emails the customer the confirmed date.
 */
export async function confirmDeliveryAction(formData: FormData): Promise<void> {
  if (!(await requireAdmin())) return;
  const orderId = String(formData.get("orderId") || "");
  const dateIso = String(formData.get("confirmedDelivery") || "");
  if (!orderId || !dateIso) return;

  const deliveryAt = new Date(dateIso);
  const adminSb = createAdminClient();
  await adminSb
    .from("orders")
    .update({
      confirmed_delivery_at: deliveryAt.toISOString(),
      status_v2: "confirmed",
    })
    .eq("id", orderId);

  // Email the customer (best effort, do not block on errors).
  const { data: order } = await adminSb
    .from("orders")
    .select("email, order_items(config_values)")
    .eq("id", orderId)
    .maybeSingle();
  if (order?.email) {
    type OrderItemRow = { config_values: Record<string, string> | null };
    const lines = ((order.order_items as OrderItemRow[]) ?? []).map((it) => {
      const cfg = Object.entries(it.config_values ?? {})
        .filter(([k]) => k !== "sku")
        .map(([k, v]) => `${k}: ${v}`)
        .join(", ");
      return `${it.config_values?.sku ?? "Item"}${cfg ? ` (${cfg})` : ""}`;
    });
    await sendSlotConfirmed(order.email, {
      orderId,
      deliveryAt,
      lines,
    });
  }

  revalidatePath("/admin/orders");
}

/**
 * Capture the previously authorized Stripe payment. Moves status_v2 to
 * 'captured'. Card is actually charged. Emails the customer.
 */
export async function capturePaymentAction(formData: FormData): Promise<void> {
  if (!(await requireAdmin())) return;
  const orderId = String(formData.get("orderId") || "");
  if (!orderId) return;

  const adminSb = createAdminClient();
  const { data: order } = await adminSb
    .from("orders")
    .select(
      "stripe_payment_intent_id, status_v2, capture_method, email, total_cents, currency, confirmed_delivery_at",
    )
    .eq("id", orderId)
    .maybeSingle();

  if (!order?.stripe_payment_intent_id) {
    console.warn("[ponte] capture: order has no payment_intent_id", orderId);
    return;
  }
  if (order.capture_method !== "manual") {
    console.warn("[ponte] capture: order is not manual capture", orderId);
    return;
  }
  if (order.status_v2 === "captured" || order.status_v2 === "delivered") {
    console.log("[ponte] capture: already captured", orderId);
    return;
  }

  try {
    const stripe = getStripe();
    await stripe.paymentIntents.capture(order.stripe_payment_intent_id);
  } catch (err) {
    console.error("[ponte] Stripe capture failed:", err);
    return;
  }

  await adminSb
    .from("orders")
    .update({ status_v2: "captured", status: "paid" })
    .eq("id", orderId);

  if (order.email) {
    await sendProductionStarted(order.email, {
      orderId,
      total: formatPrice(order.total_cents ?? 0, order.currency ?? "USD"),
      deliveryAt: order.confirmed_delivery_at ?? undefined,
    });
  }

  revalidatePath("/admin/orders");
}

/**
 * Void the previously authorized Stripe payment. Customer is never
 * charged. Moves status_v2 to 'voided'. Emails the customer.
 */
export async function voidAuthorizationAction(formData: FormData): Promise<void> {
  if (!(await requireAdmin())) return;
  const orderId = String(formData.get("orderId") || "");
  if (!orderId) return;

  const adminSb = createAdminClient();
  const { data: order } = await adminSb
    .from("orders")
    .select("stripe_payment_intent_id, status_v2, capture_method, email")
    .eq("id", orderId)
    .maybeSingle();

  if (!order?.stripe_payment_intent_id) return;
  if (order.capture_method !== "manual") {
    console.warn("[ponte] void: order is not manual capture", orderId);
    return;
  }
  if (order.status_v2 === "captured" || order.status_v2 === "delivered") {
    console.warn("[ponte] void: already captured, cannot void", orderId);
    return;
  }

  try {
    const stripe = getStripe();
    await stripe.paymentIntents.cancel(order.stripe_payment_intent_id);
  } catch (err) {
    console.error("[ponte] Stripe void failed:", err);
    return;
  }

  await adminSb
    .from("orders")
    .update({ status_v2: "voided", status: "failed" })
    .eq("id", orderId);

  if (order.email) {
    await sendOrderVoided(order.email, { orderId });
  }

  revalidatePath("/admin/orders");
}
