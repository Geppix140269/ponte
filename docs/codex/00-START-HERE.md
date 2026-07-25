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

1. Master Product, Experience and Agentic Architecture v3 — product structure, object relationships, permissions, sequencing and acceptance.
2. Brand Book v5 / Final Brand System — identity, colour, typography, graphic language and assets.
3. Messaging and Screen Copy Pack — terminology, factual distinctions, prohibited claims and evidence language.
4. Existing engineering, lifecycle, security and production authorities in the repository.
5. Master Route Atlas and Screen Register — execution register beneath the product architecture.
6. This reconciled Codex layer — current implementation, deployment and roadmap status.

The long-form authority sources are being imported under `docs/ponte-authority/`. Until every source is present, `docs/codex/AUTHORITY-MANIFEST.md` records what is available and what remains to be copied.

## Current implementation headline

`main` already contains:

- Founding-launch integrity work, Blocks A-F.
- The cream/ink/gold “What’s your deal?” gateway.
- Journey 1: Find → separate Qualified Opportunities and Market Signals → Qualified Opportunity detail → controlled-introduction request.
- Journey 2: Structure & Submit, screens S01-S06, including facts/gaps, public/private/reviewer preview, account gate and submission.
- Production fixes for the Journey 1 signal import and Journey 2 seed.

The next planned target is not to rebuild Find or Structure. It is to reconcile deployment and then implement the next approved vertical slice from the architecture.

## Critical current truth

Code existing on `main` does not prove it is enabled or live. Find and Structure are controlled by public environment flags, and the currently served public root must be checked against the canonical repository before any production claim.

Read next:

1. `CURRENT-STATE.md`
2. `FEATURE-FLAGS.md`
3. `DATABASE-STATE.md`
4. `KNOWN-ISSUES.md`
5. `DECISION-LOG.md`
6. `DO-NOT-REOPEN.md`
7. `MASTER-ROADMAP.md`
8. `ACTIVE-MILESTONE.md`
9. `.agent/PLANS.md`

## Completion discipline

A feature is only **production-verified** when all of the following are recorded:

- code is on `main`;
- required database changes are confirmed;
- the production feature flag is confirmed;
- the deployed route is checked directly;
- the expected user journey is exercised;
- failures and limitations are written down.
