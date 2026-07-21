import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { assessListing, isAiConfigured } from "@/lib/ai-vet";
import { getUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Freemium: signed-in members get this many free listing checks in total,
// then Ponte AI ($19/month) unlocks unlimited. Guests get a taste via the
// IP rate limit below.
const FREE_CHECKS = 3;

function clean(v: unknown, max: number): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

// Instant listing check on the preview step. Works for guests too:
// reciprocity before registration. Tightly rate-limited per IP because it
// costs an AI call.
export async function POST(req: NextRequest) {
  if (!isAiConfigured()) {
    return NextResponse.json({ error: "Not available." }, { status: 503 });
  }

  const ip = getClientIp(req);
  if (!checkRateLimit(`assess:${ip}`, 6, 60 * 60 * 1000)) {
    return NextResponse.json(
      { error: "Too many checks. Try again in a while." },
      { status: 429 },
    );
  }

  // Freemium gate for signed-in members (guests keep the tasting limit).
  const user = await getUser();
  if (user) {
    const adminSb = createAdminClient();
    const { data: profile } = await adminSb
      .from("profiles")
      .select("ai_member")
      .eq("id", user.id)
      .maybeSingle();
    if (!profile?.ai_member) {
      const { data: usage } = await adminSb
        .from("ai_usage")
        .select("used")
        .eq("user_id", user.id)
        .eq("feature", "listing_check")
        .maybeSingle();
      const used = usage?.used ?? 0;
      if (used >= FREE_CHECKS) {
        return NextResponse.json(
          { error: "Free checks used.", upgrade: true },
          { status: 402 },
        );
      }
      await adminSb.from("ai_usage").upsert({
        user_id: user.id,
        feature: "listing_check",
        used: used + 1,
      });
    }
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
