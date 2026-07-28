// The one entry point.
//
// Nothing outside this module renders an email, and nothing outside `send.ts`
// dispatches one. A caller names a template and hands it typed data; it gets
// back a subject, an HTML body and a plain-text body that say the same thing.
//
// Localisation: the strings live in the template builders rather than being
// spread through HTML string concatenation, so introducing a second language is
// a matter of routing `locale` to a different string table — not of unpicking
// markup. English ships first and is the fallback for every locale, which
// matches the English-only interface policy while leaving the seam open.

import { renderBlocksHtml, renderBlocksText } from "./blocks";
import { wrapDocument, footerText } from "./shell";
import { TEMPLATES, type TemplateData, type TemplateName } from "./templates";

export type RenderedEmail = {
  subject: string;
  preheader: string;
  html: string;
  text: string;
};

export type RenderOptions<K extends TemplateName> = {
  template: K;
  data: TemplateData[K];
  /** Reserved for the second language. English is the fallback for all values. */
  locale?: string;
};

/**
 * Render a transactional email to HTML and plain text.
 *
 * The text body is produced from the same blocks as the HTML one, so an email
 * cannot ship HTML-only and cannot ship a text part that disagrees with what
 * the recipient sees.
 */
export function renderTransactionalEmail<K extends TemplateName>(
  opts: RenderOptions<K>,
): RenderedEmail {
  const build = TEMPLATES[opts.template];
  const content = build(opts.data);

  const html = wrapDocument({
    title: content.subject,
    preheader: content.preheader,
    bodyHtml: renderBlocksHtml(content.blocks),
    reason: content.reason,
    securityNote: content.securityNote,
  });

  const text = [
    content.preheader,
    "",
    renderBlocksText(content.blocks),
    "",
    footerText(content.reason, content.securityNote === true),
  ].join("\n");

  return { subject: content.subject, preheader: content.preheader, html, text };
}
