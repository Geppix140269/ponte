# Current state

**Reconciled:** 27 July 2026  
**Entry authority:** `docs/ponte-authority/00-NORTH-STAR-ENTRY-ARCHITECTURE.md`, amended 26 July 2026 (Ponte Desk selected)  
**Language authority:** `docs/ponte-authority/PT-PRODUCT-2026-07-26-02-ENGLISH-ONLY-INTERFACE-POLICY.md`  
**Deal Room authority:** `docs/ponte-authority/PT-PRODUCT-2026-07-27-01-DEAL-ROOM-PRODUCT-CONTRACT-V1.md`  
**Repository:** `Geppix140269/ponte`  
**Canonical branch:** `main`  
**Unified market decision:** `docs/decisions/ADR-0001-unified-trade-market.md`  
**Deal Room decision:** `docs/decisions/ADR-0003-deal-room-product-contract.md`  
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
| Deal Room Product Contract v1 | Designed and owner-accepted on branch `decision/deal-room-product-contract-v1` | Not started | Product foundation only: formal admission, Deal Room-ready Business Passport, agreed procedure, evidence, decisions, blockers, stable progress and closure. No Design, code, schema, migration, deployment or production action. Issues #50 and #51 track authority recording and remaining product definition. |
| Ponte Desk interface, slice 1 (landing, Market Signals listing, Market Signal detail) | Implemented on branch `claude/ponte-desk-interface-671b92` | Not deployed | Desk page system, journey rail, ruled fact register, Atlas ink boundary on signal detail. Desktop and 390px verified locally against production data. Stops before merge for owner visual review. |
| Desk commercial-fact authority (`lib/desk/facts.ts`) | Implemented on branch | Not deployed | `factsFor(record, context)` is the single authority at every width. Contexts differ in count only. `lib/desk/adapter.ts` is the one production boundary; no component reads a signal column. |
| Desk journey rail (`lib/desk/journey.ts`) | Implemented on branch | Not deployed | R-FIND and R-SUBMIT, four stations each. Journey stations only, never navigation. The landing has no rail. Review is not a station and does not move the rail. |
| English-only interface policy `PT-PRODUCT-2026-07-26-02` | Approved authority on branch | Operating rule | Interface and Ponte-controlled content are English only; multilingual input stays supported and may be interpreted and translated. `next-intl` and `[locale]` are legacy compatibility infrastructure; their removal is a separate deliberate migration, not incidental cleanup. |
| Unified three-family market contract | Accepted and on `main` via PR #41 | Not implemented as a production data contract | Products, Trade services, and Distribution and representation are equal families, each supporting Market Signals and Member Opportunities. |
| Issue #42 Phase A reconciliation | Complete on branch `issue-42/phase-a-audit`; PR #44 ready for owner review | Production-verified for market-record scope | Repository audit, compatibility matrix, SELECT-only production probe and final report are complete. No runtime or database change is included. |
| Explore the market | On `main` | Production data defect verified | Public activity is real, but family and sector membership depend on incomplete legacy inference. |
| Product Market Signals | On `main` | 3,517 approved and unexpired rows | All 3,517 carry a source category and none carries an HS code, so current HS-derived sector counts cannot classify them. |
| Native Member Opportunities | On `main` | 0 exact visible under current eligibility contract | Four listing rows exist; two are approved/current and desk-managed, but zero have a bound passing member-business verification. |
| Trade services inventory | Partially implemented | 0 legacy service rows | No stored service listing exists; seek versus offer is not persisted; external service signals are not classified. |
| Distribution and representation inventory | Taxonomy only | No canonical inventory | One signal matched distribution-related keywords, but keyword discovery is not canonical classification. |
| Start a deal | On `main` for legacy product-shaped paths | Incomplete | Persisted types remain `offer`, `requirement`, `service`; services and distribution are not modelled correctly. |
| Market Signal investigation | On `main` | 1 investigation row | Investigation/capability records are actions on signals, not native opportunities. |
| Product HS catalogue | On `main` | 5,613 rows across 97 chapters | The two approved listings have valid HS codes; public signals have none. |
| Import provenance and dedupe | On `main` | Production-verified strong | All 6,441 `g4wb_v2` rows have canonical ids, source platform, source URL, import metadata and dedupe keys; no duplicate groups were found. |
| Verification/publication eligibility | On `main` | Production defect confirmed | `profiles.verification_level` is a text enum while code applies `Number(...)`; no passing `member_business` verification exists in production. |

