-- Ponte Trade — Wave 2 Catalogue Restructure
-- Date: 2026-05-26
-- Source: docs/WAVE-2-SKU-MAPPING.md and docs/DEV-BRIEF-V1.md
--
-- Net effect:
--   - 41 active SKUs become 17 (Tier A: 9, Tier B: 4, Tier C: 4)
--   - 27 archived (status='archived')
--   - 5 new inserted (MA-100, VM-001, BU-100, CR-003, CR-004)
--   - 9 renamed/repriced in place
--
-- Safe to run multiple times (idempotent via on conflict + status set).

begin;

-- ============================================================ KILL LIST (archive)
-- Sets status='archived' on every SKU removed from the v1 catalogue.

update products set status = 'archived' where sku in (
  -- Consolidated into new MA-100 (Single Market Analysis Report, configurable)
  'MA-001', 'MA-002', 'MA-003', 'MA-004', 'MA-005',
  'MA-006', 'MA-007', 'MA-008', 'MA-009', 'MA-010', 'MA-011',
  -- Sub-$199 and niche single-topic
  'MR-003',                       -- EU Seafood Trade Report (niche)
  'CT-001', 'CT-003',             -- Country Trade Profile, Bilateral Trade Flow
  'TI-001',                       -- Active Tenders Briefing
  -- Duplicate / overlapping
  'CI-002', 'CI-004', 'CI-005',   -- Top Suppliers, Buyers by HS, Suppliers by HS
  'BU-002', 'BU-003', 'BU-004', 'BU-006', -- Competitive Intel, Full Overview, Trade Readiness, Export Launchpad
  'GR-003',                       -- Chokepoint Disruption Brief
  -- Subscriptions / credit packs
  'TI-002',                       -- Weekly Tender Digest
  'SB-001',                       -- Trade Intelligence Newsletter
  'SB-002', 'SB-003', 'SB-004'    -- Report Credit Packs
);

-- Also unfeature anything archived so it cannot leak into /featured queries.
update products set featured = false where status = 'archived';

-- ============================================================ RENAMES + REPRICES (Tier A)

-- GR-002 → Sanctions & Compliance Brief, $349
update products set
  title             = 'Sanctions & Compliance Brief',
  short_description = 'Sanctions screening, compliance exposure and mitigation analysis for a counterparty, jurisdiction, or trade lane.',
  full_description  = 'A senior-analyst brief on sanctions and compliance exposure: applicable sanctions regimes, designated entity overlap, secondary-sanctions risk, and a mitigation playbook. Cross-checked against the primary lists (OFAC, EU, UK, UN) plus our 7B+ verified trade-record base.',
  price_cents       = 34900,
  delivery_type     = '48h',
  status            = 'published'
where sku = 'GR-002';

-- CT-002 → Tariff & Landed Cost Strategic Brief, $299
update products set
  title             = 'Tariff & Landed Cost Strategic Brief',
  short_description = 'Landed-cost breakdown plus tariff exposure and mitigation analysis for a chosen product and corridor.',
  full_description  = 'A senior-analyst brief covering tariff classification, current and announced duty rates, landed-cost build-up, and mitigation options (FTA routing, classification review, valuation strategy). Includes a mitigation matrix with quantified savings ranges.',
  price_cents       = 29900,
  delivery_type     = '48h',
  status            = 'published'
where sku = 'CT-002';

-- MR-004 → Trade Corridor Report, $399 (reprice only)
update products set
  price_cents = 39900,
  status      = 'published'
where sku = 'MR-004';

-- CI-003 → Buyer/Supplier Intelligence, $399 (consolidation)
update products set
  title             = 'Buyer/Supplier Intelligence',
  slug              = 'buyer-supplier-intelligence',
  short_description = 'Ranked, contactable shortlist of qualified buyers or suppliers for your HS code with verified trade-partner contacts.',
  full_description  = 'A senior-analyst-curated shortlist of qualified buyers or suppliers for your HS code: trade volumes, ranked match score, verified contact details, and known counterparty risk flags. Replaces our separate buyer / supplier / HS-code variants.',
  price_cents       = 39900,
  delivery_type     = '48h',
  status            = 'published',
  config_fields     = '[
    {"name":"role","label":"I am looking for","type":"select","required":true,"options":[{"value":"buyers","label":"Buyers"},{"value":"suppliers","label":"Suppliers"}]},
    {"name":"hs_code","label":"HS Code","type":"text","required":true,"placeholder":"e.g. 0902.10"},
    {"name":"country","label":"Target market (optional)","type":"country","required":false}
  ]'::jsonb
where sku = 'CI-003';

