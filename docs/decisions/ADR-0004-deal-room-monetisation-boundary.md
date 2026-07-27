# ADR-0004 — The master Deal Room is Ponte's primary monetisation boundary

- **Status:** Accepted by the product owner; effective when merged
- **Decision date:** 27 July 2026
- **Owner:** Giuseppe Funaro
- **Source issue:** #52
- **Current status:** Non-negotiable commercial architecture until explicitly superseded by the owner
- **Supersedes within scope:** Any commercial model that treats generic platform access, market-data access, free-form founder assistance, an unrelated subscription or individual counterparty sub-rooms as Ponte's primary launch monetisation unit

## Context

Ponte must create enough market activity and commercial liquidity to become useful. Market Signals, structured Deals, trade-service requirements and offers, and distribution or representation opportunities feed the platform and help participants discover relevant commercial intent.

Charging to create or publish a complete structured Deal would weaken liquidity. The clear value threshold occurs when a participant chooses to progress one defined Deal inside a controlled paid environment.

The accepted Deal Room Product Contract defines that environment. ADR-0005 further clarifies its hierarchy: one paid master Deal Room corresponds to one Deal and may contain any number of private related sub-rooms.

An earlier open proposal, PR #47, defines paid Ponte Desk human fulfilment and protects founder capacity. That boundary remains compatible but is narrower than this decision. Ponte Desk is one monetised layer inside the broader paid master Deal Room environment.

## Decision

Ponte Trade's primary monetisation boundary is the **master Deal Room**.

Ponte creates upstream liquidity through open or low-friction discovery, Market Signals, structured member-created Deals, trade-service activity, distribution and representation activity, and controlled qualification or introduction paths.

A complete eligible structured Deal may be submitted, reviewed and published without a Deal Room fee.

When credible commercial interest moves from discovery or connection into structured transaction progression, a participant opens and commercially sponsors one master Deal Room linked to that Deal.

One active master Deal Room:

- consumes one subscription room slot or pay-as-you-go activation;
- may contain any number of private related sub-rooms;
- remains the parent commercial, entitlement, audit and lifecycle object;
- may use included guest capacity or credits for admitted external organisations.

Private sub-room creation does not consume another master-room entitlement.

A proposed master room and its admission requirements may be previewed before final entitlement consumption. Protected active progression requires a valid commercial entitlement.

The entitlement may be supplied by:

- the Deal owner;
- an eligible interested counterparty;
- the master-room initiator;
- one or more principal parties;
- a sponsor, association or institution;
- a subscription that explicitly includes master-room capacity;
- Ponte Credits;
- a promotional or founding entitlement; or
- an auditable owner-approved waiver.

The exact numerical prices and included allowances are defined in the launch-pricing authority and remain proposed until owner approval.

## Commercial funnel

```text
Create liquidity through free structured Deals
  -> establish credible commercial interest
  -> open and entitle one master Deal Room for the Deal
  -> create private counterparty and provider sub-rooms
  -> monetise controlled transaction progression
  -> offer paid assisted, specialist and outcome-related layers
```

The upstream layer is the acquisition and liquidity engine. The master Deal Room is the monetisation and controlled-execution engine.

## Relationship to Ponte Desk

The founder-capacity and paid Ponte Desk principles remain valid:

- free or upstream product use must not create unpriced founder work;
- substantive human Ponte Desk work requires a paid or explicitly recorded entitlement;
- scope, deliverables, exclusions, timing, permitted external actions and payment terms must be accepted before work starts;
- low-cost access must never imply uncapped human assistance.

However, Ponte Desk is an optional fulfilment mode or paid layer within the Deal Room-centred architecture. A self-managed or agent-assisted master Deal Room is still a monetised product even when no Ponte human participates.

## Guardrails

