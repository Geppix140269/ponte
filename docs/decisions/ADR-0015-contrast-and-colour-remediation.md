# ADR-0015 — Contrast and colour remediation: strengthened paper with a blue interaction family

- **Status:** Accepted by the product owner; effective when merged
- **Decision date:** 29 July 2026
- **Owner:** Giuseppe Funaro
- **Amends:** `design/authority/PONTE_DESIGN_CONSTITUTION_v1.md` sections 6, 15 and
  18, taking it to **v1.1**
- **Supersedes:** Nothing. It amends the colour law within ADR-0002's scope and
  changes no other rule
- **Does not supersede:** ADR-0002's prohibition on an uncontrolled
  application-wide repaint, ADR-0010's journey-by-journey delivery requirement,
  or any rule in the Constitution not named above

## Context

Focus-group testing found that members cannot reliably distinguish surfaces,
modules, interactive elements and states, worst of all at 390 x 844. The owner
accepted this as a product and accessibility finding and commissioned an audit
rather than a repaint.

The audit measured 163 colour pairs, taken from the token authority and the
scoped component blocks rather than from screenshots, with opacity- and
`color-mix()`-composited values flattened before measurement. It is recorded at
`docs/codex/audits/contrast-remediation/CONTRAST-AUDIT-2026-07-29.md`.

The result located the defect precisely, and not where a "low contrast" report
would normally point:

- **Text is largely healthy.** 39 of 55 text pairs already clear WCAG AA.
  `--pf-ink`, `--pf-ink-2`, `--pf-ink-3`, `--pf-gold-ink`, `--pf-declared`,
  `--pf-positive`, `--pf-review`, `--pf-danger` and `--pf-focus` all pass today.
- **Structure is not.** 80 of 108 non-text pairs fall short. Every control
  boundary in the product, every semantic band edge, the Bridge deck at 1.42:1,
  the journey rail's own station labels at 3.71:1, register row hover at 1.08:1.

One token carries most of the reported problem. `--pf-rule-strong` (`#D5CEBC`)
is simultaneously the module edge, the input boundary, the chip edge and the
secondary-button edge, and it measures **1.36:1** against the sunken well it is
most often drawn on. A member looking for the edge of a thing was looking for
something that was not being drawn.

Two further findings bear on user safety rather than polish:

1. Required form and input boundaries measure approximately **1.52:1** on the
   Start a Deal surfaces. A member may not see the field they are required to
   complete.
2. Meaningful missing-data text, including `Not stated`, measures approximately
   **2.98:1**. A member may read an absent commercial fact as a stated one.

Both are duties the Constitution already imposes — section 13 on form states and
section 14 on records showing only facts the record supports — so neither is a
new requirement, only an unmet one.

## Decision

> I, Giuseppe Funaro, approve Direction B — paper with blue interaction —
> incorporating Direction C's three non-colour mobile rules. This is the chosen
> Ponte contrast direction.

The purpose is to improve the distinction between surfaces, modules, controls
and states **without replacing the warm paper identity and without changing the
meaning of gold**.

### The semantic decision

This is the substantive change to the colour law, and it is the reason this ADR
exists rather than a token patch.

**Gold remains exclusively:**

- the Ponte signal;
- movement across an approved Bridge;
- an arrived or selected Bridge destination;
- approved editorial emphasis.

**Blue represents interaction:**

- links;
- navigational emphasis;
- selected controls that are **not** journey positions;
- active and expanded controls;
- active form boundaries;
- keyboard focus, through the existing focus semantics.

**Blue must never mean** verification, success, warning, review, commercial
completion or Bridge arrival. Those remain `--pf-positive`, `--pf-review`,
`--pf-danger` and the Bridge's own gold.

`--pf-focus` is **not** repurposed as a general interaction token. It keeps its
single meaning and its current value, and a separate `--pf-interact-*` family
carries interaction. A focused control and a selected control must not look the
same, so the two are held visually distinct: `--pf-focus` `#1E5FA8` against
`--pf-interact-border` `#2C6EAC` is 1.21:1, deliberately close in hue and
distinct in weight and position.

### The boundary where gold and blue meet

A chosen Bridge family is both a "selected control" and an "arrived
destination". **It stays gold.** Blue takes selected controls that are not
journey positions: chips, segmented controls, tabs, rows, tiles, expanded
modules. Without that line drawn, blue would walk into the Bridge and the two
systems would stop meaning different things.

This boundary must be checked in every journey slice where a Bridge appears
beside a selected control.

