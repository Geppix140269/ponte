-- Ponte Trade — Wave 5: ADAMftd Catalogue Expansion
-- Date: 2026-06-10
-- CEO to paste into Supabase SQL editor. Do not run via CLI.
--
-- Net effect:
--   - Adds cobrandable column (boolean, default false)
--   - Adds 2 new categories: compliance-screening, tenders
--   - Archives: BU-001, CR-001, CR-002, CR-004
--   - Re-activates with new content: CT-001, CT-003, GR-003, BU-002, BU-004, TI-001, TI-002
--   - Inserts 5 new SKUs: MA-200, MA-300, CS-002, GR-004, CP-001
--   - Renames MR-002 → Multi-Country Comparative Analysis
--   - Renames CT-002 → Tariff & Landed Cost Analysis
--   - Sets cobrandable = true on all published non-subscription products

begin;

-- ============================================================
-- SCHEMA: add cobrandable column
-- ============================================================

alter table products add column if not exists cobrandable boolean not null default false;

-- ============================================================
-- NEW CATEGORIES
-- ============================================================

insert into categories (slug, name, description, display_order)
values
  ('compliance-screening', 'Compliance & Screening', 'Sanctions screening and counterparty due diligence reports.', 8),
  ('tenders', 'Tender Intelligence', 'Government and institutional procurement tender monitoring and briefings.', 9)
on conflict (slug) do update set
  name          = excluded.name,
  description   = excluded.description,
  display_order = excluded.display_order;

-- ============================================================
-- ARCHIVE: consulting products (not platform-generatable)
-- ============================================================

update products
set status = 'archived', featured = false
where sku in ('BU-001', 'CR-001', 'CR-002', 'CR-004');

-- ============================================================
-- RENAMES: MR-002 and CT-002
-- ============================================================

update products set
  title             = 'Multi-Country Comparative Analysis',
  slug              = 'multi-country-comparative-analysis',
  short_description = 'Comparative entry-readiness analysis across 3-5 target countries for one product. Ranked recommendation.',
  full_description  = 'A senior-analyst comparative report covering 3-5 target countries for one product. Each country is assessed across market size, demand, competition, tariffs and regulatory environment, then ranked on entry difficulty and market opportunity. Concludes with a ranked entry recommendation and corridor-level pricing comparison. Board-ready.',
  includes          = '["Per-country market size and demand analysis","Tariff and regulatory comparison matrix","Competitive landscape per country","Entry-readiness ranking across all countries","Ranked entry recommendation with rationale","Single-organisation licensed PDF"]'::jsonb
where sku = 'MR-002';

update products set
  title             = 'Tariff & Landed Cost Analysis',
  slug              = 'tariff-landed-cost-analysis',
  short_description = 'Landed-cost breakdown plus tariff exposure and mitigation analysis for a chosen product and corridor.',
  full_description  = 'A senior-analyst brief covering tariff classification, current and announced duty rates, landed-cost build-up, and mitigation options (FTA routing, classification review, valuation strategy). Includes a mitigation matrix with quantified savings ranges.'
where sku = 'CT-002';

-- ============================================================
-- RE-ACTIVATE: archived SKUs with new ADAMftd content
-- ============================================================

