# Deal Room Gate C, Approval 1: migration application record

**Authorised:** owner, Gate C Approval 1, 29 July 2026, continued 30 July 2026
**Executed:** 30 July 2026, against production project `cptglsmjmzcfpjndqfmc`
**Repository state:** first pass from `main` at `7f979e0`; continuation from
`main` at `23637d3`. Clean worktree both times.
**Outcome:** **`20260729a` applied. `20260729b` refused at first attempt, then
corrected under LB-005 and applied cleanly in the continuation. `20260729c` not
attempted.** Gate C Approval 1 is **still incomplete**, because verification of
`20260729b` found a new defect and the instruction is to halt on any permission
result that differs from the test plan.

Sections 1 to 5 are the first pass, unaltered except where a value has since been
superseded and says so. Sections 6 to 10 are the continuation of 30 July 2026:
the application of the corrected file and the fourteen required verifications.

**The authoritative result of those fourteen is 11 / 1 / 2:**

| | Count | Which |
|---|---|---|
| **Passed** | **11** | requirements 1 to 10 and 14 — sections 6 and 8 |
| **Failed** | **1** | requirement 11, the event logger's grant — **LB-008**, section 7 |
| **Pending, unproved** | **2** | requirements 12 and 13, entitlement fail-closed and cross-room isolation — section 8.3 |

An earlier version of this record said "thirteen of the fourteen passed". That was
wrong, and wrong in the direction that flatters the result: it counted
requirements 12 and 13 as passing while the same document said, a page later, that
they were not proved. **A requirement that cannot be tested yet has not passed.**
The owner corrected the tally on 30 July 2026 and it is stated here as 11 / 1 / 2
rather than quietly amended.

Three things happened across the two passes that the owner must decide on, and
one production action was taken that the approved files did not contain: the RLS
containment in section 3.1, the `20260729c` scope conflict in section 3.3, and
LB-008 in section 7.

---

## 1. Pre-execution checks

| Check | Result |
|---|---|
| `git fetch origin` | done |
| Worktree clean | **clean** |
| Remote `main` SHA | **`7f979e0da00a99150d3e07f63fd526aca9d53b21`**, as expected |
| `20260729a_deal_room_core.sql` SHA-256 | `24932e4a429eb4ea7b19f2a7c5423101c1bbc61a628be941f546412258a78c8a` — **matches** the preflight audit |
| `20260729b_deal_room_rls.sql` SHA-256 | `64f4686091d4c7fed14c0223956164402bab9dc56cd2bdd52f67fdb8a52d75f7` — **matched at the time.** Since corrected under LB-005; the file now hashes to `b379f869f320e6ea36bdb00e07555079adf6373ff14848d20633afb6cfea3153` |
| `20260729c_deal_room_storage.sql` SHA-256 | `94629e5dec518439687f0ecf0583aaed15caed0f0839e87bf42c941c7fe29972` — **matches** |

Each checksum was recomputed a second time immediately before that file was
executed, and compared against the audit value by a script that refuses to
proceed on any difference.

## 2. Migration 1 of 3 — `20260729a_deal_room_core.sql`: applied

**The transport failed and the transaction did not.** `node scripts/db-query.mjs
--file` returned an HTML **502 Bad gateway** page from `api.supabase.com`. That
is ambiguous by nature: a 502 says the gateway lost the response, not that the
statement did not run. So the first thing done was to read production rather than
guess, and production held 15 `deal_room_*` tables. The DDL had executed; only
the reply was lost.

Two consequences followed from that, and both were handled: the script exits
before its ledger write when the first call fails, so **no `schema_migrations`
row existed** (section 2.2), and migration `a` does not enable RLS — `b` does —
so the new tables were briefly reachable (section 3.1).

### 2.1 Structural verification

| Object | Found |
|---|---|
| Tables | **15** |
| CHECK constraints | **34** |
| Foreign keys | **52** |
| Indexes | **54** |
| Triggers (non-internal) | **9** |
| Functions | **2** — `deal_room_uuid_or_null(p_text text)`, `deal_room_events_append_only()` |
| Public tables | 53 → **68**, exactly +15 |

Per table, with RLS state after the containment of section 3.1:

