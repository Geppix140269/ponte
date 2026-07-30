// Authentication and operational transactional email: the launch gate.
//
// Run: npx tsx lib/email/__tests__/auth-email.test.ts
//
// `email-system.test.ts` pins what the email SAYS — one shell, one plain-text
// part, identity fields in their own places, no reply-by-email, no unescaped
// value. It never reads the generated document as a document, so an email whose
// wording is perfect and whose header CSS is fused passes it.
//
// This suite reads the document. Six properties:
//
//   1. Every generated email parses strictly: tags close, attributes are quoted
//      and terminated, and no style declaration is fused into the one after it.
//   2. The header specifically. `padding:24px 32px;` is present as a complete
//      declaration, `padding:24px 32border-bottom` is absent, and both header
//      paragraphs are closed. Named literally because that is the string a
//      broken Ponte email was reported carrying, and a generic check that
//      happens to cover it can be weakened without anyone noticing this case
//      went with it.
//   3. The committed Supabase templates match their generator, so what a person
//      pastes into the dashboard is a file with a checksum rather than prose
//      reassembled by hand.
//   4. The authentication email carries a code and no sign-in link.
//   5. Sender identities are `Ponte Trade <auth@ponte.trade>` and
//      `Ponte Trade <hello@ponte.trade>`, never a bare address.
//   6. Nothing Ponte sends carries an open pixel or a rewritten link.
//
// On the incomplete-listing fixture in particular: it is the fixture a broken
// email was reported from, and it is also the worst case in the set — seven
// blocking issues, a title long enough to wrap, no member name, and a status
// pill, a list, a button and a disclaimer all in one body. If the reader is
// going to find a fused declaration anywhere, it is here.

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// Before any render: `appUrl()` reads this when it is called, and every URL
// asserted below is an absolute production one.
process.env.NEXT_PUBLIC_APP_URL = "https://ponte.trade";

import { auditEmailHtml, formatFindings, parseSenderIdentity } from "../audit";
import { renderTransactionalEmail } from "../render";
import { TEMPLATE_NAMES, type TemplateName } from "../templates";
import { wrapDocument } from "../shell";
import { renderBlocksHtml } from "../blocks";
import { EMAIL_SPACE } from "../tokens";
import { senderIdentity, OPERATIONAL_ADDRESS } from "../send";
import {
  authEmail,
  AUTH_SENDER_IDENTITY,
  OPERATIONAL_SENDER_IDENTITY,
  OTP_EXPIRY_MINUTES,
  OTP_EXPIRY_SECONDS,
  SUPABASE_LINK_VARIABLE,
  SUPABASE_TEMPLATE_NAMES,
  SUPABASE_TOKEN_VARIABLE,
} from "../auth-templates";

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

/** Assert a document is structurally clean, and say exactly why if it is not. */
function assertClean(label: string, html: string): void {
  const findings = auditEmailHtml(html);
  assert.equal(
    findings.length,
    0,
    `${label} has ${findings.length} structural finding(s):\n${formatFindings(findings)}`,
  );
}

/* ------------------------------------------------------------------ */
/* The fixture                                                         */
/* ------------------------------------------------------------------ */

/**
 * The incomplete-listing fixture, verbatim from `scripts/email-preview.ts`.
 *
 * Copied rather than imported because the preview script is a CLI with a
 * top-level `main()`: importing it would run it and write files. The values are
 * asserted to be the awkward ones — a seven-issue list, no name, a long title —
 * so a future edit to the preview fixtures cannot quietly make this test easy.
 */
const INCOMPLETE_LISTING = {
  identity: { name: null, company: null, email: "trader@example.com" },
  listing: {
    ref: "PT-0417",
    id: "8f2c1a44-0000-4000-8000-000000000002",
    title:
      "Sustainably sourced Robusta green coffee beans, screen 18, moisture " +
      "below 12.5 per cent, EUDR-compliant documentation available",
    quantity: "500–1,000 MT",
  },
  blockingIssues: [
    "Complete your business verification. Ponte publishes member opportunities from verified businesses only.",
    "State the quantity, or that it is negotiable or available on request.",
    "Add the unit for the quantity you stated.",
    "State your payment terms, or that they are to be agreed.",
    "State how long this listing stays open.",
    "State your role in this trade.",
    "Accept the listing declaration confirming the information is accurate and that you are authorised to submit it.",
  ],
} as const;

