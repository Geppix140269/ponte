// Ponte's outbound email, as the rest of the application sees it.
//
// This file used to BE the email system: a private `layout()` holding a navy
// and an amber that appear in no approved token file, seven templates writing
// their own HTML inline, no plain-text part anywhere, and three separate Resend
// clients. All of that now lives under `lib/email/`, and this module is the
// named, typed surface the application calls.
//
// It is not a compatibility shim that leaves the old templates alive alongside
// the new design — there are no old templates. Every function here renders
// through the one shell.
//
// Three behaviours changed with the redesign and are load-bearing:
//
//   1. Nothing invites a reply by email. `sendBrokerageSubmission` no longer
//      sets Reply-To to the submitter, and no member-facing template asks for
//      a reply. Ponte's disclosure model requires the conversation to stay on
//      the platform.
//   2. A normal listing publication does NOT alert an operator. That alert was
//      the manual-approval queue in email form.
//   3. Every send is awaited and its outcome is returned. A dropped
//      notification is now visible.

import { sendTemplateEmail, sendOperatorEmail, isEmailConfigured } from "./email/send";
import type { MemberIdentity } from "./email/identity";
import type { ListingSummary } from "./email/templates";

export { isEmailConfigured };
export { setSendObserver } from "./email/send";
export type { MemberIdentity } from "./email/identity";
export type { ListingSummary } from "./email/templates";

/* ------------------------------------------------------------------ */
/* Operator alerts                                                     */
/* ------------------------------------------------------------------ */

/**
 * A general alert to the desk, used by the verification pipeline and the
 * sanctions refresh.
 *
 * Callers must AWAIT this. A fire-and-forget send is dropped when the
 * serverless function returns.
 */
export async function sendAdminNotice(data: {
  subject: string;
  /** Plain text. Any HTML a legacy caller passes is stripped, not rendered. */
  body: string;
  actionPath?: string;
  actionLabel?: string;
}): Promise<void> {
  await sendOperatorEmail({
    template: "operator_alert",
    data: {
      subject: data.subject,
      body: data.body,
      actionPath: data.actionPath ?? null,
      actionLabel: data.actionLabel ?? null,
    },
  });
}

/* ------------------------------------------------------------------ */
/* Listing lifecycle                                                   */
/* ------------------------------------------------------------------ */

/** A member's listing published automatically. */
export async function sendListingPublished(
  to: string,
  data: {
    identity: MemberIdentity;
    listing: ListingSummary;
    completenessScore: number;
    completenessBand: string;
    recommendationCount: number;
    recipientUserId?: string | null;
  },
): Promise<void> {
  await sendTemplateEmail({
    to,
    template: "listing_published",
    recipientUserId: data.recipientUserId ?? null,
    data: {
      identity: data.identity,
      listing: data.listing,
      completenessScore: data.completenessScore,
      completenessBand: data.completenessBand,
      recommendationCount: data.recommendationCount,
    },
  });
}

/** A member's listing is structurally incomplete. Names the exact gaps. */
export async function sendListingNeedsInformation(
  to: string,
  data: {
    identity: MemberIdentity;
    listing: ListingSummary;
    blockingIssues: string[];
    recipientUserId?: string | null;
  },
): Promise<void> {
  await sendTemplateEmail({
    to,
    template: "listing_needs_information",
    recipientUserId: data.recipientUserId ?? null,
    data: {
      identity: data.identity,
      listing: data.listing,
      blockingIssues: data.blockingIssues,
    },
  });
}

/** An automated safety check held a listing. Internal, actionable, immediate. */
export async function sendListingFlaggedAlert(data: {
  identity: MemberIdentity;
  listing: ListingSummary;
  listingType: string;
  status: string;
  severity: string;
  flags: { code: string; detail: string }[];
  createdAt: string;
}): Promise<void> {
  await sendOperatorEmail({ template: "listing_flagged_internal", data });
}

/** The member's side of a flag. Neutral, and never an accusation. */
export async function sendListingFlaggedNotice(
  to: string,
  data: {
    identity: MemberIdentity;
    listing: ListingSummary;
    reason: string;
    recipientUserId?: string | null;
  },
): Promise<void> {
  await sendTemplateEmail({
    to,
    template: "listing_flagged_member",
    recipientUserId: data.recipientUserId ?? null,
    data: { identity: data.identity, listing: data.listing, reason: data.reason },
  });
}

/** A live listing has been taken off the market. */
export async function sendListingSuspended(
  to: string,
  data: {
    identity: MemberIdentity;
    listing: ListingSummary;
    reason: string;
    recipientUserId?: string | null;
  },
): Promise<void> {
  await sendTemplateEmail({
    to,
    template: "listing_suspended",
    recipientUserId: data.recipientUserId ?? null,
    data: { identity: data.identity, listing: data.listing, reason: data.reason },
  });
}

/** A human decided against a listing. */
export async function sendListingRejected(
  to: string,
  data: {
    identity: MemberIdentity;
    listing: ListingSummary;
    note?: string | null;
    recipientUserId?: string | null;
  },
): Promise<void> {
  await sendTemplateEmail({
    to,
    template: "listing_rejected",
    recipientUserId: data.recipientUserId ?? null,
    data: { identity: data.identity, listing: data.listing, note: data.note ?? null },
  });
}

