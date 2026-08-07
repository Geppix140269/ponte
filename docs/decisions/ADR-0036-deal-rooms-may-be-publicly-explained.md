# ADR-0036: Deal Rooms may be publicly named, explained and demonstrated

- **Status:** ACCEPTED
- **Date:** 2026-08-07
- **Owner decision:** Giuseppe Funaro, 7 August 2026, recorded as OD-A during Recovery Mode.
- **Supersedes** the closed public-surface restriction in
  `00-NORTH-STAR-ENTRY-ARCHITECTURE.md` (amendment of 31 July 2026) and
  **ADR-0021 ruling 4**, to the extent described below.
- **Does not touch** ADR-0002, ADR-0003's product definition, ADR-0020,
  ADR-0028, ADR-0029 or ADR-0030.

---

## Why this exists

Three accepted records agreed on a closed list of public surfaces where the Deal
Room could be named:

- `00-NORTH-STAR-ENTRY-ARCHITECTURE.md`, 31 July amendment: *"The one **public**
  surface where the Deal Room must be named is `/pricing`."*
- **ADR-0021 ruling 4**: the permitted placements are *"the global command bar
  … the accepted-introduction surface … and `/pricing`."* It also ruled the Deal
  Room *"is not added to the public landing as a primary route."*
- `PT-PRODUCT-2026-07-27-01` section 3: *"It must not dominate the public entry
  experience before the user has a relevant transaction."*

The repository did not obey that list, and had not for some time:

| Surface | Status before this ADR |
|---|---|
| `/pricing` | The one permitted surface. **Does not name the Deal Room** (LB-014) |
| `/deal-rooms` | Public list route. Not on the list |
| `/deal-rooms/inside` | Public walkthrough, no flag, no session, no allowlist. Shipped under ADR-0028 without amending the North Star |
| Landing (`BridgeLanding.tsx`) | Names the room, explains free-to-build and paid-to-activate, links to `/deal-rooms`. Not on the list |

**The one surface the authority required to speak was silent, and three surfaces
it had not authorised were speaking.** That is not a drafting error to be tidied
away: the owner intends the room to be shown, and the restriction was written on
26 and 31 July, before the room was something Ponte wanted to demonstrate.

## The decision

**Deal Rooms may be publicly named, explained and demonstrated on Ponte public
surfaces, including the landing, `/deal-rooms`, `/deal-rooms/inside` and
`/pricing`.**

**Public visibility does not grant access to a real commercial room.** Real
participation, identity disclosure, invitations, activation, payment and
protected commercial work remain contextual, permissioned and controlled.

The distinction this ADR draws, and the only one it draws, is between:

- **explanation** — telling anybody what a Deal Room is, what it costs, and what
  it looks like, including with illustrative material; and
- **participation** — entering a real room, seeing real counterparties, real
  evidence or real terms.

The first is now unrestricted on Ponte's own public surfaces. The second is
unchanged and remains governed by `PT-PRODUCT-2026-07-27-01` sections 4 to 6,
ADR-0021 rulings 1 and 2, and the admission gate.

## What is superseded, precisely

1. **The closed list is withdrawn.** The North Star's *"the one public surface
   … is `/pricing`"* and ADR-0021 ruling 4's three permitted placements no
   longer bound where the room may be explained.

2. **`/pricing` naming the Deal Room remains REQUIRED**, by
   `PT-COMMERCIAL-2026-07-31-01` section 19. This ADR widens where the room may
   be named; it does not release the one place that must name it. LB-014 stands
   (see OD-F).

3. **ADR-0021 ruling 4's reasoning survives its conclusion.** The reason given
   was that the Deal Room is not a third entry journey. That remains true and is
   not disturbed: see below.

## What is NOT changed

**The North Star section 1 still stands in full.** The platform has two primary
entry journeys and no others — Explore the market, and Start a deal. **The Deal
Room is not a third.** Explaining the room on the landing is not the same as
making it an entry journey, and this ADR authorises only the former. ADR-0003's
*"not … the category definition of Ponte Trade"* is likewise intact: Ponte is a
commercial intelligence and controlled-execution layer, not a deal-room vendor.

**Convergence is still a statement about the funnel, not about navigation**
(ADR-0021 ruling 5, North Star 31 July amendment). Unchanged.

**No dead doors.** North Star section 3.5 is reaffirmed and applies with full
force to every surface this ADR permits. A public explanation may describe a
capability that exists; a *control* that offers to perform one must be gated on
the same condition as its destination, and appear only when a member can
actually arrive.

**Illustrative material must be visibly illustrative.**
`PT-PRODUCT-2026-07-27-01` section 15 already requires prototype organisations
and data to be explicitly fictional or illustrative. The static mocks on
`/deal-rooms/inside` are covered by that rule, and by the prohibition on
implying more verification than occurred.

**"Publish" is still the wrong verb for a room.** A Deal Room is activated, not
published. Unchanged.

## Consequences

- `/deal-rooms/inside` is retrospectively authorised and no longer an
  unreconciled surface.
- The landing's Deal Room band is authorised, subject to the no-dead-doors rule
  on its control.
- `/pricing` must still be reconciled to the Deal-Room-only model (OD-F).
- `00-NORTH-STAR-ENTRY-ARCHITECTURE.md` and `ADR-0021` are annotated, not
  rewritten. Their text stands with a superseding pointer to this ADR.
- Public discoverability of the *explanation* may fail open. Protected
  commercial actions may not. See **ADR-0040**.

## Alternatives rejected

**Keep the closed list and remove the three surfaces.** Rejected by the owner.
It would delete the only surfaces currently telling a visitor the truth about
the commercial model, and it mistakes a July drafting assumption for a product
intention.

**Declare the Deal Room a third entry journey.** Not asked for and not granted.
It would overturn North Star section 1 and ADR-0003 for no stated benefit.
