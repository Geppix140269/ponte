// What counts as a material change to an approved opportunity.
//
// The brief requires that "material changes after approval return the
// opportunity to review". The write path calls this to decide whether an
// owner's edit of an already-approved listing must drop back to `submitted`
// and lose its desk-approved public text.
//
// Material means the commercial shape a counterparty quotes against: the
// product, the numbers, the corridor, the terms, who is submitting and how far
// they sit from the principal. Editing the free-text description, the internal
// key notes or the media does not re-open review on its own, because none of
// those changes the deal a reader has already been shown the terms of.
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
};

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
];

const norm = (v: unknown): string =>
  v === null || v === undefined ? "" : String(v).trim();

/** The material fields that differ between two versions of a listing. */
export function changedMaterialFields(
  before: MaterialFacts,
  after: MaterialFacts,
): string[] {
  return MATERIAL_KEYS.filter((k) => norm(before[k]) !== norm(after[k]));
}

/** Whether any material field changed. */
export function hasMaterialChange(
  before: MaterialFacts,
  after: MaterialFacts,
): boolean {
  return changedMaterialFields(before, after).length > 0;
}
