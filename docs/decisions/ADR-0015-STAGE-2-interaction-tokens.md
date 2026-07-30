# ADR-0015 Stage 2 — the blue interaction token family

- **Status:** Proposed for owner review; effective when merged. **Do not merge without owner approval.**
- **Decision date:** drafted 30 July 2026
- **Owner:** Giuseppe Funaro
- **Implements:** the Stage 2 half of ADR-0015, which was accepted in concept on 29 July 2026 and
  deferred to "a separate authority and implementation pull request, after Stage 1 is approved
  and merged." Stage 1 is merged (`21b4ee4`).
- **Amends:** nothing in the Constitution beyond what ADR-0015 already took to v1.1. It adds
  tokens the v1.1 colour law (§6a) already describes but that were "deliberately absent" from the
  Stage 1 token file.
- **Paired with:** ADR-0016, which is the first journey to apply these tokens (Start a Deal).

## Context

ADR-0015 §6a established that Ponte has two semantic colour families beyond ink and the state
colours: **gold** (the Ponte signal, movement across a Bridge, an arrived/selected Bridge
destination, editorial emphasis) and **blue** (interaction — links, navigational emphasis,
selected non-journey controls, active/expanded controls, active form boundaries, keyboard focus).

Stage 1 changed only token *values* and explicitly did **not** add the blue family:

> `--pf-focus` keeps its value and its single meaning: keyboard focus, and the Stage 2
> `--pf-interact-*` family is deliberately absent here.

So today the only blues in the token file are `--pf-focus` (#1E5FA8, keyboard focus only) and
`--pf-select` (#DCE8F4, a selection fill). There is no token an author may use to make a control
*read as actionable*. That gap is why the Structure/Review audit (ADR-0016) found the `Add`
action rendered in gold — a §6a violation forced by the absence of an interaction token, because
gold is barred from meaning "act here."

## Decision

Add the four-token interaction family to the Ponte Flow token authority, in both the light and
dark blocks, and alias it in the `.ponte-find` / `.ponte-desk` heritage blocks exactly as the
existing families are aliased. **No existing token changes value.**

### The interaction token table

Light theme (`:root`):

| Token | Value | Role |
|---|---|---|
| `--pf-interact` | `#17548C` | blue as text and as a fill: links, the primary per-row action, the Edit affordance |
| `--pf-interact-border` | `#2C6EAC` | the boundary of an active/blue-outlined control; an active form boundary |
| `--pf-interact-active` | `#0F3D6B` | hover and pressed darkening of a blue control |
| `--pf-interact-tint` | `#E4EDF5` | the fill of a *selected non-journey* control — a chip, row, tab or segmented control that is not a Bridge destination |

Dark theme block: the family re-solved against the dark surfaces, brightening as the other
families do (indicative: `--pf-interact` ~`#7FB0E6`, border ~`#5C93CF`, active ~`#A9CBEE`, tint
`rgba(127,176,230,.20)`) — the exact dark values are fixed against the dark surfaces in
implementation and pinned by the contrast check, not guessed here.

Heritage aliases (add beside the existing ones):
`--interact: var(--pf-interact); --interact-border: var(--pf-interact-border);
--interact-active: var(--pf-interact-active); --interact-tint: var(--pf-interact-tint);`

### The laws these tokens carry (from §6a, restated as binding)

- Blue is **only** interaction. It must never mean verification, success, warning, review,
  commercial completion or Bridge arrival.
- `--pf-interact` is **not** `--pf-focus`. A selected/active control (interaction border) and a
  focused control (focus ring) must remain visually distinct — the border is the darker blue,
  the focus ring the brighter `#1E5FA8`. The Stage 2 evidence must show a control that is both
  selected and focused and prove the two indicators read as two.
- Blue is never applied to page backgrounds, general panels, or any Bridge structure. Gold owns
  the Bridge; where a selected control sits beside a Bridge, the Bridge wins and stays gold, and
  the slice records that the boundary was checked.
- Gold is not reassigned. `Add`/`Edit`/`Choose`/`Expand` move from gold to blue; gold returns to
  signal, Bridge and the single editorial italic.

## Contrast (§18a), to be proven in evidence against the darkest surface each is drawn on

| Value | On | Target | Indicative |
|---|---|---|---|
| `--pf-interact` text / fill label (white on blue) | white / cream / the blue fill | 4.5:1 | ~6.9:1 on white, ~6.3:1 on cream; white on `#17548C` ~6.9:1 |
| `--pf-interact-border` control boundary | white and cream | 3:1 | verify against `--pf-sunken` too if a control is ever drawn there |
| selected `--pf-interact-tint` + its border | its surface | 1.15:1 fill + 3:1 rule (§15a) | tint is a fill; the readable boundary is the border |

Two residual risks ADR-0015 already named, carried forward as evidence requirements:
- `--pf-interact` vs `--pf-gold-ink` is ~1.24:1 apart in luminance — close. The Stage 2 evidence
  **must** include a greyscale comparison and a tritanopia (blue–yellow) simulation showing that
  a blue action and a gold signal are still told apart by shape and position, not hue alone.
- `--pf-interact-border` vs `--pf-focus` distinctness, as above.

## Application order

ADR-0015 fixed the journey order for Stage 2, and Start a Deal is journey 1. This authority adds
the tokens; **ADR-0016 applies them to Start a Deal** and is the reference application. Later
journeys (landing controls, Market Signals, Find, account/Workspace, verification/Deal Room)
follow one at a time, each with its own evidence, inheriting ADR-0010's journey-by-journey rule.
Adding the tokens does not repaint anything on its own — no component references them until a
journey PR does.

## Rollback

Re-point the four tokens to `--pf-ink` / `--pf-gold-ink` (their pre-Stage-2 de-facto meaning),
which restores current semantics without removing the tokens, exactly as ADR-0015's rollback row
specified.

## Evidence required before merge

Desktop and 390×844, the Start a Deal review states, before/after, with measured values against
the darkest surface each token is drawn on; greyscale; tritanopia; and the focus-vs-interaction
distinctness frame. Per Constitution §21/§22.
