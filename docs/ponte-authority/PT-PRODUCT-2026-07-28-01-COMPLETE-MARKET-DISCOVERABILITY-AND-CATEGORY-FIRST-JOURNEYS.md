# Ponte Trade — Complete Market Discoverability and Category-First Journeys

**Document ID:** PT-PRODUCT-2026-07-28-01  
**Status:** Accepted by Giuseppe Funaro; effective when merged  
**Decision date:** 28 July 2026  
**Owner:** Giuseppe Funaro  
**Repository:** `Geppix140269/ponte`  
**Related ADR:** `docs/decisions/ADR-0011-complete-market-discoverability-and-category-first-journeys.md`

---

# 1. Purpose

This authority governs two connected product requirements:

1. the complete Market Signals inventory must be visible through search, filtering, browsing and pagination rather than hidden behind the current 60-record read limit;
2. Trade services and Distribution and representation must begin with structured clickable categories rather than a generic blank text field.

The requirements are one system decision. Ponte cannot build a searchable market while continuing to create new non-product records as unclassified prose.

This document extends ADR-0001 and governs within its scope over the older generic S01 rough-canvas interpretation in the Master Implementation Brief.

---

# 2. Product outcome

A visitor must be able to:

1. understand the real size of the current public Market Signals inventory;
2. browse every approved, unexpired and anonymised public signal;
3. search across the complete inventory, not only the newest page;
4. narrow records through commercially meaningful hierarchy and filters;
5. open a stable detail route and return to the same search state;
6. create or find Trade Service and Distribution opportunities through recognised structured categories;
7. use Other only when the canonical taxonomy genuinely does not fit.

“All signals visible” means every eligible record is reachable. It does not mean rendering thousands of rows in one browser response.

---

# 3. Current defects this authority corrects

## 3.1 The 60-record display is mistaken for inventory size

The public board currently defaults to reading the newest 60 eligible records. The page can therefore print “60 signals” while thousands of eligible records exist.

The number 60 may remain a page size. It must not remain a public inventory cap or be described as the total.

## 3.2 Search does not yet provide complete faceted discovery

A substantial signal database is commercially weak when a visitor must scan a flat list. Search must reach the full public inventory and be combined with category, product, side, geography and date filters.

## 3.3 New signal uploads require reconciliation

A newly supplied batch contains approximately 160 records. Approximate source size must not be converted into a hard-coded public-count increase. The import must reconcile duplicates, invalid rows, approval status, privacy and expiry before exact totals are stated.

## 3.4 Non-product journeys bypass the canonical taxonomy

Products receive a structured classification journey. Trade services and Distribution currently may receive a generic one-line subject field even though `lib/taxonomy/market.ts` already defines canonical top-level options.

That flow is rejected. The first substantive choice must be structured and clickable.

## 3.5 Distribution concepts are mixed together

The current distribution list combines partner identities, geographic coverage and relationship terms. For example, Distributor and Agent are partner types; Exclusive and Non-exclusive are relationship terms. These concepts must be separated.

---

# 4. Complete Market Signals inventory

## 4.1 Eligibility

The complete public inventory consists only of records that satisfy the existing public contract:

- approved for public signal display;
- inside their public-validity period;
- anonymised;
- selected through the explicit public-column contract;
- not represented as a Member Opportunity, verified mandate or confirmed counterparty.

This authority does not weaken approval, expiry, privacy or factual-class rules.

## 4.2 Counts

The product must distinguish:

- total rows stored, on authorised internal surfaces;
- approved public-active signals;
- results matching the current search and filters;
- records currently displayed.

Examples:

> 3,674 active Market Signals  
> Showing 1–60

and after filtering:

> 84 Market Signals match these filters  
> Showing 1–60

All values must be derived from the database.

## 4.3 Pagination

Server-side pagination is mandatory.

Required behaviour:

