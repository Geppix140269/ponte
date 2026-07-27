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

Ponte Trade's market is organised around three equal primary families —
Products, Trade services, and Distribution and representation — with externally
observed Market Signals and member-created Member Opportunities available in
each. See ADR-0001 and the canonical taxonomy.

After credible commercial interest, the accepted Deal Room foundation provides
the downstream PROGRESS layer: formal participant admission, an agreed procedure,
structured evidence and decisions, blockers, next actions and durable history.
This is designed product authority, not implemented behaviour. See ADR-0003 and
the Deal Room Product Contract v1.

The current commercial architecture is equally explicit: the upstream market
creates liquidity, while the active Deal Room is Ponte's primary paid commercial
environment. A commercial-entitlement gate is required conceptually for active
room progression. See ADR-0004 and the Deal Room Monetisation Policy.

The accepted hierarchy is:

```text
Free structured Deal
  -> paid master Deal Room for that Deal
       -> any number of private related sub-rooms
```

One master Deal Room consumes one paid room entitlement or subscription slot.
Private counterparty, provider and internal sub-rooms beneath it do not consume
additional master-room slots. Five subscription room slots mean five concurrent
master Deals, not five conversations. External guest organisations may consume
the included guest allowance or credits. See ADR-0005 and the Deal-to-Room and
Sub-Room Model.

The day-one launch pricing document currently proposes a €149 monthly portfolio
subscription with five concurrent master Deal Rooms, unlimited related sub-rooms,
25 concurrent external guest organisations and a credits alternative. Those
numbers are **proposed, not accepted**, until the owner approves the pricing
authority. No charging, billing, Stripe, schema or runtime implementation is
authorised by the proposal.

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
1a. `docs/ponte-authority/PT-PRODUCT-2026-07-26-02-ENGLISH-ONLY-INTERFACE-POLICY.md` — English-Only Interface and Multilingual Input Policy. The interface and all Ponte-controlled content are English only; multilingual natural-language input remains supported and AI may interpret and translate it; no i18n-level parallel interface is maintained. The `next-intl` and `[locale]` structure is legacy compatibility infrastructure, not future product architecture. Do not add locale abstractions, translation keys for parity, language selectors or locale routes.
1b. `docs/ponte-authority/PT-PRODUCT-2026-07-27-01-DEAL-ROOM-PRODUCT-CONTRACT-V1.md` — the accepted authority for the downstream Deal Room PROGRESS layer. It supplies separate Business Passport approval for Deal Room admission and supersedes the blanket Deal Room deferral only within its stated product-definition scope. It does not authorise Design, code, schema, migration or production action.
1c. `docs/ponte-authority/PT-COMMERCIAL-2026-07-27-01-DEAL-ROOM-MONETISATION-POLICY.md` — the accepted commercial authority for Deal Room monetisation. The upstream market creates liquidity; an active Deal Room requires a valid commercial entitlement. The policy amends the broad MVP payment exclusion so only trade settlement, escrow, trade-finance execution and payments between trading parties remain excluded. It does not authorise exact prices, charging, Stripe, schema, runtime paywalls or deployment.
1d. `docs/ponte-authority/PT-PRODUCT-2026-07-27-02-DEAL-TO-ROOM-BRANCHING-MODEL.md` — the accepted hierarchy for free structured Deals, paid master Deal Rooms and private related sub-rooms. One master room consumes one commercial entitlement; its private sub-rooms do not consume additional master-room slots.
1e. `docs/ponte-authority/PT-COMMERCIAL-2026-07-27-02-DEAL-ROOM-LAUNCH-PRICING-V1.md` — proposed day-one pricing and entitlement configuration. It is not binding until owner approval and does not authorise production charging.
2. `docs/ponte-authority/00-MASTER-IMPLEMENTATION-BRIEF.md` — the governing self-contained implementation authority for everything downstream of entry that the North Star, Deal Room Product Contract, Deal Room Monetisation Policy, accepted branching model or later accepted ADRs do not restate.
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

The Deal Room product, monetisation and master-room hierarchy are accepted on the
dedicated decision branch but are not implemented. The launch numerical pricing
configuration remains proposed. No room, sub-room, entitlement, billing or
production capability may be claimed until `CURRENT-STATE.md` records evidence.

## Critical current truth

Code existing on `main` does not prove it is enabled or live. Find and Structure are controlled by public environment flags, and the currently served public root must be checked against the canonical repository before any production claim.

Read next:

0. `docs/ponte-authority/00-NORTH-STAR-ENTRY-ARCHITECTURE.md`
1. `docs/ponte-authority/PT-PRODUCT-2026-07-27-01-DEAL-ROOM-PRODUCT-CONTRACT-V1.md` when work concerns post-interest transaction progression
2. `docs/ponte-authority/PT-PRODUCT-2026-07-27-02-DEAL-TO-ROOM-BRANCHING-MODEL.md` when work concerns the Deal, master-room or sub-room hierarchy
3. `docs/ponte-authority/PT-COMMERCIAL-2026-07-27-01-DEAL-ROOM-MONETISATION-POLICY.md` when work concerns entitlement, Ponte Desk or paid transaction support
4. `docs/ponte-authority/PT-COMMERCIAL-2026-07-27-02-DEAL-ROOM-LAUNCH-PRICING-V1.md` when work concerns the proposed launch prices and allowances
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

A decision is only **binding** when the owner has accepted it, its affected
canonical records are updated, and it is merged to `main`.
