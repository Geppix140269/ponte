# supabase/deprecated

Migrations that must **never** be applied, to any database, ever.

This is not `supabase/pending/`. A file in `pending/` is written, reviewed and
waiting for its moment. A file in here is wrong, and the record of why it is
wrong is worth more than the file.

Nothing in this directory is read by any tool. It sits outside
`supabase/migrations/`, which is the only directory a migration chain walks, so
no automated run can reach it. `scripts/check-migrations.mjs` fails the build if
one of these filenames reappears under `supabase/migrations/`.

---

## `20260725a_verification_needs_selection.sql`

**Deprecated 28 July 2026 by owner direction. Never applied to production, and
must not be.**

### What it does

Drops every CHECK constraint on `verifications` whose definition mentions
`status`, then adds one allowing exactly:

```
pending, auto_verified, review, failed, needs_selection
```

### Why it is wrong

It **removes `verified` and `rejected`**, which `20260721i` had allowed and
which production uses.

1. **It cannot run.** Production holds rows in both dropped states: 1
   `verified`, 2 `rejected`, of 9 verifications. Proven on 28 July 2026 by a dry
   run inside a rolled-back transaction against `cptglsmjmzcfpjndqfmc`:

   ```
   ERROR: 23514: check constraint "verifications_status_check" of relation
   "verifications" is violated by some row
   ```

2. **It contradicts the application.** `lib/verification/rescreen.ts` selects
   `.in("status", ["auto_verified", "verified"])`, and
   `lib/listings/publication-gate.ts` defines
   `PASSING_VERIFICATION_STATUSES = {"auto_verified", "verified"}`. Removing
   `verified` would make the publication gate unpassable: no listing could ever
   go public.

3. **It is redundant.** Its stated purpose, per commit `c9ef0bc`, was to ensure
   `needs_selection` is allowed. `20260721i_verification_needs_selection.sql`
   already did that, and is the constraint in force in production today. The two
   files share a name and disagree on content, which is how the mistake
   survived review.

### The specific hazard

The whole file is a single `DO` block, so a failed run rolls back atomically and
leaves production unchanged. It fails safe.

**The danger is a well-meaning repair.** Splitting the drop and the add into
separate statements to "fix" the failure would leave `verifications` with **no
status constraint at all**, which is worse than either state. Anyone reaching
for that fix should stop and read this file instead.

### If the goal ever returns

If a future change genuinely needs to narrow the status vocabulary, it is a new
migration that: migrates the existing `verified` and `rejected` rows to whatever
replaces them first, updates `PASSING_VERIFICATION_STATUSES` and
`rescreen.ts` in the same change, and is reviewed as a behaviour change to the
publication gate rather than as a constraint tidy-up.

Do not resurrect this file to do it.
