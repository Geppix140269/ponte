# Ponte Trade — start here

**Status date:** 26 July 2026  
**Repository:** `Geppix140269/ponte`  
**Canonical branch:** `main`  
**Canonical commit before this governance proposal:** `6c18af51b907b57d1a063ad51cfdb451e112ad03`

## Product definition

Ponte Trade is a commercial intelligence and controlled-execution layer for cross-border trade.

It helps a business state an objective, structure commercial facts, inspect distinct evidence classes, understand what matters, prepare the next action and proceed through controlled approval and disclosure.

Canonical brand line:

> Cross-border trade, with greater clarity.

Operating spine:

> Business identity → Commercial Mission → Observed evidence → Company-specific interpretation → Recommended action → Human approval where required → Execution → Recorded outcome → Better mission memory

Ponte Trade's market is organised around three equal primary families —
Products, Trade services, and Distribution and representation — with externally
observed Market Signals and member-created Member Opportunities available in
each. See ADR-0001 and the canonical taxonomy.

## Operating procedure

`docs/codex/SOURCE-OF-TRUTH-SOP.md` governs how ideas from ChatGPT, Codex,
Claude, humans, research and meetings become proposals, accepted decisions,
implementation and recorded current state.

Conversations are workshops. The merged repository is the operating memory.

## Authority order

When documents conflict, use this order:

0. A later owner-accepted ADR in `docs/decisions/` that explicitly supersedes a
   named earlier decision within its scope. An ADR is not implementation status.
1. `docs/ponte-authority/00-NORTH-STAR-ENTRY-ARCHITECTURE.md` — the current authority for the entry experience (landing, the primary routes, Explore, market-activity presentation, Start a Deal entry). It supersedes all earlier landing, gateway and primary-entry instructions, including anything below that defines four primary routes, makes Qualified Opportunities the primary Explore result, or treats Market Signals as a secondary fallback. Amended 26 July 2026: Ponte Desk is the selected visual and behavioural implementation, and §5 of that document now carries the Desk composition. Within the entry surfaces the order is: this authority, then the final Ponte Desk handoff for UX and visual behaviour, then Ponte Flow for semantic icon and motion implementation, then repository and production as implementation reality.
1a. `docs/ponte-authority/PT-PRODUCT-2026-07-26-02-ENGLISH-FIRST-LANGUAGE-POLICY.md` — Ponte is an English-first, single-interface-language platform. The `next-intl` and `[locale]` structure is legacy compatibility infrastructure, not future product architecture, and is not evidence that Ponte intends to become multilingual. Do not add locale abstractions, translation keys for parity, language selectors or locale routes.
2. `docs/ponte-authority/00-MASTER-IMPLEMENTATION-BRIEF.md` — the governing self-contained implementation authority for everything downstream of entry.
3. Live technical and legal constraints discovered through verified repository, production-schema or counsel evidence; report the conflict before changing direction.
4. The underlying long-form source authorities listed in `docs/codex/AUTHORITY-MANIFEST.md`, when present, for additional depth that does not conflict with the governing brief.
5. Existing engineering, lifecycle, security and production authorities in the repository.
6. Machine-readable and code-level contracts in `lib/taxonomy/` and
   `docs/schemas/`, where they implement an accepted authority or ADR.
7. This reconciled Codex layer — current implementation, deployment, decision and roadmap status.

The source-of-truth SOP governs the process, not product meaning. It does not
silently override product authorities; it tells contributors how to record,
change and implement them.

The governing brief already consolidates the product architecture, Brand v5 rules, messaging and copy, route register, experience blueprints, technical boundaries, implementation sequence and acceptance suite. The remaining long-form sources are useful supporting authorities but are not required for the Phase 0 audit to begin.

## Current implementation headline

`main` already contains substantial founding-launch, entry, Explore, Find,
Structure, verification and market-activity work. The exact status, including
what is merged but not production-verified, lives only in `CURRENT-STATE.md` and
must be checked before making a claim.

The repository also contains a canonical market taxonomy under
`lib/taxonomy/market.ts`. ADR-0001 adds the accepted family, origin and intent
contract. The production database and all creation/ingestion paths are not yet
fully reconciled to that logical contract.

## Critical current truth

Code existing on `main` does not prove it is enabled or live. Find and Structure are controlled by public environment flags, and the currently served public root must be checked against the canonical repository before any production claim.

Read next:

0. `docs/ponte-authority/00-NORTH-STAR-ENTRY-ARCHITECTURE.md`
1. `docs/ponte-authority/00-MASTER-IMPLEMENTATION-BRIEF.md`
2. `SOURCE-OF-TRUTH-SOP.md`
3. `../decisions/README.md` and relevant accepted ADRs
4. `CURRENT-STATE.md`
5. `FEATURE-FLAGS.md`
6. `DATABASE-STATE.md`
7. `KNOWN-ISSUES.md`
8. `DECISION-LOG.md`
9. `DO-NOT-REOPEN.md`
10. `MASTER-ROADMAP.md`
11. `ACTIVE-MILESTONE.md`
12. `.agent/PLANS.md`

## Completion discipline

A feature is only **production-verified** when all of the following are recorded:

- code is on `main`;
- required database changes are confirmed;
- the production feature flag is confirmed;
- the deployed route is checked directly;
- the expected user journey is exercised;
- failures and limitations are written down.

A decision is only **binding** when the owner has accepted it, its affected
canonical records are updated, and it is merged to `main`.
