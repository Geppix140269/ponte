# Ponte Trade — Brand v3 Brief

**For:** Claude Design (brand designer AI)
**Prepared by:** Giuseppe Funaro, CEO, with Cowork assist
**Date:** 2026-05-26
**Status:** Iterating from brand v2 (in production). See companion file "Ponte Brand.html" for the full v2 system.

---

## 0. How to read this brief

This is not a redesign-from-scratch brief. The v2 system documented in `Ponte Brand.html` is solid. The concept is right, the palette is right, the typography pairing is right, the principles ("glass is restraint, not effect", "gold marks the signal", "numbers are typography") are right.

**What v3 must do:** fix the specific execution gaps where v2 is conceptually correct but visually under-delivering.

**What v3 must NOT do:** throw away the arch + node + baseline mark, the navy-deep palette, the Playfair/Inter/JetBrains pairing, or the editorial restraint. These are the IP.

If a deliverable in this brief contradicts something the v2 book establishes, the v2 book wins unless that conflict is explicitly the thing we're trying to fix.

## 1. Who we are (one-paragraph context)

Ponte Trade sells research-grade trade intelligence as one-time PDF products. Built on the ADAMftd engine, owned by ICTTM. Positioned against Bloomberg / S&P Global / Refinitiv at a more accessible price point. Audience is exporters, importers, trade bodies, banks, government — non-technical B2B professionals who expect institutional gravity, not startup energy.

## 2. The v2 system we're protecting

From `Ponte Brand.html`:

**The mark — three components, all meaningful:**
1. **The span** (Roman arch) — connection, structure, classical confidence
2. **The node** (gold dot at apex) — the trade record, the verified data point
3. **The baseline** (rule beneath the pillars) — the ground truth that separates Ponte from opinion

All three are required. The baseline carries the "evidence over opinion" thesis visually.

**The palette:**
- Navy `#0D1B2A` (primary ground)
- Vellum / Glass `rgba(255,255,255,0.06)` blur 24, saturate 140 (translucent surface tokens)
- Gold `#C9973A` (reserved for live data — counts, risk scores, the apex node)
- Cream `#F5F0E8` (light surfaces, print, document covers)
- Index status: `#4AC09A` positive, `#E07A5F` negative

**The type system:**
- Playfair Display — voice (display, italic when emphatic)
- Inter — working UI text
- JetBrains Mono — every figure that matters

**The three principles (do not break):**
1. Glass is restraint, not effect. One blur level, one border weight, one shadow.
2. Gold marks the signal. If gold appears on something that isn't a fact, remove it.
3. Numbers are typography. Mono for working figures, Playfair for headline scale.

## 3. The execution gaps in v2 (what to fix)

### Gap A — The mark fails at small sizes

At 16×16 (favicon) and 24×24 (browser tab, nav bar), the mark becomes ambiguous. The arch silhouette is recognizable but the gold node reads as a typo or glitch. The baseline rule disappears entirely. Without all three components legible, the meaning collapses.

**Required:**
- A small-size variant of the mark that survives at 16×16 and still reads as Ponte
- Tested explicitly in a browser tab strip alongside Bloomberg, FT, Stripe, S&P favicons — it must hold its own
- Source SVG plus exported ICO and PNG at 16/32/48
- Rationale: explain whether the small-size variant is the same mark with weight adjustments, a simplified version (e.g., node-only), or a monogram. Brief stakeholders so future hand-offs don't get this wrong

### Gap B — No live-data motion state

The v2 book describes the gold node as "the moment of intelligence." In execution, the node is static. There's no visual gesture for the moment a report arrives, data refreshes, or live values update.

**Required:**
- A motion variant of the mark — a "loaded" or "live" state — that triggers in specific UI moments:
  - When a report is delivered (success moment on `/order-success`)
  - When live data updates in the dashboard (`Live · ADAMftd index` counter)
  - When the report download is ready (email + in-app)
- Could be: the node pulsing, light traveling across the arch span (left pillar → apex → right pillar), the baseline filling in left-to-right, the node "loading" with a sweep
- Deliver as Lottie or simple CSS/SVG animation — whichever is cleanest to implement in Next.js
- Must respect principle 2 (gold = signal): the motion should reinforce, not decorate

### Gap C — Stratum variation lacks usage rules

The v2 book shows a "Stratum variation" (`logo-icon-stratum.svg`) alongside the primary. When to use which is undefined.

**Required:**
- Clear usage doctrine: Stratum is for X contexts, Primary for Y contexts
- Document the doctrine in the rationale PDF and add an example surface for each
- If Stratum doesn't earn its place under usage scrutiny, retire it. Brand systems get stronger by subtracting

