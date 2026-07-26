# Issue 42 Phase A - compatibility matrix

**Status:** Repository audit complete; production probe pending
**Date:** 26 July 2026
**Accepted target:** ADR-0001 unified three-family market

## Evidence key

- **Repository-proven:** established directly from current `main` code or migrations.
- **Historically reported:** stated in a merged pull request or prior production note, but not re-probed in this phase.
- **Production-proven:** established by the Phase A read-only production probe.
- **Unknown:** no adequate evidence yet.

No item in this document is Production-proven until the results of `PRODUCTION-PROBE.sql` are recorded.

## Executive compatibility result

| Contract area | Current compatibility | Evidence | Main gap |
|---|---|---|---|
| Three equal market families | Partial | Repository-proven | Products and one service class can be inferred; Distribution has no record representation. |
| Market Signal versus Member Opportunity | Strong core separation | Repository-proven | The shared presentation is truthful, but neither source carries the complete canonical family and intent contract. |
| Seven canonical intents | Incompatible | Repository-proven | Existing vocabularies are `offer`, `requirement`, `service` and signal side `offer`, `requirement`. |
| Lifecycle | Partial, reusable | Repository-proven | Separate listing and signal lifecycles exist but need a canonical compatibility layer. |
| Ownership and provenance | Partial, reusable | Repository-proven | Member ownership is strong; external provenance is stored internally but has no complete source-governance register. |
| Product classification | Partial | Repository-proven | Member records can carry HS codes; imported signals deliberately have `hs_code = null`. |
| Trade service classification | Weak | Repository-proven | One legacy service listing type exists; no seek-service intent and no external service-signal pipeline. |
| Distribution classification | Missing | Repository-proven | Taxonomy exists but no current activity or persisted record class proves it. |
| Public counts | Partial | Repository-proven | Signal count is close to exact; listing head count is an upper bound and family counts depend on legacy inference. |
| Production schema and counts | Pending | Unknown | Current live schema, drift, counts and coverage must be probed. |

## 1. Canonical record spine

The accepted record spine is one value from each dimension:

```text
market_family + record_origin + intent + lifecycle + ownership/provenance
```

### 1.1 Market family

| Canonical value | Existing proof source | Current mapping | Compatibility | Required follow-up |
|---|---|---|---|---|
| `products` | `listings.type`; `desk_radar.side`; product text; optional HS code | Every non-service activity is treated as Products. | Partial | Add a canonical compatibility adapter; stop inferring family only by excluding service. |
| `services` | `listings.type = service` | Mapped to `service_requirement` ActivityKind. | Partial and semantically inconsistent | Determine whether each legacy service row is seeking or offering. Add external service signal classification. |
| `distribution` | None in current record/activity data | Explore returns no items. | Missing | Production probe for any latent rows or fields, then Phase B contract design. |

### 1.2 Record origin

| Canonical value | Existing source | Current mapping | Compatibility | Notes |
|---|---|---|---|---|
| `member_opportunity` | `listings` with `user_id` | Member requirement, member offer or service class | Strong source separation, incomplete intent | Ownership, review and publication controls already exist. |
| `market_signal` | `desk_radar` | `market_signal` ActivityKind | Strong source separation, incomplete family/intent | Public/internal field split and signal expiry are reusable. |

There is no acceptable mapping in which a `signal_investigations.request_kind = capability` row silently becomes a Member Opportunity. It is a member action attached to an external signal. A conversion into a standalone opportunity would require an explicit member review and submission flow.

### 1.3 Canonical intent

| Market family | Canonical intent | Existing candidate mapping | Compatibility | Ambiguity or loss |
|---|---|---|---|---|
| Products | `source_product` | `listings.type = requirement`; `desk_radar.side = requirement` | Partial | Existing value does not persist family. A requirement could later be a service or distribution requirement. |
| Products | `offer_product` | `listings.type = offer`; `desk_radar.side = offer` | Partial | Existing value does not persist family. |
| Trade services | `seek_trade_service` | None | Missing | Search and Structure have no native member path; external signal import has no service family. |
| Trade services | `offer_trade_service` | `listings.type = service` | Partial | Current draft still requires product/HS selection and the ActivityKind calls it `service_requirement`. |
| Distribution | `seek_distribution_or_representation` | None | Missing | Cannot be proven from current record fields. |
| Distribution | `offer_distribution_or_representation` | None | Missing | Cannot be proven from current record fields. |
| Distribution | `seek_products_or_brands_to_distribute_or_represent` | None | Missing | Cannot be proven from current record fields. |

## 2. Field-by-field record compatibility

### 2.1 Identity and classification

