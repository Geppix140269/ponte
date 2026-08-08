/**
 * The governed map from a Go4WorldBusiness export to Ponte's own vocabulary.
 *
 * Two translations live here and nowhere else: the source's side vocabulary and
 * its category slugs. Both are EXHAUSTIVE over everything observed across every
 * export received to date, and both are closed: an unrecognised value returns
 * null so the caller can hold and report the row. Nothing here falls back to a
 * default, because a default is a guess wearing a mapping's clothes, and a
 * guessed side files a buyer's requirement as a seller's offer.
 *
 * ---------------------------------------------------------------------------
 * Why a source map is not the canonical taxonomy
 * ---------------------------------------------------------------------------
 * `lib/taxonomy/market.ts` is the canonical authority: three families, fifteen
 * product sectors, HS ranges. This file does not restate it and must never
 * contradict it. It is the boundary layer that says what ONE external source's
 * words mean in those terms, so a second source can be added beside it without
 * either one editing the taxonomy.
 */

/** Every `type` value observed across every export received to date. */
export const OBSERVED_SOURCE_TYPES = ["seller_offer", "sell", "buy"] as const;

/**
 * The source's side vocabulary, mapped explicitly.
 *
 * The first import hardcoded `side: "offer"` because that export carried only
 * `seller_offer`. The 6 August exports carry `sell` AND `buy`, so the hardcode
 * would have filed 636 buyer requirements as seller offers: a silent inversion
 * of the one fact a Market Signal exists to state. There is no default branch
 * here for exactly that reason.
 */
const SIDE_BY_TYPE: Readonly<Record<string, "offer" | "requirement">> = {
  seller_offer: "offer",
  sell: "offer",
  supplier_offer: "offer",
  buyer_requirement: "requirement",
  buy: "requirement",
};

/** The canonical side, or null when the source used a word we do not know. */
export function sideForSourceType(type: unknown): "offer" | "requirement" | null {
  const key = String(type ?? "").trim().toLowerCase();
  return SIDE_BY_TYPE[key] ?? null;
}

/**
 * The commercial intent behind a side, within the products family.
 *
 * Every record these exports carry is a physical product, so the family is
 * fixed and the intent follows the side. Stated rather than assumed because the
 * quality rules are written per intent, and an intent inferred at the point of
 * use would drift from the one the record was filed under.
 */
export function intentForSide(side: "offer" | "requirement"): "offer_product" | "source_product" {
  return side === "offer" ? "offer_product" : "source_product";
}

export interface SourceCategory {
  /** The canonical public label. Must match the vocabulary already in use. */
  label: string;
  /**
   * The canonical product sector key from `lib/taxonomy/market.ts`, or null
   * when the source category genuinely spans more than one.
   *
   * Null is a finding, not a gap to be filled later. "Construction materials"
   * covers cement (HS 25), structural steel (72) and tiles (69), which are
   * three different sectors; picking one would file two thirds of those records
   * under a sector they are not in, and every sector filter downstream would
   * then return a confident wrong answer.
   */
  sector: string | null;
  /**
   * The two-digit HS chapter, or null when the category does not determine one.
   *
   * Same rule, one level finer. `rice-grains` is HS 10 for every row it can
   * contain. `sugar-food` could be 17, 19, 20 or 21, so it carries no chapter
   * and the card shows no chapter chip, which is the truth.
   */
  hs: string | null;
}

/**
 * Every category slug observed across every export received to date.
 *
 * The labels are NOT invented here. Each one already exists in the live
 * inventory, so an imported row lands in the same market a member is already
 * browsing rather than creating a near-duplicate beside it. That was a real
 * defect once: an import wrote "Rice & grains" next to the board's existing
 * "Rice & Grains" and every food market appeared twice.
 */
export const SOURCE_CATEGORIES: Readonly<Record<string, SourceCategory>> = {
  // ---- food and agriculture: category determines the chapter ----
  "rice-grains": { label: "Rice & Grains", sector: "agri", hs: "10" },
  pulses: { label: "Pulses", sector: "agri", hs: "07" },
  "nuts-dryfruit": { label: "Nuts & Dried Fruit", sector: "agri", hs: "08" },
  spices: { label: "Spices & Ingredients", sector: "agri", hs: "09" },
  "coffee-tea": { label: "Coffee & Tea", sector: "agri", hs: "09" },
  "edible-oils": { label: "Edible Oils", sector: "food", hs: "15" },
  oilseeds: { label: "Oilseeds", sector: "agri", hs: "12" },
  // Fresh produce spans vegetables (07) and fruit (08); the sector is the same
  // either way, so the sector is stated and the chapter is not.
  "fresh-produce": { label: "Fresh & Processed Produce", sector: "agri", hs: null },
  // Sugar (17), bakery (19), preparations (20, 21) are all "processed food".
  "sugar-food": { label: "Processed Food Ingredients", sector: "food", hs: null },

  // ---- industrial: sector determinate, chapter not ----
  chemicals: { label: "Chemicals", sector: "chem", hs: null },
  polymers: { label: "Specialised Polymers & Packaging", sector: "plas", hs: null },
  textiles: { label: "Textiles & Apparel", sector: "tex", hs: null },
  "metal-scraps": { label: "Metal Scraps & Recyclables", sector: "metal", hs: null },
  "metals-other": { label: "Metals (Other, Non-Scrap)", sector: "metal", hs: null },
  machinery: { label: "Machinery, Components & Industrial", sector: "mach", hs: null },
  // Electrical machinery is HS 85, inside the same 84-85 sector as machinery.
  electronics: { label: "Electronics", sector: "mach", hs: null },
  automotive: { label: "Automotive & Vehicle Parts", sector: "veh", hs: null },
  ceramics: { label: "Ceramics & Building Finishes", sector: "stone", hs: null },
  // Mineral fuels and oils, HS 27, inside the minerals sector.
  energy: { label: "Energy & Fuels", sector: "min", hs: null },

  // ---- genuinely cross-sector: label only ----
  // Packaging is plastic, paper, metal or glass depending on the record.
  packaging: { label: "Specialised Polymers & Packaging", sector: null, hs: null },
  // Cement (25), structural steel (72) and tiles (69) are three sectors.
  construction: { label: "Construction Materials", sector: null, hs: null },
  // Pharmaceuticals (30) and medical instruments (90) are two sectors.
  healthcare: { label: "Healthcare & Medical", sector: null, hs: null },
  // Hardware (84/85) and instruments (90) are two sectors.
  technology: { label: "Technology Products", sector: null, hs: null },
  "consumer-goods": { label: "Consumer Goods", sector: null, hs: null },
  "industrial-misc": { label: "Industrial Equipment & Supplies (Other)", sector: null, hs: null },
};

/** The canonical category, or null when the slug is not in the governed map. */
export function categoryForSourceSlug(slug: unknown): SourceCategory | null {
  const key = String(slug ?? "").trim().toLowerCase();
  return SOURCE_CATEGORIES[key] ?? null;
}
