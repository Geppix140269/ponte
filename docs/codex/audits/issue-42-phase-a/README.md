# Issue 42 Phase A audit

This directory is the review package for the repository and production
reconciliation required before Ponte Trade changes its market-record model.

## Documents

- `COMPATIBILITY-MATRIX.md` - field-by-field mapping from the accepted unified
  market contract to the current repository.
- `REPOSITORY-RISK-FINDINGS.md` - high-risk contradictions found during the
  repository audit, separated from later implementation work.
- `PRODUCTION-PROBE.sql` - original SELECT-only production query set.
- `PRODUCTION-PROBE-COMPACT.sql` - SELECT-only one-result follow-up used for the
  complete production inspection.
- `PRODUCTION-PROBE-RESULTS-2026-07-26.md` - reconciled production evidence.
- `PHASE-A-FINAL-REPORT.md` - final audit verdict, production findings, risks and
  Phase B boundary.

The active execution plan is:

- `docs/plans/active/ISSUE-42-PHASE-A-MARKET-RECONCILIATION.md`

## Current boundary

Repository audit: complete for the systems named in Issue #42 Phase A.

Production reconciliation: complete for the market-record scope. Giuseppe
Funaro executed the compact SELECT-only probe in the Supabase production SQL
Editor at `2026-07-26T10:45:41.549418` UTC. The results have been reconciled in
the dated evidence file and final report.

No migration, runtime code change, data backfill, external source activation or
production write is included.

## Completion rule

Phase A is complete and ready for owner review.

This does not automatically authorise Phase B, a migration, source activation,
merge or deployment. Phase B may begin only after the owner accepts the audit
boundary and directs it.