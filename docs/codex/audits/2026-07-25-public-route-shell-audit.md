# Public route shell audit

**Date:** 25 July 2026
**Trigger:** Owner review of Deploy Preview 36. The North Star landing links its
market activity band to `/market-signals/[id]`, and that route was still
rendering the legacy obsidian application. A visitor one click into the new
product left it and entered the old one.
**Method:** Every route reachable from the new landing was fetched from the
deploy preview and checked for four legacy markers: the shared Brand v5 scope
class, hardcoded lime, legacy navigation (`/pricing`), and the lowercase
`ponte.` lockup.

## The contradiction that triggered this

The legacy shell asserts "Every listing is reviewed by the desk before it goes
live" and a vetted-marketplace positioning. A Market Signal is, by definition,
an external indication Ponte has **not** confirmed. The old chrome therefore
printed the opposite of the truth directly above the record it framed. This was
not a cosmetic mismatch; it was a false claim about evidence, on the one page
whose whole subject is the limits of what Ponte knows.

## Result after correction

| Route | Shell | Lime | Legacy nav | Lowercase lockup | Correction applied | Result |
|---|---|---|---|---|---|---|
| `/` | Ponte Trade | no | no | no | North Star landing (this PR) | Pass |
| `/explore` | Ponte Trade | no | no | no | Moved from its own near-copy of the chrome onto the shared `PonteShell` | Pass |
| `/structure` | Ponte Trade | no | no | no | None needed; already Brand v5 | Pass |
| `/find` | Ponte Trade | no | no | no | None needed; already Brand v5 | Pass |
| `/market-signals` | Ponte Trade | no | no | no | Rebuilt on `PonteShell` with the shared record presentation | Pass |
| `/market-signals/[id]` | Ponte Trade | no | no | no | Rebuilt on `PonteShell`; new hierarchy; `InvestigateButton` moved to shared buttons and tokens | Pass |
| `/about`, `/privacy`, `/terms` | Brand v5 legal, `PonteFooter` | no | no | no | None needed. They carry no wrapper scope class, which is why an early sweep flagged them; they render the Brand v5 light treatment and the shared footer | Pass |
| `/marketplace` | Legacy obsidian | **yes** | **yes** | **yes** | **None. Outstanding.** | Fail |
| `/marketplace/l/[ref]` | Legacy obsidian | not measurable | - | - | **None. Outstanding.** | Fail (no public listing exists to load; returned 404 at audit time) |
| `/verify` | Legacy obsidian | no | **yes** | **yes** | **None. Outstanding.** | Fail |
| `/workspace` | Legacy obsidian | no | **yes** | **yes** | **None. Outstanding.** | Fail |

## Outstanding, and why each matters

- **`/marketplace/l/[ref]`** is the most urgent of the four. The activity band
  links member records there, exactly as it linked signals to the page this
  audit was raised about. It did not surface in the owner's review only because
  no member listing is currently public: every one of the 300 public records is
  an imported Market Signal. The moment a member listing is approved, the same
  defect reappears through the same band.
- **`/verify`** is reachable from the landing search: a company-shaped query
  resolves to `destinationFor("check")`, which is `/verify?for=counterparty`
  while `NEXT_PUBLIC_CHECK_JOURNEY` is off.
- **`/workspace`** is where a member lands after submitting through Structure,
  so it terminates the Start a deal journey.
- **`/marketplace`** is the legacy board, superseded in principle by Explore but
  still linked from legacy surfaces.

These were left out of this pull request deliberately. PR 1 is the entry shell,
and migrating the member-listing, verification and workspace journeys is a
larger change with its own review surface. They are recorded here rather than
silently carried.

## Rule established

`components/shell/PonteShell.tsx` is the single shell for every public page
below the landing. It owns the wordmark, the token scope, the type scale, the
measure, the footer and the operator line. New public routes mount it; they do
not copy it. `ChromeGate` now records that a public route rendering inside the
obsidian chrome is an outstanding migration rather than a normal state.

The duplicate `ExploreChrome` created earlier in this PR has been deleted, so
there is no second copy left to drift.
