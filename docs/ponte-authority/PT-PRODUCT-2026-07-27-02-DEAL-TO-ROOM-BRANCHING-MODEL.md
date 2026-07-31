# Ponte Trade Deal-to-Room and Sub-Room Model

> ## Commercially amended by ADR-0020 — 31 July 2026. The hierarchy stands.
>
> **This authority is not superseded.** The Deal-to-Room hierarchy it defines —
> one commercial opportunity, one Master Deal Room, several isolated private
> negotiations beneath it — is the foundation the new pricing model is built on,
> and sections 1 to 3, 5 to 9 and 11 are unchanged and binding. The sub-room
> privacy boundary in §7 is, if anything, strengthened: **a billing amount must
> never reveal branch count** to a participant not authorised to see the branch
> structure.
>
> **What changes is the price, in §4 and §10 only.** `PT-COMMERCIAL-2026-07-31-01`
> sets **$79 USD for 30 active days**, including **five concurrently active
> private principal-counterparty Deal Branches**; each further concurrent branch
> costs **$15 USD** for the current room period, capped at **$199 USD** per
> Master Deal Room per 30-day period. **USD only.**
>
> So the rule that "creating an additional sub-room does not consume another
> master Deal Room slot" (§4) survives **completely for provider, adviser and
> internal workspaces**, which remain unlimited and free, and is narrowed only
> for principal-counterparty branches beyond the fifth concurrent one. The
> subscription-slot, credit and guest-organisation framing in §10 is retired
> entirely: there is no subscription, no credit and no guest-organisation charge.
>
> See `docs/decisions/ADR-0020-deal-room-only-pricing-authority.md`.

- **Status:** Accepted by the product owner; effective when merged. **Commercially amended 31 July 2026** by `PT-COMMERCIAL-2026-07-31-01` / ADR-0020 (§4 and §10 pricing only)
- **Decision date:** 27 July 2026
- **Owner:** Giuseppe Funaro
- **Repository:** `Geppix140269/ponte`
- **Implementation status:** Not started

## 1. Core hierarchy

Ponte separates the free upstream commercial object from the paid transaction environment.

```text
Structured Deal
  -> zero or more independently sponsored master Deal Rooms
       -> zero or more private sub-rooms within each master room
```

A structured Deal is a member-created requirement, offer, trade-service intention, distribution intention or representation intention. It may be published and remain available without payment for a Deal Room.

A master Deal Room begins when a participant chooses to pay for and progress that defined Deal. The master Deal Room is the commercial entitlement unit.

Sub-rooms organise the different participant discussions, counterparty negotiations and specialist workstreams underneath the same Deal. They are not separately charged as master Deal Rooms.

## 2. Free Deal posting

Creating and publishing a complete structured Deal is part of Ponte's liquidity layer and does not require a Deal Room entitlement.

Free does not mean unstructured or automatically published. The Deal must still satisfy the applicable product discipline:

- one accepted market family;
- one family-valid intent;
- all mandatory commercial facts for that family and intent;
- correct public/private separation;
- truthful evidence and limitations;
- member identity and submission requirements;
- review, publication, expiry and reconfirmation rules;
- no fabricated facts or unsupported trust claims.

Physical-product Deals may require HS classification where appropriate. Trade services and Distribution and representation use their own accepted taxonomies and must not be forced through an HS-product flow.

Operational anti-abuse, quality and publication limits may apply, but Ponte does not charge a Deal Room fee merely to publish an eligible Deal.

## 3. Master Deal Room

One paid master Deal Room corresponds to one defined Deal scope.

It contains:

- the canonical Deal snapshot and current Deal version;
- the master-room sponsor and entitlement;
- the authorised internal team;
- the master procedure framework and reusable requirements;
- the private portfolio of sub-rooms;
- aggregate progress and capacity information visible only to authorised users;
- the audit history connecting the sub-rooms to the Deal.

One active master Deal Room consumes one subscription slot or one credit-funded room activation.

A subscription with five concurrent Deal Rooms therefore means five concurrent master Deal Rooms—not five counterparty conversations.

## 4. Private sub-rooms

A master Deal Room may contain any number of private sub-rooms related to the Deal, subject to guest entitlements, permissions, security, anti-abuse and reasonable operational limits.

A sub-room may represent:

- a negotiation with one buyer, seller, service provider, distributor, agent or representative;
- a workstream with an inspection, logistics, customs, compliance, legal, finance or insurance provider;
- an internal commercial or approval workstream;
- another authorised participant group directly related to the Deal.

Each sub-room may have its own:

- reference and purpose;
- participants and roles;
- admission and NDA acceptance;
- visibility boundary;
- discussion, questions and clarification record;
- documents and evidence;
- commercial terms;
- tasks, conditions and blockers;
- branch progress and outcome.

