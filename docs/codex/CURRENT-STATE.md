# Current state

**Reconciled:** 27 July 2026  
<<<<<<< HEAD
**Entry authority:** `docs/ponte-authority/00-NORTH-STAR-ENTRY-ARCHITECTURE.md`  
**Design authority:** `design/authority/PONTE_DESIGN_CONSTITUTION_v1.md`, ADR-0002 and ADR-0010 (complete-interface scope)  
**Bridge authority:** `design/authority/bridge/v1/` (merged, no production primitive yet)  
=======
**Entry authority:** `docs/ponte-authority/00-NORTH-STAR-ENTRY-ARCHITECTURE.md`, amended 26 July 2026 (Ponte Desk selected)
**Design authority:** `design/authority/PONTE_DESIGN_CONSTITUTION_v1.md` and ADR-0002, pending merge of the authority PR
**Bridge authority:** `design/authority/bridge/v1/`, pending merge of the authority PR
>>>>>>> origin/main
**Language authority:** `docs/ponte-authority/PT-PRODUCT-2026-07-26-02-ENGLISH-ONLY-INTERFACE-POLICY.md`  
**Deal Room authority:** `docs/ponte-authority/PT-PRODUCT-2026-07-27-01-DEAL-ROOM-PRODUCT-CONTRACT-V1.md`  
**Deal-to-Room hierarchy:** `docs/ponte-authority/PT-PRODUCT-2026-07-27-02-DEAL-TO-ROOM-BRANCHING-MODEL.md`  
**Deal Room monetisation authority:** `docs/ponte-authority/PT-COMMERCIAL-2026-07-27-01-DEAL-ROOM-MONETISATION-POLICY.md`  
**Starter Deal Room proposal:** `docs/ponte-authority/PT-COMMERCIAL-2026-07-27-03-STARTER-DEAL-ROOM-ACCESS.md`  
**Launch model proposal:** `docs/ponte-authority/PT-COMMERCIAL-2026-07-27-04-DEAL-ROOM-LAUNCH-MODEL-V2.md`  
**Repository:** `Geppix140269/ponte`  
**Canonical branch:** `main`  
**Unified market decision:** `docs/decisions/ADR-0001-unified-trade-market.md`
**Deal Room decision:** `docs/decisions/ADR-0008-deal-room-product-contract.md`
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
| Source-of-truth operating procedure | On `main` | Operating rule | `AGENTS.md`, `CLAUDE.md`, SOP, ADRs and governance checks are canonical. |
| Deal Room Product Contract v1 | Designed and owner-accepted on branch `decision/deal-room-product-contract-v1` | Not started | Product foundation only: formal admission, Deal Room-ready Business Passport, agreed procedure, evidence, decisions, blockers, stable progress and closure. No design, code, schema, migration, deployment or production action. |
| Deal-to-Room and Sub-Room Model | Designed and owner-accepted on branch | Not started | Structured Deals may be published free. One paid master Deal Room corresponds to one Deal and may contain any number of private related sub-rooms. Five room slots mean five concurrent master Deals, not five conversations. |
| Deal Room monetisation policy | Designed and owner-accepted on branch | Not started | The upstream market creates liquidity; an active master Deal Room is the primary paid commercial environment. Entitlement is required conceptually. |
| Starter Deal Room principle | Designed and accepted in principle on branch | Not started | Ponte will provide one real limited Starter Deal Room before ongoing paid use. Recommended limits are proposed, not owner-accepted. |
| Deal Room Launch Model v2 | Designed on branch; proposed for owner approval | Not started | Combines Free Market Access, Starter Deal Room, €149/month or €1,490/year Portfolio subscription and Ponte Credits. All numerical limits and prices remain unapproved. |
| Ponte Design Constitution v1 | Implemented on branch `governance/ponte-design-constitution-v1` | Not deployed; authority only | Owner approved 27 July 2026. Becomes binding when merged. Includes ADR-0002, CODEOWNERS, PR design gate and governance enforcement. |
| Ponte Bridge System v1 | Implemented on the authority branch | Not implemented in production | Approved for Family, Action, Completion, Journey, Counterparty and Deal Room bridges, mobile, reduced motion and gold italic landing emphasis. |
| Ponte Desk and commercial journey repair | On `main` via PR #49, merge commit `85f0338d251e68cea583793adaea2379d77ddc03` | Deployed; production baseline visually inspected | Landing actions, services/distribution composer paths, signal actions, sign-in and Your records are restored. The current family/action card grid is temporary. |
| Landing bridge implementation | Not started | Current card grid remains live | Must be a separate PR after the authority PR merges. Scope: replace only family/action cards and restore approved gold italic headline; preserve navigation, auth, routes, data and Market Signals. |
| English-only interface policy | On `main` | Operating rule | Interface and Ponte-controlled content are English only; multilingual input remains supported. |
| Unified three-family market contract | On `main` via ADR-0001 | Not fully implemented as a production data contract | Products, Trade services, and Distribution and representation are equal families, each supporting Market Signals and Member Opportunities. |
| Issue #42 Phase A reconciliation | Complete evidence package | Production-verified for market-record scope | No runtime or database change. |
| Product Market Signals | On `main` | 3,517 approved and unexpired rows at 26 July probe | Public signals have source category but no HS code. |
| Native Member Opportunities | On `main` | 0 exact public records under the current eligibility contract at 26 July probe | Four listing rows existed; two approved/current, zero with passing bound member-business verification. |
| Trade services inventory | Partially implemented | 0 legacy service rows at 26 July probe | Member creation paths exist after PR #49, but canonical persisted family/intent is not yet first-class. |
| Distribution and representation inventory | Taxonomy and member creation paths | No canonical external inventory at 26 July probe | Canonical persisted family/intent remains future data-contract work. |
| Verification/publication eligibility | On `main` | Production defect confirmed | Stored verification vocabulary and numeric code comparison require separate integrity work. |
| Check and verify journey, request surfaces | On `main` via PR #45 | Not yet independently production-verified | `/verify`, `VerifyForm` and the `/verification` explainer mount PonteShell in heritage-light and are bared in ChromeGate, so reaching business verification from the Start a deal blockers no longer drops the member into the obsidian application mid-task. Every line of copy is unchanged. Plan: `docs/plans/active/verification-journey-brand-v5.md`. |

