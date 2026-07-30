// The Supabase Auth email templates, as committed code.
//
// Why they are code and not prose in a document
// ---------------------------------------------
// Supabase renders authentication email from templates that live in its
// dashboard. Nothing in this repository can write them, so the only way they
// reach production is a human copying HTML out of a document and pasting it into
// a web form. That is a real production action with a real failure mode, and it
// has no test on the far side of it: a template that arrives truncated or with a
// character lost is discovered by a member who cannot sign in, or by an email
// that renders wrong for everyone who receives it.
//
// `docs/email-provider-template-configuration.md` previously carried these
// templates as prose, and carried the bodies as FRAGMENTS with `style="..."`
// placeholders standing in for the real declarations. Those fragments are not
// pasteable: a person following the document had to reassemble each body from a
// list of styles further up the page, by hand, for every template. The one
// declaration a reader has to reconstruct most often is the header's
// `padding:24px 32px;border-bottom:1px solid …`, and a lost `px;` there fuses
// two declarations into one that every client silently discards.
//
// So the templates are generated here from the same tokens and the same shell as
// every other Ponte email, written to `supabase/templates/` as complete
// documents, checksummed, and audited by the same reader that audits the
// application mail. What a person pastes is a whole file, and whether the thing
// in the dashboard is still that file is a question with a checkable answer.
//
// What Supabase imposes, and what follows from it
// ----------------------------------------------
//   - HTML only. There is no plain-text part, so Ponte's "every email has a text
//     alternative" rule cannot be met here. It is a provider limitation, and it
//     is the reason `authEmailText()` exists: the text is generated and recorded
//     alongside the HTML so the wording is reviewable, even though Supabase will
//     not send it.
//   - No Reply-To. Recorded in `docs/platform/AUTH-EMAIL-SETUP.md` §3.
//   - `{{ .Token }}` must survive verbatim. It is the whole email.
//
// One template, both names
// -----------------------
// `signInWithOtp()` sends **Confirm signup** to an address Supabase has not seen
// before and **Magic Link** to one it has. The member did the same thing in both
// cases and is waiting for the same code, so both dashboard templates carry this
// one document and this one subject. Two wordings would mean a member's second
// sign-in looked different from their first for a reason that is about Supabase's
// bookkeeping and nothing to do with them.
//
// A code, never a link
// --------------------
// Neither template may contain `{{ .ConfirmationURL }}`. `lib/auth/use-otp.ts`
// requests a code with no `emailRedirectTo` and establishes the session with
// `verifyOtp` in the surface that asked for it; a link in the email would send
// the member back through the redirect flow that put one member on another
// member's account in July 2026, which is the defect that whole hook exists to
// end. The absence of a link is a security property, and it is asserted.

import { renderBlocksHtml, renderBlocksText, type EmailBlock } from "./blocks";
import { wrapDocument, footerText } from "./shell";

/** The Supabase variable that makes this a code email rather than a link email. */
export const SUPABASE_TOKEN_VARIABLE = "{{ .Token }}";

/** The variable that must never appear. A link is the retired flow. */
export const SUPABASE_LINK_VARIABLE = "{{ .ConfirmationURL }}";

/**
 * How long a code is valid, in minutes.
 *
 * This is the single source for both the sentence in the email and the value the
 * dashboard must be set to, because the two disagreeing is worse than either
 * value being wrong: a member told ten minutes and given one hour will not use
 * the extra time, and a member told one hour and given ten minutes types a code
 * that has expired and is told it is incorrect.
 *
 * Ten minutes, which is `600` in Supabase's **Email OTP Expiration** field. The
 * repository's earlier records disagreed — `docs/platform/AUTH-EMAIL-SETUP.md`
 * §4 instructed 600 seconds and said ten minutes, and
 * `docs/email-provider-template-configuration.md` said one hour without
 * instructing any setting. Ten minutes is the one an instruction was ever
 * written for, and it is the shorter, which is the safer way to be wrong about
 * the lifetime of a credential.
 */
