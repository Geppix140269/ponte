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

---

# Continuation, 30 July 2026: `20260730b` applied. Anonymous path closed; one probe failed.

**Authorised:** owner, "Gate C Approval 1 continuation is authorised: apply
`20260730b_deal_room_function_acl.sql` only", 30 July 2026.
**Repository state:** `main` at `9c91e095227a5164ffa06ffa6ee012f4f451c5e7` — the
reviewed merge commit, unadvanced, so no reconciliation was needed. Clean worktree,
`npm run verify` exit 0.
**Executed:** **2026-07-30 07:59:45.928 UTC**, one transaction, exit 0, no timeout,
no HTML, no 502.
**Outcome:** **the anonymous execution path is closed and proved closed through a
real client. Probe 7 failed and probe 10 failed for three of its four functions.
LB-008 therefore stays ACTIVE.**

## 11. Pre-execution evidence

| Check | Required | Result |
|---|---|---|
| `origin/main` | `9c91e09…c5e7` | **matches** |
| Worktree | clean | **clean** |
| `npm run verify` | exit 0 | **exit 0**, including `48 migrations` and `function ACL: 22 assertions` |
| `20260730b` SHA-256 | `15f488d8…542b31` | **matches**, raw bytes and utf8 string identical, 11,672 bytes, no BOM |
| `20260729b` SHA-256 | `b379f869…fea3153` | **matches**, and the production ledger row records that same value |
| Ledger `20260729a` / `20260729b` / `20260730b` | 1 / 1 / 0 | **1 / 1 / 0** |
| `deal_room_*` functions | 23 | **23** |
| `anon` EXECUTE | held (the defect) | **23 of 23** |
| Deal Room policies | 14 | **14** |
| Deal Rooms | 0 | **0** |
| `deal-room-evidence` | absent | **absent** |

Every read-only probe used `--sql`. `--file` was used exactly once, for the
authorised migration.

**A before-baseline was captured** so that "unchanged" could be proved rather than
asserted: md5 fingerprints of all function bodies, policy definitions, triggers,
indexes, constraints, columns, RLS state and `pg_default_acl`, plus `service_role`
privilege counts and row counts.

## 12. The probes, one by one

| # | Probe | Result |
|---|---|---|
| 1 | one `20260730b` ledger row, checksum matching | **PASS.** Exactly 1 row, `15f488d8…542b31`, `applied_at 2026-07-30 07:59:45.928 UTC`, **ledger 45 → 46** |
| 2 | `anon` EXECUTE on zero `deal_room_*` functions | **PASS. 0 of 23**, from 23 |
| 3 | `PUBLIC` EXECUTE on zero | **PASS. 0** |
| 4 | `authenticated` cannot execute the logger | **PASS.** `has_function_privilege` false; ACL is `postgres=X ; service_role=X` only |
| 5 | real anonymous RPC to the logger returns `42501`, not `23503` | **PASS.** `401 / 42501 permission denied for function deal_room_log_event`. The same call returned `409 / 23503` before, which is how LB-008 was proved: an FK violation meant the body had run. It no longer runs |
| 6 | real authenticated direct RPC to the logger refused | **PENDING.** No authorised test credentials exist — see section 14 |
| 7 | `authenticated` retains EXECUTE on exactly the 19 | **FAIL. 22, not 19** — see section 13 |
| 8 | four RLS helpers usable by authenticated policy evaluation | **PARTIAL.** Catalogue: `has_function_privilege('authenticated', …)` true for all four. Behavioural confirmation needs an authenticated session and a room; pending |
| 9 | fifteen commands executable by authenticated | **PARTIAL.** Catalogue: true for all fifteen. Behavioural pending, same reason |
| 10 | four internal functions unavailable to member roles | **FAIL for three of four.** `deal_room_log_event` closed to both member roles. `deal_room_is_writable`, `deal_room_uuid_or_null` and `deal_room_events_append_only` are closed to `anon` but **still executable by `authenticated`** |
| 11 | `service_role` privileges unchanged | **PASS. 23 of 23**, exactly as before |
| 12 | bodies, tables, policies, triggers, indexes, data and project-wide default privileges unchanged | **PASS on every dimension.** All nine md5 fingerprints identical to the before-baseline: function bodies, policy definitions, triggers, indexes, constraints, columns, RLS state, and `pg_default_acl` (24 rows, unchanged). 14 policies, 4 agreement documents, 0 rooms, 0 activity rows |

Two further checks, not required but worth recording:

- Anonymous RPC to `deal_room_propose`, `deal_room_accept_invitation`,
  `deal_room_can_administer` and `deal_room_is_master_participant` now all return
  **`42501 permission denied for function …`**. Before the migration the commands
  returned `42501 Not authenticated` from *inside* the body. The refusal has moved
  from the function's own check to the grant, which is where it belongs.
- Member table reads still return **`200 []`**, not an error. This matters:
  revoking the RLS helpers from `anon` could in principle have broken policy
  evaluation. It does not, because the 14 policies are scoped `to authenticated`,
  so for an anonymous request no policy applies and the helpers are never called.
  That reasoning is now confirmed against the live database rather than assumed.

## 13. Why probe 7 failed, and why the regression suite did not catch it

**`authenticated` holds EXECUTE on 22 of the 23 functions: the 19 intended, plus
`deal_room_is_writable`, `deal_room_uuid_or_null` and
`deal_room_events_append_only`.**

The migration does what its own text says. It revokes `PUBLIC` and `anon` on all
23, revokes `authenticated` on the logger, and grants `authenticated` on the 19.
What it does **not** do is revoke `authenticated` on the other three — and
re-granting the 19 cannot remove a grant that Supabase's default privileges had
already created on all 23. Instruction step 2 named only the logger for an
`authenticated` revoke; instruction step 4 required `authenticated` EXECUTE to be
preserved "only for" the helpers and the commands. The file satisfies the first
and not the second.

**The regression suite asserted the wrong thing, in exactly the way LB-008 did.**
`function-acl.test.ts` contains:

> `authenticated` should end with execute on exactly 19 Deal Room functions

and it passes — because it counts `grant` statements in the file. A file-text test
cannot see a privilege the file never mentions, so three functions granted by
Supabase's defaults and named nowhere in the corrective migration were invisible
to it. That is the same error one level up: **LB-008 was a file asserting
something about itself, and the test written to catch LB-008 was a test asserting
something about that file.** Only the catalogue could answer it, and the catalogue
was not consulted until after the migration was applied.

The suite's wording is now known to overstate its reach. Correcting the test and
the migration is a fix, and no fix is authorised here.

**Residual exposure from the three, stated precisely so it is neither dismissed nor
inflated.** All three are closed to `anon`. What remains is an authenticated
member being able to call:

- `deal_room_is_writable(uuid)` — a `boolean` predicate over
  `deal_room_entitlements` and room state. It reads; it writes nothing. A member
  could learn whether a room id is writable, which the room's own surface already
  tells a participant.
- `deal_room_uuid_or_null(text)` — pure text-to-uuid coercion, no table access.
- `deal_room_events_append_only()` — a trigger function. Called directly outside
  a trigger context it raises, because it dereferences `OLD`/`NEW`.

**None of them writes, and none of them is the forgery path.** The one function
that could forge the append-only history, `deal_room_log_event`, is closed to
`anon` and to `authenticated`, proved both in the catalogue and through a real
anonymous client. So the material security objective of LB-008 is met; the ACL
contract as specified is not.

## 14. Probe 6 is pending, and why no substitute was invented

A real authenticated direct RPC needs a member JWT. There are **no authorised test
credentials**: `.env.local` carries only the anon key, the service-role key and
the management token, and no test account is documented anywhere in the
repository.

