# ADR-0003 — Constitution-led rebuild of the complete Ponte Trade interface

- **Status:** Accepted by the product owner; effective when merged
- **Decision date:** 27 July 2026
- **Owner:** Giuseppe Funaro
- **Supersedes:** Only the narrow implementation boundary recorded after PR #58
- **Does not supersede:** The Ponte Design Constitution, its quality controls, or
  ADR-0002's prohibition on an uncontrolled application-wide repaint

## Context

ADR-0002 made `design/authority/PONTE_DESIGN_CONSTITUTION_v1.md` the binding
visual and interaction authority, and approved the Bridge System. To keep that
authority change reviewable, it deliberately limited first implementation:

> a separate implementation PR **may replace the temporary landing family/action
> card grid** with the approved Family and Action Bridges and restore the
> authorised gold italic headline emphasis.

`docs/codex/CURRENT-STATE.md` recorded the same boundary as "No other landing
redesign is authorised by this decision."

The Phase 1 audit
(`docs/codex/audits/constitution-rebuild/PHASE-1-AUDIT.md`) established that the
gap between that boundary and a compliant interface is large and structural:

- 5 of 28 user-facing routes are on the target Ponte Desk system;
- six competing visual systems totalling roughly 5,500 lines of CSS;
- all 12 approved motion components unimplemented, and the Flow motion and
  token stylesheets imported nowhere;
- all six approved Bridge types without a production primitive;
- 25 of 28 routes without route-level loading, error or empty treatment;
- 23 of 28 routes without a recorded 390 × 844 review.

The narrow boundary cannot close that gap, and leaving it in place would mean
each future journey PR either stops on an authority conflict or proceeds
without authority.

## Decision

> I, Giuseppe Funaro, authorise a Constitution-led redesign of the complete
> Ponte Trade interface.

This decision widens the narrow implementation boundary recorded after PR #58.

The Constitution now applies to:

- every public route;
- every authenticated route;
- every administrative route;
- every shared user-interface component;
- every meaningful loading, empty, error, blocked, waiting, active, review and
  completion state;
- desktop, mobile, keyboard, screen-reader and reduced-motion behaviour.

The programme must preserve existing:

- routes;
- authentication;
- permissions;
- schemas;
- data contracts;
- lifecycle truth;
- publication rules;
- verification rules;
- commercial logic;
- protected production behaviour.

The redesign must be delivered through controlled journey PRs, not an
uncontrolled application-wide repaint.

Missing or conflicting design authority remains a stop-and-escalate condition.

Giuseppe Funaro retains final design approval.

## Scope of supersession, stated exactly

This ADR supersedes **one thing**: the sentence in ADR-0002 and
`CURRENT-STATE.md` restricting first implementation to the landing family and
action grid plus the headline.

It does **not** supersede, weaken or create an exception to:

- any rule in the Ponte Design Constitution v1;
- the Constitution's amendment law (§3), stop conditions (§24) or enforcement
  (§25);
- the pull-request design gate (§22);
- the visual evidence and regression requirements (§21);
- **ADR-0002's rejection of an uncontrolled application-wide repaint.**

That last point is the reconciliation this ADR turns on, and it is not a
formality. ADR-0002 rejected the alternative "Perform an uncontrolled app-wide
repaint" with the reasoning that "implementation remains journey-by-journey
through scoped PRs". This ADR widens **what the Constitution governs**. It does
not change **how implementation is delivered**. The prohibition survives intact:
one journey per PR, each complete at desktop and mobile, each with its own
evidence and approval.

A pull request that repaints fragments across many unrelated routes remains
prohibited by ADR-0002 and is not authorised by this decision.

## Consequences

- The Phase 1 audit is accepted as the repository audit baseline.
- The ExecPlan at
  `docs/plans/active/constitution-led-interface-rebuild.md` governs sequencing,
  and follows the format required by `.agent/PLANS.md`.
- Phase 2 (shared foundation) is authorised to begin once this ADR is merged.
- Each journey slice is a separate branch and PR, requiring the Design
  Constitution checklist, desktop and 390 × 844 evidence, reduced-motion
  review and explicit owner design approval.
- Administrative routes are inside the Constitution's scope by this decision.
  They were excluded from the Phase 1 user-facing register and require their
  own inventory before their slice.
- Legacy removal remains conditional on replacement journeys being implemented
  and verified first.

## What this decision does not resolve

Two questions remain open and are recorded rather than assumed:

1. **`/marketplace`, `/marketplace/new`, `/marketplace/l/[ref]`** — these carry
   live listing and interest flows in legacy chrome. Rebuilding them is
   authorised by this ADR, but retiring them may be the better answer. That is
   a product decision, not a design decision, and it is not taken here.
2. **The Ponte lockup rendered as inline SVG** in `DeskShell` and `Logo.tsx`.
   Constitution §7 prohibits ad hoc SVG interface icons. A brand lockup is
   arguably identity rather than an interface icon. The Phase 1 audit records
   this as gap G6 pending an owner ruling.

## Related records

- `design/authority/PONTE_DESIGN_CONSTITUTION_v1.md`
- `design/authority/bridge/v1/README.md`, `APPROVAL.md`
- `docs/decisions/ADR-0002-ponte-design-constitution.md`
- `docs/codex/audits/constitution-rebuild/PHASE-1-AUDIT.md`
- `docs/plans/active/constitution-led-interface-rebuild.md`
- `docs/codex/CURRENT-STATE.md`
- `docs/codex/DECISION-LOG.md`
- `.agent/PLANS.md`
