# Ponte Trade, reconciled Deal Room pricing authority

**Version:** 2, **SETTLED**. 2 August 2026
**Status:** approved model, **corrected authority wording drafted for adoption**. Nothing applied, shipped or executed.
**Replaces:** `DECISION-28` of 2 August, withdrawn. This is **`DECISION-28 REV A`**.
**Owner ruling:** Reading **A**. **Calendar** days. Received 2 August 2026.
**Prepared by:** Claude (`claude-opus-5`), UX/UI Director
**Evidence base:** repository commit `2a97f065029314509c21cac31426d34a3cc85c02`; production schema export 2026-08-02T16:40:37Z

---

## 1 · `DECISION-28 REV A`, the settled model

### 1.1 Free, always

Creating an opportunity. Publishing it. Searching. Expressing interest. Creating, preparing, personalising and previewing a Deal Room draft. Verifying your own organisation.

### 1.2 The price

| | |
|---|---|
| One Master Deal Room activation, **30 calendar days** | **$79 USD** |
| Active confidential Deal Branches included | **5** |
| Each additional concurrently active branch | **$15 USD** |
| Maximum per Master Deal Room per 30-day period | **$199 USD** |
| Renewal and reactivation | the same structure, in full |

### 1.3 The first activation waiver

One per uniquely verified organisation.

- The **$79 base activation fee is waived** while the first activation has **one active branch**.
- **Requesting a second branch ends the waiver.** The standard $79 becomes due for that period, and the standard allowance of **five** active branches applies from that moment.
- The **$15** additional-branch charge begins at the **sixth** branch, exactly as in a standard room.
- Additional-branch charges are capped at **$120**, so the period total reaches the normal **$199** ceiling at **thirteen or more** active branches.
- The waiver is consumed once. It does not return on renewal, reactivation or a later room.

### 1.4 The single price table, which serves both cases

| Active branches | Charge for the 30-day period |
|---|---|
| 1, first activation under the waiver | **$0** |
| 1, any other activation | $79 |
| 2, 3, 4, 5 | **$79** |
| 6 | $94 |
| 7 | $109 |
| 8 | $124 |
| 9 | $139 |
| 10 | $154 |
| 11 | $169 |
| 12 | $184 |
| 13 or more | **$199** |

**Reading B is rejected.** It would charge separately for branches already included in the standard $79 package and would create a second pricing curve.

**Consequence for the engine, and it is the good news:** `roomPeriodPriceCents` in `lib/deal-room/pricing.ts` is `min(19900, 7900 + max(0, branches - 5) * 1500)` and is **correct and unchanged**. So is the 13-row published table. The waiver is a **discount applied on top**, not a different product. One curve, one table, one test.

### 1.5 Never

No subscription. No credits. No paid verification. No commission. No success fee.

### 1.6 After the period

Closed and expired rooms keep **permanent read-only access**. A room is never deleted.

### 1.7 The period

**30 calendar days**, from activation. Not active days. The clock does not pause. An exact expiry date, with time and timezone, is knowable and must be shown at the moment of payment.

---

## 2 · The waiver is not enforceable today, and this is the finding that matters

Discovered while drafting the eligibility rule. It is a commercial control gap, not a schema tidiness point.

### 2.1 Nothing makes an organisation unique

`public.organizations` has **exactly one unique constraint: the primary key on `id`.** There is no uniqueness on `registration_number`, `vat_number`, `name_normalized` or `domain_normalized`, and both normalised columns are nullable.

**So "one free activation per uniquely verified organisation" cannot be established.** Nothing prevents the same company existing as two organisation rows, each drawing a free activation. This is a stronger version of the duplicate-account concern already written into `P2-2`: the duplication is of **organisations**, not of email accounts, and the existing wording does not cover it.

### 2.2 Two different verification vocabularies are live

| Column | Permitted values | Nullable |
|---|---|---|
| `profiles.verification_level` | `unverified`, `identity_verified`, `company_verified` | **NOT NULL**, canonicalised by `20260728d` on 28 July |
| `organizations.verification_level` | `unverified`, `email_verified`, `phone_verified`, `company_verified`, `fully_verified` | **nullable** |

