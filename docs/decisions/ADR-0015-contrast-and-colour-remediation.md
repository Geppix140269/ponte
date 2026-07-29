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

### Stage 0 — governance only

One prerequisite, not two. The validation corrections that were thought to be
prerequisites are already on `main` (S-2):

1. **This governance PR**, carrying the ADR, the Constitution amendment, the
   ExecPlan and the registers.

`npm run verify` is green on `main` at `42a9d22` for every repository check.
`check-deps` fails only in a worktree without `node_modules`, which is an
environment condition and not a repository failure.

### Stage 1 — structural contrast

One dedicated pull request. Central token and typography changes only.

Its **first step** is the Bridge manifest decoupling from S-1, before any token
value changes, because the package-local snapshot must be byte-identical to the
approved handoff and the live file stops being that as soon as a value moves.

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

## Owner sign-off on the open matters, 29 July 2026

Three matters were raised for decision when this ADR was first opened. All three
are now decided, together with two confirmations. Recorded here because they change
what Stage 1 contains.

### S-1. Decouple the Bridge manifest from the live token file — approved

> Approve decoupling the approved Bridge package manifest from the live shared
> Ponte Flow token file. The Bridge manifest must verify the approved Bridge
> delivery itself.

`design/authority/bridge/v1/SOURCE-MANIFEST.md` records a SHA-256 for the row
`ponte-flow/tokens/ponte-flow-tokens.css`, and the resolver in
`scripts/check-governance.mjs` maps that row to the **live**
`design-system/ponte-flow/tokens/ponte-flow-tokens.css`. A manifest describing an
approved Bridge delivery was therefore checksumming a shared file that the Bridge
does not own and that every future palette decision must change.

The durable correction, as directed:

- preserve a **byte-identical package-local snapshot** of the token file contained
  in the original approved Bridge handoff;
- verify that package-local snapshot through `SOURCE-MANIFEST.md`;
- stop resolving any Bridge manifest entry to the live `design-system/ponte-flow`
  token file;
- continue checksum-verifying the Bridge engine, stylesheet, references and every
  other package-local asset, unchanged;
- **do not** simply replace the live token checksum after each authorised palette
  change. That was the wrong fix and is explicitly rejected: it would make the
  manifest a moving record and remove the protection it exists to give.

This is a packaging and authority-boundary correction. It amends no Bridge
geometry, interaction or motion, and it removes nothing from the checksum
coverage the check gives today.

**Hard ordering constraint.** The live token file currently hashes to
`dabc089f0b9822242cc0a3d8783c2b19ab0021ce98c82d9cfd8f6d1648483d5f`, which is
exactly the value the manifest records, so a byte-identical snapshot can still be
taken from the working tree. That stops being true the moment Stage 1 edits the
file. **The snapshot must therefore be created before any token value changes**,
as the first step of Stage 1, and the ExecPlan sequences it that way.

### S-2. The two validation failures — already fixed upstream, correction recorded

The owner approved fixing `check-launch-mode.mjs` by normalising whitespace rather
than rewriting `AGENTS.md`, and separately classified the duplicate migration
identifier as a launch blocker to be renamed on its own branch.

**Both defects were already fixed on `main` before either was reported here, and
the report that prompted these two decisions was wrong.** The correction, in full:

| Reported | Actual state of `main` |
|---|---|
| `check-launch-mode.mjs` fails on `main` | **Fixed** by `228b532`, merged in PR #98. The upstream fix normalises whitespace on both sides of the comparison, which is the same remedy the owner directed and is functionally identical to the one drafted here. Recorded upstream as its own **PL-005** |
| Duplicate migration identifier `20260728d` | **Fixed** by `228b532`, merged in PR #98. `20260728d_family_commercial_terms.sql` was renamed to `20260728e_family_commercial_terms.sql`; the applied `20260728d_verification_level_canonical.sql` correctly kept its identifier. Recorded upstream as its own **PL-004** |

**Root cause of the false report:** the claims were made against a local `main`
ref that had not been fetched, and which was nine commits stale. `origin/main` had
already advanced to `42a9d22` through PR #98. Every check was run in a working tree
based on that stale ref, so the failures were real in that tree and absent from the
repository. The single missing step was `git fetch` before asserting the state of
`main`.

**Consequences for this decision:**

- No migration hotfix branch is created. Renaming
  `20260728d_family_commercial_terms.sql` is impossible because it no longer
  exists, and `20260728e` is now correctly held by that very file. Creating a
  further rename would introduce a new duplicate rather than remove one.
