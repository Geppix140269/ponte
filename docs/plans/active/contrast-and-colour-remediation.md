# ExecPlan — Contrast and colour remediation

**Status:** Active. Governance stage complete on merge of this PR; Stage 1 not started.
**Authority:** ADR-0015; Ponte Design Constitution v1.1 sections 6a, 6b, 6c, 15a, 18a, 18b.
**Audit:** `docs/codex/audits/contrast-remediation/CONTRAST-AUDIT-2026-07-29.md`
**Owner decision:** Giuseppe Funaro, 29 July 2026.
**Launch blockers:** LB-001, LB-002.

---

## 1. Purpose and user outcome

A member can tell, without effort and on a phone, where one module ends and the
next begins, which things on the screen they can act on, which of several options
is selected, and which commercial facts a record does not state.

Today they cannot. 96 of 163 measured colour pairs fall short, and two of the
failures put a member at risk of a wrong commercial read rather than merely
irritating them:

- required input boundaries at approximately 1.52:1, so a member may not see the
  field they must complete (LB-001);
- `Not stated` at approximately 2.98:1, so a member may read an absent commercial
  fact as a stated one (LB-002).

The outcome is measured, not judged: every value in section 18a of the
Constitution is met, against the darkest surface it is drawn on, with the warm
paper identity and the meaning of gold unchanged.

## 2. Authority consulted

| Source | What it governs here |
|---|---|
| `docs/decisions/ADR-0015-contrast-and-colour-remediation.md` | The accepted direction, the gold/blue semantic split, the two stages |
| `design/authority/PONTE_DESIGN_CONSTITUTION_v1.md` v1.1 | Sections 6a, 6b, 6c (colour), 15a (surface boundaries), 18a, 18b (contrast and caption floor), 22 (design gate) |
| `docs/decisions/ADR-0002-ponte-design-constitution.md` | The prohibition on an uncontrolled application-wide repaint |
| `docs/decisions/ADR-0010-constitution-led-interface-rebuild.md` | Journey-by-journey delivery; preserved, and reconciled in ADR-0015 |
| `design/authority/bridge/v1/` | Bridge geometry, which does not change. `APPROVAL.md`, `README.md`, `source/ponte-bridge.css` |
| `design-system/ponte-flow/documentation/colour-and-state-rules.md` | Existing colour and state vocabulary |
| `design-system/ponte-flow/documentation/compatibility-aliases.md` | The eight local extensions ADR-0015 promotes |
| `AGENTS.md` | Launch Mode; stop conditions; no merge without owner approval |
| `.agent/PLANS.md` | This format |

## 3. Current implementation discovered

- The `--pf-*` set in `design-system/ponte-flow/tokens/ponte-flow-tokens.css` is
  the authority, declared on `:root`, imported by `app/globals.css` above the
  Tailwind directives. `design-system/ponte-flow/__tests__/token-authority.test.ts`
  pins that chain.
- `.ponte-desk` in `components/desk/desk.css` aliases 21 names onto `--pf-*` and
  declares 8 local tint and line extensions plus `--e-2`.
- `.ponte-find` (`components/find/find.css`) and `.ponte-landing`
  (`components/home/landing/landing.css`) still declare the same Brand v5 values
  as **literal hex**, so a token change does not reach them. This is recorded as
  outstanding duplication in `compatibility-aliases.md` section 5. It is why the
  token change alone is not sufficient.
- `components/legal/legal.css` and `components/pfooter.css` carry the same
  duplication at smaller scale.
- `components/ponte/category/category.css` and `components/ponte/state/state.css`
  already read `--pf-*` directly and need no alias work.
- `design/authority/bridge/v1/source/ponte-bridge.css` draws the deck and pier as
  `--pf-ink` at `--pf-opacity-track` (.16) and `.34`. It is a CODEOWNERS-protected
  approved authority package.
