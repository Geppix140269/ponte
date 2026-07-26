# Issue 42 Phase A - market-record reconciliation

**Issue:** #42
**Branch:** `issue-42/phase-a-audit`
**Status:** In progress
**Started:** 26 July 2026
**Owner decision:** Start Phase A only. Audit and reconcile before proposing implementation or migration.

## 1. Purpose and user outcome

Ponte Trade has accepted one unified market with three equal families:

1. Products
2. Trade services
3. Distribution and representation

Each family must contain both externally observed Market Signals and Ponte member-created Member Opportunities. The current application only partially represents that model. Phase A establishes the exact compatibility boundary between the accepted contract and the current repository and production database.

The user outcome of this phase is not a new screen. It is a dependable implementation baseline: every later database, ingestion, composer, Explore, search and count change can be designed against verified facts rather than assumptions.

## 2. Authority consulted

Read and governing for this plan:

- `AGENTS.md`
- `docs/codex/SOURCE-OF-TRUTH-SOP.md`
- `docs/decisions/ADR-0001-unified-trade-market.md`
- `docs/schemas/market-taxonomy.yaml`
- `docs/schemas/market-record.schema.json`
- `lib/taxonomy/market.ts`
- `docs/codex/DATABASE-STATE.md`
- `docs/codex/CURRENT-STATE.md`
- `.agent/PLANS.md`
- Issue #42

Supporting repository evidence inspected:

- `lib/board/live-deals.ts`
- `lib/board/market-signals.ts`
- `lib/board/market-activity.ts`
- `lib/board/activity-logic.ts`
- `lib/explore/families.ts`
- `lib/market-signals/logic.ts`
- `lib/market-signals/import-map.ts`
- `lib/structure/draft.ts`
- `app/api/marketplace/submit/route.ts`
- `lib/listings/publication-gate.ts`
- relevant migrations dated 22-26 July 2026
- `scripts/import-market-signals.ts`

## 3. Current implementation discovered

### 3.1 Member records

Member-created commercial records are stored in `listings` and use the legacy `type` vocabulary:

- `offer`
- `requirement`
- `service`

The current code can infer product offer, product requirement and one service class from those values. It cannot prove the accepted seven intents, and it cannot represent Distribution and representation.

The Structure draft and submit route are product-shaped. A service still requires a `product` and is routed through the HS product picker. The service class currently means an offered service; there is no native seek-service intent.

Member publication already has valuable controls that should be preserved:

- draft, submission, desk review and approval states;
- validity and reconfirmation;
- current member-business verification;
- sanctions cleanliness;
- required commercial facts;
- desk-approved public qualification and limitations;
- material changes returning an approved record to review;
- owner eligibility checked on public reads.

### 3.2 External records

External Market Signals are stored in `desk_radar` and remain factually separate from member listings. The public reader requires `approved_signal` and a current public expiry and selects an explicit public column list that excludes source identity, source URL, raw prose, counterparty identity and notes.

The current external signal model has only two sides:

- `offer`
- `requirement`

It has no persisted market family or canonical intent. The Go4WorldBusiness import maps every record as a product-shaped offer or requirement. It sets `hs_code` to null because the source workbook has no clean HS field. This is the direct reason imported product signals can count as Products while no product sector can claim them.

The import preserves useful internal provenance in `import_meta`, `source_platform`, `source_url`, `raw_description`, `dedupe_key` and `import_batch`. It does not yet provide a repository source register containing terms-of-use, permitted public fields, attribution obligations, removal procedure and refresh policy.

### 3.3 Signal actions

`signal_investigations` stores member actions on an external Market Signal. `request_kind` distinguishes:

- `investigate`
- `capability`

A capability declaration is currently subordinate to the external signal. It is not a standalone Member Opportunity and therefore must not be counted as native member supply or demand without a deliberate conversion workflow.

### 3.4 Public activity and counts

`getMarketActivity` merges two independently filtered readers:

- public member listings;
- public Market Signals.

The merged presentation retains record class, which should be preserved. Current `ActivityKind` values are:

- `market_signal`
- `member_requirement`
- `member_offer`
- `service_requirement`

There are two semantic problems:

1. `service_requirement` is produced by a listing whose legacy type is `service`, but the Structure copy describes that path as offering a service.
2. no ActivityKind represents Distribution and representation.

The total count uses direct `head: true` counts. The signal count applies status and public expiry. The listing count applies only `status = approved`, so it is an upper bound rather than the exact count of records surviving validity, reconfirmation and owner-eligibility filtering.

### 3.5 Explore classification

Explore imports the canonical family keys, but family membership is still inferred from legacy ActivityKind values:

- `service_requirement` becomes Trade services;
- every other activity becomes Products;
- Distribution always returns no records.

Product-sector membership requires an HS chapter. Imported signals have no HS code, so they remain product records while all sector counts can remain zero.

### 3.6 Production evidence status

Repository migrations and previous pull-request reports provide historical evidence, but Phase A does not treat those reports as a current production probe.

A read-only production probe is required to establish:

- current columns, constraints, indexes, triggers, functions, policies and RLS;
- actual status and type vocabularies in stored rows;
- exact active counts by legacy source and type;
- HS coverage and sector coverage;
- duplicate and provenance coverage;
- current source batches and expiry behaviour;
- drift between the live database and repository migrations.

The probe is prepared in `docs/codex/audits/issue-42-phase-a/PRODUCTION-PROBE.sql`. It has not been executed in this branch because no authorised production database connection is available in this session.

## 4. Scope

### Included