- newest first by default;
- approximately 60 records per page unless measured performance justifies another value;
- accurate “Showing X–Y of Z” language;
- Previous and Next controls;
- numbered pages or equivalent stable navigation where useful;
- filters, query and sort preserved between pages;
- page resets when a changed filter invalidates the existing range;
- no repeated or missing records during ordinary navigation.

Stable cursor pagination is preferred where it materially improves correctness. Page-number pagination is permitted at the present inventory size if query stability and performance are proven.

## 4.4 Shared server-side query contract

Market Signals listing, Find and taxonomy browsing must use one canonical query layer.

It must support:

- exact total count;
- keyword search;
- taxonomy filters;
- buyer-requirement or seller-offer side;
- country or market;
- date range;
- public source category where authorised;
- classified or unclassified state;
- relevance or recency sorting;
- pagination;
- dynamic facet counts.

Do not filter only the current page. Do not download the full table to the browser.

## 4.5 Keyword search

Search the complete public inventory across the reliable public fields available, including:

- normalised product name;
- safe source product wording;
- public summary or description;
- sector;
- category;
- subcategory;
- country or market;
- side where textually relevant.

Search must be case-insensitive, reasonably tolerant of punctuation and partial wording, and able to find a matching record outside the newest 60.

When a query is present, ranking should prefer:

1. exact product match;
2. normalised product match;
3. subcategory match;
4. category match;
5. public-description match;
6. recency as the secondary ordering signal.

Use indexed deterministic database search. Do not call a generative model for each ordinary search request.

## 4.6 Filters

Initial filters should include only fields supported reliably by the data:

- sector;
- category;
- subcategory;
- product;
- buyer requirement or seller offer;
- country or market;
- date observed;
- authorised public source category;
- classified or unclassified;
- newest, oldest or relevance sorting.

Filters must combine, be individually removable and offer Clear all.

Changing a parent taxonomy value clears incompatible children. Available child facets and counts must update against the remaining result set.

## 4.7 URL state

Search and filter state must be shareable, bookmarkable, reload-safe and compatible with browser Back and Forward.

Use stable route segments or query parameters for values such as:

- `q`;
- `sector`;
- `category`;
- `subcategory`;
- `product`;
- `side`;
- `country`;
- `date_from`;
- `date_to`;
- `sort`;
- `page` or cursor.

A signal opened from a result must offer a route back to the same search state.

## 4.8 Empty and unavailable states

A genuine zero-result state states:

- the query;
- active filters;
- what was searched;
- routes to remove a filter, clear all, broaden the category or start a related deal.

A technical read failure must not be described as no market activity.

## 4.9 SEO

Eligible signal detail pages may be indexable with stable canonical URLs, truthful titles and descriptions, and safe public data.

Taxonomy landing pages may be indexable where they provide real differentiated value.

Do not index arbitrary free-text searches or every combinatorial filter URL. Use canonicalisation or `noindex` for thin or duplicate result combinations.

The SEO strategy must never expose private source URLs, copied identifying prose, counterparties or contact data.

---

# 5. Product classification hierarchy

## 5.1 Products

The discovery path is:

> Product sector → category → subcategory → normalised product → Market Signals

The existing Ponte product taxonomy remains the authority.

Market Signal classification must not depend exclusively on HS codes because the current imported public inventory commonly has source categories without HS codes.

The classification layer may use:

- existing source categories;
- reviewed source-category mappings;
- normalised product wording;
- deterministic synonyms;
- reviewed overrides;
- HS data where genuinely supported.

Uncertain or unmapped records remain visible through keyword search, relevant filters, direct routes and an Other or Unclassified bucket.

## 5.2 Classification audit and backfill

The implementer must report:

- total public-active records;
- classified records;
- unclassified records;
- counts by sector and category;
- mapping method;
- ambiguous mappings;
- any manual-review queue.

Backfill must be repeatable, auditable and idempotent. Raw source data must not be overwritten merely to fit the taxonomy.

---

# 6. New signal-batch reconciliation

The approximately 160 newly supplied records must be located and reconciled.

The implementation report must state:

- source file or batch identity;
- source row count;
- imported row count;
- duplicate count;
- invalid or rejected count;
- quarantined count;
- private count;
- approved public count;
- final stored inventory;
- final approved and unexpired public inventory.

The import must use the existing canonical ID, dedupe-key, provenance and safe-publication rules.

Running the import again must not create duplicate signals.

---

# 7. Category-first interaction law

For every primary market family, the first substantive selection must be structured:

| Family | First structured choice |
|---|---|
| Products | Product sector and product classification |
| Trade services | Trade service category |
| Distribution and representation | Partner/channel or product-sector choice appropriate to the selected intent |

Do not begin these journeys with a blank textarea or generic text input.

Use clickable options with:

- canonical stable key;
- visible label;
- short plain-English description;
- approved Ponte icon where available;
- clear selected state;
- keyboard, screen-reader and large touch-target behaviour.

Other always appears last.

Free text appears only after Other or as an optional details step.

---

# 8. Trade Services taxonomy and journey

## 8.1 Intent-specific headings

For demand:

> What trade service do you need?

For supply:

> Which trade service do you provide?

## 8.2 Top-level categories

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

### Freight and logistics

Description: Move goods by sea, air, road, rail or combined transport.

Subcategories:

- Ocean freight
- Air freight
- Road freight
- Rail freight
- Multimodal transport
- Freight forwarding
- Courier and express delivery
- Consolidation and groupage
- Project cargo and heavy lift
- Bulk, tanker or liquid cargo
- Temperature-controlled and cold-chain logistics
- Dangerous-goods transport
- Local delivery and last mile
- Other freight or logistics service

### Warehousing and fulfilment

Subcategories:

- General warehousing
- Bonded warehousing
- Cold storage
- Fulfilment and pick-and-pack
- Inventory management
- Cross-docking
- Consolidation and deconsolidation
- Packaging and repackaging
- Labelling and relabelling
- Returns and reverse logistics
- Other warehousing or fulfilment service

### Customs and border services

Subcategories:

- Import customs clearance
- Export customs clearance
- Customs brokerage
- Tariff and HS classification support
- Customs valuation
- Rules of origin
- Duty and import-tax advisory
- Transit procedures
- Import or export licences
- Special customs procedures
- Other customs or border service

### Inspection, testing and quality

Subcategories:

- Pre-shipment inspection
- Loading supervision
- Container inspection
- Quantity verification
- Quality verification
- Product testing
- Sampling and laboratory analysis
- Factory or supplier audit
- Production monitoring
- Cargo survey
- Damage assessment
- Other inspection or quality service

### Certification and standards

Subcategories:

- Product conformity assessment
- Product certification
- Certificate of origin support
- Health or sanitary certification
- Phytosanitary certification
- Food-safety certification
- Organic certification
- Halal certification
- Kosher certification
- Environmental or sustainability certification
- Management-system certification
- Other certification or standards service

### Cargo insurance and risk

Subcategories:

- Marine cargo insurance
- Air cargo insurance
- Road or rail cargo insurance
- Trade credit insurance
- Political-risk insurance
- Product or commercial liability cover
- Claims management
- Loss assessment
- Shipment-risk assessment
- Other trade insurance or risk service

### Trade finance and payments

Subcategories:

- Letter of credit
- Letter-of-credit document checking
- Documentary collection
- Bank guarantee
- Performance or payment guarantee
- Invoice finance or factoring
- Supply-chain finance
- Purchase-order finance
- Escrow or payment assurance
- Cross-border payments
- Foreign-exchange support
- Other trade-finance or payment service

### Trade compliance and regulatory support

Subcategories:

- Sanctions screening
- Denied-party screening
- Export-control compliance
- Restricted-goods compliance
- Product regulatory compliance
- Market-access requirements
- Packaging and labelling compliance
- Supplier or counterparty due diligence
- Responsible-sourcing compliance
- Supply-chain traceability
- Other compliance or regulatory service

### Trade documentation

