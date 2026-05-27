-- Wave 4 catalogue restructure (2026-05-27)
-- See docs/WAVE-4-CATALOGUE-V2.md for full rationale.
-- CEO to paste into Supabase SQL editor. Do not run via CLI.

begin;

-- Archive killed SKUs
update products set status = 'archived', featured = false
where sku in ('BU-005', 'VM-001', 'CI-001', 'BU-100');

-- MR-001: reprice $599 → $1,099 (moves to Tier B — full ADAMftd MR, board-ready)
update products set
  price_cents = 109900,
  short_description = 'Full ADAMftd-powered single-country market report, senior-analyst integrated, board-ready.',
  full_description = 'A complete 40+ page market intelligence report for one product (by HS code) in one country, with senior-analyst executive summary integrating market structure, supplier landscape, demand, pricing, regulatory and risk into a board-ready narrative.'
where sku = 'MR-001';

-- MR-002: reframe as Multi-Country Comparative Strategy ($1,599 / 96h)
update products set
  title = 'Multi-Country Comparative Strategy',
  slug = 'multi-country-comparative-strategy',
  short_description = 'Comparative entry-readiness analysis across 3-5 target countries for one product. Ranked recommendation.',
  full_description = 'A senior-analyst comparative report covering 3-5 target countries for one product. Each country gets the relevant ADAMftd MR sections (market size, demand, competition, tariffs, regulatory), then we rank them on entry difficulty, market opportunity and corridor pricing. Concludes with a ranked entry recommendation. Board-ready.',
  price_cents = 159900,
  delivery_type = '96h',
  status = 'published',
  config_fields = '[
    {"name":"hs_code","label":"HS Code","type":"text","required":true,"placeholder":"e.g. 0902.10"},
    {"name":"countries","label":"3-5 target countries (comma-separated)","type":"textarea","required":true,"placeholder":"e.g. Germany, France, Italy, Spain, Poland"}
  ]'::jsonb
where sku = 'MR-002';

-- BU-001: reprice $1,099 → $1,799 (top of Tier B)
update products set
  price_cents = 179900,
  short_description = 'Integrated single-country market entry strategy: Country MR + tariff calc + sales strategy + named partners.',
  full_description = 'A senior-analyst-integrated narrative for one product entering one country. Combines the Single Country Market Report, a Tariff & Landed Cost calculation, the Accessing the Market sales strategy section, and a shortlist of named potential partners. Board-ready.'
where sku = 'BU-001';

-- GR-002: reframe as lookup-powered sanctions brief (price unchanged, copy refreshed)
update products set
  short_description = 'Counterparty sanctions screening across OFAC, EU, UK and UN sanctions lists, with senior-analyst risk commentary.',
  full_description = 'A senior-analyst brief built on ADAMftd''s sanctions-screening data. We run your named counterparty (or vessel, port, jurisdiction) against OFAC, EU, UK and UN sanctions lists, then a senior analyst writes the risk commentary: applicable sanctions regimes, secondary-sanctions exposure, designated-entity overlap, and a mitigation playbook.',
  status = 'published'
where sku = 'GR-002';

-- Defensive: clear featured flag from any archived row
update products set featured = false where status = 'archived';

commit;
