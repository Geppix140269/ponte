# ADR-0033 — The market classification contract, as implemented

- **Identifier note:** **renumbered from ADR-0012 to ADR-0033 on 7 August 2026**
  (owner decision OD-I; hygiene rule in ADR-0039). `ADR-0012` is
  `ADR-0012-ai-product-intake-and-document-to-deal-flow.md`, which is accepted
  and keeps the number. **Content unchanged.** Historical references to
  "ADR-0012, the classification contract" mean this document.
- **Status:** Proposed. Awaiting the product owner's review of the implementing
  pull request. Not binding until accepted and merged.
- **Decision date:** 28 July 2026
- **Owner:** Giuseppe Funaro
- **Implements:** ADR-0011 (complete market discoverability and category-first
  non-product journeys), which is the owner-accepted decision. This ADR records
  only the contract that decision required somebody to settle, and the choices
  ADR-0011 left open.
- **Extends:** ADR-0001 (unified trade market), whose family, origin and intent
  contract this fills in one level further down
- **Does not supersede:** ADR-0001, ADR-0011, the Ponte Design Constitution, or
  ADR-0010

## Relationship to ADR-0011, and what is NOT done here

ADR-0011 is the decision: every eligible Market Signal must be discoverable,
search must run server-side over the complete inventory, and no non-product
journey may begin with a blank text field where a canonical category exists.

This ADR and its pull request deliver the classification contract and the
category-first journeys, and move Find and the Market Signals board to
server-side filtering and exact counts over the whole table.

**Four parts of ADR-0011 are not delivered here and remain open. Until they
are, do not describe the Market Signals inventory as searchable or accessible:
a member can see how large it is and cannot reach most of it.**

1. **Pagination is not implemented.** The board filters and counts the complete
   eligible inventory and prints both numbers plus the shortfall in words, but
   there is no control that reaches page two. ADR-0011's requirement that every
   eligible signal be reachable is **not met**.
2. **General keyword search is not built.** Keyword matching exists at the query
   layer as a product-text filter only. There is no search surface over the
   complete public inventory.
3. **No existing record is classified.** Applying the migration creates columns
   and classifies nothing. Every historical signal and listing stays
   unclassified until something classifies it, and this PR does not.
4. **The batch of roughly 160 new signals is not imported or reconciled.** No
   import was run and no counts are claimed.

They are named here so the gap is a recorded fact rather than something a
reader has to infer from what is missing.

## Corrections made under review, 28 July 2026

Seven, over three rounds, and almost all of the same kind: a number or a state
that looked right and was not. Three of them were caught only by the owner
reading the implementation rather than the description of it, which is worth
recording as its own finding.

**The public count counted the wrong rows.** The query filtered on approval and
applied the public-expiry rule afterwards, in memory, to the page it had already
fetched. So the count included 26 expired records and the board stated 3,543
where 3,517 signals were actually public. Approval and expiry are now both
predicates in the query.

**Filtering after the fetch also broke paging.** A read asking for sixty came
back with fifty-five once the expired rows were dropped, which makes any
offset-based paging built on it unstable. The same defect existed in the two
sibling board reads and is fixed with it.

**The unclassified state depended on the wrong signal.** It was returned only
when the classification columns were absent. Applying the migration creates the
columns, so on the day the SQL ran, every category filter would have started
answering a confident "no match" over an inventory that had simply never been
classified. A category search that finds nothing now asks a second question:
does any eligible row carry a value on this axis at all? If none does, the
surface says so and reports how many records it could not filter.

**The legacy `route` value is preserved, not consolidated.** It was mapped to
`market_entry`. That is a decision nobody has taken, and it is irreversible in
the only way that matters: once stored values have been read back through it,
which records were `route` is unrecoverable. It is now the compatibility value
`route_to_market`: readable, storable and displayable, and not offered as a
thirteenth choice. `PROPOSED_CONSOLIDATION` records where it would go if the
owner approves, and a test asserts that nothing consults it.

**The family constraints passed the row they existed to refuse.** Covered above:
a CHECK accepts NULL, and `false or null` is null. Fixed by stating the family
test explicitly, and the test now evaluates the SQL rather than reading it.

**An unmeasurable coverage fell through to `ok`.** A failed count silently
upgraded a partial answer into a conclusive "no match". It is now its own state.

**Coverage was measured against the wrong population.** The probe counted the
whole board, so a search inside one family compared a handful of classified rows
against thousands of unrelated ones and printed the result as "records in this
market". Both counts now apply the member's own filters.

## Context

ADR-0001 established three equal primary market families: Products, Trade
services, and Distribution and representation. `lib/taxonomy/market.ts` gave all
three a typed constant so that "Explore, search and the composer cannot each
keep their own list".

That contract was implemented for one family. Products has a progressive
category journey: sector, chapter, heading, six-digit code, drawn from the HS
2022 catalogue. Trade services and Distribution had a single blank line:

> State it in one line

The consequences were not cosmetic:

- a member had to know the professional terminology before they could describe
  what they needed;
- the same service was described five different ways across five records;
- no record could be filtered, matched, counted or searched, because a sentence
  is not a classification;
