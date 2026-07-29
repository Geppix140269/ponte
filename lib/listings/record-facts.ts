// What a STORED listing says, in its own family's vocabulary.
//
// `lib/structure/procedures/*` decides what each family asks for and how the
// record reads back while it is still a draft. This is the same guarantee one
// step later, for a row that has already been written: the public detail page,
// the owner's own records, the admin console and the member emails all read a
// listing through here rather than each printing its own fixed list of product
// columns.
//
// They did all print that fixed list. Every one of those surfaces rendered
// Quantity, Incoterm, Origin, Destination, HS code and Frequency for every
// record, with "Not stated" wherever the value was absent. So a freight
// forwarder who was never asked for a quantity - because a service has none -
// had their public page answer the question anyway, six times, in the negative.
// That is the same defect the family procedures removed from the composer,
// surviving downstream of it: a member walks a correct journey and then reads a
// record that describes a shipment they never offered.
//
// Two rules, the same two the review model holds to:
//
//   1. A fact a family does not have produces NO ROW. Not an empty row, not a
//      "Not stated" row. A trade service detail page contains no Incoterm line
//      at all, and that is guaranteed here, at model-generation level, rather
//      than by a surface remembering to hide it.
//   2. A fact this member was never the one to decide produces no row either.
//      A seller states where goods ship FROM; the destination is the buyer's
//      decision, so an offer prints "Ships from Argentina" and no destination
//      line, exactly as `productsProcedure.reviewModel` does upstream.
//
// Pure: no database, no Next, no next-intl, so it is unit-tested standalone and
// can be called from a server component, a route and an email builder alike.

import {
  MARKET_INTENTS,
  PRODUCT_SECTORS,
  normaliseMarketFamily,
  type MarketFamily,
} from "../taxonomy/market";
import { serviceCategory, serviceSubcategory } from "../taxonomy/services";
import { partnerType, relationshipTerm, coverageScope } from "../taxonomy/distribution";
import {
  serviceSpecialisation,
  servicePricingBasis,
  serviceAvailability,
  serviceEngagementType,
} from "../taxonomy/service-terms";
import {
  distributionChannel,
  distributionCapability,
  distributionTiming,
} from "../taxonomy/distribution-terms";
import { COUNTRIES } from "../countries";
import { quantityFromRow, formatQuantity } from "./quantity";

/* ------------------------------------------------------------------ */
/* The row                                                             */
/* ------------------------------------------------------------------ */

/** The stored columns a presentation reads. Every one is optional. */
export type FactsRow = {
  market_family?: string | null;
  market_intent?: string | null;
  /** The legacy `listings.type`, for rows that predate the canonical pair. */
  type?: string | null;
  product?: string | null;
  hs_code?: string | null;
  product_sector_key?: string | null;
  custom_category_label?: string | null;
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
  validity_type?: string | null;
  valid_until?: string | null;
  service_category_key?: string | null;
  service_subcategory_keys?: string[] | null;
  distribution_partner_type_key?: string | null;
  distribution_relationship_terms?: string[] | null;
  coverage_scope_key?: string | null;
  territory_codes?: string[] | null;
  service_terms?: Record<string, unknown> | null;
  distribution_terms?: Record<string, unknown> | null;
};

/* ------------------------------------------------------------------ */
/* Labels                                                              */
/* ------------------------------------------------------------------ */

/**
 * Every label a presented fact can carry.
 *
 * The keys are the SAME keys `structure.field.*` uses in the message
 * catalogue, deliberately: the composer's review screen and the published
 * record must name a fact identically, or a member reads "Capability" while
 * building the record and "Service capacity" after it publishes.
 *
 * The English is here rather than only in the catalogue because Ponte is
 * English-only (see `LANGUAGES.md`) and one of the callers is an email builder
 * with no request locale. `record-facts.test.ts` asserts this map matches
 * `messages/en.json` exactly, so the deferred-translation path stays coherent
 * and the two cannot drift apart silently.
 */
export const FACT_LABELS = {
  product: "Product",
  service: "Service",
  sector: "Sector",
  hsCode: "HS code",
  quantity: "Quantity",
  frequency: "Frequency",
  route: "Route",
  incoterm: "Incoterm",
  payment: "Payment terms",
  role: "Role",
  validity: "Validity",

  serviceCategory: "Service category",
  serviceSubcategory: "Service detail",
  serviceScope: "Scope",
  serviceEngagement: "Engagement",
  serviceCoverage: "Coverage",
  serviceSpecialisation: "Specialisation",
  serviceCapability: "Capability",
  servicePricingBasis: "Engagement basis",
  serviceAvailability: "Availability",
  serviceScopeNeeded: "Scope required",
  serviceCoverageNeeded: "Coverage required",
  serviceSpecialisationNeeded: "Specialisation required",
  serviceCapabilityNeeded: "Capacity required",
  servicePricingBasisNeeded: "Quotation basis expected",
  serviceAvailabilityNeeded: "Required from",

  partnerType: "Preferred partner",
  relationship: "Relationship",
  distributionObjective: "Objective",
  distributionProductScope: "Products or sectors",
  distributionTerritory: "Territory",
  distributionChannels: "Channels",
  distributionChannelsOffered: "Channels reached",
  distributionCapabilities: "Capabilities",
  distributionCapabilitiesOffered: "Capabilities offered",
  distributionExpectations: "Commercial expectations",
  distributionTiming: "Timing",
} as const;

