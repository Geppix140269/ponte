# Ponte Trade — start here

**Status date:** 27 July 2026  
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

Ponte Trade's market is organised around three equal primary families — Products, Trade services, and Distribution and representation — with externally observed Market Signals and member-created Member Opportunities available in each. See ADR-0001 and the canonical taxonomy.

After credible commercial interest, the accepted Deal Room foundation provides the downstream PROGRESS layer: formal participant admission, an agreed procedure, structured evidence and decisions, blockers, next actions and durable history. This is designed product authority, not implemented behaviour. See ADR-0003 and the Deal Room Product Contract v1.

The current commercial architecture is equally explicit: the upstream market creates liquidity, while the active master Deal Room is Ponte's primary paid commercial environment. A commercial-entitlement gate is required conceptually for active room progression. See ADR-0004 and the Deal Room Monetisation Policy.

The accepted hierarchy is:

```text
Free structured Deal
  -> paid master Deal Room for that Deal
       -> any number of private related sub-rooms
```

One master Deal Room consumes one paid room entitlement or subscription slot. Private counterparty, provider and internal sub-rooms beneath it do not consume additional master-room slots. Five subscription room slots mean five concurrent master Deals, not five conversations. External guest organisations may consume included guest capacity or credits. See ADR-0005 and the Deal-to-Room and Sub-Room Model.

The day-one launch pricing document currently proposes a €149 monthly portfolio subscription with five concurrent master Deal Rooms, unlimited related sub-rooms, 25 concurrent external guest organisations and five internal users, plus a credit alternative. Those numerical values are **proposed, not accepted**, until the owner approves the pricing authority. No charging, billing, Stripe, schema or runtime implementation is authorised by the proposal.

## Operating procedure

`docs/codex/SOURCE-OF-TRUTH-SOP.md` governs how ideas from ChatGPT, Codex, Claude, humans, research and meetings become proposals, accepted decisions, implementation and recorded current state.

Conversations are workshops. The merged repository is the operating memory.

## Authority order

When documents conflict, use this order:

0. A later owner-accepted ADR in `docs/decisions/` that explicitly supersedes a named earlier decision within its scope. An ADR is not implementation status.
1. `docs/ponte-authority/00-NORTH-STAR-ENTRY-ARCHITECTURE.md` — the current authority for the entry experience.
1a. `docs/ponte-authority/PT-PRODUCT-2026-07-26-02-ENGLISH-ONLY-INTERFACE-POLICY.md` — English-Only Interface and Multilingual Input Policy.
1b. `docs/ponte-authority/PT-PRODUCT-2026-07-27-01-DEAL-ROOM-PRODUCT-CONTRACT-V1.md` — accepted downstream Deal Room PROGRESS authority.
1c. `docs/ponte-authority/PT-COMMERCIAL-2026-07-27-01-DEAL-ROOM-MONETISATION-POLICY.md` — accepted commercial authority for master Deal Room monetisation.
1d. `docs/ponte-authority/PT-PRODUCT-2026-07-27-02-DEAL-TO-ROOM-BRANCHING-MODEL.md` — accepted free Deal, paid master-room and private sub-room hierarchy.
1e. `docs/ponte-authority/PT-COMMERCIAL-2026-07-27-02-DEAL-ROOM-LAUNCH-PRICING-V1.md` — proposed numerical launch pricing and allowances; not binding until owner approval.
2. `docs/ponte-authority/00-MASTER-IMPLEMENTATION-BRIEF.md` — governing downstream implementation authority where later accepted authorities do not restate the matter.
3. Live technical and legal constraints discovered through verified repository, production-schema or counsel evidence.
4. Supporting long-form authorities listed in `docs/codex/AUTHORITY-MANIFEST.md`.
5. Existing engineering, lifecycle, security and production authorities.
6. Machine-readable contracts in `lib/taxonomy/` and `docs/schemas/` where they implement accepted authority.
7. This reconciled Codex layer for current implementation, deployment, decision and roadmap status.

The source-of-truth SOP governs the process, not product meaning. It tells contributors how to record, change and implement authority.

## Current implementation headline

`main` already contains substantial founding-launch, entry, Explore, Find, Structure, verification and market-activity work. Exact implementation and production status lives only in `CURRENT-STATE.md`.

The Deal Room product, monetisation and master-room hierarchy are accepted on the dedicated decision branch but are not implemented. The numerical launch pricing configuration remains proposed. No room, sub-room, entitlement, billing or production capability may be claimed until `CURRENT-STATE.md` records evidence.

## Read next

0. `docs/ponte-authority/00-NORTH-STAR-ENTRY-ARCHITECTURE.md`
1. `docs/ponte-authority/PT-PRODUCT-2026-07-27-01-DEAL-ROOM-PRODUCT-CONTRACT-V1.md`
2. `docs/ponte-authority/PT-PRODUCT-2026-07-27-02-DEAL-TO-ROOM-BRANCHING-MODEL.md`
3. `docs/ponte-authority/PT-COMMERCIAL-2026-07-27-01-DEAL-ROOM-MONETISATION-POLICY.md`
4. `docs/ponte-authority/PT-COMMERCIAL-2026-07-27-02-DEAL-ROOM-LAUNCH-PRICING-V1.md`
5. `docs/ponte-authority/00-MASTER-IMPLEMENTATION-BRIEF.md`
6. `SOURCE-OF-TRUTH-SOP.md`
7. `../decisions/README.md` and relevant accepted ADRs
8. `CURRENT-STATE.md`
9. `FEATURE-FLAGS.md`
10. `DATABASE-STATE.md`
11. `KNOWN-ISSUES.md`
12. `DECISION-LOG.md`
13. `DO-NOT-REOPEN.md`
14. `MASTER-ROADMAP.md`
15. `ACTIVE-MILESTONE.md`
16. `.agent/PLANS.md`

## Completion discipline

A feature is only **production-verified** when all of the following are recorded:

- code is on `main`;
- required database changes are confirmed;
- the production feature flag is confirmed;
- the deployed route is checked directly;
- the expected user journey is exercised;
- failures and limitations are written down.

A decision is only **binding** when the owner has accepted it, its affected canonical records are updated, and it is merged to `main`.
