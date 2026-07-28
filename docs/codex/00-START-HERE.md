# Ponte Trade — start here

**Status date:** 28 July 2026  
**Repository:** `Geppix140269/ponte`  
**Canonical branch:** `main`

## Product definition

Ponte Trade is a commercial intelligence and controlled-execution layer for cross-border trade.

Canonical brand line:

> Cross-border trade, with greater clarity.

Ponte's market is organised around Products, Trade services, and Distribution and representation. Market Signals and structured member-created Deals create upstream liquidity.

After credible commercial interest, the Deal Room provides the downstream PROGRESS layer: formal admission, an agreed procedure, structured evidence and decisions, blockers, next actions and durable history.

The commercial model is:

```text
Free Market Access and structured Deals
  -> one limited Starter Deal Room experience per verified organisation
  -> ongoing paid Portfolio subscription or Ponte Credits
  -> optional paid agent, Ponte Desk and specialist services
```

Ponte Trade's market is organised around three equal primary families — Products, Trade services, and Distribution and representation — with externally observed Market Signals and member-created Member Opportunities available in each. See ADR-0001 and the canonical taxonomy.

Every approved, unexpired and anonymised public Market Signal must be discoverable through search, filtering, browsing or pagination. Trade Services and Distribution journeys must begin with structured category choices rather than generic free text. See ADR-0011 and `PT-PRODUCT-2026-07-28-01-COMPLETE-MARKET-DISCOVERABILITY-AND-CATEGORY-FIRST-JOURNEYS.md`.

One master Deal Room corresponds to one Deal and may contain private counterparty, provider, adviser and internal sub-rooms. Paid sub-room creation does not consume another master-room slot.

These Deal Room foundations are designed product authority, not implemented behaviour.

## Operating procedure

`docs/codex/SOURCE-OF-TRUTH-SOP.md` governs how ideas from ChatGPT, Codex, Claude, humans, research and meetings become proposals, accepted decisions, implementation and recorded current state.

Conversations are workshops. The merged repository is the operating memory.

## Authority order

When documents conflict, use this order:

0. A later owner-accepted ADR in `docs/decisions/` that explicitly supersedes a named earlier decision within its scope. An ADR is not implementation status.
1. `docs/ponte-authority/00-NORTH-STAR-ENTRY-ARCHITECTURE.md` — the current authority for the entry experience.

1a. `docs/ponte-authority/PT-PRODUCT-2026-07-26-02-ENGLISH-ONLY-INTERFACE-POLICY.md` — English-only interface and multilingual input policy.

1b. `design/authority/PONTE_DESIGN_CONSTITUTION_v1.md` with ADR-0002 and ADR-0010 — the binding authority for every Ponte-controlled visual and interaction decision. Within its scope, approved packages under `design/authority/` and approved Ponte Flow assets under `design-system/ponte-flow/` are implementation authorities, not inspiration. Visual conformity is part of correctness.

1c. `docs/ponte-authority/PT-PRODUCT-2026-07-28-01-COMPLETE-MARKET-DISCOVERABILITY-AND-CATEGORY-FIRST-JOURNEYS.md` — complete Market Signal discoverability and category-first Trade Services and Distribution authority.

1d. `docs/ponte-authority/PT-PRODUCT-2026-07-27-01-DEAL-ROOM-PRODUCT-CONTRACT-V1.md` — downstream Deal Room product authority.

1e. `docs/ponte-authority/PT-COMMERCIAL-2026-07-27-01-DEAL-ROOM-MONETISATION-POLICY.md` — Deal Room monetisation authority, including the Starter-access exception.

1f. `docs/ponte-authority/PT-PRODUCT-2026-07-27-02-DEAL-TO-ROOM-BRANCHING-MODEL.md` — master-room and private sub-room hierarchy.

1g. `docs/ponte-authority/PT-COMMERCIAL-2026-07-27-03-STARTER-DEAL-ROOM-ACCESS.md` — accepted Starter principle and proposed limits.

1h. `docs/ponte-authority/PT-COMMERCIAL-2026-07-27-04-DEAL-ROOM-LAUNCH-MODEL-V2.md` — proposed consolidated launch model; not binding until owner approval.

2. `docs/ponte-authority/00-MASTER-IMPLEMENTATION-BRIEF.md` — the governing implementation authority for everything downstream of entry, where later accepted authorities do not restate the decision.

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

ADR-0011 records the owner-approved requirement that every eligible Market Signal be discoverable and that Trade Services and Distribution use structured category-first journeys. The development brief was issued to Claude Code on 28 July 2026. This authority is not proof that the implementation, new batch reconciliation, migration or deployment is complete.

ADR-0002 records the owner-approved Ponte Design Constitution and Bridge System authority. Its first implementation is deliberately separate from the authority PR.

The Deal Room, master-room hierarchy, Starter access, entitlement, billing and production charging are not implemented.

## Read next

0. `docs/ponte-authority/00-NORTH-STAR-ENTRY-ARCHITECTURE.md`
1. `docs/ponte-authority/PT-PRODUCT-2026-07-28-01-COMPLETE-MARKET-DISCOVERABILITY-AND-CATEGORY-FIRST-JOURNEYS.md` for Market Signals search, pagination and category-first non-product journeys
2. `docs/ponte-authority/PT-PRODUCT-2026-07-27-01-DEAL-ROOM-PRODUCT-CONTRACT-V1.md` for transaction progression
3. `docs/ponte-authority/PT-PRODUCT-2026-07-27-02-DEAL-TO-ROOM-BRANCHING-MODEL.md` for master rooms and sub-rooms
4. `docs/ponte-authority/PT-COMMERCIAL-2026-07-27-01-DEAL-ROOM-MONETISATION-POLICY.md` for commercial boundaries
5. `docs/ponte-authority/PT-COMMERCIAL-2026-07-27-03-STARTER-DEAL-ROOM-ACCESS.md` for Starter access
6. `docs/ponte-authority/PT-COMMERCIAL-2026-07-27-04-DEAL-ROOM-LAUNCH-MODEL-V2.md` for proposed launch limits and pricing
7. `docs/ponte-authority/00-MASTER-IMPLEMENTATION-BRIEF.md`
8. `design/authority/PONTE_DESIGN_CONSTITUTION_v1.md`
9. `design/authority/bridge/v1/README.md` when bridge, progress or connection UI is involved
10. `SOURCE-OF-TRUTH-SOP.md`
11. `../decisions/README.md` and relevant accepted ADRs
12. `CURRENT-STATE.md`
13. `FEATURE-FLAGS.md`
14. `DATABASE-STATE.md`
15. `KNOWN-ISSUES.md`
16. `DECISION-LOG.md`
17. `DO-NOT-REOPEN.md`
18. `MASTER-ROADMAP.md`
19. `ACTIVE-MILESTONE.md`
20. `.agent/PLANS.md`

## Completion discipline

A feature is only production-verified when code, database state, feature flags, deployment, user journey and known limitations are all recorded.

A design implementation is only complete when:

- the applicable Constitution rules and approved references were used;
- desktop and 390 × 844 mobile evidence was reviewed;
- reduced motion and keyboard focus were reviewed;
- no silent simplification or generic substitution was introduced;
- explicit owner design approval is recorded where required.

A decision is only binding when the owner has accepted it, its affected canonical records are updated, and it is merged to `main`.
