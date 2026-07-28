# ADR-0011 — Complete market discoverability and category-first non-product journeys

- **Status:** Accepted by the product owner; effective when merged
- **Decision date:** 28 July 2026
- **Owner:** Giuseppe Funaro
- **Extends:** ADR-0001, the unified three-family market contract
- **Supersedes:** Any interpretation of the current 60-record Market Signals read as the complete public inventory; any Trade services or Distribution and representation journey that begins with an unstructured blank text field when a canonical category is available

## Context

Ponte Trade already holds thousands of Market Signals, but the public Market Signals board currently reads only the newest 60 eligible records. The interface can therefore imply that Ponte possesses only 60 signals even when the production inventory contains thousands of approved and unexpired records.

A further batch of approximately 160 signals has been supplied for reconciliation. The final stored and public totals cannot be hard-coded: import validation, deduplication, approval, privacy and expiry rules determine the real result.

A large inventory is commercially useful only when a user can find the relevant records. A flat list of thousands of signals is not a usable discovery experience. Search, filtering, hierarchical browsing, stable URLs and pagination must operate over the complete public-eligible inventory.

The same discoverability problem begins at record creation. Products already begin with a structured classification journey. Trade services and Distribution and representation currently bypass their existing canonical taxonomies and may open with a generic prompt to state the subject in one line. That produces inconsistent prose, weak filtering and poor future matching. It also asks the user to perform classification work that Ponte should perform.

## Decision

### 1. Every eligible Market Signal is discoverable

Every approved, unexpired and anonymised public Market Signal must be reachable through browsing, search, filtering or pagination.

A page size such as 60 records is permitted for performance. It must never be treated as the total inventory or as a terminal access cap.

The public experience must distinguish:

- total records stored, where an internal or authorised surface needs that number;
- approved and currently public Market Signals;
- the number matching the active search and filters;
- the range currently displayed.

Public wording should follow the pattern:

> 3,674 active Market Signals — showing 1–60

The values must be calculated from the database and must not be hard-coded.

### 2. New signal batches are reconciled, not blindly appended

The additional batch of approximately 160 records must pass the same canonical identity, provenance, deduplication, anonymisation, approval and expiry rules as the existing inventory.

The import must be idempotent and produce exact evidence for:

- source rows;
- successfully imported rows;
- duplicates;
- rejected or invalid rows;
- quarantined rows;
- public-approved rows;
- private rows;
- final stored total;
- final approved and unexpired public total.

The approximate batch size is an input fact, not a target count.

### 3. Search and filtering operate over the complete inventory

Keyword search, taxonomy browsing, filters, sorting, counts and pagination must be executed server-side over the complete eligible dataset.

The browser must not download thousands of records and filter them locally.

The shared query contract must support, where reliable data exists:

- keyword search;
- product sector;
- category;
- subcategory;
- normalised product;
- buyer requirement or seller offer;
- country or market;
- observed-date range;
- authorised public source category;
- classification status;
- relevance or recency sorting;
- stable pagination;
- accurate result and facet counts.

Search must not be limited to the first page of results. A record outside the newest 60 must be findable directly.

Search and filter state must be represented in stable, shareable and reload-safe URLs. Arbitrary free-text searches and thin filter combinations should not automatically become indexable SEO pages.

### 4. Product discovery is hierarchical

The intended product path is:

> Product sector → category → subcategory → normalised product → Market Signals

The canonical Ponte product taxonomy remains the authority. Classification may use source category, deterministic mapping, reviewed overrides, product wording and HS data where genuinely supported.

No HS code or precise product classification may be fabricated. Unclassified records remain discoverable through keyword search, relevant commercial filters, direct URLs and a truthful Other or Unclassified bucket.

### 5. Trade services and Distribution use category-first journeys

For Trade services and Distribution and representation, the first substantive screen after family and intent selection must present clickable structured options.

A recognised category must not require the user to type a generic one-line subject before continuing.

Free text appears only:

- after the user selects Other or an Other subcategory; or
- later as optional additional detail.

The same canonical category keys must drive Find, Explore, Start a Deal, filtering, matching, record display, analytics and future SEO routes.

### 6. Trade service taxonomy

The canonical top-level service categories are:

1. Freight and logistics
2. Warehousing and fulfilment
3. Customs and border services
4. Inspection, testing and quality
5. Certification and standards
6. Cargo insurance and risk
7. Trade finance and payments
8. Trade compliance and regulatory support
9. Trade documentation
10. Other trade-enabling services
11. Other

Each recognised category has structured subcategories. Other is always the final manual escape route.

A Trade Service opportunity stores at least:

- family and canonical intent;
- one primary service category;
- one or more closely related service subcategories;
- seeking or offering side;
- optional custom wording when Other is selected;
- optional additional details.

