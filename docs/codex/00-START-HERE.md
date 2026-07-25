# Ponte Trade — start here

**Status date:** 25 July 2026  
**Repository:** `Geppix140269/ponte`  
**Canonical branch:** `main`  
**Canonical commit at reconciliation:** `9fa0aa63d82cdaa3f34251e8ca526677647680ff`

## Product definition

Ponte Trade is a commercial intelligence and controlled-execution layer for cross-border trade.

It helps a business state an objective, structure commercial facts, inspect distinct evidence classes, understand what matters, prepare the next action and proceed through controlled approval and disclosure.

Canonical brand line:

> Cross-border trade, with greater clarity.

Operating spine:

> Business identity → Commercial Mission → Observed evidence → Company-specific interpretation → Recommended action → Human approval where required → Execution → Recorded outcome → Better mission memory

## Authority order

When documents conflict, use this order:

0. `docs/ponte-authority/00-NORTH-STAR-ENTRY-ARCHITECTURE.md` — the current authority for the entry experience (landing, the two primary routes, Explore, market-activity presentation, Start a Deal entry). It supersedes all earlier landing, gateway and primary-entry instructions, including anything below that defines four primary routes, makes Qualified Opportunities the primary Explore result, or treats Market Signals as a secondary fallback.
1. `docs/ponte-authority/00-MASTER-IMPLEMENTATION-BRIEF.md` — the governing self-contained implementation authority for everything downstream of entry.
2. Live technical and legal constraints discovered through verified repository, production-schema or counsel evidence; report the conflict before changing direction.
3. The underlying long-form source authorities listed in `docs/codex/AUTHORITY-MANIFEST.md`, when present, for additional depth that does not conflict with the governing brief.
4. Existing engineering, lifecycle, security and production authorities in the repository.
5. This reconciled Codex layer — current implementation, deployment, decision and roadmap status.

The governing brief already consolidates the product architecture, Brand v5 rules, messaging and copy, route register, experience blueprints, technical boundaries, implementation sequence and acceptance suite. The remaining long-form sources are useful supporting authorities but are not required for the Phase 0 audit to begin.

## Current implementation headline

`main` already contains:

- Founding-launch integrity work, Blocks A-F.
- The cream/ink/gold “What’s your deal?” gateway. Its four-route form is superseded by the North Star entry architecture; the two-route entrance, the market activity band and `/explore` are on a branch awaiting owner review (PR 1).
- Journey 1: Find → separate Qualified Opportunities and Market Signals → Qualified Opportunity detail → controlled-introduction request.
- Journey 2: Structure & Submit, screens S01-S06, including facts/gaps, public/private/reviewer preview, account gate and submission.
- Production fixes for the Journey 1 signal import and Journey 2 seed.

The next planned target is not to rebuild Find or Structure. It is first to complete the Phase 0 repository-to-architecture gap report required by the governing brief, reconcile deployment and production enablement, and then obtain owner approval for the smallest truthful Phase 1 vertical slice.

## Critical current truth

Code existing on `main` does not prove it is enabled or live. Find and Structure are controlled by public environment flags, and the currently served public root must be checked against the canonical repository before any production claim.

Read next:

0. `docs/ponte-authority/00-NORTH-STAR-ENTRY-ARCHITECTURE.md`
1. `docs/ponte-authority/00-MASTER-IMPLEMENTATION-BRIEF.md`
2. `CURRENT-STATE.md`
3. `FEATURE-FLAGS.md`
4. `DATABASE-STATE.md`
5. `KNOWN-ISSUES.md`
6. `DECISION-LOG.md`
7. `DO-NOT-REOPEN.md`
8. `MASTER-ROADMAP.md`
9. `ACTIVE-MILESTONE.md`
10. `.agent/PLANS.md`

## Completion discipline

A feature is only **production-verified** when all of the following are recorded:

- code is on `main`;
- required database changes are confirmed;
- the production feature flag is confirmed;
- the deployed route is checked directly;
- the expected user journey is exercised;
- failures and limitations are written down.
