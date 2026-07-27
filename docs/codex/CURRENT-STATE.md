# Current state

**Reconciled:** 27 July 2026  
**Entry authority:** `docs/ponte-authority/00-NORTH-STAR-ENTRY-ARCHITECTURE.md`, amended 26 July 2026 (Ponte Desk selected)  
**Language authority:** `docs/ponte-authority/PT-PRODUCT-2026-07-26-02-ENGLISH-ONLY-INTERFACE-POLICY.md`  
**Deal Room authority:** `docs/ponte-authority/PT-PRODUCT-2026-07-27-01-DEAL-ROOM-PRODUCT-CONTRACT-V1.md`  
**Deal-to-Room hierarchy:** `docs/ponte-authority/PT-PRODUCT-2026-07-27-02-DEAL-TO-ROOM-BRANCHING-MODEL.md`  
**Deal Room monetisation authority:** `docs/ponte-authority/PT-COMMERCIAL-2026-07-27-01-DEAL-ROOM-MONETISATION-POLICY.md`  
**Starter Deal Room proposal:** `docs/ponte-authority/PT-COMMERCIAL-2026-07-27-03-STARTER-DEAL-ROOM-ACCESS.md`  
**Launch model proposal:** `docs/ponte-authority/PT-COMMERCIAL-2026-07-27-04-DEAL-ROOM-LAUNCH-MODEL-V2.md`  
**Repository:** `Geppix140269/ponte`  
**Canonical branch:** `main`  
**Unified market decision:** `docs/decisions/ADR-0001-unified-trade-market.md`  
**Deal Room decision:** `docs/decisions/ADR-0003-deal-room-product-contract.md`  
**Deal Room monetisation decision:** `docs/decisions/ADR-0004-deal-room-monetisation-boundary.md`  
**Master-room hierarchy decision:** `docs/decisions/ADR-0005-free-deals-and-counterparty-room-branches.md`  
**Starter Deal Room decision:** `docs/decisions/ADR-0006-starter-deal-room-access.md`  
**Phase A evidence:** `docs/codex/audits/issue-42-phase-a/PHASE-A-FINAL-REPORT.md`

## Status vocabulary

Use only these labels:

- Not started
- Designed
- Partially implemented
- Implemented on branch
- On `main`
- Deployed
- Production-verified
- Blocked
- Deprecated

Code on `main` is not automatically deployed, enabled or production-verified. An accepted ADR is not proof that its implementation is complete.

## Implementation summary

| Area | Repository status | Production status | Notes |
|---|---|---|---|
| Source-of-truth operating procedure | On `main` via PR #41 | Operating rule | `AGENTS.md`, `CLAUDE.md`, SOP, ADRs and governance checks are canonical. |
| Deal Room Product Contract v1 | Designed and owner-accepted on branch `decision/deal-room-product-contract-v1` | Not started | Product foundation only: formal admission, Deal Room-ready Business Passport, agreed procedure, evidence, decisions, blockers, stable progress and closure. No Design, code, schema, migration, deployment or production action. |
| Deal-to-Room and Sub-Room Model | Designed and owner-accepted on branch | Not started | Structured Deals may be published free. One paid master Deal Room corresponds to one Deal and may contain any number of private related sub-rooms. Five room slots mean five concurrent master Deals, not five conversations. |
| Deal Room monetisation policy | Designed and owner-accepted on branch | Not started | The upstream market creates liquidity; an active master Deal Room is the primary paid commercial environment. Entitlement is required conceptually. |
| Starter Deal Room principle | Designed and accepted in principle on branch | Not started | Ponte will provide one real limited Starter Deal Room before ongoing paid use. Recommended limits—one organisation-level entitlement, 30 days, three sub-rooms, two external organisations and two internal users—remain proposed. |
| Deal Room Launch Model v2 | Designed on branch; proposed for owner approval | Not started | Combines Free Market Access, Starter Deal Room, €149/month or €1,490/year Portfolio subscription and Ponte Credits. All numerical limits and prices remain unapproved. |
| Ponte Desk interface, slice 1 | Implemented on branch `claude/ponte-desk-interface-671b92` | Not deployed | Landing, Market Signals listing and detail only. Stops before merge for owner visual review. |
| Unified three-family market contract | Accepted and on `main` via PR #41 | Not implemented as a production data contract | Products, Trade services, and Distribution and representation are equal families, each supporting Market Signals and Member Opportunities. |
| Issue #42 Phase A reconciliation | Complete on branch `issue-42/phase-a-audit`; PR #44 ready for owner review | Production-verified for market-record scope | No runtime or database change is included. |
| Explore the market | On `main` | Production data defect verified | Public activity is real, but family and sector membership depend on incomplete legacy inference. |
| Product Market Signals | On `main` | 3,517 approved and unexpired rows | All 3,517 carry a source category and none carries an HS code. |
| Native Member Opportunities | On `main` | 0 exact visible under current eligibility contract | Four listing rows exist; zero have a bound passing member-business verification. |
| Trade services inventory | Partially implemented | 0 legacy service rows | No stored service listing exists; seek versus offer is not persisted. |
| Distribution and representation inventory | Taxonomy only | No canonical inventory | No accepted production inventory. |
| Start a deal | On `main` for legacy product-shaped paths | Incomplete | Services and distribution are not modelled correctly. |
| Verification/publication eligibility | On `main` | Production defect confirmed | Stored verification values and numeric code comparison do not align. |

