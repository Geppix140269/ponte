// The email content model.
//
// A template does not write HTML. It returns BLOCKS, and this module renders
// them to HTML and to plain text from the same list. That is the whole reason
// the model exists: an email with a hand-written HTML body and a hand-written
// text body has two bodies that drift, and the text one — which nobody looks
// at — is the one that ends up wrong or missing. Here a template physically
// cannot produce one without the other, and cannot make them disagree.
//
// It also means the visual system lives in exactly one place. A template
// choosing its own padding, its own button colour or its own heading size is
// not possible, because a template has no access to either.
//
// Pure and import-free apart from the tokens, so the whole email system is
// unit-testable without a mail provider, a database or a browser.

import {
  EMAIL_COLOUR, EMAIL_FONT, EMAIL_RADIUS, EMAIL_SPACE, EMAIL_STATUS,
  type EmailStatusTone,
} from "./tokens";

/** One row of a key/value block. */
export type MetadataRow = { label: string; value: string };

export type EmailBlock =
  /** The one principal sentence. Rendered as the h1. Exactly one per email. */
  | { kind: "title"; text: string }
  /** The one-sentence explanation directly under the title. */
  | { kind: "lead"; text: string }
  | { kind: "paragraph"; text: string }
  /** A lifecycle state, carried by a word as well as a colour. */
  | { kind: "status"; tone: EmailStatusTone; label: string }
  | { kind: "metadata"; rows: MetadataRow[] }
  | { kind: "list"; items: string[] }
  /** An inset panel: a quoted reason, a note, a set of findings. */
  | { kind: "panel"; heading?: string; body: string }
  /** The single principal call to action. At most one per email. */
  | { kind: "button"; label: string; href: string }
  /** A secondary action, as a text link. */
  | { kind: "link"; label: string; href: string }
  /** A confidence or limitation statement. Never decorative. */
  | { kind: "disclaimer"; text: string }
  | { kind: "divider" };

/* ------------------------------------------------------------------ */
/* Escaping                                                            */
/* ------------------------------------------------------------------ */

/**
 * Every value that reaches an email passes through here.
 *
 * Member-supplied product names, notes and company names land in these
 * templates, and an unescaped one is an HTML injection into a message sent from
 * ponte.trade. Templates never interpolate raw values themselves — they hand
 * strings to blocks, and blocks escape on the way out.
 */
