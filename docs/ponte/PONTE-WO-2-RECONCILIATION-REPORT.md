> **SUPERSEDED, 2 August 2026. Do not read this as current.**
>
> Replaced by **`PONTE-WO-2-RECONCILIATION-REPORT-v1.1.md`** in this folder.
>
> This is version 1.0. It was accepted in substance and then corrected on seven
> points by the strategic review of the same day. The corrections matter: v1.0
> classified member-data integrity as *minor* when no rows had been inspected and
> it should have said **undetermined**; it asserted that member data was
> *negligible* on the strength of planner estimates that are stale or absent for
> most tables; it stated the absence of `FORCE ROW LEVEL SECURITY` as a defect
> when it is not one; and it carried no evidence appendix, so its headline
> numbers were assertions rather than auditable results.
>
> Retained rather than deleted, so the correction is visible.

# Ponte Trade, WO-2 database reconciliation report

**From:** UX/UI Director
**To:** Giuseppe Funaro, ChatGPT (strategic reviewer), Claude Code
**Date:** 2 August 2026
**Authority:** canonical authority v5.2, `DECISION-20` steps 1 and 2, `DECISION-22` option A
**Scope, binding:** no migration SQL, no preferred remedy, no implementation recommendation. Severity, uncertainty and missing evidence only.

---

## Evidence base

Two sources, both obtained without any AI touching production.

1. **`ponte_schema_export`**, run by Giuseppe by hand in the Supabase SQL editor at **2026-08-02 16:40:37 UTC**, PostgreSQL 17.6, database `postgres`, run as `postgres`. Schema and catalogue only. 1,111 columns, 339 constraints, 219 indexes, 208 functions, 97 RLS policies, 76 tables, 24 triggers, 12 enum types, 7 extensions, 7 storage buckets, both migration ledgers, and row **estimates** only.
2. **The 55 migration files on Giuseppe's own disk**, `C:\dev\ponte\supabase\migrations`, read and checksummed locally.

**No row contents were read.** Every statement below about data is either a planner estimate or a structural fact. `DECISION-22` option A held.

---

## 1 · The headline

**The applied history is sound. The reproducible history does not exist.**

These are two different things and they have been argued about as if they were one. Separating them is the main product of this report.

| | Finding |
|---|---|
| **What production has actually had done to it** | Provable, file by file, byte for byte. 52 of 53 recorded migrations match the repository file exactly by sha256. |
| **What the repository can build from nothing** | Nothing usable. The chain has no genesis and the CLI ledger is empty. Production cannot be reconstructed from `main`. |

The consequence that matters commercially: **`DECISION-20` step 4 requires a staging rehearsal with demonstrated rollback before any production migration. A staging environment cannot currently be created from the repository. Step 4 is therefore unsatisfiable today.** That is stated as a fact, not as a proposal.

---

## 2 · Migration ledger reconciliation

### 2.1 The two ledgers disagree almost completely

| Store | Rows |
|---|---|
| `public.schema_migrations` | **53** |
| `supabase_migrations.schema_migrations` | **1**, `{version: "01", name: "catalogue_fields"}` |

`public.schema_migrations` is a hand-maintained table belonging to this project. `supabase_migrations.schema_migrations` is the store the Supabase CLI reads and writes. The CLI believes one migration has ever been applied to this database.

This is the **"histories conflict materially"** criterion in the v5.2 severity definition, evidenced directly rather than inferred. It also explains, without needing FINDING-01's filename-pattern argument, why the CLI cannot be used against this project: whatever it would do next, it would do believing the database is at `01`.

**Which store is real:** `public.schema_migrations`. It reconciles against the repository to within one file. `supabase_migrations.schema_migrations` reconciles against nothing.

### 2.2 Repository ↔ production, file by file

| Class | Count | Detail |
|---|---|---|
| Recorded applied **and** checksum matches the repo file exactly | **52** | The file that ran is the file on disk today. No post-application editing. |
| Recorded applied, **no checksum** | **1** | `20260722b_hs_codes.sql`, recorded as `applied-via-management-api`. Cannot be confirmed either way. |
| In repo, **not recorded applied** | **2** | See 2.3 |
| Recorded applied, **file missing from repo** | **0** | Clean. |

52 of 53 checksums matching is a materially better result than FINDING-01 implied and it should be recorded plainly. **Nobody has edited an applied migration.**

### 2.3 The two unapplied files

Both declare their own status in their headers. Neither is an accident.

