# Active milestone - Issue 42 Phase A market reconciliation

**Authority:** `docs/decisions/ADR-0001-unified-trade-market.md`
**Issue:** #42
**ExecPlan:** `docs/plans/active/ISSUE-42-PHASE-A-MARKET-RECONCILIATION.md`
**Branch:** `issue-42/phase-a-audit`
**Status:** In progress; repository audit written, production probe pending.

## Objective

Reconcile the accepted three-family market contract against the current
repository and production database before any new schema, migration, ingestion
pipeline or composer implementation is proposed.

The accepted market has three equal families:

1. Products
2. Trade services
3. Distribution and representation

Each family contains externally observed Market Signals and member-created
Member Opportunities. Every future market record must have one family, one
origin and one family-valid intent.

## In scope

- Audit `listings`, `desk_radar`, `signal_investigations` and related tables.
- Audit member and signal public readers.
- Audit the unified activity model and count semantics.
- Audit Structure/Start a deal draft and submission payloads.
- Audit Explore family and product-sector classification.
- Audit publication, validity, reconfirmation, expiry, withdrawal and owner
  eligibility rules.
- Audit import mapping, provenance, source governance and deduplication.
- Deliver a field-by-field compatibility matrix to ADR-0001.
- Prepare and execute a SELECT-only production probe.
- Record exact live schema, counts, HS coverage and drift.
- Stop for owner review.

## Out of scope

- Runtime code changes.
- Database migrations or backfills.
- Production writes of any kind.
- Public UI, count or empty-state changes.
- New external source activation, API ingestion or web scraping.
- Phase B shared-contract design.
- Phase C member creation flows.
- Phase D external ingestion adapters.
- Phase E classification backfill.
- Phase F Explore and count convergence.
- Merge or deployment without owner approval.

## Definition of done

1. The ExecPlan exists and remains current.
2. The repository audit covers all systems named in Issue #42 Phase A.
3. The compatibility matrix maps every canonical family, origin, intent and core
   record field to current implementation evidence.
4. A read-only production probe records columns, types, constraints, indexes,
   triggers, functions, policies and RLS for the relevant tables.
5. Exact production counts and HS coverage are recorded with dated evidence.
6. Production drift is written down rather than silently corrected.
7. High-risk contradictions discovered during the audit are recorded.
8. No migration or runtime implementation is included.
9. `npm run verify` and the deploy preview pass.
10. The pull request remains unmerged until Giuseppe reviews it.

## Current findings

Repository-proven:

- `listings.type` supports only `offer`, `requirement` and `service`.
- `desk_radar.side` supports only `offer` and `requirement`.
- There is no current persisted Distribution and representation class.
- The existing service path does not distinguish seeking from offering.
- Services remain tied to the product/HS-shaped Structure draft.
- Imported product signals are deliberately written with no HS code.
- Product sector counts therefore cannot claim most imported signals.
- A signal capability declaration is an action, not a native Member Opportunity.
- The current member head count does not apply all row-level visibility rules.
- External provenance storage is useful, but source terms and removal governance
  are not complete in a central source register.
- The repository contains a verification-level type mismatch: the seed script
  writes a text enum while public eligibility code performs a numeric conversion.

Production-proven findings: none yet in this phase.

## Required evidence still pending

Run and retain the output of:

`docs/codex/audits/issue-42-phase-a/PRODUCTION-PROBE.sql`

The execution record must state project, date/time, executor and database role.
If a query fails because production differs from the repository, record the
failure as drift and stop before changing the database.

## Completion boundary

Phase A completion authorises no implementation by itself. After the audit is
accepted, Phase B may propose the smallest backwards-compatible shared record
contract. Any migration remains a separate owner-approved step subject to the
pre-migration report in `docs/codex/DATABASE-STATE.md`.

---

## Completed milestone history

### Source-of-truth governance and unified logical contract

PR #41 merged the repository operating procedure, ADR-0001, canonical taxonomy,
logical schemas, cross-agent entry points and governance checks.

### North Star entry architecture

PRs #36-40 delivered the two-route entrance, market activity, Explore shell,
Flow taxonomy integration, count corrections and composer refinements. The
remaining inventory and classification defects are now governed by Issue #42.
