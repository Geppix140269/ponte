"use server";

import { revalidatePath } from "next/cache";
import { getUser } from "@/lib/auth";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { sendListingDecision } from "@/lib/email";
import { vetListing, isAiConfigured } from "@/lib/ai-vet";

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

/**
 * Admin decision on a listing: approve, reject, or close.
 * Rejections carry a decision note shown to the member; approvals may too.
 */
export async function decideListingAction(formData: FormData): Promise<void> {
  if (!(await requireAdmin())) return;

  const id = String(formData.get("id") || "");
  const decision = String(formData.get("decision") || "");
  const decisionNote = String(formData.get("decisionNote") || "").trim().slice(0, 1500);
  const adminNotes = String(formData.get("adminNotes") || "").trim().slice(0, 2000);
  if (!id || !["approved", "rejected", "closed"].includes(decision)) return;

  const adminSb = createAdminClient();
  const { data: listing } = await adminSb
    .from("listings")
    .select("id, ref, product, user_id, status")
    .eq("id", id)
    .maybeSingle();
  if (!listing) return;

  const { error } = await adminSb
    .from("listings")
    .update({
      status: decision,
      decision_note: decisionNote || null,
      admin_notes: adminNotes || null,
      decided_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) {
    console.error("[ponte] listing decision failed:", error);
    return;
  }

  // Email the member on approve/reject (not on close).
  if (decision === "approved" || decision === "rejected") {
    const { data: owner } = await adminSb.auth.admin.getUserById(listing.user_id);
    const email = owner?.user?.email;
    if (email) {
      await sendListingDecision(email, {
        ref: listing.ref,
        product: listing.product,
        approved: decision === "approved",
        note: decisionNote || undefined,
      }).catch((e) => console.error("[ponte] decision email failed:", e));
    }
  }

  revalidatePath("/admin/listings");
  revalidatePath("/marketplace");
}


/** Run (or re-run) the AI vetting co-pilot on one listing. */
export async function runAiVetAction(formData: FormData): Promise<void> {
  if (!(await requireAdmin())) return;
  if (!isAiConfigured()) return;
  const id = String(formData.get("id") || "");
  if (!id) return;

  const adminSb = createAdminClient();
  const { data: l } = await adminSb.from("listings").select("*").eq("id", id).maybeSingle();
  if (!l) return;
  const [{ count: mediaCount }, { count: docCount }] = await Promise.all([
    adminSb.from("listing_media").select("*", { count: "exact", head: true }).eq("listing_id", id),
    adminSb.from("listing_documents").select("*", { count: "exact", head: true }).eq("listing_id", id),
  ]);
  const review = await vetListing({
    ref: l.ref, type: l.type, product: l.product, details: l.details,
    origin: l.origin, destination: l.destination, volume: l.volume,
    incoterm: l.incoterm, indicative_value_usd: l.indicative_value_usd,
    media_count: mediaCount ?? 0, doc_count: docCount ?? 0,
  });
  if (review) {
    await adminSb.from("listings").update({
      ai_review: review,
      ai_reviewed_at: new Date().toISOString(),
    }).eq("id", id);
  }
  revalidatePath("/admin/listings");
}
