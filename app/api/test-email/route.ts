import { NextRequest, NextResponse } from "next/server";
import { isEmailConfigured, sendOrderConfirmation } from "@/lib/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Allowed recipients for the test endpoint. Anyone outside this list is
// rejected so the route can't be abused to spam.
const ALLOWED = new Set([
  "g.funaro@1402celsius.com",
  "ceo@adamftd.com",
  "hello@ponte.trade",
]);

// One-click Resend smoke test. Visit:
//   https://ponte.trade/api/test-email?to=g.funaro@1402celsius.com
// Or without the ?to= it falls back to ADMIN_ALERT_EMAIL.
// Returns 503 if Resend isn't configured, 400 if recipient missing/not
// allowed, 500 if the send throws, 200 otherwise.
export async function GET(req: NextRequest) {
  if (!isEmailConfigured()) {
    return NextResponse.json(
      { ok: false, reason: "RESEND_API_KEY not set in environment" },
      { status: 503 },
    );
  }

  const to =
    req.nextUrl.searchParams.get("to") ?? process.env.ADMIN_ALERT_EMAIL ?? "";
  if (!to) {
    return NextResponse.json(
      {
        ok: false,
        reason:
          "No recipient. Append ?to=g.funaro@1402celsius.com or set ADMIN_ALERT_EMAIL in Netlify.",
      },
      { status: 400 },
    );
  }
  if (!ALLOWED.has(to.toLowerCase())) {
    return NextResponse.json(
      {
        ok: false,
        reason: `Recipient ${to} is not in the allowed list. Allowed: ${Array.from(ALLOWED).join(", ")}`,
      },
      { status: 400 },
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
      from: process.env.RESEND_FROM_EMAIL ?? "hello@ponte.trade",
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