const incomplete = () =>
  renderTransactionalEmail({
    template: "listing_needs_information",
    data: INCOMPLETE_LISTING as never,
  });

/* ---- 1. the fixture, read as a document ---------------------------------- */

test("the incomplete-listing email is a structurally clean document", () => {
  const { html } = incomplete();
  assertClean("listing_needs_information", html);
});

test("the fixture is the awkward case, not a happy path", () => {
  assert.equal(INCOMPLETE_LISTING.blockingIssues.length, 7, "seven blocking issues");
  assert.equal(INCOMPLETE_LISTING.identity.name, null, "no member name");
  assert.ok(INCOMPLETE_LISTING.listing.title.length > 100, "a title long enough to wrap");
  const { html } = incomplete();
  for (const issue of INCOMPLETE_LISTING.blockingIssues) {
    assert.ok(html.includes(issue), `the body prints the issue: ${issue.slice(0, 40)}…`);
  }
});

/**
 * One data bag wide enough to render every template.
 *
 * A template ignores the keys it does not use, so the same object drives the
 * structural sweep and the footer-link sweep below.
 */
const REP_DATA: Record<string, unknown> = {
  identity: { name: "Giuseppe Funaro", company: "1402 Celsius Ltd", email: "g@example.com" },
  listing: { ref: "PT-0102", id: "id", title: "Refined sugar ICUMSA 45", quantity: "25,000 MT" },
  blockingIssues: ["State your payment terms, or that they are to be agreed."],
  completenessScore: 72, completenessBand: "Complete", recommendationCount: 3,
  listingType: "offer", status: "flagged", severity: "high",
  flags: [{ code: "restricted_goods", detail: 'Names a restricted category: "dual-use".' }],
  createdAt: "2026-07-28T09:14:00Z",
  reason: "A counterparty reported the stated quantity was unavailable.",
  note: "The mandate could not be confirmed.", daysRemaining: 3,
  counterpartyName: "Acme Trading BV", counterpartyEmail: "buyer@example.com",
  decision: "verified", subjectName: "1402 Celsius Ltd", disclaimer: "Identity, not standing.",
  subject: "Sanctions list refresh failed", body: "OFAC SDN returned 503.",
  actionPath: "/admin/verifications", actionLabel: "Open verifications",
  published: [{ ref: "PT-0102", title: "Refined sugar ICUMSA 45" }],
  needsInformation: 4, flagged: 1, periodLabel: "28 July 2026",
};

test("every template renders a structurally clean document", () => {
  // The fixture above is one body. The shell is shared, so a fusion in the
  // header would show up in all of them — but a fusion in a BLOCK shows up only
  // in the templates that use that block, and the code block is new.
  for (const name of TEMPLATE_NAMES as readonly TemplateName[]) {
    const out = renderTransactionalEmail({ template: name, data: REP_DATA as never });
    assertClean(name, out.html);
  }
});

test("no email depends on its <style> block to be a legible document", () => {
  // The Gmail apps strip <head> for a non-Google mailbox and Outlook on Windows
  // ignores media queries entirely, so for a large share of recipients the
  // stylesheet is simply not there. Every layout-critical declaration has to be
  // inline; the block may only refine. Asserted by removing it.
  for (const [label, html] of [
    ["listing_needs_information", incomplete().html],
    ["auth-otp", authEmail().html],
  ] as const) {
    const stripped = html.replace(/<style[\s\S]*?<\/style>/i, "");
    assert.ok(stripped.length < html.length, `${label}: the block was found and removed`);
    assertClean(`${label} without its <style> block`, stripped);

    // The four declarations that carry the card: its ground, its border, the
    // header padding and the body padding. All four must survive inline.
    for (const declaration of [
      "padding:24px 32px;border-bottom:1px solid ",
      "padding:32px",
      'class="p-outer" align="center" style="padding:32px 16px"',
      "background:#FFFFFF;border:1px solid ",
    ]) {
      assert.ok(
        stripped.includes(declaration),
        `${label} without its stylesheet must still carry "${declaration}" inline`,
      );
    }
  }
});

