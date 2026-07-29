# Ponte Trade Launch Blockers

**Mode:** Launch Mode is active until the repository owner explicitly closes it.

This is the canonical register of unresolved issues that prevent a safe launch. An item belongs here only when it blocks a core user journey, prevents production build or deployment, creates an active material security or data-integrity risk, causes a fail-open control, or creates an immediate legal/compliance barrier.

Discovery alone does not make an issue a blocker. The repository owner has final classification authority.

## Active blockers

| ID | Title | Discovered | Core journey or system | Evidence | Owner | Status | Resolution PR | Verification |
|---|---|---|---|---|---|---|---|---|
| LB-002 | `check-launch-mode` cannot find a required sentence that AGENTS.md wraps across a newline | 2026-07-29 | Required validation gate; Launch Mode governance | Reproduced on a pristine checkout of `origin/main` (`6b6c85a`), exit 1: "AGENTS.md is missing required text: No additional cleanup, refactoring or adjacent improvement is authorised". The sentence IS present, at `AGENTS.md:128-129`; the file wraps it after "cleanup," so the literal `includes()` in `scripts/check-launch-mode.mjs` did not match. Sixth step of `npm run verify`, so the mandatory gate could not complete for any task | Repository owner | **Fix prepared, not merged.** `requireText` now compares whitespace-normalised text, so the check asserts that the sentence is present rather than how the file is wrapped. AGENTS.md itself is unchanged. Verified: passes on this branch (exit 0), and a negative control with the sentence deleted still fails (exit 1). `main` remains red until this merges | `claude/family-procedure-followup-clean` (draft) | Passes on branch; not yet on `main` |
| LB-001 | Two migrations shared the `20260728d` identifier, and `npm run verify` failed on `main` | 2026-07-29 | Required validation gate; migration ledger | Reproduced on a pristine checkout of `origin/main` (`6b6c85a`): `migration identifier "20260728d" is used by 2 files: 20260728d_family_commercial_terms.sql, 20260728d_verification_level_canonical.sql`. Fourth step of `npm run verify`. Two pull requests each merged a migration claiming the identifier | Repository owner | **Fix prepared, not merged.** The UNAPPLIED file was renamed to `20260728e_family_commercial_terms.sql` and all five references updated. `20260728d_verification_level_canonical.sql` was deliberately NOT touched: it is applied to production and recorded in `schema_migrations` with a SHA-256 matching it byte for byte, so renaming it would desynchronise the ledger. The renamed migration remains unapplied. Verified: `check-migrations.mjs` exits 0 | `claude/family-procedure-followup-clean` (draft) | Checker passes on branch; not yet on `main` |

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