| Canonical field | `listings` | `desk_radar` | Current public model | Compatibility finding |
|---|---|---|---|---|
| `id` | `id` | `id` | Prefixed activity key plus source id | Compatible. |
| `market_family` | Absent | Absent | Inferred from ActivityKind | Missing persisted proof. |
| `record_origin` | Implied by table | Implied by table | ActivityKind/class label | Compatible by adapter; should not be duplicated inconsistently. |
| `intent` | Legacy `type` | Legacy `side` | Member kind or generic signal | Incompatible with seven canonical intents. |
| `title` | `product` is used as primary label | `product` and `summary_line` | `ActivityItem.product` | Partial. Product-shaped naming is unsuitable for some services and distribution relationships. |
| `summary` | `desk_version`, `details`, write-up fields | `summary_line`, `ai_description` | Signal detail uses safe paraphrase | Partial; public authority differs by origin and must remain distinct. |
| `product_name` | `product` | `product` | `product` | Compatible for Products; overloaded elsewhere. |
| `hs_code` | `hs_code` FK to catalog where present | `hs_code`, imported as null by current mapper | Chapter derived from code | Partial; no classification proof for most imported signals. |
| `product_sector` | Derived from HS chapter | Derived from HS chapter | Explore sector range | Missing for no-HS records; no stored classification method/confidence. |
| `service_category` | Absent | Absent | Inferred only from legacy service kind; taxonomy labels not persisted | Missing. |
| `distribution_mode` | Absent | Absent | Taxonomy only | Missing. |
| `classification_method` | Absent | `import_meta.match_method` is source matching, not canonical family classification | Not public | Missing canonical field. |
| `classification_confidence` | Absent | `import_meta.match_confidence` may exist but semantics are source-specific | Not used by Explore | Partial source evidence, not a canonical classification contract. |
| `classification_review_state` | Absent | review flags inside import metadata | Not used | Missing canonical workflow. |

### 2.2 Commercial direction and geography

| Canonical field | `listings` | `desk_radar` | Compatibility finding |
|---|---|---|---|
| `origin_text` | `origin` | `origin` | Compatible. |
| `origin_country` | `origin_country` plus derived code in reader | Source text plus ISO fields inside `import_meta` | Partial; signal public row does not expose a dedicated ISO column. |
| `destination_text` | `destination` | `destination` | Compatible. |
| `destination_country` | `destination_country` plus derived code in reader | Source text plus ISO fields inside `import_meta` | Partial. |
| `target_markets` | Not a first-class array | Not a first-class array | Missing for multi-market distribution and service records. |
| `territory_scope` | Not first-class | Not first-class | Missing. |
| `exclusivity` | Not first-class | Not first-class | Missing for distribution. |
| `corridor` | Origin and destination | Origin and destination | Reusable for products and transport services, but not universally required. |

### 2.3 Quantity, terms and timing

| Canonical field | `listings` | `desk_radar` | Compatibility finding |
|---|---|---|---|
| `quantity` | Structured numeric plus legacy volume | `qty` | Compatible where relevant. |
| `unit` | `unit` | `unit` | Compatible where relevant. |
| `frequency` | `frequency` | Raw/source metadata may contain related facts | Partial. |
| `incoterm` | `incoterm` | `incoterms` | Compatible for product trade; not universally relevant. |
| `payment_terms` | `payment_terms` | `payment` | Compatible. |
| `indicative_value` | `indicative_value_usd` | No canonical public value | Partial and currency-specific. |
| `validity_type` | `dated` or `standing` | No equivalent type | Partial. |
| `valid_until` | `valid_until` | `valid_until` source date plus `public_expires_at` | Compatible dates with different meanings; must not be collapsed. |
| `observed_at` | Not applicable to native posting | `spotted_at` | Compatible for Market Signals. |
| `published_at` | Status/created timestamps, no dedicated public approval timestamp in reader | `published_at` | Partial. |
| `reconfirmed_at` | `reconfirmed_at` | No equivalent; signal may be refreshed/reimported | Origin-specific, preserve separate semantics. |

### 2.4 Lifecycle

| Canonical concept | Member listing implementation | Market Signal implementation | Compatibility finding |
|---|---|---|---|
| Draft/private intake | `draft`, `submitted` | `private` | Reusable but origin-specific. |
| Review | `submitted`; admin publication gate | Admin approval into `approved_signal` | Reusable, distinct processes. |
| Public active | `approved` plus current validity/reconfirmation/owner eligibility | `approved_signal` plus public expiry | Compatible through a canonical read adapter, not one shared status column. |
| Returned to review | Material change sets listing to `submitted` | Not equivalent | Member-specific. |
| Under investigation | No equivalent listing state | `under_investigation` | Signal-specific. |
| Confirmed/promoted | Normal listing may be created and linked via `promoted_listing_id` | `confirmed` | Useful bridge, but the signal remains a signal. |
| Expired | `expired` or computed non-current | `expired` or computed public expiry | Compatible concept, differing mechanics. |
| Withdrawn | `withdrawn` | `withdrawn` | Compatible concept. |
| Unavailable | No direct equivalent | `unavailable` | Signal-specific. |
| Rejected | `rejected` | Private/not approved rather than public rejection | Origin-specific. |
| Archived/closed | `closed`, `closed_done`, `archived` | No direct equivalent | Member-specific. |

