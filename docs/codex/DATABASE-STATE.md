# Database state

**Reconciled:** 28 July 2026

This file is a guardrail, not a complete schema dump. Codex must inspect the live production record and repository migrations before proposing database work.

## Full reconciliation, 28 July 2026

Every file in `supabase/migrations/` was verified object by object against
production (`cptglsmjmzcfpjndqfmc`): 260 assertions across columns, constraints,
indexes, functions, triggers, policies, RLS state, storage buckets and data
backfills. Full evidence:
`docs/codex/audits/2026-07-28-production-migration-reconciliation.md`. Read it
before proposing database work; the summary here is not a substitute.

**No repository migration was missing from production.** The concern that
prompted the audit was inverted: 26 of the 40 files audited had been applied by
hand and never recorded, so the ledger, not the schema, was the broken thing.

| Status at audit time | Count |
|---|---|
| `applied_recorded` | 13 |
| `applied_unrecorded` | 25 |
| `partially_applied` | 1 |
| `missing` | **0** |
| `superseded` | 0 |
| `unsafe_or_ambiguous` | 1 |

- **The ledger was repaired**, from 12 rows to 39, recording every
  verified-applied migration. INSERT-only; no schema and no application data was
  touched. Evidence and rollback:
  `docs/codex/audits/2026-07-28-ledger-repair.sql`. One `UPDATE` aligned
  `20260724a`'s stale hash, whose file was corrected in `9fa0aa6` after it was
  applied; production was verified to match the corrected file.
- **There are two ledgers.** `supabase_migrations.schema_migrations` holds one
  row (`01`) and has not advanced. `public.schema_migrations` is the
  hand-maintained record and is the one to keep current.
- **`20260725a_verification_needs_selection.sql` must never be applied.** It
  drops `verified` and `rejected` from the `verifications` status constraint;
  production holds rows in both, so it fails outright, and removing `verified`
  would make the publication gate unpassable. It is redundant: `20260721i`
  already put `needs_selection` in force. Owner direction of 28 July 2026 is to
  exclude it permanently and keep it out of any automated chain; that change
  ships separately from this record.
- **`20260721g` is partially applied.** `profiles.verification_level` is live as
  `text`, not the `int` the migration declares, because the column pre-existed
  and `if not exists` no-opped. This is the recorded R-01 defect. **No mapping
  has been guessed.** A separate remediation proposal is required before any
  change, covering every live value, every application reference, the proposed
  canonical type, the exact mapping and rollback, and whether the column should
  exist at all.
- **The repository cannot rebuild production.** 21 tables and 8 functions exist
  in production that no repository file creates. Treated as a separate
  workstream; no schema dump is to be generated or applied without review.

## Written but NOT applied: the Deal Room admission verification gate

`supabase/migrations/20260731g_deal_room_admission_verification_gate.sql`
SHA-256 `393a19470bd388edab70bdb21cf363e4995698d5b983107a3d4bc258859f7b43`, 57138 bytes.

**Executed nowhere.** Written 31 July 2026 for ADR-0021 ruling 2, whose
threshold is `PT-PRODUCT-2026-07-27-01` section 6 as restated by the owner on
the same day, and **amended the same day** on controller review. **Applying it is
a separate owner approval.** It adds two nullable columns, replaces two
`security definer` functions granted to `authenticated` in three applied
migrations, and drops and recreates a third at a wider signature. No constraint,
policy, trigger, index or row is altered, and nothing is backfilled.

### What it does

1. **Two additive columns on `deal_room_participants`**:
   `represented_legal_name` and `business_relationship`, both `text`, both
   nullable, no default, no backfill. They exist because the controller ruled on
   31 July 2026 that section 6 criteria 4 and 6 must be held independently and
   may not be derived from the declared capacity or the participation authority.
   `deal_room_participants_identity_when_admitted` is **not** widened: doing so
   would invalidate rows admitted before the columns existed. The gate is where
   the new facts are required, so no existing admitted participant is
   retroactively expelled.
2. **Two additive columns on `profiles`**: `declared_capacity` and
   `legal_or_trading_name`, both `text`, nullable, no default, no backfill. The
   member who OPENS a room is asked before any room or participant row exists,
   so there is nowhere on a room to record their declaration. Until these
   existed, `initiatorAdmissibility()` could read only `profiles.company`, and
   section 6's "identified business **or** declared professional capacity" had
   one working branch at that door: an independent broker with no company could
   never open a room. The controller struck that on 31 July 2026. Neither column
   is ever written from `listings.submitter_role`, from a relationship or from
   an authority, and `legal_or_trading_name` is never defaulted from
   `company` — it is preferred over it at read time and falls back to it.
3. **`deal_room_opener_declarations`**, a new table keyed to `(profile_id,
   listing_id)`, holding what the member who OPENS a room states about
   themselves in one Deal: relationship to the represented business,
   transaction role, authority to participate. Row Level Security on, one
   select-own policy, and **no member INSERT or UPDATE policy** — the only
   writer is **`deal_room_declare_opening_intent(uuid, text, text, text)`**, a
   new command granted to `authenticated` which proves listing ownership and
   refuses each of the three by name when blank. Before this, the propose path
   read the relationship from `listings.submitter_role` and manufactured the
   other two as the literals `'Deal owner'` and `'Owner of the published Deal'`;
   the controller ruled on 31 July 2026 that owning a listing is not a
   declaration of authority to act for the business behind it, and that a string
   the system wrote is not something the member said. The gate now reads no
   listing column at all.
4. **`deal_room_room_prerequisite_state(uuid)`**, new. Returns exactly one of
   `not_applicable`, `completed` or `pending` for section 6 criterion 9 — a name,
   never a number. This release has one branch and returns `not_applicable`,
   because no prerequisites table and no prerequisite column exist anywhere in
   the schema. It is a claim made out loud rather than a criterion skipped, which
   is what the controller required. Revoked from `public`, `anon` and
   `authenticated`.
5. **`deal_room_admission_minimum_missing(uuid, uuid, uuid)`**, new. Returns the
   NAMES of the section 6 entry criteria a member does not meet, or an empty
   array. Never a count, a score or a completeness value. `security definer`
   because it reads `auth.users.email_confirmed_at`; `stable` because it writes
   nothing. Revoked from `public`, `anon` and `authenticated` in the same file:
   a member who could call it directly could probe another member's admission
   state one profile id at a time. Classified in
   `lib/deal-room/__tests__/grant-signatures.test.ts` and listed as permanently
   internal in `lib/deal-room/__tests__/function-acl.test.ts`.
6. **`deal_room_declare_participation`**, **re-signed from six parameters to
   eight**, so the legal/trading name and the relationship are declared in the
   same atomic act as the capacity, the role and the authority. This is the one
   signature change in the file and it is deliberate: the six-parameter form is
   **dropped by name in the same transaction**, so no overload survives, and the
   ACL that `drop function` discards is re-issued (`revoke` from `public` and
   `anon`, `grant` to `authenticated`). Pinned by `DELIBERATE_RESIGNATURES` in
   `grant-signatures.test.ts`, which also scans every later migration to be sure
   nothing recreates the old form.
7. **`deal_room_propose`**, replaced with `20260731b`'s body verbatim plus a call
   to the gate, on the same nine-argument signature. The initiator's two
   participant rows now also carry `represented_legal_name` from
   `profiles.company` and `business_relationship` from `listings.submitter_role`
   — separate stored columns, so the opener supplies the same two facts an
   invitee does.
8. **`deal_room_admit_participant`**, replaced with `20260731f`'s body verbatim
   plus the same call, on the same one-argument signature.

### Why it exists at all

`app/[locale]/deal-rooms/actions.ts` holds the gate today, in
`lib/deal-room/admissibility.ts`. Both commands are granted to `authenticated`,
so a member with a session can call either directly and never reach that file.
Until this migration is applied, the application check is defence in depth over
an ungated command, not enforcement.

### The floor it encodes

**No verification level at all.** Not `company_verified`, which is the
publication floor, and not `identity_verified` either. An earlier draft required
the latter; the controller struck it on 31 July 2026 as "a stricter
identity-verification wall that the owner did not approve". Criterion 1 is a
session user plus a `profiles` row to attribute the act to; criterion 2 is the
confirmed contact method, evaluated on its own. Six of the nine criteria are
satisfied by a member declaration, because section 6 asks for a declaration and
nothing more, and all nine are independent — a test breaks each one in isolation
and requires exactly that one to be reported.

### Execution status: NOT PROVED IN A DATABASE

`scripts/deal-room-admission-gate-proof.mjs` (`npm run deal-room:gate-proof`)
carries the seven proofs the controller requires: clean application, signatures
and grants read from `pg_proc`, direct-RPC refusal for an inadmissible opener
and an inadmissible invitee, both admissible paths, the stale-agreement refusal,
and rollback. It has **never been executed.** There is no PostgreSQL, no
container runtime and no Supabase CLI on the machine this branch was written on,
so there is nowhere to run it, and the Supabase Preview for the branch fails in
an unrelated historical migration.

Until that script runs green against a disposable production-equivalent schema,
the SQL boundary is **written and unproved**, and no part of this record should
be read as saying otherwise.

### Reversal

Re-apply `20260731b` and `20260731f` in that order, then re-apply the
`deal_room_declare_participation` block of `20260729b` to restore the
six-parameter form, then:

```sql
drop function if exists public.deal_room_admission_minimum_missing(uuid, uuid, uuid);
drop function if exists public.deal_room_room_prerequisite_state(uuid);
drop function if exists public.deal_room_declare_participation(uuid, text, text, text, text, text, text, text);
```

The four columns — two on `deal_room_participants`, two on `profiles` — may be
left in place: they are nullable and nothing reads them once the functions above
are back. Drop them only if the reversal is permanent, and note that dropping
them **discards member declarations**. The whole file is one transaction, so a
failure part-way leaves the database exactly as it was.

## Written but NOT applied: Deal Room paid room periods and billing events

`supabase/migrations/20260731e_deal_room_paid_room_periods.sql`
SHA-256 `3456e0b0862e6e4b306a2cca1db430f50fb0416f043afa3e8cee6066ff78a422`, 15,752 bytes.

**Executed nowhere.** Written 31 July 2026 as Stage 3 of
`docs/plans/active/deal-room-transaction-pricing.md`, under
`PT-COMMERCIAL-2026-07-31-01` and ADR-0020. **Applying it is a separate owner
approval**, and nothing in the application reads or writes what it creates —
asserted by `lib/deal-room/__tests__/billing.test.ts`, which fails if any file
under `app/`, `components/` or `lib/` gains a reader for either table.

### What it does

Additive throughout. No existing row is altered and no backfill is required.

1. **`paid` becomes a fourth `deal_room_entitlements.kind`.** The CHECK is
   dropped and re-added with `starter`, `sponsored`, `waived` and `paid`. The
   three existing values are preserved — authority §8 permits historical
   Starter-compatible values to remain for migration and audit, and production
   holds **zero** `deal_room_*` rows today, so there is nothing to convert.
2. **`deal_room_room_periods`** — one row per purchased 30-day period. A
   reactivation is a new row, never an edit, because §12 makes reactivation a
   new paid period.
3. **`deal_room_billing_events`** — append-only record of charges and waivers.
4. **`deal_room_entitlements.current_period_id`** — nullable FK to the period
   funding the entitlement.

### Three invariants are enforced by the database, not only by application code

- **Price follows capacity.** `period_price_cents` is CHECKed against the
  authority's own formula, `least(19900, 7900 + greatest(0, capacity - 5) * 1500)`.
  A row whose price does not follow from its capacity cannot be written by a
  bug, an admin console or a hand-typed INSERT. The test evaluates the SQL
  formula and the TypeScript engine side by side at every capacity from 5 to 40.
- **The $199 cap is a database fact**, stated a second time independently of the
  formula so the ceiling survives an edit to it.
- **One active period per room**, as a partial unique index on
  `(room_id) where state = 'active'` — so a retry, a double-submitted checkout
  or a race cannot bill one room twice for one window.

Two more worth naming: `amount_due_cents` is a **stored generated column**
(`period_price_cents - discount_cents`) so a waiver cannot drift from the list
price it waives, which is what authority §17's value anchor requires; and
`state <> 'active' or confirmed_at is not null`, so a period cannot be active
without a server-side confirmation (§9: a browser return is not authoritative).

### Replay safety

`deal_room_billing_events.provider_event_id` carries a **unique index where not
null** — the idempotency key. A replayed Stripe webhook cannot bill twice. This
is the property `credit_purchases.stripe_session_id` gives the existing credit
webhook, designed in rather than added after a double charge. The table also
carries an append-only trigger that refuses UPDATE and DELETE **to the table
owner as well**, which RLS never can.

