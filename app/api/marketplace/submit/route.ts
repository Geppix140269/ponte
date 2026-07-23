import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { sendListingReceived, sendBrokerageSubmission } from "@/lib/email";
import { getHsCode, isHsCatalogReady } from "@/lib/hs";
import { isoCode } from "@/lib/listing-terms";
import { hasMaterialChange, type MaterialFacts } from "@/lib/listings/material-change";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TYPES = new Set(["offer", "requirement", "service"]);
const VALIDITY_TYPES = new Set(["dated", "standing"]);

// The write-up's flexibility flags, constrained here rather than trusted, so a
// hostile payload cannot smuggle free text into a stored field through a key.
const FLEX_TERMS = new Set([
  "price", "payment_terms", "quantity", "delivery_window", "incoterm", "inspection",
]);
const FLEX_STATES = new Set(["fixed", "negotiable", "open"]);

function clean(v: unknown, max: number): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

function positiveNumber(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(String(v).replace(/[, ]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
}

function flexibilityOf(v: unknown): Record<string, string> {
  if (!v || typeof v !== "object") return {};
  const out: Record<string, string> = {};
  for (const [term, state] of Object.entries(v as Record<string, unknown>)) {
    if (FLEX_TERMS.has(term) && typeof state === "string" && FLEX_STATES.has(state)) {
      out[term] = state;
    }
  }
  return out;
}

// The member-confirmed fact-only draft, shaped and clipped. This is stored as
// the INTERNAL draft (ai_version) for the desk to review; it is never shown to
// the public, which reads the desk-approved text the admin writes. So it is
// enough to shape it defensively here rather than regenerate it server-side.
function writeupOf(v: unknown): Record<string, unknown> | null {
  if (!v || typeof v !== "object") return null;
  const r = v as Record<string, unknown>;
  const str = (x: unknown, max: number) => (typeof x === "string" ? x.slice(0, max) : "");
  const arr = (x: unknown, max: number, each: number) =>
    Array.isArray(x) ? x.map((s) => str(s, each)).filter(Boolean).slice(0, max) : [];
  const description = str(r.description, 1400);
  if (!description) return null;
  return {
    description,
    strengths: arr(r.strengths, 4, 200),
    open_points: Array.isArray(r.open_points)
      ? r.open_points
          .map((p) => {
            const o = (p ?? {}) as Record<string, unknown>;
            const text = str(o.text ?? p, 300);
            const ref = str(o.field_ref, 40);
            return text ? { text, field_ref: ref || null } : null;
          })
          .filter(Boolean)
          .slice(0, 4)
      : [],
    non_negotiables: str(r.non_negotiables, 900),
    summary_line: str(r.summary_line, 90),
    share_text: str(r.share_text, 180),
  };
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
  const isDraft = body.draft === true;
  const editId = clean(body.id, 40) || null;

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

  // Corridor: keep the member's own words, and derive an ISO-2 code only when
  // the text actually names a country (the DB constrains these to ^[A-Z]{2}$).
  // Nothing is guessed: an unrecognised place leaves the country column null.
  const originText = clean(body.origin, 80) || null;
  const destinationText = clean(body.destination, 80) || null;
  const originCountry = isoCode(originText);
  const destinationCountry = isoCode(destinationText);

  // Validity: dated with a real date, or standing. An incoherent pair is
  // reduced to undeclared rather than written (the DB enforces coherence, and
  // an undeclared horizon simply cannot be approved by the gate).
  let validityType: string | null = clean(body.validity_type, 20) || null;
  let validUntil: string | null = clean(body.valid_until, 12) || null;
  if (!validityType || !VALIDITY_TYPES.has(validityType)) {
    validityType = null;
    validUntil = null;
  } else if (validityType === "standing") {
    validUntil = null;
  } else {
    // dated
    if (validUntil && !/^\d{4}-\d{2}-\d{2}$/.test(validUntil)) validUntil = null;
    if (!validUntil) validityType = null;
  }

  const valueRaw = clean(body.indicative_value_usd, 20);
  const value = valueRaw ? Number(valueRaw) : null;
  const indicative = value && Number.isFinite(value) && value > 0 ? value : null;

  // The structured facts, written alongside the legacy compatibility columns
  // (volume/origin/destination/details) that the board and detail parsers
  // still read, so nothing on those surfaces regresses.
  const fields: Record<string, unknown> = {
    type,
    product,
    hs_code: hsCode,
    origin: originText,
    destination: destinationText,
    origin_country: originCountry,
    destination_country: destinationCountry,
    volume: clean(body.volume, 120) || null,
    quantity: positiveNumber(body.quantity),
    unit: clean(body.unit, 30) || null,
    frequency: clean(body.frequency, 30) || null,
    incoterm: clean(body.incoterm, 20) || null,
    payment_terms: clean(body.payment_terms, 200) || null,
    indicative_value_usd: indicative,
    submitter_role: clean(body.submitter_role, 60) || null,
    chain_depth: clean(body.chain_depth, 60) || null,
    key_notes: clean(body.key_notes, 400) || null,
    flexibility: flexibilityOf(body.flexibility),
    validity_type: validityType,
    valid_until: validUntil,
    details,
  };

  // The member-confirmed fact-only draft and its provenance, when the composer
  // generated one. Stored as the internal draft the desk reviews.
  const draftWriteup = writeupOf(body.writeup);
  const meta = (body.writeup_meta ?? {}) as Record<string, unknown>;
  if (draftWriteup) {
    fields.ai_version = {
      writeup: draftWriteup,
      prompt_version: clean(meta.prompt_version, 40) || null,
      model: clean(meta.model, 60) || null,
    };
    fields.prompt_version = clean(meta.prompt_version, 40) || null;
    fields.model = clean(meta.model, 60) || null;
    fields.writeup_at = new Date().toISOString();
    fields.share_text = (draftWriteup.share_text as string) || null;
  }

  const supabase = createClient();

  // -------- Owner edit: update in place, and return an approved listing to
  //          review if a material term changed (brief Block C). --------------
  if (editId) {
    const { data: existing } = await supabase
      .from("listings")
      .select(
        "id, ref, user_id, status, product, hs_code, quantity, unit, frequency, origin, destination, origin_country, destination_country, incoterm, payment_terms, validity_type, valid_until, submitter_role, chain_depth, indicative_value_usd",
      )
      .eq("id", editId)
      .maybeSingle();

    if (!existing || existing.user_id !== user.id) {
      // RLS also guards this; the explicit check keeps the message honest.
      return NextResponse.json(
        { error: "That listing cannot be edited from this account." },
        { status: 404 },
      );
    }

    const update: Record<string, unknown> = { ...fields, updated_at: new Date().toISOString() };

    // The composer edit does not round-trip price, key notes or the HS code, so
    // a null on one of these means "unchanged", not "clear it": drop it from the
    // update and preserve what is stored.
    const preserved = ["indicative_value_usd", "key_notes", "hs_code"];
    for (const k of preserved) {
      if (update[k] === null) delete update[k];
    }

    // A material change to an already-approved opportunity pulls it back to the
    // desk: the public version and its decision are no longer valid until it is
    // reviewed again. A non-material edit (description, notes) leaves it live.
    // The preserved fields keep their stored value for this comparison, so a
    // field the edit simply did not carry is never counted as a change.
    const afterForCompare: Record<string, unknown> = { ...fields };
    for (const k of preserved) {
      if (afterForCompare[k] === null) {
        afterForCompare[k] = (existing as Record<string, unknown>)[k];
      }
    }
    const materialChanged = hasMaterialChange(
      existing as MaterialFacts,
      afterForCompare as MaterialFacts,
    );
    let returnedToReview = false;
    if (isDraft) {
      update.status = "draft";
    } else if (existing.status === "approved" && materialChanged) {
      update.status = "submitted";
      update.decided_at = null;
      update.desk_version = null; // public text must be re-authored
      returnedToReview = true;
    } else if (existing.status === "draft") {
      update.status = "submitted";
    }
    // else: an approved listing edited without a material change stays approved.

    const { error: updErr } = await supabase.from("listings").update(update).eq("id", editId);
    if (updErr) {
      console.error("[ponte] listing edit failed:", updErr);
      return NextResponse.json(
        { error: "Could not save your changes. Please try again." },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      ref: existing.ref,
      id: existing.id,
      returnedToReview,
    });
  }

  // -------- New listing --------------------------------------------------
  const { data: listing, error: insertErr } = await supabase
    .from("listings")
    .insert({
      user_id: user.id,
      ...fields,
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
      country: originText || "-",
      product,
      volume: clean(body.volume, 120) || undefined,
      details: `${details}\n\n[media and documents upload directly from the member's browser · review in /admin/listings]`,
    }),
  ]);

  return NextResponse.json({ ok: true, ref: listing.ref, id: listing.id });
}