| File | Size | Applied? | Objects present in production? |
|---|---|---|---|
| `20260730a_market_signal_search.sql` | 10,616 B | No. Header: *"NOT APPLIED. Written and reviewed; not run against production."* | **No.** None of its nine indexes exist. Confirmed against the index catalogue. |
| `20260731e_deal_room_paid_room_periods.sql` | 15,752 B | No. Header: *"WRITTEN AND NOT APPLIED."* | **No.** `deal_room_room_periods` and `deal_room_billing_events` do not exist; `deal_room_entitlements.current_period_id` does not exist; the `kind` CHECK still admits only `starter`, `sponsored`, `waived`. |

Consistent throughout. Nothing was half-applied.

### 2.4 Ordering and recording anomalies

None of these changed an outcome, so far as the catalogue can show. They are recorded because they are what an audit would ask about.

- **20 of the 53 rows carry the identical timestamp `2026-07-28T13:37:42.50114`.** That is a retrospective backfill of the pre-existing history into the ledger on 28 July, not twenty migrations applied in one instant. For those twenty, the ledger proves the file content but **not the application date or order**.
- **Three rows are recorded out of filename order relative to their apply time.** `20260724a` (24 Jul 18:05) sits after the 28 Jul backfill block; `20260728c` applied 29 Jul after `20260728d` applied 28 Jul; `20260729c` applied 31 Jul after `20260731a`.
- **Filename-sequence gaps:** no `20260722a` in the applied set (it is in `supabase/pending/`), no `20260725x`, no `20260730a` (unapplied), no `20260731e` (unapplied).
- `pg_class` estimates `schema_migrations` at 46 rows against 53 actual. Stale statistics, not a discrepancy.

### 2.5 There is no genesis

No file in the chain creates `profiles`, `organizations`, `products`, `categories`, `orders`, `order_items`, `order_notes`, `bundle_items` or `newsletter_subscribers`. Verified by search across all 55 files.

`supabase/schema.sql` creates `profiles` with **7 columns**. Production `profiles` has **31**. The repository already documents this in that file's own header, naming eighteen columns *"added straight to the database"* and stating: *"Applying this repository to an empty project therefore does NOT reproduce production."*

This is the single most important structural fact in the report and it is already written down in the repository, honestly, by whoever wrote that comment.

---

## 3 · Schema state

### 3.1 The legacy layer is still live

- **`listings_legacy_20260720` still exists**, and two foreign keys still point at it rather than at `listings`: `deals.listing_id` and `adamftd_verification_checks.listing_id`, both `ON DELETE SET NULL`.
- **`listings_pkey1`**, the primary key on the current `listings` table carries a `1` suffix, residue of the rename that created it while `listings_pkey` was still taken.
- **The report-shop tables are still in production**: `products` (≈50 rows), `categories`, `orders`, `order_items`, `order_notes`, `bundle_items`, `newsletter_subscribers`. The migration that drops them, `20260722a_drop_legacy_shop.sql`, sits in `supabase/pending/` and has never been applied.
- **`deals`** is a complete second, older deal model, `stage`, `contact_unlocked`, `initiator_accepted_contact`, `counterparty_accepted_contact`, coexisting with `deal_rooms` and wired to the legacy listings table.

### 3.2 Classification taxonomies coexist

`listings` carries **three** overlapping classification axes:

| Column | Values |
|---|---|
| `type` | `offer`, `requirement`, `service` |
| `market_family` | `products`, `services`, `distribution` |
| `market_intent` | 7 values, including `seek_brands_or_products_to_represent` |

`market_intent` admits **seven** values, not six. The seventh is the distribution-inbound position. Whether that is the correct expression of `DECISION-17`'s six opportunity types plus a position, or an eighth thing, is a question for the model, not for me to settle here.

**`market_family` admits only `products`, `services`, `distribution`.** The values that caused the signed-in crash, `goods`, `trade_services`, `product`, are outside the CHECK on both `listings` and `deal_rooms`. The database was never going to accept them.

### 3.3 Integrity

- **One constraint is `NOT VALID`:** `listings_product_fields_family` on `listings`. Existing rows were never checked against it. It is enforced on new writes only.
- **`deal_rooms.listing_id` is `NOT NULL` with `ON DELETE RESTRICT`.** A Deal Room cannot exist without a listing.
- **`deal_room_entitlements` has `UNIQUE (room_id)` and nothing on `org_id`.** The data layer does not enforce one free entitlement per organisation. `AUTH-01` requires the Starter entitlement to attach to a uniquely verified organisation and not to an email account. If that is enforced anywhere, it is enforced in application code. **Unverified.**
- **`listing_connections`**, the interest object, admits `pending`, `accepted`, `declined` only. Set 3 `D02` requires **Pending, Lapsed and Accepted, with withdrawal offered at any time**. Neither a withdrawn nor a lapsed state exists in the schema.

### 3.4 RLS

