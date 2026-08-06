> **SUPERSEDED, 2 August 2026. Do not build against this.**
>
> Replaced by **`docs/decisions/ADR-0029-the-first-activation-waiver.md`**, which
> is the authority of record, and by **`PONTE-PRICING-AUTHORITY-RECONCILED-v2.md`**
> in this folder.
>
> This draft left one question open: whether, after the first-activation waiver
> lapses, the $15 charge begins at the **second** branch or at the **sixth**.
> The owner ruled on 2 August 2026: **the sixth**. The waiver lapses, the standard
> $79 applies, and it includes five branches exactly as any paid room does. The
> alternative reading is rejected. The period is **30 calendar days**, not active
> days.
>
> Retained rather than deleted, so the reasoning behind the ruling is visible.

# Ponte Trade, reconciled Deal Room pricing authority

**Version:** 1, drafted 2 August 2026
**Status:** **DRAFT FOR APPROVAL. Nothing here is applied, shipped or executed.**
**Supersedes:** `DECISION-28` as recorded on 2 August, which is **withdrawn and replaced** by `DECISION-28 REV A` below
**Prepared by:** Claude (`claude-opus-5`), UX/UI Director
**Repository state examined:** commit `2a97f065029314509c21cac31426d34a3cc85c02`
**Production schema evidence:** export of 2026-08-02T16:40:37Z, per WO-2 report v1.1

---

## 0 · What was wrong, and it was mine

`DECISION-28` as I recorded it said the branch-capacity model was superseded and that `20260731e_deal_room_paid_room_periods.sql` must not be applied. **That was wrong on both counts** and it came from my own error: I wrote `AUTH-01` as a flat "$79, no capacity restriction" model without reading `ADR-0020`, then framed the conflict to the reviewer as a binary between my clause and the ADR. It was never binary. The free first activation and the branch structure are **complementary**, and the correct action was reconciliation, not supersession.

Three specific corrections to what I circulated:

1. **`$15` per additional branch and the `$199` ceiling stand.** They were never superseded.
2. **`20260731e` is largely correct and largely reusable.** Its capacity-bound price CHECK, its discount and generated `amount_due_cents` columns, its one-active-period unique index and its append-only billing table all serve the reconciled model. It needs **additions**, not replacement. Detail at §5.
3. **The live copy in `messages/en.json` is already correct for the paid case**, states the full branch model, and already says **30 calendar days**. My `P2-2` would have overwritten correct copy with a wrong model. It is withdrawn in its current form.

---

## 1 · `DECISION-28 REV A`, the complete commercial model

### 1.1 Free, always

Publishing an opportunity. Searching. Expressing interest. Creating, preparing, personalising and previewing a Deal Room draft. Business verification of your own organisation.

### 1.2 Standard activation

| | |
|---|---|
| One Master Deal Room activation, 30 **calendar** days | **$79 USD** |
| Active confidential Deal Branches included | **5** |
| Each additional concurrently active branch, for the remainder of the period | **$15 USD** |
| Maximum charge per Master Deal Room per 30-day period | **$199 USD** |
| Renewal or reactivation | the same structure, in full |

### 1.3 First activation per verified organisation

| | |
|---|---|
| The $79 base activation fee | **waived**, once per uniquely verified organisation |
| Active branches included under the waiver | **1** |
| Requesting more than one branch | **triggers the $79 activation fee** |
| Each additional active branch | **$15 USD**, unchanged |
| Additional-branch charges during the free first period | **capped at $120 USD** |
| Total for that period | **$199 USD**, the normal ceiling, preserved |

### 1.4 Never

No subscription. No credits. No paid verification. No commission. No success fee.

### 1.5 After the period

Closed or expired rooms retain **permanent read-only access**. A room is never deleted.

---

## 2 · One arithmetic question I will not answer for you

The clause *"requesting more than one branch triggers the $79 activation fee"* and the clause *"additional branches remain $15 each"* can be read two ways, and they give different price tables. I need one word.

### Reading A, which I believe is intended

The waiver **lapses** when a second branch is requested. From that moment the room is an ordinary $79 room: the fee includes **five** branches, additional branches begin at the sixth, additional charges are capped at $120, total capped at $199.

| Active branches | Charge |
|---|---|
| 1 | **$0** |
| 2, 3, 4, 5 | $79 |
| 6 | $94 |
| 7 | $109 |
| 8 | $124 |
| 13 or more | **$199** |

