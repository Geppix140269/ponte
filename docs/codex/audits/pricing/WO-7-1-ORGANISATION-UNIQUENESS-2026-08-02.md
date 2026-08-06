# WO-7.1: the waiver is unenforceable, and the authority for it is not merged

**Date:** 2 August 2026
**Order:** `WO-7`, UX/UI Director, 2 August 2026
**Evidence class:** repository, plus production's own schema read locally from
the committed baseline snapshot. **No production connection was used.**
**Scope:** analysis and options. **No decision is taken here**, per the order.

---

## 0. Read this before §2. The order's authority is not in the repository

`WO-7` §9 asks, in terms, to say so before building if anything in it
contradicts `ADR-0020`, `ADR-0028`, `PT-COMMERCIAL-2026-07-31-01` or the code.

It does, and the contradiction is the whole free side of the order.

### 0.1 The cited authority does not exist

| Cited by `WO-7` | Found |
| --- | --- |
| `docs/ponte/PONTE-PRICING-AUTHORITY-RECONCILED-v2.md` | **Absent from every ref.** Searched all local and remote branches by path and by content. |
| `DECISION-28 REV A` | **Absent.** The repository has `DECISION-20` to `DECISION-27` and no 28. |
| `ADR-0028` | **Present**, accepted 2026-08-01. |

`ADR-0028` is a different document from the one the order cites, and it is the
merged record.

### 0.2 What the merged record says

`ADR-0028`, status **ACCEPTED**, under the heading *Entitlement*:

> **Do not issue a free Starter Deal Room entitlement.** A private draft needs no
> entitlement because it is not externally operational. The paid entitlement is
> created only after webhook-confirmed payment.

Its programme list, item 4, is **"removal of the free Starter entitlement"**.

`WO-7.1`, `WO-7.3` and `WO-7.4` exist to build a free first activation. That is
the thing `ADR-0028` says to remove.

### 0.3 Three positions are live at once

| Source | First activation | Capacity |
| --- | --- | --- |
| Canonical authority v5.2 `AUTH-01` | **free**, 30 days, per business-verified organisation | **no capacity restriction** |
| `ADR-0028`, accepted 1 Aug | **no free entitlement at all** | 5 branches, $15 each, $199 cap |
| `WO-7` / "`DECISION-28 REV A`" | **free**, waived once per organisation | 5 branches, $15 each, $199 cap |

`WO-7`'s model is a coherent reconciliation of the other two — it takes the
waiver from `AUTH-01` and the capacity curve from `ADR-0020`. **The reconciliation
is not the problem. Its absence from the repository is.**

`CLAUDE.md` is explicit: a conversation, prompt or local file is never more
authoritative than the merged record, and a conclusion becomes authoritative
only once the owner accepts it, the canonical records are updated, and it is
merged to `main`.

### 0.4 What this blocks, and what it does not

| Item | Status |
| --- | --- |
| `WO-7.1` analysis | **Delivered below.** Valid under every one of the three positions: the uniqueness gap is real whether or not a waiver is ever built. |
| `WO-7.6` console checklists | **Not blocked.** One line item is gated; noted when written. |
| `WO-7.2` waiver-aware pricing functions | **Gated.** They are arithmetic, but they encode a model the merged record rejects. |
| `WO-7.3` eligibility and consumption | **Gated**, and additionally gated on §2 below. |
| `WO-7.4` migration draft | **Gated.** |
| `WO-7.5` surfaces | **Gated.** The order already withholds merge pending amendments; those amendments are to a document that does not exist. |

**What would unblock all of it:** `ADR-0028` amended, superseded or annotated to
record the owner's ruling, and merged. Per the standing constraint, amended —
never silently rewritten.

### 0.5 One thing the order gets right that is worth stating

`WO-7` §1 is accurate in every particular, verified line by line:
`roomPeriodPriceCents` is `min(19900, 7900 + max(0, branches - 5) * 1500)`;
`PUBLISHED_PRICE_TABLE` has 13 rows; every named export exists. The paid curve
needs no change. The order is right that this is additive work, and right not to
rebuild it.

### 0.6 A vocabulary correction the order does not ask for

The owner ruled **calendar** days. The code already computes them:

```ts
new Date(activatedAt.getTime() + STARTER_LIMITS_PROPOSED.activeDays * 24 * 60 * 60 * 1000)
```

That is 30 × 24 hours of elapsed time from activation — a calendar reading, not
a usage-based one. **Only the names say "active":** `ACTIVE_PERIOD_DAYS` in
`pricing.ts` and `activeDays` in `entitlement.ts`. The behaviour is already
correct and the identifiers contradict `P1`, which retired "30 active days" from
member-facing copy on 2 August.

One genuine defect hides behind that: `30 × 24h` is not the same as 30 calendar
days across a daylight-saving boundary. `WO-7.5` requires an **exact expiry
date, time and timezone** on the activation screen, so an hour's drift is
visible to a member. Worth fixing when the naming is fixed.