- No `LB-003 — duplicate migration identifier` record is created. The defect is
  closed, and recording a resolved upstream fix as an open launch blocker would
  make this register state something untrue. **LB-003 is instead the second
  contrast blocker**, and the numbering below reflects that.
- The pull request drafted for the checker fix is redundant and is recommended for
  closure rather than merge.

**Numbering collision, resolved.** `main` already holds `LB-001` for the Deal Room
progression loop, and `PL-004` and `PL-005` for the two fixes above. The contrast
blockers are therefore recorded as **LB-002** and **LB-003**, and no `PL-` entry is
added by this work. This is the third instance of the same defect class the
repository has now hit, after the `20260728a` duplicate and the ADR-0012 collision:
concurrent branches allocating identifiers from a register they have not re-read.

### S-3. OD-007, Bridge structural contrast — include it in Stage 1

> The central Ponte Bridge must not remain at the audit's approximately 1.42:1
> structural contrast while the rest of the interface is remediated.

Included in Stage 1, scope limited to contrast:

- geometry unchanged;
- station fractions unchanged;
- node sizes unchanged;
- labels unchanged;
- motion unchanged;
- gold semantics unchanged;
- arrived and selected destinations remain gold;
- blocked, review and other semantic states unchanged.

Passive track and pier treatments use the approved structural rule tokens.
`--pf-opacity-track` is withdrawn if the accepted implementation no longer needs
it.

Any edit to the authoritative Bridge stylesheet must be explicitly recorded in
this ADR, is covered by CODEOWNERS, and must be verified against **updated
reference evidence** — the approved renders under
`design/authority/bridge/v1/reference/` are part of the package and must be
re-taken rather than left describing the old contrast.

#### S-3 implementation note, 29 July 2026 — the re-take is blocked, and not by a choice

The stylesheet change is done and the invariance requirement above is proved twice,
at stylesheet level (`scripts/check-bridge-invariance.mjs`: 479 non-colour
declarations, 6 at-rules and 23 timings identical, 15 colour changes enumerated) and
at rendered-DOM level (`scripts/check-bridge-geometry.mjs`: 8 views, 1208 values
identical to 0.05px). A pixel diff is deliberately not the instrument, because the
colours are meant to differ.

**The reference re-take could not be carried out.** The eight PNGs were rendered
from `Ponte Landing - Bridge.html` at 60% and 70% for desktop and 390 x 844
rescaled from 62% for mobile. That file is recorded in `SOURCE-MANIFEST.md` as part
of the delivery but is **not vendored**, has never been committed on any branch, and
is not on the development machine. `desktop-0-full-composition.png` shows the
prototype's own navigation, ticker and hero, so the product's landing page cannot
reproduce the framing either.

The renders and their hashes are therefore unchanged, and the manifest now says so
in place of the earlier claim that they had been re-taken. Reconstructing the
prototype page to produce them was rejected: presenting invented markup as an
owner-approved reference render would corrupt the authority this ADR exists to
protect.

**This is a live gap, not a closed item.** It needs the two HTML files; their
SHA-256 rows are already in the manifest, so a supplied copy is verifiable as
genuine before use, and the re-take is then mechanical.

### S-4. Value-neutral token adoption in the four duplicated stylesheets — approved

Alias conversion approved for `components/find/find.css`,
`components/home/landing/landing.css`, `components/legal/legal.css` and
`components/pfooter.css`. These hold literal copies of the palette and would not
otherwise receive the central remediation.

The conversion must be **initially value-neutral** and must not redesign those
routes. Each literal is replaced by the `var(--pf-*)` it already equals. All
subsequent visual change comes from the approved central Stage 1 tokens, not from
edits to these four files.

### S-5. LB-002 and LB-003 — confirmed, with closure criteria

Both confirmed as launch blockers. They may be closed only when Stage 1
demonstrates:

- required field boundaries at sufficient non-text contrast;
- meaningful missing-data labels at sufficient text contrast;
- desktop and 390 x 844 evidence;
- no regression in factual hierarchy or task completion.

The last criterion is the one that can fail while the numbers pass: the 11px
caption floor reflows dense mono rows, so the fact register, the journey rail and
the crumb trails must be re-read for hierarchy at 390px, not only re-measured.

## Launch Mode classification

The owner classified two findings as **Launch Blockers**, recorded in
`docs/launch/LAUNCH-BLOCKERS.md` as LB-002 and LB-003:

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
- `docs/launch/LAUNCH-BLOCKERS.md` (LB-002, LB-003)
- `docs/codex/CURRENT-STATE.md`
- `docs/codex/DECISION-LOG.md`
- `docs/operations/OPEN_DECISIONS.md` (OD-006 decided, OD-007 open)