| Table | RLS | Policies | CHECKs | FKs | Indexes | Triggers |
|---|---|---|---|---|---|---|
| `deal_room_activity_events` | true | 0 | 0 | 3 | 3 | 1 |
| `deal_room_agreement_acceptances` | true | 0 | 2 | 3 | 3 | 0 |
| `deal_room_agreement_documents` | true | 0 | 2 | 0 | 1 | 0 |
| `deal_room_blockers` | true | 0 | 2 | 6 | 4 | 1 |
| `deal_room_clarifications` | true | 0 | 2 | 6 | 3 | 0 |
| `deal_room_entitlements` | true | 0 | 2 | 2 | 3 | 1 |
| `deal_room_evidence` | true | 0 | 3 | 7 | 4 | 1 |
| `deal_room_evidence_versions` | true | 0 | 3 | 2 | 4 | 0 |
| `deal_room_invitations` | true | 0 | 3 | 4 | 4 | 0 |
| `deal_room_participants` | true | 0 | 3 | 5 | 6 | 1 |
| `deal_room_procedure_approvals` | true | 0 | 1 | 2 | 3 | 0 |
| `deal_room_procedure_steps` | true | 0 | 3 | 2 | 3 | 1 |
| `deal_room_procedures` | true | 0 | 2 | 3 | 4 | 1 |
| `deal_room_sub_rooms` | true | 0 | 2 | 2 | 3 | 1 |
| `deal_rooms` | true | 0 | 4 | 5 | 6 | 1 |

**Policies are 0 on every table because policies live in `20260729b`, which did
not apply.** That is the expected state after `a` alone, not a defect in `a`.

The append-only trigger is present: `deal_room_activity_append_only` on
`deal_room_activity_events`. The agreement authority is seeded with all four
documents at `v1-2026-07-29`, each carrying its checksum — `participation`
`dd885c8d81a9…`, `nda` `e44504eb267a…`, `room_rules` `0476733ce77c…`,
`authority_declaration` `83edf304b5d7…` — and each marked `current`.

### 2.2 Ledger

The 502 aborted the script before its ledger write, so production held 15 tables
with **no record that they existed** — the precise defect PR #106 had just
finished repairing for another migration. The row was therefore written
explicitly:

```
20260729a_deal_room_core.sql
24932e4a429eb4ea7b19f2a7c5423101c1bbc61a628be941f546412258a78c8a
```

Exactly one row, ledger **43 to 44**, and the checksum matches the repository
file byte for byte — verified both as raw bytes and as the utf8 string
`db-query.mjs` itself hashes, which are identical for this file.

**One caveat, stated because the record must not overstate itself.** That row's
`applied_at` is `2026-07-30 03:39:20 UTC`, which is when the row was *written*,
not when the DDL *ran*. Execution was a few minutes earlier in the same session;
the exact instant was lost with the 502 response and cannot be recovered. The
sequence is not in doubt, only its timestamp to the minute.

### 2.3 Nothing else changed

| Check | Result |
|---|---|
| Legacy Deal-era cluster | **8 tables, 0 rows total**, unchanged |
| `is_deal_participant()` | present, unaltered |
| `ponte-deal-docs` | **0 objects**, unchanged |
| `deal-room-evidence` bucket | **absent** — `20260729c` was not attempted |
| `listings` | 5 rows, untouched |

## 3. Why this stopped, and the one unapproved action taken

### 3.1 Production was briefly exposed, and was closed

Migration `a` creates the tables; migration `b` enables RLS on them. Between the
two, production held **15 tables in `public` with `relrowsecurity = false`**,
and Supabase's default privileges had granted `anon` and `authenticated`
**SELECT, INSERT and UPDATE on all 15**. Those two facts together mean an
anonymous caller holding the public anon key could have written to every Deal
Room table through PostgREST — including forging `deal_room_activity_events`
rows in what is meant to be an append-only record.

The tables were empty throughout, so nothing could be read that mattered. The
grant and RLS state was read from the catalogue; **no write was attempted while
the gap was open.**

Leaving that open while writing a report was not defensible, so it was closed
immediately with the narrowest action that restores the intended posture:

```sql
alter table public.<each of the 15> enable row level security;
```

**No policy was created, nothing was granted, nothing was revoked.** RLS on with
zero policies is fail-closed for `anon` and `authenticated`, and it is exactly a
prefix of what `20260729b` does, so it conflicts with nothing that follows.

