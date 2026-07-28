// Render every transactional email to disk for review.
//
//   npm run email:preview          all templates
//   npm run email:preview welcome  one template
//
// Writes HTML and .txt to .email-preview/ (git-ignored) and prints an index.
//
// It uses FIXTURES, never production data. That is not a convenience: a preview
// tool that reads real rows puts member commercial information and counterparty
// addresses into files on a developer's laptop, and there is no reason for it
// to. The fixtures deliberately include the awkward cases — a long product
// name, a missing company, several validation issues at once, a decimal
// quantity, a range quantity, a flagged listing — because those are the ones
// that break a layout, and a preview that only shows the happy path proves
// nothing.

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { renderTransactionalEmail } from "../lib/email/render";
import { TEMPLATE_NAMES, type TemplateName } from "../lib/email/templates";

const OUT = ".email-preview";

const IDENTITY = { name: "Giuseppe Funaro", company: "1402 Celsius Ltd", email: "giuseppe@example.com" };
/** A member with no name and no company: the neutral-salutation path. */
const ANONYMOUS = { name: null, company: null, email: "trader@example.com" };

const LISTING = { ref: "PT-0102", id: "8f2c1a44-0000-4000-8000-000000000001", title: "Refined sugar ICUMSA 45", quantity: "25,000 MT per month" };
/** A title long enough to wrap on a 390px viewport. */
const LONG_LISTING = {
  ref: "PT-0417",
  id: "8f2c1a44-0000-4000-8000-000000000002",
  title: "Sustainably sourced Robusta green coffee beans, screen 18, moisture below 12.5 per cent, EUDR-compliant documentation available",
  quantity: "500–1,000 MT",
};
/** A decimal quantity, which the retired parser could not survive. */
const DECIMAL_LISTING = { ref: "PT-0533", id: "8f2c1a44-0000-4000-8000-000000000003", title: "Saffron, Grade I", quantity: "12.5 kg" };

const FIXTURES: Record<string, { template: TemplateName; data: unknown }> = {
  listing_published: {
    template: "listing_published",
    data: { identity: IDENTITY, listing: LISTING, completenessScore: 72, completenessBand: "Complete", recommendationCount: 3 },
  },
  "listing_published--decimal-quantity-no-recommendations": {
    template: "listing_published",
    data: { identity: ANONYMOUS, listing: DECIMAL_LISTING, completenessScore: 91, completenessBand: "Highly detailed", recommendationCount: 0 },
  },
  "listing_published--long-title-range-quantity": {
    template: "listing_published",
    data: { identity: IDENTITY, listing: LONG_LISTING, completenessScore: 48, completenessBand: "Basic", recommendationCount: 7 },
  },
  listing_needs_information: {
    template: "listing_needs_information",
    data: {
      identity: IDENTITY, listing: LISTING,
      blockingIssues: ["State your payment terms, or that they are to be agreed."],
    },
  },
  "listing_needs_information--many-issues": {
    template: "listing_needs_information",
    data: {
      identity: ANONYMOUS, listing: LONG_LISTING,
      blockingIssues: [
        "Complete your business verification. Ponte publishes member opportunities from verified businesses only.",
        "State the quantity, or that it is negotiable or available on request.",
        "Add the unit for the quantity you stated.",
        "State your payment terms, or that they are to be agreed.",
        "State how long this listing stays open.",
        "State your role in this trade.",
        "Accept the listing declaration confirming the information is accurate and that you are authorised to submit it.",
      ],
    },
  },
  listing_flagged_internal: {
    template: "listing_flagged_internal",
    data: {
      // The missing-company case, on the template where the mapping defect lived.
      identity: ANONYMOUS, listing: LISTING, listingType: "offer", status: "flagged", severity: "high",
      flags: [
        { code: "restricted_goods", detail: 'Listing text names a restricted or controlled category: "dual-use".' },
        { code: "suspicious_link", detail: 'Listing text contains a link that cannot be safely resolved: "https://bit.ly/3xQ".' },
      ],
      createdAt: "2026-07-28T09:14:00Z",
    },
  },
  listing_flagged_member: {
    template: "listing_flagged_member",
    data: { identity: IDENTITY, listing: LISTING, reason: "This listing mentions a category or destination that Ponte checks by hand before publication." },
  },
  listing_suspended: {
    template: "listing_suspended",
    data: { identity: IDENTITY, listing: LISTING, reason: "A counterparty reported that the stated quantity was not available on the terms published." },
  },
  listing_rejected: {
    template: "listing_rejected",
    data: { identity: IDENTITY, listing: LISTING, note: "The third party named in the uploaded document could not confirm the mandate." },
  },
  listing_expiring: { template: "listing_expiring", data: { identity: IDENTITY, listing: LISTING, daysRemaining: 3 } },
  welcome: { template: "welcome", data: { identity: IDENTITY } },
  "welcome--no-name": { template: "welcome", data: { identity: ANONYMOUS } },
  connection_requested: { template: "connection_requested", data: { listing: LISTING } },
  connection_accepted: {
    template: "connection_accepted",
    data: { listing: LISTING, counterpartyName: "Acme Trading BV", counterpartyEmail: "buyer@example.com" },
  },
  verification_decision: {
    template: "verification_decision",
    data: { identity: IDENTITY, decision: "verified", subjectName: "1402 Celsius Ltd", note: null, disclaimer: "Verification confirms identity, not commercial standing." },
  },
  "verification_decision--documents": {
    template: "verification_decision",
    data: { identity: IDENTITY, decision: "documents", subjectName: "1402 Celsius Ltd", note: "A certificate of incorporation dated within 90 days.", disclaimer: null },
  },
  operator_alert: {
    template: "operator_alert",
    data: { subject: "Sanctions list refresh failed", body: "The OFAC SDN fetch returned 503 on three consecutive attempts.\nLast success: 27 July 2026, 03:00 UTC.", actionPath: "/admin/verifications", actionLabel: "Open verifications" },
  },
  publication_digest: {
    template: "publication_digest",
    data: {
      published: [
        { ref: "PT-0102", title: "Refined sugar ICUMSA 45" },
        { ref: "PT-0103", title: "Customs brokerage, EU inbound" },
      ],
      needsInformation: 4, flagged: 1, periodLabel: "28 July 2026",
    },
  },
};

