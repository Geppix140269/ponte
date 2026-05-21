"use server";

import { revalidatePath } from "next/cache";
import { getUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { uploadReport } from "@/lib/storage";
import { markDelivered } from "@/lib/delivery";

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

  const path = `${orderId}/${itemId}.pdf`;
  const { error: uploadError } = await uploadReport(path, file);
  if (uploadError) {
    console.error("[ponte] report upload failed:", uploadError);
    return;
  }

  await markDelivered(itemId, path);
  revalidatePath("/admin/orders");
}
