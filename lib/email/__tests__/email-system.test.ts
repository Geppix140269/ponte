// The transactional email system.
//
// Run: npx tsx lib/email/__tests__/email-system.test.ts
//
// Four properties are pinned here, each of which was violated by the templates
// this system replaces:
//
//   1. Every email has a plain-text part that says what the HTML says.
//   2. Every email renders through the one shell, with no unapproved colour.
//   3. Member name, company, email and listing reference each land in their own
//      field. The retired path put the address in the name and the reference in
//      the company.
//   4. No template invites a reply by email or leaks an unescaped value.

import assert from "node:assert/strict";
import { renderTransactionalEmail } from "../render";
import { TEMPLATE_NAMES, type TemplateName } from "../templates";
import { memberIdentity, salutation, companyForOperator, nameForOperator } from "../identity";
import { EMAIL_COLOUR } from "../tokens";
import { BRAND_LINE } from "../shell";

let passed = 0;
function test(name: string, fn: () => void): void {
  try {
    fn();
    passed++;
  } catch (err) {
    console.error(`FAIL  ${name}`);
    console.error(`      ${(err as Error).message}`);
    process.exitCode = 1;
  }
}

const IDENTITY = { name: "Giuseppe Funaro", company: "1402 Celsius Ltd", email: "g@example.com" };
const LISTING = { ref: "PT-0102", id: "abc-123", title: "Refined sugar ICUMSA 45", quantity: "25,000 MT" };

/** One representative fixture per template, so every template is rendered. */
const FIXTURES: { [K in TemplateName]: unknown } = {
  listing_published: {
    identity: IDENTITY, listing: LISTING, completenessScore: 72,
    completenessBand: "Complete", recommendationCount: 3,
  },
  listing_needs_information: {
    identity: IDENTITY, listing: LISTING,
    blockingIssues: ["State your payment terms, or that they are to be agreed.", "Add the unit for the quantity you stated."],
  },
  listing_flagged_internal: {
    identity: IDENTITY, listing: LISTING, listingType: "offer", status: "flagged",
    severity: "high", flags: [{ code: "restricted_goods", detail: 'Names "ammunition".' }],
    createdAt: "2026-07-28T09:00:00Z",
  },
  listing_flagged_member: { identity: IDENTITY, listing: LISTING, reason: "This listing mentions a category Ponte checks by hand." },
  listing_suspended: { identity: IDENTITY, listing: LISTING, reason: "A counterparty reported the quantity as unavailable." },
  listing_rejected: { identity: IDENTITY, listing: LISTING, note: "The named third party could not be reached." },
  listing_expiring: { identity: IDENTITY, listing: LISTING, daysRemaining: 3 },
  welcome: { identity: IDENTITY },
  connection_requested: { listing: LISTING },
  connection_accepted: { listing: LISTING, counterpartyName: "Acme Trading", counterpartyEmail: "buyer@example.com" },
  verification_decision: { identity: IDENTITY, decision: "verified", subjectName: "1402 Celsius Ltd", note: null, disclaimer: null },
  operator_alert: { subject: "Sanctions list refresh failed", body: "OFAC SDN fetch returned 503.", actionPath: "/admin", actionLabel: "Open" },
  publication_digest: {
    published: [{ ref: "PT-0102", title: "Refined sugar" }], needsInformation: 2, flagged: 1, periodLabel: "28 July 2026",
  },
};

const renderAll = () =>
  TEMPLATE_NAMES.map((name) => ({
    name,
    out: renderTransactionalEmail({ template: name, data: FIXTURES[name] as never }),
  }));

// ---- 1. plain text ---------------------------------------------------------

test("every template produces a non-empty plain-text part", () => {
  for (const { name, out } of renderAll()) {
    assert.ok(out.text.trim().length > 80, `${name} has no usable text part`);
    assert.ok(!out.text.includes("<"), `${name} text part contains markup`);
  }
});

