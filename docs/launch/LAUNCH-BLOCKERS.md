# Ponte Trade Launch Blockers

**Mode:** Launch Mode is active until the repository owner explicitly closes it.

This is the canonical register of unresolved issues that prevent a safe launch. An item belongs here only when it blocks a core user journey, prevents production build or deployment, creates an active material security or data-integrity risk, causes a fail-open control, or creates an immediate legal/compliance barrier.

Discovery alone does not make an issue a blocker. The repository owner has final classification authority.

## Active blockers

| ID | Title | Discovered | Core journey or system | Evidence | Owner | Status | Resolution PR | Verification |
|---|---|---|---|---|---|---|---|---|
| LB-001 | No launch-usable Deal Room progression loop exists | 2026-07-29 | PROGRESS: the downstream journey after credible commercial interest | Classified as a Launch Blocker by the repository owner in issue #97. Verified on `main` at `0318615`: no Deal Room route, component, service or type existed, and no code referenced the Deal Room-era database cluster. A member who reached credible commercial interest had nowhere to go inside Ponte, so the core journey could not be completed at all. Preflight: `docs/codex/audits/2026-07-29-deal-room-preflight.md` | Giuseppe Funaro | Open - Gate B merged to `main` at `42a9d22` on 29 July 2026 with technical and design approval. **The blocker stays open until Gate C production verification**, because nothing is reachable yet: the three migrations are executed nowhere, the Storage bucket does not exist, `NEXT_PUBLIC_DEAL_ROOM` is unset and nothing is deployed | #98 | Partial. `npm run verify` passes end to end (criterion 19); 319 assertions across eleven Deal Room suites cover the family-correct procedure, the no-percentage-before-approval rule, the 22% baseline and the reversion case, the admission gate, read-only continuity, the four Ponte Integrity prohibitions, the invitation preview allowlist, the shipped agreement checksums and the RLS policy contract. Visual evidence **captured** 29 July 2026: 17 frames in `docs/codex/audits/deal-room/evidence/`, all 20 checks passing twice in succession, design approval granted on the four representative frames. **Outstanding:** the executable negative-access fixture (`npm run deal-room:negative-access`), which needs the schema applied, and the read-only production checks in `docs/codex/audits/deal-room/GATE-C-TEST-PLAN.md`. Both are Gate C. |

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