- Find required a product before it would show anything, and neither of those
  two families has a product, so neither had a working search at all;
- `draft.product` carried four different things: a physical product, a trade
  service, a distribution arrangement, and prose;
- two of Ponte's three equal families were visibly less finished than the third.

The existing `DISTRIBUTION_MODES` constant compounded it by flattening four
different questions into one list. `distributor` is a partner type, `regional`
is coverage, and `exclusive` is a relationship term, and all three sat side by
side as if they answered the same question. A member could not ask for an
exclusive distributor in Italy, because the vocabulary had no way to say it.

## Decision

**Ponte asks the user to choose what the opportunity is before asking them to
describe its details.** For all three families, the first substantive question
is a structured, clickable set of categories. Free text appears only after the
member chooses Other, or in an optional details step at the end.

### 1. The taxonomy is one authority, extended in place

`lib/taxonomy/services.ts` and `lib/taxonomy/distribution.ts` join
`lib/taxonomy/market.ts` as the canonical category authority:

- eleven top-level Trade Service categories, each with its own subcategory list,
  around a hundred and twenty entries in total;
- twelve Distribution partner and channel types;
- nine relationship structures and seven coverage scopes, as **separate
  dimensions** from the partner type;
- `lib/taxonomy/journey.ts`, which states the ordered questions each family and
  intent asks, so a heading and the questions under it cannot drift apart.

No surface may declare a category array of its own. This is enforced by a test
that scans `lib/`, `app/` and `components/` for competing lists, because a
duplicate is a defect even when its contents happen to match today.

### 2. Stable keys are stored; labels are display only

Every field stores a taxonomy key. A label may be reworded without touching a
single stored record. Custom wording is stored in its own column and never
replaces a key: a record that chose Other still carries `unlisted` or `other`
and remains countable alongside the rest.

### 3. Three dimensions, three fields

Distribution stores partner type, relationship structure and coverage
separately. `LEGACY_DISTRIBUTION_MAP` records where each of the ten old values
lands **and in which dimension**, so a stored `exclusive` is never read back as
a partner type. That mapping is the point: reading it as a partner would keep
the original error alive under new names.

### 4. A category cannot cross a family boundary, or exist without one

A Trade Service category cannot be stored on a Distribution record, or the
reverse, and neither can be stored on a record that names no family at all.
Enforced three times, on purpose: in the draft before it is sent, in the API
before it is written, and in a database CHECK on both tables. A mis-filed key is
worse than a missing one because every filter, count and match downstream trusts
it.

### 4a. A category result declares how much of the market it could see

A category filter reads the records that carry a category. While some do and
some do not, a result is a statement about the classified part of the inventory
and not about the market, and the difference has to be on the page.

Four states, and only one of them makes an empty result a finding:

| Coverage | State | What an empty result means |
|---|---|---|
| Nothing classified | `unclassified` | Ponte cannot answer this question yet |
| Some classified | `partial` | No match **among the records Ponte can see** |
| Not measurable | `coverage_unknown` | No match, and Ponte cannot say over how much |
| All classified | `ok` | No match. Conclusive |

Coverage is measured on every category-filtered read, not only on an empty one.
Asking only on zero holds for exactly as long as nothing is classified: the
moment one record is classified, every other filter starts returning small,
confident results over an inventory that is still almost entirely unclassified,
and nothing says so. Three matches out of four thousand unclassified records
reads as "the market has three of these" and means "Ponte can see three".

**An unmeasurable coverage is its own state.** An earlier version let a failed
count fall through to `ok`, which is worse than any wrong number: it silently
upgrades a partial answer into a conclusive "no match", and "no match" is the
answer a member is most likely to act on. Both lanes inspect their count errors
explicitly rather than reading a missing count as a number.

**Coverage is measured over the member's own slice.** Both counts apply every
filter the search applied, dropping only the axis being tested, so the pair
answers "of the records matching the rest of this search, how many carry a value
here?". The first version counted the whole board and printed a denominator that
was not the member's market at all. One shared filter function serves the search
and both counts, so they cannot drift apart.

For Qualified Opportunities an exact database count is impossible: validity and
owner eligibility are applied in memory, so `count: exact` would count rows the
member may not see. The same slice is read instead, the same visibility rules
are applied, and coverage is counted over what survives. That is exact while the
read is not truncated; past the ceiling it would describe a sample, so it
returns `coverage_unknown` rather than reporting a sample as the whole.

### 5. Filtering and counting run over the complete eligible inventory

Find and Market Signals filter at the database using canonical keys, over the
whole table rather than over the newest page. A signal tagged
`freight / freight.ocean` matches a search for ocean freight whether its
description says "sea shipping" or nothing at all.

Eligibility, meaning approval **and** the public-expiry window, is applied in
the query, before the page is cut and before the count is taken. Applying it
afterwards produces two wrong answers at once: a short page, which makes offset
paging unstable, and a count of rows nobody may see.

This is filtering and counting. It is **not** reaching: see the list above.

### 6. An unclassifiable filter says so

