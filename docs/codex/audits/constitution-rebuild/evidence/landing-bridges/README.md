# Landing Family Bridge and Action Bridge — visual evidence

**Slice:** 4, branch `design/landing-family-action-bridges`
**Captured:** 28 July 2026, against a production build (`next build` + `next start`)
**Reproduce:** `npm run evidence:landing`
**Suite:** `e2e/landing-bridges.spec.ts` · **Config:** `playwright.config.ts`

Constitution section 21 requires desktop and 390 x 844 evidence on relevant UI
pull requests and states that technical tests alone are insufficient. The
repository had no way to produce that. These frames are generated, not pasted:
anyone can regenerate them from the same commit and get the same images.

To capture against a deploy preview instead of a local build:

```bash
PONTE_EVIDENCE_BASE_URL=https://deploy-preview-63--ponte-trade.netlify.app npx playwright test
```

---

## 1. The frames

| File | State |
|---|---|
| `desktop-1-family-neutral.png` | Opening state. No family chosen, no actions shown, deck drawn as track only |
| `desktop-2-products-selected.png` | Products chosen. Gold node, live deck, three actions revealed |
| `desktop-3-trade-services-selected.png` | Trade services chosen. Two actions, the approved two-action variant |
| `desktop-4-distribution-selected.png` | Distribution and representation chosen. Three actions |
| `desktop-5-keyboard-focus.png` | Focus reached by Tab. Focus ring on the node, underline on the title |
| `desktop-6-reduced-motion.png` | `prefers-reduced-motion: reduce`. Identical settled composition |
| `desktop-7-runner-step-{1..5}-of-5.png` | The gold runner crossing, stepped at 0, 25, 50, 75 and 100% of its 620ms |
| `desktop-8-runner-settled.png` | After settling. The runner is gone |
| `desktop-9-selected-hover.png` | The chosen station **with the pointer on it**. Identical to `desktop-2` — the proof for DS-8 |
| `mobile-1-family-neutral-390x844.png` | 390 x 844 viewport frame, vertical treatment |
| `mobile-2-products-selected-390x844.png` | 390 x 844, Products chosen, actions revealed |
| `mobile-3-page-390x844.png` | The whole landing at 390, so the bridge is seen in its place |

The runner frames are the one sequence not captured with `animations:
"disabled"`, because that option finishes every animation at its end state and
would have produced five identical images. The runner's animation is paused and
its `currentTime` set by hand instead, while **every other animation in the
bridge is finished** so the rest of the frame is settled. The suite asserts the
runner's x position strictly decreases across the five frames, so a sequence that
stopped moving would fail rather than quietly ship.

The runner travels right to left here, from Distribution back to Products, and
it covers most of the distance early: `br-travel` uses the approved
`--pf-ease` (`cubic-bezier(.2,.6,.2,1)`), which is front-loaded, so the frame at
50% of the duration is already well past halfway.

**All sixteen frames are byte-identical across consecutive runs.** That was not
true of the first version: stepping *every* animation to the same `currentTime`
left the revealed section's `br-reveal` translate on a fractional pixel, and its
text anti-aliased differently each time. Byte-stability matters because these
files are the baseline a future visual-regression check would diff against.

## 2. What the suite verifies beyond the pictures

14 tests, all passing.

- **All nine destinations**, asserted literally and then **followed**, so a
  correct-looking href that 404s fails.
- **Without JavaScript**, every one of the nine is still a link in the document.
- **Keyboard**: the bridge is reached by Tab, is a **single tab stop**, one more
  Tab leaves it, and Arrow/Home/End traverse, select and move focus with it.
- **No horizontal overflow at 320, 360, 390 and 430**, checked both on the
  document and on every element inside the bridge.
- **Reduced motion** preserves the complete settled state: chosen family, gold
  node at its selected 15px, the word "Selected", the drawn live deck and all
  three destinations, with no animation running.
- **The headline** still renders `signal to deal.` in Playfair italic at
  `--pf-gold-ink`.

---

## 3. The approved engine and reference renders are missing

This is the most important thing on this page.

`design/authority/bridge/v1/SOURCE-MANIFEST.md` records two things that are
**not in the repository**:

| Named in the manifest | Present? |
|---|---|
| `source/ponte-bridge.js` (the approved engine) | **No.** `source/archive/ponte-bridge.js.gz.b64.part01` is a single 3 KB chunk of a gzip stream that does not decompress |
| `reference/*.png` (9 approval renders) | **No.** Recorded by SHA-256 only |

The `Import approved Bridge package` workflow, which exists to fetch them,
fails on its Google Drive checksum and has failed on **every run it has ever
had**, including on the branch behind merged PR #58.

What **is** present and complete is `source/ponte-bridge.css`, which the Bridge
README calls the "approved visual and motion rules", plus
`implementation/01_IMPLEMENTATION_NOTES.md`. Those notes explicitly authorise
translation:

> In React, wrap the engine or translate it into shared React primitives without
> changing its geometry, states, accessibility or semantics.

So `components/ponte/bridge/BridgeRoute.tsx` is built against the stylesheet,
class for class and state for state. **No rule of the approved CSS is
overridden.**

### 3.1 Every ENGINE DECISION, and what to compare it against

These are the points where the CSS and the notes did not determine the answer
and the missing engine would have. Each is marked `ENGINE DECISION` in the
source. **They should be checked against the reference renders once the package
is recovered**, because slices 5 to 11 all build on this primitive.

