# Ponte Bridge — Implementation Handoff v1

Issued 27 July 2026. This package is the authoritative design source for the Ponte
bridge interaction system. It contains nothing else, on purpose: no earlier brand
versions, no historical homepage prototypes, no prior handoff, no demo-only files.
If something is not in this folder, it is not authorised by this package.

---

## What this package IS authoritative for

Six components, and the typography of the landing headline:

| # | Component | Where |
|---|---|---|
| 1 | Ponte Family Bridge | `PB.route()` |
| 2 | Ponte Action Bridge | `PB.route()` |
| 3 | Ponte Task Completion Bridge (+ compact header) | `PB.progress()` · `PB.header()` |
| 4 | Ponte Commercial Journey Bridge | `PB.journey()` |
| 5 | Ponte Counterparty Connection | `PB.connection()` |
| 6 | Ponte Multi-Party Deal Room Bridge | `PB.dealroom()` |

Plus: the mobile elevation treatment of all six, the reduced-motion behaviour of
all six, and the headline emphasis **“Global trade, from *signal to deal.*”**

## What this package is NOT authoritative for — do not change these

**Existing production navigation, authentication, routes, data and business logic
remain authoritative and must be preserved.**

- Header items stay as production has them: **Market Signals · Start a deal ·
  How Ponte works**, with **Sign in** when signed out and **Your records** when
  signed in.
- This package does **not** authorise “Qualified Opportunities” or “Join the
  network” as header or auth replacements. They appear nowhere in it.
- Routing, session handling, data fetching and business rules are untouched.

**Claude Code must not rebuild the whole homepage from a historical prototype.**
`Ponte Landing - Bridge.html` is a *reference composition*, not a page to port
wholesale. Take from it exactly two things: the family/action bridge module, and
the headline typography. Everything else in it exists only to show those two in
context.

---

## Files

```
00_README.md                     this file
01_IMPLEMENTATION_NOTES.md       integration steps, API, and the rules that must not be broken
Ponte Bridge System.html         the specification — audit, all 10 components, every state, live
Ponte Landing - Bridge.html      reference composition (?state=signed-in for the signed-in header)
ponte-bridge.css                 production stylesheet
ponte-bridge.js                  production engine (vanilla, no framework, no build step)
ponte-bridge-demos.js            drives the specification document only — do NOT ship
ponte-flow/tokens/
  ponte-flow-tokens.css          the required Ponte Flow token file (unchanged, adopted as-is)
reference/
  desktop-0-full-composition.png     1280 · nav, strip, hero, family bridge
  desktop-1-family-neutral.png       1280 · neutral
  desktop-2-products-selected.png    1280 · Products selected + action bridge (3 actions)
  desktop-3-trade-services-selected.png  1280 · Trade services selected + action bridge (2 actions)
  desktop-4-distribution-selected.png    1280 · Distribution selected + action bridge (3 actions)
  mobile-1-family-neutral-390x844.png    390 × 844 · neutral
  mobile-2-family-selected-390x844.png   390 × 844 · family selected
  mobile-3-action-revealed-390x844.png   390 × 844 · action bridge revealed
```

Everything is plain text or PNG. There is no binary source, no design-tool
dependency and no build step anywhere in the implementation path.

## Fonts

Playfair Display (400, 500, 600 + italic 400) · Inter (300–700) · JetBrains Mono
(400, 500, 600). Already in production.

## A note on the reference images

Desktop references are the 1280px layout, rendered at 70% to fit a single capture.
Mobile references are the 390 × 844 layout captured at 62% and rescaled — they are
layout and hierarchy references, not pixel sources. **The pixel source is the
running code**: open `Ponte Bridge System.html` and `Ponte Landing - Bridge.html`.
Every animation in this package is live in those two files.

## Verification state at issue

- Both HTML files open with **zero console errors**.
- No malformed SVG paths.
- Zero label collisions across all 42 component instances and all 390px frames.
- Zero WCAG AA text failures on either page, measured with per-layer alpha
  compositing (not token-level assumptions).
- Keyboard: single tab stop per bridge, roving tabindex, arrow keys traverse,
  focus survives re-render.