**Why I think this is right:** it makes *"preserving the normal $199 total ceiling"* exact. $79 base plus the $120 additional cap is $199, and the ceiling is reached at thirteen branches, **identical to a standard room**. The published price table already in `lib/deal-room/pricing.ts` needs no change at all. The waiver is a discount, not a different product.

### Reading B

The $15 applies from the **second** branch even after the $79 triggers.

| Active branches | Charge |
|---|---|
| 1 | **$0** |
| 2 | $94 |
| 3 | $109 |
| 9 or more | **$199** |

Under B the ceiling arrives at **nine** branches rather than thirteen, so a first-activation room and a standard room have different price curves and two tables must be maintained.

**Please confirm A or B.** Everything downstream in §5 changes with the answer, and I would rather ask once than build the wrong table.

---

## 3 · A conflict this correction creates inside canonical authority v5.2

Recorded so it is fixed deliberately rather than discovered later.

**`AUTH-01` in v5.2 currently says the free first room has *"the same functional capability and capacity as a paid room"* and that there is *"no capacity restriction"*.**

**The reconciled model restricts the free first activation to one active branch.** That is a capacity restriction, and it is intended.

So `AUTH-01` must be amended, not merely annotated. The distinction to preserve, and it is the one that matters commercially:

> **The waiver restricts branch capacity. It does not restrict features.** Multilingual operation, evidence, procedures, sub-rooms for providers and advisers, the activity history and every other capability are identical. There is no Starter interface, no Starter feature set and no degraded room.

`STARTER_LIMITS_PROPOSED` in `lib/deal-room/entitlement.ts` proposes three sub-rooms and two external organisations. **Those are feature restrictions and they remain superseded.** Only the one-branch limit survives, and it is a branch limit, not a workspace limit. Provider and adviser workspaces are never billable and are never limited by this.

---

## 4 · Affected artefacts, complete inventory

Item 5 of the correction. Every entry below was verified against the repository at `2a97f065` or against the production export. Nothing here is from memory.

### 4.1 Authority and decision records

| Artefact | State | Required action |
|---|---|---|
| `PONTE-CANONICAL-AUTHORITY-v5.2.md`, `AUTH-01` and `DECISION-15` | Says $79 flat, no capacity restriction, first room free | Amend to §1. Annotate, do not silently rewrite. |
| `docs/decisions/ADR-0020-deal-room-only-pricing-authority.md` | Retires the Starter entitlement in full; row 1 of its supersession table | Correct **only** the clause abolishing a free first activation. Branch model, cap and everything else **stand**. |
| `docs/decisions/ADR-0028-...-free-to-publish-free-to-build-paid-to-activate.md` | *"Do not issue a free Starter Deal Room entitlement."* Accepted 1 Aug, merged PR #218 | Same correction. It is later than ADR-0020 and titled "definitive", so it is what a reader finds first. |
| `docs/decisions/ADR-0006-starter-deal-room-access.md` | Carries a superseded banner | Banner needs revising: the entitlement returns, its 3 sub-rooms and 2 external organisations do not. |
| `docs/ponte-authority/PT-COMMERCIAL-2026-07-31-01-...PRICING-AUTHORITY.md` | 543 lines. Line 269 forbids the free Starter entitlement. Also says "30 **active** days" four times. | Amend line 269. **Reconcile "active days" against "calendar days"**, see §4.5. |
| `docs/ponte-authority/PT-COMMERCIAL-2026-07-27-01`, `-03`, `-04` | Already superseded by ADR-0020 | Check whether the first-activation revival changes their status. |
| `PONTE-P2-DECISION-COPY.md`, `P2-2` | Instructs "Starter or $79" and "no capacity restriction" | **Withdrawn in its current form.** Reissue against §1. |
| `PONTE-WO-2-RECONCILIATION-REPORT-v1.1.md`, §6 | Records DECISION-28 as discarding the branch model | Reissue §6 against `DECISION-28 REV A`. |
| `PONTE-BRIEF-FOR-GPT-03.md` and `-04.md` | Frame the conflict as binary | Superseded by this document. |
| `PONTE-CODE-WORK-ORDER-WO-6-STEP-3.md`, `WO-6.4` | Says replace `20260731e` | Corrected: **extend**, per §5. Not yet issued to Claude Code, so nothing to unwind. |