function main(): void {
  const only = process.argv[2];
  const names = Object.keys(FIXTURES).filter((n) => !only || n.startsWith(only));
  if (!names.length) {
    console.error(`No fixture matches "${only}".`);
    console.error(`Templates: ${TEMPLATE_NAMES.join(", ")}`);
    process.exitCode = 1;
    return;
  }

  mkdirSync(OUT, { recursive: true });
  const index: string[] = [];

  for (const name of names) {
    const { template, data } = FIXTURES[name];
    const out = renderTransactionalEmail({ template, data: data as never });
    writeFileSync(join(OUT, `${name}.html`), out.html, "utf8");
    writeFileSync(join(OUT, `${name}.txt`), out.text, "utf8");
    index.push(
      `<li><a href="${name}.html">${name}</a> — <code>${out.subject}</code> ` +
      `<a href="${name}.txt">[text]</a></li>`,
    );
    console.log(`${name}\n  subject: ${out.subject}\n  html: ${OUT}/${name}.html\n  text: ${OUT}/${name}.txt`);
  }

  // A 390px frame, because the Constitution requires mobile review at 390x844
  // and a preview opened at desktop width does not show what a member sees.
  writeFileSync(
    join(OUT, "index.html"),
    `<!DOCTYPE html><meta charset="utf-8"><title>Ponte email previews</title>
<style>body{font:14px/1.6 system-ui;margin:32px;max-width:900px}
code{background:#f2efe6;padding:1px 5px;border-radius:4px}
li{margin:.4em 0}</style>
<h1>Ponte transactional emails</h1>
<p>Fixtures only. No production data.</p>
<ul>${index.join("")}</ul>
<h2>Mobile, 390 × 844</h2>
${names.map((n) => `<p>${n}</p><iframe src="${n}.html" width="390" height="844" style="border:1px solid #ccc"></iframe>`).join("")}`,
    "utf8",
  );
  console.log(`\n${names.length} rendered. Open ${OUT}/index.html`);
}

main();
