-- Ponte Trade — Wave 2 follow-up: populate `includes` field
-- The initial Wave 2 migration (20260526_catalogue_restructure.sql) didn't
-- touch the includes column, leaving the "What's included" box empty on the
-- product page for the 5 new SKUs and any renamed SKU whose old includes
-- list no longer matched the new title. This populates includes for all 17
-- active SKUs to match the static fallback in lib/catalogue.ts.

update products set includes = '["Senior analyst curation","One topic, one product, one country","Methodology appendix","Source citations","Single-organisation licence"]'::jsonb where sku = 'MA-100';

update products set includes = '["Sanctions screen across OFAC, EU, UK, UN","Secondary-sanctions risk assessment","Counterparty / jurisdiction view","Mitigation playbook","Single-organisation licence"]'::jsonb where sku = 'GR-002';

update products set includes = '["Tariff classification check","Landed-cost build-up","FTA / preferential routing options","Mitigation matrix with savings ranges","Single-organisation licence"]'::jsonb where sku = 'CT-002';

update products set includes = '["Corridor volumes and values","Seasonality patterns","Named shippers and routes","Methodology appendix","Single-organisation licence"]'::jsonb where sku = 'MR-004';

update products set includes = '["Top-25 ranked shortlist","Verified contact details","Trade volumes per counterparty","Counterparty risk flags","Single-organisation licence"]'::jsonb where sku = 'CI-003';

update products set includes = '["Beneficial ownership trace","Port-call history","AIS gap / dark-fleet flags","Sanctions-list touchpoints","Counterparty risk verdict"]'::jsonb where sku = 'VM-001';

update products set includes = '["Named chokepoint / scenario analysis","Trade flows at risk","Plausible escalation paths","Mitigation playbook","Single-organisation licence"]'::jsonb where sku = 'GR-001';

update products set includes = '["Corporate registry data","Beneficial ownership and group structure","Full import / export footprint","Sanctions + adverse-media screening","Counterparty risk verdict"]'::jsonb where sku = 'CI-001';

update products set includes = '["Demand and import analysis","Pricing and competitive landscape","Key trade partners","Methodology appendix","Single-organisation licence"]'::jsonb where sku = 'MR-001';

update products set includes = '["Market sizing and demand","Competitive landscape","Entry barriers and certifications","Packaging, labelling, tariffs","Go-to-market sequence with named partners","Executive summary"]'::jsonb where sku = 'BU-001';

update products set includes = '["Global demand and growth","Top-priority markets ranked","Comparative entry analysis (top 5)","Corridor-level pricing","Year 1 to year 3 rollout plan"]'::jsonb where sku = 'MR-002';

update products set includes = '["Three Geopolitical Scenario Briefs","One Sanctions & Compliance Brief","One Vessels & Maritime Exposure Brief","Integrated executive summary","Sequenced mitigation plan"]'::jsonb where sku = 'BU-100';

update products set includes = '["All 11 market-analysis modules","Single Country Market Report","Integrated executive summary","Methodology appendix","Board-ready format"]'::jsonb where sku = 'BU-005';

update products set includes = '["Scoped to your specific question","Manual quote inside 48 hours","Senior-analyst delivery","Methodology and citations","Single-organisation licence"]'::jsonb where sku = 'CR-001';

update products set includes = '["Named senior partner","Discovery and scoping","Market analysis and entry strategy","Partner identification","Regulatory readiness","Sequenced GTM plan"]'::jsonb where sku = 'CR-002';

update products set includes = '["Four quarterly outlooks per year","45-90 pages each","Co-branded with your organisation","Member distribution licence","Named-sector focus"]'::jsonb where sku = 'CR-003';

update products set includes = '["Co-designed scope","Joint branding","Licensed PDF delivery","Distribution support","Scoped on request"]'::jsonb where sku = 'CR-004';
