import type { CategoryOption } from "./services";

/**
 * The commercial vocabulary a Trade Service record is built from, downstream of
 * its category.
 *
 * This is the half of the Trade Services journey that did not exist. The
 * category tree in `services.ts` says WHAT the service is; every question after
 * it was borrowed from the product journey, so a freight forwarder describing a
 * European road and sea network was asked for a quantity, a unit and an
 * Incoterm, and was told an Incoterm was blocking their publication. None of
 * those is a fact a service has.
 *
 * Three rules hold here, the same three the category tree holds:
 *
 *   1. Keys are stable and are what gets stored. Labels are display and may be
 *      reworded without touching a stored record.
 *   2. A vocabulary is the trade's real vocabulary or it is a wrong answer with
 *      no way to say so. Each list ends with an honest escape rather than
 *      forcing an invention.
 *   3. A question is asked only where it has an answer. `specialisationGroupsFor`
 *      is the mechanism: a customs broker is asked about jurisdictions and
 *      regimes, a forwarder about modes and cargo, and neither is asked the
 *      other's question.
 *
 * Free text survives in exactly three places, scope, capability and trade
 * lanes, because each is a commercial statement in the member's own words that
 * no closed list can hold ("up to 40 containers per month"). Everything that a
 * counterparty would filter on is a key.
 */

/** Whether the engagement is a single piece of work or a running arrangement. */
export const SERVICE_ENGAGEMENT_TYPES: readonly CategoryOption[] = [
  {
    key: "one_off",
    label: "One-off engagement",
    description: "A single shipment, case, consignment or project.",
    icon: null,
    sort: 1,
  },
  {
    key: "ongoing",
    label: "Ongoing arrangement",
    description: "A continuing service under a standing or repeat relationship.",
    icon: null,
    sort: 2,
  },
  {
    key: "either",
    label: "Either",
    description: "Both a one-off and a continuing arrangement are workable.",
    icon: null,
    sort: 3,
  },
];

/**
 * How the service is charged for.
 *
 * This is the service analogue of a payment term, and it is deliberately NOT
 * stored in the product payment column: "per container" and "TT in advance,
 * 30%" answer different questions, and collapsing them would put a delivery
 * payment structure on a record that has no delivery.
 */
export const SERVICE_PRICING_BASES: readonly CategoryOption[] = [
  {
    key: "quotation",
    label: "Quotation on request",
    description: "Priced case by case once the requirement is known.",
    icon: null,
    sort: 1,
  },
  { key: "per_shipment", label: "Per shipment", description: "A price for each consignment moved.", icon: null, sort: 2 },
  { key: "per_container", label: "Per container or unit", description: "A price for each container, trailer or handling unit.", icon: null, sort: 3 },
  { key: "per_declaration", label: "Per declaration or document", description: "A price for each entry, certificate or document handled.", icon: null, sort: 4 },
  { key: "fixed_fee", label: "Fixed fee", description: "One agreed price for the whole scope.", icon: null, sort: 5 },
  { key: "hourly", label: "Hourly rate", description: "Charged by time worked.", icon: null, sort: 6 },
  { key: "daily", label: "Day rate", description: "Charged by day worked or day on site.", icon: null, sort: 7 },
  { key: "retainer", label: "Retainer", description: "A recurring fee for continuing availability.", icon: null, sort: 8 },
  { key: "subscription", label: "Subscription", description: "A periodic fee for continuing access to the service.", icon: null, sort: 9 },
  { key: "commission", label: "Commission", description: "A share of the transaction value.", icon: null, sort: 10 },
  { key: "success_fee", label: "Success fee", description: "Payable only on a defined outcome.", icon: null, sort: 11 },
  { key: "premium", label: "Premium or facility pricing", description: "Priced as an insurance premium or a finance facility.", icon: null, sort: 12 },
  {
    key: "negotiable",
    label: "To be agreed",
    description: "The basis is open and would be settled with the counterparty.",
    icon: null,
    sort: 13,
    isOther: true,
  },
];

/** When the service can start, or is needed from. */
export const SERVICE_AVAILABILITY: readonly CategoryOption[] = [
  { key: "immediate", label: "Available immediately", description: "Capacity is open now.", icon: null, sort: 1 },
  { key: "within_month", label: "Within a month", description: "Capacity opens shortly.", icon: null, sort: 2 },
  { key: "within_quarter", label: "Within three months", description: "Capacity opens in the coming quarter.", icon: null, sort: 3 },
  { key: "seasonal", label: "Seasonal", description: "Tied to a season or a defined window.", icon: null, sort: 4 },
  { key: "by_agreement", label: "By agreement", description: "Timing is settled with the counterparty.", icon: null, sort: 5 },
  { key: "urgent", label: "Needed urgently", description: "Required as soon as it can be arranged.", icon: null, sort: 6 },
];

/**
 * A conditioned set of options: a dimension of the service that only some
 * categories have.
 *
 * `categories` is the extension point the requirement asks for. Adding a new
 * conditioned question is one entry here, not a branch in a component, and a
 * category not named by any group is simply never asked the question.
 */
export interface ServiceSpecialisationGroup {
  key: string;
  /** Display heading for the group. */
  label: string;
  /** The service categories this applies to. `*` means every category. */
  categories: readonly string[] | "*";
  options: readonly CategoryOption[];
}

const option = (key: string, label: string, sort: number): CategoryOption => ({
  key,
  label,
  description: "",
  icon: null,
  sort,
});

/**
 * Every conditioned dimension, by service category.
 *
 * Not every category is modelled to the same depth, and that is deliberate:
 * the requirement asks for an architecture that supports category-conditioned
 * questions, not for a complete model of eleven professions in one change. A
 * category with no group here is asked scope, coverage, capability, pricing and
 * availability, which are the questions every service has.
 */