- `design/handoff/qualified-opportunities/ponte-system.css` and
  `design/handoff/structure/ponte-system.css` are handoff artefacts, imported by
  no route. Out of scope; not to be edited.
- `app/globals.css` carries the legacy obsidian palette for unmigrated routes.
  Out of scope for this plan.
- `scripts/check-encoding.mjs` bans em dashes in `app/` and `components/`. Every
  CSS comment written by this work must use a comma, a colon or two sentences.

### The Bridge manifest pins the live token file

`design/authority/bridge/v1/SOURCE-MANIFEST.md` records a SHA-256 for every file
of the owner-approved Bridge delivery of 27 July 2026, and
`scripts/check-governance.mjs` verifies each one. Its path resolver maps the
manifest row `ponte-flow/tokens/ponte-flow-tokens.css` to the **live**
`design-system/ponte-flow/tokens/ponte-flow-tokens.css`, not to a vendored copy.

**Consequence: Stage 1 fails `check-governance.mjs` the moment it changes a token
value, whether or not it touches anything in the Bridge package.** The manifest
row must be updated with the new hash in the same commit.

That is not an implementation action. The manifest describes an owner-approved
delivery, and the check exists precisely because the repository once did not hold
what the manifest described. The Stage 1 PR must therefore state plainly that it
amends the manifest, quote the old and new hashes, and rely on ADR-0015 as the
authority for the value change. Recorded as an open item in section 12.

### The test that dictates part of the shape of Stage 1

`token-authority.test.ts` holds a `counterparts` map that **fails** if
`--pf-positive-line`, `--pf-review-line`, `--pf-danger-line`, `--pf-gold-tint` or
the other promoted names appear in the approved token file while the Desk still
declares its local copy. The test is a ratchet: promoting a value obliges the
same PR to alias the Desk name onto it and delete the extension. That is intended
behaviour and is the mechanism that keeps Stage 1 complete.

## 4. Scope

### In scope, Stage 1

- `design-system/ponte-flow/tokens/ponte-flow-tokens.css` — value changes, new tokens
- `components/desk/desk.css` — retire the 8 local extensions to aliases; migrate wrong-token call sites
- `components/find/find.css` — convert the literal `.ponte-find` block to `var(--pf-*)` aliases
- `components/home/landing/landing.css` — same for `.ponte-landing`
- `components/legal/legal.css`, `components/pfooter.css` — same
- `components/structure/structure.css`, `components/verify/verify.css`, `components/check/verify.css`, `components/explore/explore.css`, `components/signals/signal.css` — wrong-token call sites only
- `components/ponte/state/state.css` — the active/loading point moves to `--pf-gold-rule`
- `components/ponte/category/category.css` — the selection mark moves to `--pf-gold-rule`
- `design/authority/bridge/v1/source/ponte-bridge.css` — **owner sign-off required, see section 12**
- `design/authority/bridge/v1/SOURCE-MANIFEST.md` — **unavoidable.** The manifest hashes the live token file, so any token value change fails the governance check until the row is updated. See section 3
- `design-system/ponte-flow/__tests__/token-authority.test.ts` — update the ratchet lists
- `design-system/ponte-flow/documentation/compatibility-aliases.md` — retire section 3
- `design-system/ponte-flow/documentation/accessibility.md` — record the numeric targets
- The 11px mobile caption floor, in the stylesheets that set structural mono captions

### In scope, Stage 2

The four `--pf-interact-*` tokens, applied journey by journey in the owner's
order: Start a Deal, landing interactive controls, Market Signals, Find, account
and Workspace, verification and Deal Room.

### Explicitly excluded

- Any route, data, permission, schema or business-logic change
- Bridge geometry: station spacing, node sizes, deck curvature, pier length, arc construction
- The meaning of gold
- Motion: no duration, easing, trigger, interruption or reduced-motion fallback changes
- Typography families, weights and tracking. Only the mobile size floor changes
- Iconography and the Ponte Flow registry
- Spacing tokens and layout rhythm
- `app/globals.css` legacy obsidian palette
- `design/handoff/**` reference artefacts
- Gap DS-1, the two dark-theme literals on the Desk ink panels. Still recorded, still open
- Promoting `--e-2` to an approved elevation token. Not a colour and not in ADR-0015

