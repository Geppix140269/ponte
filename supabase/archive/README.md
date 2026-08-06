# supabase/archive

**The 53 migrations applied to production before the genesis snapshot.**

They are kept because they are the record of what production actually received.
They are **not** replayable steps and nothing runs them.

## Why archive rather than delete

The WO-2 reconciliation checked every one of these against production's own
ledger. **52 of the 53 match the repository file exactly, by sha256.** Nobody
has edited an applied migration and there are no orphan records. That is a
better result than the migration history's reputation, and deleting the files
would destroy the only evidence of it.

The one that cannot be confirmed either way is `20260722b_hs_codes.sql`,
recorded as `applied-via-management-api` with no checksum. Permanently
unverifiable, and recorded as such rather than assumed good.

## Why they are not on the apply path

They predate `schema-snapshots/production-public-20260801.sql`, which is now the
genesis. Everything they did is already in it. Replaying one would collide with
an object that exists.

Seven of them depend on the retired report-shop tables and cannot run at all
against a current database:

`01_catalogue_fields.sql`, `20260526_b_catalogue_includes.sql`,
`20260526_capacity_queue.sql`, `20260526_catalogue_restructure.sql`,
`20260527_wave4_catalogue.sql`, `20260528_wave4_product_copy_ponte_voice.sql`,
`20260610_adamftd_catalogue.sql`.

`products` took zero orders before the shop was removed in July 2026, and
nothing creates the table any more. The 26 July plan identified exactly these
seven and asked for them to be archived; this is that step, widened by the
`WO-8` section 3.4 decision to adopt the snapshot as the genesis.

## One file was changed on the way in

`02_ponte_previews_bucket.sql` issued four bare `create policy` statements,
which fail on any database where the policies already exist. Each is now
drop-then-create, matching every dated migration since.

It is on no apply path, so this changes no behaviour. It was done because the
26 July plan asked for it and because an archived file that could never run
again is worse history than one that could: somebody rebuilding from scratch in
an emergency should find files that work.

## The ledgers, and what was NOT done to them

Two exist and they disagree:

| Store | Rows | |
| --- | --- | --- |
| `public.schema_migrations` | **53** | Hand-maintained. Reconciles to this folder within one file. |
| `supabase_migrations.schema_migrations` | **1** | The store the Supabase CLI reads. It believes this database is at `01`. |

**Neither is touched by this work, and that is deliberate.** Rewriting either is
a production write, it is out of `WO-8`'s scope, and `public.schema_migrations`
is the more accurate record of the two - it should not be edited to match a
folder layout.

**Consequence:** the Supabase CLI remains unusable against this project. It
would act believing the database is at `01`. This project continues to apply
migrations by hand, under `DECISION-20`, and `npm run dev:db` is how a migration
is proved before it gets anywhere near that.
