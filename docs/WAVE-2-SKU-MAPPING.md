# Wave 2 — SKU Restructure Mapping

Single source of truth for the catalogue restructure. Generated 2026-05-26.

## Strategy
- **Kill** = `status = 'archived'` (hidden from public, past orders intact)
- **Keep** = rename and/or reprice in place, SKU ID unchanged
- **New** = insert new row with new SKU ID

---

## Tier A — Analyst Reports ($299-599, 48h SLA)

| New name | Price | SLA | Action | Old SKU | Old name | Old price |
|---|---|---|---|---|---|---|
| Single Market Analysis Report (configurable, any of 11 topics) | $299 | 48h | NEW SKU `MA-100` | (none) | (consolidates MA-001..MA-011 as one configurable product) | n/a |
| Sanctions & Compliance Brief | $349 | 48h | RENAME + REPRICE | `GR-002` | Sanctions Exposure Report | $99 |
| Tariff & Landed Cost Strategic Brief (with mitigation analysis) | $299 | 48h | RENAME + REPRICE | `CT-002` | Tariff & Landed Cost Report | $69 |
| Trade Corridor Report | $399 | 48h | REPRICE | `MR-004` | Trade Corridor Report | $299 |
| Buyer/Supplier Intelligence (with verified contacts) | $399 | 48h | RENAME + REPRICE (consolidate) | `CI-003` | Top Buyers Report | $199 |
| Company Deep-Dive (with corporate registry data) | $499 | 48h | RENAME + REPRICE | `CI-001` | Company Trade Profile | $149 |
| Vessels & Maritime Exposure Brief | $449 | 48h | NEW SKU `VM-001` | (none) | (new product) | n/a |
| Geopolitical Scenario Brief (Hormuz / Suez / Taiwan / Red Sea) | $499 | 48h | RENAME + REPRICE | `GR-001` | Strait of Hormuz Impact Report | $199 |
| Single Country Market Report | $599 | 48h | KEEP (already correct) | `MR-001` | Single Country Market Report | $599 |

---

## Tier B — Strategic Bundles ($1,099-1,999, 72-96h SLA)

| New name | Price | SLA | Action | Old SKU | Old name | Old price |
|---|---|---|---|---|---|---|
| Market Entry Strategy (single country, integrated) | $1,099 | 72h | RENAME + REPRICE | `BU-001` | Market Entry Bundle | $399 |
| Global Market Strategy | $1,599 | 96h | RENAME + REPRICE | `MR-002` | Global Market Report | $899 |
| Geopolitical Resilience Pack | $1,799 | 96h | NEW SKU `BU-100` | (none) | (new bundle) | n/a |
| Full Market Intelligence (all 11 MA + single country MR) | $1,999 | 96h | RENAME + REPRICE | `BU-005` | Complete Market Intelligence Pack | $999 |

---

## Tier C — White-glove / Custom (POA)

| New name | Price | Action | Old SKU | Old name | Old price |
|---|---|---|---|---|---|
| Custom Research Brief | from $2,999 | REPRICE | `CR-001` | Custom Research Request | $999 |
| Market Entry Consulting Engagement | from $4,999 | RENAME + REPRICE | `CR-002` | Market Entry Analysis (white-glove) | $2,499 |
| Sector Quarterly Outlook (chambers / EPAs / trade bodies) | from $6,000/yr | NEW SKU `CR-003` | (none) | (new annual product) | n/a |
| Sponsored Reports for institutions | POA | NEW SKU `CR-004` | (none) | (new) | n/a |

---

## Kill list (archive)

Set `status = 'archived'`. Reason in brackets.

### Market Analysis SKUs (consolidated into new configurable MA-100)
- `MA-001` Retail Snapshot Report — $129 (sub-$199, consolidated)
- `MA-002` Market Size & Demand Report — $149 (sub-$199, consolidated)
- `MA-003` Consumer Preferences Report — $129 (sub-$199, consolidated)
- `MA-004` Market Sentiment Analysis — $99 (sub-$199, consolidated)
- `MA-005` Seasonal Demand Intelligence — $149 (sub-$199, consolidated)
- `MA-006` Local Production Overview — $129 (sub-$199, consolidated)
- `MA-007` Substitutes & Competitors Report — $129 (sub-$199, consolidated)
- `MA-008` SWOT Analysis — $99 (sub-$199, consolidated)
- `MA-009` Market Entry Barriers Report — $149 (sub-$199, consolidated)
- `MA-010` Packaging & Labeling Guide — $99 (sub-$199, consolidated)
- `MA-011` Quality Standards & Certifications Guide — $129 (sub-$199, consolidated)

### Sub-$199 single-topic SKUs
- `MR-003` EU Seafood Trade Report — $349 (KEEP? not in brief. RECOMMEND archive: it's a niche one-off that doesn't fit the new taxonomy. Confirm.)
- `CT-001` Country Trade Profile — $79 (sub-$199)
- `CT-003` Bilateral Trade Flow Report — $149 (sub-$199, overlaps with Trade Corridor Report)
- `TI-001` Active Tenders Briefing — $79 (sub-$199)

### Duplicate / overlapping
- `CI-002` Top Suppliers Report — $199 (duplicate of CI-003 buyer/supplier, consolidated into renamed CI-003)
- `CI-004` Buyers by HS Code — $399 (overlaps with renamed CI-003 Buyer/Supplier Intel)
- `CI-005` Suppliers by HS Code — $399 (overlaps with renamed CI-003)
- `BU-002` Competitive Intelligence Bundle — $449 (brief: "8% discount on parts is insulting")
- `BU-003` Full Market Overview Pack — $599 (overlaps with renamed BU-005 Full Market Intelligence)
- `BU-004` Trade Readiness Pack — $499 (brief: keep one of BU-001 vs BU-004; keeping BU-001)
- `BU-006` Export Launchpad — $899 (overlaps with renamed BU-001 Market Entry Strategy)
- `GR-003` Chokepoint Disruption Brief — $249 (overlaps with renamed GR-001 Geopolitical Scenario Brief)

### Subscriptions / credit packs (brief explicitly kills)
- `TI-002` Weekly Tender Digest — $79/mo (subscription, killed)
- `SB-001` Trade Intelligence Newsletter — $29/mo (subscription, killed)
- `SB-002` Report Credit Pack Starter — $299 (credit pack, killed)
- `SB-003` Report Credit Pack Growth — $899 (credit pack, killed)
- `SB-004` Report Credit Pack Enterprise — $2,399 (credit pack, killed)

---

## Net effect

- Before: 41 active SKUs across 8 categories
- After: 17 active SKUs across 3 tiers
  - Tier A: 9 SKUs ($299-599)
  - Tier B: 4 SKUs ($1,099-1,999)
  - Tier C: 4 SKUs (POA / from $2,999+)
- Archived: 27 old SKUs
- 4 new SKUs created (MA-100, VM-001, BU-100, CR-003, CR-004 — 5 actually)

## One open item

**MR-003 EU Seafood Trade Report ($349)** is not in the brief's kill list (it's not sub-$199, not a sub, not a duplicate). But it doesn't map cleanly to the new tiered catalogue either. Two options:
- (a) Archive it (clean break, new buyer wouldn't have found it anyway)
- (b) Keep it as a one-off curiosity in Tier A (it's already $349, 48h)

Default proposal: **archive** unless CEO says otherwise.
