# Ponte Trade Deal Room Launch Pricing and Entitlement Model v1

> ## ⚠ Superseded — 31 July 2026. Never approved.
>
> This document was **never accepted**. It was a proposal, and the owner has now
> decided a different model: the **Deal Room-Only Pricing Authority**
> (`PT-COMMERCIAL-2026-07-31-01`, recorded by **ADR-0020**).
>
> **Every number in this file is superseded**, including the €149/month and
> €1,490/year Portfolio subscription (§3), the €100–€400 Ponte Credit packs (§4),
> the 60-credit 90-day master-room activation and 20-credit extension (§5), the
> 5-credit guest-organisation charge (§5, §6), and the euro denomination
> throughout.
>
> Ponte's only paid product is the Deal Room, at **$79 USD for 30 active days**,
> including five concurrently active private principal-counterparty Deal
> Branches, **$15 USD** per additional concurrent branch, capped at **$199 USD**
> per Master Deal Room per 30-day period, in **USD only**. There are no
> subscriptions, plans, credits or credit-funded rooms.
>
> The **sponsored-guest principle** (§1, §8, §13) survives: an invited
> counterparty never buys anything to participate. So does the rule that an
> invitation is free until admission (§6).
>
> Preserved as the historical record. Do not implement from it. See
> `docs/decisions/ADR-0020-deal-room-only-pricing-authority.md`.

- **Status:** **Superseded on 31 July 2026** by `PT-COMMERCIAL-2026-07-31-01` / ADR-0020, having never been approved. Originally proposed for product-owner approval
- **Proposal date:** 27 July 2026
- **Owner:** Giuseppe Funaro
- **Repository:** `Geppix140269/ponte`
- **Purpose:** Day-one commercially implementable configuration
- **Implementation status:** Not started

## 1. Executive proposal

Ponte launches with one free upstream tier and two ways to pay for master Deal Rooms:

1. **Deal Room Portfolio subscription** — recurring capacity for organisations managing several active Deals.
2. **Ponte Credits** — pay-as-you-go activation for occasional master rooms, temporary overflow capacity and additional external guest organisations.

The two models use the same entitlement engine. A customer may subscribe, buy credits, or use both.

The commercial unit is the **active master Deal Room**, not each counterparty conversation. One master room is linked to one defined Deal and may contain any number of related private sub-rooms.

The master-room sponsor pays. Invited counterparties and providers participate as sponsored guests and are not required to buy their own plan merely to enter an authorised sub-room.

## 2. Free Market Access

Price: **€0**

Included:

- browse public Market Signals and Member Opportunities;
- create and submit disciplined structured Deals;
- publish eligible Deals after the applicable review and publication gates;
- leave a published Deal available without opening a Deal Room;
- express structured interest;
- receive or send a proposed master Deal Room invitation;
- view the proposed room purpose, sponsor, admission requirements and commercial entitlement;
- complete minimum registration and Business Passport requirements;
- decline a room without charge.

Not included:

- protected active master-room progression;
- private counterparty or provider sub-rooms;
- active procedures, evidence exchange, decisions, blockers or milestones;
- unpriced Ponte Desk, founder or specialist work.

## 3. Deal Room Portfolio subscription

### Launch list price

- **€149 per month**, excluding applicable VAT or sales tax; or
- **€1,490 per year**, excluding applicable VAT or sales tax.

Annual billing provides twelve months for the price of ten.

### Included capacity

- **5 concurrent active master Deal Rooms**;
- **unlimited private sub-rooms** under each active master Deal Room, provided every sub-room is directly related to that Deal and remains within fair-use, security and anti-abuse rules;
- **25 concurrent external guest organisations** across the subscriber's active master rooms;
- up to **3 named participants per external guest organisation** as the standard included organisational admission;
- **5 internal organisation members** with master-room management access;
- unlimited proposed-room preparation, subject to anti-abuse and operational limits;
- standard platform workflow, progress, audit and AI summary capabilities;
- no human Ponte Desk entitlement unless separately purchased or included by an explicit scope.

“Concurrent master Deal Rooms” means capacity is returned when a master room closes or leaves active paid progression. Five subscription slots mean five active Deals. Twenty private counterparty sub-rooms beneath one master Deal Room still consume only one master-room slot.

“Concurrent external guest organisations” means capacity is returned when an organisation is removed from active protected participation or the relevant master room closes.

### Additional capacity

A subscriber may use Ponte Credits for:

- an additional active master Deal Room: **20 credits per 30 days**;
- an additional external guest organisation beyond the included capacity: **5 credits for that master room's current paid term**;
- future separately approved agent, evidence, specialist or Ponte Desk add-ons.

Creating another private sub-room does not consume credits by itself.

