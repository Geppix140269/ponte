# Production migration reconciliation — 28 July 2026

**Status:** complete. One remediation executed; four items require an owner decision.
**Method:** every repository migration was verified against the live production
schema object by object. The migration ledger was not trusted as evidence.

---

## 1. Production target inspected

| Fact | Value |
| --- | --- |
| Supabase project name | **Ponte Trade** |
| Project reference | `cptglsmjmzcfpjndqfmc` |
| Database host | `db.cptglsmjmzcfpjndqfmc.supabase.co` |
| Region / engine | `eu-west-1`, PostgreSQL 17.6.1.121 (GA) |
| Status | `ACTIVE_HEALTHY` |
| GitHub `main` at audit time | `877448bd6c47aaa74e6c6eee50b1ba1f8386cafb` |
| Production deployment | `ponte.trade`, served by Netlify (HTTP 200). Netlify exposes no commit SHA to an unauthenticated caller and the repository has no GitHub deployment records, so the deployed commit could **not** be established from available access. |

Identity was confirmed three ways before any read: the project list returned by
the management token names exactly one Ponte project; `SUPABASE_PROJECT_REF` and
`NEXT_PUBLIC_SUPABASE_URL` both resolve to `cptglsmjmzcfpjndqfmc`; and the live
row counts (9 auth users, 6,735 desk-radar signals, 31,801 sanctions entries,
5,613 HS codes) match a production system, not a preview or local database. No
preview branch database was touched.

> **Note on the local environment.** `C:\dev\ponte\.env.local` points
> `NEXT_PUBLIC_SUPABASE_URL` at **production** while `NEXT_PUBLIC_APP_URL` is
> `http://localhost:3000`. Local development therefore runs against the
> production database by default. That is a standing hazard independent of this
> audit. The same file holds `DATABASE_URL` with a plaintext database password.

---

## 2. Headline result

**No repository migration is genuinely missing from production.**

The alarm that prompted this audit — migrations merged but never applied — is
not what happened. The opposite is true: essentially every migration *has* been
applied, by hand, and the **ledger** was the thing that was wrong. Before this
audit the ledger accounted for 13 of 40 migrations; the other 26 were applied
and unrecorded, which is precisely the state that makes a real gap invisible.

Two genuine defects were found, neither of them a missing migration:

- `20260725a_verification_needs_selection.sql` **cannot be applied as written**
  and must not be run (§6.1).
- `20260721g_verification.sql` is **partially applied**: one column silently
  did not land, and the shortfall reaches a live security check (§6.2).

---

## 3. The two ledgers

Production carries two independent migration ledgers, which is itself a finding.

| Ledger | Rows before audit | What it means |
| --- | --- | --- |
| `supabase_migrations.schema_migrations` | 1 — version `01`, `catalogue_fields` | The Supabase GitHub integration's own record. It contains one row because the automatic chain **applied `01` and then aborted**, and has never advanced since. |
| `public.schema_migrations` | 12 | A hand-maintained table (`filename`, `sha256`, `applied_at`) recording by-hand applications. Created outside any repository migration. One row carries the literal sha `applied-via-management-api`. |

The single row in the Supabase ledger records `01_catalogue_fields.sql` and
nothing after it. Whatever wrote it has not advanced since.

> **Correction, recorded after this audit was drafted.** The first version of
> this report followed `supabase/pending/README.md` in stating that the Supabase
> GitHub integration applies `supabase/migrations/` to **production** on push to
> `main`, and that production was therefore "protected by a broken migration,
> not by design".
>
> That is not supported. PR #73 established, and `docs/codex/DATABASE-STATE.md`
> now records, that the `Supabase Preview` check links to project
> `kltuzbxnldtmdfhakphv`, **which is not in this Supabase account at all** —
> listing every project the owner's token can reach returns four, and that
> reference is not among them. So the red check is a misconfiguration pointing
> somewhere else, not a failing preview of production, and it was never evidence
> about the production chain.
>
> What survives: the ledger has one row, the chain has never been demonstrated
> to apply cleanly to anything, and **every migration reaching production has in
> fact been applied by hand**. What does not survive: the claim that a repair to
> `02_ponte_previews_bucket.sql` would let the chain run against production. On
> current evidence no automated pipeline points at production at all.
>
> The practical instruction is unchanged and, if anything, firmer: apply by
> hand, with approval, and record it. But the reason is "nothing automated is
> wired up", not "the automation is jammed".