### Who may read a bill, and why it is narrower than every other Deal Room table

Authority §11 restricts the active-branch count, purchased capacity and billing
breakdown to authorised Master Deal Room administrators, and §4 names "a total
billing amount where that amount would reveal branch count" as something that
must not leak. `purchased_branch_capacity` is exactly such a number.

So both SELECT policies are `deal_room_can_administer(room_id) or is_admin()` —
matching the existing `entitlement read` policy, **not** the participant
policies every other member-facing Deal Room table uses. **A room participant
cannot read these tables at all.** There is no INSERT, UPDATE or DELETE policy
for any member.

### Grants

Per the LB-008 lesson — Supabase `alter default privileges` grants explicitly to
`anon` and `authenticated`, and revoking from PUBLIC does not remove an explicit
role grant — both tables `revoke all` from `anon` and from `authenticated`, then
grant `authenticated` **SELECT and nothing else**. The internal
`deal_room_billing_append_only()` function is revoked from `public`, `anon` and
`authenticated`.

### Before applying

Inspect the live schema first, per `AGENTS.md`. In particular confirm the
`deal_room_entitlements` kind constraint is still named
`deal_room_entitlements_kind_check` — it was created inline, so the name is
Postgres's default and has not been verified against production by this work.
The file's rollback block restores the three-value CHECK and will **fail if any
row already carries `kind = 'paid'`**, which is correct: a paid room must not be
silently downgraded to satisfy a rollback.

Record the application in this file and in the ledger with the SHA-256 above.

## Written but NOT applied: Market Signal search indexes

`supabase/migrations/20260730a_market_signal_search.sql` (LB-007).

**Not executed anywhere.** Index-only and additive: it creates the `pg_trgm`
extension, eight partial GIN trigram indexes on `desk_radar` over the public
columns the search reads (`product`, `summary_line`, `ai_description`,
`category`, `origin`, `destination`, `hs_code`, `canonical_signal_id`), each
scoped `where status = 'approved_signal'`, and one btree
`(spotted_at desc, id desc)` for the board's paging order.

**No column, constraint, policy, trigger, function or default is added or
changed, and no row is read, written or reclassified.** RLS on `desk_radar` is
untouched and stays deny-all. There is no backfill: an index is derived from the
rows already present.

**The search does not depend on it, deliberately.** A merge applies no SQL in
this repository, so a search built on a new column, a generated `tsvector` or an
RPC would have shipped as a launch-blocker fix that returned nothing in
production until somebody separately ran a file. The search is therefore built
on `ilike` over columns that already exist (verified applied 28 July 2026 via
`20260728a_market_classification.sql`). This migration only changes the plan:
applying it changes no result, no ordering, no count and no row.

**Why it matters anyway.** `ilike '%...%'` is unanchored, so no btree can serve
it and Postgres plans a sequential scan. `pg_trgm` is the one thing that makes
an unanchored `ILIKE` indexable.

**Measured with none of these indexes applied.**
`npx tsx scripts/verify-signal-search.ts` ran the real predicates against
production on 30 July 2026 (3,458 eligible signals). Wall-clock round trips
from a developer machine to eu-west-1 were **198 to 1,037 ms** across two runs,
the slowest being a five-variant alias group across nine columns on a cold
connection. That includes network latency,
TLS and PostgREST parsing, so it is an upper bound on the database work and
cannot be decomposed client-side. Evidence:
`docs/codex/audits/market-signals-search/2026-07-30-postgrest-verification.txt`.

An earlier version of this section said single-digit milliseconds. That was
reasoned from the row count and never measured; it is corrected here rather
than removed. The scan is linear in the eligible row count either way, which
is what makes the indexes worth applying before the inventory grows.

Rollback is written out in the file: drop the nine indexes. `pg_trgm` is
deliberately not dropped, because other objects may come to depend on it.

Follow-up: PL-016 in `docs/launch/POST-LAUNCH-BACKLOG.md`.

## SUPERSEDED BY THE APPLIED RECORD: the approver row a counterparty can read

**`20260731d` was applied to production on 31 July 2026. Ledger 51 -> 52.** The
section below described it while it was still pending; the applied record follows it.

`supabase/migrations/20260731d_deal_room_approver_row_visibility.sql`.

| | |
|---|---|
| SHA-256 | `7e42fd9dd1ff8c017e9bb864ae5787cd5c873555453180734f06dc44e08e1263` |
| Size | 6,658 bytes, no BOM |
| Content | **one `create or replace function`. Nothing else.** |
| Status | **APPLIED 31 July 2026. Ledger 51 -> 52.** |

Found by the surface review of 31 July 2026, run against the loop that now
completes. `20260731c` made approvals one per person and chose the **master-level**
participant row. `participant read`, from `20260729b`, allows another person's row
only through `sub_room_id is not null and deal_room_is_sub_room_participant(...)`,
or to a room administrator - so a master-level row is invisible to an admitted
counterparty.

The counterparty could read the approval row (`approval read` needs only
`deal_room_is_master_participant`, which any admitted participant satisfies) but not
the participant row it points at, so
`app/[locale]/deal-rooms/[roomId]/procedure/page.tsx` rendered the fallback
**"A required approver"** instead of the initiator's name - on the page whose stated
purpose is to show who is outstanding.

Nothing was insecure and no approval was lost. The gate worked; it could not be read
by the person waiting on it.

**The correction** changes only the seed's `order by`, to prefer a row the other
approvers can see: the participant's row in this procedure's own sub-room, then any
other sub-room row, then the master-level row, then earliest admitted, then lowest
id. Deterministic and independent of physical row order.

`deal_room_approve_procedure` is unaffected - it already approves by joining on
`profile_id = auth.uid()` rather than on any particular row, which is why this is a
display correction and not a second gate defect.

No table, constraint, policy, trigger, index, grant or row is altered, and nothing is
backfilled: there are no rooms in production.

## Gate C Approval 3, fifth run, 31 July 2026: 97 passed, 0 failed

The gap the fourth run recorded is closed. `scripts/deal-room-negative-access.mjs`
now asserts what a member may **see about another member**, not only what they may
**do** - the omission that let two defects reach production on 31 July and be found
by reading rather than by running.

Three assertions, which interlock:

| | |
|---|---|
| another person's master-level participant row is not readable by a counterparty | **ok** |
| one approval per person, not per participant row | **ok** - exactly 2 rows for 2 people |
| the counterparty can read the participant every approval names | **ok** |

The first and third together make the `20260731d` defect impossible to reintroduce
silently: if the seed ever prefers a master-level row again, the third fails, because
the first proves that row cannot be read. The second does the same for `20260731c`:
seeding per participant row would give 3 rows for 2 people and fail immediately.

Neither could pass vacuously. The first is a plain refusal, so it fails if the
policy is ever widened; the third would pass trivially only if there were no approval
rows, which the second forbids.

The service role is used only to look up the master-level row's id. The read under
test is the counterparty's own, under their own session and RLS - the rule this
fixture has kept from the beginning.

**2 -> 92 -> 94 -> 94 -> 97 passed.** Teardown clean; production unchanged at 10
users, 7 listings with 2 approved, every `deal_room_*` table at 0, 0 Storage objects,
append-only trigger enabled, ledger 52.

## Production DATA changed, 31 July 2026: the Approval 4 pilot preconditions

Not a migration. Two scoped `update` statements against production rows, made so
that the Approval 4 pilot can actually open a Deal Room. Recorded here because they
are production data changes, and nothing else records them.

### Why they were needed

Checking what the pilot account would experience found that **no account in
production could open a Deal Room at all**:

| | |
|---|---|
| `deals@ponte.trade` owns no published Deal | a room is opened *on* a Deal you own |
| the only two published Deals carried `market_family = null` | `deal_room_propose` refuses: *"This Deal carries no market family, so no procedure applies"* |
| `deals@ponte.trade` had `full_name = null` | `deal_room_display_label` falls back to `'A participant'`, so the pilot would have appeared to reproduce the defect `20260731f` had just fixed |

### What changed

```sql
update public.listings
   set market_family = 'products',
       market_intent = case type when 'requirement' then 'source_product'
                                 when 'offer'       then 'offer_product' end
 where ref in ('PT-9001','PT-9002') and status = 'approved' and market_family is null;

update public.profiles set full_name = 'Ponte Deals'
 where id = '8263140e-4231-496b-b4c6-cfc88739995b' and full_name is null;
```

| Row | Before | After |
|---|---|---|
| `PT-9001` "Refined cane sugar, ICUMSA 45" (`requirement`) | null / null | `products` / `source_product` |
| `PT-9002` "Dried chickpeas, 8mm Kabuli" (`offer`) | null / null | `products` / `offer_product` |
| `deals@ponte.trade` `full_name` | null | `Ponte Deals` |
| `desk-opportunities@ponte.trade` `full_name` | `Ponte Desk` | unchanged |

The intent is **derived from each listing's own `type`** using the repository's own
mapping in `lib/structure/draft.ts:314` - `source_product` <-> `requirement`,
`offer_product` <-> `offer` - rather than assigned by hand. Both updates are
predicated on the prior value being null, so neither could touch a row that had
already been classified.

The name was chosen to sit beside the existing `Ponte Desk`: honest about whose
account it is, impersonating nobody, and a real counterparty will see it.

### Every precondition `deal_room_propose` checks, verified after

| | `PT-9001` | `PT-9002` |
|---|---|---|
| published | yes | yes |
| within `valid_until` (2027-05-20) | yes | yes |
| `market_family` in the three | yes | yes |
| `market_intent` present | yes | yes |
| Starter entitlement already used by the owner | **no** | **no** |

### One Starter room per member, and it matters for the pilot

`deal_room_propose` refuses a second Starter room with *"This organisation has
already used its Starter Deal Room"*. When the member has no organisation - and
neither Ponte account does - the check is keyed on `initiator_profile_id`, so the
Desk account can open **exactly one room, ever**, until that room is removed. Removal
needs the Management-API teardown path, because the activity history is append-only.

**The pilot is one shot.** Worth knowing before the first click.

## APPLIED to production, 31 July 2026: naming a participant to the people they deal with

**Applied from merged `main` `3aefd5a`. Ledger 52 -> 53.** Functions 23 -> 24;
`display_label` present; `deal_room_display_label` executable by `authenticated`
**false**; `authenticated` still 21, `anon` and PUBLIC still 0; policies 14.
`deal-room:acl-verify` passes (it caught the new SECURITY DEFINER function first,
21 expected against 22 found) and `deal-room:negative-access` holds at 109.

**Rendered:** the counterparty's procedure page now reads "Marta Ferreira" and
"Diego Alonso · Iberia Importaciones SL" where it read "A participant".

The section below was written while it was still pending.

`supabase/migrations/20260731f_deal_room_participant_label.sql`.

| | |
|---|---|
| SHA-256 | `3e8bbf6b80fe974e632636871e0f567896d01f4d632e5caf6726cf37a38a5bc2` |
| Content | one `alter table ... add column`, one new function, three `create or replace function` |
| Status | written and tested, **NOT applied** |

Owner decision of 31 July 2026, option 1 of two, after the surfaces were rendered
and the counterparty's procedure page read:

```
A participant                            approved
Diego Alonso - Iberia Importaciones SL   approved
```

`profiles` carries one SELECT policy - `id = auth.uid() OR is_admin()` - so a member
can never read another member's `full_name`. Every counterparty is "A participant" to
everyone but themselves, on every surface.

**Option 1: denormalise the label onto the participant row**, rather than widening
`profiles`. Not a new pattern - `deal_room_activity_events` already carries
`actor_label`, written by `deal_room_log_event()` from inside a SECURITY DEFINER
command, which is why the activity feed named people correctly the whole time the
participant list could not.

| | |
|---|---|
| `deal_room_participants.display_label` | new column, nullable |
| `deal_room_display_label(uuid)` | SECURITY DEFINER, reads `profiles`, **granted to nobody** - a member who could call it directly could enumerate names |
| `deal_room_propose` | writes it for both initiator rows (extracted from `20260731b`, so the `declared_capacity` fix carries forward) |
| `deal_room_accept_invitation` | writes it for the counterparty row |
| `deal_room_admit_participant` | refreshes it (extracted from `20260731c`, so the required-approver promotion carries forward) |

`lib/deal-room/queries.ts` reads the column and **no longer embeds `profiles` at
all**, so the two-foreign-key ambiguity that broke `listParticipants()` cannot return.

