# WO-2 reconciliation, finding 01: the repository cannot rebuild its own schema

**Date:** 2 August 2026
**Raised by:** the owner, running `npm run dev:db` (issue #84) against an empty
local database
**Evidence class:** repository only. No production access was used and none is
required for this finding.
**Severity: SEVERE** against the binding definition in `DECISION-26`.

> Drift is **severe** where migration lineage cannot be proven, member-data
> integrity is uncertain, histories conflict materially, or safe rollback
> cannot be demonstrated.

Three of those four are met on repository evidence alone, and each is
independently sufficient. The fourth cannot be assessed without the export.

**Scope note, per `DECISION-26`:** this document contains no migration SQL, no
preferred remedy and no implementation recommendation. The response to a severe
finding is already decided and is not the executor's to propose. The owner has
separately and explicitly instructed that the filenames are **not** to be
changed before the reconciliation report exists.

---

## 1. What was observed

`npm run dev:db` runs `supabase db reset`, which replays
`supabase/migrations/` against an empty database.

```
45 of 55 migrations skipped: filename pattern mismatch
failed:  01_catalogue_fields.sql
error:   relation "products" does not exist
```

The database was not created. Reproduced from the repository below.

---

## 2. Only 10 of 55 files are in the migration chain at all

The Supabase CLI reads a version from the characters before the first
underscore and requires them to be digits. Counted from the repository:

| | Count |
| --- | --- |
| Files in `supabase/migrations/` | **55** |
| Accepted by the CLI (`^[0-9]+_`) | **10** |
| Silently skipped | **45** |

The 45 all carry a letter inside the version segment, for example
`20260720b_marketplace_browse.sql`, `20260721a_drafts_sharing.sql`,
`20260731e_deal_room_paid_room_periods.sql`.

**Nothing reports this.** The CLI does not warn, and the files sit in the
migrations directory looking exactly like the ten that are read. Everything the
Deal Room depends on, including its RLS, its function ACLs and its paid-period
tables, is in the skipped 45.

The ten that are read are:

```
01_catalogue_fields.sql              02_ponte_previews_bucket.sql
20260526_b_catalogue_includes.sql    20260526_capacity_queue.sql
20260526_catalogue_restructure.sql   20260527_wave4_catalogue.sql
20260528_wave4_product_copy_ponte_voice.sql
20260610_adamftd_catalogue.sql       20260610_lock_profile_role.sql
20260720_marketplace_listings.sql
```

Nine of those ten are shop-era catalogue work. The retired report shop is
better represented in the executable chain than the current product is.

---

## 3. The chain has no genesis

`create table ... profiles` appears in exactly two places in the repository:

- `supabase/schema.sql`
- `supabase/schema-snapshots/production-public-20260801.sql`

**Neither is in `supabase/migrations/`, so the CLI never applies either.** The
base schema every feature table depends on is not part of the migration
history. Even if all 55 files were read, they would run against a database with
no `profiles` table.

---

## 4. Two files in `migrations/` were never migrations

`01_catalogue_fields.sql` states its own nature in its first two lines:

> `-- Migration 01: Add catalogue fields missing from the initial schema.`
> `-- Run this in the Supabase SQL Editor BEFORE running the seed script.`

It is a hand-run script. It `ALTER`s `products`, a shop-era table that **no
file anywhere in this repository creates**. Because `01_` sorts before
`20260526_`, the CLI's very first action on an empty database is a hand script
from a retired product, against a table that does not exist. That is the
observed failure, exactly.

`02_ponte_previews_bucket.sql` is the same shape.

---

## 5. Histories conflict materially

`supabase/schema.sql` states that the shop tables "are dropped by
`20260722a_drop_legacy_shop.sql`".

That file is in **`supabase/pending/`**, not in `migrations/`. A file outside
the chain is credited, in the repository's own base-schema description, with a
structural change to the database.

`supabase/deprecated/` holds a further file whose dated twin also exists in
`migrations/`.

---

## 6. The repository already knew, in part

`supabase/schema.sql` carries this, dated 22 July 2026:

> **KNOWN DRIFT, 2026-07-22:** the live `profiles` table carries columns that no
> file in this repository creates, among them `account_type`, `verified_trader`,
> `organization_id`, `risk_category`, `completed_deals`, `title`, `languages`,
> `commodities`, `regions_served`, `years_active`, `typical_deal_size`, `bio`,
> `plan`, `plan_status`, `plan_renews_at`, `stripe_subscription_id` and
> `verification_tier`. They were added straight to the database. Applying this
> repository to an empty project therefore does **NOT** reproduce production.

`supabase/schema-snapshots/README.md` says the same in one line: *"These exist
because the migration history cannot rebuild the database on its own."*

This finding is therefore **not a new discovery**. It is the first *execution*
of a condition the repository has described in prose for eleven days. What is
new is that it is now demonstrated rather than asserted, with a reproducible
command and an exact failure.

---

## 7. What existing evidence does and does not prove

The `deal-room-migration-replay` workflow passes, and has been cited as
migration assurance. Its own header is precise about its limits:

> phase 0 — a committed baseline snapshot restores
> phase 1 — every historical migration applies on top of that baseline

It proves **migrations apply on top of a production schema dump**. It does not
prove, and does not claim to prove, that the repository can construct the
schema. The green check and this finding are both true and are not in conflict.

---

## 8. Severity, assessed against `DECISION-26`

| Criterion | Met | On what evidence |
| --- | --- | --- |
| **Migration lineage cannot be proven** | **Yes** | 45 of 55 files are outside the chain the tool reads. There is no ordered lineage to prove, and no artefact in the repository states which files constitute the intended history. |
| **Safe rollback cannot be demonstrated** | **Yes** | Rollback requires a reconstructible known-good target. The repository cannot construct the schema at all, so no target can be built and no rollback rehearsed. Issue #50 (rehearse a restore) has never been possible. |
| **Histories conflict materially** | **Yes** | The base schema credits a structural drop to a file held outside the chain. Two non-migrations sit inside it. `deprecated/` duplicates a dated file in `migrations/`. |
| **Member-data integrity uncertain** | **Undetermined** | Not assessable from the repository. Requires the `DECISION-22` export. |

**Classification: SEVERE.** Three independent criteria are met, any one of
which is sufficient under the definition.

---

## 9. Uncertainty, and the evidence that would settle it

Stated plainly, because a report with a named hole is the correct outcome and a
confident guess is not.

| Unknown | What would settle it |
| --- | --- |
| What production's `supabase_migrations.schema_migrations` records as applied, in what order, with what checksums | Section 10 of the `DECISION-22` export |
| Whether the 45 skipped files were ever applied to production by another route, or never applied at all | Sections 10 and 2 of the export, compared against this list |
| Whether production's live schema still matches the 1 August snapshot | Sections 2 and 3 of the export, compared against `schema-snapshots/production-public-20260801.sql` |
| Whether any migration was edited after being applied | Checksums in section 10, where the migrations table stores them |
| Whether RLS in force matches what the repository expects | Sections 6 and 6b of the export. **This is the one with a security consequence**: RLS is the mandatory permission boundary for the Deal Room. |
| Member-data integrity | Not answerable within the export boundary. Requires a separately authorised, human-run aggregate. |

Two export scripts produce every section named above, and the same read-only
boundary is enforced on both by a test rather than asserted:

| Script | For |
| --- | --- |
| `scripts/schema-export-web.sql` | **The Supabase SQL editor.** One statement, one row, one column. Paste, run, copy the cell. |
| `scripts/schema-export.sql` | A terminal with `psql`. Thirteen statements, easier to read section by section. |

The web version exists because the psql one cannot be used in the dashboard:
it carries `pset`, `	iming` and `echo`, which are psql meta-commands the
server never sees, and the editor returns only the LAST result set of a
multi-statement paste. Twelve of the thirteen sections would have been
silently discarded, which is the failure mode that looks like success.

---

## 10. What was deliberately not done

- **The files were not renamed.** The owner instructed this explicitly, and it
  is also right on its own terms: renaming 45 files changes what the tool
  believes has been applied, against a production migrations table nobody has
  read yet. That is a schema-lineage change made blind.
- **No remedy is proposed**, per `DECISION-26`.
- **No production access was used.**

## 11. Consequence for the launch record

`docs/codex/CURRENT-STATE.md` and the launch blockers should reflect that
rebuilding the schema from the repository is **demonstrated impossible**, not
suspected. Issues #48, #49 and #50 all descend from this single finding: #50
(rehearse a restore) cannot be attempted at all while it stands.
