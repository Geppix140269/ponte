# Issue 42 Phase A audit

This directory is the review package for the repository and production
reconciliation required before Ponte Trade changes its market-record model.

## Documents

- `COMPATIBILITY-MATRIX.md` - field-by-field mapping from the accepted unified
  market contract to the current repository.
- `REPOSITORY-RISK-FINDINGS.md` - high-risk contradictions found during the
  repository audit, separated from later implementation work.
- `PRODUCTION-PROBE.sql` - SELECT-only production queries for current schema,
  RLS, policies, lifecycle values, counts, HS coverage, provenance and drift.

The active execution plan is:

- `docs/plans/active/ISSUE-42-PHASE-A-MARKET-RECONCILIATION.md`

## Current boundary

Repository audit: complete for the systems named in Issue #42 Phase A.

Production probe: not executed in this session because no authorised production
database connection is available.

No migration, runtime code change, data backfill, external source activation or
production write is included.

## Completion rule

Phase A remains in progress until one of the following occurs:

1. the production probe is executed and its dated output is reconciled here; or
2. Giuseppe explicitly accepts a repository-only audit and defers production
   evidence.

Neither outcome automatically authorises Phase B or a migration.