export function esc(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * A URL that is safe to put in an href.
 *
 * Only http and https survive. `javascript:` and `data:` in an email link are
 * never legitimate, and a template that somehow received one emits a dead
 * anchor rather than a live one.
 */
export function safeHref(url: string): string {
  const trimmed = String(url ?? "").trim();
  return /^https?:\/\//i.test(trimmed) ? esc(trimmed) : "#";
}

/* ------------------------------------------------------------------ */
/* HTML                                                                */
/* ------------------------------------------------------------------ */

const P_BASE =
  `margin:0 0 ${EMAIL_SPACE.md}px;font-family:${EMAIL_FONT.sans};font-size:16px;` +
  `line-height:1.6;color:${EMAIL_COLOUR.ink2}`;

function blockHtml(block: EmailBlock): string {
  switch (block.kind) {
    case "title":
      return (
        `<h1 style="margin:0 0 ${EMAIL_SPACE.sm}px;font-family:${EMAIL_FONT.serif};` +
        `font-size:26px;line-height:1.25;font-weight:400;color:${EMAIL_COLOUR.ink}">` +
        `${esc(block.text)}</h1>`
      );

    case "lead":
      return (
        `<p style="margin:0 0 ${EMAIL_SPACE.lg}px;font-family:${EMAIL_FONT.sans};` +
        `font-size:17px;line-height:1.55;color:${EMAIL_COLOUR.ink2}">${esc(block.text)}</p>`
      );

    case "paragraph":
      return `<p style="${P_BASE}">${esc(block.text)}</p>`;

    case "status": {
      const { colour } = EMAIL_STATUS[block.tone];
      // The dot is decorative and the word carries the meaning, so the dot is
      // hidden from assistive technology and the label is never colour-only.
      return (
        `<table role="presentation" cellpadding="0" cellspacing="0" border="0" ` +
        `style="margin:0 0 ${EMAIL_SPACE.lg}px"><tr>` +
        `<td style="padding:6px 12px;border:1px solid ${colour};border-radius:${EMAIL_RADIUS.pill};` +
        `font-family:${EMAIL_FONT.sans};font-size:13px;font-weight:600;letter-spacing:.02em;` +
        `color:${colour}">${esc(block.label)}</td></tr></table>`
      );
    }

    case "metadata": {
      const rows = block.rows
        .map(
          (r) =>
            `<tr>` +
            `<td style="padding:0 ${EMAIL_SPACE.md}px ${EMAIL_SPACE.sm}px 0;` +
            `font-family:${EMAIL_FONT.sans};font-size:14px;line-height:1.5;` +
            `color:${EMAIL_COLOUR.ink3};white-space:nowrap;vertical-align:top">${esc(r.label)}</td>` +
            `<td style="padding:0 0 ${EMAIL_SPACE.sm}px;font-family:${EMAIL_FONT.sans};` +
            `font-size:14px;line-height:1.5;color:${EMAIL_COLOUR.ink};font-weight:600">` +
            `${esc(r.value)}</td></tr>`,
        )
        .join("");
      return (
        `<table role="presentation" cellpadding="0" cellspacing="0" border="0" ` +
        `style="width:100%;margin:0 0 ${EMAIL_SPACE.lg}px;border-collapse:collapse">${rows}</table>`
      );
    }

    case "list": {
      const items = block.items
        .map(
          (i) =>
            `<li style="margin:0 0 ${EMAIL_SPACE.sm}px;font-family:${EMAIL_FONT.sans};` +
            `font-size:16px;line-height:1.6;color:${EMAIL_COLOUR.ink2}">${esc(i)}</li>`,
        )
        .join("");
      return `<ul style="margin:0 0 ${EMAIL_SPACE.lg}px;padding-left:20px">${items}</ul>`;
    }

    case "panel": {
      const heading = block.heading
        ? `<p style="margin:0 0 ${EMAIL_SPACE.sm}px;font-family:${EMAIL_FONT.sans};font-size:13px;` +
          `font-weight:700;letter-spacing:.04em;text-transform:uppercase;` +
          `color:${EMAIL_COLOUR.ink3}">${esc(block.heading)}</p>`
        : "";
      return (
        `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;margin:0 0 ${EMAIL_SPACE.lg}px">` +
        `<tr><td style="padding:${EMAIL_SPACE.md}px;background:${EMAIL_COLOUR.sunken};` +
        `border-radius:${EMAIL_RADIUS.md};border:1px solid ${EMAIL_COLOUR.rule}">` +
        `${heading}<p style="margin:0;font-family:${EMAIL_FONT.sans};font-size:15px;` +
        `line-height:1.6;color:${EMAIL_COLOUR.ink2};white-space:pre-wrap">${esc(block.body)}</p>` +
        `</td></tr></table>`
      );
    }

    case "button":
      // A table-wrapped anchor: Outlook does not honour padding on an inline
      // anchor, so the cell carries it and the anchor fills the cell.
      return (
        `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 ${EMAIL_SPACE.lg}px">` +
        `<tr><td style="border-radius:${EMAIL_RADIUS.sm};background:${EMAIL_COLOUR.ink}">` +
        `<a href="${safeHref(block.href)}" style="display:inline-block;padding:14px 28px;` +
        `font-family:${EMAIL_FONT.sans};font-size:16px;font-weight:600;line-height:1.2;` +
        `color:${EMAIL_COLOUR.surface};text-decoration:none;border-radius:${EMAIL_RADIUS.sm}">` +
        `${esc(block.label)}</a></td></tr></table>`
      );

    case "link":
      return (
        `<p style="margin:0 0 ${EMAIL_SPACE.md}px"><a href="${safeHref(block.href)}" ` +
        `style="font-family:${EMAIL_FONT.sans};font-size:15px;color:${EMAIL_COLOUR.goldInk};` +
        `text-decoration:underline">${esc(block.label)}</a></p>`
      );

    case "disclaimer":
      return (
        `<p style="margin:${EMAIL_SPACE.lg}px 0 0;padding-top:${EMAIL_SPACE.md}px;` +
        `border-top:1px solid ${EMAIL_COLOUR.rule};font-family:${EMAIL_FONT.sans};` +
        `font-size:13px;line-height:1.6;color:${EMAIL_COLOUR.ink3}">${esc(block.text)}</p>`
      );

    case "divider":
      return (
        `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;margin:0 0 ${EMAIL_SPACE.lg}px">` +
        `<tr><td style="height:1px;background:${EMAIL_COLOUR.rule};line-height:1px;font-size:0">&nbsp;</td></tr></table>`
      );
  }
}

export function renderBlocksHtml(blocks: readonly EmailBlock[]): string {
  return blocks.map(blockHtml).join("\n");
}

/* ------------------------------------------------------------------ */
/* Plain text                                                          */
/* ------------------------------------------------------------------ */

function blockText(block: EmailBlock): string | null {
  switch (block.kind) {
    case "title":
      return `${block.text}\n${"=".repeat(Math.min(block.text.length, 60))}`;
    case "lead":
    case "paragraph":
      return block.text;
    case "status":
      return `[${block.label}]`;
    case "metadata":
      return block.rows.map((r) => `${r.label}: ${r.value}`).join("\n");
    case "list":
      return block.items.map((i) => `  - ${i}`).join("\n");
    case "panel":
      return block.heading ? `${block.heading.toUpperCase()}\n${block.body}` : block.body;
    // A plain-text reader gets the label AND the URL. A bare URL is
    // unreadable and a bare label is unusable.
    case "button":
      return `${block.label}: ${block.href}`;
    case "link":
      return `${block.label}: ${block.href}`;
    case "disclaimer":
      return `--\n${block.text}`;
    case "divider":
      return "----------------------------------------";
  }
}

export function renderBlocksText(blocks: readonly EmailBlock[]): string {
  return blocks
    .map(blockText)
    .filter((s): s is string => s !== null && s.trim() !== "")
    .join("\n\n");
}
