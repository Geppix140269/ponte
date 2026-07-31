# ADR-0019: A selection bridge station may carry a category marker

- **Status:** Proposed (owner-approved in principle, 31 July 2026; binding on merge)
- **Date:** 2026-07-31
- **Amends:** Ponte Bridge System v1 (`design/authority/bridge/v1/`), and through it
  the Ponte Design Constitution section 8.
- **Relates to:** Issue #130 Stage 2, ADR-0002 (Design Constitution), ADR-0010
  (Constitution-led interface rebuild), ADR-0015 (contrast and colour).

## Context

Issue #130 Stage 2 carries an owner-approved design principle for the way a
member chooses a category inside the three market families:

> Categorical choices inside Products, Trade services and Distribution use the
> Ponte Bridge interaction model. Desktop uses a continuous horizontal or staged
> bridge, mobile a vertical bridge. The full node and label area is clickable.
> The selected and travelled state is unmistakable. No card grids, boxed
> category tiles, unequal-height cards, checkbox-looking cards, or a Bridge
> followed by an unrelated boxed selector. **Icons act as markers attached to
> the flow, not decorations inside rectangular cards.**

The last sentence conflicts with the delivered Bridge package. The approved
station has no icon, and the React port records the reason in
`components/ponte/bridge/BridgeRoute.tsx`:

> There is deliberately no icon on a station. The approved stylesheet has no
> icon slot because the approved station has no icon.

Two governance gates hold that position in place:

1. `scripts/check-bridge-invariance.mjs` diffs
   `design/authority/bridge/v1/source/ponte-bridge.css` against a pinned commit
   and fails on any added selector, any changed non-colour declaration, any
   changed `@keyframes` or `@media` body, and any changed duration or easing.
2. `scripts/check-governance.mjs` verifies the SHA-256 of every vendored file
   against `design/authority/bridge/v1/SOURCE-MANIFEST.md`.

The Constitution's own stop condition applies: where an approved component does
not support a required state, work stops and the missing decision is escalated.
It was escalated, and the owner decided on 31 July 2026 that the amendment
should be made rather than the icon requirement dropped.

## Decision

**A bridge station in `select` or `navigate` mode may carry one optional Ponte
Flow icon, rendered as a marker attached to the station's node.**

Bounded as follows.

1. **Where it applies.** Only to a station that stands for a market family, a
   category, a partner type, a coverage scope or a product sector, that is, a
   classification choice. It does **not** apply to the journey, progress,
   connection or Deal Room bridges, whose stations are positions in a process
   and remain icon-free.
2. **What it may be.** A `PonteIcon` registry key and nothing else. No inline
   SVG, no third-party icon set, no emoji, no image. The icon inherits
   `currentColor`, so it carries the station's own state colour and introduces
   no colour of its own.
3. **What it may not do.** The icon is never the only carrier of meaning: the
   station's title is always present and always legible without it. The icon is
   never a status, never a verification mark, and never gold on its own account.
   A station with no sensible registry key renders with no icon rather than a
   substitute.
4. **Where the style lives.** The marker is styled in
   `components/ponte/bridge/bridge-integration.css`, the implementation layer,
   **not** in the vendored authority stylesheet.

## Why the vendored authority file is not edited

The obvious reading of "amend the Bridge authority" is to add a selector to
`design/authority/bridge/v1/source/ponte-bridge.css` and re-baseline both gates.
This ADR deliberately does not do that, for three reasons.

- **The package is an approval record, not a live stylesheet.** It is the
  artefact the owner approved on 27 July 2026, checksummed so that what was
  approved can always be recovered. Mutating it and re-pinning the checksums
  destroys that property: the record would no longer be the thing that was
  approved, and the two gates would then be protecting the amendment rather than
  the approval.
- **There is an established precedent for exactly this.** The React port already
  adds `br__stage`, `br__vsvg` and `brst__w`, implementation-layer classes that
  do not exist in the vanilla authority CSS, styled in `bridge-integration.css`
  and recorded as exemptions in `lib/landing/__tests__/family-action-bridges.test.tsx`.
  The category marker is the same kind of addition and follows the same path.
- **It keeps the blast radius honest.** Re-baselining `check-bridge-invariance`
  would silently re-pin every unrelated declaration in a 245-line stylesheet.
  Adding one implementation-layer selector changes one thing and says so.

The amendment is therefore recorded here, in an ADR, which is where the
Constitution says a versioned exception belongs. The vendored package continues
to hold, byte for byte, what the owner approved; this document states what the
product is now allowed to do beyond it, and why.

## Consequences

- `BridgeRoute` gains an optional `icon` field on `BridgeStation` and renders a
  `brst__i` marker beside the node when one is supplied. The comment in that
  file recording "no icon on a station" is replaced by a pointer to this ADR.
- `bridge-integration.css` declares `.brst__i`. No approved value changes.
- `lib/landing/__tests__/family-action-bridges.test.tsx` adds `brst__i` to its
  recorded implementation-layer exemptions, with the reason and this ADR named.
  The class-vocabulary test otherwise keeps its full force: every other `br*` or
  `brst*` class must still exist in the approved stylesheet, so the exemption
  list stays a short, argued record rather than an escape hatch.
- `check-bridge-invariance.mjs` and the `SOURCE-MANIFEST.md` checksums are
  **unchanged**, and continue to protect the approved package exactly as before.
- The journey, progress, connection and Deal Room bridges are untouched.

## Alternatives considered

- **Drop the icon requirement.** Rejected by the owner on 31 July 2026: the
  markers are wanted, and a category list that reads as pure text loses the
  scanning affordance the boxed tiles had, which is the one thing the tiles did
  well.
- **Keep icons only in confirmation and summary lines.** Rejected for the same
  reason: it moves the marker away from the moment of choice, which is where it
  is useful.
- **Edit the vendored stylesheet and re-pin both gates.** Rejected for the three
  reasons given above. If the owner later wants the approved package itself to
  carry an icon slot, that is a new delivery from the design authority with its
  own approval and its own manifest, not a re-pin of the existing one.
