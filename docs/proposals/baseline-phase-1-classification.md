# Baseline workstream — Phase 1 classification

**Status:** classification only, as approved 28 July 2026. **Nothing is dropped,
nothing is declared, and no schema dump was generated.**
**Scope:** the 20 undeclared application tables and 7 undeclared functions in
production (`cptglsmjmzcfpjndqfmc`) that no repository file creates.
**Authority:** `docs/proposals/production-baseline-workstream.md`, Phase 1.

Every fact below was read from production on 28 July 2026 and is reproducible
with `scripts/db-query.mjs`.

---

## Categories

- **RETAIN AND BASELINE** — must be declared in the repository. Either something
  live depends on it, or a merged decision record requires it.
- **INTENTIONALLY DEFERRED** — describes an accepted but unbuilt product
  direction. Not dead. Must not be dropped without reversing an ADR.
- **ABANDONED, ELIGIBLE FOR LATER REMOVAL** — belongs to a retired direction,
  nothing depends on it, and no accepted decision requires it. **Eligible is not
  approved:** each removal is its own change under the `AGENTS.md` stop
  conditions.

---

## Summary

| Category | Tables | Functions |
|---|---|---|
| Retain and baseline | 2 | 2 |
| Intentionally deferred | 14 | 2 |
| Abandoned, eligible for later removal | 4 | 3 |
| **Total** | **20** | **7** |

All 20 tables hold **zero rows**. All 20 carry RLS and at least one policy, so
none is an exposure. None is referenced by any `.from("…")` or `.rpc("…")` call
in `app/`, `lib/`, `components/` or `scripts/`.

---

## 1. RETAIN AND BASELINE

### `organizations` — a live table depends on it

**The decisive fact:** `profiles.organization_id` carries a foreign key to
`organizations`. `profiles` is live, declared in `supabase/schema.sql`, and holds
all nine member rows.

So this table is structurally load-bearing today regardless of being empty. It
cannot be dropped without first dropping a column from a live table, and any
attempt to rebuild the database from the repository fails at `profiles` without
it.

It is also referenced by `adamftd_verification_checks`,
`listings_legacy_20260720` and `trust_score_events`, and carries a
`touch_organizations` trigger.

**Action:** declare it, and declare `profiles.organization_id` with it. This is
the single most important item in this classification, because it is the one
that makes "the repository cannot build a database" literally true.

### `user_reports` — required by merged code

`lib/listings/eligibility.ts` reads `abuseReportCount`, and the exception console
in `lib/listings/exceptions.ts` treats `reported` as its highest-priority reason,
outranking an automated flag. Nothing writes it yet, which is recorded as an
explicit gap in `docs/plans/active/automated-listing-publication-and-email-system.md`.

So this is not speculative schema: it is the table the merged validator is
already written against. Carries a `touch_user_reports` trigger.

**Action:** declare it. Wiring a writer is separate product work.

### Functions

| Function | Why retained |
|---|---|
| `touch_updated_at` | Backs the `touch_*` triggers on `deals`, `organizations`, `settlements`, `subscriptions`, `user_reports`. |
| `update_updated_at_column` | A second implementation of the same job, with a **different body** (`prosrc` hashes differ). Retained only so the baseline can collapse the two to one deliberately rather than by accident. |

---

## 2. INTENTIONALLY DEFERRED

### The Deal Room cluster — 8 tables

`deals`, `deal_documents`, `deal_events`, `deal_status_history`, `messages`,
`settlements`, `settlement_milestones`, `settlement_events`.

**These must not be classified as abandoned.** Seven accepted decision records
describe this product:

| ADR | Status |
|---|---|
| ADR-0003 Deal Room as the controlled PROGRESS layer | Accepted by owner |
| ADR-0004 Master Deal Room as the monetisation boundary | Accepted by owner |
| ADR-0005 Free structured Deals with paid rooms and sub-rooms | Accepted by owner |
| ADR-0006 Starter Deal Room access | Principle accepted |
| ADR-0007 Deal Passport | Accepted by owner |
| ADR-0008 Detailed Deal Room product definition | present |
| ADR-0009 Deal Room technical architecture | present |

Three issues are open against it: #57 (experience design review), #52
(subscription and credit model), #46 (paid Ponte Desk MVP).

The cluster is internally coherent and self-contained: everything in it
references `deals`, `profiles` or `listings_legacy_20260720` and nothing outside
it depends on any of it. `is_deal_participant()` is its RLS helper and reads
`deals.initiator_id` / `deals.counterparty_id`.

**Action:** leave in place. Declaring it is Phase 2 work and should follow the
Deal Room design decisions rather than lead them, because declaring the current
shape would freeze a schema those open issues may still change.

