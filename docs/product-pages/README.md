# Ponte Trade — Product Pages

This folder contains the **Ponte-voice** product pages that transform ADAMftd
capability summaries into Ponte products. Each page is problem-first,
outcome-led, and ties capability to a specific Wave 4 SKU (or set of SKUs).

These docs are the canonical product-marketing source for:

- Sales decks
- The ponte.trade product / category pages
- External-facing one-pagers
- Briefing prospects on what Ponte actually delivers vs. what ADAMftd does

Created during the Wave 4 catalogue restructure (2026-05-28).

## Files

| File | Wave 4 SKU(s) covered |
|---|---|
| `01-trade-intelligence-products.md` / `.docx` | CI-003, MR-004 |
| `02-tariff-landed-cost-brief.md` / `.docx` | CT-002 |
| `03-market-analysis-reports.md` / `.docx` | MA-100, MA-002 ✦ |
| `04-market-reports.md` / `.docx` | MR-001, MR-005 ✦, MR-006 ✦, SF-001 ✦ |

## Editing

The `.md` is the source of truth (clean diffs, easy review). The `.docx`
is the deliverable format for marketing and prospects.

To regenerate the `.docx` files from updated content, run:

```powershell
cd docs/product-pages
node generate-docx.js
```

The generator uses `docx-js` (install once with `npm install -g docx`).

## Brand voice rules

Every product page in this folder MUST:

1. **Lead with the decision** the buyer is making, not the capability.
2. **Name the SKU, price, and SLA** in the first 1–2 lines.
3. **Be specific** about what the buyer configures and what they get.
4. **End with "What this is not"** — disambiguating Ponte from SaaS, raw
   data feeds, generic market research, and AI-generated reports.
5. **Reaffirm the model**: senior-analyst-curated licensed PDF, bought
   once, no subscription, no credits, no platform login.

Anything that drifts from these rules should be flagged for rewrite.

## Market Reports rule

Per the CEO (2026-05-28):

> Ponte Market Reports are **Global OR for a specific country**, and
> **ONLY for a specific HS code**.

SF-001 (EU Seafood) is the lone regional exception — justified by the
unique EU Taxud weekly surveillance dataset that has no global or
single-country equivalent.