- **RLS is enabled on all 76 tables. It is FORCED on none.** The table owner and any `SECURITY DEFINER` path bypasses every policy. 32 `SECURITY DEFINER` functions exist in `public`, 23 of them in the `deal_room_*` family. `AUTH-05` makes RLS a mandatory permission boundary for the Deal Room, and `rls_forced = false` everywhere is a material qualification on that.
- **Thirteen public tables have RLS enabled and zero policies**, i.e. deny-all to `anon` and `authenticated`: `account_briefs`, `ai_calls`, `ai_usage`, `anonymous_drafts`, `data_source_cache`, `data_sources`, `deal_room_agreement_documents`, `desk_radar`, `listing_translations`, `newsletter_subscribers`, `sanctions_entries`, `sanctions_refresh_log`, `schema_migrations`.
  - **`desk_radar` is the Market Signal table** (≈11,680 rows) and is deny-all. Every public read of a signal must therefore go through the service role. `20260730a`'s header confirms this is deliberate. It is nonetheless the largest single dependency of the public product on a server-side path, and it is not visible in the policy catalogue.
  - **`anonymous_drafts` is deny-all** and has `session_key`, `claimed_by`, `claimed_at`. `DECISION-16` retention behaviour is therefore not expressible as a client-side policy.
  - **`deal_room_agreement_documents` is deny-all** while every other `deal_room_*` table carries policies. Whether that is intentional is not determinable from the catalogue.

### 3.5 Storage

Seven buckets. **Two are public:**

| Bucket | Public | Limit | Types |
|---|---|---|---|
| `listing-media` | **yes** | 50 MB | images, mp4, webm, quicktime |
| `ponte-previews` | **yes** | 50 MB | **application/pdf only** |
| `deal-room-evidence` | no | 25 MB | pdf, png, jpeg, webp |
| `listing-docs` | no | 10 MB | pdf, png, jpeg, webp |
| `verification-docs` | no | 25 MB | pdf, png, jpeg, webp |
| `ponte-deal-docs` | no | none | none |
| `ponte-verification` | no | none | none |

`listing-media` being public is coherent with public listings. **`ponte-previews` is a public, PDF-only bucket created 24 May 2026**, before the current product. Its contents are readable by anyone with a URL. What is in it cannot be determined from the catalogue and was not read.

`ponte-deal-docs` and `ponte-verification` have **no size limit and no MIME restriction**.

### 3.6 Volumes

Estimates only. `-1` means never analysed.

| Table | Est. rows |
|---|---|
| `sanctions_entries` | 32,047 |
| `desk_radar` | 11,680 |
| `hs_codes` | 5,613 |
| `products` (shop, retired) | 50 |
| `credit_ledger` | 21 |
| `profiles` | **10** |
| `listings` | **8** |
| `deal_rooms` | **1** |
| `signal_investigations` | 1 |
| `deal_room_participants`, `deal_room_entitlements`, `deal_room_invitations` | 0 |
| `organizations`, `deals`, `listing_connections`, `anonymous_drafts` and 40 others | never analysed |

**Member data in this database is negligible in volume.** Ten profiles, eight listings, one Deal Room. Whatever is decided about the schema, the quantity of member data at risk is small. That is a fact about severity, not an argument for any course of action.

### 3.7 Credits

Fully present and structurally intact: `credit_ledger` (≈21 rows), `credit_purchases` with `UNIQUE (stripe_session_id)`, and the functions `spend_credits()` and `credit_balance()`. `AUTH-01` removed credits from the product. `P2-1` requires withdrawal as a six-step sequence rather than a delete. **The 21 ledger rows are the reason that sequence exists.**

---

## 4 · Blockers to a forward migration

Stated as blockers. No remedy proposed.

1. **No staging environment can be built from the repository.** `DECISION-20` step 4 cannot be executed. This blocks the entire sequence, not one step of it.
2. **`20260730a_market_signal_search.sql` will fail as written.** It creates `pg_trgm` `with schema extensions` and then references `extensions.gin_trgm_ops`. **`pg_trgm` is already installed in production in schema `public`, at version 1.6.** `create extension if not exists` will be a silent no-op, the operator class will not resolve under `extensions.`, and every index statement will fail. The four trigram indexes that already exist in production (`sanctions_name_trgm`, `sanctions_alias_trgm`, `hs_codes_search_idx`, `verifications_subject_trgm`) all use the unqualified form. Evidenced from the catalogue; no fix offered here.
3. **`listings_product_fields_family` is `NOT VALID`.** Any operation that validates or rewrites it will test rows that have never been tested.
4. **Two foreign keys still bind live tables to `listings_legacy_20260720`.** Nothing can be done to that table while `deals` and `adamftd_verification_checks` reference it.
5. **`20260722a_drop_legacy_shop.sql` is written, pending and unapplied**, while its target tables are live and one of them holds rows.
6. **The 20 backfilled ledger rows have no reliable apply date or order.** Any reasoning that depends on the sequence in which the pre-28-July schema was built is reasoning from a file name.

