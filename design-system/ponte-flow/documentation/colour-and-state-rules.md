# Colour and state rules

Colour authority is **Ponte Brand Book v5**. This library invents no colour.

## The four standing rules

1. **Gold is the brand signal and the moving point only.** No static icon in C, E or F contains
   gold. It never means reviewed, approved, warning or complete.
2. **Warning is slate. Danger is red. There is no amber.** Ponte has no amber token, and adding
   one would place a status between "fine" and "wrong" that the product cannot substantiate.
3. **Icons are ink by default** and take colour only from interface state — never from the
   subject. A sector does not have a colour; a selected sector has a state.
4. **Colour is never the only carrier.** Every state also carries shape, line treatment,
   position and a text label. Each survives greyscale and print.

## currentColor

Every exported SVG uses `stroke="currentColor"` and, where a shape is filled,
`fill="currentColor"`. No asset sets a literal colour. Colour is set on the host:

```html
<span class="pf-icon" style="color: var(--pf-ink)"><!-- svg --></span>
```

Opacity is used inside some drawings (`.3`–`.7`) for secondary elements. That is drawing
hierarchy, not state, and must not be overridden to signal anything.

## Interface states

| State | Colour | Container | Notes |
|---|---|---|---|
| Default | `--pf-ink` | — | |
| Hover | `--pf-gold-ink` | `--pf-sunken` | The only place gold-family colour touches an icon, and it is a hover affordance, not a status |
| Active | `--pf-ink` | `--pf-sunken` + 2px ink underline | |
| Selected | `--pf-ink` | `--pf-select` | Wash plus label weight, so selection survives greyscale |
| Muted | `--pf-ink-3` | — | Secondary, still legible |
| Disabled | `--pf-ink` at 42% | — | `pointer-events: none`; always accompanied by a reason in text |
| On dark | `--pf-ink` (inverse token) | `--pf-surface` (inverse) | Stroke weight unchanged |

## Semantic colour — where it is allowed

Semantic colour belongs to the **status component beside the icon**, not to the icon:

| Meaning | Token | Carried by |
|---|---|---|
| Evidence-backed / checked | `--pf-positive` | status pill + solid border + label |
| Under review | `--pf-review` | status pill + solid border + label, and the reserved route |
| Member-declared / unconfirmed | `--pf-declared` | status pill + **dashed** border + label |
| Unknown / not available | `--pf-ink-3` on `--pf-sunken` | status pill + hairline border + label |
| Danger / blocked | `--pf-danger` | status pill + solid border + label + explicit reason |

The single exception inside a drawing is the **reserved route** in `evidence.under-review` and
`participation.boundary`, which uses `--pf-review` for the 3/5 dash. That is a route condition
with a defined meaning, documented in `state-definitions.md`.

## Focus

`box-shadow: 0 0 0 2px var(--pf-surface), 0 0 0 4px var(--pf-focus)` on the interactive host,
radius `--pf-r-sm`. Never removed, never applied to the SVG, never replaced by colour alone.

## Dark surfaces

Switch tokens via `[data-theme="dark"]` or `.inverse`. Stroke weight is unchanged. No asset
depends on a fill that vanishes against ink and none carries a light-only shadow.
