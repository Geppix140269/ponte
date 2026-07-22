import { Resend } from "resend";

const FROM = process.env.RESEND_FROM_EMAIL || "hello@ponte.trade";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://ponte.trade";

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

async function send(to: string, subject: string, html: string): Promise<void> {
  if (!isEmailConfigured()) {
    console.log(`[ponte] email skipped (Resend not configured): "${subject}" -> ${to}`);
    return;
  }
  try {
    const resend = new Resend(process.env.RESEND_API_KEY!);
    await resend.emails.send({ from: FROM, to, subject, html });
  } catch (err) {
    console.error("[ponte] Resend error:", err);
  }
}

function layout(body: string): string {
  return `
  <div style="font-family:Arial,Helvetica,sans-serif;background:#F5F5F5;padding:32px">
    <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #E5E7EB;border-radius:12px;overflow:hidden">
      <div style="background:#0F1E3C;padding:24px 28px">
        <span style="color:#fff;font-size:20px;font-weight:800">Ponte Trade</span>
        <span style="color:#E8A020;font-size:13px;margin-left:8px">The verified network for cross-border trade.</span>
      </div>
      <div style="padding:28px;color:#0F1E3C;font-size:14px;line-height:1.6">${body}</div>
      <div style="padding:18px 28px;border-top:1px solid #E5E7EB;color:#6B7280;font-size:12px;line-height:1.6">
        The Ponte Trade Team<br/>
        <a href="${APP_URL}" style="color:#D08F18">ponte.trade</a>
      </div>
    </div>
  </div>`;
}

/**
 * General purpose alert to the desk. Used by the verification pipeline and by
 * the sanctions refresh, which need to reach a person without inventing a new
 * template each time.
 *
 * Callers must AWAIT this. A fire and forget send is dropped when the
 * serverless function returns.
 */
export async function sendAdminNotice(data: {
  subject: string;
  /** HTML fragment. Already inside the branded layout. */
  body: string;
  /** Optional path on the site the desk should open, e.g. /admin/verifications */
  actionPath?: string;
  actionLabel?: string;
}): Promise<void> {
  const admin = process.env.ADMIN_ALERT_EMAIL;
  if (!admin) return;
  const action = data.actionPath
    ? `<p><a href="${APP_URL}${data.actionPath}" style="color:#D08F18">${data.actionLabel ?? "Open"} →</a></p>`
    : "";
  await send(
    admin,
    data.subject,
    layout(`
      <h2 style="margin:0 0 12px">${data.subject}</h2>
      <div>${data.body}</div>
      ${action}
    `),
  );
}

/* ------------------------------------------------------------------ */
/* Brokerage: Deal Desk submissions and Deal Sheet access requests     */
/* ------------------------------------------------------------------ */

const DEALS_TO = process.env.DEALS_TO_EMAIL || "deals@ponte.trade";

export type BrokerageSubmissionType = "offer" | "requirement" | "network";

/**
 * Notify the deal desk of a new submission from /brokerage or /network.
 * Reply-To is set to the submitter so the desk can answer in one click.
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
  const subjectByType: Record<BrokerageSubmissionType, string> = {
    offer: `Deal Desk | OFFER from ${data.company} (${data.country})`,
    requirement: `Deal Desk | REQUIREMENT from ${data.company} (${data.country})`,
    network: `Deal Sheet | access request from ${data.company} (${data.country})`,
  };
  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const rows = [
    ["Type", data.type.toUpperCase()],
    ["Name", data.name],
    ["Company", data.company],
    ["Email", data.email],
    ["Country", data.country],
    ...(data.product ? [["Product", data.product]] : []),
    ...(data.volume ? [["Volume", data.volume]] : []),
  ]
    .map(
      ([k, v]) =>
        `<tr><td style="padding:4px 12px 4px 0;color:#6B7280;white-space:nowrap">${k}</td><td style="padding:4px 0"><strong>${esc(v)}</strong></td></tr>`,
    )
    .join("");
  const html = layout(`
    <h2 style="margin:0 0 12px">New ${data.type === "network" ? "Deal Sheet access request" : `deal desk ${data.type}`}</h2>
    <table style="border-collapse:collapse;font-size:14px">${rows}</table>
    <p style="margin-top:16px;white-space:pre-wrap;background:#F8FAFC;border-left:3px solid #E8A020;padding:12px 14px">${esc(data.details)}</p>
    <p style="color:#6B7280;font-size:12px">Reply to this email to answer ${esc(data.name)} directly.</p>
  `);
  if (!isEmailConfigured()) {
    console.log(`[ponte] email skipped (Resend not configured): "${subjectByType[data.type]}" -> ${DEALS_TO}`);
    return;
  }
  try {
    const resend = new Resend(process.env.RESEND_API_KEY!);
    await resend.emails.send({
      from: FROM,
      to: DEALS_TO,
      replyTo: data.email,
      subject: subjectByType[data.type],
      html,
    });
  } catch (err) {
    console.error("[ponte] Resend error (brokerage submission):", err);
    throw err;
  }
}

/* ------------------------------------------------------------------ */
/* Marketplace: listing lifecycle emails                               */
/* ------------------------------------------------------------------ */