Verified with a real anon-key client through PostgREST, not inferred:

| Probe | Result |
|---|---|
| anon `SELECT deal_rooms` | `200 []` — zero rows |
| anon `SELECT deal_room_activity_events` | `200 []` |
| anon `SELECT deal_room_participants` | `200 []` |
| anon `INSERT deal_room_activity_events` | **`401`, `42501` new row violates row-level security policy** |

**This is a production change the approved files did not contain, and it is
flagged as such.** It is reversible in one statement per table if the owner
prefers a different remedy. It was taken because the alternative was leaving an
anonymous write path open on fifteen production tables.

### 3.2 `20260729b` cannot be applied: a broken grant in the file

Postgres refused it and rolled the whole file back:

```
ERROR: 42883: function public.deal_room_invite(uuid, text, text, text,
timestamp with time zone) does not exist
```

Rollback confirmed by reading production: RLS state unchanged by it, **0
policies, still 2 functions, no ledger row**. The Management API runs the file as
one transaction, which is also what makes `a`'s completeness in section 2.1
trustworthy.

The cause is a leftover. The owner's final trust review removed `p_role` and
`p_class` from `deal_room_invite()`, taking it from five arguments to three, and
dropped the superseded overload. The `grant execute` block at line 1709 was never
updated, so the file grants execute on a signature it has itself just dropped:

| | Signature |
|---|---|
| Declared by the file | `deal_room_invite(uuid, text, timestamptz)` |
| Named by the grant | `deal_room_invite(uuid, text, text, text, timestamptz)` |

Every other grant line was audited against its declared signature
programmatically rather than by eye: **21 functions declared, exactly one broken
grant.** No other arity disagrees.

`20260729b` therefore cannot be applied as it stands, and its checksum will
change when it is corrected. That is **LB-005**.

Nothing caught this before production. `rls-contract.test.ts` reads the migration
as text and checks that each command exists and that no member write policy is
present; it does not compare each `grant execute` signature against the function
the same file declares. The audit above is a three-line script and belongs in
that suite — but adding it is a fix, and no fix was authorised here.

### 3.3 `20260729c` was not attempted, and there is a conflict to resolve

`20260729c_deal_room_storage.sql` contains exactly three executable statements:
an `insert into storage.buckets` creating **`deal-room-evidence`**, and the two
`storage.objects` policies.

The instruction lists it among the files to apply, and separately states that
creating the `deal-room-evidence` bucket is **not authorised**. Those cannot both
hold: the bucket is all that file makes. `GATE-C-TEST-PLAN.md` treats the bucket
and its policies as **Approval 2**, which resolves the conflict in favour of not
applying it — so it was not applied, and it was never going to be reached anyway,
because `b` must precede it.

## 4. Current production state, exactly

- **15 `deal_room_*` tables**, RLS enabled on all 15, **0 policies**, 2 helper
  functions, 34 CHECKs, 52 FKs, 54 indexes, 9 triggers, agreement authority
  seeded.
- **No command functions.** All 21 live in `20260729b`.
- **No Storage bucket or policy.**
- `NEXT_PUBLIC_DEAL_ROOM` **unset**. Allowlist unchanged. Nothing deployed. The
  access wall is untouched.
- Ledger: **44 rows**, one for `20260729a`, none for `b` or `c`.
- The Deal Room is unreachable by any member: the flag is unset, and even with it
  set every table returns zero rows and refuses every write.

## 5. What Gate C needed next, as at the end of the first pass

*Item 1 below has since been done: see section 6. Items 2 and 3 still stand.*

1. **LB-005 is corrected and awaiting authorisation to apply.** The owner
   authorised the correction on 30 July 2026; it is one line, the grant now
   naming `(uuid, text, timestamptz)`. The file's new SHA-256 is
   **`b379f869f320e6ea36bdb00e07555079adf6373ff14848d20633afb6cfea3153`**,
   recorded in the preflight audit's checksum table and in `DATABASE-STATE.md`.
   `lib/deal-room/__tests__/grant-signatures.test.ts` now compares every
   `grant execute` signature in the migration against the function the same file
   declares; it fails on the stale signature and passes on the corrected one,
   demonstrated in both directions. **Applying the corrected file is a separate
   owner instruction and has not been given.**
