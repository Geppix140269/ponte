// What counts as a change that must return an approved opportunity to review.
//
// The brief requires that "material changes after approval return the
// opportunity to review". The acceptance correction sharpens that: ANY change
// to member-controlled public content or approval evidence must return it, not
// only the commercial numbers. So the set below covers the product, the
// numbers, the corridor, the terms, who is submitting and how far they sit from
// the principal, AND the free-text the public reads (details, key notes).
//
// Media and documents live in separate tables written straight from the
// browser, so a field diff cannot see them. The write path passes an explicit
// `assetsChanged` signal for those, and editReturnsToReview ORs it in.
//
// Pure and import-free.

export type MaterialFacts = {
  product?: string | null;
  hs_code?: string | null;
  quantity?: number | string | null;
  unit?: string | null;
  frequency?: string | null;
  origin?: string | null;
  destination?: string | null;
  origin_country?: string | null;
  destination_country?: string | null;
  incoterm?: string | null;
  payment_terms?: string | null;
  validity_type?: string | null;
  valid_until?: string | null;
  submitter_role?: string | null;
  chain_depth?: string | null;
  indicative_value_usd?: number | string | null;
  details?: string | null;
  key_notes?: string | null;
};

// Every member-controlled field a counterparty sees or the desk approved on.
const MATERIAL_KEYS: (keyof MaterialFacts)[] = [
  "product",
  "hs_code",
  "quantity",
  "unit",
  "frequency",
  "origin",
  "destination",
  "origin_country",
  "destination_country",
  "incoterm",
  "payment_terms",
  "validity_type",
  "valid_until",
  "submitter_role",
  "chain_depth",
  "indicative_value_usd",
  "details",
  "key_notes",
];

const norm = (v: unknown): string =>
  v === null || v === undefined ? "" : String(v).trim();

/** The member-controlled fields that differ between two versions of a listing. */
export function changedMaterialFields(
  before: MaterialFacts,
  after: MaterialFacts,
): string[] {
  return MATERIAL_KEYS.filter((k) => norm(before[k]) !== norm(after[k]));
}

/** Whether any member-controlled field changed. */
export function hasMaterialChange(
  before: MaterialFacts,
  after: MaterialFacts,
): boolean {
  return changedMaterialFields(before, after).length > 0;
}

/**
 * Whether an owner edit must return the listing to the desk.
 *
 * Only an already-approved listing can be returned to review; a draft or a
 * listing still in review has no approval to invalidate. A material field
 * change or a change to the attached media/documents both trigger it.
 */
export function editReturnsToReview(opts: {
  priorStatus: string;
  before: MaterialFacts;
  after: MaterialFacts;
  assetsChanged: boolean;
}): boolean {
  if (opts.priorStatus !== "approved") return false;
  return opts.assetsChanged || hasMaterialChange(opts.before, opts.after);
}

/** Server-side ownership check: only the owner may edit their listing. */
export function ownsListing(
  listingUserId: string | null | undefined,
  userId: string | null | undefined,
): boolean {
  return !!userId && !!listingUserId && listingUserId === userId;
}