- repository audit of member listings, Market Signals and signal actions;
- public-reader and count semantics;
- Structure draft and submit payload;
- Explore family and sector classification;
- publication, expiry, withdrawal, verification and review controls;
- import, provenance and deduplication behaviour;
- field-by-field compatibility matrix to ADR-0001;
- read-only production probe specification;
- current-state documentation.

### Excluded

- database migrations;
- schema changes;
- production SQL execution;
- data backfill;
- UI or composer changes;
- source activation, scraping or API ingestion;
- public count or empty-state changes;
- production deployment;
- closing Issue #42.

## 5. Product rules

The audit must preserve these non-negotiable distinctions:

- A Market Signal is externally observed and unconfirmed. It is not renamed a Member Opportunity.
- A Member Opportunity is created and owned by a Ponte member or an explicitly authorised Ponte-managed account.
- The three families are equal market families, not Products plus two directories.
- Every future record must have one family, one origin and one family-valid intent.
- No missing family or classification may be solved by inventing records, demand, supply or counts.
- Public records must retain truthful lifecycle, attribution limitations and privacy boundaries.
- Contact disclosure and commercial execution remain controlled actions.

## 6. Technical design of the audit

Phase A produces documents, not runtime changes.

### Deliverables

1. This ExecPlan.
2. `docs/codex/audits/issue-42-phase-a/COMPATIBILITY-MATRIX.md`.
3. `docs/codex/audits/issue-42-phase-a/PRODUCTION-PROBE.sql`.
4. An updated `docs/codex/CURRENT-STATE.md` recording Phase A status and the production-evidence boundary.
5. An updated `docs/codex/ACTIVE-MILESTONE.md` making Issue #42 Phase A the active milestone.
6. A draft pull request that stops before merge.

### Evidence levels

Every conclusion is marked as one of:

- **Repository-proven:** directly established by current `main` code or migrations.
- **Historically reported:** stated in a merged PR or prior production report but not re-probed in this phase.
- **Production-proven:** established by the read-only production probe.
- **Unknown:** not supported yet.

No historically reported fact is promoted to Production-proven without a current probe result.

## 7. Migration plan

No migration is permitted in Phase A.

The compatibility matrix may identify fields that are absent, overloaded or semantically incompatible. It must not prescribe the final database alteration. Phase B may design a backwards-compatible application contract after Phase A evidence is accepted. Any later database proposal requires the pre-migration report defined in `docs/codex/DATABASE-STATE.md` and explicit owner approval.

Rollback is therefore simple: close the audit PR without merge. No runtime or production state changes.

## 8. Experience states

No user-facing experience changes in this phase.

The audit must nevertheless record the states later implementation must handle:

- loading and database-unavailable reads;
- truly empty family;
- family inventory not yet classified;
- uncertain product classification;
- expired or withdrawn record;
- member no longer publicly eligible;
- source record removed or no longer permitted;
- duplicate external signal;
- action subordinate to a signal versus standalone opportunity;
- resumed member draft;
- blocked publication and returned-to-review states.

## 9. Validation

Required before Phase A is called complete:

- all compatibility-matrix statements link to repository evidence or production-probe output;
- the production probe contains SELECT-only statements;
- current production schema and record counts are recorded, or the phase remains explicitly blocked on that evidence;
- no migration or runtime change appears in the diff;
- `npm run verify` passes in CI;
- Netlify preview passes even though this is documentation-only;
- PR remains unmerged until owner approval.

## 10. Rollout and safe-disable

There is no product rollout. The audit documents become authoritative only after owner review and merge.

If a finding is disputed, mark it unresolved in the matrix rather than forcing a decision. If production contradicts repository expectations, stop and record the drift before any implementation proposal.

## 11. Progress log

### 26 July 2026

Completed:

- owner authorised Issue #42 Phase A;
- created branch `issue-42/phase-a-audit` from `main`;
- inspected the governing contract and database guardrails;
- inspected member listing readers, signal readers, unified activity and counts;
- inspected Structure draft and submit payload;
- inspected listing publication controls;
- inspected signal lifecycle and investigation migrations;
- inspected Go4WorldBusiness import mapping, provenance and deduplication;
- identified the legacy service semantic mismatch and missing distribution representation;
- identified the exact reason product totals can coexist with zero sector counts;
- prepared the initial compatibility matrix and read-only production probe.

Remaining:

- execute the read-only production probe through an authorised production connection;
- attach the resulting output or a dated production-state report;
- reconcile any live drift with repository migrations;
- fill exact active counts and classification coverage in the matrix;
- run CI and preview checks on the draft PR;
- owner review and decision on whether Phase A is complete enough to merge.

## 12. Decisions and discoveries

1. The accepted logical contract is substantially richer than the current persisted vocabularies.
2. `listings.type` is overloaded and cannot prove all seven member intents.
3. `desk_radar.side` cannot prove family or service/distribution intent.
4. Imported signals deliberately carry no HS code, so the current sector-count failure is structural, not merely a rendering bug.
5. The current service ActivityKind is named as a requirement while its creation path is an offer.
6. Distribution is taxonomy-only in the current activity pipeline.
7. A capability declaration on a Market Signal is an action, not automatically a native Member Opportunity.
8. The total public listing count is an upper bound because its head count does not apply per-row validity, reconfirmation and owner eligibility.
9. Existing member-publication and Market Signal privacy controls are reusable and should not be weakened by unification.
10. Production inspection is still required before any migration design.

## 13. Final evidence

Not yet complete. This section will record:

- production probe date and executor;
- production schema evidence;
- exact count and classification results;
- final audit commit;
- pull request and checks;
- owner review outcome;
- any unresolved limitations carried into Phase B.
