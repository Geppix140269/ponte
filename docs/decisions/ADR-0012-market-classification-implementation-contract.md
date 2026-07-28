# ADR-0012 — The market classification contract, as implemented

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

Four, all of them errors of the same kind: a number or a state that looked
right and was not.

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

### 4. A category cannot cross a family boundary

A Trade Service category cannot be stored on a Distribution record, or the
reverse. Enforced three times, on purpose: in the draft before it is sent, in
the API before it is written, and in a database CHECK. The API and the database
are not the only writers a table sees, and a mis-filed key is worse than a
missing one because every filter, count and match downstream trusts it.

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
query, and prints the shortfall in plain words: "the remaining 3,457 are counted
but not yet reachable from this page." Reporting a number a member cannot act on
without saying so would be a worse claim than the one it replaced.

## Consequences

**Migration.** `supabase/migrations/20260728a_market_classification.sql` adds
eleven nullable columns to `listings`, six to `desk_radar`, two CHECK
constraints and six indexes. Additive throughout; every existing row stays
exactly as it is and stays readable; the legacy `listings.type` mapping is
untouched and remains supported.

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
