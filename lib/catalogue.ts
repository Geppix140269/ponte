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
// 13 active SKUs across three tiers (Wave 4 restructure, 2026-05-27).
// Static fallback for when Supabase is unconfigured or unavailable.
// The canonical catalogue lives in Supabase; see supabase/migrations/20260527_wave4_catalogue.sql.
export const PRODUCTS: Product[] = [
  // ============================================================ Tier A — Analyst Extracts ($299-499, 48h)
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
      "Counterparty sanctions screening across OFAC, EU, UK and UN sanctions lists, with senior-analyst risk commentary.",
    fullDescription:
      "A senior-analyst brief built on ADAMftd's sanctions-screening data. We run your named counterparty (or vessel, port, jurisdiction) against OFAC, EU, UK and UN sanctions lists, then a senior analyst writes the risk commentary: applicable sanctions regimes, secondary-sanctions exposure, designated-entity overlap, and a mitigation playbook.",
    includes: [
      "Sanctions screen across OFAC, EU, UK, UN",
      "Secondary-sanctions exposure analysis",
      "Designated-entity overlap check",
      "Senior-analyst risk commentary",
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
    band: "Tier B",
    shortDescription:
      "Ranked, contactable shortlist of qualified buyers or suppliers for your HS code. Choose your pack: Top 50 ($2,000), Top 100 ($3,000), Top 200 ($5,000), or Top 500 ($11,000).",
    fullDescription:
      "A senior-analyst-curated shortlist of qualified buyers or suppliers for your HS code, sourced from ADAMftd trade data: trade volumes, ranked match score, verified contact details, and known counterparty risk flags. Available in packs of 50, 100, 200 or 500 counterparties.",
    includes: [
      "Ranked counterparty shortlist (50 / 100 / 200 / 500 pack)",
      "Verified contact details per counterparty",
      "Trade volumes and match score",
      "Counterparty risk flags",
      "Single-organisation licence",
    ],
    priceCents: 200000,
    priceFrom: true,
    currency: USD,
    priceTiers: {
      field: "pack_size",
      tiers: [
        { value: "50", label: "Top 50", priceCents: 200000 },
        { value: "100", label: "Top 100", priceCents: 300000 },
        { value: "200", label: "Top 200", priceCents: 500000 },
        { value: "500", label: "Top 500", priceCents: 1100000 },
      ],
    },
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
      {
        name: "pack_size",
        label: "Pack size",
        type: "select",
        required: true,
        options: [
          { value: "50", label: "Top 50 — $2,000" },
          { value: "100", label: "Top 100 — $3,000" },
          { value: "200", label: "Top 200 — $5,000" },
          { value: "500", label: "Top 500 — $11,000" },
        ],
      },
      f.hs(),
      f.countryOptional(),
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
  // ============================================================ Tier B — Strategic Reports ($1,099-1,799, 72-96h)
  {
    sku: "MR-001",
    slug: "single-country-market-report",
    title: "Single Country Market Report",
    categorySlug: "market-reports",
    band: "Tier B",
    shortDescription:
      "Full ADAMftd-powered single-country market report, senior-analyst integrated, board-ready.",
    fullDescription:
      "A complete 40+ page market intelligence report for one product (by HS code) in one country, with senior-analyst executive summary integrating market structure, supplier landscape, demand, pricing, regulatory and risk into a board-ready narrative.",
    includes: [
      "Full ADAMftd Market Research Report (21 sections)",
      "Senior-analyst executive summary",
      "Market structure and supplier landscape",
      "Demand, pricing and competitive landscape",
      "Regulatory and risk overview",
      "Single-organisation licence",
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
    sku: "BU-001",
    slug: "market-entry-strategy",
    title: "Market Entry Strategy",
    categorySlug: "bundles",
    band: "Tier B",
    shortDescription:
      "Integrated single-country market entry strategy: Country MR + tariff calc + sales strategy + named partners.",
    fullDescription:
      "A senior-analyst-integrated narrative for one product entering one country. Combines the Single Country Market Report, a Tariff & Landed Cost calculation, the Accessing the Market sales strategy section, and a shortlist of named potential partners. Board-ready.",
    includes: [
      "Single Country Market Report (full ADAMftd MR)",
      "Tariff & landed cost calculation",
      "Accessing the market — sales strategy section",
      "Named potential partner shortlist",
      "Integrated executive summary",
      "Single-organisation licence",
    ],
    priceCents: 179900,
    currency: USD,
    deliveryType: "96h",
    isSubscription: false,
    isConfigurable: true,
    featured: true,
    configFields: [f.hs(), f.country("Target country")],
  },
  {
    sku: "MR-002",
    slug: "multi-country-comparative-strategy",
    title: "Multi-Country Comparative Strategy",
    categorySlug: "bundles",
    band: "Tier B",
    shortDescription:
      "Comparative entry-readiness analysis across 3-5 target countries for one product. Ranked recommendation.",
    fullDescription:
      "A senior-analyst comparative report covering 3-5 target countries for one product. Each country gets the relevant ADAMftd MR sections (market size, demand, competition, tariffs, regulatory), then we rank them on entry difficulty, market opportunity and corridor pricing. Concludes with a ranked entry recommendation. Board-ready.",
    includes: [
      "ADAMftd MR sections for each target country",
      "Market size, demand and competition per country",
      "Tariff and regulatory comparison",
      "Entry-readiness ranking across all countries",
      "Ranked entry recommendation",
      "Single-organisation licence",
    ],
    priceCents: 159900,
    currency: USD,
    deliveryType: "96h",
    isSubscription: false,
    isConfigurable: true,
    configFields: [
      f.hs(),
      {
        name: "countries",
        label: "3-5 target countries (comma-separated)",
        type: "textarea",
        required: true,
        placeholder: "e.g. Germany, France, Italy, Spain, Poland",
      },
    ],
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
