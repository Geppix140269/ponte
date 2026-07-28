import { DISTRIBUTION_MODES } from "./market";
import type { CategoryOption } from "./services";

/**
 * The canonical Distribution and representation taxonomy.
 *
 * The defect this replaces: `DISTRIBUTION_MODES` in `market.ts` mixes four
 * different kinds of thing in one flat list. `distributor` and `agent` are
 * partner types; `local` and `regional` are coverage; `exclusive` and
 * `nonexclusive` are relationship terms. A list that answers three questions at
 * once can answer none of them well, which is why a member asking for an
 * exclusive distributor in Italy could not say so, and why nothing could be
 * filtered afterwards.
 *
 * They are separated here into three independent dimensions, each stored in its
 * own field:
 *
 *   partner type          who the counterparty is
 *   relationship terms    how the arrangement is structured
 *   coverage              where and through which channels it applies
 *
 * `LEGACY_DISTRIBUTION_MAP` states where every one of the ten old values lands.
 * Nothing is reinterpreted silently, and the one value the owner requirement
 * left underspecified is marked so it can be confirmed rather than guessed at
 * again later.
 */

export const DISTRIBUTION_FAMILY = "distribution" as const;

/**
 * The twelve partner and channel types, in owner-specified order.
 *
 * Icons come from the Flow registry where it already has one. Five of these
 * types are new to Ponte and the registry has no drawing for them, so they
 * carry `icon: null`. That is a recorded absence: an icon is an approved asset,
 * and drawing five here would be an unapproved addition to the registry.
 */
export const DISTRIBUTION_PARTNER_TYPES: readonly CategoryOption[] = [
  {
    key: "distributor",
    label: "Distributor",
    description:
      "Purchases or takes responsibility for placing products into a defined market.",
    icon: "distribution.distributor",
    sort: 1,
  },
  {
    key: "importer",
    label: "Importer or importer of record",
    description: "Handles import responsibility, border formalities and local market entry.",
    icon: null,
    sort: 2,
  },
  {
    key: "wholesaler",
    label: "Wholesaler or reseller",
    description: "Buys and resells products through established commercial channels.",
    icon: null,
    sort: 3,
  },
  {
    key: "agent",
    label: "Commercial agent",
    description:
      "Introduces and develops sales on behalf of the principal, normally without taking ownership of the goods.",
    icon: "distribution.agent",
    sort: 4,
  },
  {
    key: "representative",
    label: "Sales representative",
    description:
      "Represents the brand or supplier and develops customers in a defined territory or sector.",
    icon: "distribution.representation",
    sort: 5,
  },
  {
    key: "broker",
    label: "Broker or intermediary",
    description:
      "Connects commercial parties and facilitates transactions without necessarily distributing the products.",
    icon: "distribution.broker",
    sort: 6,
  },
  {
    key: "market_entry",
    label: "Market-entry or business-development partner",
    description: "Builds the market, identifies channels and establishes commercial access.",
    icon: "distribution.entry",
    sort: 7,
  },
  {
    key: "franchise",
    label: "Franchise or licensing partner",
    description:
      "Operates or commercialises a brand, format or intellectual property under an agreed licence.",
    icon: null,
    sort: 8,
  },
  {
    key: "ecommerce",
    label: "E-commerce or marketplace partner",
    description:
      "Distributes through online marketplaces, digital channels or direct-to-business commerce.",
    icon: null,
    sort: 9,
  },
  {
    key: "local",
    label: "Local operating partner",
    description: "Provides in-country commercial presence, relationships or execution.",
    icon: "distribution.local",
    sort: 10,
  },
  {
    key: "regional",
    label: "Regional or multi-market partner",
    description: "Covers several countries or a defined region through one relationship.",
    icon: "distribution.regional",
    sort: 11,
  },
  {
    key: "other",
    label: "Other distribution arrangement",
    description:
      "Used only when none of the structured options accurately describes the relationship.",
    icon: null,
    sort: 12,
    isOther: true,
  },
];

/**
 * How the arrangement is structured. Deliberately NOT partner types, and never
 * shown in the same list as them: mixing the two is the defect being corrected.
 * A member may hold more than one of these at once, so this is a multiple
 * choice, unlike the partner type.
 */
export const DISTRIBUTION_RELATIONSHIP_TERMS: readonly CategoryOption[] = [
  {
    key: "exclusive",
    label: "Exclusive",
    description: "One partner only, for the agreed scope.",
    icon: "distribution.exclusive",
    sort: 1,
  },
  {
    key: "non_exclusive",
    label: "Non-exclusive",
    description: "More than one partner may cover the same scope.",
    icon: "distribution.nonexclusive",
    sort: 2,
  },
  {
    key: "sole_territory",
    label: "Sole partner for a defined territory",
    description: "Exclusive within one named territory, open elsewhere.",
    icon: null,
    sort: 3,
  },
  {
    key: "product_line",
    label: "Product-line specific",
    description: "Limited to named products or a named range.",
    icon: null,
    sort: 4,
  },
  {
    key: "sector",
    label: "Sector specific",
    description: "Limited to one industry or customer sector.",
    icon: null,
    sort: 5,
  },
  {
    key: "channel",
    label: "Channel specific",
    description: "Limited to named channels, such as retail, food service or online.",
    icon: null,
    sort: 6,
  },
  {
    key: "trial",
    label: "Trial or pilot arrangement",
    description: "A defined first period before any longer commitment.",
    icon: null,
    sort: 7,
  },
  {
    key: "open",
    label: "Open to discussion",
    description: "The structure is not fixed and can be agreed with the counterparty.",
    icon: null,
    sort: 8,
  },
  {
    key: "other",
    label: "Other relationship structure",
    description: "None of these describes it.",
    icon: null,
    sort: 9,
    isOther: true,
  },
];

