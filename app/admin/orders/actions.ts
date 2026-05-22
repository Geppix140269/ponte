"use server";

import { revalidatePath } from "next/cache";
import { getUser } from "@/lib/auth";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { uploadReport } from "@/lib/storage";
import { markDelivered } from "@/lib/delivery";
import { watermarkPdf, watermarkText } from "@/lib/watermark";

// Admin-only: upload a finished report PDF and deliver it to the buyer.
export async function deliverItemAction(formData: FormData): Promise<void> {
  const user = await getUser();
  if (!user) return;

  const supabase = createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role !== "admin") return;

  const itemId = String(formData.get("itemId") || "");
  const orderId = String(formData.get("orderId") || "");
  const file = formData.get("file");

  if (!itemId || !orderId || !(file instanceof File) || file.size === 0) return;

  // Resolve buyer name for the licence watermark.
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

  // Watermark every page; fall back to the original on any failure.
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
