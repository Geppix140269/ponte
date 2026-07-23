# What is waiting on a hand-applied migration

The Supabase migration chain aborts at `02_ponte_previews_bucket.sql`, an
unguarded `create policy` for a policy that already exists in production. Every
migration after it in `supabase/migrations/` is therefore unreached by the
GitHub integration and has to be run by hand.

That failure is also the only thing that stopped a deferred `drop table` running
against production on 2026-07-22. Do not repair `02` casually. See
`supabase/pending/README.md`.

## Queue, in order

### 1. HS 2022 catalog

    supabase/migrations/20260722b_hs_codes.sql

Paste into the Supabase SQL editor and run. Then, from the repo:

    npm run hs:import

Expect `hs_codes now holds 5613 HS2022 rows.` The importer validates every row
before writing any of them and upserts on `code`, so running it twice is a
no-op and running it after a failed attempt is safe.

Until this is applied:

- `/api/hs/search` answers with an empty list rather than an error
- the composer keeps working and simply offers no HS picker
- any HS code submitted is dropped rather than stored, because it cannot be
  verified against a catalog that does not exist

Nothing breaks. It just stays unclassified.

### 2. Block A: the desk_radar signal gate — APPLIED 2026-07-23

    supabase/migrations/20260723a_desk_radar_signal_gate.sql

**Done.** Applied to production on 2026-07-23 via `db-query.mjs` and verified by
probe: all 90 rows moved `live` to `private` (none lost), the six new columns
exist, the status constraint carries the Market Signal vocabulary, the default
is `private`, and `desk_radar_public_idx` was created. Recorded in
`schema_migrations`. Left here as a record; the steps below are how it was run.

**Probe first.** Confirm the table and its current status values actually exist
before running anything:

    select status, count(*) from desk_radar group by status;

Then apply and verify by probe, not by assertion:

    node scripts/db-query.mjs --file supabase/migrations/20260723a_desk_radar_signal_gate.sql
    node scripts/db-query.mjs --sql "select status, count(*) from desk_radar group by status"

The `update` that remaps the status values is not data-losing, so db-query.mjs
will run it. Expect every former `live` row to read `private` afterwards.

Until this is applied:

- the public `/market-signals` board is empty and hides itself, because
  `getMarketSignals()` fails soft when the new columns are absent
- `/admin/signals` shows a red notice explaining the migration is not yet
  applied, and its Approve action cannot succeed
- the homepage and `getLiveDeals()` are unaffected: they no longer read
  `desk_radar` at all, so nothing there depends on this migration

Nothing on the current site breaks. The radar simply stays private until the
gate exists and an admin approves individual signals.

## Checking what has been applied

There is no migration ledger in this project, so the only honest answer comes
from asking the database. For the HS catalog:

    select count(*) from hs_codes where hs_edition = 'HS2022';   -- expect 5613
    select * from hs_search('sugar', 5);                          -- expect 1701xx rows

## Why this file exists rather than a comment in each migration

Every file in `supabase/migrations/` already carries a comment saying "Run in
the Supabase SQL Editor", and for months that comment was wrong: the integration
was applying them automatically. The comments are not trustworthy on this point,
so the queue lives in one place that is.
