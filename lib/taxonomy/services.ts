import type { MarketFamily, TaxonomyEntry, TaxonomyIcon } from "./market";
import { TRADE_SERVICES } from "./market";

/**
 * The canonical Trade Services category tree.
 *
 * This is the authority the pickers, Find, Explore, the composer, the API and
 * the database all read. Owner requirement, 28 July 2026: a member choosing
 * Trade services must be shown a structured, clickable set of categories. They
 * must not be asked to invent the professional terminology, and they must not
 * meet a blank text field first.
 *
 * Three rules are structural, not cosmetic:
 *
 *   1. Keys are stable and are what gets stored. Labels are display only and
 *      may be reworded without touching a single stored record.
 *   2. `other` is always last, in the top-level list and inside every
 *      subcategory list. It is the manual escape route, not a category.
 *   3. An icon appears only where the Ponte Flow registry already has one.
 *      The registry covers the ten established service groups; the eleventh
 *      top-level option is the escape route and has no drawing, and inventing
 *      one would be an unapproved asset. `icon: null` is a recorded absence,
 *      not an oversight, and the grid reserves the space so alignment holds.
 *
 * `TRADE_SERVICES` in `market.ts` is the earlier ten-entry constant. It stays
 * exported for the surfaces that already read it, and `LEGACY_SERVICE_KEY_MAP`
 * below states exactly how each of its keys lands here, so no stored value
 * changes meaning.
 */

export interface CategoryOption {
  /** Stable key. Stored. Never derived from the label. */
  key: string;
  /** Display label. May be reworded without a migration. */
  label: string;
  /** Plain-English description. Shown on the tile. */
  description: string;
  /**
   * A Ponte Flow registry key, or null where the registry has none.
   *
   * Typed against the generated key union, so a category cannot point at an
   * icon that does not exist, and cannot point at one of the nine keys that
   * carry meaning alone: every icon here sits beside its own visible label.
   */
  icon: TaxonomyIcon | null;
  sort: number;
  /** True for the manual escape route, which always sorts last. */
  isOther?: boolean;
}

export interface SubcategoryOption {
  key: string;
  label: string;
  /** The top-level category this belongs to. Enforced, not assumed. */
  category: string;
  sort: number;
  isOther?: boolean;
}

export const SERVICE_FAMILY: MarketFamily = "services";

/**
 * The eleven top-level Trade Service categories, in owner-specified order.
 *
 * Ten structured categories, then the escape route. `enabling` is the tenth:
 * it is a real category with real subcategories (sourcing, market research,
 * legal support and so on), which is why it is separate from `other`.
 */
export const TRADE_SERVICE_CATEGORIES: readonly CategoryOption[] = [
  {
    key: "freight",
    label: "Freight and logistics",
    description: "Move goods by sea, air, road, rail or combined transport.",
    icon: "service.freight",
    sort: 1,
  },
  {
    key: "warehousing",
    label: "Warehousing and fulfilment",
    description: "Store, handle, pick, pack and dispatch goods.",
    icon: "service.warehouse",
    sort: 2,
  },
  {
    key: "customs",
    label: "Customs and border services",
    description: "Clear goods through import and export formalities.",
    icon: "service.customs",
    sort: 3,
  },
  {
    key: "inspection",
    label: "Inspection, testing and quality",
    description: "Check what is actually being shipped, before or during loading.",
    icon: "service.inspection",
    sort: 4,
  },
  {
    key: "certification",
    label: "Certification and standards",
    description: "Prove a product or a process meets a required standard.",
    icon: "service.certification",
    sort: 5,
  },
  {
    key: "insurance",
    label: "Cargo insurance and risk",
    description: "Cover the goods, the payment or the counterparty against loss.",
    icon: "service.insurance",
    sort: 6,
  },
  {
    key: "finance",
    label: "Trade finance and payments",
    description: "Fund, guarantee or settle a cross-border transaction.",
    icon: "service.finance",
    sort: 7,
  },
  {
    key: "compliance",
    label: "Trade compliance and regulatory support",
    description: "Check that the trade, the parties and the goods are permitted.",
    icon: "service.compliance",
    sort: 8,
  },
  {
    key: "documentation",
    label: "Trade documentation",
    description: "Prepare, check and legalise the paperwork a shipment travels on.",
    icon: "service.documentation",
    sort: 9,
  },
  {
    key: "enabling",
    label: "Other trade-enabling services",
    description: "Sourcing, market entry, advisory, legal and trade technology.",
    icon: "service.other",
    sort: 10,
  },
  {
    /**
     * `unlisted`, not `other`.
     *
     * The earlier ten-key list already used `other`, and it meant "Other
     * trade-enabling services": a real category with real subcategories, not
     * an escape route. Reusing the key for the escape route would have made
     * every stored `other` ambiguous, and reading one back would silently
     * reclassify a member's trade-enabling record as "none of the above".
     *
     * The label a member sees is still "Other". Only the stored key differs,
     * which is exactly what stable keys are for.
     */
    key: "unlisted",
    label: "Other",
    description: "None of these describes it. Say what the service is in your own words.",
    icon: null,
    sort: 11,
    isOther: true,
  },
];

