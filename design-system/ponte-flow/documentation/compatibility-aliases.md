# Compatibility aliases and local extensions

**Status:** Living record. Updated by any PR that adds, retires or changes an alias.
**Authority:** Ponte Design Constitution v1 sections 6 and 20; ADR-0010; ExecPlan
`docs/plans/active/constitution-led-interface-rebuild.md` section 6 step 1.
**Enforced by:** `design-system/ponte-flow/__tests__/token-authority.test.ts`

---

## 1. Why this file exists

The Ponte Flow tokens are the production token authority. Everything that draws
a Ponte surface takes its colour from `--pf-*`, declared once on `:root` by
`design-system/ponte-flow/ponte-flow.css`, which `app/globals.css` imports above
the Tailwind directives.

The Desk had its own copy. The Phase 1 audit (section A.2) compared them value by
value and found every Desk custom property **byte-identical** to its Flow
counterpart. That is the dangerous case rather than the harmless one: nothing
looked wrong, and a future change to an approved token would have drifted past
the Desk silently until somebody noticed a screenshot had diverged.

Phase 2 converted the copies to aliases. This file records what was converted,
what could not be, and why.

## 2. Aliases now in force

Declared in `.ponte-desk`, `components/desk/desk.css`. Each resolves through
`var(--pf-*)` and holds no value of its own.

| Desk name | Ponte Flow token |
|---|---|
| `--surface` | `--pf-surface` |
| `--raised` | `--pf-raised` |
| `--sunken` | `--pf-sunken` |
| `--rule` | `--pf-rule` |
| `--rule-strong` | `--pf-rule-strong` |
| `--ink` | `--pf-ink` |
| `--ink-2` | `--pf-ink-2` |
| `--ink-3` | `--pf-ink-3` |
| `--mute` | `--pf-mute` |
| `--gold` | `--pf-gold` |
| `--gold-ink` | `--pf-gold-ink` |
| `--pos` | `--pf-positive` |
| `--neg` | `--pf-danger` |
| `--review` | `--pf-review` |
| `--declared` | `--pf-declared` |
| `--focus` | `--pf-focus` |
| `--select` | `--pf-select` |
| `--dur-1` | `--pf-dur-micro` |
| `--dur-2` | `--pf-dur-enter` |
| `--dur-3` | `--pf-dur-deliberate` |
| `--ease` | `--pf-ease` |

**21 aliases. Rendered appearance unchanged**, verified in the browser: every
alias resolves to the identical value it previously held literally, with zero
mismatches across all 17 colour names.

### Are these permanent?

They are **retained, not temporary**. The Desk vocabulary is shorter and reads
better inside a stylesheet that uses it several hundred times, and renaming
every usage would be a large diff with no visual or behavioural benefit. What
mattered was removing the second copy of the *values*, and that is done.

An alias may be retired whenever a journey slice happens to be rewriting the
rules that use it. None is scheduled, and none is a blocker.

## 3. Local extensions

Values with no approved `--pf-` counterpart. These are the only literal colours
`.ponte-desk` may declare, and the token-authority test fails on any other.

| Name | Value | What it is |
|---|---|---|
| `--gold-tint` | `#f5ecd8` | Gold wash on the kicker and the boundary heading. A **surface**, never a status. |
| `--pos-tint` | `#e9f1ec` | Row wash behind an evidence-checked state. |
| `--pos-line` | `#bfd8c7` | Hairline rule for the same. |
| `--neg-tint` | `#f7eae6` | Row wash behind a danger or blocked state. |
| `--neg-line` | `#e6c3b8` | Hairline rule for the same. |
| `--review-tint` | `#eaeff1` | Row wash behind an under-review state. |
| `--review-line` | `#c4d2d8` | Hairline rule for the same. |
| `--declared-tint` | `#f1eee7` | Row wash behind a declared or unconfirmed state. |
| `--e-2` | ink at 16% | Elevation shadow. Not a colour token: the Flow set defines no shadow at all. |

The pattern is one gap, not nine: **the approved set defines each semantic
colour but not its surface tint or its hairline.** Seven of the nine are
mechanical derivations of a token that already exists.

`--gold-tint` is the one the Phase 1 audit named as needing an owner decision:
promote it into the approved tokens, or record it as an approved local
extension. It is recorded here pending that decision. Being a tint does not
soften Constitution section 6 — gold is not verification, approval, warning or
success at any opacity.

**Proposed to the owner:** add a tint and a line to the approved set for each of
`positive`, `danger`, `review` and `declared`, plus `gold-tint` and an elevation
token. That would retire this table entirely. Not done in this PR: the token
file is an approved authority under CODEOWNERS and adding nine values to it is
an owner decision, not an implementation one.

## 4. Not aliased, and why

Two literal colours remain in `desk.css` outside the extensions table. Both are
recorded as **gap DS-1**.

| Location | Value | What it is |
|---|---|---|
| `.dk-ink :focus-visible` | `#6fa8e0` | `--pf-focus` under `[data-theme="dark"]` |
| `.st--halt i`, `.st--halt b` | `#9db4c0` | `--pf-review` under `[data-theme="dark"]` |

Both fire on **ink panels** — the journey rail and the knowledge boundary.
`var(--pf-focus)` would resolve to the light-mode blue, which is the wrong
contrast on ink.

The obvious fix, scoping those panels with `.inverse` so the `--pf-*` set flips,
does not work either. The rail paints light tokens as **foreground** on a
hand-built dark ground: `.st--done i { background: var(--surface) }` draws a
cream marker. Flipping the tokens would turn those markers black.

So the Desk's ink panels are an un-migrated inverse surface. Giving them the
approved inverse path is a design decision for the journey slice that owns them,
and doing it here would have been a visible change in a foundation PR. Recorded
rather than forced.

## 5. Duplication still outstanding

`desk.css` was the Desk's copy and is now resolved. Four other stylesheets still
declare the same Brand v5 values under their own names:

| Stylesheet | Scope | Retired by |
|---|---|---|
| `components/find/find.css` | `.ponte-find` | Journey slices 6 and 8 |
| `components/home/landing/landing.css` | `.ponte-landing` | Phase 4 (already orphaned) |
| `components/legal/legal.css` | `.ponte-legal` | Journey slice 12 |
| `components/pfooter.css` | shared footer | Phase 4 |

These were out of scope for this PR, which the ExecPlan scoped to the Desk. They
are the same defect at a smaller scale and each is cheapest to fix while its
journey is being rewritten.

Note that `ponte-flow.css` carries a comment arguing against writing an alias
layer for `.ponte-landing` and `.ponte-find`, on the grounds that the two
namespaces should be free to diverge. ADR-0010 and the ExecPlan direct the
opposite for the Desk, and the later authority governs. The comment's underlying
point still stands for the four sheets above: a divergence, if one is ever
wanted, is a design decision to be recorded rather than papered over.