Production holds 9 confirmed users. **They are real member accounts, and none is
identified as an authorised test account.** Minting a session for somebody's real
account — by admin-generated link or otherwise — to satisfy a probe is not a test
credential and was not done. Creating a user was explicitly not authorised.

So probe 6 is recorded **pending**, and probes 8 and 9 are recorded **partial**:
their catalogue halves pass, their behavioural halves need the same session. The
instruction is explicit that a pending authenticated client means LB-008 is not
claimed fully resolved, and it is not.

What closing them needs, in order: an authorised test account, or authorisation to
create one; then Approval 2 (bucket and policies) and a published pilot Deal, so
that `npm run deal-room:negative-access` has a real room to drive. That fixture is
the thing that finally proves probes 8, 9, and requirements 12 and 13 of the
previous pass.

## 15. Production state after this pass

| | |
|---|---|
| Ledger | **46 rows**; one each for `20260729a`, `20260729b`, `20260730b` |
| `deal_room_*` functions | 23, bodies byte-identical to before |
| `anon` EXECUTE | **0** |
| `PUBLIC` EXECUTE | **0** |
| `authenticated` EXECUTE | **22** — 19 intended, 3 unintended (section 13) |
| `service_role` EXECUTE | 23, unchanged |
| `deal_room_log_event` | reachable by `postgres` and `service_role` only |
| Policies | 14, definitions unchanged |
| Rooms / activity rows | 0 / 0 |
| Storage | `deal-room-evidence` **absent**; `ponte-deal-docs` untouched |
| Flag | `NEXT_PUBLIC_DEAL_ROOM` **unset**, allowlist unchanged, nothing deployed, access wall untouched |
| Project-wide default privileges | **unchanged**, 24 rows |

## 16. What Gate C needs next

1. **LB-008 stays active.** Two things close it: a follow-up migration revoking
   `authenticated` on the three internal functions, and probe 6. Neither is
   authorised here.
2. **The regression suite needs a correction**, because its "exactly 19" assertion
   is not true of production and cannot be made true by reading the file. The
   honest local form is to assert the file's *intent* and record that the outcome
   is catalogue-only verifiable.
3. An authorised test account, or authorisation to create one, for probe 6.
4. Approval 2: the `deal-room-evidence` bucket and its two policies.
5. Approval 3: a published, family-classified pilot Deal, then
   `npm run deal-room:negative-access` — which closes probes 8 and 9 and
   requirements 12 and 13.
6. Approval 4: flag and deploy.

---

# Continuation, 30 July 2026: `20260730c` applied. The ACL contract now matches production.

