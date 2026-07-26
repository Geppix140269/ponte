# Active milestone - Issue 42 Phase A market reconciliation

**Authority:** `docs/decisions/ADR-0001-unified-trade-market.md`  
**Issue:** #42  
**ExecPlan:** `docs/plans/active/ISSUE-42-PHASE-A-MARKET-RECONCILIATION.md`  
**Branch:** `issue-42/phase-a-audit`  
**Status:** Complete; ready for owner review in PR #44.

## Objective

Reconcile the accepted three-family market contract against the current repository and production database before any new schema, migration, ingestion pipeline or composer implementation is proposed.

The accepted market has three equal families:

1. Products
2. Trade services
3. Distribution and representation

Each family contains externally observed Market Signals and member-created Member Opportunities. Every future market record must have one family, one origin and one family-valid intent.

## Completed scope

- Audited `listings`, `desk_radar`, `signal_investigations` and related tables.
- Audited member and signal public readers.
- Audited unified activity and count semantics.
- Audited Structure/Start a deal draft and submission payloads.
- Audited Explore family and product-sector classification.
- Audited publication, validity, reconfirmation, expiry, withdrawal and owner eligibility.
- Audited import mapping, provenance and deduplication.
- Delivered the field-by-field compatibility matrix.
- Executed the SELECT-only production probe through the Supabase production SQL Editor.
- Recorded exact production schema, constraints, RLS/policies, counts, HS coverage, provenance and drift.
- Produced `PHASE-A-FINAL-REPORT.md`.
- Stopped before migration, runtime implementation, merge or deployment.

## Definition of done

| Requirement | Result |
|---|---|
| ExecPlan current | Complete |
| Repository audit | Complete |
| Compatibility matrix | Complete |
| Production columns/types/constraints/indexes/triggers/functions/policies/RLS | Complete for Issue #42 scope |
| Exact counts and HS coverage | Complete |
| Drift and risks recorded | Complete |
| Migration/runtime changes absent | Complete |
| CI and deploy preview | Must pass on final PR head |
| Owner review before merge | Pending |

## Production-proven findings

- 6,735 total Market Signal rows.
- 3,543 rows stored as `approved_signal`; 3,517 remain approved and unexpired.
- 2,526 active public requirements and 991 active public offers.
- 4 total listings; 2 approved/current and desk-managed.
- 0 approved/current listings have a bound passing member-business verification.
- 0 legacy service listing rows exist.
- 3,517 of 3,517 public signals have no HS code, while all 3,517 have a source category.
- 2 of 2 approved listings have valid HS codes.
- 6,441 `g4wb_v2` rows have complete canonical id, source URL, import metadata and dedupe key.
- No duplicate identity groups or investigation-count mismatches were found.
- One signal matched distribution-related keywords, but keyword matching is not canonical classification.
- Production stores `profiles.verification_level` as a text enum while the application performs a numeric conversion/threshold.
- The authenticated approved-listing RLS row condition does not encode validity, reconfirmation or owner eligibility; grants require a targeted security review.

## Out of scope and still prohibited

- Runtime code changes.
- Database migrations or backfills.
- Production writes.
- UI, count or empty-state changes.
- External source activation or scraping.
- Phase B contract implementation.
- Merge or deployment without owner approval.

## Completion boundary

Phase A completion authorises no production change. After Giuseppe accepts and merges PR #44, Phase B may design the smallest backwards-compatible application contract and adapters. Phase B must not apply a database migration. Any later migration requires the pre-migration report in `docs/codex/DATABASE-STATE.md` and explicit owner approval.

---

## Completed milestone history

### Source-of-truth governance and unified logical contract

PR #41 merged the repository operating procedure, ADR-0001, canonical taxonomy, logical schemas, cross-agent entry points and governance checks.

### North Star entry architecture

PRs #36-40 delivered the two-route entrance, market activity, Explore shell, Flow taxonomy integration, count corrections and composer refinements.