/**
 * Where the arrangement applies, as a structured control rather than a
 * sentence. `countries` and `region` carry stored country codes alongside;
 * `worldwide`, `online` and the channel scopes do not need them.
 */
export const DISTRIBUTION_COVERAGE_SCOPES: readonly CategoryOption[] = [
  {
    key: "country",
    label: "One country",
    description: "A single national market.",
    icon: null,
    sort: 1,
  },
  {
    key: "countries",
    label: "Several countries",
    description: "A named list of national markets.",
    icon: null,
    sort: 2,
  },
  {
    key: "region",
    label: "A region",
    description: "A defined multi-country region.",
    icon: null,
    sort: 3,
  },
  {
    key: "worldwide",
    label: "Worldwide",
    description: "No territorial limit.",
    icon: null,
    sort: 4,
  },
  {
    key: "online",
    label: "Online only",
    description: "Digital channels, with no physical territory.",
    icon: null,
    sort: 5,
  },
  {
    key: "physical",
    label: "Physical channels",
    description: "Retail, wholesale, food service or other physical routes.",
    icon: null,
    sort: 6,
  },
  {
    key: "online_physical",
    label: "Online and physical channels",
    description: "Both digital and physical routes to market.",
    icon: null,
    sort: 7,
  },
];

/** Coverage scopes that expect specific countries to be named alongside them. */
export const COVERAGE_SCOPES_WITH_COUNTRIES: readonly string[] = ["country", "countries", "region"];

export function coverageScopeTakesCountries(scope: string | null): boolean {
  return scope !== null && COVERAGE_SCOPES_WITH_COUNTRIES.includes(scope);
}

/**
 * Where each legacy `DISTRIBUTION_MODES` value lands, and in which field.
 *
 * `field` matters as much as `key`: `exclusive` was stored as if it named a
 * partner, and it does not. Reading it back as a partner type would keep the
 * original error alive under new names.
 *
 * `route` is the one value the requirement left underspecified. Its stated
 * target, "route-to-market partner", is not one of the twelve canonical partner
 * types. It is mapped to `market_entry`, whose definition ("builds the market,
 * identifies channels and establishes commercial access") covers it exactly,
 * and it is flagged here so the owner confirms rather than discovers it.
 */
export interface LegacyDistributionMapping {
  /** Which canonical dimension the old value actually belonged to. */
  field: "partner_type" | "relationship_term";
  key: string;
  /** True where the requirement did not name a canonical target directly. */
  needsOwnerConfirmation?: boolean;
  note?: string;
}

export const LEGACY_DISTRIBUTION_MAP: Readonly<Record<string, LegacyDistributionMapping>> = {
  distributor: { field: "partner_type", key: "distributor" },
  agent: { field: "partner_type", key: "agent" },
  representation: { field: "partner_type", key: "representative" },
  entry: { field: "partner_type", key: "market_entry" },
  broker: { field: "partner_type", key: "broker" },
  route: {
    field: "partner_type",
    key: "market_entry",
    needsOwnerConfirmation: true,
    note: "The requirement maps this to a route-to-market partner, which is not one of the twelve canonical types. Market-entry is the closest exact definition.",
  },
  local: { field: "partner_type", key: "local" },
  regional: { field: "partner_type", key: "regional" },
  exclusive: { field: "relationship_term", key: "exclusive" },
  nonexclusive: { field: "relationship_term", key: "non_exclusive" },
};

/**
 * The canonical partner type a stored value means, or null when the value
 * belonged to a different dimension. A stored `exclusive` returns null here on
 * purpose: it was never a partner type, and answering as if it were is the
 * silent meaning change the requirement forbids.
 */
export function canonicalPartnerType(stored: string | null | undefined): string | null {
  if (!stored) return null;
  const value = stored.trim();
  if (!value) return null;
  if (DISTRIBUTION_PARTNER_TYPES.some((p) => p.key === value)) return value;
  const mapped = LEGACY_DISTRIBUTION_MAP[value];
  return mapped && mapped.field === "partner_type" ? mapped.key : null;
}

/** The canonical relationship term a stored value means, or null. */
export function canonicalRelationshipTerm(stored: string | null | undefined): string | null {
  if (!stored) return null;
  const value = stored.trim();
  if (!value) return null;
  if (DISTRIBUTION_RELATIONSHIP_TERMS.some((r) => r.key === value)) return value;
  const mapped = LEGACY_DISTRIBUTION_MAP[value];
  return mapped && mapped.field === "relationship_term" ? mapped.key : null;
}

export function partnerType(key: string | null | undefined): CategoryOption | null {
  if (!key) return null;
  return DISTRIBUTION_PARTNER_TYPES.find((p) => p.key === key) ?? null;
}

export function relationshipTerm(key: string | null | undefined): CategoryOption | null {
  if (!key) return null;
  return DISTRIBUTION_RELATIONSHIP_TERMS.find((r) => r.key === key) ?? null;
}

export function coverageScope(key: string | null | undefined): CategoryOption | null {
  if (!key) return null;
  return DISTRIBUTION_COVERAGE_SCOPES.find((c) => c.key === key) ?? null;
}

/** Only the escape route requires the member to write anything. */
export function partnerTypeNeedsCustomLabel(key: string | null): boolean {
  return partnerType(key)?.isOther === true;
}

export { DISTRIBUTION_MODES };
