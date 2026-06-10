# Claude Code Brief — Wave 5: ADAMftd Catalogue Expansion + SEO

**For:** Claude Code agent
**From:** Giuseppe Funaro (CEO, ICTTM)
**Date:** 2026-06-10
**Working folder:** `C:\Users\gfuna\OneDrive\Documents\GitHub\ponte`
(canonical repo — do `git pull` before starting, there are new commits)

---

## 0. What happened in Wave 5 (already done — do not redo)

This session added 13 new ADAMftd-powered products, rebuilt the
catalogue, fixed SEO, and wrote the Supabase migration.

### Code already pushed to main

- `lib/catalogue.ts` — 20 active SKUs (was 8). Two new categories added
  (`compliance-screening`, `tenders`). Co-branding badge on all products.
- `lib/catalogue-db.ts` — `mapRow()` now maps `cobrandable` field.
- `lib/types.ts` — `cobrandable?: boolean` added to Product interface.
- `components/SiteHeader.tsx` — "Pricing" added to nav.
- `components/ProductCard.tsx` — "Your branding" badge on cobrandable products.
- `app/product/[slug]/page.tsx` — Co-branding callout box + BreadcrumbList JSON-LD.
- `app/category/[slug]/page.tsx` — BreadcrumbList JSON-LD.
- `app/sitemap.ts` — All new pages included.
- `app/pricing/page.tsx` — New pricing page (NEW FILE).
- `app/learn/trade-data/page.tsx` — Educational SEO page with FAQPage JSON-LD (NEW FILE).
- `app/learn/duties/page.tsx` — Educational SEO page with FAQPage JSON-LD (NEW FILE).
- `supabase/migrations/20260610_adamftd_catalogue.sql` — Wave 5 migration (NEW FILE).

### Supabase migration — CEO has already run this

`supabase/migrations/20260610_adamftd_catalogue.sql` has been run in
the Supabase SQL editor (had to use `SET row_security = off` at the top).
The live database now reflects the new catalogue.

---

## 1. Current catalogue — 20 active SKUs

After Wave 5, the live Supabase products table has these published SKUs:

### Legacy (USD pricing, unchanged from Wave 4)
| SKU | Title | Price |
|---|---|---|
| MA-100 | Single Market Analysis Report | $299 |
| GR-002 | Sanctions & Compliance Brief | $349 |
| CT-002 | Tariff & Landed Cost Analysis | $299 |
| MR-004 | Trade Corridor Report | $399 |
| CI-003 | Buyer/Supplier Intelligence | from $2,000 |
| MR-001 | Single Country Market Report | $1,099 |
| MR-002 | Multi-Country Comparative Analysis | $1,599 |
| CR-003 | Sector Quarterly Outlook | from $6,000/yr |

### New ADAMftd-powered (GBP pricing)
| SKU | Title | Price | Category |
|---|---|---|---|
| MA-200 | AI Market Snapshot Report | £299 | analysis |
| MA-300 | Complete Market Analysis Suite | £899 | analysis |
| CT-001 | Country Trade Profile Report | £249 | country-tariff |
| CT-003 | FTA Routing Analysis | £499 | country-tariff |
| CS-002 | Trade Company Deep Profile | £349 | company-supplier |
| GR-003 | Hormuz Oil Shock Scenario Report | £599 | geopolitical |
| GR-004 | Supply Chain Risk Assessment | £899 | geopolitical |
| CP-001 | Counterparty Screening Package | £199 | compliance-screening |
| TI-001 | Government Tender Intelligence Brief | £399 | tenders |
| TI-002 | Weekly Tender Digest | £79/mo | tenders |
| BU-002 | Trade Intelligence Pack | £799 | bundles |
| BU-004 | Compliance Essentials Pack | £749 | bundles |

### Archived (do not resurrect without CEO approval)
BU-001, CR-001, CR-002, CR-004 archived in Wave 5.
BU-003, BU-005, VM-001, CI-001, BU-100, GR-001 archived in earlier waves.

---

## 2. What still needs building

### Priority 1 — Product pages for new GBP SKUs

The new SKUs have data in Supabase and entries in `lib/catalogue.ts`
but their `/product/[slug]` pages render via the existing dynamic route
`app/product/[slug]/page.tsx` — that should work already. 

**CHECK FIRST:** Visit these URLs on the live site and confirm they render:
- `/product/ai-market-snapshot-report`
- `/product/country-trade-profile-report`
- `/product/counterparty-screening-package`
- `/product/weekly-tender-digest`
- `/product/trade-intelligence-pack`

If any 404, the issue is either the slug not matching the DB row or
`getAllProducts()` not returning the row (check `status = 'published'`).

### Priority 2 — Category pages for new categories

Two new category slugs exist in the DB: `compliance-screening` and
`tenders`. The dynamic route `app/category/[slug]/page.tsx` should
handle them. Verify:
- `/category/compliance-screening` renders with CP-001
- `/category/tenders` renders with TI-001 and TI-002

Also check that the catalogue page (`/catalogue`) shows all 20 products
grouped by category.

### Priority 3 — Pricing page review

`app/pricing/page.tsx` was added but may have stale SKU references
(the pricing page was written before some products were renamed/removed).
Read the file and cross-check every `href="/product/..."` against the
current slug list above. Fix any broken links.