-- CI-001 → Company Deep-Dive, $499
update products set
  title             = 'Company Deep-Dive',
  slug              = 'company-deep-dive',
  short_description = 'Full corporate intelligence dossier: registry data, beneficial ownership, trade footprint, sanctions and adverse-media screening.',
  full_description  = 'A senior-analyst dossier on a single legal entity: corporate registry data, beneficial ownership, group structure, full trade footprint (imports and exports by corridor and HS code), sanctions and adverse-media screening, and a counterparty risk verdict.',
  price_cents       = 49900,
  delivery_type     = '48h',
  status            = 'published',
  config_fields     = '[
    {"name":"company","label":"Company name","type":"text","required":true,"placeholder":"Legal entity name"},
    {"name":"country","label":"Country of incorporation","type":"country","required":true}
  ]'::jsonb
where sku = 'CI-001';

-- GR-001 → Geopolitical Scenario Brief, $499
update products set
  title             = 'Geopolitical Scenario Brief',
  slug              = 'geopolitical-scenario-brief',
  short_description = 'Scenario analysis for a named chokepoint or conflict zone (Hormuz, Suez, Taiwan, Red Sea, others) with quantified trade exposure.',
  full_description  = 'A senior-analyst scenario brief for a named geopolitical event or chokepoint: trade flows at risk, named exposed sectors and corridors, plausible escalation paths, and a mitigation playbook. Available chokepoints: Hormuz, Suez, Taiwan Strait, Red Sea, Panama Canal, Russia/Ukraine corridors, and custom.',
  price_cents       = 49900,
  delivery_type     = '48h',
  status            = 'published',
  config_fields     = '[
    {"name":"scenario","label":"Scenario","type":"select","required":true,"options":[
      {"value":"hormuz","label":"Strait of Hormuz"},
      {"value":"suez","label":"Suez Canal"},
      {"value":"red-sea","label":"Red Sea / Bab el-Mandeb"},
      {"value":"taiwan","label":"Taiwan Strait"},
      {"value":"panama","label":"Panama Canal"},
      {"value":"russia-ukraine","label":"Russia / Ukraine corridors"},
      {"value":"custom","label":"Other (specify in notes)"}
    ]},
    {"name":"hs_code","label":"Your exposed HS code (optional)","type":"text","required":false,"placeholder":"e.g. 2709"},
    {"name":"notes","label":"Other / specific concern","type":"textarea","required":false}
  ]'::jsonb
where sku = 'GR-001';

-- MR-001 → Single Country Market Report (already $599, ensure published + correct)
update products set
  status      = 'published',
  price_cents = 59900
where sku = 'MR-001';

-- ============================================================ RENAMES + REPRICES (Tier B)

-- BU-001 → Market Entry Strategy, $1,099 / 72h
update products set
  title             = 'Market Entry Strategy',
  slug              = 'market-entry-strategy',
  short_description = 'Integrated market-entry strategy for a single country: market sizing, demand, competition, entry barriers, packaging, certification, and go-to-market.',
  full_description  = 'A senior-analyst integrated narrative for one product entering one country: market sizing and demand, competitive landscape, entry barriers, packaging and labelling requirements, applicable certifications, tariff and landed cost, and a go-to-market sequence with named partners. Board-ready.',
  price_cents       = 109900,
  delivery_type     = '72h',
  status            = 'published',
  config_fields     = '[
    {"name":"hs_code","label":"HS Code","type":"text","required":true,"placeholder":"e.g. 0902.10"},
    {"name":"country","label":"Target country","type":"country","required":true}
  ]'::jsonb
where sku = 'BU-001';

-- MR-002 → Global Market Strategy, $1,599 / 96h
update products set
  title             = 'Global Market Strategy',
  slug              = 'global-market-strategy',
  short_description = 'Integrated global strategy for one product across all relevant markets: corridor prioritisation, comparative entry analysis, and a ranked rollout plan.',
  full_description  = 'A senior-analyst global strategy for one product: global demand and growth, top-priority markets ranked by opportunity and entry difficulty, comparative entry analysis across the top 5, corridor-level pricing, and a ranked rollout plan with year-1 to year-3 sequencing. Board-ready.',
  price_cents       = 159900,
  delivery_type     = '96h',
  status            = 'published'
where sku = 'MR-002';

-- BU-005 → Full Market Intelligence, $1,999 / 96h
update products set
  title             = 'Full Market Intelligence',
  slug              = 'full-market-intelligence',
  short_description = 'The full intelligence stack for one product in one country: all 11 market-analysis modules plus the single-country market report.',
  full_description  = 'Our most comprehensive single-country product. Covers all 11 analysis modules (retail, market size, consumer preferences, sentiment, seasonality, local production, substitutes, SWOT, entry barriers, packaging, certifications) plus the full Single Country Market Report, integrated into one board-ready narrative with executive summary.',
  price_cents       = 199900,
  delivery_type     = '96h',
  status            = 'published',
  config_fields     = '[
    {"name":"hs_code","label":"HS Code","type":"text","required":true,"placeholder":"e.g. 0902.10"},
    {"name":"country","label":"Target country","type":"country","required":true}
  ]'::jsonb
