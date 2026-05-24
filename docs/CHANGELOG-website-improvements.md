# Website improvements — change log

Implemented from the Ponte Trade website review (Product Marketing, 24 May 2026).
All changes are content/metadata/markup only — no schema, routing, or checkout
logic was touched. Verified: every edited file was read back complete and
JSX-balanced; all new `lucide-react` icon imports resolve.

## SEO

- **`app/layout.tsx`** — Added `Organization` and `WebSite` JSON-LD structured
  data, emitted site-wide. Search engines can now connect Ponte Trade / ICTTM /
  ADAMftd and show richer results.
- **`app/product/[slug]/page.tsx`** — `generateMetadata` now sets a per-product
  `openGraph`, `twitter`, and canonical URL. Previously every product inherited
  the homepage Open Graph card and `og:url`, so a shared product link never
  showed the product. Also added `Product` JSON-LD (name, SKU, price,
  availability, brand) — product pages are now eligible for rich results.
- **`app/category/[slug]/page.tsx`** — Per-category `openGraph`, `twitter`,
  canonical URL.
- **`app/catalogue/page.tsx`** — Catalogue-specific `openGraph`, `twitter`,
  canonical URL.
- **`app/about/page.tsx`** — About-specific `openGraph`, `twitter`, canonical
  URL.

> `app/sitemap.ts` and `app/robots.ts` were reviewed and already correct — no
> change needed.

## Messaging & copy

- **`app/page.tsx`** — Hero sub-headline now names the audience (exporters,
  importers, trade bodies) and explains ADAMftd in-line ("grounded-AI engine,
  7B+ verified trade records") instead of leaving it as unexplained jargon.
- **`app/page.tsx`** — Removed "An ICTTM company" from the homepage stats strip
  (it is a corporate fact, not a proof metric); the strip now carries four
  genuine proof points.
- **`app/page.tsx` / `components/SiteHeader.tsx`** — Category names standardised
  to match `lib/catalogue.ts` everywhere: homepage tiles, header nav and footer
  now all say "Geopolitical & Risk" and "Company & Supplier" (previously
  "Geopolitical Risk" / "Company Intel" / "Geopolitical").
- **`app/page.tsx`** — Newsletter section now states the $29/mo newsletter is an
  *optional* subscription and that every catalogue report stays a one-time
  purchase, resolving the contradiction with the "no subscription" promise.

## Conversion

- **`components/ProductBuyPanel.tsx`** — Added a "Quality guaranteed"
  reassurance block beside the price: manual QA before delivery, free revision
  if a report misses the brief. This is risk reversal at the point of purchase.
- **`components/ProductBuyPanel.tsx` / `components/SiteFooter.tsx` /
  `app/page.tsx`** — "Watermarked PDF" reframed from an apparent downside into a
  benefit: "Licensed PDF, watermarked to you".
- **`app/page.tsx`** — New "Start from what you're trying to do" section: a
  guided recommender with four goal-based entry points (enter a market / find
  buyers & suppliers / assess risk / full picture), each linking to the right
  product or category. Turns 40 SKUs into a guided choice.

## Trust / social proof

- **`app/page.tsx`** — New "Why buyers trust Ponte Trade" section with three
  factual authority cards (verified official sources, grounded AI + human QA,
  ICTTM ownership). A code comment marks where genuine customer testimonials
  should be added once available — no fabricated quotes were shipped.

## Verification note

The build was verified by reading every edited file back in full and confirming
completeness, JSX balance, and that all imports resolve. A `tsc` / `next build`
pass against the live working tree could not be run from this environment
because of a file-sync limitation in the sandbox; running `npm run build`
locally before deploy is recommended as a final check.

## Not done here (see DASHBOARD-IMPLEMENTATION-BRIEF.md and review doc)

Deeper product-page FAQs, a content/blog layer, per-product social images, and
live customer testimonials were intentionally left out of this pass — they are
larger pieces of work covered in the review document and the dashboard brief.
