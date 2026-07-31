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

The commercial model, decided by the owner on 31 July 2026
(`PT-COMMERCIAL-2026-07-31-01`, ADR-0020), is:

```text
Everything upstream of protected Deal Room progression is FREE
  -> browse, publish, prepare a Master Deal Room, create draft branches,
     invite, accept, prepare for activation: no charge, no limit
  -> activate the Master Deal Room: $79 USD for 30 active days,
     including 5 concurrently active private principal-counterparty branches
  -> each additional concurrently active branch: $15 USD for that room period
  -> maximum $199 USD per Master Deal Room per 30-day period
  -> expiry is read-only continuity, never deletion
```

USD only. English, Spanish, Russian, Simplified Chinese and Modern Standard
Arabic are included in the price.

**The Deal Room is Ponte's only paid product.** There are no memberships, plans,
Starter rooms, Portfolio subscriptions, credit packs, paid verification, public
Ponte Desk packages, retainers, commissions, success fees or
percentage-of-transaction charges. Earlier documents describing any of those are
superseded and preserved as history only.

**None of this is implemented.** No pricing engine, billing record, entitlement,
Stripe object or charge exists. The live `/pricing` page still publishes the
retired model (proposed **LB-014**). Programme:
`docs/plans/active/deal-room-transaction-pricing.md`.

Ponte Trade's market is organised around three equal primary families — Products, Trade services, and Distribution and representation — with externally observed Market Signals and member-created Member Opportunities available in each. See ADR-0001 and the canonical taxonomy.

Every approved, unexpired and anonymised public Market Signal must be discoverable through search, filtering, browsing or pagination. Trade Services and Distribution journeys must begin with structured category choices rather than generic free text. See ADR-0011 and `PT-PRODUCT-2026-07-28-01-COMPLETE-MARKET-DISCOVERABILITY-AND-CATEGORY-FIRST-JOURNEYS.md`.

One master Deal Room corresponds to one Deal and may contain private
counterparty, provider, adviser and internal sub-rooms. Provider, adviser and
internal workspaces are unlimited and free. Concurrently active
**principal-counterparty** branches are what the price counts: five are
included, and each further concurrent branch costs $15 USD to the $199 USD cap
(ADR-0020).

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

1e. `docs/ponte-authority/PT-COMMERCIAL-2026-07-31-01-DEAL-ROOM-TRANSACTION-INFRASTRUCTURE-PRICING-AUTHORITY.md` — **the Deal Room-Only Pricing Authority, and the only commercial authority to implement from.** Recorded by ADR-0020. Delivered by PR #155; until that merges, this points forward to an accepted decision not yet on `main`.

1f. `docs/ponte-authority/PT-PRODUCT-2026-07-27-02-DEAL-TO-ROOM-BRANCHING-MODEL.md` — master-room and private sub-room hierarchy. In force, except that principal-counterparty branches above five are now priced (ADR-0020).

1g. `docs/ponte-authority/PT-COMMERCIAL-2026-07-27-01-DEAL-ROOM-MONETISATION-POLICY.md` — **superseded within its commercial scope** by 1e. History only.

1h. `docs/ponte-authority/PT-COMMERCIAL-2026-07-27-03-STARTER-DEAL-ROOM-ACCESS.md` — **superseded** by 1e. There is no Starter Deal Room. History only.

1i. `docs/ponte-authority/PT-COMMERCIAL-2026-07-27-04-DEAL-ROOM-LAUNCH-MODEL-V2.md` and `PT-COMMERCIAL-2026-07-27-02-DEAL-ROOM-LAUNCH-PRICING-V1.md` — **superseded** by 1e, never approved. History only.

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

ADR-0020 records the owner's 31 July 2026 commercial decision: the Deal Room is
Ponte's only paid product, at $79 USD per 30 active days. It is a decision
record, not implementation status.

The Deal Room master-room hierarchy is implemented and proved against production
(LB-001, Approval 3, 94/94) but sits behind an unset flag. **Entitlement pricing,
billing, the pricing engine, branch counting, Stripe for the Deal Room and
production charging are not implemented at all.** Starter access is superseded
and will not be implemented. The live `/pricing` page still publishes the retired
model.

## Read next

0. `docs/ponte-authority/00-NORTH-STAR-ENTRY-ARCHITECTURE.md`
1. `docs/ponte-authority/PT-PRODUCT-2026-07-28-01-COMPLETE-MARKET-DISCOVERABILITY-AND-CATEGORY-FIRST-JOURNEYS.md` for Market Signals search, pagination and category-first non-product journeys
2. `docs/ponte-authority/PT-PRODUCT-2026-07-27-01-DEAL-ROOM-PRODUCT-CONTRACT-V1.md` for transaction progression
3. `docs/ponte-authority/PT-PRODUCT-2026-07-27-02-DEAL-TO-ROOM-BRANCHING-MODEL.md` for master rooms and sub-rooms
4. `docs/ponte-authority/PT-COMMERCIAL-2026-07-31-01-DEAL-ROOM-TRANSACTION-INFRASTRUCTURE-PRICING-AUTHORITY.md` for the commercial model, and `docs/decisions/ADR-0020-deal-room-only-pricing-authority.md` for the supersession map
5. `docs/plans/active/deal-room-transaction-pricing.md` for the staged implementation programme
6. `docs/codex/audits/deal-room-pricing/INVENTORY-2026-07-31.md` for what the repository actually charges for today, which is not the same thing
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