### 4.2 Code

| File | What it holds | Action |
|---|---|---|
| `lib/deal-room/pricing.ts` | `BASE_ROOM_PRICE_CENTS 7900`, `INCLUDED_ACTIVE_BRANCHES 5`, `ADDITIONAL_BRANCH_PRICE_CENTS 1500`, `MAXIMUM_ROOM_PERIOD_PRICE_CENTS 19900`, `ACTIVE_PERIOD_DAYS 30`, 13-row published table, `roomPeriodPriceCents`, `additionalBranchChargeCents`, `isAtPeriodCap`, `formatUsd`, and the five-condition billable-branch verdict | **Under reading A: unchanged.** Add a first-activation waiver function alongside it. Under reading B: a second table is required. |
| `lib/deal-room/entitlement.ts` | `STARTER_LIMITS_PROPOSED` (30 days, 3 sub-rooms, 2 external orgs), `daysRemaining`, `starterExpiryFrom`, `subRoomLimit`, `guestOrganisationLimit`, `usageSummary` | The **30-day term survives**. The sub-room and external-organisation limits stay superseded. Needs a per-organisation first-activation eligibility check, which does not exist. |
| `lib/deal-room/billing.ts` (185 lines) | Billing records | Reconcile against §1 |
| `lib/deal-room/charging.ts` (333 lines) | Charging path, Stripe-aware | Reconcile. Must express the waiver as a discount, not as a skipped charge. |
| `lib/deal-room/period-lifecycle.ts` (239 lines) | Period states | Reconcile, including waiver lapse on second branch |
| `lib/deal-room/walkthrough.ts` | Imports all four constants and renders *"$79 for 30 calendar days, including 5 active counterparty branches"*, *"$15 for each additional active branch"* | Correct for the paid case. **Says nothing about the free first activation.** |
| `lib/deal-room/screens-example.ts`, `states.ts`, `permissions.ts`, `queries.ts` | Reference entitlements | Review |
| `lib/stripe.ts`, `app/api/webhooks/stripe/route.ts` | Stripe integration and webhook | **No Deal Room charge exists yet.** Confirm before assuming. |
| `lib/credits.ts`, `lib/credits/packs.ts`, `app/api/credits/checkout/route.ts`, `app/api/credits/balance/route.ts` | Credits, withdrawn by `AUTH-01` | Unaffected by this correction. `P2-1` still stands. |
| Tests: `pricing.test.ts`, `billing.test.ts`, `charging.test.ts`, `period-lifecycle.test.ts`, `permissions.test.ts`, `rls-contract.test.ts`, `activation-vocabulary.test.ts` | The published price table is **pinned by test** so the engine and published price cannot drift | Extend, do not weaken. The pinning test is why this stayed visible. |

### 4.3 Live interfaces

| Surface | Current state | Action |
|---|---|---|
| `messages/en.json` line 1227, 1234, 1235, 1241 to 1244 | **Already states the complete correct paid model**, including *"Additional branches are $15 USD each, capped at $199 USD per room per 30-day period"* and the worked example *"five branches cost $79. Seven cost $109. Thirteen or more cost $199."* All say **30 calendar days**. | **Do not touch the paid wording. It is right.** Add the free first activation. |
| `messages/en.json` line 23 and 574 | *"Ponte is paid for one thing: a Deal Room, at $79 USD for 30 calendar days."* | Add the first-activation waiver, or the first room is undersold. |
| `app/[locale]/deal-rooms/inside/page.tsx` and `components/deal-room/Walkthrough.tsx` | Live. Reads every price from `pricing.ts`. | Add the waiver stage. |
| `app/[locale]/pricing/page.tsx` | Live | Reconcile |
| `components/deal-room/ActivationScreen.tsx` | The payment moment | **The waiver must be visible as `$79 / minus $79 / $0 due`**, per ADR-0020 §17. Never a silently free room. |
| `components/deal-room/OpenYourFirstRoom.tsx`, `DraftRoom.tsx`, `NotOpenYet.tsx` | Draft and entry surfaces | Reconcile |
| `components/home/landing/DealRoomPreview.tsx` | Carries a comment recording the earlier "$79 when you publish it, for 30 active days" correction | Verify the rendered string, not just the comment |
| `messages/_deferred/*.json` (ar, de, es and others) | Deferred locales | Must not ship a stale price in another language |
| **Supabase email templates** | **Not in the repository.** Hand-pasted. | Human console work. Not revertible by git. |
| **Stripe dashboard** | **Not in the repository.** | Human console work. Not revertible by git. |

