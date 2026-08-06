# Ponte Trade, Claude Code work order WO-6

## `DECISION-20` step 3: the reconstruction and migration proposal

**From:** UX/UI Director
**Date:** 2 August 2026
**Authorised by:** strategic review of 2 August 2026, following acceptance of the WO-2 reconciliation report v1.1
**Input document:** `docs/ponte/PONTE-WO-2-RECONCILIATION-REPORT-v1.1.md`, pinned to commit `2a97f065029314509c21cac31426d34a3cc85c02`
**Commercial authority:** `DECISION-28`. Canonical authority v5.2 prevails.

---

## 0 · Standing constraints, unchanged and not negotiable by anything below

1. **No production change is authorised.** Not a write, not a schema change, not an index, not a grant, not a policy, not "prepared behind a flag". Step 3 produces a **proposal**. Step 4 is a rehearsal. Step 5 is approval. Production execution is none of these.
2. **No AI connects to production.** `DECISION-22` option A stands. Anything requiring the database is written as a query for a human to run and paste back, exactly as the export was.
3. **Do not rewrite an accepted decision to look as though it always said something else.** Amend, supersede or annotate, and cite the decision ID.
4. **Report what you actually find**, including what you could not determine. An honest gap is worth more than a confident guess. Two of the most valuable findings in this programme came from you contradicting a brief.
5. **Contradict this work order where it is wrong.** It was written by someone who has been wrong three times this week in ways that mattered.

---

## 1 · Preconditions, and they are small

These close evidence gaps in the report you are building on. None needs production access.

**`WO-6.0a` Commit the export script.** `scripts/schema-export-web.sql` **does not exist in the repository.** The export that this entire report rests on was produced by pasting text that is not in version control. Commit the executed version, byte for byte, with its SHA-256 recorded in the commit message. Until this exists, **no future export is comparable to this one**. This is the first thing to do and it takes minutes.

**`WO-6.0b` Record the report.** Place `PONTE-WO-2-RECONCILIATION-REPORT-v1.1.md` and `PONTE-BRIEF-FOR-GPT-03.md` in the repository authority record, and reflect both in GitHub Issue #130 along with canonical authority v5.2. The authority record is currently behind the conversation, which is the exact mechanism that produced two conflicting architectures.

**`WO-6.0c` Get the row counts.** Forty-four tables have never been analysed, including `organizations`, `deals`, `listing_connections`, `anonymous_drafts` and `listings_legacy_20260720`. **Actual counts are permitted under `DECISION-22` option A and the report is materially weaker without them.** Write one statement, human-run, one result, same pattern as the export. Counts only, no row contents.

---

## 2 · The six deliverables of step 3

One document. It may be long. It must not contain anything applied.

### `WO-6.1` The reproducible baseline

**The severe finding.** Production cannot currently be recreated from the version-controlled repository alone: there is no complete genesis schema, and `supabase/schema.sql` creates `profiles` with 7 columns against production's 31.

Produce the **proposal** for a baseline that can be built from the repository and verified to equal production. State, for whichever approach you propose:

- what the baseline artefact is, and where it lives
- how it is **verified** to match production, and by what comparison, given that no AI may connect to production
- what happens to the 53 existing ledger rows: preserved, superseded, or replaced, and how the history remains auditable either way
- what happens to `supabase_migrations.schema_migrations`, which holds one row and disagrees with everything
- whether the Supabase CLI becomes usable afterwards, or whether this project continues to apply migrations by hand, and what the cost of each is

**Do not choose for us where the choice is commercial or governance.** Where there is more than one credible approach, present them with their trade-offs and say which you would pick and why. That is a recommendation inside step 3's scope, unlike step 2, where recommendations were forbidden.

### `WO-6.2` Ledger reconciliation forward

The report establishes the picture: 55 files, 53 ledger rows, 52 checksum matches, 1 permanently unverifiable, 2 in repo and unapplied, 0 orphans, 20 rows backfilled with no reliable date or order.

Propose how the ledger becomes trustworthy going forward. Cover at minimum:

