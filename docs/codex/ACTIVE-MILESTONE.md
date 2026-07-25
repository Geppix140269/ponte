# Active milestone — North Star entry architecture, PR 1

**Authority:** `docs/ponte-authority/00-NORTH-STAR-ENTRY-ARCHITECTURE.md`
**Status:** Implemented on branch, open for owner review, not merged.

This milestone supersedes the previous active milestone (Phase 0 Codex
onboarding and gap report), summarised at the foot of this file for history.
The owner directed a controlled refactor of the entry experience against the
North Star reset rather than a further audit pass.

## Objective

Deliver the first phase of the North Star entry architecture: an entrance that
gives a visitor value immediately, offers two primary journeys, and never leads
with emptiness.

## In scope (PR 1)

- The North Star authority document, and marking the superseded four-route
  instructions as historical.
- Recent market activity band, from real public records, on the landing.
- Two-route bridge (Explore the market, Start a deal) with direct navigation.
- Removal of the voice control and of any layout space it reserved.
- Search field below the bridge.
- Popular or recent areas, derived from real counts.
- Trust and evidence explanation.
- Desktop and mobile.
- Start a Deal routing into the existing Structure composer, with Source a
  product / Supply a product / Offer a trade service as the first choices.
- Initial `/explore` route shell.

## Out of scope (later phases)

- PR 2: the Explore universe drill-down (sector, chapter, subcategory,
  product), pagination and progressive loading.
- PR 3: the unified market activity screen, filters, and the rewrite of `/find`
  away from a Qualified-Opportunities-first result.
- PR 4: Start a Deal refinement, including duration and the remaining
  commercial terms, and service-specific fields.
- Verification, communication, investigation execution and monetisation.
- Any migration, production flag change or deployment.

## Definition of done

1. The North Star authority exists and the superseded instructions are marked.
2. Only two primary bridge routes render, and each navigates directly.
3. The voice control is absent, with no reserved space.
4. "Ponte Trade - What's your deal?" remains central, with search prominent
   below the bridge.
5. Recent market activity is visible above the bridge, from real data, with
   truthful classifications and working reduced-motion behaviour.
6. Explore opens a useful first screen with the three approved families and the
   existing HS categories and icons, requiring no registration.
7. Start a Deal reaches the existing composer, keeps preview before
   registration and keeps the existing AccountGate on save and submit.
8. `npm run verify` is run and its exact result recorded.
9. A deploy preview is available and the pull request stops before merge for
   owner review.

---

## Superseded milestone (history): Phase 0 Codex onboarding and gap report

Phase 0 asked for a repository-to-architecture gap report before any new
implementation, with no product UI or behaviour change. Its record is in the
repository history and in `docs/codex/CODEX-ONBOARDING-AUDIT.md`. The
deliverables that remain useful (route, component and API inventories; the
Qualified Opportunity and Market Signal confusion map; authentication
boundaries that lose work) are not cancelled. They are simply no longer the
blocking gate in front of the entry work the owner has now directed.
