import type {
  FlowIconKey,
  FlowLabelledKey,
} from "../../design-system/ponte-flow/generated/flow-icon-keys";

/**
 * Taxonomy icons are always shown beside their own visible label, so none of
 * them may be a key that carries meaning on its own. Typing the field this way
 * means a future entry pointing at, say, `participation.boundary` is a compile
 * error rather than an icon that silently repeats itself to a screen reader.
 */
export type TaxonomyIcon = Exclude<FlowIconKey, FlowLabelledKey>;

/**
 * The canonical market taxonomy: the single source of truth for the three
 * market families and everything under them.
 *
 * Written to satisfy findings F3, F4 and F5 in the Ponte Flow product-authority
 * notes:
 *
 *   F3  Find and Explore must IMPORT this. A taxonomy written independently of
 *       this constant is a defect even if its contents happen to match today.
 *   F4  Chapters 71, 91 and 92 are unassigned. They are named here, and
 *       `uncoveredChapters()` exists so the gap can be detected mechanically
 *       rather than rediscovered by eye. They are not quietly filed under an
 *       existing family for visual convenience.
 *   F5  Trade Services and Distribution & Representation now have typed
 *       constants, so Explore, search and the composer cannot each keep their
 *       own list.
 *
 * ADR-0001 extends that rule: family, record origin and commercial intent are
 * independent canonical dimensions. Every market record belongs to exactly one
 * family, has exactly one origin, and carries an intent valid for that family.
 *
 * Every entry carries what F3 requires: stable key, display label, coverage,
 * parent family, sort order and its Flow icon reference. The reduced icon is
 * not restated: the registry already pairs it with the standard asset, and
 * `PonteIcon` picks it by rendered size.
 *
 * No JSX here on purpose. This is data, importable by a server component, a
 * test or a script; the drawings live in the design system.
 */

export type MarketFamily = "products" | "services" | "distribution";

export const MARKET_FAMILY_KEYS: readonly MarketFamily[] = [
  "products",
  "services",
  "distribution",
];

/**
 * Legacy and external spellings that mean a canonical family.
 *
 * `trade_services` is the only one, and it exists because two modules were
 * written against different spellings of the same idea: the taxonomy and the
 * composer say `services`, the eligibility validator and some stored rows say
 * `trade_services`. Reading only one of them worked by accident for a while,
 * because a service's legacy `type` is also `service` and a fallback caught it.
 *
 * This map is the ONE boundary where that is reconciled.
 */
const FAMILY_ALIASES: Readonly<Record<string, MarketFamily>> = {
  trade_services: "services",
};

export function isMarketFamily(value: unknown): value is MarketFamily {
  return typeof value === "string" && (MARKET_FAMILY_KEYS as readonly string[]).includes(value);
}

/** Thrown by `normaliseMarketFamily` for a value that is present but unknown. */
export class UnknownMarketFamilyError extends Error {
  readonly value: unknown;
  constructor(value: unknown) {
    super(
      `Unknown market family ${JSON.stringify(value)}. Expected one of ` +
        `${MARKET_FAMILY_KEYS.join(", ")} or the legacy alias ` +
        `${Object.keys(FAMILY_ALIASES).join(", ")}.`,
    );
    this.name = "UnknownMarketFamilyError";
    this.value = value;
  }
}

/**
 * The canonical family for any stored or supplied value, or null when there is
 * none at all.
 *
 * Absent is not the same as unrecognised, and that difference is the whole
 * point. A record with NO family predates the family entrances: it is
 * product-shaped, and reading it as a product is correct. A record with an
 * UNRECOGNISED family is a bug or a hostile payload, and reading THAT as a
 * product would silently apply product rules to it, ask for a shipped quantity
 * and an Incoterm, and attach a classification the record never had.
 *
 * So: null for absent, the family for anything recognised, and a throw for
 * anything else. It fails closed.
 */
export function normaliseMarketFamily(value: unknown): MarketFamily | null {
  if (value === null || value === undefined || value === "") return null;
  if (isMarketFamily(value)) return value;
  if (typeof value === "string" && FAMILY_ALIASES[value]) return FAMILY_ALIASES[value];
  throw new UnknownMarketFamilyError(value);
}

export type MarketRecordOrigin = "market_signal" | "member_opportunity";

export const MARKET_RECORD_ORIGINS: readonly {
  key: MarketRecordOrigin;
  label: string;
  description: string;
}[] = [
  {
    key: "market_signal",
    label: "Market Signal",
    description: "Commercial intent observed from a legitimate external source.",
  },
  {
    key: "member_opportunity",
    label: "Member Opportunity",
    description: "Commercial intent created directly by a Ponte Trade member or member business.",
  },
];

export type MarketSide = "demand" | "supply";

