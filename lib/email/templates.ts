// Every Ponte transactional email.
//
// One registry. A template is a subject, a preheader, a notification reason and
// a list of blocks — it renders nothing itself, so the shell and the visual
// system stay in one place and a new template physically cannot introduce a
// second look.
//
// Copy rules enforced by construction throughout this file:
//
//   - No template invites a reply by email. Every route back is a Ponte URL.
//     The retired templates said "Reply to this email to answer the member
//     directly" and "Just reply to this email", which moved the counterparty
//     conversation off a platform whose entire disclosure model depends on it
//     staying on.
//   - No template describes a complete listing as a checked one. Completeness
//     is how much the member stated. It is never evidence that any of it is
//     true, and the disclaimers here say so in the emails where it could
//     otherwise be inferred.
//   - No member-facing template prints an automated flag as a finding of
//     wrongdoing.
//   - No template attaches or links a member-uploaded document.

import type { EmailBlock } from "./blocks";
import { route, type NotificationReason } from "./shell";
import {
  type MemberIdentity, salutation, companyForOperator, nameForOperator,
} from "./identity";

/** What a template produces. Rendered by `renderTransactionalEmail`. */
export type EmailContent = {
  subject: string;
  preheader: string;
  reason: NotificationReason;
  blocks: EmailBlock[];
  /** Adds the anti-phishing line to the footer. */
  securityNote?: boolean;
};

/* ------------------------------------------------------------------ */
/* Shared fragments                                                    */
/* ------------------------------------------------------------------ */

/**
 * The sentence that keeps publication from reading as endorsement.
 *
 * It appears on every email that tells somebody a listing is live. Publication
 * under automated eligibility control means the record passed structural
 * checks and the member's business is verified — it does not mean Ponte
 * examined the commercial claim, and a member who believes otherwise has been
 * misled by us rather than by anybody else.
 */
const PUBLICATION_DISCLAIMER =
  "Publication means your listing passed Ponte's structural and safety checks. " +
  "Ponte has not independently verified the commercial claims in it.";

const listingLink = (ref: string) => route(`/find/o/${encodeURIComponent(ref)}`);

// Reopen a saved listing in the current constitutional composer.
//
// This once pointed at `/marketplace/new?id=`, the retired obsidian editor —
// and with `id=`, a parameter that page did not read, so the member arrived at
// a blank form rather than the listing this email is about (LB-013). Every
// "Complete / Improve / Open / Edit / Extend your listing" CTA resolves through
// here, so the single canonical destination is fixed once, in one place. The
// Structure composer reads `?edit=<id>`, enforces ownership by query and RLS,
// and fails closed on an unreadable record; `/structure` is a route in every
// deployment, independent of the landing journey flag.
const editLink = (id: string) => route(`/structure?edit=${encodeURIComponent(id)}`);

/* ------------------------------------------------------------------ */
/* Template data                                                       */
/* ------------------------------------------------------------------ */

export type ListingSummary = {
  ref: string;
  id: string;
  title: string;
  /** Formatted for display by the caller. Null when none is stated. */
  quantity?: string | null;
  /**
   * What to call this record in a sentence: "offer", "requirement", "trade
   * service", "distribution opportunity".
   *
   * These templates were written when every record was a product offer, so
   * they said "offer" throughout. A freight forwarder was told their offer was
   * live, about a service they never offered for sale, and a member seeking a
   * distributor was told the same about a requirement. `recordNoun` on the
   * stored row supplies the right word; absent, it stays "offer" so nothing
   * that already calls these builders changes meaning.
   */
  noun?: string | null;
  /**
   * The one fact worth naming in the metadata block, in this family's
   * vocabulary: a quantity for a product, a capability for a service, a
   * territory for a distribution opportunity.
   */
  headline?: { label: string; value: string } | null;
};

/**
 * The noun a template uses for a record, defaulting to the historical wording.
 *
 * `quantity` is still honoured as a headline for a caller that has not been
 * updated, so no existing sender loses the fact it was already sending.
 */
