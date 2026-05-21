import type { Category, ConfigField, Product } from "./types";

// ---- Config field presets -------------------------------------------------
const f = {
  hs: (): ConfigField => ({
    name: "hs_code",
    label: "HS Code",
    type: "text",
    required: true,
    placeholder: "e.g. 0902.10",
  }),
  product: (): ConfigField => ({
    name: "product",
    label: "Product / Commodity",
    type: "text",
    required: true,
    placeholder: "e.g. Green tea",
  }),
  country: (label = "Country"): ConfigField => ({
    name: "country",
    label,
    type: "country",
    required: true,
  }),
  origin: (): ConfigField => ({
    name: "origin",
    label: "Origin country",
    type: "country",
    required: true,
  }),
  destination: (): ConfigField => ({
    name: "destination",
    label: "Destination country",
    type: "country",
    required: true,
  }),
  company: (): ConfigField => ({
    name: "company",
    label: "Company name",
    type: "text",
    required: true,
    placeholder: "Legal entity name",
  }),
  brief: (): ConfigField => ({
    name: "brief",
    label: "Research brief",
    type: "textarea",
    required: true,
    placeholder: "Describe the intelligence you need…",
  }),
};

// ---- Categories -----------------------------------------------------------
export const CATEGORIES: Category[] = [
  {
    slug: "market-reports",
    name: "Market Reports",
    description:
      "Full market intelligence reports built from verified trade data, delivered within 48h.",
    order: 1,
  },
  {
    slug: "analysis",
    name: "Market Analysis",
    description:
      "Focused analysis modules covering demand, competition, and trade readiness — delivered in 24h.",
    order: 2,
  },
  {
    slug: "bundles",
    name: "Intelligence Bundles",
    description:
      "Pre-defined combinations of our analysis modules at a discount versus buying individually.",
    order: 3,
  },
  {
    slug: "geopolitical",
    name: "Geopolitical & Risk",
    description:
      "Chokepoint, sanctions, and conflict-scenario intelligence for exposed supply chains.",
    order: 4,
  },
  {
    slug: "country-tariff",
    name: "Country & Tariff",
    description:
      "Country trade profiles, tariff and landed-cost breakdowns, and bilateral trade flows.",
    order: 5,
  },
  {
    slug: "company-supplier",
    name: "Company & Supplier",
    description:
      "Company trade profiles and ranked supplier / buyer intelligence with shipment volumes.",
    order: 6,
  },
  {
    slug: "tenders",
    name: "Tender Intelligence",
    description:
      "Open tender briefings and a weekly digest matched to your sector and country profile.",
    order: 7,
  },
  {
    slug: "custom-research",
    name: "Custom Research",
    description:
      "Bespoke intelligence and white-glove market entry analysis, scoped to your question.",
    order: 8,
  },
  {
    slug: "subscriptions",
    name: "Subscriptions & Credits",
    description:
      "Our newsletter and report credit packs for teams that buy intelligence regularly.",
    order: 9,
  },
];

const EUR = "EUR";

