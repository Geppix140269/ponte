# Deal Room Gate C, Approval 1: migration application record

**Authorised:** owner, Gate C Approval 1, 29 July 2026
**Executed:** 30 July 2026, against production project `cptglsmjmzcfpjndqfmc`
**Repository state:** `main` at `7f979e0`, clean worktree
**Outcome:** **`20260729a` applied. `20260729b` refused by Postgres and rolled
back. `20260729c` not attempted.** Gate C Approval 1 is **incomplete** and
stopped, per the instruction to halt on any error.

Two things happened that the owner must decide on before this can continue, and
one production action was taken that the approved files did not contain. Both
are in section 3.

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

## 5. What Gate C needs next

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
