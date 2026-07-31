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
| [ADR-0004](ADR-0004-deal-room-monetisation-boundary.md) | Master Deal Room as Ponte's primary monetisation boundary | Accepted by owner; **partly superseded by ADR-0020** (entitlement sources, Ponte Desk layer, per-branch pricing) |
| [ADR-0005](ADR-0005-free-deals-and-counterparty-room-branches.md) | Free structured Deals with paid master Deal Rooms and private sub-rooms | Accepted by owner; **partly superseded by ADR-0020** (unlimited free principal-counterparty sub-rooms only) |
| [ADR-0006](ADR-0006-starter-deal-room-access.md) | Starter Deal Room access before ongoing paid use | **Superseded by ADR-0020.** There is no Starter Deal Room |
| [ADR-0007](ADR-0007-deal-passport.md) | Deal Passport as the durable evidence-backed transaction-history layer | Accepted by owner; effective on merge |
| [ADR-0010](ADR-0010-constitution-led-interface-rebuild.md) | Constitution-led rebuild of the complete interface | Accepted by owner; effective on merge |
| [ADR-0011](ADR-0011-complete-market-discoverability-and-category-first-journeys.md) | Complete Market Signal discoverability and category-first Trade Services and Distribution journeys | Accepted by owner; effective on merge |
| [ADR-0012](ADR-0012-automated-listing-publication.md) | Automated listing publication and one transactional email system | Accepted by owner; effective on merge |
| [ADR-0012](ADR-0012-market-classification-implementation-contract.md) | The market classification contract, as implemented (implements ADR-0011) | Proposed; awaiting owner review |
| [ADR-0014](ADR-0014-family-specific-downstream-commercial-procedures.md) | Family-specific downstream commercial procedures for the shared composer (completes ADR-0011) | Accepted 29 July 2026 |
| [ADR-0013](ADR-0013-automated-listing-publication.md) | Automated listing publication and one transactional email system | Accepted by owner; effective on merge |
| [ADR-0015](ADR-0015-contrast-and-colour-remediation.md) | Contrast and colour remediation: strengthened paper with a blue interaction family (amends the Constitution to v1.1) | Accepted by owner; effective on merge |
| [ADR-0017](ADR-0017-authentication-and-operational-email.md) | Authentication and operational transactional email: generated Supabase templates, a strict document reader, sender identity and no tracking (extends ADR-0013) | Accepted 30 July 2026 |
| [ADR-0020](ADR-0020-deal-room-only-pricing-authority.md) | Ponte Deal Room is the only paid product, at $79 USD per 30 active days, five included principal-counterparty branches, $15 USD each thereafter, capped at $199 USD (supersedes ADR-0004/0005/0006 within their commercial scope) | Accepted 31 July 2026; effective on merge. **Nothing implemented** |

## The index is incomplete beyond the ADR-0012 collision

Recorded 31 July 2026 while adding the ADR-0020 row. The table above still does
not describe `docs/decisions/`. Present on disk and **absent from the index**:
ADR-0008 (detailed Deal Room product definition), ADR-0009 (Deal Room technical
architecture), ADR-0016 (multilingual Deal Room interpretation), **both** files
numbered ADR-0018 (`member-business-verification-is-free` and
`mobile-action-hierarchy-and-completion-bridge`), **both** files numbered
ADR-0015 (`contrast-and-colour-remediation`, which is listed, and
`STAGE-2-interaction-tokens`, which is not), and ADR-0019 (bridge station
category marker).

So ADR-0015 and ADR-0018 are two further live numbering collisions of the same
class as the ADR-0012 one below, and five accepted decisions are uncited here.
ADR-0020 was chosen as the next number **after the highest file on disk**, not
the highest row in this table, which is why it skips ADR-0019.

Back-filling or renumbering accepted decision records is an owner action and was
deliberately **not** performed by the pull request that recorded this. It is
logged so the next contributor does not read this table as complete.

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