export const SERVICE_SPECIALISATION_GROUPS: readonly ServiceSpecialisationGroup[] = [
  {
    key: "transport_modes",
    label: "Transport modes",
    categories: ["freight"],
    options: [
      option("sea", "Sea", 1),
      option("road", "Road", 2),
      option("air", "Air", 3),
      option("rail", "Rail", 4),
      option("multimodal", "Multimodal", 5),
      option("inland_waterway", "Inland waterway", 6),
    ],
  },
  {
    key: "cargo_types",
    label: "Cargo handled",
    categories: ["freight", "warehousing", "inspection", "insurance"],
    options: [
      option("containerised", "Containerised", 1),
      option("breakbulk", "Breakbulk", 2),
      option("bulk", "Bulk or liquid", 3),
      option("temperature_controlled", "Temperature controlled", 4),
      option("dangerous_goods", "Dangerous goods", 5),
      option("project_cargo", "Project cargo and heavy lift", 6),
      option("perishable", "Perishable and food", 7),
      option("pharmaceutical", "Pharmaceutical and life sciences", 8),
      option("high_value", "High value and secure", 9),
    ],
  },
  {
    key: "facility_features",
    label: "Facility",
    categories: ["warehousing"],
    options: [
      option("bonded", "Bonded", 1),
      option("cold_storage", "Cold storage", 2),
      option("ambient", "Ambient", 3),
      option("hazardous", "Hazardous goods approved", 4),
      option("fulfilment", "Fulfilment and pick-and-pack", 5),
      option("cross_dock", "Cross-docking", 6),
    ],
  },
  {
    key: "customs_regimes",
    label: "Customs regimes",
    categories: ["customs", "compliance", "documentation"],
    options: [
      option("import", "Import clearance", 1),
      option("export", "Export clearance", 2),
      option("transit", "Transit", 3),
      option("warehousing_regime", "Customs warehousing", 4),
      option("inward_processing", "Inward processing", 5),
      option("outward_processing", "Outward processing", 6),
      option("temporary_admission", "Temporary admission", 7),
      option("preferential_origin", "Preferential origin", 8),
    ],
  },
  {
    key: "standards",
    label: "Standards and schemes",
    categories: ["certification", "inspection"],
    options: [
      option("food_safety", "Food safety", 1),
      option("organic", "Organic", 2),
      option("halal", "Halal", 3),
      option("kosher", "Kosher", 4),
      option("phytosanitary", "Phytosanitary", 5),
      option("management_systems", "Management systems", 6),
      option("product_conformity", "Product conformity", 7),
      option("sustainability", "Environmental and sustainability", 8),
    ],
  },
  {
    key: "finance_instruments",
    label: "Instruments",
    categories: ["finance", "insurance"],
    options: [
      option("letter_of_credit", "Letter of credit", 1),
      option("documentary_collection", "Documentary collection", 2),
      option("bank_guarantee", "Bank guarantee", 3),
      option("factoring", "Invoice finance and factoring", 4),
      option("supply_chain_finance", "Supply-chain finance", 5),
      option("credit_insurance", "Trade credit insurance", 6),
      option("political_risk", "Political-risk cover", 7),
      option("cargo_cover", "Cargo cover", 8),
      option("escrow", "Escrow and payment assurance", 9),
    ],
  },
  {
    key: "delivery_mode",
    label: "How it is delivered",
    categories: ["inspection", "certification", "compliance", "enabling", "documentation", "unlisted"],
    options: [
      option("on_site", "On site", 1),
      option("remote", "Remote", 2),
      option("both", "On site and remote", 3),
    ],
  },
];

/** The conditioned dimensions this service category actually has. */
export function specialisationGroupsFor(
  category: string | null | undefined,
): readonly ServiceSpecialisationGroup[] {
  if (!category) return [];
  return SERVICE_SPECIALISATION_GROUPS.filter(
    (g) => g.categories === "*" || g.categories.indexOf(category) >= 0,
  );
}

/** Every specialisation key this category may legitimately carry. */
export function specialisationKeysFor(category: string | null | undefined): string[] {
  return specialisationGroupsFor(category).flatMap((g) => g.options.map((o) => o.key));
}

const flatOption = (
  groups: readonly ServiceSpecialisationGroup[],
  key: string,
): CategoryOption | null => {
  for (const group of groups) {
    const found = group.options.find((o) => o.key === key);
    if (found) return found;
  }
  return null;
};

/**
 * A specialisation key's label, resolved across every group.
 *
 * Resolved globally rather than per category so a record whose category was
 * later changed still prints what it stored, instead of falling back to a raw
 * key. `sanitiseSpecialisations` is what decides whether it should still be
 * holding it.
 */
export function serviceSpecialisation(key: string | null | undefined): CategoryOption | null {
  if (!key) return null;
  return flatOption(SERVICE_SPECIALISATION_GROUPS, key);
}

/** Drop specialisation keys that the chosen category does not offer. */
export function sanitiseSpecialisations(
  category: string | null | undefined,
  keys: readonly string[],
): string[] {
  const allowed = new Set(specialisationKeysFor(category));
  return keys.filter((k) => allowed.has(k));
}

export function servicePricingBasis(key: string | null | undefined): CategoryOption | null {
  if (!key) return null;
  return SERVICE_PRICING_BASES.find((p) => p.key === key) ?? null;
}

export function serviceAvailability(key: string | null | undefined): CategoryOption | null {
  if (!key) return null;
  return SERVICE_AVAILABILITY.find((a) => a.key === key) ?? null;
}

export function serviceEngagementType(key: string | null | undefined): CategoryOption | null {
  if (!key) return null;
  return SERVICE_ENGAGEMENT_TYPES.find((e) => e.key === key) ?? null;
}
