# ADR-0005 — Free structured Deals, paid master Deal Rooms and private sub-rooms

> ## ⚠ Partly superseded by ADR-0020 — 31 July 2026
>
> **Almost all of this ADR stands, and the branching hierarchy it defines is the
> foundation the new pricing model is built on.** Free structured Deals, the
> master-room/sub-room hierarchy, the role separation, the sponsored-guest
> principle, the privacy and competition boundary, the duplicate-master-room rule
> and the parent-Deal lifecycle are all unchanged and binding.
>
> **One rule is superseded:** *"Private sub-rooms do **not** consume additional
> master Deal Room slots"*, and the Commercial-consequence section built on it.
> Under ADR-0020 a Master Deal Room includes **five** concurrently active private
> **principal-counterparty** Deal Branches, and each further concurrent branch
> costs **$15 USD** for the current room period, capped at **$199 USD** per room
> per 30-day period. **Provider, adviser and internal workspaces remain unlimited
> and carry no charge**, so the old rule survives intact for them.
>
> Also superseded: the subscription-slot and credit framing throughout
> (five subscription slots, credit-funded activation, guest-organisation charges).
> A room period is bought directly, in **USD**, for 30 days, at **$79 USD**.
>
> The privacy boundary now has a commercial edge: **a billing total must never
> reveal branch count** to a participant not authorised to see the branch
> structure. See `docs/decisions/ADR-0020-deal-room-only-pricing-authority.md`.

- **Status:** **Partly superseded on 31 July 2026** by ADR-0020 / `PT-COMMERCIAL-2026-07-31-01`. Originally accepted by the product owner; effective when merged
- **Decision date:** 27 July 2026
- **Owner:** Giuseppe Funaro
- **Source:** Dedicated Deal Room product-definition conversation
- **Supersedes within scope:** Any model in which publishing a complete Deal requires payment, each counterparty branch consumes a separate Deal Room slot, all counterparties share one negotiation space, or the owner of the posted Deal must always pay for progression

## Context

Ponte creates liquidity by allowing members to publish disciplined commercial intent across Products, Trade services, and Distribution and representation. Charging merely to publish a complete requirement, offer, service or distribution intention would weaken participation and liquidity.

The paid value-bearing object is not an individual message thread or counterparty branch. It is the master Deal Room created around one defined commercial Deal. A business may use that master room to progress the same Deal with several counterparties and supporting providers through separate private sub-rooms.

For example, a seller offering a defined sugar quantity from Brazil may buy one master Deal Room for that Deal and create private sub-rooms for several potential buyers, an inspection company, a logistics provider or other authorised participants. Those participants must not see one another's negotiations or evidence unless deliberately admitted to the same sub-room.

## Decision

A complete structured Deal may be created, submitted, reviewed and published without a Deal Room fee.

“Deal” is the customer-facing description of a structured member-created commercial intention. Until a later terminology decision changes the internal contract, it maps to the existing Member Opportunity concept and its accepted family and intent taxonomy.

A posted Deal is an upstream market object. It may remain available without a Deal Room.

When a participant chooses to progress that Deal, the participant opens and commercially sponsors a **master Deal Room** linked to the Deal.

One paid master Deal Room:

- corresponds to one defined Deal scope;
- consumes one active Deal Room entitlement or subscription slot;
- holds the canonical room overview, sponsor, shared procedure framework, entitlements and owner-side portfolio view;
- may contain any number of private sub-rooms related to that Deal, subject to plan, guest-entitlement, security and anti-abuse rules; and
- remains the parent audit and lifecycle object for all of its sub-rooms.

Private sub-rooms do **not** consume additional master Deal Room slots.

## Sub-room model

A sub-room is a permission-isolated workspace beneath the master Deal Room. It may represent:

- one counterparty negotiation;
- one service-provider engagement;
- one adviser or specialist workstream;
- one internal decision workstream; or
- another authorised participant group directly related to the master Deal.

Each sub-room may have its own:

- participants and roles;
- admission and NDA acceptance;
- visibility boundary;
- discussion and clarification record;
- evidence and documents;
- proposed or agreed commercial terms;
- tasks, conditions and blockers;
- branch progress and outcome.

The master Deal Room may show the sponsor an aggregate private portfolio view, but external participants see only the sub-room or sub-rooms to which they are admitted.

## Master-room initiation

A master Deal Room linked to a posted Deal may be opened and sponsored by:

- the Deal owner;
- an eligible interested counterparty;
- Ponte where authorised; or
- an approved institution or programme sponsor.

An interested participant may therefore open a paid master Deal Room around another member's posted Deal and invite that Deal owner into a private sub-room. The invited Deal owner does not need to purchase a separate plan merely to participate as the sponsored guest.