### Platform services — 6 tables

`notifications`, `saved_searches`, `analytics_events`, `audit_logs`,
`blocked_entities`, `fraud_flags`.

Each references only `profiles`. Each is a recognisable platform capability the
product plausibly still wants, and none contradicts a current decision. None is
referenced by code and none is required by a merged ADR, so none is retain; but
calling them abandoned would be a guess.

`audit_logs` deserves a specific note: the merged `listing_events` table now
covers lifecycle auditing for listings, so `audit_logs` may be superseded rather
than deferred. That is a judgement for Phase 2, not a fact this phase
established.

### Functions

| Function | Why deferred |
|---|---|
| `is_deal_participant` | The Deal Room RLS helper. Deferred with its cluster. |
| `apply_trust_delta` | Reads and writes `profiles.trust_score`, a live column, and takes a row lock. Not called by application code today. Related to `trust_score()` and `trust_score_components`, both declared and live, so the trust model is partly declared and partly not. Needs its own decision. |

---

## 3. ABANDONED, ELIGIBLE FOR LATER REMOVAL

**Eligible, not approved.** Each removal is a separate, individually approved
change. Nothing here is dropped by this document.

### `adamftd_usage`, `adamftd_verification_checks` — 2 tables

The ADAMftd catalogue era is retired. `20260610_adamftd_catalogue.sql` is the
last migration that touched it, the products it created are archived, and the
verification pipeline built since (`lib/verification/`) uses Companies House,
OpenCorporates, VIES and GLEIF instead. No ADR keeps ADAMftd alive.

`adamftd_verification_checks` references `listings_legacy_20260720`, itself a
renamed legacy table already slated for removal in
`supabase/pending/20260722a_drop_legacy_shop.sql`. Removal order matters: the
child goes first.

### `trust_score_events` — 1 table

References `organizations` and `profiles`. The live trust model is
`trust_score_components` (declared by `20260721g`, read by `trust_score()`),
which is a components table, not an events table. Two competing designs for one
concept, and only one of them is declared and used.

Deferring `apply_trust_delta` above and marking this abandoned is deliberate:
the function touches a live column, the table does not.

### `subscriptions` — 1 table

Stripe subscription state. The live subscription surface reads
`profiles.plan`, `profiles.plan_status`, `profiles.plan_renews_at` and
`profiles.stripe_subscription_id` — undeclared columns on a declared table. So
subscription state is modelled twice, and the column form is the one in use.
Carries a `touch_subscriptions` trigger.

If the Deal Room monetisation work (ADR-0004, issue #52) revives a subscriptions
table, it should be designed then, not inherited.

### Functions

| Function | Why abandoned |
|---|---|
| `match_hs_codes` | **Broken, not merely unused.** Its body is `FROM public.hs_embeddings he JOIN public.hs_codes hc ON he.hs_code_id = hc.id`. `hs_embeddings` does not exist, and the live `hs_codes` has no `id` column — its primary key is `code`. Calling it raises. It belongs to a vector-search design superseded by `hs_search()`, which is declared, live and used. |
| `increment_adamftd_usage` | Writes `adamftd_usage`. Retired with it. |
| `increment_completed_deals` | Writes `profiles.completed_deals`, an undeclared column on a declared table, which nothing reads. |

---

## 4. What this phase deliberately did not do

- **Nothing was dropped.** No `DROP` was written, proposed as executable, or run.
- **No schema dump was generated.** The classification is hand-written from
  targeted probes.
- **No production change of any kind.** Every query was a read.
- **`profiles` column drift is out of scope.** `account_type`,
  `verified_trader`, `verification_tier`, `risk_category`, `completed_deals`,
  `title`, `languages`, `commodities`, `regions_served`, `years_active`,
  `typical_deal_size`, `bio`, `plan`, `plan_status`, `plan_renews_at` and
  `stripe_subscription_id` are undeclared columns on a declared table. Three of
  them are named above because they duplicate a table in this list, but their
  repair is separate.
- **`profiles.verification_level`** has its own issue and proposal.

---

## 5. What Phase 2 should take from this

1. **Start with `organizations`.** It is the only item blocking a repository
   rebuild through a live foreign key, and it is small.
2. **Then `user_reports`**, because merged code already reads a count from it.
3. **Do not declare the Deal Room cluster yet.** Its open design issues may
   still change the shape, and a baseline that freezes a shape nobody has
   committed to is worse than no baseline.
4. **Take the removals one at a time**, child before parent, each with its own
   approval. The dependency order established here is:
   `adamftd_verification_checks` → `adamftd_usage`; `trust_score_events`;
   `subscriptions`. None has an inbound reference from a live table.
