# Contrast and colour audit, 29 July 2026

**Status:** Accepted by the owner as the contrast baseline
**Decision:** `docs/decisions/ADR-0015-contrast-and-colour-remediation.md`
**Plan:** `docs/plans/active/contrast-and-colour-remediation.md`

## 1. What prompted it

Focus-group testing found that members cannot reliably distinguish surfaces,
modules, interactive elements and states, worst of all at 390 x 844. The owner
accepted this as a product and accessibility finding.

## 2. Method

163 colour pairs were measured as WCAG 2.1 relative-luminance contrast ratios.

Values were read from the token authority and the scoped component blocks, not
from screenshots. Opacity- and `color-mix()`-composited values were flattened to
their rendered colour first, because a 16 per cent ink stroke is not a 16 per
cent contrast reduction, and measuring the declared value would have understated
the defect.

Sources:

| File | What was taken from it |
|---|---|
| `design-system/ponte-flow/tokens/ponte-flow-tokens.css` | The `--pf-*` colour authority |
| `components/home/landing/landing.css` | `.ponte-landing` scoped block, literal hex |
| `components/find/find.css` | `.ponte-find` scoped block, literal hex |
| `components/desk/desk.css` | `.ponte-desk` aliases plus eight recorded local tints |
| `design/authority/bridge/v1/source/ponte-bridge.css` | Approved Bridge System, opacity-composited strokes |
| `components/ponte/state/state.css` | The seven lifecycle states |
| `components/ponte/category/category.css` | The shared selectable grid |
| `components/structure/structure.css` | The Start a Deal composer |

Routes covered: landing, Explore, Market Signals list and detail, Find, Start a
Deal, workspace, account, verification, and the Deal Room surfaces that exist
today (the compact journey header and the multi-party bridge). The Deal Room
itself is unimplemented and was not measured.

### Targets, and which of them are obligations

| Class | Target | Authority |
|---|---|---|
| Text, at every size this product uses | 4.5:1 | WCAG SC 1.4.3 |
| Control boundary, state indicator | 3.0:1 | WCAG SC 1.4.11 |
| Focus indicator | 3.0:1 | WCAG SC 1.4.11 |
| Divider inside a module | 1.5:1 | Proposed by this audit. Not a WCAG duty |
| Two adjacent surface fills | 1.15:1 **plus** a 3:1 rule | Proposed by this audit. Not a WCAG duty |

The last two are design targets, stated as such. WCAG does not require 3:1
between two adjacent background fills, and that cannot be met on warm paper
without abandoning the paper. Separation is therefore carried by a rule that does
clear 3:1, never by the fill alone.

## 3. Limit on the evidence

Live production screens were not captured. The site is behind the temporary
private-access wall added on 29 July 2026, and only the password's SHA-256
verifier is committed; no attempt was made to recover it. Measurement therefore
comes from the repository record, which `AGENTS.md` already ranks above a
deployed page.

The prototype used for the owner's decision rendered the real token values
through the real component relationships, and its live-rendered ratios were
checked against the calculated ones: the production palette computes 1.52:1 for a
control edge and 2.98:1 for `Not stated` in the browser, matching this table.

## 4. Result

| | Pairs | Meet target | Short |
|---|---|---|---|
| Text (4.5:1) | 55 | 39 | 16 |
| Non-text (3.0:1) | 108 | 28 | 80 |
| **Total** | **163** | **67** | **96** |

Text is largely healthy. Structure is not. That split is the finding: the palette
states the words clearly and then whispers the shape of the page.

## 5. The five failure classes

| Class | Measured | Target | What the member experiences |
|---|---|---|---|
| Panel edges and rules (`--pf-rule`, `--pf-rule-strong`) | 1.15 to 1.63:1 | 3.0:1 | Every module boundary in the product. A white panel on cream with a `#E5DFD2` border reads as one continuous sheet. The largest single cause. |
| Muted text (`--pf-mute`, at 9 to 11px) | 2.59 to 2.98:1 | 4.5:1 | `Not stated`, HS codes, references, placeholders, source lines. These are facts, not decoration, across 27 call sites. |
| Gold as a structural mark (`--pf-gold` on 1 to 3px rules and 8px points) | 2.54:1 | 3.0:1 | Bridge caps, kicker rules, the selected-intent bar, the readiness fill, the active point. Gold reads correctly as text and fails as a line. |
| Selected states carried by a wash | 1.05 to 1.20:1 | 3.0:1 edge | A hovered register row changes by 1.08:1. A selected chip's tint is 1.18:1 against its own rest state. |
| Opacity-composited structure (deck .16, pier .34, rail .32 to .42, disabled .42) | 1.42 to 3.71:1 | 3.0 / 4.5:1 | The Bridge deck is the product's central metaphor and its track is 1.42:1. The rail's own station labels are 3.71:1 at 8.5px. |

