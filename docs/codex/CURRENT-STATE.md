# Current state

**Reconciled:** 26 July 2026
**Repository:** `Geppix140269/ponte`
**Canonical branch:** `main`
**Canonical commit at Phase A start:** `accd1cc8b03bee19f4c143bf2314b7025de016fc`
**Governing authority (entry experience):** `docs/ponte-authority/00-NORTH-STAR-ENTRY-ARCHITECTURE.md`
**Governing authority (everything downstream of entry):** `docs/ponte-authority/00-MASTER-IMPLEMENTATION-BRIEF.md`
**Unified market decision:** `docs/decisions/ADR-0001-unified-trade-market.md`

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
A merged audit is not proof that production matches the repository.

## Implementation summary

| Area | Repository status | Production status | Notes |
|---|---|---|---|
| Source-of-truth operating procedure | On `main` via PR #41 | Operating rule, not a production feature | `AGENTS.md`, `CLAUDE.md`, the SOP, ADR system, proposal intake, PR checklist and governance checks are canonical. |
| Unified three-family market contract | Accepted and on `main` via PR #41 | Production database and end-to-end flows not reconciled | ADR-0001 defines Products, Trade services, and Distribution and representation as equal families, each containing Market Signals and Member Opportunities. |
| Issue #42 Phase A reconciliation | Implemented on branch `issue-42/phase-a-audit`; production probe pending | Not production-verified | Repository compatibility matrix and a SELECT-only production probe are prepared. No migration, runtime change, source activation or deployment is included. |
| Founding-launch integrity Blocks A-F | On `main` | Production database changes recorded as applied; deployed state needs direct confirmation | Separates Market Signals and member opportunities, purpose-binds business verification, strengthens publication gates, controlled introductions and founding lifecycle. |
| North Star entrance: two routes and market activity | On `main` via PR #36; visual flow refinement via PR #40 | PR #40 reports live exercise, but Phase A has not independently verified the deployed SHA | Two direct routes: Explore the market and Start a deal. Activity band, search, popular areas and trust/evidence explanation are implemented. |
| Explore the market | On `main` via PR #36; Flow taxonomy integration via PR #38; count correction via PR #39 | Owner screenshots show the deployed surface; exact data state requires probe | Three families and 15 product sectors render. Product totals use count queries, but family and sector membership still depend on legacy classifications. |
| Canonical market taxonomy | On `main` | Logical contract, not a production data contract | `lib/taxonomy/market.ts` defines families, origins, intents, product sectors, service categories and distribution modes. |
| Product market inventory | On `main` | Active records reported; exact count and mapping quality pending probe | Imported product signals deliberately have no HS code in the current mapper, so they can count as Products while no sector claims them. |
| Trade services inventory | Partially implemented | Thin or zero on current surface | One legacy member `service` type exists. It does not distinguish seeking from offering, and external service signals are not ingested/classified. |
| Distribution and representation inventory | Designed in taxonomy; no current record/activity proof | Empty or shown without count | Distribution modes exist in taxonomy only. Member creation and external ingestion are incomplete. |
| Unified market-activity read | On `main` | Live state requires direct verification | Member records and Market Signals are merged for presentation while retaining their true origin class. Row reads are bounded. |
| Journey 1 - Find | On `main` | Feature-flag and live-route status require confirmation | Product discovery, signal detail and controlled actions exist. It is not aligned to all three families and seven intents. |
| Journey 2 - Structure & Submit / Start a deal | On `main`; blockers fixed in PRs #37, #39 and #40 | PR #40 reports live exercise | Current persisted types are `offer`, `requirement`, `service`. Services remain product-shaped; distribution paths do not exist. |
| Market Signal investigation | Partially implemented and extended on `main` via PR #40 | PR #40 reports additive migration applied and live forms exercised | Investigation and capability declarations are separate actions. A capability declaration remains subordinate to a signal, not a standalone Member Opportunity. |
| Check and verify journey K01-K09 | Partially implemented; review fixes on `main` | Existing surfaces may be live; complete journey not production-verified | Registry, sanctions, admin and receipt infrastructure are reusable. |
| Commercial Missions M01-M07 | Not started or unconfirmed pending audit | Not production-verified | Existing reusable structures must be mapped before schema proposals. |
| Commercial Developments D01-D05 | Not started or unconfirmed pending audit | Not production-verified | Must remain a cited, private Mission-specific synthesis. |
| Prepared actions and approvals X01-X07 | Partially implemented infrastructure | Not production-verified as a complete journey | Controlled introductions and account resumption provide reusable pieces. |
| Business Passport and Vault B01-B08 | Partially implemented or missing pending audit | Not production-verified | Person, business and membership must not be permanently merged. |
| Complete admin operations A01-A09 | Partially implemented | Individual queues may be live; complete priority model not verified | Existing listing, verification, signal and investigation review surfaces are reusable candidates. |