/** A dated listing is approaching its declared horizon. */
export async function sendListingExpiring(
  to: string,
  data: {
    identity: MemberIdentity;
    listing: ListingSummary;
    daysRemaining: number;
    recipientUserId?: string | null;
  },
): Promise<void> {
  await sendTemplateEmail({
    to,
    template: "listing_expiring",
    recipientUserId: data.recipientUserId ?? null,
    data: {
      identity: data.identity,
      listing: data.listing,
      daysRemaining: data.daysRemaining,
    },
  });
}

/** The routine publication summary, in place of one email per submission. */
export async function sendPublicationDigest(data: {
  published: { ref: string; title: string }[];
  needsInformation: number;
  flagged: number;
  periodLabel: string;
}): Promise<void> {
  await sendOperatorEmail({ template: "publication_digest", data });
}

/* ------------------------------------------------------------------ */
/* Account                                                             */
/* ------------------------------------------------------------------ */

export async function sendWelcome(
  to: string,
  data: { identity: MemberIdentity; recipientUserId?: string | null },
): Promise<void> {
  await sendTemplateEmail({
    to,
    template: "welcome",
    recipientUserId: data.recipientUserId ?? null,
    data: { identity: data.identity },
  });
}

/* ------------------------------------------------------------------ */
/* Connections                                                         */
/* ------------------------------------------------------------------ */

export async function sendConnectRequest(
  to: string,
  data: { ref: string; product: string; id?: string },
): Promise<void> {
  await sendTemplateEmail({
    to,
    template: "connection_requested",
    data: { listing: { ref: data.ref, id: data.id ?? "", title: data.product } },
  });
}

/**
 * Both sides accepted, so both sides learn who the other is.
 *
 * This is the ONE template that carries a contact detail, and deliberately so:
 * Block D reveals nothing at request time and discloses on acceptance, which is
 * the moment both parties agreed to. Test 22 pins the ordering.
 */
export async function sendConnectAccepted(
  to: string,
  data: { ref: string; product: string; id?: string; otherEmail: string; otherName?: string },
): Promise<void> {
  await sendTemplateEmail({
    to,
    template: "connection_accepted",
    data: {
      listing: { ref: data.ref, id: data.id ?? "", title: data.product },
      counterpartyName: data.otherName ?? null,
      counterpartyEmail: data.otherEmail,
    },
  });
}

/* ------------------------------------------------------------------ */
/* Verification                                                        */
/* ------------------------------------------------------------------ */

export type VerificationDecision = "verified" | "rejected" | "documents";

/**
 * Tell a member what the desk decided about their verification.
 *
 * Every decision reported here was taken by a person. Nothing in this path is
 * ever sent for an automatic verdict.
 */
export async function sendVerificationDecision(
  to: string,
  data: {
    decision: VerificationDecision;
    subjectName: string;
    identity?: MemberIdentity;
    note?: string;
    disclaimer?: string;
    recipientUserId?: string | null;
  },
): Promise<void> {
  await sendTemplateEmail({
    to,
    template: "verification_decision",
    recipientUserId: data.recipientUserId ?? null,
    data: {
      identity: data.identity ?? { name: null, company: null, email: to },
      decision: data.decision,
      subjectName: data.subjectName,
      note: data.note ?? null,
      disclaimer: data.disclaimer ?? null,
    },
  });
}

/* ------------------------------------------------------------------ */
/* Deal desk (public brokerage and network forms)                      */
/* ------------------------------------------------------------------ */

export type BrokerageSubmissionType = "offer" | "requirement" | "network";

/**
 * Notify the deal desk of a submission from the public /brokerage or /network
 * form.
 *
 * This is NOT a listing path. Member listings publish automatically and do not
 * generate an operator email; this handles the un-authenticated enquiry forms,
 * where a person genuinely is the next step.
 *
 * Reply-To is no longer set to the submitter. The desk answers through Ponte so
 * the exchange is recorded, which is the same rule every other template follows.
 */
export async function sendBrokerageSubmission(data: {
  type: BrokerageSubmissionType;
  name: string;
  company: string;
  email: string;
  country: string;
  product?: string;
  volume?: string;
  details: string;
}): Promise<void> {
  const heading =
    data.type === "network"
      ? "Deal Sheet access request"
      : `Deal desk ${data.type}`;

  const lines = [
    `Type: ${data.type.toUpperCase()}`,
    `Name: ${data.name || "Not provided"}`,
    `Company: ${data.company || "Not provided"}`,
    `Email: ${data.email || "Not provided"}`,
    `Country: ${data.country || "Not provided"}`,
    ...(data.product ? [`Product: ${data.product}`] : []),
    ...(data.volume ? [`Volume: ${data.volume}`] : []),
    "",
    data.details,
  ];

  await sendOperatorEmail({
    template: "operator_alert",
    data: {
      subject: `${heading} from ${data.company || data.name || "an enquirer"}`,
      body: lines.join("\n"),
      actionPath: "/admin",
      actionLabel: "Open in Ponte",
    },
  });
}
