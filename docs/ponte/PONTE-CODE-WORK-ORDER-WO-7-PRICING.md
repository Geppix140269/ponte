# Ponte Trade, Claude Code work order WO-7

## Reconciled Deal Room pricing: implementation plan

**From:** UX/UI Director
**Date:** 2 August 2026
**Authority:** `DECISION-28 REV A`, in `docs/ponte/PONTE-PRICING-AUTHORITY-RECONCILED-v2.md`. Owner ruling: Reading **A**, **calendar** days.
**Repository state examined:** `2a97f065029314509c21cac31426d34a3cc85c02`
**Status of this order:** **PLAN ONLY. Nothing here authorises a production database change, a Stripe change or an email template change.**

---

## 0 · Standing constraints

1. **No production execution.** No migration applied, no Stripe object created or edited, no email template touched. `DECISION-20` steps 3, 4 and 5 in order, then `DECISION-24`'s second human reviewer on the migration and the rehearsal evidence.
2. **No AI connects to production.** `DECISION-22` option A. Anything needing the database is written as a query for a human to run and paste back.
3. **Amend, supersede or annotate. Never silently rewrite** an accepted decision.
4. **The paid-model copy in `messages/en.json` is correct.** It states $79, five branches, $15 each, $199 cap and 30 calendar days. **The work is additive.** Do not rewrite it.
5. **Report what you find, including what contradicts this order.** Two of the most valuable findings in this programme came from you contradicting a brief. This one was written by someone who got the commercial model wrong twice this week.

---

## 1 · The good news, so nothing is rebuilt that already works

**`lib/deal-room/pricing.ts` needs no change to its price curve.**

`roomPeriodPriceCents(branches) = min(19900, 7900 + max(0, branches - 5) * 1500)` is exactly the settled model. The 13-row `PUBLISHED_PRICE_TABLE` is exactly the settled table. `additionalBranchChargeCents`, `isAtPeriodCap`, `formatUsd`, `BILLABLE_SUB_ROOM_KINDS`, `BILLABLE_PARTICIPANT_CLASSES`, `BILLABLE_SUB_ROOM_STATES`, `REQUIRED_AGREEMENTS_FOR_BILLING` and the five-condition `branchBillingVerdict` all stand.

**The waiver is a discount layered on top of that curve, not a second product.** One curve, one table, one pinning test.

Likewise, most of `20260731e_deal_room_paid_room_periods.sql` is right: the capacity-bound `period_price_cents` CHECK, the independent $199 cap CHECK, `discount_cents`, the generated `amount_due_cents`, the one-active-period partial unique index, `deal_room_billing_events` with its append-only trigger and unique `provider_event_id`, and administrator-only RLS on both tables. **Extend it. Do not rewrite it and do not discard it.**

---

## 2 · `WO-7.1` The blocking finding: the waiver is unenforceable today

**Do this first, because the free side of the model cannot be built until it is answered.**

Three facts, all verified against the production export of 2 August:

1. **`public.organizations` has exactly one unique constraint: the primary key.** Nothing on `registration_number`, `vat_number`, `name_normalized` or `domain_normalized`. Both normalised columns are nullable. **"One waiver per uniquely verified organisation" cannot be established.** The same company can exist as two rows and draw two free activations.
2. **Two verification vocabularies are live.** `profiles.verification_level` is NOT NULL and admits `unverified`, `identity_verified`, `company_verified`, canonicalised by `20260728d` on 28 July. **`organizations.verification_level` is nullable** and admits `unverified`, `email_verified`, `phone_verified`, `company_verified`, `fully_verified`. `20260728d` canonicalised profiles only. **The waiver depends on the organisation column, which is the uncanonicalised one.**
3. **`deal_room_entitlements.org_id` is nullable with `ON DELETE SET NULL`.** Deleting an organisation would release its consumed waiver.

**Produce:** a written analysis of options for organisation uniqueness and for the eligibility predicate, with trade-offs, plus what row-level evidence would be needed to know how bad the duplication already is. `organizations` has **never been analysed**, so its row count is unknown. Get it in the same human-run statement as `WO-6.0c`.

**Do not choose the uniqueness rule.** It is a commercial and compliance decision and it is with Giuseppe. State your recommendation and why.

---

## 3 · `WO-7.2` Pricing engine additions

Additive to `pricing.ts`. Pure, no database, no clock, no environment, consistent with the module's existing contract, and carrying **no branch identifiers**, per the disclosure rule.

- `FIRST_ACTIVATION_WAIVED_BRANCHES = 1`
- a waiver-aware amount-due function taking a branch **count** and a boolean eligibility, returning `0` when eligible and the count is 1, and `roomPeriodPriceCents(count)` otherwise
- a predicate for whether a given branch count would **end** the waiver
- the list price stays `roomPeriodPriceCents` in every case, so the `$79 / minus $79 / $0` presentation has a real list price behind it

**Tests to add, none to weaken:** $0 at one branch under the waiver; $79 at two through five; $94, $109, $124 at six, seven, eight; $199 at thirteen and above; $79 at one branch **without** the waiver; and that the waived and unwaived curves are identical from two branches upward. The existing table-pinning test is what kept this visible. Keep it.

