# Ponte Trade Deal Room Monetisation Policy

> ## ⚠ Superseded within its commercial scope — 31 July 2026
>
> The **Deal Room-Only Pricing Authority** (`PT-COMMERCIAL-2026-07-31-01`,
> recorded by **ADR-0020**) replaces this document's commercial rules.
>
> **What this document still governs:** the principle that the upstream market is
> free and the master Deal Room is where Ponte captures value; that payment
> confers no commercial, disclosure or decision authority; that a lapsed
> entitlement never deletes history; and that a paid room may contain private
> sub-rooms without a second master-room charge — for provider, adviser and
> internal workspaces.
>
> **What is superseded:** the Starter Deal Room exception (§2, §4, §7, §9, §10);
> Portfolio subscriptions and Ponte Credits as entitlement sources (§3); the
> monetisation list in §5, including paid verification, investigation and
> reporting services, portfolio plans, and transaction, referral, completion and
> success fees; public Ponte Desk packages and paid fulfilment tiers (§6, §12);
> and the four-level launch ladder in §8 and §10.
>
> Ponte's only paid product is the Deal Room, at **$79 USD for 30 active days**,
> including five concurrently active private principal-counterparty Deal
> Branches, **$15 USD** per additional concurrent branch, capped at **$199 USD**
> per Master Deal Room per 30-day period, in **USD only**.
>
> This document is preserved as the historical record. Do not implement from it.
> See `docs/decisions/ADR-0020-deal-room-only-pricing-authority.md` for the full
> supersession map.

- **Status:** **Superseded within its commercial scope on 31 July 2026** by `PT-COMMERCIAL-2026-07-31-01` / ADR-0020. Originally accepted by the product owner; effective when merged
- **Decision date:** 27 July 2026
- **Owner:** Giuseppe Funaro
- **Repository:** `Geppix140269/ponte`
- **Source issue:** #52
- **Implementation status:** Not started
- **Current authority:** Non-negotiable until explicitly superseded by the owner

## 1. Executive decision

Ponte Trade monetises the Deal Room.

Ponte creates upstream liquidity through structured commercial intent across Products, Trade services, and Distribution and representation. The commercial conversion occurs when a participant progresses one defined Deal inside a master Deal Room.

> The upstream market creates liquidity. The master Deal Room captures value.

The master Deal Room is Ponte's downstream controlled-execution product and primary monetisation environment.

## 2. Commercial boundary

Users may browse, structure, publish and respond to complete Deals without a Deal Room fee.

One paid master Deal Room corresponds to one defined Deal and may contain any number of directly related private sub-rooms under the applicable entitlement, permission, security and anti-abuse rules.

A proposed room may show its commercial subject, sponsor, admission requirements, confidentiality terms and entitlement before activation.

The standard ongoing rule is:

> Active Deal Room progression requires a valid commercial entitlement.

The accepted limited exception is **Starter Deal Room Access**: one constrained real Deal Room experience per verified organisation before ongoing paid use. Starter Access does not redefine the standard paid model.

## 3. Entitlement sources

A master room may be entitled through:

- Starter Deal Room Access;
- payment by the room initiator or sponsor;
- a Portfolio subscription with defined master-room capacity;
- Ponte Credits;
- institutional or programme sponsorship;
- a promotional or founding entitlement; or
- an auditable owner-approved waiver.

Payment and sponsorship do not confer ownership of another participant's Deal, disclosure rights or commercial decision authority.

## 4. Starter Deal Room Access

Ponte provides one limited Starter master Deal Room at organisation level so users can feel the real product before paying.

The Starter product must:

- require no credit card;
- include the real core Deal Room progress loop;
- be limited by duration, sub-room capacity, participant capacity and assisted-service exclusions;
- create no founder, Ponte Desk or specialist obligation;
- preserve all data and history on upgrade;
- become read-only when the Starter term ends unless upgraded;
- prevent repeated free rooms through duplicate accounts for the same organisation.

Recommended launch limits are defined in `PT-COMMERCIAL-2026-07-27-03-STARTER-DEAL-ROOM-ACCESS.md` and remain proposed until separately approved.

## 5. Monetisation around the master room

Ponte may monetise:

- master-room activation;
- concurrent active master-room capacity;
- external guest-organisation capacity;
- pay-as-you-go extensions;
- premium agent capabilities;
- Ponte-facilitated or Ponte-managed procedure;
- investigation, evidence, verification and reporting services;
- specialist services coordinated through a master room or sub-room;
- portfolio plans covering several active master Deals;
- transaction, referral, completion or success fees where attribution, legality and operational rules are clear.

Private sub-room creation does not consume another master-room activation.

## 6. Relationship to Ponte Desk

Ponte Desk is a paid fulfilment layer within the Deal Room-centred commercial architecture.

A master room may be self-managed, agent-assisted, Ponte-observed, Ponte-facilitated, Ponte-managed or institutionally sponsored.

Starter, self-managed and agent-assisted access do not include unpriced human work. Substantive founder, Ponte Desk or specialist work requires a separately accepted scope and entitlement.

## 7. Required MVP capabilities

The first commercially coherent release must recognise:

- Starter eligible;
- Starter reserved;
- Starter active;
- Starter expired and read-only;
- entitlement required;
- entitlement reserved;
- entitled;
- payment failed;
- sponsored;
- promotional;
- waived;
- expired;
- suspended;
- closed.

Payment, settlement, escrow and trade-finance execution between the commercial parties remain outside the MVP. Ponte's own entitlement and billing capability is required for ongoing paid use.

A failure or expiry must not delete the proposed room, active room, evidence or audit history.

## 8. Commercial funnel

```text
Market Signals and structured Deals
  -> credible commercial interest
  -> Starter Deal Room experience where eligible
  -> Portfolio subscription or Ponte Credits for ongoing use
  -> optional paid agent, Ponte Desk and specialist services
  -> recorded commercial outcome
```

## 9. Guardrails

- Do not place the upstream liquidity layer behind a paywall.
- Do not require payment before a verified organisation can experience the first real Deal Room loop.
- Do not turn Starter Access into an unrestricted permanently free room.
- Do not make Starter a static or crippled demonstration.
- Do not imply that payment or Starter eligibility makes a participant verified, safer or more likely to close.
- Do not let payment create disclosure or decision rights.
- Do not include unpriced founder, Ponte Desk or specialist work.
- Do not hide duration, room, sub-room, participant or renewal limits.
- Do not delete room history because an entitlement expires.
- Do not require invited sponsored guests to buy a plan merely to participate.
- Do not allow duplicate personal accounts to multiply organisation-level Starter entitlements.

## 10. Launch configuration status

The consolidated proposed launch model is:

- Free Market Access;
- one limited Starter Deal Room per verified organisation;
- Deal Room Portfolio subscription;
- Ponte Credits;
- separately scoped paid human and specialist services.

The current numerical proposal is in `PT-COMMERCIAL-2026-07-27-04-DEAL-ROOM-LAUNCH-MODEL-V2.md` and is not binding until owner approval.

## 11. Implementation boundary

This policy does not authorise:

- exact prices or limits;
- a pricing page;
- charging;
- Stripe or invoice configuration;
- tax treatment;
- entitlement tables or migrations;
- runtime paywalls;
- AI usage quotas;
- production feature flags;
- external commercial communication; or
- deployment.

## 12. Authority effect

This policy governs when it conflicts with:

- the broad exclusion of payments from the Deal Room MVP;
- any assumption that every first Deal Room experience must be paid before use;
- any assumption that active Deal Rooms are permanently free;
- any model charging separately for each private sub-room;
- any model treating paid Ponte Desk work as Ponte's only Deal Room revenue.

It does not change the North Star entry routes. Deal Rooms remain downstream.

## 13. Related records

- `docs/ponte-authority/PT-COMMERCIAL-2026-07-27-03-STARTER-DEAL-ROOM-ACCESS.md`
- `docs/ponte-authority/PT-COMMERCIAL-2026-07-27-04-DEAL-ROOM-LAUNCH-MODEL-V2.md`
- `docs/ponte-authority/PT-PRODUCT-2026-07-27-01-DEAL-ROOM-PRODUCT-CONTRACT-V1.md`
- `docs/ponte-authority/PT-PRODUCT-2026-07-27-02-DEAL-TO-ROOM-BRANCHING-MODEL.md`
- `docs/decisions/ADR-0004-deal-room-monetisation-boundary.md`
- `docs/decisions/ADR-0005-free-deals-and-counterparty-room-branches.md`
- `docs/decisions/ADR-0006-starter-deal-room-access.md`
- GitHub issues #51 and #52