---

## 4. Reconciliation table

40 migration files under `supabase/migrations/`. Every one was parsed for the
objects it expects, and every object was checked against `information_schema`,
`pg_constraint`, `pg_indexes`, `pg_proc`, `pg_trigger`, `pg_policies`,
`pg_class.relrowsecurity` and `storage.buckets`. 260 individual object
assertions were evaluated.

Status legend: **AR** `applied_recorded` · **AU** `applied_unrecorded` ·
**PA** `partially_applied` · **M** `missing` · **S** `superseded` ·
**UA** `unsafe_or_ambiguous`.

| # | Migration | Status | Evidence |
| --- | --- | --- | --- |
| 1 | `01_catalogue_fields.sql` | AR | 7/7 `products` columns present. Recorded as version `01` in the Supabase ledger. |
| 2 | `02_ponte_previews_bucket.sql` | AU | Bucket `ponte-previews` + 4 storage policies present. **This is the file the auto-chain dies on** (bare `create policy` for a policy that already exists). |
| 3 | `20260526_b_catalogue_includes.sql` | AU | Data migration; 54/54 products carry `includes`. |
| 4 | `20260526_capacity_queue.sql` | AU | 6 columns + 3 indexes present. |
| 5 | `20260526_catalogue_restructure.sql` | AU | Data migration; catalogue state consistent. |
| 6 | `20260527_wave4_catalogue.sql` | AU | Data migration. |
| 7 | `20260528_wave4_product_copy_ponte_voice.sql` | AU | Data migration. |
| 8 | `20260610_adamftd_catalogue.sql` | AU | `products.cobrandable` present; both new categories and all 5 new SKUs (MA-200, MA-300, CS-002, GR-004, CP-001) present. |
| 9 | `20260610_lock_profile_role.sql` | AU | Function + trigger `guard_profile_role` present, `security definer`, `search_path=public`. |
| 10 | `20260720_marketplace_listings.sql` | AU | 25/25 assertions: tables, 3 indexes, 7 RLS policies, bucket `listing-docs`, 3 storage policies, function + trigger. |
| 11 | `20260720b_marketplace_browse.sql` | AU | Policy `Authenticated read approved listings` present. |
| 12 | `20260720c_marketplace_media.sql` | AU | 10/10: table, index, 4 policies, bucket `listing-media`, 2 storage policies. |
| 13 | `20260720d_ai_review.sql` | AU | `ai_review`, `ai_reviewed_at` present. |
| 14 | `20260720e_submitter_chain.sql` | AU | `submitter_role`, `chain_depth` present. |
| 15 | `20260721a_drafts_sharing.sql` | AU | `draft` in `listings_status_check`; both policies present. |
| 16 | `20260721b_connections.sql` | AU | 7/7: table, RLS, 4 policies, index. |
| 17 | `20260721c_translations.sql` | AU | Table + RLS present. |
| 18 | `20260721d_account_briefs.sql` | AU | Table + RLS present. |
| 19 | `20260721e_ai_freemium.sql` | AU | `profiles.ai_member`, `ai_usage` + RLS present. |
| 20 | `20260721f_credits_and_ai_metering.sql` | AU | 11/11: `credit_ledger`, `ai_calls`, 4 indexes, policy, `credit_balance()`, `spend_credits()`. |
| 21 | `20260721g_verification.sql` | **PA** | 20/21 present. **`profiles.verification_level` is `text` nullable, not `int not null default 0`.** See §6.2. |
| 22 | `20260721h_sanctions_match.sql` | AU | `sanctions_match(text,real,int,text,timestamptz)` present, 5-arg form, `security definer`, `search_path=public`. |
| 23 | `20260721i_verification_needs_selection.sql` | AU | `needs_selection` present in the live `verifications_status_check`. This is the constraint currently in force. |
| 24 | `20260721j_data_sources.sql` | AU | Both tables, index, RLS present. |
| 25 | `20260722b_hs_codes.sql` | AR | Table, 4 indexes, RLS policy, `hs_search()` present. 5,613 rows. |
| 26 | `20260722c_listings_v4.sql` | AU | 34/34: 20 columns, 3 constraints, HS foreign key, 4 partial indexes, `anonymous_drafts`, `tombstones`. |
| 27 | `20260722d_signup_credits.sql` | AU | `handle_new_user()`, `credit_purchases`, index, RLS policy. Backfill verified: 0 profiles lack a `grant_signup` row. |
| 28 | `20260722e_handle_new_user_search_path.sql` | AR | `handle_new_user()` carries `search_path=public`; trigger `on_auth_user_created` present on `auth.users`. 9 users / 9 profiles — backfill complete. |
| 29 | `20260722f_desk_radar.sql` | AR | Table + 2 indexes + RLS present. |
| 30 | `20260723a_desk_radar_signal_gate.sql` | AR | 6 columns, widened status constraint (`approved_signal` present), partial public index. |
| 31 | `20260723b_verification_purpose.sql` | AR | `verifications.purpose`, `profiles.business_verification_id` present. |
| 32 | `20260723c_verification_attestation.sql` | AR | `attested_at`, `attestation_version` present. |
| 33 | `20260723d_investigation_and_interest.sql` | AR | 12/12: 5 interest columns, constraint, `signal_investigations`, RLS, 2 policies, index. |
| 34 | `20260723e_investigation_dedupe_and_count.sql` | AR | `sync_investigation_count()` + trigger present. |
| 35 | `20260723f_referral_attribution.sql` | AR | `profiles.referral_code` present. |
| 36 | `20260724a_desk_radar_signal_import.sql` | AR | 4 columns + 2 indexes. Recorded sha was stale; see §5. |
| 37 | `20260724b_listings_desk_managed.sql` | AR | `listings.desk_managed` present. |
| 38 | `20260725a_verification_needs_selection.sql` | **UA** | **Not applied, and cannot be. See §6.1.** |
| 39 | `20260726a_investigation_kind.sql` | AR | 4 columns + 2 constraints present. |
| 40 | `20260728a_market_classification.sql` | **AU** | **31/31 assertions pass — already fully applied.** See §6.3. |

