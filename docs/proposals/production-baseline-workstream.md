# Proposal — a reproducible production baseline

**Status:** proposal. Nothing has been executed. **No schema dump has been
generated, and none should be without review.**
**Raised by:** the 28 July 2026 production migration reconciliation, §5. Related
and unchanged: `docs/plans/active/migration-chain-reconciliation.md`, which
covers the migration chain itself and remains unapproved.

---

## 1. The problem

The repository cannot build the database it runs against.

Production holds **21 tables and 8 functions that no file in this repository
creates**. `supabase/schema.sql` already admits part of this in its own drift
note. The consequences are ordinary and cumulative: no staging environment can
be stood up, a disaster rebuild would be a reconstruction from memory, a new
contributor cannot run the project locally against a real schema, and every
migration is written against a production state nobody can reproduce to test on.

---

## 2. The finding that changes the shape of this work

**All 20 of the undeclared application tables hold zero rows.**

Measured directly on `cptglsmjmzcfpjndqfmc`, 28 July 2026:

| Table | Columns | RLS | Policies | Rows | Referenced by app code |
|---|---|---|---|---|---|
| `adamftd_usage` | 6 | yes | 1 | **0** | no |
| `adamftd_verification_checks` | 19 | yes | 1 | **0** | no |
| `analytics_events` | 6 | yes | 1 | **0** | no |
| `audit_logs` | 7 | yes | 1 | **0** | no |
| `blocked_entities` | 6 | yes | 1 | **0** | no |
| `deal_documents` | 7 | yes | 1 | **0** | no |
| `deal_events` | 6 | yes | 1 | **0** | no |
| `deal_status_history` | 6 | yes | 1 | **0** | no |
| `deals` | 12 | yes | 3 | **0** | no |
| `fraud_flags` | 8 | yes | 1 | **0** | no |
| `messages` | 6 | yes | 2 | **0** | no |
| `notifications` | 8 | yes | 2 | **0** | no |
| `organizations` | 15 | yes | 2 | **0** | no |
| `saved_searches` | 5 | yes | 3 | **0** | no |
| `settlement_events` | 7 | yes | 1 | **0** | no |
| `settlement_milestones` | 10 | yes | 1 | **0** | no |
| `settlements` | 10 | yes | 1 | **0** | no |
| `subscriptions` | 11 | yes | 1 | **0** | no |
| `trust_score_events` | 8 | yes | 1 | **0** | no |
| `user_reports` | 10 | yes | 2 | **0** | no |

The twenty-first, `public.schema_migrations`, is different in kind: it holds 40
rows, it is the migration ledger, and it is created by
`scripts/db-query.mjs` and `scripts/apply-migration.mjs` rather than by a
migration. PR #76 hardened its privileges; nothing declares its shape.

Every one of these carries RLS and at least one policy, so none is an exposure.
The scan for `.from("<table>")` across `app/`, `lib/`, `components/` and
`scripts/` returns nothing for all twenty.

**So this is not 21 tables of live data to baseline.** It is one ledger table
and twenty empty tables from a design the product moved away from: a Deal
Room / settlement / messaging model that ADR-0003 through ADR-0009 describe and
that the July 2026 marketplace work did not build on.

That reframes the question from "how do we capture all this?" to "how much of
it is real?" — which is a much better question, and a much cheaper answer.

### The 8 undeclared functions

`apply_trust_delta`, `increment_adamftd_usage`, `increment_completed_deals`,
`is_deal_participant`, `match_hs_codes`, `touch_updated_at`,
`update_updated_at_column`, and `l1_distance`.

`l1_distance` is **not drift**: `pg_depend` shows it owned by the `vector`
extension. It appeared in the audit's list because the filter keyed on name
rather than on extension membership. Correcting that leaves **seven** genuinely
undeclared functions.

Of those seven, `touch_updated_at` and `update_updated_at_column` are two
separate trigger helpers doing the same job, with **different bodies** (their
`prosrc` hashes differ). Two divergent implementations of "stamp `updated_at`"
is exactly the kind of thing a baseline should collapse to one, and exactly the
kind of thing a `pg_dump` would faithfully preserve forever.

