# Ponte Trade — Development Brief v1

**For:** Claude session handling ponte.trade platform development
**From:** Giuseppe Funaro, CEO (ICTTM group)
**Date:** 26 May 2026
**Status:** Approved direction. Implement to spec.

---

## 1. Context and three locked decisions

Ponte Trade exists to serve a buyer who never logs into a platform: consultants, lawyers, chambers, EPAs, M&A teams, board members. They want a licensed PDF, not a subscription.

The current catalogue (40 SKUs, instant downloads, Stripe-charge-on-checkout, "Powered by ADAMftd" everywhere) has three structural problems that we are fixing in this release.

### Three decisions locked by the CEO

**1.1 No auto-generated or instant reports.** Every Ponte report is human-curated. The catalogue floor moves up. The instant-download flow is removed entirely.

**1.2 Charge-on-confirm checkout.** Stripe takes a pre-authorisation only. Funds are captured ONLY after the research team confirms data availability and a delivery date. If we cannot deliver, the pre-auth is voided and the customer is not charged.

**1.3 No reference to adamftd.com.** Ponte attributes data to ICTTM (the parent company), not to ADAMftd. Drop "Powered by ADAMftd" everywhere. The customer should never click from Ponte to adamftd.com (cannibalisation risk and brand confusion).

---

## 2. Catalogue restructure

### Kill list (remove from production)
- All instant / auto-generated SKUs (entire premise removed)
- The three Report Credit Packs ($299 / $899 / $2,399)
- Both newsletter subscriptions (Trade Intelligence $29/mo, Tender Digest $79/mo)
- Duplicate buyer/supplier SKUs (consolidate to one)
- Overlapping bundles: "Market Entry Bundle" vs "Trade Readiness Pack" — keep one
- "Competitive Intelligence Bundle" (8% discount on parts is insulting)
- All SKUs priced below $199 (does not fit premium positioning)

### New three-tier catalogue

**Tier A — Analyst Reports ($299-599, 48h SLA)**
Single-topic, single-product, single-country. Senior analyst QA. Licensed PDF.

| SKU | Price | SLA |
|---|---|---|
| Single Market Analysis Report (any of 11 topics) | $299 | 48h |
| Sanctions & Compliance Brief | $349 | 48h |
| Tariff & Landed Cost Strategic Brief (with mitigation analysis) | $299 | 48h |
| Trade Corridor Report | $399 | 48h |
| Buyer/Supplier Intelligence (with verified contacts) | $399 | 48h |
| Company Deep-Dive (with corporate registry data) | $499 | 48h |
| Vessels & Maritime Exposure Brief (NEW) | $449 | 48h |
| Geopolitical Scenario Brief (Hormuz / Suez / Taiwan / Red Sea) | $499 | 48h |
| Single Country Market Report | $599 | 48h |

**Tier B — Strategic Bundles ($1,099-1,999, 72-96h SLA)**
Multi-module integrated narrative with executive summary, board-ready.

| SKU | Price | SLA |
|---|---|---|
| Market Entry Strategy (single country, integrated) | $1,099 | 72h |
| Global Market Strategy | $1,599 | 96h |
| Geopolitical Resilience Pack | $1,799 | 96h |
| Full Market Intelligence (all 11 MA + single country MR) | $1,999 | 96h |

**Tier C — White-glove / Custom (POA)**
Sold by request only, manual quote.
- Custom Research Brief — From $2,999
- Market Entry Consulting Engagement — From $4,999
- Sector Quarterly Outlook (chambers / EPAs / trade bodies) — From $6,000/yr
- Sponsored Reports for institutions — POA

---

## 3. Checkout flow specification

This is the biggest engineering change. The current "buy, pay, download" flow is replaced by an order lifecycle with manual confirmation.

### Order state machine

```
DRAFT
  v (customer submits checkout)
REQUESTED        <- Stripe PaymentIntent created with capture_method=manual
  v                 (7-day pre-auth hold on customer's card)
ASSESSING        <- Internal review: data availability for HS/country combo,
  v                 analyst capacity for SLA
  +-> DECLINED  <- Cannot deliver. Pre-auth voided. Customer emailed.
  v
CONFIRMED        <- Capture Stripe payment. PO# + delivery date emailed.
  v
IN_PRODUCTION    <- Research team working. Status visible in /account.
  v
READY_FOR_DELIVERY <- QA passed, awaiting send.
  v
DELIVERED        <- PDF emailed + uploaded to /account. License issued.
                    Watermark ID written to ledger.
```

Edge state: **REFUNDED** (post-delivery dispute, manual back-office action).

### Stripe implementation
- Use `PaymentIntent` with `capture_method: 'manual'`
- Pre-auth window is 7 days. If ASSESSING > 5 days, trigger re-authorisation flow with customer consent.
- Webhook handlers required for:
  - `payment_intent.requires_capture` -> move to CONFIRMED-ready state
  - `payment_intent.succeeded` -> confirm capture, fire IN_PRODUCTION email
  - `payment_intent.canceled` -> mark DECLINED
  - `charge.refunded` -> mark REFUNDED
- Idempotency keys on every PaymentIntent.

### Customer-facing UX

**Checkout page** must show this prominently (above the Pay button):
> *"You will not be charged until our research team confirms we can deliver this report on your required timeline. We respond within 24 business hours. If we cannot deliver, no funds are taken from your card."*

**Order confirmation page** (immediately after REQUESTED):
> *"Order received. We're checking data availability and delivery capacity. You'll get a confirmation email within 24 business hours, and we'll only charge your card once we've confirmed delivery."*

**/account/orders page** — list view with status badges:
- REQUESTED (yellow) "Awaiting confirmation"
- CONFIRMED (blue) "In production, delivery by [date]"
- IN_PRODUCTION (blue) "Research in progress"
- DELIVERED (green) "Download PDF"
- DECLINED (grey) "Unable to deliver — see email"

