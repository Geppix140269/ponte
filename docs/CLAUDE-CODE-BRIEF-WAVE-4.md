# Claude Code Brief — Wave 4 Catalogue Restructure

**For:** Claude Code agent
**From:** Giuseppe Funaro (CEO, ICTTM)
**Date:** 2026-05-27
**Working folder:** `C:\Users\gfuna\OneDrive\Documents\GitHub\ponte`
(canonical repo; do NOT touch `C:\Users\gfuna\GitHub\ponte` which is stale)

---

## 0. Context

Ponte Trade is a Next.js / Supabase site selling research-grade trade
reports. Every Ponte report is curated by a senior analyst on top of
ADAMftd's underlying data. The current published catalogue (Wave 2)
has 17 active SKUs across 3 tiers. A cross-reference against the real
ADAMftd Market Research Report (sample: 47 pages, 21 sections, cert
prefix `ADAM-MR-`) and confirmation from the CEO about ADAMftd's other
modules has uncovered structural issues that Wave 4 fixes.

Existing docs to read first:
- `docs/DEV-BRIEF-V1.md` — original product direction (still authoritative)
- `docs/WAVE-2-SKU-MAPPING.md` — Wave 2 mapping (now superseded for the
  4 affected SKUs)
- `docs/WAVE-4-CATALOGUE-V2.md` — the proposal this brief operationalises

## 1. ADAMftd capability constraints (CEO-confirmed, 2026-05-27)

What ADAMftd actually delivers:

- **Market Research Report (`ADAM-MR-`)** — the main report type. 21
  sections. Configurable: HS code, Perspective (Buyer/Supplier),
  Scope (Worldwide/Country), Tier.
- **Sanctions module** — LOOKUP only. Checks named entities / vessels
  / ports against sanctions lists. Returns binary (sanctioned y/n +
  which list). NO mitigation playbook, NO secondary-sanctions
  narrative, NO strategic verdict.
- **Vessels & Ports module** — LOOKUP only. Same nature: screens a
  named vessel or port. NO AIS gap analysis, NO dark-fleet flags, NO
  port-call history, NO beneficial-ownership trace.
- **Company Intelligence** — NOT a separate module. ADAMftd's MR has
  "Top Suppliers" and "Top Buyers" sections showing named companies
  with shipment data, but no per-entity registry / ownership / adverse
  -media dossier.

**Implication:** Any Ponte SKU that promised vessel intelligence,
maritime exposure analysis, beneficial-ownership tracing, or a
full sanctions narrative cannot be delivered from ADAMftd alone. They
need either reframing (lighter scope using just the lookup), external
sourcing (MarineTraffic, Equasis, OpenCorporates, World-Check), or to
move to Tier C custom.

## 2. Wave 4 v2 catalogue — APPROVED, implement this

### Tier A — Analyst Extracts ($299-499, 48h)

Each SKU is an explicit extract of one or more sections of the
ADAMftd Market Research Report, hand-curated by a senior analyst.

| SKU | Title | Price | ADAMftd source | Status |
|---|---|---|---|---|
| MA-100 | Single Market Analysis Report (1 of 11 topics, configurable) | $299 | One MR section (10-21) | published |
| CT-002 | Tariff & Landed Cost Strategic Brief | $299 | MR section 12 + Ponte landed-cost calc | published |
| MR-004 | Trade Corridor Brief | $399 | MR sections 2-3 + Top Suppliers/Buyers for corridor | published |
| CI-003 | Buyer/Supplier Intelligence | $399 | MR sections 4 + 7 (named suppliers + named buyers) | published |
| GR-001 | Geopolitical Scenario Brief | $499 | MR section 11 + Ponte chokepoint overlay | published |
| GR-002 | Sanctions & Compliance Brief | $349 | ADAMftd Sanctions module (lookup) + Ponte analyst commentary | published |

