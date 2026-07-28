/**
 * The canonical Ponte product vocabulary.
 *
 * ## Why this exists beside the HS catalogue rather than inside it
 *
 * `lib/hs/index.ts` reads HS 2022, which is the WCO's customs nomenclature. It
 * is authoritative for classification and useless for recognition. It will tell
 * you that heading 2710 covers "petroleum oils and oils obtained from
 * bituminous minerals, other than crude"; it will never tell you that the
 * trader who wrote `gas oil`, the one who wrote `EN590` and the one who wrote
 * `ULSD 10ppm` all mean one product with one buyer pool.
 *
 * That second kind of knowledge is commercial, it is what the member actually
 * types, and the product had none of it. Requiring the member to supply the
 * customs answer before Ponte would accept the commercial question is the exact
 * behaviour the owner rejected on 28 July 2026.
 *
 * ## What an entry must satisfy
 *
 * - `sector` is a key from `PRODUCT_SECTORS` in `lib/taxonomy/market.ts`. The
 *   category hierarchy is not re-declared here; a sector that does not exist
 *   there is a test failure, not a rendering quirk.
 * - a synonym belongs to exactly one product. Two products sharing one reaches
 *   a resolver nobody can reason about, so `catalogue.test.ts` rejects it.
 * - `hs` is a *candidate* classification and may be null. Nothing here blocks
 *   intake on it.
 * - `distinguisher` must answer "how is this different from the entry next to
 *   it?", because that sentence is what makes an ambiguity screen answerable.
 *
 * ## On coverage
 *
 * This is a working vocabulary, not a complete one, and it says so rather than
 * implying a finished taxonomy. It covers the refined-petroleum family in the
 * depth the acceptance case requires, plus a spread across the other sectors so
 * the resolver is exercised outside one commodity. Adding an entry is additive
 * and needs no migration. `lib/products/resolve.ts` degrades to ranked partial
 * matches rather than an empty result when a member names something not here,
 * which is what keeps a thin catalogue honest instead of silently wrong.
 */

import { PRODUCT_SECTORS } from "@/lib/taxonomy/market";
import type { CatalogueProduct } from "./model";