---

## 3. Proposed approach

Four phases. **Phase 1 produces no change of any kind** and must be reviewed
before Phase 2 is scoped.

### Phase 1 — classify, do not capture

For each of the 20 tables and 7 functions, answer three questions with evidence:

1. Is it referenced by any code, trigger, foreign key, policy or scheduled job?
2. Which decision record, if any, describes it? (`deals`, `settlements`,
   `messages` map onto ADR-0003 to ADR-0009; `adamftd_*` onto the retired
   ADAMftd catalogue work.)
3. Is it **planned**, **abandoned**, or **unknown**?

Output: a table with one row per object and one of three dispositions —
`declare`, `drop`, or `decide`. Nothing is executed.

The foreign-key question matters more than it looks: several of these
reference `profiles`, so a `drop` is not independent of the rest and the order
is part of the answer.

### Phase 2 — declare what survives

For everything marked `declare`, write **hand-authored** migrations, in the
repository's own idiom: `create table if not exists`, explicit RLS, explicit
policies, explicit grants, and a comment saying what the table is for.

**Not a `pg_dump`.** A dump would capture the drift verbatim, including the
two duplicate trigger helpers, the `verification_tier` column nobody reads, and
the exact privilege defaults that produced the `schema_migrations` exposure. It
would also be thousands of lines nobody reviews, which is how the current state
arose. The point of a baseline is that somebody has read it.

`public.schema_migrations` is declared here too, with the privileges PR #76
established, so a fresh project gets a protected ledger from its first row
instead of from its first audit.

### Phase 3 — a base schema the chain can actually run

The chain currently cannot build an empty database for two reasons already
recorded in `DATABASE-STATE.md`: `01_catalogue_fields.sql` alters `products`,
which no longer exists, and `02_ponte_previews_bucket.sql` calls `is_admin()`,
which only `supabase/schema.sql` creates and which the chain never runs.

Options, to be chosen in Phase 1's review:

- **(a) Fold `schema.sql` into the chain** as `00000000_base.sql`, and retire or
  quarantine the seven shop-era files that depend on dropped tables.
- **(b) Squash to a single baseline** taken at a declared date, with everything
  before it archived unrun. Cleaner, but discards the history the audit just
  established, so it needs the reconciliation report as its evidence trail.

Both are real options. (a) preserves history and is more work; (b) is cleaner
and loses the record unless it is deliberately kept.

### Phase 4 — prove it

The only acceptable proof is a **fresh, empty Postgres** into which the chain
runs clean, followed by a structural diff against production. Anything less is
an assertion.

The diff must be reviewed, not just run: the goal is a baseline somebody
understands, and a green diff on a schema nobody read is the same problem in a
new place.

---

## 4. Explicitly out of scope

- **Any destructive change.** Nothing is dropped in this workstream. A `drop`
  disposition from Phase 1 is a recommendation for a separate, individually
  approved change, and `AGENTS.md` requires owner approval for each.
- **`profiles` column drift.** `account_type`, `verified_trader`,
  `verification_tier`, `risk_category`, `completed_deals`, `title`, `languages`,
  `commodities`, `regions_served`, `years_active`, `typical_deal_size`, `bio`,
  `plan`, `plan_status`, `plan_renews_at` and `stripe_subscription_id` are all
  undeclared columns on a table that *is* declared. Same disease, different
  scope; it belongs in Phase 1's classification but its repair is separate.
- **`profiles.verification_level`**, which has its own proposal at
  `docs/proposals/verification-level-remediation.md`.
- **Repairing the migration chain**, which is
  `docs/plans/active/migration-chain-reconciliation.md`.

---

## 5. Recommendation

Approve **Phase 1 only**, as a read-and-classify exercise producing a document.

The zero-row finding makes it very likely that most of these twenty tables
should be dropped rather than declared, and if that is right, the baseline is a
far smaller and more honest artefact than a dump of the current state would be.
It would be a mistake to enshrine an abandoned Deal Room schema in the
repository as though it were the product, purely because it exists in the
database.

Phase 1 costs a day and cannot break anything. Nothing after it should be
scoped until its output is read.