## 6. The fifteen components responsible

Ranked by share of the reported problem.

| # | Component | File | Defect | Measured |
|---|---|---|---|---|
| 1 | `.panel`, `.reg`, `.rec`, `.fam` | `desk.css` | White panel, `--rule` border, sunken page. Fill delta 1.15:1, border 1.15 to 1.33:1. Nothing bounds the module. | 1.15:1 |
| 2 | `.fam__go` | `desk.css` | A clickable route into a market, filled `--surface` on a `--raised` panel: 1.04:1 fill, 1.33:1 edge. Does not read as a control. | 1.04:1 |
| 3 | `.reg__row:hover` | `desk.css` | `color-mix(sunken 55%)` over white. The only feedback that a register row is interactive. | 1.08:1 |
| 4 | `.d-track`, `.brst__p` | `ponte-bridge.css` | Deck drawn as ink at `--pf-opacity-track` (.16); pier at .34. | 1.42:1 |
| 5 | `.st b`, `.st i`, `.rail__name` | `desk.css` | Rail labels at `rgba(242,239,232,.42)`, 8.5px mono on ink; markers at .32. | 3.71:1 |
| 6 | `dd.na`, `.reg__f dt`, `.cor .hs` | `desk.css` | `--mute` on `Not stated`, field labels and HS codes. A section 14 duty printed at 2.98:1. | 2.98:1 |
| 7 | `.reg__cls`, `.rec` | `desk.css` | Market Signal versus Member Opportunity carried by a 3px left rule: dashed `--review-line` at 1.55:1 against solid ink at 19:1. The two classifications are not equally legible. | 1.55:1 |
| 8 | `.fchip`, `.fseg`, `.spill`, `.hstile` | `find.css`, `structure.css` | Unpressed chip, segment and tile edges at 1.28 to 1.52:1; pressed jumps to ink at 19:1, so the pair is unbalanced as well as low. | 1.52:1 |
| 9 | `.qfield__i`, `.snote`, `.sigsheet__i`, `.vcp__input` | `structure.css`, `desk.css` | Input boundaries at 1.52:1. A text field is a UI component and its boundary owes 3:1. **LB-002.** | 1.52:1 |
| 10 | `.pst--active`, `.pst--loading` | `state.css` | The one lifecycle state meaning "work is happening now" is the only one that fails: gold point 2.54:1, tail dots 1.34:1 and 1.18:1. Waiting, review, blocked and completed all pass. | 2.54:1 |
| 11 | `.prodblock` | `structure.css` | `opacity:.35` on a subtree containing text: 1.61 to 1.96:1. Container opacity multiplies every descendant's contrast. | 1.61:1 |
| 12 | `.b[aria-disabled]`, `.fbtn[disabled]`, `.act` | `desk.css`, `find.css` | Three different disabled opacities (.42, .45, .5); label falls to 2.86:1. Section 12 also asks for a reason, which an opacity does not give. | 2.86:1 |
| 13 | `.err`, `.notice`, `.fev--*`, `.sval--*` | `desk.css`, `find.css`, `structure.css` | Tint fills 1.15 to 1.18:1, edges 1.51 to 1.63:1. The band text passes; the band does not read as a band. | 1.51:1 |
| 14 | `.fnav`, `.sbar`, `.cmd`, `.strip` | `find.css`, `structure.css`, `desk.css` | Sticky bars at `--surface` over a `--surface` page (1.00:1) or a sunken page (1.11:1). No seam as content scrolls beneath. | 1.00:1 |
| 15 | `.sk` | `desk.css` | Skeleton base 1.15:1 against its panel, sweep 1.06:1. Loading is indistinguishable from empty. | 1.06:1 |

## 7. Meaning carried by colour alone

Only two places. The Bridge, the classification token, the lifecycle states and
the category picker all already carry a word and a geometry as well as a hue, so
section 6 is being honoured with real discipline.

- `.reg__row:hover` — a wash and nothing else, and it is the only signal that the
  row can be opened.
- `.fchip.is-listening` — a gold fill is the only difference between listening and
  idle on the voice control.

## 8. What disappears specifically at 390 x 844

