import { serviceCategory, subcategoryBelongsTo } from "../taxonomy/services";
import {
  partnerType,
  relationshipTerm,
  coverageScope,
  coverageScopeTakesCountries,
} from "../taxonomy/distribution";
import { PRODUCT_SECTORS, isIntentForFamily, type MarketFamily } from "../taxonomy/market";
import {
  serviceEngagementType,
  servicePricingBasis,
  serviceAvailability,
  specialisationKeysFor,
} from "../taxonomy/service-terms";
import {
  distributionChannel,
  distributionCapability,
  distributionTiming,
} from "../taxonomy/distribution-terms";

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

/**
 * The classification columns, applied to production on 28 July 2026.
 *
 * These are LIVE. `20260728a_market_classification.sql` was run by hand with
 * owner authorisation, so a write containing them succeeds and the retry below
 * never has to drop them.
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

/**
 * The family commercial-terms columns, NOT yet applied to production.
 *
 * Kept as a separate list because the two groups are at different stages of
 * their life, and a retry that cannot tell them apart does real damage.
 *
 * The first version of this change appended these two to CLASSIFICATION_COLUMNS
 * and reused the one existing retry. That retry drops every column in the list.
 * So the moment `service_terms` was missing - which is its state in production
 * right now - a trade service submission was retried WITHOUT its market family,
 * its canonical intent, its service category, its subcategories, its coverage
 * scope, its territory codes and its product sector. All of those columns are
 * live and would have stored perfectly. The member would have been told their
 * record was filed, and it would have been filed as an unclassified row: the
 * exact defect ADR-0011 exists to prevent, reintroduced by a fallback meant to
 * be a safety net.
 *
 * The retry is now staged. Drop the unavailable group first, keep everything
 * that works, and only fall back to dropping the classification too if the
 * database says that group is missing as well.
 */
export const FAMILY_TERMS_COLUMNS = ["service_terms", "distribution_terms"] as const;

/** Every column either migration adds. For callers that need the whole set. */
export const ALL_CLASSIFICATION_COLUMNS = [
  ...CLASSIFICATION_COLUMNS,
  ...FAMILY_TERMS_COLUMNS,
] as const;

/** The commercial terms only a Trade Service has, as stored. */
export type ServiceTermsColumn = {
  scope: string | null;
  engagement: string | null;
  coverage_countries: string[];
  trade_lanes: string | null;
  specialisation_keys: string[];
  capability: string | null;
  pricing_basis: string | null;
  availability: string | null;
};

/** The commercial terms only a Distribution opportunity has, as stored. */
export type DistributionTermsColumn = {
  objective: string | null;
  product_scope: string | null;
  channel_keys: string[];
  capability_keys: string[];
  commercial_expectations: string | null;
  timing: string | null;
};

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
  service_terms: ServiceTermsColumn | null;
  distribution_terms: DistributionTermsColumn | null;
};

/**
 * The product-only commercial fields, and the families that may not send them.
 *
 * The requirement's negative assertions, enforced at the storage boundary
 * rather than only in the composer. A client is not trusted to have removed
 * them: the whole reason a mis-filed classification is worse than a missing one
 * is that everything downstream believes it, and a shipped quantity on a trade
 * service would be believed by the board, the search index and the emails.
 */
const PRODUCT_ONLY_FIELDS = [
  "hs_code",
  "quantity",
  "quantity_mode",
  "quantity_min",
  "quantity_max",
  "unit",
  "incoterm",
] as const;

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

  // ---- The commercial terms, refused across a family boundary --------------
  //
  // The same rule as the classification above, one level down. Before the
  // family procedures existed every record carried the product commercial
  // fields, so this boundary had nothing to check: quantity and Incoterm
  // arrived on every payload by construction. They no longer do, and a payload
  // that still sends them for a service or a distribution record is either a
  // stale client or a forged request. Neither is repaired into a plausible
  // record.
  if (family && family !== "products") {
    for (const key of PRODUCT_ONLY_FIELDS) {
      if (has(body[key])) {
        return {
          ok: false,
          error: `A ${key.replace(/_/g, " ")} cannot be stored on a ${family === "services" ? "trade service" : "distribution"} record.`,
          field: key,
        };
      }
    }
  }
  if (family && family !== "services" && body.service_terms) {
    return {
      ok: false,
      error: "Trade-service terms cannot be stored on a record in another family.",
      field: "service_terms",
    };
  }
  if (family && family !== "distribution" && body.distribution_terms) {
    return {
      ok: false,
      error: "Distribution terms cannot be stored on a record in another family.",
      field: "distribution_terms",
    };
  }

  const serviceTerms = readServiceTerms(body.service_terms, serviceKey);
  if (!serviceTerms.ok) return serviceTerms.refusal;
  const distributionTerms = readDistributionTerms(body.distribution_terms);
  if (!distributionTerms.ok) return distributionTerms.refusal;

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
      service_terms: serviceTerms.value,
      distribution_terms: distributionTerms.value,
    },
  };
}

const has = (v: unknown): boolean =>
  v !== null && v !== undefined && String(v).trim() !== "" && !(Array.isArray(v) && v.length === 0);

type TermsRead<T> = { ok: true; value: T | null } | { ok: false; refusal: ClassificationResult };

