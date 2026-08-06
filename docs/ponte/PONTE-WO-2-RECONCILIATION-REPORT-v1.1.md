# Ponte Trade, WO-2 database reconciliation report

**Version:** 1.1, revised against the strategic review of 2 August 2026
**Prepared by:** Claude (`claude-opus-5`), working in the Cowork session as UX/UI Director. **The technical analysis in this document is mine, not Claude Code's.** Claude Code did not run it, did not see the export, and holds no production credentials. Attribution corrected at review request.
**Repository commit examined:** `2a97f065029314509c21cac31426d34a3cc85c02` (`2a97f06`, 2026-08-02T18:33:25+02:00, *"docs: add Set 3 design reference"*). `git status` reports `supabase/` and `scripts/` clean at that commit, so every file checksummed below is the file at that commit.
**Production export taken:** 2026-08-02T16:40:37Z
**To:** Giuseppe Funaro, ChatGPT (strategic reviewer), Claude Code
**Authority:** `DECISION-20` steps 1 and 2, `DECISION-22` option A
**Scope, binding:** no migration SQL, no preferred remedy, no implementation recommendation. Severity, uncertainty and missing evidence only.

**Governance conclusion, as directed by the strategic review:** this report triggers the **severe branch of `DECISION-26`**, on the reproducibility finding alone, even though **production data has not been shown to be damaged and has not been inspected**.

---

## Changes in v1.1

Seven corrections were required before acceptance. All are applied, and each is marked in place.

| # | Correction | Where |
|---|---|---|
| 1 | "A staging environment cannot be created" replaced throughout with **"cannot currently be recreated from the version-controlled repository alone"** | §1, §4, §5 |
| 2 | "Member data is negligible" **removed**. Planner estimates are stale or absent for many tables and do not establish volume. | §3.6 |
| 3 | Member-data integrity reclassified from *minor* to **undetermined** | §5 |
| 4 | Absence of `FORCE ROW LEVEL SECURITY` no longer stated as a defect. Reframed as the real question: whether application or `SECURITY DEFINER` paths bypass the intended Deal Room permission boundary. | §3.4 |
| 5 | "Nothing can be done to the legacy listings table" narrowed to **cannot safely be dropped or replaced without first addressing its two remaining foreign keys** | §3.1, §4 |
| 6 | Second human reviewer requirement restated correctly: required to review **the eventual migration and rehearsal evidence before production execution**. Absence does not prevent preparation of the plan. | §8 |
| 7 | Attribution corrected to the actual technical author and pinned to the examined commit | header |

**Added:** a full evidence appendix, §9, so the headline numbers are auditable rather than asserted.

---

## Evidence base

Two sources, both obtained without any AI connecting to production.

1. **`ponte_schema_export`**, one JSON document, run by Giuseppe by hand in the Supabase dashboard SQL editor. Reported `meta`: `exported_at_utc` 2026-08-02T16:40:37.583192, `server_version` PostgreSQL 17.6 on aarch64, `database` `postgres`, `ran_as` `postgres`. Schema and catalogue only.
2. **The 55 migration files** in `supabase/migrations` at commit `2a97f065`, read from Giuseppe's disk over the device bridge and checksummed with SHA-256.

**No row contents were read.** Every statement about data below is either a planner estimate or a structural fact. `DECISION-22` option A held throughout.

**Chain-of-custody limitation, stated plainly.** The export was produced by pasting SQL text into a browser SQL editor by hand. **The script that produced it is not in version control** (see §9.2), so the export cannot presently be reproduced by re-running a committed artefact. Its internal consistency and its `meta` block are the only provenance it has. This is an evidence weakness in the export itself, not in the analysis of it, and closing it is a precondition of any future re-run being comparable to this one.

---

## 1 · The headline

**The applied history is largely traceable. The reproducible history does not exist.**

These are two different things and they have been argued about as if they were one. Separating them is the main product of this report.

| | Finding |
|---|---|
| **What production has actually had done to it** | Traceable file by file. **52 of 53** recorded migrations match the repository file at `2a97f065` byte for byte by SHA-256. One is unverifiable. Zero ledger rows lack a repository file. Full manifest at §9.3. |
| **What the repository can build from nothing** | No complete genesis schema exists. **Production cannot currently be recreated from the version-controlled repository alone.** |

The consequence that matters commercially: **`DECISION-20` step 4 requires a staging rehearsal with demonstrated rollback before any production migration. A staging environment cannot currently be recreated from the version-controlled repository alone, so a rehearsal cannot presently be performed reproducibly.** Stated as a fact, not as a proposal.