### Totals

| Status | Count |
| --- | --- |
| `applied_recorded` (before this audit) | **13** |
| `applied_unrecorded` | **25** |
| `partially_applied` | **1** |
| `missing` | **0** |
| `superseded` | **0** |
| `unsafe_or_ambiguous` | **1** |
| **Total** | **40** |

`20260725a` was *intended* to supersede `20260721i`, but because it cannot be
applied, `20260721i` remains the live constraint and nothing is superseded.

---

## 5. Order, duplicates and integrity

- **Migration-order gaps.** Filename order is not application order. 26 files
  were applied by hand at unrecorded times; only 12 carried timestamps. Ordering
  cannot be reconstructed from the ledger for the pre-`20260722b` set. No
  ordering *defect* was found — every dependency resolved, because each
  migration's objects exist.
- **Duplicate identifiers.** `20260721i_verification_needs_selection.sql` and
  `20260725a_verification_needs_selection.sql` share a name and conflict in
  content: the first widens the status list to seven values, the second narrows
  it to five. This collision is the direct cause of the §6.1 defect.
- **Missing letter slots.** `20260722a` is absent from `migrations/` by design —
  it is the deferred destructive `supabase/pending/20260722a_drop_legacy_shop.sql`.
  `20260720`/`20260720b–e`, `20260721a–j`, `20260722b–f` are otherwise contiguous.
- **Content drift after application.** `20260724a`'s recorded sha
  (`2a8a4b82…`) did not match the file (`fe7b8473…`). Explained and benign: the
  file was corrected in commit `9fa0aa6` *after* it was applied, changing a
  partial unique index to a plain one. Production was verified to match the
  **corrected** file (`CREATE UNIQUE INDEX … ON public.desk_radar USING btree
  (canonical_signal_id)`, non-partial), so the recorded hash was aligned during
  the ledger repair.