const nounOf = (l: ListingSummary): string => (l.noun ?? "").trim() || "offer";

const headlineRow = (l: ListingSummary): { label: string; value: string }[] => {
  if (l.headline && l.headline.value) return [l.headline];
  return l.quantity ? [{ label: "Quantity", value: l.quantity }] : [];
};

export type TemplateData = {
  listing_published: {
    identity: MemberIdentity;
    listing: ListingSummary;
    completenessScore: number;
    completenessBand: string;
    recommendationCount: number;
  };
  listing_needs_information: {
    identity: MemberIdentity;
    listing: ListingSummary;
    /** The exact blocking issues. Never a generic "validation failed". */
    blockingIssues: string[];
    /**
     * Where the member actually resolves these.
     *
     * Verification is not fixable on the listing form, so an email whose only
     * button is "Complete your listing" sends a member whose sole blocker is
     * verification to a page that cannot help them.
     */
    route?: "verification" | "listing" | "both";
  };
  listing_flagged_internal: {
    identity: MemberIdentity;
    listing: ListingSummary;
    listingType: string;
    status: string;
    severity: string;
    flags: { code: string; detail: string }[];
    createdAt: string;
  };
  listing_suspended: {
    identity: MemberIdentity;
    listing: ListingSummary;
    /** Written for the member. Neutral, and never an accusation. */
    reason: string;
  };
  listing_flagged_member: {
    identity: MemberIdentity;
    listing: ListingSummary;
    reason: string;
  };
  listing_rejected: {
    identity: MemberIdentity;
    listing: ListingSummary;
    note?: string | null;
  };
  listing_expiring: {
    identity: MemberIdentity;
    listing: ListingSummary;
    daysRemaining: number;
  };
  welcome: {
    identity: MemberIdentity;
  };
  connection_requested: {
    listing: ListingSummary;
  };
  connection_accepted: {
    listing: ListingSummary;
    counterpartyName: string | null;
    /**
     * The counterparty's address, disclosed HERE and only here.
     *
     * This is Block D's deliberate design and is pinned by test 22: nothing is
     * revealed at request time, and on acceptance both sides receive each
     * other's details. The email is the record of an introduction both parties
     * agreed to, which is why it is the one template that carries a contact.
     */
    counterpartyEmail: string;
  };
  verification_decision: {
    identity: MemberIdentity;
    decision: "verified" | "rejected" | "documents";
    subjectName: string;
    note?: string | null;
    disclaimer?: string | null;
  };
  operator_alert: {
    subject: string;
    body: string;
    actionPath?: string | null;
    actionLabel?: string | null;
  };
  publication_digest: {
    published: { ref: string; title: string }[];
    needsInformation: number;
    flagged: number;
    periodLabel: string;
  };
};

export type TemplateName = keyof TemplateData;

/* ------------------------------------------------------------------ */
/* The templates                                                       */
/* ------------------------------------------------------------------ */

type Builder<K extends TemplateName> = (data: TemplateData[K]) => EmailContent;

const listing_published: Builder<"listing_published"> = (d) => ({
  subject: `Your Ponte ${nounOf(d.listing)} is now live`,
  preheader: `${d.listing.title} is published and discoverable on Ponte Trade.`,
  reason: "listing_owner",
  blocks: [
    { kind: "title", text: `Your ${nounOf(d.listing)} is live.` },
    { kind: "status", tone: "published", label: "Published" },
    { kind: "paragraph", text: salutation(d.identity) },
    {
      kind: "lead",
      text: "Your listing passed Ponte's checks and is now on the market. Nobody had to approve it by hand.",
    },
    {
      kind: "metadata",
      rows: [
        { label: "Listing", value: d.listing.title },
        { label: "Reference", value: d.listing.ref },
        ...headlineRow(d.listing),
        { label: "Detail level", value: `${d.completenessBand} (${d.completenessScore}%)` },
      ],
    },
    { kind: "button", label: "View your listing", href: listingLink(d.listing.ref) },
    ...(d.recommendationCount > 0
      ? ([
          {
            kind: "paragraph",
            text:
              d.recommendationCount === 1
                ? "There is one optional detail you could still add. Completing it may improve how your listing ranks and how confident buyers feel."
                : `There are ${d.recommendationCount} optional details you could still add. Completing them may improve how your listing ranks and how confident buyers feel.`,
          },
          { kind: "link", label: "Improve your listing", href: editLink(d.listing.id) },
        ] as EmailBlock[])
      : []),
    { kind: "link", label: "Manage or withdraw this listing", href: route("/opportunities") },
    { kind: "disclaimer", text: PUBLICATION_DISCLAIMER },
  ],
});