---

## 2 · Migration ledger reconciliation

### 2.1 The two ledgers disagree almost completely

| Store | Rows |
|---|---|
| `public.schema_migrations` | **53** |
| `supabase_migrations.schema_migrations` | **1**, `{version: "01", name: "catalogue_fields"}` |

`public.schema_migrations` is a hand-maintained table belonging to this project. `supabase_migrations.schema_migrations` is the store the Supabase CLI reads and writes. The CLI believes one migration has ever been applied to this database.

This is the **"histories conflict materially"** criterion in the severity definition, evidenced directly rather than inferred. It also explains, without needing FINDING-01's filename-pattern argument, why the CLI cannot be used against this project: whatever it did next, it would do believing the database is at `01`.

**Which store reconciles:** `public.schema_migrations`. It reconciles against the repository to within one file. `supabase_migrations.schema_migrations` reconciles against nothing.

### 2.2 Repository to production, file by file

| Class | Count | Detail |
|---|---|---|
| Recorded applied **and** checksum matches the repo file exactly | **52** | The file that ran is the file at `2a97f065`. No post-application editing detected. |
| Recorded applied, **no checksum recorded** | **1** | `20260722b_hs_codes.sql`, recorded as `applied-via-management-api`. Cannot be confirmed either way, permanently. |
| In repo, **not recorded applied** | **2** | See 2.3 |
| Recorded applied, **file missing from repo** | **0** | |

Per-file evidence at **§9.3**.

52 of 53 checksums matching is a materially better result than FINDING-01 implied and it should be recorded plainly. **No evidence was found that any applied migration was edited after application.**

### 2.3 The two unapplied files

Both declare their own status in their headers. Neither is an accident.

| File | Size | Applied? | Objects present in production? |
|---|---|---|---|
| `20260730a_market_signal_search.sql` | 10,616 B | No. Header: *"NOT APPLIED. Written and reviewed; not run against production."* | **No.** None of its nine indexes appears in `pg_indexes`. |
| `20260731e_deal_room_paid_room_periods.sql` | 15,752 B | No. Header: *"WRITTEN AND NOT APPLIED."* | **No.** `deal_room_room_periods` and `deal_room_billing_events` are absent from `information_schema.columns`; `deal_room_entitlements.current_period_id` is absent; the `kind` CHECK still admits only `starter`, `sponsored`, `waived`. |

Consistent throughout. No evidence of partial application of either.

### 2.4 Ordering and recording anomalies

None of these is shown to have changed an outcome. They are recorded because they are what an audit would ask about.

- **20 of the 53 rows carry the identical timestamp `2026-07-28T13:37:42.50114`.** That is a retrospective backfill of pre-existing history into the ledger on 28 July, not twenty migrations applied in one instant. For those twenty the ledger evidences **file content only**, not application date or order.
- **Three rows are recorded out of filename order relative to apply time.** `20260724a` (24 Jul 18:05:37) sits after the 28 Jul backfill block; `20260728c` applied 29 Jul after `20260728d` applied 28 Jul; `20260729c` applied 31 Jul 04:26:35 after `20260731a` at 04:26:11.
- **Filename-sequence gaps:** no `20260722a` in the applied set (it is in `supabase/pending/`), no `20260725*`, no `20260730a` (unapplied), no `20260731e` (unapplied).
- `pg_class` estimates `schema_migrations` at 46 rows against 53 rows actually returned. Stale planner statistics, not a discrepancy in the ledger.

### 2.5 There is no genesis

No file in the chain creates `profiles`, `organizations`, `products`, `categories`, `orders`, `order_items`, `order_notes`, `bundle_items` or `newsletter_subscribers`. Verified by pattern search across all 55 files at `2a97f065`.

`supabase/schema.sql` creates `profiles` with **7 columns**. Production `profiles` has **31**. The repository already documents this in that file's own header, naming eighteen columns *"added straight to the database"* and stating: *"Applying this repository to an empty project therefore does NOT reproduce production."*

This is the single most important structural fact in the report, and the repository already recorded it honestly before this exercise began.

---

## 3 · Schema state

### 3.1 The legacy layer is still live

