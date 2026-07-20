import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { sendListingReceived, sendBrokerageSubmission } from "@/lib/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_FILES = 5;
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
]);
const TYPES = new Set(["offer", "requirement", "service"]);

function clean(v: FormDataEntryValue | null, max: number): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

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

  const form = await req.formData();
  const type = clean(form.get("type"), 20);
  const product = clean(form.get("product"), 200);
  const details = clean(form.get("details"), 3000);
  const valueRaw = clean(form.get("indicative_value_usd"), 20);
  const value = valueRaw ? Number(valueRaw) : null;

  if (!TYPES.has(type) || !product || !details) {
    return NextResponse.json(
      { error: "Please complete the required fields." },
      { status: 400 },
    );
  }

  const files = form
    .getAll("documents")
    .filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length > MAX_FILES) {
    return NextResponse.json(
      { error: `Maximum ${MAX_FILES} documents.` },
      { status: 400 },
    );
  }
  for (const f of files) {
    if (f.size > MAX_FILE_BYTES) {
      return NextResponse.json(
        { error: `"${f.name}" is over 10 MB.` },
        { status: 400 },
      );
    }
    if (!ALLOWED_MIME.has(f.type)) {
      return NextResponse.json(
        { error: `"${f.name}": only PDF, PNG, JPG or WEBP.` },
        { status: 400 },
      );
    }
  }

  // Insert as the signed-in user so RLS applies.
  const supabase = createClient();
  const { data: listing, error: insertErr } = await supabase
    .from("listings")
    .insert({
      user_id: user.id,
      type,
      product,
      hs_code: clean(form.get("hs_code"), 12) || null,
      origin: clean(form.get("origin"), 80) || null,
      destination: clean(form.get("destination"), 80) || null,
      volume: clean(form.get("volume"), 120) || null,
      incoterm: clean(form.get("incoterm"), 20) || null,
      indicative_value_usd: value && Number.isFinite(value) && value > 0 ? value : null,
      details,
      status: "submitted",
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

  // Upload documents under the member's own prefix (storage RLS enforces it).
  for (const f of files) {
    const safeName = f.name.replace(/[^\w.\-]+/g, "_").slice(-80);
    const path = `${user.id}/${listing.id}/${Date.now()}_${safeName}`;
    const { error: upErr } = await supabase.storage
      .from("listing-docs")
      .upload(path, f, { contentType: f.type });
    if (upErr) {
      console.error("[ponte] doc upload failed:", upErr);
      continue; // listing stands; missing docs surface during vetting
    }
    await supabase.from("listing_documents").insert({
      listing_id: listing.id,
      user_id: user.id,
      path,
      filename: f.name.slice(-120),
    });
  }

  // Notify both sides. Awaited: on serverless, un-awaited work is killed
  // the moment the response returns.
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
      country: clean(form.get("origin"), 80) || "-",
      product,
      volume: clean(form.get("volume"), 120) || undefined,
      details: `${details}\n\n[${files.length} document(s) attached · review in /admin/listings]`,
    }),
  ]);

  return NextResponse.json({ ok: true, ref: listing.ref });
}
