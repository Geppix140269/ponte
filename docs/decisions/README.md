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
| ADR-0002 | Reserved by open PR #47; not part of this branch | Proposed outside `main` |
| [ADR-0003](ADR-0003-deal-room-product-contract.md) | Deal Room as the controlled PROGRESS layer | Accepted by owner; effective on merge |
| [ADR-0004](ADR-0004-deal-room-monetisation-boundary.md) | Master Deal Room as Ponte's primary monetisation boundary | Accepted by owner; effective on merge |
| [ADR-0005](ADR-0005-free-deals-and-counterparty-room-branches.md) | Free structured Deals with paid master Deal Rooms and private sub-rooms | Accepted by owner; effective on merge |
| [ADR-0006](ADR-0006-starter-deal-room-access.md) | Starter Deal Room access before ongoing paid use | Principle accepted; numerical limits proposed |
| [ADR-0007](ADR-0007-deal-passport.md) | Deal Passport as the durable evidence-backed transaction-history layer | Accepted by owner; effective on merge |