A future unified API can normalise lifecycle for filtering while retaining the origin-specific status as evidence. Replacing both status vocabularies with one value is not required and could erase material distinctions.

### 2.5 Ownership, permission and privacy

| Contract requirement | Existing implementation | Compatibility finding |
|---|---|---|
| Member owner | `listings.user_id` | Compatible. |
| Business ownership/binding | Profile and member-business verification relationship | Partial; listing ownership is person/user based, while canonical organisation ownership needs explicit review. |
| External source provenance | `source_platform`, `source_url`, `raw_description`, `import_meta`, `import_batch` | Strong storage foundation. |
| Public source limitations | Public reader excludes internal source and counterparty fields | Strong privacy boundary. |
| Source terms and licence | No complete source register found in current ingestion path | Missing governance evidence. |
| Removal process | Batch delete handle exists; record-level source removal policy not documented | Partial. |
| Public third-party identity | Explicitly excluded from Market Signal reads | Compatible and must be preserved. |
| Controlled disclosure | Listing connections and signal investigation actions are separate controlled records | Reusable. |
| Member read/write RLS | Listings and action records use authenticated ownership policies and server checks | Partial; production policy inventory pending probe. |
| Anonymous public access | Server readers select safe columns through admin client | Reusable but high-trust code path; exact public contract must remain tested. |

## 3. Existing tables and their canonical roles

| Table | Current role | Canonical role | Keep/adapt decision for Phase A |
|---|---|---|---|
| `listings` | Member-created offers, requirements and service rows | Member Opportunity source table or compatibility source | Keep. Requires Phase B compatibility design. |
| `desk_radar` | External Market Signals | Market Signal source table or compatibility source | Keep. Requires family/intent classification strategy. |
| `signal_investigations` | Member request/capability action on a signal | Action linked to Market Signal | Keep separate from market inventory. |
| `listing_connections` | Structured interest in a member listing | Controlled response/action linked to Member Opportunity | Keep separate from market inventory. |
| `hs_codes` | Official HS 2022 catalogue | Product classification authority | Keep. Does not classify no-HS imports by itself. |
| `profiles` | Member profile and current verification binding | Actor/business eligibility support | Keep, but person/business separation needs later architecture review. |
| `verifications` | Evidence and status for checks | Publication eligibility evidence | Keep. |
| `anonymous_drafts` | Pre-account draft persistence | Draft continuation support | Potentially reusable for all families after compatibility work. |
| `tombstones` | Anonymised closed outcome proof | Outcome evidence, not active inventory | Keep separate. |

## 4. Reader and API compatibility

### 4.1 Member public reader

`getLiveDeals` is repository-proven to:

- select approved listings;
- apply listing validity and reconfirmation;
- apply current owner eligibility;
- expose a bounded safe projection;
- derive HS chapter and country codes;
- fail closed into an empty array.

Gap: it returns a legacy `LiveDeal` and cannot expose canonical family/intent without an adapter or new persisted proof.

### 4.2 Market Signal public reader

`getMarketSignals` is repository-proven to:

- select only `approved_signal` rows;
- apply public expiry;
- select a named safe public column list;
- exclude internal source, raw prose and counterparty data;
- fail closed into an empty array.

Gap: it cannot expose service/distribution family or any canonical intent beyond product-like offer/requirement.

### 4.3 Unified activity reader

`getMarketActivity` correctly merges presentation while preserving origin class. It must not become a database union that erases provenance or publication rules.

Count limitations:

- Market Signal head count applies status and expiry and is expected to be exact for that table.
- Listing head count applies only `status = approved`; it does not apply validity, reconfirmation or owner eligibility. It is therefore an upper bound.
- Family counts are computed from the bounded item read, not from family-specific count queries.
- Distribution has no items.

### 4.4 Structure and submit

The current draft and API accept only:

```text
offer | requirement | service
```

The submit route also requires non-empty `product` and `details`. This is incompatible with a service such as customs clearance or a distributor relationship that does not have one HS-coded product at creation time.

The service path is internally inconsistent:

- UI/summary text says an offered trade service;
- ActivityKind labels it `service_requirement`;
- no canonical `offer_trade_service` value is persisted.

## 5. Import, provenance and deduplication