No policy, trigger, index or grant is altered and **no row is backfilled**: production
holds no rooms.

### The guards this forced open

Adding a function exposed three scans that were narrower than they read:

- `function-acl.test.ts` `declaredFunctions()` read two fixed files, so a function
  introduced by any later migration was invisible. Now discovered from every
  migration - which immediately surfaced the pricing lane's
  `deal_room_billing_append_only` as well, now classified.
- Its revoke scan matched `revoke execute` only. `20260731e` writes `revoke all`,
  which is the same privilege on a function, so a correctly-locked function read as
  "never revoked at all". Both forms now match.
- The two "is it revoked anywhere" assertions read `20260730b` alone. They now read
  every migration; the assertions that are deliberately *about* `20260730b` still
  read only it, and say so.

Declared `deal_room_*` functions: **25** (23 applied, plus this one and the pricing
lane's, neither applied). `deal-room:acl-verify` expects **24** in production once
this is applied.

## APPLIED to production, 31 July 2026: the approver row a counterparty can read

`20260731d_deal_room_approver_row_visibility.sql`, checksum
`7e42fd9dd1ff8c017e9bb864ae5787cd5c873555453180734f06dc44e08e1263`, applied once from
merged `main` `b575c21`. Ledger 51 -> **52**, and the row records that same checksum.

| | Before | After |
|---|---|---|
| `deal_room_propose_procedure` entries | 1 | **1** - no overload |
| its oid | 92120 | **92120** - replaced in place |
| `md5(pg_get_functiondef)` | `16404d2e2f56286cb16f8fb395ebd97d` | **`cd7406ce6fdcebff69395092d0dcad33`** |
| seed prefers the procedure's own sub-room | no | **yes**; `(p.sub_room_id is null) desc` absent |
| `deal_room_*` functions | 23 | 23 |
| `authenticated` / `anon` / PUBLIC | 21 / 0 / 0 | **21 / 0 / 0** |
| `deal_room%` policies | 14 | 14 |

`npm run deal-room:acl-verify`: anon 0, PUBLIC 0, authenticated 21 (required 21,
permitted 21), service_role 23, 14 policies, 0 non-SELECT.

## Gate C Approval 3, fourth run, 31 July 2026: 94 passed, 0 failed

Unchanged from the third run, and the teardown was clean again: `teardown complete:
no rooms, listings, users or activity left behind.` Production after the run: 10
users, 7 listings with 2 approved, every `deal_room_*` table at 0, 0 Storage objects,
`deal_room_activity_append_only` at `tgenabled = 'O'`, ledger 52.

### What this run does NOT prove, and must not be read as proving

**The fixture cannot detect the defect `20260731d` fixes.** It drives the loop through
real member sessions and asserts what each of them may and may not *do*; it never
asserts what a member can *see about another member*. The approver-name defect was
invisible to it before the fix and is invisible to it now, so 94 of 94 means only that
nothing regressed.

The correction rests on reading `participant read` - another person's row is visible
only through `sub_room_id is not null and deal_room_is_sub_room_participant(...)`, or
to a room administrator - together with the new ordering, confirmed present in
`prosrc` and the old ordering confirmed absent.

**The assertion that would close this** is that, for every row in
`deal_room_procedure_approvals` on a procedure a member can read, that member can also
read the `deal_room_participants` row it names.

**Added the same day and run: see the fifth run above, 97 passed, 0 failed.** "The
counterparty can see who they are waiting for" is now proved rather than reasoned.

## APPLIED to production, 31 July 2026: the procedure approver gate

`20260731c_deal_room_procedure_approver_gate.sql`, checksum
`7e60f2dfbaad3d27ff6165a0a5f6d4ff5bc872be7c5bf228b702be920c9971ba`, applied once
from merged `main` `414d3e8`. Ledger 50 -> **51**, and the row records that same
checksum.

Three functions replaced on identical signatures. Verified against the
pre-application baseline:

| | Before | After |
|---|---|---|
| `admit_participant` + `propose_procedure` + `approve_procedure` | 3 entries | **3** - no overload was created |
| combined `md5(pg_get_functiondef)` | `1ca8401373339b10c1cab9926f4deda4` | **`0384017e0d2d38d856a66101582a0d32`** |
| `admit_participant` promotes principals | no | **yes** (`is_required_approver = is_required_approver or ...` present in `prosrc`) |
| `propose_procedure` seeds per person | no | **yes** (`distinct on (p.profile_id)` present) |
| `approve_procedure` approves by person | no | **yes** (`profile_id = auth.uid()` present, `participant_id = v_participant` absent) |
| `deal_room_*` functions | 23 | 23 |
| executable by `authenticated` | 21 | **21** |
| executable by `anon` / PUBLIC | 0 | **0** |
| `deal_room%` policies | 14 | 14 |

`npm run deal-room:acl-verify` after the change: anon 0, PUBLIC 0, authenticated 21
(required 21, permitted 21), service_role 23 unchanged, 14 policies, 0 non-SELECT.

## Gate C Approval 3, third run, 31 July 2026: 94 passed, 0 failed

**Every negative-access assertion held.** 2 passed on the first run, 92 on the
second, **94 on this one.**

The two that had failed - "the second required approver approves" and "the version
governs once every approver has approved" - now pass, so a procedure version can be
proposed, approved by both principals and made to govern. Its steps become ready and
the two admission steps complete, which is the 22% baseline the product definition
specifies.

**And the teardown worked**: `teardown complete: no rooms, listings, users or
activity left behind.` Production after the run:

| | |
|---|---|
| `auth.users` | **10** |
| `listings` | **7**, of which 2 approved, 0 archived |
| `deal_rooms`, `deal_room_activity_events`, `deal_room_entitlements` | **0 / 0 / 0** |
| `storage.objects` in `deal-room-evidence` | **0** |
| `deal_room_activity_append_only` | `tgenabled = 'O'` - enabled |
| ledger | **51** |

### What this does and does not settle

**Requirement 13 - cross-room and cross-sub-room isolation - is proved.**

**Requirement 12 is partly proved and should not be recorded as more.** The fixture
proves an entitlement cannot be forged: a room administrator can neither issue
themselves a second entitlement nor extend their own. It does **not** assert that a
room lacking an entitlement refuses to progress, so "entitlement fail-closed" in
that stronger sense remains unproved.

Also still untested: behaviour over time and across sessions, amendment of a
governing procedure, and anything requiring more than the three participants and two
rooms the fixture builds.

## SUPERSEDED BY THE APPLIED RECORD: the room initiator's declared capacity (option 1)

**`20260731b` was applied to production at 05:01:48.553 UTC on 31 July 2026.** The
section below described it while it was still pending; the applied record, with the
before-and-after fingerprints, is further down under "APPLIED to production, 31 July
2026: the room initiator's declared capacity".

`supabase/migrations/20260731b_deal_room_propose_initiator_capacity.sql`.

| | |
|---|---|
| SHA-256 | `0de3c6e0e74f814746fe511b39165247163918d539f300ca8dc7ba9ac926ef13` |
| Size | 13,354 bytes, no BOM |
| Content | **one `create or replace function`. Nothing else.** |
| Status | **APPLIED 31 July 2026, 05:01:48.553 UTC. Ledger 49 -> 50.** |

Owner decision of 31 July 2026, option 1 of the three the Approval 3 record set
out: seed the initiator's `declared_capacity` inside `deal_room_propose` rather
than requiring an organisation or narrowing the constraint.

**The change is three lines.** `declared_capacity` is added to the shared column
list of the two initiator inserts, and `'Deal owner'` to each value list. The value
matches the `transaction_role` the same insert already sets and sits beside a
`participation_authority` of `'Owner of the published Deal'`.

**It states a fact this function has just proved, not a claim made on the member's
behalf.** Execution only reaches that insert after `v_l.user_id <> auth.uid()` has
been checked and the Deal confirmed published and family-classified. That
distinction is the reason option 1 is defensible at all:
`deal_room_declare_participation` exists so a counterparty states their own
capacity, and nothing here weakens it — the counterparty still declares, and
`deal_room_admit_participant` still refuses admission while both `org_id` and
`declared_capacity` are empty.

Members who do have an organisation are unaffected in presentation: a participant
row is read as `coalesce(o.name, v_p.declared_capacity, 'Declared capacity not
stated')`, so an organisation name still wins.

### How the file was produced, and why that matters

The body was **extracted verbatim** from `20260729b` and patched
programmatically, not retyped. A diff of the two confirms exactly ten changed
lines — the two column lists and the two value lists — and nothing else.

**The signature is unchanged**, which is the LB-005 risk this carries: `create or
replace function` keyed on a different argument list does not replace anything, it
creates an **overload**, silently, while every existing grant keeps pointing at the
old function. The symptom would surface later as a member permission error rather
than as a 42883 at apply time.

`lib/deal-room/__tests__/grant-signatures.test.ts` now guards it generally: it
**discovers** every migration later than `20260729b`, compares each
`deal_room_*` redefinition against the signature `20260729b` declared, and fails
on drift. The file set is discovered rather than listed, so a future migration
cannot opt out by not being named. It also asserts this file supplies
`declared_capacity` in both inserts, still admits at `'admitted'`, differs from
`20260729b` by only the intended substitutions, and contains no policy, table,
trigger, index, grant or revoke. Demonstrated in three directions — a widened
signature, the fix removed, and a stray grant added — each failing with a specific
diagnosis. 8 assertions.

### Verification after applying

```
npm run deal-room:acl-verify        # ACL unchanged: anon 0, authenticated 21
npm run deal-room:negative-access   # must now get past step one
```

## SUPERSEDED BY THE APPLIED RECORD: the procedure approver gate

**`20260731c` was applied to production on 31 July 2026. Ledger 50 -> 51.** The
section below described it while it was still pending; the applied record is
immediately after it.

`supabase/migrations/20260731c_deal_room_procedure_approver_gate.sql`.

| | |
|---|---|
| SHA-256 | `7e60f2dfbaad3d27ff6165a0a5f6d4ff5bc872be7c5bf228b702be920c9971ba` |
| Size | 16,063 bytes, no BOM |
| Content | **three `create or replace function`, on identical signatures. Nothing else.** |
| Status | **APPLIED 31 July 2026. Ledger 50 -> 51.** |

Owner decision of 31 July 2026: fix the procedure approver gate that Approval 3's
re-run found. The correction follows
`PT-PRODUCT-2026-07-27-01-DEAL-ROOM-PRODUCT-CONTRACT-V1.md` section 8 - a procedure
"becomes agreed only after approval by every designated principal approver", and
material changes "require renewed approval from affected principal participants".

**Every admitted principal is a required approver, and each person approves once.**

| Function | Change |
|---|---|
| `deal_room_admit_participant` | The admission update also sets `is_required_approver` when `participant_class = 'principal'`. Admission is the honest place for it - identity, capacity, authority declaration and every current agreement have just been proved. `or`-ed, so it can only promote; nothing is demoted. |
| `deal_room_propose_procedure` | Seeds `distinct on (p.profile_id)` - one approval row per **person**, not per participant row - choosing the master-level row where one exists, then the earliest admitted, then the lowest id. |
| `deal_room_approve_procedure` | Approves by person, joining the approval rows to `deal_room_participants` on `profile_id = auth.uid()`, instead of keying on whichever row a `limit 1` happened to find. It also now **refuses** a caller who holds no approval row on that version, rather than updating nothing and letting the outstanding count fall to zero without them. |

Why both halves are needed: the initiator holds two participant rows in one room
(master-level and first workspace, both created by `deal_room_propose` and both
marked required), so the old seed issued them two obligations and the old approve
could satisfy only one - `v_outstanding` never reached zero. Separately the
counterparty was never marked a required approver at all, so they were refused
outright and had no row. Either defect alone made a procedure unable to govern.

Each body is `20260729b`'s, extracted verbatim and patched: 3 changed lines in
`admit_participant`, 13 in `propose_procedure` (8 of them comment), 25 in
`approve_procedure` (14 of them comment). Signatures are unchanged, so no overload
is created and no grant is invalidated.

**No table, constraint, policy, trigger, index, grant or row is altered, and no
existing row is backfilled.** The only rooms in production are the negative-access
fixture's; their disposal is a separate owner decision, and the two stale approval
rows on the fixture procedure are left as they are. The join-on-profile update would
in fact settle such a duplicate pair if that room were ever used again.

`lib/deal-room/__tests__/grant-signatures.test.ts` holds the guard: the file replaces
exactly those three functions, each edit is present, the old `participant_id =
v_participant` keying is absent, and **nothing at all appears outside the function
bodies** - no DDL and no backfill.

## APPLIED to production, 31 July 2026: the room initiator's declared capacity

`20260731b_deal_room_propose_initiator_capacity.sql`, checksum
`0de3c6e0e74f814746fe511b39165247163918d539f300ca8dc7ba9ac926ef13`, applied once at
**05:01:48.553 UTC** from merged `main` `ee76e78`. Ledger 49 -> **50**, and the row
records that same checksum.

It closes the defect recorded below: `deal_room_propose` admitted the initiator with
neither an `org_id` nor a `declared_capacity`, so the identity CHECK rejected every
room. One `create or replace function` on the identical nine-argument signature,
adding `declared_capacity` to both initiator inserts with the value `'Deal owner'`.

Verified against the pre-application baseline:

| | Before | After |
|---|---|---|
| `deal_room_propose` overloads | 1 | **1** - no overload was created |
| its oid | 92112 | **92112** - replaced in place, so every existing grant still points at it |
| `md5(pg_get_functiondef(oid))` | `fc68d229a6b9c1d2d32617d1bbea2852` | **`034d7cda6410d63eafdce351b413b58c`** |
| `declared_capacity` in `prosrc` | 0 | **2**, and 4 `'Deal owner'` literals |
| `deal_room_*` functions | 23 | 23 |
| executable by `authenticated` | 21 | **21** |
| executable by `anon` / PUBLIC | 0 | **0** |
| `deal_room%` policies | 14 | 14 |

`npm run deal-room:acl-verify` after the change: anon 0, PUBLIC 0, authenticated 21
(required 21, permitted 21), service_role 23 unchanged, 14 policies, 0 non-SELECT.

## Gate C Approval 3 re-run, 31 July 2026: the loop runs, and stops at the procedure gate

**92 passed, 2 failed** (the first run managed 2 passed, 1 failed). The journey now
runs from proposal through invitation, the four-agreement admission gate, sub-room
isolation, evidence submission, clarification and versioning, acceptance,
`own_org` visibility, append-only activity, blockers, read-only continuity, and the
Storage byte refusals - all against real rows in production.

### What still cannot happen: a procedure can never be approved

Two independent defects, either of which is sufficient on its own.

**1. The initiator is issued two approval obligations for themselves.**
`deal_room_propose_procedure` seeds the pending rows with:

```sql
insert into public.deal_room_procedure_approvals (procedure_id, participant_id, response)
select v_id, p.id, 'pending'
from public.deal_room_participants p
where p.room_id = p_room_id and p.is_required_approver and p.state in ('admitted','active');
```

That is one row per *participant row*, and `deal_room_propose` gives the initiator
**two** participant rows in the same room - master-level and first workspace - both
with `is_required_approver = true`. `deal_room_approve_procedure` then resolves the
caller with `select p.id into v_participant ... limit 1` and updates only that
`participant_id`, so the initiator's other row stays `pending` for ever and
`v_outstanding` never reaches zero.

Observed in production on the fixture procedure: **both** approval rows belonged to
the same person - `213848cf` (master-level) `approved`, `986c582b` (workspace)
`pending`.

**2. An admitted counterparty principal is not a required approver.**
`deal_room_admit_participant` leaves `is_required_approver` false, so the
counterparty - `participant_class = 'principal'`, `transaction_role = 'Buyer'`,
state `admitted` - is refused by `deal_room_approve_procedure` with `Only a required
approver can approve this procedure`, and was never issued an approval row to begin
with.

So a procedure version stays `proposed`, governs nothing, and its steps never become
ready. The correction is a product decision - who Ponte requires to approve a
procedure, and at which level a participant holds that authority - and was not made
here. No identifier was minted; this is recorded as production evidence under LB-001.

### The fixture could not tear itself down, and production holds its rows

The previous run stopped at step one, so there was nothing to remove and the teardown
path was never actually exercised. This run created a full room, and **every teardown
step failed**:

```
delete room b1d27725: FAILED - deal_room_activity_events is append-only: DELETE is not permitted
delete room db2ddfbd: FAILED - deal_room_activity_events is append-only: DELETE is not permitted
delete listing b8a15147: FAILED - violates foreign key constraint "deal_rooms_listing_id_fkey"
delete listing fe985d4b: FAILED - violates foreign key constraint "deal_rooms_listing_id_fkey"
delete user (x4):        FAILED - Database error deleting user
```

**The append-only guarantee the fixture itself verifies is what blocks its own
cleanup.** `teardown()` in `scripts/deal-room-negative-access.mjs` discards the error
from `admin.from("deal_rooms").delete()`, so this failed silently; the cascade delete
of `deal_room_activity_events` is refused by the trigger, which then blocks the
listing on the FK and the users after it. That behaviour is correct - Deal Room
history is not removable by any application path, service role included - and the
fixture was written on the assumption that it would be.

Left in production, all created 05:02 UTC on 31 July 2026 and all attributable:

| Table | Rows |
|---|---|
| `auth.users` on `@example.invalid` | 4 |
| `listings` marked "Negative-access fixture. Fictional." | 2 |
| `deal_rooms` / `deal_room_sub_rooms` | 2 / 3 |
| `deal_room_participants` | 6 |
| `deal_room_activity_events` | 26 |
| `deal_room_invitations` / `agreement_acceptances` | 2 / 4 |
| `deal_room_evidence` / `evidence_versions` | 2 / 3 |
| `deal_room_procedures` / `steps` / `approvals` | 1 / 3 / 2 |
| `deal_room_blockers` / `clarifications` / `entitlements` | 1 / 1 / 2 |
| `storage.objects` in `deal-room-evidence` | **0** |

No real member account, listing or commercial row was touched. The four canonical
`deal_room_agreement_documents` predate the run (published 30 July) and are unchanged.

**Containment applied.** Both fixture listings were seeded `status = 'approved'`, and
`lib/board/live-deals.ts` selects the board on exactly that, so two fictional Deals
were on the live board - two of only four approved rows. They were moved to
`status = 'archived'` by a primary-key-scoped update, additionally predicated on
`details = 'Negative-access fixture. Fictional.'` and `status = 'approved'`, which
returned exactly those two rows. Nothing was deleted. The board is back to its two
real approved listings.

**Removing the remaining rows requires an owner decision**, because the only way to
delete them is to suspend the append-only trigger on `deal_room_activity_events` -
a momentary suspension of a security guarantee on a production table. That was not
done and is not authorised.

### RESOLVED, 31 July 2026: the teardown is fixed and the rows are gone

Owner decision of 31 July 2026: fix the fixture teardown before applying anything
further. `scripts/deal-room-negative-access.mjs` now removes a room through the
**Management API as the table owner**, suspending
`deal_room_activity_append_only` inside a single transaction scoped to one room id
and re-enabling it in the same transaction, so a failure anywhere restores it.

That capability is deliberately **outside the application**. It is not given to the
service role and no member, session or service-role key gains it; it belongs to
whoever holds the management token. `removeRoom()` additionally refuses unless the
room's listing still carries `details = 'Negative-access fixture. Fictional.'`, so
it cannot be pointed at a real room by a stale id. Every id is proved to be a UUID
before it is interpolated, because the Management API takes SQL text rather than
bound parameters.

Two further changes make the original failure impossible to repeat: the management
credentials are demanded **at startup**, so the fixture never creates a room it has
no way to remove; and teardown now **verifies afterwards** and prints
`TEARDOWN INCOMPLETE` with a non-zero exit if anything is left. The old version
discarded the delete error and reported a clean finish.

**Applied to the stranded rows the same day.** Both fixture rooms were removed
through that exact path, the trigger returned to `tgenabled = 'O'`, and the cascade
cleared the participants, sub-rooms, activity, invitations, acceptances, evidence,
versions, procedure, steps, approvals, blocker, clarification and entitlements. The
two fixture listings and four `@example.invalid` accounts were then deleted by
primary key.

| | After |
|---|---|
| `auth.users` | **10** |
| `listings` | **7**, of which 2 approved and **0 archived** |
| every `deal_room_*` table | **0** |
| `deal_room_agreement_documents` | 4 - canonical, published 30 July, untouched |
| `storage.objects` in `deal-room-evidence` | 0 |
| ledger | 50 |

Production is back to its pre-fixture state. The `archived` containment applied
earlier is undone by the deletion of those listings, so no fixture row remains in
any state.


## Gate C Approval 3, 31 July 2026: the loop cannot start

`deal_room_propose` fails in production for **every** member:

```
new row for relation "deal_room_participants"
violates check constraint "deal_room_participants_identity_when_admitted"
```

The constraint, from `20260729a`:

```sql
CHECK (state <> ALL (ARRAY['admitted','active'])
       OR org_id IS NOT NULL
       OR (declared_capacity IS NOT NULL AND length(btrim(declared_capacity)) > 0))
```

`deal_room_propose` admits the initiator immediately — two rows, master level and
first workspace, `state = 'admitted'` — supplying `org_id = v_org` and **no
`declared_capacity`**. `v_org` is `profiles.organization_id`, and **all 10
production profiles have none; `organizations` holds zero rows.** All three
disjuncts are false, so the insert is rejected and no room is ever created.

**The counterparty path is sound**, which is what isolates the defect.
`deal_room_accept_invitation` inserts at `prerequisites_pending`, outside the
constraint; `deal_room_declare_participation` sets `declared_capacity`; and
`deal_room_admit_participant` refuses admission while both `org_id` and
`declared_capacity` are empty. The counterparty is *made* to declare a capacity.
The initiator is admitted with neither.

**The constraint is right; the command does not satisfy it.** The correction is a
product decision and was not made here: set the initiator's `declared_capacity`
inside `deal_room_propose` — the row already carries `transaction_role = 'Deal
owner'` and `participation_authority = 'Owner of the published Deal'` — or require
an organisation before proposing, or narrow the constraint. Each says something
different about what Ponte asserts a room initiator has declared.

**No production change.** The fixture creates its own `@example.invalid` accounts
and a listing marked fictional, and tears everything down: after the run, users
were back to 10 with an identical id fingerprint, listings 7 identical, and rooms,
participants, activity and entitlements all 0. Ledger unchanged at 49.

## APPLIED to production, 31 July 2026: the Storage policy helpers

`supabase/migrations/20260731a_deal_room_storage_policy_helpers.sql`.

| | |
|---|---|
| SHA-256 | `bbd498511e04fb7a277df7dd52e0921ca295fa50697628a06e3e504767caadf9` |
| Size | 4,040 bytes, no BOM; raw-byte and utf8-string hashes identical |
| Content | **2 grants, one transaction. Nothing else.** |
| Status | **APPLIED 2026-07-31 04:26:11 UTC**, one transaction, exit 0. Ledger **47 to 48**, checksum verified |
| Ordering | applied **before** `20260729c`, as required. `20260729c` followed at 04:26:35 UTC |

**Approval 2 could not proceed without it, and the reason is a defect in
`20260731a`'s predecessor.** `20260730c` revoked `authenticated` EXECUTE on four
functions, on the ground that none was reachable by a member. For
`deal_room_log_event` and `deal_room_events_append_only` that is permanently true.
For `deal_room_is_writable(uuid)` and `deal_room_uuid_or_null(text)` it was true
only of the schema **as applied at that moment**.

`20260729c_deal_room_storage.sql` had been in the repository, unapplied, since 29
July. Its `deal room evidence upload` policy calls both:

```sql
and public.deal_room_is_sub_room_participant(
      public.deal_room_uuid_or_null((storage.foldername(name))[2]))
and exists (select 1 from public.deal_room_sub_rooms s
             where s.id = public.deal_room_uuid_or_null((storage.foldername(name))[2])
               and public.deal_room_is_writable(s.room_id))
```

A function invoked inside a policy expression is privilege-checked against the
**querying** role. Applying `20260729c` against the current ACL would therefore
have produced an upload policy that fails **every member evidence upload** with
`42501`. Caught before application, by reading the migration rather than trusting
the earlier derivation.

**Why the allowlist missed it.** It was derived from live production with
`pg_policies where tablename like 'deal_room%'`. That query has two blind spots
and this defect sat in both: it matches Deal Room tables in `public`, not
`storage.objects`; and it can only see policies that **exist**, not ones in an
unapplied migration. So `20260730c` recorded "appears in no policy expression" and
"called nowhere" — **both true of the applied database, both false of the
repository.**

That is LB-008's shape one turn further out. The catalogue is the only witness to
what production *holds*; it is not a witness to what production will *need*.

**This is not a rollback of LB-008.** `deal_room_log_event` stays executable by
neither member role, and so does `deal_room_events_append_only`; the forgery path
remains closed. Only the two helpers a real policy demonstrably needs come back,
and both are read-only — `deal_room_is_writable(uuid)` returns a boolean from
entitlement and room state, `deal_room_uuid_or_null(text)` is pure text coercion
touching no table.

### The contract is now permitted-versus-required

`npm run deal-room:acl-verify` no longer asserts a single number. It separates
what `authenticated` **may** hold (21: four RLS helpers, two Storage policy
helpers, fifteen commands) from what it **must** hold, which depends on the world:
the two Storage helpers become required only once the `storage.objects` policies
exist. The script queries `pg_policies` for those policies and says which regime
it is in.

That keeps the witness honest across the window between merging `20260731a` and
applying it — it reports **`authenticated 19 (required 19, permitted 21)`** and
exits 0 today, and will require 21 the moment `20260729c` lands.

`lib/deal-room/__tests__/function-acl.test.ts` now derives policy helpers from
**both** `20260729b` and `20260729c`, and models the end state the way Postgres
does: every declared function starts granted by Supabase's default privileges,
then each ACL migration's revokes and grants apply in file order. A file-by-file
assertion could not express this, because `20260730b` and `20260730c` are applied
and immutable and cannot be asked retrospectively to have known about a pending
migration. 29 assertions.

### Confirmed in production after both were applied

`npm run deal-room:acl-verify` detected the policies are live, switched itself to
the required-21 regime and **exited 0**:

```
  authenticated  : 21 of 23  (required 21, permitted 21)
  note: storage.objects Deal Room policies are LIVE, so the 2 Storage helpers are
        required (expected 21)
```

`anon` 0, `PUBLIC` 0, `service_role` 23 unchanged, `deal_room_log_event` still
executable by neither member role.

**The upload policy was proved to evaluate, not merely to exist.** A real QA member
attempting an upload into a sub-room they do not participate in received:

```
403 Unauthorized: new row violates row-level security policy
```

That is the pass. Had `20260731a` not been applied first, the same request would
have returned `permission denied for function deal_room_uuid_or_null` — the policy
would have failed before reaching its own decision. Anonymous upload is refused
identically, and both anonymous and member listings return `200 []`.

## APPLIED to production, 30 July 2026: the Deal Room internal-function ACL (LB-008 closed)

`supabase/migrations/20260730c_deal_room_internal_acl.sql`.

| | |
|---|---|
| SHA-256 | `5adb34c2ef183c601b30048084121577cf65cba29ad4fb7dacb075ac8c7d1891` |
| Size | 7,501 bytes, no BOM; raw-byte and utf8-string hashes identical |
| Content | **3 revokes, 19 grants, one transaction. Nothing else.** |
| Status | **APPLIED 2026-07-30 08:26:17.995 UTC**, one transaction, exit 0, no ambiguous transport response. Ledger **46 to 47**, exactly one row, checksum matching byte for byte |

Revokes `authenticated` EXECUTE on exactly `deal_room_is_writable(uuid)`,
`deal_room_uuid_or_null(text)` and `deal_room_events_append_only()` — the three
`20260730b` left behind, because granting the 19 cannot remove grants Supabase's
defaults had already written onto all 23. The 19 are then re-asserted, idempotently,
so the intended contract is stated once and completely in one file rather than being
the residue of two migrations plus platform defaults.

`deal_room_log_event` appears nowhere in it. `service_role` is not named. No
function body, table, column, constraint, policy, trigger or index is touched, and
no `alter default privileges` is issued — each asserted by the regression suite
against the comment-stripped text, not claimed.

### The verification procedure, and why it is a separate instrument

**`npm run deal-room:acl-verify`** (`scripts/deal-room-acl-verify.mjs`) reads
`pg_proc.proacl` from production and requires: `anon` **0 of 23**, `PUBLIC` **0**,
`authenticated` **exactly the 19** by name, `service_role` **23 unchanged**, the
four internal functions unreachable by either member role, 21 SECURITY DEFINER
functions all with a pinned `search_path`, and 14 policies with none non-SELECT and
none naming `anon`. Read-only.

It exists because **a text scan cannot see a privilege the file never mentions.**
LB-008 was a migration asserting something about itself; the test written to catch
LB-008 asserted something about that file, claiming "authenticated ends with exactly
19" while production held 22. Run against production **before** `20260730c` was
applied, this script fails with exactly five problems naming all three functions —
so it demonstrably detects the defect it exists for, rather than being asserted to.

`lib/deal-room/__tests__/function-acl.test.ts` is now scoped and worded to claim
only what migration text can prove, and one of its 28 assertions checks that this
script still exists and still interrogates all three roles, so the division of
labour cannot quietly rot.

### The final ACL, as production reports it

`npm run deal-room:acl-verify` **exits 0** after application:

```
  anon           : 0 of 23
  PUBLIC         : 0 of 23
  authenticated  : 19 of 23  (expected 19)
  service_role   : 23 of 23  (expected 23, unchanged)
  policies       : 14, 0 non-SELECT, 0 naming anon

ok   deal-room ACL in production: anon 0, PUBLIC 0, authenticated exactly 19,
     service_role unchanged
```

All four internal functions — `deal_room_log_event`, `deal_room_is_writable`,
`deal_room_uuid_or_null`, `deal_room_events_append_only` — now report
`service_role` alone. The 19 `authenticated` holds are the four RLS helpers and the
fifteen application commands, matched **by name**, so a lost helper would have
failed the check as loudly as a surplus grant.

**Nothing else moved.** All nine before/after md5 fingerprints identical: function
bodies, policy definitions, triggers, indexes, constraints, columns, RLS state and
`pg_default_acl` (24 rows). 14 policies, 4 agreement documents, 0 rooms, 0 activity
rows, no `deal-room-evidence` bucket.

**End-to-end confirmation with a real anonymous client**, unchanged from after
`20260730b`: the logger, the commands and the helpers all return
`401 / 42501 permission denied for function …`, while member table reads still
return `200 []` rather than erroring — so revoking the three did not disturb policy
evaluation.

**LB-008 is RESOLVED, and the last outstanding probe has passed.** The real
authenticated direct RPC (probe 6 of the earlier pass) was run on 30 July 2026 as
the dedicated QA member `deals@ponte.trade` — `profiles.role = customer`, no admin
or service-role privilege, no password, created solely for this verification.
**19 of 19** intended functions were usable and **4 of 4** internal functions were
denied, with `deal_room_log_event` returning the PostgreSQL
`permission denied for function deal_room_log_event`. The catalogue had already
proved `authenticated` lacked that privilege; this proves PostgREST enforces it
for a real member session, which is the one thing the catalogue could not settle.
No existing account or profile was modified by the probe.

## APPLIED to production, 30 July 2026: the Deal Room function ACL correction (LB-008)

`supabase/migrations/20260730b_deal_room_function_acl.sql`.

| | |
|---|---|
| SHA-256 | `15f488d87705e5a88def6e1c25e0b006daceda9d3316747eb8bbe87b3f542b31` |
| Size | 11,672 bytes, no BOM; raw-byte and utf8-string hashes identical |
| Status | **APPLIED 2026-07-30 07:59:45.928 UTC**, one transaction, exit 0, no ambiguous transport response. Recorded as exactly one ledger row, **45 → 46**, checksum matching byte for byte |

**The anonymous execution path is closed, and proved closed through a real
client.** `anon` now holds EXECUTE on **0 of 23** `deal_room_*` functions, down
from 23; `PUBLIC` holds 0; and `deal_room_log_event` is reachable by `postgres`
and `service_role` only. An anon-key RPC to the logger returns
**`401 / 42501 permission denied for function deal_room_log_event`** where the same
call returned `409 / 23503` before — an FK violation, which is how LB-008 was
proved, because it meant the body had executed. It no longer executes.

Nothing else moved. All nine before/after md5 fingerprints are identical: function
bodies, policy definitions, triggers, indexes, constraints, columns, RLS state and
`pg_default_acl` (24 rows). `service_role` unchanged at 23. 14 policies, 4
agreement documents, 0 rooms, 0 activity rows.

**LB-008 nevertheless stays ACTIVE, because one probe failed.** `authenticated`
holds EXECUTE on **22** functions, not the specified 19: the 19 intended plus
`deal_room_is_writable`, `deal_room_uuid_or_null` and
`deal_room_events_append_only`. The migration revokes `authenticated` only on the
logger, and re-granting the 19 cannot remove grants Supabase's default privileges
had already created on all 23. The three are closed to `anon`; none of them
writes; the forgery path itself is closed. So the material security objective is
met and the ACL contract as specified is not.

`lib/deal-room/__tests__/function-acl.test.ts` asserts "`authenticated` should end
with execute on exactly 19" and passes — **because it counts grant statements in
the file.** A file-text test cannot see a privilege the file never mentions. That
is the LB-008 error one level up: LB-008 was a file asserting something about
itself, and the test written to catch it asserts something about that file. Only
the catalogue could answer it. Full probe-by-probe record:
`docs/codex/audits/deal-room/GATE-C-APPROVAL-1-2026-07-30.md` sections 11 to 16.

**Probe 6 has since PASSED** — see the internal-function ACL section above. It was
pending at the time of this pass because there were no authorised test credentials,
and production's 9 confirmed users are real member accounts for which minting a
session would not have been a test credential. A dedicated QA account was
subsequently authorised and created, and the probe was run as an ordinary member.
Probes 8 and 9 remain catalogue-verified only: their behavioural halves need a real
room, which is Approval 3.

**Why a new file rather than an edit.** `20260729b` is applied and its checksum
`b379f869…fea3153` is in `public.schema_migrations`. An applied file is immutable;
editing it would make the ledger describe bytes that no longer exist. The
regression suite asserts that `20260729b` still hashes to its recorded value, so
the branch cannot quietly edit it.

**What it does.** Grants and revokes only — 24 revoke statements and 19 grants,
inside one transaction. It revokes EXECUTE from `PUBLIC` and `anon` on all 23
`deal_room_*` functions by exact signature, revokes the event logger from
`PUBLIC`, `anon` **and** `authenticated`, and re-asserts `authenticated` EXECUTE on
exactly the 19 that members need. **No function body, table, column, constraint,
RLS policy, trigger, index or row is touched, no project-wide `alter default
privileges` is issued, and no name outside `deal_room_*` appears.** `service_role`
is left alone deliberately: it bypasses RLS by design and the negative-access
fixture needs it, so narrowing it is a separate decision.

**The `authenticated` allowlist, derived rather than copied.** Two sources, and
they were checked against each other rather than assumed:

| Kind | Count | Derived from |
|---|---|---|
| RLS policy helpers | **4** | the function calls inside the 14 policy expressions in `pg_policies`: `deal_room_can_administer` (11 policies), `deal_room_is_sub_room_participant` (7), `deal_room_is_master_participant` (6), `deal_room_can_read_evidence` (2). A function called in a policy expression is privilege-checked against the querying role, so without these every member read fails |
| Member commands | **15** | the `.rpc("deal_room_*")` call sites under `app/` and `lib/`. That list and the 15 `grant ... to authenticated` lines in `20260729b` agree **exactly**, derived independently |

4 + 15 = **19**. The remaining four are executable by no member role:
`deal_room_log_event` (called only from inside SECURITY DEFINER commands, which
run as their owner), `deal_room_is_writable` (command bodies only, in no policy),
`deal_room_uuid_or_null` (declared in `20260729a` and called nowhere — no policy,
constraint, index, default or generated column references it), and
`deal_room_events_append_only` (a trigger function; Postgres checks EXECUTE at
`create trigger`, not per row, so revoking it does not weaken the append-only
guard).

### Production probes this migration must pass before LB-008 closes

Read-only, against production, immediately after it is applied. **None has been
run: the migration is not applied.**

| # | Probe | Required result |
|---|---|---|
| 1 | Catalogue: count `deal_room_*` functions where `has_function_privilege('anon', oid, 'execute')` | **0**, against 23 today |
| 2 | Catalogue: `has_function_privilege('authenticated', ...)` on `deal_room_log_event(uuid, uuid, text, text, uuid, text, jsonb)` | **false** |
| 3 | Real anonymous RPC to `deal_room_log_event` with an anon-key client | **permission denied (`42501`)** — and specifically **not** the `23503` foreign-key violation it returns today, which is the proof the body ran |
| 4 | Real authenticated direct RPC to `deal_room_log_event`, as a signed-in member | **permission denied (`42501`)** |
| 5 | Catalogue: `has_function_privilege('authenticated', ...)` for each of the 4 RLS helpers and the 15 member commands | **true for all 19**, so the correction closes the anonymous path without breaking a member journey |

Probe 3 is the one that matters. Today the same call returns `23503`, which is
what proved LB-008; after this migration it must fail before the body runs at all.
Probes 3 and 4 need real API clients, not catalogue inspection, for the reason
`GATE-C-TEST-PLAN.md` section 0 gives: a privilege can be present in the catalogue
and still not be what PostgREST enforces.

Regression suite: `lib/deal-room/__tests__/function-acl.test.ts`, **22
assertions**, which proves the file is complete and internally consistent but
cannot observe a Supabase project's default privileges — that is what the probes
are for.

Six of those 22 check the command allowlist against a **third, independent
source**: a recursive scan of production `.ts`/`.tsx` under `app/` and `lib/` for
`.rpc("deal_room_*")` and the single-quoted form, excluding tests, mocks,
fixtures, `.d.ts`, generated output, `scripts/`, `supabase/` and `docs/`. Each
discovered name is resolved to its unique declared signature. Three sets are then
required to be identical — **what the application calls, what `20260729b` grants,
what `20260730b` grants** — because any two agreeing proves little when one is
derived from the other. All three agree on the same **15** commands.

## Deal Room launch slice: `20260729a`, `20260729b` and `20260729c` all APPLIED

**Gate C Approval 1, executed 30 July 2026 against `cptglsmjmzcfpjndqfmc`.**
`20260729a` applied from `main` at `7f979e0`; the corrected `20260729b` applied
from `main` at `23637d3` under the Approval 1 continuation of 30 July 2026. Full
record with every probe result:
`docs/codex/audits/deal-room/GATE-C-APPROVAL-1-2026-07-30.md`.

**Verification did not fully pass.** `anon` holds EXECUTE on all 23
`deal_room_*` functions, including `deal_room_log_event()`, which has no
authorisation check of its own. That is **LB-008**, and it contradicts both the
migration's own stated intent and `GATE-C-TEST-PLAN.md` section 4.2. Details
below and in the audit.

### `20260729a_deal_room_core.sql` — APPLIED

Recorded in `public.schema_migrations` with SHA-256
`24932e4a429eb4ea7b19f2a7c5423101c1bbc61a628be941f546412258a78c8a`, matching the
repository file byte for byte. **Ledger 43 to 44.**

The row's `applied_at` is `2026-07-30 03:39:20 UTC`, which is when the row was
written rather than when the DDL ran. `db-query.mjs` returned an HTML **502 Bad
gateway** from `api.supabase.com`; the transaction had committed and only the
reply was lost, but the script exits before its ledger write on a failed call, so
the row was written explicitly afterwards. Execution was a few minutes earlier in
the same session and the exact instant is unrecoverable.

**Verified in production:** 15 tables, 34 CHECK constraints, 52 foreign keys, 54
indexes, 9 non-internal triggers, and 2 functions - `deal_room_uuid_or_null(text)`
and `deal_room_events_append_only()`. Public tables 53 to 68, exactly +15. The
`deal_room_activity_append_only` trigger is present on
`deal_room_activity_events`. The agreement authority is seeded with all four
documents at `v1-2026-07-29`, each `current` and carrying its checksum.

**RLS is enabled on all 15 tables with zero policies, and that state was not
created by the approved files.** Migration `a` does not enable RLS - `b` does -
so between the two, production held 15 tables with `relrowsecurity = false` while
Supabase's default privileges granted `anon` and `authenticated` SELECT, INSERT
and UPDATE on every one of them. An anonymous caller could have written to all
fifteen through PostgREST. The tables were empty and no write was attempted while
the gap was open. It was closed with `alter table ... enable row level security`
on the 15 tables and nothing else: no policy created, nothing granted, nothing
revoked. RLS on with no policy is fail-closed, and it is a prefix of what `b`
does, so it conflicts with nothing. Proved with an anon-key client: SELECT
returns `200 []`, INSERT returns `401 / 42501`. **This is a production change
outside the approved files and awaits owner confirmation.**

### `20260729b_deal_room_rls.sql` — APPLIED, with one defect found on verification

First attempt, 30 July 2026: Postgres refused it and rolled the whole file back —
`ERROR: 42883: function public.deal_room_invite(uuid, text, text, text, timestamp
with time zone) does not exist`. The file granted execute on a signature it had
itself dropped, because the owner's final trust review took `deal_room_invite()`
from five arguments to three. One broken grant line; all 21 declared functions
were audited programmatically and no other arity disagreed. That was **LB-005**,
now resolved.

**Applied 30 July 2026 at `05:59:43 UTC`**, cleanly and in one transaction, with
no ambiguous transport response. Recorded in `public.schema_migrations`, **ledger
44 to 45**, with the checksum below matching the repository file byte for byte —
verified both as raw bytes and as the utf8 string `db-query.mjs` hashes, which are
identical for this file.

| File | SHA-256 applied and recorded |
|---|---|
| `20260729b_deal_room_rls.sql` | `b379f869f320e6ea36bdb00e07555079adf6373ff14848d20633afb6cfea3153` |

The superseded value `64f4686091d4c7fed14c0223956164402bab9dc56cd2bdd52f67fdb8a52d75f7`
appears in the Gate C preflight and Approval 1 records, where it was correct at
the time; both point here. `20260729a`'s and `20260729c`'s checksums are
unaffected.

**Verified in production.** 23 `deal_room_*` functions, 21 of them SECURITY
DEFINER, every one carrying `search_path = public, pg_temp`. `deal_room_invite`
exists on `(uuid, text, timestamp with time zone)` and only that; the
five-argument form that took `p_role` and `p_class` does not exist. 14 policies,
exactly one per member-facing table, **every one SELECT, every one scoped to
`authenticated`** — zero INSERT, UPDATE or DELETE policies anywhere, and no policy
names `anon`. `deal_room_agreement_documents` carries no policy at all and is
revoked outright from both member roles: an anon-key read returns `401 / 42501
permission denied`. The `deal_room_activity_append_only` trigger fires `BEFORE
DELETE OR UPDATE`, so no role — including `service_role` — can rewrite history.

**One verification failed, and it is LB-008.** `anon` holds EXECUTE on all 23
`deal_room_*` functions. The file intends the opposite and says so at its grant
block: "`anon` is granted execute on nothing. The event logger is revoked from
everyone." The revoke it performs is
`revoke all on function public.deal_room_log_event(...) from public`, which
removes the PUBLIC grant — and PUBLIC's grant is indeed gone from that function's
ACL. But Supabase's `alter default privileges` grants EXECUTE **explicitly to
`anon`, `authenticated` and `service_role`** on every new function in `public`,
and revoking from PUBLIC does not touch an explicit role grant. So the ACL reads
`postgres=X | anon=X | authenticated=X | service_role=X`.

That matters most for `deal_room_log_event()`, because it is the one function in
the file with no authorisation check of its own — by design, since the other
commands call it on the member's behalf. Its only intended protection was the
grant. Proved through the public API rather than inferred from the catalogue: an
anon-key RPC call returned `409 / 23503`, a foreign-key violation naming the
`room_id` passed in, which means the function body **executed**. Nothing was
written, because `room_id` references `deal_rooms` and production has zero rooms.

**Production is fail-closed today and is not exposed.** The FK to `deal_rooms`
blocks every forged activity row while no room exists, member reads return zero
rows, the flag is unset and nothing is deployed. The exposure becomes real the
moment a room exists, which is Gate C Approval 3 or 4 — and because the activity
record is append-only, a forged row could never afterwards be removed by anyone.
**LB-008 must therefore be fixed before any Deal Room is created.** No fix was
applied here: none was authorised, and there is no live hole to contain.

This is the same defect class as the RLS gap recorded above: Supabase's default
privileges grant more than the migration expects, and a `revoke ... from public`
does not undo them.

### `20260729c_deal_room_storage.sql` — APPLIED 31 July 2026 (Approval 2)

Applied at **2026-07-31 04:26:35.893 UTC**, one transaction, exit 0, immediately
after `20260731a` supplied the two helpers its upload policy needs. Ledger **48 to
49**, checksum `94629e5dec518439687f0ecf0583aaed15caed0f0839e87bf42c941c7fe29972`
— the value recorded in the Gate C preflight, unchanged since.

**Exactly the intended delta, and nothing else.** Buckets **6 to 7**: only
`deal-room-evidence`, `public = false`, 25 MiB limit, restricted to
`application/pdf`, `image/png`, `image/jpeg`, `image/webp`. Storage policies **12
to 14**: only `deal room evidence read` (SELECT) and `deal room evidence upload`
(INSERT), both scoped `to authenticated`. **No UPDATE and no DELETE policy**, by
design — an evidence version is immutable and removal is a retention action.

The other six buckets and twelve storage policies were captured before and after
and are unchanged, fingerprints `84b3fdf5b6f33e833e9ba91cb9f0708d` and
`b75af4ee476edb76c957e701a95aa8ee`. `ponte-deal-docs` is untouched and still holds
**0 objects**; `deal-room-evidence` holds **0 objects**.

### Unchanged by all of this

The legacy Deal-era cluster, re-measured after `20260729b`: **4 tables** —
`deals`, `deal_documents`, `deal_events`, `deal_status_history` — RLS enabled on
all four, policies intact (3 on `deals`, 1 on each of the others), `deals` holding
0 rows. `is_deal_participant()` is unaltered; `20260729b` references it exactly
once, in a comment saying it is not touched.

The Approval 1 record of earlier the same day reported **8** tables for this
cluster. Re-measuring with `relname like 'deal%' and relname not like
'deal_room%'` returns 4, and a broader search including `%offer%` and
`%negotiation%` returns the same 4. The earlier figure cannot be reproduced and is
recorded here as unreconciled rather than restated. Nothing was dropped: the
migration contains no statement that could remove a table, and the Management API
ran it as one transaction that either committed whole or not at all.

`ponte-deal-docs`: 0 objects, 0 policies. `deal-room-evidence`: does not exist.
`listings`: 5 rows. `NEXT_PUBLIC_DEAL_ROOM` unset, allowlist unchanged, nothing
deployed, access wall untouched. The Deal Room is unreachable by any member.

### The original plan, for reference

Three files, additive throughout, idempotent, in this order:

- `supabase/migrations/20260729a_deal_room_core.sql` — 14 `deal_room_*` tables, their constraints, indexes and triggers, plus `deal_room_uuid_or_null()` and the append-only guard `deal_room_events_append_only()`.
- `supabase/migrations/20260729b_deal_room_rls.sql` — RLS on all 14, four SECURITY DEFINER helper predicates, **read-only policies for members**, and fifteen authorised command functions covering the whole loop.

  Rewritten on 29 July 2026 after the owner review of PR #98 closed five
  fail-open paths in the first draft: a `deal_rooms` INSERT policy that let any
  authenticated member open a room against another member's Deal with a snapshot
  of their choosing; a member-writable entitlement table; `deal_room_is_writable()`
  treating a missing entitlement row as permission; direct member DML that
  bypassed the commands and their atomic activity events; and a `selected`
  evidence visibility evaluated as ordinary sub-room visibility, so a label
  promising restriction delivered none. The file names and drops the earlier
  policies explicitly, so a database that received the first draft is corrected
  by running it rather than by being rebuilt.
- `supabase/migrations/20260729c_deal_room_storage.sql` — the private `deal-room-evidence` bucket and its two `storage.objects` policies.

**None has been executed anywhere.** There is no non-production database to run
them against (PL-002), and applying SQL to production is a separate explicit
owner decision. They have been read and reviewed, not run: treat their behaviour
as unproven until Gate C verification.

**Nothing existing is touched.** No existing table, column, constraint, index,
policy, function, trigger or bucket is altered in any of the three files. The
legacy Deal-era cluster — `deals`, `deal_documents`, `deal_events`,
`deal_status_history`, `messages`, `settlements`, `settlement_milestones`,
`settlement_events` and `is_deal_participant()` — is left exactly as it is, and
so is the orphan `ponte-deal-docs` bucket. `is_admin()` and `touch_updated_at()`
are reused, not redefined.
`lib/deal-room/__tests__/rls-contract.test.ts` asserts all of that on every run.

**Backfill: none.** All 14 tables begin empty and no existing row is read,
written or reclassified.

**Rollback.** The rollback of record is the feature flag: unset
`NEXT_PUBLIC_DEAL_ROOM` and redeploy, which removes the slice in one deploy
cycle with no database action. If the schema itself must be withdrawn, each file
carries its own reverse-order drop list. That is clean only while the tables are
empty: once a member has uploaded evidence, withdrawal becomes a retention
decision and an owner action, not a rollback step.

Authority: issue #97; ADR-0009 as accepted 29 July 2026;
`docs/codex/audits/2026-07-29-deal-room-preflight.md`;
`docs/plans/active/deal-room-launch-slice.md`.

## Known production-aligned changes

- Blocks A-F migrations dated `20260723a` through `20260723f` were reported applied to production and verified during the founding-launch work.
- Journey 1 added the desk-radar signal-import mapping and Ponte-managed Qualified Opportunity seed migrations dated `20260724a` and `20260724b`.
- PR #20 aligned the repository with two defects already corrected in production:
  - `desk_radar.canonical_signal_id` requires a full unique index to support `ON CONFLICT (canonical_signal_id)`.
  - the Journey seed must use the text verification enum `company_verified`, not integer `2`, and must check the profile-bind error.

- `20260726a_investigation_kind.sql` was applied to production by hand on 26 July 2026 with owner approval, using `scripts/db-query.mjs`, and probe-verified afterwards. It adds `request_kind` (not null, default `'investigate'`), `capability`, `contact_phone` and `contact_language` to `signal_investigations`, adds the `signal_investigations_kind_check` constraint, and replaces the `(signal_id, requester_id)` unique constraint with `(signal_id, requester_id, request_kind)`. Verified: the four columns exist with the stated nullability and default, both constraints are present in `pg_constraint`, the old two-part constraint is gone, and the single pre-existing row backfilled to `request_kind = 'investigate'`. It was applied by hand because the automatic chain aborts at its first file (see below), so a merge does not apply anything.

## APPLIED to production, 29 July 2026: automated listing publication

`20260728c_automated_listing_publication.sql` implements ADR-0013. It was
**applied to production on 29 July 2026 at 15:42:54 UTC** with explicit owner
authorisation, via `node scripts/db-query.mjs --file`, against project
`cptglsmjmzcfpjndqfmc`, and probe-verified immediately afterwards. Recorded in
`public.schema_migrations` with SHA-256
`745453c93b8d88614fe45dd2a75639c70760325a4e25ed64c2b06236aabf11c4`, matching the
file byte for byte. **Ledger 41 to 42.**

It is additive and idempotent throughout.

**Preflight, recorded before applying.** None of the eleven columns existed;
`listing_events` was absent; `listings` held 5 rows (approved 2, draft 1,
submitted 2), 4 of them carrying a quantity; `listings_status_check1` was absent,
so the defensive drop was a no-op; the three policy names the file replaces
existed under exactly those names, so no orphan or duplicate policy could
survive; `is_admin()`, `gen_random_uuid()` and `auth.users` were all present.

**Verified in production afterwards.** 11 columns present with the stated types,
all nullable except `quantity_extracted`, which is `NOT NULL DEFAULT false`; the
status CHECK carries all 13 values; the five new CHECK constraints are present;
no duplicate `listings_status_check1`; `listing_events` created with RLS
**enabled**; all five indexes present.

**Data effects, exactly as predicted.** Still 5 listings, still approved 2 /
draft 1 / submitted 2 — **nothing was published**. 4 rows backfilled to
`quantity_mode = 'exact'`, and the one row without a quantity left null. 2
lifecycle events seeded, one per already-approved listing, as
`listing_published / admin / legacy_desk_approval`. Zero orphan events.

**Security verified, not assumed.** Seven policies on `listings`, no duplicates.
No member policy permits writing `approved`, `flagged`, `suspended`,
`validating` or `needs_information`: the widened update policy allows only
`draft | submitted | withdrawn`, and the new withdrawal policy only
`approved -> approved | withdrawn`. **No anonymous SELECT policy exists on
`listings`**, so nothing was broadened for anonymous readers. `listing_events`
has SELECT-only policies and **no INSERT policy at all**, so a member cannot
forge a `listing_published` event.

**Functional probes, run inside a transaction that was rolled back so no test
row reached production.** The widened vocabulary accepts `validating`; an
invented status is refused; an inverted range 500-to-200 is refused; a valid
range 200-to-500 is accepted; a completeness score of 101 is refused; an
unrecognised `quantity_mode` is refused; a lifecycle event inserts; an
unrecognised `actor_type` is refused. Eight of eight. The rollback was confirmed
held afterwards: statuses unchanged, 2 events, no test rows, no `range` mode.

**Private-site gate confirmed intact** after the work: `https://ponte.trade/`
answers `401` with `WWW-Authenticate: Basic realm="Ponte Trade"`, and
`middleware.ts` is unchanged.


> **This gap has already cost members their submissions.** From the deployment of
> the automated-publication branch until 29 July 2026, `POST
> /api/marketplace/submit` sent `quantity_mode`, `quantity_min`, `quantity_max`,
> `quantity_extracted`, `quantity_confirmed_at` and (once the declaration was
> accepted) `declaration_accepted_at` and `declaration_version` on **every**
> write. None of them existed in production at the time. PostgREST refused the insert, the
> route's retry dropped only the family-terms and classification groups, and both
> Submit and Save draft answered 500 for every member and every family.
> `lib/listings/write-fallback.ts` drops whatever column the database actually
> names, so a submission stores instead of failing. **That bridge is now dormant
> for these seven columns:** this file was applied on 29 July 2026, so an
> accepted declaration IS recordable and the validator CAN write `validating`,
> `needs_information` and `flagged`. The fallback remains in place for any
> future unapplied column.

What it changes on `listings`: widens the status check constraint to add
`validating`, `needs_information`, `flagged` and `suspended` (every state
already in use is preserved, and `approved` remains the stored value for a
public listing, so no index, RLS policy or public read path changes meaning);
adds `quantity_mode`, `quantity_min`, `quantity_max` with range-ordering and
positivity constraints; adds `quantity_extracted`, `quantity_confirmed_at`,
`declaration_accepted_at`, `declaration_version`, `safety_flags`, `flag_reason`,
`flag_severity` and `completeness_score`; adds three partial indexes.

New table: `listing_events` — the lifecycle audit trail, RLS-enabled, readable
by the listing owner and by admins, and **written only under the service role**
so a member cannot forge a publication event.

RLS restated on `listings`: the member insert and update policies are rewritten
to cover the new states explicitly, and a separate withdraw-own-live-listing
policy is added. A member still cannot write `approved`, `flagged`,
`suspended`, `validating` or `needs_information`, and cannot clear
`safety_flags`.

**It publishes nothing.** There is no bulk UPDATE moving `submitted` rows to
`approved`. Publication needs the submitter's live verification state, adjacent
media/document counts and the safety pass, none of which SQL can evaluate, so
legacy rows stay in `submitted` and re-validate through the application when
next touched. It does backfill one `listing_published` event per already-public
listing with `actor_type = 'admin'`, so the audit trail does not begin with a
gap and does not misattribute historic desk approvals to the validator.

Note the pre-existing duplicate-constraint hazard recorded under
`20260722c_listings_v4.sql`: a stale `listings_status_check1` once coexisted
with the visible constraint and silently rejected permitted values. This
migration drops both names before adding its own.
## Applied to production by hand

- `20260728d_verification_level_canonical.sql` was applied to production on 28
  July 2026 at **17:04:50 UTC** with explicit owner authorisation, via
  `node scripts/db-query.mjs --file`, and verified immediately afterwards.
  Recorded in `schema_migrations` with SHA-256
  `262e96b7...714a9930`, matching the file byte for byte. Ledger 40 to 41.

  **It resolved a Launch Blocker.** Production carried a five-value CHECK
  constraint on `profiles.verification_level`. The verification pipeline wrote
  the integer `2`, which coerced to `'2'` and was refused by that constraint
  with SQLSTATE 23514, and the update result was never checked, so the write
  failed **silently every time**. No member could reach `company_verified`
  through the intended pipeline; the only profile holding it was seed-written.

  Changes: one row backfilled from `NULL` to `'unverified'`; the five-value
  constraint replaced with `unverified | identity_verified | company_verified`
  (safe as a narrowing, zero rows held a retired value); the `'unverified'`
  default restated; the column set `NOT NULL`. `set lock_timeout = '5s'` inside
  the transaction so contention fails fast rather than blocking every write to
  `profiles`.

  **Verified in production:** `unverified` 8, `company_verified` 1, zero nulls,
  zero invalid values, `is_nullable = NO`, the three-value constraint present,
  and `verifications` unchanged at review 4, rejected 2, pending 2, verified 1.
  The migration never references `verifications`.



- `20260728a_market_classification.sql` was applied to production on 28 July
  2026 at 13:25:11 UTC with explicit owner authorisation, using
  `node scripts/db-query.mjs --file ...` against project
  `cptglsmjmzcfpjndqfmc` ("Ponte Trade", eu-west-1, ACTIVE_HEALTHY), and
  verified directly against production afterwards. Recorded in
  `schema_migrations` with SHA-256 `8e9d0e72...c661aa5f`, which matches the
  file byte for byte.

  It adds **17 nullable columns, 5 CHECK constraints and 9 indexes**: 11 columns,
  3 constraints and 6 indexes on `listings`; 6 columns, 2 constraints and 3
  indexes on `desk_radar`. Additive throughout; nothing was renamed, dropped or
  rewritten, every existing row stays readable and the legacy `listings.type`
  mapping is untouched. The rollback is written out in the file itself.

  **Verified in production:** all 17 columns present and nullable with the
  stated types; all 5 family-coherence constraints present, plus the 5
  column-level CHECKs, so no statement applied partially; all 9 indexes present;
  the board still reads (3,491 eligible signals at
  `https://ponte.trade/market-signals`); the three write paths accept their
  structured fields, proved inside a transaction that was rolled back so no test
  row reached production; and a category filter now returns `nothing_classified`
  rather than `columns_absent`, printing "3,491 signals are live on the board,
  and none of them carries a category".

  **The three-valued-logic fix is confirmed live.** An insert carrying
  `service_category_key` with a null `market_family` is refused by
  `listings_service_family_coherent` with SQLSTATE 23514. Evaluated in
  production Postgres, the predicate returns `false` rather than `null` for
  every row that must be refused, which is the whole point of the explicit
  `market_family is not null and market_family = '...'` form: a CHECK accepts
  TRUE **and NULL**, so the shorter `false or null` version passed the row it
  existed to refuse.

  **Nothing is backfilled, deliberately.** No existing listing or signal carries
  a canonical category. `listings` holds 5 rows, 0 classified; `desk_radar`
  holds 6,735 rows, 0 classified. Applying the SQL created columns and
  classified nothing, so every category filter reports `nothing_classified`
  until something classifies the inventory. Writing a guess into these columns
  would invent a finding.

  It was applied by hand because the automatic chain aborts at its first file
  (see below), so a merge does not apply anything.

## The migration ledger was publicly readable and writable, and is now closed

> **CLOSED — RESOLVED, 28 July 2026.** Repaired by
> [PR #76](https://github.com/Geppix140269/ponte/pull/76)
> (`20260728b_schema_migrations_rls.sql`), applied to production at
> **14:07:35 UTC** and recorded in the ledger it protects.
>
> Independently re-verified on 28 July 2026 for the migration reconciliation
> ([PR #82](https://github.com/Geppix140269/ponte/pull/82), §6.4):
>
> | Check | Before | After |
> |---|---|---|
> | anon `GET /rest/v1/schema_migrations` | `200` with real rows | **`401`, SQLSTATE `42501`** |
> | `pg_class.relrowsecurity` | `false` | **`true`** |
> | `anon` / `authenticated` privileges | all seven each | **none** |
> | `postgres` / `service_role` privileges | all seven | **all seven, unchanged** |
> | Ledger readable by `scripts/db-query.mjs` | yes | **yes, 40 rows** |
>
> Both write paths are unaffected, which was the condition for closing this:
> `postgres` owns the table and an owner bypasses RLS unless FORCE is set, which
> the migration deliberately does not set, and `service_role` has
> `rolbypassrls`. No application code reads or writes this table.
>
> **No further action.** The narrative below is retained as the record of what
> was wrong and why. There was no GitHub issue for this item; it was tracked in
> this file and in the audit report, and is closed here.

`public.schema_migrations` had row level security **disabled**, and `anon` and
`authenticated` each held all seven table privileges: SELECT, INSERT, UPDATE,
DELETE, TRUNCATE, REFERENCES and TRIGGER. The anon key is shipped to every
browser, so anyone at all could read the migration history, forge a row into it,
rewrite one, or empty the table.

Confirmed live over the public internet on 28 July 2026, using nothing but the
publishable key: `GET /rest/v1/schema_migrations` returned `HTTP 200` with real
rows. That is the part that matters most. This table is the only record of what
has been applied to production, so a table anybody can write is not evidence,
and every audit that read it was reading something unauthenticated callers could
have edited.

**The cause was not a mistake in any migration.** The table is created by
`scripts/db-query.mjs` and `scripts/apply-migration.mjs` with a plain
`create table if not exists`, and Supabase's default privileges grant every new
table in `public` to `anon` and `authenticated`. Every table this project
declares deliberately is protected; this one was created by tooling, in passing,
and so never was. It stood that way from its first row until the repair.

**Repaired by `20260728b_schema_migrations_rls.sql`**, applied to production on
28 July 2026 with owner authorisation via `scripts/db-query.mjs`. It enables RLS
with no policy, revokes all privileges from `anon` and `authenticated`, and
states the `service_role` grant explicitly. Both scripts now re-assert the same
three statements on every run, so a ledger created fresh in another project is
protected from its first row.

**Verified afterwards, from outside:** with the anon key, SELECT, INSERT, UPDATE
and DELETE all return `HTTP 401` with SQLSTATE `42501`. The control in the same
run, `desk_radar`, still returns `HTTP 200` with `[]`, so the denial is specific
to this table and not a bad key or a bad URL. Server side: `relrowsecurity` is
true, zero policies (deny-all, matching the eleven other tables held that way),
and the only grantees left are `postgres` and `service_role`. Both write paths
are unaffected: `postgres` owns the table and an owner bypasses RLS unless FORCE
is set, which this migration does not set, and `service_role` has `rolbypassrls`.
No application code reads or writes this table. Running the file a second time
changes nothing.

**Nothing else was touched.** No row was edited, no other table's grants were
changed, and no credential was rotated.

## `scripts/apply-migration.mjs` cannot connect

The `DATABASE_URL` in `.env.local` fails authentication against
`aws-0-eu-west-1.pooler.supabase.com` as `postgres.cptglsmjmzcfpjndqfmc`:
`FATAL 28P01, password authentication failed`. It fails at `client.connect()`,
before any SQL runs, so `--list` and every apply through that script are dead.

This is why migrations are applied with `scripts/db-query.mjs`, which goes
through the Management API and works. Recorded rather than fixed, because the
repair is a credential and credentials are an owner action.

## The CI Supabase Preview integration points at a project this account cannot see

Found on 28 July 2026 while establishing which project to apply
`20260728a_market_classification.sql` to, and worth recording because it has
been silently wrong for a long time.

- The **production** project is `cptglsmjmzcfpjndqfmc` ("Ponte Trade",
  eu-west-1, ACTIVE_HEALTHY). It is what `.env.local` configures, what the
  deployed site reads, and what the 26 July probe measured.
- The GitHub **"Supabase Preview"** check on every pull request links to
  `https://supabase.com/dashboard/project/kltuzbxnldtmdfhakphv`.
- `kltuzbxnldtmdfhakphv` **is not in this Supabase account at all.** Listing the
  projects the owner's access token can reach returns four, and that reference
  is not among them.

So the check is not a broken preview of production; it is a link to a project
that either belongs to a different account or no longer exists. That is the
better explanation for why it has failed on every run, and it means the failure
was never evidence about the migration chain.

**Two red checks on every PR, with different causes.** `Supabase Preview` is
this misconfiguration. `import-package` is the retired Bridge fetch workflow.
Neither has ever passed, and neither says anything about the change under
review. A check that always fails teaches people to ignore red, which is how a
real failure gets missed.

Nothing here has been changed. Repairing the integration touches repository
settings and possibly a Supabase project, and both are owner decisions.

### Update, 30 July 2026: it fails on exactly the PRs that add a migration

Observed while opening PR #117. The check is no longer red on every PR — it is
**`SKIPPED` on a PR that adds no migration file and `FAILURE` on one that does**:

| PR | Adds a migration | Supabase Preview |
|---|---|---|
| #113 | no, records only | `SKIPPED` |
| #116 | no | `SKIPPED` |
| #107 | yes, `20260730a` | **`FAILURE`** — and it was merged anyway |
| #117 | yes, `20260730b` | **`FAILURE`** |

So a red `Supabase Preview` on a migration PR is **the integration, not the SQL**.
PR #107 is the control: same failure, same cause, merged on the owner's decision
without incident.

The project reference has also moved. This section recorded
`kltuzbxnldtmdfhakphv`; the check on PR #117 links to
**`pyplitspfeeqwzdimltf`**. Neither is production (`cptglsmjmzcfpjndqfmc`) and
neither is reachable by the owner's access token, so the conclusion above is
unchanged and now has a second unreachable reference behind it.

**This is worse than a check that always fails, not better.** A check that is red
on every PR is obviously noise. One that is green or skipped most of the time and
red precisely when a migration is proposed looks exactly like a migration gate,
and it is not one — it says nothing about whether the SQL is correct. The next
person to open a migration PR will either be alarmed by it or, worse, reassured by
the ones it skips. Repairing or removing it remains an owner decision and is not
touched here.

## APPLIED to production, 29 July 2026: family commercial terms

`supabase/migrations/20260728e_family_commercial_terms.sql` (ADR-0014, accepted
by the owner on 29 July 2026).

**Applied to production on 29 July 2026 at 15:44:45 UTC** with explicit owner
authorisation, via `node scripts/db-query.mjs --file`, against project
`cptglsmjmzcfpjndqfmc`, immediately after `20260728c` had been fully verified.
Recorded in `public.schema_migrations` with SHA-256
`4224fa274291f074d1ef0c948c52ba9afbeaa5378111b4686c05cebde9f18fa8`, matching the
file byte for byte. **Ledger 42 to 43.**

Applied second because it depends on `20260728c`: its
`listings_product_fields_family` constraint references `quantity_min` and
`quantity_max`, which that file creates.

Renamed from `20260728d_` on 29 July 2026 (issue #97, PL-004). It shared the
identifier `20260728d` with `20260728d_verification_level_canonical.sql`, which
was already applied to production and recorded in the ledger under that exact
name with its SHA-256, so the applied file kept its identity and the then-unapplied
one moved. The SQL is unchanged by the rename.

**Verified in production.** `service_terms` and `distribution_terms` present,
both `jsonb` and both nullable; `listings_service_terms_family` and
`listings_distribution_terms_family` present and **valid**;
`listings_product_fields_family` present and **NOT VALID**, which is exactly
what the file deploys.

**Data effects: none.** Still 5 listings, still approved 2 / draft 1 /
submitted 2, zero rows carrying either terms column. Nothing was backfilled and
nothing could be: no record carries a canonical family yet.

**Functional probes, rolled back.** A services record written the way the
composer writes one, with product fields cleared, accepts `service_terms`; a
services record that keeps a quantity is refused; a distribution record accepts
`distribution_terms`; service terms on a distribution record are refused;
distribution terms on a products record are refused; a legacy row with a null
`market_family` is still allowed to hold terms, so nothing created before the
family entrances became invalid.

**`listings_product_fields_family` is still NOT VALID, deliberately.** Zero
existing rows would violate it, surveyed directly. Validating it is a separate
owner decision and was not taken, because the migration deploys the constraint
`NOT VALID` and validating it would make the deployed object differ from the
file. When the owner wants it enforced against existing rows:

```sql
alter table listings validate constraint listings_product_fields_family;
```

### This file is now immutable, and its own header is stale

The bytes of this migration are what production ran, and the SHA-256 above is
the proof. Two consequences follow, and both are deliberate:

- **The `NOT APPLIED` comment inside the SQL file is now historically wrong and
  is left exactly as it is.** Correcting it would change the file's bytes and
  break the match with `schema_migrations`. What is applied is recorded here,
  not in the migration's own header.
- **A seven-line comment block describing the rename, added to this file on
  `main` by the Deal Room branch, was removed** to restore the applied bytes.
  Its content is preserved in the paragraph above instead. Nothing inside the
  SQL statements changed; the block was comment text only.

An operator instruction issued before 29 July may still name the old
`20260728d_family_commercial_terms.sql`. It is the same SQL, and the current
filename is the one above.

Adds two nullable jsonb columns to `listings`, `service_terms` and
`distribution_terms`, plus three CHECK constraints stating the cross-family
rule: service terms only on a services record, distribution terms only on a
distribution record, and no quantity, unit, Incoterm or HS code on a
non-products record. The last is added `not valid` so applying it cannot fail
on a historical row; validate it separately after inspecting whatever it
reports.

Depends on `20260728a_market_classification.sql`, which is already applied in
production (28 July 2026) and supplies `market_family`.

Nothing existing is renamed, dropped or rewritten. Every existing row stays as
it is. No RLS policy is added, removed or altered: both columns are new columns
on an existing table and inherit the policies `listings` already has.

The application does not require it. The submit route retries the write without
these columns when they are absent, exactly as it already does for the
classification columns, and the terms also reach the record through the
synthesised `details`. The branch is therefore safe to deploy before this is
run.

Rollback is documented in the file itself, including the backup query to take
first if any non-product record has been created since it was applied.
## APPLIED to production, 29 July 2026 (duplicate section)

`20260728c_automated_listing_publication.sql` implements ADR-0013. **It was
applied on 29 July 2026 at 15:42:54 UTC**; the timestamp, hash, ledger
transition and every probe are recorded in the section of the same name above,
which is the authoritative one. This heading is a duplicate that predates the
application and is corrected rather than deleted, so a reader arriving at either
copy is told the same true thing.

What it changes on `listings`: widens the status check constraint to add
`validating`, `needs_information`, `flagged` and `suspended` (every state
already in use is preserved, and `approved` remains the stored value for a
public listing, so no index, RLS policy or public read path changes meaning);
adds `quantity_mode`, `quantity_min`, `quantity_max` with range-ordering and
positivity constraints; adds `quantity_extracted`, `quantity_confirmed_at`,
`declaration_accepted_at`, `declaration_version`, `safety_flags`, `flag_reason`,
`flag_severity` and `completeness_score`; adds three partial indexes.

New table: `listing_events` — the lifecycle audit trail, RLS-enabled, readable
by the listing owner and by admins, and **written only under the service role**
so a member cannot forge a publication event.

RLS restated on `listings`: the member insert and update policies are rewritten
to cover the new states explicitly, and a separate withdraw-own-live-listing
policy is added. A member still cannot write `approved`, `flagged`,
`suspended`, `validating` or `needs_information`, and cannot clear
`safety_flags`.

**It publishes nothing.** There is no bulk UPDATE moving `submitted` rows to
`approved`. Publication needs the submitter's live verification state, adjacent
media/document counts and the safety pass, none of which SQL can evaluate, so
legacy rows stay in `submitted` and re-validate through the application when
next touched. It does backfill one `listing_published` event per already-public
listing with `actor_type = 'admin'`, so the audit trail does not begin with a
gap and does not misattribute historic desk approvals to the validator.

Note the pre-existing duplicate-constraint hazard recorded under
`20260722c_listings_v4.sql`: a stale `listings_status_check1` once coexisted
with the visible constraint and silently rejected permitted values. This
migration drops both names before adding its own.
## Known risk

The historical numbered migration chain is not a reliable proof that a fresh Supabase preview recreates production. A Supabase Preview failure has been treated as pre-existing. Do not repair, squash, rename or replay migrations without a dedicated migration-reconciliation plan and explicit approval.

The failure was diagnosed on 26 July 2026 and the required plan now exists at `docs/plans/active/migration-chain-reconciliation.md`. It is a plan, not an approval, and nothing in it has been executed. Two findings belong here because they change what the repair is:

- The chain aborts on its first file, `01_catalogue_fields.sql`, with `relation "products" does not exist`. Seven shop-era files depend on tables the July 2026 shop removal dropped.
- Removing those seven does not fix it. `02_ponte_previews_bucket.sql` calls `is_admin()`, which only `supabase/schema.sql` creates, and the integration does not run `schema.sql`. The base schema is not in the chain at all.

Until the chain is reconciled, **a merge to `main` applies nothing**: every new migration must be applied by hand, with owner approval, and recorded above.

## Required pre-migration report

Before any new schema change, record:

1. target user outcome;
2. current production tables, columns, constraints, indexes, functions, triggers and RLS relevant to the change;
3. matching repository migrations;
4. any drift or manual SQL;
5. forward migration;
6. rollback or safe-disable path;
7. data backfill and idempotency;
8. privacy and disclosure effects;
9. tests and production verification steps.

## Prohibited automatic actions

Codex must not, without explicit approval:

- apply SQL to production;
- use a Supabase service-role key against production;
- disable RLS;
- broaden anonymous reads;
- rewrite migration history;
- delete production data;
- infer production state solely from migration filenames.