- `20260722b_hs_codes.sql`, recorded as `applied-via-management-api` with no checksum. It cannot be verified, ever. How does the baseline handle a file whose applied form is unknown?
- the 20 backfilled rows, whose content is evidenced but whose order is not
- how a future migration gets recorded such that this cannot recur

### `WO-6.3` Legacy-object treatment

Each of these is a decision with a data consequence. Propose treatment, sequence and risk for each, and **do not bundle them into one step**.

| Object | The constraint on it |
|---|---|
| `listings_legacy_20260720` | **Cannot safely be dropped or replaced until `deals.listing_id` and `adamftd_verification_checks.listing_id` are addressed.** Both are `ON DELETE SET NULL`. Row counts for all three tables are unknown until `WO-6.0c`. |
| `deals` | A complete second, older deal model coexisting with `deal_rooms`. Is it live, dead, or holding history that must be preserved? |
| The report-shop tables | `products`, `categories`, `orders`, `order_items`, `order_notes`, `bundle_items`, `newsletter_subscribers`. `20260722a_drop_legacy_shop.sql` is written, pending, unapplied, and `products` holds rows. |
| `listings.type` | `offer` / `requirement` / `service`, a third classification axis alongside `market_family` and `market_intent`. |
| `listings_product_fields_family` | `NOT VALID`. Existing rows never checked. Validating it may fail. |
| Credits: `credit_ledger`, `credit_purchases`, `spend_credits()`, `credit_balance()` | `AUTH-01` withdrew credits. `P2-1` requires a six-step withdrawal, not a delete. Historical records must remain processable. |

### `WO-6.4` The canonical target schema

**This is where `DECISION-28` binds, so read it before you write a line of this section.**

Canonical authority v5.2 prevails on the commercial model:

- **first activation free for 30 calendar days per business-verified organisation**
- **every later activation, renewal or reactivation: $79 for 30 calendar days**
- **no Starter-specific participant, branch or functional restriction.** Common technical and safety limits may apply equally.

Therefore:

**`20260731e_deal_room_paid_room_periods.sql` is superseded and must not be applied.** Its `$15` additional-branch charge, its `$199` ceiling and its capacity-bound price CHECK encode a model that has been overruled. **Replace it during planning.** Do not apply it and amend afterwards.

The target must express, at minimum:

- an entitlement model where the **free first activation attaches to a uniquely verified organisation, not to an email account**. Today `deal_room_entitlements` has `UNIQUE (room_id)` and no constraint on `org_id`, so nothing at the data layer prevents duplicate personal accounts yielding additional free rooms. **Check whether the rule exists in application code and say so either way.**
- a `paid` entitlement kind, which today's CHECK does not admit
- a room period record and an append-only billing record, without capacity-bound pricing
- **30 calendar days**, not "30 active days". `ADR-0020` says "active days" four times and canonical authority says calendar. `DECISION-28` settles it as calendar. If you find anywhere in the code or the authority documents that depends on a pausing clock, name it.

Also to be carried into the target, from the report:

- **`listing_connections` admits `pending`, `accepted`, `declined` only.** Set 3 `D02` requires **Lapsed**, and requires **withdrawal at any time**. Neither state exists. Design is held partly on this.
- **Room idempotency.** `DECISION-04` and the Set 3 `D04` brief require that either party may initiate a room from the same accepted interest and **one room results**. Nothing in the current schema expresses that: `deal_rooms` has no reference to an accepted interest at all, only `listing_id`.

And two supersession tasks in the repository record:

