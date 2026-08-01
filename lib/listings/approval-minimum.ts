// The minimum facts a listing must carry before an admin may approve it.
//
// This is the brief's 5.2 "minimum approval data", read against the STORED
// listing row (the structured v4 columns), not the composer state. It is one
// half of the publication gate; the other half is who the submitter is and
// whether the desk has written the public text (see publication-gate.ts).
//
// ## The list is the owner's, verbatim (ADR-0026)
//
// On 1 August 2026 the owner named the minimum himself, and it is transcribed
// rather than interpreted:
//
//   > If you don't arrive to at least the minimum - let's say quantity,
//   > destination or origin, Incoterm, payment terms, validity and role -
//   > these are the details that are absolutely necessary. Otherwise you
//   > cannot publish.
//
// Three things moved on that instruction:
//
//   ORIGIN OR DESTINATION became HARD. It was soft, on the reading that a
//   half-stated route is a legitimate commercial state. It is, but a record
//   that states NEITHER end cannot be assessed for duty, corridor or
//   feasibility by anybody reading it. One end is now required; two is still
//   only worth percentage.
//
//   INCOTERM became HARD, for the same reason: without it the price means
//   nothing, because nobody knows what it includes.
//
//   FREQUENCY became SOFT. It is not in the owner's list, it is not needed to
//   act on a single shipment, and every extra hurdle above the named minimum
//   works against a record going live at all.
//
// Everything else above this line raises the completeness percentage and holds
// nothing back. That is the whole of ADR-0026: publish above the minimum, and
// let the percentage carry the difference.
//
// Pure except for the quantity model, which is itself pure, for the same reason
// as validity.ts.

import { quantityFromRow, validateQuantity } from "./quantity";

export type ApprovalFacts = {
  type?: string | null;
  product?: string | null;
  origin?: string | null;
  destination?: string | null;
  incoterm?: string | null;
  quantity?: number | string | null;
  quantity_mode?: string | null;
  quantity_min?: number | string | null;
  quantity_max?: number | string | null;
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
    // A quantity BASIS, not a number. "Available on request" and "negotiable"
    // are commercial positions a counterparty can act on; a member who has not
    // fixed a figure must be able to say so rather than invent one to get past
    // this check. The unit requirement moves with the mode: it is required
    // wherever a number is stated and meaningless where none is.
    const quantity = quantityFromRow(listing);
    if (!quantity) missing.push("quantity");
    else {
      const issues = validateQuantity(quantity);
      if (issues.some((i) => i !== "unit_required")) missing.push("quantity");
      if (issues.includes("unit_required")) missing.push("unit");
    }
    // ADR-0026. At least one end of the route, and the delivery basis. A
    // record stating neither end cannot be assessed by a reader; a price with
    // no Incoterm does not say what it includes.
    if (!has(listing.origin) && !has(listing.destination)) missing.push("route");
    if (!has(listing.incoterm)) missing.push("incoterm");
    // `frequency` is deliberately NOT required. See the note at the top.
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
