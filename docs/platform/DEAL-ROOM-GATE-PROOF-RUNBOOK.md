# Running the Deal Room admission gate proof

## The blocker, established by run 30692924939

**The repository cannot rebuild its own database.** The migration history begins
by altering tables that no migration creates. Replaying it onto an empty
PostgreSQL 17 database fails on the very first file:

```text
  1/     01_catalogue_fields.sql  FAILED
psql:supabase/migrations/01_catalogue_fields.sql:4: ERROR:  relation "products" does not exist
```

This is not new, only newly demonstrated. That file's own header says *"Add
catalogue fields missing from the initial schema. Run this in the Supabase SQL
Editor."* The initial schema was applied by hand and never captured. And
`supabase/schema.sql` has carried the same warning since 2026-07-22:

> KNOWN DRIFT, 2026-07-22: the live `profiles` table carries columns that no file
> in this repository creates […] Applying this repository to an empty project
> therefore does NOT reproduce production.

It names eighteen such columns. `supabase/pending/20260722a_drop_legacy_shop.sql`
is also still unapplied, so production retains shop-era tables that seven
migrations still reference.

**This is why every proof route kept dragging in a production credential:
production is currently the only place the schema exists.**

## The fix: commit a baseline snapshot, once

One schema-only dump of production's `public` schema, committed under
`supabase/schema-snapshots/`. It needs a connection string exactly once, on the
owner's own machine — never in CI, never in a GitHub secret.

```bash
pg_dump --dbname="$PROD_URL" --schema=public --schema-only --no-owner \
  --file=supabase/schema-snapshots/production-public-20260801.sql
```

Use `pg_dump` 17 or newer; production is PostgreSQL 17.6. Keep `--no-acl`
absent — the grants are part of what the proof checks. Review the diff before
committing: it must contain no `COPY`, no `INSERT`, no data section. The replay
workflow re-checks that on every run and refuses a snapshot carrying rows.

This closes the drift gap recorded in `schema.sql`, makes rebuilding the database
possible for the first time, and lets every future migration be proved with no
credential at all.

## The two routes

| | Replay route | Dump route |
|---|---|---|
| Workflow | `deal-room-migration-replay.yml` | `deal-room-gate-proof.yml` |
| Schema source | a committed baseline snapshot | production, via live `pg_dump` |
| Secret required | **none** | `PONTE_SCHEMA_SOURCE_DATABASE_URL` |
| Touches production | **never** | one read-only dump per run |
| Repeatable | yes, freely | one-use, by hand |
| Status | **blocked until a baseline is committed** | working; run 3 reached the dump step |

Once the baseline exists, prefer the replay route: it costs nothing and spends no
production connection. Reach for the dump route only to answer **drift** —
whether production has moved since the snapshot was taken.

## The replay route

```text
Actions -> Migration replay proof -> Run workflow
```

Leave `target_sha` blank to test the selected branch, or paste a full SHA.
Dispatch-only for now; the `pull_request` trigger is switched off until a
baseline exists, so this cannot redden unrelated pull requests. Re-enable it in
the same change that adds the snapshot.

Phases, so any failure is attributable to one file:

0. **Baseline** — the newest snapshot in `supabase/schema-snapshots/` is
   restored, after being re-checked for data markers.
1. **Historical replay** — *off by default.* A snapshot taken from production
   today already contains every migration, so replaying them would be redundant
   and several would fail on objects that already exist. Turn on `replay_history`
   only against a baseline that predates the history, to ask whether the
   repository can rebuild from scratch.
2. **Gate migration** — `20260731g` applied on top, then applied a second time to
   check it is safely repeatable after a partial failure.
3. **Proof** — `npm run deal-room:gate-proof` against that schema.

The workflow asserts in its first step that it references no secret, and fails if
that ever stops being true. That single invariant replaces every credential guard
the dump route needs.

The grants proof (2b, which reads `pg_proc.proacl`) works here because the
snapshot is taken without `--no-acl`.

## The dump route

Operational runbook for `.github/workflows/deal-room-gate-proof.yml`.

## Current status

