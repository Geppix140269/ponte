# Ponte Trade Deal Room Launch Pricing and Entitlement Model v1

- **Status:** Proposed for product-owner approval
- **Proposal date:** 27 July 2026
- **Owner:** Giuseppe Funaro
- **Repository:** `Geppix140269/ponte`
- **Purpose:** Day-one commercially implementable configuration
- **Implementation status:** Not started

## 1. Executive proposal

Ponte launches with one free upstream tier and two ways to pay for active Deal Rooms:

1. **Deal Room Portfolio subscription** — recurring capacity for organisations that manage several active transaction branches.
2. **Ponte Credits** — pay-as-you-go activation for occasional rooms, extra room capacity and extra guest organisations.

The two models use the same entitlement engine. A customer may subscribe, buy credits, or use both.

The room sponsor pays. Invited counterparties participate as sponsored guests and are not required to buy their own plan merely to enter that room.

## 2. Free Market Access

Price: **€0**

Included:

- browse public Market Signals and Member Opportunities;
- create and submit structured Deals;
- publish eligible Deals after the applicable review and publication gates;
- express structured interest;
- receive or send a proposed Deal Room invitation;
- view the proposed room purpose, participants, admission requirements and commercial entitlement;
- complete minimum registration and Business Passport requirements;
- decline a room without charge.

Not included:

- protected active-room progression;
- an active procedure;
- private evidence exchange;
- active-room decisions, blockers or milestones;
- unpriced Ponte Desk or founder work.

## 3. Deal Room Portfolio subscription

### Launch list price

- **€149 per month**, excluding applicable VAT or sales tax; or
- **€1,490 per year**, excluding applicable VAT or sales tax.

Annual billing provides twelve months for the price of ten.

### Included capacity

- **5 concurrent active counterparty Deal Rooms**;
- **20 concurrent external guest organisations** across those active rooms;
- **5 internal organisation members** with room-management access;
- unlimited proposed-room preparation, subject to anti-abuse and operational limits;
- standard platform workflow, progress, audit and AI summary capabilities;
- no human Ponte Desk entitlement unless separately purchased or included by an explicit scope.

“Concurrent” means capacity is returned when a room closes or leaves active paid progression. Five branches of one posted Deal use all five room slots.

### Additional capacity

A subscriber may use Ponte Credits for:

- an additional active room slot: **20 credits per 30 days**;
- an additional external guest organisation: **5 credits for that room**;
- future separately approved agent, evidence, specialist or Ponte Desk add-ons.

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

## 5. Pay-as-you-go room costs

### Counterparty room activation

- **60 credits** activates one counterparty Deal Room for **90 days**.

### Extension

- **20 credits** extends an active credit-funded room for **30 days**.

### Guest organisations

- **5 credits** admits one external guest organisation into one room for the room's current paid term.
- A guest-organisation entitlement includes up to **3 named participants** from that organisation.
- Additional people from the same guest organisation may be permitted by policy without another organisation charge; the launch implementation should prevent obvious abuse rather than introduce per-person friction.

The sponsor's own organisation and up to five authorised internal participants do not consume external guest entitlements.

## 6. What counts as a guest charge

Ponte charges or counts an **admitted external guest organisation**, not an invitation email.

The following do not consume credits or subscription guest capacity:

- sending an invitation;
- correcting an email address;
- resending an invitation;
- an invitation that is declined;
- an invitation that expires before admission;
- a person who cannot satisfy the admission requirements.

The guest entitlement is consumed only when the external organisation's first authorised participant completes admission and enters protected room progression.

This preserves the owner's concept of included invitations while avoiding punitive charges for failed or corrected invitations.

## 7. Room opening and payment sequence

The day-one sequence is:

```text
Complete or select the parent Deal
  -> choose the counterparty branch
  -> build the proposed room
  -> select subscription capacity or credits
  -> reserve the room entitlement
  -> send the principal invitation
  -> invited principal accepts admission terms
  -> consume the room entitlement
  -> activate protected Deal Room progression
```

### Reservation rule

When the sponsor selects “Open this Deal Room”:

- a subscription room slot or 60-credit activation is reserved;
- the proposed room and invitation are created;
- the entitlement is not finally consumed until the minimum required external principal participant accepts.

### Release rule

The reservation is released automatically when:

- the required principal participant declines;
- the sponsor cancels before activation;
- the invitation expires without admission after 14 days; or
- Ponte rejects the room before protected progression for a policy or eligibility reason.