- **`ADR-0020`** to be marked superseded **only where it conflicts** with `DECISION-28`. Not deleted, not rewritten.
- **`ADR-0028`** carries the same superseded pricing and is **more recent** than ADR-0020 (accepted 1 August, merged in PR #218). It needs the same treatment. It also states *"Do not issue a free Starter Deal Room entitlement"*, which `DECISION-28` reverses.

**Live-copy consequence, and it is urgent enough to name here even though it is not step 3 work.** `lib/deal-room/pricing.ts` is on `main`, implemented and pinned by test to `7900 / 5 / 1500 / 19900` with a 13-row published price table, and **`/deal-rooms/inside` is live in production reading its prices from that module.** The superseded model is therefore currently published to visitors. **Report the full list of surfaces that state it. Do not change any of them under this work order.** It will be a separate ticket with the corrected `P2-2`.

### `WO-6.5` Data preservation

Row counts arrive from `WO-6.0c`. Until then this section is written against unknown volumes and must say so.

State, per table that the plan touches: what is preserved, what is transformed, what is discarded, and what the evidence is that nothing was lost. **`profiles`, `organizations`, `listings`, `deal_rooms` and `credit_ledger` are member data and are the ones that matter.**

### `WO-6.6` Staging rehearsal and rollback plan

The rehearsal cannot be performed until `WO-6.1` exists. **Plan it anyway**, because the plan is what the second reviewer reviews.

Cover: how staging is built, how it is proved equivalent to production, what is rehearsed, what constitutes a pass, how rollback is demonstrated rather than asserted, and what evidence is produced for `DECISION-24`.

---

## 3 · One repository-only investigation, and it is the highest-value item here

**`WO-6.7` The `AUTH-05` permission boundary.**

RLS is enabled on all 76 tables and forced on none. **That is not a defect.** The real question is:

> **Do the application's server-side paths and the 32 `SECURITY DEFINER` functions in `public` respect the Deal Room permission boundary that `AUTH-05` makes mandatory, or does any of them bypass it?**

A `SECURITY DEFINER` function executes as its owner and is unaffected by policy. Twenty-three of the thirty-two are in the `deal_room_*` family.

Read `20260729b_deal_room_rls.sql` (76,684 B), `20260730b_deal_room_function_acl.sql`, `20260730c_deal_room_internal_acl.sql`, `20260731c`, `20260731d` and the server-side call sites, against the policy catalogue in the export.

Two specific cases to resolve:

- **`desk_radar`** is deny-all with zero policies and holds the Market Signals the public product reads. Confirm every public read goes through a service-role path that names only public columns, and that `counterparty_name`, `counterparty_company`, `counterparty_contact`, `raw_description`, `notes` and `source_url` cannot leak.
- **`deal_room_agreement_documents`** is the only `deal_room_*` table with RLS enabled and no policy while every sibling has one. Intentional or an omission?

**This needs no production access and no approval. It can start now.**

---

## 4 · One correction to an unapplied file

**`WO-6.8`** `20260730a_market_signal_search.sql` **will fail as written.** It runs `create extension if not exists pg_trgm with schema extensions` and then references `extensions.gin_trgm_ops`. **`pg_trgm` is already installed in production in schema `public`, version 1.6**, so the create is a no-op and the operator class will not resolve. The four trigram indexes already in production all use the unqualified form.

Correct the file. **Do not apply it.** It remains unapplied and subject to the same sequence as everything else.

---

## 5 · Ordering

1. **`WO-6.0a`, `WO-6.0b`, `WO-6.0c` today.** Minutes each, and `0c` needs Giuseppe for thirty seconds.
2. **`WO-6.7` in parallel.** Repository-only, no approval needed, highest security value.
3. **`WO-6.8`.** A one-line correction to an unapplied file.
4. **`WO-6.1` through `WO-6.6`**, the step 3 document itself, once the row counts are in.

---

## 6 · Governance

**`DECISION-24`.** A second competent human database reviewer is required to review **the eventual migration and the rehearsal evidence, before production execution**. **That reviewer's absence does not block anything in this work order.** Everything here is preparation. Say so in the PR so nobody waits on a person who is not needed yet.

**`DECISION-26`.** The severe branch is triggered on the reproducibility finding, notwithstanding that production data has not been shown to be damaged and has not been inspected. A clean rebuild is therefore an acceptable outcome if `WO-6.1` warrants it, and was pre-agreed so that it would not be fought over under schedule pressure.

**No launch date.** Not internally, not externally, not implied in a PR description. `DECISION-20` holds that a credible date cannot be fixed until this work establishes the actual gap, and that is binding rather than aspirational.

---

## 7 · What to report

For each item: what was done, what was found, what could not be done and why, and **anything in this work order you believe is wrong**.