-- CT-001: Country Trade Profile Report (was archived in wave 2)
update products set
  category_id       = (select id from categories where slug = 'country-tariff'),
  title             = 'Country Trade Profile Report',
  slug              = 'country-trade-profile-report',
  short_description = '14-dimension trade profile for any country: macro, trade flows, corridors, partners, and regulatory environment.',
  full_description  = 'Need to understand a country''s trade architecture before deciding where to source or sell? CT-001 delivers a 14-dimension country profile powered by ADAMftd and 7B+ records: GDP and macro indicators, total import/export values, top trading partners, key corridors, leading HS chapters, tariff profile, customs environment, FTA membership, regulatory environment, logistics performance, and currency/payment risk. Optional HS focus for sector-specific depth.',
  includes          = '["Macro overview: GDP, trade balance, growth trajectory","Total import/export values and top partners","Key trade corridors and leading HS chapters","Tariff profile: MFN rates, FTA membership","Customs environment and regulatory overview","Logistics Performance Index and infrastructure notes","Currency and payment risk flags","ADAMftd verified data with full citations","Single-organisation licensed PDF"]'::jsonb,
  price_cents       = 24900,
  currency          = 'GBP',
  delivery_type     = '24h',
  is_subscription   = false,
  is_configurable   = true,
  config_fields     = '[
    {"name":"country","label":"Country to profile","type":"country","required":true},
    {"name":"hs_code","label":"HS code focus (optional)","type":"text","required":false,"placeholder":"e.g. 0902.10"}
  ]'::jsonb,
  band              = 'Tier A',
  featured          = false,
  status            = 'published'
where sku = 'CT-001';

-- CT-003: FTA Routing Analysis (was archived in wave 2)
update products set
  category_id       = (select id from categories where slug = 'country-tariff'),
  title             = 'FTA Routing Analysis',
  slug              = 'fta-routing-analysis',
  short_description = 'Which routing saves the most duty? Origin-rules analysis across every applicable FTA for your HS code and corridor.',
  full_description  = 'You know your product. You know your destination. The question is whether an FTA applies — and whether your goods actually qualify under the rules of origin. CT-003 maps every FTA applicable to your origin-destination corridor, checks rules-of-origin qualification criteria for your HS code, quantifies the duty saving under each qualifying agreement, and flags the documentation you need. For complex multi-origin supply chains, we model alternative sourcing routings and their qualification risk.',
  includes          = '["FTA landscape for your corridor: all applicable agreements","Rules-of-origin qualification check per HS code","Duty saving quantification under each qualifying FTA","Documentation and certification requirements","Alternative origin routing scenarios (where applicable)","Senior-analyst commentary on qualification risk","Single-organisation licensed PDF"]'::jsonb,
  price_cents       = 49900,
  currency          = 'GBP',
  delivery_type     = '48h',
  is_subscription   = false,
  is_configurable   = true,
  config_fields     = '[
    {"name":"hs_code","label":"HS Code","type":"text","required":true,"placeholder":"e.g. 0902.10"},
    {"name":"origin","label":"Country of origin","type":"country","required":true},
    {"name":"destination","label":"Country of destination","type":"country","required":true}
  ]'::jsonb,
  band              = 'Tier A',
  featured          = false,
  status            = 'published'
where sku = 'CT-003';

-- GR-003: Hormuz Oil Shock Scenario Report (was archived in wave 2)
update products set
  category_id       = (select id from categories where slug = 'geopolitical'),
  title             = 'Hormuz Oil Shock Scenario Report',
  slug              = 'hormuz-oil-shock-scenario-report',
  short_description = 'World-exclusive HS-6 oil shock modelling: four escalation scenarios, quantified supply disruption, sector-by-sector impact.',
  full_description  = 'The only report in the world that models Hormuz disruption at HS-6 level. Using Ponte''s proprietary Hormuz Simulator, we quantify trade-flow disruption, oil price trajectories and sector-by-sector downstream impact across four escalation scenarios: (1) blockade threat only — market fear premium, (2) partial closure — 30-day disruption, (3) full closure — 90-day sustained, (4) military escalation — extended six-month scenario. For each scenario: which HS codes are most exposed, how prices move, which corridors reroute and to where, and your specific exposure by HS code if provided. No other research house publishes this.',
  includes          = '["Hormuz Simulator: 4-scenario quantified disruption model","HS-6 trade flow exposure per scenario","Oil price and energy input cost trajectories","Sector-by-sector downstream impact analysis","Corridor rerouting patterns: alternative lanes and ports","Your specific HS code exposure (if provided)","Mitigation and hedging playbook","Single-organisation licensed PDF"]'::jsonb,
  price_cents       = 59900,
  currency          = 'GBP',
  delivery_type     = '24h',
  is_subscription   = false,
  is_configurable   = true,
  config_fields     = '[
    {"name":"scenarios","label":"Scenarios to model","type":"select","required":true,"options":[
      {"value":"all","label":"All four scenarios (recommended)"},
      {"value":"threat-only","label":"Scenario 1: Blockade threat"},
      {"value":"partial","label":"Scenario 2: Partial 30-day closure"},
      {"value":"full","label":"Scenario 3: Full 90-day closure"},
      {"value":"military","label":"Scenario 4: Military escalation"}
    ]},
    {"name":"hs_code","label":"HS code (optional — for your-exposure section)","type":"text","required":false,"placeholder":"e.g. 2709.00"}
  ]'::jsonb,
  band              = 'Tier A',
  featured          = true,
  status            = 'published'