/* ---- 2. the header declaration, by name ---------------------------------- */

test("the header carries padding:24px 32px; as a complete declaration", () => {
  const { html } = incomplete();

  assert.equal(EMAIL_SPACE.lg, 24, "the token behind the first value");
  assert.equal(EMAIL_SPACE.xl, 32, "the token behind the second value");

  assert.ok(
    html.includes("padding:24px 32px;border-bottom:1px solid "),
    "the header cell opens padding:24px 32px; and then border-bottom, with the separator intact",
  );
  assert.ok(
    html.includes("padding:24px 32px;border-top:1px solid "),
    "the footer cell does the same",
  );
});

test("the header does not carry the fused declaration", () => {
  const { html } = incomplete();
  // The literal reported from a broken Ponte email. Named so that no future
  // loosening of the generic reader can silently take this case with it.
  assert.ok(
    !html.includes("padding:24px 32border-bottom"),
    "padding:24px 32border-bottom must not appear",
  );
  assert.ok(
    !/padding:\s*\d+px\s+\d+[a-z-]{3,}/i.test(html),
    "no padding value anywhere ends in a number wearing a property name",
  );
});

test("both header paragraphs are opened and closed", () => {
  const { html } = incomplete();
  const header = html.slice(
    html.indexOf("border-bottom:1px solid"),
    html.indexOf("</td></tr>", html.indexOf("border-bottom:1px solid")),
  );
  assert.ok(header.includes(">Ponte Trade</p>"), "the wordmark paragraph is closed");
  assert.ok(
    header.includes(">Cross-border trade, with greater clarity.</p>"),
    "the brand-line paragraph is closed",
  );
  assert.equal(
    (header.match(/<p /g) ?? []).length,
    (header.match(/<\/p>/g) ?? []).length,
    "the header opens and closes the same number of paragraphs",
  );
  assert.equal((header.match(/<\/p>/g) ?? []).length, 2, "exactly two header paragraphs");
});

test("the reader actually catches the fusion it exists for", () => {
  // Proof in the other direction. A check that has never failed is a check
  // nobody has reason to believe, so the defect is reintroduced here and the
  // reader must name it.
  const broken = wrapDocument({
    title: "Complete your Ponte offer to publish it",
    preheader: "A few required details are still missing.",
    bodyHtml: renderBlocksHtml([{ kind: "paragraph", text: "Body." }]),
    reason: "listing_owner",
  }).replace("padding:24px 32px;border-bottom", "padding:24px 32border-bottom");

  const findings = auditEmailHtml(broken);
  assert.ok(findings.length > 0, "the reader must not pass the fused document");
  assert.ok(
    findings.some((f) => f.message.includes("32border-bottom")),
    `a finding must name the fused token; got:\n${formatFindings(findings)}`,
  );

  // And the same for a dropped closing tag, which is the other reported symptom.
  const unclosed = wrapDocument({
    title: "t", preheader: "p",
    bodyHtml: renderBlocksHtml([{ kind: "paragraph", text: "Body." }]),
    reason: "account",
  }).replace(">Ponte Trade</p>", ">Ponte Trade");
  const unclosedFindings = auditEmailHtml(unclosed);
  assert.ok(
    // Either phrasing is correct and both name the paragraph: a dropped `</p>`
    // surfaces at the `</td>` that follows it, because that is the first tag
    // that cannot be reconciled with a `<p>` still being open.
    unclosedFindings.some(
      (f) => /<p> is still open|<p> is never closed/.test(f.message),
    ),
    `an unclosed paragraph must be reported and must name <p>; got:\n${formatFindings(unclosedFindings)}`,
  );

  // And for an attribute whose quote was lost, which is what a truncated paste
  // into a dashboard form produces.
  const unquoted = wrapDocument({
    title: "t", preheader: "p",
    bodyHtml: renderBlocksHtml([{ kind: "paragraph", text: "Body." }]),
    reason: "account",
  }).replace('style="padding:24px 32px;border-top', "style=padding:24px 32px;border-top");
  assert.ok(
    auditEmailHtml(unquoted).some((f) => f.message.includes("unquoted value")),
    "an unquoted attribute value must be reported",
  );
});

/* ---- 3. the committed Supabase templates -------------------------------- */

