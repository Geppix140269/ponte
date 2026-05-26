# Ponte Trade — Brand Identity Brief

**Prepared:** 2026-05-26
**Audience:** Claude Design (brand designer AI)
**Project status:** Site is live at ponte.trade. Brand v2 (glass over navy-deep) is in production. Logo mark is the weakest link.

---

## 1. Who Ponte Trade is

Ponte Trade sells research-grade trade intelligence as one-time digital products (PDF reports, data packs, risk briefs). It is owned by ICTTM (International Centre for Trade Transparency Limited, UK) and uses the ADAMftd intelligence engine, but Ponte must stand as its own brand. ICTTM and ADAMftd belong in the footer and the About page, not in the customer's mental model of "the brand they bought from."

The name "Ponte" is Italian for "bridge." The product bridges buyers, sellers, and trade bodies to the market intelligence they need to act with confidence.

**One-line positioning:** Evidence over opinion. Research-grade trade intelligence, sold as a product, no subscription required.

## 2. What we sell, who buys it

- ~40 SKUs across Market Reports, Market Analysis, Bundles, Geopolitical & Risk, Country & Tariff, Company & Supplier, Tenders, Custom Research
- Price points $79 to $2,499 (most reports $99 to $899, custom research from $999)
- Delivery: instant download or 24h/48h SLA. PDFs are watermarked per buyer
- Two subscription products exist (Newsletter $29/mo, Weekly Tender Digest $79/mo) but the business is one-time purchase first

**Buyers:**
- Exporters and importers needing market-entry intelligence
- Trade bodies and chambers of commerce
- Government departments and ministries researching specific corridors
- Banks and investors performing due diligence on trade exposures
- Consulting firms reselling/citing the research

These are non-developer, non-designer, B2B professionals. They expect serious, institutional, expensive-feeling. They are turned off by anything that looks "AI startup" or "consumer SaaS."

## 3. Positioning in the market

Closest peer set: Bloomberg, S&P Global Market Intelligence, Refinitiv (data + analysis), Economist Intelligence Unit, Oxford Economics, McKinsey reports.

These competitors share a visual vocabulary: serif typography for editorial weight, restrained color (deep blue/navy, ink black, single accent color, lots of whitespace), data-forward layouts that look more like Financial Times than Stripe.

Ponte Trade should sit credibly inside that peer set, at a more accessible price point. The brand cannot look like a B2B SaaS startup. It cannot look like Notion. It cannot look like Linear. It must look like something a Permanent Secretary would expect to receive.

**What Ponte is not:**
- Not a platform you log into daily
- Not a "data feed"
- Not a SaaS subscription
- Not a consumer product
- Not a consultancy (we sell the artefact, not the engagement)

## 4. Current brand v2 system (keep)

The visual system is solid. Do not touch this layer; design the mark to live inside it.

**Color palette:**
- `--navy-deep: #07101B` (page background)
- `--navy: #0D1B2A` (UI surfaces)
- `--gold: #C9973A` (single accent, reserved for live data + premium moments)
- `--cream: #F5F0E8` (text on dark)
- `--gray: #6B7280`, `--gray-2: #9CA3AF` (secondary text)
- `--positive: #4AC09A`, `--negative: #E07A5F` (status only)

**Typography:**
- Playfair Display — serif, used for headings and "voice" moments (the italic "over", the italic "sold as a product")
- Inter — sans-serif, body text
- JetBrains Mono — monospace, numbers and codes (SKUs, prices, sync timestamps)

**Visual language:**
- Glass-on-navy: subtle white-translucent surfaces over deep navy background
- One blur weight, one border weight, one shadow weight ("the discipline is in restraint")
- Gold appears sparingly: a pulsing dot for live signals, the apex node of the logo, accent CTAs
- Editorial section numbering in italic gold: "— 01 / Featured", "— 02 / Start here"

## 5. Current logo (the problem)

The existing mark is a single Roman arch with a gold dot at the apex (file: `components/Logo.tsx`).

**Concept (keep):**
- Italian heritage — "ponte" means bridge
- The arch as a classical bridge, structure, confidence
- The gold node at the apex represents the verified data point — the trade record at the centre of every report
- "The bridge has a payload"

**Execution problems (fix):**
1. **Reads as architectural blueprint, not a brand.** The arch uses a hard miter join, uniform stroke weight, and a simple semicircular curve. It looks like a CAD drawing or a real-estate firm letterhead, not the mark of an intelligence product.
2. **Falls apart at small sizes.** At 16x16 (favicon) and 24x24 (nav), the dot reads as a typo, a glitch, or visual noise. The story is invisible without the words.
3. **No depth, motion, or signature gesture.** Compare to peers that have a memorable visual moment: the Bloomberg wordmark, the FT thumbnail, the S&P stacked monogram. The Ponte arch is generic.
4. **The baseline line under the arch is decorative without meaning.** It does not carry the bridge metaphor; it just sits there.
5. **No second state.** There's no animated, live, or "loaded" version that signals "intelligence has arrived" / "the report is ready" / "data is flowing."