### Gap D — Off-platform surfaces are templates, not assets

The v2 book shows a social card, a report cover, and an inbox preview as surface examples. They're stylistic mockups, not production-ready templates.

**Required:**
- Open Graph / Twitter card template (1200×630) as a Figma component with editable headline, eyebrow, and report code slots
- Report PDF cover template (A4 + US Letter) as InDesign or Figma — used for every report Ponte ships
- Email signature template (HTML and image fallback) — the team needs to use this consistently
- All templates use Cream (`#F5F0E8`) backgrounds with Navy/Gold accents per principle 2

### Gap E — Hero / brand wallpaper assets

The site uses ambient gradient backgrounds in code, but there are no hero-scale brand assets for moments where the brand needs to be felt (about page hero, report cover background, partnership decks).

**Required (nice-to-have, not must-have):**
- 2-3 abstract brand wallpapers using only Navy + Gold + Glass tokens
- Suitable for full-bleed hero placement and 16:9 deck slides
- Compositions that suggest "trade routes" or "data flowing across geography" without being literal maps

## 4. What stays untouched

For clarity, do NOT redesign:
- The arch+node+baseline mark concept
- The navy-deep `#07101B` ambient page background
- The Playfair / Inter / JetBrains type pairing
- The gold accent rule (`#C9973A` reserved for live data and premium moments)
- The glass token system (blur 24, saturate 140, 14% white border)
- Section numbering convention (`— 01 / Identity`)
- The voice (italic emphatic Playfair: "Evidence *over* opinion.")

If you find a v3 idea that needs to break one of these, flag it explicitly in the rationale, propose the substitution, and let the CEO sign off rather than shipping the change silently.

## 5. Tone — for the visual designer

Where the brand should sit emotionally:
- Closer to the Financial Times than to a Y Combinator startup
- Closer to Aman Resorts than to a SaaS dashboard
- Closer to a Patek Philippe identity than to a tech logo

Words that describe the voice (from the live site):
- "Evidence *over* opinion."
- "Output, not subscriptions."
- "The question is the brief. The brief is the report."

The visual identity must feel like the brand that says these things.

## 6. Deliverables (ranked by importance)

**Must-have (P0):**
1. Small-size mark variant — survives at 16×16 (Gap A)
2. Live-data motion state — Lottie or CSS/SVG (Gap B)
3. Open Graph / Twitter card template — 1200×630 Figma component (Gap D)
4. Updated favicon set — ICO + PNG 16/32/48 (Gap A)

**Should-have (P1):**
5. Stratum usage doctrine and example surfaces (Gap C)
6. Report PDF cover template — A4 + US Letter (Gap D)
7. Email signature template — HTML and image fallback (Gap D)

**Nice-to-have (P2):**
8. 2-3 abstract brand wallpaper assets (Gap E)
9. Pitch deck master template (continuation of Surfaces module)

## 7. Format and file specs

- **Source:** Figma file with all variants, organized by deliverable, properly named
- **Mark exports:** SVG (primary, single-color, on-dark, on-light), PNG at 512/256/128/64/32, ICO favicon
- **Motion:** Lottie JSON preferred; or SVG with CSS animation in a self-contained component snippet
- **Templates:** Figma components for social/email, InDesign or Figma for print/PDF cover
- **Rationale PDF:** 2-4 pages. Document each design decision, especially the small-size mark approach and the Stratum usage rule

## 8. Constraints (must-respect)

- No additional colors beyond the existing palette
- No animation beyond what's needed for the live-data state (no decorative motion)
- No imagery that contradicts the v2 principles (no neural-net visuals, no AI cliches, no bridge engineering diagrams, no consumer/SaaS gradients)
- No third-party trademarks or near-riffs

## 9. Approval criteria

v3 is approved when:
1. The small-size mark is recognizable in a tab strip next to Bloomberg, FT, S&P
2. The live-data motion state creates a moment users will remember without being decorative
3. The OG card template can be used to ship 10 different reports without redesign
4. The CEO signs off
5. The companion brand book HTML can be updated to match (this is the v3 success signal — no orphaned references)

## 10. Companion file

`Ponte Brand.html` — the current v2 brand book. Read it first. Treat it as the source of truth for the existing system. Anything in this brief that conflicts with that book is intentional and is the thing you're being asked to evolve.

## 11. Contact

Giuseppe Funaro, CEO
g.funaro@1402celsius.com
Ponte Trade / ICTTM, London