- Do not place the principal liquidity-creation layer behind a paywall that prevents Ponte from building an active market.
- Do not charge merely to create or publish a complete eligible structured Deal.
- Do not charge another master-room activation for each private related sub-room.
- Do not describe payment as verification, trust, reduced risk, higher likelihood of closing or preferential truth status.
- Do not let a payer obtain ownership of another participant's Deal or access, disclosure or decision rights that were not separately granted.
- Do not begin substantive Ponte Desk or specialist work without an explicit entitlement.
- Do not invent or activate prices, discounts, transaction fees or success-fee obligations before approval.
- Do not create hidden recurring charges or automatic renewals without clear acceptance.
- Do not let a payment failure erase already supplied data or destroy a durable transaction record.
- Sponsored, promotional and waived access must be auditable.

## Consequences

- Discovery and structured Deal creation are optimised for participation and relevance rather than immediate paywall conversion.
- The product's main conversion event is movement from a free structured Deal into an entitled master Deal Room.
- Master-room activation, entitlement, billing, sub-room hierarchy and guest capacity become core product concepts.
- Five subscription slots mean five concurrent master Deals, not five conversations.
- Counterparty and provider sub-rooms may scale within the master room without multiplying room-slot cost.
- Guest organisations may consume included capacity or credits.
- Workspace, notifications, analytics, admin and support must distinguish proposed, reserved, entitled, active, sponsored, waived, expired, suspended and closed master rooms.
- Paid verification, investigation, Ponte Desk and specialist services should attach to a master room or specific sub-room.
- Unit economics are measured around master-room activation, guest participation, progression, assistance and outcome.

## Implementation boundary

This ADR records commercial architecture only. It does not authorise:

- production charging;
- a pricing page;
- Stripe changes;
- invoice or tax configuration;
- entitlement tables or migrations;
- runtime paywalls;
- production feature flags;
- external commercial communication;
- transaction or success-fee collection; or
- deployment.

The launch-pricing document currently remains proposed. Issue #52 must complete owner approval of the numerical package and the legal, tax, billing, refund, Stripe-safety and unit-economics work before implementation.

## Rejected alternatives

### Discovery-first paywall

Rejected because restricting the liquidity layer would make Ponte less useful and active.

### Paid Ponte Desk as the only revenue model

Rejected because human assistance is capacity-constrained and does not monetise self-managed or agent-assisted transaction progression.

### One paid room per counterparty branch

Rejected because the value-bearing object is the Deal. One master Deal Room must support multiple private counterparty and provider sub-rooms without consuming another master-room slot for each discussion.

### Generic subscription as the primary monetisation engine

Rejected because the most valuable and defensible unit is active master Deal progression. A subscription is acceptable only when it expresses explicit master-room and guest capacity.

### Success fees as the only revenue model

Rejected because attribution, delay, legal structure and collection risk make them unsuitable as the sole launch model.

### Free active master Deal Rooms

Rejected as the standard model because the master room is where Ponte delivers controlled transaction progression and captures value. Promotional, sponsored or waived rooms require explicit auditable policy.

## Related records

- `docs/ponte-authority/PT-PRODUCT-2026-07-27-01-DEAL-ROOM-PRODUCT-CONTRACT-V1.md`
- `docs/ponte-authority/PT-PRODUCT-2026-07-27-02-DEAL-TO-ROOM-BRANCHING-MODEL.md`
- `docs/ponte-authority/PT-COMMERCIAL-2026-07-27-01-DEAL-ROOM-MONETISATION-POLICY.md`
- `docs/ponte-authority/PT-COMMERCIAL-2026-07-27-02-DEAL-ROOM-LAUNCH-PRICING-V1.md`
- `docs/decisions/ADR-0003-deal-room-product-contract.md`
- `docs/decisions/ADR-0005-free-deals-and-counterparty-room-branches.md`
- open PR #47 and its proposed ADR-0002
- `docs/codex/DECISION-LOG.md`
- `docs/codex/CURRENT-STATE.md`
- GitHub issues #50, #51 and #52
