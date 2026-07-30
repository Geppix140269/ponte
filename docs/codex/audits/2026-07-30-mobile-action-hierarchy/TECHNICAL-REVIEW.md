# Technical review — completion progress across Start a Deal

Read-only review for the ADR-0016 / ADR-0015-Stage-2 authority session, 30 July 2026.
No engine or component was modified.

## The progress engine already satisfies the progress law, and is family-agnostic

`lib/ponte/progress.ts`:
- `progressValue(steps, completed) → number | null`. `null` when nothing is done (neutral, no
  0%). Else `20 + round(0.8 × earnedWeight)`, weights summing to 100; `100` only when every
  step is complete; caps at `99` otherwise.
- `assertWeights` rejects non-unique ids, non-positive/non-integer weights, sums ≠ 100, and
  **all-equal** weights — the 20/40/60/80 prohibition is enforced in code.
- `progressBand(value, scale)`, scales `opportunity | profile | submission`.

**Finding:** the engine takes an arbitrary weighted table; family-specificity is a property of
the table the caller passes. **No engine change is required, and none should be made.**

## Applicability already exists and is family + intent + side correct

- `procedureFor(draft).completionFields(draft)` is the applicable denominator, per family and
  intent. `isFilled` / `openGaps` give numerator and gaps. `FIELD_FAMILY` pins ownership.
- **Side-specific:** products.ts:54 — `offer` → `origin` applies; `requirement` (sourcing) →
  `destination` applies. So a coconut sourcing requirement is asked destination, not origin.
- `blockers(draft)` informs but does not gate: "Submitting for review is always allowed." So
  **publishability ≠ 100%.**

| Family | Applicable completion fields | Shared |
|---|---|---|
| Products | quantity, origin (offer) / destination (sourcing), incoterm, payment | validity, role, note |
| Trade services | serviceScope, serviceEngagement, serviceCoverage, serviceSpecialisation, serviceCapability, servicePricingBasis, serviceAvailability | validity, role, note |
| Distribution | distributionObjective, distributionProductScope, distributionChannels, distributionCapabilities, distributionExpectations, distributionTiming | validity, role, note |

## The Task Completion Bridge is an approved component

`design/authority/bridge/v1` component #3: `PB.progress(el, {...})`, a compact `PB.header(el,
{...})`, and `PB.value(steps, done)` (null when nothing done). It **keeps its horizontal arc at
every width** (the deliberate mobile exception), reduced motion is a removal not a substitution,
and "commercial stage and task completion are two different statements — never merge." A React
binding does not yet exist (`BridgeRoute.tsx` = family, `DealRoomBridge.tsx` = deal stage), so
one must be created, wrapping `PB.progress`/`PB.header` and reading `progressValue`.

## Resume and family/intent change are already correct

`resume.ts` reads a draft in its own family's vocabulary. Completion is a pure function of
(family, intent, filled fields) and is never stored, so it is correct on resume and recalculates
against the new denominator on family/intent change, with the sanitiser clearing orphaned fields.

## Smallest lawful extension

1. `lib/structure/completion.ts` (new): builds `ProgressStep[]` (`id = CompletionField`, weight
   from a per-family map) and the `done` set (via `isFilled`), then defers to `progressValue`;
   plus the highest-value-next-action selector (applicable, still-open field of greatest weight).
2. Three weight maps (products / services / distribution), each summing to 100 with irregular
   positive integers, required > optional, pinned by a test reusing `assertWeights`.
3. A React Task Completion Bridge component binding `PB.progress`/`PB.header` to the value.
4. **No change** to `lib/ponte/progress.ts`, the applicability layer, schemas, reducers,
   persistence, or the Bridge package.
