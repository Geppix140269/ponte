# ADR-0004 — Deal Room is the primary monetisation boundary

- **Status:** Accepted by the product owner; effective when merged
- **Decision date:** 27 July 2026
- **Owner:** Giuseppe Funaro
- **Source issue:** #52
- **Current status:** Non-negotiable commercial architecture until explicitly superseded by the owner
- **Supersedes within scope:** Any commercial model that treats generic platform access, market-data access, free-form founder assistance or an unrelated subscription as Ponte's primary launch monetisation engine

## Context

Ponte must create enough market activity and commercial liquidity to become useful. Market Signals, Member Opportunities, trade-service requirements and offers, and distribution or representation opportunities feed the platform and help participants discover relevant commercial intent.

Charging too early for basic discovery would weaken liquidity. At the same time, the product needs a clear moment when commercial value becomes sufficiently concrete to support payment.

The accepted Deal Room Product Contract defines that moment. A Deal Room begins only after credible commercial interest and provides the structured procedure, evidence, decisions, blockers, responsibilities and next actions needed to progress a transaction.

An earlier open proposal, PR #47, defines paid Ponte Desk human fulfilment and protects founder capacity. That boundary remains compatible but is narrower than this decision. Ponte Desk is one monetised layer inside the broader paid Deal Room environment; it is not the whole monetisation architecture.

## Decision

Ponte Trade's primary monetisation boundary is the Deal Room.

Ponte creates upstream liquidity through open or low-friction discovery, Market Signals, Member Opportunities, structured commercial intent, trade-service activity, distribution and representation activity, and controlled qualification or introduction paths.

When credible commercial interest moves from discovery or connection into structured transaction progression, the parties enter a Deal Room. The Deal Room is the paid commercial environment.

A proposed room and its admission requirements may be previewed before payment. An active room that unlocks protected transaction progression requires a valid commercial entitlement. That entitlement may be paid by:

- the room initiator;
- one principal party;
- multiple or all principal parties;
- a sponsor, association or institution;
- a subscription that explicitly includes Deal Room capacity;
- a promotional or founding entitlement; or
- an auditable owner-approved waiver.

The exact payer, pricing unit, package names, included participants, limits and timing are configurable commercial decisions to be defined under issue #52. They are not fixed by this ADR.

Every launch revenue mechanism must be anchored to a Deal Room or a clearly Deal Room-related service. Possible mechanisms include:

- room activation or creation fees;
- participant or organisation access;
- self-managed, agent-assisted, Ponte-facilitated or Ponte-managed room packages;
- enhanced workflow, evidence, verification or reporting services;
- Market Signal investigation and counterparty work that leads into or supports a room;
- specialist inspection, logistics, compliance, legal, finance or other professional services coordinated through the room;
- portfolio or subscription plans that include defined active-room capacity;
- transaction, success, referral or completion fees where attribution, legality, payment and operational rules are clear.

These are permitted model families, not approved prices or implementation scope.

## Commercial funnel

The governing commercial funnel is:

```text
Create liquidity
  -> help users discover and structure commercial intent
  -> establish credible interest
  -> invite the parties into a Deal Room
  -> monetise transaction progression
  -> offer paid assisted, specialist and outcome-related layers around the room
```

The upstream layer is the acquisition and liquidity engine. The Deal Room is the monetisation and controlled-execution engine.

## Relationship to Ponte Desk

The founder-capacity and paid Ponte Desk principles remain valid:

- free or upstream product use must not create unpriced founder work;
- substantive human Ponte Desk work requires a paid or explicitly recorded entitlement;
- scope, deliverables, exclusions, timing, permitted external actions and payment terms must be accepted before work starts;
- low-cost access must never imply uncapped human assistance.

However, Ponte Desk is an optional fulfilment mode or paid layer within the Deal Room-centred commercial architecture. A self-managed or agent-assisted Deal Room is still a monetised product even when no Ponte human participates.

## Guardrails

- Do not place the principal liquidity-creation layer behind a paywall that prevents Ponte from building an active market.
- Do not describe payment as verification, trust, reduced risk, higher likelihood of closing or preferential truth status.
- Do not let a participant gain access to protected active-room content merely because another unrelated platform feature was purchased.
- Do not begin substantive Ponte Desk or specialist work without an explicit entitlement.
- Do not invent prices, packages, discounts, transaction fees or success-fee obligations before approval.
- Do not create hidden recurring charges or automatic renewals without clear acceptance.
- Do not let a payment failure erase already supplied data or destroy a durable transaction record; access and progression policy must be explicit.
- Sponsored, promotional and waived access must be auditable so it does not silently redefine the standard commercial model.

## Consequences

- Discovery and liquidity creation are optimised for participation and relevance rather than immediate paywall conversion.
- The product's main conversion event becomes movement from credible interest into an active Deal Room.
- Deal Room activation, entitlement and billing become core product concepts in the future domain and lifecycle model.
- Room previews, admission, payment and participant acceptance must be sequenced carefully so no party pays for a room that cannot meet its minimum activation conditions without a defined policy.
- Workspace, notifications, analytics, admin and support must distinguish proposed, entitled, active, sponsored, waived, expired, suspended and closed rooms.
- Subscription models, if used, must express room capacity or room-related value rather than silently reintroducing generic access as the primary paid product.
- Paid verification, investigation, Ponte Desk and specialist services should normally attach to a room, a proposed room or a clear path into one.
- Unit economics are measured around room creation, activation, participation, progression, assistance and outcome.

## Implementation boundary

This ADR records the commercial architecture only. It does not authorise:

- exact prices or package names;
- a pricing page;
- Stripe changes;
- invoice or tax configuration;
- entitlement tables or migrations;
- runtime paywalls;
- production feature flags;
- charging a user;
- external commercial communication;
- transaction or success-fee collection; or
- deployment.

Issue #52 must define and obtain approval for payer rules, package structure, admission/payment sequence, room capacity, sponsorship and waiver policy, refunds, expiry, abandonment, disputes, Stripe safety, tax, analytics and unit economics before implementation.

## Rejected alternatives

### Discovery-first paywall

Rejected because restricting the market-activity and liquidity layer would make it harder for Ponte to become useful and active.

### Paid Ponte Desk as the only revenue model

Rejected because human assistance is capacity-constrained and does not monetise self-managed or agent-assisted transaction progression.

### Generic subscription as the primary monetisation engine

Rejected because the most valuable and defensible moment is active transaction progression. A subscription may later include room capacity, but it must remain tied to Deal Room value.

### Success fees as the only revenue model

Rejected because attribution, delay, legal structure and collection risk make them unsuitable as the sole launch model.

### Free Deal Rooms to maximise activity

Rejected as the standard model because the Deal Room is where Ponte delivers controlled transaction progression and captures value. Promotional, sponsored or waived rooms require explicit auditable policy.

## Related records

- `docs/ponte-authority/PT-PRODUCT-2026-07-27-01-DEAL-ROOM-PRODUCT-CONTRACT-V1.md`
- `docs/decisions/ADR-0003-deal-room-product-contract.md`
- open PR #47 and its proposed ADR-0002
- `docs/codex/DECISION-LOG.md`
- `docs/codex/CURRENT-STATE.md`
- GitHub issues #50, #51 and #52
