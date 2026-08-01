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

### 0. Get the workflow onto `main` first — it cannot be dispatched from a branch

GitHub registers a `workflow_dispatch` workflow only when the file exists on the
**default branch**. Verified on 31 July 2026 while this file was written: with
the workflow present on `claude/deal-room-verification-gate` and pushed,
`GET /repos/Geppix140269/ponte/actions/workflows/deal-room-gate-proof.yml`
returns **404**, and it does not appear in `gh workflow list`. There is no
**Run workflow** button to press, on any branch, until it is on `main`.

That is a property of GitHub, not of this workflow, and no wording change fixes
it.

**The pull request you are reading this in is that step.** It carries exactly
two files — this runbook and the workflow — and nothing else: no application
code, no migration, no proof script, no package change. The workflow is inert
until three separate things are true — the secret exists, somebody dispatches it
manually, and they type `PROVE` — so merging it changes no behaviour, runs
nothing and deploys nothing.

The alternative was to defer the proof until PR #198 itself merged, which would
mean applying an unproved boundary first. Landing the workflow separately is the
only order that proves the gate before it lands. **Merging this is the owner's
call; PR #198 stays open and unmerged either way.**

Once the workflow is on `main`, dispatch it **from `main`** and name the commit
to test in the `target_sha` input — never by selecting the feature branch. See
step 2 for why: the branch selector chooses the workflow definition, not just
the tree, and a feature branch must never supply the code that handles the
production credential.

### 1. Create the secret

**Repository → Settings → Secrets and variables → Actions → New repository secret**

| Field | Value |
|---|---|
| Name | `PONTE_SCHEMA_SOURCE_DATABASE_URL` |
| Secret | the production Postgres connection string |

Use the **Session pooler (Supavisor)** URI, on **port 5432**:

**Supabase → Project Settings → Database → Connection string → Session pooler**

```
postgresql://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres
```

**Not the direct connection.** The direct endpoint
(`db.<project-ref>.supabase.co:5432`) resolves to IPv6 only unless the project
carries the IPv4 add-on, and a GitHub-hosted runner cannot be assumed to have
IPv6 egress. A dump against it would fail to connect — and a network failure at
that point looks nothing like what it is, which wastes a run and a review cycle.
The Session pooler is reachable over IPv4.

**Session mode, not Transaction mode.** Port 5432 is Session; port 6543 is
Transaction. `supabase db dump` runs `pg_dump`, which needs session-scoped state
that Transaction mode does not provide.

Substitute the database password into the URI. GitHub masks the value in all
logs from the moment it is saved. The workflow accepts any PostgreSQL URI and
needs no change for this.

A read-only role is sufficient and preferable: the only operation is a dump. If
one exists, use it.

### 2. Dispatch the workflow, once

**Actions → Deal Room admission gate proof → Run workflow**

| Field | Value |
|---|---|
| **Use workflow from** | **`main`** — never a feature branch |
| `target_sha` | the controller-approved immutable PR #198 head, as a full 40-character commit SHA |
| `confirm` | `PROVE` |

**Why the branch selector must be `main`.** For `workflow_dispatch`, GitHub runs
the workflow **definition at the dispatched ref**. Choosing a feature branch
would execute *that branch's* copy of this workflow while the production
database secret is available to it — so an unmerged branch could rewrite what
happens to the credential, and the review that approved this file would have
approved nothing. The workflow refuses to start unless `GITHUB_REF` is exactly
`refs/heads/main`, and it fails there before the secret is reachable.

The commit under test therefore arrives as `target_sha` instead: `main` supplies
the definition, `target_sha` supplies the tree. It must be a full 40-character
lowercase hex SHA — a branch name, a tag or an abbreviated SHA is rejected,
because each is a moving or ambiguous pointer and the point of this input is
that the tree cannot change between approval and execution.

Get the value from the PR page, or:

```bash
gh pr view 198 --repo Geppix140269/ponte --json headRefOid --jq .headRefOid
```

After checkout the job prints `git rev-parse HEAD` and stops unless it equals
`target_sha`, then verifies the migration's SHA-256 against the reviewed value —
both before `npm ci`, before the Supabase stack starts and long before the
source database is contacted.

The confirm input exists so an accidental click does nothing.

### 3. Read the result

Four gates run first, all of them before the secret is reachable: the `PROVE`
confirmation, the `refs/heads/main` check, the 40-hex `target_sha` validation,
and — after checkout — `git rev-parse HEAD` matched against `target_sha`
followed by the migration checksum. Any of them failing stops the run without
the source database being contacted.

Then the job prints every preflight line and every proof result. Expect, in
order:

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