const listing_needs_information: Builder<"listing_needs_information"> = (d) => {
  const resolveVia = d.route ?? "listing";
  const verificationOnly = resolveVia === "verification";

  return {
    // When verification is the only thing standing in the way, the subject says
    // so. "Complete your offer" is untrue in that case: the record IS complete.
    subject: verificationOnly
      ? `Verify your business to publish your Ponte ${nounOf(d.listing)}`
      : `Complete your Ponte ${nounOf(d.listing)} to publish it`,
    preheader: verificationOnly
      ? `${d.listing.title} is ready. Your business verification is the last step.`
      : `${d.listing.title} is saved. A few required details are still missing.`,
    reason: "listing_owner",
    blocks: [
      {
        kind: "title",
        text: verificationOnly
          ? `Your ${nounOf(d.listing)} is ready. Your business is not verified yet.`
          : `Your ${nounOf(d.listing)} is saved, but not yet live.`,
      },
      { kind: "status", tone: "action", label: "Action needed" },
      { kind: "paragraph", text: salutation(d.identity) },
      {
        kind: "lead",
        text: verificationOnly
          ? "Ponte publishes member opportunities from verified businesses only. Nothing is wrong with your listing; it publishes automatically as soon as your verification passes."
          : "Ponte publishes automatically once a listing is complete. These are the details still needed.",
      },
      {
        kind: "metadata",
        rows: [
          { label: "Listing", value: d.listing.title },
          { label: "Reference", value: d.listing.ref },
        ],
      },
      // The exact fields. A member told "validation failed" has been told
      // nothing they can act on.
      { kind: "list", items: d.blockingIssues },
      // The button goes where the work actually is. Sending a member whose only
      // blocker is verification to the listing composer is a dead end: there is
      // nothing on that form that resolves it.
      verificationOnly
        ? { kind: "button", label: "Verify your business", href: route("/verify?for=business") }
        : { kind: "button", label: "Complete your listing", href: editLink(d.listing.id) },
      ...(resolveVia === "both"
        ? ([{ kind: "link", label: "Verify your business", href: route("/verify?for=business") }] as EmailBlock[])
        : []),
      {
        kind: "disclaimer",
        text: verificationOnly
          ? "Verifying confirms the legal entity you represent. It is not an assessment of the opportunity you posted."
          : "Nothing is lost. Your listing stays exactly as you left it until you finish it.",
      },
    ],
  };
};

const listing_flagged_internal: Builder<"listing_flagged_internal"> = (d) => ({
  subject: `Ponte listing ${d.listing.ref} requires review`,
  preheader: `${d.severity} severity. ${d.flags.length} automated check(s) raised an exception.`,
  reason: "internal_alert",
  blocks: [
    { kind: "title", text: `Listing ${d.listing.ref} requires review` },
    { kind: "status", tone: "hold", label: `${d.severity} severity` },
    {
      kind: "lead",
      text: "Automated publication held this listing. It is not public and will not become public without a decision here.",
    },
    {
      kind: "metadata",
      rows: [
        { label: "Reference", value: d.listing.ref },
        { label: "Listing", value: d.listing.title },
        { label: "Type", value: d.listingType },
        { label: "Status", value: d.status },
        // The defect this replaces put the address in the name field and the
        // reference in the company field. Each now has its own row.
        { label: "Member", value: nameForOperator(d.identity) },
        { label: "Company", value: companyForOperator(d.identity) },
        { label: "Email", value: d.identity.email || "Not provided" },
        { label: "Created", value: d.createdAt },
      ],
    },
    {
      kind: "panel",
      heading: "Automated findings",
      body: d.flags.map((f) => `${f.code}: ${f.detail}`).join("\n"),
    },
    // The admin route is authenticated and role-checked. There is deliberately
    // no one-click approve in this email: a privileged state change reachable
    // from an email link is a privileged state change reachable by anybody who
    // sees the email.
    {
      kind: "button",
      label: "Review flagged listing",
      href: route(`/admin/listings?ref=${encodeURIComponent(d.listing.ref)}`),
    },
    {
      kind: "disclaimer",
      text: "A flag is an automated exception, not a finding against the member. Sign in as an operator to review it.",
    },
  ],
  securityNote: true,
});