The sponsor may correct and resend the proposed invitation during the reservation period.

### Post-activation rule

After activation, room and guest charges are non-refundable merely because the parties later pause, withdraw, reject or fail to complete the transaction. Ponte has supplied the paid controlled-progression environment.

A service failure attributable to Ponte may create a restoration or credit decision under the applicable refund policy.

## 8. Inbound and outbound room sponsorship

### Deal owner opens the room

The Deal owner uses a subscription slot or credits, opens one branch for a chosen counterparty and invites that party as a sponsored guest.

### Interested counterparty opens the room

A participant viewing another member's Deal may choose “Open a Deal Room with this business.” The interested participant supplies the entitlement and invites the Deal owner as a sponsored guest.

The Deal owner may accept without buying a plan. The Deal owner retains control of the parent Deal; the room sponsor controls only the room-administration permissions granted by the room contract.

## 9. Multiple branches

Each counterparty branch is priced as its own active room.

Examples:

- one Deal progressed with five counterparties uses five subscription room slots;
- a credit user pays 60 credits for each branch that activates;
- an interested counterparty that sponsors its own branch bears that branch's room and guest entitlement;
- closing one branch returns a subscription slot but does not close the parent Deal or another branch.

No party is charged for branches it did not sponsor or explicitly agree to fund.

## 10. Subscription lapse and capacity changes

When a subscription payment fails or the subscription ends:

1. a **14-day grace period** begins;
2. existing rooms remain accessible, but the customer cannot activate new rooms beyond valid capacity;
3. after the grace period, unsubsidised rooms become read-only unless covered by credits or another entitlement;
4. no room history, evidence or audit record is deleted merely because payment lapses;
5. participants may resume progression after entitlement is restored.

If a customer downgrades below current active capacity, the customer must choose which rooms remain active before the next billing period. The system must not silently close a commercial branch.

## 11. Upgrades and mixed use

- A credit customer may start a subscription at any time.
- Active credit-funded rooms remain valid for their purchased term and do not consume subscription slots until the customer explicitly moves them into subscription capacity.
- A subscriber may use credits for temporary overflow rooms and guest organisations.
- Credits do not automatically renew.
- Subscriptions do not silently purchase credits.

## 12. Human and specialist services

The base subscription and room activation pay for the controlled Deal Room product, not open-ended human work.

The following require a separately accepted scope and entitlement:

- Ponte-facilitated procedure;
- Ponte-managed room;
- founder or Ponte Desk investigation;
- specialist inspection, logistics, compliance, legal, finance or other professional support;
- custom reporting or evidence work;
- transaction, referral, completion or success-fee arrangements.

Those services should attach to a proposed or active room but are not included in the base launch price.

## 13. Price and product guardrails

- The room sponsor covers invited guests; do not require every counterparty to subscribe.
- Do not charge for invitation attempts; count admission.
- Do not charge to publish a complete eligible Deal.
- Do not offer unlimited active rooms or unlimited human assistance in the launch subscription.
- Do not describe a paid room as more verified, safer or more likely to close.
- Do not hide room duration, guest capacity, renewal or expiry.
- Do not delete room history when entitlement ends.
- Do not allow a payer to purchase another participant's decision authority or private evidence.

## 14. Commercial rationale

The model balances three objectives:

- free structured Deal posting supports market liquidity;
- a subscription rewards organisations with several recurring transaction branches;
- credits give occasional users a clear low-commitment route into one room and provide a common unit for overflow capacity and future add-ons.

The pricing unit follows the value-bearing object—the active counterparty room—rather than charging for messages, pages or raw storage.

## 15. Metrics required from day one

Track at minimum:

- complete Deals submitted and published;
- proposed rooms per Deal;
- room sponsor type;
- invitation acceptance and decline;
- reserved versus consumed entitlements;
- rooms activated by subscription and credits;
- active-room concurrency;
- guest organisations admitted;
- time from room proposal to activation;
- room duration and extension;
- room stage and closure outcome;
- credits sold, reserved, released and consumed;
- subscription utilisation and churn;
- Ponte Desk or specialist attachment;
- revenue per activated room;
- contribution margin by fulfilment mode.

## 16. Configurability

The subscription/credit architecture, sponsored-guest principle, room-capacity unit and reservation/activation sequence are product authority.

Exact prices, pack sizes and promotional discounts are launch commercial configuration. After initial approval, the owner may adjust those numerical values without a new ADR, provided the change is recorded in the pricing authority, customer terms and Current State and does not silently change the underlying entitlement model.

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