// ---- Products -------------------------------------------------------------
export const PRODUCTS: Product[] = [
  // ===== A — Market Reports (48h) =====
  {
    sku: "MR-001",
    slug: "single-country-market-report",
    title: "Single Country Market Report",
    categorySlug: "market-reports",
    shortDescription:
      "Full market report for any HS code in a single target country.",
    fullDescription:
      "A complete market intelligence report for one product (by HS code) in one country: demand, imports, key partners, pricing, and competitive landscape. Verified against multiple official sources with manual QA before delivery.",
    includes: [
      "Demand and import trends (5-year)",
      "Top trading partners and supplier countries",
      "Price bands and landed-cost context",
      "Competitive landscape and key players",
      "Watermarked PDF, optional DOCX",
    ],
    priceCents: 49900,
    currency: EUR,
    deliveryType: "48h",
    isSubscription: false,
    isConfigurable: true,
    configFields: [f.hs(), f.country("Target country")],
    featured: true,
  },
  {
    sku: "MR-002",
    slug: "global-market-report",
    title: "Global Market Report",
    categorySlug: "market-reports",
    shortDescription: "Full market report for any HS code across all countries.",
    fullDescription:
      "A worldwide view of trade for a single product (by HS code): global demand, leading importers and exporters, trade corridors, and pricing dynamics across markets.",
    includes: [
      "Global demand and trade-flow map",
      "Leading importers and exporters",
      "Major trade corridors by volume",
      "Cross-market price comparison",
      "Watermarked PDF, optional DOCX",
    ],
    priceCents: 89900,
    currency: EUR,
    deliveryType: "48h",
    isSubscription: false,
    isConfigurable: true,
    configFields: [f.hs()],
    featured: true,
  },
  {
    sku: "MR-003",
    slug: "eu-seafood-trade-report",
    title: "EU Seafood Trade Report",
    categorySlug: "market-reports",
    shortDescription:
      "Species-level EU seafood trade report by member state, on weekly Taxud data.",
    fullDescription:
      "A focused EU seafood trade report for a chosen species and member state, built on weekly EU Taxud data: import volumes, sourcing countries, pricing, and seasonality.",
    includes: [
      "Species-level import volumes (weekly Taxud)",
      "Sourcing countries and shares",
      "Price evolution and seasonality",
      "Member-state demand context",
      "Watermarked PDF, optional DOCX",
    ],
    priceCents: 34900,
    currency: EUR,
    deliveryType: "48h",
    isSubscription: false,
    isConfigurable: true,
    configFields: [
      { name: "species", label: "Species", type: "text", required: true, placeholder: "e.g. Atlantic salmon" },
      f.country("EU member state"),
    ],
  },
  {
    sku: "MR-004",
    slug: "trade-corridor-report",
    title: "Trade Corridor Report",
    categorySlug: "market-reports",
    shortDescription:
      "Product flow report for a specific origin → destination corridor.",
    fullDescription:
      "An origin-to-destination corridor report for one product: volumes, values, seasonality, key shippers, and route dynamics between the two markets.",
    includes: [
      "Corridor volumes and values (5-year)",
      "Seasonality and trend analysis",
      "Key shippers and partners",
      "Route and logistics context",
      "Watermarked PDF, optional DOCX",
    ],
    priceCents: 29900,
    currency: EUR,
    deliveryType: "48h",
    isSubscription: false,
    isConfigurable: true,
    configFields: [f.product(), f.origin(), f.destination()],
  },

  // ===== B — Market Analysis (24h) =====
  // Market Overview band
  {
    sku: "MA-001",
    slug: "retail-snapshot-report",
    title: "Retail Snapshot Report",
    categorySlug: "analysis",
    band: "Market Overview",
    shortDescription:
      "Major retailers, channel mix, price bands, and private-label brands in a target market.",
    fullDescription:
      "A snapshot of the retail landscape for your product in a target market: who the major retailers are, the channel mix, prevailing price bands, and the private-label brands competing on shelf.",
    includes: [
      "Major retailers and channel mix",
      "Price bands by channel",
      "Private-label brand landscape",
      "Shelf and positioning notes",
    ],
    priceCents: 12900,
    currency: EUR,
    deliveryType: "24h",
    isSubscription: false,
    isConfigurable: true,
    configFields: [f.product(), f.country("Target market")],
    featured: true,
  },
  {
    sku: "MA-002",
    slug: "market-size-demand-report",
    title: "Market Size & Demand Report",
    categorySlug: "analysis",
    band: "Market Overview",
    shortDescription:
      "Current size, historical trends, growth rates, forecasts, and key demand drivers.",
    fullDescription:
      "Sizes the market for your product and explains its trajectory: current size, historical trends, growth rates, forward forecasts, and the key drivers behind demand.",
    includes: [
      "Current market size estimate",
      "Historical trend and growth rates",
      "Forward demand forecast",
      "Key demand drivers",
    ],
    priceCents: 14900,
    currency: EUR,
    deliveryType: "24h",
    isSubscription: false,
    isConfigurable: true,
    configFields: [f.product(), f.country("Target market")],
  },
  {
    sku: "MA-003",
    slug: "consumer-preferences-report",
    title: "Consumer Preferences Report",
    categorySlug: "analysis",
    band: "Market Overview",
    shortDescription:
      "How consumers buy: purchase drivers, usage patterns, segments, packaging preferences.",
    fullDescription:
      "Explains how consumers in a market buy your product: purchase drivers, local usage patterns, demographic segments, and packaging preferences.",
    includes: [
      "Purchase drivers and decision factors",
      "Local usage patterns",
      "Demographic segments",
      "Packaging and format preferences",
    ],
    priceCents: 12900,
    currency: EUR,
    deliveryType: "24h",
    isSubscription: false,
    isConfigurable: true,
    configFields: [f.product(), f.country("Target market")],
  },
  {
    sku: "MA-004",
    slug: "market-sentiment-analysis",
    title: "Market Sentiment Analysis",
    categorySlug: "analysis",
    band: "Market Overview",
    shortDescription:
      "Sentiment, competitive landscape, consumer opinion, and pricing insight for a product.",
    fullDescription:
      "Reads the market mood for a tradeable product: overall sentiment, the competitive landscape, consumer opinion, and pricing insights.",
    includes: [
      "Overall market sentiment",
      "Competitive landscape overview",
      "Consumer opinion signals",
      "Pricing insights",
    ],
    priceCents: 9900,
    currency: EUR,
    deliveryType: "24h",
    isSubscription: false,
    isConfigurable: true,
    configFields: [f.product(), f.country("Target market")],
    featured: true,
  },
  {
    sku: "MA-005",
    slug: "seasonal-demand-intelligence",
    title: "Seasonal Demand Intelligence",
    categorySlug: "analysis",
    band: "Market Overview",
    shortDescription:
      "Month-by-month demand, import trends, price indices, and logistics windows.",
    fullDescription:
      "Month-by-month demand intelligence with charts and KPIs: import trends, price indices, and the logistics windows that matter for timing shipments.",
    includes: [
      "Month-by-month demand profile",
      "Import trend charts and KPIs",
      "Price indices over the year",
      "Optimal logistics windows",
    ],
    priceCents: 14900,
    currency: EUR,
    deliveryType: "24h",
    isSubscription: false,
    isConfigurable: true,
    configFields: [f.product(), f.country("Target market")],
  },
  {
    sku: "MA-006",
    slug: "local-production-overview",
    title: "Local Production Overview",
    categorySlug: "analysis",
    band: "Market Overview",
    shortDescription:
      "Domestic capacity, import dependency, local competitors, self-sufficiency trends.",
    fullDescription:
      "Maps domestic supply for your product: local production capacity, import-dependency ratio, local competitor brands, and self-sufficiency trends.",
    includes: [
      "Domestic production capacity",
      "Import-dependency ratio",
      "Local competitor brands",
      "Self-sufficiency trends",
    ],
    priceCents: 12900,
    currency: EUR,
    deliveryType: "24h",
    isSubscription: false,
    isConfigurable: true,
    configFields: [f.product(), f.country("Target market")],
  },
  // Trade Readiness band
  {
    sku: "MA-007",
    slug: "substitutes-competitors-report",
    title: "Substitutes & Competitors Report",
    categorySlug: "analysis",
    band: "Trade Readiness",
    shortDescription:
      "Direct/indirect substitutes, competitive categories, positioning, threat levels.",
    fullDescription:
      "Identifies what you're really competing against: direct and indirect substitutes, competitive categories, price positioning, switching ease, and threat levels.",
    includes: [
      "Direct and indirect substitutes",
      "Competitive category map",
      "Price positioning and switching ease",
      "Threat-level assessment",
    ],
    priceCents: 12900,
    currency: EUR,
    deliveryType: "24h",
    isSubscription: false,
    isConfigurable: true,
    configFields: [f.product(), f.country("Target market")],
  },
  {
    sku: "MA-008",
    slug: "swot-analysis",
    title: "SWOT Analysis",
    categorySlug: "analysis",
    band: "Trade Readiness",
    shortDescription:
      "Strengths, weaknesses, opportunities, and threats for exporting to a specific market.",
    fullDescription:
      "A structured SWOT for exporting a specific product to a specific market — a fast, decision-ready read on where you stand before you commit.",
    includes: [
      "Strengths and weaknesses",
      "Opportunities and threats",
      "Market-specific commentary",
      "Decision-ready summary",
    ],
    priceCents: 9900,
    currency: EUR,
    deliveryType: "24h",
    isSubscription: false,
    isConfigurable: true,
    configFields: [f.product(), f.country("Target market")],
  },
  {
    sku: "MA-009",
    slug: "market-entry-barriers-report",
    title: "Market Entry Barriers Report",
    categorySlug: "analysis",
    band: "Trade Readiness",
    shortDescription:
      "Non-tariff barriers, licenses, quotas, local-content rules, distribution restrictions.",
    fullDescription:
      "Surfaces the barriers between you and the shelf: non-tariff barriers, import licenses, quotas, local-content rules, and distribution restrictions.",
    includes: [
      "Non-tariff barriers",
      "Import licenses and quotas",
      "Local-content rules",
      "Distribution restrictions",
    ],
    priceCents: 14900,
    currency: EUR,
    deliveryType: "24h",
    isSubscription: false,
    isConfigurable: true,
    configFields: [f.product(), f.country("Target market")],
  },
  {
    sku: "MA-010",
    slug: "packaging-labeling-guide",
    title: "Packaging & Labeling Guide",
    categorySlug: "analysis",
    band: "Trade Readiness",
    shortDescription:
      "Mandatory labeling languages, certifications, shelf-life and packaging rules.",
    fullDescription:
      "A compliance-ready guide to packaging and labeling for a market: mandatory languages, required certifications, shelf-life rules, and packaging-material restrictions.",
    includes: [
      "Mandatory labeling languages",
      "Required certifications",
      "Shelf-life rules",
      "Packaging-material restrictions",
    ],
    priceCents: 9900,
    currency: EUR,
    deliveryType: "24h",
    isSubscription: false,
    isConfigurable: true,
    configFields: [f.product(), f.country("Target market")],
  },
  {
    sku: "MA-011",
    slug: "quality-standards-certifications-guide",
    title: "Quality Standards & Certifications Guide",
    categorySlug: "analysis",
    band: "Trade Readiness",
    shortDescription:
      "Required certifications, regulatory agencies, testing and phytosanitary rules.",
    fullDescription:
      "Maps the quality and certification requirements for a market: required certifications, the agencies that enforce them, testing requirements, and phytosanitary rules.",
    includes: [
      "Required certifications",
      "Regulatory agencies",
      "Testing requirements",
      "Phytosanitary rules",
    ],
    priceCents: 12900,
    currency: EUR,
    deliveryType: "24h",
    isSubscription: false,
    isConfigurable: true,
    configFields: [f.product(), f.country("Target market")],
  },

  // ===== C — Bundles =====
  {
    sku: "BU-001",
    slug: "market-entry-bundle",
    title: "Market Entry Bundle",
    categorySlug: "bundles",
    shortDescription: "SWOT + entry barriers + packaging + quality standards.",
    fullDescription:
      "Everything you need to assess readiness for a new market: SWOT analysis, market entry barriers, packaging & labeling, and quality standards & certifications.",
    includes: [
      "SWOT Analysis (MA-008)",
      "Market Entry Barriers Report (MA-009)",
      "Packaging & Labeling Guide (MA-010)",
      "Quality Standards & Certifications Guide (MA-011)",
    ],
    priceCents: 39900,
    savingsCents: 7700,
    currency: EUR,
    deliveryType: "24h",
    isSubscription: false,
    isConfigurable: true,
    configFields: [f.product(), f.country("Target market")],
    bundleOf: ["MA-008", "MA-009", "MA-010", "MA-011"],
    featured: true,
  },
  {
    sku: "BU-002",
    slug: "competitive-intelligence-bundle",
    title: "Competitive Intelligence Bundle",
    categorySlug: "bundles",
    shortDescription:
      "Retail snapshot + sentiment + substitutes + consumer preferences.",
    fullDescription:
      "Understand the competitive field before you enter: retail snapshot, market sentiment, substitutes & competitors, and consumer preferences.",
    includes: [
      "Retail Snapshot Report (MA-001)",
      "Market Sentiment Analysis (MA-004)",
      "Substitutes & Competitors Report (MA-007)",
      "Consumer Preferences Report (MA-003)",
    ],
    priceCents: 44900,
    savingsCents: 5700,
    currency: EUR,
    deliveryType: "24h",
    isSubscription: false,
    isConfigurable: true,
    configFields: [f.product(), f.country("Target market")],
    bundleOf: ["MA-001", "MA-004", "MA-007", "MA-003"],
  },
  {
    sku: "BU-003",
    slug: "full-market-overview-pack",
    title: "Full Market Overview Pack",
    categorySlug: "bundles",
    shortDescription: "All six Market Overview modules (MA-001 through MA-006).",
    fullDescription:
      "The complete Market Overview band: retail snapshot, market size & demand, consumer preferences, sentiment, seasonal demand, and local production — all six modules.",
    includes: [
      "Retail Snapshot (MA-001)",
      "Market Size & Demand (MA-002)",
      "Consumer Preferences (MA-003)",
      "Market Sentiment (MA-004)",
      "Seasonal Demand (MA-005)",
      "Local Production (MA-006)",
    ],
    priceCents: 59900,
    savingsCents: 18600,
    currency: EUR,
    deliveryType: "24h",
    isSubscription: false,
    isConfigurable: true,
    configFields: [f.product(), f.country("Target market")],
    bundleOf: ["MA-001", "MA-002", "MA-003", "MA-004", "MA-005", "MA-006"],
  },
  {
    sku: "BU-004",
    slug: "trade-readiness-pack",
    title: "Trade Readiness Pack",
    categorySlug: "bundles",
    shortDescription: "All five Trade Readiness modules (MA-007 through MA-011).",
    fullDescription:
      "The complete Trade Readiness band: substitutes & competitors, SWOT, entry barriers, packaging & labeling, and quality standards — all five modules.",
    includes: [
      "Substitutes & Competitors (MA-007)",
      "SWOT Analysis (MA-008)",
      "Market Entry Barriers (MA-009)",
      "Packaging & Labeling (MA-010)",
      "Quality Standards & Certifications (MA-011)",
    ],
    priceCents: 49900,
    savingsCents: 10700,
    currency: EUR,
    deliveryType: "24h",
    isSubscription: false,
    isConfigurable: true,
    configFields: [f.product(), f.country("Target market")],
    bundleOf: ["MA-007", "MA-008", "MA-009", "MA-010", "MA-011"],
  },
  {
    sku: "BU-005",
    slug: "complete-market-intelligence-pack",
    title: "Complete Market Intelligence Pack",
    categorySlug: "bundles",
    shortDescription: "All eleven Market Analysis modules in one pack.",
    fullDescription:
      "Every Market Analysis module — both the Overview and Trade Readiness bands, eleven reports in total — for the most complete view of a product and market.",
    includes: [
      "All six Market Overview modules",
      "All five Trade Readiness modules",
      "Single product + market configuration",
      "Best value across the analysis range",
    ],
    priceCents: 99900,
    savingsCents: 39200,
    currency: EUR,
    deliveryType: "24h",
    isSubscription: false,
    isConfigurable: true,
    configFields: [f.product(), f.country("Target market")],
    bundleOf: [
      "MA-001", "MA-002", "MA-003", "MA-004", "MA-005", "MA-006",
      "MA-007", "MA-008", "MA-009", "MA-010", "MA-011",
    ],
    featured: true,
  },
  {
    sku: "BU-006",
    slug: "export-launchpad",
    title: "Export Launchpad",
    categorySlug: "bundles",
    shortDescription:
      "Single-country market report + market entry bundle + sentiment, for one product + market.",
    fullDescription:
      "Our launch package for a single product and market: a full Single Country Market Report, the Market Entry Bundle, and a Market Sentiment Analysis — research and readiness in one purchase.",
    includes: [
      "Single Country Market Report (MR-001)",
      "Market Entry Bundle (BU-001)",
      "Market Sentiment Analysis (MA-004)",
    ],
    priceCents: 89900,
    savingsCents: 12700,
    currency: EUR,
    deliveryType: "48h",
    isSubscription: false,
    isConfigurable: true,
    configFields: [f.hs(), f.product(), f.country("Target market")],
    bundleOf: ["MR-001", "BU-001", "MA-004"],
  },

  // ===== D — Geopolitical & Risk =====
  {
    sku: "GR-001",
    slug: "strait-of-hormuz-impact-report",
    title: "Strait of Hormuz Impact Report",
    categorySlug: "geopolitical",
    shortDescription:
      "HS-6 product exposure across four conflict scenarios, with recommendations.",
    fullDescription:
      "Models the exposure of an HS-6 product to a Strait of Hormuz disruption across four conflict scenarios, with strategic recommendations to mitigate risk.",
    includes: [
      "HS-6 exposure mapping",
      "Four conflict scenarios modelled",
      "Price and supply impact estimates",
      "Strategic recommendations",
    ],
    priceCents: 19900,
    currency: EUR,
    deliveryType: "48h",
    isSubscription: false,
    isConfigurable: true,
    configFields: [
      f.hs(),
      {
        name: "scenario",
        label: "Primary scenario focus",
        type: "select",
        required: true,
        options: [
          { value: "blockade", label: "Full blockade" },
          { value: "partial", label: "Partial disruption" },
          { value: "insurance", label: "Insurance / shipping shock" },
          { value: "escalation", label: "Regional escalation" },
        ],
      },
    ],
  },
  {
    sku: "GR-002",
    slug: "sanctions-exposure-report",
    title: "Sanctions Exposure Report",
    categorySlug: "geopolitical",
    shortDescription:
      "Screen a company or country across OFAC / EU / UK / UN watchlists.",
    fullDescription:
      "Screens a company or country against the major sanctions regimes — OFAC, EU, UK, and UN watchlists — and summarises exposure and red flags.",
    includes: [
      "OFAC / EU / UK / UN screening",
      "Direct and indirect exposure",
      "Red-flag summary",
      "Risk rating",
    ],
    priceCents: 9900,
    currency: EUR,
    deliveryType: "24h",
    isSubscription: false,
    isConfigurable: true,
    configFields: [
      {
        name: "target",
        label: "Company or country to screen",
        type: "text",
        required: true,
        placeholder: "Company legal name or country",
      },
    ],
  },
  {
    sku: "GR-003",
    slug: "chokepoint-disruption-brief",
    title: "Chokepoint Disruption Brief",
    categorySlug: "geopolitical",
    shortDescription:
      "Impact of a specific chokepoint disruption on your product or route.",
    fullDescription:
      "Assesses how a disruption at a chosen maritime chokepoint — Suez, Panama, Malacca, Bab-el-Mandeb, and others — would affect a specific product or route.",
    includes: [
      "Chokepoint dependency analysis",
      "Reroute options and added cost/time",
      "Product / route impact",
      "Mitigation recommendations",
    ],
    priceCents: 24900,
    currency: EUR,
    deliveryType: "48h",
    isSubscription: false,
    isConfigurable: true,
    configFields: [
      {
        name: "chokepoint",
        label: "Chokepoint",
        type: "select",
        required: true,
        options: [
          { value: "suez", label: "Suez Canal" },
          { value: "panama", label: "Panama Canal" },
          { value: "malacca", label: "Strait of Malacca" },
          { value: "hormuz", label: "Strait of Hormuz" },
          { value: "bab-el-mandeb", label: "Bab-el-Mandeb" },
          { value: "bosphorus", label: "Bosphorus" },
        ],
      },
      f.product(),
    ],
  },

  // ===== E — Country & Tariff =====
  {
    sku: "CT-001",
    slug: "country-trade-profile",
    title: "Country Trade Profile",
    categorySlug: "country-tariff",
    shortDescription:
      "Full trade snapshot for one country: imports, exports, partners, HS focus areas.",
    fullDescription:
      "A full trade snapshot for a single country: total imports and exports, key trading partners, and the HS focus areas that define its trade.",
    includes: [
      "Imports and exports overview",
      "Key trading partners",
      "HS focus areas",
      "Trade balance trends",
    ],
    priceCents: 7900,
    currency: EUR,
    deliveryType: "24h",
    isSubscription: false,
    isConfigurable: true,
    configFields: [f.country()],
  },
  {
    sku: "CT-002",
    slug: "tariff-landed-cost-report",
    title: "Tariff & Landed Cost Report",
    categorySlug: "country-tariff",
    shortDescription:
      "Duty rates and landed-cost breakdown for an HS code on a specific route.",
    fullDescription:
      "Calculates duty rates and a full landed-cost breakdown for a specific HS code on a specific origin → destination route.",
    includes: [
      "Applicable duty rates",
      "Landed-cost breakdown",
      "Taxes and fees",
      "Route-specific notes",
    ],
    priceCents: 6900,
    currency: EUR,
    deliveryType: "24h",
    isSubscription: false,
    isConfigurable: true,
    configFields: [f.hs(), f.origin(), f.destination()],
  },
  {
    sku: "CT-003",
    slug: "bilateral-trade-flow-report",
    title: "Bilateral Trade Flow Report",
    categorySlug: "country-tariff",
    shortDescription:
      "All trade flows between two countries for a product over five years.",
    fullDescription:
      "Maps all trade flows between Country A and Country B for a product over a five-year window: volumes, values, direction, and trend.",
    includes: [
      "Five-year bilateral flows",
      "Volumes and values by direction",
      "Trend and seasonality",
      "Top sub-products",
    ],
    priceCents: 14900,
    currency: EUR,
    deliveryType: "24h",
    isSubscription: false,
    isConfigurable: true,
    configFields: [
      f.product(),
      { name: "country_a", label: "Country A", type: "country", required: true },
      { name: "country_b", label: "Country B", type: "country", required: true },
    ],
  },

  // ===== F — Company & Supplier =====
  {
    sku: "CI-001",
    slug: "company-trade-profile",
    title: "Company Trade Profile",
    categorySlug: "company-supplier",
    shortDescription:
      "Trade activity, HS codes traded, ports used, and partners for one company.",
    fullDescription:
      "Profiles a single company's trade activity: the HS codes it trades, the ports it uses, and the partners it ships with.",
    includes: [
      "Trade activity overview",
      "HS codes traded",
      "Ports used",
      "Key trading partners",
    ],
    priceCents: 14900,
    currency: EUR,
    deliveryType: "48h",
    isSubscription: false,
    isConfigurable: true,
    configFields: [f.company()],
  },
  {
    sku: "CI-002",
    slug: "top-suppliers-report",
    title: "Top Suppliers Report",
    categorySlug: "company-supplier",
    shortDescription:
      "Ranked supplier list for a product + destination, with shipment volumes.",
    fullDescription:
      "A ranked list of suppliers for a product into a destination country, with shipment volumes — your shortlist for sourcing.",
    includes: [
      "Ranked supplier list",
      "Shipment volumes",
      "Destination focus",
      "Contactable shortlist",
    ],
    priceCents: 19900,
    currency: EUR,
    deliveryType: "48h",
    isSubscription: false,
    isConfigurable: true,
    configFields: [f.product(), f.destination()],
  },
  {
    sku: "CI-003",
    slug: "top-buyers-report",
    title: "Top Buyers Report",
    categorySlug: "company-supplier",
    shortDescription:
      "Ranked buyer list for a product + origin, with shipment volumes.",
    fullDescription:
      "A ranked list of buyers for a product out of an origin country, with shipment volumes — your shortlist for selling.",
    includes: [
      "Ranked buyer list",
      "Shipment volumes",
      "Origin focus",
      "Contactable shortlist",
    ],
    priceCents: 19900,
    currency: EUR,
    deliveryType: "48h",
    isSubscription: false,
    isConfigurable: true,
    configFields: [f.product(), f.origin()],
  },

  // ===== G — Tender Intelligence =====
  {
    sku: "TI-001",
    slug: "active-tenders-briefing",
    title: "Active Tenders Briefing",
    categorySlug: "tenders",
    shortDescription:
      "All open tenders for a sector + country/region, with links and deadlines.",
    fullDescription:
      "A one-time briefing of all open tenders for a sector in a country or region, with direct links and deadlines so you can act fast.",
    includes: [
      "Open tenders for your sector",
      "Direct links and references",
      "Deadlines and key dates",
      "Country / region scope",
    ],
    priceCents: 7900,
    currency: EUR,
    deliveryType: "24h",
    isSubscription: false,
    isConfigurable: true,
    configFields: [
      { name: "sector", label: "Sector", type: "text", required: true, placeholder: "e.g. Medical devices" },
      f.country("Country or region"),
    ],
  },
  {
    sku: "TI-002",
    slug: "weekly-tender-digest",
    title: "Weekly Tender Digest",
    categorySlug: "tenders",
    shortDescription:
      "Weekly email + PDF of new tenders matched to your sector and country.",
    fullDescription:
      "A weekly subscription: every week we send an email and PDF of new tenders matching your sector and country profile.",
    includes: [
      "Weekly email + PDF",
      "Matched to your sector/country",
      "New tenders only",
      "Cancel anytime",
    ],
    priceCents: 7900,
    priceSuffix: "/mo",
    currency: EUR,
    deliveryType: "instant",
    isSubscription: true,
    isConfigurable: true,
    configFields: [
      { name: "sector", label: "Sector", type: "text", required: true, placeholder: "e.g. Construction" },
      f.country("Country or region"),
    ],
  },

  // ===== H — Custom Research =====
  {
    sku: "CR-001",
    slug: "custom-research-request",
    title: "Custom Research Request",
    categorySlug: "custom-research",
    shortDescription:
      "Bespoke intelligence brief — our team scopes it with you after purchase.",
    fullDescription:
      "Tell us the question and we build the answer: a bespoke intelligence brief scoped with you after purchase. Pricing starts from €999 depending on scope.",
    includes: [
      "Bespoke scope",
      "Dedicated analyst",
      "Source-verified findings",
      "Delivered as a branded PDF",
    ],
    priceCents: 99900,
    priceFrom: true,
    currency: EUR,
    deliveryType: "custom",
    isSubscription: false,
    isConfigurable: true,
    configFields: [f.brief()],
  },
  {
    sku: "CR-002",
    slug: "market-entry-analysis-white-glove",
    title: "Market Entry Analysis (white-glove)",
    categorySlug: "custom-research",
    shortDescription:
      "Full entry strategy: market report + all 11 analysis modules + sanctions + tariff + company intel.",
    fullDescription:
      "Our most complete engagement: a full market report, all eleven analysis modules, sanctions screening, tariff analysis, and company intelligence — assembled into one entry strategy. From €2,499 depending on scope.",
    includes: [
      "Single Country Market Report",
      "All 11 analysis modules",
      "Sanctions + tariff analysis",
      "Company / supplier intelligence",
      "Strategy synthesis and call",
    ],
    priceCents: 249900,
    priceFrom: true,
    currency: EUR,
    deliveryType: "custom",
    isSubscription: false,
    isConfigurable: true,
    configFields: [f.product(), f.country("Target market"), f.brief()],
  },

  // ===== I — Subscriptions & Credits =====
  {
    sku: "SB-001",
    slug: "trade-intelligence-newsletter",
    title: "Trade Intelligence Newsletter",
    categorySlug: "subscriptions",
    shortDescription:
      "Weekly digest: macro trade shifts, chokepoint alerts, tender wins, policy changes.",
    fullDescription:
      "A weekly digest of what moved in global trade: macro shifts, chokepoint alerts, key tender wins, and policy changes — written for people who trade.",
    includes: [
      "Weekly digest email",
      "Chokepoint and risk alerts",
      "Policy and tariff changes",
      "Cancel anytime",
    ],
    priceCents: 2900,
    priceSuffix: "/mo",
    altPrice: "or €249/yr",
    currency: EUR,
    deliveryType: "instant",
    isSubscription: true,
    isConfigurable: false,
  },
  {
    sku: "SB-002",
    slug: "report-credit-pack-starter",
    title: "Report Credit Pack — Starter",
    categorySlug: "subscriptions",
    shortDescription: "3 report credits, redeemable on any Analysis or Country & Tariff product.",
    fullDescription:
      "Three report credits you can redeem on any Market Analysis or Country & Tariff product — buy now, decide later.",
    includes: [
      "3 report credits",
      "Redeem on Analysis or Country & Tariff",
      "No expiry within 12 months",
    ],
    priceCents: 29900,
    currency: EUR,
    deliveryType: "instant",
    isSubscription: false,
    isConfigurable: false,
  },
  {
    sku: "SB-003",
    slug: "report-credit-pack-growth",
    title: "Report Credit Pack — Growth",
    categorySlug: "subscriptions",
    shortDescription: "10 report credits for teams buying intelligence regularly.",
    fullDescription:
      "Ten report credits for teams that buy intelligence regularly — better value per report and a single invoice.",
    includes: [
      "10 report credits",
      "Redeem on Analysis or Country & Tariff",
      "Single invoice",
    ],
    priceCents: 89900,
    currency: EUR,
    deliveryType: "instant",
    isSubscription: false,
    isConfigurable: false,
  },
  {
    sku: "SB-004",
    slug: "report-credit-pack-enterprise",
    title: "Report Credit Pack — Enterprise",
    categorySlug: "subscriptions",
    shortDescription:
      "30 report credits + priority delivery + a dedicated account manager.",
    fullDescription:
      "Thirty report credits with priority delivery and a dedicated account manager — for organisations that run on trade intelligence.",
    includes: [
      "30 report credits",
      "Priority delivery",
      "Dedicated account manager",
    ],
    priceCents: 239900,
    currency: EUR,
    deliveryType: "instant",
    isSubscription: false,
    isConfigurable: false,
  },
];

// ---- Lookups --------------------------------------------------------------
export function getProduct(slug: string): Product | undefined {
  return PRODUCTS.find((p) => p.slug === slug);
}

export function getProductBySku(sku: string): Product | undefined {
  return PRODUCTS.find((p) => p.sku === sku);
}

export function getCategory(slug: string): Category | undefined {
  return CATEGORIES.find((c) => c.slug === slug);
}

export function productsByCategory(slug: string): Product[] {
  return PRODUCTS.filter((p) => p.categorySlug === slug);
}

export function featuredProducts(): Product[] {
  return PRODUCTS.filter((p) => p.featured);
}

export function relatedProducts(product: Product, limit = 3): Product[] {
  return PRODUCTS.filter(
    (p) => p.categorySlug === product.categorySlug && p.sku !== product.sku,
  ).slice(0, limit);
}