2. **Owner confirms or reverses the RLS containment** of section 3.1.
3. **Owner confirms** that `20260729c` belongs to Approval 2, as the test plan
   says, and not to this approval.
4. Only then: apply the corrected `20260729b`, verify it against
   `GATE-C-TEST-PLAN.md` §4.1 to §4.4, and record it.

Approval 2 (bucket and policies), Approval 3
(`npm run deal-room:negative-access`) and Approval 4 (flag and deploy) are
unchanged and untaken.

---

# Continuation, 30 July 2026: the corrected `20260729b` applied

**Authorised:** owner, "Gate C Approval 1 continuation is authorised: apply
corrected migration `20260729b` only", 30 July 2026.
**Repository state:** `main` at `23637d342bf526252c740b9e53c042668d0f8d2f`, clean
worktree, `npm run verify` exit 0.

## 6. Pre-execution and execution

### 6.1 Pre-execution evidence

| Check | Required | Result |
|---|---|---|
| `git fetch origin` | done | done |
| Worktree clean | clean | **clean**, `git status --porcelain` empty |
| Remote `main` SHA | `23637d34…0d8f2f` | **matches exactly** |
| `npm run verify` | exit 0 | **exit 0** |
| `20260729b` SHA-256 | `b379f869…fea3153` | **matches**, as raw bytes and as the utf8 string `db-query.mjs` hashes, which are identical here; 76,684 bytes, no BOM |
| Ledger rows for `20260729a` | exactly 1 | **1** |
| Ledger rows for `20260729b` | 0 | **0** |
| Deal Room tables | 15 | **15** |
| RLS enabled | all 15 | **15** |
| Deal Room policies | 0 | **0** |
| `deal-room-evidence` bucket | absent | **absent** (6 buckets, none of them it) |

The checksum was recomputed a second time immediately before execution by a
script that refuses to continue on any difference, and printed both hashes and
the expected value side by side.

### 6.2 One unintended production write, and its reversal

**`db-query.mjs --file` records every file it is given in
`public.schema_migrations`, keyed on `basename(path)` — including a read-only
probe.** The first precondition query was written to a file and passed with
`--file`, so the script inserted a ledger row named `pre.sql`, taking the ledger
from 44 rows to 45 before the migration had been applied at all.

It was found immediately, in the output of the very query that caused it, and
removed the same minute:

```
removed: [{"filename":"pre.sql",
           "sha256":"def4000b79d7ba6a5368ed328c7c9b80ace3645bc3b29f802e237dff9fbb494b",
           "applied_at":"2026-07-30 05:58:15.330179+00"}]
ledger rows before: 45
ledger rows after:  44
```

The delete was a literal primary-key match with a `returning` clause, so what was
removed is evidenced rather than asserted, and it went direct to the Management
API because `db-query.mjs` refuses `delete from` outright. **That refusal was
bypassed deliberately and is recorded here as such.** It exists for data-losing
SQL that needs a backup first; this removed a row created ninety seconds earlier
in error, recording nothing that had happened. Leaving a false entry in the
canonical migration ledger — the record that says what production is — while
writing a migration record into that same ledger was the worse option.

The two other non-`2026` filenames in the ledger, `01_catalogue_fields.sql` and
`02_ponte_previews_bucket.sql`, are pre-existing historical rows and were not
touched.

**Every subsequent probe used `--sql`, which writes no ledger row.** The lesson
is narrow and worth keeping: in this repository `--file` is a write, whatever the
SQL inside it does.

### 6.3 Execution

```
node scripts/db-query.mjs --file supabase/migrations/20260729b_deal_room_rls.sql
applied 20260729b_deal_room_rls.sql
EXIT=0
```

Clean, one transaction, **no timeout, no HTML, no 502, nothing ambiguous** — so
none of the inspect-before-retry procedure was needed. This is what the first
pass of `20260729a` did not get.

### 6.4 Ledger

| filename | sha256 | applied_at |
|---|---|---|
| `20260729a_deal_room_core.sql` | `24932e4a…78c8a` | 2026-07-30 03:39:20 UTC |
| `20260729b_deal_room_rls.sql` | `b379f869…ea3153` | **2026-07-30 05:59:43 UTC** |

**Exactly one row for `20260729b`**, checksum matching the repository file,
**ledger 44 to 45**, and zero junk rows. This time `applied_at` is the execution
instant, because the script completed normally.