/** Confirmation to the member right after they submit a listing. */
export async function sendListingReceived(
  to: string,
  data: { ref: string; product: string },
): Promise<void> {
  await send(
    to,
    `Listing received · ${data.ref} | Ponte Trade`,
    layout(`
      <h2 style="margin:0 0 12px">Your listing is with the desk</h2>
      <p>Reference <strong>${data.ref}</strong> · ${data.product}</p>
      <p>A person reads every listing before it goes on the board: the facts,
      the documents, and who is behind it. You will hear from us either way,
      usually within two business days.</p>
      <p>You stay anonymous. Nobody sees who posted this until you accept a
      connection.</p>
      <p><a href="${APP_URL}/marketplace" style="color:#D08F18">View your listings →</a></p>
    `),
  );
}

/** Decision email when the desk approves or rejects a listing. */
export async function sendListingDecision(
  to: string,
  data: { ref: string; product: string; approved: boolean; note?: string },
): Promise<void> {
  const noteBlock = data.note
    ? `<p style="background:#F8FAFC;border-left:3px solid #E8A020;padding:12px 14px;white-space:pre-wrap">${data.note
        .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>`
    : "";
  await send(
    to,
    `${data.approved ? "Listing approved" : "Listing not approved"} · ${data.ref} | Ponte Trade`,
    layout(`
      <h2 style="margin:0 0 12px">${data.approved ? "Approved and live" : "Not approved this time"}</h2>
      <p>Reference <strong>${data.ref}</strong> · ${data.product}</p>
      ${
        data.approved
          ? `<p>Your listing passed vetting and is now on the public board. You
             stay anonymous: a counterparty who wants to talk asks to connect,
             and nothing is revealed until you accept.</p>
             <p>Share it wherever your buyers already are. The link works for
             anyone, with no account and no wall.</p>`
          : `<p>We could not approve this listing as submitted. This is often
             about missing documents or details rather than the deal itself.</p>`
      }
      ${noteBlock}
      <p><a href="${APP_URL}/marketplace" style="color:#D08F18">View your listings →</a></p>
    `),
  );
}

export async function sendConnectRequest(
  to: string,
  data: { ref: string; product: string },
): Promise<void> {
  await send(
    to,
    `A member wants to connect · ${data.ref} | Ponte`,
    layout(`
      <h2 style="margin:0 0 12px">Someone wants to connect.</h2>
      <p>A vetted member has requested to connect on your listing
      <strong>${data.ref}</strong> · ${data.product}.</p>
      <p>You stay anonymous to each other until you accept. Accept and both
      of you receive each other's contact details; connecting is free.</p>
      <p><a href="${APP_URL}/marketplace" style="color:#D08F18">Review the request →</a></p>
      <p style="color:#64748B;font-size:13px">Prefer the desk to run the deal
      end to end (verification, NCNDA, papers, negotiation)? Just reply to
      this email: success fee or retainer, agreed in writing first.</p>
    `),
  );
}

/* ------------------------------------------------------------------ */
/* Verification: decisions taken by a person at the desk                */
/* ------------------------------------------------------------------ */