## 4. Ponte Credits

Credits may be purchased without a subscription.

### Launch credit packs

| Pack | Price excluding tax | Effective price per credit |
|---|---:|---:|
| 100 credits | €100 | €1.00 |
| 250 credits | €225 | €0.90 |
| 500 credits | €400 | €0.80 |

Credits are consumed oldest first and expire 24 months after purchase unless applicable law or an explicit commercial agreement requires a longer period.

Credits are not a cryptocurrency, stored-value payment instrument or transferable asset. They are a prepaid contractual entitlement to defined Ponte services.

## 5. Pay-as-you-go master-room costs

### Master Deal Room activation

- **60 credits** activates one master Deal Room for **90 days**.
- Activation includes unlimited related private sub-rooms.
- Activation includes the sponsor organisation and the first **2 external guest organisations**.

### Extension

- **20 credits** extends an active credit-funded master Deal Room for **30 days**.

### Additional external guest organisations

- **5 credits** admits one additional external guest organisation into one master Deal Room for the room's current paid term.
- One guest-organisation entitlement includes up to **3 named participants** from that organisation.
- Additional people from the same guest organisation may be permitted by policy without another organisation charge; the launch implementation should prevent obvious abuse rather than introduce per-person friction.

The sponsor's own organisation and up to five authorised internal participants do not consume external guest entitlements.

## 6. What counts as a guest charge

Ponte charges or counts an **admitted external guest organisation**, not an invitation email and not the creation of a sub-room.

The following do not consume credits or subscription guest capacity:

- creating a draft sub-room;
- sending an invitation;
- correcting an email address;
- resending an invitation;
- an invitation that is declined;
- an invitation that expires before admission;
- a person who cannot satisfy the admission requirements.

The guest entitlement is consumed only when the external organisation's first authorised participant completes admission and enters protected sub-room progression.

This preserves frictionless invitations while ensuring that real external participation is part of the paid entitlement.

## 7. Master-room opening and payment sequence

The day-one sequence is:

```text
Complete or select the structured Deal
  -> choose Open a Deal Room
  -> create the master-room outline
  -> select subscription capacity or credits
  -> reserve the master-room entitlement
  -> create one or more private sub-rooms
  -> invite the required principal participant
  -> invited principal accepts admission terms
  -> consume the master-room entitlement
  -> activate protected master-room and sub-room progression
```

### Reservation rule

When the sponsor selects “Open this Deal Room”:

- a subscription master-room slot or 60-credit activation is reserved;
- the proposed master room and initial sub-room may be prepared;
- invitations may be sent;
- the entitlement is not finally consumed until the minimum required external principal participant accepts.

### Release rule

The reservation is released automatically when:

- the required principal participant declines;
- the sponsor cancels before activation;
- the invitation expires without admission after 14 days; or
- Ponte rejects the room before protected progression for a policy or eligibility reason.

The sponsor may correct and resend invitations during the reservation period.

### Post-activation rule

After activation, room and guest charges are non-refundable merely because the parties later pause, withdraw, reject or fail to complete the transaction. Ponte has supplied the paid controlled-progression environment.

A service failure attributable to Ponte may create a restoration or credit decision under the applicable refund policy.

## 8. Deal owner and interested-party sponsorship

### Deal owner opens the master room

The Deal owner uses a subscription slot or credits, opens one master Deal Room around the Deal and creates private sub-rooms for selected counterparties and providers.

### Interested counterparty opens the master room

A participant viewing another member's Deal may choose “Open a Deal Room for this Deal.” The interested participant supplies the entitlement, becomes the master-room sponsor and invites the Deal owner into a private sub-room.

The Deal owner may accept without buying a plan. The Deal owner retains control of the posted Deal; the sponsor controls only the master-room and sub-room administration permissions granted by the room contract.

If the Deal owner already has an active master Deal Room and chooses to admit the interested participant there, the participant may instead join a new private sub-room under that existing master room. A second master-room activation is not required merely because a new counterparty is added.

## 9. Multiple sub-rooms

Sub-rooms are included under the master-room entitlement.

Examples:

- one sugar Deal progressed with twenty prospective buyers uses one master Deal Room slot and twenty isolated private buyer sub-rooms;
- the same master room may also contain separate inspection, logistics and internal-approval sub-rooms;
- the subscriber pays no additional master-room fee for those sub-rooms;
- admitted external organisations count against the included guest capacity or consume guest credits;
- closing one sub-room does not return the master-room slot or close another sub-room;
- closing the master room returns the subscription slot and makes its sub-rooms read-only under the retention policy.

No external participant sees another private sub-room unless deliberately admitted.

## 10. Subscription lapse and capacity changes