They share only two values. `20260728d_verification_level_canonical.sql` canonicalised **profiles only**. The organisation column still carries the older five-value set, and it is the column the waiver depends on.

**The eligibility predicate therefore has no trustworthy column to read today.** Before the waiver can be built, the authority has to say which organisation states count as verified for this purpose, and the column has to be canonicalised and made NOT NULL the way profiles already was.

### 2.3 The waiver row can be freed by a deletion

`deal_room_entitlements.org_id` is nullable with `ON DELETE SET NULL`. If the waiver is recorded as an entitlement row keyed on `org_id`, deleting the organisation releases the waiver and the same company can claim it again. For the waiver record specifically, `org_id` must be **NOT NULL** and must not be nulled by a cascade.

**These three items gate the waiver. Until they are answered, the $79 side of the model is buildable and the free side is not.**

---

## 3 · Corrected authority wording, drafted for adoption

Amendment and annotation. **No document is silently rewritten.** Each superseded passage stays in place under a banner, as `ADR-0006` already does.

### 3.1 `PONTE-CANONICAL-AUTHORITY-v5.2.md`, `AUTH-01`

Replace the pricing clause with:

> **`AUTH-01`, as amended by `DECISION-28 REV A`, 2 August 2026.**
>
> Publishing an opportunity, searching, expressing interest and preparing a Deal Room draft are free.
>
> A Master Deal Room activation costs **$79 USD for 30 calendar days** and includes **five** concurrently active confidential Deal Branches. Each additional concurrently active branch costs **$15 USD** for the remainder of that period. **No Master Deal Room costs more than $199 USD in any 30-day period.** Renewal and reactivation carry the same structure.
>
> The **$79 base fee is waived once per uniquely verified organisation**, on that organisation's first activation, **for as long as that activation has one active branch**. Requesting a second branch ends the waiver: the $79 becomes due for that period and the standard five-branch allowance applies from that moment. Additional-branch charges during that period are capped at $120, preserving the $199 ceiling.
>
> **The waiver restricts branch capacity. It does not restrict features.** Multilingual operation, evidence, procedures, provider and adviser workspaces, activity history and every other capability are identical to a paid room. There is no Starter interface and no Starter feature set.
>
> There is no subscription, no credit balance, no paid verification, no commission and no success fee. Closed and expired rooms retain permanent read-only access.

**Withdrawn from `AUTH-01`:** *"the same functional capability and capacity as a paid room"* and *"no capacity restriction"*. The first survives as to **capability**; it is withdrawn as to **capacity**. Recorded rather than deleted, because the distinction is the whole point.

### 3.2 `docs/decisions/ADR-0020`, supersession table row 1

Row 1 currently abolishes the Starter entitlement in full. Replace **only that row's "What now applies" cell**:

> **Amended by `DECISION-28 REV A`, 2 August 2026.** The abolition of the free first activation is **withdrawn**. One activation per uniquely verified organisation carries a **waiver of the $79 base fee while it has a single active branch**. The prior Starter *feature* limits, three sub-rooms and two external guest organisations, **remain superseded and are not reinstated**. Everything else in this authority, the branch model, the $15 additional-branch charge and the $199 ceiling, **stands unchanged**.

**Nothing else in ADR-0020 changes.** Its `$15`, its `$199`, its billable-branch conditions, its disclosure rules in sections 4 and 11, and its waiver presentation in section 17 are all confirmed.

### 3.3 `docs/decisions/ADR-0028`

Add a banner at the head, beneath the title:

> **⚠ Amended by `DECISION-28 REV A`, 2 August 2026.** The instruction *"Do not issue a free Starter Deal Room entitlement"* is **withdrawn**. A first-activation waiver of the $79 base fee now exists, once per uniquely verified organisation, conditional on single-branch use. The price structure stated in this ADR, $79, five included branches, $15 per additional branch and a $199 ceiling, is **unaffected and remains correct**. Everything else in this document stands.

