# Ponte Trade — start here

**Status date:** 27 July 2026  
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

One master Deal Room corresponds to one Deal and may contain private counterparty, provider, adviser and internal sub-rooms. Paid sub-room creation does not consume another master-room slot.

These Deal Room foundations are designed product authority, not implemented behaviour.

## Operating procedure

`docs/codex/SOURCE-OF-TRUTH-SOP.md` governs how ideas from ChatGPT, Codex, Claude, humans, research and meetings become proposals, accepted decisions, implementation and recorded current state.

Conversations are workshops. The merged repository is the operating memory.

## Authority order

When documents conflict, use this order:

0. A later owner-accepted ADR in `docs/decisions/` that explicitly supersedes a named earlier decision within its scope. An ADR is not implementation status.
1. `docs/ponte-authority/00-NORTH-STAR-ENTRY-ARCHITECTURE.md` — current entry authority.
1a. `docs/ponte-authority/PT-PRODUCT-2026-07-26-02-ENGLISH-ONLY-INTERFACE-POLICY.md` — English-only interface with multilingual input.
1b. `docs/ponte-authority/PT-PRODUCT-2026-07-27-01-DEAL-ROOM-PRODUCT-CONTRACT-V1.md` — downstream Deal Room product authority.
1c. `docs/ponte-authority/PT-COMMERCIAL-2026-07-27-01-DEAL-ROOM-MONETISATION-POLICY.md` — Deal Room monetisation authority, including the Starter-access exception.
1d. `docs/ponte-authority/PT-PRODUCT-2026-07-27-02-DEAL-TO-ROOM-BRANCHING-MODEL.md` — master-room and private sub-room hierarchy.
1e. `docs/ponte-authority/PT-COMMERCIAL-2026-07-27-03-STARTER-DEAL-ROOM-ACCESS.md` — accepted Starter principle and proposed limits.
1f. `docs/ponte-authority/PT-COMMERCIAL-2026-07-27-04-DEAL-ROOM-LAUNCH-MODEL-V2.md` — proposed consolidated launch model; not binding until owner approval.
2. `docs/ponte-authority/00-MASTER-IMPLEMENTATION-BRIEF.md` — governing downstream implementation authority where later accepted authorities do not restate the decision.
3. Verified live technical and legal constraints.
4. Supporting long-form source authorities in `docs/codex/AUTHORITY-MANIFEST.md`.
5. Existing engineering, lifecycle, security and production authorities.
6. Machine-readable and code-level contracts implementing accepted authority.
7. Reconciled Codex current-state and roadmap records.

The SOP governs process, not product meaning.

## Current implementation headline

`main` contains substantial entry, Explore, Find, Structure, verification and market-activity work. Exact status must be checked in `CURRENT-STATE.md`.

The Deal Room, master-room hierarchy, Starter access, entitlement, billing and production charging are not implemented.

## Read next

0. `docs/ponte-authority/00-NORTH-STAR-ENTRY-ARCHITECTURE.md`
1. `docs/ponte-authority/PT-PRODUCT-2026-07-27-01-DEAL-ROOM-PRODUCT-CONTRACT-V1.md` for transaction progression
2. `docs/ponte-authority/PT-PRODUCT-2026-07-27-02-DEAL-TO-ROOM-BRANCHING-MODEL.md` for master rooms and sub-rooms
3. `docs/ponte-authority/PT-COMMERCIAL-2026-07-27-01-DEAL-ROOM-MONETISATION-POLICY.md` for commercial boundaries
4. `docs/ponte-authority/PT-COMMERCIAL-2026-07-27-03-STARTER-DEAL-ROOM-ACCESS.md` for Starter access
5. `docs/ponte-authority/PT-COMMERCIAL-2026-07-27-04-DEAL-ROOM-LAUNCH-MODEL-V2.md` for proposed launch limits and pricing
6. `docs/ponte-authority/00-MASTER-IMPLEMENTATION-BRIEF.md`
7. `SOURCE-OF-TRUTH-SOP.md`
8. `../decisions/README.md`
9. `CURRENT-STATE.md`
10. `FEATURE-FLAGS.md`
11. `DATABASE-STATE.md`
12. `KNOWN-ISSUES.md`
13. `DECISION-LOG.md`
14. `DO-NOT-REOPEN.md`
15. `MASTER-ROADMAP.md`
16. `ACTIVE-MILESTONE.md`
17. `.agent/PLANS.md`

## Completion discipline

A feature is only production-verified when code, database state, feature flags, deployment, user journey and known limitations are all recorded.

A decision is only binding when the owner has accepted it, affected canonical records are updated, and it is merged to `main`.
