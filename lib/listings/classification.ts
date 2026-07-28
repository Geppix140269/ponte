import { serviceCategory, subcategoryBelongsTo } from "../taxonomy/services";
import {
  partnerType,
  relationshipTerm,
  coverageScope,
  coverageScopeTakesCountries,
} from "../taxonomy/distribution";
import { PRODUCT_SECTORS, isIntentForFamily, type MarketFamily } from "../taxonomy/market";

/**
 * The classification a listing carries, validated at the storage boundary.
 *
 * Pure: no database, no Next, no Supabase client, so the rules that decide
 * whether a record may be stored are unit-tested standalone rather than
 * exercised only through an HTTP route.
 *
 * The rule this exists to enforce is the one the owner requirement states
 * twice: a Trade Service category must not be stored under Distribution, and a
 * Distribution type must not be stored under Trade Services. A shared composer,
 * a shared draft and a shared submit route make that easy to get wrong by
 * accident, and a mis-filed key is worse than a missing one because everything
 * downstream trusts it: filters, counts, matching and, later, indexable
 * category pages.
 *
 * Keys are validated against the taxonomy itself rather than a shape check. A
 * value that looks like a key but names nothing is refused, for the same reason
 * the HS route refuses a well-formed code that is not in the catalogue: a board
 * filtered by classification is worth nothing if the classifications are
 * invented.
 */

export const CLASSIFICATION_COLUMNS = [
  "market_family",
  "market_intent",
  "service_category_key",
  "service_subcategory_keys",
  "distribution_partner_type_key",
  "distribution_relationship_terms",
  "coverage_scope_key",
  "territory_codes",
  "product_sector_key",
  "custom_category_label",
  "additional_details",
] as const;

export type ClassificationColumns = {
  market_family: string | null;
  market_intent: string | null;
  service_category_key: string | null;
  service_subcategory_keys: string[] | null;
  distribution_partner_type_key: string | null;
  distribution_relationship_terms: string[] | null;
  coverage_scope_key: string | null;
  territory_codes: string[] | null;
  product_sector_key: string | null;
  custom_category_label: string | null;
  additional_details: string | null;
};

export type ClassificationResult =
  | { ok: true; columns: ClassificationColumns }
  | { ok: false; error: string; field: string };

const FAMILIES: readonly string[] = ["products", "services", "distribution"];

function text(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().slice(0, max);
  return trimmed.length > 0 ? trimmed : null;
}

/** A list of keys, deduplicated, capped, and never a bare string. */
function keyList(value: unknown, max: number): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (const item of value) {
    const key = text(item, 64);
    if (key && out.indexOf(key) < 0) out.push(key);
    if (out.length >= max) break;
  }
  return out;
}

const ISO2 = /^[A-Z]{2}$/;

/**
 * Read and validate the classification out of a submit payload.
 *
 * Returns the columns to store, or the first reason it cannot be stored. It
 * never repairs a bad value into a plausible one: a payload claiming a freight
 * category on a distribution record is refused, not quietly emptied, because
 * silently accepting it would leave the member believing they filed something
 * they did not.
 */