**Email triggers** (transactional, Postmark or similar):
- REQUESTED: "Order received, we'll be in touch within 24h"
- CONFIRMED: "Order confirmed, delivery [date], you've been charged [amount]"
- DECLINED: "Unable to deliver, no charge taken"
- IN_PRODUCTION: (optional) "Your report is in production"
- DELIVERED: "Your report is ready — download here"

### Back-office (internal admin)

**/admin/orders** dashboard:
- Default view: REQUESTED orders sorted by oldest first
- Each row: customer, SKU, HS code(s), country(ies), requested-at, pre-auth deadline
- Actions per row:
  - **Confirm** -> modal with delivery date picker -> captures Stripe payment -> moves to CONFIRMED
  - **Decline** -> modal with reason dropdown -> voids Stripe pre-auth -> moves to DECLINED
- Bulk actions: not in v1
- Filters: by status, SKU, customer, date range

**Admin notification** when a new REQUESTED order arrives:
- Email to ops@ponte.trade
- Slack webhook to #ponte-orders (if available)

---

## 4. Branding and positioning changes

### Footer (replace existing)
**Old:** *"An ICTTM company. Powered by ADAMftd"* with link to adamftd.com
**New:** *"An ICTTM company. Research-grade trade intelligence, backed by 7 billion+ verified trade records."*

No outbound link to adamftd.com anywhere on the site.

### Homepage hero (rewrite)
**Old:** *"Built on ADAMftd's grounded-AI engine and 7B+ verified trade records"*
**New:** *"Curated by analysts. Backed by 7B+ verified trade records. Delivered as licensed PDFs."*

### About page (rewrite)
**Replace** *"Backed by ICTTM, powered by ADAMftd"* section with:

> **Backed by ICTTM**
> Ponte Trade is owned by the International Centre for Trade Transparency Limited (ICTTM), the UK group that maintains one of the largest verified trade-data infrastructures in the world: 7 billion+ records cross-checked against UN Comtrade, the World Bank, WTO, Eurostat, ITC and EU Taxud.

**Remove** the standalone "Powered by ADAMftd" callout and the [Learn about ADAMftd ->](https://adamftd.com) link.

### New positioning page: "/why-ponte"

A standalone page that establishes the differentiator. Sections:

1. **Curated, not generated.** Every report is reviewed and signed off by a senior sector analyst before delivery.
2. **Licensed for distribution.** Each PDF includes a redistribution licence for your organisation. Cite it in proposals, board packs, regulatory filings.
3. **Citable methodology.** Every report includes a methodology appendix and source citations.
4. **No subscription, no platform.** Buy the artefact. Own it. No login needed after delivery.

### Methodology page (rewrite)

**New copy:**

> Our methodology combines machine-scale data aggregation across UN Comtrade, World Bank, WTO, Eurostat, ITC, EU Taxud and additional government sources with expert human review by our research team. Where official sources conflict, outliers are flagged and Monte Carlo models estimate the most likely outcome. Every report is reviewed and signed off by a senior sector specialist before it reaches the customer.

### Every delivered PDF cover page

Standard cover footer block (templated):

```
Author: ICTTM Research Team
Senior Reviewer: [initials]
Issued: [DD MMM YYYY]
Licensed to: [Customer organisation name]
Licence: Single-organisation use. No redistribution.
Watermark ID: PONTE-YYYY-MM-XXXX
```

---

## 5. UX / UI changes required (summary)

1. Remove all "instant download" / "Preview & Buy" CTAs from the catalogue. Replace with "Request quote" or "Order report" CTAs that route to the new flow.
2. Remove every "Powered by ADAMftd" badge, link, and reference site-wide.
3. Update all SLA copy from "Delivered in 24h / 48h / 72h" to the new SLAs in the catalogue table above.
4. Add the pre-charge notice block on the checkout page.
5. Build /account/orders status view.
6. Build /admin/orders dashboard.
7. Add the new "/why-ponte" page to nav.
8. Rewrite homepage hero, about page, methodology page per copy above.
9. Update OG image and meta descriptions to drop ADAMftd references.

---

## 6. Acceptance criteria for v1 release

- Zero references to adamftd.com on any page (footer, about, methodology, OG meta).
- Catalogue contains only the new tiered SKUs. All previous SKUs removed or archived.
- Stripe `capture_method: 'manual'` is in use; no SKU charges on checkout submit.
- A test order can be created, moved through REQUESTED -> CONFIRMED -> DELIVERED, with the right emails firing at each transition.
- A test order can be created and DECLINED, with Stripe pre-auth voided and customer emailed.
- /account/orders shows correct status badges per order.
- /admin/orders allows Confirm and Decline actions and routes correctly to Stripe.
- Every delivered PDF carries the standard cover footer block with watermark ID.

---

## 7. Out of scope for v1

- Subscription products (newsletter, digest) — defer
- Customer self-serve report generation — never (premise removed)
- Direct integration into the ADAMftd platform — defer
- Real-time pricing API — defer
- Multi-currency display — defer (USD only at launch)
- Automated re-authorisation when pre-auth expires (manual for v1, automate later)

---

## 8. Open questions for CEO before build starts

1. Confirm SLA windows for Tier A (48h) and Tier B (72-96h) match research-team capacity.
2. Confirm the new SKU prices in §2 are accepted, or specify adjustments.
3. Confirm we want a "/why-ponte" page (vs folding into About).
4. Confirm Postmark vs another transactional email provider.
5. Confirm Slack workspace for #ponte-orders or alternative notification channel.
6. Confirm the watermark ID format (PONTE-YYYY-MM-XXXX proposed).

---

End of brief.