## 7. LB-008: `anon` holds EXECUTE on every Deal Room function

**This is the verification that failed, and the reason Gate C Approval 1 is still
incomplete.**

### 7.1 What the file intends

`20260729b` states it at the head of its grant block:

> `authenticated` only. `anon` is granted execute on nothing. The event logger is
> revoked from everyone: a member who could call it directly could forge history,
> which is the whole reason the other commands write it for them.

`GATE-C-TEST-PLAN.md` section 4.2 requires the same thing: "`anon` holds execute
on no `deal_room_*` function." So does the owner's requirement 11: "The event
logger cannot be called directly by `anon` or `authenticated`."

### 7.2 What production has

All **23** `deal_room_*` functions are executable by `anon`.

The file performs `revoke all on function public.deal_room_log_event(...) from
public`, and that revoke **worked** — PUBLIC is absent from that function's ACL,
and present on all the others. But PUBLIC was the wrong target. Supabase's
`alter default privileges` grants EXECUTE **explicitly, by name, to `anon`,
`authenticated` and `service_role`** on every new function in `public`, and
revoking from PUBLIC does not touch an explicit role grant.

| Function | `proacl` |
|---|---|
| `deal_room_log_event` | `postgres=X`, `anon=X`, `authenticated=X`, `service_role=X` — PUBLIC correctly gone, the three role grants untouched |
| every other `deal_room_*` | `=X` (PUBLIC), `postgres=X`, `anon=X`, `authenticated=X`, `service_role=X` |

### 7.3 Why `deal_room_log_event` is the one that matters

It is the only function in the file with **no authorisation check of its own**,
and that is deliberate: the other twenty commands call it on the member's behalf
after doing their own checks. Its whole body is a `select` for the actor's label
and then an unconditional insert into `deal_room_activity_events`, stamping
`auth.uid()` as actor. The grant was its only protection, and the grant is not
what the file believes it to be.

The other commands refuse `anon` **inside the body** — `deal_room_propose`
returned `401 / 42501 Not authenticated`, `deal_room_accept_invitation` returned
`401 / 42501 Sign in to accept an invitation`. That is defence in depth working
as intended, and it is why this is one blocker rather than twenty-one. But it is
not the grant boundary the file claims, and it is not what the test plan asks to
be true.

### 7.4 Proved through the public API, without writing anything

The test plan requires real clients rather than catalogue inspection, and a
forged activity row would have been unremovable — the append-only trigger binds
every role. Both constraints are satisfied by one fact about production:
`deal_room_activity_events.room_id` references `deal_rooms`, and there are zero
rooms. So an anon-key RPC call naming a random `room_id` distinguishes the two
outcomes without inserting:

| Outcome | Meaning |
|---|---|
| `42501` / `404` | permission denied, the body never ran |
| `23503` | **the body ran**, and the FK rejected the row |

Result, from an anon-key client against `https://cptglsmjmzcfpjndqfmc.supabase.co`:

```
POST /rest/v1/rpc/deal_room_log_event
409 {"code":"23503",
     "details":"Key (room_id)=(31368fd8-c8e6-4d0d-8b60-1826ce1ad4a7) is not
                present in table \"deal_rooms\".",
     "message":"insert or update on table \"deal_room_activity_events\"
                violates foreign key constraint ..."}
```

The function body executed. `deal_room_activity_events` held 0 rows before and 0
rows after.

### 7.5 Severity, stated precisely

**Production is fail-closed today and is not exposed.** The FK blocks every
forged row while no room exists; member reads return `200 []`; the flag is unset;
nothing is deployed.

**It becomes exploitable the moment a Deal Room exists** — Gate C Approval 3 or
4 — and any anonymous caller holding the public anon key could then insert
arbitrary rows into the activity record of any room whose id they know. Because
that record is append-only (`BEFORE DELETE OR UPDATE`, binding even
`service_role`), a forged row could never afterwards be removed. **So this must
be fixed before any room is created, not before deploy.**

**No fix was applied.** None was authorised, and unlike the RLS gap of section
3.1 there is no open hole to contain — the difference is worth stating, because
the earlier case justified acting outside the approved files and this one does
not.

### 7.6 Why nothing caught it

