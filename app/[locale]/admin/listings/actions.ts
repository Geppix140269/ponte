"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getUser } from "@/lib/auth";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { sendListingPublished, sendListingRejected } from "@/lib/email";
import { memberIdentity } from "@/lib/email/identity";
import { recordListingEvent } from "@/lib/listings/publish";
import { completenessBand, completenessBandLabel } from "@/lib/listings/eligibility";
import { vetListing, isAiConfigured } from "@/lib/ai-vet";
import { checkPublicationGate, gateFailureLabel } from "@/lib/listings/publication-gate";
import { generateWriteup, WriteupBelowMinimum } from "@/lib/writeup";

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
  const qualification = String(formData.get("qualification") || "").trim().slice(0, 900);
  const limitations = String(formData.get("limitations") || "").trim().slice(0, 900);
  if (!id) finish("no_id");
  // `suspended` and `needs_information` join the vocabulary with the exception
  // console: an operator has to be able to take a live listing off the market
  // and to hand one back to its member, and neither was previously expressible.
  if (!["approved", "rejected", "closed", "suspended", "needs_information"].includes(decision)) {
    finish("no_decision", decision);
  }

  const adminSb = createAdminClient();
  const { data: listing } = await adminSb
    .from("listings")
    .select(
      "id, ref, product, user_id, status, type, quantity, unit, frequency, payment_terms, submitter_role, chain_depth, validity_type, valid_until",
    )
    .eq("id", id)
    .maybeSingle();
  if (!listing) finish("no_listing");

  const nowIso = new Date().toISOString();
  const update: Record<string, unknown> = {
    status: decision,
    decision_note: decisionNote || null,
    decided_at: nowIso,
  };

  // The publication gate (brief 3.5). It runs ONLY on an approval, and it runs
  // here in the server action, not in admin copy: an unverified submitter, an
  // incomplete opportunity, an unresolved sanctions candidate, missing public
  // text or a lapsed validity all block the approval, and nothing is written.
  if (decision === "approved") {
    // The desk-approved public text is authored on the approve form and stored
    // as desk_version. It is the public qualification and limitations the gate
    // requires, and it is desk-written, never raw model output.
    const deskVersion =
      qualification || limitations
        ? { qualification: qualification || null, limitations: limitations || null }
        : null;

    // The submitter's LIVE business-verification state: the profile's current
    // level (a re-screen suspension drops it) and the bound record's purpose,
    // status and sanctions. A bound id alone is not enough to publish.
    const { data: profile } = await adminSb
      .from("profiles")
      .select("business_verification_id, verification_level")
      .eq("id", listing.user_id)
      .maybeSingle();
    let verification: { purpose: string | null; status: string | null; sanctions_hits: unknown } | null =
      null;
    if (profile?.business_verification_id) {
      const { data: v } = await adminSb
        .from("verifications")
        .select("purpose, status, sanctions_hits")
        .eq("id", profile.business_verification_id)
        .maybeSingle();
      verification = v ?? null;
    }

    const gate = checkPublicationGate(
      { ...listing, desk_version: deskVersion } as never,
      {
        verificationLevel: profile ? (profile.verification_level ?? null) : null,
        business_verification_id: profile?.business_verification_id ?? null,
        verification: verification as never,
      },
    );
    if (!gate.ok) {
      finish("gate_blocked", gate.failures.map(gateFailureLabel).join("; "));
    }

    update.desk_version = deskVersion;
    update.reconfirmed_at = nowIso;
    // Releasing a listing from a flag CLEARS the flag. Leaving it set would
    // publish a listing that every console filter still reports as flagged,
    // and the next operator would have no way to tell a live exception from a
    // resolved one.
    update.safety_flags = null;
    update.flag_reason = null;
    update.flag_severity = null;
  }

  // Suspension takes a live listing off the market. It is not a rejection: the
  // listing is intact and reinstatable, and the member is told so in those
  // terms. The reason is required, because a member who is told only that
  // publication stopped has been told nothing they can act on.
  if (decision === "suspended" && !decisionNote) {
    finish("no_reason", "A suspension needs a reason. It is sent to the member.");
  }

  const { error } = await adminSb.from("listings").update(update).eq("id", id);
  if (error) {
    console.error("[ponte] listing decision failed:", error);
    finish("db_error", error.message);
  }

  // The exception console's decisions are HUMAN decisions on cases automated
  // publication could not resolve, so they keep their own audit entry with an
  // `admin` actor. Without this, a listing that a person released from a flag
  // would be indistinguishable in the record from one the validator published.
  await recordListingEvent(adminSb as never, {
    listingId: id,
    event:
      decision === "approved" ? "listing_published"
      : decision === "rejected" ? "listing_rejected"
      : decision === "suspended" ? "listing_suspended"
      : decision === "needs_information" ? "listing_needs_information"
      : "listing_closed",
    fromStatus: listing.status,
    toStatus: decision,
    actorType: "admin",
    actorId: (await getUser())?.id ?? null,
    // Releasing a flagged listing is a materially different act from publishing
    // an ordinary one, and the audit trail has to be able to tell them apart
    // six months later.
    reasonCode:
      decision === "approved" && listing.status === "flagged"
        ? "operator_cleared_flag"
        : "operator_decision",
  });

  // Email the member on approve, reject and suspend. Closing is bookkeeping,
  // not news, and needs_information is a hand-back the member sees on their own
  // listing rather than a decision worth its own message.
  let mail: "sent" | "no_address" | "send_failed" | null = null;
  if (decision === "approved" || decision === "rejected" || decision === "suspended") {
    const [{ data: owner }, { data: profile }] = await Promise.all([
      adminSb.auth.admin.getUserById(listing.user_id),
      adminSb.from("profiles").select("full_name, company").eq("id", listing.user_id).maybeSingle(),
    ]);
    const email = owner?.user?.email;
    if (!email) {
      console.error(`[ponte] listing ${listing.ref} decided but the owner has no address`);
      mail = "no_address";
    } else {
      // The identity is built from the profile, not from whatever string is
      // nearest. This is the mapping defect: the retired path passed the email
      // address as the name and "Marketplace listing PT-0102" as the company.
      const identity = memberIdentity({
        full_name: profile?.full_name ?? null,
        company: profile?.company ?? null,
        email,
      });
      const summary = { ref: listing.ref, id: listing.id, title: listing.product };
      try {
        if (decision === "approved") {
          const score = Number(
            (listing as { completeness_score?: number | null }).completeness_score ?? 0,
          );
          await sendListingPublished(email, {
            identity,
            listing: summary,
            completenessScore: score,
            completenessBand: completenessBandLabel(completenessBand(score)),
            recommendationCount: 0,
            recipientUserId: listing.user_id,
          });
        } else {
          await sendListingRejected(email, {
            identity,
            listing: summary,
            note: decisionNote || null,
            recipientUserId: listing.user_id,
          });
        }
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

/**
 * Generate (or refresh) the fact-only deal write-up from the STORED facts.
 *
 * The member's composer sends a draft, but the desk gets a trustworthy one it
 * regenerates itself from the columns, never from client text. The result is
 * the internal draft (ai_version) the desk reads and copies its public
 * qualification and limitations from; it is not the public wording itself.
 */
export async function generateWriteupAction(formData: FormData): Promise<void> {
  if (!(await requireAdmin())) finish("not_admin");
  if (!isAiConfigured()) finish("ai_off");
  const id = String(formData.get("id") || "");
  if (!id) finish("no_id");

  const adminSb = createAdminClient();
  const { data: l } = await adminSb.from("listings").select("*").eq("id", id).maybeSingle();
  if (!l) finish("no_listing");

  try {
    const result = await generateWriteup(
      {
        type: l.type,
        product: l.product,
        hs_code: l.hs_code,
        quantity: l.quantity,
        unit: l.unit,
        frequency: l.frequency,
        incoterm: l.incoterm,
        payment_terms: l.payment_terms,
        origin_country: l.origin_country,
        destination_country: l.destination_country,
        origin: l.origin,
        destination: l.destination,
        submitter_role: l.submitter_role,
        chain_depth: l.chain_depth,
        validity_type: l.validity_type,
        valid_until: l.valid_until,
        key_notes: l.key_notes,
        details: l.details,
        flexibility: (l.flexibility as Record<string, string>) ?? {},
        media_count: 0,
      },
      { userId: null, ref: l.ref },
    );
    await adminSb
      .from("listings")
      .update({
        ai_version: {
          writeup: result.writeup,
          prompt_version: result.promptVersion,
          model: result.model,
        },
        prompt_version: result.promptVersion,
        model: result.model,
        writeup_at: new Date().toISOString(),
        share_text: result.writeup.share_text || null,
      })
      .eq("id", id);
  } catch (err) {
    if (err instanceof WriteupBelowMinimum) {
      revalidatePath(QUEUE);
      finish("writeup_thin");
    }
    console.error("[ponte] admin write-up failed:", err);
    revalidatePath(QUEUE);
    finish("writeup_failed");
  }

  revalidatePath(QUEUE);
  finish("writeup_done");
}
