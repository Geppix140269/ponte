# Motion rules

## The contract

**Every component is authored in its end state.** The SVG on disk is what the user should see
when the animation has finished — or when it never runs. Animations play *from* an offset
*toward* that state.

Consequence: reduced motion, print, screenshots and a paused tab all show correct information.
Reduced motion is a **removal**, never a redraw.

## The six verbs

Travel · Reveal · Assemble · Connect · Focus · Confirm. Nothing else animates. Anything outside
this vocabulary is a state change, a transition, or nothing at all.

## What may animate

Only the twelve Library H components in `motion/motion-spec.json`. Libraries C, E and F add no
animated components of their own: C uses Focus (selection) and Reveal (drill-down); E and F
reuse H01, H03, H06 and H07.

## The honesty rule

> A moving point means work is happening **now**.

Do not animate a review or verification process unless the platform has actually started it.
A record waiting for a person uses the **halted point** — a state, not an animation. It never
pulses to attract attention.

## Production status

| Component | Implementation | Status |
|---|---|---|
| H01 Bridge progress | JS engine + SVG | Production-ready — spec in `motion/js/ponte-flow-progress.md` |
| H02–H12 | CSS keyframes + authored SVG | Production-ready — `motion/css/ponte-flow-motion.css` |
| Lottie exports | — | **Not authored.** See below |

**Conceptual, not shipped:** the original brief suggested Lottie for H04 and H12. No Lottie JSON
has been authored. The CSS + SVG implementations of both are complete and production-usable; a
Lottie export would be a re-authoring exercise, not a conversion, and should only be commissioned
if a native surface needs it. Nothing in this package pretends otherwise.

## Timing and easing

| Token | Value | Used for |
|---|---|---|
| `--pf-dur-micro` | 120 ms | hover, press |
| `--pf-dur-enter` | 220 ms | menus, tabs, confirm |
| `--pf-dur-deliberate` | 420 ms | drawers, reveals |
| `--pf-dur-crossing` | 900 ms | the crossing (H01, H07) |
| `--pf-dur-loop` | 1900 ms | unknown duration (H04) |
| `--pf-dur-lane` | 1600 ms | origin→destination (H10) |
| `--pf-dur-signal` | 2600 ms | signal pulse (H08), two cycles then rest |
| `--pf-ease` | `cubic-bezier(.2,.6,.2,1)` | movement |
| `--pf-ease-entrance` | `cubic-bezier(.16,1,.3,1)` | entrances |

## Interruption

- **Non-looping components** — re-triggering restarts from the current rendered state. Never
  queue two runs of the same component on one element.
- **Looping components** — cancel on result. The point fades within 200 ms and the component
  rests at its authored end state. A loop must never appear to reach a completed state.

## Loading durations

| Duration | Treatment |
|---|---|
| Under ~500 ms | No loader. A state transition only |
| Short | Bridge line, no percentage |
| Medium | Bridge line + one clear process label |
| Long / multi-stage | Real stages, named in order, in the order they run |

Never claim a stage the system is not performing.

## Prohibited

Bouncing, elastic overshoot, confetti, spinning globes, constant pulsing, decorative floating,
generic spinners, and any movement that competes with the user's task. No component may fake a
percentage or show 0%.