where sku = 'GR-003';

-- BU-002: Trade Intelligence Pack (was archived in wave 2)
update products set
  category_id       = (select id from categories where slug = 'bundles'),
  title             = 'Trade Intelligence Pack',
  slug              = 'trade-intelligence-pack',
  short_description = 'AI Market Snapshot + Trade Corridor + Tariff Analysis — everything you need before entering a market.',
  full_description  = 'Three essential reports bundled for market-entry intelligence. BU-002 pairs the AI Market Snapshot (MA-200, all 11 analysis dimensions) with the Trade Corridor Report (MR-004, 5-year flow data) and the Tariff & Landed Cost Analysis (CT-002, full duty calculation and mitigation matrix). Together they answer the three questions every exporter needs answered: Is the market right? What is flowing on this corridor? What will it actually cost after duty?',
  includes          = '["AI Market Snapshot Report (MA-200) — all 11 analysis dimensions","Trade Corridor Report (MR-004) — 5-year flow, operators, ports","Tariff & Landed Cost Analysis (CT-002) — duty and mitigation","Integrated summary note tying findings across all three reports","Single-organisation licensed PDFs"]'::jsonb,
  price_cents       = 79900,
  currency          = 'GBP',
  delivery_type     = '48h',
  is_subscription   = false,
  is_configurable   = true,
  config_fields     = '[
    {"name":"hs_code","label":"HS Code","type":"text","required":true,"placeholder":"e.g. 0902.10"},
    {"name":"origin","label":"Country of origin","type":"country","required":true},
    {"name":"destination","label":"Country of destination","type":"country","required":true}
  ]'::jsonb,
  band              = 'Tier A',
  savings_cents     = 19800,
  featured          = true,
  status            = 'published'
where sku = 'BU-002';

-- BU-004: Compliance Essentials Pack (was archived in wave 2)
update products set
  category_id       = (select id from categories where slug = 'bundles'),
  title             = 'Compliance Essentials Pack',
  slug              = 'compliance-essentials-pack',
  short_description = 'Sanctions brief + counterparty screening for 25 entities — the compliance starter pack for new trade corridors.',
  full_description  = 'Opening a new trading corridor comes with compliance obligations. BU-004 pairs the Sanctions & Compliance Brief (GR-002) for your corridor with the Counterparty Screening Package (CP-001) for up to 25 entities. The GR-002 brief covers the sanctions regime, secondary exposure and risk commentary; the CP-001 screens every named entity against OFAC, EU, UK and UN lists. Together they give you defensible pre-trade due diligence documentation in 24 hours.',
  includes          = '["Sanctions & Compliance Brief (GR-002) — corridor and regime analysis","Counterparty Screening Package (CP-001) — up to 25 entities","OFAC, EU, UK and UN sanctions coverage","RAG-classified entity cards with risk notes","Combined compliance summary PDF","Single-organisation licensed PDFs"]'::jsonb,
  price_cents       = 74900,
  currency          = 'GBP',
  delivery_type     = '24h',
  is_subscription   = false,
  is_configurable   = true,
  config_fields     = '[
    {"name":"corridor","label":"Trade corridor or subject jurisdiction","type":"text","required":true,"placeholder":"e.g. UAE to Russia, Iran, or specific counterparty country"},
    {"name":"entities","label":"Entities to screen (up to 25)","type":"textarea","required":true,"placeholder":"One entity name per line. Include country if known."}
  ]'::jsonb,
  band              = 'Tier A',
  savings_cents     = 9900,
  featured          = false,
  status            = 'published'
