# ADR-0014 — Family-specific downstream commercial procedures

- **Status:** **Accepted** by the repository owner on 29 July 2026. The supporting migration `20260728e_family_commercial_terms.sql` was applied to production the same day; see `docs/codex/DATABASE-STATE.md`.
- **Decision date:** 28 July 2026
- **Owner:** Giuseppe Funaro
- **Extends:** ADR-0001 (the unified three-family market contract), ADR-0011 (category-first non-product journeys), ADR-0012 (AI product intake)
- **Supersedes:** Any reading of the shared Structure composer under which one product-shaped set of commercial questions, blockers, review rows and submission expectations applies to all three market families

## Context

ADR-0011 gave Trade services and Distribution and representation their own structured, category-first opening. ADR-0012 gave Products an AI intake. Both shipped, both are correct, and the family routing and classification architecture on `main` is not in question here.

The defect is narrower and begins immediately after classification. All three families then entered the same downstream procedure, and that procedure was shaped around physical products:

- `COMPLETION_QUEUE` was one fixed list — quantity, origin, destination, incoterm, payment, validity, role, note — varying only by the legacy `offer | requirement | service` value, never by market family.
- `bucketize()` treated quantity, route and Incoterm as universal commercial facts, so a freight forwarder's S02 screen printed "Quantity · Add" and "Incoterm · Add".
- `blockers()` required a quantity and an Incoterm from every record, so the submit screen told a trade service that an Incoterm was holding up its publication.
- `PreviewStep` printed HS code, quantity, frequency, route and Incoterm unconditionally after the family-specific classification rows, so a service or distribution review showed five product facts, all reading "Not stated".

A shared technical shell is correct. A shared set of commercial questions is not. Quantity, unit, packaging, shipment and HS classification are facts a physical product has. A trade service has a scope, a coverage, a specialisation, a capability, an engagement basis and an availability. A distribution opportunity has an objective, a product or sector scope, a territory, a partner type, channels, capabilities, commercial expectations and timing. These are different facts, not the same facts renamed.

## Decision

### 1. One composer shell, three commercial procedures

Ponte keeps one Structure composer, one account gate, one submission orchestration, one lifecycle outcome screen and one design system. The technical sequence is unchanged:

```text
classification -> structuring -> facts -> completion -> preview -> submit -> received
```

Each downstream stage obtains its behaviour from a family-specific procedure rather than deciding commercial meaning itself. Shared components render models; they do not contain family conditions.

### 2. A central family procedure registry

The contract lives in `lib/structure/procedures/`, with one module per family and a registry that resolves a draft to its procedure. Every procedure supplies its completion fields, open gaps, fact buckets, blockers, review model, submission readiness, submit terms and detail clauses.

This is deliberately centralised. The rule that a trade service is never asked for an Incoterm is stated once, in one file. Scattered `family === "services"` conditions through a large component are how the defect arrived, because a rule that lives in twelve places is wrong in at least one of them.

### 3. Field ownership is explicit

`FIELD_FAMILY` states which family owns each fact. Quantity, unit, frequency, origin, destination, Incoterm, payment terms and HS classification belong to Products. Service scope, coverage, specialisation, capability, engagement basis and availability belong to Trade services. Objective, product or sector scope, channels, capabilities, commercial expectations and timing belong to Distribution and representation. Validity, role and note are the only facts every family shares.

### 4. Absence is structural, not cosmetic

A fact a family does not have is never asked, never listed as missing, never a blocker, never a review row and never a stored column. This holds at model-generation level. Hiding a row with CSS, rendering it as "Not stated", or keeping a blocker and suppressing its display does not satisfy this decision.

### 5. Capacity is not quantity

A trade service's throughput ("up to 40 containers per month") is a capability, stated as such. A distribution opening order or sales target is a commercial expectation of a relationship, stated as such. Neither may be stored in the product quantity field, because the board, the search index and the emails would read it as goods for sale.

### 6. HS classification stays Products-only

Unchanged from ADR-0011 and restated because it is now enforced in four places rather than one: the composer never asks, the draft sanitiser strips it, the API refuses it and the database constrains it.

### 7. Cross-family values are removed, not hidden

Changing family clears the previous family's classification AND its commercial fields. A product draft that becomes a service loses its quantity, unit, Incoterm, route and HS code; a service draft that becomes distribution loses its service terms; a distribution draft that becomes a product loses its partner type, relationship, territory and distribution terms. The removal is applied at the storage boundary so that no caller can bypass it, and the values are absent from the payload, the stored columns and the record's own synthesised text.

### 8. Family-specific payloads are validated server-side

The API identifies the family, validates that family's payload, and refuses cross-family data rather than accepting one universal payload and ignoring the inappropriate parts in the UI. A service specialisation is validated against the chosen service category, not merely against the global list: "sea freight" is a real key and is not an answer a customs brokerage record may give.

### 9. A family's own vocabulary survives publication

