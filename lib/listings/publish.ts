// Automated publication.
//
// This is the server-side seam that turns a submitted listing into a public
// one, and it is the ONLY place that writes `approved` outside the admin
// exception console. It runs under the service role because publication is a
// privileged transition: a member may hand a listing in, but nothing a member's
// browser sends may decide the outcome. RLS enforces that half; this module is
// the trusted half.
//
// The sequence is fixed and every step is recorded:
//
//   1. validating  — the record is read together with its adjacent counts.
//   2. evaluate    — the ONE validator decides. Nothing here second-guesses it.
//   3. write       — status, score, flags, all in one update.
//   4. record      — a lifecycle event with the previous status, the new one,
//                    the actor, the rule version and the reason codes.
//   5. notify      — the member always; an operator only on a genuine exception.
//
// Step 5 is where the old behaviour died. Every submission used to email the
// desk "review in /admin/listings", which was the manual-approval queue wearing
// an email's clothes. A routine publication now notifies nobody internally; it
// lands in the digest instead.

import { evaluateListing, completenessBand, completenessBandLabel, resolutionRoute, DECLARATION_VERSION, type EligibilityContext, type EligibilityListing, type ListingValidationResult } from "./eligibility";
import { outcomeStatus } from "./eligibility";
import { topSeverity, memberFacingFlagReason } from "./safety";
import { quantityFromRow, formatQuantity } from "./quantity";
import type { ListingStatus, LifecycleActor } from "./status";
import { memberIdentity, type MemberIdentity } from "../email/identity";
import {
  sendListingPublished,
  sendListingNeedsInformation,
  sendListingFlaggedAlert,
  sendListingFlaggedNotice,
} from "../email";

/** The version of the automated rules that produced an outcome. */
export const RULE_VERSION = "listing-eligibility/2026-07-28.1";

/** The minimal Supabase surface this module needs, so it stays testable. */
type Db = {
  from: (table: string) => any;
  auth: { admin: { getUserById: (id: string) => Promise<any> } };
};

export type PublishOutcome = {
  status: Extract<ListingStatus, "approved" | "needs_information" | "flagged">;
  result: ListingValidationResult;
  /** Whether an operator alert was raised. False for every routine publication. */
  operatorAlerted: boolean;
};

/**
 * Record one lifecycle event.
 *
 * Never throws. An audit write that fails must not roll back the state change
 * it describes — a published listing with a missing event is recoverable, an
 * exception thrown after the update is not.
 */
export async function recordListingEvent(
  db: Db,
  entry: {
    listingId: string;
    event: string;
    fromStatus?: string | null;
    toStatus?: string | null;
    actorType?: LifecycleActor;
    actorId?: string | null;
    reasonCode?: string | null;
    /** Structured codes only. Never email bodies or document content. */
    detail?: Record<string, unknown> | null;
  },
): Promise<void> {
  try {
    await db.from("listing_events").insert({
      listing_id: entry.listingId,
      event: entry.event,
      from_status: entry.fromStatus ?? null,
      to_status: entry.toStatus ?? null,
      actor_type: entry.actorType ?? "system",
      actor_id: entry.actorId ?? null,
      rule_version: RULE_VERSION,
      reason_code: entry.reasonCode ?? null,
      detail: entry.detail ?? null,
    });
  } catch (err) {
    console.error("[ponte] listing event not recorded:", err);
  }
}

/**
 * Read everything outside the listing row that the validator needs.
 *
 * The submitter's LIVE verification state, not a cached flag: a re-screen
 * suspension drops the profile level while leaving the binding in place, and a
 * publication decision taken on the binding alone would publish for a member
 * whose verification has since lapsed.
 */
export async function loadEligibilityContext(
  db: Db,
  listing: { id: string; user_id: string; product?: string | null },
): Promise<EligibilityContext & { identity: MemberIdentity; email: string }> {
  const [{ data: profile }, media, docs, owner] = await Promise.all([
    db.from("profiles")
      .select("full_name, company, business_verification_id, verification_level")
      .eq("id", listing.user_id).maybeSingle(),
    db.from("listing_media").select("*", { count: "exact", head: true }).eq("listing_id", listing.id),
    db.from("listing_documents").select("file_name", { count: "exact" }).eq("listing_id", listing.id),
    db.auth.admin.getUserById(listing.user_id),
  ]);

  let verification: { purpose: string | null; status: string | null; sanctions_hits: unknown } | null = null;
  if (profile?.business_verification_id) {
    const { data: v } = await db
      .from("verifications")
      .select("purpose, status, sanctions_hits")
      .eq("id", profile.business_verification_id)
      .maybeSingle();
    verification = v ?? null;
  }

  const email = owner?.data?.user?.email ?? "";
  const identity = memberIdentity({
    full_name: profile?.full_name ?? null,
    company: profile?.company ?? null,
    email,
  });

  // A near-duplicate of the member's own live listing. Same product, same
  // member, already public: a low-severity flag, not a block.
  const { data: duplicate } = await db
    .from("listings")
    .select("ref")
    .eq("user_id", listing.user_id)
    .eq("status", "approved")
    .eq("product", listing.product ?? "")
    .neq("id", listing.id)
    .limit(1)
    .maybeSingle();

  return {
    identity,
    email,
    submitter: {
      verificationLevel: profile ? Number(profile.verification_level ?? 0) : null,
      business_verification_id: profile?.business_verification_id ?? null,
      verification: verification as never,
    },
    mediaCount: media?.count ?? 0,
    documentCount: docs?.count ?? 0,
    certificationCount: 0,
    duplicateOfRef: duplicate?.ref ?? null,
    abuseReportCount: 0,
    attachmentNames: (docs?.data ?? []).map((d: { file_name?: string }) => d.file_name ?? ""),
  };
}

