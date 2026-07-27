# Ponte Trade — start here

**Status date:** 27 July 2026  
**Repository:** `Geppix140269/ponte`  
**Canonical branch:** `main`

## Product definition

Ponte Trade is a commercial intelligence and controlled-execution layer for cross-border trade.

It helps a business state an objective, structure commercial facts, inspect distinct evidence classes, understand what matters, prepare the next action and proceed through controlled approval and disclosure.

Canonical brand line:

> Cross-border trade, with greater clarity.

Operating spine:

> Business identity → Commercial Mission → Observed evidence → Company-specific interpretation → Recommended action → Human approval where required → Execution → Recorded outcome → Better mission memory

Ponte Trade's market is organised around three equal primary families — Products, Trade services, and Distribution and representation — with externally observed Market Signals and member-created Member Opportunities available in each. See ADR-0001 and the canonical taxonomy.

## Operating procedure

`docs/codex/SOURCE-OF-TRUTH-SOP.md` governs how ideas from ChatGPT, Codex, Claude, humans, research and meetings become proposals, accepted decisions, implementation and recorded current state.

Conversations are workshops. The merged repository is the operating memory.

## Authority order

When documents conflict, use this order:

0. A later owner-accepted ADR in `docs/decisions/` that explicitly supersedes a named earlier decision within its scope. An ADR is not implementation status.
1. `docs/ponte-authority/00-NORTH-STAR-ENTRY-ARCHITECTURE.md` — the current authority for the entry experience.
1a. `docs/ponte-authority/PT-PRODUCT-2026-07-26-02-ENGLISH-ONLY-INTERFACE-POLICY.md` — English-only interface and multilingual input policy.
1b. `design/authority/PONTE_DESIGN_CONSTITUTION_v1.md` with ADR-0002 and ADR-0003 — the binding authority for every Ponte-controlled visual and interaction decision. Within its scope, approved packages under `design/authority/` and approved Ponte Flow assets under `design-system/ponte-flow/` are implementation authorities, not inspiration. Visual conformity is part of correctness.
2. `docs/ponte-authority/00-MASTER-IMPLEMENTATION-BRIEF.md` — the governing implementation authority for everything downstream of entry.
3. Live technical and legal constraints discovered through verified repository, production-schema or counsel evidence; report conflicts before changing direction.
4. The long-form source authorities listed in `docs/codex/AUTHORITY-MANIFEST.md`, where they do not conflict with the governing authorities.
5. Existing engineering, lifecycle, security and production authorities in the repository.
6. Machine-readable and code-level contracts in `lib/taxonomy/` and `docs/schemas/`, where they implement an accepted authority or ADR.
7. This reconciled Codex layer — current implementation, deployment, decision and roadmap status.

The source-of-truth SOP governs process, not product meaning. It does not silently override product authorities.

The Design Constitution is mandatory before UI, icon, typography, motion, layout or interaction work. Where it is silent or conflicts with truthful production constraints, stop and request owner approval. Do not improvise a generic substitute.

## Current implementation headline

`main` contains substantial founding-launch, entry, Explore, Find, Structure, verification and market-activity work. Exact status, including what is merged but not production-verified, lives only in `CURRENT-STATE.md` and must be checked before making a claim.

The repository also contains the canonical market taxonomy under `lib/taxonomy/market.ts`. ADR-0001 adds the accepted family, origin and intent contract. The production database and all creation and ingestion paths are not yet fully reconciled to that logical contract.

ADR-0002 records the owner-approved Ponte Design Constitution and Bridge System authority. Its first implementation is deliberately separate from the authority PR.

## Critical current truth

Code existing on `main` does not prove it is enabled or live. Find and Structure are controlled by public environment flags, and the currently served public root must be checked against the canonical repository before any production claim.

Read next:

0. `docs/ponte-authority/00-NORTH-STAR-ENTRY-ARCHITECTURE.md`
1. `docs/ponte-authority/00-MASTER-IMPLEMENTATION-BRIEF.md`
2. `design/authority/PONTE_DESIGN_CONSTITUTION_v1.md`
3. `design/authority/bridge/v1/README.md` when bridge, progress or connection UI is involved
4. `SOURCE-OF-TRUTH-SOP.md`
5. `../decisions/README.md` and relevant accepted ADRs
6. `CURRENT-STATE.md`
7. `FEATURE-FLAGS.md`
8. `DATABASE-STATE.md`
9. `KNOWN-ISSUES.md`
10. `DECISION-LOG.md`
11. `DO-NOT-REOPEN.md`
12. `MASTER-ROADMAP.md`
13. `ACTIVE-MILESTONE.md`
14. `.agent/PLANS.md`

## Completion discipline

A feature is only **production-verified** when all of the following are recorded:

- code is on `main`;
- required database changes are confirmed;
- the production feature flag is confirmed;
- the deployed route is checked directly;
- the expected user journey is exercised;
- failures and limitations are written down.

A design implementation is only complete when:

- the applicable Constitution rules and approved references were used;
- desktop and 390 × 844 mobile evidence was reviewed;
- reduced motion and keyboard focus were reviewed;
- no silent simplification or generic substitution was introduced;
- explicit owner design approval is recorded where required.

A decision is only binding when the owner has accepted it, its affected canonical records are updated, and it is merged to `main`.