export const OTP_EXPIRY_MINUTES = 10;

/** The dashboard value that corresponds to it. */
export const OTP_EXPIRY_SECONDS = OTP_EXPIRY_MINUTES * 60;

/** The sender identity Supabase's SMTP settings must carry. */
export const AUTH_SENDER_IDENTITY = "Ponte Trade <auth@ponte.trade>";

/** The sender identity every application-generated email carries. */
export const OPERATIONAL_SENDER_IDENTITY = "Ponte Trade <hello@ponte.trade>";

/**
 * The Supabase dashboard templates this file is the source for.
 *
 * `Reset Password`, `Change Email Address` and `Invite user` are deliberately
 * NOT here. Ponte has no password (the only sign-in is the code) and no
 * invitation flow in the launch scope, and a template pasted for a journey that
 * does not exist is a template nobody will notice has gone stale. They are
 * recorded as deferred in `docs/email-provider-template-configuration.md`.
 */
export const SUPABASE_TEMPLATE_NAMES = ["Confirm signup", "Magic Link"] as const;

export type AuthEmail = {
  /** The subject to type into the dashboard, for both templates. */
  subject: string;
  preheader: string;
  /** The complete document to paste into the dashboard, for both templates. */
  html: string;
  /**
   * The same wording as text.
   *
   * Supabase will not send it. It is generated so the copy can be read and
   * reviewed without reading HTML, and so a wording change is visible in a
   * diff of something other than a style attribute.
   */
  text: string;
};

const SUBJECT = "Your Ponte Trade sign-in code";

const PREHEADER = `Your code is below. It expires in ${OTP_EXPIRY_MINUTES} minutes.`;

/**
 * The body.
 *
 * The copy has to be true whichever of the two Supabase templates delivered it,
 * so it says what a code does rather than what the account is: "sign in"
 * describes a first-time member establishing a session exactly as well as it
 * describes a returning one, and "confirm your email address" would be false for
 * the returning member half of the time.
 *
 * There is no salutation. Supabase exposes `{{ .Email }}` and no name, and an
 * address printed where a name belongs is the defect `lib/email/identity.ts`
 * exists to prevent. An email with no name simply opens on its subject, which is
 * what the application templates do too.
 */
const BLOCKS: readonly EmailBlock[] = [
  { kind: "title", text: "Your sign-in code." },
  {
    kind: "lead",
    text:
      `Enter this code on the page that asked for it. It expires in ` +
      `${OTP_EXPIRY_MINUTES} minutes, and it can be used once.`,
  },
  { kind: "code", value: SUPABASE_TOKEN_VARIABLE },
  {
    kind: "paragraph",
    text:
      "If you did not ask to sign in, ignore this email. Nothing has changed " +
      "and nobody can use this code without access to your inbox.",
  },
];

/**
 * Build the one authentication email.
 *
 * It goes through `wrapDocument()` — the same shell, the same header, the same
 * tokens and the same footer as the thirteen application templates. That is the
 * point: an authentication email is the first Ponte email most members will ever
 * receive, and it arriving in a different design from the second one is how a
 * genuine email teaches somebody that Ponte's mail looks inconsistent.
 *
 * `footerLinks: "none"` because the reader is not signed in; see `shell.ts`.
 */
export function authEmail(): AuthEmail {
  const html = wrapDocument({
    title: SUBJECT,
    preheader: PREHEADER,
    bodyHtml: renderBlocksHtml(BLOCKS),
    reason: "security",
    securityNote: true,
    footerLinks: "none",
  });

  const text = [
    PREHEADER,
    "",
    renderBlocksText(BLOCKS),
    "",
    footerText("security", true, "none"),
  ].join("\n");

  return { subject: SUBJECT, preheader: PREHEADER, html, text };
}
