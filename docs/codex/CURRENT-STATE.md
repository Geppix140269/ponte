# Current state

**Reconciled:** 28 July 2026  
**Entry authority:** `docs/ponte-authority/00-NORTH-STAR-ENTRY-ARCHITECTURE.md`, amended 26 July 2026 (Ponte Desk selected)  
**Design authority:** `design/authority/PONTE_DESIGN_CONSTITUTION_v1.md`, ADR-0002 and ADR-0010 (complete-interface scope)  
**Bridge authority:** `design/authority/bridge/v1/` (merged, production primitives incomplete)  
**Language authority:** `docs/ponte-authority/PT-PRODUCT-2026-07-26-02-ENGLISH-ONLY-INTERFACE-POLICY.md`  
**Market discoverability authority:** `docs/ponte-authority/PT-PRODUCT-2026-07-28-01-COMPLETE-MARKET-DISCOVERABILITY-AND-CATEGORY-FIRST-JOURNEYS.md`  
**Deal Room authority:** `docs/ponte-authority/PT-PRODUCT-2026-07-27-01-DEAL-ROOM-PRODUCT-CONTRACT-V1.md`  
**Deal-to-Room hierarchy:** `docs/ponte-authority/PT-PRODUCT-2026-07-27-02-DEAL-TO-ROOM-BRANCHING-MODEL.md`  
**Deal Room monetisation authority:** `docs/ponte-authority/PT-COMMERCIAL-2026-07-27-01-DEAL-ROOM-MONETISATION-POLICY.md`  
**Starter Deal Room proposal:** `docs/ponte-authority/PT-COMMERCIAL-2026-07-27-03-STARTER-DEAL-ROOM-ACCESS.md`  
**Launch model proposal:** `docs/ponte-authority/PT-COMMERCIAL-2026-07-27-04-DEAL-ROOM-LAUNCH-MODEL-V2.md`  
**Repository:** `Geppix140269/ponte`  
**Canonical branch:** `main`  
**Unified market decision:** `docs/decisions/ADR-0001-unified-trade-market.md`  
**Market discoverability decision:** `docs/decisions/ADR-0011-complete-market-discoverability-and-category-first-journeys.md`  
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
| Complete Market Signal discoverability and category-first journeys | Designed and owner-accepted on branch `agent/record-market-discoverability`; development brief issued to Claude Code | Not implemented or production-verified | ADR-0011 makes every eligible signal discoverable and requires Trade Services and Distribution to begin with structured categories. The current 60-record board, generic non-product subject field and approximately 160-row upload remain implementation/reconciliation work. |
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
| Product Market Signals | On `main` | 3,517 approved and unexpired rows at 26 July probe; public board currently reads only the newest 60 | Public signals have source category but no HS code. The new approximately 160-row upload has not yet been reconciled in this status record. |
| Native Member Opportunities | On `main` | 0 exact public records under the current eligibility contract at 26 July probe | Four listing rows existed; two approved/current, zero with passing bound member-business verification. |
| Automated listing publication (ADR-0012) | Implemented on branch `fix/automated-listings-email-system` | Not merged, not deployed, migration not applied | A structurally valid listing from a verified member publishes without an administrator. Human review is exception-based. Verification remains blocking by owner decision, so this changes latency for verified members and does not by itself increase the number of published listings — the 26 July probe recorded zero members with a passing bound verification. |
| Unified transactional email system (ADR-0012) | Implemented on branch | Not merged, not deployed | All 13 application-generated templates render through one shell derived from `design-system/ponte-flow/tokens/`. Every email has HTML and plain text. The retired `#0F1E3C`/`#E8A020` palette and the "verified network" tagline are gone. Supabase Auth templates are NOT migrated: they are provider-side and documented in `docs/email-provider-template-configuration.md` as an unapplied manual step. |
| Structured listing quantity (ADR-0012) | Implemented on branch | Not merged; migration not applied | Adds mode (exact/approximate/minimum/maximum/range/negotiable/on request), decimal support and separator-safe parsing. Fixes the composer defect where a displayed `10,000` was a render-time fallback the form state never held, so an unedited quantity submitted as null. |
| Listing exception console | Not started | `/admin/listings` still presents the pre-ADR-0012 queue | The statuses, flag columns, reasons, severities and indexes exist; the screen has not been rebuilt to lead with flagged, suspended and incomplete cases or to filter by flag reason and severity. |
| Trade services inventory and entry | Partially implemented | 0 legacy service rows at 26 July probe | Member creation paths exist after PR #49, but canonical persisted family/intent is not yet first-class. The live non-product composer still begins with a generic subject field rather than the accepted category-first journey. |
| Distribution and representation inventory and entry | Taxonomy and member creation paths | No canonical external inventory at 26 July probe | Canonical persisted family/intent remains future data-contract work. Partner type, territory and relationship terms are not yet stored as separate accepted concepts. |
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

### Shared foundation implemented (Phase 2 slice 2, 27 July 2026)

The approved system now has production plumbing. What exists, and what does not:

| Layer | State |
|---|---|
| **Tokens** | Ponte Flow is the production token authority. `app/globals.css` imports the bundle above the Tailwind directives; `--pf-*` is declared on `:root`. The Desk's 21 duplicated properties are now aliases and hold no values of their own. |
| **Icons** | `PonteIcon` is the sole renderer: semantic keys only, `currentColor` preserved, reduced variants below each key's own threshold, and an unknown key throws rather than rendering a hole. `check-governance.mjs` ratchets the legacy lucide and authored-SVG lists so they can only shrink. |
| **Brand lockup** | One shared component, `components/ponte/brand/PonteLockup.tsx`, serving all four surfaces. The owner ruled it an identity asset, not an interface icon; the Constitution's icon law is unchanged for interface icons. |
| **Motion** | The Flow motion CSS and the reduced-motion contract are live in production and were already imported (see the correction below). `lib/ponte/motion.ts` reads the approved specification rather than restating it. No component is activated on any journey yet. |
| **Progress** | `lib/ponte/progress.ts`: pure, deterministic, weights summing to 100, floor 20, never 0, irregular increments, 100 only when the procedure completes. Approved band copy included. |
| **Lifecycle states** | `components/ponte/state/LifecycleState.tsx`: loading, waiting, blocked, active, under review, completed, error. Distinct in words, marker geometry and colour, in that order. **No route has been retrofitted.** |
| **Bridge primitives** | Still none. Slice 3, `design/phase-2-bridge-primitives`. |

**Correction to the Phase 1 audit.** Its finding 0.3, that the Flow tokens and
motion CSS were "imported nowhere", was wrong. They have been imported since
commit `0bb84fa`; the audit's grep looked for the leaf filenames under `app/` and
`components/` and missed the bundle file in `design-system/`. Verified at runtime.
The genuine defect was the duplication the audit identified itself at A.2.
Recorded in `docs/codex/audits/constitution-rebuild/GAP-REGISTER.md` section 4.

**Open gaps** are registered in that same file: three icon commissions (G6a to
G6c), the Bridge primitives (G1), the journey and connection state vocabulary
(G5), and four design-system gaps (DS-1 to DS-4). A gap is a stop-and-escalate
condition, not permission to improvise.

**`/marketplace` is not a straightforward retirement.** It carries the owner-side
decision on an inbound introduction, listing reconfirmation and the account
brief, none of which exists elsewhere. Escalated in
`docs/codex/audits/constitution-rebuild/MARKETPLACE-DEPENDENCY-FINDING.md`.
Separately, `/api/marketplace/*` is current infrastructure: Start a Deal and Find
both post to it.

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

The approximately 160-row signal batch discussed on 28 July has not yet been reconciled in this production truth. The final stored and public-active totals must be updated only after exact import evidence exists.

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

## Market discoverability and category-first journey truth

The owner accepted ADR-0011 on 28 July 2026.

The accepted target is:

```text
Every eligible Market Signal is reachable
-> full-dataset server-side search and facets
-> stable URL state and pagination
-> product hierarchy where classification is supported
-> truthful Unclassified access where it is not
```

and for new or searched non-product activity:

```text
Family and intent
-> clickable canonical category
-> relevant subcategory or partner type
-> family-specific commercial details
-> optional prose
```

Trade Services uses structured service categories and subcategories. Distribution separates partner/channel type, product/sector, territory and relationship structure. Other remains the final escape route to targeted manual wording.

This target is **Designed and owner-accepted**, not implemented. The current public Market Signals board still reads only the newest 60 by default; the current non-product Structure path still opens a generic subject field; exact reconciliation of the new batch is not recorded; and no production migration or deployment has been verified.

## Verification and security findings

Production profile levels were text values while application code performed a numeric conversion before threshold comparison. No passing `member_business` verification existed at the 26 July probe. This requires separate corrective security and integrity work.

RLS was enabled on inspected core tables. Investigation and connection policies preserved ownership boundaries. The approved-listing direct-read policy and verification type mismatch remain separate security and integrity work, distinct from canonical publication eligibility.

## Immediate next actions

1. Review and merge the ADR-0011/source-of-truth documentation pull request so Claude Code and future contributors can treat the decision as binding repository authority.
2. Claude Code implements the accepted complete Market Signals search, pagination, new-batch reconciliation and category-first Trade Services and Distribution journeys through its dedicated branch and PR.
3. Require exact before-and-after counts, classification coverage, privacy-contract evidence, tests and desktop/390 × 844 screenshots before implementation approval.
4. Do not apply a production migration, deploy, change a production feature flag or merge the implementation without the later approval required by `AGENTS.md`.
5. Product owner approves or revises the Starter limits and paid launch numbers in `PT-COMMERCIAL-2026-07-27-04-DEAL-ROOM-LAUNCH-MODEL-V2.md`.
6. Complete issue #51's detailed Deal Room journey, screen register, domain model, permissions, state machine, progress model and delivery plan.
7. Complete issue #52's legal, billing, tax, refund, Stripe, entitlement and unit-economics requirements after commercial approval.
8. No production schema, pricing, Stripe or charging action without the required later approvals.
9. Review and merge the Design Constitution authority PR after checks pass.
10. Open a separate landing bridge implementation PR using the merged authorities.
11. Verify that PR at desktop and 390 × 844, including keyboard and reduced motion, before merge.
12. Continue market-data, verification and schema work only through their existing explicit plans; do not hide them inside design implementation.
13. Do not start an uncontrolled app-wide repaint. Apply the Constitution through scoped journey-level PRs.