## 5. Product rules

- No factual class, permission, privacy or approval behaviour changes. This work
  changes how a record looks, never what it says or who may see it.
- Market Signals and Member Opportunities stay visually and linguistically
  distinct (§14). Stage 1 improves the distinction: the Signal's dashed
  `--review-line` rule rises from 1.55:1 to 4.19:1, so the two classifications
  become **equally** legible rather than one being invisible.
- Gold gains no status meaning. `--pf-gold-rule` is gold as a line; it is not
  verification, approval, warning, review or success at any weight.
- Blue gains no status meaning. It is interaction only (§6a).
- Colour remains never the only carrier. Stage 1 closes the two 1.4.1 breaches
  the audit found, by adding an inset edge and a printed word to the register row
  hover, and a word to the voice-control listening state.
- A disabled control keeps its stated reason (§12). Replacing three opacity
  values with token colour must not remove a reason; where no reason exists today,
  one is added.

## 6. Technical design

### 6.1 Stage 1 token set

Every value below is solved against the **sunken well** `#E2DBC4`, the darkest
surface each is drawn on, and therefore clears its target on the page ground and
on white as well. Warmth is held by shifting each value along its own hue rather
than scaling channels proportionally, which drains chroma as luminance falls.

| Token | Current | Stage 1 | Target | On white / ground / well |
|---|---|---|---|---|
| `--pf-surface` | `#FCFBF7` | `#F2EEE2` | fill 1.15 vs white | 1.16 / — / 1.19 |
| `--pf-raised` | `#FFFFFF` | `#FFFFFF` | unchanged | — |
| `--pf-sunken` | `#F2EFE6` | `#E2DBC4` | fill 1.15 vs ground | 1.38 / 1.19 / — |
| `--pf-rule` | `#E5DFD2` | `#B9B3A6` | 1.5 divider | 2.09 / 1.80 / 1.51 |
| `--pf-rule-strong` | `#D5CEBC` | `#827B69` | 3.0 control edge | 4.21 / 3.63 / 3.04 |
| `--pf-ink` | `#0F0F0E` | unchanged | — | 19.18 / 16.53 / 13.85 |
| `--pf-ink-2` | `#3A3733` | `#38352F` | 4.5 text | 12.22 / 10.53 / 8.82 |
| `--pf-ink-3` | `#6E6A61` | `#5D5950` | 4.5 text | 6.98 / 6.01 / 5.04 |
| `--pf-mute` | `#9A958A` | `#656055` | 4.5 text | 6.25 / 5.39 / 4.52 |
| `--pf-gold` | `#C9973A` | unchanged | large fills only | label on fill, not fill on paper |
| `--pf-gold-ink` | `#8A6520` | `#7E5914` | 4.5 text | 6.31 / 5.44 / 4.56 |
| `--pf-gold-rule` **new** | — | `#A47215` | 3.0 structural line | 4.20 / 3.62 / 3.03 |
| `--pf-positive` | `#0F6E3D` | `#0E5F35` | 4.5 text | 7.76 / 6.69 / 5.60 |
| `--pf-review` | `#4E6472` | `#455966` | 4.5 text | 7.31 / 6.30 / 5.28 |
| `--pf-danger` | `#B4402A` | `#A2381F` | 4.5 text | 6.73 / 5.80 / 4.86 |
| `--pf-declared` | `#6F695E` | `#5F5A50` | 4.5 text | 6.85 / 5.91 / 4.95 |
| `--pf-focus` | `#1E5FA8` | **unchanged** | 3.0 focus | 6.45 / 5.56 / 4.65 |
| `--pf-gold-tint` **promoted** | `#F5ECD8` local | `#E4DBC7` | band fill | 1.38 vs white; its gold-ink text 4.59 |
| `--pf-positive-line` **promoted** | `#BFD8C7` local | `#698271` | 3.0 band edge | 4.17 / 3.60 / 3.01 |
| `--pf-positive-tint` **promoted** | `#E9F1EC` local | `#D6DED9` | band fill | 1.37 vs white; its text 5.66 |
| `--pf-review-line` **promoted** | `#C4D2D8` local | `#707E84` | 3.0 band edge | 4.19 / 3.62 / 3.03 |
| `--pf-review-tint` **promoted** | `#EAEFF1` local | `#D8DDDF` | band fill | 1.37 vs white; its text 5.33 |
| `--pf-danger-line` **promoted** | `#E6C3B8` local | `#977469` | 3.0 band edge | 4.18 / 3.61 / 3.02 |
| `--pf-danger-tint` **promoted** | `#F7EAE6` local | `#E6D9D5` | band fill | 1.38 vs white; its text 4.89 |
| `--pf-declared-tint` **promoted** | `#F1EEE7` local | `#DFDCD5` | band fill | 1.37 vs white; its text 5.00 |
| `--pf-opacity-track` | `.16` | **withdrawn** | — | the deck strokes `--pf-rule-strong` instead |
| `--pf-select` | `#DCE8F4` | retained until Stage 2 | `::selection` only | replaced by `--pf-interact-surface` in Stage 2 |