const TEMPLATE_DIR = join("supabase", "templates");
const read = (name: string) => readFileSync(join(TEMPLATE_DIR, name), "utf8");
const sha256 = (s: string) => createHash("sha256").update(s, "utf8").digest("hex");

test("the committed Supabase template matches its generator byte for byte", () => {
  const email = authEmail();
  assert.equal(
    read("auth-otp.html"),
    email.html,
    "supabase/templates/auth-otp.html is stale — run npm run auth:templates",
  );
  assert.equal(
    read("auth-otp.txt"),
    email.text,
    "supabase/templates/auth-otp.txt is stale — run npm run auth:templates",
  );
});

test("the committed README records the checksum of the file it ships beside", () => {
  const email = authEmail();
  const doc = read("README.md");
  assert.ok(
    doc.includes(sha256(email.html)),
    "the README's SHA-256 for auth-otp.html must match the file",
  );
  assert.ok(doc.includes(`\`${OTP_EXPIRY_SECONDS}\``), "the README states the dashboard expiry value");
  for (const name of SUPABASE_TEMPLATE_NAMES) {
    assert.ok(doc.includes(name), `the README names the ${name} dashboard template`);
  }
});

test("the Supabase template is a structurally clean document", () => {
  assertClean("auth-otp.html", read("auth-otp.html"));
});

test("the Supabase template carries the same header declaration as every other email", () => {
  const html = read("auth-otp.html");
  assert.ok(
    html.includes("padding:24px 32px;border-bottom:1px solid "),
    "the pasted header must not be the fused one either",
  );
  assert.ok(!html.includes("padding:24px 32border-bottom"), "and must not be fused");
  assert.ok(html.includes(">Ponte Trade</p>"), "the wordmark paragraph is closed");
  assert.ok(
    html.includes(">Cross-border trade, with greater clarity.</p>"),
    "the canonical brand line is present and closed",
  );
});

