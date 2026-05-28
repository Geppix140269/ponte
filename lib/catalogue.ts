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
      "One question, one market: get a senior-analyst answer on a single dimension of your target country.",
    fullDescription:
      "You've got the country and the product. You need to understand one specific dimension before you commit. Pick from eleven topics — retail landscape, demand, consumer preferences, certifications, entry barriers, and seven more. A senior analyst delivers a focused brief on that single dimension for your HS code and target country. One PDF in 48 hours.",
    includes: [
      "Analyst-written brief on your selected topic",
      "Data-backed findings with full source citations",
      "Methodology appendix",
      "Single-organisation licensed PDF",
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
      "Can you legally trade with this counterparty? OFAC, EU, UK, UN screening with senior-analyst commentary.",
    fullDescription:
      "Before you ship — or before you sign — confirm that your counterparty (or jurisdiction, or corridor) is clear. We screen against OFAC, EU, UK and UN sanctions lists, then a senior analyst writes the risk commentary: applicable sanctions regimes, secondary-sanctions exposure, designated-entity overlap, and what to do about it.",
    includes: [
      "Sanctions screen across OFAC, EU, UK and UN lists",
      "Secondary-sanctions exposure analysis",
      "Designated-entity overlap check",
      "Senior-analyst risk commentary",
      "Mitigation playbook",
      "Single-organisation licensed PDF",
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
      "Will this product be profitable after duty? Your landed cost — and the cheapest legal route in.",
    fullDescription:
      "Pick one HS code and one origin-destination corridor. A senior trade-customs analyst delivers a licensed PDF covering HS classification, MFN rate, FTA preferential rate with origin-rule analysis, ADD/CVD/safeguard exposure, full landed-cost build-up, and a mitigation matrix with quantified savings ranges. One defensible number. One playbook for how to bring it down.",
    includes: [
      "HS classification check",
      "Duty rate landscape: MFN, FTA, ADD, CVD, Section 301",
      "Landed-cost build-up: duty + VAT + fees + freight",
      "Mitigation matrix with quantified savings ranges",
      "Forward-planning commentary on announced rate changes",
      "Single-organisation licensed PDF",
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
      "What's actually flowing on this corridor? Volumes, prices, operators, ports — for one HS code.",
    fullDescription:
      "You're pricing a lane, scouting competitors on a corridor, or underwriting trade finance against a route. MR-004 maps the corridor for one HS code: 5-year volume and value trend, unit prices CIF/FOB, top shipping operators, leading ports of loading and discharge, seasonal flow patterns. Cross-checked against UN Comtrade, Eurostat and EU Taxud.",
    includes: [
      "5-year corridor volume and value trend",
      "Unit price analysis (CIF, FOB where derivable)",
      "Top shipping operators and routes",
      "Leading ports of loading and discharge",
      "Seasonal flow patterns",
      "Single-organisation licensed PDF",
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
      "Who should you sell to — or source from? Ranked, contactable shortlist for your HS code.",
    fullDescription:
      "You're entering a new market and need buyers, or you're diversifying sourcing and need suppliers. A senior analyst curates a ranked shortlist for your HS code from transaction-level customs data: company names, countries, estimated annual volumes, verified contact details (Top 100+), and counterparty risk flags. Choose your pack size: Top 50 ($2,000), Top 100 ($3,000), Top 200 ($5,000), or Top 500 ($11,000).",
    includes: [
      "Ranked counterparty shortlist by trade volume",
      "Company name, country, estimated annual volumes",
      "Verified contact details where available (Top 100+)",
      "Counterparty sanctions risk flags",
      "Methodology and full source citations",
      "Single-organisation licensed PDF",
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
      "What's your exposure if Hormuz closes? Scenario analysis, quantified, with a mitigation playbook.",
    fullDescription:
      "Before the next chokepoint event, know your exposure. Pick a scenario — Hormuz, Suez, Red Sea, Taiwan, Panama, Russia/Ukraine corridors, or specify your own. A senior analyst models trade flows at risk, plausible escalation paths, exposed sectors and corridors, and a mitigation playbook for your specific HS-code exposure.",
    includes: [
      "Named chokepoint or scenario analysis",
      "Trade flows at risk: base, moderate, severe cases",
      "Plausible escalation paths",
      "Sector and corridor exposure mapping",
      "Mitigation playbook",
      "Single-organisation licensed PDF",
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
      "Should you enter this country with this product? One 40+ page board-ready answer.",
    fullDescription:
      "You've shortlisted a country. Now you need to commit — or walk away. MR-001 gives you the integrated read. Pick one HS code and one country; a senior analyst produces a 40+ page board-ready narrative covering market structure, supplier landscape, demand, pricing, regulatory environment, and risk. One PDF. One decision.",
    includes: [
      "Market structure and competitive landscape",
      "Demand and import analysis",
      "Supplier landscape with named players",
      "Pricing and unit-value benchmarks",
      "Regulatory environment and risk overview",
      "Senior-analyst executive summary integrating all of the above",
      "40+ page licensed PDF, single-organisation licence",
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
      "Not just the market read — the go-to-market plan, with named partners. Top of Tier B.",
    fullDescription:
      "MR-001 tells you whether to enter. BU-001 tells you how. Pick one HS code and one country; a senior analyst integrates the full Country Market Report with a Tariff & Landed Cost calculation, the Accessing-the-Market sales-strategy section, and a shortlist of named potential partners. One board-ready playbook covering the market, the cost base, the route to market, and who to talk to.",
    includes: [
      "Full Single Country Market Report",
      "Tariff & landed cost calculation",
      "Accessing-the-market: sales strategy section",
      "Named potential partner shortlist",
      "Integrated executive summary",
      "Single-organisation licensed PDF",
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
      "Three to five candidate countries. One product. One ranked entry recommendation.",
    fullDescription:
      "You've narrowed the field to 3-5 target countries for one product but you don't know which to pick. MR-002 puts them side by side: market size, demand, competition, tariffs, and regulatory environment per country, then ranks them on entry difficulty and opportunity. Closes with a ranked recommendation. The board-ready briefing for the country-selection decision.",
    includes: [
      "Per-country market size and demand analysis",
      "Tariff and regulatory comparison matrix",
      "Competitive landscape per country",
      "Entry-readiness ranking across all countries",
      "Ranked entry recommendation with rationale",
      "Single-organisation licensed PDF",
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
      "Your question doesn't fit a standard SKU? Tell us the decision; we scope it within 48 hours.",
    fullDescription:
      "Some questions don't fit a product page. Tell us the decision you're trying to make and we'll come back inside 48 hours with a scoped brief — deliverables, timeline, price. Typical engagements run $2,999 to $9,999. Once you approve, a senior analyst produces a bespoke licensed PDF answering exactly your question.",
    includes: [
      "Scoped to your specific question",
      "Quote inside 48 hours",
      "Bespoke senior-analyst delivery",
      "Methodology and full source citations",
      "Single-organisation licensed PDF",
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
      "Multi-week, multi-deliverable consulting engagement led by a named senior partner.",
    fullDescription:
      "When a single brief isn't enough — when you need scoping, market analysis, partner identification, regulatory readiness, and a sequenced go-to-market plan delivered over weeks, not days — CR-002 is the engagement. A named senior partner leads a 4-8 week programme with weekly check-ins. Typical engagements $4,999 to $24,999.",
    includes: [
      "Named senior partner leading the engagement",
      "Discovery and scoping phase",
      "Market analysis and entry strategy",
      "Partner identification and outreach",
      "Regulatory readiness assessment",
      "Sequenced go-to-market plan",
      "Weekly check-ins",
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
      "Annual programme of four quarterly sector outlooks for chambers, EPAs, and trade bodies. Co-branding available.",
    fullDescription:
      "Built for chambers of commerce, export promotion agencies, and trade bodies that need to brief members quarterly on sector trends. Four quarterly outlooks per year (45-90 pages each) covering global demand, top corridors, named opportunities, regulatory shifts, and member-relevant alerts. Co-branded with your organisation; full member distribution licence included.",
    includes: [
      "Four quarterly outlooks per year",
      "45-90 pages per quarter",
      "Co-branded with your organisation",
      "Member distribution licence",
      "Named-sector focus matched to your members",
      "Sector trends, risks, pricing and regulatory updates",
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
      "Institutional thought-leadership PDFs, co-designed and co-branded with your organisation.",
    fullDescription:
      "For banks, law firms, consultancies, trade bodies, and government agencies that want to publish a piece of thought leadership under joint branding. We co-design the scope, deliver the licensed PDF, and support distribution to your audience. Engagement scoped on request.",
    includes: [
      "Co-designed scope with your team",
      "Joint branding",
      "Senior-analyst research and curation",
      "Licensed PDF deliverable",
      "Distribution support to your audience",
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