/**
 * Every Trade Service subcategory, flat, each naming its parent.
 *
 * Flat rather than nested so a stored key can be validated, looked up and
 * counted in one pass, and so a subcategory can never be silently orphaned by
 * an edit to the tree above it. `subcategoriesFor` groups them for display.
 *
 * Every category ends with its own "Other ..." entry, which keeps the parent
 * category intact when the specific service is not listed: a member with an
 * unusual freight need is still classified as freight.
 */
export const TRADE_SERVICE_SUBCATEGORIES: readonly SubcategoryOption[] = [
  // A. Freight and logistics
  { key: "freight.ocean", label: "Ocean freight", category: "freight", sort: 1 },
  { key: "freight.air", label: "Air freight", category: "freight", sort: 2 },
  { key: "freight.road", label: "Road freight", category: "freight", sort: 3 },
  { key: "freight.rail", label: "Rail freight", category: "freight", sort: 4 },
  { key: "freight.multimodal", label: "Multimodal transport", category: "freight", sort: 5 },
  { key: "freight.forwarding", label: "Freight forwarding", category: "freight", sort: 6 },
  { key: "freight.courier", label: "Courier and express delivery", category: "freight", sort: 7 },
  { key: "freight.groupage", label: "Consolidation and groupage", category: "freight", sort: 8 },
  { key: "freight.project", label: "Project cargo and heavy lift", category: "freight", sort: 9 },
  { key: "freight.bulk", label: "Bulk, tanker or liquid cargo", category: "freight", sort: 10 },
  { key: "freight.coldchain", label: "Temperature-controlled and cold-chain logistics", category: "freight", sort: 11 },
  { key: "freight.dangerous", label: "Dangerous-goods transport", category: "freight", sort: 12 },
  { key: "freight.lastmile", label: "Local delivery and last mile", category: "freight", sort: 13 },
  { key: "freight.other", label: "Other freight or logistics service", category: "freight", sort: 14, isOther: true },

  // B. Warehousing and fulfilment
  { key: "warehousing.general", label: "General warehousing", category: "warehousing", sort: 1 },
  { key: "warehousing.bonded", label: "Bonded warehousing", category: "warehousing", sort: 2 },
  { key: "warehousing.cold", label: "Cold storage", category: "warehousing", sort: 3 },
  { key: "warehousing.fulfilment", label: "Fulfilment and pick-and-pack", category: "warehousing", sort: 4 },
  { key: "warehousing.inventory", label: "Inventory management", category: "warehousing", sort: 5 },
  { key: "warehousing.crossdock", label: "Cross-docking", category: "warehousing", sort: 6 },
  { key: "warehousing.consolidation", label: "Consolidation and deconsolidation", category: "warehousing", sort: 7 },
  { key: "warehousing.packaging", label: "Packaging and repackaging", category: "warehousing", sort: 8 },
  { key: "warehousing.labelling", label: "Labelling and relabelling", category: "warehousing", sort: 9 },
  { key: "warehousing.returns", label: "Returns and reverse logistics", category: "warehousing", sort: 10 },
  { key: "warehousing.other", label: "Other warehousing or fulfilment service", category: "warehousing", sort: 11, isOther: true },

  // C. Customs and border services
  { key: "customs.import", label: "Import customs clearance", category: "customs", sort: 1 },
  { key: "customs.export", label: "Export customs clearance", category: "customs", sort: 2 },
  { key: "customs.brokerage", label: "Customs brokerage", category: "customs", sort: 3 },
  { key: "customs.classification", label: "Tariff and HS classification support", category: "customs", sort: 4 },
  { key: "customs.valuation", label: "Customs valuation", category: "customs", sort: 5 },
  { key: "customs.origin", label: "Rules of origin", category: "customs", sort: 6 },
  { key: "customs.duty", label: "Duty and import-tax advisory", category: "customs", sort: 7 },
  { key: "customs.transit", label: "Transit procedures", category: "customs", sort: 8 },
  { key: "customs.licences", label: "Import or export licences", category: "customs", sort: 9 },
  { key: "customs.special", label: "Special customs procedures", category: "customs", sort: 10 },
  { key: "customs.other", label: "Other customs or border service", category: "customs", sort: 11, isOther: true },

  // D. Inspection, testing and quality
  { key: "inspection.preshipment", label: "Pre-shipment inspection", category: "inspection", sort: 1 },
  { key: "inspection.loading", label: "Loading supervision", category: "inspection", sort: 2 },
  { key: "inspection.container", label: "Container inspection", category: "inspection", sort: 3 },
  { key: "inspection.quantity", label: "Quantity verification", category: "inspection", sort: 4 },
  { key: "inspection.quality", label: "Quality verification", category: "inspection", sort: 5 },
  { key: "inspection.testing", label: "Product testing", category: "inspection", sort: 6 },
  { key: "inspection.laboratory", label: "Sampling and laboratory analysis", category: "inspection", sort: 7 },
  { key: "inspection.audit", label: "Factory or supplier audit", category: "inspection", sort: 8 },
  { key: "inspection.monitoring", label: "Production monitoring", category: "inspection", sort: 9 },
  { key: "inspection.survey", label: "Cargo survey", category: "inspection", sort: 10 },
  { key: "inspection.damage", label: "Damage assessment", category: "inspection", sort: 11 },
  { key: "inspection.other", label: "Other inspection or quality service", category: "inspection", sort: 12, isOther: true },

  // E. Certification and standards
  { key: "certification.conformity", label: "Product conformity assessment", category: "certification", sort: 1 },
  { key: "certification.product", label: "Product certification", category: "certification", sort: 2 },
  { key: "certification.origin", label: "Certificate of origin support", category: "certification", sort: 3 },
  { key: "certification.health", label: "Health or sanitary certification", category: "certification", sort: 4 },
  { key: "certification.phyto", label: "Phytosanitary certification", category: "certification", sort: 5 },
  { key: "certification.foodsafety", label: "Food-safety certification", category: "certification", sort: 6 },
  { key: "certification.organic", label: "Organic certification", category: "certification", sort: 7 },
  { key: "certification.halal", label: "Halal certification", category: "certification", sort: 8 },
  { key: "certification.kosher", label: "Kosher certification", category: "certification", sort: 9 },
  { key: "certification.environmental", label: "Environmental or sustainability certification", category: "certification", sort: 10 },
  { key: "certification.management", label: "Management-system certification", category: "certification", sort: 11 },
  { key: "certification.other", label: "Other certification or standards service", category: "certification", sort: 12, isOther: true },

  // F. Cargo insurance and risk
  { key: "insurance.marine", label: "Marine cargo insurance", category: "insurance", sort: 1 },
  { key: "insurance.air", label: "Air cargo insurance", category: "insurance", sort: 2 },
  { key: "insurance.inland", label: "Road or rail cargo insurance", category: "insurance", sort: 3 },
  { key: "insurance.credit", label: "Trade credit insurance", category: "insurance", sort: 4 },
  { key: "insurance.political", label: "Political-risk insurance", category: "insurance", sort: 5 },
  { key: "insurance.liability", label: "Product or commercial liability cover", category: "insurance", sort: 6 },
  { key: "insurance.claims", label: "Claims management", category: "insurance", sort: 7 },
  { key: "insurance.loss", label: "Loss assessment", category: "insurance", sort: 8 },
  { key: "insurance.riskassessment", label: "Shipment-risk assessment", category: "insurance", sort: 9 },
  { key: "insurance.other", label: "Other trade insurance or risk service", category: "insurance", sort: 10, isOther: true },

  // G. Trade finance and payments
  { key: "finance.lc", label: "Letter of credit", category: "finance", sort: 1 },
  { key: "finance.lccheck", label: "Letter-of-credit document checking", category: "finance", sort: 2 },
  { key: "finance.collection", label: "Documentary collection", category: "finance", sort: 3 },
  { key: "finance.bankguarantee", label: "Bank guarantee", category: "finance", sort: 4 },
  { key: "finance.performance", label: "Performance or payment guarantee", category: "finance", sort: 5 },
  { key: "finance.factoring", label: "Invoice finance or factoring", category: "finance", sort: 6 },
  { key: "finance.supplychain", label: "Supply-chain finance", category: "finance", sort: 7 },
  { key: "finance.po", label: "Purchase-order finance", category: "finance", sort: 8 },
  { key: "finance.escrow", label: "Escrow or payment assurance", category: "finance", sort: 9 },
  { key: "finance.payments", label: "Cross-border payments", category: "finance", sort: 10 },
  { key: "finance.fx", label: "Foreign-exchange support", category: "finance", sort: 11 },
  { key: "finance.other", label: "Other trade-finance or payment service", category: "finance", sort: 12, isOther: true },

  // H. Trade compliance and regulatory support
  { key: "compliance.sanctions", label: "Sanctions screening", category: "compliance", sort: 1 },
  { key: "compliance.deniedparty", label: "Denied-party screening", category: "compliance", sort: 2 },
  { key: "compliance.exportcontrol", label: "Export-control compliance", category: "compliance", sort: 3 },
  { key: "compliance.restricted", label: "Restricted-goods compliance", category: "compliance", sort: 4 },
  { key: "compliance.productregulatory", label: "Product regulatory compliance", category: "compliance", sort: 5 },
  { key: "compliance.marketaccess", label: "Market-access requirements", category: "compliance", sort: 6 },
  { key: "compliance.labelling", label: "Packaging and labelling compliance", category: "compliance", sort: 7 },
  { key: "compliance.duediligence", label: "Supplier or counterparty due diligence", category: "compliance", sort: 8 },
  { key: "compliance.sourcing", label: "Responsible-sourcing compliance", category: "compliance", sort: 9 },
  { key: "compliance.traceability", label: "Supply-chain traceability", category: "compliance", sort: 10 },
  { key: "compliance.other", label: "Other compliance or regulatory service", category: "compliance", sort: 11, isOther: true },

  // I. Trade documentation
  { key: "documentation.invoice", label: "Commercial invoice preparation", category: "documentation", sort: 1 },
  { key: "documentation.packinglist", label: "Packing-list preparation", category: "documentation", sort: 2 },
  { key: "documentation.bol", label: "Bill of lading documentation", category: "documentation", sort: 3 },
  { key: "documentation.awb", label: "Air waybill documentation", category: "documentation", sort: 4 },
  { key: "documentation.origin", label: "Certificate-of-origin documentation", category: "documentation", sort: 5 },
  { key: "documentation.permits", label: "Import or export permits", category: "documentation", sort: 6 },
  { key: "documentation.lc", label: "Letter-of-credit documentation", category: "documentation", sort: 7 },
  { key: "documentation.checking", label: "Document checking", category: "documentation", sort: 8 },
  { key: "documentation.legalisation", label: "Document legalisation or notarisation", category: "documentation", sort: 9 },
  { key: "documentation.translation", label: "Trade-document translation", category: "documentation", sort: 10 },
  { key: "documentation.other", label: "Other trade-document service", category: "documentation", sort: 11, isOther: true },

  // J. Other trade-enabling services
  { key: "enabling.sourcing", label: "Product sourcing", category: "enabling", sort: 1 },
  { key: "enabling.supplieridentification", label: "Supplier identification", category: "enabling", sort: 2 },
  { key: "enabling.procurement", label: "Procurement support", category: "enabling", sort: 3 },
  { key: "enabling.supplierverification", label: "Supplier verification", category: "enabling", sort: 4 },
  { key: "enabling.marketresearch", label: "Market research", category: "enabling", sort: 5 },
  { key: "enabling.marketentry", label: "Market-entry advisory", category: "enabling", sort: 6 },
  { key: "enabling.contract", label: "Trade-contract support", category: "enabling", sort: 7 },
  { key: "enabling.legal", label: "International trade legal support", category: "enabling", sort: 8 },
  { key: "enabling.dispute", label: "Dispute or claims support", category: "enabling", sort: 9 },
  { key: "enabling.tender", label: "Tender or procurement support", category: "enabling", sort: 10 },
  { key: "enabling.technology", label: "Trade technology or systems", category: "enabling", sort: 11 },
  { key: "enabling.edi", label: "EDI and document integration", category: "enabling", sort: 12 },
  { key: "enabling.training", label: "Trade training", category: "enabling", sort: 13 },
  { key: "enabling.other", label: "Other trade-enabling support", category: "enabling", sort: 14, isOther: true },
];