## Deal Room product truth

The owner accepted the Deal Room foundation on 27 July 2026. The accepted product definition is:

```text
Credible commercial interest
  -> proposed room
  -> Deal Room-ready Business Passport
  -> versioned participation terms and NDA acceptance
  -> required principal participants admitted
  -> procedure proposed and agreed
  -> conditions, evidence, decisions and blockers progressed
  -> Ready to proceed, qualified no-go or other intentional closure
  -> durable permission-controlled history
```

The procedure is the central object. Progress is separated into named commercial stage, stable weighted procedural completion, milestones and momentum. It is not a Trust Score or probability of closing.

This is **Designed**, not implemented. No Deal Room screen, table, migration, signature flow, permission engine, notification path or production behaviour is created by the accepted authority. Issue #51 must complete the detailed journey, screen register, conceptual domain model, permission matrix, state machine, progress model and delivery plan before Design begins.

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
| Approved/current before owner eligibility | 2 |
| Approved/current with bound passing member-business verification | 0 |
| Desk-managed listings | 2 |
| Legacy service listings | 0 |
| Signal investigations | 1 |

Twenty-six rows remain stored as `approved_signal` after their public expiry. Current readers exclude them correctly, but stored status and public-active lifecycle are not identical.

## Current market-model truth

The accepted logical model is:

```text
Market family: Products | Trade services | Distribution and representation
Record origin: Market Signal | Member Opportunity
Intent: one family-valid seeking or offering intent
```

Production confirms that neither `listings` nor `desk_radar` persists `market_family` or canonical `intent`.

Current production vocabularies are:

```text
listings.type: offer | requirement | service
desk_radar.side: offer | requirement
```

These values cannot prove all seven accepted intents. `record_origin` remains truthfully separated by source table and must stay that way.

## Classification truth

The current public sector path is:

```text
record.hs_code -> two-digit chapter -> PRODUCT_SECTORS range
```

Production proves:

- 3,517 of 3,517 public signals have no HS code;
- 3,517 of 3,517 have a source category;
- 2 of 2 approved listings have valid HS codes;
- no active record sits in unassigned chapters 71, 91 or 92.

Therefore the zero product-sector problem is structural, not cosmetic. Phase E should evaluate a deterministic source-category mapping before AI-assisted classification.

## Verification and security findings

Production profile levels are text values: six `unverified`, one `company_verified`, and one null. Two `member_business` verification cases are in `review`; there is no passing `member_business` verification.

The application converts the text enum through JavaScript `Number(...)` before a numeric threshold comparison. That level check does not represent the stored enum correctly and requires a separate corrective review.

RLS is enabled on all core tables inspected. `desk_radar` remains closed to member/public reads. Investigation and connection policies preserve ownership boundaries.

The `Authenticated read approved listings` policy is broader than the canonical public reader because its row condition checks only `status = approved`. A Phase B/security review must inspect table grants and ensure direct authenticated reads cannot bypass validity, reconfirmation, owner eligibility or safe-column projections.

## Import and provenance truth

The `g4wb_v2` batch contains 6,441 rows: 3,543 approved and 2,898 private. All imported rows have complete canonical identity, source and import metadata under the current import contract.

There are 294 older private rows outside that batch: 204 without source metadata and 90 legacy `go4world` rows without canonical ids/import metadata. They must remain outside public reclassification until source governance is reviewed.

Duplicate checks and investigation-count reconciliation returned zero defects.

## Immediate next actions

1. Review and merge the Deal Room authority PR only after confirming that it records the accepted foundation accurately; merge does not authorise implementation.
2. Complete issue #51's remaining Deal Room product-definition outputs and stop for owner approval before Design.
3. Owner reviews and decides whether to merge PR #44 as the accepted Phase A evidence package.
4. After explicit owner direction, Phase B designs the smallest backwards-compatible application contract and adapters. Phase B must not apply a database migration.
5. The verification-level type defect and approved-listing direct-read policy are handled as explicit security/integrity work, not hidden inside a market-schema migration.
6. A later pre-migration report and owner approval are required before any production schema or backfill change.
7. Issue #42 remains open until all implementation phases are complete.