Subcategories:

- Commercial invoice preparation
- Packing-list preparation
- Bill of lading documentation
- Air waybill documentation
- Certificate-of-origin documentation
- Import or export permits
- Letter-of-credit documentation
- Document checking
- Document legalisation or notarisation
- Trade-document translation
- Other trade-document service

### Other trade-enabling services

Subcategories:

- Product sourcing
- Supplier identification
- Procurement support
- Supplier verification
- Market research
- Market-entry advisory
- Trade-contract support
- International trade legal support
- Dispute or claims support
- Tender or procurement support
- Trade technology or systems
- EDI and document integration
- Trade training
- Other trade-enabling support

## 8.3 Selection and storage rules

A Trade Service record must have:

- `market_family = services`;
- a family-valid seeking or offering intent;
- one primary service-category key;
- at least one service-subcategory key;
- optional custom subcategory wording;
- optional additional details.

Multiple closely related subcategories under one parent may be selected.

A provider covering unrelated top-level services should add another service entry rather than create one broad unclassifiable record.

## 8.4 Other behaviour

Selecting the final top-level Other reveals:

- “Describe the trade service you need”; or
- “Describe the trade service you provide”.

The record stores the canonical `other` key and the custom label separately.

Selecting an Other subcategory inside a recognised parent preserves the parent and asks only for the missing subcategory wording.

Example:

- category: Freight and logistics;
- subcategory: Other freight or logistics service;
- custom label: Livestock transport coordination.

## 8.5 Optional details

After structured selection, offer an optional Add useful details step for route, volume, timing, certifications, constraints or commercial terms.

The details field is context, not classification.

---

# 9. Distribution and representation taxonomy and journey

## 9.1 Intent-specific headings

### Seeking a partner

> What type of distribution partner are you looking for?

### Offering distribution or representation

> What distribution or representation capability do you offer?

### Seeking products or brands to represent

> What type of products or brands do you want to take to market?

The third intent begins with the product-sector taxonomy and then captures the distribution capability.

## 9.2 Partner and channel types

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

### Definitions

**Distributor**  
Purchases or takes responsibility for placing products into a defined market.

**Importer or importer of record**  
Handles import responsibility, border formalities and local market entry.

**Wholesaler or reseller**  
Buys and resells products through established commercial channels.

**Commercial agent**  
Introduces and develops sales on behalf of the principal, normally without taking ownership of the goods.

**Sales representative**  
Represents the brand or supplier and develops customers in a defined territory or sector.

**Broker or intermediary**  
Connects commercial parties and facilitates transactions without necessarily distributing the products.

**Market-entry or business-development partner**  
Builds the market, identifies channels and establishes commercial access.

**Franchise or licensing partner**  
Operates or commercialises a brand, format or intellectual property under an agreed licence.

**E-commerce or marketplace partner**  
Distributes through online marketplaces, digital channels or direct-to-business commerce.

**Local operating partner**  
Provides in-country commercial presence, relationships or execution.

**Regional or multi-market partner**  
Covers several countries or a defined region through one relationship.

**Other distribution arrangement**  
Used only when none of the structured partner or channel types accurately describes the relationship.

## 9.3 Relationship structure

After partner type, capture relationship terms separately:

- Exclusive
- Non-exclusive
- Sole partner for a defined territory
- Product-line specific
- Sector specific
- Channel specific
- Trial or pilot arrangement
- Open to discussion
- Other relationship structure

These values must not be mixed into the partner-type list.

## 9.4 Territory and coverage

Use structured country and region controls for:

- one country;
- multiple countries;
- named region;
- worldwide;
- online only;
- physical channels;
- online and physical channels.

Store standard country codes where countries are selected.

## 9.5 Product attachment by intent

### Seek a distributor, agent or representative

Order:

1. partner or channel type;
2. product sector, category and product where known;
3. territory;
4. relationship structure;
5. optional details.

### Offer distribution or representation

Order:

1. partner or capability type;
2. sectors or product categories covered;
3. territories covered;
4. relationship structures offered;
5. optional details.

### Seek brands or products to represent

Order:

1. desired product sectors or categories;
2. partner or channel capability;
3. territories covered;
4. relationship structure sought;
5. optional details.

A broad product sector is permitted when a precise product is not yet known.

## 9.6 Other distribution arrangement

Selecting Other reveals a targeted arrangement-description field while preserving all known structured product, territory and intent data.

Store the canonical `other` partner key and custom wording separately.

## 9.7 Compatibility map

Existing distribution values must be reconciled without silent meaning change:

| Existing key | New meaning |
|---|---|
| `distributor` | partner type: distributor |
| `agent` | partner type: commercial agent |
| `representation` | partner type: sales or commercial representative |
| `entry` | partner type: market-entry or business-development partner |
| `broker` | partner type: broker or intermediary |
| `route` | route-to-market capability, mapped explicitly |
| `local` | partner capability or coverage: local operating partner |
| `regional` | partner capability or coverage: regional or multi-market partner |
| `exclusive` | relationship term: exclusive |
| `nonexclusive` | relationship term: non-exclusive |

Legacy values remain readable. New writes use the separated canonical fields.

---

# 10. Find journey

The category-first model applies equally to Find and Start a Deal.

## 10.1 Trade Services example

> Trade services → Freight and logistics → Ocean freight → Spain → matching records

The visitor may add route, volume and timing later. They do not need to invent the category in prose first.

## 10.2 Distribution example

> Distribution and representation → Distributor → Food, beverages and tobacco → Italy → Non-exclusive → matching records

Find queries must use canonical keys against the complete inventory, not only the displayed page.

---

# 11. Interaction and accessibility

## 11.1 Desktop

Use two or three columns where the approved Bridge System and available space permit. Preserve hierarchy and concise descriptions.

## 11.2 Mobile

Use a one-column tap list at approximately 390 × 844. Do not use a horizontally scrolling category carousel.

## 11.3 Progressive disclosure

Show:

1. top-level category;
2. relevant subcategory;
3. family-specific commercial details;
4. optional description.

Do not put all service subcategories on one page.

## 11.4 Selection state

Selection must be evident through words, marker geometry and approved visual treatment, not colour alone.

## 11.5 Continue rule

Continue remains disabled until the required structured selection exists.

Free text is not required when a recognised category and subcategory are selected.

## 11.6 Search within choices

Long option lists may offer a small taxonomy-choice search. That control filters the available canonical options; it is distinct from the main market-record search.

## 11.7 Resumption

Selections must survive:

- Back navigation;
- route transitions;
- authentication;
- AccountGate interruption;
- reload where the draft is designed to persist.

---

# 12. Logical data contract

The implementation must provide explicit family-specific semantics rather than overloading one `product` or `subject` field.

The logical contract must support equivalents of:

```text
market_family
market_intent
service_category_key
service_subcategory_keys
distribution_partner_type_key
distribution_relationship_terms
product_sector_key
product_category_key
product_subcategory_key
territory_codes
custom_category_label
additional_details
```

Exact physical column names may follow repository conventions.

Rules:

- store stable keys separately from labels;
- validate keys against the selected family and intent;
- keep custom text separate;
- preserve legacy record readability;
- do not store a Trade Service category under Distribution;
- do not store a Distribution partner type under Trade services;
- retain the existing legal `listings.type` compatibility mapping until deliberately migrated;
- update safe API payloads and validation together.

---

# 13. Matching readiness

This authority does not require a full automated matching engine in the first pull request.

It requires data that can support deterministic compatibility such as:

- ocean-freight demand matching ocean-freight supply even when prose says sea shipping;
- distributor demand matching distribution capability by product sector and territory;
- relationship preferences compared separately from partner identity;
- product-sector and territory overlap available to later matching logic.

---

# 14. Privacy and public-data contract

Public search and filter indexes must not make private fields public.

Never send to the public client unless separately authorised:

- counterparty name or company;
- email, telephone or direct contact;
- private source URL;
- copied identifying source prose;
- internal notes;
- moderation details;
- import diagnostics;
- private investigation data.

Search must operate through safe public projections or server-side functions with an explicit public output contract.

---

# 15. Performance requirements

Audit and add appropriate indexes for the final query design, including where relevant:

- status and public validity;
- spotted date;
- side;
- normalised taxonomy keys;
- country;
- full-text search vector;
- trigram or equivalent fuzzy-search support.

Avoid:

- unindexed wildcard scans over the complete table;
- N+1 count queries;
- one query per category card;
- client-side filtering of thousands of records;
- returning private columns and hiding them only in UI.

---

# 16. Implementation sequence

## Phase 1 — Audit

1. Read repository authorities and ADRs.
2. Inspect the production schema and indexes.
3. Confirm current public and stored counts.
4. Locate the new approximately 160-row upload.
5. Identify every 60- or 40-record cap affecting browse and search.
6. Inspect taxonomy, Structure, Find, API and safe-public projections.
7. Record the smallest backwards-compatible design.

## Phase 2 — Import reconciliation

Reconcile the new batch and produce exact evidence.

## Phase 3 — Taxonomy and classification

Reconcile canonical service and distribution structures, add stable subcategory keys and implement repeatable classification/backfill.

## Phase 4 — Query layer

Implement one complete server-side query contract for counts, keyword search, facets, sorting and pagination.

## Phase 5 — Category-first creation and Find

Replace the generic non-product first text field with reusable structured pickers.

## Phase 6 — Interface and URL state

Implement counts, search, filters, progressive hierarchy, pagination, mobile behaviour, stable URLs and truthful states.

## Phase 7 — SEO and evidence

Add safe canonical detail behaviour, appropriate taxonomy navigation, tests, screenshots and before/after import and query evidence.

---

# 17. Acceptance criteria

## Inventory

- The public Market Signals page no longer implies that Ponte has only 60 signals.
- Public totals come from the database.
- Every eligible signal is reachable.
- The latest batch is fully reconciled.
- Import is idempotent.

## Search and browsing

- A record outside page one can be found by search.
- Sector, category, subcategory and product drill-down operate on the full inventory.
- Filters combine and show accurate counts.
- Search and filters survive reload and navigation.
- Pagination preserves state and shows accurate ranges.
- Unclassified records remain visible.

## Category-first journeys

- Trade services never begins with generic free text.
- Distribution never begins with generic free text.
- Products retain their product-classification journey.
- Every canonical top-level category renders.
- Other appears last.
- Recognised categories do not require text.
- Selecting Other reveals targeted text.
- Selected categories appear in preview and submission payload.
- Find and Start a Deal import the same taxonomy.

## Data integrity

- Stable category keys are stored.
- Family-invalid keys are rejected.
- Distribution partner type, territory and relationship term are separate.
- Existing records remain readable.
- No private fields enter public search payloads.

## Quality

- `npm run verify` passes or an environmental failure is recorded separately.
- Production-sized queries are tested.
- Desktop and 390 × 844 evidence is supplied.
- Keyboard, screen-reader and reduced-motion behaviour is reviewed.
- Database and index changes are documented.

---

# 18. Delivery boundary

Implement through a dedicated branch and pull request.

The implementation PR must include:

- exact before-and-after counts;
- new-batch reconciliation;
- taxonomy and compatibility maps;
- classified and unclassified counts;
- query, index and pagination design;
- privacy-contract confirmation;
- desktop and mobile evidence;
- tests and remaining limitations;
- updates to affected source-of-truth records.

Do not merge, deploy, apply a production migration or change a production feature flag without the later approval required by `AGENTS.md`.

---

# 19. Governing product statement

> Ponte makes every eligible Market Signal findable without pretending that thousands of records belong on one page. Ponte asks users to choose what a Trade Service or Distribution opportunity is before asking them to describe its details.