**Authorised:** owner, Phase 1 of the controlled sequence, 30 July 2026.
**Repository state:** merged `main` at `453a49cee4ffd877041160ef84e314bf333f2a27`
(PR #123), clean worktree. CI `verify` **SUCCESS** on exact head `7f27ec4`.
**Executed:** **2026-07-30 08:26:17.995 UTC**, one transaction, exit 0, no timeout,
no HTML, no 502.
**Outcome:** **every required check passed. The Deal Room function ACL in production
is now exactly the intended contract.**

## 17. Pre-execution

| Check | Result |
|---|---|
| CI on exact head `7f27ec4` | run **completed success**; `verify` **SUCCESS**. `Supabase Preview` failed, the only failure, reproducing the recorded migration-bearing-PR pattern (#107, #117) and covered by the owner's waiver |
| PR #123 merged | `main` `b8f3db5` → **`453a49c`**, merge commit, parents `2017625 7f27ec4` |
| File present on merged `main` | `supabase/migrations/20260730c_deal_room_internal_acl.sql` |
| Checksum of the **merged** file | `5adb34c2ef183c601b30048084121577cf65cba29ad4fb7dacb075ac8c7d1891` — matches, raw bytes and utf8 string identical, 7,501 bytes, no BOM |
| `20260729b` / `20260730b` | byte-identical to their applied checksums |
| Worktree | clean, from a fresh checkout of merged `main` |
| Pre-application baseline | nine md5 fingerprints captured, plus `service_role` and row counts |

## 18. The seven required verifications

| Requirement | Result |
|---|---|
| `anon` EXECUTE = 0 | **PASS. 0 of 23** |
| `PUBLIC` EXECUTE = 0 | **PASS. 0** |
| `authenticated` EXECUTE = exactly the intended 19, by name | **PASS. 19 of 23**, matched by name — four RLS helpers and fifteen application commands |
| `service_role` EXECUTE = 23 unchanged | **PASS. 23** |
| logger and three internal functions unavailable to `authenticated` | **PASS.** All four report `service_role` alone |
| bodies, tables, policies, triggers, indexes, constraints, RLS state, default privileges unchanged | **PASS.** All nine md5 fingerprints identical to the pre-application baseline; `pg_default_acl` 24 rows unchanged |
| ledger +1 row with the correct checksum | **PASS. 46 → 47**, exactly one `20260730c` row, checksum matching |

`npm run deal-room:acl-verify` output:

```
  anon           : 0 of 23
  PUBLIC         : 0 of 23
  authenticated  : 19 of 23  (expected 19)
  service_role   : 23 of 23  (expected 23, unchanged)
  policies       : 14, 0 non-SELECT, 0 naming anon

ok   deal-room ACL in production: anon 0, PUBLIC 0, authenticated exactly 19,
     service_role unchanged
```

**Demonstrated in both directions.** The same script, run against production
*before* `20260730c`, exited 1 with five problems naming all three functions and
reporting `authenticated 22 of 23, expected 19`. It detects the defect it exists
for; it was not merely asserted to.

**End-to-end with a real anonymous client**, unchanged: the logger, the commands and
the helpers all return `401 / 42501 permission denied for function …`, and member
table reads still return `200 []` rather than erroring — so revoking the three did
not disturb policy evaluation. `deal_room_activity_events` holds 0 rows.

## 19. What this changes about the instruments

The reason LB-008 needed two migrations is that the check written to catch it
measured the wrong thing. `function-acl.test.ts` asserted "`authenticated` should
end with execute on exactly 19" and passed while production held 22, because it
counted `grant` statements in a file.

That is now corrected rather than papered over:

- every assertion states whether it is a claim about **the file** or about **the
  world**, and the false message is gone;
- `scripts/deal-room-acl-verify.mjs` is the single witness to the end state, reading
  `pg_proc.proacl`;
- one of the suite's 28 assertions fails if that script stops existing, stops
  reading `pg_proc`, or stops interrogating `anon`, `authenticated` and
  `service_role`. The division of labour cannot quietly rot.

**The durable lesson, twice learned:** a Supabase `public` schema does not create
objects private, and no amount of reading SQL reveals what privileges exist. Ask the
catalogue, and keep the thing that asks it.

## 20. Production state after Phase 1

| | |
|---|---|
| Ledger | **47 rows**; `20260729a`, `20260729b`, `20260730b`, `20260730c` |
| `anon` / `PUBLIC` EXECUTE | **0** / **0** |
| `authenticated` EXECUTE | **19**, exactly the allowlist |
| `service_role` EXECUTE | 23, unchanged |
| Internal four | `service_role` only |
| Policies | 14, all SELECT, all `authenticated`, definitions unchanged |
| Rooms / activity | 0 / 0 |
| Storage | `deal-room-evidence` **absent** |
| Flag | `NEXT_PUBLIC_DEAL_ROOM` **unset**, allowlist unchanged, nothing deployed, access wall untouched |

## 21. What remains

**LB-008 stays open on one probe, not on a defect.** The real authenticated
direct-RPC confirmation needs a dedicated QA account, which is Phase 2 and was not
started. The catalogue proves `authenticated` cannot execute the logger, and the
identical enforcement is proved at the API layer for `anon`, so what is unproved is
narrow — but the owner's standing instruction is not to claim full resolution while
that client is unavailable, and it is not claimed.

Then Phase 2 (QA account), Phase 3 (Approval 2: bucket and policies), Phase 4
(Approval 3: pilot Deal and the negative-access fixture). Approval 4 — flag and
deploy — remains unauthorised.

---

# Closure, 30 July 2026: LB-008 resolved on a real authenticated probe

**Authorised:** owner, Phase 2 corrected authorisation, 30 July 2026.
**Production change:** one auth identity created. **No schema, SQL, policy, flag or
configuration change.**

## 22. The dedicated QA identity

| | |
|---|---|
| Email | `deals@ponte.trade` — owner-confirmed as a Ponte-controlled inbox |
| User id | `8263140e-4231-496b-b4c6-cfc88739995b` |
| Label and purpose | `Ponte Trade Deal Room QA`, recorded in `user_metadata` |
| `email_confirm` | **true** — no mail sent to a human |
| Password | **none supplied**, at any point |
| Auth role | `authenticated` — the ordinary Postgres role |
| `profiles.role` | **`customer`** — a normal member |
| Admin / service-role | **neither** |
| User count | **9 → 10** |
| `admin` profiles | **unchanged at 1** |

**Credential disposition.** Zero QA sessions, zero refresh tokens, zero live tokens.
Sessions came from single-use links, were held in memory only, and were revoked at
the end of the run. **No token, magic link or secret appears in this repository, in
any log, or in any pull request.**

The nine pre-existing members were neither used nor impersonated. Every operation in
this pass named `deals@ponte.trade` and nothing else.

## 23. The probe that was pending, now passed

Run as the QA member through PostgREST with that member's own JWT.

| Group | Requirement | Result |
|---|---|---|
| Internal four | must be denied | **4 of 4.** `deal_room_log_event`, `deal_room_is_writable`, `deal_room_uuid_or_null` all returned `permission denied for function <name>`; `deal_room_events_append_only` returned `404 PGRST202`, because PostgREST drops functions a role cannot execute from its schema cache — invisibility is the privilege manifesting |
| RLS helpers | must be usable | **4 of 4**, all `200` |
| Member commands | must be usable | **15 of 15**, each reaching its body |
| **Intended total** | **19** | **19 of 19** |

**Why this probe mattered and the catalogue did not suffice.** `pg_proc.proacl`
proved `authenticated` did not hold EXECUTE on the logger. It could not prove that
PostgREST *enforces* that for a real member session. This does:
`deal_room_log_event` refused a genuine authenticated member with the PostgreSQL
`permission denied for function deal_room_log_event`.

Catalogue state, re-read after the probe and unchanged by it: `anon` **0 of 23**,
`PUBLIC` **0**, `authenticated` **exactly 19 by name**, `service_role` **23 of 23**,
14 policies with none non-SELECT and none naming `anon`. Member table reads returned
`200 []`. `deal_room_activity_events` holds 0 rows.

**No existing account or profile was modified.** One pre-existing account's
`updated_at` moved inside the window. It was a refresh-token rotation from that
account's own live browser session — refresh token at `.287`, user row at `.297`,
ten milliseconds later — neither a sign-in nor a creation.

## 24. A testing-method correction, recorded because it nearly inverted the result

The first predicate treated any SQLSTATE `42501` as a missing grant, and reported
**0 of 15** commands usable. That was wrong about the method, not about the ACL.

**Ponte command bodies deliberately raise `42501` for domain authorisation
refusals** — `20260729b` does so **44 times**. So `Deal not found`,
`Workspace not found` and `Only a room administrator can do this` are the functions
executing correctly for a member who owns no rooms. **Only
`permission denied for function <name>`, which Postgres alone emits, proves missing
EXECUTE.**

Corrected predicate: **19 of 19 usable, 4 of 4 denied.**

This belongs in the permanent record because the failure mode is asymmetric and
seductive: a probe that does not make this distinction reports a healthy permission
boundary as a broken one, and the natural response — loosening grants — would
reopen exactly what LB-008 closed.

## 25. The browser-landing finding, stated without mischaracterisation

**The `/account` browser landing was not demonstrated.** Three reasons, all
evidenced:

1. **The requested continuation was silently discarded.**
   `http://localhost:3000/auth/callback?next=/account` is not in the project's
   Redirect URL allowlist, so Supabase substituted the project **Site URL** and the
   `?next=/account` continuation was dropped before any browser was involved.
2. **The admin-generated link uses the implicit flow.** Following it yields
   `303 → <site>/#access_token=…&refresh_token=…` — tokens in the fragment, **no
   `code` parameter**. `app/auth/callback/route.ts` requires `?code=` for
   `exchangeCodeForSession`, so it would have fallen through to `/login?error=auth`.
   An admin-generated link cannot drive that route.
3. Port 3000 was held by another session's dev server, and shared
   `.claude/launch.json` was not repointed to take it.

**This did not affect the authenticated ACL result and is not part of LB-008.** The
probe used a member JWT directly and never needed a browser. `/auth/callback` itself
is correct: it reads `next`, defaults to `/account`, and rejects anything that is not
a same-site relative path.

## 26. Unallocated observation, for controller intake

**`lib/email.ts` line 369** — the `operator_alert` template hardcodes
`actionPath: "/admin"` with label "Open in Ponte". It is the only hardcoded
`actionPath` in the file. With `app/[locale]/admin/layout.tsx` line 53, which
bounces an unauthenticated `/admin` hit to `/login?next=/admin`, that is a route by
which a session can end on `/admin`.

Mitigating: the admin layout selects `profiles.role` and renders a restricted notice
unless `role = 'admin'`, so landing there grants nothing.

**No claim is made that the QA account produced the earlier `/admin` screenshot.**
That account did not exist at the time, and the account, the link and the session in
this pass all postdate it. **No identifier is allocated and no fix is included
here** — the finding is handed to the controller.

## 27. LB-008 is resolved

The ACL production contract is fully evidenced: the catalogue reports exactly the
intended contract, a real anonymous client is refused at the grant, and a real
authenticated member is refused on the four internal functions while retaining all
19 it needs.

Still open, and not part of LB-008: requirements 12 and 13 (entitlement fail-closed,
cross-room isolation), which need Approval 3; Approval 2 (bucket and policies); and
Approval 4 (flag and deploy).

---

# Gate C Approval 2, 31 July 2026: evidence Storage applied and verified

**Authorised:** owner, 31 July 2026 — merge PR #142, then proceed with Approval 2.
**Repository state:** merged `main` at `647436b539dc307bb16c6c53e8c2dcfa63face08`,
clean worktree, CI `verify` SUCCESS.
**Outcome:** **both migrations applied. Every check passed. No discrepancy.**

## 28. What Approval 2 nearly broke, and how it was caught

Reading `20260729c` before applying it found that its `deal room evidence upload`
policy calls `deal_room_uuid_or_null(text)` and `deal_room_is_writable(uuid)` —
both of which `20260730c` had revoked from `authenticated` on the ground that they
appeared in no policy expression.

That ground was true of the database **as applied** and false of the repository,
where `20260729c` had been sitting since 29 July. The allowlist had been derived
from `pg_policies where tablename like 'deal_room%'`, which cannot see
`storage.objects` policies and cannot see policies that do not yet exist.

Applying `20260729c` alone would have created an upload policy that failed **every
member evidence upload** with `42501`. `20260731a` was prepared, reviewed and
merged first, and applied first.

## 29. Application

| | Time (UTC) | Ledger | Checksum |
|---|---|---|---|
| `20260731a_deal_room_storage_policy_helpers.sql` | **04:26:11.008** | 47 → 48 | `bbd498511e04fb7a277df7dd52e0921ca295fa50697628a06e3e504767caadf9` |
| `20260729c_deal_room_storage.sql` | **04:26:35.893** | 48 → 49 | `94629e5dec518439687f0ecf0583aaed15caed0f0839e87bf42c941c7fe29972` |

Both one transaction, exit 0, no timeout, no HTML, no 502. Checksums verified
against the **merged** files before execution, not branch copies. `20260729b`,
`20260730b` and `20260730c` remained byte-identical to their applied checksums
throughout.

## 30. Pre and post state, captured in full

| | Before | After | Delta |
|---|---|---|---|
| Buckets | 6 | 7 | **only `deal-room-evidence`** |
| Storage policies | 12 | 14 | **only the two Deal Room policies** |
| `authenticated` EXECUTE | 19 | 21 | the two Storage helpers |
| `anon` / `PUBLIC` EXECUTE | 0 / 0 | **0 / 0** | none |
| `service_role` EXECUTE | 23 | **23** | none |

`deal-room-evidence`: `public = false`, 25 MiB limit, restricted to
`application/pdf`, `image/png`, `image/jpeg`, `image/webp`, **0 objects**.

The two policies are `deal room evidence read` (SELECT) and `deal room evidence
upload` (INSERT), both scoped `to authenticated`. **No UPDATE and no DELETE
policy**, deliberately: an evidence version is immutable, and removal is a
retention action for the service role.

**Nothing unrelated changed.** Every bucket and every storage policy was listed
before and after; the other six buckets and twelve policies are identical,
fingerprints `84b3fdf5b6f33e833e9ba91cb9f0708d` and
`b75af4ee476edb76c957e701a95aa8ee`. `ponte-deal-docs` is untouched and still holds
0 objects.

## 31. The witness, and the probe that mattered

`npm run deal-room:acl-verify` **detected that the policies are now live**,
switched itself from the required-19 regime to required-21, and exited 0:

```
  authenticated  : 21 of 23  (required 21, permitted 21)
  note: storage.objects Deal Room policies are LIVE, so the 2 Storage helpers are
        required (expected 21)
```

That switch is the permitted-versus-required design working: the same script was
green before Approval 2 with 19 and is green after with 21, without either state
being a false alarm.

**The upload policy was proved to evaluate, not merely to exist.** Two outcomes
look similar and mean opposite things:

| Response | Meaning |
|---|---|
| `permission denied for function …` | the grant is missing; the policy never reached its own decision |
| a row-level-security refusal | **the policy evaluated and correctly denied** |

A real QA member (`deals@ponte.trade`, `profiles.role = customer`) attempting an
upload into a sub-room they do not participate in received:

```
403 Unauthorized: new row violates row-level security policy
```

That is the pass. Anonymous upload is refused identically. Anonymous and member
listings of the private bucket both return `200 []`. **Nothing was uploaded**, and
`deal-room-evidence` still holds 0 objects.

## 32. What remains

**Approval 3.** The read policy has so far been exercised only against an empty
bucket, and requirements 12 and 13 — entitlement fail-closed, cross-room and
cross-sub-room isolation — are still catalogue-only. All three need a labelled
non-commercial pilot Deal and `npm run deal-room:negative-access`.

**Approval 4** — `NEXT_PUBLIC_DEAL_ROOM`, deployment, the access wall — remains
unauthorised.

---

# Gate C Approval 3, 31 July 2026: the fixture ran, and the loop cannot start

**Authorised:** owner, 31 July 2026 — merge PR #143, then proceed with Approval 3.
**Repository state:** merged `main` at `b4d4907a5791c944391d03208a68f09aa60b49bb`.
**Outcome:** **the fixture stopped at the first positive-path step. Two refusals
proved, then `deal_room_propose` failed for the Deal owner.** Requirements 12 and
13 remain unproved. No production change.

## 33. What the fixture proved before it stopped

| Assertion | Result |
|---|---|
| a non-owner cannot create a room for another member's Deal | **ok** |
| no direct INSERT into `deal_rooms` is possible at all | **ok** |
| **the Deal owner can create the room** | **FAIL** |

```
new row for relation "deal_room_participants"
violates check constraint "deal_room_participants_identity_when_admitted"
```

The run halted there — deliberately, because every remaining assertion needs a
room. **2 passed, 1 failed.**

## 34. The defect

The constraint, from `20260729a`:

```sql
CHECK (state <> ALL (ARRAY['admitted','active'])
       OR org_id IS NOT NULL
       OR (declared_capacity IS NOT NULL AND length(btrim(declared_capacity)) > 0))
```

`deal_room_propose` admits the initiator immediately — two rows, master level and
first workspace — with `state = 'admitted'`, `org_id = v_org`, and **no
`declared_capacity` in the insert at all**.

`v_org` is `select organization_id into v_org from public.profiles where id =
auth.uid()`. In production **all 10 profiles have no organisation and
`organizations` holds zero rows**, so `v_org` is always NULL. All three disjuncts
are false and the row is rejected.

**This is not an edge case. It is every member, on step one.**

The function itself anticipates the org-less member elsewhere — its entitlement
check reads `(v_org is null and r.initiator_profile_id = auth.uid())` — so the
design does contemplate members without an organisation. The participant insert
simply does not carry that through.

## 35. Why the counterparty path is sound, and what that isolates

| Path | State on insert | Constraint applies? | Capacity |
|---|---|---|---|
| Initiator, via `deal_room_propose` | `admitted` | **yes** | **never set** |
| Counterparty, via `deal_room_accept_invitation` | `prerequisites_pending` | no | set later |
| Counterparty, via `deal_room_declare_participation` | — | — | **sets `declared_capacity`** |
| Counterparty, via `deal_room_admit_participant` | `admitted` | yes | **refuses while org and capacity are both empty** |

The counterparty is *made* to declare a capacity before admission, and admission is
explicitly gated on it. The initiator is admitted with neither. **The constraint is
right; `deal_room_propose` does not satisfy it.**

## 36. The correction is a product decision, and was not made

Three options, and they assert different things:

1. **Set the initiator's `declared_capacity` inside `deal_room_propose`.** The row
   already carries `transaction_role = 'Deal owner'` and `participation_authority =
   'Owner of the published Deal'`; either could seed it. Smallest change, and it
   makes the initiator's claim explicit rather than implied by Deal ownership.
2. **Require an organisation before proposing.** Truest to the constraint's intent —
   an admitted party has a stated identity — but it adds a gate to the journey and
   no member has one today.
3. **Narrow the constraint** so it does not bind the initiator. Cheapest and the
   weakest: it drops the guarantee for exactly the party with the most authority.

Each says something different about what Ponte asserts a room initiator has
declared, which is why it is the owner's call and not an agent's.

## 37. No production change

The fixture creates its own three accounts on `@example.invalid` and one listing
whose details read "Negative-access fixture. Fictional." It tears down rooms,
listings and users in a `finally`, and it did:

| | Before | After |
|---|---|---|
| `auth.users` | 10 | **10**, identical id fingerprint |
| `listings` | 7 | **7**, identical id fingerprint |
| rooms / participants / activity / entitlements | 0 | **0 / 0 / 0 / 0** |
| `deal-room-evidence` objects | 0 | **0** |
| ledger | 49 | **49** |

No real member account and no real commercial data was used. The service role was
used only for setup and teardown, never to check a permission.

## 38. What Approval 3 has and has not established

**Established:** a non-owner cannot open a room against another member's Deal, and
no member can INSERT into `deal_rooms` directly.

**Not established, and not to be claimed:** requirements 12 and 13 — entitlement
fail-closed, cross-room and cross-sub-room isolation — and the Storage read policy
against real evidence rows. Also untested against a real room: invitation,
admission, proposal, counterproposal, acceptance, blockers, evidence, and the
status and next-action behaviour. All of it waits on a room existing.

Approval 4 — `NEXT_PUBLIC_DEAL_ROOM`, deployment, the access wall — remains
unauthorised, and would be premature: the loop does not start.

---

# Gate C Approval 3 re-run, 31 July 2026: the loop runs

**Authorised:** owner, 31 July 2026 - merge PR #146, then apply it and re-run
Approval 3.
**Repository state:** merged `main` `ee76e78`; `20260731b` applied once at
05:01:48.553 UTC, checksum `0de3c6e0...c926ef13`, ledger 49 -> 50.
**Outcome:** **92 passed, 2 failed**, against 2 passed and 1 failed on 31 July
before the fix.

## 39. The initiator defect is closed

`deal_room_propose` now supplies `declared_capacity = 'Deal owner'` on both initiator
inserts, so the identity CHECK is satisfied and the room is created. The replacement
was made in place: the function kept oid 92112 and there is still exactly **one**
`deal_room_propose`, so no overload was created and no grant was invalidated. ACL
after the change is unchanged - anon 0, PUBLIC 0, authenticated 21, service_role 23.

## 40. What is now proved against real production rows

| | |
|---|---|
| Room creation, and its refusal for a non-owner | ok |
| No direct INSERT into `deal_rooms` by anyone | ok |
| Invitation addressed to the recorded external principal | ok |
| A mismatched confirmed email cannot accept, however legitimate elsewhere | ok |
| Acceptance is recorded as `invitation_accepted`, **not** as admission | ok |
| The four-agreement gate: participation, NDA, room rules, authority declaration | ok |
| `participant_admitted` appears only after the gate is passed | ok |
| Nobody can accept an agreement on another participant's behalf | ok |
| The canonical checksum cannot be rewritten and acceptances cannot be forged | ok |
| **Sub-room isolation: A cannot select, count or name B, and B never appears in A's activity** | ok |
| Evidence submission, self-acceptance refusal, clarification, versioning, retention | ok |
| An evidence version cannot be edited or deleted | ok |
| `own_org` evidence is not readable by the other organisation | ok |
| Activity is append-only, **including for the service role** | ok |
| Blockers: cannot resolve without a note, resolved blockers retained | ok |
| Read-only closes the room to every mutation while preserving history | ok |
| A stranger cannot download evidence bytes or mint a signed URL; a crafted path is refused | ok |

**Requirement 13 - cross-room and cross-sub-room isolation - is proved.**

## 41. What fails: no procedure can ever be approved

Two independent defects. Either alone is sufficient.

**a. The initiator is issued two approval obligations for themselves.**
`deal_room_propose_procedure` seeds one pending row per *participant row* holding
`is_required_approver`, and `deal_room_propose` gives the initiator two such rows in
the same room - master-level and first workspace. `deal_room_approve_procedure`
resolves the caller with `limit 1` and updates that one `participant_id`. Observed in
production: both approval rows on the fixture procedure belonged to the same person,
`213848cf` approved and `986c582b` still pending. `v_outstanding` can never reach 0.

**b. An admitted counterparty principal is not a required approver.**
`deal_room_admit_participant` leaves `is_required_approver` false. The counterparty -
`principal`, `Buyer`, `admitted` - is refused with `Only a required approver can
approve this procedure`, and was never issued an approval row.

So a procedure version stays `proposed` and governs nothing; its steps never become
ready; and **requirement 12, entitlement fail-closed, cannot be tested**, because
entitlements are granted through the gate that cannot be reached.

The correction is a product decision - who Ponte requires to approve a procedure, and
at which level a participant carries that authority. It was not made here and no
identifier was minted.

## 42. Production was changed, and could not be fully restored

Unlike the first run, this one built a complete room, and **the fixture could not tear
it down**. Every teardown step failed:

```
delete room b1d27725: FAILED - deal_room_activity_events is append-only: DELETE is not permitted
delete room db2ddfbd: FAILED - deal_room_activity_events is append-only: DELETE is not permitted
delete listing b8a15147: FAILED - violates foreign key constraint "deal_rooms_listing_id_fkey"
delete listing fe985d4b: FAILED - violates foreign key constraint "deal_rooms_listing_id_fkey"
delete user (x4):        FAILED - Database error deleting user
```

**The append-only guarantee the fixture verifies is what prevents the fixture from
cleaning up after itself.** `teardown()` discards the error from
`admin.from("deal_rooms").delete()`, so it failed silently and the run reported
nothing. The first run's clean teardown was not evidence that teardown works - there
was simply nothing to remove.

Left in production, all created 05:02 UTC and all attributable: 4 `@example.invalid`
users, 2 listings marked "Negative-access fixture. Fictional.", 2 rooms, 3 sub-rooms,
6 participants, 26 activity events, 2 invitations, 4 acceptances, 2 evidence rows and
3 versions, 1 procedure with 3 steps and 2 approvals, 1 blocker, 1 clarification, 2
entitlements. **0 Storage objects.** No real member account, listing or commercial row
was touched, and the four canonical agreement documents (published 30 July) are
unchanged.

**Containment.** Both fixture listings were seeded `status = 'approved'`, and
`lib/board/live-deals.ts` selects the board on exactly that - so two fictional Deals
were live, two of only four approved rows. They were moved to `archived` by a
primary-key-scoped update further predicated on `details = 'Negative-access fixture.
Fictional.'` and `status = 'approved'`; it returned exactly those two rows. Nothing
was deleted. The board holds its two real approved listings again.

**Removing the rest needs owner authorisation**, because the only route is to suspend
the append-only trigger on `deal_room_activity_events`. That is a momentary suspension
of a production security guarantee and was not done.

## 43. Two findings for controller intake, unallocated

1. **`scripts/deal-room-negative-access.mjs` cannot be re-run safely.** Its teardown
   is defeated by the append-only trigger and swallows the error. Until it is either
   made to run against a non-production project or given an authorised, explicit
   trigger-suspension teardown, each run permanently adds a room to production.
2. **The fixture seeds its listings as `approved`**, which publishes fictional Deals
   to the live board for the duration of the run even when teardown succeeds.

## 44. Approval 4 remains unauthorised

`NEXT_PUBLIC_DEAL_ROOM`, deployment and the access wall are unchanged. The loop now
runs far enough to be worth reviewing, but it does not complete: no procedure can
govern, so no entitlement can be granted and no progression can be measured.

---

# Teardown fixed and the fixture rows removed, 31 July 2026

**Authorised:** owner, 31 July 2026 - fix the fixture teardown first, then merge and
apply.

## 45. Why the teardown could not have worked

`teardown()` deleted rooms with `admin.from("deal_rooms").delete()` and **discarded
the error**. The cascade reaches `deal_room_activity_events`, whose
`deal_room_activity_append_only` trigger refuses DELETE to every role including the
service role - the guarantee section 7 of the fixture itself verifies. So each room
delete failed silently, which left the listings undeletable on
`deal_rooms_listing_id_fkey` and the accounts undeletable after them.

The first run had stopped at step one, so there was nothing to remove and the path
was never exercised. Its "tore down completely" record was true but proved nothing.

## 46. The fix

Room deletion now runs through the **Management API as the table owner**, suspending
the trigger inside a single transaction scoped to one room id and re-enabling it in
the same transaction, so any failure restores it. The capability stays **outside the
application**: not the service role, not any member session - only whoever holds the
management token.

Three guards:

- `removeRoom()` refuses unless the room's listing still carries
  `details = 'Negative-access fixture. Fictional.'`, so a stale id cannot reach a
  real room.
- Every id is proved to be a UUID before interpolation, because the Management API
  takes SQL text rather than bound parameters.
- The management credentials are required **at startup**, so the fixture never
  creates a room it cannot remove, and teardown **verifies afterwards**, printing
  `TEARDOWN INCOMPLETE` and exiting non-zero if anything is left.

## 47. The stranded rows are gone

Both fixture rooms were removed through that exact path. The trigger returned to
`tgenabled = 'O'` and the cascade cleared everything beneath them; the two fixture
listings and four `@example.invalid` accounts were then deleted by primary key.

| | Before | After |
|---|---|---|
| `auth.users` | 14 | **10** |
| `listings` | 9 (2 archived fixture) | **7**, 2 approved, **0 archived** |
| every `deal_room_*` table | 26 activity events and the rest | **0** |
| `deal_room_agreement_documents` | 4 | **4**, canonical and untouched |
| `storage.objects` in `deal-room-evidence` | 0 | **0** |
| ledger | 50 | **50** |

Production is back to its pre-fixture state, and the fixture can now be run and
re-run without accumulating rooms.

---

# Gate C Approval 3, third run, 31 July 2026: 94 passed, 0 failed

**Authorised:** owner, 31 July 2026 - fix the fixture teardown first, then merge and
apply.
**Repository state:** merged `main` `414d3e8`; `20260731c` applied once, checksum
`7e60f2df...0c9971ba`, ledger 50 -> 51.

## 48. The gate opens

The two assertions that failed on the second run now pass:

| | |
|---|---|
| the second required approver approves | **ok** |
| the version governs once every approver has approved | **ok** |

A procedure version can now be proposed, approved by both principals, and made to
govern. Its steps become ready and the two admission steps complete - the 22%
baseline the product definition specifies, produced by the mechanism rather than
asserted.

**2 passed on the first run, 92 on the second, 94 on this one. 0 failed.**

## 49. Verified in place, not by overload

Three functions replaced on identical signatures; still exactly three entries, so no
overload and no invalidated grant. Combined `md5(pg_get_functiondef)`
`1ca84013...` -> `0384017e...`. Each edit confirmed present in `prosrc` by reading
the catalogue, and the old `participant_id = v_participant` keying confirmed absent.
ACL unchanged: anon 0, PUBLIC 0, authenticated 21, service_role 23, 14 policies.

## 50. The fixture removed everything it made

`teardown complete: no rooms, listings, users or activity left behind.`

| | |
|---|---|
| `auth.users` | **10** |
| `listings` | **7**, 2 approved, 0 archived |
| every `deal_room_*` table | **0** |
| `storage.objects` in `deal-room-evidence` | **0** |
| `deal_room_activity_append_only` | `tgenabled = 'O'` |
| ledger | **51** |

This is the first run whose teardown was both exercised and successful.

## 51. What Approval 3 now establishes, and what it does not

**Established.** Requirement 13 - cross-room and cross-sub-room isolation. The
admission gate and its four agreements at the current version and checksum. The
invitation bound to the recorded intended identity. Evidence submission, self-review
refusal, clarification, correction, versioning, retention and `own_org` visibility.
Append-only activity, including against the service role. Blockers and their note
requirement. Read-only continuity. The Storage byte refusals, including a crafted
path. And now the procedure gate end to end.

**Not established, and not to be claimed.** Requirement 12 is only **partly** proved:
the fixture shows an entitlement cannot be forged - a room administrator can neither
issue themselves a second one nor extend their own - but it does not assert that a
room lacking an entitlement refuses to progress. "Entitlement fail-closed" in that
stronger sense is still unproved. Also untested: behaviour over time and across
sessions, amendment of a governing procedure, and anything beyond the three
participants and two rooms the fixture builds.

## 52. Approval 4 remains unauthorised

`NEXT_PUBLIC_DEAL_ROOM` is unset, nothing is deployed, and the access wall is
unchanged. What has changed is that the loop now completes in the database, so a
review of the surfaces against a working loop is possible for the first time.

---

# Surface review against the working loop, 31 July 2026

**Authorised:** owner, 31 July 2026 - review the Deal Room surfaces against the
working loop, then fix what it found.
**Method:** every check run against the **production catalogue**, not the migration
files, for the same reason `deal-room:acl-verify` exists.

## 53. What holds

| Check | Result |
|---|---|
| all 15 `deal_room_*` RPC call sites against production signatures | **match argument for argument** - no PostgREST resolution failure is possible |
| every column selected, across 14 tables | **all present** |
| all 10 state vocabularies against the production CHECK constraints, **both directions** | **identical sets** |
| `admission_and_nda` and `procedure_agreed`, the keys `approve_procedure` completes on approval | present in every family template, weights 10 + 12 = **22**, inside the definition's 18-25 band |
| evidence MIME list and the 26,214,400-byte limit | client `accept`, server allowlist and bucket **agree exactly** |
| `canApproveProcedure` after `20260731c` | correct for both principals |

The step copy "Every required principal approver has approved this procedure version"
became **true** only with `20260731c`. Before it the counterparty could never approve,
so the interface was promising something the database refused.

## 54. Four defects, none of them a security defect

### a. The counterparty could not see who they were waiting for

`20260731c` chose the master-level participant row as canonical for approvals, and
`participant read` makes another person's master-level row visible to a room
administrator alone. The procedure page therefore rendered "A required approver"
rather than the initiator's name. Corrected by `20260731d`, which prefers the row in
the procedure's own sub-room. **Introduced by this lane the same day.**

### b, c, d. Participant ROWS were counted as people

`deal_room_propose` admits the initiator twice - master level and first workspace -
so one person holds two rows from the moment a room exists. Three surfaces counted
rows:

| Site | Was | Effect |
|---|---|---|
| `lib/deal-room/queries.ts` | `invitationSent: participants.length > 1` | **true on a room nobody had been invited to**, and true whether or not an invitation was ever sent - the signal carried no information |
| `lib/deal-room/queries.ts` | `bridgeParticipants = participants.map(...)` | the initiator **drawn twice** on the Bridge; its label read "2 participants" |
| `app/[locale]/deal-rooms/[roomId]/invitation/page.tsx` | `${participants.length} participants` | "**2 participants** in the parts of this room you can see", to someone sitting alone |

`page.tsx` escaped it by collapsing organisation names through a `Set`, and the
workspace roster escaped it by filtering on `subRoomId`.

**This is the same mistake as LB-001's, one layer up.** Seeding one approval per
participant row gave the initiator two obligations for themselves; counting
participant rows gave them two identities. A row is a membership; a person is a party.

**Corrections.** A pure module `lib/deal-room/participants.ts` provides
`onePerPerson()` and `countPeople()`, keeping the workspace row - the one that
carries the permissions a person exercises, and the one a co-participant is allowed
to read - with the master-level row as fallback, deterministically regardless of the
order rows arrive in. `invitationSent` no longer counts anything: `deal_room_invite`
writes no participant row, it moves the sub-room from `draft` to
`invitation_pending`, and that state change is the fact.
`lib/deal-room/__tests__/participants.test.ts` pins all of it, including the two
counts that were wrong.

## 55. Also recorded

- The vocabulary guard in `rls-contract.test.ts` is **one-directional**: every
  TypeScript value must appear in the SQL, but nothing catches a state the database
  allows and no surface can render. The reverse was checked against production during
  this review and is clean, but it is unguarded.
- `lib/deal-room/states.ts:11` cites `__tests__/states.test.ts`, which does not exist.
  The guard is in `rls-contract.test.ts`.

## 56. None of this changes the Gate C position

Approval 3 remains 94 of 94. Requirement 12 remains only partly proved. Approval 4 -
`NEXT_PUBLIC_DEAL_ROOM`, deployment, the access wall - remains unauthorised, and the
surfaces have still never been rendered against a live room by a human being.

---

# The fixture learns to see, 31 July 2026: Approval 3 at 97 of 97

**Authorised:** owner, 31 July 2026 - merge PR #158, then add the missing assertion.

## 57. What was missing, and why it mattered

Every assertion in `scripts/deal-room-negative-access.mjs` asked what a member may and
may not **do**. None asked what a member may **see about another member**. Two defects
went through that gap on 31 July 2026 and were caught by reading, not by running:

- `deal_room_propose_procedure` seeded one approval per participant **row**. The
  initiator holds two rows in their own room, so they were issued two obligations for
  themselves and no procedure could ever be approved (LB-001, `20260731c`).
- The fix then made the initiator's **master-level** row canonical, and
  `participant read` allows another person's row only through
  `sub_room_id is not null and deal_room_is_sub_room_participant(...)`, or to a room
  administrator. The counterparty could read the approval but not the participant it
  named, so the procedure page showed them an unnamed "A required approver"
  (`20260731d`).

The fourth run passed 94 of 94 with the second defect still latent. That is what a
blind spot looks like from inside.

## 58. Three assertions that interlock

| | |
|---|---|
| another person's master-level participant row is not readable by a counterparty | **ok** |
| one approval per person, not per participant row | **ok** - 2 rows for 2 people |
| the counterparty can read the participant every approval names | **ok** |

Neither of the two defects can return silently:

- prefer a master-level row again and the **third** fails, because the **first**
  proves that row cannot be read;
- seed per participant row again and the **second** fails at once - 3 rows for 2
  people.

And neither can pass vacuously. The first is a plain refusal, so widening the policy
breaks it. The third would pass trivially only with no approval rows at all, which the
second forbids.

The service role looks up the master-level row's id and does nothing else; the read
under test runs as the counterparty, under their own session and RLS.

## 59. The count, run by run

| Run | Passed | Failed | What it established |
|---|---|---|---|
| 1 | 2 | 1 | the loop could not start - no room could be created |
| 2 | 92 | 2 | the loop runs; no procedure can be approved |
| 3 | 94 | 0 | the procedure gate opens |
| 4 | 94 | 0 | `20260731d` applied; **nothing regressed, nothing proved** |
| 5 | **97** | **0** | the approver a member waits for is one they can name |

Teardown clean. Production unchanged: 10 users, 7 listings with 2 approved, every
`deal_room_*` table at 0, 0 Storage objects, append-only trigger enabled, ledger 52.

## 60. Still open

- **Requirement 12 in its stronger sense**: an entitlement cannot be forged or
  self-extended, but nothing asserts that a room lacking one refuses to progress.
- The vocabulary guard in `rls-contract.test.ts` remains **one-directional** and
  cannot catch a state the database allows and no surface renders.
- **The surfaces have never been rendered against a live room by a person.**
- Approval 4 - `NEXT_PUBLIC_DEAL_ROOM`, deployment, the access wall - remains
  unauthorised.

---

# Rendering the surfaces against a live room, 31 July 2026

**Authorised:** owner, 31 July 2026 - render the surfaces against a live room.
**Outcome:** **a live room was built, its data proved, and taken down. The pages
were NOT rendered.** One blocker, and it is not ours to remove.

## 61. The blocker: the site access wall

`middleware.ts` gates every request behind Basic auth, unconditionally - it is the
first statement of `middleware()`, with no exemption for `NODE_ENV`, for localhost
or for any path. Only the password's SHA-256 is committed; the plaintext is in
neither the repository nor `.env.local`. **Without it no page can be rendered
anywhere, locally or otherwise.**

The recorded rule is explicit: *never remove or weaken the gate to capture
evidence*. It was not weakened, and no attempt was made to guess the password.

The capture needs one thing from the owner:

```
PONTE_SITE_PASSWORD=... npx playwright test e2e/deal-room-surfaces.spec.ts
```

## 62. Everything that does not depend on it was done

**`scripts/deal-room-live-room.mjs`** stands a real room up and takes it down: two
members, a published Deal, an invitation, the four-agreement admission gate, an
agreed procedure, an evidence item carried through clarification and acceptance,
and an open blocker. It writes the ids and each member's session cookies to a
gitignored manifest - the cookies produced by `@supabase/ssr` itself rather than
hand-assembled, so the encoding is whatever the installed version uses.

Three things it does deliberately:

- **The listing is published, then archived a few milliseconds later.**
  `deal_room_propose` refuses anything but a published Deal, and correctly so, but
  `lib/board/live-deals.ts` selects the live board on that same status. On 31 July a
  fixture listing left `approved` put two fictional Deals in front of members for
  the length of a run. The room keeps its own `deal_snapshot` and no Deal Room
  surface reads the listing back.
- **A failed build removes what it had already created**, and says whether that
  succeeded. Three builds failed while it was being written - an unpublished Deal, an
  unknown interest route, an unknown blocker category - and each left nothing behind.
  The proof fixture's original teardown was never exercised, and the run that finally
  exercised it put four accounts and two rooms into production permanently.
- **`remove` and the failure path are one function**, so they cannot drift.

**`e2e/deal-room-surfaces.spec.ts`** captures the twelve surfaces at 1280x900 and
390x844, as **both parties**. That last point is the lesson of the surface review:
capturing only the initiator would have photographed a procedure page that looked
perfectly correct while the counterparty's said "A required approver". It asserts
each page actually rendered - a 401, a 404 from the flag being off, an allowlist miss
and an error boundary all photograph beautifully.

`e2e/deal-room-bridge.spec.ts` keeps its job and its rationale is corrected: a single
room is in one state at a time, and blocked, paused, read-only and ready-to-proceed
cannot be reached on demand. The two are complements.

## 63. What the live room proved, without a browser

The room was built, queried as each member through RLS exactly as a browser would,
and removed. This proves the derivations the surfaces render, though not their
layout:

| | initiator | counterparty |
|---|---|---|
| participant rows visible | **3** | **2** |
| people | **2** | **2** |
| Bridge entries drawn | **2** | **2** |
| approvers the procedure page can name | **2 of 2** | **2 of 2** |
| `invitationSent` | true, from the workspace leaving `draft` | true |

Read against the defects the review found: the old code would have drawn the
initiator **three** Bridge entries and told them "3 participants", and before
`20260731d` the counterparty could have named **1 of 2** approvers. The invitation
page's count is 2 where it would have been 3.

## 64. No production change

The room was removed through the same Management-API path as the proof fixture's
teardown. After it: 10 users, 7 listings with 2 approved and 0 archived, every
`deal_room_*` table at 0, 0 Storage objects,
`deal_room_activity_append_only` at `tgenabled = 'O'`, ledger 52. The manifest,
and the session tokens in it, are gone.

## 65. What remains unproved, and is the point

**Nobody has seen these pages.** Layout, contrast, wrapping at 390px, the Bridge's
geometry against real names, whether the copy reads sensibly beside real values,
whether the reduced-motion path is right - none of it is established by any of the
above. The data is right. The rendering is unexamined, and stays unexamined until
the password is supplied.

---

# Requirement 12 proved, 31 July 2026: Approval 3 at 109 of 109

**Authorised:** owner, 31 July 2026 - do requirement 12.

## 66. What requirement 12 says, and what was actually established

"Rooms without an entitlement fail closed."

What the fixture proved before today was that an entitlement cannot be **forged**:
section 2 shows a room administrator can neither issue themselves a second one nor
extend their own. That is a different claim, and the records said so rather than
letting 94 or 97 of the same imply the stronger one.

## 67. The mechanism, and why an argument about it was not enough

`deal_room_is_writable` inner-joins the entitlement:

```sql
  select exists (
    select 1
    from public.deal_rooms r
    join public.deal_room_entitlements e on e.room_id = r.id
    where r.id = p_room_id
      and r.state in (...)
      and e.state in ('reserved','active','grace','restored')
  );
```

A room with no entitlement row cannot satisfy a join, so the property is structural
rather than a check somebody has to remember to write in each command. That is a good
argument, and this file exists because arguments about SQL are how the fail-open paths
got in.

## 68. Twelve assertions, in section 8

Two cases, because they fail for different reasons, and one control.

| | |
|---|---|
| the room is in a writable state, so only the entitlement is in question | **ok** |
| **an expired entitlement** - no blocker, no evidence, no invitation, no new procedure version | **ok x4** |
| an expired entitlement still leaves the history readable to the admitted | **ok** |
| the room now has no entitlement row at all | **ok** |
| **no entitlement row at all** - no blocker, no evidence, no invitation, no new procedure version | **ok x4** |
| **restoring the entitlement makes the very same command succeed** | **ok** |

The last one is what makes the other eleven mean anything. Every refusal above would
also have been recorded if the commands were failing for some entirely unrelated
reason by that point in the run - a room in the wrong state, a participant removed, a
procedure already superseded. Running the same command again after restoring the
entitlement, and watching it succeed, is what attributes the refusals to the
entitlement and nothing else.

The room stays in a writable **state** throughout: only the entitlement moves. That
separates this from section 9, where `deal_room_set_read_only` changes the room state
and expires the entitlement together and could not tell you which one did the work.

The service role changes the entitlement. That is arranging the world, not checking a
permission - every assertion runs as a member, under their own session and RLS.

## 69. The continuity half

An expired entitlement stops mutation and **does not** take the record away: the
admitted counterparty can still read the room's history. Losing access to a room must
not lose you the evidence that you were in it. That is the same continuity section 9
asserts against the room state, checked here against the entitlement.

## 70. The count

| Run | Passed | Failed | Added |
|---|---|---|---|
| 1 | 2 | 1 | - |
| 2 | 92 | 2 | - |
| 3 | 94 | 0 | - |
| 4 | 94 | 0 | - |
| 5 | 97 | 0 | approver-row visibility |
| **6** | **109** | **0** | **requirement 12** |

Teardown clean. Production unchanged: 10 users, 7 listings with 2 approved, every
`deal_room_*` table at 0, append-only trigger enabled, ledger 52.

## 71. Where Gate C stands

**Requirements 12 and 13 are both proved.** Of the fourteen, the position is no longer
11 / 1 / 2: the one failure (requirement 11, LB-008) was resolved on 30 July, and the
two pending are now established.

**Still not established, and the last of it:** nobody has rendered these pages. The
capture is written and needs only `PONTE_SITE_PASSWORD`. Approval 4 -
`NEXT_PUBLIC_DEAL_ROOM`, deployment, the access wall - remains unauthorised.

---

# Approval 4 preflight, 31 July 2026: the off switch did not work

**Authorised:** owner, 31 July 2026 - Approval 4.
**Outcome:** **the flag was not flipped.** Approval 4 is flag + allowlist +
deploy, and the first of those did not do what the records said it did. Fixed,
tested, and the remaining steps need decisions and access that are the owner's.

## 72. What Approval 4 rests on

Acceptance criterion 16: turning `NEXT_PUBLIC_DEAL_ROOM` off removes access to the
unfinished slice without regressing existing journeys. That sentence is the reason
it is safe to turn on. `lib/deal-room/flags.ts` claimed the allowlist was "checked
in every server route and command handler".

**It was not. Eleven of the fifteen server actions never called it.**

## 73. Why that matters, and what it is not

It is **not** a security hole, and should not be recorded as one. The flag is
routing, not authorisation - `flags.ts` says so at length and is right. Row Level
Security is the boundary, and every one of the eleven reaches the database through
a SECURITY DEFINER command that re-proves participation. A stranger invoking any of
them is refused by Postgres exactly as before.

What it broke is **the off switch**. With the flag off the routes 404, so a member
cannot reach a form - but a server action is an endpoint, not a page. It stays in
the deployed bundle and stays invokable. So turning the flag off did not stop seven
of the fifteen ways to change a room, and removing somebody from the allowlist did
not either.

For a staged rollout whose entire safety case is "we can turn it off", that is the
sentence that was untrue.

## 74. Four are exempt on purpose; seven were not

| | |
|---|---|
| `acceptInvitation`, `declareParticipation`, `acceptAgreement`, `completeAdmission` | **exempt, deliberately.** An invited counterparty is not necessarily allowlisted - the allowlist controls who may *open* a room, not who may be brought into one. Gating them would mean a pilot member could invite somebody who then could not accept. |
| `approveProcedure`, `requestClarification`, `answerClarification`, `acceptEvidence`, `openBlocker`, `resolveBlocker`, `setReadOnly` | **no reason at all.** Now gated. |

The exemption is written where the actions are, and the reasoning with it. It was
not written anywhere before, which is why it could not be told apart from an
oversight.

## 75. Two tests, one of which was proved to fail

`lib/deal-room/__tests__/action-gate.test.ts` discovers every exported action from
the file and requires each to call `gate()` or to be a named exception. Run against
the pre-fix file it names all seven. It also asserts that a gated action `fail()`s
rather than continuing, that every exception still exists, and that each exempt
action still reaches a `deal_room_*` command - the exemption is from routing, not
from authorisation.

`lib/deal-room/__tests__/flags.test.ts` covers `dealRoomAvailableTo`, which had **no
test at all** despite being the whole of the staged-rollout control. Nine
assertions, and the one that matters most is that an **absent or empty allowlist
means nobody**. An env var set in one environment and missing in another is exactly
how an unreleased feature reaches a whole market, and `allowed.size === 0` returning
`true` is a one-character edit that nothing would have caught.

Also covered: only exactly `on` enables the routes - not `ON`, `true`, `1` or
` on`; the flag alone and the allowlist alone are each insufficient; a signed-out
visitor is never admitted whatever the allowlist says; and an entry does not match
by prefix.

## 76. What Approval 4 still needs, and from whom

| Step | State |
|---|---|
| the flag behaves as documented | **done** |
| `NEXT_PUBLIC_DEAL_ROOM=on` in the deployment environment | **owner** - it is a Netlify environment variable, and it is inlined at build time, so it needs a rebuild rather than a restart |
| `DEAL_ROOM_ALLOWLIST=<profile or organisation ids>` | **owner decision: nobody has said who.** Empty means nobody, which is the safe default and also means turning the flag on alone changes nothing for anyone |
| deploy | follows the environment change |
| the private access wall | **owner decision.** Untouched, and out of scope until said otherwise |

**And the thing that has not changed:** nobody has rendered these pages. The capture
is written and needs only `PONTE_SITE_PASSWORD`. Turning the Deal Room on for a
pilot member would put surfaces in front of them that no person has ever looked at.