---

## 4 · `WO-7.3` Entitlement and eligibility

`lib/deal-room/entitlement.ts` currently holds `STARTER_LIMITS_PROPOSED` with 30 days, 3 sub-rooms and 2 external organisations.

- **The 30-day term survives**, as **calendar** days.
- **The 3 sub-rooms and 2 external organisations remain superseded.** They are feature limits. `DECISION-28 REV A` restricts branch capacity only. Provider and adviser workspaces are never billable and are never limited by this.
- **Add** the first-activation eligibility check. It does not exist. It is gated on `WO-7.1`.
- **Add** waiver consumption: once used, it is used, across renewal, reactivation and every later room.

---

## 5 · `WO-7.4` The corrected migration, drafted only

Additions to `20260731e`, to be **drafted, reviewed and left unapplied**.

1. **A branch allowance distinct from the priced capacity.** Under the waiver the list price stays $79 with five branches priced in, while **one** branch is permitted. Those are two different numbers and the table has one. Propose the column and its constraint, and keep the existing `period_price_cents` CHECK intact.
2. **Waiver lapse inside the same period.** The 30 calendar days do not restart. Recommended shape, and say if you disagree: `discount_cents` returns to 0 on the existing period row, `amount_due_cents` follows as a generated column, and both the waiver and its reversal are recorded in `deal_room_billing_events`. The alternative, closing the waived period and opening a paid one, **collides with the one-active-period unique index**, which is why it is not the recommendation.
3. **Per-organisation uniqueness for the waiver**, expressed so it survives expiry and closure, since the waiver is consumed once and forever. Gated on `WO-7.1`.
4. **`org_id` NOT NULL on the waiver record**, without a nulling cascade.
5. **The $120 additional-charge cap during a waived period**, stated as a constraint, consistent with the $199 ceiling already being stated twice.
6. **`kind`.** `waived` already exists in the CHECK. Decide whether the first activation uses it or a distinct value, and whether `starter` is formally retired to legacy.

---

## 6 · `WO-7.5` Surfaces

Additive. Copy is in `docs/ponte/PONTE-PRICING-AUTHORITY-RECONCILED-v2.md` §4, verbatim, interpolating the numbers from `pricing.ts` and never hard-coding them.

| Surface | Work |
|---|---|
| `messages/en.json` lines 23, 574, 1227, 1234, 1235, 1241 to 1244 | **Paid wording is correct. Do not change it.** Add waiver strings. |
| `app/[locale]/deal-rooms/inside/page.tsx`, `components/deal-room/Walkthrough.tsx`, `lib/deal-room/walkthrough.ts` | Add the waiver to the seven-stage walkthrough |
| `app/[locale]/pricing/page.tsx` | Add the waiver |
| `components/deal-room/ActivationScreen.tsx` | **`$79 / minus $79 / $0 due`**, required by `ADR-0020` §17. Never a silently free room. Exact expiry date, time and timezone. |
| `components/deal-room/OpenYourFirstRoom.tsx`, `DraftRoom.tsx`, `NotOpenYet.tsx` | Reconcile |
| `components/home/landing/DealRoomPreview.tsx` | Verify the rendered string, not only the comment |
| Second-branch request path | **The lapse notice before the action, never after.** Administrator-only. |
| `messages/_deferred/*.json` | Must not ship a stale price in another language |

**Disclosure rule, binding on all of the above:** `ADR-0020` §4 and §11 forbid a participant learning branch count, including through a total billing amount. **Every price total and every capacity figure is administrator-only.** No running total in a shared room header.

---

## 7 · `WO-7.6` Console inventory, for a human

Neither is in the repository and neither is revertible by a git revert.

- **Stripe dashboard:** every product, price and description a human must open, and exactly what to check on each.
- **Supabase email templates:** every template, the exact strings to look for and their approved replacements, including any "30 active days" and any price stated without the waiver.

**Produce the checklists. Do not attempt to reach either system.**

---

## 8 · Order

1. **`WO-7.1`**, the uniqueness and verification finding. Blocks the free side. Analysis and options, no decision.
2. **`WO-7.2`** and **`WO-7.3`**, engine and entitlement. `WO-7.2` can proceed now: the paid curve is settled and unchanged.
3. **`WO-7.4`**, the migration draft. Unapplied.
4. **`WO-7.5`**, surfaces, in a branch, not merged until the authority amendments in `PONTE-PRICING-AUTHORITY-RECONCILED-v2.md` §3 are recorded.
5. **`WO-7.6`**, console checklists, any time. It unblocks a human.

`WO-6`, the `DECISION-20` step 3 reconstruction plan, runs in parallel and is not blocked by any of this. Its `WO-6.4` target-schema section is **corrected by this order**: `20260731e` is extended, not replaced.

---

## 9 · Report

For each item: what was done, what was found, what could not be done and why, and anything in this order you believe is wrong.

**One thing in particular.** I asserted a week ago that the branch model was superseded, and it was not. If you find anything here that contradicts `ADR-0020`, `ADR-0028`, `PT-COMMERCIAL-2026-07-31-01` or the code, **say so before building it**.
