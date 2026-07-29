# Ponte Trade Launch Blockers

**Mode:** Launch Mode is active until the repository owner explicitly closes it.

This is the canonical register of unresolved issues that prevent a safe launch. An item belongs here only when it blocks a core user journey, prevents production build or deployment, creates an active material security or data-integrity risk, causes a fail-open control, or creates an immediate legal/compliance barrier.

Discovery alone does not make an issue a blocker. The repository owner has final classification authority.

## Active blockers

| ID | Title | Discovered | Core journey or system | Evidence | Owner | Status | Resolution PR | Verification |
|---|---|---|---|---|---|---|---|---|
| LB-001 | No launch-usable Deal Room progression loop exists | 2026-07-29 | PROGRESS: the downstream journey after credible commercial interest | Classified as a Launch Blocker by the repository owner in issue #97. Verified on `main` at `0318615`: no Deal Room route, component, service or type exists, and no code references the Deal Room-era database cluster. A member who reaches credible commercial interest has nowhere to go inside Ponte, so the core journey cannot be completed at all. Preflight: `docs/codex/audits/2026-07-29-deal-room-preflight.md` | Giuseppe Funaro | Open - Gate B implementation complete on `agent/deal-room-launch-slice`, awaiting owner review before merge | — | Partial. `npm run verify` passes end to end (criterion 19). 280 assertions cover the family-correct procedure, the no-percentage-before-approval rule, the 22% baseline and the reversion case, the admission gate, read-only continuity, the four Ponte Integrity prohibitions, the invitation preview allowlist and the RLS policy contract. **Outstanding:** desktop and 390 x 844 visual evidence, blocked by the temporary site access wall (harness and spec committed, unrun); and the live negative-access tests, which need the schema applied at Gate C. The blocker closes only after Gate C production verification. |

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
