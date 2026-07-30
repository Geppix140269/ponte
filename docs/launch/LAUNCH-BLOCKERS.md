# Ponte Trade Launch Blockers

**Mode:** Launch Mode is active until the repository owner explicitly closes it.

This is the canonical register of unresolved issues that prevent a safe launch. An item belongs here only when it blocks a core user journey, prevents production build or deployment, creates an active material security or data-integrity risk, causes a fail-open control, or creates an immediate legal/compliance barrier.

Discovery alone does not make an issue a blocker. The repository owner has final classification authority.

## Active blockers

| ID | Title | Discovered | Core journey or system | Evidence | Owner | Status | Resolution PR | Verification |
|---|---|---|---|---|---|---|---|---|
| LB-001 | No launch-usable Deal Room progression loop exists | 2026-07-29 | PROGRESS: the downstream journey after credible commercial interest | Classified as a Launch Blocker by the repository owner in issue #97. Verified on `main` at `0318615`: no Deal Room route, component, service or type existed, and no code referenced the Deal Room-era database cluster. A member who reached credible commercial interest had nowhere to go inside Ponte, so the core journey could not be completed at all. Preflight: `docs/codex/audits/2026-07-29-deal-room-preflight.md` | Giuseppe Funaro | Open - Gate B merged to `main` at `42a9d22` on 29 July 2026 with technical and design approval. **The blocker stays open until Gate C production verification**, because nothing is reachable yet: the three migrations are executed nowhere, the Storage bucket does not exist, `NEXT_PUBLIC_DEAL_ROOM` is unset and nothing is deployed | #98 | Partial. `npm run verify` passes end to end (criterion 19); 319 assertions across eleven Deal Room suites cover the family-correct procedure, the no-percentage-before-approval rule, the 22% baseline and the reversion case, the admission gate, read-only continuity, the four Ponte Integrity prohibitions, the invitation preview allowlist, the shipped agreement checksums and the RLS policy contract. Visual evidence **captured** 29 July 2026: 17 frames in `docs/codex/audits/deal-room/evidence/`, all 20 checks passing twice in succession, design approval granted on the four representative frames. **Outstanding:** the executable negative-access fixture (`npm run deal-room:negative-access`), which needs the schema applied, and the read-only production checks in `docs/codex/audits/deal-room/GATE-C-TEST-PLAN.md`. Both are Gate C. |
| LB-004 | The Deal Room Integrity pre-flight reads a `verifications` column production does not have | 2026-07-29 | PROGRESS: the protected invitation, and the Ponte Integrity statement shown to an invitee | `app/[locale]/deal-rooms/[roomId]/invitation/page.tsx:71` selects `type` from `verifications`. Production has 24 columns on that table and `type` is not one of them; every other reader in the codebase selects `purpose` for the same purpose. PostgREST refuses an unknown column, so `evidenceRows` is null, `rows` is `[]`, and "What Ponte has checked" renders "Nothing has been checked against an external source" for every member including a fully verified one. Same defect class as the `profile_id`/`user_id` error the first owner review caught in this file: the filter was corrected, the select list was not re-checked against production. Not detectable locally - there is no non-production database (PL-002). Evidence: `docs/codex/audits/deal-room/GATE-C-PREFLIGHT-2026-07-29.md` section 2 | Repository owner | **Classified a Launch Blocker by the owner on 29 July 2026, and fixed on this branch.** It was never a fail-open - the band under-reported rather than over-reported, and the sanctions gate is inside `deal_room_invite()`, which reads `sanctions_hits` directly - but it made a named acceptance criterion of #97 inert on first activation. The select list is now the exported constant `VERIFICATION_EVIDENCE_COLUMNS` in `lib/deal-room/integrity.ts`, naming `purpose`, and the `kind:` mapping reads `row.purpose`. Nothing else about verification was touched | #105 | **Resolved.** `lib/deal-room/__tests__/integrity.test.ts` gains three checks: every column the constant names exists in `VERIFICATIONS_COLUMNS`, which is the production table as the Gate C preflight observed it; the constant asks for `purpose` and never for `type`; and the surface selects through the constant rather than its own literal, still maps `row.purpose`, and no longer mentions `row.type`. Proved to catch the defect by reintroducing it - two assertions failed naming the column. 30 assertions in that suite, `npm run verify` exit 0. Found by the Gate C production preflight, before any SQL was applied. |
| LB-005 | `20260729b_deal_room_rls.sql` cannot be applied: it grants execute on a `deal_room_invite` signature it has itself dropped | 2026-07-30 | PROGRESS: the whole Deal Room permission boundary. Every RLS policy and all 21 command functions are in this file | Postgres refused the file and rolled it back: `ERROR: 42883: function public.deal_room_invite(uuid, text, text, text, timestamp with time zone) does not exist`. The owner's final trust review took `deal_room_invite()` from five arguments to three by removing `p_role` and `p_class`, and dropped the superseded overload; the `grant execute` block at line 1709 was never updated, so the file grants on a signature it drops. Every grant line was audited against its declared signature programmatically: 21 functions declared, exactly one broken grant, no other arity disagrees. Nothing caught it - `rls-contract.test.ts` scans the file as text for command names and member write policies, and does not compare grant signatures against the functions the same file declares. Evidence: `docs/codex/audits/deal-room/GATE-C-APPROVAL-1-2026-07-30.md` section 3.2 | Repository owner | **Corrected in the repository on 30 July 2026 under owner authorisation; NOT yet applied.** The grant now names `(uuid, text, timestamptz)`, which is what the file declares - one line, one insertion, one deletion, nothing else in the file changed. The file's new SHA-256 is `b379f869f320e6ea36bdb00e07555079adf6373ff14848d20633afb6cfea3153`, recorded in `DATABASE-STATE.md` and in the Gate C preflight checksum table. Production consequence unchanged meanwhile: 15 Deal Room tables with RLS enabled and **zero policies**, so every table returns zero rows and refuses every write - fail-closed, and the Deal Room is unreachable. **Applying the corrected file is a separate owner instruction and has not been given** | #110 | **Repository fix verified; production fix outstanding.** `lib/deal-room/__tests__/grant-signatures.test.ts` compares every `grant execute` signature in the migration against the function the same file declares, refuses any signature the file drops, and pins `deal_room_invite` to its three-argument form. Demonstrated in both directions: three assertions fail against the stale grant, naming file and line, and all six pass after the correction. **The grant-signature regression suite passes.** All task-relevant checks pass: `npm test` exit 0 across 64 suites, `tsc --noEmit` clean, `check-encoding`, `check-launch-mode`, `check-migrations`, `check-contrast` and `check-token-adoption`. **Full `npm run verify` remains blocked by the pre-existing LB-006 failure on `main`** - `check-bridge-invariance.mjs`, which fails identically on a clean `origin/main` checkout and is not this branch's to fix. The blocker closes when the corrected `20260729b` is applied and verified against `GATE-C-TEST-PLAN.md` sections 4.1 to 4.4. |
| LB-006 | `check-bridge-invariance.mjs` fails on `main`, so `npm run verify` cannot pass for any task | 2026-07-30 | Required validation gate; the Bridge System and ADR-0015 contrast remediation | `node scripts/check-bridge-invariance.mjs` reports 4 problems on a clean checkout of `origin/main` at `7419872`, before any branch work: `.br__deck .d-track`, `.brst__p`, `.br--chosen .brst:not(.brst--on) .brst__p` and `.brdp__p` were "NOT changed. ADR-0015 section S-3 requires its contrast to be corrected." The check was introduced by the contrast remediation and expects corrections that have not landed yet, so it asserts a state the repository has not reached. It is a step of `npm run verify`, so the mandatory gate cannot complete for ANY task until it is resolved. Verified pre-existing by stashing the LB-005 branch, checking out `origin/main` content and re-running: identical 4 problems, so it is not caused by the Deal Room work. **CI does not contradict this, and the reason matters:** the GitHub Actions job named `verify` does not run `npm run verify`. It runs a narrower subset - secret and env scans, `check-messages`, `check-encoding`, messages-in-sync, `npm test`, `tsc --noEmit`, `next build`. `check-deps`, `check-migrations`, `check-governance`, `check-launch-mode`, `check-contrast`, `check-token-adoption`, `check-bridge-invariance` and `guard.mjs` are in the mandatory local gate and in no CI job, so a green tick does not mean the gate passed | Repository owner | **Open - not this branch's to fix.** It belongs to the ADR-0015 contrast workstream: either land the four S-3 corrections, or narrow the check to what has been decided. Both are decisions about an accepted design authority, not agent edits. Discovered while running `npm run verify` for the LB-005 correction | — | Not resolved. The LB-005 branch is green on everything else: `npm test` exit 0 across 64 suites, `tsc --noEmit` clean, `check-encoding`, `check-launch-mode`, `check-migrations`, contrast and token-adoption checks all pass. |

