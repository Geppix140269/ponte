# Active milestone — Codex onboarding and reconciliation

## Objective

Make the repository self-contained enough for Codex to understand the product, current implementation, production constraints and roadmap before changing application behaviour.

## In scope

- Add repository agent instructions.
- Add current-state, feature-flag, database and decision records.
- Import the long-form product authorities under `docs/ponte-authority/`.
- Audit `main`, routes, services, migrations, CI, hosting assumptions and production enablement.
- Identify stale or contradictory repository documentation.
- Recommend the next implementation milestone with evidence.

## Out of scope

- No product UI or behaviour changes.
- No database migration.
- No production deployment or feature-flag change.
- No secret access or rotation.
- No global Brand v5 repaint.

## Definition of done

1. `AGENTS.md` and this Codex layer are merged.
2. All authority files in `AUTHORITY-MANIFEST.md` are present or explicitly marked unavailable.
3. Codex produces `docs/codex/CODEX-ONBOARDING-AUDIT.md`.
4. The audit distinguishes code on `main`, deployed code, enabled flags and production-tested behaviour.
5. The production host/project mismatch is resolved or documented with an owner action.
6. The owner approves the next milestone.

## Codex audit instruction

Read `AGENTS.md` and every file linked from `docs/codex/00-START-HERE.md`. Inspect the current `main`, recent merged PRs, routes, components, APIs, database-facing services, migrations, CI workflows, deployment configuration, localisation and tests.

Create `docs/codex/CODEX-ONBOARDING-AUDIT.md` containing:

- current product and engineering state;
- what is on `main`;
- what is deployed and enabled;
- incomplete or obsolete surfaces;
- contradictions and stale documents;
- database or migration inconsistencies;
- security, privacy and production risks;
- missing acceptance tests;
- exact recommended next milestone;
- owner decisions genuinely required.

Do not implement application behaviour. Run `npm run verify` and record the exact result.
