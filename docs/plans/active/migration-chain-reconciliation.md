# ExecPlan: migration chain reconciliation

**Status:** proposed, not started
**Raised:** 26 July 2026
**Owner decision required before any step below is executed.**

## 1. Purpose and user outcome

No user-facing surface changes. The outcome is operational: the repository
becomes able to build a working database from its own files, so that a staging
environment, a disaster rebuild or a new contributor's local project is
possible, and so a merged migration is not silently unapplied.

Two costs are being paid today:

- Every new migration must be applied to production by hand. `20260726a` was
  applied that way on 26 July 2026. A future one that nobody remembers to run
  ships code expecting a column that does not exist.
- The `Supabase Preview` check has been red on `main` since at least
  22 July 2026. A permanently red check is indistinguishable from a newly red
  one, so it stops being read.

## 2. Authority consulted

- `AGENTS.md`, engineering rules and stop conditions.
- `docs/codex/DATABASE-STATE.md`: "Do not repair, squash, rename or replay
  migrations without a dedicated migration-reconciliation plan and explicit
  approval." This plan exists to satisfy that sentence; it is not the approval.
- `docs/codex/KNOWN-ISSUES.md`: production schema and repository migration
  history are not guaranteed identical.
- `supabase/pending/README.md`: the record of how the auto-apply pipeline was
  discovered, and of the deferred destructive migration.
- `.agent/PLANS.md` for this plan's required shape.

## 3. Current implementation discovered

**The failure.** The Supabase GitHub integration replays `supabase/migrations/`
in filename order. The first file aborts the run:

```
ERROR: relation "products" does not exist (SQLSTATE 42P01)
At statement: 0
alter table products add column if not exists band text
```

`products` belonged to the report shop, removed in July 2026 having taken zero
orders. `supabase/schema.sql` records the removal; nothing creates the table
any more.

**Seven files depend on the removed shop tables:**

- `01_catalogue_fields.sql`
- `20260526_b_catalogue_includes.sql`
- `20260526_capacity_queue.sql`
- `20260526_catalogue_restructure.sql`
- `20260527_wave4_catalogue.sql`
- `20260528_wave4_product_copy_ponte_voice.sql`
- `20260610_adamftd_catalogue.sql`

**Removing those seven is not sufficient, which is the discovery that makes
this a plan rather than a chore.** The next file, `02_ponte_previews_bucket.sql`,
calls `is_admin()`, and `is_admin()` is created in `supabase/schema.sql`, which
the integration does not run. `profiles` has the same problem. The chain cannot
apply to an empty database until the base schema is part of the chain, so the
work is "make the repository able to build a database", not "delete some dead
files".

**The pipeline this sits on.** Per `supabase/pending/README.md`, the
integration applies `supabase/migrations/` to the **production** database on
push to `main`, and the run has been aborting at the first file. Production is
therefore protected by the breakage, not by design: repairing the chain without
first disarming the pipeline would let every file in the folder run against
production on the next merge.

**Known drift.** `schema.sql` records that the live `profiles` table carries
columns no file in this repository creates. A chain that applies cleanly to an
empty database still would not reproduce production, and this plan does not
claim otherwise.

## 4. Scope

Included:

- disarming the production auto-apply before any repair (owner action);
- making `supabase/migrations/` applicable to an empty database;
- recording the result in `docs/codex/DATABASE-STATE.md`.

Excluded:

- the deferred `20260722a_drop_legacy_shop.sql` in `supabase/pending/`, which
  stays deferred and stays out of `migrations/`;
- closing the `profiles` drift between production and the repository;
- any change to production schema, data or RLS.

## 5. Product rules

None engaged. No user-facing surface, copy, classification, disclosure or
trust representation changes.

## 6. Technical design

Proposed, in order:

1. **Disarm.** Owner turns off migration auto-deployment to the production
   branch in the Supabase GitHub integration. Nothing else proceeds until this
   is confirmed, because every later step increases what an automatic run would
   execute.
2. **Archive the dead-shop files.** Move the seven to `supabase/archive/`, with
   a README recording that they were applied to production before the shop was
   removed and are kept as history, not as replayable steps. Archive rather
   than delete: they are the record of what production actually received.
3. **Put the base schema in the chain.** Add `00_base_schema.sql` carrying the
   contents of `supabase/schema.sql` (already `create table if not exists` /
   `create or replace function`), so `profiles` and `is_admin()` exist before
   any file that uses them. Verify every policy it creates is
   drop-then-create rather than a bare `create policy`.
4. **Make `02` re-runnable.** It issues bare `create policy` statements that
   fail on any database where the policies already exist. Convert to
   drop-then-create, matching the pattern used by every dated migration since.
5. **Verify on a preview database, not production.** A pull request replays
   against a throwaway preview database. The check going green on the PR *is*
   the test that the chain builds a database from empty.

## 7. Migration plan

No forward migration against production is proposed. Production is already
correct; this is a repository reconciliation.

- **Rollback:** revert the pull request. Archived files return to
  `migrations/`; no database is touched by either direction.
- **Backfill:** none.
- **Idempotency:** the point of steps 3 and 4.

## 8. Experience states

Not applicable. No route, component or user-visible state changes.

## 9. Validation

- `npm run verify` (unaffected, but must stay green).
- The `Supabase Preview` check on the pull request must go **green**, which it
  has not been since 22 July 2026. If it goes green for a reason other than the
  chain applying (for example because disarming the integration removed the
  check entirely), that is not evidence and must be recorded as such.
- No production probe is required, because no production change is proposed.

## 10. Rollout and safe-disable

No flags. The sequencing in section 6 is itself the safety: disarm first,
repair second, merge last. Merging remains an owner action under the
`AGENTS.md` stop conditions.

## 11. Progress log

- **26 July 2026** — Failure diagnosed, seven dependent files identified, the
  `is_admin()`/`profiles` dependency discovered, plan written. Owner asked for
  the auto-apply to be disarmed before any repair. Nothing executed.

## 12. Decisions and discoveries

- **Discovery:** removing the dead-shop migrations does not fix the chain. The
  base schema is not in the chain at all. Anyone treating this as a five-minute
  cleanup will produce a still-broken chain and a green-looking diff.
- **Discovery:** the repair re-arms an auto-apply pipeline pointed at
  production. `supabase/pending/README.md` predicted exactly this and called
  the repair dangerous *because* it looks obvious.
- **Owner decision, 26 July 2026:** disarm the production auto-apply first,
  then reconcile.

## 13. Final evidence

Not yet executed. To be completed with commits, pull request, check results
and any limitation discovered during execution.