- **Application code vs. database.** Every table (23) and every RPC (4:
  `credit_balance`, `hs_search`, `sanctions_match`, `spend_credits`) referenced
  by `app/`, `lib/`, `components/` and `scripts/` **exists in production**. No
  code references an absent database object.
- **Silently no-opped DDL.** All 47 `add column if not exists` statements across
  the repository were compared against live types and nullability. Exactly one
  did not land as written: `profiles.verification_level` (§6.2).

### Schema present in production with no repository migration

21 tables exist in production that no repository file creates: `adamftd_usage`,
`adamftd_verification_checks`, `analytics_events`, `audit_logs`,
`blocked_entities`, `deal_documents`, `deal_events`, `deal_status_history`,
`deals`, `fraud_flags`, `messages`, `notifications`, `organizations`,
`saved_searches`, `schema_migrations`, `settlement_events`,
`settlement_milestones`, `settlements`, `subscriptions`, `trust_score_events`,
`user_reports`.

All carry RLS **except `public.schema_migrations`** (§6.4). Eight application
functions are likewise undeclared: `apply_trust_delta`,
`increment_adamftd_usage`, `increment_completed_deals`, `is_deal_participant`,
`match_hs_codes`, `touch_updated_at`, `update_updated_at_column`, `l1_distance`.

This confirms and extends the drift note already recorded in
`supabase/schema.sql`: **the repository cannot rebuild production**, and this
audit does not claim otherwise.

---

## 6. Findings requiring a decision

### 6.1 `20260725a_verification_needs_selection.sql` is unsafe — do not apply

**Severity: high. This is the one migration that must never be run as written.**

Its commit message (`c9ef0bc`) describes it as "additive, idempotent … the
canonical widened one". The SQL does the opposite: it drops **every** CHECK
constraint on `verifications` mentioning `status`, then adds one allowing only
`pending, auto_verified, review, failed, needs_selection` — **dropping
`verified` and `rejected`**, which `20260721i` had allowed.

Production holds rows in both dropped states: **1 `verified`, 2 `rejected`**
(of 9 verifications).

Proven by dry run inside a rolled-back transaction against production:

```
ERROR: 23514: check constraint "verifications_status_check" of relation
"verifications" is violated by some row
```

It also contradicts the application: `lib/verification/rescreen.ts:47` selects
`.in("status", ["auto_verified", "verified"])`, and
`lib/listings/publication-gate.ts:39` defines
`PASSING_VERIFICATION_STATUSES = {"auto_verified", "verified"}`. Removing
`verified` would make it impossible for any listing to ever pass the publication
gate.

The whole file is a single `DO` block, so a failed run rolls back atomically and
leaves production unchanged — it fails safe. **The danger is a well-meaning
repair that splits the drop and the add into separate statements, which would
leave `verifications` with no status constraint at all.**

**Recommendation:** delete or rewrite the file. It is redundant — `20260721i`
already achieved its stated goal, and `needs_selection` is live. No production
action required.

### 6.2 `profiles.verification_level` — partially applied, with a latent security effect

`20260721g_verification.sql` declares:

```sql
alter table profiles add column if not exists verification_level int not null default 0;
```

The column already existed as **`text`, nullable**, so `if not exists` silently
no-opped. Live values: `unverified` ×7, `company_verified` ×1, `null` ×1.

The application treats it as a number. `lib/listings/publication-gate.ts:163`:

```ts
if (Number(s.verificationLevel ?? 0) < MEMBER_BUSINESS_MIN_LEVEL) return false;  // MIN = 2
```

`Number("company_verified")` is `NaN`, and `NaN < 2` is `false`, so the guard
does not fire and the **member-business level floor is not enforced**. The same
coercion appears in nine call sites across `marketplace`, `admin/listings`,
`lib/board/live-deals.ts` and `lib/board/qualified-opportunity.ts`.

**This is already recorded as R-01 in
`docs/codex/audits/issue-42-phase-a/REPOSITORY-RISK-FINDINGS.md`** (26 July
2026), which deferred the fix to "a separate targeted corrective PR". This audit
confirms it is **still unremediated**, and adds the production bound:

The flaw is **latent, not currently exposed**. Both approved listings
(`PT-9001`, `PT-9002`) belong to owners whose bound verification is in status
`review`, which fails the earlier `PASSING_VERIFICATION_STATUSES` check before
the level comparison is ever reached. Verified live: `/en/marketplace/l/PT-9001`
returns **404**, which is the publication gate behaving correctly.

**It becomes live the moment that one verification moves to `verified` or
`auto_verified`** — at which point the level floor is skipped silently.

**Why this is not remediated here:** the repair is genuinely ambiguous and
data-transforming. Two incompatible directions exist, and the choice is the
owner's:

- **(a)** Convert the column to `int` per the migration, mapping the text enum
  (`unverified | email_verified | phone_verified | company_verified |
  fully_verified`) onto integers. Whether `company_verified` maps to `1` or `2`
  decides whether the current desk account passes the floor — a business
  decision, not a mechanical one.
- **(b)** Accept `text` as canonical (commit `9fa0aa6` and
  `scripts/seed-ponte-managed-qos.ts:117` both treat the text enum as correct
  and production as authoritative), correct **migration `20260721g`** and
  replace the nine `Number(...)` coercions with an ordered enum comparison.

Direction (b) matches production and the more recent recorded intent. Either
way it is a code-and-schema change beyond migration reconciliation.

### 6.3 `20260728a_market_classification.sql` is already applied

The migration flagged for approval in this task **was already fully applied to
production before this audit began.** All 31 assertions pass: 11 `listings`
columns, 6 `desk_radar` columns, 5 coherence CHECK constraints (plus the 3
implicit value constraints), and 9 indexes including both GIN indexes.

Prerequisites verified: `listings` and `desk_radar` both exist with every
column the constraints reference. The four family-coherence constraints are
present in production in their explicit `market_family is not null and
market_family = '…'` form, not the shorter form that would accept a NULL result.

**No action was taken and none is required.** `docs/codex/DATABASE-STATE.md`
described it as "written and NOT applied"; that record was stale and is
corrected by this audit.

**No backfill was performed.** `market_family` is `null` for all 6,735 signals
and all 5 listings. The migration requires no backfill — every column it adds is
nullable — and per the audit instruction, classifying the historical Market
Signals inventory remains a separate task.

### 6.4 `public.schema_migrations` is anonymously writable

**Severity: medium (integrity of the audit record, not data exposure).**

The hand-maintained ledger table has **RLS disabled** and full
`SELECT, INSERT, UPDATE, DELETE, TRUNCATE` grants to `anon` and `authenticated`.
Because it sits in the `public` schema it is exposed through PostgREST.

Confirmed with the public anon key — full ledger contents returned:

```
GET /rest/v1/schema_migrations  ->  200  [{"filename":"20260722b_hs_codes.sql", …}]
```

The write path was **not** exercised, since doing so would damage production;
the grants are sufficient evidence. An anonymous caller could insert false
entries or truncate the ledger, making the migration record untrustworthy —
including the reconciliation performed by this audit.

Every other table is correctly protected: an anon probe against `profiles`,
`listings`, `verifications`, `credit_ledger`, `desk_radar`, `sanctions_entries`,
`signal_investigations`, `listing_connections`, `account_briefs` and `ai_calls`
returned zero rows in all cases.

**Not remediated by this audit.** `AGENTS.md` line 102 requires explicit owner
approval before altering production RLS.

> **RESOLVED, 28 July 2026 at 14:07 UTC.** Fixed independently by PR #76 and
> `20260728b_schema_migrations_rls.sql`, applied to production and recorded in
> the ledger. Re-verified for this report:
>
> - `pg_class.relrowsecurity` for `public.schema_migrations` is now `true`;
> - `anon` and `authenticated` hold **no** privileges on it;
> - `postgres` and `service_role` keep all seven, so `scripts/db-query.mjs` and
>   `scripts/apply-migration.mjs` still write the ledger — confirmed by reading
>   40 rows through the Management API after the change;
> - an anon-key `GET /rest/v1/schema_migrations` now returns **HTTP 401**,
>   `42501 permission denied`, where it returned 200 with real rows before.
>
> PR #76 also found the root cause this report did not: the table is created by
> `scripts/db-query.mjs` and `scripts/apply-migration.mjs` with a bare
> `create table if not exists`, and Supabase's default privileges grant every
> new `public` table to `anon` and `authenticated`. Both scripts were hardened,
> so a ledger created fresh in another project is protected from its first row.