export type FactLabelKey = keyof typeof FACT_LABELS;

/* ------------------------------------------------------------------ */
/* The presentation                                                    */
/* ------------------------------------------------------------------ */

export type RecordFact = {
  /** Stable, and unique within one presentation. */
  key: string;
  /** A key under `structure.field.` in the message catalogue. */
  labelKey: FactLabelKey;
  /** The canonical English label, for a caller with no request locale. */
  label: string;
  /** The stated value, or null when this family has the fact and it is open. */
  value: string | null;
};

export type RecordPresentation = {
  family: MarketFamily;
  /**
   * What this record IS, in the member's own words: "Offer a trade service",
   * "Seek a distributor, agent or representative".
   *
   * Taken from the canonical intent, which is the only value that can express
   * distribution at all. The legacy `type` is the fallback for rows written
   * before the canonical columns, and it says "Offer", "Requirement" or "Trade
   * service" because that is genuinely all those rows carry.
   */
  kindLabel: string;
  /** Supply-side or demand-side, when the canonical intent says. */
  side: "supply" | "demand" | null;
  /** The record's subject: the product, the service or the arrangement. */
  subject: string | null;
  /** Everything a reader is shown, in this family's order. */
  facts: RecordFact[];
  /**
   * The one fact that leads a one-line summary or an email metadata block.
   *
   * A products record leads with its quantity, a service with its capability
   * and a distribution opportunity with its territory. Null when the leading
   * fact is not stated, so a summary omits it rather than printing "Not
   * stated" in a line that is meant to be the reason to read on.
   */
  headline: RecordFact | null;
};

const text = (v: unknown): string | null => {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s.length > 0 ? s : null;
};

const list = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && x.trim() !== "") : [];

/** ISO-2 codes as country names, so a reader sees a place rather than a code. */
function countryNames(codes: readonly string[]): string | null {
  if (codes.length === 0) return null;
  return codes.map((c) => COUNTRIES.find((x) => x.code === c)?.name ?? c).join(", ");
}

/** Taxonomy keys as labels. An unrecognised key is dropped, never printed raw. */
function labelsOf<T extends { label: string }>(
  keys: readonly string[],
  lookup: (key: string) => T | null,
): string | null {
  const labels = keys.map((k) => lookup(k)?.label).filter((l): l is string => !!l);
  return labels.length > 0 ? labels.join(", ") : null;
}

function fact(key: string, labelKey: FactLabelKey, value: string | null): RecordFact {
  return { key, labelKey, label: FACT_LABELS[labelKey], value };
}

/** The family this stored row belongs to, reconciled the same way everywhere. */
export function familyOfRow(row: FactsRow): MarketFamily {
  const family = normaliseMarketFamily(row.market_family);
  if (family) return family;
  // No canonical family: a row predating the columns. Its legacy `type` is the
  // only signal, and `service` has always meant a trade service. Anything else
  // is the product-shaped record the pre-family composer produced.
  return row.type === "service" ? "services" : "products";
}

/** The legacy `type` in words, for a row with no canonical intent. */
function legacyKindLabel(type: string | null | undefined): string {
  if (type === "offer") return "Offer";
  if (type === "requirement") return "Requirement";
  if (type === "service") return "Trade service";
  return "Record";
}

/**
 * Which end of the route this member actually decided.
 *
 * The stored mirror of `productsProcedure`'s `asksFor`. A supply-side record
 * states an origin and a demand-side record a destination; the other end was
 * the counterparty's decision and is not a gap in this record.
 */
export function routeEndFor(row: FactsRow): "origin" | "destination" | "both" {
  const intent = text(row.market_intent);
  if (intent === "offer_product") return "origin";
  if (intent === "source_product") return "destination";
  if (intent) return "both";
  if (row.type === "offer") return "origin";
  if (row.type === "requirement") return "destination";
  return "both";
}

/**
 * The route, printed as the half it is when only one end was decided.
 *
 * The exact wording the composer's preview used and the requirement restored:
 * "Ships from Argentina", never a bare "Argentina" under a heading of "Route",
 * which reads as a corridor with a missing half.
 */
