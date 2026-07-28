# Implementation notes

## 1 · Install

```html
<link rel="stylesheet" href="ponte-flow/tokens/ponte-flow-tokens.css">
<link rel="stylesheet" href="ponte-bridge.css">
<script src="ponte-bridge.js"></script>
```

`ponte-bridge.js` exposes one global, `PB`. No framework, no bundler, no build
step. In React, wrap — do not re-implement: one `useEffect` calling the relevant
`PB.*` on a `ref`, re-running when the data changes. `ponte-bridge-demos.js`
drives the specification document only; **do not ship it**.

## 2 · API

```js
PB.route(el, {stations, selected, visited, unit, mark, left, right, rightDashed,
              count, aria, animate, onSelect})
PB.progress(el, {steps, done, label, bands, halted, showSteps, note})
PB.header(el,   {name, steps, done, kicker})
PB.journey(el,  {stages, at, state, full})
PB.connection(el, {state, a:{name,role}, b:{name,role}, animate})
PB.dealroom(el, {milestones, at, participants:[{role, principal, state, next}]})
PB.value(steps, done)   // the progress authority — returns null when nothing is done
```

`journey` states: `travelling` · `awaiting-participant` · `awaiting-evidence` ·
`under-review` · `blocked` · `paused` · `expired` · `withdrawn` · `declined` ·
`completed`.

`connection` states: `one-party` · `awaiting-party` · `two-parties` · `proposed` ·
`awaiting-acceptance` · `connecting` · `accepted` · `declined` · `expired` ·
`withdrawn`.

Every component re-renders idempotently: call it again with new data. Components
measure their container, so call again on resize (debounce ~180ms) — the
specification document does exactly this.

## 3 · Rules that must not be broken

**Progress.** The value is the sum of the weights of completed steps and must be
computed **server-side**, as a pure function of the completed set. Never on the
client, never from a clock, never randomised. `PB.value()` is provided so the
client can render the same number, not invent one.

- Never render 0%. An unstarted task renders **no numeral at all** — pass
  `done: []` and the component shows the neutral state.
- Weights per set sum to exactly 100, so 100% cannot be reached early.
- 100% is labelled **Ready to submit for review**. Never *verified*, *trusted*,
  *safe*, *likely* or *guaranteed*.
- Commercial stage and task completion are two different statements. Never merge
  them into one number.

**Geometry.** No block has a fixed width. Station positions come from `tsFor(n)`
(2 → 0.30/0.70, 3 → 0.26/0.50/0.74, 4 → 0.16/0.39/0.62/0.85). Block width is
`max(88, min(cap, measuredGap − 12))`, caps 176 route / 150 journey / 140 Deal
Room participants. **Do not replace this with a constant** — a constant
reintroduces label collisions at widths the design was checked at.

**Colour.** Gold (`--pf-gold-ink`, 5.4:1) marks the member's own signal: the
moving point, the travelling runner, the destination it arrived at, and the
headline emphasis. Gold is **never** a warning and **never** a review status —
those are `--pf-danger` and `--pf-review`. `--pf-gold` (2.4:1) is for rules and
caps only, never text, never a node fill. `--pf-mute` (2.9:1) carries **no text**.

**Never dim a subtree containing text with `opacity`.** It multiplies the contrast
of every descendant. Recede states change colour at full opacity; opacity applies
only to nodes and piers.

**Motion.** Seven animations, six existing verbs, no new ones. Every component is
authored in its **end state**, so a paused tab, a print, a screenshot, reduced
motion and a JS failure all show correct information. Reduced motion is a
*removal*, never a substitution — honour `prefers-reduced-motion`, and add
`.br--still` for print, PDF and screenshot capture.

A moving point means work is happening **now**. A record waiting for a person uses
the halted node — a state, not an animation. It must never pulse for attention.

**Accessibility.** Selectable bridges are a `radiogroup` of `<button role="radio">`
with a roving tabindex — one tab stop per bridge. Because `route()` re-renders its
station DOM on selection, focus is carried across the rebuild by station id; if
you re-implement selection, preserve that or keyboard users are ejected to
`<body>`. Non-interactive bridges are a single `role="img"` with a sentence naming
the current stage, the next stage, and the caveat that later stages are not
guaranteed.

## 4 · Mobile

Below a **460px container** the family, action, journey, connection and Deal Room
bridges draw in elevation: a bowed deck traced from the container height, an
abutment cap at each end, nodes on the curve, piers lengthening as the deck bows
away from the labels. **One shared drawer (`elevation()`) renders all five** — do
not let a component draw its own vertical deck, which is how three of them once
ended up as straight rules with no caps.

**The Task Completion Bridge is the deliberate exception:** it keeps its horizontal
arc at every width. A percentage is a position along a single deck; rotating it
would turn one continuous value into a list of stops. It narrows, it does not
rotate.

Verified with no horizontal overflow at 320, 360, 390 and 430px.

## 5 · Landing integration — the narrow instruction

Two changes only:

1. **Replace the boxed three-column family section** with the family bridge, and
   reveal the action bridge on selection. Route each action to the journey it
   already routes to in production.
2. **Set the headline** to `Global trade, from <em>signal to deal.</em>` with
   `.hero h1 em{font-style:italic;font-weight:400;color:var(--pf-gold-ink)}`.

Do not restore a hero input box. Do not add marketing copy. Do not touch the
header items, the auth entrance, the routes, the data or the business logic.

## 6 · Open items, stated plainly

- **The weights are proposals.** The model is the deliverable; the numbers are
  commercial judgements and should be confirmed by whoever owns review.
- **No dark-theme review.** The tokens carry a dark palette and the components
  inherit it, but no one has looked at these bridges on the dark surface.
- **No copy for the nine journey state chips beyond their names.** Each needs one
  sentence saying who must act next; that is product copy, from the messaging pack.
- **Only the eleven journey stages named in the brief are supported.** Adding one
  changes every collapse count on every screen.
- **No Lottie.** Argued against in the specification rather than quietly omitted:
  every component here inherits live tokens, live type and live theme, and Lottie
  would freeze all three.