- **`listings_legacy_20260720` still exists**, and two foreign keys still reference it rather than `listings`: `deals.listing_id` and `adamftd_verification_checks.listing_id`, both `ON DELETE SET NULL`. **It cannot safely be dropped or replaced without first addressing those two foreign keys.** Whether either holds rows is undetermined; both referencing tables are unanalysed.
- **`listings_pkey1`**, the primary key on the current `listings` table, carries a `1` suffix. Residue of the rename that created it while `listings_pkey` was still taken.
- **The report-shop tables are still in production**: `products` (planner estimate ≈50 rows), `categories`, `orders`, `order_items`, `order_notes`, `bundle_items`, `newsletter_subscribers`. The migration that drops them, `20260722a_drop_legacy_shop.sql`, sits in `supabase/pending/` and has never been applied.
- **`deals`** is a complete second, older deal model (`stage`, `contact_unlocked`, `initiator_accepted_contact`, `counterparty_accepted_contact`), coexisting with `deal_rooms` and wired to the legacy listings table.

### 3.2 Classification taxonomies coexist

`listings` carries **three** overlapping classification axes:

| Column | Values |
|---|---|
| `type` | `offer`, `requirement`, `service` |
| `market_family` | `products`, `services`, `distribution` |
| `market_intent` | 7 values, including `seek_brands_or_products_to_represent` |

`market_intent` admits **seven** values, not six. The seventh is the distribution-inbound position. Whether that is the correct expression of `DECISION-17`'s six opportunity types plus a position, or an eighth thing, is a model question and is not settled here.

**`market_family` admits only `products`, `services`, `distribution`,** on both `listings` and `deal_rooms`. The values that caused the signed-in crash (`goods`, `trade_services`, `product`) are outside both CHECK constraints.

### 3.3 Structural integrity observations

- **One constraint is `NOT VALID`:** `listings_product_fields_family` on `listings`. Existing rows were never validated against it. Enforced on new writes only. Whether any row violates it is **undetermined** and cannot be determined without row access or a rehearsal environment.
- **`deal_rooms.listing_id` is `NOT NULL` with `ON DELETE RESTRICT`.** A Deal Room cannot exist without a listing.
- **`deal_room_entitlements` has `UNIQUE (room_id)` and no constraint on `org_id`.** The data layer does not enforce one entitlement per organisation. Whether that rule exists in application code was not examined and is **undetermined**.
- **`listing_connections`**, the interest object, admits `pending`, `accepted`, `declined` only. Set 3 `D02` requires **Pending, Lapsed and Accepted, with withdrawal offered at any time**. Neither a withdrawn nor a lapsed state exists in the schema.

### 3.4 Row level security, stated as a question rather than a defect

**Facts.** RLS is enabled on all 76 tables in the export. `relforcerowsecurity` is false on all 76. There are 97 policies. **Thirteen tables in `public` have RLS enabled and zero policies**, which is deny-all to `anon` and `authenticated`: `account_briefs`, `ai_calls`, `ai_usage`, `anonymous_drafts`, `data_source_cache`, `data_sources`, `deal_room_agreement_documents`, `desk_radar`, `listing_translations`, `newsletter_subscribers`, `sanctions_entries`, `sanctions_refresh_log`, `schema_migrations`. There are **32 `SECURITY DEFINER` functions** in `public`, 23 of them in the `deal_room_*` family.

**Absence of `FORCE ROW LEVEL SECURITY` is not by itself a defect.** It is the default, and the owning role is not a role members hold.

**The actual security question, which this export cannot answer:** *do the application's server-side paths and the 32 `SECURITY DEFINER` functions respect the Deal Room permission boundary that `AUTH-05` makes mandatory, or does any of them bypass it?* A `SECURITY DEFINER` function executes as its owner and is unaffected by policy. Answering this requires reading `20260729b_deal_room_rls.sql` (76,684 B), `20260730b`, `20260730c`, `20260731c`, `20260731d` and the server-side call sites against the policy catalogue. That is repository work and needs no production access. **It is the highest-value follow-up in this report and it is not done.**

Two specific cases worth naming in that review:

- **`desk_radar`** (Market Signals, planner estimate ≈11,680 rows) is deny-all, so every public read of a signal goes through a service-role path. `20260730a`'s header confirms this is deliberate.
- **`deal_room_agreement_documents`** is the only `deal_room_*` table with no policy while every sibling has one. Whether intentional is undetermined from the catalogue.

### 3.5 Storage

Seven buckets. **Two are public.**

