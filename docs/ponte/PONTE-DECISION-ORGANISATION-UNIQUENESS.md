# Decision memo: what makes an organisation unique for the first-activation waiver

**To:** Giuseppe Funaro. **Copy:** ChatGPT, Claude Code
**From:** Claude (`claude-opus-5`), UX/UI Director
**Date:** 2 August 2026
**Decides:** the rule gating `WO-7.3`, `WO-7.4` and `WO-7.5`
**Evidence:** production schema export of 2026-08-02T16:40:37Z. Every column named below was read from it.

---

## The question has been aimed at the wrong table

`WO-7.1` asked what makes a row in `organizations` unique. Nothing does, and nothing should be made to, because **`organizations` is self-declared**. `name`, `registration_number`, `vat_number` and `country` are typed in by the member. Adding a unique index to typed-in text buys almost nothing: one character of difference defeats it, and it blocks a legitimate second entity that happens to collide.

**There is already a table holding externally verified entity identity, and the waiver should key on that instead.**

`public.verifications` carries:

| Column | What it is |
|---|---|
| `subject_lei` | **Legal Entity Identifier**, ISO 17442. Globally unique by construction. That is the entire purpose of an LEI. |
| `subject_reg_number` + `subject_country` | Company registry number, unique within its registry |
| `subject_vat` | VAT number |
| `registry`, `vies`, `gleif` | The results of the external checks that produced those values |
| `status` | `pending`, `auto_verified`, `review`, `verified`, `rejected`, `failed`, `needs_selection` |
| `purpose` | `member_business` or `counterparty_check` |

and `profiles.business_verification_id` already points at it.

**These values came back from a registry. The ones in `organizations` were typed by the member.** That is the whole difference, and it is the difference between a rule that holds and one that is defeated by a trailing space.

---

## Recommendation

**Key the waiver on the verified subject identity, in this priority order:**

1. **`subject_lei`**, where present. Globally unique by design, issued by a GLEIF-accredited body, and `gleif` is already a check this system runs.
2. **`subject_country` plus normalised `subject_reg_number`**, where no LEI exists. Unique within a national registry.
3. **No waiver.** If neither identifier is available, the organisation has not been verified to a standard that can carry a once-per-entity entitlement, and the activation is simply $79. **The waiver is a benefit of verification, so it is coherent for it to require verification that actually identifies the entity.**

Eligible statuses: **`verified` and `auto_verified`**, with `purpose = 'member_business'`. A `counterparty_check` is a check on somebody else and must never consume or confer a waiver.

**Uniqueness is enforced on the verified identifier, not on the organisation row.** Two organisation rows for the same company resolve to one LEI and therefore one waiver. The duplicate row stops mattering.

### Why this is better than a column rule on `organizations`

- It cannot be defeated by retyping the company name.
- The duplicate check happens at the moment a human or a registry is already looking, which is verification, rather than at activation when nobody is.
- It reuses infrastructure that exists and is already called.
- It fails **closed**: no verified identity, no free room. The failure mode costs a member $79, not Ponte an unbounded number of free rooms.

### What it costs

Members without an LEI or a registry number do not get a free first room. That is a real cost and you should decide it knowingly. My view is that it is the right trade, because a waiver that cannot identify who consumed it is not a waiver, it is a discount on volume.

**`verifications` has no unique constraint on subject identity either.** The same work is required, on a better column set.

---

## The $0 activation problem is already solved in your own schema

Claude Code raised it and it is a real hazard: a $0 activation takes no payment, so there is no PaymentIntent, no receipt and **no webhook**, and the waiver is never consumed.

**But `20260731e` already anticipated this.** Its `deal_room_billing_events` CHECK reads:

```
provider text not null default 'stripe'
  check (provider in ('stripe', 'ponte_waiver'))
kind   check (kind in ('room_activation', 'additional_branch', 'reactivation', 'waiver'))
```

**`ponte_waiver` is a provider and `waiver` is a kind.** So a $0 activation is a Ponte-side event, not a Stripe one. No webhook is required because no money moves.

The real requirement is **atomicity, not a webhook**: the entitlement write, the period row and the `waiver` billing event must land in one transaction, which a `SECURITY DEFINER` function does naturally and which is how every other Deal Room command in this schema already works. The idempotency key is Ponte-generated rather than provider-generated, and `deal_room_billing_events` already has a unique index on `provider_event_id` where not null to carry it.

So the answer to "how is a $0 activation evidenced" is: **the same way every other room event is, by an append-only billing event that no role can rewrite, including the table owner.** That trigger already exists in the file.

---

## What I need from you

**One decision.** Yes to keying the waiver on verified subject identity, LEI first and registry number second, with no waiver where neither exists. Or tell me you want members without either to get a free room, and I will design the weaker rule and say plainly what it cannot prevent.

**One query, human-run, whenever you next have the Supabase editor open.** It closes the last unknown and needs no row contents:

```sql
select
  (select count(*) from public.organizations)                                        as organisations,
  (select count(*) from public.organizations where verification_level
     in ('company_verified','fully_verified'))                                       as verified_orgs,
  (select count(*) from public.verifications where purpose = 'member_business')      as member_verifications,
  (select count(*) from public.verifications
     where purpose = 'member_business' and status in ('verified','auto_verified'))   as usable_verifications,
  (select count(*) from public.verifications where subject_lei is not null)          as with_lei,
  (select count(*) from public.verifications where subject_reg_number is not null)   as with_reg_number,
  (select count(*) from public.deal_room_entitlements)                               as entitlements,
  (select count(*) from public.deal_rooms)                                           as rooms;
```

If `with_lei` and `with_reg_number` are both near zero, the recommendation above gates the waiver behind data nobody has yet, and that changes the answer. **I would rather know before you commit to it than after.**

`deal_room_entitlements` is estimated at zero rows, so deciding now costs no backfill. That window closes at launch.