| # | Decision | What was chosen, and why | Risk if wrong |
|---|---|---|---|
| **E1** | **The deck's path shape** | A straight horizontal line. The approved CSS styles `.br__deck path` and its `d-track` / `d-live` classes but gives no `d`. The vocabulary calls the deck "the line that is crossed" | If the approved deck is an arc, the stations sit on the wrong curve. Cosmetic, but it is the bridge's signature |
| **E2** | **Station composition order** | node, pier, index, icon, title, description, mark. Derived from `.br--v`, where the node is absolutely placed at `left: -46px` against the first text line and the pier becomes a 13px horizontal connector: that only composes if the node leads | If inverted, labels sit above the deck instead of below it |
| **E3** | **Deck placement** | `top: calc(var(--br-node) / 2 - 2px)`, so the 4px deck box centres on the 11px node. Both numbers are the approved source's | Nodes float off the line. Visible immediately, and it was: the first build had them 7px low |
| **E4** | **Deck wrapper height** | Measured from the tallest station and applied as `--br-h`. `.brst` is `position: absolute`, so the wrapper has no height of its own | The bridge collapses onto the content below it |
| **E5** | **Station spacing** | `calc(88px + (100% - 176px) * i/(n-1))`, where 176px is `.brst`'s own width. The notes require measured positions and block widths and forbid "a single fixed width" | Labels collide, or the outermost ones clip |
| **E6** | **Deck length unit** | A `0 0 1000 4` viewBox with `preserveAspectRatio="none"` and `vector-effect="non-scaling-stroke"`, making `--br-len` exactly 1000 without measurement | None known. It keeps the drawn state correct server-side |
| **E7** | **Abutment labels** | **Omitted.** `PB.route` takes `left`, `right` and `rightDashed` and `.br__ab` styles them, but no authority says what a family bridge's abutments should say. Inventing copy was the worse error | The composition may be missing its end labels. Gap DS-7 |
| **E8** | **The `.brx` reveal copy** | Kicker is the family label, meta is "N ways in", question is "Where would you like to start?". `.brx__h b`, `.brx__h span` and `.brx__q` are styled by the approved CSS but carry no approved wording | Wording is a product-copy decision, in the same class as the open item the notes already record for journey-state copy |

### 3.2 One addition to the approved stylesheet

`brst__ic`, in `components/ponte/bridge/bridge-integration.css`. The slice scope
requires Ponte Flow icons on the Family Bridge and the approved stylesheet has
no icon slot on a station. It is an **addition**, not an override: it sets
position and inherits colour, so the icon law still holds. Gap DS-6.

## 4. DS-8 and DS-9, resolved

Both were found while producing this evidence, and both are now fixed in
`components/ponte/bridge/bridge-integration.css`. **The approved stylesheet was
not edited**: it is the authority, CODEOWNERS protects it, and changing it would
need an authority amendment. These are scoped corrections that let the approved
source's own states hold.

### DS-8 — a chosen station no longer shrinks when pointed at

In the approved source the hover rules outrank the selected ones:

| Rule | Specificity | Effect |
|---|---|---|
| `.brst:hover:not([disabled]) .brst__n` | (0,4,0) | 13px, `--pf-sunken` fill |
| `.brst--on .brst__n` | (0,2,0) | 15px, `--pf-gold-ink` fill |
| `.brst:hover:not([disabled]) .brst__p` | (0,4,0) | opacity .8 |
| `.brst--on .brst__p` | (0,2,0) | 2px, opacity 1 |

So moving the pointer onto the family the member had already chosen took its
node from 15px to 13px, swapped the gold for grey and faded the pier: the
selection appeared to weaken under the cursor.

The fix restores the selected state at a higher specificity, copying the values
from `.brst--on` rather than inventing any. `box-shadow` is deliberately not
restated, so a station that is both chosen and focused still shows its focus
ring. **Hover on an unselected station is untouched** and still behaves exactly
as approved — asserted in the suite, 11px to 13px with the sunken fill.

`desktop-9-selected-hover.png` is the proof: it is a hover frame and it is
identical to `desktop-2-products-selected.png`.

### DS-9 — one focus treatment, not three

`desk.css` puts a blanket ring on every focusable Desk control:

```css
.ponte-desk :where(a, button, ...):focus-visible   /* (0,2,0) */
```

`:where()` carries no specificity, so that is only `.ponte-desk` plus
`:focus-visible`. It predates the Bridge and is right for ordinary Desk
controls, which have no focus treatment of their own.

A Bridge station does, and the approved source already draws focus twice:
`.brst:focus-visible .brst__n` rings the node and `.brst:focus-visible .brst__t`
underlines the title. All three applying meant a rectangle around the whole
block **as well as** the ring and the underline.

Only the blanket ring is removed, and only inside a bridge. What remains is
still two carriers, and still compliant: the node ring is `--pf-focus-ring`, 2px
of `--pf-focus` (#1E5FA8) on `--pf-surface` (#FCFBF7) at about **5.9:1**,
comfortably past the 3:1 WCAG 1.4.11 asks of a focus indicator, plus a
differently-shaped second indicator on the title. `desktop-5-keyboard-focus.png`
shows the result.

The suite asserts both halves: that the station itself carries no box-shadow,
and that **a command-bar link outside the bridge still takes the blanket ring**,
so nothing else in the Desk lost anything.
