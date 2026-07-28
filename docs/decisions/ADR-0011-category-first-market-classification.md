# ADR-0011 — Category-first classification for Trade services and Distribution

- **Status:** Proposed. Awaiting the product owner's review of the implementing
  pull request. Not binding until accepted and merged.
- **Decision date:** 28 July 2026
- **Owner:** Giuseppe Funaro
- **Extends:** ADR-0001 (unified trade market), whose family, origin and intent
  contract this fills in one level further down
- **Does not supersede:** ADR-0001, the Ponte Design Constitution, or ADR-0010

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

### 5. Search reaches the complete inventory, on keys

Find and Market Signals filter at the database using canonical keys, over the
whole table rather than over the newest page. A signal tagged
`freight / freight.ocean` matches a search for ocean freight whether its
description says "sea shipping" or nothing at all.

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

**Route-to-market is folded into market-entry, and flagged.** The requirement
maps the legacy `route` value to a "route-to-market partner", which is not one
of the twelve canonical types. It is mapped to `market_entry`, whose definition
covers it exactly, and marked `needsOwnerConfirmation` so the owner confirms
rather than discovers it.

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

**`/market-signals` reports the true inventory size.** It read the newest sixty
and printed that number. It now filters at the database and counts the whole
table.

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