where sku = 'BU-004';

-- TI-001: Government Tender Intelligence Brief (was archived in wave 2)
update products set
  category_id       = (select id from categories where slug = 'tenders'),
  title             = 'Government Tender Intelligence Brief',
  slug              = 'government-tender-intelligence-brief',
  short_description = 'Active government tenders for your HS code and target markets — curated, assessed and ready to respond to.',
  full_description  = 'Governments and institutions publish tens of thousands of procurement notices globally. Most are invisible to exporters without dedicated monitoring. TI-001 searches 190+ countries'' public procurement portals for active tenders matching your HS code and target markets, assesses each for fit and bid likelihood, and delivers a curated shortlist with full tender details, submission requirements and deadlines. Ideal for exporters, chambers, and trade advisers managing client pipelines.',
  includes          = '["Active tenders matched to your HS code and target markets","Tender details: contracting authority, value, deadline, specs","Fit and bid-likelihood assessment per tender","Submission requirements and contact points","190+ country procurement portal coverage","Single-organisation licensed PDF"]'::jsonb,
  price_cents       = 39900,
  currency          = 'GBP',
  delivery_type     = '48h',
  is_subscription   = false,
  is_configurable   = true,
  config_fields     = '[
    {"name":"hs_code","label":"HS Code","type":"text","required":true,"placeholder":"e.g. 0902.10"},
    {"name":"target_markets","label":"Target markets","type":"textarea","required":true,"placeholder":"List the countries or regions you want tenders from, e.g. GCC, West Africa, Germany"}
  ]'::jsonb,
  band              = 'Tier A',
  featured          = false,
  status            = 'published'
where sku = 'TI-001';

-- TI-002: Weekly Tender Digest (was archived in wave 2 as a subscription)
update products set
  category_id       = (select id from categories where slug = 'tenders'),
  title             = 'Weekly Tender Digest',
  slug              = 'weekly-tender-digest',
  short_description = 'Weekly curated tender alerts by HS code and sector. Never miss a procurement opportunity again.',
  full_description  = 'A weekly email digest of new government and institutional tenders matched to your HS codes and target markets. Each digest includes: contracting authority, tender value, deadline, brief specification summary, and a direct link to the source notice. Fully curated by our tender intelligence team — no noise, no auto-generated alerts. Monthly subscription, cancel any time. Covers 190+ countries.',
  includes          = '["Weekly email digest every Monday","New tenders matched to your specified HS codes","Contracting authority, value and deadline per tender","Brief specification summary","Direct link to source procurement notice","190+ country coverage"]'::jsonb,
  price_cents       = 7900,
  price_suffix      = '/mo',
  currency          = 'GBP',
  delivery_type     = 'instant',
  is_subscription   = true,
  is_configurable   = true,
  config_fields     = '[
    {"name":"hs_codes","label":"HS codes to monitor (comma-separated)","type":"text","required":true,"placeholder":"e.g. 0302, 8471, 2709"},
    {"name":"target_markets","label":"Target markets","type":"textarea","required":true,"placeholder":"List the countries, regions or trading blocs, e.g. EU, GCC, Sub-Saharan Africa"}
  ]'::jsonb,
  band              = 'Tier A',
  featured          = false,
  status            = 'published'