---

## 1. The three facts of `WO-7` §2, verified

Read from production's own `public` schema — the committed baseline snapshot,
restored locally. Every one is confirmed **exactly as the order states it**.

### 1.1 `organizations` has one unique constraint, and it is the primary key

```
organizations_pkey                      PRIMARY KEY (id)
organizations_owner_id_fkey             FOREIGN KEY (owner_id) REFERENCES profiles(id) ON DELETE SET NULL
organizations_risk_category_check       CHECK (...)
organizations_trust_score_check         CHECK (...)
organizations_verification_level_check  CHECK (...)
```

Unique indexes on the table: **`organizations_pkey` only.**

`registration_number`, `vat_number`, `name_normalized` and `domain_normalized`
all exist and are **all nullable, all non-unique**. The two normalised columns
were evidently built for exactly this purpose and nothing enforces them.

**Consequence:** the same company can exist as two rows. "One waiver per
uniquely verified organisation" has no subject.

### 1.2 Two verification vocabularies, and the waiver depends on the wrong one

| Column | Null? | Admits |
| --- | --- | --- |
| `profiles.verification_level` | **NOT NULL**, default `unverified` | `unverified`, `identity_verified`, `company_verified` |
| `organizations.verification_level` | **nullable**, default `unverified` | `unverified`, `email_verified`, `phone_verified`, `company_verified`, `fully_verified` |

`20260728d` canonicalised profiles and left organizations alone. Both vocabularies
contain `company_verified`, which is the trap: the token that looks shared is the
one an eligibility predicate would reach for, and it means different things on
either side of a join.

A nullable column also means a third state — **not stated** — which is neither
verified nor unverified and which any predicate must decide about explicitly.

### 1.3 The waiver record can be released by deleting an organisation

```
deal_room_entitlements.org_id   nullable
deal_room_entitlements_org_id_fkey  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE SET NULL
deal_room_entitlements_room_id_key  UNIQUE (room_id)
deal_room_entitlements_kind_check   CHECK (kind IN ('starter','sponsored','waived'))
```

`UNIQUE (room_id)` and **nothing on `org_id`**. Deleting an organisation nulls
the link and the consumed waiver is no longer attributable to anybody.

### 1.4 A fourth fact the order does not state, and should

**Nothing in the application enforces any per-organisation entitlement rule, and
nothing writes the table at all.**

The only application reference to `deal_room_entitlements` is a read in
`lib/deal-room/queries.ts:199`, selecting `kind, state, activated_at, expires_at`
by `room_id`. There is no `org_id` predicate anywhere in `lib/`, `app/` or
`components/`.

This closes an open question the WO-2 report listed as determinable from the
repository alone — *"Whether the Starter-per-organisation rule exists in
application code"*. **It does not exist in either layer.** It is not that the
rule is enforced in code rather than in the schema; it is enforced nowhere.

---

## 2. Options for organisation uniqueness

**No option is chosen.** Trade-offs and a recommendation only, per the order.

Uniqueness has to be decided on some key. Four candidates, and they are not
mutually exclusive.

### Option A. Registration number, scoped by country

`UNIQUE (country, registration_number)` where both are present.

| | |
| --- | --- |
| **For** | It is the actual legal identity of a company. Registries are authoritative. It is the only key that a verification process can independently check. |
| **Against** | Both columns are nullable today and the format differs in every jurisdiction. Sole traders in several countries have none. A partial unique index over non-null pairs leaves every null row unconstrained, which is most of the value gone. |
| **Blocks on** | Whether registration number becomes mandatory at business verification. That is a compliance decision. |

### Option B. Normalised domain

`UNIQUE (domain_normalized)`.

| | |
| --- | --- |
| **For** | The column already exists. It is cheap, it is derivable from the email address at signup, and it catches the common duplicate: the same firm registering twice from two addresses at one domain. |
| **Against** | It is wrong for groups (one domain, many legal entities), wrong for firms on a shared or free domain, and it silently merges a parent and a subsidiary. Free-mail domains would have to be excluded by a list that is never complete. |
| **Note** | Strong as a **duplicate detector**, weak as a **uniqueness constraint**. Those are different jobs. |

### Option C. Normalised name, scoped by country

`UNIQUE (country, name_normalized)`.

| | |
| --- | --- |
| **For** | Also already present. Catches casual duplication. |
| **Against** | Company names are genuinely not unique, even within one country. Normalisation is a judgement call — suffixes, transliteration, accents, five languages including Arabic. It will produce false collisions, and a false collision **denies a real company its waiver**, which is worse than granting one twice. |
| **Recommendation** | Not as a constraint. |

### Option D. Verification event, not organisation row

Attach the waiver to the completed business-verification record rather than to
the `organizations` row, and make **that** unique.