/**
 * Read the Trade Service terms, validating every key against the taxonomy.
 *
 * A specialisation is checked against the CHOSEN CATEGORY, not merely against
 * the global list: "sea freight" is a real key, and it is not an answer a
 * customs brokerage record can give. Storing it would put a transport mode on a
 * record with no transport, and a member filtering for sea forwarders would
 * find a customs broker.
 */
function readServiceTerms(raw: unknown, category: string | null): TermsRead<ServiceTermsColumn> {
  if (!raw || typeof raw !== "object") return { ok: true, value: null };
  const t = raw as Record<string, unknown>;

  const engagement = text(t.engagement, 32);
  if (engagement && !serviceEngagementType(engagement)) {
    return { ok: false, refusal: { ok: false, error: "Unknown engagement type.", field: "service_terms" } };
  }
  const pricingBasis = text(t.pricing_basis, 32);
  if (pricingBasis && !servicePricingBasis(pricingBasis)) {
    return { ok: false, refusal: { ok: false, error: "Unknown engagement basis.", field: "service_terms" } };
  }
  const availability = text(t.availability, 32);
  if (availability && !serviceAvailability(availability)) {
    return { ok: false, refusal: { ok: false, error: "Unknown availability.", field: "service_terms" } };
  }

  const specialisations = keyList(t.specialisation_keys, 32);
  const allowed = new Set(specialisationKeysFor(category));
  for (const key of specialisations) {
    if (!allowed.has(key)) {
      return {
        ok: false,
        refusal: {
          ok: false,
          error: "That specialisation does not belong to the chosen service category.",
          field: "service_terms",
        },
      };
    }
  }

  const value: ServiceTermsColumn = {
    scope: text(t.scope, 2000),
    engagement,
    coverage_countries: keyList(t.coverage_countries, 60).filter((c) => ISO2.test(c)),
    trade_lanes: text(t.trade_lanes, 600),
    specialisation_keys: specialisations,
    capability: text(t.capability, 1000),
    pricing_basis: pricingBasis,
    availability,
  };
  const stated =
    !!value.scope || !!value.engagement || value.coverage_countries.length > 0 ||
    !!value.trade_lanes || value.specialisation_keys.length > 0 || !!value.capability ||
    !!value.pricing_basis || !!value.availability;
  return { ok: true, value: stated ? value : null };
}

/** Read the Distribution terms, validating every key against the taxonomy. */
function readDistributionTerms(raw: unknown): TermsRead<DistributionTermsColumn> {
  if (!raw || typeof raw !== "object") return { ok: true, value: null };
  const t = raw as Record<string, unknown>;

  const channels = keyList(t.channel_keys, 24);
  for (const key of channels) {
    if (!distributionChannel(key)) {
      return { ok: false, refusal: { ok: false, error: "Unknown sales channel.", field: "distribution_terms" } };
    }
  }
  const capabilities = keyList(t.capability_keys, 24);
  for (const key of capabilities) {
    if (!distributionCapability(key)) {
      return { ok: false, refusal: { ok: false, error: "Unknown capability.", field: "distribution_terms" } };
    }
  }
  const timing = text(t.timing, 32);
  if (timing && !distributionTiming(timing)) {
    return { ok: false, refusal: { ok: false, error: "Unknown timing.", field: "distribution_terms" } };
  }

  const value: DistributionTermsColumn = {
    objective: text(t.objective, 2000),
    product_scope: text(t.product_scope, 1000),
    channel_keys: channels,
    capability_keys: capabilities,
    commercial_expectations: text(t.commercial_expectations, 2000),
    timing,
  };
  const stated =
    !!value.objective || !!value.product_scope || value.channel_keys.length > 0 ||
    value.capability_keys.length > 0 || !!value.commercial_expectations || !!value.timing;
  return { ok: true, value: stated ? value : null };
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

/**
 * WHICH column the database says it does not have.
 *
 * The staged retry above drops two named GROUPS of columns, which only works
 * for a column somebody remembered to put in a group. On 29 July 2026 that
 * assumption cost every Start a Deal submission: `20260728c` is written and
 * unapplied, so `listings` has no `quantity_mode`, `quantity_min`,
 * `quantity_max`, `quantity_extracted`, `quantity_confirmed_at`,
 * `declaration_accepted_at` or `declaration_version`, and the submit route
 * sends all of them on every write, for every family. PostgREST refused the
 * insert, neither group contained the column it named, the retry sent the same
 * unacceptable row twice more, and the member was told "Ponte kept your words"
 * on both Submit and Save draft.
 *
 * So the column is read out of the error rather than guessed from a list. Both
 * reporters name it:
 *
 *   PostgREST  Could not find the 'quantity_mode' column of 'listings' in the
 *              schema cache
 *   Postgres   column "quantity_mode" of relation "listings" does not exist
 *
 * Returns null when the error is a missing column but does not say which, which
 * is what keeps the older staged fallback worth having.
 */
export function missingColumnFrom(error: unknown): string | null {
  if (!isMissingColumnError(error)) return null;
  const message = (error as { message?: unknown }).message;
  if (typeof message !== "string") return null;
  const named =
    /could not find the '([^']+)' column/i.exec(message) ??
    /column "([^"]+)" of relation/i.exec(message) ??
    /column ([a-z0-9_]+) does not exist/i.exec(message);
  if (!named) return null;
  // PostgREST reports an embedded resource as "table.column"; only the column
  // half is a key of the row being written.
  const column = named[1].split(".").pop() ?? "";
  return column || null;
}
