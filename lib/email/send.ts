// Dispatch.
//
// One send path, so delivery is observable in one place. The previous code had
// three: a shared `send` that swallowed every error, and two callers that built
// their own Resend client so they could throw. A failure in the first was
// invisible, which is the worst property a notification system can have.
//
// What is recorded and what is not:
//
//   - RECORDED: provider message id, template name, recipient user id, status,
//     failure category, retry state.
//   - NOT RECORDED: the rendered body, the subject line's interpolated values,
//     recipient addresses beyond what the caller already holds, or anything
//     read out of a member's uploaded document.
//
// The distinction is the point. Knowing that `listing_published` failed for
// user X with a provider 4xx is operable. Storing the email itself puts member
// commercial data into a log that outlives the send and serves nobody.

import { Resend } from "resend";
import { renderTransactionalEmail } from "./render";
import type { TemplateData, TemplateName } from "./templates";

const FROM = process.env.RESEND_FROM_EMAIL || "hello@ponte.trade";

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

/** Where an operator alert goes. Absent means operator alerts are disabled. */
export function operatorAddress(): string | null {
  return process.env.ADMIN_ALERT_EMAIL || null;
}

export type SendFailureCategory =
  | "not_configured"
  | "no_recipient"
  | "provider_error"
  | "unknown";

export type SendResult =
  | { ok: true; skipped: false; messageId: string | null; template: TemplateName }
  | { ok: true; skipped: true; template: TemplateName; reason: SendFailureCategory }
  | { ok: false; template: TemplateName; category: SendFailureCategory; detail: string };

/**
 * The observability hook.
 *
 * A caller that wants sends persisted supplies this. Left unset, results go to
 * the console, which is what a serverless function's log already captures.
 */
export type SendObserver = (event: {
  template: TemplateName;
  recipientUserId: string | null;
  status: "sent" | "skipped" | "failed";
  messageId: string | null;
  failureCategory: SendFailureCategory | null;
  attempt: number;
}) => void | Promise<void>;

let observer: SendObserver | null = null;

export function setSendObserver(fn: SendObserver | null): void {
  observer = fn;
}

async function observe(event: Parameters<SendObserver>[0]): Promise<void> {
  try {
    if (observer) await observer(event);
    else if (event.status !== "sent") {
      console.warn(
        `[ponte] email ${event.status}: ${event.template} -> user ${event.recipientUserId ?? "?"} (${event.failureCategory ?? "-"})`,
      );
    }
  } catch (err) {
    console.error("[ponte] email observer threw:", err);
  }
}

export type SendOptions<K extends TemplateName> = {
  to: string;
  template: K;
  data: TemplateData[K];
  locale?: string;
  /** For telemetry only. Never rendered into the email. */
  recipientUserId?: string | null;
};

/**
 * Render and send.
 *
 * ALWAYS AWAIT THIS. A fire-and-forget send on a serverless function is a send
 * that is cancelled when the handler returns; the previous code carried this
 * warning in a comment and two callers ignored it.
 *
 * It resolves rather than throwing on a provider failure: a notification that
 * did not go out must not roll back the state change it was announcing. The
 * caller gets a result it can act on, and the observer sees it either way.
 */
export async function sendTemplateEmail<K extends TemplateName>(
  opts: SendOptions<K>,
): Promise<SendResult> {
  const userId = opts.recipientUserId ?? null;

  if (!opts.to || !opts.to.includes("@")) {
    await observe({
      template: opts.template, recipientUserId: userId, status: "skipped",
      messageId: null, failureCategory: "no_recipient", attempt: 0,
    });
    return { ok: true, skipped: true, template: opts.template, reason: "no_recipient" };
  }

  const rendered = renderTransactionalEmail({
    template: opts.template, data: opts.data, locale: opts.locale,
  });

  if (!isEmailConfigured()) {
    console.log(`[ponte] email skipped (Resend not configured): "${rendered.subject}" -> ${opts.to}`);
    await observe({
      template: opts.template, recipientUserId: userId, status: "skipped",
      messageId: null, failureCategory: "not_configured", attempt: 0,
    });
    return { ok: true, skipped: true, template: opts.template, reason: "not_configured" };
  }

  const resend = new Resend(process.env.RESEND_API_KEY!);
  let lastDetail = "";

  // Two attempts. A transient provider blip should not silently lose a
  // publication confirmation; a persistent one should not hold the request open.
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const { data, error } = await resend.emails.send({
        from: FROM,
        to: opts.to,
        subject: rendered.subject,
        html: rendered.html,
        // Every Ponte email carries a text part. This is the line that makes
        // "no HTML-only email" true rather than aspirational.
        text: rendered.text,
      });
      if (error) {
        lastDetail = error.message ?? String(error);
        continue;
      }
      await observe({
        template: opts.template, recipientUserId: userId, status: "sent",
        messageId: data?.id ?? null, failureCategory: null, attempt,
      });
      return { ok: true, skipped: false, messageId: data?.id ?? null, template: opts.template };
    } catch (err) {
      lastDetail = err instanceof Error ? err.message : String(err);
    }
  }

  console.error(`[ponte] email failed after retry: ${opts.template} (${lastDetail})`);
  await observe({
    template: opts.template, recipientUserId: userId, status: "failed",
    messageId: null, failureCategory: "provider_error", attempt: 2,
  });
  return {
    ok: false, template: opts.template, category: "provider_error", detail: lastDetail,
  };
}

/** Send to the operator address, when one is configured. */
export async function sendOperatorEmail<K extends TemplateName>(
  opts: Omit<SendOptions<K>, "to">,
): Promise<SendResult> {
  const to = operatorAddress();
  if (!to) {
    return { ok: true, skipped: true, template: opts.template, reason: "no_recipient" };
  }
  return sendTemplateEmail({ ...opts, to });
}
