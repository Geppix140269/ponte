// The one email shell.
//
// Every email Ponte generates is this document. There is no second wrapper, no
// per-route HTML and no template that "just needs a slightly different header".
// A template supplies blocks; the shell supplies everything around them.
//
// Two things here are product decisions rather than styling:
//
//   1. The brand line is "Cross-border trade, with greater clarity." — the
//      canonical line recorded in docs/codex/00-START-HERE.md. The retired
//      email layout said "The verified network for cross-border trade", which
//      is not a line any authority carries and which asserts verification as a
//      property of the network. It is not reproduced.
//
//   2. The footer says why the recipient received the message and routes every
//      reply back into Ponte. Nothing in this shell invites a reply by email:
//      Ponte's disclosure model depends on the counterparty conversation
//      happening inside the platform, and a "reply to this email" line in a
//      notification is a documented route around it.

import { EMAIL_COLOUR, EMAIL_FONT, EMAIL_RADIUS, EMAIL_SPACE, EMAIL_WIDTH } from "./tokens";
import { esc, safeHref } from "./blocks";

export const BRAND_NAME = "Ponte Trade";
/** Canonical brand line. Authority: docs/codex/00-START-HERE.md. */
export const BRAND_LINE = "Cross-border trade, with greater clarity.";

export function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || "https://ponte.trade";
}

/**
 * An absolute Ponte URL from an in-app path.
 *
 * The path is normalised rather than trusted. A caller that passes something
 * scheme-shaped ("javascript:...", "//evil.example") must not be able to turn a
 * Ponte link into anything else, and a caller that passes a protocol-relative
 * path must not be able to point the button at another host. Anything that is
 * not a plain in-app path collapses to the site root, which is a dead-ended
 * link rather than a dangerous one.
 */
export function route(path: string): string {
  const base = appUrl().replace(/\/+$/, "");
  const raw = String(path ?? "").trim();
  const safe =
    raw === "" || /^[a-z][a-z0-9+.-]*:/i.test(raw) || raw.startsWith("//")
      ? "/"
      : raw.startsWith("/")
        ? raw
        : `/${raw}`;
  return `${base}${safe}`;
}

/** Why this person is receiving this email. Required on every send. */
export type NotificationReason =
  | "listing_owner"
  | "account"
  | "security"
  | "internal_alert"
  | "digest";

const REASON_TEXT: Record<NotificationReason, string> = {
  listing_owner: "You are receiving this because you have a listing on Ponte Trade.",
  account: "You are receiving this because you have a Ponte Trade account.",
  security: "You are receiving this because of activity on your Ponte Trade account.",
  internal_alert: "You are receiving this as a Ponte Trade operator.",
  digest: "You are receiving this because you subscribe to Ponte Trade activity summaries.",
};

/**
 * The header.
 *
 * Deliberately not the site navigation. A transactional email establishes who
 * is writing and returns the reader to the product; a reproduction of the nav
 * bar gives them nine places to go instead of the one the email is about.
 *
 * The wordmark is TEXT, not an image, so a client with images blocked still
 * shows a branded email rather than an empty box and an alt string.
 */
function header(): string {
  return (
    `<tr><td style="padding:${EMAIL_SPACE.lg}px ${EMAIL_SPACE.xl}px;` +
    `border-bottom:1px solid ${EMAIL_COLOUR.rule}">` +
    `<p style="margin:0;font-family:${EMAIL_FONT.serif};font-size:20px;line-height:1.2;` +
    `font-weight:400;letter-spacing:.01em;color:${EMAIL_COLOUR.ink}">${BRAND_NAME}</p>` +
    `<p style="margin:${EMAIL_SPACE.xs}px 0 0;font-family:${EMAIL_FONT.sans};font-size:13px;` +
    `line-height:1.4;color:${EMAIL_COLOUR.ink3}">${BRAND_LINE}</p>` +
    `</td></tr>`
  );
}