### Priority 4 — `/tools/duties` and `/tools/search` (CLAUDE.md spec)

These are in scope per the CLAUDE.md project instructions (Section 4
and 5) but were not built in Wave 5. Build them next:

- `/tools/duties` — Free duty calculator. No auth, no credits.
  See CLAUDE.md Section 4 for full spec.
- `/tools/search` — Trade data search. Blurred for anon, full for
  authed users. See CLAUDE.md Section 5 for full spec.

Supabase Auth tables are already configured. Use the existing Supabase
client in `lib/supabase/`.

### Priority 5 — Auth pages (`/auth/login`, `/auth/signup`, `/auth/callback`)

Not built yet. Spec is in CLAUDE.md Section 12. Simple email/password
with Supabase Auth. Welcome email via Resend on signup.

### Priority 6 — Dashboard (`/dashboard`, `/dashboard/reports`)

Not built yet. Spec is in CLAUDE.md Section 6. Shows credit balance,
saved calculations, report history.

---

## 3. Known issues to fix

### GBP/USD display
The product pages currently display prices as `$299` regardless of
currency. The `Product` type has a `currency` field (`'USD' | 'GBP'`).
Update the price display component to show `£` for GBP products.
Look for the price formatting in `app/product/[slug]/page.tsx` and
`components/ProductCard.tsx`.

### MR-001 currency
MR-001 was changed to `currency: GBP` in `lib/catalogue.ts` during
Wave 5. But the DB may still have `currency = 'USD'` for MR-001.
Check: if the live site shows `$1,099` for MR-001 after the Wave 5
migration, update the DB:
```sql
UPDATE products SET currency = 'GBP' WHERE sku = 'MR-001';
```
Or confirm with the CEO which currency MR-001 should use.

### Slugs after MR-002 rename
MR-002 was renamed from `multi-country-comparative-strategy` to
`multi-country-comparative-analysis` in Wave 5. If any page has a
hardcoded link to the old slug, fix it. Run:
```bash
grep -r 'multi-country-comparative-strategy' app/ components/
```

### CT-002 rename
CT-002 slug changed from `tariff-landed-cost-strategic-brief` to
`tariff-landed-cost-analysis`. Same check:
```bash
grep -r 'tariff-landed-cost-strategic-brief' app/ components/
```

---

## 4. Technical context

### Stack
Next.js 14 App Router, TypeScript, Tailwind CSS, Supabase, Stripe,
Resend, Netlify.

### Data layer
- `lib/catalogue-db.ts` — async accessors. Read from Supabase when
  configured, fall back to `lib/catalogue.ts` static array on error.
- `lib/catalogue.ts` — static fallback only. Keep in sync with DB.
- Environment: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
  `SUPABASE_SERVICE_ROLE_KEY` are set in Netlify.

### Supabase project
URL: `cptglsmjmzcfpjndqfmc.supabase.co`

### Key DB columns added in Wave 5
- `products.cobrandable` (boolean, default false) — set true on all
  published non-subscription products by the Wave 5 migration.

### Brand palette
- Primary dark: `#0A1628` (navy)
- Steel blue: `#1A3A5C`
- Accent/gold: `#E8A020`
- Background: `#EEF3F8`
- Typography: Inter

### Business rules (never break these)
1. Duty calculator (`/tools/duties`) is ALWAYS free and public — no auth gate.
2. Educational pages (`/learn/*`) are ALWAYS free and public — no auth gate.
3. Never break the existing Stripe checkout for PDF reports.
4. No subscription language — use "bundle" or "top-up".
5. Market Reports require exactly one HS code — validate form + API.

---

## 5. File conventions for new pages

```
/app/tools/duties/page.tsx       — duty calculator
/app/tools/search/page.tsx       — trade data search
/app/auth/login/page.tsx         — login
/app/auth/signup/page.tsx        — signup
/app/auth/callback/page.tsx      — Supabase OAuth callback
/app/dashboard/page.tsx          — user dashboard
/app/dashboard/reports/page.tsx  — report history

/components/tools/DutyCalculator.tsx
/components/tools/SearchForm.tsx
/components/tools/HSCodeInput.tsx
/components/tools/CountrySelect.tsx
```

---

## 6. CEO preferences (important)

- No em dashes in copy (use plain hyphen or rewrite).
- No "strategy" language in product titles — use "analysis" or
  "recommendations".
- All product descriptions must cite "7 billion+ verified trade records"
  or ADAMftd as the data source.
- Co-branding ("Available with your company branding") must appear on
  every product page — this is a key commercial differentiator.
- Do NOT run migrations via CLI. Write SQL file, CEO pastes into
  Supabase SQL editor. Include `SET row_security = off;` inside
  `begin;` block.
- Do NOT auto-commit. Present diffs, CEO reviews and commits via
  GitHub Desktop.

---

## 7. Acceptance checklist before handover back to CEO

- [ ] All 20 product slugs resolve on live site (no 404s)
- [ ] `/category/compliance-screening` and `/category/tenders` render
- [ ] GBP products show `£` not `$`
- [ ] `/pricing` has no broken product links
- [ ] `npx tsc --noEmit` passes with zero errors
- [ ] Netlify build green

