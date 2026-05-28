-- Wave 4 product copy rewrite — Ponte voice (2026-05-28)
-- Rewrites short_description, full_description, and the includes (jsonb)
-- array for all 13 active SKUs in a problem-first, result-led voice.
--
-- Voice rules:
--   * Open with the DECISION the buyer is making, not the SKU
--   * Each includes[] bullet names a concrete section of the deliverable
--   * No ADAMftd brand references in customer-facing copy
--   * Always close with the "single-organisation licensed PDF" statement
--
-- CEO to paste into Supabase SQL editor. Do not run via CLI.

begin;

-- ============================================================ Tier A

-- MA-100 Single Market Analysis Report
update products set
  short_description = 'One question, one market: get a senior-analyst answer on a single dimension of your target country.',
  full_description = 'You''ve got the country and the product. You need to understand one specific dimension before you commit. Pick from eleven topics — retail landscape, demand, consumer preferences, certifications, entry barriers, and seven more. A senior analyst delivers a focused brief on that single dimension for your HS code and target country. One PDF in 48 hours.',
  includes = '["Analyst-written brief on your selected topic","Data-backed findings with full source citations","Methodology appendix","Single-organisation licensed PDF"]'::jsonb
where sku = 'MA-100';

-- GR-002 Sanctions & Compliance Brief
update products set
  short_description = 'Can you legally trade with this counterparty? OFAC, EU, UK, UN screening with senior-analyst commentary.',
  full_description = 'Before you ship — or before you sign — confirm that your counterparty (or jurisdiction, or corridor) is clear. We screen against OFAC, EU, UK and UN sanctions lists, then a senior analyst writes the risk commentary: applicable sanctions regimes, secondary-sanctions exposure, designated-entity overlap, and what to do about it.',
  includes = '["Sanctions screen across OFAC, EU, UK and UN lists","Secondary-sanctions exposure analysis","Designated-entity overlap check","Senior-analyst risk commentary","Mitigation playbook","Single-organisation licensed PDF"]'::jsonb
where sku = 'GR-002';

-- CT-002 Tariff & Landed Cost Strategic Brief
update products set
  short_description = 'Will this product be profitable after duty? Your landed cost — and the cheapest legal route in.',
  full_description = 'Pick one HS code and one origin-destination corridor. A senior trade-customs analyst delivers a licensed PDF covering HS classification, MFN rate, FTA preferential rate with origin-rule analysis, ADD/CVD/safeguard exposure, full landed-cost build-up, and a mitigation matrix with quantified savings ranges. One defensible number. One playbook for how to bring it down.',
  includes = '["HS classification check","Duty rate landscape: MFN, FTA, ADD, CVD, Section 301","Landed-cost build-up: duty + VAT + fees + freight","Mitigation matrix with quantified savings ranges","Forward-planning commentary on announced rate changes","Single-organisation licensed PDF"]'::jsonb
where sku = 'CT-002';

-- MR-004 Trade Corridor Report
update products set
  short_description = 'What''s actually flowing on this corridor? Volumes, prices, operators, ports — for one HS code.',
  full_description = 'You''re pricing a lane, scouting competitors on a corridor, or underwriting trade finance against a route. MR-004 maps the corridor for one HS code: 5-year volume and value trend, unit prices CIF/FOB, top shipping operators, leading ports of loading and discharge, seasonal flow patterns. Cross-checked against UN Comtrade, Eurostat and EU Taxud.',
  includes = '["5-year corridor volume and value trend","Unit price analysis (CIF, FOB where derivable)","Top shipping operators and routes","Leading ports of loading and discharge","Seasonal flow patterns","Single-organisation licensed PDF"]'::jsonb
where sku = 'MR-004';

-- CI-003 Buyer/Supplier Intelligence
update products set
  short_description = 'Who should you sell to — or source from? Ranked, contactable shortlist for your HS code.',
  full_description = 'You''re entering a new market and need buyers, or you''re diversifying sourcing and need suppliers. A senior analyst curates a ranked shortlist for your HS code from transaction-level customs data: company names, countries, estimated annual volumes, verified contact details (Top 100+), and counterparty risk flags. Choose your pack size: Top 50 ($2,000), Top 100 ($3,000), Top 200 ($5,000), or Top 500 ($11,000).',
  includes = '["Ranked counterparty shortlist by trade volume","Company name, country, estimated annual volumes","Verified contact details where available (Top 100+)","Counterparty sanctions risk flags","Methodology and full source citations","Single-organisation licensed PDF"]'::jsonb
where sku = 'CI-003';

-- GR-001 Geopolitical Scenario Brief
update products set
  short_description = 'What''s your exposure if Hormuz closes? Scenario analysis, quantified, with a mitigation playbook.',
  full_description = 'Before the next chokepoint event, know your exposure. Pick a scenario — Hormuz, Suez, Red Sea, Taiwan, Panama, Russia/Ukraine corridors, or specify your own. A senior analyst models trade flows at risk, plausible escalation paths, exposed sectors and corridors, and a mitigation playbook for your specific HS-code exposure.',
  includes = '["Named chokepoint or scenario analysis","Trade flows at risk: base, moderate, severe cases","Plausible escalation paths","Sector and corridor exposure mapping","Mitigation playbook","Single-organisation licensed PDF"]'::jsonb
