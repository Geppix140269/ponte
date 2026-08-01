# Running the Deal Room admission gate proof

Operational runbook for `.github/workflows/deal-room-gate-proof.yml`.

## Current status

Workflow run #2 proved the dispatch path and source credential work, then failed
safely before restore/proof because `supabase db dump --schema public` emitted
data markers. The temporary GitHub secret was deleted afterward. PR #198 remains
open and unmerged; no SQL has been applied to production.

The workflow now uses direct `pg_dump --schema-only --schema=public` so the dump
is truly schema-only before it is restored into the ephemeral local stack.

## What touches production

One command, in one step:

```bash
pg_dump \
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
