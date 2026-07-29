import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { getHsCode, isHsCatalogReady } from "@/lib/hs";
import { isoCode } from "@/lib/listing-terms";
import {
  editReturnsToReview,
  ownsListing,
  type MaterialFacts,
} from "@/lib/listings/material-change";
import {
  parseQuantityInput,
  isQuantityMode,
  isQuantityFrequency,
  quantityToColumns,
  type ListingQuantity,
  type QuantityMode,
} from "@/lib/listings/quantity";
import { publishOrHold } from "@/lib/listings/publish";
import { DECLARATION_VERSION, resolutionRoute } from "@/lib/listings/eligibility";
import {
  readClassification,
  FAMILY_TERMS_COLUMNS,
  ALL_CLASSIFICATION_COLUMNS,
} from "@/lib/listings/classification";
import { writeWithMissingColumnFallback } from "@/lib/listings/write-fallback";

type SavedListing = { id: string; ref: string };

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

/**
 * Read the quantity the member actually stated.
 *
 * The old reader was `Number(String(v).replace(/[, ]/g, ""))`, which turns
 * "1.25" into 1.25 and "1,25" into 125. The same figure typed by a European
 * member became a hundredfold error, silently. It also could not express a
 * range, a minimum or "on request", so any of those arrived as a bare number
 * that reads on the board as a firm quantity.
 *
 * Parsing now goes through the shared quantity model, which is separator-safe
 * and mode-aware. An absent mode with a number present is `exact`, which is
 * what a plain figure has always meant.
 */
function readQuantity(body: Record<string, unknown>): ListingQuantity | null {
  const rawMode = clean(body.quantity_mode, 20);
  const value = parseQuantityInput(body.quantity);
  const minValue = parseQuantityInput(body.quantity_min);
  const maxValue = parseQuantityInput(body.quantity_max);
  const unit = clean(body.unit, 30) || null;
  const frequency = clean(body.frequency, 30);

  let mode: QuantityMode | null = isQuantityMode(rawMode) ? rawMode : null;
  if (!mode) {
    if (minValue !== null && maxValue !== null) mode = "range";
    else if (value !== null) mode = "exact";
  }
  if (!mode) return null;

  return {
    mode,
    value,
    minValue,
    maxValue,
    unit,
    frequency: isQuantityFrequency(frequency) ? frequency : null,
  };
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

// NOTE ON THE WRITE-UP: this route deliberately does NOT accept ai_version,
// share_text or any other purportedly AI-generated draft from the client. A
// direct request could otherwise forge content the admin queue would present as
// Ponte's fact-only engine output. The only writer of ai_version is the admin's
// server-side generateWriteupAction, which regenerates it from the persisted
// structured facts. The composer's write-up is a preview for the member and is
// never persisted.

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

  // The structured classification. Refused rather than repaired: a service
  // category arriving on a distribution record is a mis-filed record, and a
  // mis-filed record is worse than a missing one, because every filter, count
  // and match downstream trusts it.
  const classification = readClassification(body);
  if (!classification.ok) {
    return NextResponse.json(
      { error: classification.error, field: classification.field },
      { status: 422 },
    );
  }

  const valueRaw = clean(body.indicative_value_usd, 20);
  const value = valueRaw ? Number(valueRaw) : null;
  const indicative = value && Number.isFinite(value) && value > 0 ? value : null;

  // The structured facts, written alongside the legacy compatibility columns
  // (volume/origin/destination/details) that the board and detail parsers
  // still read, so nothing on those surfaces regresses.
  const quantity = readQuantity(body);

  // The member's responsibility declaration. Ponte publishes automatically, so
  // the member, not a reviewer, is the person who has said the record is
  // accurate and that they are entitled to have it published. The accepted
  // VERSION is stored with the timestamp: knowing somebody accepted terms is
  // worthless without knowing which terms they accepted.
  const declarationAccepted = body.declaration_accepted === true;

  const fields: Record<string, unknown> = {
    type,
    product,
    hs_code: hsCode,
    origin: originText,
    destination: destinationText,
    origin_country: originCountry,
    destination_country: destinationCountry,
    volume: clean(body.volume, 120) || null,
    ...quantityToColumns(quantity),
    // Kept as the member wrote it. It is a member-visible string on live
    // listings, so it is normalised on read rather than rewritten on write.
    frequency: clean(body.frequency, 30) || null,
    quantity_extracted: body.quantity_extracted === true,
    quantity_confirmed_at:
      body.quantity_confirmed === true ? new Date().toISOString() : null,
    ...(declarationAccepted
      ? {
          declaration_accepted_at: new Date().toISOString(),
          declaration_version: DECLARATION_VERSION,
        }
      : {}),
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
    ...classification.columns,
  };

  const supabase = createClient();

  /**
   * Write, and survive the window where a column does not exist yet.
   *
   * A merge to `main` applies no migration in this repository: the chain is
   * broken and every schema change is run by hand with owner approval. So a
   * window always exists in which this route sends a column the database does
   * not have, and a member who filled in a correct record must not lose the
   * submission to it. The rule and its history live in
   * `lib/listings/write-fallback.ts`; the two staged groups below are what it
   * falls through when the database will not say WHICH column it is missing.
   *
   * This is a bridge, not a design. See docs/codex/DATABASE-STATE.md for the
   * migrations production still owes.
   */
  const writeWithFallback = <T>(
    attempt: (row: Record<string, unknown>) => Promise<{ data: T | null; error: unknown }>,
    row: Record<string, unknown>,
  ) =>
    writeWithMissingColumnFallback(attempt, row, {
      fallbackGroups: [FAMILY_TERMS_COLUMNS, ALL_CLASSIFICATION_COLUMNS],
      // A dropped column is a schema change somebody still owes production, so
      // it is named in the log rather than absorbed silently.
      onDrop: (column) =>
        console.warn(`[ponte] listings has no '${column}' column; storing without it`),
    });

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

    // Ownership is enforced server-side (RLS also guards it). A listing that is
    // not the caller's own cannot be edited, so cross-account edits are refused.
    if (!existing || !ownsListing(existing.user_id, user.id)) {
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

    // Any change to member-controlled public content or approval evidence pulls
    // an approved opportunity back to the desk: its public version and its
    // decision are no longer valid until reviewed again. The preserved fields
    // keep their stored value for this comparison, so a field the edit did not
    // carry is never counted as a change. assetsChanged flags a media/document
    // change, which a field diff cannot see.
    const afterForCompare: Record<string, unknown> = { ...fields };
    for (const k of preserved) {
      if (afterForCompare[k] === null) {
        afterForCompare[k] = (existing as Record<string, unknown>)[k];
      }
    }
    const assetsChanged = body.assetsChanged === true;
    let returnedToReview = false;
    if (isDraft) {
      update.status = "draft";
    } else if (
      editReturnsToReview({
        priorStatus: existing.status,
        before: existing as MaterialFacts,
        after: afterForCompare as MaterialFacts,
        assetsChanged,
      })
    ) {
      // Clear every piece of approval-specific state so none of it survives the
      // re-review: the decision, its metadata, the desk-approved public text,
      // the reconfirmation stamp and any stale generated draft.
      update.status = "submitted";
      update.decided_at = null;
      update.decision_note = null;
      update.desk_version = null;
      update.reconfirmed_at = null;
      update.ai_version = null;
      update.writeup_at = null;
      update.share_text = null;
      update.prompt_version = null;
      update.model = null;
      returnedToReview = true;
    } else if (existing.status === "draft") {
      update.status = "submitted";
    }
    // else: an approved listing edited with no reviewable change stays approved.

    const { error: updErr } = await writeWithFallback(
      async (row) => {
        const { error } = await supabase.from("listings").update(row).eq("id", editId);
        return { data: null, error };
      },
      update,
    );
    if (updErr) {
      console.error("[ponte] listing edit failed:", updErr);
      return NextResponse.json(
        { error: "Could not save your changes. Please try again." },
        { status: 500 },
      );
    }

    // An edit that returned the listing to review re-enters the automated path
    // rather than the desk queue. `editReturnsToReview` still decides WHETHER a
    // change is material enough to revalidate; what changed is where a
    // revalidation goes, which is back through the same validator that
    // published it the first time.
    if (!isDraft && update.status === "submitted") {
      const outcome = await revalidate(editId);
      if (outcome) {
        return NextResponse.json({
          ok: true,
          ref: existing.ref,
          id: existing.id,
          returnedToReview,
          ...outcome,
        });
      }
    }

    return NextResponse.json({
      ok: true,
      ref: existing.ref,
      id: existing.id,
      returnedToReview,
    });
  }

  // -------- New listing --------------------------------------------------
  const newRow: Record<string, unknown> = {
    user_id: user.id,
    ...fields,
    status: isDraft ? "draft" : "submitted",
  };

  const { data: listing, error: insertErr } = await writeWithFallback<SavedListing>(
    async (row) => await supabase.from("listings").insert(row).select("id, ref").single(),
    newRow,
  );

  if (insertErr || !listing) {
    console.error("[ponte] listing insert failed:", insertErr);
    return NextResponse.json(
      { error: "Could not save your listing. Please try again." },
      { status: 500 },
    );
  }

  // Drafts are private: nothing is validated, nothing is emailed.
  if (isDraft) {
    return NextResponse.json({ ok: true, ref: listing.ref, id: listing.id });
  }

  const outcome = await revalidate(listing.id);
  return NextResponse.json({ ok: true, ref: listing.ref, id: listing.id, ...(outcome ?? {}) });
}

