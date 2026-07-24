import { unstable_noStore as noStore } from "next/cache";
import { createAdminClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/auth";
import { isoCode } from "@/lib/listing-terms";
import { isPubliclyCurrent } from "@/lib/listings/validity";
import { isPubliclyEligibleVerification } from "@/lib/listings/publication-gate";
import { truthfulLabels, type PublicLabel } from "@/lib/listings/public-labels";

/**
 * One Qualified Opportunity, for the Find journey's detail screen (F02).
 *
 * This is the same source and the same gates the shareable marketplace detail
 * page uses (app/[locale]/marketplace/l/[ref]), lifted into a reader so the new
 * Brand v5 detail can render without re-deriving the rules or re-risking a leak.
 * Two invariants carry over exactly:
 *
 *   1. The counterparty stays anonymous. No name, no contact, no user_id in the
 *      returned view: identity is disclosed only through the recorded
 *      introduction, never on the public page. The owner's verification LEVEL is
 *      a fact about whether to spend time here, not an identity, so it is the one
 *      thing about them that travels.
 *   2. Only a current, publicly-eligible opportunity is "visible". A passed
 *      validity or lapsed 90-day reconfirmation, or an owner whose member
 *      verification is no longer passing, makes it "gone" rather than shown.
 *
 * Trust is dated evidence, never a score: the view carries `evidence` from
 * truthfulLabels() (each receipt shown only when the record supports it) and a
 * `lastConfirmed` date, and nothing resembling a percentage or a rating.
 */

type DeskVersion = { qualification?: string | null; limitations?: string | null } | null;

export type QualifiedOpportunity = {
  ref: string;
  /** "offer" | "requirement" | "service". */
  type: string;
  product: string;
  hsCode: string | null;
  chapter: string | null;
  chapterTitle: string | null;
  /** Legacy composed volume, kept for listings that predate the columns. */
  volume: string | null;
  quantity: number | null;
  unit: string | null;
  frequency: string | null;
  incoterm: string | null;
  payment: string | null;
  originText: string | null;
  destinationText: string | null;
  originCode: string | null;
  destinationCode: string | null;
  submitterRole: string | null;
  chainDepth: string | null;
  mandateSighted: boolean;
  validityType: string | null;
  validUntil: string | null;
  /** Reconfirmation date if present, else the decision date. The date that leads. */
  lastConfirmed: string | null;
  deskQualification: string | null;
  deskLimitations: string | null;
  details: string;
  createdAt: string;
  /**
   * A genuine Ponte-desk opportunity, brokered by Ponte rather than posted by a
   * third-party member. True only from the stored `desk_managed` flag: it is
   * never inferred, so the "Ponte-managed" affordance stays a fact.
   */
  deskManaged: boolean;
  /** The owner's member-business verification level, or null if unreadable. */
  trustLevel: number | null;
  /** The dated-evidence receipts this record truthfully supports. */
  evidence: PublicLabel[];
};

export type QualifiedOpportunityLookup =
  | { state: "visible"; opportunity: QualifiedOpportunity }
  | { state: "gone" }
  | { state: "missing" };

const QO_COLUMNS =
  "id, user_id, ref, type, product, hs_code, origin, destination, volume, quantity, unit, frequency, incoterm, payment_terms, submitter_role, chain_depth, mandate_sighted, desk_managed, validity_type, valid_until, reconfirmed_at, decided_at, desk_version, details, created_at";

/** Two-digit HS chapter from any HS code shape ("1701.99" -> "17"). */
function chapterOf(hsCode: string | null): string | null {
  if (!hsCode) return null;
  const digits = hsCode.replace(/\D/g, "");
  return digits.length >= 2 ? digits.slice(0, 2) : null;
}

/**
 * Look up a Qualified Opportunity by its board reference (e.g. "PT-4821").
 *
 * Reads with the admin client because the Find journey serves anonymous
 * visitors and RLS on listings hands them nothing. The select names
 * teaser-and-terms columns only; the owner's identity is read separately and
 * used solely to compute the anonymous verification level and the eligibility
 * gate, never returned.
 *
 * Three honest outcomes: a live opportunity, one that existed but is no longer
 * public, and no such reference. The detail page renders a "no longer active"
 * state for "gone" rather than a bare 404.
 */
export async function getQualifiedOpportunity(
  ref: string,
): Promise<QualifiedOpportunityLookup> {
  noStore();
  if (!isSupabaseConfigured()) return { state: "missing" };

  try {
    const sb = createAdminClient();
    const { data, error } = await sb
      .from("listings")
      .select(QO_COLUMNS)
      .eq("ref", ref.toUpperCase())
      .eq("status", "approved")
      .maybeSingle();
    if (error) throw error;
    if (!data) return { state: "missing" };

    // Current on both axes, exactly as the board and the shareable detail page
    // decide it: the listing's own validity/reconfirmation, then the owner's
    // continuing member-business verification.
    if (!isPubliclyCurrent(data)) return { state: "gone" };

    const { data: profile } = await sb
      .from("profiles")
      .select("verification_level, business_verification_id")
      .eq("id", data.user_id)
      .maybeSingle();

    let verification: { purpose: string | null; status: string | null } | null = null;
    if (profile?.business_verification_id) {
      const { data: v } = await sb
        .from("verifications")
        .select("purpose, status")
        .eq("id", profile.business_verification_id)
        .maybeSingle();
      verification = v ?? null;
    }
    const ownerEligible = isPubliclyEligibleVerification({
      verificationLevel: profile ? Number(profile.verification_level ?? 0) : null,
      business_verification_id: profile?.business_verification_id ?? null,
      verification,
    });
    if (!ownerEligible) return { state: "gone" };

    const desk = (data.desk_version ?? null) as DeskVersion;
    const lastConfirmed = data.reconfirmed_at ?? data.decided_at ?? null;

    const opportunity: QualifiedOpportunity = {
      ref: data.ref,
      type: data.type,
      product: data.product,
      hsCode: data.hs_code,
      chapter: chapterOf(data.hs_code),
      chapterTitle: null,
      volume: data.volume,
      quantity: data.quantity != null ? Number(data.quantity) : null,
      unit: data.unit,
      frequency: data.frequency,
      incoterm: data.incoterm,
      payment: data.payment_terms,
      originText: data.origin,
      destinationText: data.destination,
      originCode: isoCode(data.origin),
      destinationCode: isoCode(data.destination),
      submitterRole: data.submitter_role,
      chainDepth: data.chain_depth,
      mandateSighted: Boolean(data.mandate_sighted),
      validityType: data.validity_type,
      validUntil: data.valid_until,
      lastConfirmed,
      deskQualification: desk?.qualification?.trim() || null,
      deskLimitations: desk?.limitations?.trim() || null,
      details: data.details ?? "",
      createdAt: data.created_at,
      deskManaged: Boolean(data.desk_managed),
      trustLevel: profile ? Number(profile.verification_level ?? 0) : null,
      // The receipts a public page may show. "Opportunity reviewed" is true
      // because this reader only ever returns an approved listing.
      evidence: truthfulLabels({
        businessVerified: ownerEligible,
        submitterRole: data.submitter_role,
        mandateSighted: Boolean(data.mandate_sighted),
        reviewed: true,
        lastConfirmed,
      }),
    };

    await decorateChapter(sb, opportunity);
    return { state: "visible", opportunity };
  } catch {
    // A not-yet-applied migration (desk_managed) or an unreachable database
    // both land here. Missing is the safe answer: the page 404s rather than
    // half-rendering an opportunity we cannot prove is current.
    return { state: "missing" };
  }
}

/** Chapter title for the category label, from the HS catalog. */
async function decorateChapter(
  sb: ReturnType<typeof createAdminClient>,
  qo: QualifiedOpportunity,
): Promise<void> {
  if (!qo.chapter) return;
  try {
    const { data } = await sb
      .from("hs_codes")
      .select("chapter_title")
      .eq("chapter", qo.chapter)
      .maybeSingle();
    if (data?.chapter_title) qo.chapterTitle = data.chapter_title;
  } catch {
    // The label falls back to the chapter number, which is still true.
  }
}