function footer(reason: NotificationReason, securityNote: boolean): string {
  const link = (href: string, label: string) =>
    `<a href="${safeHref(href)}" style="color:${EMAIL_COLOUR.ink3};text-decoration:underline">${esc(label)}</a>`;

  const phishing = securityNote
    ? `<p style="margin:0 0 ${EMAIL_SPACE.sm}px">Ponte Trade will never ask you for your ` +
      `password, a payment detail or a verification code by email.</p>`
    : "";

  return (
    `<tr><td style="padding:${EMAIL_SPACE.lg}px ${EMAIL_SPACE.xl}px;` +
    `border-top:1px solid ${EMAIL_COLOUR.rule};font-family:${EMAIL_FONT.sans};` +
    `font-size:12px;line-height:1.6;color:${EMAIL_COLOUR.ink3}">` +
    phishing +
    `<p style="margin:0 0 ${EMAIL_SPACE.sm}px">${esc(REASON_TEXT[reason])}</p>` +
    `<p style="margin:0 0 ${EMAIL_SPACE.sm}px">` +
    `${link(route("/account/notifications"), "Notification preferences")} &nbsp;·&nbsp; ` +
    `${link(route("/legal/privacy"), "Privacy")} &nbsp;·&nbsp; ` +
    `${link(route("/legal/terms"), "Terms")}</p>` +
    `<p style="margin:0">${BRAND_NAME} is operated by 1402 Celsius Ltd. ` +
    `${link(appUrl(), "ponte.trade")}</p>` +
    `</td></tr>`
  );
}

export function footerText(reason: NotificationReason, securityNote: boolean): string {
  const lines = [
    "--",
    ...(securityNote
      ? ["Ponte Trade will never ask you for your password, a payment detail or a verification code by email."]
      : []),
    REASON_TEXT[reason],
    `Notification preferences: ${route("/account/notifications")}`,
    `Privacy: ${route("/legal/privacy")}`,
    `Terms: ${route("/legal/terms")}`,
    `${BRAND_NAME} is operated by 1402 Celsius Ltd. ${appUrl()}`,
  ];
  return lines.join("\n");
}

/**
 * Wrap rendered blocks in the shell.
 *
 * The preheader is the text a client shows next to the subject in the inbox
 * list. Left unset, clients scrape the first words of the body, which for a
 * branded email is the wordmark and the brand line on every single message. It
 * is therefore required, and it is hidden in the body so it appears once, in
 * the inbox, and never twice on the page.
 */
export function wrapDocument(opts: {
  title: string;
  preheader: string;
  bodyHtml: string;
  reason: NotificationReason;
  securityNote?: boolean;
}): string {
  const hiddenPreheader =
    `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;` +
    `font-size:1px;line-height:1px;color:${EMAIL_COLOUR.surface};opacity:0">` +
    `${esc(opts.preheader)}` +
    // Zero-width joiners stop a client padding the preheader with the first
    // words of the visible body.
    `${"&#847;&zwnj;&nbsp;".repeat(60)}</div>`;

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="x-apple-disable-message-reformatting" />
<meta name="color-scheme" content="light" />
<meta name="supported-color-schemes" content="light" />
<title>${esc(opts.title)}</title>
<style type="text/css">
  /* The only media query the shell needs: below the card width the padding
     tightens and the button becomes full width for a comfortable tap target. */
  @media only screen and (max-width:${EMAIL_WIDTH}px) {
    .p-outer { padding:${EMAIL_SPACE.md}px !important; }
    .p-inner { padding:${EMAIL_SPACE.lg}px ${EMAIL_SPACE.md}px !important; }
    a[href] { word-break:break-word; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:${EMAIL_COLOUR.surface};-webkit-font-smoothing:antialiased">
${hiddenPreheader}
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;background:${EMAIL_COLOUR.surface}">
  <tr><td class="p-outer" align="center" style="padding:${EMAIL_SPACE.xl}px ${EMAIL_SPACE.md}px">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:${EMAIL_WIDTH}px;background:${EMAIL_COLOUR.raised};border:1px solid ${EMAIL_COLOUR.rule};border-radius:${EMAIL_RADIUS.lg};overflow:hidden">
      ${header()}
      <tr><td class="p-inner" style="padding:${EMAIL_SPACE.xl}px">
        ${opts.bodyHtml}
      </td></tr>
      ${footer(opts.reason, opts.securityNote === true)}
    </table>
  </td></tr>
</table>
</body>
</html>`;
}