where sku = 'BU-005';

-- ============================================================ RENAMES + REPRICES (Tier C)

-- CR-001 → Custom Research Brief, from $2,999
update products set
  title             = 'Custom Research Brief',
  slug              = 'custom-research-brief',
  short_description = 'Bespoke research brief scoped to your specific question. Manual quote inside 48 hours.',
  full_description  = 'A bespoke senior-analyst brief scoped to your question. You tell us the decision you are trying to make, we scope the deliverable, the timeline, and the price inside 48 hours. Typical engagements: $2,999 to $9,999. Larger scopes available on request.',
  price_cents       = 299900,
  price_from        = true,
  delivery_type     = 'custom',
  status            = 'published'
where sku = 'CR-001';

-- CR-002 → Market Entry Consulting Engagement, from $4,999
update products set
  title             = 'Market Entry Consulting Engagement',
  slug              = 'market-entry-consulting',
  short_description = 'Multi-week, multi-deliverable market-entry consulting engagement with named senior partner.',
  full_description  = 'A multi-week consulting engagement led by a named senior partner: discovery and scoping, market analysis, entry strategy, partner identification, regulatory readiness, and a sequenced go-to-market plan. Typical engagement: 4 to 8 weeks, $4,999 to $24,999. Scoped on request.',
  price_cents       = 499900,
  price_from        = true,
  delivery_type     = 'custom',
  status            = 'published'
where sku = 'CR-002';

-- ============================================================ NEW SKUs

-- MA-100: Single Market Analysis Report (configurable, any of 11 topics)
insert into products (sku, category_id, title, slug, short_description, full_description, price_cents, currency, delivery_type, is_subscription, is_configurable, config_fields, status, featured)
values (
  'MA-100',
  (select id from categories where slug = 'analysis'),
  'Single Market Analysis Report',
  'single-market-analysis-report',
  'A focused, senior-analyst-curated market analysis on one topic of your choice, in one country, for one HS code.',
  'A single-topic market analysis curated by a senior sector analyst. Pick one of eleven topics (retail landscape, market size, consumer preferences, sentiment, seasonality, local production, substitutes, SWOT, entry barriers, packaging and labelling, certifications) for your product and target market. Delivered as a licensed PDF inside 48 hours.',
  29900,
  'USD',
  '48h',
  false,
  true,
  '[
    {"name":"topic","label":"Analysis topic","type":"select","required":true,"options":[
      {"value":"retail","label":"Retail landscape"},
      {"value":"market-size","label":"Market size & demand"},
      {"value":"consumer","label":"Consumer preferences"},
      {"value":"sentiment","label":"Market sentiment"},
      {"value":"seasonality","label":"Seasonal demand"},
      {"value":"local-production","label":"Local production overview"},
      {"value":"substitutes","label":"Substitutes & competitors"},
      {"value":"swot","label":"SWOT analysis"},
      {"value":"barriers","label":"Entry barriers"},
      {"value":"packaging","label":"Packaging & labelling"},
      {"value":"certifications","label":"Certifications & standards"}
    ]},
    {"name":"hs_code","label":"HS Code","type":"text","required":true,"placeholder":"e.g. 0902.10"},
    {"name":"country","label":"Target market","type":"country","required":true}
  ]'::jsonb,
  'published',
  true
)
on conflict (sku) do update set
  title             = excluded.title,
  short_description = excluded.short_description,
  full_description  = excluded.full_description,
  price_cents       = excluded.price_cents,
  delivery_type     = excluded.delivery_type,
  config_fields     = excluded.config_fields,
  status            = excluded.status,
  featured          = excluded.featured;