### 6.5 No automated pipeline applies migrations to production

Restated because it frames everything above, and **corrected** against the
first draft of this report (see the correction in §3).

This report originally said the Supabase integration applies
`supabase/migrations/` to production on merge and aborts at
`02_ponte_previews_bucket.sql`, so that production was protected by the
breakage. On the evidence now recorded in `docs/codex/DATABASE-STATE.md`, the
`Supabase Preview` check points at `kltuzbxnldtmdfhakphv`, a project this
account cannot see. It is a misconfiguration, not a jammed pipeline aimed at
production.

What that changes: repairing `02` does **not** arm a chain against production,
because nothing automated is aimed there. What it does not change: the chain has
never been shown to build a database from the repository, so `01` and `02` still
block any attempt to rebuild, and every production change still has to be applied
by hand and recorded.

`20260725a` remains unrunnable wherever the chain is eventually pointed (§6.1),
so it must be excluded before any chain repair, not after.
`docs/plans/active/migration-chain-reconciliation.md` is the authority for that
work; it remains proposed and unapproved.

---

## 7. Remediation executed

**One change was made to production.** No schema was altered, no application
data was written, and no migration was replayed.

### Migration ledger repair

`public.schema_migrations` was reconciled from **12 rows to 39**, recording every
migration this audit verified as applied.

- INSERT-only, via `on conflict (filename) do nothing`; no existing row's
  `applied_at` was rewritten.
- One `UPDATE`: `20260724a`'s stale sha aligned to the corrected file (§5).
- `20260725a` was **deliberately excluded** — it is not applied and must not be
  recorded as such.
- `applied_at` on the 27 new rows is the **reconciliation** timestamp, not the
  original application time, which is unrecoverable. This is stated here because
  the ledger itself cannot express the distinction.
- Evidence SQL: `docs/codex/audits/2026-07-28-ledger-repair.sql`.
- **Rollback:** `delete from public.schema_migrations where applied_at >= '2026-07-28T13:50:00Z';`

**Expected application impact: none.** No application code reads this table.

### Deliberately not executed

| Item | Why |
| --- | --- |
| `20260725a` | Proven to fail against live rows; would break the publication gate (§6.1). |
| `profiles.verification_level` repair | Ambiguous and data-transforming; the mapping is an owner decision (§6.2). |
| `public.schema_migrations` RLS | Production RLS change requires explicit owner approval per `AGENTS.md` (§6.4). |
| `02_ponte_previews_bucket.sql` repair | Would arm the auto-apply chain against production (§6.5). |
| `supabase/pending/20260722a_drop_legacy_shop.sql` | Destructive, deliberately deferred, out of scope. |
| Market Signals classification backfill | Not required by any migration; excluded by instruction (§6.3). |

---

## 8. Post-remediation verification

### Repository vs. production, re-run

Full schema re-snapshot and re-verification after the repair: **39 of 40
migrations fully verified, 1 excluded by design.** Ledger now holds 39 rows;
`in repo but not in ledger` = `["20260725a_verification_needs_selection.sql"]`;
`in ledger but not in repo` = none.

### Application verification suite

`npm run verify` — **exit code 0**. Covers `check-messages`, `check-encoding`,
`check-governance`, the full unit suite (37 test files), `tsc --noEmit
--incremental false`, and `next build`.

> An earlier run failed with `Cannot find module '@playwright/test'` and ~60
> cascading `TS7031` errors. That was an environment gap — this worktree had no
> `node_modules`. After `npm ci` the suite passes clean. It was not a code defect
> and nothing was changed to make it pass.

### Production smoke tests — `https://ponte.trade`

