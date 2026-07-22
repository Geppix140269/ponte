import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { assessListing, isAiConfigured } from "@/lib/ai-vet";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function clean(v: unknown, max: number): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

/**
 * Instant listing check on the preview step. Free, for members and guests
 * alike, and deliberately so: this is what a visitor gets back before we ask
 * them for anything, and metering the one thing we give away first is how you
 * lose the visitor.
 *
 * It used to allow three checks per member and then answer 402 selling a $19
 * subscription. That subscription no longer exists. Credits pay for
 * counterparty verification; nothing else on the platform is metered.
 *
 * Abuse control is the per-IP rate limit alone, set generously enough that a
 * person iterating on one listing never meets it.
 */
export async function POST(req: NextRequest) {
  if (!isAiConfigured()) {
    return NextResponse.json({ error: "Not available." }, { status: 503 });
  }

  const ip = getClientIp(req);
  if (!checkRateLimit(`assess:${ip}`, 30, 60 * 60 * 1000)) {
    return NextResponse.json(
      { error: "Too many checks. Try again in a while." },
      { status: 429 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const description = clean(body.description, 2500);
  if (description.length < 15) {
    return NextResponse.json(
      { error: "Write the description first, then check." },
      { status: 400 },
    );
  }

  const assessment = await assessListing({
    type: clean(body.type, 20),
    product: clean(body.product, 200),
    description,
    quantity: clean(body.quantity, 60),
    price: clean(body.price, 60),
    origin: clean(body.origin, 80),
    destination: clean(body.destination, 80),
    role: clean(body.role, 60),
    media_count: Math.min(Number(body.media_count) || 0, 20),
  });
  if (!assessment) {
    return NextResponse.json({ error: "Could not assess." }, { status: 502 });
  }

  return NextResponse.json({ ok: true, assessment });
}