-- VM-001: Vessels & Maritime Exposure Brief
insert into products (sku, category_id, title, slug, short_description, full_description, price_cents, currency, delivery_type, is_subscription, is_configurable, config_fields, status, featured)
values (
  'VM-001',
  (select id from categories where slug = 'geopolitical'),
  'Vessels & Maritime Exposure Brief',
  'vessels-maritime-exposure',
  'Maritime exposure brief for a counterparty, vessel, fleet, or trade lane: ownership, port calls, AIS gaps, and sanctions touchpoints.',
  'A senior-analyst brief on maritime exposure for a vessel, fleet, counterparty, or trade lane. Covers beneficial ownership, port-call history, AIS gap and dark-fleet flags, ship-to-ship transfer indicators, flag-of-convenience patterns, and sanctions-list touchpoints. Includes a counterparty risk verdict and recommended due-diligence actions.',
  44900,
  'USD',
  '48h',
  false,
  true,
  '[
    {"name":"subject_type","label":"Subject","type":"select","required":true,"options":[
      {"value":"vessel","label":"Single vessel (IMO)"},
      {"value":"fleet","label":"Fleet / operator"},
      {"value":"counterparty","label":"Counterparty"},
      {"value":"corridor","label":"Trade lane / corridor"}
    ]},
    {"name":"subject","label":"Subject details (IMO, company, route)","type":"text","required":true,"placeholder":"e.g. IMO 9876543 / Acme Shipping / Hormuz crude exports"}
  ]'::jsonb,
  'published',
  true
)
on conflict (sku) do update set
  title             = excluded.title,
  short_description = excluded.short_description,
  full_description  = excluded.full_description,
  price_cents       = excluded.price_cents,
  delivery_type     = excluded.delivery_type,
  config_fields     = excluded.config_fields,
  status            = excluded.status,
  featured          = excluded.featured;

-- BU-100: Geopolitical Resilience Pack
insert into products (sku, category_id, title, slug, short_description, full_description, price_cents, currency, delivery_type, is_subscription, is_configurable, config_fields, status, featured)
values (
  'BU-100',
  (select id from categories where slug = 'bundles'),
  'Geopolitical Resilience Pack',
  'geopolitical-resilience-pack',
  'Integrated resilience analysis across your top exposed chokepoints, sanctions regimes, and counterparties.',
  'A board-ready resilience pack for executives carrying geopolitical exposure. Combines three Geopolitical Scenario Briefs, one Sanctions & Compliance Brief, one Vessels & Maritime Exposure Brief, and an integrated executive summary with a sequenced mitigation plan. Designed for risk committees, M&A diligence, and supply-chain leadership.',
  179900,
  'USD',
  '96h',
  false,
  true,
  '[
    {"name":"scenarios","label":"Top three exposures (chokepoints, sanctions regimes, regions)","type":"textarea","required":true,"placeholder":"e.g. Hormuz, Russia sanctions, Taiwan Strait"},
    {"name":"counterparty","label":"Key counterparty for vessel/maritime brief (optional)","type":"text","required":false}
  ]'::jsonb,
  'published',
  true
)
on conflict (sku) do update set
  title             = excluded.title,
  short_description = excluded.short_description,
  full_description  = excluded.full_description,
  price_cents       = excluded.price_cents,
  delivery_type     = excluded.delivery_type,
  config_fields     = excluded.config_fields,
  status            = excluded.status,
  featured          = excluded.featured;

-- CR-003: Sector Quarterly Outlook (annual, for chambers / EPAs / trade bodies)
insert into products (sku, category_id, title, slug, short_description, full_description, price_cents, currency, delivery_type, is_subscription, is_configurable, config_fields, status, featured)
values (
  'CR-003',
  (select id from categories where slug = 'custom-research'),
  'Sector Quarterly Outlook',
  'sector-quarterly-outlook',
  'Annual subscription: four quarterly sector outlooks for chambers, EPAs, and trade bodies, branded co-publication available.',
  'An annual programme of four quarterly sector outlooks (45-90 pages each) for chambers of commerce, export promotion agencies, and trade bodies. Each outlook covers global demand, top corridors, named opportunities, regulatory shifts, and member-relevant alerts. Co-branding and member distribution licence included.',
  600000,
  'USD',
  'custom',
  false,
  false,
  null,
  'published',
  false
)
on conflict (sku) do update set
  title             = excluded.title,
  short_description = excluded.short_description,
  full_description  = excluded.full_description,
  price_cents       = excluded.price_cents,
  delivery_type     = excluded.delivery_type,
  status            = excluded.status;

-- CR-004: Sponsored Reports for institutions (POA)
insert into products (sku, category_id, title, slug, short_description, full_description, price_cents, currency, delivery_type, is_subscription, is_configurable, config_fields, status, featured)
values (
  'CR-004',
  (select id from categories where slug = 'custom-research'),
  'Sponsored Reports',
  'sponsored-reports',
  'Institution-sponsored research reports: thought-leadership PDFs co-branded with your organisation, distributed to your audience.',
  'A sponsored research engagement for institutions: banks, law firms, consultancies, trade bodies, and government agencies. We co-design a thought-leadership report under joint branding, deliver it as a licensed PDF, and support distribution to your audience. Engagement scoped on request.',
  0,
  'USD',
  'custom',
  false,
  false,
  null,
  'published',
  false
)
on conflict (sku) do update set
  title             = excluded.title,
  short_description = excluded.short_description,
  full_description  = excluded.full_description,
  delivery_type     = excluded.delivery_type,
  status            = excluded.status;

commit;
