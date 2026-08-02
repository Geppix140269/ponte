# Build 1 — replace the live listing path

**For:** Claude Code
**From:** UX/UI Director
**Date:** 2 August 2026
**Authority:** canonical authority v5.2

The first build target is not the Deal Room. It is the two live screens on the money path, which are legacy, were never approved, and break thirteen agreed rules between them.

---

## What is being replaced

| Live now | Replaced by |
|---|---|
| `/deal-rooms/propose` — "Start with what you trade" | The Set 1 entry pattern, at `B02` / `S01` / `T01` |
| `/structure` — the three-option intent screen | Set 2 `B01` Choose Deal Intent, then the Set 1 patterns |

Design has delivered both as reference implementations: `ponte-set1.css` / `ponte-set1-screens.js` (3 patterns, 23 states) and `ponte-set2.css` / `ponte-set2-screens.js` (6 surfaces, 31 states), each in light and dark at 390px.

**Those files are the specification, not the production code.** Take the markup structure, the tokens, the state coverage and the copy verbatim. Build them properly in the app.

---

## The build

**`B01` Choose Deal Intent.** Direction, then family, then position for distribution. **Six opportunity types, not three.** Source a product · Supply a product · Find a trade service · Offer a trade service · Find distribution or representation · Offer distribution or representation. The live screen offers three; `DECISION-17` requires six.

**Capacity declaration.** Acting as principal, authorised representative, broker or intermediary, or service provider. A previous answer is a suggestion and must be actively confirmed. Intermediary status is public.

**Tell Ponte.** Speak, photograph or upload, browse categories, type with search, in that priority order. **The upload route requires sign-in** per `DECISION-16`.

**The listing so far.** One fact per line. Missing and uncertain rise above confirmed. Inferred marked distinctly from read. Correction in place, never a bare text field.

**Deal Preview.** Three visibility layers, minimum public dataset fixed and unmovable, identity reveal-on-accepted-interest by default. Validity 30/60/90 with 60 default and the exact expiry date.

**Submission confirmation.** This is an R2 recognition surface, not a receipt. All five Momentum elements.

**Screening.** Automated, per-check verdicts, seconds not days. `Checked`, never Approved or Vetted.

---

## Thirteen things that must not survive the build

From the live screens, all currently in production:

1. Sans-serif headline where the constitution requires serif
2. Rounded buttons. No boxes anywhere.
3. The arc used as navigation. It appears **once**, in the home hero, decorative.
4. **"Publish it" used for the Deal Room path.** Publish means a free public listing. Nothing else.
5. **"Open the room"** with no Starter or $79. It is Create a Deal Room, free, then Activate.
6. **"workspace"** — retired. Sub-room inside a room; "Your listing" for `B10`.
7. **"in five languages"** — unverified claim, remove unless it is true.
8. Three opportunity types instead of six.
9. "Three ways in. Ponte does the classification."
10. "Choose a route above. Browsing categories still works exactly as it did, and no customs code is needed before Ponte understands your product."
11. Ungated document upload.
12. Body copy set in monospace.
13. "Ponte kept where you had reached and brought you back to it. / Nothing started yet." — self-contradictory.

---

## Rules

No boxes. One primary action per screen. Tap and voice first, typing always available and never the only route. Back never loses work. One segmented progress rule, no numeral. 48px minimum targets, 64px choice rows. Every tap acknowledged inside 100ms. Empty, loading and error states for every surface, both themes.

Storage copy, verbatim: *"Saved only in this browser for up to 7 days. Sign in to keep it longer and continue on another device."* Signed in: 90 days from last meaningful edit, warnings at 14 and 3 days.

---

## Dependency

**Issue #84 gates verification of this build.** Every screen here has a signed-in branch, and without a development database nobody but Giuseppe can test one. The `market_family` crash was found by a human in the first minute precisely because of that gap. **Do #84 first, or this build ships with the same blind half.**

---

## Order

1. Issue #84, development database with a seeded session.
2. This build, `B01` through `B09`, product family first, then service and distribution behind the same architecture.
3. P2 copy corrections fold into it rather than being applied twice.
