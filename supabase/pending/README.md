# supabase/pending

Migrations that are written, reviewed, and deliberately NOT applied yet.

## Why this folder exists

The Supabase GitHub integration is installed on this repository. It applies
every `.sql` file in `supabase/migrations/`, in filename order, automatically:

- on a pull request, against an ephemeral preview branch database
- **on a push to `main`, against the production database**
  (`cptglsmjmzcfpjndqfmc`)

Nothing in the repository said so. It was found on 2026-07-22 by reading the
check run on main's HEAD, whose `details_url` points at the production project
ref while the same check on a pull request points at a throwaway one.

That makes `supabase/migrations/` an auto-deploy directory, not a folder of
scripts somebody runs by hand, even though every file in it carries a comment
saying "Run in the Supabase SQL Editor". A migration placed there is a
migration that WILL run against production the moment its branch merges.

So a migration that is meant to wait cannot sit in that folder. It waits here.

## What is in here now

`20260722a_drop_legacy_shop.sql` drops the seven report shop tables and one
archived table. The decision of 2026-07-22 was to defer it until after the
August 1 launch, with a fresh backup taken at that point. It sorts last by
filename, so had it stayed in `migrations/` it would have been the final
statement the integration ran against production on merge.

## What is currently protecting production, and why that is not comfortable

The automatic run does not reach the end of the list. It aborts early, at
`02_ponte_previews_bucket.sql`, which issues a bare `create policy` for a
policy that already exists in production, and has been failing there since at
least 2026-07-22T08:05Z. Every later migration in the folder is therefore
unreached, including the destructive one.

**Production is being protected by a broken migration, not by design.** Repair
`02` without thinking about it and the chain runs to the end. That repair looks
like an obvious tidy-up, which is exactly what makes it dangerous.

Related: `01_catalogue_fields.sql` alters `products`, a table created only in
`supabase/schema.sql`, which the integration does not run. So the folder cannot
be applied to an empty database either. See the drift note in `schema.sql`.

## Running one of these

By hand, in the Supabase SQL Editor, after a fresh `npm run backup`, and never
by moving the file back into `migrations/` unless the intention is for it to
run on the next merge to `main`.
