import type { MarketSignal } from "@/lib/market-signals/logic";

/**
 * A controlled Market Signals inventory, for evidence.
 *
 * The requirement asks for Playwright evidence of representative searches and
 * says the suite must not depend on unpredictable live production records. This
 * repository has no non-production database (PL-002), so there is no third
 * option: the records a captured frame shows have to come from here.
 *
 * These are INVENTED records. They are not a sample of production, they are not
 * a seed, nothing imports them into a database, and the route that renders them
 * 404s outside development. Every one is written to exercise a specific
 * behaviour the search has to get right, which is why the set is small and
 * oddly shaped rather than realistic.
 *
 * What each record is for is stated on it. A fixture whose purpose is not
 * written down is a fixture nobody dares change.
 */

const DAY = 86_400_000;
/** A fixed clock. A fixture set that moves is not evidence of anything. */
const BASE = Date.parse("2026-07-20T00:00:00Z");

function signal(
  index: number,
  over: Partial<MarketSignal> & Pick<MarketSignal, "product">,
): MarketSignal {
  return {
    id: `f${String(index).padStart(4, "0")}0000-0000-4000-8000-000000000000`,
    canonicalId: `EXT-FIX-${String(index).padStart(6, "0")}`,
    side: "requirement",
    hsCode: null,
    chapter: null,
    chapterTitle: null,
    quantity: null,
    unit: null,
    incoterm: null,
    payment: null,
    originText: null,
    destinationText: null,
    originCode: null,
    destinationCode: null,
    spottedAt: new Date(BASE - index * DAY).toISOString(),
    publicExpiresAt: new Date(BASE + 60 * DAY).toISOString(),
    status: "approved_signal",
    description: null,
    summaryLine: null,
    category: null,
    ...over,
  };
}

export const FIXTURE_SIGNALS: MarketSignal[] = [
  // --- the alias set. None of these three shares a word with the other two,
  // and a search for any of them must return all three. This is the evidence
  // for "gas oil / gasoil / diesel / EN590 are one vocabulary".
  signal(1, {
    product: "Gas oil EN590 10ppm",
    hsCode: "2710.19",
    side: "offer",
    originText: "United Arab Emirates",
    destinationText: "Netherlands",
    quantity: "50000",
    unit: "MT",
    incoterm: "CIF",
    category: "Petroleum products",
    summaryLine: "Gas oil EN590 10ppm, 50,000 MT, CIF Rotterdam.",
  }),
  signal(2, {
    product: "Diesel fuel",
    hsCode: "2710.19",
    originText: "Netherlands",
    destinationText: "Ghana",
    quantity: "20000",
    unit: "MT",
    category: "Petroleum products",
  }),
  signal(3, {
    product: "Automotive gasoil",
    side: "offer",
    originText: "Italy",
    destinationText: "Malta",
    category: "Petroleum products",
    description: "Buyer indication read from a public source. Ponte has not confirmed it.",
  }),
  // Matched only through its DESCRIPTION, so it must rank below the three
  // above. Evidence that a title match outranks a body match.
  signal(4, {
    product: "Marine bunker fuel",
    originText: "Singapore",
    category: "Petroleum products",
    description: "Enquiry mentions gas oil as an acceptable alternative grade.",
  }),

  // --- the HS set. An exact code, a longer code sharing its prefix, and a
  // record carrying the undotted form the sources also produced.
  signal(5, {
    product: "Refined white sugar ICUMSA 45",
    hsCode: "1701.99",
    originText: "Brazil",
    destinationText: "Algeria",
    quantity: "25000",
    unit: "MT",
    incoterm: "CIF",
    category: "Sugar and confectionery",
  }),
  signal(6, { product: "Raw cane sugar", hsCode: "1701.14", originText: "Brazil" }),

  // --- the territory and country-name set.
  signal(7, {
    product: "Extra virgin olive oil, bulk",
    hsCode: "1509.10",
    side: "offer",
    originText: "Spain",
    destinationText: "Germany",
    category: "Edible oils",
    summaryLine: "Extra virgin olive oil, bulk, Spain to Germany.",
  }),
  signal(8, {
    product: "Olive oil, refined",
    side: "offer",
    originText: "Italy",
    destinationText: "Germany",
    category: "Edible oils",
  }),
  signal(9, {
    product: "Sunflower oil, crude",
    side: "offer",
    originText: "Ukraine",
    destinationText: "Spain",
    category: "Edible oils",
  }),

  // --- the services set, for `?q=freight+forwarding&family=services`.
  signal(10, {
    product: "Freight forwarding, Genoa to Casablanca",
    category: "Freight and logistics",
    destinationText: "Morocco",
    description: "Buyer seeks a forwarding agent for monthly groupage shipments.",
  }),
  signal(11, {
    product: "Ocean freight, FCL",
    category: "Freight and logistics",
    originText: "China",
    destinationText: "Italy",
  }),

  // --- the distribution set, for `?q=distributor&family=distribution`.
  signal(12, {
    product: "Distributor sought for packaged foods",
    category: "Distribution and representation",
    destinationText: "Poland",
    description: "Brand owner seeking a distribution partner with retail coverage.",
  }),
  signal(13, {
    product: "Commercial agent, industrial fasteners",
    category: "Distribution and representation",
    destinationText: "France",
  }),

  // --- filler, so the fixture board is long enough to page through and long
  // enough to cross the fact-register threshold.
  ...Array.from({ length: 75 }, (_, i) =>
    signal(20 + i, {
      product: `Milling wheat, lot ${String(i + 1).padStart(3, "0")}`,
      hsCode: "1001.99",
      originText: "France",
      destinationText: "Egypt",
      quantity: String(3000 + i * 100),
      unit: "MT",
      category: "Cereals",
    }),
  ),
];