Result: **21 of 21 gates pass.** Warm-paper character is preserved or increased,
measured as the R-minus-B spread: `--pf-surface` 5 to 16, `--pf-sunken` 12 to 30,
`--pf-rule` 19 held, `--pf-rule-strong` 25 held, `--pf-gold-tint` 29 held.

### 6.2 Stage 2 token set

| Token | Value | Role | On white / ground / well |
|---|---|---|---|
| `--pf-interact` | `#17548C` | Interaction foreground: links, current-page marks, the label of a selected control | 7.83 / 6.75 / 5.65 |
| `--pf-interact-border` | `#2C6EAC` | Interaction border: active input boundary, selected control edge, expanded module edge | 5.34 / 4.60 / 3.86 |
| `--pf-interact-surface` | `#D2DDEA` | Interaction surface: selected row or open module fill. **Never used alone** — always with the border and a printed word | 1.38 / 1.19 / — ; its own text 5.69 |
| `--pf-interact-active` | `#0F3C67` | Hover and active. Deeper, never lighter, so the affordance strengthens under the pointer | 11.28 / 9.72 / 8.14 |

`--pf-interact` is 1.21:1 from `--pf-focus` and `--pf-interact-border` is 1.21:1
from it: close in hue, distinct in weight and position, so focus and selection do
not collapse into one another. `--pf-focus` keeps its value and its single
meaning.

### 6.3 Wrong-token call sites, enumerated

The only call-site edits Stage 1 is permitted to make. 63 uses of `--gold` and
`--pf-gold` were inventoried; they split as follows.

**Must move to `--pf-gold-rule`** — a line, a cap, a bar or a small state marker
drawn on paper, owing 3:1:

| File | Selector |
|---|---|
| `desk.css:408` | `.kicker::before` (1px rule) |
| `desk.css:422` | `.cls--opp::before` (7px Member Opportunity classification dot) |
| `find.css:171` | `.fphead__rule` (1px) |
| `find.css:226, 244, 410, 481` | `.g-dot` (6 to 7px, on paper) |
| `find.css:484` | `.readiness__fill` (3px) |
| `structure.css:51` | `.tapopt[aria-pressed="true"]::before` (3px selection bar) |
| `structure.css:64` | `.mic-lg` border `color-mix(gold 40%, rule-strong)`, measured 1.86:1 |
| `structure.css:105` | `.hsrow.leaf.is-picked .hsrow__code::before` |
| `structure.css:195`, `verify.css:38, 56`, `explore.css:79, 246, 254, 344`, `landing.css:535, 611, 645, 665` | 1px hover and selected border colours |
| `landing.css:455, 470` | `.f-dot.hot` stroke, `.f-run` fill |
| `category.css:117, 138` | `.pcat__mark` (3px selection rule) |
| `state.css:98` | `.pst--active`, `.pst--loading` point and its two tail dots |
| `check/verify.css:107, 277` | small gold marks |