/**
 * Run the central validator over a listing and take it wherever it says.
 *
 * This replaces the pair of emails that used to fire here: a "your listing is
 * with the desk" note to the member and a `sendBrokerageSubmission` to the
 * operator whose body ended "review in /admin/listings". Together those WERE
 * the approval workflow: a queue implemented in email, with no listing URL, no
 * review reason and no way to act.
 *
 * The publication decision needs the submitter's live verification state and
 * has to write a status a member is not permitted to write, so it runs under
 * the service role. It is awaited: a publication whose confirmation email was
 * dropped because the function returned is a member who is live and does not
 * know it.
 *
 * A failure here does not fail the request. The listing is saved either way,
 * and a listing stuck in `submitted` is visible in the exception console.
 */
async function revalidate(
  listingId: string,
): Promise<{ status: string; blockingIssues: string[]; completenessScore: number; route: string } | null> {
  try {
    const admin = createAdminClient();
    const { data: row } = await admin
      .from("listings")
      .select("*")
      .eq("id", listingId)
      .maybeSingle();
    if (!row) return null;

    const outcome = await publishOrHold(admin as never, row as never);
    return {
      status: outcome.status,
      blockingIssues: outcome.result.blockingIssues.map((i) => i.message),
      completenessScore: outcome.result.completenessScore,
      // Where the member actually resolves this. Verification is not fixable on
      // the listing form, so the screen must not send them there for it.
      route: resolutionRoute(outcome.result.blockingIssues),
    };
  } catch (err) {
    console.error("[ponte] automated publication failed:", err);
    return null;
  }
}
