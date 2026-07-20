import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { sendBrokerageSubmission } from "@/lib/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }

  const ip = getClientIp(req);
  if (!checkRateLimit(`interest:${user.id}:${ip}`, 20, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  let ref = "";
  try {
    const body = await req.json();
    ref = typeof body.ref === "string" ? body.ref.trim().slice(0, 12) : "";
  } catch {
    /* fallthrough */
  }
  if (!/^PT-\d{3,6}$/.test(ref)) {
    return NextResponse.json({ error: "Invalid reference." }, { status: 400 });
  }

  // The authenticated-read policy only exposes approved listings.
  const supabase = createClient();
  const { data: listing } = await supabase
    .from("listings")
    .select("ref, type, product, origin, destination")
    .eq("ref", ref)
    .eq("status", "approved")
    .maybeSingle();
  if (!listing) {
    return NextResponse.json({ error: "Listing not found." }, { status: 404 });
  }

  await sendBrokerageSubmission({
    type: "requirement",
    name: user.email ?? user.id,
    company: `Interest in ${listing.ref}`,
    email: user.email ?? "unknown@ponte.trade",
    country: "-",
    product: listing.product,
    details: `Member ${user.email ?? user.id} expressed interest in ${listing.ref} (${listing.type} · ${listing.product}). Next step: verify fit, then NCNDA and fee terms before any introduction.`,
  });

  return NextResponse.json({ ok: true });
}
