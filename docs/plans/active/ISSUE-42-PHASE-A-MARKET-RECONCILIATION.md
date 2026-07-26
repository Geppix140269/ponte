# Issue 42 Phase A - market-record reconciliation

**Issue:** #42  
**Branch:** `issue-42/phase-a-audit`  
**Status:** Complete; awaiting owner review in PR #44  
**Started:** 26 July 2026  
**Completed:** 26 July 2026  
**Owner decision:** Audit and reconcile before proposing implementation or migration.

## Purpose and outcome

Ponte Trade has accepted one unified market with three equal families:

1. Products
2. Trade services
3. Distribution and representation

Each family must contain externally observed Market Signals and Ponte member-created Member Opportunities. Phase A established the exact compatibility boundary between that contract and the current repository and production database.

The outcome is an evidence-based implementation baseline. No user-facing feature, migration, backfill, source activation or production write was included.

## Authority

- `AGENTS.md`
- `docs/codex/SOURCE-OF-TRUTH-SOP.md`
- `docs/decisions/ADR-0001-unified-trade-market.md`
- `docs/schemas/market-taxonomy.yaml`
- `docs/schemas/market-record.schema.json`
- `lib/taxonomy/market.ts`
- `docs/codex/DATABASE-STATE.md`
- Issue #42

## Deliverables

1. This ExecPlan.
2. `docs/codex/audits/issue-42-phase-a/COMPATIBILITY-MATRIX.md`.
3. `docs/codex/audits/issue-42-phase-a/PRODUCTION-PROBE.sql`.
4. `docs/codex/audits/issue-42-phase-a/PRODUCTION-PROBE-COMPACT.sql`.
5. `docs/codex/audits/issue-42-phase-a/PRODUCTION-PROBE-RESULTS-2026-07-26.md`.
6. `docs/codex/audits/issue-42-phase-a/PHASE-A-FINAL-REPORT.md`.
7. Updated `docs/codex/CURRENT-STATE.md`.
8. Updated `docs/codex/ACTIVE-MILESTONE.md`.
9. PR #44, stopped before merge.

## Repository findings

### Member Opportunities

Member commercial records live in `listings` and use the legacy type vocabulary:

- `offer`
- `requirement`
- `service`

That vocabulary cannot prove the seven accepted canonical intents. The Structure draft and submit path remain product-shaped, and a service is still routed through product/HS concepts. Distribution has no persisted representation.

Valuable controls already exist and should be preserved: drafts, submission, desk review, validity, reconfirmation, verification, sanctions checks, desk-approved public text, material-change review and owner eligibility.

### Market Signals

External signals live in `desk_radar` and remain factually separate from member listings. Public reads require `approved_signal`, current public expiry and a named safe column projection. Source identity, source URL, raw prose, counterparty identity and notes remain internal.

Signals persist only `side = offer | requirement`; they do not persist market family or canonical intent.

### Signal and listing actions

`signal_investigations` and `listing_connections` are actions linked to inventory. A capability declaration on a signal is not a native Member Opportunity unless a member explicitly converts, reviews and submits it through a future workflow.

### Public activity and counts

The public activity layer merges independently filtered Member Opportunities and Market Signals while retaining origin class. The Market Signal count applies status and expiry. The listing head count applies only `status = approved`, while row visibility also applies validity, reconfirmation and owner eligibility.

## Production probe

Giuseppe Funaro executed the SELECT-only compact probe in the Supabase production SQL Editor at `2026-07-26T10:45:41.549418` UTC using database role `postgres` on PostgreSQL 17.6.

### Production inventory

| Measure | Result |
|---|---:|
| Total Market Signal rows | 6,735 |
| Approved signal rows | 3,543 |
| Approved and unexpired public signals | 3,517 |
| Public requirements | 2,526 |
| Public offers | 991 |
| Total listings | 4 |
| Approved listings | 2 |
| Approved/current before owner eligibility | 2 |
| Approved/current with bound passing member-business verification | 0 |
| Desk-managed listings | 2 |
| Legacy service rows | 0 |
| Signal investigations | 1 |

