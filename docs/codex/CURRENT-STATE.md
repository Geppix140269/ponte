# Current state

**Reconciled:** 26 July 2026  
**Repository:** `Geppix140269/ponte`  
**Canonical branch:** `main`  
**Canonical commit before this governance proposal:** `6c18af51b907b57d1a063ad51cfdb451e112ad03`  
**Governing authority (entry experience):** `docs/ponte-authority/00-NORTH-STAR-ENTRY-ARCHITECTURE.md`  
**Governing authority (everything downstream of entry):** `docs/ponte-authority/00-MASTER-IMPLEMENTATION-BRIEF.md`

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
An accepted ADR is not proof that its implementation is complete.

## Implementation summary

| Area | Repository status | Production status | Notes |
|---|---|---|---|
| Source-of-truth operating procedure | Implemented on branch `governance/source-of-truth-sop`; awaiting PR review | Not applicable until merged | Adds the common SOP, ADR system, Claude entry point, proposal intake form, PR checklist and mandatory cross-agent rules. |
| Unified three-family market contract | Accepted decision; logical contract implemented on governance branch | Production database and end-to-end flows not reconciled | ADR-0001 defines Products, Trade services, and Distribution and representation as equal families, each containing Market Signals and Member Opportunities. Code taxonomy now defines family, origin and valid intent. No production migration is authorised by this branch. |
| Founding-launch integrity Blocks A-F | On `main` | Production database changes recorded as applied; deployed state needs direct confirmation | Separates Market Signals and Qualified Opportunities, purpose-binds business verification, strengthens publication gates, controlled introductions and founding lifecycle. |
| North Star entrance: two routes and market activity | On `main` via PR #36; visual flow refinement via PR #40 | Recent PR #40 reports live exercise, but this reconciliation did not independently verify the deployed SHA | Two direct routes: Explore the market and Start a deal. Activity band, search, popular areas and trust/evidence explanation are implemented. The heavy arch was replaced with a lightweight directional flow. |
| Explore the market | On `main` via PR #36; Flow taxonomy/icon integration via PR #38; count correction via PR #39 | Screens supplied by the owner show the current deployed surface; deployed commit not independently checked here | Three families and 15 product sectors render from real data. Product totals now use count queries rather than the 300-row read cap. Products is clickable. Deeper classification and inventory gaps remain. |
| Canonical market taxonomy | On `main` for families, product sectors, service categories and distribution modes; origin and intent extension on governance branch | Not a production data contract yet | `lib/taxonomy/market.ts` is the code source. Explore now derives its family keys from it rather than restating them. Tests enforce the three families, two origins and family-valid intents. |
| Product market inventory | On `main` | Active records visible; exact production count and mapping quality require verification | Thousands of product Market Signals are reported elsewhere in the product. Many imported records lack HS classification, producing empty sector counts despite non-zero product activity. Public zero grids and internal mapping explanations remain a product/data-quality defect. |
| Trade services inventory | Partially implemented | Thin or zero on current surface | Current activity logic can prove member service records only. There is no complete external service-signal ingestion and classification pipeline. Member creation supports an offer-service entry at a high level, but the service-specific composer and end-to-end contract are incomplete. |
| Distribution and representation inventory | Designed in taxonomy; no classified market records in current activity model | Empty or shown without a count | Distribution modes exist as typed taxonomy constants, but existing records are not classified into the family and member creation/ingestion are not complete. |
| Unified market-activity read | On `main` | Live state requires direct verification | Existing public member records and Market Signals are presented together while retaining their true class. Counts use dedicated count queries; row reads remain bounded. |
| Journey 1 — Find | On `main` | Feature-flag and live-route status require direct confirmation | Product discovery, separate factual classes, signal detail and controlled actions exist. It is not yet fully aligned to the new family/origin/intent contract. |
| Journey 2 — Structure & Submit / Start a deal | On `main`; blockers fixed in PRs #37, #39 and #40 | PR #40 reports live exercise and an applied additive investigation migration | Product lookup cache, chapter paging, route home, seller geography logic, commercial vocabularies and preview editing were improved. Trade-service and distribution-specific creation remain incomplete. |
| Market Signal investigation | Partially implemented and extended on `main` via PR #40 | PR #40 reports additive migration applied and live forms exercised | Investigation and capability declarations are separate request kinds; phone and contact language are captured for the desk. Full investigation lifecycle and Desk operations remain incomplete. |
| Check and verify journey K01-K09 | Partially implemented; review fixes on `main`; request journey moved to Brand v5 | Existing surfaces may be live; full Brand v5 journey not production-verified | Existing verification, registry, sanctions, admin and receipt infrastructure are reusable. `/verify` and `/verification` now mount PonteShell in heritage-light, so reaching business verification from the Start a Deal blockers no longer drops the member into the obsidian application mid-task; see `docs/plans/active/verification-journey-brand-v5.md`. Verification meaning, cost, attestation and disclaimer are unchanged. Complete compatibility mapping and evidence journey remain later work. |
| Commercial Missions M01-M07 | Not started or unconfirmed pending audit | Not production-verified | The governing architecture defines Missions as the persistent objective and agentic centrepiece. Existing reusable structures must be mapped before schema proposals. |
| Commercial Developments D01-D05 | Not started or unconfirmed pending audit | Not production-verified | Must remain a cited, private Mission-specific synthesis, distinct from a listing or generic AI answer. |
| Prepared actions and approvals X01-X07 | Partially implemented infrastructure | Not production-verified as a complete journey | Controlled introductions and account resumption provide reusable pieces. Complete exact-preview, approval, idempotent execution and recorded outcome require mapping. |
| Business Passport and Vault B01-B08 | Partially implemented or missing pending audit | Not production-verified | Existing profiles, verification records and storage may be reusable. Person, business and membership must not be permanently merged. |
| Complete admin operations A01-A09 | Partially implemented | Individual queues may be live; complete priority model not verified | Existing opportunity, verification, signal and investigation review surfaces are reusable candidates. No one-click AI approval. |

