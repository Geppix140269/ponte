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
  {
    slug: "compliance-screening",
    name: "Screening & Compliance",
    description:
      "Multi-list sanctions screening, counterparty risk assessment and regulatory compliance briefs.",
    order: 8,
  },
  {
    slug: "tenders",
    name: "Tender Intelligence",
    description:
      "Government and institutional procurement alerts, one-off tender briefs and weekly digest subscriptions.",
    order: 9,
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
    priceCents: 19900,
    currency: USD,
    deliveryType: "48h",
    isSubscription: false,
    isConfigurable: true,
    cobrandable: true,
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
    cobrandable: true,
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
    slug: "tariff-landed-cost-analysis",
    title: "Tariff & Landed Cost Analysis",
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
    cobrandable: true,
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
    cobrandable: true,
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
    cobrandable: true,
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
  // ============================================================ Tier B — Strategic Reports
  {
    sku: "MR-001",
    slug: "single-country-market-report",
    title: "Single Country Market Report",
    categorySlug: "market-reports",
    band: "Tier B",
    shortDescription:
      "Should you enter this country with this product? One 40+ page board-ready analysis.",
    fullDescription:
      "You've shortlisted a country. Now you need to commit — or walk away. MR-001 gives you the integrated read. Pick one HS code and one country; a senior analyst produces a 40+ page board-ready analysis covering market structure, supplier landscape, demand, pricing, regulatory environment, and risk. One PDF. One decision.",
    includes: [
      "Market structure and competitive landscape",
      "Demand and import analysis",
      "Supplier landscape with named players",
      "Pricing and unit-value benchmarks",
      "Regulatory environment and risk overview",
      "Senior-analyst executive summary",
      "40+ page licensed PDF, single-organisation licence",
    ],
    priceCents: 109900,
    currency: USD,
    deliveryType: "72h",
    isSubscription: false,
    isConfigurable: true,
    cobrandable: true,
    featured: true,
    configFields: [f.hs(), f.country("Target country")],
  },
  {
    sku: "MR-002",
    slug: "multi-country-comparative-analysis",
    title: "Multi-Country Comparative Analysis",
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
    cobrandable: true,
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
    cobrandable: true,
  },  // ============================================================ Tier A — ADAMftd-powered (24-48h)
  {
    sku: "MA-200",
    slug: "ai-market-snapshot-report",
    title: "AI Market Snapshot Report",
    categorySlug: "analysis",
    band: "Tier A",
    shortDescription:
      "Complete 11-function market intelligence for one HS code and country — all topics in a single 24-hour brief.",
    fullDescription:
      "Powered by the ADAMftd grounded-AI engine and 7 billion+ verified trade records. MA-200 runs all eleven Market Analysis Suite functions in parallel: Retail Snapshot, Market Size, Consumer Preferences, Sentiment, Seasonal Demand, Local Production, Substitutes, SWOT, Entry Barriers, Packaging, and Quality & Certifications. Each finding is verified through a 4-source pull, conflict-detection and Monte Carlo resolution before a senior analyst signs off the final PDF. Faster, broader, and more affordable than ordering each topic individually.",
    includes: [
      "All 11 Market Analysis Suite dimensions",
      "Retail landscape and market size",
      "Consumer preferences and sentiment analysis",
      "Seasonal demand and local production overview",
      "Substitutes, SWOT and entry barriers",
      "Packaging, labelling and certification requirements",
      "ADAMftd 4-source verified findings with full citations",
      "Senior-analyst sign-off",
      "Single-organisation licensed PDF",
    ],
    priceCents: 29900,
    currency: USD,
    deliveryType: "24h",
    isSubscription: false,
    isConfigurable: true,
    cobrandable: true,
    featured: true,
    configFields: [f.hs(), f.country("Target market")],
  },
  {
    sku: "MA-300",
    slug: "complete-market-analysis-suite",
    title: "Complete Market Analysis Suite",
    categorySlug: "analysis",
    band: "Tier A",
    shortDescription:
      "The full picture: all 11 ADAMftd analysis modules plus a senior-analyst executive synthesis narrative.",
    fullDescription:
      "Everything in MA-200 plus an extended 20+ page executive narrative in which a senior analyst integrates all eleven findings into a coherent go/no-go assessment. The synthesis covers market opportunity sizing, competitive dynamics, regulatory runway and a recommended market-entry sequencing plan. The most complete single-country product analysis available before commissioning a full MR-001 engagement.",
    includes: [
      "All 11 Market Analysis Suite dimensions (see MA-200)",
      "Extended senior-analyst synthesis narrative (20+ pages)",
      "Go/no-go market opportunity assessment",
      "Competitive dynamics and regulatory runway",
      "Market-entry sequencing recommendations",
      "ADAMftd 4-source verified findings",
      "Single-organisation licensed PDF",
    ],
    priceCents: 89900,
    currency: USD,
    deliveryType: "48h",
    isSubscription: false,
    isConfigurable: true,
    cobrandable: true,
    featured: true,
    configFields: [f.hs(), f.country("Target market")],
  },
  {
    sku: "CT-001",
    slug: "country-trade-profile-report",
    title: "Country Trade Profile Report",
    categorySlug: "country-tariff",
    band: "Tier A",
    shortDescription:
      "14-dimension trade profile for any country — macro, trade flows, corridors, partners, and regulatory environment.",
    fullDescription:
      "Need to understand a country's trade architecture before deciding where to source or sell? CT-001 delivers a 14-dimension country profile powered by ADAMftd and 7B+ records: GDP and macro indicators, total import/export values, top trading partners, key corridors, leading HS chapters, tariff profile, customs environment, FTA membership, regulatory environment, logistics performance, and currency/payment risk. Optional HS focus for sector-specific depth.",
    includes: [
      "Macro overview: GDP, trade balance, growth trajectory",
      "Total import/export values and top partners",
      "Key trade corridors and leading HS chapters",
      "Tariff profile: MFN rates, FTA membership",
      "Customs environment and regulatory overview",
      "Logistics Performance Index and infrastructure notes",
      "Currency and payment risk flags",
      "ADAMftd verified data with full citations",
      "Single-organisation licensed PDF",
    ],
    priceCents: 24900,
    currency: USD,
    deliveryType: "24h",
    isSubscription: false,
    isConfigurable: true,
    cobrandable: true,
    configFields: [
      f.country("Country to profile"),
      f.hsOptional(),
    ],
  },
  {
    sku: "CT-003",
    slug: "fta-routing-analysis",
    title: "FTA Routing Analysis",
    categorySlug: "country-tariff",
    band: "Tier A",
    shortDescription:
      "Which routing saves the most duty? Origin-rules analysis across every applicable FTA for your HS code and corridor.",
    fullDescription:
      "You know your product. You know your destination. The question is whether an FTA applies — and whether your goods actually qualify under the rules of origin. CT-003 maps every FTA applicable to your origin-destination corridor, checks rules-of-origin qualification criteria for your HS code, quantifies the duty saving under each qualifying agreement, and flags the documentation you need. For complex multi-origin supply chains, we model alternative sourcing routings and their qualification risk.",
    includes: [
      "FTA landscape for your corridor: all applicable agreements",
      "Rules-of-origin qualification check per HS code",
      "Duty saving quantification under each qualifying FTA",
      "Documentation and certification requirements",
      "Alternative origin routing scenarios (where applicable)",
      "Senior-analyst commentary on qualification risk",
      "Single-organisation licensed PDF",
    ],
    priceCents: 49900,
    currency: USD,
    deliveryType: "48h",
    isSubscription: false,
    isConfigurable: true,
    cobrandable: true,
    configFields: [f.hs(), f.origin(), f.destination()],
  },
  {
    sku: "CS-002",
    slug: "trade-company-deep-profile",
    title: "Trade Company Deep Profile",
    categorySlug: "company-supplier",
    band: "Tier A",
    shortDescription:
      "Full intelligence profile on one trading company: volumes, partners, corridors, risk flags.",
    fullDescription:
      "Before you partner, source, or invest: know exactly who you are dealing with. CS-002 profiles one named trading entity using ADAMftd transaction-level customs data and open-source verification. We map their HS code activity, top trading partners, shipment volumes and values, key corridors, port patterns, and flag any sanctions, ownership, or reputational risk indicators. Faster and deeper than a Google search. Grounded in verified customs records.",
    includes: [
      "Company identity verification (registered name, country, aliases)",
      "HS code activity and product categories traded",
      "Top trading partners (buyers or suppliers) by volume",
      "Shipment volume and value trends",
      "Key corridors and port patterns",
      "Sanctions, PEP and ownership risk flags",
      "ADAMftd verified trade records with citations",
      "Single-organisation licensed PDF",
    ],
    priceCents: 34900,
    currency: USD,
    deliveryType: "24h",
    isSubscription: false,
    isConfigurable: true,
    cobrandable: true,
    configFields: [
      f.company(),
      {
        name: "company_country",
        label: "Company country (if known)",
        type: "country",
        required: false,
      },
      {
        name: "role",
        label: "Company role",
        type: "select",
        required: true,
        options: [
          { value: "supplier", label: "Supplier I am evaluating" },
          { value: "buyer", label: "Buyer / prospective customer" },
          { value: "counterparty", label: "Counterparty / partner" },
          { value: "competitor", label: "Competitor" },
        ],
      },
    ],
  },
  {
    sku: "GR-003",
    slug: "hormuz-oil-shock-scenario-report",
    title: "Hormuz Oil Shock Scenario Report",
    categorySlug: "geopolitical",
    band: "Tier A",
    shortDescription:
      "World-exclusive HS-6 oil shock modelling: four escalation scenarios, quantified supply disruption, sector-by-sector impact.",
    fullDescription:
      "The only report in the world that models Hormuz disruption at HS-6 level. Using Ponte's proprietary Hormuz Simulator, we quantify trade-flow disruption, oil price trajectories and sector-by-sector downstream impact across four escalation scenarios: (1) blockade threat only — market fear premium, (2) partial closure — 30-day disruption, (3) full closure — 90-day sustained, (4) military escalation — extended six-month scenario. For each scenario: which HS codes are most exposed, how prices move, which corridors reroute and to where, and your specific exposure by HS code if provided. No other research house publishes this.",
    includes: [
      "Hormuz Simulator: 4-scenario quantified disruption model",
      "HS-6 trade flow exposure per scenario",
      "Oil price and energy input cost trajectories",
      "Sector-by-sector downstream impact analysis",
      "Corridor rerouting patterns: alternative lanes and ports",
      "Your specific HS code exposure (if provided)",
      "Mitigation and hedging playbook",
      "Single-organisation licensed PDF",
    ],
    priceCents: 59900,
    currency: USD,
    deliveryType: "24h",
    isSubscription: false,
    isConfigurable: true,
    cobrandable: true,
    featured: true,
    configFields: [
      {
        name: "scenarios",
        label: "Scenarios to model",
        type: "select",
        required: true,
        options: [
          { value: "all", label: "All four scenarios (recommended)" },
          { value: "threat-only", label: "Scenario 1: Blockade threat" },
          { value: "partial", label: "Scenario 2: Partial 30-day closure" },
          { value: "full", label: "Scenario 3: Full 90-day closure" },
          { value: "military", label: "Scenario 4: Military escalation" },
        ],
      },
      f.hsOptional(),
    ],
  },
  {
    sku: "GR-004",
    slug: "supply-chain-risk-assessment",
    title: "Supply Chain Risk Assessment",
    categorySlug: "geopolitical",
    band: "Tier B",
    shortDescription:
      "End-to-end supply chain risk map for one product: chokepoints, supplier concentration, geopolitical exposure and mitigation.",
    fullDescription:
      "Your supply chain has exposures you may not have mapped. GR-004 takes one HS code and constructs a full risk register: top sourcing countries and their geopolitical risk ratings, chokepoint dependency by corridor, single-country concentration risk, tariff escalation exposure, logistics disruption scenarios, and a weighted risk matrix. Closes with a prioritised mitigation roadmap: diversification options, alternative corridors, buffer stock recommendations, and hedging levers. Delivered in five working days by a senior analyst.",
    includes: [
      "Top sourcing countries with geopolitical risk ratings",
      "Chokepoint dependency mapping by corridor",
      "Single-country / single-supplier concentration risk",
      "Tariff and sanctions escalation exposure",
      "Logistics disruption scenario modelling",
      "Weighted risk matrix with severity × likelihood",
      "Prioritised mitigation roadmap",
      "Single-organisation licensed PDF",
    ],
    priceCents: 89900,
    currency: USD,
    deliveryType: "custom",
    isSubscription: false,
    isConfigurable: true,
    cobrandable: true,
    configFields: [
      f.hs(),
      f.textarea(
        "supply_chain_notes",
        "Key suppliers or source countries (optional)",
        "Name your main suppliers or sourcing countries if you want us to focus the risk assessment",
      ),
    ],
  },
  {
    sku: "CP-001",
    slug: "counterparty-screening-package",
    title: "Counterparty Screening Package",
    categorySlug: "compliance-screening",
    band: "Tier A",
    shortDescription:
      "Bulk sanctions and risk screening for up to 25 counterparties. OFAC, EU, UK and UN lists. 24-hour delivery.",
    fullDescription:
      "Onboarding a new roster of suppliers, partners or distributors? CP-001 screens up to 25 named entities in a single engagement. Each entity is checked against OFAC, EU, UK and UN sanctions lists, beneficial-ownership databases, PEP lists, and open-source adverse-media sources. Delivered as a batch PDF report with individual entity cards — red/amber/green classification, risk notes, and flagged issues. Faster and more cost-effective than screening one by one with GR-002.",
    includes: [
      "Up to 25 named entities screened",
      "OFAC, EU, UK and UN sanctions list checks",
      "Beneficial ownership and PEP screening",
      "Adverse media and open-source check",
      "Individual entity cards: RAG classification + risk notes",
      "Batch summary PDF",
      "Single-organisation licensed PDF",
    ],
    priceCents: 19900,
    currency: USD,
    deliveryType: "24h",
    isSubscription: false,
    isConfigurable: true,
    cobrandable: true,
    configFields: [
      {
        name: "entities",
        label: "Entities to screen (up to 25)",
        type: "textarea",
        required: true,
        placeholder: "One entity name per line. Include country if known.",
      },
    ],
  },
  {
    sku: "TI-001",
    slug: "government-tender-intelligence-brief",
    title: "Government Tender Intelligence Brief",
    categorySlug: "tenders",
    band: "Tier A",
    shortDescription:
      "Active government tenders for your HS code and target markets — curated, assessed and ready to respond to.",
    fullDescription:
      "Governments and institutions publish tens of thousands of procurement notices globally. Most are invisible to exporters without dedicated monitoring. TI-001 searches 190+ countries' public procurement portals for active tenders matching your HS code and target markets, assesses each for fit and bid likelihood, and delivers a curated shortlist with full tender details, submission requirements and deadlines. Ideal for exporters, chambers, and trade advisers managing client pipelines.",
    includes: [
      "Active tenders matched to your HS code and target markets",
      "Tender details: contracting authority, value, deadline, specs",
      "Fit and bid-likelihood assessment per tender",
      "Submission requirements and contact points",
      "190+ country procurement portal coverage",
      "Single-organisation licensed PDF",
    ],
    priceCents: 39900,
    currency: USD,
    deliveryType: "48h",
    isSubscription: false,
    isConfigurable: true,
    cobrandable: true,
    configFields: [
      f.hs(),
      {
        name: "target_markets",
        label: "Target markets",
        type: "textarea",
        required: true,
        placeholder: "List the countries or regions you want tenders from, e.g. GCC, West Africa, Germany",
      },
    ],
  },
  {
    sku: "TI-002",
    slug: "weekly-tender-digest",
    title: "Weekly Tender Digest",
    categorySlug: "tenders",
    band: "Tier A",
    shortDescription:
      "Weekly curated tender alerts by HS code and sector. Never miss a procurement opportunity again.",
    fullDescription:
      "A weekly email digest of new government and institutional tenders matched to your HS codes and target markets. Each digest includes: contracting authority, tender value, deadline, brief specification summary, and a direct link to the source notice. Fully curated by our tender intelligence team — no noise, no auto-generated spam. Monthly subscription, cancel any time. Covers 190+ countries.",
    includes: [
      "Weekly email digest every Monday",
      "New tenders matched to your specified HS codes",
      "Contracting authority, value and deadline per tender",
      "Brief specification summary",
      "Direct link to source procurement notice",
      "190+ country coverage",
    ],
    priceCents: 7900,
    priceSuffix: "/mo",
    currency: USD,
    deliveryType: "instant",
    isSubscription: true,
    isConfigurable: true,
    capacityKind: "subscription",
    configFields: [
      {
        name: "hs_codes",
        label: "HS codes to monitor (comma-separated)",
        type: "text",
        required: true,
        placeholder: "e.g. 0302, 8471, 2709",
      },
      {
        name: "target_markets",
        label: "Target markets",
        type: "textarea",
        required: true,
        placeholder: "List the countries, regions or trading blocs, e.g. EU, GCC, Sub-Saharan Africa",
      },
    ],
  },
  // ============================================================ ADAMftd Intelligence Bundles ()
  {
    sku: "BU-002",
    slug: "trade-intelligence-pack",
    title: "Trade Intelligence Pack",
    categorySlug: "bundles",
    band: "Tier A",
    shortDescription:
      "Single Market Analysis + Trade Corridor + Tariff Brief — everything you need before entering a market.",
    fullDescription:
      "Three essential reports bundled for market-entry intelligence. BU-002 pairs the AI Market Snapshot (MA-200, all 11 analysis dimensions) with the Trade Corridor Report (MR-004, 5-year flow data) and the Tariff & Landed Cost Analysis (CT-002, full duty calculation and mitigation matrix). Together they answer the three questions every exporter needs answered: Is the market right? What's flowing on this corridor? What will it actually cost me after duty?",
    includes: [
      "AI Market Snapshot Report (MA-200) — all 11 analysis dimensions",
      "Trade Corridor Report (MR-004) — 5-year flow, operators, ports",
      "Tariff & Landed Cost Analysis (CT-002) — duty + mitigation",
      "Integrated summary note tying findings across all three reports",
      "Single-organisation licensed PDFs",
    ],
    priceCents: 79900,
    currency: USD,
    deliveryType: "48h",
    isSubscription: false,
    isConfigurable: true,
    cobrandable: true,
    featured: true,
    bundleOf: ["MA-200", "MR-004", "CT-002"],
    savingsCents: 19800,
    configFields: [f.hs(), f.origin(), f.destination()],
  },  {
    sku: "BU-004",
    slug: "compliance-essentials-pack",
    title: "Compliance Essentials Pack",
    categorySlug: "bundles",
    band: "Tier A",
    shortDescription:
      "Sanctions brief + counterparty screening for 25 entities — the compliance starter pack for new trade corridors.",
    fullDescription:
      "Opening a new trading corridor comes with compliance obligations. BU-004 pairs the Sanctions & Compliance Brief (GR-002) for your corridor with the Counterparty Screening Package (CP-001) for up to 25 entities. The GR-002 brief covers the sanctions regime, secondary exposure and risk commentary; the CP-001 screens every named entity against OFAC, EU, UK and UN lists. Together they give you defensible pre-trade due diligence documentation in 24 hours.",
    includes: [
      "Sanctions & Compliance Brief (GR-002) — corridor and regime analysis",
      "Counterparty Screening Package (CP-001) — up to 25 entities",
      "OFAC, EU, UK and UN sanctions coverage",
      "RAG-classified entity cards with risk notes",
      "Combined compliance summary PDF",
      "Single-organisation licensed PDFs",
    ],
    priceCents: 44900,
    currency: USD,
    deliveryType: "24h",
    isSubscription: false,
    isConfigurable: true,
    cobrandable: true,
    featured: false,
    bundleOf: ["GR-002", "CP-001"],
    savingsCents: 9900,
    configFields: [
      {
        name: "corridor",
        label: "Trade corridor or subject jurisdiction",
        type: "text",
        required: true,
        placeholder: "e.g. UAE → Russia, Iran, or specific counterparty country",
      },
      {
        name: "entities",
        label: "Entities to screen (up to 25)",
        type: "textarea",
        required: true,
        placeholder: "One entity name per line. Include country if known.",
      },
    ],
  },
  // ============================================================ Wave 6 — ADAMftd capability coverage
  {
    sku: "MR-005",
    slug: "us-trade-report",
    title: "US Trade Report",
    categorySlug: "market-reports",
    band: "Tier B",
    shortDescription:
      "Official US import and export statistics from the US Census Bureau, supplemented by ADAMftd customs data, for your HTS code.",
    fullDescription:
      "A focused US trade analysis for one HTS code or product: official US Census Bureau import and export statistics, trade balance and five-year trend, top partner countries and corridors, and unit-value benchmarks, supplemented by ADAMftd customs data and senior-analyst commentary. Delivered as a licensed PDF in 48 hours.",
    includes: [
      "US Census Bureau official import and export statistics",
      "Trade balance, volumes and 5-year trend",
      "Top partner countries and corridors",
      "Unit-value benchmarks",
      "Senior-analyst commentary",
      "Single-organisation licensed PDF",
    ],
    priceCents: 59900,
    currency: USD,
    deliveryType: "48h",
    isSubscription: false,
    isConfigurable: false,
    cobrandable: true,
    featured: false,
  },
  {
    sku: "MR-003",
    slug: "eu-seafood-trade-report",
    title: "EU Seafood Trade Report",
    categorySlug: "market-reports",
    band: "Tier B",
    shortDescription:
      "EU seafood import and export analysis from weekly EU Taxud customs surveillance data, by species, CN-8 code, origin and member state.",
    fullDescription:
      "A specialised EU seafood trade report drawing on weekly EU customs surveillance (Taxud) data: import and export flows by species and CN-8 code, by origin country and EU member state, with seasonality, price bands and senior-analyst commentary. Pick your species or enter CN-8 codes directly. Delivered as a licensed PDF in 48 hours.",
    includes: [
      "Weekly EU Taxud customs surveillance data",
      "Flows by species and CN-8 code",
      "By origin country and EU member state",
      "Seasonality and price bands",
      "Senior-analyst commentary",
      "Single-organisation licensed PDF",
    ],
    priceCents: 59900,
    currency: USD,
    deliveryType: "48h",
    isSubscription: false,
    isConfigurable: false,
    cobrandable: true,
    featured: false,
  },
  {
    sku: "CP-002",
    slug: "company-verification-kyc-report",
    title: "Company Verification & KYC Report",
    categorySlug: "compliance-screening",
    band: "Tier A",
    shortDescription:
      "Formal corporate verification for one company: official registry record (GLEIF plus 10 national registries), directors, sanctions screening and a risk summary.",
    fullDescription:
      "Know exactly who you are dealing with. We pull the formal corporate record for one company from official registries (GLEIF and ten national registries including the US, UK, EU member states, Canada and Brazil), confirm legal name, registered address, identifier, status and directors where available, screen the entity and its directors against OFAC, EU, UK and UN sanctions lists, and deliver a senior-analyst risk summary. Defensible KYC documentation in 24 hours.",
    includes: [
      "Official corporate registry record (GLEIF + 10 registries)",
      "Legal name, registered address, identifier and status",
      "Directors where available",
      "Sanctions screening (OFAC, EU, UK, UN)",
      "Senior-analyst risk summary",
      "Single-organisation licensed PDF",
    ],
    priceCents: 24900,
    currency: USD,
    deliveryType: "24h",
    isSubscription: false,
    isConfigurable: false,
    cobrandable: true,
    featured: false,
  },
  {
    sku: "GR-005",
    slug: "maritime-port-risk-report",
    title: "Maritime & Port Risk Report",
    categorySlug: "geopolitical",
    band: "Tier A",
    shortDescription:
      "Port congestion, chokepoint exposure and sanctioned-vessel risk for a named route or port, from live maritime mapping.",
    fullDescription:
      "A senior-analyst maritime risk report for a named route, corridor or port: live port congestion, chokepoint exposure, sanctioned-vessel flags and vessel-category breakdown drawn from ADAMftd live maritime mapping, with corridor-disruption stress notes and a routing recommendation. Delivered as a licensed PDF in 48 hours.",
    includes: [
      "Live port congestion assessment",
      "Chokepoint and corridor exposure",
      "Sanctioned-vessel flags",
      "Vessel-category breakdown",
      "Routing recommendation",
      "Single-organisation licensed PDF",
    ],
    priceCents: 49900,
    currency: USD,
    deliveryType: "48h",
    isSubscription: false,
    isConfigurable: false,
    cobrandable: true,
    featured: false,
  },
  {
    sku: "DG-001",
    slug: "trade-document-pack",
    title: "Trade Document Pack",
    categorySlug: "custom-research",
    band: "Tier C",
    shortDescription:
      "Draft-ready trade documents for one deal: proforma invoice, letter of intent, sales contract and the customs and logistics paperwork, on your branding.",
    fullDescription:
      "Skip the blank page. From your product, country, value and counterparty, we draft a set of trade documents for one transaction: proforma and commercial invoices, letters of intent, MoUs and term sheets, sales contracts and commercial terms, and the customs, logistics and compliance documents your deal needs. Every document carries your company branding, ready to review and finalise.",
    includes: [
      "Proforma and commercial invoices",
      "Letter of intent, MoU or term sheet",
      "Sales contract and commercial terms",
      "Customs and logistics documents",
      "Your company branding on every document",
      "Editable, licensed output",
    ],
    priceCents: 150000,
    currency: USD,
    deliveryType: "48h",
    isSubscription: false,
    isConfigurable: false,
    cobrandable: true,
    featured: false,
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
