# Current state

**Reconciled:** 25 July 2026  
**Repository:** `Geppix140269/ponte`  
**Canonical branch:** `main`  
**Canonical commit inspected:** `9fa0aa63d82cdaa3f34251e8ca526677647680ff`  
**Governing authority:** `docs/ponte-authority/00-MASTER-IMPLEMENTATION-BRIEF.md`

## Status vocabulary

Use only these labels:

- Not started
- Designed
- Partially implemented
- Implemented on branch
- On `main`
- Deployed
- Production-verified
- Blocked
- Deprecated

Code on `main` is not automatically deployed, enabled or production-verified.

## Implementation summary

| Area | Repository status | Production status | Notes |
|---|---|---|---|
| Founding-launch integrity Blocks A-F | On `main` | Production database changes recorded as applied; deployed state needs direct confirmation | Separates Market Signals and Qualified Opportunities, purpose-binds business verification, strengthens publication gates, controlled introductions and founding lifecycle. |
| “What’s your deal?” intelligent gateway | On `main` | Deployment must be checked directly | Cream/ink/gold entry, voice/type input, deterministic intent extraction and four real route handoffs. |
| Journey 1 — Find | On `main` | Feature-flag and live-route status unconfirmed | `/find`, product drill-down, separate Qualified Opportunity and Market Signal lanes, Qualified Opportunity detail and controlled-introduction request. |
| Journey 2 — Structure & Submit | On `main` | Feature-flag and live-route status unconfirmed | `/structure`, S01-S06 composer, facts/gaps, progressive completion, public/private/reviewer preview, account gate and submit. |
| Workspace H04 | On `main` | Live behaviour unconfirmed | Reused by Journey 1/2. The broader agentic Workspace required by the governing architecture is not complete. |
| Check and verify journey K01-K09 | Partially implemented | Existing verification surfaces may be live; complete Brand v5 journey not production-verified | Existing `/verify`, registries, sanctions pipeline, admin and certificate infrastructure are reusable. Full compatibility mapping and evidence-receipt journey remain Phase 4 work after Phase 0 audit. |
| Market Signal investigation I01-I07 | Partially implemented | Live status unconfirmed | Existing signal detail and structured investigation routes cover part of the lifecycle. Full scope/progress/outcome journey and Ponte Desk integration remain incomplete. |
| Commercial Missions M01-M07 | Not started or unconfirmed pending audit | Not production-verified | The governing architecture defines Missions as the persistent objective and Phase 1 centrepiece. Phase 0 must map any reusable existing structures before schema proposals. |
| Commercial Developments D01-D05 | Not started or unconfirmed pending audit | Not production-verified | Must remain a cited, private Mission-specific synthesis, distinct from a listing or generic AI answer. |
| Prepared actions and approvals X01-X07 | Partially implemented infrastructure | Not production-verified as a complete journey | Controlled introductions and account resumption provide reusable pieces. Complete exact-preview, approval, idempotent execution and recorded outcome require Phase 0 mapping. |
| Business Passport and Vault B01-B08 | Partially implemented or missing pending audit | Not production-verified | Existing profiles, verification records and storage may be reusable. Person, business and membership must not be permanently merged. |
| Full controlled introduction O01-O07 and threads | Partially implemented | Complete lifecycle not production-verified | Request path exists. Owner review, disclosure blockers, recorded contact release and post-introduction thread need full audit. |
| Complete admin operations A01-A09 | Partially implemented | Individual queues may be live; complete priority model not verified | Existing opportunity, verification and signal review surfaces are reusable candidates. No one-click AI approval. |

## Recent merged implementation evidence

- PR #14: Founding-launch readiness, Blocks A-F.
- PR #15: “What’s your deal?” gateway.
- PR #16: Journey 1 Find and controlled introduction.
- PR #19: Journey 2 Structure & Submit moved onto `main`.
- PR #20: production-alignment fixes for signal-import indexing and Journey 2 seed verification value.

## Governing programme position

The Master Implementation Brief defines:

- **Phase 0:** repository-to-architecture gap report; no implementation, migration or global style change.
- **Phase 1:** first agentic vertical slice — Mission setup through Development, evidence, prepared action, approval and recorded Workspace outcome.
- **Phase 2:** complete discovery and opportunity request.
- **Phase 3:** complete structure and submit.
- **Phase 4 onward:** verification compatibility, signal investigation, Passport/Vault, introductions, admin resilience and later Brand v5 convergence.

The repository has already implemented substantial portions of the brief's nominal Phases 2 and 3 before Phase 0 and Phase 1 were completed. Codex must not assume the numbered sequence means those journeys should be rebuilt. Phase 0 must determine what is aligned, reusable, incomplete, contradictory or obsolete.

## Production unknowns requiring evidence

The following must be resolved before claiming the current application is fully live:

1. Which host and project currently serve `ponte.trade`.
2. Which repository and production branch that host deploys.
3. Values of `NEXT_PUBLIC_FIND_JOURNEY` and `NEXT_PUBLIC_STRUCTURE_JOURNEY` in production.
4. The deployed commit SHA.
5. Direct exercise of the gateway, `/find`, `/structure`, account resumption and submission/introduction paths.
6. Current production schema versus repository migration ledger.

## Immediate next action

Complete the Phase 0 Codex audit defined in `ACTIVE-MILESTONE.md`. Do not implement Phase 1 until Giuseppe reviews and approves the report.
