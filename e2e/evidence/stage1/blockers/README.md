# LB-002 and LB-003 — rendered closure evidence

**Captured:** 29 July 2026, against a local production build with live Supabase data
**Reproduce:** `PONTE_EVIDENCE_BASE_URL=http://127.0.0.1:3100 npx playwright test e2e/stage1-blockers.spec.ts`
**Suite:** `e2e/stage1-blockers.spec.ts` · **Measurements:** `blocker-evidence.md`

ADR-0015 section S-5 forbids closing either blocker from token calculations alone.
The first closure attempt failed for a reason worth recording: it reused
`stage1-contrast.spec.ts`, whose selectors returned **nothing** for `.qfield__i`,
`.snote`, `.sigsheet__i` and `.vcp__input`. Every one of them sits several steps
into a journey, and an empty sample reads exactly like a pass.

So each element here is reached by a written-down journey and then **asserted
present**. If one cannot be reached, the suite fails. It cannot report closure on
an empty set.

## Where each element actually lives

| Element | Journey |
|---|---|
| `.snote` | `/en/structure?family=services&intent=offer_trade_service` → category → Continue → needs screen → **Scope** |
| `.vcp__input` | the same needs screen → **Coverage** |
| `.qfield__i` | `?family=products&intent=offer_product` → *Describe it* → "EN 590 diesel, 5000 MT per month" → *Identify* → first candidate → *Confirm and create the draft* → **Quantity** → a basis chip |
| `.sigsheet__i` | `/en/market-signals` → a signal → *Ask Ponte to investigate this signal* |
| `dd.na` "Not stated" | the landing fact block, the Market Signals register, and a signal's detail facts |

The quantity field is behind a basis chip because the composer asks for the
**basis** before the figure, so "on request" is an answer a member can give instead
of accepting a number that was never theirs. That is deliberate, and documented in
`StructureComposer.tsx`.

## Nothing was written

The composer is driven to the question steps and no further. **"Complete the
record" is never pressed**, so no listing is created. The only thing that leaves
the machine is the product identification call, without which the quantity
question is unreachable.

## How the numbers were taken

`getComputedStyle` on the rendered page, composited over the first opaque ancestor
fill. Never from the token file: a token can be correct and still be overridden by
a selector nobody remembered.

**A border has two adjacent colours** — the control's own fill inside it and the
page ground outside it — and WCAG 1.4.11 is about the boundary being discernible.
Both are measured and the **worse** of the two is what has to clear 3:1. The
audit's page-ground figure is kept beside it so before and after stay comparable.

## Two corrections made during the run

**The investigate sheet's neutral state was measured focused.** The sheet moves
focus into its first input when it opens, so the first run read `#1E5FA8`
(`--pf-focus`) and labelled it neutral, where the neutral token is
`--pf-rule-strong`. The number was real and the name on it was wrong, which is
worse than a missing number. Calling `blur()` did not hold — the sheet puts focus
back — so the fix is to measure an element that is genuinely in the state being
recorded, not to fight the component.

**A 1:1 "failure" at 390 on Market Signals was the sampler, not the product.** At
that width `.reg` drops its card fill and each `.reg__row` becomes the white card
instead. The sampler accepted the transparent `.reg` and walked up to
`.ponte-desk`, comparing the ground with itself. Candidates that paint no fill are
now skipped rather than resolved to their parent.

## The three backgrounds

The closure criterion names white, the page ground and the sunken well. Two of the
three are reachable and are measured here:

- **white** (`#FFFFFF`), the raised card — **6.25:1**
- **the sunken well** (`#E2DBC4`), reached by hovering a register row, which is the
  state a member is in while reading down a register — **4.52:1**

No rendered instance of missing-data text sits directly on the page ground on any
surface reachable without a member session. The computed value there is 5.45:1,
between the two measured figures, and it is recorded as computed rather than
presented as rendered evidence.

## Greyscale

WCAG contrast is computed from relative luminance, so greyscale changes **no ratio
above**. What greyscale tests is Constitution section 6: that a missing value is
not separated from a stated one by hue alone. `Not stated` at `#656055` against a
stated value at `#0F0F0E` is a **3.07:1 lightness** difference, which is exactly
what survives `grayscale(1)`. The `-2-greyscale` frames show the same thing to the
eye.

## What is still the owner's

ExecPlan section 11.1 sets four criteria. The first three are answered here. The
fourth — no regression in factual hierarchy or task completion — is a read-through,
and it requires a Start a Deal submission completed end to end. That writes a
record, so it was not done against live data on an agent's judgement.
