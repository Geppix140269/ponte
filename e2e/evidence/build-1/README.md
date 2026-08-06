# Build 1: the listing path, photographed

36 captures. Nine surfaces at **390px**, both themes, both session states, plus
the distribution branch reaching the seventh stored value.

Produced by `e2e/build-1-listing-path.spec.ts`. Re-run:

```
npm run dev:db
npm run dev:local
PONTE_EVIDENCE_BASE_URL=http://localhost:3000 \
  npx playwright test e2e/build-1-listing-path.spec.ts
```

Against the development server rather than a production build, and that is
deliberate: the signed-in half needs a real session, a real member and a
populated `hs_codes` table, and only the LOCAL stack has them. A production
build reads `.env.local`, which points at production, so capturing the
signed-in half that way would mean pointing an evidence run at real member data
to photograph a form.

---

## Signed out

| File | Surface |
|---|---|
| `01-b01-direction-signed-out` | `B01` What are you here to do? |
| `02-b01-family-signed-out` | `B01` the three families |
| `03-b01b-capacity-signed-out` | `B01b` capacity, nothing pre-selected |
| `04-b02-tell-ponte-signed-out` | `B02` four routes, upload gated |
| `05-b03-b05-listing-signed-out` | `B03`-`B05` the fact list, three tiers |
| `06-correction-in-place-signed-out` | the correction sheet, over the list |
| `07-b06-assets-signed-out` | `B06` add gated, visibility ladder shown |
| `08-b07-preview-signed-out` | `B07` three layers, exact expiry date |
| `09-b08-account-gate` | `B08` the light account gate |

## Signed in

| File | Surface |
|---|---|
| `10-b01-direction-signed-in` | `B01`, and the 90-day retention promise |
| `11-b02-tell-ponte-signed-in` | `B02` with the upload route open |
| `12-b03-b05-listing-signed-in` | `B03`-`B05` |
| `13-b06-assets-signed-in` | `B06` with the add control live |
| `14-b07-preview-signed-in` | `B07` |
| `15-b09s-screening-checked` | `B09s` three checks, all `Checked` |
| `16-b09-published` | `B09` the R2 recognition surface |

`B08` has no signed-in capture because it does not exist signed in: `pathFor`
omits the node, so a member with a session never meets it.

## Distribution

| File | Surface |
|---|---|
| `17-b01-distribution-position` | the position question, asked only here |
| `18-b01b-after-distribution` | the record carrying the resolved intent |

The spec asserts the kept draft holds
`{ family: "distribution", intent: "seek_brands_or_products_to_represent" }`.
That is the value the live three-option screen cannot express and that Set 2's
own `B01` cannot reach either, because its four position options encode
direction and position together and resolve to only two stored values.

---

## What each capture is checked for before it is taken

A screenshot of a broken page is still a screenshot, so every capture asserts
first and photographs second:

- the frame rendered, and it is the surface expected;
- every statement is set in the serif, **and** clears 4.5:1 against its own
  background;
- the shell and the body behind the frame are painted in the frame's own
  surface colour;
- nothing inside the frame is `position: fixed`.

Each of those four exists because it caught something. The last two were found
by looking at these images:

- `layout.css` carries a global `h1, h2, h3, h4 { color: var(--ink) }` from the
  retired obsidian chrome. Every serif statement rendered at rgb(238,241,245)
  on rgb(242,238,226): correct markup, correct face, unreadable.
- `globals.css` reserves 58px at the foot of every mobile page for a bottom bar
  this route does not render, leaving a band of obsidian under the cream.
- the design reference names the lock chip `.fixed`; Tailwind's `.fixed` is
  `position: fixed`. It left the flow and printed "Fixed" over "Public: anyone
  browsing Ponte" at the head of `B07`.

None of the three was visible in the source. Every rule this build wrote
applied exactly as written.
