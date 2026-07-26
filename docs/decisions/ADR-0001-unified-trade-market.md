# ADR-0001 — Unified trade market with three primary families

- **Status:** Accepted by the product owner; effective when merged
- **Decision date:** 26 July 2026
- **Owner:** Giuseppe Funaro
- **Supersedes:** Any interpretation of Trade services or Distribution and
  representation as ancillary directories, placeholders or secondary databases

## Context

Ponte Trade currently presents a substantial physical-product inventory while
Trade services and Distribution and representation may show no count or no
classified records. That implementation gap risks making the latter two areas
look decorative or unfinished.

The product decision is broader than a display correction. Ponte Trade captures
commercial intent across cross-border trade. That intent may concern a physical
product, a trade-enabling service, or a distribution and representation
relationship. It may be observed externally or created directly by a Ponte Trade
member.

The architecture therefore needs one market model rather than a product market
with two add-ons.

## Decision

Ponte Trade is one global trade market organised around exactly three equal
primary market families:

1. **Physical products**
2. **Trade services**
3. **Distribution and representation**

Every public market record must belong to exactly one family.

Every market record also has exactly one origin:

- **Market signal** — commercial intent detected from a legitimate external
  source and presented with its true evidence, attribution and limitations.
- **Member opportunity** — commercial intent created directly by a Ponte Trade
  member or member business.

Origin and family are independent dimensions. Each family can contain both
Market Signals and Member Opportunities.

Every record has an intent valid for its family:

### Physical products

- Source a product
- Offer a product

### Trade services

- Seek a trade service
- Offer a trade service

### Distribution and representation

- Seek a distributor, agent or representative
- Offer distribution or representation
- Seek products or brands to distribute or represent

The stable internal identifiers are defined in `lib/taxonomy/market.ts` and the
logical record contract in `docs/schemas/market-record.schema.json`. Interface
copy may improve without changing those identifiers casually.

## Consequences

- Explore, Start a deal, search, filters, matching, alerts, profiles, saved
  records, ingestion and analytics must derive from the same three-family model.
- External data pipelines and member-created records must normalise into a
  shared logical market-record contract while retaining their true provenance,
  permissions and lifecycle.
- Trade services must support both requests and offers. It is not merely a
  provider directory.
- Distribution and representation must support both companies seeking partners
  and companies offering market coverage or seeking brands. It is not merely a
  distributor directory.
- A unified presentation must not blur factual classes. A Market Signal remains
  distinct from a Member Opportunity in data, wording, actions and disclosure.
- Empty categories must not manufacture liquidity. Public surfaces should hide
  meaningless zero counts or explain an honest absence without implying that a
  functioning market contains zero activity.
- Product-sector counts must be derived from real classification. Unmapped or
  uncertain records belong in an internal data-quality workflow, not a public
  explanation of a broken taxonomy.

## Implementation implications

This ADR does not itself authorise a production database migration or external
scraping operation. Implementation requires a reconciled plan covering:

1. the current `listings`, `desk_radar` and related schemas;
2. a backwards-compatible database and API mapping;
3. member creation flows for all family and intent combinations;
4. external ingestion, provenance, deduplication and expiry rules;
5. Explore classification and count behaviour;
6. migration/backfill of existing records;
7. privacy, source terms and controlled-action rules;
8. tests, rollout, monitoring and safe-disable.

Production migrations and source ingestion require their own owner-approved
ExecPlan and pull request.

## Rejected alternatives

### Products as the only real market

Rejected because trade services and route-to-market relationships are genuine
cross-border commercial intent and core Ponte Trade use cases.

### Service-provider and distributor directories

Rejected because directories describe entities, not active intent. Ponte Trade
must support seeking and offering, as signals and as member-created
opportunities.

### Separate schemas and interfaces for each family

Rejected as the default because it creates divergent classifications, filters,
matching logic and analytics. Family-specific fields may exist, but they extend
a common contract.

### Treating every imported record as an opportunity

Rejected because an externally observed Market Signal and a member-created
Member Opportunity carry different evidence, permissions and claims.

## Related records

- `docs/codex/SOURCE-OF-TRUTH-SOP.md`
- `docs/codex/DECISION-LOG.md`
- `docs/codex/CURRENT-STATE.md`
- `lib/taxonomy/market.ts`
- `docs/schemas/market-record.schema.json`
- `docs/schemas/market-taxonomy.yaml`
