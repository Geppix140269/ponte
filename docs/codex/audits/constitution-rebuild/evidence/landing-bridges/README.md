# Landing Family Bridge and Action Bridge — visual evidence

**Slice:** 4, branch `design/landing-family-action-bridges`
**Captured:** 28 July 2026, against a production build (`next build` + `next start`)
**Reproduce:** `npm run evidence:landing`
**Suite:** `e2e/landing-bridges.spec.ts` · **Config:** `playwright.config.ts`

To capture against a deploy preview instead of a local build:

```bash
PONTE_EVIDENCE_BASE_URL=https://deploy-preview-63--ponte-trade.netlify.app npx playwright test
```

---

## 1. The straight-line interpretation was rejected, and is gone

The first version of this slice drew the bridge deck as **one straight
horizontal rule**. That was not a design decision; it was a fallback, made
because `design/authority/bridge/v1/source/ponte-bridge.js` and the nine
approved reference renders were missing from the repository. Eight guesses were
recorded as `ENGINE DECISION` in the source.

**The owner rejected it.** A straight rule with evenly spaced dots is not the
Ponte bridge.

The approved package has since been recovered and every file now matches
`SOURCE-MANIFEST.md`. The geometry is the engine's own, and the frames below can
be laid beside `design/authority/bridge/v1/reference/` and compared directly.

| Was | Is |
|---|---|
| A straight horizontal line | A **cubic Bezier arch** |
| Evenly spaced stations | The engine's **non-uniform path fractions**, measured with `getPointAtLength` |
| A fixed 176px block width | **Measured** from the smallest gap between station points |
| No abutments | **Intent → The market**, and each family → **Structured journey** |
| Gold signal on a straight overlay | Gold signal on `offset-path` built from **the deck's own curve** |
| Mobile: a stacked list | Mobile: **one continuous bowed route**, nodes on the curve, piers reaching out |
| Stations carried Flow icons | **No icon**: the approved station has none |

## 2. The frames

| File | State |
|---|---|
| `desktop-1-family-neutral.png` | Opening state. Arch drawn as track only, no route chosen |
| `desktop-2-products-selected.png` | Products. Gold node on the arc, live deck from Intent, three actions |
| `desktop-3-trade-services-selected.png` | Trade services. Two actions, plus the note explaining there is no third |
| `desktop-4-distribution-selected.png` | Distribution and representation. Three actions |
| `desktop-5-keyboard-focus.png` | Focus reached by Tab: node ring and title underline |
| `desktop-6-reduced-motion.png` | `prefers-reduced-motion: reduce`. Identical settled composition |
| `desktop-7-runner-step-{1..5}-of-5.png` | The gold signal crossing **the arc**, stepped at 0/25/50/75/100% of its 620ms |
| `desktop-8-runner-settled.png` | Settled. The signal is gone |
| `desktop-9-selected-hover.png` | The chosen station with the pointer on it. Identical to `desktop-2` (DS-8) |
| `mobile-1-family-neutral-390x844.png` | 390 x 844. One bowed route, capped at both ends |
| `mobile-2-products-selected-390x844.png` | 390 x 844. Live segment down the same route to the chosen node |
| `mobile-3-page-390x844.png` | The whole landing at 390 |

The runner frames are the one sequence not captured with `animations:
"disabled"`, because that option finishes every animation at its end state and
would produce five identical images. The runner's animation is paused and its
`currentTime` set by hand while every other animation is finished, so the rest
of the frame is settled.

The signal travels **left to right** in every case, regardless of which station
was chosen before. The engine builds its `offset-path` as the live deck itself,
`seg(m, 0, ts[selIx])`: always from the near abutment to the chosen station. The
signal crosses the bridge; it does not slide between two stations. It also
covers most of the distance early, because `br-travel` uses the approved
`--pf-ease` `cubic-bezier(.2,.6,.2,1)`, which is front-loaded.

**All sixteen frames are byte-identical across three consecutive runs.**

## 3. Product sectors and HS language are gone

Owner decisions 4 and 5, both asserted in `family-action-bridges.test.tsx`.

**Sectors.** The fifteen-tile product-sector grid is removed from the landing
entirely, along with its heading and its `PRODUCT_SECTORS` import. It was
non-clickable by design, because no public signal currently carries an HS code
and a filter that cannot filter is noise. Sectors belong in the Explore journey,
where they will be clickable and lead somewhere. **That journey is not built
here.**

**HS language.** No HS copy reaches the landing. The approved reference's own
description of Products is "Requirements and offers for physical goods." — it
does not mention the taxonomy, and neither does any action note. The previous
copy ("Physical goods, classified against the HS taxonomy", and notes saying "No
HS code is asked for") put a classification vocabulary in front of members who
had not chosen anything yet.

**No services or distribution destination carries an HS parameter**, asserted
across all nine. They cannot encounter an HS gate either: the composer decides
that from `requiresHsClassification(family)`, which is true for products alone.

## 4. What the suite verifies beyond the pictures

17 checks, all passing, locally and against the deploy preview.

- **All nine destinations**, asserted literally and then **followed**, so a
  correct-looking href that 404s fails.
- **Without JavaScript**, every one of the nine is still a link in the document.
- **Keyboard**: the bridge is reached by Tab, is a **single tab stop**, one more
  Tab leaves it, and the four arrows traverse, select and carry focus, wrapping
  at both ends.
- **No horizontal overflow at 320, 360, 390 and 430**, on the document and on
  every element inside the bridge.
- **Reduced motion** preserves the complete settled state.
- **DS-8**: hovering the chosen station changes nothing about it.
- **DS-9**: one focus treatment, and no other Desk control lost its ring.
- **The geometry itself** is pinned to the engine's own numbers: the deck path
  string, the station fractions, the block-width formula and the elevation bow.

## 5. Remaining differences from the approved reference

Recorded rather than left to be noticed.

- **Keyboard: Home and End are not bound.** The approved engine binds only the
  four arrows. This is a translation of it, so they are absent here too. A
  radiogroup conventionally supports them; adding them is an enhancement for the
  owner to approve, not something to slip in.
- **The heading row is taken from the approved landing reference**
  (`.bhead`, "Three routes across.") but the hero above it is the product's
  existing one. The implementation notes are explicit that the reference
  composition "is not a whole page to port", so only the bridge module and its
  heading were taken.
- **Abutment and count copy** is the reference's own: Intent, The market,
  Structured journey, and the two-action note under Trade services.
- **DS-7 is closed** by the recovery: the abutment labels were never missing
  from the authority, only from the repository.

## 6. DS-8 and DS-9

Both fixed in `components/ponte/bridge/bridge-integration.css`, and both
unchanged by the geometry recovery.

**DS-8.** In the approved source the hover rules outrank the selected ones, so
pointing at the chosen family took its node from 15px to 13px, swapped the gold
for grey and faded the pier. The selected state is restored at a higher
specificity, using values copied from `.brst--on`. Hover on an unselected
station is untouched. `box-shadow` is deliberately not restated so a station
that is both chosen and focused keeps its focus ring.

**DS-9.** `desk.css` rings every focusable Desk control, and `:where()` carries
no specificity, so that rule applied on top of the Bridge's own focus treatment:
three indicators for one focus. Only the blanket ring is removed, and only
inside a bridge. What remains is the node ring at 2px `--pf-focus` (#1E5FA8) on
`--pf-surface` (#FCFBF7), about **5.9:1** against the 3:1 WCAG 1.4.11 requires,
plus the title underline.