| Bucket | Public | Size limit | MIME types | Created |
|---|---|---|---|---|
| `listing-media` | **yes** | 50 MB | images, mp4, webm, quicktime | 2026-07-21 |
| `ponte-previews` | **yes** | 50 MB | `application/pdf` only | 2026-05-24 |
| `deal-room-evidence` | no | 25 MB | pdf, png, jpeg, webp | 2026-07-31 |
| `listing-docs` | no | 10 MB | pdf, png, jpeg, webp | 2026-07-20 |
| `verification-docs` | no | 25 MB | pdf, png, jpeg, webp | 2026-07-21 |
| `ponte-deal-docs` | no | **none** | **none** | 2026-06-05 |
| `ponte-verification` | no | **none** | **none** | 2026-06-04 |

`listing-media` being public is coherent with public listings. **`ponte-previews` is a public, PDF-only bucket created 24 May 2026**, before the current product. Its contents are readable by anyone holding a URL. What it contains is **undetermined**: object listings are not in this export.

### 3.6 Volumes

**These are planner estimates from `pg_class.reltuples`, not counts.** `-1` means the table has never been analysed. Estimates are stale or absent for most tables and **do not establish actual volume or integrity**. No conclusion about the amount of member data should be drawn from them, and none is drawn here.

| Table | Planner estimate | Last analysed |
|---|---|---|
| `sanctions_entries` | 32,047 | autoanalyse |
| `desk_radar` | 11,680 | autoanalyse |
| `hs_codes` | 5,613 | autoanalyse |
| `products` (retired shop) | 50 | autoanalyse |
| `credit_ledger` | 21 | autoanalyse |
| `profiles` | 10 | autoanalyse |
| `listings` | 8 | 2026-07-31 autoanalyse |
| `deal_rooms` | 1 | autoanalyse |
| `organizations`, `deals`, `listing_connections`, `anonymous_drafts`, `listings_legacy_20260720` and 39 others | **never analysed** | none |

**Actual row counts are undetermined.** Obtaining them is a permitted operation under `DECISION-22` option A and would materially improve the next report.

### 3.7 Credits

Present and structurally intact: `credit_ledger` (planner estimate ≈21 rows), `credit_purchases` with `UNIQUE (stripe_session_id)`, and the functions `spend_credits()` and `credit_balance()`. `AUTH-01` removed credits from the product. `P2-1` requires withdrawal as a six-step sequence rather than a delete. The presence of ledger rows, however many, is the reason that sequence exists rather than a delete.

---

## 4 · Blockers to a forward migration

Stated as blockers. No remedy proposed.

1. **A staging environment cannot currently be recreated from the version-controlled repository alone**, so `DECISION-20` step 4 cannot be performed reproducibly. This blocks the sequence, not one step of it.
2. **`20260730a_market_signal_search.sql` will fail as written.** It creates `pg_trgm` `with schema extensions` and then references `extensions.gin_trgm_ops`. **`pg_trgm` is already installed in production in schema `public`, version 1.6.** `create extension if not exists` will be a no-op, the operator class will not resolve under `extensions.`, and the index statements will fail. The four trigram indexes already in production (`sanctions_name_trgm`, `sanctions_alias_trgm`, `hs_codes_search_idx`, `verifications_subject_trgm`) all use the unqualified form. Evidenced from `pg_extension` and `pg_indexes`.
3. **`listings_product_fields_family` is `NOT VALID`.** Any operation that validates or rewrites it will test rows never tested.
4. **`listings_legacy_20260720` cannot safely be dropped or replaced** until `deals.listing_id` and `adamftd_verification_checks.listing_id` are addressed.
5. **`20260722a_drop_legacy_shop.sql` is written, pending and unapplied** while its target tables are live and at least one holds rows.
6. **The 20 backfilled ledger rows carry no reliable apply date or order.** Any reasoning that depends on the sequence in which the pre-28-July schema was built is reasoning from a file name.

---

## 5 · Severity

Against the severity definition: *severe where migration lineage cannot be proven, member-data integrity is uncertain, histories conflict materially, or safe rollback cannot be demonstrated.*

| Axis | Classification | Basis |
|---|---|---|
| **Applied lineage** | **Minor** | 52 of 53 checksum-verified against the repo at `2a97f065`. One permanently unverifiable. Zero orphan ledger rows. |
| **Ledger consistency** | **Material** | The two stores disagree 53 to 1. The CLI store is unusable. Twenty rows are backfilled with no reliable date or order. |
| **Reproducibility** | **SEVERE** | No complete genesis schema. Production cannot currently be recreated from the version-controlled repository alone. Already documented in `supabase/schema.sql`. Blocks `DECISION-20` step 4. |
| **Member-data integrity** | **UNDETERMINED** | No rows were inspected. One `NOT VALID` constraint exists. Row counts are unknown for most tables. Nothing here supports either a clean or an unclean finding. |
| **Safe rollback** | **Cannot presently be demonstrated** | Not because rollbacks are missing, the two unapplied files carry written ones, but because there is nowhere to rehearse one reproducibly. |

