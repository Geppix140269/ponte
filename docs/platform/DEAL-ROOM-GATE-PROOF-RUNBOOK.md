# Running the Deal Room admission gate proof

There are two routes. **Prefer the replay route.** The dump route exists only to
answer a question the replay route cannot.

| | Replay route | Dump route |
|---|---|---|
| Workflow | `deal-room-migration-replay.yml` | `deal-room-gate-proof.yml` |
| Schema source | the repository's own migration history | production, via schema-only `pg_dump` |
| Secret required | **none** | `PONTE_SCHEMA_SOURCE_DATABASE_URL` |
| Touches production | **never** | one read-only dump |
| Repeatable | yes, on every pull request | one-use, by hand |
| Proves | the migration works against the schema the repo *claims* production has | the migration works against the schema production *actually* has |

Run the replay route first. It costs nothing and needs no credential, so there
is no reason to spend a production connection before it is green. Reach for the
dump route only when the question is specifically **drift** — whether production
has diverged from the migration history.

## The replay route

```text
Actions -> Migration replay proof -> Run workflow
```

Leave `target_sha` blank to test the selected branch, or paste a full SHA to
test a specific commit. It also runs automatically on any pull request touching
`supabase/migrations/**`, `lib/deal-room/**` or the proof script.

Three phases, so a failure is always attributable:

1. **Historical replay** — every migration except the gate migration is applied
   to an empty PostgreSQL 17 database, one file at a time, in filename order.
   A failure here is a finding about the migration history, not about the gate.
2. **Gate migration** — `20260731g` is applied on top, then applied a second
   time to check it is safely repeatable after a partial failure.
3. **Proof** — `npm run deal-room:gate-proof` against that schema.

If the gate migration is absent from the tree under test, phase 1 still runs and
reports on its own. Dispatching against `main` is therefore a valid way to ask
"does our migration history replay?" without involving the Deal Room work at all.

The workflow asserts in its first step that it references no secret, and fails
if that ever stops being true. That single invariant is what replaces the
credential guards the dump route needs.

The grants proof (2b, which reads `pg_proc.proacl`) works naturally here: the
grants come from the historical migrations, which this route replays in full
rather than reconstructing from a dump.

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