Workflow run #2 proved the dispatch path and source credential work, then failed
safely before restore/proof because `supabase db dump --schema public` emitted
data markers. The temporary GitHub secret was deleted afterward. PR #198 remains
open and unmerged; no SQL has been applied to production.

The workflow now uses direct `pg_dump --schema-only --schema=public` so the dump
is truly schema-only before it is restored into the ephemeral local stack.

Run 3 (`30688103557`) then failed at the same step for a different reason:

```
pg_dump: error: aborting because of server version mismatch
pg_dump: detail: server version: 17.6; pg_dump version: 16.14
```

**The workflow must use `pg_dump` 17, because production is PostgreSQL 17.6.**
`pg_dump` refuses to dump from a server newer than itself — it cannot know what
a later major added — and `ubuntu-24.04` ships the 16 client. The workflow now
installs `postgresql-client-17` from the PostgreSQL apt repository in a step of
its own, proves the binary exists, and calls it by full versioned path so the
major is never left to whatever `pg_dump` wins on `PATH`.

The ephemeral local Supabase stack reports **PostgreSQL 17.6** as well, so the
dump and the restore target are the same major end to end.

## What touches production

One command, in one step:

```bash
/usr/lib/postgresql/17/bin/pg_dump \
  --dbname="$SOURCE_DB_URL" \
  --schema=public \
  --schema-only \
  --no-owner \
  --file="$SCHEMA_FILE"
```

This reads only the `public` schema DDL. It does not dump table rows, `auth`,
`storage`, users, storage objects or business data, and it does not write to the
source database. The workflow still rejects the file if it contains `COPY`,
`INSERT`, `\.` or `-- Data for Name:` before restore.

`--no-owner` avoids restore noise from production role ownership, which nothing
in the proof reads.

**`--no-acl` is deliberately absent.** The grants are part of what is under
test: proof 2b reads `pg_proc.proacl` and requires an explicit
`authenticated=X` on `deal_room_propose` and `deal_room_admit_participant`.
Those grants come from historical migrations — `20260731g` only
`create or replace`s the two functions, which preserves an existing ACL and
cannot invent one. A dump that omitted `GRANT`s would restore them with a null
ACL and fail 2b for a reason belonging to the dump rather than to the boundary.

## Secret handling

Create a temporary repository secret only for the proof run:

| Field | Value |
|---|---|
| Name | `PONTE_SCHEMA_SOURCE_DATABASE_URL` |
| Secret | the production Supavisor Session pooler URI |

Use the Session pooler URI on port `5432`:

```text
postgresql://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres
```

Do not use the direct IPv6 endpoint. Do not use the transaction pooler on port
`6543`. Delete the secret immediately after the run finishes, whether it passes
or fails.

## Dispatch

Run exactly once from:

```text
Actions -> Deal Room admission gate proof -> Run workflow
```

Use:

| Field | Value |
|---|---|
| Use workflow from | `main` |
| `target_sha` | `ba9c184aba1f59c9728a2cb308b6a4d5dbf09d19` |
| `confirm` | `PROVE` |

Do not select the feature branch. For `workflow_dispatch`, the branch selector
chooses the workflow definition. The workflow therefore refuses to run unless
`GITHUB_REF` is exactly `refs/heads/main`.

## Expected gates

Before the source secret is used, the job must pass:

```text
Confirm the dispatch was deliberate
Refuse to run from anywhere but main
Validate target_sha
Check out the commit under test, and only that commit
The checkout is exactly the requested commit
The commit under test carries the reviewed migration, byte for byte
The commit under test supplies no workflow definition of its own
The source secret reaches exactly one step, and is never printed
```

Then it starts a local Supabase stack, takes the schema-only public dump, rejects
any data markers, restores the schema locally, confirms key business tables and
`auth.users` are empty, and runs `npm run deal-room:gate-proof` against the local
stack only.

## Interpreting results

A green run should include the proof's numbered `ok` lines through rollback.
Only after that should the PR body and database-state docs be updated to say the
migration has been executed against a production-equivalent schema. A green run
is not authority to apply SQL to production.

A red run must not be rerun blindly. Record the failed step, final error lines,
and whether `Destroy the ephemeral stack` succeeded, then delete the temporary
secret.