test("the text part carries the URL behind every button and link", () => {
  const { text } = renderTransactionalEmail({
    template: "listing_published", data: FIXTURES.listing_published as never,
  });
  // A plain-text reader gets the label AND the destination; a bare label is
  // unusable and a bare URL is unreadable.
  assert.match(text, /View your listing: https?:\/\//);
});

// ---- 2. one shell ----------------------------------------------------------

test("every template renders through the one shell", () => {
  for (const { name, out } of renderAll()) {
    assert.match(out.html, /^<!DOCTYPE html/, `${name} is not a full document`);
    assert.ok(out.html.includes("Ponte Trade"), `${name} lost the wordmark`);
    assert.ok(out.html.includes(BRAND_LINE), `${name} lost the brand line`);
    assert.ok(out.html.includes("1402 Celsius Ltd"), `${name} lost the footer`);
  }
});

test("the canonical brand line is used, not the retired verification claim", () => {
  const { html } = renderTransactionalEmail({ template: "welcome", data: FIXTURES.welcome as never });
  assert.equal(BRAND_LINE, "Cross-border trade, with greater clarity.");
  assert.ok(
    !/verified network for cross-border trade/i.test(html),
    "the retired tagline asserted verification as a property of the network",
  );
});

test("no template uses a colour outside the approved token file", () => {
  // The retired layout used #0F1E3C and #E8A020, neither of which appears in
  // any approved token file. The Constitution is explicit that there is no
  // amber in the system.
  const approved = new Set(Object.values(EMAIL_COLOUR).map((c) => c.toLowerCase()));
  for (const { name, out } of renderAll()) {
    // `&#847;` is a numeric character reference in the preheader padding, not a
    // colour, so an entity reference is excluded rather than counted.
    const hexes = out.html.match(/(?<!&)#[0-9a-fA-F]{3,8}\b/g) ?? [];
    for (const hex of hexes) {
      assert.ok(approved.has(hex.toLowerCase()), `${name} uses unapproved colour ${hex}`);
    }
  }
});

test("every template declares a subject and a preheader", () => {
  for (const { name, out } of renderAll()) {
    assert.ok(out.subject.trim().length > 5, `${name} has no real subject`);
    assert.ok(out.preheader.trim().length > 5, `${name} has no preheader`);
    // Generic subjects with no context are banned.
    assert.ok(
      !["Notification", "New submission", "Action required"].includes(out.subject.trim()),
      `${name} has a generic subject`,
    );
  }
});

test("no template renders an undefined or null token into the body", () => {
  for (const { name, out } of renderAll()) {
    assert.ok(!/\bundefined\b/.test(out.html), `${name} rendered undefined`);
    assert.ok(!/>\s*null\s*</.test(out.html), `${name} rendered null`);
    assert.ok(!/\[object Object\]/.test(out.html), `${name} rendered an object`);
  }
});

// ---- 3. identity mapping ---------------------------------------------------

test("the member name, company, email and reference each land in their own field", () => {
  const { html } = renderTransactionalEmail({
    template: "listing_flagged_internal", data: FIXTURES.listing_flagged_internal as never,
  });
  // The live defect: name showed "giuseppe@padelsitges.com" and company showed
  // "Marketplace listing PT-0102".
  assert.match(html, /Member<\/td><td[^>]*>Giuseppe Funaro/);
  assert.match(html, /Company<\/td><td[^>]*>1402 Celsius Ltd/);
  assert.match(html, /Email<\/td><td[^>]*>g@example\.com/);
  assert.match(html, /Reference<\/td><td[^>]*>PT-0102/);
});

test("a listing reference is never used as a company", () => {
  for (const { name, out } of renderAll()) {
    assert.ok(
      !/Company<\/td><td[^>]*>[^<]*PT-\d+/.test(out.html),
      `${name} put a listing reference in the company field`,
    );
    assert.ok(
      !/Marketplace listing PT-/.test(out.html),
      `${name} reproduced the retired company string`,
    );
  }
});

test("an email address is never printed as a member's name", () => {
  const id = memberIdentity({ email: "nobody@example.com" });
  assert.equal(id.name, null, "an address is not a name");
  assert.equal(salutation(id), "Hello,", "a nameless member gets a neutral greeting");
  assert.equal(salutation({ name: "Giuseppe" }), "Hello Giuseppe,");
});

test("a missing company is Not provided internally and is never fabricated", () => {
  const id = memberIdentity({ full_name: "Giuseppe", email: "g@example.com" });
  assert.equal(id.company, null);
  assert.equal(companyForOperator(id), "Not provided");
  // The address may stand in for an operator only, and is labelled as the
  // fallback it is.
  assert.match(nameForOperator({ name: null, company: null, email: "g@example.com" }), /Not provided/);
});

test("identity prefers a display name, then a full name, and never the address", () => {
  assert.equal(memberIdentity({ display_name: "Bepi", full_name: "Giuseppe" }).name, "Bepi");
  assert.equal(memberIdentity({ full_name: "Giuseppe" }).name, "Giuseppe");
  assert.equal(memberIdentity({ full_name: "   " }).name, null, "whitespace is not a name");
});

// ---- 4. copy and safety ----------------------------------------------------

test("no template invites a reply by email", () => {
  for (const { name, out } of renderAll()) {
    const body = `${out.html} ${out.text}`.toLowerCase();
    assert.ok(!body.includes("reply to this email"), `${name} pushes the conversation off Ponte`);
    assert.ok(!body.includes("just reply"), `${name} pushes the conversation off Ponte`);
  }
});

test("no member-facing template describes publication as verification", () => {
  const { html, text } = renderTransactionalEmail({
    template: "listing_published", data: FIXTURES.listing_published as never,
  });
  assert.match(text, /has not independently verified the commercial claims/i);
  assert.ok(!/ponte has verified/i.test(html));
});

test("the flagged alert does not offer a one-click approval", () => {
  const { html } = renderTransactionalEmail({
    template: "listing_flagged_internal", data: FIXTURES.listing_flagged_internal as never,
  });
  // A privileged state change reachable from an email link is reachable by
  // anybody who sees the email.
  assert.ok(!/>Approve</.test(html), "an unauthenticated approve control must not exist");
  assert.match(html, /Review flagged listing/);
  assert.match(html, /\/admin\/listings/);
});

test("the flagged member notice does not accuse", () => {
  const { text } = renderTransactionalEmail({
    template: "listing_flagged_member", data: FIXTURES.listing_flagged_member as never,
  });
  assert.match(text, /not a finding against you/i);
  for (const word of ["violation", "breach", "prohibited", "illegal"]) {
    assert.ok(!text.toLowerCase().includes(word), `an automated flag must not say "${word}"`);
  }
});

test("member-supplied values are escaped, not injected", () => {
  const { html } = renderTransactionalEmail({
    template: "listing_published",
    data: {
      ...(FIXTURES.listing_published as Record<string, unknown>),
      listing: { ...LISTING, title: '<script>alert("x")</script>' },
    } as never,
  });
  assert.ok(!html.includes("<script>"), "a product name must not become markup");
  assert.ok(html.includes("&lt;script&gt;"));
});

test("a non-http action path cannot become a live link", () => {
  const { html } = renderTransactionalEmail({
    template: "operator_alert",
    data: { subject: "Test", body: "Body", actionPath: "javascript:alert(1)", actionLabel: "Open" } as never,
  });
  assert.ok(!html.includes("javascript:"), "only http and https survive into an href");
});

test("no template links or attaches a member-uploaded document", () => {
  for (const { name, out } of renderAll()) {
    assert.ok(
      !/listing[-_]documents|\/storage\/v1\/object/.test(out.html),
      `${name} exposes uploaded material`,
    );
  }
});

console.log(`email/system: ${passed} passed`);