When a subscription payment fails or the subscription ends:

1. a **14-day grace period** begins;
2. existing master rooms and sub-rooms remain accessible, but the customer cannot activate new master rooms beyond valid capacity;
3. after the grace period, unsubsidised master rooms and their sub-rooms become read-only unless covered by credits or another entitlement;
4. no room history, evidence or audit record is deleted merely because payment lapses;
5. participants may resume progression after entitlement is restored.

If a customer downgrades below current master-room capacity, the customer must choose which master rooms remain active before the next billing period. The system must not silently close a commercial Deal or sub-room.

## 11. Upgrades and mixed use

- A credit customer may start a subscription at any time.
- Active credit-funded master rooms remain valid for their purchased term and do not consume subscription slots until the customer explicitly moves them into subscription capacity.
- A subscriber may use credits for temporary overflow master rooms and additional guest organisations.
- Credits do not automatically renew.
- Subscriptions do not silently purchase credits.

## 12. Human and specialist services

The base subscription and master-room activation pay for the controlled Deal Room product, not open-ended human work.

The following require a separately accepted scope and entitlement:

- Ponte-facilitated procedure;
- Ponte-managed master room or sub-room;
- founder or Ponte Desk investigation;
- specialist inspection, logistics, compliance, legal, finance or other professional support;
- custom reporting or evidence work;
- transaction, referral, completion or success-fee arrangements.

Those services should attach to a proposed or active master room or a specific sub-room but are not included in the base launch price.

## 13. Price and product guardrails

- The master-room sponsor covers invited guests; do not require every counterparty to subscribe.
- Do not charge for invitation attempts; count admitted external organisations.
- Do not charge to publish a complete eligible Deal.
- Do not charge another master-room activation merely because a new sub-room is created.
- Do not offer unlimited active master Deal Rooms or unlimited human assistance in the launch subscription.
- Do not describe a paid room as more verified, safer or more likely to close.
- Do not hide master-room duration, guest capacity, renewal or expiry.
- Do not delete room history when entitlement ends.
- Do not allow a payer to purchase another participant's decision authority or private evidence.

## 14. Commercial rationale

The model balances three objectives:

- free structured Deal posting supports market liquidity;
- the subscription rewards organisations managing several concurrent Deals;
- unlimited related sub-rooms make each paid master Deal Room genuinely useful for multi-party international trade;
- guest allowances and credits monetise real external participation without charging every invited counterparty;
- credits give occasional users a low-commitment route into one master room and provide a common unit for overflow capacity and future add-ons.

The pricing unit follows the value-bearing object—the active Deal—not the number of messages or negotiation threads.

## 15. Metrics required from day one

Track at minimum:

- complete Deals submitted and published;
- proposed and active master Deal Rooms per Deal;
- master-room sponsor type;
- sub-rooms created per master room;
- external guest organisations invited and admitted;
- invitation acceptance and decline;
- reserved versus consumed entitlements;
- master rooms activated by subscription and credits;
- active master-room concurrency;
- guest-capacity utilisation;
- time from master-room proposal to activation;
- room duration and extension;
- master-room and sub-room stage and closure outcome;
- credits sold, reserved, released and consumed;
- subscription utilisation and churn;
- Ponte Desk or specialist attachment;
- revenue per active master Deal Room;
- contribution margin by fulfilment mode.

## 16. Configurability

The subscription/credit architecture, sponsored-guest principle, master-room capacity unit, unlimited related sub-room rule and reservation/activation sequence are product authority once approved.

Exact prices, pack sizes, included guest numbers and promotional discounts are launch commercial configuration. After initial approval, the owner may adjust those numerical values without a new ADR, provided the change is recorded in the pricing authority, customer terms and Current State and does not silently change the underlying entitlement model.

## 17. Approval and implementation boundary

Approval of this document makes it the launch commercial source of truth. It does not by itself authorise production charging.

Implementation still requires:

- entitlement and lifecycle design;
- Stripe and webhook replay-safety design;
- invoices, VAT/sales-tax and legal-entity confirmation;
- customer terms and refund policy;
- screen and copy approval;
- schema and migration approval;
- test and rollout plan;
- explicit owner approval for production activation.

## 18. Related records

- `docs/ponte-authority/PT-COMMERCIAL-2026-07-27-01-DEAL-ROOM-MONETISATION-POLICY.md`
- `docs/ponte-authority/PT-PRODUCT-2026-07-27-02-DEAL-TO-ROOM-BRANCHING-MODEL.md`
- `docs/decisions/ADR-0004-deal-room-monetisation-boundary.md`
- `docs/decisions/ADR-0005-free-deals-and-counterparty-room-branches.md`
- GitHub issues #51 and #52