where sku = 'GR-001';

-- ============================================================ Tier B

-- MR-001 Single Country Market Report
update products set
  short_description = 'Should you enter this country with this product? One 40+ page board-ready answer.',
  full_description = 'You''ve shortlisted a country. Now you need to commit — or walk away. MR-001 gives you the integrated read. Pick one HS code and one country; a senior analyst produces a 40+ page board-ready narrative covering market structure, supplier landscape, demand, pricing, regulatory environment, and risk. One PDF. One decision.',
  includes = '["Market structure and competitive landscape","Demand and import analysis","Supplier landscape with named players","Pricing and unit-value benchmarks","Regulatory environment and risk overview","Senior-analyst executive summary integrating all of the above","40+ page licensed PDF, single-organisation licence"]'::jsonb
where sku = 'MR-001';

-- BU-001 Market Entry Strategy
update products set
  short_description = 'Not just the market read — the go-to-market plan, with named partners. Top of Tier B.',
  full_description = 'MR-001 tells you whether to enter. BU-001 tells you how. Pick one HS code and one country; a senior analyst integrates the full Country Market Report with a Tariff & Landed Cost calculation, the Accessing-the-Market sales-strategy section, and a shortlist of named potential partners. One board-ready playbook covering the market, the cost base, the route to market, and who to talk to.',
  includes = '["Full Single Country Market Report","Tariff & landed cost calculation","Accessing-the-market: sales strategy section","Named potential partner shortlist","Integrated executive summary","Single-organisation licensed PDF"]'::jsonb
where sku = 'BU-001';

-- MR-002 Multi-Country Comparative Strategy
update products set
  short_description = 'Three to five candidate countries. One product. One ranked entry recommendation.',
  full_description = 'You''ve narrowed the field to 3-5 target countries for one product but you don''t know which to pick. MR-002 puts them side by side: market size, demand, competition, tariffs, and regulatory environment per country, then ranks them on entry difficulty and opportunity. Closes with a ranked recommendation. The board-ready briefing for the country-selection decision.',
  includes = '["Per-country market size and demand analysis","Tariff and regulatory comparison matrix","Competitive landscape per country","Entry-readiness ranking across all countries","Ranked entry recommendation with rationale","Single-organisation licensed PDF"]'::jsonb
where sku = 'MR-002';

-- ============================================================ Tier C

-- CR-001 Custom Research Brief
update products set
  short_description = 'Your question doesn''t fit a standard SKU? Tell us the decision; we scope it within 48 hours.',
  full_description = 'Some questions don''t fit a product page. Tell us the decision you''re trying to make and we''ll come back inside 48 hours with a scoped brief — deliverables, timeline, price. Typical engagements run $2,999 to $9,999. Once you approve, a senior analyst produces a bespoke licensed PDF answering exactly your question.',
  includes = '["Scoped to your specific question","Quote inside 48 hours","Bespoke senior-analyst delivery","Methodology and full source citations","Single-organisation licensed PDF"]'::jsonb
where sku = 'CR-001';

-- CR-002 Market Entry Consulting Engagement
update products set
  short_description = 'Multi-week, multi-deliverable consulting engagement led by a named senior partner.',
  full_description = 'When a single brief isn''t enough — when you need scoping, market analysis, partner identification, regulatory readiness, and a sequenced go-to-market plan delivered over weeks, not days — CR-002 is the engagement. A named senior partner leads a 4-8 week programme with weekly check-ins. Typical engagements $4,999 to $24,999.',
  includes = '["Named senior partner leading the engagement","Discovery and scoping phase","Market analysis and entry strategy","Partner identification and outreach","Regulatory readiness assessment","Sequenced go-to-market plan","Weekly check-ins"]'::jsonb
where sku = 'CR-002';

-- CR-003 Sector Quarterly Outlook
update products set
  short_description = 'Annual programme of four quarterly sector outlooks for chambers, EPAs, and trade bodies. Co-branding available.',
  full_description = 'Built for chambers of commerce, export promotion agencies, and trade bodies that need to brief members quarterly on sector trends. Four quarterly outlooks per year (45-90 pages each) covering global demand, top corridors, named opportunities, regulatory shifts, and member-relevant alerts. Co-branded with your organisation; full member distribution licence included.',
  includes = '["Four quarterly outlooks per year","45-90 pages per quarter","Co-branded with your organisation","Member distribution licence","Named-sector focus matched to your members","Sector trends, risks, pricing and regulatory updates"]'::jsonb
where sku = 'CR-003';

-- CR-004 Sponsored Reports
update products set
  short_description = 'Institutional thought-leadership PDFs, co-designed and co-branded with your organisation.',
  full_description = 'For banks, law firms, consultancies, trade bodies, and government agencies that want to publish a piece of thought leadership under joint branding. We co-design the scope, deliver the licensed PDF, and support distribution to your audience. Engagement scoped on request.',
  includes = '["Co-designed scope with your team","Joint branding","Senior-analyst research and curation","Licensed PDF deliverable","Distribution support to your audience"]'::jsonb
where sku = 'CR-004';

commit;
