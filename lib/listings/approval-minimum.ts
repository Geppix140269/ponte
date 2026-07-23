// The minimum facts a listing must carry before an admin may approve it.
//
// This is the brief's 5.2 "minimum approval data", read against the STORED
// listing row (the structured v4 columns), not the composer state. It is one
// half of the publication gate; the other half is who the submitter is and
// whether the desk has written the public text (see publication-gate.ts).
//
// Two kinds of requirement live in 5.2, and they are treated differently:
//
//   HARD  — a fact without which a counterparty cannot act, or which the brief
//           makes unconditional: the side, the product, quantity and unit and
//           frequency for goods, a payment stance, the submitter's role, the
//           chain when the submitter is not the principal, and a declared
//           validity horizon. Missing any of these blocks approval.
//
//   SOFT  — "where known" / "where applicable" facts: the corridor, the
//           Incoterm, delivery timing, the HS code. These are recorded and
//           shown, but a genuine "not stated yet" is a legitimate commercial
//           state, so they do not block approval on their own.
//
// Pure and import-free, for the same reason as validity.ts.

export type ApprovalFacts = {
  type?: string | null;
  product?: string | null;
  quantity?: number | string | null;
  unit?: string | null;
  frequency?: string | null;
  payment_terms?: string | null;
  submitter_role?: string | null;
  chain_depth?: string | null;
  validity_type?: string | null;
  valid_until?: string | null;
};

export type ApprovalMinimum = {
  ok: boolean;
  /** Field keys still missing, in a stable order. Empty when ok. */
  missing: string[];
};

const has = (v: unknown): boolean =>
  v !== null && v !== undefined && String(v).trim() !== "";

const SIDES = new Set(["offer", "requirement", "service"]);

/**
 * A submitter who is not the principal must declare how far they sit from it.
 *
 * The stored `submitter_role` is the English label ListingForm writes (not its
 * option key), so the test is on the label's wording: a broker or an
 * intermediary is not a principal and needs a chain; a producer, an end buyer
 * or a title-holding trading company is the principal and does not.
 */
export function roleNeedsChain(role: string | null | undefined): boolean {
  const r = (role ?? "").toLowerCase();
  return r.includes("broker") || r.includes("intermediary");
}

/** Goods carry quantity, unit and frequency; a service legitimately does not. */
function isGoods(type: string | null | undefined): boolean {
  return type === "offer" || type === "requirement";
}

/**
 * Score a stored listing against the hard minimum.
 *
 * Returns every missing key rather than the first, so the desk sees the whole
 * gap at once and the gate can report all of it in one refusal.
 */
export function meetsApprovalMinimum(listing: ApprovalFacts): ApprovalMinimum {
  const missing: string[] = [];

  if (!has(listing.type) || !SIDES.has(String(listing.type))) missing.push("type");
  if (!has(listing.product)) missing.push("product");

  if (isGoods(listing.type)) {
    if (!(has(listing.quantity) && Number(listing.quantity) > 0)) missing.push("quantity");
    if (!has(listing.unit)) missing.push("unit");
    if (!has(listing.frequency)) missing.push("frequency");
  }

  // Payment terms, or an explicit decision not to state them yet. An empty
  // payment stance is not the same as "To be agreed": the first is an omission,
  // the second is a recorded position, and only the second passes.
  if (!has(listing.payment_terms)) missing.push("payment_terms");

  if (!has(listing.submitter_role)) missing.push("submitter_role");
  else if (roleNeedsChain(listing.submitter_role) && !has(listing.chain_depth)) {
    missing.push("chain_depth");
  }

  // A declared horizon: standing, or dated with a date. An incoherent pair
  // (dated with no date) does not count as declared.
  const vt = listing.validity_type;
  const validityDeclared =
    vt === "standing" || (vt === "dated" && has(listing.valid_until));
  if (!validityDeclared) missing.push("validity");

  return { ok: missing.length === 0, missing };
}
