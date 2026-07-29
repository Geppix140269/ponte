# Ponte Trade Launch Blockers

**Mode:** Launch Mode is active until the repository owner explicitly closes it.

This is the canonical register of unresolved issues that prevent a safe launch. An item belongs here only when it blocks a core user journey, prevents production build or deployment, creates an active material security or data-integrity risk, causes a fail-open control, or creates an immediate legal/compliance barrier.

Discovery alone does not make an issue a blocker. The repository owner has final classification authority.

## Active blockers

| ID | Title | Discovered | Core journey or system | Evidence | Owner | Status | Resolution PR | Verification |
|---|---|---|---|---|---|---|---|---|
| LB-002 | `check-launch-mode` cannot find a required sentence that AGENTS.md wraps across a newline | 2026-07-29 | Required validation gate; Launch Mode governance | `node scripts/check-launch-mode.mjs` fails on a clean checkout of `origin/main` (`0318615`): "AGENTS.md is missing required text: No additional cleanup, refactoring or adjacent improvement is authorised". The sentence IS present, at `AGENTS.md:128-129`, but the file wraps it after "cleanup," so the checker's literal `includes()` at `scripts/check-launch-mode.mjs:35` does not match. It is the sixth step of `npm run verify`. Fixing it means either reflowing a line of the top governance authority or making the checker whitespace-insensitive; both are owner decisions about a governance document, not agent edits | Repository owner | Open — needs an owner decision, not an agent one | — | Not resolved |
| LB-001 | Two migrations share the `20260728d` identifier, and `npm run verify` fails on `main` | 2026-07-29 | Required validation gate; migration ledger | `node scripts/check-migrations.mjs` fails on a clean checkout of `origin/main` (`0318615`), before any branch work: `migration identifier "20260728d" is used by 2 files: 20260728d_family_commercial_terms.sql, 20260728d_verification_level_canonical.sql`. It is the fourth step of `npm run verify`, so the mandatory gate cannot complete for ANY task until this is resolved. Two pull requests each added a `20260728d_*` migration and both merged. The check's own rationale is the hazard: the ledger entry and any operator instruction become ambiguous about which file is meant, and one of the two is unapplied and awaiting owner approval | Repository owner | Open — needs an owner decision, not an agent one | — | Not resolved |

## Resolved blockers

Move resolved items here; do not delete their history.

| ID | Title | Resolved | Resolution PR | Production evidence |
|---|---|---|---|---|
| — | None recorded | — | — | — |

## Required handling

1. Record a blocker before implementation begins, or in the same commit that begins the fix.
2. Keep the fix limited to the minimum work required to remove the blocker.
3. Log all non-blocking findings in `POST-LAUNCH-BACKLOG.md` instead of expanding scope.
4. Record production changes in `docs/operations/OPERATIONS_LOG.md`.
5. Move the item to Resolved only after verification evidence exists.
