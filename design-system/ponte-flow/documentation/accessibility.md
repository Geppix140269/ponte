# Accessibility

## Icons are not the message

Every exported SVG carries no title and no role: they are rendered `aria-hidden="true"` inside a
host that provides the accessible name, **or** given an explicit label where the icon is the only
carrier. `accessibilityLabelRequired` in the registry says which is which (14 of 89 require one).

```html
<!-- icon beside a visible label: decorative -->
<span class="pf-icon" aria-hidden="true"><!-- deal-origin.svg --></span>
<span>Origin</span>

<!-- icon carrying the state alone: labelled -->
<span class="pf-icon" role="img" aria-label="Evidence under review. A person must complete this; nothing is decided.">
  <!-- evidence-under-review.svg -->
</span>
```

## Status is text

No state in this system is communicated by colour, shape or motion alone. Every status pill has
a word in it. Every route condition has a sentence beside it. A screen reader user and a
greyscale printout receive the same information as a sighted user on a colour display.

## Reduced motion

Honour **both** `prefers-reduced-motion: reduce` and the in-product toggle
(`[data-reduced-motion="1"]`); they must produce identical output. Ship
`motion/reduced-motion/ponte-flow-reduced-motion.css`.

Because components are authored in their end state, the reduced path removes the travelling
point and the loops and keeps the value, the numeral and the sentence.

## Contrast

- `--pf-ink` on `--pf-surface` and the inverse pair both exceed 4.5:1.
- `--pf-ink-3` is the lightest permitted text and status colour on cream (≥4.5:1).
- `--pf-mute` is decorative or large-only. Never a status.
- Disabled icons sit at 42% and are always accompanied by a reason in text — the opacity is not
  the message.

## Keyboard and focus

Focus ring on the interactive host, never on the SVG, never removed:
`0 0 0 2px var(--pf-surface), 0 0 0 4px var(--pf-focus)`. Icon-only buttons need
`aria-label` and a hit target of at least 44 × 44 px on touch.

## No flashing

Nothing in the library flashes, strobes or repeats rapidly. H08 runs two cycles and rests.
H04 and H10 loop calmly at 1.6–1.9 s and are cancelled the moment a result arrives.

## No icon fonts

Every asset is an SVG. Nothing in this package requires a font file to render, so no icon can
be lost to a font-loading failure or a text-replacement extension.