export type MarketIntent =
  | "source_product"
  | "offer_product"
  | "seek_trade_service"
  | "offer_trade_service"
  | "seek_distribution_partner"
  | "offer_distribution_or_representation"
  | "seek_brands_or_products_to_represent";

export interface MarketIntentDefinition {
  key: MarketIntent;
  label: string;
  family: MarketFamily;
  side: MarketSide;
  sort: number;
}

export const MARKET_INTENTS: readonly MarketIntentDefinition[] = [
  { key: "source_product", label: "Source a product", family: "products", side: "demand", sort: 1 },
  { key: "offer_product", label: "Offer a product", family: "products", side: "supply", sort: 2 },
  { key: "seek_trade_service", label: "Seek a trade service", family: "services", side: "demand", sort: 1 },
  { key: "offer_trade_service", label: "Offer a trade service", family: "services", side: "supply", sort: 2 },
  {
    key: "seek_distribution_partner",
    label: "Seek a distributor, agent or representative",
    family: "distribution",
    side: "demand",
    sort: 1,
  },
  {
    key: "offer_distribution_or_representation",
    label: "Offer distribution or representation",
    family: "distribution",
    side: "supply",
    sort: 2,
  },
  {
    key: "seek_brands_or_products_to_represent",
    label: "Seek products or brands to distribute or represent",
    family: "distribution",
    side: "demand",
    sort: 3,
  },
];

export function intentsForFamily(family: MarketFamily): readonly MarketIntentDefinition[] {
  return MARKET_INTENTS.filter((intent) => intent.family === family);
}

export function isIntentForFamily(family: MarketFamily, intent: unknown): intent is MarketIntent {
  return typeof intent === "string" && intentsForFamily(family).some((candidate) => candidate.key === intent);
}

export const MARKET_FAMILIES: readonly {
  key: MarketFamily;
  label: string;
  icon: TaxonomyIcon;
  sort: number;
}[] = [
  { key: "products", label: "Products", icon: "market.family.products", sort: 1 },
  { key: "services", label: "Trade services", icon: "market.family.services", sort: 2 },
  {
    key: "distribution",
    label: "Distribution and representation",
    icon: "market.family.distribution",
    sort: 3,
  },
];

export interface ProductSector {
  /** Stable key. Never derived from the label. */
  key: string;
  label: string;
  /** Inclusive HS chapter bounds. */
  min: number;
  max: number;
  /** Display range, e.g. "HS 01–14". */
  range: string;
  family: MarketFamily;
  sort: number;
  icon: TaxonomyIcon;
}

/**
 * The 15 product sectors, in taxonomy order.
 *
 * Ranges are the approved map exactly as delivered, and they match the Flow
 * registry's own `hs` coverage field entry for entry. Do not widen a range to
 * close the chapter gap; see UNASSIGNED_CHAPTERS.
 */
export const PRODUCT_SECTORS: readonly ProductSector[] = [
  { key: "agri", label: "Agriculture & live animals", min: 1, max: 14, range: "HS 01–14", family: "products", sort: 1, icon: "hs.agri" },
  { key: "food", label: "Food, beverages & tobacco", min: 15, max: 24, range: "HS 15–24", family: "products", sort: 2, icon: "hs.food" },
  { key: "min", label: "Minerals, ores & fuels", min: 25, max: 27, range: "HS 25–27", family: "products", sort: 3, icon: "hs.min" },
  { key: "chem", label: "Chemicals & pharmaceuticals", min: 28, max: 38, range: "HS 28–38", family: "products", sort: 4, icon: "hs.chem" },
  { key: "plas", label: "Plastics & rubber", min: 39, max: 40, range: "HS 39–40", family: "products", sort: 5, icon: "hs.plas" },
  { key: "hide", label: "Hides, leather & furs", min: 41, max: 43, range: "HS 41–43", family: "products", sort: 6, icon: "hs.hide" },
  { key: "wood", label: "Wood, paper & pulp", min: 44, max: 49, range: "HS 44–49", family: "products", sort: 7, icon: "hs.wood" },
  { key: "tex", label: "Textiles & apparel", min: 50, max: 63, range: "HS 50–63", family: "products", sort: 8, icon: "hs.tex" },
  { key: "foot", label: "Footwear, headgear & accessories", min: 64, max: 67, range: "HS 64–67", family: "products", sort: 9, icon: "hs.foot" },
  { key: "stone", label: "Stone, ceramics & glass", min: 68, max: 70, range: "HS 68–70", family: "products", sort: 10, icon: "hs.stone" },
  { key: "metal", label: "Metals & metal products", min: 72, max: 83, range: "HS 72–83", family: "products", sort: 11, icon: "hs.metal" },
  { key: "mach", label: "Machinery & electronics", min: 84, max: 85, range: "HS 84–85", family: "products", sort: 12, icon: "hs.mach" },
  { key: "veh", label: "Vehicles & transport", min: 86, max: 89, range: "HS 86–89", family: "products", sort: 13, icon: "hs.veh" },
  { key: "inst", label: "Instruments, medical & precision", min: 90, max: 90, range: "HS 90", family: "products", sort: 14, icon: "hs.inst" },
  { key: "misc", label: "Miscellaneous, arms & art", min: 93, max: 97, range: "HS 93–97", family: "products", sort: 15, icon: "hs.misc" },
];