### Product classification

- HS catalogue: 5,613 rows across 97 chapters.
- Approved listings with HS: 2 of 2.
- Public signals with HS: 0 of 3,517.
- Public signals with source category but no HS: 3,517.
- Invalid listing or signal HS values: 0.
- Active records in unassigned chapters 71/91/92: 0.

This proves the product-sector failure is structural. The current Explore bucketing requires an HS chapter, but every public signal lacks an HS code. Because every public signal has a source category, Phase E can evaluate deterministic source-category mapping before AI classification.

### Import integrity

The `g4wb_v2` batch contains 6,441 rows: 3,543 approved and 2,898 private. All have canonical id, source platform, source URL, import metadata and dedupe key.

The probe found zero:

- duplicate canonical-id groups;
- duplicate dedupe-key groups;
- duplicate investigation-request groups;
- investigation-count mismatches.

There are 294 older private rows outside the batch. They remain excluded from public reclassification until provenance and source-governance review.

### Verification and public eligibility

Production stores `profiles.verification_level` as a text enum: six `unverified`, one `company_verified`, one null. There is no passing verification with `purpose = member_business`; two such cases are in `review`.

The two approved/current listings therefore fail the bound passing member-business verification layer. The current exact Member Opportunity inventory under that contract is zero.

The application also converts the text verification enum with JavaScript `Number(...)` before a numeric threshold comparison. That comparison cannot encode the stored enum hierarchy and requires separate corrective work.

### RLS and policies

RLS is enabled on the relevant core tables. The signal table remains closed to public/member reads, and action records preserve owner/requester boundaries.

The authenticated approved-listing policy checks only `status = approved`. A Phase B/security review must inspect table grants and ensure direct authenticated reads cannot bypass validity, reconfirmation, owner eligibility or safe-column projections.

## Compatibility conclusions

1. Neither `listings` nor `desk_radar` persists `market_family`.
2. Neither source persists the seven canonical intents.
3. `record_origin` is truthfully separated by source table and must remain distinct.
4. Trade services has no stored production inventory.
5. Distribution has no canonical stored representation; one keyword candidate is not a classification.
6. Product signals cannot enter current HS-derived sectors.
7. Import provenance and duplicate protection are strong reusable foundations.
8. Member listing publication and Market Signal privacy controls should be adapted, not weakened or replaced.

## Validation result

| Requirement | Result |
|---|---|
| ExecPlan current | Complete |
| Repository audit | Complete |
| Compatibility matrix | Complete |
| SELECT-only production inspection | Complete |
| Exact counts and HS coverage | Complete |
| Provenance and duplicate checks | Complete |
| Drift and risks recorded | Complete |
| Runtime/database changes absent | Complete |
| CI and Netlify preview | Required on final PR head |
| Owner review before merge | Pending |

## Phase boundary

No migration is permitted by this plan. No production state was changed.

After owner acceptance, Phase B may design the smallest backwards-compatible application contract and adapters for family, origin, canonical intent, lifecycle normalisation and classification. Phase B must stop before migration.

Any later database or backfill proposal requires the pre-migration report in `docs/codex/DATABASE-STATE.md` and explicit owner approval.

## Progress log

### 26 July 2026

Completed:

- owner authorised Phase A;
- created the branch and draft PR;
- inspected the governing contract and relevant repository systems;
- created the compatibility matrix and risk register;
- prepared SELECT-only full and compact production probes;
- production probe executed by Giuseppe Funaro;
- reconciled schema, policies, counts, classification, provenance, duplicates and verification state;
- produced the final report;
- updated current state and active milestone;
- stopped before merge or implementation.

Remaining:

- final CI and Netlify checks on the latest head;
- owner review and merge decision for PR #44;
- explicit owner direction before Phase B begins.