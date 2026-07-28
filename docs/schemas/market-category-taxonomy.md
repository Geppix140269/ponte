# Market category taxonomy, and the migration from the flat lists

**Authority:** ADR-0011, ADR-0001
**Code:** `lib/taxonomy/services.ts`, `lib/taxonomy/distribution.ts`, `lib/taxonomy/journey.ts`
**Tests:** `lib/taxonomy/__tests__/categories.test.ts`
**Status:** Implemented on branch `feature/category-first-market-taxonomy`. Not merged.

This file records what a stored value means, and what every earlier stored value
now maps to. It exists so nobody has to reconstruct that from a diff.

---

## 1. What is stored

Keys, never labels. A label may be reworded at any time without touching a
stored record; a key may not change without a migration and an entry here.

| Field | Holds | Cardinality |
|---|---|---|
| `market_family` | `products` / `services` / `distribution` | one |
| `market_intent` | one of the seven canonical intents | one |
| `service_category_key` | a Trade Service category | one |
| `service_subcategory_keys` | subcategories, all inside that category | many |
| `distribution_partner_type_key` | a partner or channel type | one |
| `distribution_relationship_terms` | how the arrangement is structured | many |
| `coverage_scope_key` | where it applies | one |
| `territory_codes` | ISO-2 codes | many |
| `product_sector_key` | a product sector | one |
| `custom_category_label` | the member's own wording, after Other | one |
| `additional_details` | optional context gathered after the selection | one |

Custom wording never replaces a key. A record that chose Other still carries
`unlisted` or `other` and stays countable alongside the rest.

---

## 2. Trade services

Eleven top-level categories. Ten are real categories; the eleventh is the
manual escape route and always sorts last.

`freight` · `warehousing` · `customs` · `inspection` · `certification` ·
`insurance` · `finance` · `compliance` · `documentation` · `enabling` ·
`unlisted`

Every category has its own subcategory list, keyed `<category>.<detail>`, and
every list ends with its own `<category>.other`. Choosing that entry keeps the
parent category: an unusual freight need is still classified as freight, and
only the specific detail is described in words.

### Migration from `TRADE_SERVICES`

| Stored value | Meant | Now |
|---|---|---|
| `freight` | Freight & logistics | `freight` |
| `warehouse` | Warehousing | `warehousing` |
| `customs` | Customs | `customs` |
| `inspection` | Inspection | `inspection` |
| `certification` | Certification | `certification` |
| `insurance` | Insurance | `insurance` |
| `finance` | Trade finance | `finance` |
| `compliance` | Compliance | `compliance` |
| `documentation` | Documentation | `documentation` |
| `other` | **Other trade-enabling services** | **`enabling`** |

The last row is the one that matters. `other` was a real category with real
subcategories, not an escape route. The new escape route is therefore stored as
`unlisted`, so no stored value means two things. `canonicalServiceCategory` is
the single function that resolves this, and a test pins it.

---

## 3. Distribution and representation

The earlier `DISTRIBUTION_MODES` list flattened four different questions into
one. `distributor` is a partner type, `regional` is coverage, and `exclusive` is
a relationship term, and all three sat side by side as if they answered the same
question. A member could not ask for an exclusive distributor in Italy, because
the vocabulary had no way to say it.

Three dimensions now, in three fields.

**Partner or channel type** (one): `distributor` · `importer` · `wholesaler` ·
`agent` · `representative` · `broker` · `market_entry` · `franchise` ·
`ecommerce` · `local` · `regional` · `other`

**Relationship structure** (many): `exclusive` · `non_exclusive` ·
`sole_territory` · `product_line` · `sector` · `channel` · `trial` · `open` ·
`other`

**Coverage scope** (one): `country` · `countries` · `region` · `worldwide` ·
`online` · `physical` · `online_physical`

### Migration from `DISTRIBUTION_MODES`

`field` matters as much as `key`. Reading a relationship term back as a partner
type would keep the original error alive under new names, so
`canonicalPartnerType("exclusive")` returns null, deliberately.

| Stored value | Dimension | Now |
|---|---|---|
| `distributor` | partner type | `distributor` |
| `agent` | partner type | `agent` |
| `representation` | partner type | `representative` |
| `entry` | partner type | `market_entry` |
| `broker` | partner type | `broker` |
| `route` | partner type | `market_entry` **(needs owner confirmation)** |
| `local` | partner type | `local` |
| `regional` | partner type | `regional` |
| `exclusive` | relationship term | `exclusive` |
| `nonexclusive` | relationship term | `non_exclusive` |

**The one open question.** The requirement maps `route` to a "route-to-market
partner", which is not among the twelve canonical types. It is mapped to
`market_entry`, whose definition ("builds the market, identifies channels and
establishes commercial access") covers it exactly, and the mapping carries
`needsOwnerConfirmation: true` so this is confirmed rather than discovered.

**Production impact of this migration: none observed.** The 26 July probe found
zero legacy service rows and no canonical distribution inventory, so the map
governs future reads of any historical value rather than a live backfill.

---

## 4. Icons

An icon is attached only where the Ponte Flow registry already has one. Seven of
the twelve partner types and ten of the eleven service categories are covered.
The rest carry `icon: null`, which is a recorded absence: drawing them would be
an unapproved addition to the registry. The grid reserves the icon column
either way.

`distribution.route` is no longer referenced, because route-to-market is folded
into market-entry. The asset remains in the registry.

---

## 5. Adding to the taxonomy later

1. Add the entry to `lib/taxonomy/services.ts` or `lib/taxonomy/distribution.ts`.
2. Keep Other last. A test enforces it.
3. Do not reuse a key that has ever meant something else. If you must, add a row
   to the tables above and to the `LEGACY_*` map, and pin it with a test.
4. No SQL is required: the columns store text and the application validates
   every key against the taxonomy. A CHECK listing a hundred and twenty
   subcategories would turn every addition into a production migration.
5. No surface needs changing. A category added here is offered by the composer
   and searchable in Find on the same commit, because both read this authority
   and a test forbids a competing copy.
