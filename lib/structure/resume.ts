// Resuming a saved draft.
//
// `toSubmitPayload` turns a draft into a listing row. This is the inverse, and
// it exists because there was none: `/structure` mounted the composer with a
// family entrance and nothing else, so a member who saved a draft and came back
// started again from an empty record. The account gate resumed an in-memory
// draft across sign-in, which is a different thing entirely, and it is what the
// composer had instead of persistence.
//
// It uses the row the submit route already writes. No second store, no local
// storage, no shadow table: the draft IS the listing, exactly as the edit path
// has always treated it.
//
// The rule that matters here is the same one the procedures enforce everywhere
// else: a resumed record is read in ITS OWN family's vocabulary. A saved
// freight-forwarding draft comes back with its service classification and its
// service terms, and it must never resume by asking for a quantity or an
// Incoterm, because those are not facts it has. Reading a row family-blind and
// letting the product fields fall through is precisely how that happens, so the
// family is resolved first and the family-specific fields are read under it.
//
// Pure and import-light so it is unit-tested without a database.

import { normaliseMarketFamily, type MarketFamily } from "../taxonomy/market";
import { emptyDraft, type StructureDraft } from "./draft";
import { emptyServiceTerms, emptyDistributionTerms } from "./procedures/types";

/** The stored columns a resume reads. Every one is optional. */
export type ResumableRow = {
  id?: string | null;
  status?: string | null;
  type?: string | null;
  product?: string | null;
  hs_code?: string | null;
  quantity?: number | string | null;
  quantity_mode?: string | null;
  quantity_min?: number | string | null;
  quantity_max?: number | string | null;
  unit?: string | null;
  frequency?: string | null;
  origin?: string | null;
  destination?: string | null;
  incoterm?: string | null;
  payment_terms?: string | null;
  submitter_role?: string | null;
  key_notes?: string | null;
  validity_type?: string | null;
  valid_until?: string | null;
  declaration_accepted_at?: string | null;
  // Classification (20260728a). Present in production.
  market_family?: string | null;
  market_intent?: string | null;
  service_category_key?: string | null;
  service_subcategory_keys?: string[] | null;
  distribution_partner_type_key?: string | null;
  distribution_relationship_terms?: string[] | null;
  coverage_scope_key?: string | null;
  territory_codes?: string[] | null;
  product_sector_key?: string | null;
  custom_category_label?: string | null;
  additional_details?: string | null;
  // Family terms (20260728d). NOT yet applied, so both may be absent.
  service_terms?: Record<string, unknown> | null;
  distribution_terms?: Record<string, unknown> | null;
};

const str = (v: unknown): string | null => {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t === "" ? null : t;
};

const list = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && x.trim() !== "") : [];

const num = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
};

/**
 * The number of days between now and a stored `valid_until`.
 *
 * The draft holds a day count because that is what the member tapped; the row
 * holds the date it derived. Coming back, the remaining days are the honest
 * reading: a draft saved with "30 days" and resumed a week later has 23 left,
 * not 30, and showing 30 would silently extend an horizon the member set.
 */
export function validityFromRow(
  validityType: string | null | undefined,
  validUntil: string | null | undefined,
  now: number,
): number | "standing" | null {
  if (validityType === "standing") return "standing";
  if (validityType !== "dated" || !validUntil) return null;
  const end = Date.parse(`${validUntil}T00:00:00.000Z`);
  if (!Number.isFinite(end)) return null;
  const days = Math.ceil((end - now) / 86_400_000);
  return days > 0 ? days : null;
}

/**
 * Rebuild a draft from a saved row.
 *
 * Throws `UnknownMarketFamilyError` through the normaliser if the stored family
 * is present but unrecognised. That is deliberate: resuming an unreadable
 * record as a product is the silent reclassification this whole change exists
 * to stop.
 */
export function draftFromRow(row: ResumableRow, now: number = Date.now()): StructureDraft {
  const family: MarketFamily | null = normaliseMarketFamily(row.market_family);
  const intent = str(row.market_intent);

  const base = emptyDraft();
  const draft: StructureDraft = {
    ...base,
    canonical: family && intent ? { family, intent } : null,
    intent: (str(row.type) as StructureDraft["intent"]) ?? null,
    product: str(row.product),
    // Shared across every family.
    origin: str(row.origin),
    destination: str(row.destination),
    payment: str(row.payment_terms),
    role: str(row.submitter_role),
    note: str(row.key_notes),
    validity: validityFromRow(row.validity_type, row.valid_until, now),
    declarationAccepted: Boolean(str(row.declaration_accepted_at)),
    // Classification, which every family carries some of.
    serviceCategory: str(row.service_category_key),
    serviceSubcategories: list(row.service_subcategory_keys),
    distributionPartnerType: str(row.distribution_partner_type_key),
    distributionRelationshipTerms: list(row.distribution_relationship_terms),
    coverageScope: str(row.coverage_scope_key),
    territoryCodes: list(row.territory_codes),
    productSector: str(row.product_sector_key),
    customCategoryLabel: str(row.custom_category_label),
    additionalDetails: str(row.additional_details),
  };

  // ---- Family-specific, read under the family and nowhere else -------------
  //
  // A services or distribution row must not pick up product columns even if a
  // legacy row happens to carry them, and a products row must not pick up
  // family terms. This is the same boundary `submitTerms` enforces on the way
  // out, applied on the way back in.
  if (family === "products" || family === null) {
    draft.hsCode = str(row.hs_code);
    draft.quantityMode = (str(row.quantity_mode) as StructureDraft["quantityMode"]) ?? null;
    draft.quantity = num(row.quantity);
    draft.quantityMin = num(row.quantity_min);
    draft.quantityMax = num(row.quantity_max);
    draft.unit = str(row.unit);
    draft.frequency = str(row.frequency);
    draft.incoterm = str(row.incoterm);
  }

  if (family === "services") {
    const t = (row.service_terms ?? {}) as Record<string, unknown>;
    draft.serviceTerms = {
      ...emptyServiceTerms(),
      scope: str(t.scope),
      engagement: str(t.engagement),
      coverageCountries: list(t.coverage_countries),
      tradeLanes: str(t.trade_lanes),
      specialisationKeys: list(t.specialisation_keys),
      capability: str(t.capability),
      pricingBasis: str(t.pricing_basis),
      availability: str(t.availability),
    };
  }

  if (family === "distribution") {
    const t = (row.distribution_terms ?? {}) as Record<string, unknown>;
    draft.distributionTerms = {
      ...emptyDistributionTerms(),
      objective: str(t.objective),
      productScope: str(t.product_scope),
      channelKeys: list(t.channel_keys),
      capabilityKeys: list(t.capability_keys),
      commercialExpectations: str(t.commercial_expectations),
      timing: str(t.timing),
    };
  }

  return draft;
}
