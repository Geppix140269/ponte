import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { sendConnectRequest, sendBrokerageSubmission } from "@/lib/email";
import {
  cleanInterest,
  interestIsComplete,
  missingInterestFields,
  INTEREST_ROLE_LABELS,
  type InterestRole,
} from "@/lib/interest/expression";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// A member sends a structured expression of interest on an approved listing:
// the interested business, its role, the target, the geography and a short
// reason for fit (brief Block D). The owner decides on that substance;
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
  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
    ref = typeof body.ref === "string" ? body.ref.trim().slice(0, 12) : "";
  } catch {
    /* fallthrough */
  }
  if (!/^PT-\d{3,6}$/.test(ref)) {
    return NextResponse.json({ error: "Invalid reference." }, { status: 400 });
  }

  // The expression of interest must be a meaningful, structured request, not a
  // bare connect. The completeness rule lives in the pure module so it is the
  // same rule the test pins.
  const interest = cleanInterest(body);
  if (!interestIsComplete(interest)) {
    return NextResponse.json(
      { error: "Incomplete request.", missing: missingInterestFields(interest) },
      { status: 400 },
    );
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

  // One request per member per listing; a repeat click is a no-op. The
  // structured fields ride on the same row (columns added in Block D).
  const { error: insertErr } = await supabase.from("listing_connections").insert({
    listing_id: listing.id,
    requester_id: user.id,
    status: "pending",
    interested_business: interest.interested_business,
    interest_role: interest.interest_role,
    interest_target: interest.interest_target,
    interest_geography: interest.interest_geography,
    interest_reason: interest.interest_reason,
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
        company: interest.interested_business,
        email: user.email ?? "unknown@ponte.trade",
        country: interest.interest_geography || "-",
        product: listing.product,
        details: [
          `${user.email ?? user.id} expressed interest on ${listing.ref} (${listing.type} · ${listing.product}).`,
          `Interested business: ${interest.interested_business}`,
          `Role: ${INTEREST_ROLE_LABELS[interest.interest_role as InterestRole]}`,
          `Target: ${interest.interest_target}`,
          `Geography: ${interest.interest_geography}`,
          `Reason for fit: ${interest.interest_reason}`,
          `Owner notified; awaiting owner decision. Desk involvement is optional under the free-connect model.`,
        ].join("\n"),
      }),
    ]);
  }

  return NextResponse.json({ ok: true });
}