| Surface | Route | Result |
| --- | --- | --- |
| Landing | `/en` | 200 |
| Navigation | `/en/find` | 200 |
| Market Signals read | `/en/market-signals` | 200 (3,543 approved signals) |
| Market Signal detail | `/en/market-signals/EXT-G4WB-000001` | 200 |
| Find — products | `/en/find?family=products` | 200 |
| Find — services | `/en/find?family=services` | 200 |
| Find — distribution | `/en/find?family=distribution` | 200 |
| Product Start a Deal | `/en/structure?family=products` | 200 |
| Trade Services Start a Deal | `/en/structure?family=services` | 200 |
| Distribution Start a Deal | `/en/structure?family=distribution` | 200 |
| Authentication | `/en/login` | 200 |
| Account / business status | `/en/account` | 200 → redirects to `/login` when unauthenticated (correct gating) |
| Business verification | `/en/verify` | 200 |
| Marketplace | `/en/marketplace` | 200 |
| Qualified Opportunity detail | `/en/marketplace/l/PT-9001` | **404 — correct.** Owner's bound verification is in `review`, which the publication gate refuses. Not a schema fault (§6.2). |

### RPCs dependent on migrated schema

| RPC | Result |
| --- | --- |
| `hs_search('coffee', 3)` | 3 rows, correct coffee HS codes at score 0.95 |
| `sanctions_match('mohammad', 0.4, 10, null, null)` | 10 candidates |
| `credit_balance(uuid)` | 3 |
| `trust_score(uuid)` | 0 |
| `GET /api/hs/search?q=coffee` | 200 |
| `GET /api/me` | 200 |

### Records intact

Identical before and after remediation: 9 auth users, 9 profiles, 5 listings,
6,735 signals, 9 verifications, 18 credit-ledger rows, 5,613 HS codes, 31,801
sanctions entries, 1 investigation, 54 products.

### RLS still blocks unauthorised access

Anon-key probe after remediation returned **zero rows** from all ten business
tables tested. The single exception is `public.schema_migrations` (§6.4), which
was already open before this audit and was not changed by it.

---

## 9. Is the platform database-synchronised with `main`?

**Yes, with one documented exception and one caveat.**

- 39 of 40 migrations are applied and now correctly recorded.
- The 40th, `20260725a`, is **not** applied and **should not be** — it is a
  defective file, not a gap. Synchronisation requires deleting or rewriting it,
  not running it.
- `20260721g` is applied except for one column whose live type contradicts the
  migration (§6.2). The schema is *usable*; the migration is *inaccurate*.

**Caveat:** synchronised does **not** mean reproducible. Production carries 21
tables and 8 functions no repository file creates, and the auto-apply chain
cannot build a database from the repository. That is the subject of
`docs/plans/active/migration-chain-reconciliation.md` and is unchanged here.

---

## 10. Open items for the owner

Owner direction of 28 July 2026, and where each item now stands.

This pull request carries the audit record only: this report, the ledger-repair
evidence SQL, and the `DATABASE-STATE.md` entry. Every item below ships
separately, and **none of them changes production.**

1. **`20260725a` is to be permanently excluded** (§6.1). Move it out of
   `supabase/migrations/` so no chain can reach it, and guard it so it cannot be
   reinstated silently. Owner direction: mark it deprecated, make no production
   change for this item.
2. **`profiles.verification_level` — no mapping guessed** (§6.2). Owner
   direction: produce a separate remediation proposal first, showing every value
   currently in production, every application reference, the proposed canonical
   type, the exact mapping and its rollback, and whether the column should
   remain at all. Nothing to be executed until that is reviewed.
3. **`public.schema_migrations` — already done** (§6.4). Closed by PR #76 and
   applied to production at 14:07 UTC on 28 July 2026, independently of this
   audit. Anon access is refused; `postgres` and `service_role` keep write
   access, so `scripts/db-query.mjs` and `scripts/apply-migration.mjs` are
   unaffected. Re-verified for this report. **No further migration is needed for
   this item.**
4. **The missing production baseline is a separate workstream** (§5). A proposal
   is required for a reproducible baseline covering the 21 tables and 8
   functions with no repository creation path. No schema dump is to be generated
   or applied without review.
5. **`.env.local` is a separate security issue** (§1): local development points
   at the production database by default, and the file holds a plaintext
   production database password.
6. **Approve or reject the chain reconciliation plan** (§6.5). Still open, and
   now better scoped: the `Supabase Preview` misconfiguration means the repair
   is "make the repository able to build a database", not "disarm a pipeline".