---

## 5 · Severity

Against the v5.2 definition, *severe where migration lineage cannot be proven, member-data integrity is uncertain, histories conflict materially, or safe rollback cannot be demonstrated.*

| Axis | Classification | Basis |
|---|---|---|
| **Applied lineage** | **Minor** | 52 of 53 checksum-verified against the repo. One unverifiable. Zero orphan records. No file edited after application. |
| **Ledger consistency** | **Material** | The two stores disagree 53 to 1. The CLI store is unusable. Twenty rows are backfilled with no real date. |
| **Reproducibility** | **SEVERE** | No genesis. The repository cannot build the schema. Already documented in `supabase/schema.sql`. Directly blocks `DECISION-20` step 4. |
| **Member-data integrity** | **Minor, with one unknown** | One `NOT VALID` constraint; ten profiles, eight listings, one room. No row access, so this is a structural judgement only. |
| **Safe rollback** | **Cannot be demonstrated** | Not because rollbacks are missing, the two unapplied files carry written rollbacks, but because there is nowhere to rehearse one. |

**Overall: material, with one severe finding.** The severe finding is reproducibility, and it is not a data problem. It is that the repository is not the source of truth for the schema and has not been since before the current product existed.

`DECISION-26` pre-committed a framework: *severe drift or unreconcilable history → rebuild clean, migrate data, accept that v1 slips.* **The history is not unreconcilable.** It reconciles to within one file. Whether "no reproducible origin" triggers the severe branch of `DECISION-26` is a decision for Giuseppe and ChatGPT under `AUTH-05`, not a call I am permitted to make in this document, and I am not making it.

---

## 6 · Found while doing this, and outside WO-2 scope

Flagged, not resolved. It is the largest single thing found today and it is not a database fault.

**`20260731e_deal_room_paid_room_periods.sql` encodes a third commercial model.** It cites *"PT-COMMERCIAL-2026-07-31-01, the Deal Room-Only Pricing Authority, recorded by ADR-0020"* and writes the pricing into a CHECK constraint:

> `period_price_cents = least(19900, 7900 + greatest(0, purchased_branch_capacity - 5) * 1500)`

That is **$79 for five concurrent principal-counterparty branches, $15 per additional branch, capped at $199 per 30-day period**, plus a discount column so a launch-partner waiver shows `$79 / −$79 / $0` rather than a silent free room.

Canonical authority v5.2 `AUTH-01` says: first activation free for 30 days per business-verified organisation, renewal $79, every subsequent room $79, **no capacity restriction**.

These are not compatible. The repository version has branch-capacity pricing and a $199 ceiling; v5.2 has neither. The repository version is written into a constraint, reviewed, and deliberately unapplied. **`AUTH-01` and `ADR-0020` need to be reconciled by the owner before either the P2 pricing copy or that migration goes anywhere.** Two other schema-level observations belong with it:

- `deal_room_entitlements` cannot record a paid room at all today, `kind` admits only `starter`, `sponsored`, `waived`.
- Nothing in the schema enforces one Starter entitlement per organisation.

I have not proposed a resolution and I am not going to in this document. It is `DECISION-28` material.

---

## 7 · What could not be determined, and what would determine it

| Unknown | What would answer it |
|---|---|
| Whether any row violates `listings_product_fields_family` | Row access, or a `VALIDATE` in a rehearsal environment. Neither is available under `DECISION-22` option A. |
| Whether `deals` and `listings_legacy_20260720` hold live rows | Row counts on two never-analysed tables. Reachable within option A. |
| What is in the public `ponte-previews` bucket | A storage listing. Not in this export and not covered by option A as written. |
| Whether `deal_room_agreement_documents` having no policy is intentional | Reading `20260729b_deal_room_rls.sql`, 76,684 bytes, against the policy catalogue. Repository work, no production access needed. |
| Whether the Starter-per-organisation rule exists in application code | Repository search. No production access needed. |
| Whether `20260722b_hs_codes.sql` as applied matches the repo file | Nothing available. It was applied through the management API and no checksum was recorded. Permanently unverifiable. |
| The true apply order of the 20 backfilled migrations | Nothing available. Reconstructable only by inference. |

---

## 8 · What this report does not contain

No proposed migration. No preferred remedy. No implementation recommendation. No launch date, and nothing in it supports fixing one.

Per `DECISION-24`, a second competent human database reviewer is required before any material or severe migration proceeds. **One severe finding is recorded above. That requirement is now live and Giuseppe has not yet sourced the reviewer.**