where sku = 'TI-002';

-- ============================================================
-- INSERT: genuinely new SKUs
-- ============================================================

-- MA-200: AI Market Snapshot Report
insert into products (sku, category_id, title, slug, short_description, full_description, includes, price_cents, currency, delivery_type, is_subscription, is_configurable, config_fields, band, featured, status)
values (
  'MA-200',
  (select id from categories where slug = 'analysis'),
  'AI Market Snapshot Report',
  'ai-market-snapshot-report',
  'Complete 11-function market intelligence for one HS code and country — all topics in a single 24-hour brief.',
  'Powered by the ADAMftd grounded-AI engine and 7 billion+ verified trade records. MA-200 runs all eleven Market Analysis Suite functions in parallel: Retail Snapshot, Market Size, Consumer Preferences, Sentiment, Seasonal Demand, Local Production, Substitutes, SWOT, Entry Barriers, Packaging, and Quality & Certifications. Each finding is verified through a 4-source pull, conflict-detection and Monte Carlo resolution before a senior analyst signs off the final PDF. Faster, broader, and more affordable than ordering each topic individually.',
  '["All 11 Market Analysis Suite dimensions","Retail landscape and market size","Consumer preferences and sentiment analysis","Seasonal demand and local production overview","Substitutes, SWOT and entry barriers","Packaging, labelling and certification requirements","ADAMftd 4-source verified findings with full citations","Senior-analyst sign-off","Single-organisation licensed PDF"]'::jsonb,
  29900,
  'GBP',
  '24h',
  false,
  true,
  '[
    {"name":"hs_code","label":"HS Code","type":"text","required":true,"placeholder":"e.g. 0902.10"},
    {"name":"country","label":"Target market","type":"country","required":true}
  ]'::jsonb,
  'Tier A',
  true,
  'published'
)
on conflict (sku) do update set
  category_id       = excluded.category_id,
  title             = excluded.title,
  slug              = excluded.slug,
  short_description = excluded.short_description,
  full_description  = excluded.full_description,
  includes          = excluded.includes,
  price_cents       = excluded.price_cents,
  currency          = excluded.currency,
  delivery_type     = excluded.delivery_type,
  is_subscription   = excluded.is_subscription,
  is_configurable   = excluded.is_configurable,
  config_fields     = excluded.config_fields,
  band              = excluded.band,
  featured          = excluded.featured,
  status            = excluded.status;

-- MA-300: Complete Market Analysis Suite
insert into products (sku, category_id, title, slug, short_description, full_description, includes, price_cents, currency, delivery_type, is_subscription, is_configurable, config_fields, band, featured, status)
values (
  'MA-300',
  (select id from categories where slug = 'analysis'),
  'Complete Market Analysis Suite',
  'complete-market-analysis-suite',
  'The full picture: all 11 ADAMftd analysis modules plus a senior-analyst executive synthesis narrative.',
  'Everything in MA-200 plus an extended 20+ page executive narrative in which a senior analyst integrates all eleven findings into a coherent go/no-go assessment. The synthesis covers market opportunity sizing, competitive dynamics, regulatory runway and a recommended market-entry sequencing plan. The most complete single-country product analysis available before commissioning a full MR-001 engagement.',
  '["All 11 Market Analysis Suite dimensions (see MA-200)","Extended senior-analyst synthesis narrative (20+ pages)","Go/no-go market opportunity assessment","Competitive dynamics and regulatory runway","Market-entry sequencing recommendations","ADAMftd 4-source verified findings","Single-organisation licensed PDF"]'::jsonb,
  89900,
  'GBP',
  '48h',
  false,
  true,
  '[
    {"name":"hs_code","label":"HS Code","type":"text","required":true,"placeholder":"e.g. 0902.10"},
    {"name":"country","label":"Target market","type":"country","required":true}
  ]'::jsonb,
  'Tier A',
  true,
  'published'
)
on conflict (sku) do update set
  category_id       = excluded.category_id,
  title             = excluded.title,
  slug              = excluded.slug,
  short_description = excluded.short_description,
  full_description  = excluded.full_description,
  includes          = excluded.includes,
  price_cents       = excluded.price_cents,
  currency          = excluded.currency,
  delivery_type     = excluded.delivery_type,
  is_subscription   = excluded.is_subscription,
  is_configurable   = excluded.is_configurable,
  config_fields     = excluded.config_fields,
  band              = excluded.band,
  featured          = excluded.featured,
  status            = excluded.status;

