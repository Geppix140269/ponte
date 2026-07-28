# AI product intake: visual evidence

Captured by `e2e/product-intake.spec.ts`. Reproduce with:

```bash
npx playwright test e2e/product-intake.spec.ts
```

Constitution section 21 requires desktop and 390 x 844 evidence against the
approved references, and section 19 makes a happy-path-only component
incomplete. Issue #67 names eighteen states that must exist and be demonstrated.

## What is here

| Directory | Contents |
|---|---|
| `desktop/` | 26 states at 1280 x 900, clipped to the intake itself |
| `mobile-390x844/` | the same 26 states at 390 x 844, full page |
| `reduced-motion/` | the five states where motion would otherwise be present |

## Where the frames come from

From `/[locale]/dev/product-intake`, a development-only route that 404s in
production exactly like the Ponte Flow specimen sheet. Each state is built in
`app/[locale]/dev/product-intake/states.ts` by driving the **real reducer**
through real transitions. Nothing is mocked, and a state that drifts out of the
product drifts out of the evidence with it.

The gallery exists because several of these states cannot be produced on demand
in a browser: a blocked file format needs a legacy binary to hand, an extraction
failure needs the model to be unavailable, and a resumed session needs the
member to have left and returned. A screenshot from somebody's machine on a good
day is not reproducible evidence.

The gallery wraps each state in `.sstep`, the composer's own step container, so
the frames show the composition the member actually reaches rather than the
intake stretched across a page it is never given.

## What the same suite verifies, which a screenshot cannot show

Against the **live** journey at `/structure?family=products&intent=...`, on a
production build:

- both product intents open the same three-station intake, in the decided order;
- `gas oil` returns three ranked candidates led by EN 590 / ULSD, with a
  clarification question and nothing pre-selected;
- browse still reaches the HS category drill-down unchanged;
- the intake is a radiogroup with one tab stop and arrow-key traversal;
- no horizontal overflow at 320, 360, 390 and 430px;
- Trade services and Distribution still render the one-line subject step, with
  no product intake and no HS code asked for.

The `gas oil` case passes on a server with **no `ANTHROPIC_API_KEY` set**, which
is the point of building the deterministic stage first: the acceptance criterion
is a property of this repository, not of a service's availability.

## Two capture faults worth recording, because both looked like design defects

1. **The first mobile run captured the horizontal deck squeezed into 390px**,
   with the station blocks overlapping. The Bridge chooses its elevation drawing
   from `matchMedia` at hydration, and a page created at 1280 and resized to 390
   *before navigating* still hydrated against the wide media state. The viewport
   is now set on the context, and the mobile captures assert `br--v` so a run
   that loses the elevation drawing fails instead of producing a misleading
   frame.

2. **The first desktop run captured the intake at full page width**, because the
   gallery did not wrap it in `.sstep`. Evidence of a composition the member
   cannot reach is not evidence.

## Not captured here

Motion itself. The Bridge is authored in its end state, so a paused tab, a
print, a screenshot and reduced motion all show correct information; the gold
runner's travel is captured as a stepped sequence in the landing bridge suite
and is the same component.