## Resolved blockers

Move resolved items here; do not delete their history.

| ID | Title | Resolved | Resolution PR | Production evidence |
|---|---|---|---|---|
| LB-002 | Required form and input boundaries are too faint to identify reliably | 30 July 2026 | #104 | **Closed by the repository owner on 30 July 2026**, on rendered evidence plus an owner read-through of the PR #104 deploy preview on desktop and mobile with one Start a Deal journey completed end to end. All four criteria of ExecPlan section 11.1 are met: criteria 1 to 3 by measurement, criterion 4 by that read-through. Worst-case boundary contrast **3.63:1** against the 3:1 of WCAG 1.4.11, across `.qfield__i`, `.snote`, `.sigsheet__i` and `.vcp__input`, each reached by a written-down journey and asserted present, at desktop and 390 x 844, in neutral and focus, plus one disabled control. Measured against BOTH adjacent colours (page ground and the control's own fill) with `getComputedStyle` on a rendered page, not from the token file. 18 measurements, none below target. Evidence: `e2e/evidence/stage1/blockers/`; suite `e2e/stage1-blockers.spec.ts`. Remediation lands on `main` when #104 is merged on the owner's instruction |
| LB-003 | Meaningful missing-data text is too faint, risking a misread commercial fact | 30 July 2026 | #104 | **Closed by the repository owner on 30 July 2026**, on the same rendered evidence and read-through. `Not stated` measures **6.25:1** on the white raised card and **4.52:1** in the sunken well (reached by hovering a register row, the state a member is in while reading down a register), against the 4.5:1 of WCAG 1.4.3, on the landing fact block, the Market Signals register and a signal's detail facts, at both viewports. 8 measurements, none below target. The page ground carries no rendered instance on any surface reachable without a member session; its 5.45:1 is recorded as computed, not as rendered evidence. Greyscale: missing versus stated is a **3.07:1 lightness** difference, so the distinction is not hue-alone (Constitution section 6). Remediation lands on `main` when #104 is merged on the owner's instruction |

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