Unrelated services should be represented as separate structured entries rather than one unclassifiable record.

### 7. Distribution taxonomy separates distinct concepts

Distribution and representation must separate:

- partner or channel type;
- product or sector attachment;
- territory and coverage;
- relationship structure.

Canonical partner and channel types are:

1. Distributor
2. Importer or importer of record
3. Wholesaler or reseller
4. Commercial agent
5. Sales representative
6. Broker or intermediary
7. Market-entry or business-development partner
8. Franchise or licensing partner
9. E-commerce or marketplace partner
10. Local operating partner
11. Regional or multi-market partner
12. Other distribution arrangement

Relationship terms are separate values, including:

- Exclusive
- Non-exclusive
- Sole partner for a defined territory
- Product-line specific
- Sector specific
- Channel specific
- Trial or pilot arrangement
- Open to discussion
- Other relationship structure

Existing values such as `exclusive` and `nonexclusive` must be migrated or compatibility-mapped as relationship terms, not treated as partner identities.

### 8. Family-specific structured fields replace overloaded prose

The implementation must stop treating one generic product or subject field as the canonical home for physical products, trade services, distribution arrangements and arbitrary prose.

The logical contract must support explicit family-specific fields for:

- service category and subcategory;
- distribution partner type;
- distribution relationship terms;
- product sector, category and subcategory where relevant;
- territory codes;
- custom category label;
- additional details.

Stable keys are stored separately from display labels. Legacy records remain readable through explicit compatibility mapping.

### 9. Privacy and factual boundaries remain unchanged

Complete discoverability does not authorise public disclosure of private provenance or third-party identity.

Public queries must continue to request only explicitly public fields. Search indexes and payloads must not expose:

- counterparty identity;
- contact details;
- private source URLs;
- copied identifying source prose;
- internal notes;
- moderation or import diagnostics;
- private investigation information.

Market Signals remain factually distinct from Member Opportunities.

### 10. Implementation and production boundaries

The owner has accepted the product decision and the development scope.

Implementation may include the smallest backwards-compatible schema, index, query and taxonomy changes necessary to support the decision. Any migration must be additive, documented, idempotent where practical and based on a fresh production-schema inspection.

Applying a production migration, deploying, changing production feature flags or merging remains subject to the repository stop conditions and explicit owner approval at the relevant step.

## Consequences

- The existing 60-record default becomes a page-size concern, not an inventory boundary.
- Market Signals listing, Find and taxonomy browsing must use one canonical server-side query layer.
- Exact totals and batch-import results must be evidenced rather than inferred.
- Trade service and distribution records become consistently classifiable, searchable and matchable.
- `TRADE_SERVICES` and `DISTRIBUTION_MODES` must be reconciled into the richer shared taxonomy rather than bypassed by route-specific prose fields.
- Distribution partner type, coverage and exclusivity can no longer be mixed into one flat list.
- The interface must preserve selected structured values through Back, authentication and resumption.
- Search, filtered-list and detail URLs become stable navigation state.
- The data contract can support future matching and taxonomy landing pages without reclassifying the entire inventory again.

## Rejected alternatives

### Render every signal on one page

Rejected because complete discoverability does not require sending thousands of records to the browser. It would damage performance and usability.

### Keep 60 as the public total

Rejected because it misrepresents the available inventory and makes most eligible records unreachable.

### Client-side filtering

Rejected because it searches only downloaded records, exposes unnecessary data and scales poorly.

### Begin non-product journeys with free text

Rejected because it creates inconsistent data and weakens search, matching and user comprehension.

### Force Trade services or Distribution through HS classification

Rejected because services and commercial relationships are not physical products. A related physical product may be classified separately where relevant.

### Hide unclassified records

Rejected because lack of confident classification is a data-quality state, not evidence that the commercial signal does not exist.

## Implementation status at decision record

The owner issued the combined development brief to Claude Code on 28 July 2026. At the time this ADR was written, no implementation branch, migration, deployment or production result had been verified for this scope. The accepted decision is therefore product authority, not proof of implementation.

## Related records

- `docs/ponte-authority/PT-PRODUCT-2026-07-28-01-COMPLETE-MARKET-DISCOVERABILITY-AND-CATEGORY-FIRST-JOURNEYS.md`
- `docs/decisions/ADR-0001-unified-trade-market.md`
- `docs/codex/DECISION-LOG.md`
- `docs/codex/CURRENT-STATE.md`
- `docs/codex/DATABASE-STATE.md`
- `lib/taxonomy/market.ts`
- `docs/schemas/market-record.schema.json`
- `docs/schemas/market-taxonomy.yaml`