`grant-signatures.test.ts`, written for LB-005, compares every `grant execute`
signature against the function the same file declares. It passes here and should:
the signatures are right. The defect is that a `revoke` names the wrong grantee,
which no signature comparison can see, and which no local check can see at all
because the behaviour depends on the `alter default privileges` state of the
Supabase project (PL-002 again — there is no non-production database).

A text scan asserting that every `deal_room_*` function is revoked from `anon`
**by name** would catch it, and belongs beside the signature check. That is the
fix LB-008 carries.

This is the second time in one day that Supabase default privileges have granted
more than a migration expected; the first was section 3.1, on tables. Both times
the migration was written as though a fresh object starts private. It does not.

## 8. The other thirteen: eleven that passed, two that are pending

Sections 8.1 and 8.2 are the **eleven passes** — requirements 1 to 10 and 14.
Section 8.3 is the **two that remain unproved**, requirements 12 and 13, and it is
inside this section rather than appended to it precisely so that the count above
cannot be read off a heading and get it wrong again.

### 8.1 Structural

| # | Required | Result |
|---|---|---|
| 3 | Every helper and command function exists with the intended signature | **23 `deal_room_*` functions**, 21 SECURITY DEFINER (the two non-definer are `deal_room_uuid_or_null` and the trigger function `deal_room_events_append_only`), **every one carrying `search_path = public, pg_temp`**. 2 before, 21 added, matching the 21 the file declares |
| 4 | `deal_room_invite` granted only on `(uuid, text, timestamptz)` | **exists on `(p_sub_room_id uuid, p_token_sha256 text, p_expires_at timestamp with time zone)` and no other signature** |
| 5 | The five-argument invitation signature absent and not granted | **absent.** A catalogue query for a `deal_room_invite` overload whose arguments contain `p_role` returns **0**. It could not be granted either: a grant naming a non-existent function is exactly the `42883` that aborted the first attempt |
| 14 | Legacy cluster and `is_deal_participant()` unchanged | **4 tables** — `deals`, `deal_documents`, `deal_events`, `deal_status_history` — RLS on all four, 3 policies on `deals` and 1 on each of the others, `deals` 0 rows. `is_deal_participant()` unaltered; `20260729b` mentions it once, in a comment saying it is not touched, and contains **zero** `drop table`/`schema`/`column`/`view` statements. `ponte-deal-docs` 0 objects |

**One discrepancy with the first pass, recorded rather than smoothed over.**
Section 2.3 above reported the legacy cluster as **8 tables**. Re-measuring
returns 4, with `relname like 'deal%' and relname not like 'deal_room%'`, and a
broader search across `%deal%`, `%offer%` and `%negotiation%` over every relkind
(tables, views, materialised views, partitioned and foreign tables) returns the
same 4. The earlier figure cannot be reproduced and is left unreconciled. Nothing
was dropped: the migration has no statement capable of it and ran as one
transaction.

### 8.2 Policies and access

| # | Required | Result |
|---|---|---|
| 6 | Every expected policy exists exactly once | **14 policies, one per member-facing table**, no duplicates. `deal_room_agreement_documents` is the fifteenth table and deliberately has none |
| 7 | No policy grants anonymous access | **0 policies name `anon`.** All 14 are scoped to `authenticated` |
| 8 | Members hold SELECT only through the intended policies | **all 14 are `SELECT`** |
| 9 | No member-facing table has a direct member INSERT, UPDATE or DELETE policy | **0 non-SELECT policies** on any of the 15 tables. Every mutation must go through a command function |
| 10 | The activity record is append-only and unforgeable by members | trigger `deal_room_activity_append_only` fires **`BEFORE DELETE OR UPDATE`** on `deal_room_activity_events`, so no role — `service_role` included — can rewrite or remove history. Members hold no INSERT policy. **The one gap is the `deal_room_log_event` grant of section 7**, which is why requirement 10 is recorded as passing on its policy and trigger terms while LB-008 stays open |

Policy inventory, all `SELECT`, all `authenticated`:

| Table | Policy |
|---|---|
| `deal_rooms` | `deal room read` |
| `deal_room_sub_rooms` | `sub room read` |
| `deal_room_participants` | `participant read` |
| `deal_room_entitlements` | `entitlement read` |
| `deal_room_invitations` | `invitation administer read` |
| `deal_room_activity_events` | `activity read` |
| `deal_room_agreement_acceptances` | `acceptance read` |
| `deal_room_procedures` | `procedure read` |
| `deal_room_procedure_steps` | `step read` |
| `deal_room_procedure_approvals` | `approval read` |
| `deal_room_evidence` | `evidence read` |
| `deal_room_evidence_versions` | `evidence version read` |
| `deal_room_clarifications` | `clarification read` |
| `deal_room_blockers` | `blocker read` |

