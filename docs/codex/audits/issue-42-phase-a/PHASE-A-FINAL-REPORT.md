# Issue 42 Phase A - final reconciliation report

**Completed:** 26 July 2026  
**Production probe:** Supabase production SQL Editor, executed by Giuseppe Funaro at `2026-07-26T10:45:41.549418` UTC  
**Database:** PostgreSQL 17.6, database `postgres`, role `postgres`  
**Authority:** Issue #42 and ADR-0001  
**Phase boundary:** Audit and reconciliation only; no migration, backfill, runtime change, source activation or deployment

## Executive verdict

Phase A is complete enough to support Phase B application-contract design.

The production database confirms the repository audit: Ponte currently has two factually separate inventory sources, but neither persists the accepted canonical `market_family` and seven-value `intent` contract.

The public market is almost entirely external Market Signals. Native public inventory is not currently viable under the publication-eligibility rules, Trade services has no stored approved inventory, and Distribution and representation has no canonical stored representation.

## Production inventory

| Measure | Production result |
|---|---:|
| Total `desk_radar` rows | 6,735 |
| Approved signal rows, regardless of current expiry | 3,543 |
| Approved and unexpired public Market Signals | 3,517 |
| Public signal requirements | 2,526 |
| Public signal offers | 991 |
| Approved signal rows already outside public expiry | 26 |
| Total listings | 4 |
| Approved listings | 2 |
| Approved/current listings before owner eligibility | 2 |
| Approved/current listings with a bound passing member-business verification | 0 |
| Ponte-desk-managed listings | 2 |
| Legacy service listing rows | 0 |
| Signal investigations | 1 |

### Interpretation

- The 3,517 publicly active signals are the real market inventory currently supporting Explore and entry activity.
- The two approved listings are both Ponte-desk-managed and current by date/reconfirmation, but neither has the bound passing `member_business` verification required by the production publication contract.
- The exact public member-opportunity inventory under the current eligibility contract is therefore zero.
- No approved or private legacy `service` listing exists in production.

## Canonical market compatibility

### Market family

Neither `listings` nor `desk_radar` has a `market_family` column.

- Products are inferred by exclusion and product-shaped fields.
- Trade services has no production listing row and no persisted external signal classification.
- Distribution and representation has no persisted record representation. One external signal matched distribution-related keywords, but that is discovery evidence only and cannot be counted as canonical Distribution inventory.

### Record origin

The origin separation is strong and should be preserved:

- `listings` is the Member Opportunity source.
- `desk_radar` is the Market Signal source.
- `signal_investigations` and `listing_connections` are actions on inventory, not inventory themselves.

### Intent

Production constraints confirm the legacy vocabularies:

- `listings.type`: `offer`, `requirement`, `service`.
- `desk_radar.side`: `offer`, `requirement`.

They cannot prove the seven accepted intents and must not be treated as equivalent to the canonical contract without an explicit compatibility adapter.

## Product classification

| Measure | Production result |
|---|---:|
| HS catalogue rows | 5,613 |
| Distinct HS chapters | 97 |
| Approved listings with valid HS code | 2 of 2 |
| Public Market Signals with HS code | 0 of 3,517 |
| Public Market Signals without HS code | 3,517 of 3,517 |
| Public signals with a source category but no HS code | 3,517 |
| Invalid listing HS values | 0 |
| Invalid signal HS values | 0 |
| Active records in intentionally unassigned chapters 71, 91 or 92 | 0 |

This proves the Explore sector defect is structural, not cosmetic. Every public signal has a source category, but none has the HS code required by the current sector-bucketing path. A deterministic source-category-to-canonical-sector mapping can therefore be evaluated before using AI classification.

## Import integrity and provenance

The `g4wb_v2` batch contains 6,441 rows:

- 3,543 approved signal rows;
- 2,898 private rows.

Every imported row has:

- canonical signal id;
- source platform;
- source URL;
- import metadata;
- dedupe key.

The probe found:

- zero duplicate canonical-id groups;
- zero duplicate dedupe-key groups;
- zero duplicate investigation-request groups;
- zero investigation-count mismatches.

There are also 294 older private rows outside the `g4wb_v2` batch:

- 204 with no source platform or source URL;
- 90 attributed to legacy `go4world`, with source URLs and raw descriptions but no canonical id/import metadata.

These older rows are private and should remain outside any public reclassification until provenance and permitted-use rules are reviewed.

## Lifecycle findings

- 26 rows remain stored as `approved_signal` although their public expiry has passed. Current readers correctly exclude them, but stored lifecycle and public lifecycle are not identical.
- The signal reader's active count is exact under its status/expiry semantics.
- Listing head counts are not exact visible-inventory counts because owner verification eligibility is a separate filter.
- Production currently demonstrates that distinction: 2 approved/current listings become 0 after the bound passing member-business verification test.

## Verification and publication findings

Production profile levels are stored as text:

- 6 `unverified`;
- 1 `company_verified`;
- 1 null.

Production contains no passing verification with `purpose = member_business`:

- 2 `member_business` cases are in `review`;
- the only `verified` case has null legacy purpose.

This means the two current approved listings do not satisfy the bound passing member-business requirement.

The repository code also converts the text `verification_level` through JavaScript `Number(...)` before applying a numeric threshold. This is a type-contract defect: text enum values become `NaN`, so the numeric comparison cannot represent the intended verification hierarchy. It requires a separate reviewed fix; Phase A does not change production.

## RLS and policy findings

RLS is enabled on all core tables inspected, including `listings`, `desk_radar`, `profiles`, `verifications`, `signal_investigations`, `listing_connections`, `hs_codes`, `anonymous_drafts` and `tombstones`.

Positive boundaries:

- `desk_radar` has no public/member read policy and remains service-role-read through named safe projections.
- investigation requests are limited to the requesting member.
- listing connections separate requester and owner actions.
- profiles and verifications restrict member reads to the relevant owner.

Risk requiring follow-up:

- the `Authenticated read approved listings` policy permits authenticated reads of rows whose status is `approved`, without encoding validity, reconfirmation or owner-verification eligibility. Whether this is exploitable also depends on table grants, which this probe did not inventory. Phase B/security review must inspect grants and ensure direct authenticated reads cannot bypass the canonical public eligibility contract or expose non-public listing columns.

## Database drift confirmed

Production contains the previously documented profile columns absent from the base schema, including account, plan, trust, verification and organisation fields.

Production also confirms the additive July listing, signal-import, verification-purpose and investigation-kind structures. The historical migration chain remains unsuitable as proof that a fresh project reproduces production; this phase does not attempt to repair or replay it.

The compact probe displayed `schema_migrations` more than once in its table-inventory section because its metadata join matched tables with that name outside the public schema. This is a probe-format defect, not evidence that four public migration tables exist. No production conclusion relies on that duplicated row.

## Phase A acceptance result

| Acceptance item | Result |
|---|---|
| Repository subsystem audit | Complete |
| Field-by-field compatibility matrix | Complete |
| Production schema and constraints | Complete for Issue #42 scope |
| Production RLS/policy inventory | Complete for named tables; grants remain a Phase B/security check |
| Exact inventory counts | Complete |
| HS and sector coverage | Complete |
| Import provenance and duplicate checks | Complete |
| Production drift recorded | Complete for the relevant market-record scope |
| Migration proposal | Not started, as required |
| Runtime implementation | Not started, as required |

## Authorised next step after owner approval

Phase B may design the smallest backwards-compatible application contract and adapters for:

- `market_family`;
- `record_origin`;
- canonical `intent`;
- origin-specific lifecycle normalisation;
- product/service/distribution classification;
- classification method, confidence and review state;
- exact truthful public counts.

Phase B must not apply a database migration. A migration and backfill proposal remains a later owner-reviewed step with a dedicated pre-migration report.