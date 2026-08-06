# ADR-0032, amendment 1

**Date:** 6 August 2026
**Cause:** five pre-build findings from Claude Code, all accepted.
**Amends:** `ADR-0032`, the bridge is the interface.

---

## 1 · The arc supersedes a standing prohibition, and that is recorded here rather than landed quietly

`PONTE-BUILD-1-LISTING-PATH-v2.md`, item 3 of the thirteen: *"The arc used as navigation. It appears once, in the home hero, decorative."*

**That prohibition is amended, not ignored.** The distinction that makes both true:

- **What item 3 banned, and which stays banned:** the arc as a **navigation control**. Something a member clicks to go somewhere.
- **What `ADR-0032` introduces:** the arc as a **progress and identity device**. Nothing on it is clickable, nothing on it routes, and no node is a target. It reports state. It does not accept input.

The "appears once, decorative" clause is **withdrawn**. The arc now appears on every surface of the new system and is load-bearing rather than decorative.

**If any implementation makes a node, a label or the deck clickable, item 3 is being violated and the build is wrong.**

**The arc is never a target. A row that happens to contain an arc may be.**

`ponte-platform.html` puts the portfolio mini arc inside `<button class="item">`, so tapping the arc routes. That is the prototype being loose, not the rule being softer: the row is the control and the arc is a passenger in it. Every arc carries `pointer-events: none`, so the arc itself can never be the thing hit while the row around it stays clickable.

## 2 · Bronze is one colour at two ground levels, not two colours

`#C79A4C` is not a new meaning. `#8A6520` is unreadable on ink; `#C79A4C` is the same intent made readable on a dark ground. Name them as a pair:

- `--pf-bronze-on-cream: #8A6520` (existing `--attention`)
- `--pf-bronze-on-ink: #C79A4C`

**`ADR-0015`'s reservation of gold for arrival at a completed state is unchanged.** Neither token acquires a second meaning.

**Do not widen `check-contrast.mjs` or `check-token-adoption.mjs` to admit an unnamed value.** If a value cannot pass the gate, the value is wrong, not the gate.

## 3 · "Every screen" means every screen in the new system

It does **not** mean unbarring the fourteen route families that ChromeGate deliberately bares. Doing so would re-create the double-header defect a whole PR was spent removing.

**Bared routes stay bared until they are rebuilt on the new system.** When a route is rebuilt, it adopts the masthead and tape and leaves the bared list at that moment, one at a time.

## 4 · The tape stops under reduced motion, and needs a real control

"Never stops" was written about the market, not about the animation. Corrected:

- **`prefers-reduced-motion` stops it.** Item 6 governs.
- Hover-pause does not serve keyboard or touch. **A visible pause control is required**, reachable by keyboard, and its state persists for the session.

## 5 · One green and one red, the existing ones

`#5E9B78` and `#C4664E` in the prototype were invented at the drawing board. **Discard them.**

Use the existing `--done: #0F6E3D` and `--blocked: #B4402A`, adjusted for the ink ground under the same on-cream / on-ink pairing as bronze if legibility requires it, and **named** if so.

Two greens and two reds with no stated difference is how a palette stops meaning anything. Correct, and my error.

## 6 · The type scale has two roles, and the ADR was written before one of them existed

`ADR-0032` says "question serif at 38 to 52px". `ponte-platform.html` sets `h1` at 58px. Both are right, because they are not the same thing:

- **Headline**, the landing and the band head: **up to 60px**.
- **Question**, anything the member is being asked to answer: **38 to 52px**.

`B01`'s question is also an `h1`, so the distinction is by ROLE and not by tag.

## 7 · The prototype is the authority for how it looks, never for what it does

**The prototype is the authority for how it looks. It is never the authority for what it stores, what it validates, or what it routes.**

`lib/structure/intent-choice.ts` remains the authority for `B01`'s six presented choices and seven stored values. `ponte-platform.html` is a drawing: its publish view holds two identical placeholder questions and jumps to the signed-in home after four answers.

**Wherever the two appear to disagree, the code wins and the prototype is wrong.** Building `B01` literally from the drawing would drop `seek_brands_or_products_to_represent` for the third time, which is the defect this whole build exists to end.

---

## Also

The passage prototype with five failing assertions is **superseded. Discard it.** The phone shell comes from `ponte-platform.html` below the 900px breakpoint.

The four non-English languages in the prototypes are unreviewed and are not copy. `messages/en.json` is untouched.
