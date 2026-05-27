"use server";

import { revalidatePath } from "next/cache";
import { getUser } from "@/lib/auth";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { uploadReport } from "@/lib/storage";
import { markDelivered } from "@/lib/delivery";
import {
  watermarkPdf,
  watermarkText,
  prependCoverPage,
  formatWatermarkId,
  formatIssuedDate,
} from "@/lib/watermark";
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
  const reviewerInitials =
    String(formData.get("reviewerInitials") || "GF").toUpperCase().slice(0, 4);
  const licensedToOverride = String(formData.get("licensedTo") || "").trim();
  if (!itemId || !orderId || !(file instanceof File) || file.size === 0) return;

  const adminSb = createAdminClient();
  const { data: order } = await adminSb
    .from("orders")
    .select("email, user_id, created_at")
    .eq("id", orderId)
    .maybeSingle();
  let buyer = order?.email ?? "Licensed user";
  let companyFallback: string | null = null;
  if (order?.user_id) {
    const { data: prof } = await adminSb
      .from("profiles")
      .select("full_name, company")
      .eq("id", order.user_id)
      .maybeSingle();
    if (prof?.full_name) buyer = prof.full_name;
    if (prof?.company) companyFallback = prof.company;
  }

  // Best "Licensed to" value: explicit admin input > profile company >
  // profile name > email > generic.
  const licensedTo =
    licensedToOverride || companyFallback || buyer || "Licensed user";

  // Try to pull the item's product title for the cover page report title.
  const { data: itemRow } = await adminSb
    .from("order_items")
    .select("product_id, config_values")
    .eq("id", itemId)
    .maybeSingle();
  let reportTitle: string | undefined;
  if (itemRow?.product_id) {
    const { data: productRow } = await adminSb
      .from("products")
      .select("title")
      .eq("id", itemRow.product_id)
      .maybeSingle();
    reportTitle = productRow?.title ?? undefined;
  }

  // Watermark ID anchors to order creation time (stable across redeliveries).
  const orderCreated = order?.created_at
    ? new Date(order.created_at)
    : new Date();
  const issuedAt = new Date();
  const watermarkId = formatWatermarkId(orderId, orderCreated);
  const footerText = watermarkText({
    buyer: licensedTo,
    watermarkId,
    date: issuedAt.toISOString().slice(0, 10),
  });

  let upload: File | Blob = file;
  try {
    // 1. Prepend the branded cover page
    const withCover = await prependCoverPage(await file.arrayBuffer(), {
      licensedTo,
      reviewerInitials,
      reportTitle,
      issuedDate: formatIssuedDate(issuedAt),
      watermarkId,
    });
    // 2. Stamp the per-page footer across the cover + content pages
    const stamped = await watermarkPdf(withCover, footerText);
    upload = new Blob([stamped], { type: "application/pdf" });
  } catch (err) {
    console.error("[ponte] cover/watermark failed, uploading original:", err);
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
