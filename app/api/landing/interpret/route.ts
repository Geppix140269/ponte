import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { interpretObjective } from "@/lib/landing/interpret";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * AI reading of the landing objective, for any language and any product.
 *
 * Called only as a fallback: the client runs the free, deterministic matcher
 * first and reaches here only when that cannot resolve the phrase. The API key
 * lives here on the server and never in the browser.
 *
 *   POST { text: string }  ->  { ok: true, route, product, company, reply, language }
 *                          ->  { ok: false }   (not configured, empty, or failed; client falls back)
 *
 * Every model call is metered in lib/ai. Two rate limits bound the cost: a
 * burst limit per minute and a slower hourly cap, both per client IP.
 */
export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  if (
    !checkRateLimit(`interpret:min:${ip}`, 15, 60 * 1000) ||
    !checkRateLimit(`interpret:hr:${ip}`, 120, 60 * 60 * 1000)
  ) {
    return NextResponse.json({ ok: false, reason: "rate_limited" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const text = typeof (body as { text?: unknown })?.text === "string"
    ? (body as { text: string }).text.slice(0, 400)
    : "";
  if (text.trim().length < 2) {
    return NextResponse.json({ ok: false });
  }

  const result = await interpretObjective(text);
  if (!result) {
    // AI unavailable or the call failed: tell the client to fall back.
    return NextResponse.json({ ok: false });
  }

  return NextResponse.json({ ok: true, ...result });
}
