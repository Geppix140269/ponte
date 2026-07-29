# Ponte Trade Launch Blockers

**Mode:** Launch Mode is active until the repository owner explicitly closes it.

This is the canonical register of unresolved issues that prevent a safe launch. An item belongs here only when it blocks a core user journey, prevents production build or deployment, creates an active material security or data-integrity risk, causes a fail-open control, or creates an immediate legal/compliance barrier.

Discovery alone does not make an issue a blocker. The repository owner has final classification authority.

## Active blockers

| ID | Title | Discovered | Core journey or system | Evidence | Owner | Status | Resolution PR | Verification |
|---|---|---|---|---|---|---|---|---|
| LB-001 | No launch-usable Deal Room progression loop exists | 2026-07-29 | PROGRESS: the downstream journey after credible commercial interest | Classified as a Launch Blocker by the repository owner in issue #97. Verified on `main` at `0318615`: no Deal Room route, component, service or type exists, and no code references the Deal Room-era database cluster. A member who reaches credible commercial interest has nowhere to go inside Ponte, so the core journey cannot be completed at all. Preflight: `docs/codex/audits/2026-07-29-deal-room-preflight.md` | Giuseppe Funaro | Open - Gate B implementation complete on `agent/deal-room-launch-slice`, awaiting owner review before merge | — | Partial. `npm run verify` passes end to end (criterion 19). 280 assertions cover the family-correct procedure, the no-percentage-before-approval rule, the 22% baseline and the reversion case, the admission gate, read-only continuity, the four Ponte Integrity prohibitions, the invitation preview allowlist and the RLS policy contract. **Outstanding:** desktop and 390 x 844 visual evidence, blocked by the temporary site access wall (harness and spec committed, unrun); and the live negative-access tests, which need the schema applied at Gate C. The blocker closes only after Gate C production verification. |
| LB-002 | Required form and input boundaries are too faint to identify reliably | 29 July 2026 | Start a Deal (`/[locale]/structure`), and every form surface sharing the tokens | Input boundaries measure approximately **1.52:1** against the page ground, against the 3:1 WCAG 1.4.11 minimum for the boundary of a user-interface component. Measured across `.qfield__i`, `.snote`, `.sigsheet__i` and `.vcp__input`. Audit section 6, row 9 | Giuseppe Funaro | OPEN | Not started — Stage 1 of ADR-0015 | Pending |
| LB-003 | Meaningful missing-data text is too faint, risking a misread commercial fact | 29 July 2026 | Market Signals list and detail, Find, Workspace, and every record surface | `Not stated` and equivalent missing-data text render in `--pf-mute` (`#9A958A`) at **2.98:1** on white and **2.59:1** in the sunken well, against the 4.5:1 WCAG 1.4.3 minimum, at 9 to 11px. 27 call sites. Audit section 6, row 6 | Giuseppe Funaro | OPEN | Not started — Stage 1 of ADR-0015 | Pending |

## Resolved blockers

Move resolved items here; do not delete their history.

| ID | Title | Resolved | Resolution PR | Production evidence |
|---|---|---|---|---|
| — | None recorded | — | — | — |

### Notes on LB-002 and LB-003

LB-002 and LB-003 are both contrast defects, and both are duties the Design Constitution already
imposed: section 13 requires input, error, disabled, pending and success states to
be designed, and section 14 requires a record to show only facts it supports, with
missing facts reading `Not stated`. Neither is a new requirement, only an unmet
one.

They are blockers rather than polish because each risks a wrong commercial read
rather than an aesthetic complaint. A member who cannot see a required field may
not complete it; a member who cannot read `Not stated` may take an absent fact for
a stated one.

The minimum work that removes both is the re-point of `--pf-mute` and
`--pf-rule-strong`, which is two values. Stage 1 of ADR-0015 does more than the
minimum, deliberately: a partial token change would leave two palettes on one page.
That widening is owner-approved in ADR-0015 and is not an agent decision.

The 11px mobile structural-caption floor is part of the same launch remediation,
per the owner's decision of 29 July 2026, and is not tracked as a separate item.

## Required handling

1. Record a blocker before implementation begins, or in the same commit that begins the fix.
2. Keep the fix limited to the minimum work required to remove the blocker.
3. Log all non-blocking findings in `POST-LAUNCH-BACKLOG.md` instead of expanding scope.
4. Record production changes in `docs/operations/OPERATIONS_LOG.md`.
5. Move the item to Resolved only after verification evidence exists.