- Below 860px the register row becomes a card whose only boundary is the 1.33:1
  `--rule` border. On desktop the shared grid lines at least implied rows.
- The rail rotates to horizontal and its station labels drop to 8px at 3.71:1.
- Mono captions run 8 to 10.5px across the product. Below 11px on a phone in
  daylight, no contrast value rescues a two-letter country code.
- Sticky bars at 1.00 to 1.11:1 have no seam against content passing beneath.

Nine of the fifteen components above print structural information in mono between
8 and 10.5px. Contrast is a multiplier on legibility, not a substitute for size,
which is why the 11px floor is part of the remediation rather than a separate
typography project.

## 9. What already passes, and therefore constrains the fix

`--pf-ink`, `--pf-ink-2`, `--pf-ink-3`, `--pf-gold-ink`, `--pf-declared`,
`--pf-positive`, `--pf-review`, `--pf-danger` and `--pf-focus` all clear their
targets today.

The Bridge's selection logic is already exemplary: a chosen station changes node
fill, node size, pier weight and label weight, and prints a word, with colour
fifth. It needs contrast, not redesign.

The Desk's focus construction is also already correct.
`0 0 0 2px var(--surface), 0 0 0 4px var(--focus)` draws a light inner ring before
the blue outer one, which is why focus survives on the ink rail where the blue
alone would be 2.97:1.

## 10. Full measurement table

Sorted shortest-first within result. `Where` records the selector or condition for
composited values.