const listing_flagged_member: Builder<"listing_flagged_member"> = (d) => ({
  subject: `Your Ponte ${nounOf(d.listing)} needs an additional check`,
  preheader: `${d.listing.title} is held for a short check before publication.`,
  reason: "listing_owner",
  blocks: [
    { kind: "title", text: `Your ${nounOf(d.listing)} needs an additional check.` },
    { kind: "status", tone: "hold", label: "On hold" },
    { kind: "paragraph", text: salutation(d.identity) },
    {
      kind: "lead",
      text: "Most listings publish immediately. This one matched a check that Ponte looks at by hand before it goes out.",
    },
    {
      kind: "metadata",
      rows: [
        { label: "Listing", value: d.listing.title },
        { label: "Reference", value: d.listing.ref },
      ],
    },
    { kind: "panel", body: d.reason },
    { kind: "button", label: "Open your listing", href: route("/opportunities") },
    {
      kind: "disclaimer",
      text: "This is not a finding against you. An automated check cannot tell a legitimate trade from a problem one, which is why a person looks.",
    },
  ],
});

const listing_suspended: Builder<"listing_suspended"> = (d) => ({
  subject: `Publication paused for ${d.listing.ref}`,
  preheader: `${d.listing.title} has been taken off the market while Ponte reviews it.`,
  reason: "listing_owner",
  blocks: [
    { kind: "title", text: "Publication has been paused." },
    { kind: "status", tone: "paused", label: "Paused" },
    { kind: "paragraph", text: salutation(d.identity) },
    {
      kind: "lead",
      text: "Your listing has been taken off the market while Ponte reviews it. It has not been deleted.",
    },
    {
      kind: "metadata",
      rows: [
        { label: "Listing", value: d.listing.title },
        { label: "Reference", value: d.listing.ref },
      ],
    },
    { kind: "panel", heading: "Why", body: d.reason },
    {
      kind: "paragraph",
      text: "If you can clarify or correct what is described above, do it on the listing and Ponte will look again.",
    },
    { kind: "button", label: "Open your listing", href: editLink(d.listing.id) },
    { kind: "link", label: "Ask Ponte about this", href: route("/support") },
    {
      kind: "disclaimer",
      text: "You can respond through Ponte at any time. A pause is reversible.",
    },
  ],
});

const listing_rejected: Builder<"listing_rejected"> = (d) => ({
  subject: `Ponte could not publish ${d.listing.ref}`,
  preheader: `${d.listing.title} was not published. Here is what happened.`,
  reason: "listing_owner",
  blocks: [
    { kind: "title", text: "Ponte could not publish this listing." },
    { kind: "status", tone: "paused", label: "Not published" },
    { kind: "paragraph", text: salutation(d.identity) },
    {
      kind: "metadata",
      rows: [
        { label: "Listing", value: d.listing.title },
        { label: "Reference", value: d.listing.ref },
      ],
    },
    ...(d.note ? ([{ kind: "panel", heading: "Reason", body: d.note }] as EmailBlock[]) : []),
    {
      kind: "paragraph",
      text: "This is often about details that do not line up rather than about the trade itself. You can edit and resubmit.",
    },
    { kind: "button", label: "Edit your listing", href: editLink(d.listing.id) },
    { kind: "link", label: "Ask Ponte about this", href: route("/support") },
  ],
});