### 4.4 Migrations and database

| Artefact | State | Action |
|---|---|---|
| `20260731e_deal_room_paid_room_periods.sql` | **Written, reviewed, NOT applied.** Adds `paid` kind, `deal_room_room_periods`, `deal_room_billing_events`, `current_period_id`, administrator-only RLS, append-only billing trigger | **Extend, per §5. Do not apply unchanged.** |
| `deal_room_entitlements` in production | `kind` admits `starter`, `sponsored`, `waived` only. `UNIQUE (room_id)`. **Nothing on `org_id`.** | The one-free-activation-per-organisation rule is **not enforceable at the data layer today**. |
| `organizations` | Has `verification_level`, default `unverified` | The waiver depends on this. Row count unknown, never analysed. |

### 4.5 Two open conflicts this correction does not resolve

1. **"30 active days" against "30 calendar days".** `PT-COMMERCIAL-2026-07-31-01` says active days four times. Your correction says **calendar** days, and shipped copy in `messages/en.json` already says calendar days everywhere. **I am proceeding on calendar days** and the authority file needs correcting to match. Say so if that is wrong, because no expiry date can be drawn on any screen until it is settled.
2. **The disclosure rule.** `ADR-0020` §4 and §11 forbid a participant learning the branch count, and name *"a total billing amount where that amount would reveal branch count"* as something that must not leak. `20260731e` enforces this with administrator-only RLS on both billing tables. **Any surface showing a running total must be administrator-only.** This constrains the activation and billing screens and is not affected by the waiver.

---

## 5 · What `20260731e` needs, rather than being replaced

Retained unchanged: the capacity-bound `period_price_cents` CHECK, the independent `$199` cap CHECK, `discount_cents`, the generated `amount_due_cents`, the one-active-period partial unique index, `deal_room_billing_events` with its append-only trigger and its unique `provider_event_id`, and administrator-only RLS on both tables.

Required additions, to be **drafted and reviewed, not applied**:

1. **Per-organisation first-activation eligibility.** Nothing today prevents a second free room. Needs a uniqueness rule keyed on the verified organisation, not on a room and not on an email.
2. **A branch allowance distinct from the priced capacity.** Under the waiver, list price remains $79 with five branches priced in, but **only one branch is permitted**. Those are two different numbers and the current table has only one.
3. **Waiver lapse.** The transition when a second branch is requested: $79 becomes due, `discount_cents` returns to 0, and the event is recorded in `deal_room_billing_events` with `kind = 'waiver'` and its reversal. The append-only table makes this auditable, which is exactly why it is append-only.
4. **The $120 additional-charge cap during a waived period**, expressed as a constraint rather than only in application code, consistent with how the $199 ceiling is already stated twice.
5. **`kind`.** `waived` already exists. Decide whether the first activation is `waived` or a distinct value, and whether `starter` is retired to a legacy value.

**None of this is applied under any circumstances until `DECISION-20` steps 3, 4 and 5 complete, and `DECISION-24`'s second human reviewer has reviewed the migration and the rehearsal evidence.**

---

## 6 · Sequence, with the gates named

1. **Confirm reading A or B**, §2. One word. Everything downstream depends on it.
2. **Confirm calendar days**, §4.5. One word. Design is held on it.
3. I draft the corrected authority wording for `AUTH-01`, `ADR-0020`, `ADR-0028` and `PT-COMMERCIAL-2026-07-31-01`. **Amendment and annotation, never silent rewriting.**
4. I reissue `P2-2` and WO-2 report §6.
5. Claude Code produces the implementation plan: pricing engine additions, entitlement eligibility, charging path, the corrected migration draft, and the surface-by-surface copy plan. **Plan only.**
6. Review, then approval, then execution, in that order.

**Nothing touches the production database or Stripe before step 6. No code change, no copy change, no migration, no dashboard edit.**

---

## 7 · What I need from you

**Two words.** Reading **A** or **B**, and **calendar** or **active** days.

With those, the corrected authority wording follows within the hour and Claude Code can start on the plan.