## Design authority truth

The approved design system is not advisory.

The authority branch currently establishes:

- `design/authority/PONTE_DESIGN_CONSTITUTION_v1.md`;
- `design/authority/bridge/v1/README.md`;
- `design/authority/bridge/v1/APPROVAL.md`;
- approved Bridge CSS and implementation notes;
- ADR-0002;
- mandatory contributor instructions;
- owner review for design authorities and shared design-system paths;
- a mandatory PR Design Constitution checklist;
- governance checks requiring the authority files and references.

Until the authority PR is merged, these files are implemented on branch and are not yet binding repository authority.

After merge, any UI contributor must stop rather than improvise when the Constitution is silent or conflicting.

## Landing visual baseline

The current production landing has:

- production navigation and session-aware Sign in / Your records;
- a scrolling strip of real Market Signals;
- the concise headline `Global trade, from signal to deal.`;
- a temporary three-column family/action card grid;
- the Market Signals section below;
- real restored commercial routes.

**Superseded by ADR-0010 (27 July 2026).** The narrow boundary below was the
first-implementation limit recorded after PR #58. ADR-0010 widens the
Constitution's scope to the complete interface, delivered through controlled
journey PRs. The delivery discipline is unchanged: one journey per PR, each
complete at desktop and mobile, each with its own evidence and owner approval.

The first two items remain the first two slices:

1. render `Global trade, from <em>signal to deal.</em>` using the approved gold italic emphasis (PR #60);
2. replace the temporary family/action grid with the approved Family and Action Bridges;
3. preserve all current production navigation, authentication, data, actions and destinations.

Programme sequencing is governed by `docs/plans/active/constitution-led-interface-rebuild.md`.

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

Twenty-six rows remained stored as `approved_signal` after public expiry. Current readers excluded them correctly, but stored status and public-active lifecycle were not identical.

## Current market-model truth

```text
Market family: Products | Trade services | Distribution and representation
Record origin: Market Signal | Member Opportunity
Intent: one family-valid seeking or offering intent
```

Production does not yet persist the complete accepted `market_family` and canonical intent contract across current tables. At the 26 July probe, neither `listings` nor `desk_radar` persisted `market_family` or canonical `intent` as first-class fields.

Current production vocabularies were:

```text
listings.type: offer | requirement | service
desk_radar.side: offer | requirement
```

These values cannot prove all accepted intents. PR #49 carries canonical family/intent through member journeys but does not authorise or apply a database migration.

## Verification and security findings

Production profile levels were text values while application code performed a numeric conversion before threshold comparison. No passing `member_business` verification existed at the 26 July probe. This requires separate corrective security and integrity work.

RLS was enabled on inspected core tables. Investigation and connection policies preserved ownership boundaries. The approved-listing direct-read policy and verification type mismatch remain separate security and integrity work, distinct from canonical publication eligibility.

## Immediate next actions

1. Product owner approves or revises the Starter limits and paid launch numbers in `PT-COMMERCIAL-2026-07-27-04-DEAL-ROOM-LAUNCH-MODEL-V2.md`.
2. Complete issue #51's detailed Deal Room journey, screen register, domain model, permissions, state machine, progress model and delivery plan.
3. Complete issue #52's legal, billing, tax, refund, Stripe, entitlement and unit-economics requirements after commercial approval.
4. No production schema, pricing, Stripe or charging action without the required later approvals.
5. Review and merge the Design Constitution authority PR after checks pass.
6. Open a separate landing bridge implementation PR using the merged authorities.
7. Verify that PR at desktop and 390 × 844, including keyboard and reduced motion, before merge.
8. Continue market-data, verification and schema work only through their existing explicit plans; do not hide them inside design implementation.
9. Do not start an uncontrolled app-wide repaint. Apply the Constitution through scoped journey-level PRs.