const listing_expiring: Builder<"listing_expiring"> = (d) => ({
  subject: `Your Ponte listing expires in ${d.daysRemaining} day${d.daysRemaining === 1 ? "" : "s"}`,
  preheader: `${d.listing.title} comes off the market unless you extend it.`,
  reason: "listing_owner",
  blocks: [
    { kind: "title", text: "This listing is about to expire." },
    { kind: "status", tone: "action", label: "Action needed" },
    { kind: "paragraph", text: salutation(d.identity) },
    {
      kind: "lead",
      text: `You set this listing to run out in ${d.daysRemaining} day${d.daysRemaining === 1 ? "" : "s"}. After that it comes off the market.`,
    },
    {
      kind: "metadata",
      rows: [
        { label: "Listing", value: d.listing.title },
        { label: "Reference", value: d.listing.ref },
      ],
    },
    { kind: "button", label: "Extend this listing", href: editLink(d.listing.id) },
    { kind: "link", label: "Let it expire", href: route("/opportunities") },
  ],
});

const welcome: Builder<"welcome"> = (d) => ({
  subject: "Your Ponte Trade account is ready",
  preheader: "Verify your business to publish listings and open deals.",
  reason: "account",
  blocks: [
    { kind: "title", text: "Welcome to Ponte Trade." },
    { kind: "paragraph", text: salutation(d.identity) },
    {
      kind: "lead",
      text: "One thing unlocks everything else: verifying your business. Until it is done, you can explore the market but not publish into it.",
    },
    { kind: "button", label: "Verify your business", href: route("/verify") },
    {
      kind: "list",
      items: [
        "Explore market activity across products, trade services and distribution.",
        "Structure an opportunity and save it as a draft at any time.",
        "Publish it automatically once your business is verified and the record is complete.",
      ],
    },
    { kind: "link", label: "Explore the market", href: route("/find") },
    {
      kind: "disclaimer",
      text: "Verification confirms who you are. It is not an assessment of any trade you post.",
    },
  ],
});

const connection_requested: Builder<"connection_requested"> = (d) => ({
  subject: `A member wants to connect on ${d.listing.ref}`,
  preheader: "Review the request in Ponte. You stay anonymous until you accept.",
  reason: "listing_owner",
  blocks: [
    { kind: "title", text: "Someone wants to connect." },
    {
      kind: "lead",
      text: "A verified member has asked to connect on your listing. You stay anonymous to each other until you accept.",
    },
    {
      kind: "metadata",
      rows: [
        { label: "Listing", value: d.listing.title },
        { label: "Reference", value: d.listing.ref },
      ],
    },
    { kind: "button", label: "Review the request", href: route("/workspace") },
    {
      kind: "disclaimer",
      text: "Respond through Ponte so the introduction stays recorded and controlled.",
    },
  ],
});

const connection_accepted: Builder<"connection_accepted"> = (d) => ({
  subject: `You are connected on ${d.listing.ref}`,
  preheader: "Both sides accepted. Open the connection in Ponte.",
  reason: "listing_owner",
  blocks: [
    { kind: "title", text: "You are connected." },
    {
      kind: "lead",
      text: "Both sides agreed to connect. The conversation continues in Ponte, where it stays recorded.",
    },
    {
      kind: "metadata",
      rows: [
        { label: "Listing", value: d.listing.title },
        { label: "Reference", value: d.listing.ref },
        ...(d.counterpartyName
          ? [{ label: "Counterparty", value: d.counterpartyName }]
          : []),
        { label: "Contact", value: d.counterpartyEmail },
      ],
    },
    { kind: "button", label: "Open in Ponte", href: route("/workspace") },
    {
      kind: "disclaimer",
      text: "Ponte records every introduction. Continuing in Ponte keeps the deal documented.",
    },
  ],
});