-- CS-002: Trade Company Deep Profile
insert into products (sku, category_id, title, slug, short_description, full_description, includes, price_cents, currency, delivery_type, is_subscription, is_configurable, config_fields, band, featured, status)
values (
  'CS-002',
  (select id from categories where slug = 'company-supplier'),
  'Trade Company Deep Profile',
  'trade-company-deep-profile',
  'Full intelligence profile on one trading company: volumes, partners, corridors, risk flags.',
  'Before you partner, source, or invest: know exactly who you are dealing with. CS-002 profiles one named trading entity using ADAMftd transaction-level customs data and open-source verification. We map their HS code activity, top trading partners, shipment volumes and values, key corridors, port patterns, and flag any sanctions, ownership, or reputational risk indicators. Faster and deeper than a Google search. Grounded in verified customs records.',
  '["Company identity verification (registered name, country, aliases)","HS code activity and product categories traded","Top trading partners (buyers or suppliers) by volume","Shipment volume and value trends","Key corridors and port patterns","Sanctions, PEP and ownership risk flags","ADAMftd verified trade records with citations","Single-organisation licensed PDF"]'::jsonb,
  34900,
  'GBP',
  '24h',
  false,
  true,
  '[
    {"name":"company_name","label":"Company name","type":"text","required":true,"placeholder":"Exact registered name or trading name"},
    {"name":"company_country","label":"Company country (if known)","type":"country","required":false},
    {"name":"role","label":"Company role","type":"select","required":true,"options":[
      {"value":"supplier","label":"Supplier I am evaluating"},
      {"value":"buyer","label":"Buyer / prospective customer"},
      {"value":"counterparty","label":"Counterparty / partner"},
      {"value":"competitor","label":"Competitor"}
    ]}
  ]'::jsonb,
  'Tier A',
  false,
  'published'
)
on conflict (sku) do update set
  category_id       = excluded.category_id,
  title             = excluded.title,
  slug              = excluded.slug,
  short_description = excluded.short_description,
  full_description  = excluded.full_description,
  includes          = excluded.includes,
  price_cents       = excluded.price_cents,
  currency          = excluded.currency,
  delivery_type     = excluded.delivery_type,
  is_subscription   = excluded.is_subscription,
  is_configurable   = excluded.is_configurable,
  config_fields     = excluded.config_fields,
  band              = excluded.band,
  featured          = excluded.featured,
  status            = excluded.status;