## Current market-model truth

The accepted logical model is:

```text
Market family: Products | Trade services | Distribution and representation
Record origin: Market Signal | Member Opportunity
Intent: one family-valid seeking or offering intent
```

This model is recorded in ADR-0001, `lib/taxonomy/market.ts` and
`docs/schemas/`. The existing database and public activity model do not yet
represent every combination. Phase A has established the following as
Repository-proven:

- `listings.type` stores only `offer`, `requirement` or `service`;
- `desk_radar.side` stores only `offer` or `requirement`;
- the current service path describes an offered service while ActivityKind names
  it `service_requirement`;
- no current record or ActivityKind proves Distribution and representation;
- imported product Market Signals are written with `hs_code = null`;
- a Market Signal capability declaration is an action, not a native opportunity;
- existing `ActivityKind` values do not expose the full family/origin/intent
  contract.

Therefore the three-family architecture is **accepted and partially encoded**,
not end-to-end implemented.

## High-risk Phase A discovery

The repository contains an unresolved verification-level type mismatch:

- `scripts/seed-ponte-managed-qos.ts` states that
  `profiles.verification_level` is a text enum and writes
  `company_verified`;
- `lib/listings/publication-gate.ts` converts that value with
  `Number(verification_level)` and compares it with numeric level 2.

In JavaScript, `Number('company_verified')` is `NaN`, and `NaN < 2` is false.
That means the numeric comparison does not prove the textual verification level
is eligible. The other bound-verification checks still apply, but the level
check itself is not trustworthy for a text enum.

Phase A does not patch this behaviour. The production probe must confirm the live
column type and stored values. A targeted corrective PR should then be separated
from the market-schema work if the mismatch is confirmed.

## Data-quality and empty-state defects

The current public Explore surface can show a non-zero Products total while all
product sectors show zero, because many product records have no HS chapter. It
can also show empty Trade services and Distribution families because those
pipelines are incomplete.

Required outcome, not yet implemented:

1. reconcile reported product totals against active underlying records;
2. classify and backfill product sectors with confidence and review handling;
3. ingest legitimate, source-linked service and distribution Market Signals;
4. support member-created opportunities for every accepted intent;
5. derive public counts from active real records;
6. hide meaningless zero cards and keep uncertain classifications in an internal
   quality workflow rather than exposing implementation failure copy.

No fabricated records, counts or liquidity may be used to solve the empty state.

## Count semantics discovered in Phase A

- The Market Signal head count applies `approved_signal` and public expiry.
- The member-listing head count applies only `status = approved`.
- The row reader additionally applies validity, 90-day reconfirmation and current
  owner eligibility.
- The displayed overall total can therefore overstate currently visible member
  inventory.
- Family and sector counts are computed from bounded rows and legacy inferred
  kinds, not from canonical family-specific count queries.

## Localisation

Ponte is English-only. English is the canonical and sole interface language.
All other interface languages are deferred, with translations retained in
`messages/_deferred/` and old locale-prefixed URLs redirected to English.
Multilingual input, AI language detection and translated display of member
content are preserved.

## Recent merged implementation evidence

- PR #36: North Star two-route entry, market activity and Explore shell.
- PR #37: HS lookup CDN cache-key correction.
- PR #38: Ponte Flow design-system integration and canonical taxonomy.
- PR #39: chapter paging, home route, Products link and total count correction.
- PR #40: landing flow refinement, separate signal actions and composer fixes.
- PR #41: source-of-truth SOP, ADR-0001 and unified logical market contract.

## Production unknowns requiring evidence

Before claiming the complete application or unified market model is live, record:

1. the deployed commit SHA for `ponte.trade`;
2. production values of relevant journey flags;
3. current production schema versus the migration ledger;
4. exact active counts by family, origin and intent;
5. exact visible member count after validity, reconfirmation and owner eligibility;
6. product HS and sector-classification coverage;
7. the live data type and value vocabulary of `profiles.verification_level`;
8. expiry, deduplication, provenance and source-term behaviour for each external source;
9. direct exercise of all three Start a deal families and accepted intents after they exist.

The read-only query set is in
`docs/codex/audits/issue-42-phase-a/PRODUCTION-PROBE.sql`.

## Immediate next actions

1. Execute the Phase A read-only production probe through an authorised database connection.
2. Record the output, execution date, project and executor without changing production.
3. Reconcile live drift in the compatibility matrix.
4. Run CI and preview checks on the Phase A draft PR.
5. Stop for owner review before merge.
6. Do not begin Phase B contract design or any migration until Phase A evidence is accepted.
