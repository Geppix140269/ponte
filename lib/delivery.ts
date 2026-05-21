import { createAdminClient } from "@/lib/supabase/server";
import { createSignedUrl, DOWNLOAD_TTL_SECONDS } from "@/lib/storage";
import { sendReportReady } from "@/lib/email";

// Mark an order item delivered: store the report path, generate a signed URL,
// reset the download counter, and email the buyer.
export async function markDelivered(
  orderItemId: string,
  reportPath: string,
): Promise<{ error: string | null }> {
  const sb = createAdminClient();
  const signed = await createSignedUrl(reportPath);
  const expiresAt = new Date(
    Date.now() + DOWNLOAD_TTL_SECONDS * 1000,
  ).toISOString();

  const { data: item, error } = await sb
    .from("order_items")
    .update({
      report_path: reportPath,
      delivery_status: "delivered",
      download_url: signed,
      download_expires_at: expiresAt,
      download_count: 0,
    })
    .eq("id", orderItemId)
    .select("order_id")
    .single();

  if (error || !item) return { error: error?.message ?? "update_failed" };

  // Mark the parent order delivered if all its items are.
  const { data: siblings } = await sb
    .from("order_items")
    .select("delivery_status")
    .eq("order_id", item.order_id);
  if ((siblings ?? []).every((s: any) => s.delivery_status === "delivered")) {
    await sb
      .from("orders")
      .update({ status: "delivered", delivered_at: new Date().toISOString() })
      .eq("id", item.order_id);
  }

  const { data: order } = await sb
    .from("orders")
    .select("email")
    .eq("id", item.order_id)
    .maybeSingle();
  if (order?.email && signed) {
    await sendReportReady(order.email, { downloadUrl: signed });
  }

  return { error: null };
}