export function readClassification(body: Record<string, unknown>): ClassificationResult {
  const rawFamily = text(body.market_family, 20);
  const rawIntent = text(body.market_intent, 60);

  if (rawFamily && FAMILIES.indexOf(rawFamily) < 0) {
    return { ok: false, error: "Unknown market family.", field: "market_family" };
  }
  const family = (rawFamily ?? null) as MarketFamily | null;

  if (rawIntent && (!family || !isIntentForFamily(family, rawIntent))) {
    return {
      ok: false,
      error: "That intent does not belong to that market family.",
      field: "market_intent",
    };
  }

  const serviceKey = text(body.service_category_key, 64);
  const subKeys = keyList(body.service_subcategory_keys, 24);
  const partnerKey = text(body.distribution_partner_type_key, 64);
  const relationshipKeys = keyList(body.distribution_relationship_terms, 12);
  const coverageKey = text(body.coverage_scope_key, 64);
  const sectorKey = text(body.product_sector_key, 64);
  const territories = keyList(body.territory_codes, 60).filter((c) => ISO2.test(c));

  // ---- The cross-family rule, stated once for each direction --------------
  if (family && family !== "services" && (serviceKey || subKeys.length > 0)) {
    return {
      ok: false,
      error: "A trade service category cannot be stored on a record in another family.",
      field: "service_category_key",
    };
  }
  if (
    family &&
    family !== "distribution" &&
    (partnerKey || relationshipKeys.length > 0 || coverageKey)
  ) {
    return {
      ok: false,
      error: "A distribution partner type cannot be stored on a record in another family.",
      field: "distribution_partner_type_key",
    };
  }

  // ---- Every key names something real -------------------------------------
  if (serviceKey && !serviceCategory(serviceKey)) {
    return { ok: false, error: "Unknown trade service category.", field: "service_category_key" };
  }
  for (const sub of subKeys) {
    if (!serviceKey || !subcategoryBelongsTo(sub, serviceKey)) {
      return {
        ok: false,
        error: "That service detail does not belong to the chosen category.",
        field: "service_subcategory_keys",
      };
    }
  }
  // `partnerType` resolves compatibility values as well as the twelve
  // selectable ones, and that is deliberate. A member editing a record that
  // already holds `route_to_market` sends it back, and refusing it would make
  // their own historical record unsaveable. The picker only ever offers the
  // twelve; `isSelectablePartnerType` is the check for anything that needs to
  // enforce that, and storage is not the place for it.
  if (partnerKey && !partnerType(partnerKey)) {
    return {
      ok: false,
      error: "Unknown distribution partner type.",
      field: "distribution_partner_type_key",
    };
  }
  for (const term of relationshipKeys) {
    if (!relationshipTerm(term)) {
      return {
        ok: false,
        error: "Unknown relationship structure.",
        field: "distribution_relationship_terms",
      };
    }
  }
  if (coverageKey && !coverageScope(coverageKey)) {
    return { ok: false, error: "Unknown coverage scope.", field: "coverage_scope_key" };
  }
  if (sectorKey && !PRODUCT_SECTORS.some((s) => s.key === sectorKey)) {
    return { ok: false, error: "Unknown product sector.", field: "product_sector_key" };
  }

  // Territory codes belong to a scope that takes them. They are dropped rather
  // than refused: a member who changed Several countries to Worldwide has
  // withdrawn the territories, and refusing their submission over it would be
  // punishing them for changing their mind.
  const keepTerritories = coverageScopeTakesCountries(coverageKey) ? territories : [];

  return {
    ok: true,
    columns: {
      market_family: family,
      market_intent: rawIntent,
      service_category_key: serviceKey,
      service_subcategory_keys: subKeys.length > 0 ? subKeys : null,
      distribution_partner_type_key: partnerKey,
      distribution_relationship_terms: relationshipKeys.length > 0 ? relationshipKeys : null,
      coverage_scope_key: coverageKey,
      territory_codes: keepTerritories.length > 0 ? keepTerritories : null,
      product_sector_key: sectorKey,
      custom_category_label: text(body.custom_category_label, 200),
      additional_details: text(body.additional_details, 2000),
    },
  };
}

/**
 * Does this database error mean the classification columns are not there yet?
 *
 * The migration chain in this repository cannot be applied by a merge (see
 * `docs/codex/DATABASE-STATE.md`), so every schema change is applied by hand
 * with owner approval. Between this code shipping and that SQL being run, the
 * columns will not exist. PostgREST reports that as `PGRST204`, and Postgres
 * itself as `42703`.
 *
 * A member submitting a correctly classified record in that window must not
 * lose it. The route retries without the classification columns, and the
 * classification still reaches the record through the synthesised details,
 * which is where it already travelled before any of these columns existed.
 */
export function isMissingColumnError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const code = (error as { code?: unknown }).code;
  if (code === "PGRST204" || code === "42703") return true;
  const message = (error as { message?: unknown }).message;
  return typeof message === "string" && /could not find the '.*' column/i.test(message);
}