| | |
| --- | --- |
| **For** | It moves the guarantee to where evidence actually exists. A verification is a deliberate, reviewed act with a documentary trail; an `organizations` row is created by anyone typing a name. It sidesteps the whole normalisation problem, and it makes the eligibility predicate honest: the waiver is for organisations Ponte has *actually checked*. |
| **Against** | Requires the verification record to carry a stable company identifier anyway — so it does not escape Option A, it relocates it. `profiles.business_verification_id` exists; whether it is populated is unknown without row access. |

### The recommendation

**D as the rule, A as its key, B as a detector.** Stated as a recommendation
because the order reserves the decision.

The reasoning is that the waiver is a commercial concession worth $79 that
should be given to a **verified counterparty**, not to a **typed string**. Making
uniqueness a property of the verification event means the constraint is enforced
at the point where a human or a provider has already established identity, and
it makes the failure mode a refusal to verify twice rather than a refusal to
trade. Option B should run as a flag for review, never as a block, because its
false positives fall on real companies.

**Whatever is chosen, three things follow regardless and are not part of the
decision:**

1. `deal_room_entitlements.org_id` must be `NOT NULL` on a waiver record, without
   a nulling cascade. `ON DELETE SET NULL` cannot coexist with "consumed once and
   forever". `ON DELETE RESTRICT` is the honest choice: a consumed waiver is a
   commercial fact and its subject should not be deletable.
2. The eligibility predicate must name **which** `verification_level` column it
   reads, and must treat the organisations column's `NULL` as an explicit third
   state rather than as `unverified`.
3. The two vocabularies should be reconciled, or the predicate must never join
   on `company_verified` across them.

---

## 3. What is not knowable without row access

`organizations` has **never been analysed** — `pg_class.reltuples` is `-1` — so
its row count is unknown, and so is the current duplication.

The order asks for the evidence needed. This is it. **Read-only, aggregate only,
returns no member record**, and consistent with `DECISION-22` option A.

```sql
-- WO-7.1 evidence. Aggregates only: no name, no number, no row is returned.
select jsonb_build_object(
  'organizations_total',      (select count(*) from public.organizations),
  'with_registration_number', (select count(*) from public.organizations
                                where nullif(trim(registration_number), '') is not null),
  'with_domain_normalized',   (select count(*) from public.organizations
                                where nullif(trim(domain_normalized), '') is not null),
  'with_name_normalized',     (select count(*) from public.organizations
                                where nullif(trim(name_normalized), '') is not null),
  'verification_level_spread',(select jsonb_object_agg(coalesce(verification_level, '(null)'), n)
                                from (select verification_level, count(*) n
                                        from public.organizations group by 1) s),
  -- The duplication, as counts of colliding GROUPS. Never the values.
  'dup_groups_by_domain',     (select count(*) from (
                                select domain_normalized from public.organizations
                                 where nullif(trim(domain_normalized), '') is not null
                                 group by 1 having count(*) > 1) d),
  'dup_groups_by_name',       (select count(*) from (
                                select country, name_normalized from public.organizations
                                 where nullif(trim(name_normalized), '') is not null
                                 group by 1, 2 having count(*) > 1) d),
  'dup_groups_by_registration', (select count(*) from (
                                select country, registration_number from public.organizations
                                 where nullif(trim(registration_number), '') is not null
                                 group by 1, 2 having count(*) > 1) d),
  'entitlements_total',       (select count(*) from public.deal_room_entitlements),
  'entitlements_by_kind',     (select coalesce(jsonb_object_agg(kind, n), '{}'::jsonb)
                                from (select kind, count(*) n
                                        from public.deal_room_entitlements group by 1) s),
  'entitlements_null_org',    (select count(*) from public.deal_room_entitlements
                                where org_id is null)
) as wo_7_1_evidence;
```

**To be run by a human, in the Supabase SQL editor, and the single cell pasted
back.** One statement, one row, one column — the same shape as
`scripts/schema-export-web.sql`, and for the same reason: the editor returns only
the last result set of a multi-statement paste.

The WO-2 report estimates `deal_room_entitlements` at **0 rows**, so if the
uniqueness rule lands before any entitlement is written, there is **no backfill
and no reconciliation of existing waivers**. That is worth knowing now: the
window in which this is cheap is open and will close at launch.

---

## 4. Summary for the owner

1. **The order's authority is not merged, and `ADR-0028` currently says the
   opposite.** One decision — amend, supersede or annotate `ADR-0028` — unblocks
   `WO-7.2` through `WO-7.5` in a single move.
2. **All three of `WO-7` §2's facts are confirmed** against production's schema,
   plus a fourth: no per-organisation rule exists in the application either.
3. **The uniqueness rule is yours to choose.** The recommendation is to attach
   the waiver to the verification event, keyed on registration number, with
   domain collision as a review flag rather than a block.
4. **Three consequences follow whichever way you choose**, listed in §2.
5. **One query, run by a human, closes the last unknown**, and it is cheapest to
   act on now while the entitlements table is empty.
