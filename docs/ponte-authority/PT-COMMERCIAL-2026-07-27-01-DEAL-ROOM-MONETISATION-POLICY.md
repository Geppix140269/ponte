# Ponte Trade Deal Room Monetisation Policy

- **Status:** Accepted by the product owner; effective when merged
- **Decision date:** 27 July 2026
- **Owner:** Giuseppe Funaro
- **Repository:** `Geppix140269/ponte`
- **Source issue:** #52
- **Implementation status:** Not started
- **Current authority:** Non-negotiable until explicitly superseded by the owner

## 1. Executive decision

Ponte Trade monetises the Deal Room.

Ponte creates upstream liquidity by helping businesses discover, publish,
structure and qualify commercial intent across:

- Products;
- Trade services; and
- Distribution and representation.

That upstream activity feeds the platform. The commercial conversion occurs
when a participant decides to progress one defined Deal inside a paid master
Deal Room.

> The upstream market creates liquidity. The master Deal Room captures value.

The master Deal Room is therefore both:

- Ponte's downstream controlled-execution product; and
- Ponte's primary monetisation environment.

## 2. Commercial boundary

Visitors and members may receive enough upstream value to understand relevance,
create or inspect a structured Deal, express credible interest and reach a
proposed master Deal Room without encountering a paywall that prevents Ponte
from building market liquidity.

A proposed master room may show:

- the Deal and commercial subject;
- the sponsor and proposed participant roles;
- admission requirements;
- confidentiality and room rules;
- the proposed operating mode;
- the commercial entitlement required to activate it.

Protected active-room progression requires a valid entitlement.

The fixed commercial rule is:

> A standard active master Deal Room is not a permanently free product.

## 3. Paid unit and sub-room treatment

The paid unit is the **master Deal Room linked to one defined Deal scope**.

One master Deal Room consumes one room entitlement or subscription slot. It may
contain any number of private related sub-rooms for counterparties, providers,
advisers and internal workstreams, subject to guest entitlements, permissions,
security, fair-use and anti-abuse controls.

Creating another private sub-room does not consume another master-room slot.

External guest organisations may consume included subscription capacity or
credits. Ponte counts real admitted organisational participation, not invitation
emails or sub-room creation.

## 4. Permitted entitlement sources

An active master room may be entitled through:

- payment by the master-room initiator;
- payment by the Deal owner;
- payment by one principal party;
- payment shared by multiple principal parties;
- payment or sponsorship by an association, institution or programme;
- a subscription that explicitly includes defined master-room capacity;
- Ponte Credits;
- a founding or promotional entitlement; or
- an auditable owner-approved waiver.

A waiver or sponsored room is an explicit exception. It does not redefine the
standard paid model.

The payer does not acquire authority over another participant merely by paying.
Payment, Deal ownership, participation, visibility and decision authority remain
separate.

## 5. Monetisation around the room

Ponte may monetise value at different points around a master Deal Room,
including:

- master-room activation;
- concurrent active master-room capacity;
- external guest-organisation capacity;
- self-managed workflow;
- agent-assisted workflow;
- Ponte-facilitated or Ponte-managed procedure;
- investigation and counterparty work;
- evidence, verification and reporting services;
- specialist inspection, logistics, compliance, legal, finance or other
  professional support coordinated through a sub-room;
- portfolio plans covering multiple active master rooms;
- transaction, referral, completion or success fees where attribution, legality,
  payment and operational rules are clear.

Private sub-room creation is included within an entitled master room. Ponte does
not charge a second master-room activation merely because another counterparty or
provider workstream is created beneath the same Deal.

## 6. Relationship to Ponte Desk

Ponte Desk is a paid fulfilment layer inside the Deal Room-centred commercial
architecture.

A master Deal Room may be:

- self-managed;
- agent-assisted;
- Ponte-observed;
- Ponte-facilitated;
- Ponte-managed; or
- institutionally sponsored.

A self-managed or agent-assisted master Deal Room remains a monetised product
even when no Ponte human participates.

Substantive founder, Ponte Desk or specialist work requires an explicit paid or
otherwise recorded entitlement and an accepted scope. Free upstream activity
must not silently create founder work.

## 7. Required MVP correction

The Deal Room Product Contract v1 previously listed "payments" outside the MVP.
This policy amends that statement as follows:

- **Excluded:** payment, settlement, escrow or trade-finance execution between
  the commercial parties as part of the underlying transaction.
- **Required product capability:** a commercial-entitlement gate for master Deal
  Room activation, including paid, included, sponsored, promotional or waived
  states.

The first commercially coherent Deal Room release must account for:

- entitlement required;
- entitlement reserved;
- entitlement pending;
- entitled;
- payment failed;
- sponsored;
- promotional;
- waived;
- expired;
- suspended; and
- closed.

A payment or entitlement failure must not destroy the proposed master room, its
sub-rooms, the user's submitted work or the durable audit record. The product
must define what can be viewed, resumed or exported in each state.

## 8. Commercial funnel

The accepted funnel is:

```text
Market Signals, structured Deals and member activity
        ↓
Discover and structure commercial intent
        ↓
Publish the eligible Deal for free
        ↓
Establish credible commercial interest
        ↓
Propose and fund one master Deal Room for that Deal
        ↓
Create private related sub-rooms
        ↓
Activate controlled transaction progression
        ↓
Monetise room capacity, guest participation and optional assisted services
        ↓
Record the outcome and support further Deals
```

## 9. Guardrails

- Do not put the principal liquidity-creation layer behind a paywall that prevents
  Ponte from building an active market.
- Do not charge merely to create or publish a complete eligible Deal.
- Do not charge another master-room entitlement merely because a related private
  sub-room is created.
- Do not imply that payment makes a participant verified, trusted, safer or more
  likely to complete the transaction.
- Do not let the payer obtain ownership of the posted Deal or disclosure,
  approval or decision rights that were not separately granted.
- Do not create hidden recurring charges or automatic renewals.
- Do not begin substantive human or specialist work without entitlement and
  accepted scope.
- Do not use a generic low-cost subscription to imply unlimited master Deal Rooms
  or uncapped Ponte Desk access.
- Do not treat promotional, sponsored or waived rooms as untracked free access.
- Do not erase transaction history because an entitlement expires.

## 10. Accepted hierarchy and proposed launch configuration

The accepted product hierarchy is:

```text
Free structured Deal
  -> paid master Deal Room
       -> any number of private related sub-rooms
```

The detailed launch-pricing document currently proposes:

- €149 per month or €1,490 per year;
- five concurrent active master Deal Rooms;
- unlimited related private sub-rooms under each master room;
- 25 concurrent external guest organisations;
- five internal organisation members;
- a credit alternative for master-room activation, extensions, overflow and
  additional guest organisations.

Those numerical prices and allowances remain proposed until explicitly accepted
by the owner.

## 11. Decisions still required

Issue #52 must complete or confirm:

- owner approval or revision of the proposed prices and allowances;
- customer terms, VAT/sales tax and invoicing;
- Stripe replay safety and payment-failure handling;
- refunds, restoration credits, abandonment and disputes;
- promotional and founding-member rules;
- institutional sponsorship;
- specialist-service commercial treatment;
- transaction or success-fee conditions;
- analytics and unit economics.

## 12. Implementation boundary

This policy does not authorise:

- production charging;
- a pricing page;
- Stripe changes;
- invoice or tax configuration;
- entitlement tables or migrations;
- runtime paywalls;
- production feature flags;
- transaction or success-fee collection;
- external commercial communication; or
- deployment.

The commercial and product authorities must be approved and followed by the
required technical, legal, schema, test and rollout work before production
activation.

## 13. Authority effect

This policy and ADR-0004 govern when they conflict with:

- the broad exclusion of "payments" from the Deal Room MVP;
- any assumption that active Deal Rooms are a permanently free liquidity tool;
- any model that treats paid Ponte Desk human intervention as Ponte's only Deal
  Room revenue;
- any model that charges one master-room entitlement per counterparty sub-room;
  or
- any generic subscription model presented as the primary launch monetisation
  engine without explicit Deal Room value.

It does not change the North Star entry routes. The Deal Room remains downstream,
not a third primary landing route.

## 14. Related records

- `docs/ponte-authority/PT-PRODUCT-2026-07-27-01-DEAL-ROOM-PRODUCT-CONTRACT-V1.md`
- `docs/ponte-authority/PT-PRODUCT-2026-07-27-02-DEAL-TO-ROOM-BRANCHING-MODEL.md`
- `docs/ponte-authority/PT-COMMERCIAL-2026-07-27-02-DEAL-ROOM-LAUNCH-PRICING-V1.md`
- `docs/decisions/ADR-0003-deal-room-product-contract.md`
- `docs/decisions/ADR-0004-deal-room-monetisation-boundary.md`
- `docs/decisions/ADR-0005-free-deals-and-counterparty-room-branches.md`
- open PR #47 and its proposed ADR-0002
- `docs/codex/DECISION-LOG.md`
- `docs/codex/CURRENT-STATE.md`
- GitHub issues #50, #51 and #52
