"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getUser } from "@/lib/auth";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { sendListingDecision } from "@/lib/email";
import { vetListing, isAiConfigured } from "@/lib/ai-vet";

/**
 * Admin decisions on a listing.
 *
 * Like the verification desk, every path out of here says what happened. A
 * refused click and a successful one used to look identical, which on a queue
 * screen means the reviewer cannot tell whether the member was emailed.
 */

const QUEUE = "/admin/listings";

function finish(result: string, detail?: string): never {
  const params = new URLSearchParams({ r: result });
  if (detail) params.set("m", detail.slice(0, 300));
  redirect(`${QUEUE}?${params.toString()}`);
}

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
  if (!(await requireAdmin())) finish("not_admin");

  const id = String(formData.get("id") || "");
  const decision = String(formData.get("decision") || "");
  const decisionNote = String(formData.get("decisionNote") || "").trim().slice(0, 1500);
  if (!id) finish("no_id");
  if (!["approved", "rejected", "closed"].includes(decision)) finish("no_decision", decision);

  const adminSb = createAdminClient();
  const { data: listing } = await adminSb
    .from("listings")
    .select("id, ref, product, user_id, status")
    .eq("id", id)
    .maybeSingle();
  if (!listing) finish("no_listing");

  const { error } = await adminSb
    .from("listings")
    .update({
      status: decision,
      decision_note: decisionNote || null,
      decided_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) {
    console.error("[ponte] listing decision failed:", error);
    finish("db_error", error.message);
  }

  // Email the member on approve/reject. Closing is bookkeeping, not news.
  let mail: "sent" | "no_address" | "send_failed" | null = null;
  if (decision === "approved" || decision === "rejected") {
    const { data: owner } = await adminSb.auth.admin.getUserById(listing.user_id);
    const email = owner?.user?.email;
    if (!email) {
      console.error(`[ponte] listing ${listing.ref} decided but the owner has no address`);
      mail = "no_address";
    } else {
      try {
        await sendListingDecision(email, {
          ref: listing.ref,
          product: listing.product,
          approved: decision === "approved",
          note: decisionNote || undefined,
        });
        mail = "sent";
      } catch (e) {
        console.error("[ponte] decision email failed:", e);
        mail = "send_failed";
      }
    }
  }

  revalidatePath(QUEUE);
  revalidatePath("/marketplace");
  finish(decision, mail && mail !== "sent" ? mail : undefined);
}

/**
 * Save the internal note without deciding anything.
 *
 * It has its own action because it now has its own form: the member-facing note
 * differs per decision, so approve and reject each own a box, and an internal
 * note that lived inside one of them would only be saved if that button was the
 * one pressed. Nothing here is emailed and no status moves.
 */
export async function saveListingNotesAction(formData: FormData): Promise<void> {
  if (!(await requireAdmin())) finish("not_admin");

  const id = String(formData.get("id") || "");
  const adminNotes = String(formData.get("adminNotes") || "").trim().slice(0, 2000);
  if (!id) finish("no_id");

  const adminSb = createAdminClient();
  const { error } = await adminSb
    .from("listings")
    .update({ admin_notes: adminNotes || null })
    .eq("id", id);
  if (error) {
    console.error("[ponte] listing note save failed:", error);
    finish("db_error", error.message);
  }

  revalidatePath(QUEUE);
  finish("note_saved");
}

/** Run (or re-run) the AI vetting co-pilot on one listing. */
export async function runAiVetAction(formData: FormData): Promise<void> {
  if (!(await requireAdmin())) finish("not_admin");
  if (!isAiConfigured()) finish("ai_off");
  const id = String(formData.get("id") || "");
  if (!id) finish("no_id");

  const adminSb = createAdminClient();
  const { data: l } = await adminSb.from("listings").select("*").eq("id", id).maybeSingle();
  if (!l) finish("no_listing");
  const [{ count: mediaCount }, { count: docCount }] = await Promise.all([
    adminSb.from("listing_media").select("*", { count: "exact", head: true }).eq("listing_id", id),
    adminSb.from("listing_documents").select("*", { count: "exact", head: true }).eq("listing_id", id),
  ]);
  const review = await vetListing({
    ref: l.ref, type: l.type, product: l.product, details: l.details,
    origin: l.origin, destination: l.destination, volume: l.volume,
    incoterm: l.incoterm, indicative_value_usd: l.indicative_value_usd,
    submitter_role: l.submitter_role, chain_depth: l.chain_depth,
    media_count: mediaCount ?? 0, doc_count: docCount ?? 0,
  });
  if (!review) {
    revalidatePath(QUEUE);
    finish("ai_failed");
  }
  await adminSb.from("listings").update({
    ai_review: review,
    ai_reviewed_at: new Date().toISOString(),
  }).eq("id", id);

  revalidatePath(QUEUE);
  finish("ai_done");
}