**Stays `--pf-gold`** — a full control fill where the label carries the contrast,
a large brand mark, or gold on ink where it already measures 7.28:1:

| File | Selector | Why |
|---|---|---|
| `desk.css:204`, `find.css:137`, `landing.css:119` | lockup dot | Brand identity, not an interface mark |
| `desk.css:354, 372, 609, 821, 1002`, `find.css:301, 378, 464`, `structure.css:67` | `:hover { background: var(--gold) }` | Full fill; ink on gold is about 7:1 |
| `desk.css:308, 324` | `.st--here i`, `.st--active i` | On the ink rail, 7.28:1 |
| `desk.css:685, 695`, `find.css:457, 461` | gold icon and text on ink | Passes |
| `verify.css:210, 276` | `accent-color` | Native control fill |
| `desk.css:482` | `.reg__band .dot` | On the ink band, passes |

**Other wrong-token work:**

- `desk.css:449` `.reg__row:hover` gains an inset `--pf-rule-strong` edge and,
  when selected, a printed word. Closes a 1.4.1 breach.
- `find.css:378` `.fchip.is-listening` gains a text label. Closes the second
  1.4.1 breach.
- `structure.css:55` `.prodblock { opacity: .35 }` becomes token colour at full
  opacity (§6c).
- `desk.css:360, 376, 613` and `find.css:303` — three disabled opacities become
  one token treatment, with a stated reason where none exists.
- `desk.css` rail: `rgba(242,239,232,.32 to .50)` become solid values meeting
  4.5:1 for labels and 3:1 for markers on ink.
- `desk.css:705` `.sk` skeleton gains a visible base and sweep.

### 6.4 The 11px caption floor

A single media query per scoped stylesheet, below 860px, raising structural mono
captions to 11px. Affects the fact register, the journey rail, crumb trails,
classification tokens, field labels and reference lines. Nine of the fifteen
audited components set these between 8 and 10.5px.

This reflows dense mono rows. It is a layout change, not only a size change, and
is why Stage 1 needs 390 x 844 evidence per screen rather than a colour diff.

## 7. Migration plan

No database, schema or production data is involved.

| Step | Change | Reversal |
|---|---|---|
| Governance | This PR: ADR-0015, Constitution v1.1, this plan, LB-001, LB-002, register updates | Revert the PR |
| Stage 1 | Central tokens, alias conversions, enumerated call sites, caption floor, tests | Revert the token block; the alias conversions are value-neutral and may stay |
| Stage 2 | Four interaction tokens, applied per journey | Re-point the four tokens to `--pf-ink` and `--pf-gold-ink`, restoring current semantics without removing the tokens |

Forward path after Stage 1: the four remaining duplicated stylesheets are aliased,
so there is exactly one place a Ponte colour can be changed. That is the state
`compatibility-aliases.md` section 5 has been asking for.

## 8. Experience states

Every screen in section 11's evidence matrix must be captured in all of:

| State | What must be true after Stage 1 |
|---|---|
| Neutral | Page ground, working surface and well are distinguishable, each pair carrying a fill delta and a 3:1 rule |
| Loading | The skeleton is visible against its own panel. Loading is not mistakable for empty |
| Empty | The dashed band edge reads as a band |
| Incomplete | `Not stated` is legible at 4.5:1 on every surface it appears on |
| Ambiguous | An unconfirmed Market Signal keeps its dashed rule, now at 4.19:1 |
| Error | The error band reads as a band; its text keeps AA on the deepened tint |
| Blocked | Red plus the bar geometry plus the stated condition |
| Waiting | Slate, no tail, no movement |
| Resumed | Unchanged behaviour; no visual regression on the resumed step |
| Completed | Positive token plus the solid rule |
| Expired, withdrawn | Unchanged behaviour |
| Selected | Fill, a 3:1 edge, a weight change and a printed word. Survives greyscale |
| Focus | Inner light ring plus outer `--pf-focus`, distinct from selection |
| Disabled | Token colour at full opacity, with a stated reason |
| Reduced motion | Unchanged. No motion value is touched |
| Keyboard | Every control reachable, focus visible on every surface including ink |
| Greyscale | Every state above still identifiable |
| 390 x 844 | Structural captions at 11px or more; every module boundary drawn |

## 9. Validation

- `npm run verify` before declaring Stage 1 complete. It runs
  `check-encoding.mjs` (no em dashes in `app/` or `components/`),
  `check-governance.mjs`, the token-authority test and the full test suite.
  **`check-launch-mode.mjs` currently fails on `main` for an unrelated reason
  (PL-004) and must be fixed before Stage 1 can report a passing gate.**
- `check-governance.mjs` will fail until
  `design/authority/bridge/v1/SOURCE-MANIFEST.md` carries the new token-file
  hash. That is expected, not a surprise, and it is called out here so a reviewer
  does not read the manifest edit as scope creep.
- `token-authority.test.ts` updated in the same commit as the promotions, with
  `LOCAL_EXTENSIONS` shrinking from 9 entries to 1 (`--e-2` only) and the
  `counterparts` map reduced to the elevation gap.
- A new test asserting that `.ponte-find`, `.ponte-landing`, `.ponte-legal` and
  the footer scope hold no literal colour, extending the existing property from
  the Desk to all five scopes.
- A new test asserting the section 18a numeric targets against the token file, so
  a future value change that breaks a target fails the build rather than a review.
- Manual: desktop and 390 x 844 for the four screens in section 11, in all the
  states in section 8.
- Not claimed until evidenced: no production deployment, and the private-access
  wall means production screens cannot be captured until it is lifted.

## 10. Rollout and safe-disable

No feature flag. A token change cannot be half-applied without leaving two
palettes on one page, which is worse than either.

Sequencing: this governance PR merges first. Stage 1 is one PR, reviewed against
the section 11 evidence, and merges only on explicit owner design approval.
Stage 2 opens after Stage 1 is merged, one PR per journey in the owner's order.

Safe-disable is revert, per section 7.

## 11. Evidence matrix, Stage 1

Required before Stage 1 review. Before and after, with measured values.

| Screen | Route |
|---|---|
| Landing and Family Bridge | `/[locale]` |
| Market Signals list | `/[locale]/market-signals` |
| Start a Deal form | `/[locale]/structure` |
| Workspace / record management | `/[locale]/workspace` |

For each: desktop **and** 390 x 844, in neutral, selected, focus, and disabled or
secondary state, plus a greyscale comparison. Measured contrast values before and
after for every value the screen displays.

## 12. Decisions and discoveries

### Decided by the owner, 29 July 2026

- Direction B with Direction C's three non-colour mobile rules.
- Gold and blue semantics as recorded in Constitution section 6a.
- `--pf-focus` not repurposed; a separate `--pf-interact-*` family.
- LB-001 and LB-002 are launch blockers. The 11px floor is part of the launch
  remediation, not a separate redesign.
- Governance PR first; Stage 1 not to begin until it is merged.

### Decided in this plan, and open to correction at review

- **Stage 1 lands Direction B's structural values, not Direction A's.** The audit
  presented A as the structural half. B is the accepted destination and its
  surfaces are specified independently of the blue, so landing A first would mean
  moving the surfaces twice and taking two sets of evidence for one decision.
