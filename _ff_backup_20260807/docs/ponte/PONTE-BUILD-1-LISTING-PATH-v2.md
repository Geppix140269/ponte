# Build 1, replace the live listing path

**Version:** 2. Reissued 2 August 2026 against the merged authority.
**For:** Claude Code
**From:** UX/UI Director
**Authority:** `ADR-0029` (merged, `db7c774`), `ADR-0020`, `ADR-0028`, `ADR-0026`, `DECISION-16`, `DECISION-17`, `DECISION-19`
**Supersedes:** `PONTE-BUILD-1-LISTING-PATH.md` v1, which was written before #84 closed and before the pricing authority was reconciled.

---

## Why this is now the top of the queue

**The dependency is satisfied.** v1 said *"Issue #84 gates verification of this build. Do #84 first, or this build ships with the same blind half."* #84 is done, on `ops/84-development-database` in PR #228: `npm run verify` passes at exit 0, there is a seeded database, and a dev sign-in that reads the OTP out of Mailpit. **Every screen in this build has a signed-in branch and every one of them can now be tested.** That gap is what turned `/deal-rooms/propose` into a working day and three wrong diagnoses.

**This build needs no schema change.** Verified against the production export of 2 August, not assumed. `listings` already carries all 67 columns this path needs: `market_family`, `market_intent`, the service and distribution keys, `territory_codes`, `validity_type` and `valid_until`, `quantity_mode` with its six values, `declaration_accepted_at`, `safety_flags`, `flag_reason`, `flag_severity`, `completeness_score`, `submitter_role`, `chain_depth` and `mandate_sighted`. `anonymous_drafts` exists with `session_key`, `claimed_by` and `claimed_at`.

**So this is the one open work order that puts something in front of a visitor.** `WO-6` and `WO-7` are both plan-only and neither blocks it.

---

## What is being replaced

| Live now | Replaced by |
|---|---|
| `/deal-rooms/propose`, *"Start with what you trade"* | The Set 1 entry pattern |
| `/structure`, the three-option intent screen | Set 2 `B01` Choose Deal Intent, then the Set 1 patterns |

**The specification is the design reference, committed at `docs/ponte/design-reference/`:** `ponte-set1.css` with `ponte-set1-screens.js`, three patterns and 23 states, and `ponte-set2.css` with `ponte-set2-screens.js`, six surfaces and 31 states. Light and dark, 390px.

**Those files are the specification, not the production code.** Take the markup structure, the tokens, the state coverage and the copy verbatim. Build them properly in the app.

---

## `B01` Choose Deal Intent, and the mapping I need confirmed

The live screen offers **three** options. `DECISION-17` requires **six**. The database admits **seven** values of `market_intent`.

Those three numbers are all correct and the reconciliation has never been written down. Here it is. **Confirm it before building, because getting it wrong repeats the error of collapsing two axes into one.**

The member is asked family, then direction, and for distribution only, position. Six choices are presented. Distribution resolves to three stored values because a principal seeking a distributor and a distributor seeking brands are counterparties, not the same thing.

| Presented choice | Family | Direction | Position | Stored `market_intent` |
|---|---|---|---|---|
| Source a product | products | need | n/a | `source_product` |
| Supply a product | products | offer | n/a | `offer_product` |
| Find a trade service | services | need | n/a | `seek_trade_service` |
| Offer a trade service | services | offer | n/a | `offer_trade_service` |
| Find distribution or representation | distribution | need | **principal** | `seek_distribution_partner` |
| Find distribution or representation | distribution | need | **distributor or representative** | `seek_brands_or_products_to_represent` |
| Offer distribution or representation | distribution | offer | distributor or representative | `offer_distribution_or_representation` |

**Six choices, seven stored values.** The seventh exists because "find distribution" is ambiguous without position, and the position question is asked only in the distribution branch.

**Confirmed 6 August, and it sharpens the table.** Position is asked **only on the need side**. `distribution + offer + principal` is absent from the table deliberately: a principal with goods to sell is offering a **product**, not distribution. So on the offer side the position is **known, not asked**, and asking it would invite an answer the model excludes.

**The Set 2 design reference cannot produce the seventh value, and must be revised.** Its `B01` position state offers four options, *seeking a distributor*, *offering to distribute*, *seeking an agent*, *offering to represent*. Those four collapse to **two** stored values, because "distributor" and "agent" are **partner types, not directions**, and `seek_brands_or_products_to_represent` is unreachable from that screen.

Partner type already has its own column, `listings.distribution_partner_type_key`, and belongs later in the path. **`B01` asks direction and position. It does not ask partner type.** Build to the table above, not to the reference, and log the Set 2 `B01` revision for Design.

`market_family` admits `products`, `services`, `distribution` and nothing else. **`goods`, `trade_services` and `product` are outside the CHECK on both `listings` and `deal_rooms`** and are what crashed the signed-in path. Any code path that can still produce them is a defect.

---

## The rest of the build

**Capacity declaration.** Acting as principal, authorised representative, broker or intermediary, or service provider. **A previous answer is a suggestion and must be actively confirmed, never pre-selected.** Intermediary status is public. `submitter_role`, `chain_depth` and `mandate_sighted` are the existing columns.

