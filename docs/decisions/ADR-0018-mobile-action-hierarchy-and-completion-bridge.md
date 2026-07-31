# ADR-0018 — Mobile action hierarchy, review structure, and the universal Task Completion Bridge

- **Status:** Proposed for owner review; effective when merged. **Do not merge without owner approval.**
- **Decision date:** drafted 30 July 2026
- **Owner:** Giuseppe Funaro
- **Identifier note:** renumbered from ADR-0016 to **ADR-0018** on 30 July 2026 to resolve a
  collision — `ADR-0016` is `ADR-0016-multilingual-deal-room-interpretation.md` on `main`, and
  `ADR-0017` is reserved by PR #114 (authentication and operational email). Content unchanged.
- **Depends on:** ADR-0015 Stage 2 (the `--pf-interact-*` tokens) for its colour; the two are
  reviewed together and Stage 2 merges first or with it.
- **Amends:** the Constitution's component-facing sections — §12 (buttons/actions), §13 (forms),
  §14 (records/evidence/status), §15/15a (surfaces), §9 (progress) and §8 (Bridge) — by
  **application**, adding named patterns without changing any existing rule. No token value
  changes here (that is Stage 2). No Bridge geometry changes.
- **Scope:** Start a Deal (`/[locale]/structure`), the Review step and the composer's completion
  surface, across all three families and both sides. No other route.

## Context

Owner review of the live mobile Review screen found that, although ADR-0015 Stage 1 made every
element pass its contrast ratio, the screen still fails perceptually: one continuous cream field,
every element at the same weight, an action (`Add`) that reads as a gold label rather than a
control, missing data stated three times, and all thirteen commercial terms — including
contract-level fields — shown at once before a draft exists. The audit and the reasoning are in
`docs/codex/audits/2026-07-30-mobile-action-hierarchy/`. Direction B (paper with interaction
blue) was approved on 30 July 2026, and a universal completion-progress requirement was added.

Contrast is legibility; hierarchy is the *relative weight* of elements and their *grouping into
surfaces*. Neither is a token value, so Stage 1 could not reach them. This ADR governs the
component structure that does.

## Decision — the review surface

1. **Surface layering (§15, §15a).** The register is rebuilt as white working surfaces
   (`--pf-raised`) inset on the page ground (`--pf-surface`), each boundary **drawn** — a fill
   step ≥1.15:1 **and** a `--pf-rule-strong` 3:1 edge — never a fill alone, never a card grid,
   no new radius or shadow. Panels group: the product Ponte matched; what the member gave; the
   details still needed; the commit zone. `--pf-rule` hairlines divide facts *inside* a panel.
2. **Row model.** Field name over value; the value is the loudest thing in the row. Provenance
   drops to LEVEL 4 as a small shape-first marker plus a concise human label. A stated fact is a
   row; a **missing** fact is not a row that says "Not stated" twice — it leaves the register and
   becomes an item in the "details Ponte still needs" list, carrying exactly one action.
3. **Progressive disclosure (§14).** Required applicable fields are shown; optional and
   contract-level fields (contract term, counterparties, signatories, and any field not
   applicable to the family/intent/side) collapse behind one "Add more detail · N optional"
   control and are never surfaced as open problems before a draft exists.
4. **Action system (§12), using ADR-0015 Stage 2 blue.** One primitive built from `.fbtn`
   mechanics (no fork, §20): **blue-filled** for a per-row Add (≥40px tap, label names the result
   — `Add destination`); **blue text/outline** for Edit and for the disclosure; **ink-filled**
   for the one commit (`Confirm and create the draft`). Blue = act/edit, ink = commit, gold =
   signal/Bridge/editorial. Focus ring preserved and distinct from the interaction border.
5. **State hierarchy (§14) preserved.** The five provenance states stay distinct and are never
   collapsed into one generic verified treatment: Your words (filled circle); From your document
   (dashed square + quote); Ponte's suggestion · confirm (rotated square, `--review`); Confirmed
   by you (filled circle, `--positive`); Not available on this journey (dotted circle). Each is a
   shape before it is a colour, so it survives greyscale.
6. **Microcopy.** `Add` → `Add <field>`; the "Not stated / NOT STATED / Add" triple → one
   needs-item (field + one line of what it is + one action); "Identified by Ponte, not yet
   confirmed" → marker + "Ponte's suggestion · confirm" (full text on expand); "N terms are still
   unstated. Ponte will not guess them." → "N details Ponte still needs" with optional collapsed.
   `Your words`, `Ponte product`, `Confirm and create the draft`, and "Not available on this
   journey" are kept — they are accurate and imply no verification the system lacks.

## Decision — the universal Task Completion Bridge

