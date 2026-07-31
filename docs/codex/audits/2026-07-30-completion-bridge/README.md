# Task Completion Bridge — production handoff evidence (ADR-0016 / ADR-0015 Stage 2)

**Date:** 30 July 2026 · **PR:** #128 · **Branch:** `claude/task-completion-bridge-120`

The approved Task Completion Bridge and the `--pf-interact-*` interaction tokens,
implemented into the Start a Deal journey. This folder records the owner journey
run and the accessibility verification.

## The owner journey, on the deploy preview

Driven end to end against `https://deploy-preview-128--ponte-trade.netlify.app`
by `e2e/completion-bridge.spec.ts` (read-only — it never submits, so no record is
written):

1. Land on Start a Deal, **describe "cement"**, and pick the identified product
   (Ordinary Portland cement).
2. The composer opens on the facts step with the Bridge in its **neutral null
   state** — no percentage, per Constitution §9 (`evidence/desktop/1-neutral.png`,
   `evidence/mobile-390x844/neutral.png`).
3. **Add a quantity** (mode, figure, unit) through the structured control. The
   Bridge leaves the neutral state and the percentage rises into the approved
   20–100 band: **43% · "Core information added"**, the gold signal travelled ~43%
   of the deck (`evidence/desktop/2-first-detail.png`).

43% is the binder's arithmetic, not a hardcoded figure: for a products sourcing
requirement, filling `quantity` (its apportioned weight ≈ 29 of 100) earns
`20 + round(0.8 × 29) = 43`. Adding each further applicable field advances it,
and 100 is reached only when every required applicable field is in. The test
asserts the value is null before, and in `[20, 100)` after — the rise is proven,
not just screenshotted.

## Accessibility verification

- **Not colour-alone.** The Bridge carries its state three ways before colour: a
  numeric percentage, the band label in words, and the travelled length of the
  deck with the signal node's position. Greyscale or a tritanope reading loses
  the gold but keeps the number, the words and the geometry — the information
  survives. The provenance and action states it sits beside are shape-first by
  the same rule (dashed square / rotated square / filled circle / dotted circle).
- **Contrast.** `check-contrast.mjs` passes in `npm run verify`; the interaction
  tokens carry the ratios ADR-0015 Stage 2 §76–78 fixed (white on `--pf-interact`
  ≈ 6.9:1; `--pf-interact-border` ≥ 3:1), and gold-ink is the AA-safe text gold.
- **Focus.** The interactive controls (the blue Add/Edit affordance, the mode and
  unit chips, the ink commit) inherit the global `:focus-visible` ring, which
  ADR-0015 keeps distinct from `--pf-interact` — an active control and a focus
  ring are never the same blue.
- **Reduced motion.** `completion-bridge.css` removes the deck's travel
  transition under `prefers-reduced-motion: reduce`; the settled position and the
  percentage are identical, so motion is expression, never information. The
  screenshots are captured with `animations: "disabled"`, i.e. at that settled
  frame.
- **Role.** The Bridge is a `role="progressbar"` with `aria-valuenow`,
  `aria-valuemin/max` and an `aria-valuetext` of "N percent, <band>"; the neutral
  state is a `role="status"` line.

## Frames

- `evidence/desktop/1-neutral.png` — neutral null state on the facts step.
- `evidence/desktop/2-first-detail.png` — 43%, "Core information added", after a
  quantity, with the structured quantity/unit control and the ink commit.
- `evidence/mobile-390x844/neutral.png` — 390-wide, no horizontal overflow.
