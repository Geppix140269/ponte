# Running the Deal Room admission gate proof

Operational runbook for `.github/workflows/deal-room-gate-proof.yml`.

**Status: never run.** The workflow exists and has not been dispatched. Until it
has, `supabase/migrations/20260731g_deal_room_admission_verification_gate.sql`
is written, unapplied and unproved.

## What this proves, and why it needs a database

The migration changes three `security definer` command surfaces that are granted
to `authenticated`. A member with a session can call them directly over
PostgREST without ever loading the page that holds the TypeScript gate, so the
durable boundary is the database and only a database can prove it holds.

`scripts/deal-room-admission-gate-proof.mjs` applies the migration, drives the
inadmissible and admissible paths at both doors by calling the granted commands
directly, and rolls everything back. It needs a **production-equivalent schema**
and no data at all.

## Why not Supabase Branching

Branching requires a paid plan. This workflow reaches the same place on a
GitHub-hosted runner: an ephemeral local Supabase stack whose `public` schema is
replaced by a schema-only dump of production's.

## What touches production, exactly

One command, in one step:

```
supabase db dump --db-url "$SOURCE_DB_URL" --schema public -f <file>
```

Schema-only — no `--data-only`, so DDL and nothing else — and `--schema public`,
so `auth`, `storage` and every other schema stay behind. **No table data, no
auth users, no storage objects, no business records.** Nothing writes to the
source.

The job then asserts the dump contains no `COPY`, no `INSERT`, no `\.` data
marker and no data section before restoring it, so "schema-only" is checked
rather than trusted. After restoring, it asserts `profiles`, `listings` and
`auth.users` are all empty, and refuses to continue if they are not.

Three self-checks run before anything connects:

1. exactly one step reads the secret;
2. its value is never echoed, printed or `cat`-ed;
3. it is never handed to `psql`, `db push`, `db reset`, `db execute` or
   `migration up` — the dump is its only permitted use.

## What the owner must do

### 1. Create the secret

**Repository → Settings → Secrets and variables → Actions → New repository secret**

| Field | Value |
|---|---|
| Name | `PONTE_SCHEMA_SOURCE_DATABASE_URL` |
| Secret | the production Postgres connection string |

Use the **direct connection** string from
**Supabase → Project Settings → Database → Connection string → URI**, with the
database password substituted in. GitHub masks it in all logs from the moment it
is saved.

A read-only role is sufficient and preferable: the only operation is a dump. If
one exists, use it.

### 2. Dispatch the workflow, once

**Actions → Deal Room admission gate proof → Run workflow**

- Branch: `claude/deal-room-verification-gate`
- `confirm`: type `PROVE`

The confirm input exists so an accidental click does nothing.

### 3. Read the result

The job prints every preflight line and every proof result. Expect, in order:

```
ok    0. the database carries the production-equivalent schema
ok    1. the migration applies cleanly
ok    2a. exact signatures, and no overload
ok    2b. the four commands are granted; the two helpers are not
ok    3. the fixture is synthetic and isolated from any existing data
ok    4. an inadmissible opener is refused by the command itself
ok    5a. the opener can record their declaration
ok    5b. the admissible opener path succeeds
ok    5c. the opener's seats carry their own words, not 'Deal owner'
ok    6. an inadmissible invitee is refused by the command itself
ok    7. a stale agreement version does not satisfy admission
ok    8. the admissible invitee path succeeds
ok    9. rollback removed every migration object and every synthetic row
```

**Exit 3 with `SCHEMA MISMATCH`** — the restored schema is missing something the
proof needs. The message names the exact table, function, column or index. Do
not repair unrelated historical migrations to make it pass; report it.

**Exit 1 with a `FAIL` line** — a proof did not hold. The line names the
assertion and prints what the database actually said. Do not weaken the proof or
the gate; report it.

## What happens to the environment

The ephemeral stack is stopped with `supabase stop --no-backup` in an
`if: always()` step, so it is destroyed on success, on failure and on
cancellation. The scratch directory and the dump file are deleted in the same
step. The runner itself is discarded by GitHub regardless.

Nothing is committed to any database: the proof runs inside one transaction that
is always rolled back, and step 9 re-reads the catalogue and every synthetic id
to prove the rollback worked.

## After a green run

Update, truthfully and in the same pass:

- `scripts/deal-room-admission-gate-proof.mjs` — the `STATUS: WRITTEN, NEVER
  EXECUTED` banner;
- `docs/codex/DATABASE-STATE.md` — the "Execution status" section, with the
  database class used, the timestamp, the result and a link to the run;
- the PR body's execution-status section.

A green run proves the boundary holds against a production-equivalent schema. It
is **not** authority to apply the migration to production, which remains a
separate owner approval under `AGENTS.md`.
