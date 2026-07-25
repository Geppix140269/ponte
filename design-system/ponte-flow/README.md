# Ponte Flow — engineering handoff package

System **v1.0.0** · generated 26 July 2026 · Libraries **C**, **E**, **F** plus Library **H** motion.
Colour authority: Ponte Brand Book v5. Taxonomy authority: `TAX` in `ponte-structure.js`.

This package is the implementation source. The HTML review documents are presentation only and
are not required to build.

---

## Manifest

| Group | Files |
|---|---|
| Icon SVGs — standard | 89 |
| Icon SVGs — reduced (authored, ≤20px) | 37 |
| Motion SVGs (Library H, authored end state) | 11 |
| Motion CSS (components + reduced-motion) | 2 |
| Motion spec (JSON) + H01 engine spec | 2 |
| Tokens (JSON · CSS · TS) | 3 |
| Registry (JSON · TS) | 2 |
| Documentation (incl. product-authority notes) | 10 |
| README | 1 |
| **Total** | **157** |

By library: **C** 38 keys (18 reduced) · **E** 30 keys (12 reduced) · **F** 21 keys (7 reduced).

```text
ponte-flow/
  README.md
  icons/
    library-c/{standard,reduced}/     market universe — families, HS sectors, services, distribution
    library-e/{standard,reduced}/     deal composer — semantic steps, field primitives, construction primitives
    library-f/{standard,reduced}/     profile, participation boundaries, evidence and review
  motion/
    svg/                              H02–H12, authored in their end state
    css/ponte-flow-motion.css         keyframes + component classes
    reduced-motion/                   the removal contract (media query + attribute hook)
    js/ponte-flow-progress.md         H01 engine specification
    motion-spec.json                  all 12 components, full specs
  tokens/                             JSON · CSS custom properties · TypeScript
  registry/                           JSON · TypeScript, with assetFor() and strokeFor()
  documentation/                      9 implementation documents
```

There is no `lottie-or-json/` folder because no Lottie asset was authored — see *Conceptual, not
production-ready* below. Empty folders were not created to match a template.

---

## Start here

1. `tokens/ponte-flow-tokens.css` — import once, globally.
2. `registry/ponte-flow-registry.ts` — `assetFor(key, size)` picks standard vs reduced;
   `strokeFor(size)` gives the optical stroke width.
3. `documentation/semantic-map.md` — what each key means and may not claim.
4. `documentation/state-definitions.md` — **read before implementing any profile state.**
5. `motion/css/ponte-flow-motion.css` + `motion/reduced-motion/` — ship both.

```tsx
import { assetFor, strokeFor, byKey } from './registry/ponte-flow-registry';

<span className="pf-icon" style={{ width: size, height: size }}
      aria-hidden={!byKey[key].accessibilityLabelRequired}>
  {/* load assetFor(key, size); apply strokeFor(size) to the svg root */}
</span>
```

Icons inherit `color`. Never set a fill or stroke colour on the SVG itself.

---

## Delivery validation

Run against the delivered files, not against intent:

| Check | Result |
|---|---|
| Every registry entry points to a real file | ✅ 126 assets resolved, 0 missing |
| Every SVG opens independently (has `xmlns`, bare `<svg>` root) | ✅ 126/126 |
| Consistent `viewBox="0 0 24 24"` | ✅ 126/126 |
| Standard and reduced variants correctly paired | ✅ 37 pairs, no orphans, no threshold without an asset |
| Filenames unique | ✅ 126 unique paths |
| Semantic keys unique | ✅ 89 unique keys |
| No raster, mask, clip-path, editor metadata or `<title>`/`<desc>` | ✅ 0 occurrences |
| No hardcoded colour — `currentColor` throughout | ✅ 0 occurrences |
| No presentation background rectangles | ✅ 0 occurrences |
| No legacy black-and-lime styling | ✅ 0 occurrences |
| No font file required to render an icon | ✅ no icon font, no `font-family` in any asset |
| All colour behaviour documented | ✅ `colour-and-state-rules.md` |
| All motion has a reduced-motion fallback | ✅ 12/12 components |
| All examples use the final approved assets | ✅ generated from the approved sources |

No problems found.

---

## Conceptual, not production-ready

Everything in this package is implementation-ready **except**:

1. **Lottie exports.** The brief suggested Lottie for H04 (search) and H12 (empty-state
   transformation). None was authored. The CSS + SVG implementations of both are complete and
   usable on the web; a Lottie export would be a re-authoring exercise and is only worth
   commissioning for a native surface.
2. **Trade-service sub-icons.** Sea, air, road, rail, multimodal, port-to-port, door-to-door,
   storage, cold chain, customs clearance, cargo and quality inspection, certification, cargo
   insurance, payment support, documentary support. Not drawn — they wait on a canonical services
   constant (finding F5).
3. **Icons for HS chapters 71 and 91–92.** Deliberately absent. Those chapters are `unassigned`
   in the taxonomy; no icon is drawn for a category the product does not have (finding F4).
4. **A verification asset.** No business-verification state exists in the product, so none was
   drawn. If one is built it gets its own definition, asset and status.

---

## Decisions still to be made in implementation

1. **Delivery mechanism for the SVGs** — inline React components, an SVG sprite, or fetched
   assets. The registry supports all three; it returns paths, not markup. Inline is recommended
   so `currentColor` and per-size stroke work without a wrapper.
2. **Stroke application** — exported files carry `stroke-width="1.75"`. Either override the
   attribute at render time with `strokeFor(size)`, or strip it at build time and set it in CSS.
   Pick one; do not mix.
3. **Where the registry lives** — as shipped it is a static TS file. If icon metadata needs to be
   editable by non-engineers it should move behind the same constant discipline as the taxonomy.
4. **Reduced-motion toggle persistence** — the attribute hook `[data-reduced-motion="1"]` is
   specified; where the preference is stored is a product decision.
5. **H01 host component** — the engine spec is provided, not a framework component. Profile
   completion and submission readiness use the same engine with different labels and band copy
   and **must not share a value in state**.
6. **Taxonomy constants** — Library C is drawn against the current `TAX`. Findings F2–F5 in
   `product-authority-notes.md` are prerequisites for Explore, not for this package.

---

## The rules that must survive implementation

- Gold is the brand signal and the moving point only. Never a status.
- Progress never starts at 0%, and no percentage is invented where progress is not measurable.
- 100% completeness is not verification. Submission, review and verification are three states.
- Warning is slate, danger is red, there is no amber.
- Colour is never the only carrier.
- A moving point means work is happening now. If no review has started, nothing moves.
- No single "verified" visual across the eight profile truths.
