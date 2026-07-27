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
| [ADR-0003](ADR-0003-constitution-led-interface-rebuild.md) | Binding Constitution-led rebuild of the complete interface | Accepted by owner; effective on merge |