-- GR-004: Supply Chain Risk Assessment
insert into products (sku, category_id, title, slug, short_description, full_description, includes, price_cents, currency, delivery_type, is_subscription, is_configurable, config_fields, band, featured, status)
values (
  'GR-004',
  (select id from categories where slug = 'geopolitical'),
  'Supply Chain Risk Assessment',
  'supply-chain-risk-assessment',
  'End-to-end supply chain risk map for one product: chokepoints, supplier concentration, geopolitical exposure and mitigation.',
  'Your supply chain has exposures you may not have mapped. GR-004 takes one HS code and constructs a full risk register: top sourcing countries and their geopolitical risk ratings, chokepoint dependency by corridor, single-country concentration risk, tariff escalation exposure, logistics disruption scenarios, and a weighted risk matrix. Closes with a prioritised mitigation roadmap: diversification options, alternative corridors, buffer stock recommendations, and hedging levers. Delivered in five working days by a senior analyst.',
  '["Top sourcing countries with geopolitical risk ratings","Chokepoint dependency mapping by corridor","Single-country / single-supplier concentration risk","Tariff and sanctions escalation exposure","Logistics disruption scenario modelling","Weighted risk matrix with severity x likelihood","Prioritised mitigation roadmap","Single-organisation licensed PDF"]'::jsonb,
  89900,
  'GBP',
  'custom',
  false,
  true,
  '[
    {"name":"hs_code","label":"HS Code","type":"text","required":true,"placeholder":"e.g. 0902.10"},
    {"name":"supply_chain_notes","label":"Key suppliers or source countries (optional)","type":"textarea","required":false,"placeholder":"Name your main suppliers or sourcing countries if you want us to focus the risk assessment"}
  ]'::jsonb,
  'Tier B',
  false,
  'published'
)
on conflict (sku) do update set
  category_id       = excluded.category_id,
  title             = excluded.title,
  slug              = excluded.slug,
  short_description = excluded.short_description,
  full_description  = excluded.full_description,
  includes          = excluded.includes,
  price_cents       = excluded.price_cents,
  currency          = excluded.currency,
  delivery_type     = excluded.delivery_type,
  is_subscription   = excluded.is_subscription,
  is_configurable   = excluded.is_configurable,
  config_fields     = excluded.config_fields,
  band              = excluded.band,
  featured          = excluded.featured,
  status            = excluded.status;

-- CP-001: Counterparty Screening Package
insert into products (sku, category_id, title, slug, short_description, full_description, includes, price_cents, currency, delivery_type, is_subscription, is_configurable, config_fields, band, featured, status)
values (
  'CP-001',
  (select id from categories where slug = 'compliance-screening'),
  'Counterparty Screening Package',
  'counterparty-screening-package',
  'Bulk sanctions and risk screening for up to 25 counterparties. OFAC, EU, UK and UN lists. 24-hour delivery.',
  'Onboarding a new roster of suppliers, partners or distributors? CP-001 screens up to 25 named entities in a single engagement. Each entity is checked against OFAC, EU, UK and UN sanctions lists, beneficial-ownership databases, PEP lists, and open-source adverse-media sources. Delivered as a batch PDF report with individual entity cards — red/amber/green classification, risk notes, and flagged issues. Faster and more cost-effective than screening one by one with GR-002.',
  '["Up to 25 named entities screened","OFAC, EU, UK and UN sanctions list checks","Beneficial ownership and PEP screening","Adverse media and open-source check","Individual entity cards: RAG classification and risk notes","Batch summary PDF","Single-organisation licensed PDF"]'::jsonb,
  19900,
  'GBP',
  '24h',
  false,
  true,
  '[
    {"name":"entities","label":"Entities to screen (up to 25)","type":"textarea","required":true,"placeholder":"One entity name per line. Include country if known."}
  ]'::jsonb,
  'Tier A',
  false,
  'published'
)
on conflict (sku) do update set
  category_id       = excluded.category_id,
  title             = excluded.title,
  slug              = excluded.slug,
  short_description = excluded.short_description,
  full_description  = excluded.full_description,
  includes          = excluded.includes,
  price_cents       = excluded.price_cents,
  currency          = excluded.currency,
  delivery_type     = excluded.delivery_type,
  is_subscription   = excluded.is_subscription,
  is_configurable   = excluded.is_configurable,
  config_fields     = excluded.config_fields,
  band              = excluded.band,
  featured          = excluded.featured,
  status            = excluded.status;

-- ============================================================
-- COBRANDABLE: set true on all published non-subscription products
-- ============================================================

update products
set cobrandable = true
where status = 'published'
  and (is_subscription = false or is_subscription is null);

-- Defensive: ensure archived rows are unfeatured
update products set featured = false where status = 'archived';

commit;
