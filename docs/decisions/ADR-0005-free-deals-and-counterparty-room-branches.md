# ADR-0005 — Free posted Deals and isolated paid counterparty Deal Rooms

- **Status:** Accepted by the product owner; effective when merged
- **Decision date:** 27 July 2026
- **Owner:** Giuseppe Funaro
- **Source:** Dedicated Deal Room product-definition conversation
- **Supersedes within scope:** Any model in which publishing a complete Deal requires payment, one Deal can have only one transaction workspace, all interested counterparties share one room, or the owner of the posted Deal must always pay for the room

## Context

Ponte creates liquidity by allowing members to publish structured commercial intent across Products, Trade services, and Distribution and representation. Charging merely to publish a complete commercial requirement, offer, service or distribution intention would weaken participation and liquidity.

A posted Deal may attract several credible counterparties. Those counterparties may compete, propose different commercial terms or require different supporting providers. They must not be placed in one shared workspace where they can see one another's identity, documents, negotiations or progress.

The party that decides to progress a specific bilateral or multi-party commercial path may be the owner of the posted Deal or an interested counterparty. The commercial architecture must therefore separate the owner of the posted Deal from the initiator, sponsor and administrator of an individual Deal Room.

## Decision

A complete structured Deal may be created, submitted, reviewed and published without a Deal Room fee.

“Deal” is the customer-facing description of a structured member-created commercial intention. Until a separate terminology decision changes the internal contract, it maps to the existing Member Opportunity concept and its accepted family and intent taxonomy.

A posted Deal is an upstream market object. It may remain available without any Deal Room being opened.

Each serious counterparty progression path uses its own isolated Deal Room.

One posted Deal may therefore have zero, one or many linked Deal Rooms. For example, if the Deal owner is progressing with five different counterparties, the system creates five separate counterparty rooms linked to the same parent Deal.

Each active counterparty room:

- has its own participants and roles;
- has its own admission and NDA acceptance;
- has its own entitlement and sponsor;
- has its own procedure, conditions, evidence, decisions and blockers;
- has its own progress and closure history; and
- consumes its own active-room entitlement or credit activation.

The rooms are not channels inside a shared room. They are separate permission boundaries.

## Room initiation

A Deal Room linked to a posted Deal may be proposed by:

- the Deal owner;
- an eligible interested counterparty;
- Ponte where authorised; or
- an approved institution or programme sponsor.

The initiator may invite the owner of the posted Deal into a room that the initiator sponsors. The invited Deal owner does not need to purchase a separate plan merely to participate as the sponsored guest in that room.

The following concepts remain separate:

- **Deal owner** — controls the posted Deal;
- **Room initiator** — creates the proposed counterparty room;
- **Room sponsor** — supplies the commercial entitlement;
- **Room administrator** — manages invitations and permitted room settings;
- **Principal participant** — acts as a commercial party in the transaction;
- **Payer** — pays for the entitlement where payment is used.

One person or organisation may hold several of these roles, but payment does not create commercial decision authority or access rights.

## Privacy and competition boundary

A participant in one counterparty room must not receive access to:

- the existence or identity of other counterparties;
- another room's participants;
- another room's messages, evidence or documents;
- another room's procedure, commercial terms or progress;
- another room's blockers, decisions or outcome.

The Deal owner may see a private portfolio view grouping all linked rooms. Ponte may see linked rooms only under its administrative and facilitation permissions. Counterparties see only the room or rooms in which they are admitted.

The interface must not reveal that other commercial branches exist unless the Deal owner deliberately discloses that fact or a legal or procedural requirement demands it.

## Duplicate-room rule

The system should normally permit only one active room for the same parent Deal and the same pair of principal organisations.

A second parallel room between the same principal organisations requires a recorded reason, such as a distinct product lot, territory, legal entity, procedure or commercial mandate.

## Parent Deal lifecycle

Opening or closing one linked room does not automatically close the parent Deal or any other branch.

When a room reaches a material commitment or completion outcome, Ponte should prompt the Deal owner to review:

- remaining quantity or capacity;
- geographic or exclusivity scope;
- whether the public Deal remains current;
- whether other room branches should continue;
- whether the Deal should be paused, partially allocated, fully allocated, expired or closed.

No room may silently alter the public Deal without the required owner approval and review workflow.

## Commercial consequence

The free posted Deal creates liquidity. Each active counterparty room captures value.

A subscription with five concurrent active rooms may therefore support five branches of one Deal, five unrelated Deals, or any combination. A pay-as-you-go user consumes one room activation for each branch that becomes active.

Invitations are charged or counted only when they create an admitted external guest or organisation under the accepted launch entitlement policy. Sending, correcting or resending an invitation does not itself consume a guest entitlement.

## Guardrails

- Do not charge merely to submit a complete structured Deal.
- Do not describe a free posted Deal as a free active Deal Room.
- Do not put competing counterparties into a shared room.
- Do not make the Deal owner pay when another participant has chosen to initiate and sponsor the room.
- Do not let room sponsorship transfer control of the parent Deal.
- Do not disclose parallel branches or their commercial facts across permission boundaries.
- Do not auto-close or modify the parent Deal because one branch changes state.

## Implementation boundary

This ADR records the product and commercial architecture only. It does not authorise runtime code, schema changes, migrations, payment collection, pricing, Stripe configuration, deployment or production action.

The detailed domain model, permission matrix, lifecycle, screens and entitlement implementation remain subject to the accepted product-definition and delivery process.

## Related records

- `docs/ponte-authority/PT-PRODUCT-2026-07-27-02-DEAL-TO-ROOM-BRANCHING-MODEL.md`
- `docs/ponte-authority/PT-PRODUCT-2026-07-27-01-DEAL-ROOM-PRODUCT-CONTRACT-V1.md`
- `docs/ponte-authority/PT-COMMERCIAL-2026-07-27-01-DEAL-ROOM-MONETISATION-POLICY.md`
- `docs/decisions/ADR-0003-deal-room-product-contract.md`
- `docs/decisions/ADR-0004-deal-room-monetisation-boundary.md`
- GitHub issues #51 and #52
