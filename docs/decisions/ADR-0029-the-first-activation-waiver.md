# ADR-0029: The first-activation waiver. Reconciling the branch model with a free first room

- **Status:** ACCEPTED
- **Date:** 2026-08-02
- **Owner ruling received in full**, 2 August 2026, and recorded here in substance. Reading A, calendar days.
- **Amends, and does not supersede, ADR-0020 and ADR-0028.** Both keep their price structure in full. Each is amended in exactly one place, named below.
- **Amends `AUTH-01`** of the canonical authority record, which is being brought into the repository under the same decision.

---

## Why this exists

Three positions were live at once and none of them was wrong on its own terms.

| Position | Where | What it said |
|---|---|---|
| `AUTH-01` | canonical authority v5.2, held outside the repository | First activation free per verified organisation, $79 thereafter, **no capacity restriction** |
| `ADR-0020` and `PT-COMMERCIAL-2026-07-31-01` | merged | $79, five branches included, $15 per additional branch, $199 ceiling, **no free Starter entitlement** |
| `ADR-0028` | merged, accepted 1 August | *"Do not issue a free Starter Deal Room entitlement."* Item 4 of its programme is *"removal of the free Starter entitlement."* |

They were treated as a contest between a flat price and a tiered one. **They are not in contest.** The free provision and the branch structure describe different things: one is a waiver of a fee, the other is what the fee buys. This ADR states the reconciliation so the repository stops carrying two answers.

**The cause of the conflict is recorded honestly, because it will otherwise recur:** `AUTH-01` was written without reading `ADR-0020`, and the resulting reconciliation was then circulated in documents that were never committed to any ref. An agent asked to build against them correctly refused, because from the repository's point of view the authority did not exist. That is the same failure this programme has already diagnosed twice, and this time the author of the diagnosis committed it.

---

## The model

### Free, always

Creating an opportunity. Publishing it. Searching. Expressing interest. Creating, preparing, personalising and previewing a Deal Room draft. Verifying your own organisation.

### The price

| | |
|---|---|
| One Master Deal Room activation, **30 calendar days** | **$79 USD** |
| Concurrently active confidential Deal Branches included | **5** |
| Each additional concurrently active branch | **$15 USD** |
| Maximum per Master Deal Room per 30-day period | **$199 USD** |
| Renewal and reactivation | the same structure, in full |

**Unchanged from ADR-0020 and ADR-0028.** Nothing in this ADR alters any of it.

### The waiver

One per uniquely verified organisation, consumed once and forever.

- The **$79 base fee is waived** while that first activation has **one active branch**.
- **Requesting a second branch ends the waiver.** $79 becomes due for that period, and the standard **five**-branch allowance applies from that moment.
- The **$15** additional-branch charge begins at the **sixth** branch, exactly as in any room.
- Additional-branch charges in that period are capped at **$120**, so the total reaches the normal **$199** ceiling at thirteen or more branches.
- The waiver does not return on renewal, on reactivation, or on any later room.

### One price curve, not two

| Active branches | Charge for the period |
|---|---|
| 1, first activation under the waiver | **$0** |
| 1, any other activation | $79 |
| 2 to 5 | **$79** |
| 6 | $94 |
| 7 | $109 |
| 8 | $124 |
| 13 or more | **$199** |

`roomPeriodPriceCents(branches) = min(19900, 7900 + max(0, branches - 5) * 1500)` in `lib/deal-room/pricing.ts` **is this table and needs no change.** The `PUBLISHED_PRICE_TABLE` needs no change. The waiver is a discount applied on top of the existing curve.

The rejected alternative, charging $15 from the second branch after the waiver lapses, was considered and refused by the owner: it would charge separately for branches already inside the standard $79 package, and it would create a second pricing curve to maintain forever.

### The waiver restricts capacity, not capability

Multilingual operation, evidence, procedures, provider and adviser workspaces, activity history and every other capability are identical to a paid room. **There is no Starter interface and no Starter feature set.** The `STARTER_LIMITS_PROPOSED` values in `lib/deal-room/entitlement.ts`, three sub-rooms and two external guest organisations, **remain superseded and are not reinstated by this ADR.** Only the single-branch condition survives, and it is a branch condition.

### The period

**30 calendar days**, anchored and displayed in **UTC**. The clock does not pause. An exact expiry instant is knowable at activation and must be shown.

`ACTIVE_PERIOD_DAYS = 30` already computes `activatedAt + 30 x 24h`, which is elapsed time and is therefore **already the calendar reading**, exactly, when anchored in UTC. **The behaviour is correct. Only the vocabulary is wrong**, and it contradicts the P1 copy correction. The identifier is renamed under WO-7.

The DST hazard is real but is a **display** hazard, not a duration one: 30 x 24h is not 30 civil days in a timezone that observes DST. Anchoring and displaying in UTC removes it, because UTC has no DST. **No expiry may be displayed in a local civil timezone without stating the offset.**