/**
 * How the earlier ten-key `TRADE_SERVICES` constant lands here.
 *
 * Nine keys are unchanged. `warehouse` gains an `-ing` and a wider scope, and
 * the old `other` ("Other trade-enabling services") becomes `enabling`, because
 * the new tree needs `other` for the escape route that did not exist before.
 * A stored `other` therefore means "trade-enabling services" and is mapped to
 * `enabling`: reading it as the new escape route would silently reclassify
 * every existing record.
 */
export const LEGACY_SERVICE_KEY_MAP: Readonly<Record<string, string>> = {
  freight: "freight",
  warehouse: "warehousing",
  customs: "customs",
  inspection: "inspection",
  certification: "certification",
  insurance: "insurance",
  finance: "finance",
  compliance: "compliance",
  documentation: "documentation",
  other: "enabling",
};

/** The canonical category a stored value means, legacy or current. */
export function canonicalServiceCategory(stored: string | null | undefined): string | null {
  if (!stored) return null;
  const value = stored.trim();
  if (!value) return null;
  if (TRADE_SERVICE_CATEGORIES.some((c) => c.key === value)) return value;
  return LEGACY_SERVICE_KEY_MAP[value] ?? null;
}

/** The subcategories of one category, in order, with its Other entry last. */
export function subcategoriesFor(category: string): readonly SubcategoryOption[] {
  return TRADE_SERVICE_SUBCATEGORIES.filter((s) => s.category === category).sort(
    (a, b) => a.sort - b.sort,
  );
}

