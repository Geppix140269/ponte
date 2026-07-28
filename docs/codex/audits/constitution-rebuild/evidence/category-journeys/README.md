# Category-first journeys — visual evidence

**Branch:** `feature/category-first-market-taxonomy`
**Captured:** 28 July 2026, against a production build (`next build` + `next start`)
**Reproduce:** `npx playwright test e2e/category-journeys.spec.ts`
**Suite:** `e2e/category-journeys.spec.ts` · **Config:** `playwright.config.ts`

To capture against a deploy preview instead of a local build:

```bash
PONTE_EVIDENCE_BASE_URL=https://deploy-preview-66--ponte-trade.netlify.app npx playwright test e2e/category-journeys.spec.ts
```

---

## 1. What was replaced

Choosing **Trade services** or **Distribution and representation** on the
landing used to open a single blank line:

> State it in one line

Products, by contrast, had a progressive category journey. Two of Ponte's three
equal families were asking the member to do classification work Ponte should do,
and producing records that could not be filtered, matched, counted or searched.

| Was | Is |
|---|---|
| One blank input, for both families | A grid of clickable categories, per family |
| The member guesses the terminology | Eleven service categories, twelve partner types, each described |
| One flat distribution list mixing four questions | Partner type, relationship, coverage and sector as four separate questions |
| `draft.product` holds a product, a service, an arrangement or prose | Stable keys per dimension, in their own fields |
| Free text always | Free text only after Other, or in an optional details step |
| Find needs a product, which two families do not have | Find opens on the family, then the category |
| Find filters the newest sixty in memory | Both lanes filter at the database over the whole table |
| Market Signals prints the length of its page | Market Signals counts the complete inventory |

## 2. The frames

Twenty-three, at desktop and at 390 x 844. Each is taken beside an assertion
about what is on screen, so a frame showing a category grid is a frame that has
been **proved** to contain no text field.

| File | State |
|---|---|
| `desktop-1-services-categories.png` | Trade services, seeking. Eleven categories, Other last |
| `desktop-2-services-offer.png` | Trade services, offering. "Which trade service do you provide?" |
| `desktop-3-services-category-chosen.png` | Freight chosen. Continue is live on the tap alone |
| `desktop-4-services-subcategories.png` | The fourteen freight details, with the trail above |
| `desktop-5-services-details-chosen.png` | Two details chosen. Multiple selection inside one category |
| `desktop-6-services-other.png` | Other, and the one field it reveals |
| `desktop-7-services-option-filter.png` | The find-within-the-options control on a long list |
| `desktop-8-distribution-partner-types.png` | Twelve partner types |
| `desktop-9-distribution-offer.png` | Offering coverage, same twelve |
| `desktop-10-distribution-brands-sectors.png` | Seeking brands: opens on product sectors instead |
| `desktop-11-distribution-coverage.png` | Coverage, with Italy added as a stored ISO-2 code |
| `desktop-12-distribution-relationship.png` | Relationship structure, and the three-answer trail |
| `desktop-13-products-hs-unchanged.png` | Products: the HS journey, untouched |
| `desktop-14-find-families.png` | Find opens on the three families |
| `desktop-15-find-service-categories.png` | Find, service categories |
| `desktop-16-find-service-results.png` | Find results, with the narrowing list and both lanes |
| `desktop-17-find-partner-types.png` | Find, distribution partner types |
| `desktop-18-market-signals-filters.png` | Market Signals, structured filters and the true count |
| `desktop-19-keyboard-focus.png` | The focus ring on a category tile |
| `desktop-20-reduced-motion.png` | `prefers-reduced-motion: reduce`. Identical composition |
| `desktop-21-market-signals-unanswerable-filter.png` | A filter Ponte cannot answer, explaining itself instead of claiming the board is empty |
| `desktop-22-market-signals-filtered-empty.png` | A filter that matches nothing, saying so without claiming the board is empty |
| `mobile-1-services-categories-390x844.png` | 390 x 844. One column, Other last |
| `mobile-2-distribution-partner-types-390x844.png` | 390 x 844. Twelve partner types |
| `mobile-3-find-service-categories-390x844.png` | 390 x 844. Find, service categories |

## 3. What the suite verifies beyond the pictures

19 checks, all passing.

- **Neither family opens on a text field.** Asserted as the presence of a grid
  AND the absence of any `input` or `textarea`, because a grid alone would still
  pass beside a blank line.
- **The legacy buy/sell/service picker is gone** from a family entrance. It
  cannot express distribution at all, and a member who chose a family on the
  landing already answered it.
- **Every canonical option renders**, in taxonomy order, with Other last.
- **A recognised category needs no prose**: Continue is enabled on the tap.
- **Other needs prose**, and asks for it in the member's own direction
  ("Describe the trade service you need" against "...you provide").
- **Four separate questions** for distribution, and every earlier answer stays
  on the trail with a way back into it.
- **Products are untouched**: the HS grid renders and no category picker mounts.
- **390 x 844**: one column, every tile at least 44px tall, no horizontal
  overflow on the document.
