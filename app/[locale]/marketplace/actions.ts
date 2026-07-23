"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getUser } from "@/lib/auth";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { checkPublicationGate } from "@/lib/listings/publication-gate";
import {
  sendListingReceived,
  sendBrokerageSubmission,
  sendConnectAccepted,
} from "@/lib/email";

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

/**
 * An owner reconfirms their own approved listing without desk re-review.
 *
 * Permitted only as a pure re-stamp (nothing is edited here) AND only when the
 * complete live publication gate still passes: the member-business verification
 * must still be current and passing, the required facts and desk-approved public
 * text still present, the validity still declared and not lapsed. If the gate
 * fails, the reconfirm is refused and the listing needs desk review instead. On
 * success the 90-day reconfirmation clock resets and it returns to the board.
 */
export async function reconfirmListingAction(formData: FormData): Promise<void> {
  const user = await getUser();
  if (!user) redirect("/login?next=/marketplace");
  const id = String(formData.get("id") || "");
  if (!id) redirect("/marketplace");

  const adminSb = createAdminClient();
  const { data: listing } = await adminSb
    .from("listings")
    .select(
      "id, user_id, status, type, product, quantity, unit, frequency, payment_terms, submitter_role, chain_depth, validity_type, valid_until, desk_version",
    )
    .eq("id", id)
    .maybeSingle();
  // Ownership and state: only the owner may reconfirm, and only an approved one.
  if (!listing || listing.user_id !== user.id || listing.status !== "approved") {
    redirect("/marketplace");
  }

  const { data: profile } = await adminSb
    .from("profiles")
    .select("business_verification_id, verification_level")
    .eq("id", user.id)
    .maybeSingle();
  let verification:
    | { purpose: string | null; status: string | null; sanctions_hits: unknown }
    | null = null;
  if (profile?.business_verification_id) {
    const { data: v } = await adminSb
      .from("verifications")
      .select("purpose, status, sanctions_hits")
      .eq("id", profile.business_verification_id)
      .maybeSingle();
    verification = v ?? null;
  }

  const gate = checkPublicationGate(listing as never, {
    verificationLevel: profile ? Number(profile.verification_level ?? 0) : null,
    business_verification_id: profile?.business_verification_id ?? null,
    verification: verification as never,
  });
  if (!gate.ok) redirect("/marketplace?rc=blocked");

  await adminSb
    .from("listings")
    .update({ reconfirmed_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id)
    .eq("status", "approved");

  revalidatePath("/marketplace");
  redirect("/marketplace?rc=ok");
}

/**
 * Listing owner accepts or declines a connection request. On accept both
 * sides receive each other's contact email. Free, always; the desk is
 * optional.
 */
export async function connectDecisionAction(formData: FormData): Promise<void> {
  const user = await getUser();
  if (!user) return;
  const id = String(formData.get("id") || "");
  const decision = String(formData.get("decision") || "");
  if (!id || !["accepted", "declined"].includes(decision)) return;

  // RLS: only the owner of the listing may decide.
  const supabase = createClient();
  const { data: conn, error } = await supabase
    .from("listing_connections")
    .update({ status: decision, decided_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "pending")
    .select("listing_id, requester_id")
    .maybeSingle();
  if (error || !conn) return;

  if (decision === "accepted") {
    const { data: listing } = await supabase
      .from("listings")
      .select("ref, product, user_id")
      .eq("id", conn.listing_id)
      .maybeSingle();
    if (!listing || listing.user_id !== user.id) return;

    const adminSb = createAdminClient();
    const { data: requester } = await adminSb.auth.admin.getUserById(conn.requester_id);
    const requesterEmail = requester?.user?.email;
    const ownerEmail = user.email;
    if (requesterEmail && ownerEmail) {
      await Promise.allSettled([
        sendConnectAccepted(ownerEmail, {
          ref: listing.ref,
          product: listing.product,
          otherEmail: requesterEmail,
        }),
        sendConnectAccepted(requesterEmail, {
          ref: listing.ref,
          product: listing.product,
          otherEmail: ownerEmail,
        }),
      ]);
    }
  }

  revalidatePath("/marketplace");
}