Also correct, in the Entitlement section, *"The paid entitlement is created only after webhook-confirmed payment"*, which remains true for paid activations and must not be read as forbidding a waived entitlement at $0.

### 3.4 `docs/ponte-authority/PT-COMMERCIAL-2026-07-31-01`

Two amendments.

**Line 269**, which currently forbids a public free Starter entitlement, gains:

> **Amended 2 August 2026 by `DECISION-28 REV A`.** A first-activation waiver of the base fee exists, once per uniquely verified organisation, while that activation has a single active branch. It is a **waiver of the fee**, not a Starter product: no feature is withheld and no separate interface exists. Historical `starter` schema values remain legacy.

**"30 active days"**, at lines 98, 279 and 490 and wherever else it appears, becomes **"30 calendar days"**, with a dated amendment note. The shipped copy in `messages/en.json` already says calendar days, so this aligns the authority to what is live rather than the reverse.

### 3.5 `docs/decisions/ADR-0006`

Revise its superseded banner: the entitlement returns in the amended form above; its three sub-rooms, two external guest organisations, two internal users and upgrade ladder **do not**.

---

## 4 · Approved copy

Verbatim. `lib/deal-room/pricing.ts` remains the only source of the numbers; these strings must interpolate from it, never hard-code.

**Price statement, full:**

> A Ponte Deal Room costs $79 USD for 30 calendar days and includes five active counterparty branches. Additional branches are $15 USD each, capped at $199 USD per room per 30-day period.

**First activation, on the activation screen.** The value anchor is required by `ADR-0020` §17 and is not optional:

> Ponte Deal Room, 30 calendar days ... $79 USD
> First activation credit ... minus $79 USD
> **Amount due ... $0 USD**
>
> Your first Deal Room is free while it has one active branch.

**Before a second branch is requested.** Shown to the room administrator only, and **before** the action, never after:

> Opening a second branch ends your first-activation credit. $79 USD becomes due for this period, and includes five active branches.

**Expiry, stated at activation with the real date:**

> Active until 1 September 2026, 14:32 UTC.

**Renewal and reactivation:**

> Renewal is $79 USD for a further 30 calendar days. The first-activation credit is used once and does not apply again.

**Prohibited.** No silently free room. No "Starter" as a product name in any interface. No "trial". No "30 active days". No promise that the credit recurs. **No total that reveals branch count to anyone other than a room administrator**, per `ADR-0020` §4 and §11.

---

## 5 · What must not happen

1. **No production database change.** `20260731e` stays unapplied. `DECISION-20` steps 3, 4 and 5 in order, and `DECISION-24`'s second reviewer, come first.
2. **No Stripe dashboard change.** Not revertible by git.
3. **No email template change.** Not in the repository. Not revertible by git.
4. **No touching the correct paid-model copy** already in `messages/en.json`. It states $79, five branches, $15, $199 and 30 calendar days, and it is right. The work is **additive**.
5. **`P2-2` as written stays withdrawn.** It instructs "Starter or $79" and "no capacity restriction". Both are now wrong.

---

## 6 · What I need next

**Three answers**, all from §2, and the free side of the model cannot be built without them:

1. **Which organisation verification states qualify** for the waiver. `organizations.verification_level` currently admits `unverified`, `email_verified`, `phone_verified`, `company_verified`, `fully_verified`. My reading of the intent is **`company_verified` and `fully_verified` only**, since the waiver is meant to reward business verification, but I am not deciding it.
2. **Whether `organizations.verification_level` is canonicalised** to match the profiles vocabulary, and made NOT NULL, as `20260728d` did for profiles.
3. **What makes an organisation unique** for the purpose of consuming the waiver once: registration number and country, normalised domain, or a human check. Today nothing does, and the waiver is duplicable by creating a second organisation row.

The implementation plan, `WO-7`, is written and goes to Claude Code on your word. **It is plan-only and touches nothing.**