## Deal Room product truth

The owner accepted the Deal Room foundation, commercial boundary, master-room hierarchy and the need for a real limited Starter experience on 27 July 2026.

The accepted and proposed commercial ladder is:

```text
Structured Deal — free to create and publish when eligible
  -> Starter Deal Room — principle accepted; launch limits proposed
  -> paid Portfolio subscription or Ponte Credits
  -> optional paid agent, Ponte Desk and specialist services
```

The master-room hierarchy remains:

```text
One master Deal Room — one Deal and one room entitlement
  -> private counterparty sub-rooms
  -> private provider and adviser sub-rooms
  -> private internal workstreams
```

Paid master rooms may contain unlimited directly related private sub-rooms. Sub-room creation does not consume another master-room slot. External guest organisations may consume included capacity or credits.

### Starter Deal Room proposal

The recommended Starter configuration is:

- €0 and no credit card;
- once per verified organisation;
- one master Deal Room;
- 30 active days starting when the first required external principal completes admission;
- three private sub-rooms;
- two admitted external guest organisations;
- two internal organisation users;
- real admission, NDA, procedure, evidence, clarification, blockers, decisions, milestones, progress and basic AI recap;
- no founder, Ponte Desk or specialist work;
- read-only expiry with seamless upgrade and no loss of history.

The Starter principle is accepted. These numerical limits are **proposed, not owner-accepted**.

### Paid launch proposal

- €149 per month or €1,490 per year;
- five concurrent active master Deal Rooms;
- unlimited related private sub-rooms;
- 25 concurrent external guest organisations;
- five internal organisation members;
- 60 credits for a 90-day pay-as-you-go master room including two external guest organisations;
- five credits for an additional guest organisation;
- 20 credits for a 30-day extension or temporary extra master-room slot.

These paid numerical terms are also **proposed, not owner-accepted**.

No price, Stripe, billing, tax, schema, runtime entitlement or production charging is authorised. This entire Deal Room capability is **Designed**, not implemented.

## Production inventory truth

The 26 July 2026 production probe established:

| Measure | Result |
|---|---:|
| Total Market Signal rows | 6,735 |
| Approved signal rows | 3,543 |
| Approved and unexpired public signals | 3,517 |
| Public signal requirements | 2,526 |
| Public signal offers | 991 |
| Total listings | 4 |
| Approved listings | 2 |
| Approved/current with bound passing member-business verification | 0 |
| Desk-managed listings | 2 |
| Legacy service listings | 0 |
| Signal investigations | 1 |

Twenty-six rows remain stored as `approved_signal` after their public expiry. Current readers exclude them correctly, but stored status and public-active lifecycle are not identical.

## Current market-model truth

```text
Market family: Products | Trade services | Distribution and representation
Record origin: Market Signal | Member Opportunity
Intent: one family-valid seeking or offering intent
```

Production does not yet persist the complete accepted `market_family` and canonical intent contract across current tables.

## Verification and security findings

Production verification levels and the numeric comparison in application code do not align. No passing `member_business` verification currently exists. This requires separate corrective security and integrity work.

RLS is enabled on core inspected tables, but direct authenticated listing reads require separate review against canonical publication eligibility.

## Immediate next actions

1. Product owner approves or revises the Starter limits and paid launch numbers in `PT-COMMERCIAL-2026-07-27-04-DEAL-ROOM-LAUNCH-MODEL-V2.md`.
2. Review and merge PR #53 only after confirming the accepted principles and proposed numbers are labelled correctly; merge does not authorise implementation or charging.
3. Complete issue #51's detailed Deal Room journey, screen register, domain model, permissions, state machine, progress model and delivery plan.
4. Complete issue #52's legal, billing, tax, refund, Stripe, entitlement and unit-economics requirements after commercial approval.
5. Reconcile open PR #47 with the Deal Room-centred model.
6. Owner reviews PR #44 separately.
7. No production schema, pricing, Stripe or charging action without the required later approvals.
