# ADR-0006 — Starter Deal Room Access

> ## ⚠ Superseded by ADR-0020 — 31 July 2026. There is no Starter Deal Room.
>
> ADR-0020 and `PT-COMMERCIAL-2026-07-31-01` retire the Starter entitlement
> entirely. **Ponte issues no public free Starter Deal Room.** The organisation
> entitlement, the 30-day free term, the 3 sub-rooms, the 2 external guest
> organisations, the 2 internal users, the conversion points and the upgrade
> ladder are all superseded. `deal_room_entitlements.kind = 'starter'` is a
> legacy schema value retained for migration and audit, not a product.
>
> **The problem this ADR was solving is solved differently, and more
> generously.** Instead of one free room per verified organisation, the entire
> pre-activation journey is free for everyone, without limit: browsing,
> publishing, preparing a draft Master Deal Room, creating draft branches,
> inviting counterparties, accepting invitations and preparing for activation
> (authority §8). Payment begins only when a credible counterparty branch is
> ready to enter protected, write-enabled progression — **$79 USD for 30 active
> days**.
>
> **What survives:** the guardrails. Do not describe payment as verification or
> reduced risk; do not hide limits or expiry; do not delete evidence or history
> when a term ends; do not require an invited guest to pay to participate. All
> are restated in the new authority.
>
> See `docs/decisions/ADR-0020-deal-room-only-pricing-authority.md`.

- **Status:** **Superseded on 31 July 2026** by ADR-0020 / `PT-COMMERCIAL-2026-07-31-01`. Originally accepted in principle by the product owner; numerical limits proposed until separately approved
- **Decision date:** 27 July 2026
- **Owner:** Giuseppe Funaro
- **Supersedes within scope:** Any interpretation that every active Deal Room requires payment before a verified organisation can experience the core product

## Context

The Deal Room is Ponte's primary monetised product and the place where users experience structured progress, milestones, evidence, decisions and commercial momentum. Requiring payment before a new organisation can feel that experience creates unnecessary conversion friction.

At the same time, a permanently unrestricted free Deal Room would weaken the paid master-room model and allow organisations to avoid subscription or credit entitlements.

Ponte therefore needs a constrained starter entitlement that delivers the real core experience, creates no founder or Ponte Desk workload, preserves the paid master-room unit and converts naturally when the organisation needs more duration, participants, sub-rooms or concurrent Deals.

## Decision

Ponte provides a **Starter Deal Room** entry entitlement.

The customer-facing name should be **Starter Deal Room** or **Starter Access**, not "Freemium Plan". It is immediate product access rather than a discounted paid plan.

The Starter entitlement:

- is available at organisation level, not once per individual user;
- does not require a credit card;
- allows one master Deal Room linked to one complete structured Deal;
- includes the complete core Deal Room progression experience rather than a decorative demo;
- is limited by duration, participant capacity, sub-room capacity and assisted-service exclusions;
- becomes read-only when the starter term ends unless upgraded;
- preserves all room data, permissions, evidence and audit history on upgrade;
- does not include founder, Ponte Desk or specialist work;
- cannot be reset by creating additional user accounts for the same organisation.

An invited sponsored guest does not consume that guest organisation's own Starter entitlement merely by participating in someone else's room.

## Recommended launch limits

The following limits are proposed for approval:

- one Starter master Deal Room per verified organisation;
- activation begins when the first required external principal participant completes admission;
- 30 days of active progression;
- up to 3 private sub-rooms;
- up to 2 admitted external guest organisations;
- up to 2 internal organisation users;
- the full core workflow: admission, NDA, procedure, responsibilities, evidence, clarification, blockers, decisions, milestones, progress and basic AI recap;
- no human Ponte Desk, specialist services, custom reports or transaction support;
- read-only access after expiry, with a clear upgrade path to subscription or credits.

The starter reservation is released without consuming the organisation's entitlement if the required principal participant declines, the invitation expires before admission, or Ponte rejects the room before activation.

Once activated, closing the room early or failing to complete the transaction does not create another Starter entitlement.

## Product principle

The free experience must demonstrate the real value-bearing loop:

```text
Formal admission
  -> agreed procedure
  -> first meaningful action
  -> evidence or clarification
  -> visible milestone
  -> blocker or decision
  -> clear next action
```

Ponte should not remove the features that create the Deal Room's excitement. The starter version is limited by scale and time, not by replacing the product with a static preview.

## Conversion points

The product should invite upgrade when the organisation needs to:

- continue active progression after 30 days;
- open a second master Deal Room;
- create more than 3 private sub-rooms;
- admit more than 2 external guest organisations;
- add more than 2 internal users;
- use premium agent capabilities;
- commission Ponte Desk or specialist work.

Upgrade must preserve the existing room without re-entry, re-upload or loss of history.

## Guardrails

- Do not require payment merely to experience the first core Deal Room loop.
- Do not describe Starter access as a more verified or less risky transaction.
- Do not include unpriced human work.
- Do not create a crippled demo that cannot reach a real milestone.
- Do not hide the time, participant or sub-room limits.
- Do not delete evidence or audit history when Starter access expires.
- Do not require an invited guest to pay merely to participate.
- Do not permit repeated free master rooms through duplicate personal accounts.

## Commercial consequence

The accepted commercial ladder becomes:

```text
Free structured Deal
  -> Starter Deal Room experience
  -> paid subscription or credits
  -> optional paid agent, Ponte Desk and specialist layers
```

The Starter entitlement is the acquisition and conversion layer. Paid subscription and credits remain the standard model for ongoing Deal Room use.

## Implementation boundary

This ADR records the starter-access principle only. It does not authorise runtime code, schema changes, migrations, Stripe, production charging, deployment or the proposed numerical limits until the owner approves them explicitly.

## Related records

- `docs/ponte-authority/PT-COMMERCIAL-2026-07-27-03-STARTER-DEAL-ROOM-ACCESS.md`
- `docs/ponte-authority/PT-COMMERCIAL-2026-07-27-02-DEAL-ROOM-LAUNCH-PRICING-V1.md`
- `docs/ponte-authority/PT-COMMERCIAL-2026-07-27-01-DEAL-ROOM-MONETISATION-POLICY.md`
- `docs/decisions/ADR-0004-deal-room-monetisation-boundary.md`
- `docs/decisions/ADR-0005-free-deals-and-counterparty-room-branches.md`
- GitHub issues #51 and #52