Where a category filter cannot be applied because no published record carries
one, the surface reports that, and never as an empty result. "No signal matches
ocean freight" and "Ponte cannot yet tell which signals are about ocean
freight" are different sentences with different next actions, and printing the
first when the second is true is Ponte reporting a finding it never made.

## Decisions taken inside this one, and why

**`unlisted`, not `other`, for the Trade Services escape route.** The earlier
ten-key list already used `other`, and it meant "Other trade-enabling
services": a real category with real subcategories. Reusing the key would have
made every stored `other` ambiguous. The label a member sees is still "Other".

**Route-to-market keeps its meaning and is not consolidated.** The requirement
maps the legacy `route` value to a "route-to-market partner", which is not one
of the twelve canonical types. It is preserved as the compatibility value
`route_to_market` rather than folded into anything, because folding it is a
decision nobody has taken and could not be undone afterwards. See the
corrections section below.

**An icon appears only where the registry has one.** Five of the twelve partner
types and the two escape routes have no Flow asset. Drawing them would be an
unapproved addition to the registry, which Constitution section 7 forbids. The
grid reserves the icon column either way, so alignment holds. The requirement
asked for "existing Ponte icon where available", and this is what available
means.

**Icons are rendered on the server and passed down as nodes.** `PonteIcon` is a
server component so the whole registry's markup stays out of the browser
bundle; the pickers are client components. Importing the renderer into a picker
would quietly undo that, and a second client-safe icon module would give Ponte
two icon renderers, which Constitution section 20 forbids.

**Find opens on the three families.** `/find` previously opened on the product
picker. It now opens on the three market families, with products one tap away.
Demanding a typed product was the reason two of three families had no search.

**`/market-signals` reports the true eligible inventory size, and says what a
member cannot reach.** It read the newest sixty and printed that number. It now
filters and counts over the whole table, applying approval and expiry in the
query, and prints the shortfall in plain words, computed from the read rather
than written into the page. Reporting a number a member cannot act on, without
saying so, would be a worse claim than the one it replaced.

No figure is quoted here. Every count on that board is time-dependent, because
the public window is a rolling ninety days, so a number written into a document
is stale the week after it is written. The evidence README dates the ones it
records.

## Consequences

**Migration.** `supabase/migrations/20260728a_market_classification.sql` adds
**11** nullable columns, **3** CHECK constraints and **6** indexes to
`listings`, and **6** nullable columns, **2** CHECK constraints and **3**
indexes to `desk_radar`. Seventeen columns, five constraints and nine indexes in
total. Additive throughout; every existing row stays exactly as it is and stays
readable; the legacy `listings.type` mapping is untouched and remains supported.

The constraints read as implications: IF a family-specific field is set THEN
that family must be the record's family.

Two drafts of that were wrong, in the same place, for different reasons. The
first opened `market_family is null or ...`, which exempted the row outright.
The second removed that clause and still let the row through, because SQL is
three-valued and a CHECK accepts TRUE **and NULL**: with a service category set
and no family, `(false) or market_family = 'services'` is `false or null`, which
is NULL, which passes. The text read as a correct implication and behaved as an
exemption.

The family test is therefore stated explicitly, `market_family is not null and
market_family = 'services'`, so the expression is FALSE rather than NULL for the
row that must be refused. The test evaluates these expressions under
three-valued logic rather than reading them, because reading them is exactly
what missed it, and it checks exhaustively that no constraint can return NULL
for any combination of family and classification values.

`desk_radar` carries the same two, and needs them more than `listings` does. A
member listing is written by one route that validates every key first. A Market
Signal is written by an importer, by an admin action, and by whatever backfill
classifies the inventory later, none of which passes through that route. The
database is the only place that sees every writer.

**It is written and NOT applied.** A merge to `main` applies no migration in
this repository (`docs/codex/DATABASE-STATE.md`: the chain aborts on its first
file). It requires explicit owner approval and a manual run. The application
tolerates the columns being absent, retries the write without them, and the
classification still reaches the record through the synthesised `details`,
which is where it travelled before any of these columns were proposed.

**Nothing is backfilled.** No existing signal or listing has been classified
into this taxonomy, and writing a guess into those columns would invent a
finding. Category filters therefore return the "not yet classified" state until
records genuinely carry keys.

**Not in scope.** No automated matching engine, and no indexable category
landing pages. The stored contract is shaped so both are possible later without
reclassifying any record.

## Alternatives considered

**Keep the free-text field and classify with AI.** Rejected. It puts a guess
into a column every filter then trusts, and Ponte's product rules are explicit
that AI may structure and suggest but must not silently assert. A member's own
tap is a fact; an inferred category is not.

**One jsonb column for the whole classification.** Rejected. These fields are
filtered on. An index on a text column answers "every ocean-freight offer
covering Spain" cheaply, a jsonb path does not, and a typed column is the only
place a CHECK can state the cross-family rule.

**Reuse the HS taxonomy for services.** Rejected, and explicitly so: there is no
HS code for pre-shipment inspection on West African corridors, and pushing a
service through a six-digit drill-down puts a false classification on a real
record.