#### How they were closed, and what "closed" means here

Closed by the owner on 30 July 2026. Two things had to be true, and the second could
not be supplied by an agent.

**The measurements.** ADR-0015 section S-5 forbade closing either from token
calculations alone. The first attempt at rendered evidence reported nothing, because
it reused the screen-level contrast spec whose selectors matched no elements: all
four LB-002 inputs sit several steps into a journey, and an empty sample reads
exactly like a pass. `e2e/stage1-blockers.spec.ts` reaches each one by a
written-down journey and asserts it present, so the suite fails rather than
reporting closure on nothing.

**The read-through.** ExecPlan section 11.1 criterion 4 is a judgement, not a
number: no regression in factual hierarchy or task completion, including a Start a
Deal submission completed end to end. The owner reviewed the PR #104 deploy preview
on desktop and mobile and completed one journey, and approved the increased
contrast, the surface and field separation, the readability of secondary and
missing-data text, the preservation of the warm Ponte identity and the weight of the
stronger rules.

These are recorded as resolved on the owner's decision. The remediation itself
reaches `main` when #104 is merged, which is a separate instruction the owner has
not yet given.

## Required handling

1. Record a blocker before implementation begins, or in the same commit that begins the fix.
2. Keep the fix limited to the minimum work required to remove the blocker.
3. Log all non-blocking findings in `POST-LAUNCH-BACKLOG.md` instead of expanding scope.
4. Record production changes in `docs/operations/OPERATIONS_LOG.md`.
5. Move the item to Resolved only after verification evidence exists.
