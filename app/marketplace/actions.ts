"use server";

import { revalidatePath } from "next/cache";
import { getUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { sendListingReceived, sendBrokerageSubmission } from "@/lib/email";

/** Promote a member's own draft to submitted, then alert the desk. */
export async function submitDraftAction(formData: FormData): Promise<void> {
  const user = await getUser();
  if (!user) return;
  const id = String(formData.get("id") || "");
  if (!id) return;

  // RLS: members may only update their own drafts, and only to 'submitted'.
  const supabase = createClient();
  const { data: listing, error } = await supabase
    .from("listings")
    .update({ status: "submitted" })
    .eq("id", id)
    .eq("user_id", user.id)
    .eq("status", "draft")
    .select("ref, type, product, origin, volume, details")
    .maybeSingle();
  if (error || !listing) return;

  const memberEmail = user.email ?? "";
  await Promise.allSettled([
    memberEmail
      ? sendListingReceived(memberEmail, { ref: listing.ref, product: listing.product })
      : Promise.resolve(),
    sendBrokerageSubmission({
      type: listing.type as "offer" | "requirement",
      name: memberEmail || user.id,
      company: `Marketplace listing ${listing.ref}`,
      email: memberEmail || "unknown@ponte.trade",
      country: listing.origin || "-",
      product: listing.product,
      volume: listing.volume || undefined,
      details: `${listing.details}\n\n[draft submitted for vetting · review in /admin/listings]`,
    }),
  ]);

  revalidatePath("/marketplace");
}