If the Deal owner has already opened a master Deal Room for the Deal, an interested participant may be invited into a new private sub-room under that master room. A separate master room is not required merely because a new counterparty joins.

The following concepts remain separate:

- **Deal owner** — controls the posted Deal;
- **Master-room initiator** — creates the proposed master Deal Room;
- **Master-room sponsor** — supplies the commercial entitlement;
- **Master-room administrator** — manages permitted master-room settings and sub-room creation;
- **Sub-room administrator** — manages one sub-room within granted permissions;
- **Principal participant** — acts as a commercial party;
- **Supporting participant** — provides an authorised service or advice;
- **Payer** — funds the entitlement where payment is used.

One person or organisation may hold several roles, but payment does not create ownership of another participant's Deal, commercial decision authority or access rights.

## Privacy and competition boundary

A participant in one private sub-room must not receive access to:

- the existence or identity of other counterparties or sub-rooms;
- another sub-room's participants;
- another sub-room's messages, evidence or documents;
- another sub-room's procedure, commercial terms or progress;
- another sub-room's blockers, decisions or outcome.

The master-room sponsor and authorised internal team may see the private sub-room portfolio. Ponte may see linkages only under its operational and facilitation permissions.

The interface must not reveal that competing branches exist unless the Deal owner or authorised sponsor deliberately discloses that fact and the disclosure is lawful and appropriate.

## Duplicate master-room rule

The default is one active master Deal Room per Deal and sponsoring organisation.

A second master Deal Room for the same Deal and sponsor requires a recorded reason, such as:

- a materially different product lot;
- a different territory or exclusivity scope;
- a different legal entity;
- a different distribution mandate;
- a separate procurement process; or
- a distinct legal or compliance procedure.

Independent counterparties may sponsor their own master Deal Rooms around a posted Deal when they do not participate in the Deal owner's existing master room. Those rooms remain separate commercial and permission objects.

## Parent Deal lifecycle

Opening or closing a master room or sub-room does not automatically close or modify the posted Deal.

When a branch reaches a material commitment or completion outcome, Ponte should prompt the Deal owner to review:

- remaining quantity or capacity;
- geographic or exclusivity scope;
- whether the public Deal remains current;
- whether other sub-rooms should continue;
- whether the Deal should be paused, partially allocated, fully allocated, expired or closed.

No room may silently alter the public Deal without the required owner approval and review workflow.

## Commercial consequence

The free structured Deal creates liquidity. The paid master Deal Room captures value.

A subscription with five concurrent active Deal Rooms therefore supports five master Deals. Each master Deal Room may contain any number of private sub-rooms related to that Deal without consuming additional master-room slots.

Pay-as-you-go credits are charged for master-room activation and may also be charged for admitted external guest organisations, premium capabilities or assisted services. Merely creating another private sub-room under an entitled master Deal Room does not consume another master-room activation.

Invitations are charged or counted only when they create an admitted external guest organisation under the accepted launch entitlement policy. Sending, correcting or resending an invitation does not itself consume a guest entitlement.

## Guardrails

- Do not charge merely to submit a complete structured Deal.
- Do not describe a free posted Deal as a free active Deal Room.
- Do not charge another master-room slot for each private counterparty sub-room.
- Do not put competing counterparties into a shared negotiation space.
- Do not make the Deal owner pay when another participant has chosen to initiate and sponsor a master room.
- Do not let room sponsorship transfer control of the posted Deal.
- Do not disclose parallel sub-rooms or their commercial facts across permission boundaries.
- Do not auto-close or modify the posted Deal because one sub-room changes state.

## Implementation boundary

This ADR records the product and commercial architecture only. It does not authorise runtime code, schema changes, migrations, payment collection, exact pricing, Stripe configuration, deployment or production action.

The detailed domain model, permission matrix, lifecycle, screens and entitlement implementation remain subject to the accepted product-definition and delivery process.

## Related records

- `docs/ponte-authority/PT-PRODUCT-2026-07-27-02-DEAL-TO-ROOM-BRANCHING-MODEL.md`
- `docs/ponte-authority/PT-PRODUCT-2026-07-27-01-DEAL-ROOM-PRODUCT-CONTRACT-V1.md`
- `docs/ponte-authority/PT-COMMERCIAL-2026-07-27-01-DEAL-ROOM-MONETISATION-POLICY.md`
- `docs/decisions/ADR-0003-deal-room-product-contract.md`
- `docs/decisions/ADR-0004-deal-room-monetisation-boundary.md`
- GitHub issues #51 and #52