## Current market-model truth

The accepted logical model is:

```text
Market family: Products | Trade services | Distribution and representation
Record origin: Market Signal | Member Opportunity
Intent: one family-valid seeking or offering intent
```

This model is recorded in ADR-0001, `lib/taxonomy/market.ts` and
`docs/schemas/`. The existing database and public activity model do not yet
represent every combination. In particular:

- imported product Market Signals often lack a reliable HS chapter;
- external Trade service signals are not yet ingested and classified;
- Distribution and representation records are not yet classified;
- member-created service and distribution flows are not complete;
- existing `ActivityKind` values do not yet expose the full family/origin/intent
  contract.

Therefore the three-family architecture is **accepted and partially encoded**,
not yet end-to-end implemented.

## Data-quality and empty-state defects

The current public Explore surface can show a non-zero Products total while all
product sectors show zero, because many product records have no HS chapter. It
can also show empty Trade services and Distribution families because those
pipelines are incomplete.

Required outcome, not yet implemented:

1. reconcile reported product totals against the underlying active records;
2. classify and backfill product sectors with confidence and review handling;
3. ingest legitimate, source-linked service and distribution Market Signals;
4. support member-created opportunities for every accepted intent;
5. derive public counts from active real records;
6. hide meaningless zero cards and keep uncertain classifications in an
   internal quality workflow rather than exposing implementation failure copy.

No fabricated records, counts or liquidity may be used to solve the empty state.

## Localisation

Ponte is English-only. English is the canonical and sole interface language.
All other interface languages, including Spanish, are deferred, with
translations retained in `messages/_deferred/` and old locale-prefixed URLs
redirected to English. Multilingual input, AI language detection and translated
display of member content are preserved.

## Recent merged implementation evidence

- PR #36: North Star two-route entry, market activity and Explore shell.
- PR #37: HS lookup CDN cache-key correction.
- PR #38: Ponte Flow design-system integration and canonical taxonomy.
- PR #39: chapter paging, home route, Products link and accurate total counts.
- PR #40: landing flow refinement, separate signal actions and composer fixes.

## Production unknowns requiring evidence

Before claiming the complete application or the new market model is live, record:

1. the deployed commit SHA for `ponte.trade`;
2. production values of relevant journey flags;
3. direct exercise of all three Start a deal families and intents;
4. current production schema versus the migration ledger;
5. exact active counts by family, origin and intent;
6. classification coverage and confidence for product sectors;
7. expiry, deduplication, provenance and source-term behaviour for every
   external ingestion source.

## Immediate next actions

1. Review and merge the source-of-truth governance pull request after checks.
2. Create an owner-approved ExecPlan for the unified market-record implementation.
3. Audit the current database and activity readers against ADR-0001 before
   proposing migrations.
4. Implement the smallest backwards-compatible vertical slice that supports all
   member-created intents and truthful counts.
5. Build separate, legitimate ingestion pipelines for Trade services and
   Distribution and representation, with provenance, deduplication and expiry.
6. Repair product sector classification and remove meaningless public zero states.