GR-002 stays published. Reframe: "Counterparty sanctions screening
across OFAC/EU/UK/UN sanctions lists, with senior-analyst risk
commentary. Powered by lookup data; the analyst writes the narrative."

### Tier B — Strategic Reports ($1,099-1,799, 72-96h)

Full ADAMftd MR runs plus senior-analyst integration into board-ready
strategy.

| SKU | Title | Price | What's in it | Status |
|---|---|---|---|---|
| MR-001 | Single Country Market Report | $1,099 | Full ADAMftd MR (Scope=Country) + executive summary | published |
| MR-002 | Multi-Country Comparative Strategy | $1,599 | 3-5 country MRs + comparative ranking + entry recommendation | published |
| BU-001 | Market Entry Strategy | $1,799 | Single Country MR + Tariff & Landed Cost + Sales Strategy section + named-partner shortlist | published |

**MR-001 reprice $599 → $1,099 is the most material commercial
change.** Reasoning: ADAMftd MR is a 47-page artefact; market
comparables (Bloomberg, EIU) charge $2,000+ for similar.

### Tier C — White-glove / Custom (POA, unchanged)

| SKU | Title | Price | Status |
|---|---|---|---|
| CR-001 | Custom Research Brief | from $2,999 | published |
| CR-002 | Market Entry Consulting Engagement | from $4,999 | published |
| CR-003 | Sector Quarterly Outlook | from $6,000/yr | published |
| CR-004 | Sponsored Reports | POA | published |

### Killed (set status = 'archived' in Supabase, remove from `lib/catalogue.ts`)

| SKU | Reason |
|---|---|
| BU-005 Full Market Intelligence | Duplicates MR-001 (same ADAMftd MR output for one country) |
| VM-001 Vessels & Maritime Exposure Brief | ADAMftd Vessels module is lookup-only, cannot deliver full brief as scoped |
| CI-001 Company Deep-Dive | ADAMftd has no Company Intelligence module; cannot deliver registry + ownership dossier |
| BU-100 Geopolitical Resilience Pack | Composed of GR-002 + VM-001; with VM-001 killed, the pack loses coherence |

### Summary of changes

| Tier | Wave 2 | Wave 4 | Delta |
|---|---|---|---|
| Tier A | 9 | 6 | −3 (CI-001 killed, VM-001 killed, MR-001 moved up) |
| Tier B | 4 | 3 | −1 (BU-005 killed) |
| Tier C | 4 | 4 | unchanged |
| BU-100 (pack) | 1 | 0 | killed |
| **Active total** | **17** | **13** | **−4** |

## 3. Implementation tasks

### Task 1 — Write the SQL migration

Create `supabase/migrations/20260527_wave4_catalogue.sql` with:

```sql
-- Wave 4 catalogue restructure (2026-05-27)
-- See docs/WAVE-4-CATALOGUE-V2.md for full rationale.

begin;

-- Archive killed SKUs
update products set status = 'archived', featured = false
where sku in ('BU-005', 'VM-001', 'CI-001', 'BU-100');

-- MR-001: reprice $599 → $1,099 (move conceptually to Tier B)
update products set
  price_cents = 109900,
  short_description = 'Full ADAMftd-powered single-country market report, senior-analyst integrated, board-ready.',
  full_description = 'A complete 40+ page market intelligence report for one product (by HS code) in one country, with senior-analyst executive summary integrating market structure, supplier landscape, demand, pricing, regulatory and risk into a board-ready narrative.'
where sku = 'MR-001';

-- MR-002: Multi-Country Comparative Strategy at $1,599 / 96h
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

-- BU-001: reprice $1,099 → $1,799 (now sits between MR-002 and Tier C)
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

-- Drop "featured" flag from any archived row (defensive)
update products set featured = false where status = 'archived';

commit;
```

Do not run the migration. The CEO will paste it into Supabase SQL editor.

### Task 2 — Update `lib/catalogue.ts` (static fallback)

Mirror the SQL above in `lib/catalogue.ts`:

- Remove BU-005, VM-001, CI-001, BU-100 from the PRODUCTS array entirely
- Update MR-001: priceCents 59900 → 109900, refreshed copy
- Update MR-002: title, slug, copy, configFields, priceCents 159900, deliveryType '96h'
- Update BU-001: priceCents 179900, refreshed copy
- Update GR-002: refreshed copy

Confirm the resulting PRODUCTS array has 13 entries.

### Task 3 — Find any hardcoded slug references that broke

Grep the repo for the slugs of removed SKUs:

```
full-market-intelligence
vessels-maritime-exposure
company-deep-dive
geopolitical-resilience-pack
```

Any reference in `app/` or `components/` needs to be removed or
redirected. Most likely sites: homepage useCases section, related
products, footer links.

Also grep for the old MR-002 slug `global-market-strategy` — it
becomes `multi-country-comparative-strategy`. Update or redirect.

### Task 4 — Run a typecheck

After all changes:

```powershell
cd C:\Users\gfuna\OneDrive\Documents\GitHub\ponte
npx --yes tsc --noEmit
```

Zero errors expected.

### Task 5 — Present the diff to the CEO before commit

Do NOT auto-commit. The CEO commits via GitHub Desktop after reviewing.
Suggested commit message:

```
Wave 4 catalogue restructure: align with verified ADAMftd capabilities

- Kill BU-005 Full Market Intelligence (duplicates MR-001)
- Kill VM-001 Vessels & Maritime (ADAMftd Vessels is lookup-only)
- Kill CI-001 Company Deep-Dive (no ADAMftd Company Intelligence)
- Kill BU-100 Geopolitical Resilience Pack (depended on VM-001)
- MR-001 reprice $599 -> $1,099 (full MR artefact, board-ready)
- MR-002 reframe as Multi-Country Comparative Strategy ($1,599 / 96h)
- BU-001 reprice $1,099 -> $1,799 (now top-of-Tier-B)
- GR-002 reframed as lookup-powered sanctions brief (price unchanged)

Net: 17 active SKUs -> 13. See docs/WAVE-4-CATALOGUE-V2.md.
```

## 4. Acceptance criteria

After the CEO runs the SQL migration in Supabase and pushes the code changes:

- [ ] 13 published SKUs on `/catalogue` (count visible top-left)
- [ ] `/product/full-market-intelligence` → 404
- [ ] `/product/vessels-maritime-exposure` → 404
- [ ] `/product/company-deep-dive` → 404
- [ ] `/product/geopolitical-resilience-pack` → 404
- [ ] `/product/single-country-market-report` shows $1,099
- [ ] `/product/multi-country-comparative-strategy` shows $1,599
- [ ] `/product/market-entry-strategy` shows $1,799
- [ ] `/product/sanctions-compliance-brief` (slug unchanged) shows new copy mentioning OFAC/EU/UK/UN lists
- [ ] Homepage useCases CTA links resolve (no broken /product/ refs)
- [ ] Netlify build green
- [ ] Telegram ops alert still fires on a test order (regression check)

## 5. Out of scope for Wave 4

- HS code search data import (separate workstream, blocked on Windows
  + OneDrive permission issues during `npm install`)
- PDF cover page changes (Wave 3 already shipped, signed off)
- Stripe manual capture (Wave 3 already shipped)
- Admin /orders enhancements
- Email template overhauls
- Any new SKU additions

## 6. If anything is ambiguous

The CEO is the only decision-maker. Don't make pricing or copy
decisions on your own — ask. Specifically:

- Reframe wording for GR-002 (proposed above, confirm or rewrite)
- Slug strategy: kept all unchanged in the proposal. Confirm.
- MR-001 reprice: $599 → $1,099. CEO already approved in principle;
  confirm before commit.
- Whether to add a transitional 301 redirect from old slugs to new
  ones, or just let killed slugs 404.

End of brief.