| Measurement | Pair | Measured | Target | Result | Where |
|---|---|---|---|---|---|
| Find nav bar (surface 90%) vs page ground | `#FCFBF8 ON #FCFBF7` | 1.00:1 | 3.0:1 | **short** | sticky .fnav over page |
| Structure sbar (surface 92%) vs page ground | `#FCFBF8 ON #FCFBF7` | 1.00:1 | 3.0:1 | **short** | sticky .sbar |
| Page ground vs white working surface | `#FCFBF7 on #FFFFFF` | 1.04:1 | 3.0:1 | **short** | — |
| Desk .fam__go secondary action fill vs its white panel | `#FCFBF7 ON #FFFFFF` | 1.04:1 | 3.0:1 | **short** | control fill vs panel |
| Record fact well vs white record body | `#FAF9F5 ON #FFFFFF` | 1.05:1 | 3.0:1 | **short** | .rec__f 40% |
| Skeleton sweep mix(sunken 55%, rule) vs sunken | `#ECE8DD ON #F2EFE6` | 1.06:1 | 3.0:1 | **short** | shimmer band |
| Register row hover wash vs white row | `#F8F6F1 ON #FFFFFF` | 1.08:1 | 3.0:1 | **short** | color-mix sunken 55% |
| Page ground vs sunken band | `#FCFBF7 on #F2EFE6` | 1.11:1 | 3.0:1 | **short** | — |
| HS tile hover (sunken) vs tile rest (surface) | `#F2EFE6 ON #FCFBF7` | 1.11:1 | 3.0:1 | **short** | .hs__tile:hover |
| Country-picker active option (sunken) vs list (surface) | `#F2EFE6 ON #FCFBF7` | 1.11:1 | 3.0:1 | **short** | .vcp__opt.is-active |
| White surface vs sunken band | `#FFFFFF on #F2EFE6` | 1.15:1 | 3.0:1 | **short** | — |
| Rule on sunken band | `#E5DFD2 on #F2EFE6` | 1.15:1 | 3.0:1 | **short** | — |
| Desk .b--2 secondary fill vs sunken page | `#FFFFFF ON #F2EFE6` | 1.15:1 | 3.0:1 | **short** | button fill vs ground |
| pos-tint band vs white | `#E9F1EC ON #FFFFFF` | 1.15:1 | 3.0:1 | **short** | success band fill |
| Skeleton base (sunken) vs white panel | `#F2EFE6 ON #FFFFFF` | 1.15:1 | 3.0:1 | **short** | .sk on panel |
| review-tint band vs white | `#EAEFF1 ON #FFFFFF` | 1.16:1 | 3.0:1 | **short** | notice band fill |
| declared-tint band vs white | `#F1EEE7 ON #FFFFFF` | 1.16:1 | 3.0:1 | **short** | declared pill fill |
| White surface vs gold tint | `#FFFFFF on #F5ECD8` | 1.18:1 | 3.0:1 | **short** | — |
| Selected gold tint vs white (chip selected) | `#F5ECD8 on #FFFFFF` | 1.18:1 | 3.0:1 | **short** | — |
| Active tail dot 2 (gold @ .2) | `#F2E7D1 ON #FCFBF7` | 1.18:1 | 3.0:1 | **short** | 5px |
| neg-tint band vs white | `#F7EAE6 ON #FFFFFF` | 1.18:1 | 3.0:1 | **short** | error band fill |
| gold-tint band vs white | `#F5ECD8 ON #FFFFFF` | 1.18:1 | 3.0:1 | **short** | kicker / pill fill |
| Selected tint vs page ground | `#DCE8F4 on #FCFBF7` | 1.20:1 | 3.0:1 | **short** | — |
| White surface vs select/active tint | `#FFFFFF on #DCE8F4` | 1.24:1 | 3.0:1 | **short** | — |
| --pf-select tint (dark theme rgba) n/a; light --pf-select vs raised | `#DCE8F4 ON #FFFFFF` | 1.24:1 | 3.0:1 | **short** | ::selection only |
| Hairline rule on page ground | `#E5DFD2 on #FCFBF7` | 1.28:1 | 3.0:1 | **short** | — |
| Find .fpick__tile border vs page ground | `#E5DFD2 ON #FCFBF7` | 1.28:1 | 3.0:1 | **short** | tile edge |
| Hairline rule on white surface | `#E5DFD2 on #FFFFFF` | 1.33:1 | 3.0:1 | **short** | — |
| Input border (--rule) on white | `#E5DFD2 on #FFFFFF` | 1.33:1 | 3.0:1 | **short** | — |
| Desk .fam__go border (--rule) vs its white panel | `#E5DFD2 ON #FFFFFF` | 1.33:1 | 3.0:1 | **short** | control edge |
| Active tail dot 1 (gold @ .34) | `#EBD9B7 ON #FCFBF7` | 1.34:1 | 3.0:1 | **short** | 5px |
| Track at --pf-opacity-track .16 over ground | `#DDDAD3 on #FCFBF7` | 1.35:1 | 3.0:1 | **short** | — |
| Strong rule on sunken band | `#D5CEBC on #F2EFE6` | 1.36:1 | 3.0:1 | **short** | — |
| Desk .b--2 border (--rule-strong) vs sunken page | `#D5CEBC ON #F2EFE6` | 1.36:1 | 3.0:1 | **short** | button edge |
| Bridge deck track (.d-track: ink @ .16) on page ground | `#D6D5D2 ON #FCFBF7` | 1.42:1 | 3.0:1 | **short** | Constitution 8 / WCAG 1.4.11 |
| Bridge unselected pier when a family is chosen (@ .16) | `#D6D5D2 ON #FCFBF7` | 1.42:1 | 3.0:1 | **short** | .br--chosen |
| Rail divider (@ .14) on ink | `#2F2E2D ON #0F0F0E` | 1.42:1 | 3.0:1 | **short** | rail__origin border |
| Intro rail divider (@ .14) on ink | `#2F2E2D ON #0F0F0E` | 1.42:1 | 3.0:1 | **short** | qintro divider |
| pos-line border vs white | `#BFD8C7 ON #FFFFFF` | 1.51:1 | 3.0:1 | **short** | success band edge |
| Boundary dashed item rule (@ .16) on ink | `#333331 ON #0F0F0E` | 1.51:1 | 3.0:1 | **short** | separator |
| Strong rule on page ground | `#D5CEBC on #FCFBF7` | 1.52:1 | 3.0:1 | **short** | — |
| Chip border (--rule-strong) on page ground | `#D5CEBC on #FCFBF7` | 1.52:1 | 3.0:1 | **short** | — |
| Secondary button border (--rule-strong) vs ground | `#D5CEBC on #FCFBF7` | 1.52:1 | 3.0:1 | **short** | — |
| Bridge track (rule-strong) on page ground | `#D5CEBC on #FCFBF7` | 1.52:1 | 3.0:1 | **short** | — |
| Find .fchip unpressed border vs page ground | `#D5CEBC ON #FCFBF7` | 1.52:1 | 3.0:1 | **short** | chip edge |
| Find .fseg segmented-control border vs page | `#D5CEBC ON #FCFBF7` | 1.52:1 | 3.0:1 | **short** | .fseg |
| Structure .qfield__i input border vs page | `#D5CEBC ON #FCFBF7` | 1.52:1 | 3.0:1 | **short** | number input |
| Structure .snote textarea border vs page | `#D5CEBC ON #FCFBF7` | 1.52:1 | 3.0:1 | **short** | textarea |
| Desk .sigsheet__i input border vs sheet (surface) | `#D5CEBC ON #FCFBF7` | 1.52:1 | 3.0:1 | **short** | sheet input |
| Find .vcp__input underline (rule-strong) vs page | `#D5CEBC ON #FCFBF7` | 1.52:1 | 3.0:1 | **short** | country field |
| review-line border vs white | `#C4D2D8 ON #FFFFFF` | 1.55:1 | 3.0:1 | **short** | notice band edge |
| Signal classification 3px dashed review-line vs white | `#C4D2D8 ON #FFFFFF` | 1.55:1 | 3.0:1 | **short** | .reg__cls left rule |
| Strong rule on white surface | `#D5CEBC on #FFFFFF` | 1.57:1 | 3.0:1 | **short** | — |
| Input border (--rule-strong) on white | `#D5CEBC on #FFFFFF` | 1.57:1 | 3.0:1 | **short** | — |
| Structure .prodblock inactive label (ink-3 @ .35) | `#CAC8C3 ON #FCFBF7` | 1.61:1 | 4.5:1 | **short** | .35 on subtree with text |
| neg-line border vs white | `#E6C3B8 ON #FFFFFF` | 1.63:1 | 3.0:1 | **short** | error band edge |
| Gold border vs strong rule (sel/unsel border) | `#C9973A on #D5CEBC` | 1.68:1 | 3.0:1 | **short** | — |
| Bridge gold point vs bridge track | `#C9973A on #D5CEBC` | 1.68:1 | 3.0:1 | **short** | — |
| mic-lg border mix(gold 40%, rule-strong) vs page | `#D0B888 ON #FCFBF7` | 1.86:1 | 3.0:1 | **short** | voice control edge |
| sval--add dashed border mix(gold 50%, rule-strong) vs page | `#CFB37B ON #FCFBF7` | 1.95:1 | 3.0:1 | **short** | add-a-fact control |
| Structure .prodblock inactive body (ink-2 @ .35) | `#B8B6B2 ON #FCFBF7` | 1.96:1 | 4.5:1 | **short** | whole block @ .35 |
| Selected gold border vs unselected rule | `#C9973A on #E5DFD2` | 1.98:1 | 3.0:1 | **short** | — |
| fev--managed border mix(gold 45%, rule-strong) vs white | `#D0B582 ON #FFFFFF` | 1.98:1 | 3.0:1 | **short** | selected-ish edge |
| Deal-room pier (ink @ .3) | `#B5B4B1 ON #FCFBF7` | 2.00:1 | 3.0:1 | **short** | .brdp__p |
| Disabled at .45 opacity: ink-3 over ground ~ | `#B7B3AB on #FCFBF7` | 2.02:1 | 4.5:1 | **short** | — |
| Boundary dashed frame (@ .26) on ink | `#4A4947 ON #0F0F0E` | 2.13:1 | 3.0:1 | **short** | .boundary__f |
| Bridge blocked deck (.d-blocked: danger @ .5) | `#D89E91 ON #FCFBF7` | 2.20:1 | 3.0:1 | **short** | dashed |
| Bridge station pier (.brst__p: ink @ .34) on ground | `#ABABA8 ON #FCFBF7` | 2.22:1 | 3.0:1 | **short** | 1px vertical rule |
| Task-bridge step dot, incomplete (ink @ .34) | `#ADADAD ON #FFFFFF` | 2.24:1 | 3.0:1 | **short** | .brp__steps li>i |
| Rail reserved node dashed border (@ .30) on ink | `#53524F ON #0F0F0E` | 2.45:1 | 3.0:1 | **short** | 1.5px dashed |
| Gold (brand) as text on page ground | `#C9973A on #FCFBF7` | 2.54:1 | 4.5:1 | **short** | — |
| Gold fill vs page ground (non-text) | `#C9973A on #FCFBF7` | 2.54:1 | 3.0:1 | **short** | — |
| Bridge gold moving point on ground | `#C9973A on #FCFBF7` | 2.54:1 | 3.0:1 | **short** | — |
| Bridge gold cap (--pf-gold) on ground | `#C9973A ON #FCFBF7` | 2.54:1 | 3.0:1 | **short** | .cap--gold, 2.4px |
| Bridge gold hairline before action kicker | `#C9973A ON #FCFBF7` | 2.54:1 | 3.0:1 | **short** | .brx__h b::before, 1px |
| Active/loading point (--pf-gold, 8px) on ground | `#C9973A ON #FCFBF7` | 2.54:1 | 3.0:1 | **short** | .pst--active |
| Structure .tapopt selected 3px gold bar vs page | `#C9973A ON #FCFBF7` | 2.54:1 | 3.0:1 | **short** | gold-only marker |
| Muted text (--mute) on sunken | `#9A958A on #F2EFE6` | 2.59:1 | 4.5:1 | **short** | — |
| Disabled label (mute) on sunken | `#9A958A on #F2EFE6` | 2.59:1 | 4.5:1 | **short** | — |
| Under-review ring (review @ .6) | `#94A0A7 ON #FCFBF7` | 2.59:1 | 3.0:1 | **short** | --pf-opacity-secondary |
| Bridge ahead node border (ink-3 @ .65) | `#A09D96 ON #FCFBF7` | 2.61:1 | 3.0:1 | **short** | .brst--ahead |
| Gold (brand) as text on white | `#C9973A on #FFFFFF` | 2.63:1 | 4.5:1 | **short** | — |
| Rail station dot default (@ .32) on ink | `#585754 ON #0F0F0E` | 2.65:1 | 3.0:1 | **short** | 9px dot |
| Desk disabled primary fill (ink @ .42) vs ground | `#93918B ON #F2EFE6` | 2.74:1 | 3.0:1 | **short** | .b[aria-disabled] |
| pf-icon--disabled (ink @ .42) | `#989895 ON #FCFBF7` | 2.79:1 | 3.0:1 | **short** | .pf-icon--disabled |
| Rail station label, reserved (@ .34) on ink | `#5C5B58 ON #0F0F0E` | 2.82:1 | 4.5:1 | **short** | .st--reserved b |
| Rail reserved connector dash (@ .34) on ink | `#5C5B58 ON #0F0F0E` | 2.82:1 | 3.0:1 | **short** | dashed |
| Desk .b[aria-disabled] label: surface @ .42 on ink @ .42 ground | `#F6F4ED ON #93918B` | 2.86:1 | 4.5:1 | **short** | whole button @ .42 |
| Muted text (--mute) on page ground | `#9A958A on #FCFBF7` | 2.88:1 | 4.5:1 | **short** | — |
| Focus ring (--focus) on ink button fill | `#1E5FA8 on #0F0F0E` | 2.97:1 | 3.0:1 | **short** | — |
| Muted text (--mute) on white | `#9A958A on #FFFFFF` | 2.98:1 | 4.5:1 | **short** | — |
| Muted placeholder on white input | `#9A958A on #FFFFFF` | 2.98:1 | 4.5:1 | **short** | — |
| Find .fbtn[disabled] label (surface @ .45 over that fill) | `#FCFBF7 ON #91918E` | 3.05:1 | 4.5:1 | **short** | label vs fill holds |
| Rail origin caption (@ .36) on ink | `#61605C ON #0F0F0E` | 3.05:1 | 4.5:1 | **short** | 8px mono |
| Rail journey name (rail text @ .40) on ink | `#6A6965 ON #0F0F0E` | 3.49:1 | 4.5:1 | **short** | 8px mono uppercase |
| Rail station label default (@ .42) on ink | `#6E6D6A ON #0F0F0E` | 3.71:1 | 4.5:1 | **short** | 8.5px mono |
| Bridge unavailable deck (.d-off: ink @ .45) | `#91918E ON #FCFBF7` | 3.05:1 | 3.0:1 | meets | dashed 1/3 |
| Journey legend unconfirmed rule (ink @ .45) | `#91918E ON #FCFBF7` | 3.05:1 | 3.0:1 | meets | .brj__legend em.u |
| Find .fbtn[disabled] fill (ink @ .45) vs page | `#91918E ON #FCFBF7` | 3.05:1 | 3.0:1 | meets | .fbtn 0.45 |
| Desk .act[aria-disabled] fill (ink @ .5) vs ground | `#817F7A ON #F2EFE6` | 3.48:1 | 3.0:1 | meets | .act 0.5 |
| Bridge unselected node when chosen (ink @ .5 border) | `#868583 ON #FCFBF7` | 3.56:1 | 3.0:1 | meets | .br--chosen node |
| Bridge reserved-route deck (.d-fwd: ink @ .55) | `#7A7977 ON #FCFBF7` | 4.20:1 | 3.0:1 | meets | dashed 3/5 |
| Journey legend reserved rule (ink @ .55) | `#7A7977 ON #FCFBF7` | 4.20:1 | 3.0:1 | meets | .brj__legend em.r |
| Gold ink on gold tint (hover pill) | `#8A6520 on #F5ECD8` | 4.51:1 | 4.5:1 | meets | — |
| gold-ink text on gold-tint | `#8A6520 ON #F5ECD8` | 4.51:1 | 4.5:1 | meets | fev--managed / pill |
| Gold ink on sunken band | `#8A6520 on #F2EFE6` | 4.61:1 | 4.5:1 | meets | — |
| Secondary text (--ink-3) on sunken | `#6E6A61 on #F2EFE6` | 4.69:1 | 4.5:1 | meets | — |
| declared text on declared-tint | `#6F695E ON #F1EEE7` | 4.70:1 | 4.5:1 | meets | fev--declared |
| Rail connector (@ .50) on ink | `#817F7B ON #0F0F0E` | 4.80:1 | 3.0:1 | meets | 1.75px |
| Boundary evidence caption (@ .50) on ink | `#817F7B ON #0F0F0E` | 4.80:1 | 4.5:1 | meets | 11px mono |
| neg text on neg-tint | `#B4402A ON #F7EAE6` | 4.82:1 | 4.5:1 | meets | err |
| Danger/blocked text on sunken | `#B4402A on #F2EFE6` | 4.93:1 | 4.5:1 | meets | — |
| Bridge unconfirmed deck (.d-unconf: ink @ .6) | `#6E6D6B ON #FCFBF7` | 4.99:1 | 3.0:1 | meets | dashed 2/2.6 |
| Gold ink editorial em on page ground | `#8A6520 on #FCFBF7` | 5.12:1 | 4.5:1 | meets | — |
| Structure .hsrow picked: gold-ink text vs page | `#8A6520 ON #FCFBF7` | 5.12:1 | 4.5:1 | meets | text, holds |
| Bridge selected node (gold-ink) vs unselected (surface+ink ring) | `#8A6520 ON #FCFBF7` | 5.12:1 | 3.0:1 | meets | holds |
| Focus ring (--focus) on select tint | `#1E5FA8 on #DCE8F4` | 5.19:1 | 3.0:1 | meets | — |
| Secondary text (--ink-3) on page ground | `#6E6A61 on #FCFBF7` | 5.20:1 | 4.5:1 | meets | — |
| Bridge node label (ink-3) at 9.5-11px | `#6E6A61 on #FCFBF7` | 5.20:1 | 4.5:1 | meets | — |
| Declared/unconfirmed label on page ground | `#6F695E on #FCFBF7` | 5.26:1 | 4.5:1 | meets | — |
| Gold ink editorial em on white | `#8A6520 on #FFFFFF` | 5.30:1 | 4.5:1 | meets | — |
| review text on review-tint | `#4E6472 ON #EAEFF1` | 5.34:1 | 4.5:1 | meets | notice |
| Secondary text (--ink-3) on white | `#6E6A61 on #FFFFFF` | 5.39:1 | 4.5:1 | meets | — |
| Under-review text on sunken | `#4E6472 on #F2EFE6` | 5.39:1 | 4.5:1 | meets | — |
| Blocked point + bar (--pf-danger) | `#B4402A ON #FCFBF7` | 5.47:1 | 3.0:1 | meets | .pst--blocked |
| Positive/evidence text on sunken | `#0F6E3D on #F2EFE6` | 5.50:1 | 4.5:1 | meets | — |
| pos text on pos-tint | `#0F6E3D ON #E9F1EC` | 5.50:1 | 4.5:1 | meets | fev--checked |
| Boundary body copy (@ .55) on ink | `#8C8A86 ON #0F0F0E` | 5.57:1 | 4.5:1 | meets | 12.5px .boundary .d |
| Focus ring (--focus) on sunken | `#1E5FA8 on #F2EFE6` | 5.61:1 | 3.0:1 | meets | — |
| Danger/blocked text on white | `#B4402A on #FFFFFF` | 5.66:1 | 4.5:1 | meets | — |
| Waiting point (--pf-review) on ground | `#4E6472 ON #FCFBF7` | 5.98:1 | 3.0:1 | meets | .pst--waiting |
| Completed point + rule (--pf-positive) | `#0F6E3D ON #FCFBF7` | 6.11:1 | 3.0:1 | meets | .pst--completed |
| Under-review text on white | `#4E6472 on #FFFFFF` | 6.20:1 | 4.5:1 | meets | — |
| Focus ring (--focus) on page ground | `#1E5FA8 on #FCFBF7` | 6.23:1 | 3.0:1 | meets | — |
| Positive/evidence text on white | `#0F6E3D on #FFFFFF` | 6.33:1 | 4.5:1 | meets | — |
| Register band right caption (@ .60) on ink | `#979591 ON #0F0F0E` | 6.41:1 | 4.5:1 | meets | .reg__band .r 10px |
| Active input border (--focus) on white | `#1E5FA8 on #FFFFFF` | 6.45:1 | 3.0:1 | meets | — |
| Focus ring (--focus) on white | `#1E5FA8 on #FFFFFF` | 6.45:1 | 3.0:1 | meets | — |
| Rail here/active gold dot on ink | `#C9973A ON #0F0F0E` | 7.28:1 | 3.0:1 | meets | .st--here holds |
| Boundary gold heading (--gold) on ink | `#C9973A ON #0F0F0E` | 7.28:1 | 4.5:1 | meets | holds |
| Intro rail gold eyebrow (--gold) on ink | `#C9973A ON #0F0F0E` | 7.28:1 | 4.5:1 | meets | holds |
| fam__go--1 sub-caption (@ .66) on ink | `#A5A39E ON #0F0F0E` | 7.61:1 | 4.5:1 | meets | 10px mono |
| Boundary footer copy (@ .68) on ink | `#A9A7A2 ON #0F0F0E` | 7.98:1 | 4.5:1 | meets | 12.5px |
| Rail origin value (@ .70) on ink | `#AEACA7 ON #0F0F0E` | 8.46:1 | 4.5:1 | meets | 9.5px mono |
| Rail halted dot (#9DB4C0) on ink | `#9DB4C0 ON #0F0F0E` | 8.88:1 | 3.0:1 | meets | dark-theme review, holds |
| .act consequence line (surface @ .72) on ink fill | `#BAB9B6 ON #0F0F0E` | 9.77:1 | 4.5:1 | meets | 11px mono |
| Body copy (--ink-2) on sunken band | `#3A3733 on #F2EFE6` | 10.29:1 | 4.5:1 | meets | — |
| Rail station label, done (@ .80) on ink | `#C5C2BC ON #0F0F0E` | 10.79:1 | 4.5:1 | meets | .st--done b |
| Body copy (--ink-2) on page ground | `#3A3733 on #FCFBF7` | 11.43:1 | 4.5:1 | meets | — |
| Body copy (--ink-2) on white surface | `#3A3733 on #FFFFFF` | 11.84:1 | 4.5:1 | meets | — |
| Intro rail step copy (@ .86) on ink | `#D2D0C9 ON #0F0F0E` | 12.43:1 | 4.5:1 | meets | holds |
| Boundary item title (@ .94) on ink | `#E4E2DB ON #0F0F0E` | 14.79:1 | 4.5:1 | meets | holds |
| Primary heading ink on page ground | `#0F0F0E on #FCFBF7` | 18.52:1 | 4.5:1 | meets | — |
| Primary button label (surface on ink fill) | `#FCFBF7 on #0F0F0E` | 18.52:1 | 4.5:1 | meets | — |
| Ink button fill vs page ground | `#0F0F0E on #FCFBF7` | 18.52:1 | 3.0:1 | meets | — |
| Bridge node outline (ink) on ground | `#0F0F0E on #FCFBF7` | 18.52:1 | 3.0:1 | meets | — |
| Find .fbtn--secondary is transparent: border (ink) vs page | `#0F0F0E ON #FCFBF7` | 18.52:1 | 3.0:1 | meets | ink border, holds |
| Landing .obj__ask underline (1.5px ink) vs page | `#0F0F0E ON #FCFBF7` | 18.52:1 | 3.0:1 | meets | holds |
| Find .tab2 selected 2px ink underline vs page | `#0F0F0E ON #FCFBF7` | 18.52:1 | 3.0:1 | meets | holds |
| Desk .cmd__nav aria-current ink underline vs page | `#0F0F0E ON #FCFBF7` | 18.52:1 | 3.0:1 | meets | holds |
| Primary heading ink on white working surface | `#0F0F0E on #FFFFFF` | 19.18:1 | 4.5:1 | meets | — |
| Find .fchip pressed (ink) vs unpressed (raised) | `#0F0F0E ON #FFFFFF` | 19.18:1 | 3.0:1 | meets | strong, holds |
| Opportunity classification 3px ink vs white | `#0F0F0E ON #FFFFFF` | 19.18:1 | 3.0:1 | meets | .reg__row--opp holds |

---

Recorded by the contrast audit task, 29 July 2026. Superseded only by a later
owner-accepted measurement.
