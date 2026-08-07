# Waiver entity resolution: the specification

**Status:** ACCEPTED as amended, 2 August 2026. Unblocks `WO-7.3`, `WO-7.4`, `WO-7.5`.
**Decided by:** Giuseppe Funaro, with the strategic reviewer. Three corrections applied and each is marked.
**For:** Claude Code
**From:** Claude (`claude-opus-5`), UX/UI Director
**Authority:** `ADR-0029`, this document
**Constraint:** this is **target-schema** work. It belongs to `WO-6.4` and **cannot be applied** until `DECISION-20` steps 3, 4 and 5 complete and `DECISION-24`'s second reviewer has seen the migration and the rehearsal evidence.

---

## The rule

The waiver is available **once per externally verified legal entity**.

Eligible verification: `purpose = 'member_business'` **and** `status IN ('verified', 'auto_verified')`. A `counterparty_check` can neither confer nor consume a waiver.

Identity resolves in this order:

1. **Normalised LEI**
2. **Normalised registry jurisdiction or authority, plus registration number**
3. **No qualifying identifier means no waiver.** The activation is simply $79.

**VAT is not an independent fallback.** It may be stored as an attribute; it does not resolve identity.

**No fallback to self-declared `organizations` text, ever.** If eligible verifications rarely carry an LEI or a registry number, that is a verification-capture problem or it makes the launch waiver commercially impractical. It does not justify falling back to typed-in company names.

---

## Three corrections to my recommendation, and why each was right

### 1 · No uniqueness constraint on `verifications`

I implied uniqueness would be enforced there. **Wrong.** Multiple verification records for one entity are legitimate history: re-verification, rescreening, an upgraded level, a periodic refresh. `verifications` already carries `rescreened_at` and `level_requested` precisely because it is a log.

**A log must not be made unique.** Uniqueness belongs on the claim, not on the evidence.

### 2 · Identifiers change over time, and my rule leaked

This is the correction that matters. Under a naive priority rule:

> An entity verifies with a registry number, claims its waiver, later obtains an LEI, re-verifies, resolves to a different key, and **claims a second waiver.**

Priority order alone does not close this. **Identity must be a resolved entity carrying many identifiers, not one identifier acting as the key.**

### 3 · Country plus registration number is not unique

Registries are frequently subnational or plural. Delaware and California issue independently. Germany issues HRB numbers through many local Amtsgerichte. UAE free zones each maintain their own register. Canada registers federally and provincially.

**The key must carry the registry jurisdiction or authority**, not the country. `verifications.registry` already exists and is the field that should supply it.

---

## The model

Four objects. Organisation rows and verification records stay plural and untouched.

```
verifications            many per entity, a log, no uniqueness added
        |
        v
waiver_entity            one resolved legal entity
        |
        +--< waiver_entity_identifier    many per entity, each globally unique
        |
        +--< waiver_claim                AT MOST ONE per entity
```

### `waiver_entity`

A resolved legal entity. Carries no member-typed text as identity. A display name may be stored for administrative reading only and is never used to match.

### `waiver_entity_identifier`

One row per identifier held by that entity.

| Field | Notes |
|---|---|
| `entity_id` | the resolved entity |
| `scheme` | `lei` or `registry`. Constrained, and extensible: **future schemes are anticipated by design.** |
| `authority` | **NULL for `lei`**, which is global. **Required for `registry`**: the issuing jurisdiction or authority, from `verifications.registry`. |
| `value_normalised` | the normalised identifier |
| `first_seen_verification_id` | provenance, to `verifications` |

**Uniqueness: `(scheme, authority, value_normalised)` globally unique**, with `authority` normalised so that NULL and empty cannot both exist for the same scheme.

### `waiver_claim`

**At most one row per `entity_id`.** Enforced by a unique constraint on `entity_id`, not a partial index, because the claim survives expiry, closure and reactivation. It is consumed once and forever.

Carries the room it was spent on, when, and the verification that established eligibility.

**`org_id` on the claim, where kept at all, is NOT NULL and must not be nulled by a cascade.** Under the current `ON DELETE SET NULL`, deleting an organisation would release a consumed waiver.

---

## Resolution, step by step

When an eligible verification completes:

1. **Extract identifiers.** LEI from `subject_lei`. Registry identity from `subject_reg_number` with its authority from `registry`. Ignore `subject_vat` for identity.
2. **Validate.** An **LEI is 20 characters, ISO 17442, with an ISO 7064 MOD 97-10 check.** Validate it. A mistyped LEI that passes into the table creates a phantom entity that can claim its own waiver. Registry numbers have no universal checksum, so normalise and accept.
3. **Normalise.** Per scheme, and conservatively.
   - LEI: strip whitespace, uppercase. Nothing else.
   - Registry: strip whitespace, uppercase, remove punctuation that the authority treats as formatting. **Do not strip leading zeros unless the authority is known to treat them as insignificant.** Where unknown, do not strip: a false merge of two entities is worse than a missed one, because it silently denies a waiver to a company entitled to it.
4. **Look up each identifier.**
   - **No match:** create a new `waiver_entity` and attach all identifiers.
   - **All matches point to one entity:** attach any new identifiers to it. **This is the case that closes correction 2.** The entity that claimed by registry number and later presents an LEI attaches the LEI to the same entity and finds its waiver already spent.
   - **Matches point to two or more different entities:** this is a **merge event**. Do not merge automatically and do not create a third entity. **Record it, refuse the waiver for that activation, and raise it for a human.** It means either a data error or a real corporate event, and both need a person. This is rare and it must be visible rather than resolved by a guess.
5. **Claim.** If the entity has no `waiver_claim`, the waiver is available. If it has one, it is spent.

---

## A commercial consequence you should see before it surprises you

**The waiver is per legal entity, not per group.** That follows directly from the decision as written, and it is the right definition legally.

It also means a group with twenty verified subsidiaries, each with its own LEI, is entitled to **twenty free first activations**, one per subsidiary. Each is a distinct legal entity and each would pass every test above.

GLEIF publishes parent and child relationship data, so a group-level rule is technically possible later. **I am not proposing one and nothing here implements one.** Flagging it because it is foreseeable, it is not a leak in the rule, and it should be a decision rather than a discovery.

---

## The $0 activation, approved as specified

One atomic Ponte-side transaction. **No Stripe object. No webhook. No PaymentIntent.**

The transaction contains, or it contains none of them:

1. the entitlement
2. the period row, `period_price_cents` at the $79 list price, `discount_cents` equal to it, `amount_due_cents` generated to `0`, branch allowance **1**
3. the billing event, `provider = 'ponte_waiver'`, `kind = 'waiver'`, Ponte-generated idempotency key on `provider_event_id`
4. the `waiver_claim`

A `SECURITY DEFINER` function, as every other Deal Room command in this schema already is. `deal_room_billing_events` is append-only through a trigger that refuses UPDATE and DELETE **to the table owner as well**, which is why it is the right place for this and why no webhook is needed to make it trustworthy.

**Waiver lapse on a second branch** is a further append-only event in the same style: `discount_cents` returns to 0 on the existing period row, `amount_due_cents` follows, the standard five-branch allowance applies, and both the waiver and its reversal remain in the billing history. **The claim is not returned.** It was spent at activation.

**The member must see the consequence before the action, not after**, and only a room administrator may see it, per `ADR-0020` sections 4 and 11.

---

## What must not happen

1. **No unique constraint on `verifications`.** It is a log.
2. **No fallback to `organizations` text** for identity, under any circumstances, including an empty result from the count query.
3. **No automatic merge** of two resolved entities.
4. **No Stripe object for a $0 activation.**
5. **No application of any of this** until `DECISION-20` steps 3, 4 and 5 and the `DECISION-24` reviewer. This is target-schema work under `WO-6.4`.

---

## The count query, which no longer blocks anything

Run it when convenient. It now measures verification capture rather than deciding the rule.

```sql
select
  (select count(*) from public.organizations)                                        as organisations,
  (select count(*) from public.verifications where purpose = 'member_business')      as member_verifications,
  (select count(*) from public.verifications
     where purpose = 'member_business' and status in ('verified','auto_verified'))    as usable_verifications,
  (select count(*) from public.verifications
     where purpose = 'member_business' and status in ('verified','auto_verified')
       and subject_lei is not null)                                                   as usable_with_lei,
  (select count(*) from public.verifications
     where purpose = 'member_business' and status in ('verified','auto_verified')
       and subject_reg_number is not null)                                            as usable_with_reg,
  (select count(*) from public.verifications
     where purpose = 'member_business' and status in ('verified','auto_verified')
       and registry is not null)                                                      as usable_with_authority,
  (select count(*) from public.deal_room_entitlements)                                as entitlements,
  (select count(*) from public.deal_rooms)                                            as rooms;
```

`usable_with_authority` is the new one and it is the one to watch. Correction 3 requires an authority for every registry identity, and if `verifications.registry` is mostly null then **registry identity resolves to nothing and the waiver is LEI-only in practice.** That is a verification-capture finding, not a reason to weaken the rule.
