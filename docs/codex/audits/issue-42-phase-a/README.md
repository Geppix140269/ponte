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
- `PRODUCTION-PROBE-RESULTS-2026-07-26.md` - dated production evidence supplied
  from the Supabase SQL Editor. The first recorded result is the Section 15
  summary count output; the remaining probe result sets are still required.

The active execution plan is:

- `docs/plans/active/ISSUE-42-PHASE-A-MARKET-RECONCILIATION.md`

## Current boundary

Repository audit: complete for the systems named in Issue #42 Phase A.

Production probe: partially executed by Giuseppe Funaro in the Supabase
production SQL Editor. The recorded summary result proves 3,517 public Market
Signals, 2 approved and currently reconfirmed listings before owner eligibility,
0 approved legacy service listings, and 0 public Market Signals with an HS code.
The remaining schema, policy, provenance, duplicate, classification and drift
result sets have not yet been recorded.

No migration, runtime code change, data backfill, external source activation or
production write is included.

## Completion rule

Phase A remains in progress until one of the following occurs:

1. the remaining production probe outputs are executed and their dated results
   are reconciled here; or
2. Giuseppe explicitly accepts the partial production evidence and defers the
   remaining live inspection.

Neither outcome automatically authorises Phase B or a migration.