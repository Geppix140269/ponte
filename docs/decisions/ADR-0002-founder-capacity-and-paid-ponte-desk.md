# ADR-0002 — Founder capacity and paid Ponte Desk fulfilment

- **Status:** Accepted by the product owner; effective when merged
- **Decision date:** 26 July 2026
- **Owner:** Giuseppe Funaro
- **Supersedes:** Any assumption that free access, a low-cost subscription or an
  unpriced request includes founder intervention, manual investigation or
  proactive deal assistance

## Context

Ponte Trade is launching with one founder, Giuseppe Funaro, supported by the
platform and AI agents that Ponte develops. Founder time is the scarce operating
resource. It can create exceptional early customer value, but it cannot become
an unmetered support obligation attached to free participation or an inexpensive
software plan.

The product already defines Ponte Desk, Market Signal investigations, human
review, prepared actions, controlled introductions and scoped investigation
states. It does not yet define the commercial boundary between work completed by
the platform or agent and work that consumes founder capacity.

Without that boundary, free users could create hidden manual workload, paid
customers could receive inconsistent service, and the product could not measure
which human workflows should later be automated by the agent.

## Decision

Ponte Trade uses three explicit fulfilment modes:

1. **Platform self-service** — deterministic product workflows complete the task
   without founder involvement.
2. **Agent-assisted** — an AI agent structures, compares, explains, monitors,
   recommends or drafts within recorded permissions, without promising founder
   review or external action.
3. **Ponte Desk** — a paid, explicitly scoped human-assisted engagement that may
   use the founder, the agent and approved external specialists.

Free access and free product actions must be serviceable through platform
self-service or agent-assisted fulfilment. They do not create a founder work
item, service-level commitment, manual investigation, third-party contact or
proactive deal-management obligation.

Founder intervention is a paid entitlement. Before Ponte Desk work begins, the
customer must receive and accept a scope containing:

- the commercial objective;
- deliverables;
- material exclusions and unknowns;
- required customer inputs;
- target timing or service window;
- fee and payment terms;
- permitted external actions and approval boundaries;
- the completion condition.

Payment or an explicitly recorded contractual entitlement is required before
substantive Ponte Desk work starts. A founder or administrator may waive a fee
only through an auditable exception; silence, informal messaging or prior free
help does not create an entitlement.

The customer should normally buy an outcome-based package or engagement, not an
open-ended quantity of founder hours. Ponte may track internal effort and
capacity units for economics and scheduling, but those measurements do not need
to be the customer-facing price basis.

The agent may prepare a Desk scope, collect missing facts and estimate complexity.
It must not state or imply that Giuseppe or another human has reviewed, accepted
or started the case until the workflow records that event.

## Commercial architecture

The MVP revenue sequence is:

1. **Free self-service participation** to create liquidity and demonstrate value.
2. **Fixed-fee Ponte Desk engagements** for investigations, counterparty work,
   partner searches, sourcing support and active deal assistance.
3. **Recurring subscriptions** only when Ponte can deliver recurring monitoring,
   workflow or intelligence value predominantly through the platform and agent.
4. **Success, referral or transaction fees** only when Ponte materially supports
   execution and the attribution, payment, legal and operational rules are clear.

A low-cost subscription must never silently include uncapped Ponte Desk access.
A subscription may include defined Desk credits, response priority or discounted
case fees only when the entitlement and capacity limit are explicit.

Exact prices, discounts and package names are commercial configuration, not a
hard-coded domain truth. They may be tested during the MVP without changing this
ADR, provided the fulfilment and payment boundaries remain intact.

## Required domain contract

Every action or request that may create operational work must be classifiable by:

- `fulfilment_mode`: `platform_self_service`, `agent_assisted`, or `ponte_desk`;
- `commercial_model`: `free`, `included`, `fixed_fee`, `subscription`,
  `success_fee`, `transaction_fee`, or `custom`;
- payment or entitlement state;
- current work owner: customer, platform, agent, Ponte Desk or external party;
- promised deliverables and exclusions where Desk-assisted;
- approval requirements for disclosure, contact, payment and commercial action;
- auditable lifecycle timestamps and outcome.

The implementation may extend existing Investigation, Ponte Desk Engagement,
Work Item, Prepared Action, Approval Request, Execution and Outcome structures
rather than creating one table per concept.

## MVP operating rules

- No public call to action may suggest free personal assistance.
- “Ask Ponte to investigate” begins structured intake and a scope decision; it
  does not automatically begin manual research.
- The platform and agent first resolve what can be handled automatically.
- A request requiring founder work moves to `scope_required`, not directly to
  `in_progress`.
- The customer sees the proposed deliverable, fee and timing before payment.
- Only paid or otherwise entitled cases enter the Ponte Desk work queue.
- Capacity may be limited, scheduled or temporarily closed without disabling the
  free self-service product.
- Founder conversations outside the platform must be linked back to a recorded
  case before they create work or commitments.
- Human-assisted workflows must produce reusable structured evidence, templates
  and outcome data so repeated work can progressively move to the agent.

## Consequences

- Ponte can offer generous free participation without converting Giuseppe into
  free customer support.
- Early paying customers can receive founder-level attention as a deliberate
  premium service.
- The agent becomes both a fulfilment resource and a learning mechanism for
  reducing manual work over time.
- Pricing pages, request flows, Workspace states, notifications, admin queues and
  analytics must distinguish free automation from paid Desk work.
- Revenue and unit economics can be measured by engagement type, internal effort,
  external cost and outcome.
- A future team can join Ponte Desk without changing the customer-facing model.

## Rejected alternatives

### Free founder help during launch

Rejected because it creates hidden obligations, trains customers to expect
unpriced work and makes founder capacity unavailable for paying customers.

### Human support included in every subscription

Rejected because low-cost recurring fees cannot safely fund variable,
open-ended investigations and deal assistance.

### Hourly consulting as the primary product

Rejected because Ponte is a commercial intelligence and controlled-execution
platform, not a generic consultancy. Internal time may inform pricing, but the
customer should normally purchase a defined commercial outcome.

### Success fees as the only launch revenue

Rejected because attribution is weak, deals may close outside Ponte, payment is
delayed and the founder would finance substantial speculative work.

## Implementation implications

This ADR does not authorise a production migration, Stripe configuration change,
new paid product, external contact or production feature-flag change.
Implementation requires an owner-approved plan covering:

1. the MVP service catalogue and configurable pricing;
2. fulfilment-mode and entitlement classification;
3. Desk intake, scope, quote, acceptance, payment and work lifecycle;
4. Stripe webhook replay and idempotency safety before automated fulfilment;
5. Workspace and admin queue states;
6. capacity controls and service availability;
7. customer copy and honest service-level claims;
8. analytics, unit economics and outcome capture;
9. tests, preview, rollout and safe-disable.

## Related records

- `docs/ponte-authority/00-MASTER-IMPLEMENTATION-BRIEF.md`
- `docs/codex/SOURCE-OF-TRUTH-SOP.md`
- `docs/codex/DECISION-LOG.md`
- `docs/codex/CURRENT-STATE.md`
- `docs/decisions/ADR-0001-unified-trade-market.md`
