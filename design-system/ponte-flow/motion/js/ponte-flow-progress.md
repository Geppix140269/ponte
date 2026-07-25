# H01 · Bridge progress — engine specification

H01 is the only motion component that is **not** pure CSS. It is data-driven: the active
length, the numeral and the guidance sentence all follow one value, so it needs an engine.
This file specifies it; the reference implementation lives in `ponte-flow-motion.js` in the
design source and is ~40 lines.

## Contract

```ts
renderProgress(el: SVGSVGElement, value: number, opts?: { halted?: boolean }): void
```

- `value` is **20–100**. Values below 20 are a defect: entering the experience is already an
  intentional act, so the floor is 20.
- Where progress is not measurable, do **not** call this component. Use H04 (loop, no numeral).

## Geometry

The line variant is `M10 15C64 4 136 4 190 15` in a `0 0 200 20` viewBox, stroke 4.5.

1. Track: the full path at `--pf-opacity-track` (.16).
2. Active: a clone of the same path with `stroke-dasharray = L` and
   `stroke-dashoffset = L * (1 - value/100)` where `L = path.getTotalLength()`.
3. Point: `path.getPointAtLength(L * value/100)`, translated. Two tail circles at
   `t - 0.038` and `t - 0.076`, opacity .34 and .20.

## Halted variant

When `opts.halted` is true: the point takes `--pf-review`, both tail circles are hidden, and
a second path with `stroke-dasharray: 3 5` and `stroke-dashoffset: -L * t` draws the reserved
remainder in `--pf-review`. Nothing animates. A halted point means **a person must act** —
it must never pulse to attract attention.

## Reduced motion

Set the active length directly and hide the point. Do not tween. The numeral and the sentence
are unchanged: they, not the animation, carry the value.

## Band copy (must ship with the component)

| Range | Opportunity completeness | Professional profile | Submission readiness |
|---|---|---|---|
| 20–39 | Deal started | Profile started | Not ready to submit |
| 40–59 | Core information added | Basic details recorded | Not ready to submit |
| 60–79 | Good commercial detail | Profile taking shape | Ready to preview |
| 80–99 | Nearly ready to submit | Nearly complete | Ready to save |
| 100 | Draft complete | Profile information complete | Ready to submit for review |

At 100 the label is **Ready to submit for review**. Never *verified*, *trusted*, *safe* or
*guaranteed*. Profile completion and submission readiness use this same component with
different labels and different band copy — they must not share a single value in state.