function routeValue(row: FactsRow): string | null {
  const from = text(row.origin);
  const to = text(row.destination);
  if (from && to) return `${from} → ${to}`;
  if (from) return `Ships from ${from}`;
  if (to) return `Delivered to ${to}`;
  return null;
}

/** How long the record stays open, in the words the validity control offers. */
function validityValue(row: FactsRow): string | null {
  if (row.validity_type === "standing") return "Open until withdrawn";
  const until = text(row.valid_until);
  if (row.validity_type === "dated" && until) return `Open until ${until}`;
  return null;
}

/* ------------------------------------------------------------------ */
/* Per family                                                          */
/* ------------------------------------------------------------------ */

function productFacts(row: FactsRow): RecordFact[] {
  const sector = PRODUCT_SECTORS.find((s) => s.key === text(row.product_sector_key))?.label ?? null;
  return [
    fact("product", "product", text(row.product)),
    ...(sector ? [fact("sector", "sector", sector)] : []),
    fact("quantity", "quantity", formatQuantity(quantityFromRow(row))),
    fact("frequency", "frequency", text(row.frequency)),
    // ONE route row, always, because a product movement always has a route.
    // What the one-ended rule governs is the VALUE, not whether the question
    // exists: a seller who stated an origin reads "Ships from Argentina", and a
    // seller who stated neither end has left a real gap that stays visible.
    // `routeEndFor` says which end an editor should reopen.
    fact("route", "route", routeValue(row)),
    fact("incoterm", "incoterm", text(row.incoterm)),
    fact("hsCode", "hsCode", text(row.hs_code) ? `HS ${text(row.hs_code)}` : null),
  ];
}

function serviceFacts(row: FactsRow): RecordFact[] {
  const terms = (row.service_terms ?? {}) as Record<string, unknown>;
  // A record ASKING for a service reads as requirements. "Scope" and
  // "Coverage" on a record seeking a service imply the member provides it.
  const seeking = text(row.market_intent) === "seek_trade_service";
  const pick = (needed: FactLabelKey, offered: FactLabelKey): FactLabelKey =>
    seeking ? needed : offered;

  const category = serviceCategory(text(row.service_category_key))?.label ?? null;
  const subs = labelsOf(list(row.service_subcategory_keys), serviceSubcategory);

  const countries = countryNames(list(terms.coverage_countries));
  const lanes = text(terms.trade_lanes);
  const coverage = countries && lanes ? `${countries} · ${lanes}` : (countries ?? lanes);

  const out: RecordFact[] = [
    fact("service", "service", text(row.product)),
    ...(category ? [fact("serviceCategory", "serviceCategory", category)] : []),
    ...(subs ? [fact("serviceSubcategory", "serviceSubcategory", subs)] : []),
    fact("serviceScope", pick("serviceScopeNeeded", "serviceScope"), text(terms.scope)),
    fact("serviceCoverage", pick("serviceCoverageNeeded", "serviceCoverage"), coverage),
  ];

  // A specialisation row exists only where the member actually stated one: a
  // category with no conditioned dimension was never asked, so an empty row
  // would report a gap the member did not leave.
  const specialisations = labelsOf(list(terms.specialisation_keys), serviceSpecialisation);
  if (specialisations) {
    out.push(
      fact("serviceSpecialisation", pick("serviceSpecialisationNeeded", "serviceSpecialisation"), specialisations),
    );
  }

  const engagement = serviceEngagementType(text(terms.engagement))?.label ?? null;
  if (engagement) out.push(fact("serviceEngagement", "serviceEngagement", engagement));

  out.push(
    fact("serviceCapability", pick("serviceCapabilityNeeded", "serviceCapability"), text(terms.capability)),
    fact(
      "servicePricingBasis",
      pick("servicePricingBasisNeeded", "servicePricingBasis"),
      servicePricingBasis(text(terms.pricing_basis))?.label ?? null,
    ),
    fact(
      "serviceAvailability",
      pick("serviceAvailabilityNeeded", "serviceAvailability"),
      serviceAvailability(text(terms.availability))?.label ?? null,
    ),
  );
  return out;
}