Creating an additional sub-room does not consume another master Deal Room slot.

## 5. Who may open the master room

The Deal owner may buy or allocate a master Deal Room around their Deal and invite counterparties into private sub-rooms.

An eligible interested participant may also open and sponsor a master Deal Room around another member's posted Deal and invite the Deal owner into a private sub-room.

The party that pays for the room does not acquire ownership of the posted Deal or unilateral authority over another participant.

The roles remain distinct:

| Role | Meaning |
|---|---|
| Deal owner | Controls and updates the posted Deal |
| Master-room initiator | Creates the proposed master Deal Room |
| Master-room sponsor | Supplies the subscription slot, credits or other entitlement |
| Master-room administrator | Manages permitted master-room settings and creates sub-rooms |
| Sub-room administrator | Manages one sub-room within granted permissions |
| Principal participant | Acts as a commercial party |
| Supporting participant | Provides an authorised service or advice |
| Payer | Funds the entitlement where payment is used |

## 6. Sponsored guest principle

The master-room sponsor covers invited external participants through the plan's included guest allowance or credits.

An invited counterparty may participate as a sponsored guest without purchasing a subscription or credits merely to enter that sub-room.

Every guest must still:

- authenticate;
- satisfy the Deal Room-ready Business Passport threshold;
- declare organisation, role and authority;
- accept the Participation Agreement, NDA and sub-room rules;
- comply with the same permission and conduct requirements.

Sponsored access removes payment friction. It does not weaken admission, confidentiality or authority requirements.

## 7. Sub-room privacy

Sub-rooms are isolated permission boundaries.

A participant in one sub-room may not inspect or infer another sub-room's:

- existence;
- participants;
- proposed or agreed commercial terms;
- documents or evidence;
- procedure or progress;
- blockers or decisions;
- outcome.

The master-room sponsor and authorised internal team may see the private sub-room portfolio. Ponte sees linkages only where its operational role and permissions permit it.

No interface should disclose that competing counterparties or parallel negotiations exist unless an authorised participant deliberately makes that disclosure and it is lawful and appropriate.

## 8. Duplicate master rooms

The default is one active master Deal Room per posted Deal and sponsoring organisation.

A second master Deal Room for the same Deal and sponsor requires a materially distinct scope, such as:

- a different product lot;
- a different territory or exclusivity arrangement;
- a different legal entity;
- a different distribution mandate;
- a separate procurement process;
- a distinct legal or compliance procedure.

Independent participants may sponsor separate master Deal Rooms around the same posted Deal when they are not operating inside the Deal owner's existing master room. Those master rooms remain completely separate permission and commercial objects.

## 9. Relationship to the posted Deal

A master room is linked to a snapshot and current version of the posted Deal, but neither the master room nor a sub-room silently rewrites the public Deal.

When a sub-room reaches a material commitment or outcome, Ponte should request an explicit Deal review where relevant, including:

- remaining quantity or capacity;
- territories and exclusivity;
- timing and expiry;
- whether the Deal remains open;
- whether other sub-rooms should continue.

The posted Deal may later support states such as open, partially allocated, paused, fully allocated, expired, withdrawn or closed. The detailed lifecycle remains part of the later product-definition authority.

## 10. Commercial counting rule

The commercial unit is the active master Deal Room.

Therefore:

- five active master Deal Rooms use five subscription slots;
- one master room may contain any number of related private sub-rooms without using additional master-room slots;
- a credit user pays for master-room activation, not each sub-room;
- admitted external guest organisations may consume included guest allowance or credits;
- proposed rooms do not consume final entitlement until the approved activation event;
- declined, cancelled or expired pre-activation proposals release reserved entitlement under the launch policy.

## 11. Product success test

The model succeeds when:

- a member can publish a complete Deal without paying for a room;
- a participant can buy one master Deal Room around that Deal;
- the room can support several isolated counterparty and provider sub-rooms;
- invited participants can join as sponsored guests;
- no participant learns about another private sub-room;
- five subscription slots genuinely mean five concurrent Deals, not five conversations.

## 12. Implementation boundary

This authority defines product behaviour only. It does not authorise screen design, database design, migrations, payment collection, exact pricing, Stripe, runtime implementation, deployment or production action.

## 13. Related records

- `docs/decisions/ADR-0005-free-deals-and-counterparty-room-branches.md`
- `docs/ponte-authority/PT-PRODUCT-2026-07-27-01-DEAL-ROOM-PRODUCT-CONTRACT-V1.md`
- `docs/ponte-authority/PT-COMMERCIAL-2026-07-27-01-DEAL-ROOM-MONETISATION-POLICY.md`
- GitHub issues #51 and #52