The completion indicator is the **approved Task Completion Bridge** (Bridge System v1 component
#3: `PB.progress`, `PB.header`, `PB.value`), applied to Start a Deal across all three families
and both sides, bound to the existing engine. It is a gold signal advancing along the Bridge deck
as the record fills in — gold in its lawful §6a meaning (the member's signal; movement across the
completion Bridge; arrival at the completed-task state). It is not turned blue; blue stays on the
Add/Edit/Expand controls.

### It binds to the existing engine — no new percentage

Completion is `progressValue(steps, done)` from `lib/ponte/progress.ts`: `null` before the first
meaningful act (neutral, no 0%), then `20 + round(0.8 × earnedWeight)`, reaching 100 only when
every applicable step is complete, capped at 99 otherwise. Weights are irregular positive
integers summing to 100; equal ladders are rejected at construction. The value is **derived,
never stored**. A new pure binder `lib/structure/completion.ts` turns `procedureFor(draft)
.completionFields` + `isFilled` into the step table and `done` set; the engine is not modified.

### The fourteen questions this ADR decides

1. **Record completion or publishability?** Completion. They are different states — the code
   already lets a member submit for review regardless of gaps (`blockers` inform, they do not
   gate). The Bridge measures how complete the record is, not whether it may be published.
2. **How 100% is defined — interpretation A.** 100% = **all required *applicable* fields
   complete**. Recommended over B (required + a defined enrichment set) because B makes 100 depend
   on optional information a member may not possess — the thing the brief says to avoid. A is
   honest, predictable and achievable for every family and side.
3. **How optional fields affect completion.** They do **not** enter the 100% denominator.
   Enrichment (specification, documents, extra evidence, `note`) is surfaced as a separate,
   subordinate **record-strength** signal — a band label ("Good commercial detail" → "Strong
   record"), never a second percentage, never gating anything — so a member is still encouraged to
   strengthen the record after reaching 100% of the required task.
4. **How applicability removes irrelevant fields from the denominator.** The denominator is
   `completionFields(draft)`, which is already family-, intent- and side-specific (e.g. products
   `offer` → origin; `requirement` → destination). An inapplicable field is never in the table,
   so it is neither numerator nor denominator.
5. **How required fields differ by family.** Three schemas, below.
6. **How the highest-value next action is selected.** The applicable, still-open field with the
   greatest weight; ties broken by the family's field order. The Bridge names it ("Next: add
   destination") and it maps to the blue action on the corresponding needs-item.
7. **Mobile placement.** A compact `PB.header()` Bridge directly under the journey header, in
   normal flow (not fixed), that expands on demand to the full breakdown. Rationale under
   "Placement" below; the three candidates were prototyped.
8. **Desktop placement.** The full `PB.progress()` Bridge leading the review register, spanning
   its width, with the value, gold signal, band label, the next action, and an optional expanded
   breakdown.
9. **Distinct from other Bridges.** The Task Completion Bridge keeps its horizontal arc at every
   width (the approved exception) and carries completion-specific abutment labels ("Started" →
   "Ready to confirm") and the percentage — so it never reads as the Family Bridge (station
   choice), the Action Bridge, or the deal-stage Bridge (named milestones). §9 keeps task
   completion and commercial stage separate; §6a's Bridge-beside-selected-control boundary is
   recorded as checked in this slice.
10. **Reduced motion.** The signal is authored in its end state; with `prefers-reduced-motion:
    reduce` the advance is a removal (it appears at the new position without travelling). No
    substitution.
11. **Accessible announcement.** On an increase, the new value and band are announced via a
    polite live region ("Record 47% complete. Next: add destination."); no announcement when the
    value is unchanged; never a congratulatory string on a routine edit.
12. **Resumed draft.** Completion is derived, so a resumed draft shows the correct value with no
    stored state; `resume.ts` reads fields in the draft's own family vocabulary and the binder
    recomputes.
13. **Backward compatibility.** Existing drafts get a correct value the first time they render,
    because the value is a pure function of their stored family/intent/fields. Nothing to migrate.
14. **Save/publish incomplete, and recalculation on family/intent change.** Incomplete records
    may still be saved and submitted (unchanged behaviour). On a family or intent change the
    applicable set changes and the sanitiser clears orphaned fields, so completion recalculates
    deterministically against the new denominator — it does not "reset" to a number, it is simply
    recomputed.

### The three family completion schemas (weight maps)

Weights are illustrative and will be pinned by a test that reuses `assertWeights` (unique ids,
positive integers, sum 100, not an equal ladder). Identity carries a small weight so a
just-identified record sits at the ~20 floor; required commercial facts carry the bulk; the
displayed increment for a field is `0.8 × weight`, which is why the increments below are
irregular. Enrichment fields (documents, specification, note) are **not** in these tables — they
feed record-strength, not completion.

**Products — Fresh coconuts sourcing requirement (`source_product`):** applicable set excludes
`origin` (a buyer does not state where it ships from) and includes `destination`.

| Step | Weight | Increment on adding (0.8×w) |
|---|---|---|
| product identified (arrives at Review) | 2 | floor → 22 |
| quantity | 24 | +19 |
| destination | 22 | +18 |
| incoterm | 18 | +14 |
| payment | 20 | +16 |
| validity | 14 | +11 |
| **sum** | **100** | 100 only when all five details are in |

Worked line: identified 22 → +quantity 41 → +destination 57 → +payment 73 → +incoterm 87 →
+validity 100. Irregular (+19,+16,+16,+14,+13 — no equal ladder), and required-heavy.

**Trade services — freight forwarding, Spain → United Kingdom (`seek_trade_service`):** no
product-only concepts (no HS, quantity or Incoterm).

| Step | Weight |
|---|---|
| service category identified (freight forwarding) | 2 |
| serviceScope | 22 |
| serviceCoverage (the Spain→UK lane) | 24 |
| serviceEngagement | 16 |
| servicePricingBasis | 18 |
| serviceAvailability | 10 |
| serviceCapability | 8 |
| **sum** | **100** |

Coverage (the lane) is the heaviest because it is what makes a forwarding requirement actionable;
capability and availability are lighter. No field a forwarder does not have is in the table.

**Distribution — seeking a distributor for a food brand in Spain (`seek_distribution_partner`):**
no shipment terms.

| Step | Weight |
|---|---|
| brand / product category identified | 2 |
| distributionObjective | 20 |
| distributionProductScope (the food brand/category) | 22 |
| distributionChannels (target channels/territory: Spain) | 22 |
| distributionExpectations | 16 |
| distributionCapabilities (what the partner must bring) | 12 |
| distributionTiming | 6 |
| **sum** | **100** |

No Incoterm, quantity or route — those are product-shipment fields and are absent from the
distribution table entirely, per the owner requirement and `FIELD_FAMILY`.

Every other intent (offer_product, offer_trade_service, offer_distribution_or_representation,
seek_brands_or_products_to_represent) gets the same treatment: its own applicable set from
`completionFields`, its own weight map, required > optional, sum 100, irregular. The maps live
beside the binder and are owner-reviewed as part of this ADR.

### Placement, prototyped and recommended

Three mobile candidates were prototyped (`completion-bridge.html`): fixed beneath the header;
contextual at the top of each section; and a **compact persistent header that expands on demand**.
Recommended: the compact `PB.header()` in normal flow under the journey header — it creates
momentum, costs little vertical space, does not cover content, is not a generic sticky bar, and
expands to the full breakdown when tapped. It shows the percentage only after the first
meaningful act (before that it is the neutral null state), names the highest-value next action,
and updates immediately and deterministically on each saved detail.

### Momentum without manipulation

Movement of the gold signal, a clearer number, and a named next action are the whole of the
motivation. No confetti, points, badges, streaks, countdowns, false scarcity, or "you're almost
there!" pressure. 100% says only "the defined opportunity-creation task is complete" — never
verified, trustworthy, low-risk, likely to close, attractive, approved, or guaranteed interest.

## Accessibility

Text ≥4.5:1; control boundary/state/focus ≥3:1 (§18a), measured against the darkest surface each
is drawn on in the Stage 2 evidence; every action carries shape + verb + tap target (≥40px; 
commit ≥52px), so nothing is colour-only (§18, §6a); mono structural captions ≥11px (§18b);
focus ring preserved and distinct from the interaction border; no horizontal overflow at 320/360/
390/430; reduced-motion honoured; completion announced politely; the Bridge distinct from other
Bridge types in shape, label and copy.

## Implementation sequence (after approval — not in this session)

1. ADR-0015 Stage 2 tokens land (or land with this).
2. `lib/structure/completion.ts` binder + three weight maps + tests (engine untouched).
3. React Task Completion Bridge component wrapping `PB.progress`/`PB.header`, reading
   `progressValue`; reduced-motion + live-region announcement.
4. `ReviewPanel.tsx` + `intake.css`: surface panels, needs-list, disclosure, blue actions,
   re-weighted provenance, commit zone, the Bridge under the header.
5. Evidence: 390×844 + desktop, the six review states and the seven progress states per family,
   greyscale, tritanopia, focus-vs-interaction distinctness. Update UI tests; keep the four/five
   provenance states asserted distinct.

## Route and component impact

`components/products/intake/ReviewPanel.tsx`, `components/products/intake/intake.css`, a new
React Task Completion Bridge component, a new `lib/structure/completion.ts` and its weight maps
and tests, token authority + `find.css` aliases (Stage 2). No change to schemas, reducers,
`lib/ponte/progress.ts`, applicability, persistence, permissions, taxonomy, submission behaviour,
Bridge geometry, or any other route.

## Risks and rollback

- **Blue/gold confusability** (~1.24:1): mitigated by shape/position and proven in greyscale +
  tritanopia evidence before merge; rollback re-points the interaction tokens (ADR-0015 Stage 2
  rollback), which reverts actions to ink/gold without removing the structure.
- **A weight map that reads as a mechanical ladder:** impossible to merge — `assertWeights`
  rejects it and a per-family test pins it.
- **Completion mistaken for credibility:** guarded by copy, the band table, and §9; 100% wording
  is fixed and says only that the task is complete.
- **Component rollback:** the review structure is one component + one stylesheet; reverting the
  PR restores the current screen with no data or engine effect.

## Stop conditions honoured

This is an authority document. No production component was modified and no PR is merged. If, in
implementation, an approved primitive cannot carry a required state, or the Bridge boundary
against a selected control cannot be kept distinct, that returns to the owner rather than being
resolved locally (§24).