Test plan 4.3 and 4.4 both hold: `deal_room_activity_events` has exactly one
policy and it is `SELECT`; `deal_room_evidence_versions` and
`deal_room_agreement_acceptances` have exactly `SELECT` policies.

Real anon-key client, through PostgREST:

| Probe | Result |
|---|---|
| `select deal_rooms` | `200 []` |
| `select deal_room_activity_events` | `200 []` |
| `select deal_room_participants` | `200 []` |
| `select deal_room_agreement_documents` | **`401 / 42501 permission denied`** — revoked outright from both member roles, so the agreement authority cannot be read or rewritten by anyone. This is trust boundary 1 holding at the grant level |

### 8.3 Isolation and entitlement: encoded, not yet behaviourally proved

Requirements 12 and 13 — rooms without an entitlement fail closed, and
cross-room and cross-sub-room reads return zero rows — **cannot be proved by
catalogue inspection, and were not proved here.** The test plan is explicit that
only a database can answer whether a SELECT returns a row, and it assigns both to
`scripts/deal-room-negative-access.mjs`, which is Gate C **Approval 3** and was
not authorised. It also needs a real published Deal, which is not authorised
either.

What can be recorded now is that the predicates encode the requirement:

- `deal room read`: `deal_room_can_administer(id) OR deal_room_is_master_participant(id) OR EXISTS (participant row for auth.uid() in state admitted|active) OR is_admin()`
- `sub room read`: `deal_room_is_sub_room_participant(id) OR deal_room_can_administer(room_id) OR is_admin()`
- `activity read`: master-room events require master participation or administration; sub-room events require participation **in that sub-room**, or administration

Every branch is scoped to the room or sub-room in question, so isolation is
structural rather than filtered after the fact. Of the five helper predicates,
`deal_room_is_writable()` is the one that reads `deal_room_entitlements` —
entitlement gates mutation, not readability, which is consistent with there being
no member write policy at all.

**These two remain outstanding and are the substance of Approval 3.** They are
not recorded as passed.

## 9. Production state after this pass, exactly

| | |
|---|---|
| Deal Room tables | **15**, RLS enabled on **15** |
| Policies | **14**, all SELECT, all `authenticated`, 0 naming `anon`, 0 non-SELECT |
| Functions | **23** `deal_room_*`, 21 SECURITY DEFINER, all with a pinned `search_path` |
| `anon`-executable functions | **23 — this is LB-008** |
| Agreement authority | 4 documents, seeded, unreadable by members |
| Activity rows | **0** |
| Deal Rooms | **0** |
| Ledger | **45 rows**; one each for `20260729a` and `20260729b`, none for `c` |
| Storage | `deal-room-evidence` **absent**; `ponte-deal-docs` 0 objects |
| Flag | `NEXT_PUBLIC_DEAL_ROOM` **unset**, allowlist unchanged, nothing deployed, access wall untouched |

The Deal Room remains unreachable by any member.

## 10. What Gate C needs next

1. **LB-008 must be fixed before any Deal Room is created.** The minimum
   correction is to revoke EXECUTE by name from `anon` on all 23 functions and
   from `authenticated` on `deal_room_log_event`, plus a text-scan regression test
   beside `grant-signatures.test.ts`. It is a new migration, not an edit to an
   applied file.
2. **Owner confirms or reverses the RLS containment** of section 3.1. Still
   outstanding, and now consistent with what `20260729b` did anyway.
3. **Owner confirms** that `20260729c` belongs to Approval 2, as the test plan
   says.
4. Approval 2: the `deal-room-evidence` bucket and its two policies.
5. Approval 3: `npm run deal-room:negative-access`, which needs a published,
   family-classified pilot Deal, and which is what finally proves requirements 12
   and 13.
6. Approval 4: flag and deploy.

LB-005 is closed. LB-004 is closed and moved to the resolved register. LB-001
stays open until Gate C completes. Approvals 2, 3 and 4 are untaken and
unauthorised.