**Tell Ponte.** Speak, photograph or upload, browse categories, type with search, **in that priority order**. **The upload route requires sign-in**, `DECISION-16`. Typing is always available and is never the only route.

**The listing so far.** One fact per line. Missing and uncertain rise above confirmed. Inferred marked distinctly from read. Correction in place, never a bare text field.

**Deal Preview.** Three visibility layers. The minimum public dataset is fixed and unmovable. Identity is revealed on accepted interest by default. Validity 30, 60 or 90 days with **60 the default**, and **the exact expiry date shown**, using `validity_type` and `valid_until`.

**Submission confirmation.** An **R2 recognition surface**, not a receipt. All five Momentum elements: action, recognition, value created, progress preserved, next action. No coins, points, streaks or confetti.

**Screening.** Automated, per-check verdicts, seconds not days. The status label is **`Checked`**. Never `Approved`, `Vetted` or `Reviewed`. **Never imply the checks are exhaustive or that a counterparty is safe**, `DECISION-19`, and that includes AI-generated copy. Check the prompts, not only the strings: `lib/ai-vet.ts` was regenerating a claim the templates did not contain.

---

## Thirteen things that must not survive

From the live screens, all currently in production. Twelve are unchanged from v1. **Item 5 is corrected** by `ADR-0029`.

1. Sans-serif headline where the constitution requires serif
2. Rounded buttons. No boxes anywhere.
3. The arc used as navigation. It appears once, in the home hero, decorative.
4. **"Publish it" used for the Deal Room path.** Publish means a free public listing and nothing else.
5. **"Open the room" with no price context.** It is **Create a Deal Room, free**, then **Activate**. Where a price appears on this path at all, it is stated per **`ADR-0030`**: **$79 USD for 30 calendar days, five active counterparty branches included.** Read every number from `lib/deal-room/pricing.ts`. Never type one into a surface.

   **Corrected 6 August.** This item previously ended *"first activation free while it has one active branch"*, written on 2 August under `ADR-0029`. **`ADR-0030`, accepted 6 August, supersedes it: no surface may state, imply or hint at a free first Deal Room until the waiver is enabled.** Build the paid model only. No waiver string anywhere on this path. Claude Code identified the contradiction before building and was right to build to `ADR-0030`.
6. **"workspace"**, retired. It means a sub-room inside a room. Use "Your listing" for `B10`.
7. **"in five languages"**, an unverified claim. Remove unless it is true.
8. Three opportunity types instead of six
9. *"Three ways in. Ponte does the classification."*
10. *"Choose a route above. Browsing categories still works exactly as it did, and no customs code is needed before Ponte understands your product."*
11. Ungated document upload
12. Body copy set in monospace
13. *"Ponte kept where you had reached and brought you back to it. / Nothing started yet."*, self-contradictory

---

## Rules

No boxes, cards, rounded rectangles or shadows. Structure from typography, scale, whitespace, full-width hairlines and background tone shifts only.

One primary action per screen. Tap and voice first, typing always available. Back never loses work. One segmented progress rule, no numeral. 48px minimum targets, 64px choice rows. Every tap acknowledged inside 100ms. Empty, loading and error states for every surface, both themes.

Retention copy, verbatim:

> Saved only in this browser for up to 7 days. Sign in to keep it longer and continue on another device.

Signed in: 90 days from last meaningful edit, warnings at 14 and 3 days. **Opening a draft must not reset the clock.** Only a meaningful edit or an explicit "Keep draft" does. That is the part most likely to be implemented wrongly by accident.

---

## Verification, which is the part that is new

**Every acceptance criterion below must be checked signed in as well as signed out.** Until today only the signed-out branch was ever tested, and every claim anyone made about `/deal-rooms/propose` was a claim about its signed-out half without saying so.

- all six presented choices reachable, and each writing the `market_intent` in the mapping table above
- the distribution position question appearing only in the distribution branch
- no code path capable of writing `goods`, `trade_services` or `product` to `market_family`
- one click routes with a visible state change inside 100ms, in a preview environment, not only in tests
- the upload route refusing an unauthenticated session
- the anonymous draft surviving a reload and expiring on the stated terms, with opening it not resetting the clock
- the exact expiry date rendered for each of 30, 60 and 90
- `Checked` as the screening label, and no string anywhere implying comprehensive screening
- every surface at 360px and at desktop width, both themes

---

## Order

1. **`B01` through `B09`, products family first.** It is the largest audience and the fullest schema.
2. **Services and distribution behind the same architecture.** The field sets differ per family, the structure does not.
3. **P2 copy corrections fold into this** rather than being applied twice. `P2-2` is withdrawn in its current form and will be reissued against `ADR-0029`; the rest of P2 stands.

`B10` and the response layer are Set 3 and are not in this build. Two of their states, **Lapsed** and **withdrawal**, do not exist in `listing_connections`, which admits `pending`, `accepted` and `declined` only. That is target-schema work under `WO-6.4`.

---

## Report

What was done, what was found, what could not be done and why, and anything in this order you believe is wrong.

**The mapping table above in particular.** It is my reconciliation of a six-choice interface against a seven-value constraint, and I have not seen it written down anywhere else. If the code or the migrations already imply a different one, that one probably wins. Say so before building.
