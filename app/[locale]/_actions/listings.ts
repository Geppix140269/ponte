"use server";

// Member actions on a member's own listing records.
//
// These lived at `app/[locale]/marketplace/actions.ts` and were named after the
// page that happened to render them. That page is retired (cutover PR 5) and
// the three capabilities are now spread across `/opportunities` and
// `/workspace`, so the module lives in a private folder instead: `_actions` is
// never a route segment, which is what makes it a neutral home rather than
// another surface's property.

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getUser } from "@/lib/auth";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { checkPublicationGate } from "@/lib/listings/publication-gate";
import { publishOrHold } from "@/lib/listings/publish";
import { sendConnectAccepted } from "@/lib/email";

/** The public opportunity board, whose contents these actions can change. */
const PUBLIC_BOARD = "/find";

/**
 * Where a member is sent back to after acting.
 *
 * The owner side of an introduction decision lives at /workspace and listing
 * reconfirmation at /opportunities. A member who reconfirms from /opportunities
 * must land back on /opportunities, so the form states where it came from in a
 * `returnTo` field.
 *
 * That field is a value from a form, so it is never trusted as a path. It is
 * matched against this fixed list of same-site member surfaces and falls back to
 * the member's own records when it is absent or anything else. Nothing arbitrary
 * reaches redirect() or revalidatePath().
 *
 * The obsidian marketplace path was on this list while the board still rendered
 * these three capabilities. It is not on it now, and deliberately so: it is no
 * longer a member surface, it is a permanent redirect. Leaving it here would let
 * a form hand redirect() a path that only bounces, and would keep a retired
 * route alive inside the very allowlist whose job is to bound what redirect()
 * can be given.
 */
const RETURN_PATHS = ["/opportunities", "/workspace"] as const;
const DEFAULT_RETURN = "/opportunities";

function returnPath(formData: FormData): string {
  const raw = String(formData.get("returnTo") || "");
  return (RETURN_PATHS as readonly string[]).includes(raw) ? raw : DEFAULT_RETURN;
}

/**
 * Revalidate the public board AND the member surface that was acted on.
 *
 * Both of these actions can change what the public board shows, so the board is
 * invalidated whatever happens; the member's own surface is invalidated so the
 * record they just acted on is not still showing its previous state.
 */
function revalidateBoardAnd(back: string): void {
  revalidatePath(PUBLIC_BOARD);
  revalidatePath(back);
}

/**
 * A member hands in their own draft.
 *
 * It now goes straight through the central validator rather than into a desk
 * queue: a complete draft from a verified member is published by this call, and
 * the member is told so. The two emails this used to send, "your listing is
 * with the desk" and an operator alert ending "review in /admin/listings",
 * were the manual queue, and both are gone.
 */
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
    .select("id, ref")
    .maybeSingle();
  if (error || !listing) return;

  // Publication is a privileged transition and reads the submitter's live
  // verification state, so it runs under the service role. Awaited: a send left
  // dangling when the action returns is a send that never happens.
  try {
    const admin = createAdminClient();
    const { data: row } = await admin.from("listings").select("*").eq("id", listing.id).maybeSingle();
    if (row) await publishOrHold(admin as never, row as never);
  } catch (err) {
    console.error("[ponte] automated publication failed on draft submit:", err);
  }

  // A draft that publishes appears on the board, and it leaves the member's
  // "saved privately" state either way.
  revalidateBoardAnd(DEFAULT_RETURN);
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
  const back = returnPath(formData);
  const user = await getUser();
  if (!user) redirect(`/login?next=${back}`);
  const id = String(formData.get("id") || "");
  if (!id) redirect(back);

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
    redirect(back);
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
    verificationLevel: profile ? (profile.verification_level ?? null) : null,
    business_verification_id: profile?.business_verification_id ?? null,
    verification: verification as never,
  });
  if (!gate.ok) redirect(`${back}?rc=blocked`);

  await adminSb
    .from("listings")
    .update({ reconfirmed_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id)
    .eq("status", "approved");

  revalidateBoardAnd(back);
  redirect(`${back}?rc=ok`);
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

  // RLS: only the owner of the listing may decide. The requester's business
  // identity travels no further than this row until the owner accepts.
  const supabase = createClient();
  const { data: conn, error } = await supabase
    .from("listing_connections")
    .update({ status: decision, decided_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "pending")
    .select("listing_id, requester_id, interested_business")
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
        // Only now, on acceptance, does the owner learn who the requester is:
        // their business name alongside their contact email.
        sendConnectAccepted(ownerEmail, {
          ref: listing.ref,
          product: listing.product,
          otherEmail: requesterEmail,
          otherName: conn.interested_business ?? undefined,
        }),
        sendConnectAccepted(requesterEmail, {
          ref: listing.ref,
          product: listing.product,
          otherEmail: ownerEmail,
        }),
      ]);
    }
  }

  // The owner decides from /workspace. That surface is invalidated so the
  // decided request leaves the list they were reading.
  revalidateBoardAnd(returnPath(formData));
}