## 6. What we need from you

A complete primary logo system that solves the problems above while keeping the conceptual core (arch + payload + Italian classicism).

### Required deliverables

**6.1 Primary mark (the bridge symbol)**
- Standalone, no wordmark — works at 16x16 to 512x512
- Must be unmistakable at 24x24 nav size
- Must carry the "bridge with a payload" idea more articulately than a circle on an arch
- Open to: variable stroke weight, multiple arches in a series, an arch with structural detail (capstones, piers), a more abstract gesture that suggests an arch without literally being one, a wordmark-first approach where the mark IS the typography
- Single-color (white on navy) and full-color versions

**6.2 Wordmark**
- "Ponte" as a logotype, either standalone or paired with the mark
- Must feel editorial, expensive, and quietly Italian
- Current attempt uses Playfair Display with 3px letterspacing — open to custom letterforms if a custom logotype is warranted

**6.3 Combined lockup**
- Mark + wordmark, horizontal and stacked variants
- Optional descriptor lockup: "PONTE TRADE" or "Ponte / Trade Intelligence"

**6.4 Live-data state**
- A version of the mark with motion or visual emphasis that triggers when:
  - A report is freshly delivered (success moment)
  - Live data is updating in the UI
  - The user is on the page heading "your report is ready"
- Could be: the apex node pulsing, light traveling across the arch, the mark "filling in" — open-ended

**6.5 Favicon**
- Tested at 16x16, 32x32, 48x48
- Must be recognizable in a browser tab strip alongside Bloomberg, FT, Stripe favicons

**6.6 OG image / social card (1200x630)**
- Template, not a one-off
- Used wherever ponte.trade is shared on LinkedIn, Twitter, Slack, email previews

### Format

- Source: Figma file with all variants, sized correctly, named properly
- Export: SVG (primary, single-color, on-dark, on-light variants), PNG at 512/256/128/64/32, ICO favicon
- Rationale doc: 1-2 page PDF explaining the design decisions (so we can defend the mark to internal stakeholders and brief future designers)

## 7. Tone of voice (so the visual design lands in the right key)

Words that describe Ponte's voice:
- Evidence-led, not breathless
- Editorial, not corporate
- Confident, not loud
- Italian-heritage cadence (the brand name, the italics in headlines, "sold as a product")
- Quietly premium

Lines that exemplify the voice (from the live site):
- "Evidence *over* opinion."
- "Output, not subscriptions."
- "Grounded AI, not guesswork."
- "The question is the brief. The brief is the report."
- "Trade intelligence. Delivered."

The visual identity needs to feel like the brand that says these things.

## 8. Inspiration and references

**Aim for:**
- Financial Times brand system (typography discipline, editorial restraint)
- Bloomberg Terminal (data-forward, serious, no fluff)
- The Economist (intellectual confidence, italic-friendly)
- Aman Resorts (quiet luxury, restraint, just enough)
- Rolex / Patek Philippe identity systems (heritage marks executed with modern precision)

**Avoid:**
- Y Combinator startups
- Generic SaaS dashboards
- Anything that says "AI-first" visually
- Gradients, glassmorphism heroics, glow effects in the mark itself (the surrounding UI handles that; the mark must be clean)
- Geometric "tech bro" abstract shapes
- Anything cute, friendly, or human (no smiles in the mark)

## 9. Constraints

- Must work on the existing navy-deep background system without redesign of the UI
- Must accommodate the gold accent rule (gold = live data / premium moments only, used sparingly)
- Must scale to 16x16 favicon without losing identity
- Cannot use any imagery that suggests "bridge" too literally (no engineering drawings, no Brooklyn Bridge silhouette, no rope/suspension imagery)
- Cannot use any imagery that suggests "AI" (no neural nets, no brain icons, no chip patterns)
- Cannot use the Italian flag colors or any nationalist imagery
- Original work only — no riffs on existing trademarks

## 10. Approval criteria

The mark is approved when:
1. It's recognizable at 16x16 without the wordmark
2. It would not look out of place in a footer next to Bloomberg, FT, S&P logos
3. The "bridge has a payload" concept reads to a brand-naive viewer within 5 seconds of explanation, but doesn't require explanation to be aesthetically resolved
4. There's a live-data state that creates a "moment" the user will remember
5. The CEO (Giuseppe Funaro) signs off

## 11. Contact

Giuseppe Funaro, CEO
g.funaro@1402celsius.com
Ponte Trade / ICTTM, London
