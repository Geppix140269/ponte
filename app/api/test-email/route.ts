import { NextResponse } from "next/server";
import { isEmailConfigured, sendOrderConfirmation } from "@/lib/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// One-click Resend smoke test. Visit:
//   https://ponte.trade/api/test-email
// Sends a fake order confirmation to the configured ADMIN_ALERT_EMAIL.
// Returns 503 if Resend isn't configured, 500 if the send throws,
// 200 otherwise. Restricted to ADMIN_ALERT_EMAIL — won't spam strangers.
export async function GET() {
  if (!isEmailConfigured()) {
    return NextResponse.json(
      { ok: false, reason: "RESEND_API_KEY not set in environment" },
      { status: 503 },
    );
  }

  const to = process.env.ADMIN_ALERT_EMAIL;
  if (!to) {
    return NextResponse.json(
      { ok: false, reason: "ADMIN_ALERT_EMAIL not set" },
      { status: 503 },
    );
  }

  try {
    await sendOrderConfirmation(to, {
      orderId: "test_" + Date.now().toString(36),
      lines: [
        "Single Country Market Report (test) — Spain",
        "Sanctions Exposure Report (test) — Acme Corp",
      ],
      total: "$598.00",
    });
    return NextResponse.json({
      ok: true,
      sent_to: to,
      note: "Check your inbox. If it doesn't arrive within 2 min, check Resend dashboard > Emails for the delivery log.",
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        reason: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