## Constitution amendment, per section 3

| Section 3 requirement | Record |
|---|---|
| Rule affected | Constitution sections 6 (colour law), 15 (surfaces and rule weight) and 18 (approved contrast levels, previously stated without numbers). Section 6 gains a second semantic family. |
| Reason | Accepted focus-group finding. 96 of 163 measured pairs short of target, including every control boundary and the Bridge deck at 1.42:1. |
| Components and routes affected | The `--pf-*` authority and the three scoped token blocks (`.ponte-landing`, `.ponte-find`, `.ponte-desk`). Fifteen named components. All 35 routes under `app/[locale]/`, because the change is at the token layer. |
| Mobile impact | Largest improvement at 390 x 844: card edges 1.33 to 4.21, rail labels 3.71 to 9.28. Adds an 11px minimum for structural mono captions below 860px, which reflows the fact register, the journey rail and the crumb trails. Those need re-measuring at 390px, not only re-colouring. |
| Accessibility impact | WCAG 1.4.3 and 1.4.11 move from failing to passing. Two 1.4.1 breaches closed. Focus stays compliant and stays distinct from selection. Greyscale legibility of selected and disabled states restored. Residual risk recorded below. |
| Reduced-motion impact | None. No duration, easing, trigger or reduced-motion fallback changes. |
| Migration | Two stages, below. |
| Rollback | Stage 1: revert the token block. Stage 2: re-point the four interaction tokens to `--pf-ink` and `--pf-gold-ink`, which restores current semantics without removing the tokens. |
| Owner approval | Giuseppe Funaro, 29 July 2026, recorded in this ADR. |
| New version | Constitution v1.1. |

## Migration: two controlled stages

### Stage 1 — structural contrast

One dedicated pull request. Central token and typography changes only.

Stage 1 lands the **approved Direction B structural values**, not Direction A's.
Direction B is the accepted destination, and landing A's surfaces first would
mean moving them again in Stage 2 and taking two sets of visual evidence for one
decision.

Stage 1 must require no broad call-site repainting **except where a component is
using the wrong semantic token**. Two classes qualify, both enumerated in the
ExecPlan:

- small gold structural marks that must move from `--pf-gold` to the new
  `--pf-gold-rule`, because a 1px rule and a 7px state dot owe 3:1 and
  `--pf-gold` gives 2.63:1;
- the eight recorded local tint and line extensions in `desk.css`, which must be
  promoted into the approved set, because their values change and Constitution
  section 6 makes approved tokens the sole colour source.

### Stage 2 — the blue interaction family

A separate authority and implementation pull request, after Stage 1 is approved
and merged. Adds four tokens and applies them journey by journey:

1. Start a Deal
2. landing interactive controls
3. Market Signals
4. Find
5. account and Workspace
6. verification and Deal Room

Blue must not be applied globally to panels, page backgrounds or Bridge
structures.

## Reconciliation with ADR-0002 and ADR-0010

ADR-0002 rejected an uncontrolled application-wide repaint, and ADR-0010
preserved that prohibition explicitly while widening what the Constitution
governs. Stage 1 changes values inside the central token authority, and that
changes the rendered output of every route at once. The tension is real and is
resolved rather than ignored:

- The prohibition is on **a pull request that repaints fragments across many
  unrelated routes** — hand-edited component styling, journey by journey, in one
  diff. Constitution section 20 requires the opposite for shared primitives:
  they must be implemented centrally, and a change made for one route must not
  silently alter the system everywhere.
- Stage 1 adds no component-level styling, introduces no page-specific
  convention, and changes no geometry, spacing, type family or component
  structure. Its diff is confined to the token authority, the scoped alias
  blocks, the enumerated wrong-token call sites, and the tests that pin them.
- Because it does change every route's appearance, it carries **full-product
  evidence** rather than one journey's: four screens, two viewports, four
  states, greyscale, with measured values before and after.
- Stage 2 **is** journey-by-journey, in the owner's stated order, and inherits
  the ADR-0010 delivery rule unchanged.

A token-value change is therefore permitted where a cross-route restyling is
not. If a reviewer finds component-level styling in the Stage 1 diff that is not
one of the enumerated wrong-token call sites, that is a scope breach and the PR
should be rejected on it.

## Launch Mode classification

The owner classified two findings as **Launch Blockers**, recorded in
`docs/launch/LAUNCH-BLOCKERS.md` as LB-001 and LB-002:

1. Required form and input boundaries too faint to identify reliably
   (approximately 1.52:1 on the audited Start a Deal surfaces).
2. Meaningful missing-data text such as `Not stated` too faint (approximately
   2.98:1), risking absent commercial facts being missed or misread.

The 11px mobile structural-caption floor is part of the launch contrast
remediation and is not a separate brand redesign.

The remaining thirteen audited components are real findings that do not stop a
journey. They are not promoted, and Stage 1 closes most of them as a consequence
of the token change rather than as separate work.

## Consequences

- The audit is accepted as the contrast baseline for the repository.
- `docs/plans/active/contrast-and-colour-remediation.md` governs sequencing and
  follows `.agent/PLANS.md`.
- The Constitution gains numeric contrast targets in section 18. It previously
  said "at approved contrast levels" without naming a level, which meant the
  rule could not be failed.
- `design-system/ponte-flow/documentation/compatibility-aliases.md` section 3
  asked the owner to decide whether to promote the eight local tint and line
  extensions into the approved set. **This ADR decides it: promote them.** That
  table is retired by Stage 1.
- `design-system/ponte-flow/__tests__/token-authority.test.ts` will fail until
  its `LOCAL_EXTENSIONS` and `counterparts` lists are updated, by design. The
  test is a ratchet that requires a promoted token to be aliased and the
  extension retired, so it is the mechanism that makes Stage 1 complete rather
  than an obstacle to it.
- Gap DS-1 (two dark-theme literals on the Desk's ink panels) is **not** closed
  by this decision and remains recorded.

## Residual accessibility risk, recorded rather than assumed

`--pf-gold-ink` (`#7E5914`) and `--pf-interact` (`#17548C`) are 1.24:1 apart in
luminance. Under tritanopia, blue and yellow converge, so a reader with that
condition may not separate them by hue or by lightness.

This is accepted, for three reasons, and the mitigation is a rule rather than a
value:

- the two never carry the same meaning in the same role — gold as text is
  restricted to one editorial emphasis per principal sentence and to Bridge
  markers, while links and interactive labels are blue;
- Constitution section 6 already forbids colour as the only carrier of meaning,
  so every state that uses either also prints a word or a geometry;
- widening the luminance gap would require either lightening gold below AA on
  its own tint or darkening blue to the point where `--pf-interact-active` has
  nowhere left to go.

The Stage 2 evidence must include a greyscale comparison and a tritanopia
simulation for any screen where a gold mark and a blue control appear together.

## Alternatives considered

| Alternative | Why not chosen |
|---|---|
| Direction A, strengthened paper alone | Fixes the measurable failure completely but leaves the second half of the finding standing: members could not tell interactive things from inert ones. Ponte has one accent, gold, and section 6 bars gold from meaning "act here", so A has nothing to spend on affordance. Retained as the fallback if Stage 2 is later declined. |
| Direction C alone, as a brand direction | Its colour values start to read as board rather than paper on a large bright desktop display. Its real contribution is the three non-colour rules, which cost nothing and are adopted. |
| Repurposing `--pf-focus` as the interaction colour | Would make a focused control and a selected control indistinguishable, and would overload a token whose single meaning is currently correct. Explicitly rejected by the owner. |
| Raising contrast by darkening text only | The audit shows text is largely already compliant. This would have made the product heavier without addressing the structural failure that testers actually reported. |
| One combined pull request | The structural half is a reversible value change; the interaction half assigns new meaning and needs per-journey review. Merging them would make the safe half un-revertable without the risky half. |

## Related records

- `design/authority/PONTE_DESIGN_CONSTITUTION_v1.md` (v1.1)
- `docs/codex/audits/contrast-remediation/CONTRAST-AUDIT-2026-07-29.md`
- `docs/plans/active/contrast-and-colour-remediation.md`
- `docs/decisions/ADR-0002-ponte-design-constitution.md`
- `docs/decisions/ADR-0010-constitution-led-interface-rebuild.md`
- `design-system/ponte-flow/tokens/ponte-flow-tokens.css`
- `design-system/ponte-flow/documentation/compatibility-aliases.md`
- `design-system/ponte-flow/documentation/colour-and-state-rules.md`
- `design/authority/bridge/v1/source/ponte-bridge.css`
- `docs/launch/LAUNCH-BLOCKERS.md` (LB-001, LB-002)
- `docs/codex/CURRENT-STATE.md`
- `docs/codex/DECISION-LOG.md`
- `docs/operations/OPEN_DECISIONS.md` (OD-006 decided, OD-007 open)
