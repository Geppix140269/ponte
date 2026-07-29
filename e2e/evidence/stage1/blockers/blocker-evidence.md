# LB-002 and LB-003, measured on rendered pages

26 measurements, 0 below target.

Read with `getComputedStyle` on a local production build, composited over the
first opaque ancestor fill. Not derived from the token file.

## LB-002 — control boundaries, 3:1 (WCAG 1.4.11)

`ratio` is the worse of the boundary against the page ground and against the
control's own fill, because a border has two adjacent colours and both have to
let you see it.

| where | selector | state | viewport | boundary | vs ground | vs fill | worst | meets |
|---|---|---|---|---|---|---|---|---|
| Start a Deal / services / Scope | `.snote` | neutral | desktop | #827B69 | 3.63 | 4.21 | **3.63** | yes |
| Start a Deal / services / Scope | `.snote` | focus | desktop | #827B69 | 3.63 | 4.21 | **3.63** | yes |
| Start a Deal / services / Coverage | `.vcp__input` | neutral | desktop | #827B69 | 3.63 | 3.63 | **3.63** | yes |
| Start a Deal / services / Coverage | `.vcp__input` | focus | desktop | #0F0F0E | 16.53 | 16.53 | **16.53** | yes |
| Start a Deal / products / Quantity | `.qfield__i` | neutral | desktop | #827B69 | 3.63 | 4.21 | **3.63** | yes |
| Start a Deal / products / Quantity | `.qfield__i` | focus | desktop | #5D5950 | 6.01 | 6.98 | **6.01** | yes |
| Market Signal / investigate sheet | `.sigsheet__i` | neutral | desktop | #827B69 | 3.63 | 4.21 | **3.63** | yes |
| Market Signal / investigate sheet | `.sigsheet__i` | focus | desktop | #1E5FA8 | 5.56 | 6.45 | **5.56** | yes |
| Market Signal / investigate sheet | `[disabled] label` | disabled | desktop | #5D5950 | - | - | **6.01** | yes |
| Start a Deal / services / Scope | `.snote` | neutral | mobile-390x844 | #827B69 | 3.63 | 4.21 | **3.63** | yes |
| Start a Deal / services / Scope | `.snote` | focus | mobile-390x844 | #827B69 | 3.63 | 4.21 | **3.63** | yes |
| Start a Deal / services / Coverage | `.vcp__input` | neutral | mobile-390x844 | #827B69 | 3.63 | 3.63 | **3.63** | yes |
| Start a Deal / services / Coverage | `.vcp__input` | focus | mobile-390x844 | #0F0F0E | 16.53 | 16.53 | **16.53** | yes |
| Start a Deal / products / Quantity | `.qfield__i` | neutral | mobile-390x844 | #827B69 | 3.63 | 4.21 | **3.63** | yes |
| Start a Deal / products / Quantity | `.qfield__i` | focus | mobile-390x844 | #5D5950 | 6.01 | 6.98 | **6.01** | yes |
| Market Signal / investigate sheet | `.sigsheet__i` | neutral | mobile-390x844 | #827B69 | 3.63 | 4.21 | **3.63** | yes |
| Market Signal / investigate sheet | `.sigsheet__i` | focus | mobile-390x844 | #1E5FA8 | 5.56 | 6.45 | **5.56** | yes |
| Market Signal / investigate sheet | `[disabled] label` | disabled | mobile-390x844 | #5D5950 | - | - | **6.01** | yes |

## LB-003 — missing-data text, 4.5:1 (WCAG 1.4.3)

| where | state | viewport | text | colour | on | size | ratio | meets | vs stated value | distinct without hue |
|---|---|---|---|---|---|---|---|---|---|---|
| Landing fact block | neutral | desktop | Not stated | #656055 | #FFFFFF | 12px | **6.25** | yes | 3.07:1 vs #0F0F0E | yes |
| Market Signals register | neutral | desktop | Not stated | #656055 | #FFFFFF | 12px | **6.25** | yes | 3.07:1 vs #0F0F0E | yes |
| Market Signals register | row hover | desktop | Not stated | #656055 | #E2DBC4 | 12px | **4.52** | yes | 3.07:1 vs #0F0F0E | yes |
| Market Signal detail facts | neutral | desktop | Not stated | #656055 | #FFFFFF | 14px | **6.25** | yes | 3.07:1 vs #0F0F0E | yes |
| Landing fact block | neutral | mobile-390x844 | Not stated | #656055 | #FFFFFF | 12px | **6.25** | yes | 3.07:1 vs #0F0F0E | yes |
| Market Signals register | neutral | mobile-390x844 | Not stated | #656055 | #FFFFFF | 12px | **6.25** | yes | 3.07:1 vs #0F0F0E | yes |
| Market Signals register | row hover | mobile-390x844 | Not stated | #656055 | #E2DBC4 | 12px | **4.52** | yes | 3.07:1 vs #0F0F0E | yes |
| Market Signal detail facts | neutral | mobile-390x844 | Not stated | #656055 | #FFFFFF | 14px | **6.25** | yes | 3.07:1 vs #0F0F0E | yes |

## Greyscale

WCAG contrast is luminance-only, so greyscale does not change any ratio above.
What greyscale tests is Constitution section 6: that a missing value is not
separated from a stated one by hue alone. The `vs stated value` column is that
measurement, and it is a lightness ratio, so it is exactly what survives
`grayscale(1)`. The `-2-greyscale` frames show the same thing to the eye.

No surface relies on hue alone.

## Which backgrounds missing-data text was actually found on

The closure criterion names three: white, the page ground and the sunken well.
This is every distinct combination found in the rendered pages reachable
without a member session, deduplicated by colour, background and size.

| where | viewport | selector | colour | background | size | ratio |
|---|---|---|---|---|---|---|
| Landing fact block | desktop | `dd.na` | #656055 | #FFFFFF | 12px | **6.25** |
| Market Signals register | desktop | `dd.na` | #656055 | #FFFFFF | 12px | **6.25** |
| Market Signals register (row hover) | desktop | `dd.na` | #656055 | #E2DBC4 | 12px | **4.52** |
| Market Signals register (row hover) | desktop | `dd.na` | #656055 | #FFFFFF | 12px | **6.25** |
| Market Signal detail facts | desktop | `dd.na` | #656055 | #FFFFFF | 14px | **6.25** |
| Landing fact block | mobile-390x844 | `dd.na` | #656055 | #FFFFFF | 12px | **6.25** |
| Market Signals register | mobile-390x844 | `dd.na` | #656055 | #FFFFFF | 12px | **6.25** |
| Market Signals register (row hover) | mobile-390x844 | `dd.na` | #656055 | #E2DBC4 | 12px | **4.52** |
| Market Signals register (row hover) | mobile-390x844 | `dd.na` | #656055 | #FFFFFF | 12px | **6.25** |
| Market Signal detail facts | mobile-390x844 | `dd.na` | #656055 | #FFFFFF | 14px | **6.25** |

Distinct backgrounds reached: #E2DBC4, #FFFFFF.