/**
 * Validate a submitted listing and take it wherever the validator says.
 *
 * Returns the outcome so the caller can tell the member what happened in the
 * same response, rather than leaving them on a screen that says "submitted" for
 * a listing that is already live.
 */
export async function publishOrHold(
  db: Db,
  listing: EligibilityListing & { id: string; ref: string; user_id: string; status: string },
): Promise<PublishOutcome> {
  const fromStatus = listing.status;

  await recordListingEvent(db, {
    listingId: listing.id,
    event: "listing_validation_started",
    fromStatus,
    toStatus: "validating",
  });

  const ctx = await loadEligibilityContext(db, listing);
  const result = evaluateListing(listing, ctx);
  const status = outcomeStatus(result);
  const severity = topSeverity(result.flags);

  const update: Record<string, unknown> = {
    status,
    completeness_score: result.completenessScore,
    safety_flags: result.flags.length ? result.flags : null,
    flag_reason: status === "flagged" ? result.flags[0]?.code ?? null : null,
    flag_severity: status === "flagged" ? severity : null,
    updated_at: new Date().toISOString(),
  };
  // The moment a listing became public. Existing readers already use
  // `decided_at`, so automated publication writes the same column rather than
  // introducing a second timestamp that means the same thing.
  if (status === "approved") update.decided_at = new Date().toISOString();

  const { error } = await db.from("listings").update(update).eq("id", listing.id);
  if (error) {
    console.error("[ponte] publication write failed:", error);
    await recordListingEvent(db, {
      listingId: listing.id,
      event: "listing_validation_failed",
      fromStatus,
      toStatus: fromStatus,
      reasonCode: "db_error",
    });
    throw new Error("Could not complete publication.");
  }

  await recordListingEvent(db, {
    listingId: listing.id,
    event:
      status === "approved" ? "listing_published"
      : status === "flagged" ? "listing_flagged"
      : "listing_needs_information",
    fromStatus,
    toStatus: status,
    reasonCode: status === "flagged" ? result.flags[0]?.code ?? null : null,
    detail: {
      completenessScore: result.completenessScore,
      // Codes only. The member-facing sentences are rendered at display time
      // and are not audit data.
      blockingIssues: result.blockingIssues.map((i) => i.code),
      flags: result.flags.map((f) => ({ code: f.code, severity: f.severity })),
      recommendationCount: result.recommendations.length,
    },
  });

  const quantity = formatQuantity(quantityFromRow(listing));
  const summary = {
    ref: listing.ref,
    id: listing.id,
    title: String(listing.product ?? listing.ref),
    quantity,
  };

  let operatorAlerted = false;

  if (status === "approved") {
    // The member hears about it. Nobody internal does: this is the ordinary
    // case, and it belongs in the digest.
    const band = completenessBand(result.completenessScore);
    await sendListingPublished(ctx.email, {
      identity: ctx.identity,
      listing: summary,
      completenessScore: result.completenessScore,
      completenessBand: completenessBandLabel(band),
      recommendationCount: result.recommendations.length,
      recipientUserId: listing.user_id,
    });
  } else if (status === "needs_information") {
    await sendListingNeedsInformation(ctx.email, {
      identity: ctx.identity,
      listing: summary,
      blockingIssues: result.blockingIssues.map((i) => i.message),
      // Verification is not fixable on the listing form. Sending a member whose
      // only gap is verification to the composer is a dead end.
      route: resolutionRoute(result.blockingIssues),
      recipientUserId: listing.user_id,
    });
  } else {
    // A genuine exception. Both sides are told, and the member's version is
    // written so that an automated term match never reads as an accusation.
    await Promise.allSettled([
      sendListingFlaggedAlert({
        identity: ctx.identity,
        listing: summary,
        listingType: String(listing.type ?? "unknown"),
        status,
        severity: severity ?? "unknown",
        flags: result.flags.map((f) => ({ code: f.code, detail: f.detail })),
        createdAt: new Date().toISOString(),
      }),
      sendListingFlaggedNotice(ctx.email, {
        identity: ctx.identity,
        listing: summary,
        reason: memberFacingFlagReason(result.flags),
        recipientUserId: listing.user_id,
      }),
    ]);
    operatorAlerted = true;
  }

  await recordListingEvent(db, {
    listingId: listing.id,
    event: "listing_email_sent",
    toStatus: status,
    detail: { template: status },
  });

  return { status, result, operatorAlerted };
}

export { DECLARATION_VERSION };