**Overall: material, with one severe finding and one undetermined axis.**

**Governance consequence, as directed by the strategic review: the severe branch of `DECISION-26` is triggered** on the reproducibility finding alone, notwithstanding that production data has not been shown to be damaged and has not been inspected.

---

## 6 · The commercial-model conflict found during this work

Recorded here because it was found during the reconciliation, and because it constrains what any migration plan may contain.

**`DECISION-28` has since been taken. Canonical authority v5.2 prevails.**

- Binding model: **first activation free for 30 calendar days per business-verified organisation; every later activation, renewal or reactivation $79 for 30 calendar days; no Starter-specific participant, branch or functional restriction.** Common technical and safety limits may apply equally.
- The branch-capacity model in `20260731e_deal_room_paid_room_periods.sql` (**$15 per additional branch, $199 ceiling**) is **superseded and must not be applied**. The file must be replaced during planning, not applied and then amended.
- `ADR-0020` is to be marked superseded **only where it conflicts** with this model.

**Three things `DECISION-28` does not yet cover, flagged for the record and not decided here:**

1. **`ADR-0028` also carries the superseded model** and is more recent than `ADR-0020` (accepted 1 August, merged via PR #218). It states *"Do not issue a free Starter Deal Room entitlement"* and republishes $79 / 5 / $15 / $199. It needs the same treatment as `ADR-0020`.
2. **`lib/deal-room/pricing.ts` is on `main`, implemented and pinned by test** to `BASE_ROOM_PRICE_CENTS 7900`, `INCLUDED_ACTIVE_BRANCHES 5`, `ADDITIONAL_BRANCH_PRICE_CENTS 1500`, `MAXIMUM_ROOM_PERIOD_PRICE_CENTS 19900`, with a 13-row published price table. It is called by nothing today.
3. **`/deal-rooms/inside` is live in production** and reads its prices from that module. **The superseded model is therefore currently published to visitors**, which makes this a live copy correction and not only a documentation one.

The consequence for `DECISION-20` step 3: **the target schema for entitlements and paid periods is now defined by `DECISION-28`, not by `20260731e`.** Any plan that carries that file forward unchanged is planning against a superseded commercial model.

---

## 7 · What could not be determined, and what would determine it

| Unknown | What would answer it | Available now? |
|---|---|---|
| Actual row counts for the 44 never-analysed tables | `count(*)` per table, or `ANALYZE` then re-read | **Yes**, within `DECISION-22` option A |
| Whether any row violates `listings_product_fields_family` | Row access, or `VALIDATE CONSTRAINT` in a rehearsal environment | No |
| Whether `deals` and `listings_legacy_20260720` hold live rows | Row counts on two unanalysed tables | **Yes**, within option A |
| What the public `ponte-previews` bucket contains | A storage object listing | Not in this export |
| Whether any `SECURITY DEFINER` path bypasses the `AUTH-05` boundary | Reading the five RLS and ACL migrations against the policy catalogue and the server-side call sites | **Yes**, repository work only |
| Whether the one-entitlement-per-organisation rule exists in code | Repository search | **Yes**, repository work only |
| Whether `20260722b_hs_codes.sql` as applied matches the repo file | Nothing. Applied through the management API with no checksum recorded. | **Never** |
| True apply order of the 20 backfilled migrations | Nothing available. Inference only. | **Never** |

---

## 8 · Governance

**`DECISION-24`, restated correctly.** A second competent human database reviewer is required to review **the eventual migration and the rehearsal evidence, before production execution**. That reviewer's absence does **not** prevent Claude Code from preparing the `DECISION-20` step 3 plan, and does not block any repository-only work in §7.

**What this report does not contain.** No proposed migration. No preferred remedy. No implementation recommendation. No launch date, and nothing in it supports fixing one.

---

## 9 · Evidence appendix

Added in v1.1 so the headline numbers are independently auditable.

### 9.1 Artefacts and their checksums

| Artefact | SHA-256 | Bytes |
|---|---|---|
| Repository commit examined | `2a97f065029314509c21cac31426d34a3cc85c02` | commit SHA, not a file hash |
| Raw export as pasted from the SQL editor, including the column header and delimiters | `cb69e1be5e42503ad7d5738a4e8c06b17438f5dec723db4d33356ff6318b1487` | 1,235,768 |
| Extracted `ponte_schema_export` JSON document, the object actually analysed | `cc8379201f40e1a09dd8137661ff450abff555ee2a36e8c5929458dcd68624de` | 411,918 |
| Export script text as held in the analysis session, `schema-export-web.sql` | `3034e4097c4556a49c0f95a6753836d9f7ba94618f3cb88edda05b68f317b45e` | 12,730 |

The JSON was obtained from the raw paste by taking the substring from the first `{` to the last `}`. No other transformation was applied. Both hashes are given so the extraction can be re-performed and checked.

### 9.2 Export-script provenance, and the gap in it

**`scripts/schema-export-web.sql` does not exist in the repository at `2a97f065`.** `scripts/schema-export.sql` does exist (10,243 B), but that is the psql variant, which cannot run in the web editor: it uses `\pset` and `\echo` meta-commands the server never sees, and the editor returns only the final result set of a multi-statement paste.

**The version actually executed was pasted by hand from the analysis session.** Its text is checksummed in §9.1, but nothing in version control pins it.

**Consequence:** this export is not currently reproducible from a committed artefact. **Committing the executed script is a precondition of any future export being comparable to this one**, and is the first item Claude Code should close. It requires no production access.

### 9.3 The 55-file checksum manifest and the 53-row ledger reconciliation

Repository SHA-256 computed on the working tree at commit `2a97f065`, which `git status` reports clean for `supabase/`. Ledger values read from `public.schema_migrations` in the export. Verdicts: **match** means the recorded `sha256` equals the repository file's SHA-256 exactly.

| # | Migration file | Repo SHA-256 (at `2a97f065`) | Ledger record | Verdict |
|---|---|---|---|---|
| 1 | `01_catalogue_fields.sql` | `a0950633e7e1a399dc132f6f...` | `2026-07-28T13:37:42Z` | match |
| 2 | `02_ponte_previews_bucket.sql` | `e9684f5bd0d89a0abc26a5a7...` | `2026-07-28T13:37:42Z` | match |
| 3 | `20260526_b_catalogue_includes.sql` | `1fb6a2139e6044b738706d4e...` | `2026-07-28T13:37:42Z` | match |
| 4 | `20260526_capacity_queue.sql` | `81f854bef06c5084675580bf...` | `2026-07-28T13:37:42Z` | match |
| 5 | `20260526_catalogue_restructure.sql` | `dd3dfedfe1e1af2c8673ebe8...` | `2026-07-28T13:37:42Z` | match |
| 6 | `20260527_wave4_catalogue.sql` | `2ae2c34b47995ededa449862...` | `2026-07-28T13:37:42Z` | match |
| 7 | `20260528_wave4_product_copy_ponte_voice.sql` | `767e51f7047d31c6dc2bc551...` | `2026-07-28T13:37:42Z` | match |
| 8 | `20260610_adamftd_catalogue.sql` | `0e9484ef0d0189c237bbd982...` | `2026-07-28T13:37:42Z` | match |
| 9 | `20260610_lock_profile_role.sql` | `97f1ecbc64447421f4fba6a3...` | `2026-07-28T13:37:42Z` | match |
| 10 | `20260720_marketplace_listings.sql` | `01faaeea3a39350b03449823...` | `2026-07-28T13:37:42Z` | match |
| 11 | `20260720b_marketplace_browse.sql` | `931e734d10ef11a33ec65d11...` | `2026-07-28T13:37:42Z` | match |
| 12 | `20260720c_marketplace_media.sql` | `9d09f78a3decf3e7d492c5fd...` | `2026-07-28T13:37:42Z` | match |
| 13 | `20260720d_ai_review.sql` | `16e3ab0c5f5a7260ce12dfa9...` | `2026-07-28T13:37:42Z` | match |
| 14 | `20260720e_submitter_chain.sql` | `95e538f58185aa7bf935a670...` | `2026-07-28T13:37:42Z` | match |
| 15 | `20260721a_drafts_sharing.sql` | `1ab1baa79b65f9ba4bfddaca...` | `2026-07-28T13:37:42Z` | match |
| 16 | `20260721b_connections.sql` | `caf733a580d87432d219c168...` | `2026-07-28T13:37:42Z` | match |
| 17 | `20260721c_translations.sql` | `b458f3e95260451adbe42768...` | `2026-07-28T13:37:42Z` | match |
| 18 | `20260721d_account_briefs.sql` | `8d5a630c3908387e88c7ef80...` | `2026-07-28T13:37:42Z` | match |
| 19 | `20260721e_ai_freemium.sql` | `f528d353bf88b3099fd26098...` | `2026-07-28T13:37:42Z` | match |
| 20 | `20260721f_credits_and_ai_metering.sql` | `13102235f36a628ce880522d...` | `2026-07-28T13:37:42Z` | match |
| 21 | `20260721g_verification.sql` | `bcbbd267dc44d0e151765253...` | `2026-07-28T13:37:42Z` | match |
| 22 | `20260721h_sanctions_match.sql` | `482a80fc535845dd53b4f60c...` | `2026-07-28T13:37:42Z` | match |
| 23 | `20260721i_verification_needs_selection.sql` | `100a0189088569923482b326...` | `2026-07-28T13:37:42Z` | match |
| 24 | `20260721j_data_sources.sql` | `59bbd99fd0c5966a8e862725...` | `2026-07-28T13:37:42Z` | match |
| 25 | `20260722b_hs_codes.sql` | `942978b089c30380af352a7e...` | `2026-07-22T13:14:07Z`, no checksum | **UNVERIFIABLE** |
| 26 | `20260722c_listings_v4.sql` | `8a6aa81001696f3bd6b7485c...` | `2026-07-28T13:37:42Z` | match |
| 27 | `20260722d_signup_credits.sql` | `e3a83eea7214c9c0fac5460c...` | `2026-07-28T13:37:42Z` | match |
| 28 | `20260722e_handle_new_user_search_path.sql` | `3e7082ac000d7f55ab1446cd...` | `2026-07-22T17:06:42Z` | match |
| 29 | `20260722f_desk_radar.sql` | `9fdaf58246434df59dfc46c8...` | `2026-07-22T17:20:59Z` | match |
| 30 | `20260723a_desk_radar_signal_gate.sql` | `01cd45299a45977aa76aa136...` | `2026-07-23T09:52:46Z` | match |
| 31 | `20260723b_verification_purpose.sql` | `ebe5faa5255a3a84dfac2823...` | `2026-07-23T11:18:18Z` | match |
| 32 | `20260723c_verification_attestation.sql` | `867a85cf47b3e55c8606a7ff...` | `2026-07-23T11:39:41Z` | match |
| 33 | `20260723d_investigation_and_interest.sql` | `1c7b0d1a384c8aab89c8e3df...` | `2026-07-23T14:07:28Z` | match |
| 34 | `20260723e_investigation_dedupe_and_count.sql` | `7b5182269d382681640fb8d5...` | `2026-07-23T14:41:19Z` | match |
| 35 | `20260723f_referral_attribution.sql` | `adb6eb4766a8915d9c33e878...` | `2026-07-23T17:20:35Z` | match |
| 36 | `20260724a_desk_radar_signal_import.sql` | `fe7b84730544a58a5e50f151...` | `2026-07-24T18:05:37Z` | match |
| 37 | `20260724b_listings_desk_managed.sql` | `aa3140b4c78df13bc568f437...` | `2026-07-24T18:05:39Z` | match |
| 38 | `20260726a_investigation_kind.sql` | `63f2c84c624532a4459656c6...` | `2026-07-26T08:40:00Z` | match |
| 39 | `20260728a_market_classification.sql` | `8e9d0e728d6a866571915e17...` | `2026-07-28T13:25:11Z` | match |
| 40 | `20260728b_schema_migrations_rls.sql` | `c4bf8c921de4d454febd12a4...` | `2026-07-28T14:07:35Z` | match |
| 41 | `20260728c_automated_listing_publication.sql` | `745453c93b8d88614fe45dd2...` | `2026-07-29T15:42:54Z` | match |
| 42 | `20260728d_verification_level_canonical.sql` | `262e96b7dc4cdef1a91d4939...` | `2026-07-28T17:04:50Z` | match |
| 43 | `20260728e_family_commercial_terms.sql` | `4224fa274291f074d1ef0c94...` | `2026-07-29T15:44:45Z` | match |
| 44 | `20260729a_deal_room_core.sql` | `24932e4a429eb4ea7b19f2a7...` | `2026-07-30T03:39:20Z` | match |
| 45 | `20260729b_deal_room_rls.sql` | `b379f869f320e6ea36bdb00e...` | `2026-07-30T05:59:43Z` | match |
| 46 | `20260729c_deal_room_storage.sql` | `94629e5dec518439687f0ecf...` | `2026-07-31T04:26:35Z` | match |
| 47 | `20260730a_market_signal_search.sql` | `731c7a0870af1a9233f59aea...` | not present | **IN REPO, NOT RECORDED** |
| 48 | `20260730b_deal_room_function_acl.sql` | `15f488d87705e5a88def6e1c...` | `2026-07-30T07:59:45Z` | match |
| 49 | `20260730c_deal_room_internal_acl.sql` | `5adb34c2ef183c601b300480...` | `2026-07-30T08:26:17Z` | match |
| 50 | `20260731a_deal_room_storage_policy_helpers.sql` | `bbd498511e04fb7a277df7dd...` | `2026-07-31T04:26:11Z` | match |
| 51 | `20260731b_deal_room_propose_initiator_capacity.sql` | `0de3c6e0e74f814746fe511b...` | `2026-07-31T05:01:48Z` | match |
| 52 | `20260731c_deal_room_procedure_approver_gate.sql` | `7e60f2dfbaad3d27ff6165a0...` | `2026-07-31T05:43:13Z` | match |
| 53 | `20260731d_deal_room_approver_row_visibility.sql` | `7e42fd9dd1ff8c017e9bb864...` | `2026-07-31T06:15:29Z` | match |
| 54 | `20260731e_deal_room_paid_room_periods.sql` | `3456e0b0862e6e4b306a2cca...` | not present | **IN REPO, NOT RECORDED** |
| 55 | `20260731f_deal_room_participant_label.sql` | `3e8bbf6b80fe974e63263687...` | `2026-07-31T08:38:33Z` | match |

**Totals: 55 repository files. 53 ledger rows. 52 match. 1 unverifiable. 2 in repo and not recorded. 0 ledger rows without a repository file.**

### 9.4 Source of every catalogue count in this report

Each figure comes from one named key of the single JSON document, each of which is one sub-select in the executed statement.

| Figure quoted | Export key | Catalogue source |
|---|---|---|
| 1,111 columns | `columns` | `information_schema.columns`, restricted to schemas holding base tables |
| 339 constraints, and every CHECK and FOREIGN KEY definition | `constraints` | `pg_constraint` joined to `pg_class` and `pg_namespace`, rendered by `pg_get_constraintdef` |
| 219 indexes, and every index definition | `indexes` | `pg_indexes` |
| 208 functions, 32 `SECURITY DEFINER`, body lengths and body hashes | `functions` | `pg_proc` joined to `pg_namespace` and `pg_language`, `prosecdef` for the security flag |
| 97 RLS policies, with `USING` and `WITH CHECK` | `rls_policies` | `pg_policies` |
| 76 tables with RLS enabled, 0 forced | `rls_enabled` | `pg_class.relrowsecurity` and `pg_class.relforcerowsecurity`, joined to `pg_namespace` |
| 24 non-internal triggers, with definitions | `triggers` | `pg_trigger` excluding internal, rendered by `pg_get_triggerdef` |
| 12 enum types and their labels | `enum_types` | `pg_type` joined to `pg_enum` and `pg_namespace` |
| 7 extensions, their schema and version | `extensions` | `pg_extension` joined to `pg_namespace` |
| 7 storage buckets, public flag, size limit, MIME list | `storage_buckets` | `storage.buckets` |
| Row estimates, table sizes, last analyse times | `table_estimates` | `pg_class.reltuples` and `pg_total_relation_size`, joined to `pg_stat_user_tables` |
| 53 ledger rows with filename, sha256, applied_at | `migrations_public_schema` | `public.schema_migrations` |
| 1 CLI ledger row | `migrations_supabase_schema` | `supabase_migrations.schema_migrations` |
| 10 schemas | `schemas` | `pg_namespace` |
| 0 views | `views` | `pg_class` where `relkind` in (`v`,`m`) |
| Server version, database, running role, export timestamp | `meta` | `version()`, `current_database()`, `current_user`, UTC clock |

### 9.5 Method notes

- The two unapplied migrations were confirmed absent by testing for their objects in the export rather than by trusting their headers: nine named indexes against `indexes`, two named tables and one named column against `columns`, and the `deal_room_entitlements_kind_check` definition against `constraints`.
- The genesis finding was established by pattern search for `create table` against each of the nine table names across all 55 files, not by reading `supabase/schema.sql` alone.
- The `pg_trgm` blocker was established from `extensions` (schema `public`, version 1.6) against the literal text `extensions.gin_trgm_ops` in the unapplied file, and corroborated by the unqualified operator class in the four existing trigram index definitions.
- Every count in §9.4 is the length of the corresponding JSON array. No figure in this report was estimated or recalled.
