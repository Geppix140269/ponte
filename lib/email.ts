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
        <span style="color:#E8A020;font-size:13px;margin-left:8px">Trade intelligence. Delivered.</span>
      </div>
      <div style="padding:28px;color:#0F1E3C;font-size:14px;line-height:1.6">${body}</div>
      <div style="padding:18px 28px;border-top:1px solid #E5E7EB;color:#6B7280;font-size:12px;line-height:1.6">
        The Ponte Trade Team, An ICTTM Company<br/>
        <a href="${APP_URL}" style="color:#D08F18">ponte.trade</a>
      </div>
    </div>
  </div>`;
}

export async function sendOrderConfirmation(
  to: string,
  data: {
    orderId: string;
    lines: string[];
    total: string;
    /**
     * True when the order contains non-instant items and we authorized
     * the card without capturing. The email then explains the
     * hold-then-charge flow so the customer understands why their bank
     * shows a pending charge, not a settled one.
     */
    manualCapture?: boolean;
  },
): Promise<void> {
  const items = data.lines.map((l) => `<li>${l}</li>`).join("");
  const captureNote = data.manualCapture
    ? `
      <p style="background:#FAF7F0;border-left:3px solid #E8A020;padding:12px 14px;margin:18px 0;font-size:13px;line-height:1.55">
        <strong>Card authorized, not yet charged.</strong> We'll confirm your
        delivery date by email within 24 hours. Your card is charged only
        when we start production. If we cannot deliver by the confirmed
        date, the authorization is released and you are not charged.
      </p>`
    : "";
  await send(
    to,
    "Order confirmed | Ponte Trade",
    layout(`
      <h2 style="margin:0 0 12px">Thank you for your order</h2>
      <p>Order <strong>#${data.orderId.slice(0, 8)}</strong> is confirmed.</p>
      <ul>${items}</ul>
      <p><strong>Total: ${data.total}</strong></p>
      ${captureNote}
      <p>Instant items are available in your account now. Reports with a 24h or
      48h SLA are being prepared, we'll email your download link when ready.</p>
      <p><a href="${APP_URL}/account" style="color:#D08F18">View your account →</a></p>
    `),
  );
}

export async function sendReportReady(
  to: string,
  data: { downloadUrl: string },
): Promise<void> {
  await send(
    to,
    "Your Ponte Trade report is ready",
    layout(`
      <h2 style="margin:0 0 12px">Your report is ready</h2>
      <p>Your report has been delivered. Download it below, the link is valid for 72 hours.</p>
      <p><a href="${data.downloadUrl}" style="background:#E8A020;color:#0F1E3C;padding:10px 18px;border-radius:6px;text-decoration:none;font-weight:700">Download report</a></p>
      <p style="color:#6B7280">You can also re-download from your account.</p>
    `),
  );
}

export async function sendProcessing(
  to: string,
  data: { sla: string },
): Promise<void> {
  await send(
    to,
    "We're preparing your report | Ponte Trade",
    layout(`
      <h2 style="margin:0 0 12px">We're on it</h2>
      <p>Your report is being prepared and verified. You'll receive it within
      <strong>${data.sla}</strong> with your download link.</p>
    `),
  );
}

export async function sendAdminAlert(data: {
  orderId: string;
  sku: string;
  config: Record<string, string>;
}): Promise<void> {
  const admin = process.env.ADMIN_ALERT_EMAIL;
  if (!admin) return;
  const cfg = Object.entries(data.config)
    .map(([k, v]) => `${k}: ${v}`)
    .join(", ");
  await send(
    admin,
    `New order requires manual delivery, ${data.sku}`,
    layout(`
      <h2 style="margin:0 0 12px">Manual delivery required</h2>
      <p>Order <strong>#${data.orderId.slice(0, 8)}</strong></p>
      <p>Product: <strong>${data.sku}</strong></p>
      <p>Config: ${cfg || "—"}</p>
      <p><a href="${APP_URL}/admin/orders" style="color:#D08F18">Open admin orders →</a></p>
    `),
  );
}

/**
 * Sent when admin confirms the slot/delivery date for an authorized order.
 * Customer's card is still held, not charged.
 */
export async function sendSlotConfirmed(
  to: string,
  data: { orderId: string; deliveryAt: Date | string; lines?: string[] },
): Promise<void> {
  const d = typeof data.deliveryAt === "string"
    ? new Date(data.deliveryAt)
    : data.deliveryAt;
  const dateStr = d.toLocaleString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short",
  });
  const items = (data.lines ?? []).map((l) => `<li>${l}</li>`).join("");
  await send(
    to,
    "Delivery date confirmed | Ponte Trade",
    layout(`
      <h2 style="margin:0 0 12px">Your delivery date is confirmed</h2>
      <p>Order <strong>#${data.orderId.slice(0, 8)}</strong></p>
      ${items ? `<ul>${items}</ul>` : ""}
      <p style="background:#FAF7F0;border-left:3px solid #E8A020;padding:12px 14px;margin:18px 0;font-size:14px;line-height:1.55">
        <strong>Delivery by ${dateStr}</strong>
      </p>
      <p>Your card remains authorized but not yet charged. We will charge
      your card and start production on the confirmed date. If we cannot
      deliver, the authorization will be released and you will not be
      charged.</p>
      <p><a href="${APP_URL}/account" style="color:#D08F18">View your account →</a></p>
    `),
  );
}

/**
 * Sent at capture: the customer's card is charged and production has started.
 */
export async function sendProductionStarted(
  to: string,
  data: { orderId: string; total: string; deliveryAt?: Date | string },
): Promise<void> {
  let dateLine = "";
  if (data.deliveryAt) {
    const d = typeof data.deliveryAt === "string"
      ? new Date(data.deliveryAt)
      : data.deliveryAt;
    const dateStr = d.toLocaleString("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
      timeZone: "UTC",
    });
    dateLine = `<p>You will receive your download link by <strong>${dateStr}</strong>.</p>`;
  }
  await send(
    to,
    "We've started production on your report | Ponte Trade",
    layout(`
      <h2 style="margin:0 0 12px">Production started</h2>
      <p>Order <strong>#${data.orderId.slice(0, 8)}</strong></p>
      <p>Your card has been charged <strong>${data.total}</strong> and our
      team is now producing your report.</p>
      ${dateLine}
      <p><a href="${APP_URL}/account" style="color:#D08F18">View your account →</a></p>
    `),
  );
}

/**
 * Sent when admin voids an authorized order (we cannot deliver).
 * The authorization is released, customer is not charged.
 */
export async function sendOrderVoided(
  to: string,
  data: { orderId: string; reason?: string },
): Promise<void> {
  const reasonLine = data.reason
    ? `<p style="color:#6B7280;font-size:13px">Reason: ${data.reason}</p>`
    : "";
  await send(
    to,
    "Your order could not be fulfilled, no charge made | Ponte Trade",
    layout(`
      <h2 style="margin:0 0 12px">We could not fulfil your order</h2>
      <p>Order <strong>#${data.orderId.slice(0, 8)}</strong></p>
      <p><strong>Your card was authorized but not charged.</strong> The
      authorization has now been released. You will not be charged.
      Depending on your bank, the pending charge may take 1-7 days to
      disappear from your statement.</p>
      ${reasonLine}
      <p>If you have questions, reply to this email and we will respond
      within 24 hours.</p>
      <p><a href="${APP_URL}/catalogue" style="color:#D08F18">Browse the catalogue →</a></p>
    `),
  );
}
