import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { sendListingReceived, sendBrokerageSubmission } from "@/lib/email";
import { getHsCode, isHsCatalogReady } from "@/lib/hs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TYPES = new Set(["offer", "requirement", "service"]);

function clean(v: unknown, max: number): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

// Metadata only. Photos, videos and documents are uploaded by the browser
// straight to Supabase Storage (serverless request bodies are too small
// for video), then registered in listing_media / listing_documents under
// the member's own RLS identity.
export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json(
      { error: "Please sign in to submit a listing." },
      { status: 401 },
    );
  }

  const ip = getClientIp(req);
  if (!checkRateLimit(`listing:${user.id}:${ip}`, 10, 60 * 60 * 1000)) {
    return NextResponse.json(
      { error: "Too many submissions. Please try again later." },
      { status: 429 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const type = clean(body.type, 20);
  const product = clean(body.product, 200);
  const details = clean(body.details, 3000);
  const valueRaw = clean(body.indicative_value_usd, 20);
  const value = valueRaw ? Number(valueRaw) : null;
  const isDraft = body.draft === true;

  if (!TYPES.has(type) || !product || !details) {
    return NextResponse.json(
      { error: "Please complete the required fields." },
      { status: 400 },
    );
  }

  // An HS code is either a row in the official HS 2022 catalog or it is
  // nothing. The shape check alone would happily accept 999999, and a board
  // filtered by classification is worth nothing if the classifications are
  // invented. This is the guard the HS brief calls non-negotiable.
  //
  // The catalog is applied by hand, so a window exists where the table is
  // absent. In that window a code cannot be verified, so it is dropped rather
  // than trusted: a null classification is honest, an unverified one is not.
  let hsCode: string | null = null;
  const rawHs = clean(body.hs_code, 12).replace(/\D/g, "");
  if (rawHs) {
    const found = await getHsCode(rawHs);
    if (found) {
      hsCode = found.code;
    } else if (await isHsCatalogReady()) {
      return NextResponse.json(
        {
          error: `${rawHs} is not a valid HS 2022 code. Pick one from the catalog.`,
          field: "hs_code",
        },
        { status: 422 },
      );
    } else {
      console.warn(`[ponte] hs_codes absent, dropping unverified code ${rawHs}`);
    }
  }

  const supabase = createClient();
  const { data: listing, error: insertErr } = await supabase
    .from("listings")
    .insert({
      user_id: user.id,
      type,
      product,
      hs_code: hsCode,
      origin: clean(body.origin, 80) || null,
      destination: clean(body.destination, 80) || null,
      volume: clean(body.volume, 120) || null,
      incoterm: clean(body.incoterm, 20) || null,
      indicative_value_usd:
        value && Number.isFinite(value) && value > 0 ? value : null,
      submitter_role: clean(body.submitter_role, 60) || null,
      chain_depth: clean(body.chain_depth, 60) || null,
      details,
      status: isDraft ? "draft" : "submitted",
    })
    .select("id, ref")
    .single();

  if (insertErr || !listing) {
    console.error("[ponte] listing insert failed:", insertErr);
    return NextResponse.json(
      { error: "Could not save your listing. Please try again." },
      { status: 500 },
    );
  }

  // Drafts are private: no desk alert, no confirmation email.
  if (isDraft) {
    return NextResponse.json({ ok: true, ref: listing.ref, id: listing.id });
  }

  const memberEmail = user.email ?? "";
  await Promise.allSettled([
    memberEmail
      ? sendListingReceived(memberEmail, { ref: listing.ref, product })
      : Promise.resolve(),
    sendBrokerageSubmission({
      type: type as "offer" | "requirement",
      name: memberEmail || user.id,
      company: `Marketplace listing ${listing.ref}`,
      email: memberEmail || "unknown@ponte.trade",
      country: clean(body.origin, 80) || "-",
      product,
      volume: clean(body.volume, 120) || undefined,
      details: `${details}\n\n[media and documents upload directly from the member's browser · review in /admin/listings]`,
    }),
  ]);

  return NextResponse.json({ ok: true, ref: listing.ref, id: listing.id });
}
