# Ponte Trade architecture decision records

Architecture Decision Records (ADRs) preserve durable product and technical
decisions, their rationale, alternatives and consequences.

## Status values

- **Proposed** — awaiting owner decision.
- **Accepted** — approved and binding after merge to `main`.
- **Deferred** — intentionally postponed.
- **Rejected** — deliberately not adopted.
- **Superseded** — replaced by a later accepted ADR.

## Rules

1. Use an ADR when a decision changes the domain model, authority hierarchy,
   lifecycle, permissions, privacy, routes, system boundaries, production data
   contract or a principle that future contributors might otherwise reopen.
2. Record the owner decision and date.
3. Update the ADR rather than erasing history. A replacement ADR must identify
   what it supersedes.
4. Update `docs/codex/DECISION-LOG.md`, affected authorities, schemas and
   `docs/codex/CURRENT-STATE.md` in the same pull request.
5. An ADR is not proof that its implementation is complete or deployed.

## Index

| ADR | Decision | Status |
|---|---|---|
| [ADR-0001](ADR-0001-unified-trade-market.md) | Unified trade market with three primary families | Accepted by owner; effective on merge |
| [ADR-0002](ADR-0002-ponte-design-constitution.md) | Binding Ponte Design Constitution and Bridge System authority | Accepted by owner; effective on merge |
| [ADR-0003](ADR-0003-deal-room-product-contract.md) | Deal Room as the controlled PROGRESS layer | Accepted by owner; effective on merge |
| [ADR-0004](ADR-0004-deal-room-monetisation-boundary.md) | Master Deal Room as Ponte's primary monetisation boundary | Accepted by owner; effective on merge |
| [ADR-0005](ADR-0005-free-deals-and-counterparty-room-branches.md) | Free structured Deals with paid master Deal Rooms and private sub-rooms | Accepted by owner; effective on merge |
| [ADR-0006](ADR-0006-starter-deal-room-access.md) | Starter Deal Room access before ongoing paid use | Principle accepted; numerical limits proposed |
| [ADR-0007](ADR-0007-deal-passport.md) | Deal Passport as the durable evidence-backed transaction-history layer | Accepted by owner; effective on merge |
| [ADR-0010](ADR-0010-constitution-led-interface-rebuild.md) | Constitution-led rebuild of the complete interface | Accepted by owner; effective on merge |
| [ADR-0011](ADR-0011-complete-market-discoverability-and-category-first-journeys.md) | Complete Market Signal discoverability and category-first Trade Services and Distribution journeys | Accepted by owner; effective on merge |
| [ADR-0012](ADR-0012-automated-listing-publication.md) | Automated listing publication and one transactional email system | Accepted by owner; effective on merge |
| [ADR-0012](ADR-0012-market-classification-implementation-contract.md) | The market classification contract, as implemented (implements ADR-0011) | Proposed; awaiting owner review |
| [ADR-0014](ADR-0014-family-specific-downstream-commercial-procedures.md) | Family-specific downstream commercial procedures for the shared composer (completes ADR-0011) | Proposed; awaiting owner review |
| [ADR-0013](ADR-0013-automated-listing-publication.md) | Automated listing publication and one transactional email system | Accepted by owner; effective on merge |

## Unresolved numbering collision on ADR-0012

Recorded 28 July 2026. Not resolved here: renumbering an accepted decision
record is an owner action, and one of the two remaining claimants belongs to
another open pull request.

`main` holds **three** files numbered ADR-0012:

- `ADR-0012-market-classification-implementation-contract.md`, registered above
- `ADR-0012-ai-product-intake-and-document-to-deal-flow.md`, PR #71, **absent
  from the table above**
- `ADR-0012-automated-listing-publication.md`

The third is resolved by PR #74, which renumbers it to ADR-0013 and corrects
the register. The first two still collide, and the AI product intake decision
is not registered at all, so this table does not currently describe the
repository.

An ADR number is the handle a decision is cited by, so two records sharing one
makes every citation of it ambiguous. It is the same defect class as the
duplicate `20260728a` migration identifier found the same day. Whoever owns the
AI product intake decision should take the next free number and add the row.