function distributionFacts(row: FactsRow): RecordFact[] {
  const terms = (row.distribution_terms ?? {}) as Record<string, unknown>;
  const intent = text(row.market_intent);
  // Two of the three intents describe what the MEMBER brings. Someone offering
  // representation, and someone seeking brands to represent, are both stating
  // their own channels and their own capability. Only a member seeking a
  // partner is stating requirements of somebody else, and labelling their
  // answer "Capabilities offered" would invert the fact.
  const own =
    intent === "offer_distribution_or_representation" ||
    intent === "seek_brands_or_products_to_represent";

  const scope = coverageScope(text(row.coverage_scope_key))?.label ?? null;
  const codes = countryNames(list(row.territory_codes));
  const territory = scope && codes ? `${scope} (${codes})` : (scope ?? codes);

  const productScope = text(terms.product_scope);
  const sector = PRODUCT_SECTORS.find((s) => s.key === text(row.product_sector_key))?.label ?? null;

  return [
    fact("distributionObjective", "distributionObjective", text(terms.objective)),
    fact(
      "distributionProductScope",
      "distributionProductScope",
      productScope && sector ? `${productScope} (${sector})` : (productScope ?? sector),
    ),
    fact("distributionTerritory", "distributionTerritory", territory),
    fact("partnerType", "partnerType", partnerType(text(row.distribution_partner_type_key))?.label ?? null),
    fact(
      "relationship",
      "relationship",
      labelsOf(list(row.distribution_relationship_terms), relationshipTerm),
    ),
    fact(
      "distributionChannels",
      own ? "distributionChannelsOffered" : "distributionChannels",
      labelsOf(list(terms.channel_keys), distributionChannel),
    ),
    fact(
      "distributionCapabilities",
      own ? "distributionCapabilitiesOffered" : "distributionCapabilities",
      labelsOf(list(terms.capability_keys), distributionCapability),
    ),
    fact("distributionExpectations", "distributionExpectations", text(terms.commercial_expectations)),
    fact("distributionTiming", "distributionTiming", distributionTiming(text(terms.timing))?.label ?? null),
  ];
}

/** The fact that leads a summary, by family. */
const HEADLINE_KEY: Record<MarketFamily, string> = {
  products: "quantity",
  services: "serviceCapability",
  distribution: "distributionTerritory",
};

/**
 * Everything a surface needs to present one stored record truthfully.
 *
 * The shared closing facts (payment terms, role, validity) are appended for
 * every family because every family genuinely has them: the publication gate
 * requires a declared role and a validity from all three.
 */
export function presentRecord(row: FactsRow): RecordPresentation {
  const family = familyOfRow(row);
  const intent = MARKET_INTENTS.find((i) => i.key === text(row.market_intent)) ?? null;

  const facts =
    family === "services" ? serviceFacts(row)
    : family === "distribution" ? distributionFacts(row)
    : productFacts(row);

  facts.push(
    fact("payment", "payment", text(row.payment_terms)),
    fact("role", "role", text(row.submitter_role)),
    fact("validity", "validity", validityValue(row)),
  );

  const headline = facts.find((f) => f.key === HEADLINE_KEY[family]) ?? null;

  return {
    family,
    kindLabel: intent?.label ?? legacyKindLabel(row.type),
    side: intent?.side ?? null,
    subject: text(row.product),
    facts,
    headline: headline && headline.value ? headline : null,
  };
}

/**
 * What to CALL this record in a sentence.
 *
 * The member emails were written when every record was a product offer, so
 * they say "offer" throughout: "Your Ponte offer is now live", "Complete your
 * Ponte offer to publish it". A freight forwarder received both, about a
 * service they never offered for sale, and a member seeking a distributor was
 * told their offer was live when they had posted a requirement.
 *
 * Returned as a bare noun so the existing sentences keep their shape and only
 * the word that was wrong changes.
 */
export function recordNoun(row: FactsRow): string {
  const family = familyOfRow(row);
  if (family === "services") return "trade service";
  if (family === "distribution") return "distribution opportunity";

  const intent = MARKET_INTENTS.find((i) => i.key === text(row.market_intent)) ?? null;
  const side = intent?.side ?? (row.type === "offer" ? "supply" : row.type === "requirement" ? "demand" : null);
  if (side === "supply") return "offer";
  if (side === "demand") return "requirement";
  // A row that says neither is called what it certainly is, and nothing more.
  return "listing";
}

/**
 * The facts that were actually stated, for a surface with room for a few lines
 * rather than the whole record.
 */
export function statedFacts(row: FactsRow): RecordFact[] {
  return presentRecord(row).facts.filter((f) => f.value !== null);
}

/**
 * The one-line summary a workspace row or an email subject leads with.
 *
 * Never a shipment sentence for a record that is not a shipment. A freight
 * forwarder's summary is their capability, and a distribution opportunity's is
 * its territory, because those are the facts that tell a reader whether the
 * record concerns them.
 */
export function summaryLine(row: FactsRow): string {
  const p = presentRecord(row);
  const parts = [p.kindLabel, p.subject, p.headline?.value].filter(
    (s): s is string => !!s && s.trim() !== "",
  );
  return parts.join(" · ");
}
