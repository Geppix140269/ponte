# Ponte Bridge System — implementation notes

## 1. Installation model

The approved package uses Ponte Flow tokens plus the Bridge stylesheet and engine. In React, wrap the engine or translate it into shared React primitives without changing its geometry, states, accessibility or semantics. Do not re-interpret the design per page.

The demo driver is specification-only and must not ship.

## 2. Approved API model

```js
PB.route(el, {stations, selected, visited, unit, mark, left, right, rightDashed,
              count, aria, animate, onSelect})
PB.progress(el, {steps, done, label, bands, halted, showSteps, note})
PB.header(el,   {name, steps, done, kicker})
PB.journey(el,  {stages, at, state, full})
PB.connection(el, {state, a:{name,role}, b:{name,role}, animate})
PB.dealroom(el, {milestones, at, participants:[{role, principal, state, next}]})
PB.value(steps, done)
```

Journey states: `travelling`, `awaiting-participant`, `awaiting-evidence`, `under-review`, `blocked`, `paused`, `expired`, `withdrawn`, `declined`, `completed`.

Connection states: `one-party`, `awaiting-party`, `two-parties`, `proposed`, `awaiting-acceptance`, `connecting`, `accepted`, `declined`, `expired`, `withdrawn`.

Components must re-render idempotently when data or measured width changes.

## 3. Rules that must not be broken

### Progress

Completion is the sum of weights for completed steps and must be a pure, deterministic function of the completed set.

- Never render 0%.
- An unstarted task renders no numeral.
- Weights sum to exactly 100.
- 100% means the defined task or agreed procedure is complete and may be labelled Ready to submit for review where appropriate.
- 100% never means verified, trusted, safe, likely or guaranteed.
- Commercial stage and task completion remain separate statements.
- The same completed state must always produce the same value.

### Geometry

Station positions and block widths are measured. Do not replace measured spacing with a single fixed width. Two-action and three-action variants must both remain balanced and collision-free.

### Colour

- `--pf-gold-ink` marks the member's signal, runner, selected destination and authorised headline emphasis.
- Gold is never warning or review.
- `--pf-gold` is for rules and caps, not text or node fill.
- `--pf-mute` carries no body text.
- Never dim a subtree containing text with opacity; change approved text colour while keeping readable opacity.

### Motion

Every component is authored in its informative end state. A paused tab, print, screenshot, reduced-motion preference or JavaScript failure must still show correct information.

Reduced motion removes non-essential animation. A moving point means work is happening now. Waiting for a person uses a halted state and must not pulse for attention.

### Accessibility

Selectable bridges are a radiogroup of buttons with roving tabindex: one tab stop per bridge. Focus must survive re-render. Non-interactive bridges expose one useful sentence naming current stage, next stage and the fact that later stages are not guaranteed.

## 4. Mobile

Below a 460px container, family, action, journey, connection and Deal Room bridges use the approved elevation treatment. One shared geometry system must render them; individual components must not invent separate vertical lines.

Task Completion is the deliberate exception and retains its horizontal arc at every width.

No horizontal overflow is permitted at 320, 360, 390 or 430px.

## 5. Landing integration — narrow scope

A later implementation PR may make exactly these visual changes:

1. Replace the boxed three-column family/action section with the approved Family Bridge and revealed Action Bridge. Preserve every existing action destination.
2. Render `Global trade, from <em>signal to deal.</em>` using Playfair Display italic 400 and `--pf-gold-ink` for the emphasis.

Do not restore a hero input, add marketing copy, change header items, alter authentication, reroute actions, change data or modify business logic.

## 6. Open items

- Procedure weights are product decisions and require owner confirmation for each real workflow.
- Dark-theme tokens exist but the Bridge System has not received a separate dark-theme visual approval.
- Journey state explanatory copy must say who acts next and requires product-copy approval.
- Adding or removing journey stages changes the approved geometry and requires an authority amendment.
- Lottie is not authorised; live SVG/CSS/React behaviour preserves tokens, typography, accessibility and theme.