| Area | Current implementation | Finding |
|---|---|---|
| Import source | Go4WorldBusiness workbook | One product-signal source only. |
| Stable identity | `canonical_signal_id` | Good idempotent spine. |
| Upsert | On canonical id | Good for re-importing the same prepared dataset. |
| Dedupe | Canonical id plus legacy `dedupe_key` | Does not establish cross-source semantic dedupe. |
| Public decision | `publishable && !review_required` | Deterministic, but current source policy must be reconciled with the later individual-approval rule and actual production rows. |
| Provenance | Source fields and `import_meta` | Strong internal retention. |
| Raw prose | Internal only | Correct. |
| Public paraphrase | `clean_title`, `clean_description` | Correct approach if source terms permit derived public summaries. |
| Expiry | Earlier source expiry or 90-day public horizon | Reusable. |
| Source terms | Not found in a source register | Blocking gap before new source activation. |
| Removal | `import_batch` rollback handle | Useful, but source-specific removal and correction process is not documented. |
| Classification | Source canonical category stored; HS code null | Current Explore ignores source category for sector bucketing. |

## 6. Product-sector coverage

Repository-proven classification path:

```text
record.hs_code -> two-digit chapter -> PRODUCT_SECTORS range
```

Consequences:

- a record with no HS code remains a Product but has no sector;
- imported Go4WorldBusiness rows are deliberately written with no HS code;
- `canonical_category` is stored in `desk_radar.category` but is not translated into the canonical HS sector model;
- chapters 71, 91 and 92 intentionally belong to no current sector pending an owner decision;
- the public message about hundreds of unmapped records describes this structural gap but does not solve it.

Production probe must measure:

- member listings with and without HS code;
- external signals with and without HS code;
- records in HS chapters 71, 91 and 92;
- records with a source category but no HS code;
- exact active records claimable by each sector;
- records whose HS code is invalid or missing from the official catalogue;
- classification coverage by import batch.

## 7. Phase A gap register

| ID | Gap | Severity | Evidence | Phase owner |
|---|---|---|---|---|
| A-01 | No persisted `market_family` proof | Critical | Repository-proven | Phase B design |
| A-02 | No persisted seven-value canonical intent | Critical | Repository-proven | Phase B design |
| A-03 | Services path cannot distinguish seek from offer | Critical | Repository-proven | Phase B/C |
| A-04 | Distribution has no persisted or activity representation | Critical | Repository-proven | Phase B/C/D |
| A-05 | Services are forced through product/HS flow | High | Repository-proven | Phase C |
| A-06 | Imported product signals have no HS code | High | Repository-proven | Phase E |
| A-07 | Source category is not mapped to canonical sector | High | Repository-proven | Phase E |
| A-08 | Listing total is an upper bound, not exact visible inventory | High | Repository-proven | Phase F |
| A-09 | Family counts depend on bounded legacy ActivityKind inference | High | Repository-proven | Phase B/F |
| A-10 | Capability declarations may be mistaken for native opportunities | High | Repository-proven | Phase B/C |
| A-11 | No complete source terms/licence register | High | Repository-proven absence in inspected path | Phase D governance |
| A-12 | Cross-source semantic dedupe not designed | Medium | Repository-proven | Phase D |
| A-13 | Multi-market target/territory fields absent | Medium | Repository-proven | Phase B/C |
| A-14 | Classification method/confidence/review state not canonical | High | Repository-proven | Phase B/E |
| A-15 | Current production schema and counts not re-probed | Blocking | Unknown | Phase A |
| A-16 | Migration chain cannot be trusted as production reconstruction | Blocking for migration | Repository-proven documentation | Phase A and pre-migration report |
| A-17 | HS chapters 71/91/92 have no sector | Owner decision needed | Repository-proven | Separate product decision |

## 8. Historical production reports awaiting re-verification

These statements are useful leads, not current Production-proven facts:

- PR #14 reported migrations 20260723a-f applied and 294 Market Signals private at that time.
- PR #16 reported a 6,441-row workbook dry run, with 3,543 public candidates and 2,898 private candidates.
- PR #39 reported 5,613 HS catalogue rows and corrected total counts.
- PR #40 reported migration 20260726a applied and one existing investigation row backfilled.

The production probe must either confirm or supersede these numbers.

## 9. Phase A acceptance status

| Acceptance item | Status |
|---|---|
| ExecPlan exists | Complete |
| Repository subsystem audit | Complete |
| Field-by-field compatibility matrix | Complete, subject to live drift |
| Read-only production probe prepared | Complete |
| Current production schema recorded | Pending |
| Exact counts and HS coverage recorded | Pending |
| Drift report | Pending production probe |
| Migration proposal | Explicitly not started |
| Runtime implementation | Explicitly not started |
| CI and preview | Pending draft PR |
| Owner review | Pending |

Phase A remains **in progress** until the production probe is executed or the owner explicitly accepts a repository-only audit with production evidence deferred.
