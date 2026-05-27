# Wave 4 — Catalogue v2 Proposal

**Date:** 2026-05-27
**Status:** Proposal pending CEO approval. Nothing implemented yet.
**Trigger:** Cross-reference of Wave-2 catalogue against actual ADAMftd MR
output (sample: `ADAMftd-Report-Fresh-apples-ADAM-MR-PL9F-VEYW.pdf`,
47 pages, 21 sections).

## What changed in our understanding

The ADAMftd "Market Research Report" (cert prefix `ADAM-MR-`) is a single
configurable artefact:

- HS code, Perspective (Buyer/Supplier), Scope (Worldwide/Country), Tier
- 21 sections covering market overview, suppliers, buyers, ports, trends,
  pricing, sentiment, risk, tariffs, sales strategy, retail, regulatory,
  health/safety, IP, events, outlook, recommendations.

**This single artefact already contains everything Wave-2 v1 priced as 6
separate Tier A SKUs and 1 Tier B SKU.** The differentiator between Ponte
SKUs is the analyst extraction, curation and commentary, not the
underlying data.

## Problems Wave 4 fixes

**P1 — Triple overlap on the same artefact**
MR-001 ($599), MR-002 ($1,599), BU-005 ($1,999) all deliver one ADAMftd
MR run with different scope or framing. Buyer comparing the three sees
the same underlying PDF at 3 price points.

**P2 — Three SKUs whose underlying ADAMftd capability is unverified**
GR-002 (Sanctions), VM-001 (Vessels), CI-001 (Company Deep-Dive) are
priced and live but the ADAMftd MR sample does not show these as
deliverable modules. They may exist as separate ADAMftd modules — needs
verification with ADAMftd.

**P3 — BU-100 (Geopolitical Resilience Pack) depends on P2**
The pack composes GR-001 + GR-002 + VM-001. If GR-002 and VM-001 aren't
deliverable, BU-100 isn't either.

## Proposed v2 catalogue — 12 active SKUs across 3 tiers

### Tier A — Analyst Extracts ($299-499, 48h)

Explicit single-section extracts of the ADAMftd Market Research Report,
hand-picked and curated by a senior analyst with commentary on the
customer's specific decision context.

| SKU | Title | Price | ADAMftd source |
|---|---|---|---|
| MA-100 | Single Market Analysis Report (1 of 11 topics, configurable) | $299 | One MR section |
| CT-002 | Tariff & Landed Cost Strategic Brief | $299 | Section 12 + Ponte landed-cost calc |
| MR-004 | Trade Corridor Brief | $399 | Sections 2-3 + Top Suppliers/Buyers for corridor |
| CI-003 | Buyer/Supplier Intelligence | $399 | Sections 4 + 7 (named suppliers + named buyers) |
| GR-001 | Geopolitical Scenario Brief | $499 | Section 11 + Ponte chokepoint overlay |

**Net:** 5 SKUs (was 9). All explicitly subset-of-MR.

### Tier B — Strategic Reports ($1,099-1,799, 72-96h)

Full ADAMftd MR runs plus senior-analyst integration into board-ready
strategy. The MR is the substrate, the integration is the value.

| SKU | Title | Price | What's in it |
|---|---|---|---|
| MR-001 | Single Country Market Report | $1,099 | Full ADAMftd MR (Scope=Country) + executive summary + senior-analyst integration |
| MR-002 | Multi-Country Comparative Strategy | $1,599 | 3-5 country MRs + comparative ranking + entry recommendation |
| BU-001 | Market Entry Strategy | $1,799 | Single Country MR + Tariff & Landed Cost calc + Sales Strategy section + named-partner shortlist |

**Net:** 3 SKUs (was 4). MR-001 moves UP from $599 to $1,099 because
it's the full MR, not just a section. BU-005 (Full Market Intelligence)
is dropped — it duplicates MR-001.

Note on MR-001 reprice: this is the most significant pricing change.
The reasoning: ADAMftd MR delivers a real 47-page artefact that
competitors like Bloomberg or EIU charge $2,000+ for. $599 was
underpriced for the artefact; $1,099 reflects the senior-analyst
delivery and the actual artefact value.

### Tier C — White-glove / Custom (POA, unchanged)

| SKU | Title | Price |
|---|---|---|
| CR-001 | Custom Research Brief | from $2,999 |
| CR-002 | Market Entry Consulting Engagement | from $4,999 |
| CR-003 | Sector Quarterly Outlook | from $6,000/yr |
| CR-004 | Sponsored Reports | POA |

### Parked pending ADAMftd capability confirmation

These remain in the DB as `status='draft'` (not visible publicly) until
the CEO confirms with ADAMftd whether the underlying modules exist:

| SKU | Title | Why parked |
|---|---|---|
| GR-002 | Sanctions & Compliance Brief | Needs OFAC/EU/UK/UN entity-level screening. MR has macro risk only |
| VM-001 | Vessels & Maritime Exposure Brief | Needs vessel/AIS/port-call/dark-fleet data. Not visible in MR sample |
| CI-001 | Company Deep-Dive | Needs single-entity registry + beneficial-ownership + adverse-media dossier. MR has "Top Suppliers" list, not per-company |
| BU-100 | Geopolitical Resilience Pack | Composes GR-002 + VM-001, so depends on both being deliverable |

If ADAMftd confirms any of these capabilities exist, the corresponding
SKU(s) get reactivated by flipping `status` to `published`. No code
changes needed beyond the status flip.

If ADAMftd doesn't have them, three options:
- Kill permanently
- Move to Tier C ("from $1,499, scoped on order, external sourcing")
- Source externally (Refinitiv World-Check for sanctions, MarineTraffic
  / Equasis for vessels, OpenCorporates / Sayari for company dossiers)
  and price accordingly

## Summary of changes

| Tier | Wave-2 v1 SKUs | Wave-4 v2 SKUs | Change |
|---|---|---|---|
| Tier A | 9 | 5 | −4 (CI-001, GR-002, VM-001, MR-001 moved up) |
| Tier B | 4 | 3 | −1 (BU-005 killed) |
| Tier C | 4 | 4 | unchanged |
| Parked drafts | 0 | 4 | +4 (CI-001, GR-002, VM-001, BU-100) |
| **Active total** | **17** | **12** | **−5** |

## What I need from CEO before implementation

1. **Approve Wave-4 v2 SKU list as above** (or specify changes).
2. **Verify with ADAMftd**: does the platform have separate Sanctions /
   Vessels / Company Intelligence modules? Each "yes" reactivates the
   corresponding parked SKU.
3. **Approve MR-001 reprice $599 → $1,099**. This is the most
   commercially significant change. Justification: the full ADAMftd MR
   is a $1,000+ artefact in market terms; $599 was undervalued.
4. **Slug strategy for renames**. Do I keep existing slugs (clean URLs
   stay stable, slugs may not match new titles) or update slugs (cleaner
   SEO, requires 301 redirects)? Wave-2 we kept slugs — same default
   here unless you say otherwise.

## Implementation cost when approved

- 1 SQL migration in Supabase (update titles/prices, set draft status on
  4 SKUs, drop BU-005 from published) — ~5 min to write, 30 sec to run
- 1 update to `lib/catalogue.ts` to match (~10 min)
- Smoke-test on staging URL
- Commit + push

Total: ~30 min of focused work once you approve.