/**
 * Chapters that belong to no family (F4).
 *
 * These are not a rendering problem to be hidden. A record in chapter 71 is a
 * real record and must still be searchable and countable; it simply has no
 * sector to sit in until the taxonomy decision is made. No icon exists for
 * them, and drawing one would pre-empt that decision.
 */
export const UNASSIGNED_CHAPTERS: readonly { chapter: number; scope: string }[] = [
  { chapter: 71, scope: "Pearls, precious stones and metals" },
  { chapter: 91, scope: "Clocks and watches" },
  { chapter: 92, scope: "Musical instruments" },
];

/** Every HS chapter (1-97) that no sector covers. Should equal UNASSIGNED_CHAPTERS. */
export function uncoveredChapters(): number[] {
  const covered = new Set<number>();
  for (const s of PRODUCT_SECTORS) {
    for (let c = s.min; c <= s.max; c++) covered.add(c);
  }
  const gaps: number[] = [];
  for (let c = 1; c <= 97; c++) if (!covered.has(c)) gaps.push(c);
  return gaps;
}

/** The sector a chapter belongs to, or null when it is unassigned. */
export function sectorForChapter(chapter: number | string | null): ProductSector | null {
  const n = typeof chapter === "string" ? Number(chapter) : chapter;
  if (n === null || !Number.isFinite(n)) return null;
  return PRODUCT_SECTORS.find((s) => (n as number) >= s.min && (n as number) <= s.max) ?? null;
}

export interface TaxonomyEntry {
  key: string;
  label: string;
  family: MarketFamily;
  sort: number;
  icon: TaxonomyIcon;
}

/**
 * Trade services (F5).
 *
 * The transport sub-icons named in the brief (sea, air, road, rail, cold
 * chain and the rest) were deliberately not drawn, because they wait on this
 * constant. Adding a sub-mode here is therefore a design dependency, not a
 * free choice: it needs an asset before it can ship.
 */
export const TRADE_SERVICES: readonly TaxonomyEntry[] = [
  { key: "freight", label: "Freight & logistics", family: "services", sort: 1, icon: "service.freight" },
  { key: "warehouse", label: "Warehousing", family: "services", sort: 2, icon: "service.warehouse" },
  { key: "customs", label: "Customs", family: "services", sort: 3, icon: "service.customs" },
  { key: "inspection", label: "Inspection", family: "services", sort: 4, icon: "service.inspection" },
  { key: "certification", label: "Certification", family: "services", sort: 5, icon: "service.certification" },
  { key: "insurance", label: "Insurance", family: "services", sort: 6, icon: "service.insurance" },
  { key: "finance", label: "Trade finance", family: "services", sort: 7, icon: "service.finance" },
  { key: "compliance", label: "Compliance", family: "services", sort: 8, icon: "service.compliance" },
  { key: "documentation", label: "Documentation", family: "services", sort: 9, icon: "service.documentation" },
  { key: "other", label: "Other trade-enabling services", family: "services", sort: 10, icon: "service.other" },
];

/** Distribution and representation (F5). */
export const DISTRIBUTION_MODES: readonly TaxonomyEntry[] = [
  { key: "distributor", label: "Distributor sought", family: "distribution", sort: 1, icon: "distribution.distributor" },
  { key: "agent", label: "Agent sought", family: "distribution", sort: 2, icon: "distribution.agent" },
  { key: "representation", label: "Commercial representation", family: "distribution", sort: 3, icon: "distribution.representation" },
  { key: "entry", label: "Market-entry partner", family: "distribution", sort: 4, icon: "distribution.entry" },
  { key: "broker", label: "Broker or intermediary", family: "distribution", sort: 5, icon: "distribution.broker" },
  { key: "route", label: "Route-to-market", family: "distribution", sort: 6, icon: "distribution.route" },
  { key: "local", label: "Local partner", family: "distribution", sort: 7, icon: "distribution.local" },
  { key: "regional", label: "Regional coverage", family: "distribution", sort: 8, icon: "distribution.regional" },
  { key: "exclusive", label: "Exclusive representation", family: "distribution", sort: 9, icon: "distribution.exclusive" },
  { key: "nonexclusive", label: "Non-exclusive representation", family: "distribution", sort: 10, icon: "distribution.nonexclusive" },
];