export function serviceCategory(key: string | null | undefined): CategoryOption | null {
  if (!key) return null;
  return TRADE_SERVICE_CATEGORIES.find((c) => c.key === key) ?? null;
}

export function serviceSubcategory(key: string | null | undefined): SubcategoryOption | null {
  if (!key) return null;
  return TRADE_SERVICE_SUBCATEGORIES.find((s) => s.key === key) ?? null;
}

/** Is this subcategory a member of this category? Storage validates with this. */
export function subcategoryBelongsTo(subcategory: string, category: string): boolean {
  const found = serviceSubcategory(subcategory);
  return found !== null && found.category === category;
}

/**
 * Does this category require the member to write something?
 *
 * Only the top-level escape route does. A recognised category and subcategory
 * are a complete classification on their own, and requiring prose on top of
 * them is the defect this whole tree exists to remove.
 */
export function serviceCategoryNeedsCustomLabel(category: string | null): boolean {
  return serviceCategory(category)?.isOther === true;
}

/** Whether a chosen subcategory is its category's own "Other ..." entry. */
export function serviceSubcategoryNeedsCustomLabel(subcategory: string | null): boolean {
  return serviceSubcategory(subcategory)?.isOther === true;
}

/**
 * The ten-entry legacy constant, still exported from `market.ts` and still read
 * by surfaces that have not moved. Re-exported here so the single import point
 * for service taxonomy is this module, and a reader can see both in one place.
 */
export { TRADE_SERVICES };
export type { TaxonomyEntry };