export type VerificationDecision = "verified" | "rejected" | "documents";

/**
 * Tell a member what the desk decided about their verification.
 *
 * Every decision this email reports was taken by a person. Nothing here is
 * ever sent for an automatic verdict.
 *
 * Unlike the fire and forget senders above this one throws on a Resend
 * error, so the caller can log it. The admin action awaits this call before
 * it returns: a send left dangling on a serverless function is a send that
 * never happens.
 */
export async function sendVerificationDecision(
  to: string,
  data: {
    decision: VerificationDecision;
    subjectName: string;
    /** Note written by the reviewer, shown to the member verbatim. */
    note?: string;
    /** Passed in so this module stays independent of the pipeline. */
    disclaimer?: string;
  },
): Promise<void> {
  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const subjectLine: Record<VerificationDecision, string> = {
    verified: `Verification confirmed, ${data.subjectName} | Ponte Trade`,
    rejected: `Verification not confirmed, ${data.subjectName} | Ponte Trade`,
    documents: `More documents needed, ${data.subjectName} | Ponte Trade`,
  };

  const heading: Record<VerificationDecision, string> = {
    verified: "Your verification is confirmed",
    rejected: "We could not confirm this verification",
    documents: "We need more from you to finish this",
  };

  const bodyText: Record<VerificationDecision, string> = {
    verified:
      "A member of the desk reviewed the sources and confirmed the record. " +
      "Your business verification level is now shown on your account.",
    rejected:
      "A member of the desk reviewed the sources and could not confirm the " +
      "record as submitted. This is often about details that do not line up " +
      "with the public register rather than about the company itself. You " +
      "can submit a fresh check once the details are corrected.",
    documents:
      "A member of the desk read the case and needs more from you before it " +
      "can be decided. Reply to this email with the documents listed below " +
      "and the case goes back into the queue.",
  };

  const noteBlock = data.note
    ? `<p style="background:#F8FAFC;border-left:3px solid #E8A020;padding:12px 14px;white-space:pre-wrap">${esc(
        data.note,
      )}</p>`
    : "";

  const disclaimerBlock = data.disclaimer
    ? `<p style="color:#6B7280;font-size:12px;line-height:1.6;border-top:1px solid #E5E7EB;padding-top:14px;margin-top:22px">${esc(
        data.disclaimer,
      )}</p>`
    : "";

  const html = layout(`
    <h2 style="margin:0 0 12px">${heading[data.decision]}</h2>
    <p>Subject: <strong>${esc(data.subjectName)}</strong></p>
    <p>${bodyText[data.decision]}</p>
    ${noteBlock}
    <p><a href="${APP_URL}/verify" style="color:#D08F18">Open verification</a></p>
    ${disclaimerBlock}
  `);

  if (!isEmailConfigured()) {
    console.log(
      `[ponte] email skipped (Resend not configured): "${subjectLine[data.decision]}" -> ${to}`,
    );
    return;
  }
  try {
    const resend = new Resend(process.env.RESEND_API_KEY!);
    await resend.emails.send({
      from: FROM,
      to,
      subject: subjectLine[data.decision],
      html,
    });
  } catch (err) {
    console.error("[ponte] Resend error (verification decision):", err);
    throw err;
  }
}

export async function sendConnectAccepted(
  to: string,
  data: { ref: string; product: string; otherEmail: string },
): Promise<void> {
  await send(
    to,
    `You are connected · ${data.ref} | Ponte`,
    layout(`
      <h2 style="margin:0 0 12px">You are connected.</h2>
      <p>Both sides agreed to connect on <strong>${data.ref}</strong> ·
      ${data.product}.</p>
      <p>Your counterparty: <a href="mailto:${data.otherEmail}" style="color:#D08F18">${data.otherEmail}</a>.
      Reach out directly; connecting through Ponte is free.</p>
      <p style="color:#64748B;font-size:13px">Want the desk on your side of
      the table? Verification, NCNDA, contracts and negotiation, managed end
      to end on a success fee or retainer. Reply to this email and we scope
      it with you.</p>
    `),
  );
}