---

## What this ADR amends, exactly

Two edits, each in one place. Neither document is rewritten and neither is superseded.

### ADR-0020, supersession table, row 1, "What now applies"

Add:

> **Amended by ADR-0029, 2 August 2026.** The abolition of the free first activation is **withdrawn**. One activation per uniquely verified organisation carries a **waiver of the $79 base fee while it has a single active branch**. The prior Starter *feature* limits, three sub-rooms and two external guest organisations, **remain superseded**. The branch model, the $15 additional-branch charge and the $199 ceiling **stand unchanged**.

Nothing else in ADR-0020 changes. Its sections 4, 6, 7, 10, 11, 13 and 17 are confirmed.

### ADR-0028, banner beneath the title

Add:

> **⚠ Amended by ADR-0029, 2 August 2026.** The instruction *"Do not issue a free Starter Deal Room entitlement"* is **withdrawn**, and item 4 of the programme, *"removal of the free Starter entitlement"*, is replaced by *"implementation of the first-activation waiver"*. The price structure stated in this ADR, $79, five included branches, $15 per additional branch and a $199 ceiling, is **unaffected and remains correct**. Everything else in this document stands, including that the entire pre-activation journey is free and that activation is a distinct, member-confirmed event.

The sentence *"The paid entitlement is created only after webhook-confirmed payment"* remains true of paid activations and must not be read as forbidding a waived entitlement recorded at $0 due.

### `PT-COMMERCIAL-2026-07-31-01`

Line 269, which forbids a public free Starter entitlement, takes the same amendment note. Separately, **"30 active days" at lines 98, 279 and 490 becomes "30 calendar days"**, which aligns the authority with the shipped copy in `messages/en.json` rather than the reverse.

### `ADR-0006`

Its superseded banner is revised: the entitlement returns in the amended form above. Its three sub-rooms, two external guest organisations, two internal users and upgrade ladder do not.

---

## The waiver is not enforceable today

Verified against the production schema of 2 August 2026 and independently reconfirmed by Claude Code against the local baseline.

1. **`public.organizations` has exactly one unique constraint, the primary key.** Nothing on `registration_number`, `vat_number`, `name_normalized` or `domain_normalized`; both normalised columns are nullable. **"One waiver per uniquely verified organisation" has nothing to hang on.** The same company can exist as two rows and draw two waivers.
2. **Two verification vocabularies are live.** `profiles.verification_level` is NOT NULL over `unverified`, `identity_verified`, `company_verified`, canonicalised by `20260728d`. `organizations.verification_level` is **nullable** over `unverified`, `email_verified`, `phone_verified`, `company_verified`, `fully_verified`. The waiver depends on the uncanonicalised column.
3. **`deal_room_entitlements.org_id` is nullable with `ON DELETE SET NULL`.** Deleting an organisation would release a consumed waiver.
4. **Nothing in the application writes `deal_room_entitlements`, and nothing anywhere keys on `org_id`.** The only reference is a read by `room_id`. **The per-organisation rule does not exist in code either.** It exists nowhere.

Fact 4 also closes an open unknown listed in the WO-2 reconciliation report §7.

**Consequence:** the $79 side of this model is buildable now. **The waiver is not**, until the uniqueness rule and the eligibility predicate are decided. Those are commercial and compliance decisions and they sit with the owner. `deal_room_entitlements` is estimated at zero rows, so deciding now costs no backfill.

The options and their trade-offs are set out in
`docs/codex/audits/pricing/WO-7-1-ORGANISATION-UNIQUENESS-2026-08-02.md`, together
with the one human-run aggregate query that closes the last unknown. **No option
is chosen there and none is chosen here.**

---

## Consequences

- `lib/deal-room/pricing.ts` price curve and published table: **unchanged**. A waiver layer is added alongside.
- `20260731e_deal_room_paid_room_periods.sql`: **extended, not replaced.** Its capacity-bound price CHECK, $199 cap CHECK, `discount_cents`, generated `amount_due_cents`, one-active-period unique index and append-only billing table all serve this model. It remains **unapplied**, subject to `DECISION-20` steps 3 to 5 and the second reviewer required by `DECISION-24`.
- The paid-model copy already in `messages/en.json` is **correct and is not to be rewritten**. The work is additive.
- `ADR-0020` sections 4 and 11 still bind: **no participant may learn branch count, including through a total billing amount.** Every price total and capacity figure is administrator-only.
- The activation surface must show the value anchor required by `ADR-0020` section 17: `$79 USD` list, `minus $79 USD` credit, `$0 USD` due. **Never a silently free room.**

## Numbering note

`ADR-0022` is absent from `docs/decisions`, and `ADR-0012`, `ADR-0015` and `ADR-0018` each exist twice with different subjects. This ADR takes `0029` as the next free number. The duplicates are recorded here rather than renumbered, because renumbering an accepted decision breaks every citation to it.