- **Keyboard**: the grid is a radiogroup, the arrows traverse it, and the first
  arrow selects the first option when nothing is chosen yet.
- **Reduced motion** keeps all eleven labels and the whole settled composition.

## 4. What the frames show that is NOT true of the data

**Do not read this evidence as showing a searchable inventory.** It shows a
countable one. A member can see how large the market is and can filter it by
category; they cannot page past the first sixty records, and there is no
keyword search over the whole set. Both are ADR-0011 requirements and neither
is built here.

`desktop-16-find-service-results.png` shows the honest state, and it is worth
looking at rather than skipping.

**No published record carries a canonical category.** The columns are added by
`supabase/migrations/20260728a_market_classification.sql`, which is written and
**not applied**: a merge applies no migration in this repository. Even once it
runs, nothing is backfilled, because writing a guess into those columns would
invent a finding.

So a category filter cannot answer yet, and both lanes say so:

> Ponte cannot filter this market by category yet.

That is deliberate. Printing "no match" would be Ponte reporting a finding it
never made, and it is the same distinction the board already draws between
nothing found and nothing read. The state disappears on its own as records are
created with categories.

`desktop-18-market-signals-filters.png` is the counterpart: an unfiltered read
against the real database, reporting **3,491 signals, showing 1-60**, followed
by the sentence that matters more than the number:

> The remaining 3,431 are counted but not yet reachable from this page. Paging
> through the whole inventory is not built.

Three different numbers have been attached to this board, and the difference
between them is the whole point of the correction:

| Number | What it is |
|---|---|
| 60 | What the board used to print. The length of the page it had read. |
| 3,543 | Stored rows with status `approved_signal`. What the first version of this PR counted, because expiry was applied in memory to the page after it was fetched. |
| 3,517 | Eligible signals at the 26 July probe. |
| **3,491** | Eligible signals at capture on 28 July. |

3,491 is not a correction of 3,517: both are right on their own date. The public
window is a rolling ninety days from the date a signal was spotted, so the
eligible total falls on its own as signals age out. What changed is that the
count is now **correct by construction** rather than by coincidence: approval
and expiry are both predicates in the query, so the number is whatever is
genuinely public at the moment it is read.

The same fix removed a second symptom. Dropping expired rows after fetching a
page returned short pages, which would have made any offset-based paging built
on it unstable before it was ever built.

## 5. Known limits, recorded rather than left to be noticed

- **Most of the inventory is unreachable.** 3,491 eligible signals are counted;
  60 can be opened. Pagination is not built, and neither is keyword search over
  the complete set. The board says so on the page rather than leaving a reader
  to infer it from a number.
- **No record carries a category.** Applying the migration would not change
  that: it creates columns and classifies nothing.
- **The partial-coverage state is NOT in these frames, and cannot be.** It
  appears only when *some* records carry a category and some do not, and today
  none do, so every category filter lands in `unclassified` instead. It becomes
  reachable the moment the first record is classified and stays reachable until
  the last one is.

  Because a screenshot cannot reach it, it is pinned by unit test instead:
  `lib/board/__tests__/coverage.test.tsx` renders the notice with real English
  copy and asserts that an empty partial result reads "No match among the
  records Ponte can filter" and states how many were not searched. The detection
  logic is pinned separately in `lib/board/__tests__/market-signals.test.ts`.

  The **state ordering** is pinned there too, and it is the part that was
  broken. The board tested `records.length === 0` before it reached the coverage
  notices, so an empty partial result rendered "No signal is currently live on
  the public board", a conclusive claim about the whole board, and the notice
  explaining the blind spot was unreachable exactly when it mattered most. The
  rule was right; its position in a ternary chain was not. The decision is now a
  table in `lib/board/presentation.ts`, both surfaces read it, and the matrix is
  asserted rather than inspected.

  `desktop-21` and `desktop-22` are the live half of that fix. Two of the four
  empty states ARE reachable today: `unclassified`, which every category filter
  reaches because the columns do not exist yet, and the filtered `ok` emptiness,
  which a free-text product filter reaches because it needs no category column.
  Both frames assert the whole-board copy is absent.

  The distinction `desktop-22` proves is the one that matters most:
  "No signal is currently live on the public board" is a statement about the
  market, and it is false the moment a filter is set and merely returns no
  matches. The board behind that frame holds 3,491 signals.

- **The frames are not asserted byte-identical across runs.** The landing
  evidence suite makes that claim for its own frames; this one does not, and no
  determinism check was run here. Treat them as accurate captures, not as a
  regression baseline.
- **The Qualified lane's count is a count of what survived a bounded read**, not
  a database count. Two visibility rules (a listing's validity clock and its
  owner's verification) cannot be expressed in the query, so an exact database
  count would count rows the member may not see. The read ceiling is 500 and
  `bounded` reports when it was reached.
- **Home and End are not bound** on the category grid, matching the Bridge
  primitive, which binds only the four arrows. A radiogroup conventionally
  supports them; adding them is an enhancement for the owner to approve.
- **Five partner types and both escape routes have no icon.** The registry has
  no asset, and drawing one would be an unapproved addition. The column is
  reserved so the grid still aligns.
