# Stage 1 contrast remediation, visual evidence

Captured 29 July 2026 against two local production builds, with the private-site
gate bypassed by `scripts/evidence-build.mjs`. The gate itself is never modified in
the repository: that script patches `middleware.ts` for the build and restores it,
asserting byte-identity by sha256.

- `before/` was built from `origin/main` at `d184c1c`.
- `after/` was built from this branch.

Both were served by `next start` and captured by Playwright with
`animations: "disabled"`, so every frame is the authored settled state.

## What is here

For each of four screens, at 1280 x 900 and 390 x 844:

| suffix | state |
|---|---|
| `-1-neutral` | as loaded |
| `-2-selected` | first selectable control pressed |
| `-3-focus` | keyboard focus, reached by Tab so the ring is the real one |
| `-4-disabled-secondary` | a disabled or secondary control in view |
| `-5-greyscale` | the section 6 test: no state may depend on hue alone |

Plus `bridge-*.png` for the eight approved Bridge reference compositions, and:

- `measured-contrast.json` / `.md`: contrast read out of the rendered page with
  `getComputedStyle`, not computed from the token file.
- `bridge-geometry.json`: rendered path data, station coordinates and node
  dimensions, compared by `scripts/check-bridge-geometry.mjs`.

## Result

16 rendered measurements in both runs, over the same sample set:

- before: 0 of 16 met their target
- after: 16 of 16 met their target

Bridge geometry: 8 views, 1208 values compared, all identical.

## What this evidence does NOT close

LB-002 and LB-003 are **not** closed by this set. The elements they concern, the
composer's inputs and `Not stated` in a record register, need Supabase to render,
and these builds have no Supabase credentials, so `/market-signals` and `/find`
render their empty states and `/structure` cannot advance past its first step. The
selectors were sampled and returned nothing rather than returning a passing value.

Token-level proof exists and is necessary but not sufficient: the owner required
rendered evidence, and rendered evidence for those two needs a build with data. See
the pull request for what is proposed instead.