The decision applies downstream of the composer as well as inside it. Every surface that presents a STORED record — the public detail page, the shareable marketplace page, the member's own records, the admin exception console and the member emails — presents that record in its own family's vocabulary, through one shared presenter (`lib/listings/record-facts.ts`).

This is stated because it did not hold. Each of those surfaces printed its own fixed list of product columns, so a published freight-forwarding record answered Quantity, Incoterm, HS code, Origin and Destination with "Not stated", and its eight stated service terms appeared nowhere but inside the prose. A member walked a correct journey and then read a record describing a shipment they never offered. The member emails compounded it by calling every record an "offer".

The same rule as §4 applies: a fact a family does not have produces no row, at model-generation level. And the same rule as the composer's one-ended route: a product offer reads "Ships from Argentina" rather than a bare place under a heading of "Route".

### 10. Destroying a member's answer requires their consent

Changing a classification answer invalidates the answers conditioned by it, and §7 is unchanged: those values are removed, not hidden. What is added is that the member is told first, and by name.

A member who chose Freight forwarding, answered Sea, Road, temperature controlled and perishable, then changed the category to Customs brokerage lost four deliberate answers with no notice; their only clue was an absence. `lib/structure/discard.ts` computes what a change would discard, and the composer asks before it writes.

The warning is bounded in both directions. It appears only when something real would be lost — a change that costs nothing is never interrupted, because a confirmation on every change teaches members to dismiss it unread — and it names only what would actually be lost, so an answer that survives the change is never reported as at risk.

### 11. Storage is additive and unapplied

`service_terms` and `distribution_terms` are jsonb, alongside the typed classification columns that already exist. They are read with a record rather than searched across it, which is why they are documents and not fourteen sparse columns; the two dimensions a market would plausibly be filtered by (service category, coverage territory) are already typed and indexed by ADR-0011's migration.

The migration is additive, preserves every existing row, changes no RLS policy, carries a rollback path, and is **not applied**. The application tolerates both columns being absent and retries the write without them, and the terms still reach the record through the synthesised `details`.

## Consequences

- Products behaviour is unchanged, including the quantity fix: no displayed default, decimals, ranges, minimum, maximum, approximate, negotiable and on-request all preserved, and a stated basis with no figure remains a complete answer.
- A freight-forwarding record is never asked for, blocked on, or reviewed against a quantity, unit, HS code, packaging or Incoterm.
- A distribution or representation record is never asked for, blocked on, or reviewed against a shipment quantity, unit, HS code, packaging or Incoterm.
- The publication validator's coverage rule for non-product families now reads the structured coverage fields, and still accepts the legacy route columns, so no record created before this change becomes unpublishable.
- Adding a category-conditioned question is one entry in `SERVICE_SPECIALISATION_GROUPS`, not a branch in a component.
- Not every service category is modelled to the same depth. The architecture supports category-conditioned questions; a complete model of eleven professions is deliberately not attempted in one change, and a category with no conditioned dimension is simply never asked one.
- A published record reads back in the vocabulary it was built in, on every surface that presents it, and a member email names the record the member actually posted rather than calling all three families an "offer".
- The missing-column fallback is staged: an absent `service_terms` or `distribution_terms` costs a record its family terms and nothing else. Dropping the two groups together filed a correctly classified submission as an unclassified row, which is the defect ADR-0011 exists to prevent, reintroduced by a safety net. The rule now lives in `lib/listings/write-fallback.ts` with tests, rather than in an untested closure inside the submit route.
- A classification change that would destroy work stops and names it. A change that would not is unaffected.
- Not addressed here, and recorded as PL-004: `canonicalServiceCategory` and `canonicalPartnerType` exist to reconcile a superseded stored key onto its current one and have no callers, so a record stored under a superseded key would lose its specialisations on edit. Production incidence is unmeasured and is not asserted to be zero.

## Alternatives rejected

- **Duplicating the composer three times.** Triples the surface for the account gate, resume, submission and lifecycle work, and guarantees the three copies drift.
- **Hiding the product fields for non-product families.** Leaves them asked, blocking and stored. The requirement names this as a non-solution.
- **Storing service and distribution answers in one free-text note.** Unfilterable, unmatchable, uncountable, and it reintroduces the exact defect ADR-0011 removed one level further down.
- **Reusing the product quantity field for service capacity.** Puts a forwarder's monthly throughput on the board as goods for sale.
- **Fourteen new typed columns.** Sparse, unindexed by any real query, and a migration for every future conditioned question.

## Status of implementation

The composer half of this ADR merged as PR #89. Sections 9 and 10 - the family-aware presentation of a stored record, and the consented discard - are on `claude/family-procedure-followup-clean` as PR #101, which is **not merged**.

The migration is **applied**: `20260728e_family_commercial_terms.sql` was applied to production on 29 July 2026 at 15:44:45 UTC with explicit owner authorisation, after `20260728c_automated_listing_publication.sql` at 15:42:54 UTC, both probe-verified. `listings_product_fields_family` remains `NOT VALID` by design; validating it against existing rows is a separate owner decision, and zero rows would currently violate it.