export const PRODUCT_CATALOGUE: readonly CatalogueProduct[] = [
  // -- Minerals, ores and fuels: refined petroleum -------------------------
  {
    key: "gasoil-10ppm-en590",
    name: "Gasoil 10 ppm (ULSD, EN 590)",
    sector: "min",
    group: "Refined petroleum products",
    synonyms: [
      "gas oil",
      "gasoil",
      "gasoil 10ppm",
      "gasoil 10 ppm",
      "ulsd",
      "ultra low sulphur diesel",
      "ultra low sulfur diesel",
      "en590",
      "en 590 diesel",
      "10ppm diesel",
      "10 ppm diesel",
      "automotive gasoil",
      "automotive gas oil",
      "ago",
      "road diesel",
      "diesel 10ppm",
    ],
    standards: ["EN 590", "ISO 8217 DMA"],
    attributes: [
      { key: "sulphur", label: "Sulphur content", value: "10 ppm maximum" },
      { key: "use", label: "Application", value: "Automotive, industrial and marine" },
      { key: "density", label: "Density", value: "0.820 to 0.845 kg/l at 15 C" },
    ],
    hs: { code: "271019", description: "Petroleum oils, other than crude: gas oils" },
    distinguisher: "The road-legal ultra-low-sulphur grade. 10 ppm is the number that separates it from every other gasoil.",
  },
  {
    key: "gasoil-50ppm",
    name: "Gasoil 50 ppm",
    sector: "min",
    group: "Refined petroleum products",
    synonyms: ["gasoil 50ppm", "gasoil 50 ppm", "50ppm diesel", "50 ppm diesel", "low sulphur gasoil", "lsgo"],
    standards: ["EN 590 (50 ppm variant)"],
    attributes: [
      { key: "sulphur", label: "Sulphur content", value: "50 ppm maximum" },
      { key: "use", label: "Application", value: "Automotive and industrial where 10 ppm is not required" },
    ],
    hs: { code: "271019", description: "Petroleum oils, other than crude: gas oils" },
    distinguisher: "The same product family at a higher sulphur ceiling. A buyer specifying 10 ppm cannot accept it.",
  },
  {
    key: "gasoil-500ppm",
    name: "Gasoil 500 ppm",
    sector: "min",
    group: "Refined petroleum products",
    synonyms: ["gasoil 500ppm", "gasoil 500 ppm", "500ppm diesel", "500 ppm diesel", "high sulphur gasoil", "hsgo"],
    standards: [],
    attributes: [
      { key: "sulphur", label: "Sulphur content", value: "500 ppm maximum" },
      { key: "use", label: "Application", value: "Off-road, generators and industrial burners" },
    ],
    hs: { code: "271019", description: "Petroleum oils, other than crude: gas oils" },
    distinguisher: "Off-road grade. Not permitted for road use in most import markets.",
  },
  {
    key: "d6-virgin-fuel-oil",
    name: "D6 Virgin Fuel Oil (residual fuel oil)",
    sector: "min",
    group: "Refined petroleum products",
    synonyms: [
      "d6",
      "d6 virgin fuel oil",
      "d6 fuel oil",
      "virgin fuel oil",
      "residual fuel oil",
      "heavy fuel oil",
      "hfo",
      "bunker c",
      "bunker fuel",
      "mazut",
    ],
    standards: ["ISO 8217 RM"],
    attributes: [
      { key: "viscosity", label: "Viscosity", value: "High viscosity residual grade" },
      { key: "use", label: "Application", value: "Power generation, industrial boilers, large marine engines" },
      { key: "handling", label: "Handling", value: "Requires pre-heating" },
    ],
    hs: { code: "271019", description: "Petroleum oils, other than crude: fuel oils" },
    distinguisher: "A residual, not a distillate. It needs pre-heating and reaches a completely different buyer from any gasoil.",
  },
  {
    key: "jet-a1",
    name: "Jet A-1 aviation turbine fuel",
    sector: "min",
    group: "Refined petroleum products",
    synonyms: ["jet a1", "jet a-1", "jet fuel", "jet", "aviation turbine fuel", "atf", "avtur", "kerosene jet"],
    standards: ["ASTM D1655", "DEF STAN 91-091"],
    attributes: [
      { key: "sulphur", label: "Sulphur content", value: "0.3 percent maximum" },
      { key: "freeze", label: "Freeze point", value: "Minus 47 C" },
      { key: "use", label: "Application", value: "Commercial and military aviation" },
    ],
    hs: { code: "271019", description: "Petroleum oils, other than crude: kerosene jet fuel" },
    distinguisher: "Certified aviation fuel. Its buyer, its handling chain and its approvals share nothing with a ground fuel.",
  },
  {
    key: "mazut-m100",
    name: "Mazut M-100",
    sector: "min",
    group: "Refined petroleum products",
    synonyms: ["mazut m100", "m100", "m-100", "gost 10585"],
    standards: ["GOST 10585"],
    attributes: [
      { key: "spec", label: "Specification", value: "GOST 10585 grade" },
      { key: "use", label: "Application", value: "Industrial and power generation" },
    ],
    hs: { code: "271019", description: "Petroleum oils, other than crude: fuel oils" },
    distinguisher: "The GOST-specified residual grade. Traded against a Russian standard rather than an ISO one.",
  },
  {
    key: "lpg",
    name: "Liquefied petroleum gas",
    sector: "min",
    group: "Gases",
    synonyms: ["lpg", "liquefied petroleum gas", "propane butane mix", "cooking gas", "autogas"],
    standards: ["EN 589"],
    attributes: [{ key: "use", label: "Application", value: "Domestic, automotive and industrial" }],
    hs: { code: "271112", description: "Liquefied propane" },
    distinguisher: "Sold as a pressurised gas. Its logistics are vessels and cylinders, not tanks.",
  },
  {
    key: "crude-oil",
    name: "Crude oil",
    sector: "min",
    group: "Crude petroleum",
    synonyms: ["crude", "crude oil", "bonny light", "brent", "wti", "basrah light", "petroleum crude"],
    standards: [],
    attributes: [{ key: "state", label: "State", value: "Unrefined" }],
    hs: { code: "270900", description: "Petroleum oils, crude" },
    distinguisher: "Unrefined. Everything else in this group is a product made from it.",
  },
  {
    key: "urea-46",
    name: "Urea 46 percent nitrogen",
    sector: "chem",
    group: "Fertilisers",
    synonyms: ["urea", "urea 46", "urea n46", "prilled urea", "granular urea", "n46"],
    standards: [],
    attributes: [
      { key: "nitrogen", label: "Nitrogen", value: "46 percent" },
      { key: "form", label: "Form", value: "Prilled or granular" },
    ],
    hs: { code: "310210", description: "Urea, whether or not in aqueous solution" },
    distinguisher: "A nitrogen fertiliser sold on its nitrogen percentage and its prill or granule form.",
  },
  {
    key: "caustic-soda",
    name: "Caustic soda (sodium hydroxide)",
    sector: "chem",
    group: "Inorganic chemicals",
    synonyms: ["caustic soda", "sodium hydroxide", "naoh", "caustic soda flakes", "lye"],
    standards: [],
    attributes: [{ key: "form", label: "Form", value: "Flakes, pearls or liquid" }],
    hs: { code: "281511", description: "Sodium hydroxide, solid" },
    distinguisher: "Traded by form. Flakes, pearls and liquid are different shipping and handling problems.",
  },

  // -- Agriculture and food ------------------------------------------------
  {
    key: "yellow-maize",
    name: "Yellow maize (corn), feed grade",
    sector: "agri",
    group: "Cereals",
    synonyms: ["yellow maize", "yellow corn", "maize", "corn", "feed corn", "feed maize", "mais"],
    standards: [],
    attributes: [
      { key: "grade", label: "Grade", value: "Feed grade" },
      { key: "moisture", label: "Moisture", value: "14 percent maximum, typical" },
    ],
    hs: { code: "100590", description: "Maize (corn), other than seed" },
    distinguisher: "Feed grade, not seed and not milling. The grade decides the buyer.",
  },
  {
    key: "milling-wheat",
    name: "Milling wheat",
    sector: "agri",
    group: "Cereals",
    synonyms: ["milling wheat", "bread wheat", "wheat", "soft wheat", "grano tenero"],
    standards: [],
    attributes: [{ key: "protein", label: "Protein", value: "11.5 percent minimum, typical" }],
    hs: { code: "100199", description: "Wheat and meslin, other" },
    distinguisher: "Specified on protein and falling number, because it is bought to be milled.",
  },
  {
    key: "raw-cane-sugar",
    name: "Raw cane sugar ICUMSA 600 to 1200",
    sector: "food",
    group: "Sugar",
    synonyms: ["raw sugar", "raw cane sugar", "icumsa 600", "icumsa 1200", "vhp sugar", "brown sugar bulk"],
    standards: ["ICUMSA 600", "ICUMSA 1200"],
    attributes: [{ key: "icumsa", label: "ICUMSA", value: "600 to 1200" }],
    hs: { code: "170114", description: "Raw cane sugar, not containing added flavouring or colouring" },
    distinguisher: "Unrefined. ICUMSA is the colour number that separates raw from refined.",
  },
  {
    key: "refined-sugar-icumsa-45",
    name: "Refined white sugar ICUMSA 45",
    sector: "food",
    group: "Sugar",
    synonyms: ["icumsa 45", "icumsa45", "refined sugar", "white sugar", "refined white sugar", "s30 sugar"],
    standards: ["ICUMSA 45"],
    attributes: [{ key: "icumsa", label: "ICUMSA", value: "45 maximum" }],
    hs: { code: "170199", description: "Cane or beet sugar, refined, other" },
    distinguisher: "ICUMSA 45 is the refined food-grade number. A buyer asking for 45 cannot take raw.",
  },
  {
    key: "refined-sunflower-oil",
    name: "Refined sunflower oil",
    sector: "food",
    group: "Edible oils",
    synonyms: ["sunflower oil", "refined sunflower oil", "rbd sunflower", "sunflower cooking oil", "olio di girasole"],
    standards: [],
    attributes: [{ key: "process", label: "Process", value: "Refined, bleached, deodorised" }],
    hs: { code: "151219", description: "Sunflower-seed or safflower oil, other than crude" },
    distinguisher: "Refined and food ready, as opposed to the crude oil a refinery buys.",
  },
  {
    key: "green-coffee-arabica",
    name: "Green coffee, Arabica",
    sector: "food",
    group: "Coffee, tea and spices",
    synonyms: ["green coffee", "arabica", "arabica coffee", "raw coffee beans", "caffe verde"],
    standards: [],
    attributes: [{ key: "state", label: "State", value: "Unroasted" }],
    hs: { code: "090111", description: "Coffee, not roasted, not decaffeinated" },
    distinguisher: "Unroasted. Roasted coffee is a different code and a different buyer entirely.",
  },

  // -- Metals ---------------------------------------------------------------
  {
    key: "hrc-steel-coil",
    name: "Hot rolled steel coil",
    sector: "metal",
    group: "Flat steel",
    synonyms: ["hot rolled coil", "hrc", "hot rolled steel", "hr coil", "steel coil hot rolled"],
    standards: ["ASTM A36", "EN 10025"],
    attributes: [{ key: "form", label: "Form", value: "Coil" }],
    hs: { code: "720839", description: "Flat-rolled iron or steel, hot-rolled, in coils" },
    distinguisher: "Hot rolled, so it carries mill scale and looser tolerances than cold rolled.",
  },
  {
    key: "copper-cathode",
    name: "Copper cathode grade A",
    sector: "metal",
    group: "Non-ferrous metals",
    synonyms: ["copper cathode", "copper cathodes", "grade a copper", "lme grade a", "cathode copper"],
    standards: ["LME Grade A", "BS EN 1978"],
    attributes: [{ key: "purity", label: "Purity", value: "99.99 percent" }],
    hs: { code: "740311", description: "Refined copper cathodes and sections of cathodes" },
    distinguisher: "LME-deliverable refined metal, not scrap and not concentrate.",
  },
  {
    key: "aluminium-ingot",
    name: "Aluminium ingot A7",
    sector: "metal",
    group: "Non-ferrous metals",
    synonyms: ["aluminium ingot", "aluminum ingot", "a7 ingot", "primary aluminium", "alu ingot"],
    standards: ["GOST 11069 A7"],
    attributes: [{ key: "purity", label: "Purity", value: "99.7 percent" }],
    hs: { code: "760110", description: "Aluminium, not alloyed, unwrought" },
    distinguisher: "Primary unalloyed metal. Alloyed ingot and scrap are separate markets.",
  },

  // -- Other sectors, so the resolver is exercised beyond commodities ------
  {
    key: "portland-cement",
    name: "Ordinary Portland cement 42.5",
    sector: "stone",
    group: "Cement and binders",
    synonyms: ["portland cement", "opc", "cement 42.5", "opc 42.5", "cemento portland", "grey cement"],
    standards: ["EN 197-1 CEM I 42.5"],
    attributes: [{ key: "strength", label: "Strength class", value: "42.5 N" }],
    hs: { code: "252329", description: "Portland cement, other" },
    distinguisher: "Specified by strength class. 32.5, 42.5 and 52.5 are not interchangeable.",
  },
  {
    key: "cotton-yarn",
    name: "Cotton yarn, ring spun",
    sector: "tex",
    group: "Yarn",
    synonyms: ["cotton yarn", "ring spun yarn", "combed cotton yarn", "carded cotton yarn", "filato di cotone"],
    standards: [],
    attributes: [{ key: "count", label: "Count", value: "Specified in Ne" }],
    hs: { code: "520512", description: "Cotton yarn, single, uncombed, of a specified decitex" },
    distinguisher: "Sold on count and spinning method, which decide what fabric it can become.",
  },
  {
    key: "hdpe-resin",
    name: "HDPE resin, blow moulding grade",
    sector: "plas",
    group: "Polymer resins",
    synonyms: ["hdpe", "high density polyethylene", "hdpe resin", "hdpe granules", "polyethylene hd"],
    standards: [],
    attributes: [{ key: "grade", label: "Grade", value: "Blow moulding" }],
    hs: { code: "390120", description: "Polyethylene having a specific gravity of 0.94 or more" },
    distinguisher: "The processing grade is the specification. Film, injection and blow grades are not substitutes.",
  },
  {
    key: "solar-pv-module",
    name: "Photovoltaic solar module",
    sector: "mach",
    group: "Energy equipment",
    synonyms: ["solar panel", "solar module", "pv module", "pv panel", "photovoltaic module", "pannelli solari"],
    standards: ["IEC 61215", "IEC 61730"],
    attributes: [{ key: "rating", label: "Rating", value: "Specified in watt peak" }],
    hs: { code: "854143", description: "Photovoltaic cells assembled in modules or made up into panels" },
    distinguisher: "Rated in watt peak and certified to IEC. Cells, modules and complete systems are different records.",
  },
  {
    key: "pharma-api",
    name: "Active pharmaceutical ingredient",
    sector: "chem",
    group: "Pharmaceuticals",
    synonyms: ["api", "active pharmaceutical ingredient", "bulk drug substance", "pharmaceutical raw material"],
    standards: ["USP", "EP", "GMP"],
    attributes: [{ key: "compliance", label: "Compliance", value: "Pharmacopoeia and GMP dependent" }],
    hs: null,
    distinguisher: "Regulated by pharmacopoeia and site approval. The specific molecule decides the classification.",
  },
];

/** A catalogue product by key, or null. */
export function productByKey(key: string): CatalogueProduct | null {
  return PRODUCT_CATALOGUE.find((p) => p.key === key) ?? null;
}

/** The sector label for a catalogue entry, read from the canonical taxonomy. */
export function sectorLabel(sectorKey: string): string {
  return PRODUCT_SECTORS.find((s) => s.key === sectorKey)?.label ?? sectorKey;
}

/**
 * Every catalogue key, for the semantic stage.
 *
 * The model is given this list and may return nothing else. That is what stops
 * it inventing a product: an unrecognised key is discarded by the parser rather
 * than trusted, so the worst a bad model answer can do is return fewer
 * candidates, never a fictional one.
 */
export function catalogueKeys(): string[] {
  return PRODUCT_CATALOGUE.map((p) => p.key);
}