test("the Supabase template contains no Go action other than the declared variables", () => {
  const html = read("auth-otp.html");
  const actions = html.match(/\{\{[^}]*\}\}/g) ?? [];
  assert.deepEqual(
    actions,
    [SUPABASE_TOKEN_VARIABLE],
    `the only template action must be ${SUPABASE_TOKEN_VARIABLE}; found ${JSON.stringify(actions)}`,
  );
  // The shell's media query puts braces in a <style> block. An accidental "{{"
  // there would be read by Supabase as an action and would corrupt the CSS.
  assert.ok(!/\{\{(?!\s*\.)/.test(html), "no accidental {{ outside a declared variable");
});

/* ---- 4. a code, never a link -------------------------------------------- */

test("the authentication email delivers a code and no sign-in link", () => {
  const { html, text, subject } = authEmail();

  assert.ok(html.includes(SUPABASE_TOKEN_VARIABLE), "the code variable is present");
  assert.ok(
    !html.includes(SUPABASE_LINK_VARIABLE),
    `${SUPABASE_LINK_VARIABLE} must never appear: a link reopens the redirect flow ` +
    "that put one member on another member's account",
  );
  assert.ok(!/\.ConfirmationURL|\.TokenHash|\.RedirectTo/.test(html), "no link-flow variable at all");

  // No anchor may lead anywhere but ponte.trade, and none may carry the code.
  const hrefs = Array.from(html.matchAll(/href="([^"]*)"/g)).map((m) => m[1]);
  assert.ok(hrefs.length > 0, "the footer names the operator");
  for (const href of hrefs) {
    assert.ok(
      href.startsWith("https://ponte.trade"),
      `every link must be an absolute ponte.trade URL; found ${href}`,
    );
    assert.ok(!href.includes("Token"), `no link may carry the code; found ${href}`);
  }

  assert.ok(text.includes(SUPABASE_TOKEN_VARIABLE), "the reference text carries the code too");
  assert.equal(subject, "Your Ponte Trade sign-in code");
});

test("the stated expiry is the one the dashboard is instructed to use", () => {
  const { html, text } = authEmail();
  assert.equal(OTP_EXPIRY_SECONDS, OTP_EXPIRY_MINUTES * 60);
  assert.ok(
    html.includes(`expires in ${OTP_EXPIRY_MINUTES} minutes`),
    "the email states the expiry from the shared constant",
  );
  assert.ok(text.includes(`expires in ${OTP_EXPIRY_MINUTES} minutes`), "and so does the text");
  // The email must not name a second, different duration.
  const durations = new Set(
    Array.from(html.matchAll(/(\d+)\s*(minute|minutes|hour|hours)\b/g)).map((m) => `${m[1]} ${m[2]}`),
  );
  assert.deepEqual(
    Array.from(durations),
    [`${OTP_EXPIRY_MINUTES} minutes`],
    `the email must state exactly one duration; found ${JSON.stringify(Array.from(durations))}`,
  );
});

test("the authentication email carries the phishing note and no account-only link", () => {
  const { html } = authEmail();
  assert.ok(
    html.includes("will never ask you for your password, a payment detail or a verification code"),
    "the security note is present on a security email",
  );
  assert.ok(
    !html.includes("/account/notifications"),
    "a reader who is not signed in is not offered a page behind the account wall",
  );
});

test("the authentication email prints no address where a name belongs", () => {
  const { html } = authEmail();
  assert.ok(!html.includes("{{ .Email }}"), "the address is not interpolated into the body");
  assert.ok(!/Hello\s*[,{]/.test(html), "no salutation with nothing to salute");
});

/* ---- footer links: no email may link the dead notifications route -------- */

test("no application email links the non-existent /account/notifications route", () => {
  // Nothing under app/ serves /account/notifications, so a footer link to it
  // 404s. It was removed from the member footer — repointing would need a real
  // preferences page (PL-021). Asserted across every template, HTML and text.
  for (const name of TEMPLATE_NAMES as readonly TemplateName[]) {
    const out = renderTransactionalEmail({ template: name, data: REP_DATA as never });
    assert.ok(
      !out.html.includes("/account/notifications"),
      `${name} HTML must not link the dead notifications route`,
    );
    assert.ok(
      !out.text.includes("/account/notifications"),
      `${name} text must not link the dead notifications route`,
    );
    assert.ok(
      !/Notification preferences/i.test(out.html) && !/Notification preferences/i.test(out.text),
      `${name} must not offer "Notification preferences" while no such page exists`,
    );
  }
});

test("application email footers keep Privacy and Terms, which resolve", () => {
  // Removing the dead link must not remove the two that work. Both are on the
  // member footer, both point at real routes.
  const out = renderTransactionalEmail({
    template: "listing_needs_information",
    data: INCOMPLETE_LISTING as never,
  });
  for (const [label, href] of [
    ["Privacy", "/legal/privacy"],
    ["Terms", "/legal/terms"],
  ] as const) {
    assert.ok(out.html.includes(`>${label}</a>`), `the member footer keeps the ${label} link`);
    assert.ok(
      out.html.includes(`https://ponte.trade${href}`),
      `${label} points at ${href}`,
    );
    assert.ok(
      out.text.includes(`${label}: https://ponte.trade${href}`),
      `${label} is in the text part too`,
    );
  }
});

test("the authentication footer carries neither preference nor legal links", () => {
  // footerLinks: "none" — the reader is not signed in, so no account or legal
  // links at all. The phishing note, the reason and the operator line remain.
  const { html } = authEmail();
  assert.ok(!html.includes("/account/notifications"), "no notifications link");
  assert.ok(
    !html.includes("/legal/privacy") && !html.includes("/legal/terms"),
    "no legal links on a not-signed-in reader's email either",
  );
});

/* ---- 5. sender identity -------------------------------------------------- */

test("both sender identities are Ponte Trade with an angle-bracketed address", () => {
  for (const [label, value, expected] of [
    ["authentication", AUTH_SENDER_IDENTITY, "auth@ponte.trade"],
    ["operational", OPERATIONAL_SENDER_IDENTITY, "hello@ponte.trade"],
  ] as const) {
    const parsed = parseSenderIdentity(value);
    assert.ok(parsed, `${label} identity must parse: ${value}`);
    assert.equal(parsed!.displayName, "Ponte Trade", `${label} display name`);
    assert.equal(parsed!.address, expected, `${label} address`);
  }
});

test("the send path never falls back to a bare address", () => {
  assert.equal(senderIdentity(undefined), OPERATIONAL_SENDER_IDENTITY, "unset");
  assert.equal(senderIdentity(""), OPERATIONAL_SENDER_IDENTITY, "empty");
  assert.equal(senderIdentity("   "), OPERATIONAL_SENDER_IDENTITY, "whitespace");
  assert.equal(
    senderIdentity(OPERATIONAL_ADDRESS),
    OPERATIONAL_SENDER_IDENTITY,
    "a bare address in the environment is wrapped, not sent as it stands",
  );
  assert.equal(
    senderIdentity("desk@ponte.trade"),
    "Ponte Trade <desk@ponte.trade>",
    "a different bare address keeps the brand display name",
  );
  assert.equal(
    senderIdentity("Ponte Desk <desk@ponte.trade>"),
    "Ponte Desk <desk@ponte.trade>",
    "a deliberate full identity is honoured verbatim",
  );
  for (const value of [undefined, "", OPERATIONAL_ADDRESS, "desk@ponte.trade"] as const) {
    assert.ok(
      parseSenderIdentity(senderIdentity(value)),
      `whatever the environment says, the result parses: ${String(value)}`,
    );
  }
});

test("the identity parser refuses the shapes that caused the defect", () => {
  for (const bad of [
    "hello@ponte.trade",
    "Ponte Trade",
    "<hello@ponte.trade>",
    " <hello@ponte.trade>",
    "Ponte Trade <hello@ponte>",
    "Ponte <Trade> <hello@ponte.trade>",
  ]) {
    assert.equal(parseSenderIdentity(bad), null, `must be refused: ${JSON.stringify(bad)}`);
  }
});

/* ---- 6. no tracking ------------------------------------------------------ */

test("nothing Ponte sends carries an open pixel or a rewritten link", () => {
  const documents: [string, string][] = [
    ["auth-otp.html", read("auth-otp.html")],
    ["listing_needs_information", incomplete().html],
  ];

  for (const [label, html] of documents) {
    // An open pixel is a 1x1 image. Ponte's emails contain no images at all —
    // the wordmark is text so a client with images blocked still shows a
    // branded email — so any <img> is either a pixel or a regression.
    assert.ok(!/<img\b/i.test(html), `${label} contains no image, so no open pixel`);

    // Click tracking works by rewriting every href to the provider's domain.
    // A link that does not point at ponte.trade is either tracked or wrong.
    for (const m of Array.from(html.matchAll(/href="([^"]*)"/g))) {
      const href = m[1];
      if (href.startsWith("mailto:") || href === "#") continue;
      assert.ok(
        href.startsWith("https://ponte.trade"),
        `${label}: every link must point at ponte.trade, not a tracking host; found ${href}`,
      );
      assert.ok(
        !/utm_|\?ref=|click\.|track|redirect|resend\.dev|\/ss\/c\//i.test(href),
        `${label}: no tracking parameter or redirector; found ${href}`,
      );
    }
  }
});

test("the send path adds no tracking option to the provider call", () => {
  // Resend's open and click tracking is a setting on the sending DOMAIN, not a
  // per-send flag, so the repository cannot turn it off — it can only prove it
  // asks for nothing. `docs/email-provider-template-configuration.md` records
  // the dashboard state as a manual production action, and this asserts the
  // code side: the send call names five fields and none of them is tracking.
  const source = readFileSync(join("lib", "email", "send.ts"), "utf8");
  const call = source.slice(source.indexOf("resend.emails.send("));
  const body = call.slice(0, call.indexOf("});"));
  assert.ok(body.includes("from:") && body.includes("to:"), "the call was found");
  for (const forbidden of ["trackOpens", "trackClicks", "track_opens", "track_clicks"]) {
    assert.ok(!body.includes(forbidden), `the send call must not set ${forbidden}`);
  }
  assert.deepEqual(
    Array.from(body.matchAll(/^\s{8}(\w+):/gm)).map((m) => m[1]),
    ["from", "to", "subject", "html", "text"],
    "the send call passes exactly these five fields",
  );
});

/* ------------------------------------------------------------------ */

if (process.exitCode) {
  console.error(`\n${passed} assertion group(s) passed before the failure above.`);
} else {
  console.log(`auth-email.test.ts: ${passed} assertion groups passed.`);
}