- **The promoted tints and lines are Stage 1, not Stage 2.** Their values change,
  and `token-authority.test.ts` will not allow a changed value to sit in a local
  extension once its approved counterpart exists.

### Open, and requiring the owner's specific sign-off before Stage 1 begins

**1. Amending the approved Bridge source manifest.** Recorded in section 3, and
not optional: `SOURCE-MANIFEST.md` hashes the live token file, so Stage 1 cannot
pass `check-governance.mjs` without updating that row. The manifest describes an
owner-approved delivery, so an agent should not rewrite it silently even though
the mechanical change is one hash. The Stage 1 PR will quote both hashes and cite
ADR-0015. **Confirm this is acceptable, or direct that the manifest be
restructured so it stops pinning a file that lives outside the package.** The
second is arguably the better fix, and it is a separate piece of work.

**2. A pre-existing failure that blocks the validation gate.**
`scripts/check-launch-mode.mjs` fails on `main` today, for a reason unrelated to
this work: it substring-matches a phrase that `AGENTS.md:128` wraps across a
newline. Logged as PL-004. `npm run verify` cannot pass until it is fixed, so
Stage 1 cannot honestly report a green gate. It needs resolving before or with
Stage 1; the one-line fix is in PL-004.

**3. The Bridge deck and pier.** Finding 4 of the audit is
`design/authority/bridge/v1/source/ponte-bridge.css`, where the deck is drawn as
`--pf-ink` at `--pf-opacity-track` (.16), measuring **1.42:1**, and the pier at
.34, measuring 2.22:1. The fix is to stroke `--pf-rule-strong` at full opacity for
the deck and pier, and `--pf-rule` for a receded pier, which preserves the
recession relationship the approved source expresses through opacity.

It is raised separately because:

- the owner's Stage 1 scope does not name it;
- the file is a **binding approved authority package** under §8 and CODEOWNERS,
  not an implementation stylesheet;
- it is arguably the "wrong semantic token" case Stage 1 permits, since a
  structural rule should read from a rule token, but that is a reading, not an
  instruction.

Geometry, station spacing, node sizes and gold semantics are untouched either way.
Leaving it means Stage 1 ships with the audit's own headline finding open, and the
Bridge is the product's central metaphor. **Recommendation: include it in Stage 1,
with the diff limited to the four stroke declarations and the withdrawal of
`--pf-opacity-track`.**

### Discovered

- The `.ponte-find` and `.ponte-landing` literal blocks mean a token change alone
  reaches only the Desk. Aliasing them is not optional scope creep; without it,
  Start a Deal and the landing keep the failing values and LB-001 is not closed.
- `--pf-gold` is used 63 times across 12 stylesheets, and only about a third are
  the structural marks that must move. The rest are full fills where the label
  carries the contrast, so a blanket replacement would be wrong.
- The Desk's focus construction, an inner light ring before the blue outer ring,
  is already correct and is why focus survives on ink. It must not be
  "simplified" while nearby values change.
- `design/handoff/**` contains two more copies of the palette. They are imported
  by nothing and are excluded, but they will read as stale after Stage 1.

## 13. Final evidence

To be completed as work lands.

| Item | Status |
|---|---|
| Governance PR (ADR-0015, Constitution v1.1, this plan, LB-001, LB-002) | Open; not merged |
| Stage 1 PR | Not started. Blocked on the governance PR merging |
| Stage 1 evidence, four screens, two viewports, four states, greyscale | Not captured |
| Stage 2 PRs, six journeys | Not started |
| `npm run verify` on Stage 1 | Not run |
| Production deployment | Not done. No production change is authorised by this plan |

## Progress log

- **29 July 2026** — Audit completed and accepted; owner approved Direction B
  with Direction C's mobile rules; ADR-0015, Constitution v1.1, this ExecPlan,
  LB-001 and LB-002 drafted in the governance PR. Stage 1 not started. One item
  awaiting owner sign-off: the Bridge deck and pier, section 12.