const verification_decision: Builder<"verification_decision"> = (d) => {
  const title: Record<typeof d.decision, string> = {
    verified: "Your verification is confirmed.",
    rejected: "Ponte could not confirm this verification.",
    documents: "Ponte needs more to finish this.",
  };
  const lead: Record<typeof d.decision, string> = {
    verified:
      "A person at the desk reviewed the sources and confirmed the record. Your business verification now shows on your account.",
    rejected:
      "A person at the desk reviewed the sources and could not confirm the record as submitted. This is usually about details that do not match the public register rather than the company itself.",
    documents:
      "A person at the desk read the case and needs more from you before it can be decided. Add the documents described below in Ponte and the case returns to the queue.",
  };
  return {
    subject: `Verification ${d.decision === "verified" ? "confirmed" : d.decision === "rejected" ? "not confirmed" : "needs more documents"}: ${d.subjectName}`,
    preheader: `${d.subjectName} — ${d.decision === "verified" ? "confirmed" : "action needed"}.`,
    reason: "account",
    blocks: [
      { kind: "title", text: title[d.decision] },
      {
        kind: "status",
        tone: d.decision === "verified" ? "published" : d.decision === "rejected" ? "paused" : "action",
        label: d.decision === "verified" ? "Confirmed" : d.decision === "rejected" ? "Not confirmed" : "Action needed",
      },
      { kind: "paragraph", text: salutation(d.identity) },
      { kind: "lead", text: lead[d.decision] },
      { kind: "metadata", rows: [{ label: "Subject", value: d.subjectName }] },
      ...(d.note ? ([{ kind: "panel", heading: "From the desk", body: d.note }] as EmailBlock[]) : []),
      { kind: "button", label: "Open verification", href: route("/verify") },
      ...(d.disclaimer ? ([{ kind: "disclaimer", text: d.disclaimer }] as EmailBlock[]) : []),
    ],
    securityNote: true,
  };
};

const operator_alert: Builder<"operator_alert"> = (d) => ({
  subject: d.subject,
  preheader: d.body.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 140),
  reason: "internal_alert",
  blocks: [
    { kind: "title", text: d.subject },
    // Callers historically passed an HTML fragment. It is rendered as TEXT in a
    // panel: an operator alert is not a place to accept markup from a pipeline.
    { kind: "panel", body: d.body.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]*>/g, "") },
    ...(d.actionPath
      ? ([{ kind: "button", label: d.actionLabel || "Open", href: route(d.actionPath) }] as EmailBlock[])
      : []),
  ],
  securityNote: true,
});

const publication_digest: Builder<"publication_digest"> = (d) => ({
  subject: `Ponte publication summary — ${d.periodLabel}`,
  preheader: `${d.published.length} published, ${d.needsInformation} incomplete, ${d.flagged} flagged.`,
  reason: "digest",
  blocks: [
    { kind: "title", text: `Publication summary — ${d.periodLabel}` },
    {
      kind: "metadata",
      rows: [
        { label: "Published", value: String(d.published.length) },
        { label: "Needs information", value: String(d.needsInformation) },
        { label: "Flagged for review", value: String(d.flagged) },
      ],
    },
    ...(d.published.length
      ? ([
          { kind: "divider" },
          { kind: "list", items: d.published.map((p) => `${p.ref} — ${p.title}`) },
        ] as EmailBlock[])
      : []),
    { kind: "button", label: "Open the exception console", href: route("/admin/listings") },
    {
      kind: "disclaimer",
      text: "Routine publication is summarised here rather than emailed one message at a time. Flagged listings and abuse reports alert immediately.",
    },
  ],
  securityNote: true,
});

/** The registry. Every outbound Ponte email resolves through this map. */
export const TEMPLATES: { [K in TemplateName]: Builder<K> } = {
  listing_published,
  listing_needs_information,
  listing_flagged_internal,
  listing_flagged_member,
  listing_suspended,
  listing_rejected,
  listing_expiring,
  welcome,
  connection_requested,
  connection_accepted,
  verification_decision,
  operator_alert,
  publication_digest,
};

export const TEMPLATE_NAMES = Object.keys(TEMPLATES) as TemplateName[];
