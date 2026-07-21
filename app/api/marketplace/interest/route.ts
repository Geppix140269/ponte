import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { sendConnectRequest, sendBrokerageSubmission } from "@/lib/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// A member requests to connect on an approved listing. The owner decides;
// identities are revealed only when both sides agree. Free, always.
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
    .select("id, ref, type, product, user_id")
    .eq("ref", ref)
    .eq("status", "approved")
    .maybeSingle();
  if (!listing) {
    return NextResponse.json({ error: "Listing not found." }, { status: 404 });
  }
  if (listing.user_id === user.id) {
    return NextResponse.json({ error: "This is your own listing." }, { status: 400 });
  }

  // One request per member per listing; a repeat click is a no-op.
  const { error: insertErr } = await supabase.from("listing_connections").insert({
    listing_id: listing.id,
    requester_id: user.id,
    status: "pending",
  });
  if (insertErr && !insertErr.message?.includes("duplicate")) {
    console.error("[ponte] connection request failed:", insertErr);
    return NextResponse.json({ error: "Could not send the request." }, { status: 500 });
  }

  if (!insertErr) {
    // Notify the listing owner (the requester's identity is NOT revealed
    // yet) and keep the desk in the loop.
    const adminSb = createAdminClient();
    const { data: owner } = await adminSb.auth.admin.getUserById(listing.user_id);
    const ownerEmail = owner?.user?.email;
    await Promise.allSettled([
      ownerEmail
        ? sendConnectRequest(ownerEmail, { ref: listing.ref, product: listing.product })
        : Promise.resolve(),
      sendBrokerageSubmission({
        type: "requirement",
        name: user.email ?? user.id,
        company: `Connection request on ${listing.ref}`,
        email: user.email ?? "unknown@ponte.trade",
        country: "-",
        product: listing.product,
        details: `${user.email ?? user.id} requested to connect on ${listing.ref} (${listing.type} · ${listing.product}). Owner notified; awaiting owner decision. Desk involvement is optional under the free-connect model.`,
      }),
    ]);
  }

  return NextResponse.json({ ok: true });
}
