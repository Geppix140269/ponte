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
  hsOptional: (): ConfigField => ({
    name: "hs_code",
    label: "Your exposed HS code (optional)",
    type: "text",
    required: false,
    placeholder: "e.g. 2709",
  }),
  country: (label = "Country"): ConfigField => ({
    name: "country",
    label,
    type: "country",
    required: true,
  }),
  countryOptional: (label = "Target market (optional)"): ConfigField => ({
    name: "country",
    label,
    type: "country",
    required: false,
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
  textarea: (name: string, label: string, placeholder = ""): ConfigField => ({
    name,
    label,
    type: "textarea",
    required: false,
    placeholder,
  }),
};

// ---- Categories -----------------------------------------------------------
export const CATEGORIES: Category[] = [
  {
    slug: "market-reports",
    name: "Market Reports",
    description:
      "Full market intelligence reports built from verified trade data, curated by senior analysts.",
    order: 1,
  },
  {
    slug: "analysis",
    name: "Market Analysis",
    description:
      "Single-topic, single-product, single-country analyst briefs delivered as licensed PDFs.",
    order: 2,
  },
  {
    slug: "bundles",
    name: "Strategic Bundles",
    description:
      "Multi-module integrated narratives with executive summary, board-ready.",
    order: 3,
  },
  {
    slug: "geopolitical",
    name: "Geopolitical & Risk",
    description:
      "Chokepoint, sanctions, conflict-scenario and maritime exposure briefs for risk-aware buyers.",
    order: 4,
  },
  {
    slug: "country-tariff",
    name: "Country & Tariff",
    description:
      "Tariff and landed-cost strategic briefs with mitigation analysis.",
    order: 5,
  },
  {
    slug: "company-supplier",
    name: "Company & Supplier",
    description:
      "Counterparty intelligence: company deep-dives and verified buyer/supplier shortlists.",
    order: 6,
  },
  {
    slug: "custom-research",
    name: "Custom Research",
    description:
      "Bespoke, white-glove and institution-sponsored research engagements scoped on request.",
    order: 7,
  },
];

const USD = "USD";

// ---- Products -------------------------------------------------------------
// 17 active SKUs across three tiers (per dev brief v1).
// Static fallback for when Supabase is unconfigured or unavailable.
// The canonical catalogue lives in Supabase; see supabase/migrations/20260526_catalogue_restructure.sql.
export const PRODUCTS: Product[] = [
  // ============================================================ Tier A — Analyst Reports ($299-599, 48h)
  {
    sku: "MA-100",
    slug: "single-market-analysis-report",
    title: "Single Market Analysis Report",
    categorySlug: "analysis",
    band: "Tier A",
    shortDescription:
      "A focused, senior-analyst-curated market analysis on one topic of your choice, in one country, for one HS code.",
    fullDescription:
      "A single-topic market analysis curated by a senior sector analyst. Pick one of eleven topics for your product and target market. Delivered as a licensed PDF inside 48 hours.",
    includes: [
      "Senior analyst curation",
      "One topic, one product, one country",
      "Methodology appendix",
      "Source citations",
      "Single-organisation licence",
    ],
    priceCents: 29900,
    currency: USD,
    deliveryType: "48h",
    isSubscription: false,
    isConfigurable: true,
    featured: true,
    configFields: [
      {
        name: "topic",
        label: "Analysis topic",
        type: "select",
        required: true,
        options: [
          { value: "retail", label: "Retail landscape" },
          { value: "market-size", label: "Market size & demand" },
          { value: "consumer", label: "Consumer preferences" },
          { value: "sentiment", label: "Market sentiment" },
          { value: "seasonality", label: "Seasonal demand" },
          { value: "local-production", label: "Local production overview" },
          { value: "substitutes", label: "Substitutes & competitors" },
          { value: "swot", label: "SWOT analysis" },
          { value: "barriers", label: "Entry barriers" },
          { value: "packaging", label: "Packaging & labelling" },
          { value: "certifications", label: "Certifications & standards" },
        ],
      },
      f.hs(),
      f.country("Target market"),
    ],
  },
  {
    sku: "GR-002",
    slug: "sanctions-compliance-brief",
    title: "Sanctions & Compliance Brief",
    categorySlug: "geopolitical",
    band: "Tier A",
    shortDescription:
      "Sanctions screening, compliance exposure and mitigation analysis for a counterparty, jurisdiction, or trade lane.",
    fullDescription:
      "A senior-analyst brief on sanctions and compliance exposure: applicable sanctions regimes, designated entity overlap, secondary-sanctions risk, and a mitigation playbook. Cross-checked against OFAC, EU, UK and UN lists plus our 7B+ verified trade-record base.",
    includes: [
      "Sanctions screen across OFAC, EU, UK, UN",
      "Secondary-sanctions risk assessment",
      "Counterparty / jurisdiction view",
      "Mitigation playbook",
      "Single-organisation licence",
    ],
    priceCents: 34900,
    currency: USD,
    deliveryType: "48h",
    isSubscription: false,
    isConfigurable: true,
    configFields: [
      {
        name: "subject_type",
        label: "Subject",
        type: "select",
        required: true,
        options: [
          { value: "counterparty", label: "Counterparty" },
          { value: "jurisdiction", label: "Jurisdiction" },
          { value: "corridor", label: "Trade lane / corridor" },
        ],
      },
      {
        name: "subject",
        label: "Subject details",
        type: "text",
        required: true,
        placeholder: "e.g. Acme Trading FZE / Russia / Iran crude exports",
      },
    ],
  },
  {
    sku: "CT-002",
    slug: "tariff-landed-cost-brief",
    title: "Tariff & Landed Cost Strategic Brief",
    categorySlug: "country-tariff",
    band: "Tier A",
    shortDescription:
      "Landed-cost breakdown plus tariff exposure and mitigation analysis for a chosen product and corridor.",
    fullDescription:
      "A senior-analyst brief covering tariff classification, current and announced duty rates, landed-cost build-up, and mitigation options (FTA routing, classification review, valuation strategy). Includes a mitigation matrix with quantified savings ranges.",
    includes: [
      "Tariff classification check",
      "Landed-cost build-up",
      "FTA / preferential routing options",
      "Mitigation matrix with savings ranges",
      "Single-organisation licence",
    ],
    priceCents: 29900,
    currency: USD,
    deliveryType: "48h",
    isSubscription: false,
    isConfigurable: true,
    configFields: [f.hs(), f.origin(), f.destination()],
  },
  {
    sku: "MR-004",
    slug: "trade-corridor-report",
    title: "Trade Corridor Report",
    categorySlug: "market-reports",
    band: "Tier A",
    shortDescription:
      "Product flow report for a specific origin to destination corridor: volumes, values, seasonality, named shippers.",
    fullDescription:
      "An origin-to-destination corridor report for one product: volumes, values, seasonality, key shippers, route dynamics, and competitive flow analysis. Cross-checked against UN Comtrade, Eurostat and EU Taxud data.",
    includes: [
      "Corridor volumes and values",
      "Seasonality patterns",
      "Named shippers and routes",
      "Methodology appendix",
      "Single-organisation licence",
    ],
    priceCents: 39900,
    currency: USD,
    deliveryType: "48h",
    isSubscription: false,
    isConfigurable: true,
    configFields: [f.hs(), f.origin(), f.destination()],
  },
  {
    sku: "CI-003",
    slug: "buyer-supplier-intelligence",
    title: "Buyer/Supplier Intelligence",
    categorySlug: "company-supplier",
    band: "Tier A",
    shortDescription:
      "Ranked, contactable shortlist of qualified buyers or suppliers for your HS code with verified trade-partner contacts.",
    fullDescription:
      "A senior-analyst-curated shortlist of qualified buyers or suppliers for your HS code: trade volumes, ranked match score, verified contact details, and known counterparty risk flags.",
    includes: [
      "Top-25 ranked shortlist",
      "Verified contact details",
      "Trade volumes per counterparty",
      "Counterparty risk flags",
      "Single-organisation licence",
    ],
    priceCents: 39900,
    currency: USD,
    deliveryType: "48h",
    isSubscription: false,
    isConfigurable: true,
    configFields: [
      {
        name: "role",
        label: "I am looking for",
        type: "select",
        required: true,
        options: [
          { value: "buyers", label: "Buyers" },
          { value: "suppliers", label: "Suppliers" },
        ],
      },
      f.hs(),
      f.countryOptional(),
    ],
  },
  {
    sku: "VM-001",
    slug: "vessels-maritime-exposure",
    title: "Vessels & Maritime Exposure Brief",
    categorySlug: "geopolitical",
    band: "Tier A",
    shortDescription:
      "Maritime exposure brief for a counterparty, vessel, fleet, or trade lane: ownership, port calls, AIS gaps, and sanctions touchpoints.",
    fullDescription:
      "A senior-analyst brief on maritime exposure: beneficial ownership, port-call history, AIS gap and dark-fleet flags, ship-to-ship transfer indicators, flag-of-convenience patterns, and sanctions-list touchpoints. Includes a counterparty risk verdict.",
    includes: [
      "Beneficial ownership trace",
      "Port-call history",
      "AIS gap / dark-fleet flags",
      "Sanctions-list touchpoints",
      "Counterparty risk verdict",
    ],
    priceCents: 44900,
    currency: USD,
    deliveryType: "48h",
    isSubscription: false,
    isConfigurable: true,
    featured: true,
    configFields: [
      {
        name: "subject_type",
        label: "Subject",
        type: "select",
        required: true,
        options: [
          { value: "vessel", label: "Single vessel (IMO)" },
          { value: "fleet", label: "Fleet / operator" },
          { value: "counterparty", label: "Counterparty" },
          { value: "corridor", label: "Trade lane / corridor" },
        ],
      },
      {
        name: "subject",
        label: "Subject details (IMO, company, route)",
        type: "text",
        required: true,
        placeholder: "e.g. IMO 9876543 / Acme Shipping / Hormuz crude exports",
      },
    ],
  },
  {
    sku: "GR-001",
    slug: "geopolitical-scenario-brief",
    title: "Geopolitical Scenario Brief",
    categorySlug: "geopolitical",
    band: "Tier A",
    shortDescription:
      "Scenario analysis for a named chokepoint or conflict zone with quantified trade exposure and a mitigation playbook.",
    fullDescription:
      "A senior-analyst scenario brief for a named geopolitical event or chokepoint: trade flows at risk, exposed sectors and corridors, plausible escalation paths, and a mitigation playbook.",
    includes: [
      "Named chokepoint / scenario analysis",
      "Trade flows at risk",
      "Plausible escalation paths",
      "Mitigation playbook",
      "Single-organisation licence",
    ],
    priceCents: 49900,
    currency: USD,
    deliveryType: "48h",
    isSubscription: false,
    isConfigurable: true,
    featured: true,
    configFields: [
      {
        name: "scenario",
        label: "Scenario",
        type: "select",
        required: true,
        options: [
          { value: "hormuz", label: "Strait of Hormuz" },
          { value: "suez", label: "Suez Canal" },
          { value: "red-sea", label: "Red Sea / Bab el-Mandeb" },
          { value: "taiwan", label: "Taiwan Strait" },
          { value: "panama", label: "Panama Canal" },
          { value: "russia-ukraine", label: "Russia / Ukraine corridors" },
          { value: "custom", label: "Other (specify in notes)" },
        ],
      },
      f.hsOptional(),
      f.textarea(
        "notes",
        "Other / specific concern",
        "Describe the exposure or scenario you need analysed",
      ),
    ],
  },
  {
    sku: "CI-001",
    slug: "company-deep-dive",
    title: "Company Deep-Dive",
    categorySlug: "company-supplier",
    band: "Tier A",
    shortDescription:
      "Full corporate intelligence dossier: registry data, beneficial ownership, trade footprint, sanctions and adverse-media screening.",
    fullDescription:
      "A senior-analyst dossier on a single legal entity: corporate registry data, beneficial ownership, group structure, full trade footprint (imports and exports by corridor and HS code), sanctions and adverse-media screening, and a counterparty risk verdict.",
    includes: [
      "Corporate registry data",
      "Beneficial ownership and group structure",
      "Full import / export footprint",
      "Sanctions + adverse-media screening",
      "Counterparty risk verdict",
    ],
    priceCents: 49900,
    currency: USD,
    deliveryType: "48h",
    isSubscription: false,
    isConfigurable: true,
    configFields: [f.company(), f.country("Country of incorporation")],
  },
  {
    sku: "MR-001",
    slug: "single-country-market-report",
    title: "Single Country Market Report",
    categorySlug: "market-reports",
    band: "Tier A",
    shortDescription:
      "Full market report for any HS code in a single target country.",
    fullDescription:
      "A complete market intelligence report for one product (by HS code) in one country: demand, imports, key partners, pricing, and competitive landscape. Curated by a senior analyst, cross-checked against multiple official sources, signed off before delivery.",
    includes: [
      "Demand and import analysis",
      "Pricing and competitive landscape",
      "Key trade partners",
      "Methodology appendix",
      "Single-organisation licence",
    ],
    priceCents: 59900,
    currency: USD,
    deliveryType: "48h",
    isSubscription: false,
    isConfigurable: true,
    featured: true,
    configFields: [f.hs(), f.country("Target country")],
  },

  // ============================================================ Tier B — Strategic Bundles ($1,099-1,999, 72-96h)
  {
    sku: "BU-001",
    slug: "market-entry-strategy",
    title: "Market Entry Strategy",
    categorySlug: "bundles",
    band: "Tier B",
    shortDescription:
      "Integrated market-entry strategy for a single country: sizing, demand, competition, barriers, packaging, certification, go-to-market.",
    fullDescription:
      "A senior-analyst integrated narrative for one product entering one country: market sizing and demand, competitive landscape, entry barriers, packaging and labelling, certifications, tariff and landed cost, and a go-to-market sequence with named partners. Board-ready.",
    includes: [
      "Market sizing and demand",
      "Competitive landscape",
      "Entry barriers and certifications",
      "Packaging, labelling, tariffs",
      "Go-to-market sequence with named partners",
      "Executive summary",
    ],
    priceCents: 109900,
    currency: USD,
    deliveryType: "72h",
    isSubscription: false,
    isConfigurable: true,
    featured: true,
    configFields: [f.hs(), f.country("Target country")],
  },
  {
    sku: "MR-002",
    slug: "global-market-strategy",
    title: "Global Market Strategy",
    categorySlug: "bundles",
    band: "Tier B",
    shortDescription:
      "Integrated global strategy for one product across all relevant markets: corridor prioritisation and ranked rollout plan.",
    fullDescription:
      "A senior-analyst global strategy for one product: global demand and growth, top-priority markets ranked by opportunity and entry difficulty, comparative entry analysis across the top 5, corridor-level pricing, and a ranked rollout plan with year-1 to year-3 sequencing. Board-ready.",
    includes: [
      "Global demand and growth",
      "Top-priority markets ranked",
      "Comparative entry analysis (top 5)",
      "Corridor-level pricing",
      "Year 1 to year 3 rollout plan",
    ],
    priceCents: 159900,
    currency: USD,
    deliveryType: "96h",
    isSubscription: false,
    isConfigurable: true,
    configFields: [f.hs()],
  },
  {
    sku: "BU-100",
    slug: "geopolitical-resilience-pack",
    title: "Geopolitical Resilience Pack",
    categorySlug: "bundles",
    band: "Tier B",
    shortDescription:
      "Integrated resilience analysis across your top exposed chokepoints, sanctions regimes, and counterparties.",
    fullDescription:
      "A board-ready resilience pack for executives carrying geopolitical exposure. Combines three Geopolitical Scenario Briefs, one Sanctions & Compliance Brief, one Vessels & Maritime Exposure Brief, and an integrated executive summary with a sequenced mitigation plan.",
    includes: [
      "Three Geopolitical Scenario Briefs",
      "One Sanctions & Compliance Brief",
      "One Vessels & Maritime Exposure Brief",
      "Integrated executive summary",
      "Sequenced mitigation plan",
    ],
    priceCents: 179900,
    currency: USD,
    deliveryType: "96h",
    isSubscription: false,
    isConfigurable: true,
    featured: true,
    configFields: [
      f.textarea(
        "scenarios",
        "Top three exposures (chokepoints, sanctions regimes, regions)",
        "e.g. Hormuz, Russia sanctions, Taiwan Strait",
      ),
      {
        name: "counterparty",
        label: "Key counterparty for vessel/maritime brief (optional)",
        type: "text",
        required: false,
        placeholder: "Legal entity name",
      },
    ],
  },
  {
    sku: "BU-005",
    slug: "full-market-intelligence",
    title: "Full Market Intelligence",
    categorySlug: "bundles",
    band: "Tier B",
    shortDescription:
      "The full intelligence stack for one product in one country: all 11 analysis modules plus the single-country market report.",
    fullDescription:
      "Our most comprehensive single-country product. Covers all 11 analysis modules (retail, market size, consumer preferences, sentiment, seasonality, local production, substitutes, SWOT, entry barriers, packaging, certifications) plus the full Single Country Market Report, integrated into one board-ready narrative.",
    includes: [
      "All 11 market-analysis modules",
      "Single Country Market Report",
      "Integrated executive summary",
      "Methodology appendix",
      "Board-ready format",
    ],
    priceCents: 199900,
    currency: USD,
    deliveryType: "96h",
    isSubscription: false,
    isConfigurable: true,
    configFields: [f.hs(), f.country("Target country")],
  },

  // ============================================================ Tier C — White-glove / Custom (POA)
  {
    sku: "CR-001",
    slug: "custom-research-brief",
    title: "Custom Research Brief",
    categorySlug: "custom-research",
    band: "Tier C",
    shortDescription:
      "Bespoke research brief scoped to your specific question. Manual quote inside 48 hours.",
    fullDescription:
      "A bespoke senior-analyst brief scoped to your question. You tell us the decision you are trying to make, we scope the deliverable, the timeline, and the price inside 48 hours. Typical engagements: $2,999 to $9,999.",
    includes: [
      "Scoped to your specific question",
      "Manual quote inside 48 hours",
      "Senior-analyst delivery",
      "Methodology and citations",
      "Single-organisation licence",
    ],
    priceCents: 299900,
    priceFrom: true,
    currency: USD,
    deliveryType: "custom",
    isSubscription: false,
    isConfigurable: true,
    configFields: [
      f.textarea(
        "brief",
        "Research brief",
        "Describe the decision you are trying to make and what intelligence you need",
      ),
    ],
  },
  {
    sku: "CR-002",
    slug: "market-entry-consulting",
    title: "Market Entry Consulting Engagement",
    categorySlug: "custom-research",
    band: "Tier C",
    shortDescription:
      "Multi-week, multi-deliverable market-entry consulting engagement with named senior partner.",
    fullDescription:
      "A multi-week consulting engagement led by a named senior partner: discovery and scoping, market analysis, entry strategy, partner identification, regulatory readiness, and a sequenced go-to-market plan. Typical engagement: 4 to 8 weeks, $4,999 to $24,999.",
    includes: [
      "Named senior partner",
      "Discovery and scoping",
      "Market analysis and entry strategy",
      "Partner identification",
      "Regulatory readiness",
      "Sequenced GTM plan",
    ],
    priceCents: 499900,
    priceFrom: true,
    currency: USD,
    deliveryType: "custom",
    isSubscription: false,
    isConfigurable: true,
    configFields: [
      f.textarea(
        "brief",
        "Engagement scope",
        "Describe the market, the product, and the decision you need to make",
      ),
    ],
  },
  {
    sku: "CR-003",
    slug: "sector-quarterly-outlook",
    title: "Sector Quarterly Outlook",
    categorySlug: "custom-research",
    band: "Tier C",
    shortDescription:
      "Annual subscription: four quarterly sector outlooks for chambers, EPAs, and trade bodies, co-branding available.",
    fullDescription:
      "An annual programme of four quarterly sector outlooks (45-90 pages each) for chambers of commerce, export promotion agencies, and trade bodies. Each outlook covers global demand, top corridors, named opportunities, regulatory shifts, and member-relevant alerts. Co-branding and member distribution licence included.",
    includes: [
      "Four quarterly outlooks per year",
      "45-90 pages each",
      "Co-branded with your organisation",
      "Member distribution licence",
      "Named-sector focus",
    ],
    priceCents: 600000,
    priceFrom: true,
    priceSuffix: "/yr",
    currency: USD,
    deliveryType: "custom",
    isSubscription: false,
    isConfigurable: false,
  },
  {
    sku: "CR-004",
    slug: "sponsored-reports",
    title: "Sponsored Reports",
    categorySlug: "custom-research",
    band: "Tier C",
    shortDescription:
      "Institution-sponsored research reports: thought-leadership PDFs co-branded with your organisation.",
    fullDescription:
      "A sponsored research engagement for institutions: banks, law firms, consultancies, trade bodies, and government agencies. We co-design a thought-leadership report under joint branding, deliver it as a licensed PDF, and support distribution to your audience. Engagement scoped on request.",
    includes: [
      "Co-designed scope",
      "Joint branding",
      "Licensed PDF delivery",
      "Distribution support",
      "Scoped on request",
    ],
    priceCents: 0,
    altPrice: "POA",
    currency: USD,
    deliveryType: "custom",
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
