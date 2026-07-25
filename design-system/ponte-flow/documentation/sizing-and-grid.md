# Sizing and grid

## Construction

- Canvas `24 × 24`, live area `20 × 20`, keyline padding `2`.
- Every arc is a segment of **R12** (route), **R6** (turn) or **R3** (detail). No freehand control points.
- Terminals `round`, joins `round`, on every asset without exception.
- Route direction is left→right, low→high. Reversed only where the concept requires it:
  `market.family.distribution`, `deal.origin` / `deal.destination`, and the C source/supply pair.

## Stroke by rendered size

Stroke is optical, not proportional. Do not scale the SVG and let the browser thin the line.

| Rendered size | Stroke |
|---|---|
| 16 px | 1.5 |
| 20 px | 1.6 |
| 24 px | 1.75 |
| 32 px | 2 |
| 40 px | 2.2 |
| 48 px | 2.5 |

Exported SVGs carry `stroke-width="1.75"` (the 24px value). Override it at render time with
`strokeFor(size)` from `registry/ponte-flow-registry.ts`, or set it in CSS on the host.

## Default sizes

| Context | Size | Asset |
|---|---|---|
| Navigation family (Explore entry) | 48 | standard |
| Section headers, empty states | 32 | standard |
| HS sector, trade service, distribution | 24 | standard |
| Composer field row, profile row | 20 | **reduced where one exists** |
| List row, notification, chip | 16 | **reduced where one exists** |

## The reduced threshold

**Use the authored reduced asset at any rendered size below 21 px.**

`reducedBelow: 21` in the registry states this per icon. 37 of the 89 icons have an authored
reduced drawing; the rest have no secondary element to lose and are identical at every size —
their `reducedAsset` is `null`, which is a statement, not an omission.

A reduced drawing is a **different drawing**, not a scaled one. Examples:

- `deal.evidence` — two attached evidence points become one.
- `deal.quantity` — four units become three.
- `field.frequency` — three ticks become two.
- `deal.public` — four radiating strokes become two.
- `profile.professional` — three record rules become two.
- `hs.*` — flatter curvature, one fewer secondary element per sector.

Never CSS-scale the standard drawing below 21px where a reduced asset exists. The reduced
asset is why the system survives a 16px list row.

## Hit targets

The icon is not the target. Interactive icons sit in a host of at least **44 × 44 px** on touch
and **32 × 32 px** on pointer. Focus is applied to the host, never to the SVG.
