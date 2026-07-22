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
