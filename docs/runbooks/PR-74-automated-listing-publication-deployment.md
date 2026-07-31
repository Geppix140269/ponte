# Deployment runbook — PR #74, automated listing publication and unified email

**Authority:** ADR-0013.
**Status:** not executed. Every step below is an owner action under the
`AGENTS.md` stop conditions.
**Estimated window:** 40 minutes, of which the Supabase Auth templates are 20.

Read this whole file before starting. Two steps are irreversible in practice
(the migration, and the production Auth templates), and one ordering mistake —
deploying the application before the migration — takes listing submission down.

---

## 0. Before you start

### 0.1 The critical ordering constraint

The application writes columns this migration creates. **The migration must be
applied before the application deploys.** In the gap between the two, the old
application runs against the new schema, which is safe: every added column is
nullable or defaulted, and the old code simply does not read them.

The reverse gap is not safe. New code against the old schema fails on every
listing submission with a column-does-not-exist error.

### 0.2 The migration chain does not self-apply

Recorded in `docs/codex/DATABASE-STATE.md`: the numbered chain aborts on its
first file (`01_catalogue_fields.sql`, `relation "products" does not exist`), so
**merging does not apply anything**. Migrations are applied by hand with
`scripts/db-query.mjs`, exactly as `20260726a` and `20260728a` were.

Do not attempt to repair the chain during this deployment. That is a separate
plan (`docs/plans/active/migration-chain-reconciliation.md`) and is not approved.

### 0.3 Take a backup

```bash
npm run backup
```

Confirm it wrote a file and that the file is non-empty before continuing. A
backup you did not verify is not a backup.

### 0.4 Check what is actually in production first

```bash
node scripts/db-query.mjs --sql "select column_name from information_schema.columns where table_name='listings' and column_name in ('quantity_mode','safety_flags','completeness_score','declaration_accepted_at')"
```

Expect **zero rows**. If any row comes back, part of this migration is already
applied: stop and reconcile before going further, because the file is idempotent
but your assumptions are not.

---

## 1. Database migration

### 1.1 Order

There is exactly one migration in this PR:

```
supabase/migrations/20260728c_automated_listing_publication.sql
```

It must land **after** `20260728a_market_classification.sql`, which is already
in production (applied by hand on 28 July 2026). Nothing else in the chain is a
prerequisite.

The `c` suffix is the result of two successive collisions, both real:

- this file was originally `20260728a`, colliding with the market
  classification migration that is already in production;
- renaming it to `20260728b` then collided with
  `20260728b_schema_migrations_rls.sql`, which reached `main` first through
  PR #76.

`main` currently carries **two files named `20260728a`**: the market
classification migration and an earlier copy of this one, merged before the
rename. Resolving that is part of landing this branch. Until it is resolved, an
operator reading the migration directory cannot tell from a filename which of
the two is in production.

### 1.2 Apply

```bash
node scripts/db-query.mjs --file supabase/migrations/20260728c_automated_listing_publication.sql
```

The file is additive and idempotent. It creates no destructive statement, drops
no column, and **publishes nothing** — there is no bulk UPDATE moving
`submitted` rows to `approved`.

### 1.3 Verify, before touching the application

```bash
node scripts/db-query.mjs --sql "select column_name, is_nullable, column_default from information_schema.columns where table_name='listings' and column_name in ('quantity_mode','quantity_min','quantity_max','quantity_extracted','quantity_confirmed_at','declaration_accepted_at','declaration_version','safety_flags','flag_reason','flag_severity','completeness_score') order by column_name"
```

Expect **11 rows**. `quantity_extracted` must be `NOT NULL` with default
`false`; the rest nullable.

```bash
node scripts/db-query.mjs --sql "select conname from pg_constraint where conrelid='listings'::regclass and conname like 'listings_%check' order by conname"
```

Expect `listings_status_check`, `listings_quantity_mode_check`,
`listings_quantity_range_check`, `listings_quantity_positive_check`,
`listings_flag_severity_check`, `listings_completeness_range_check`.
**`listings_status_check1` must NOT be present** — a stale duplicate of that
name once silently rejected values the visible constraint allowed.

```bash
node scripts/db-query.mjs --sql "select count(*) as events, count(*) filter (where event='listing_published') as published from listing_events"
```

Expect one `listing_published` row per already-public listing, backfilled with
`actor_type='admin'` so historic desk approvals are not misattributed to the
validator.

```bash
node scripts/db-query.mjs --sql "select status, count(*) from listings group by status order by 2 desc"
```

Record this. It is your rollback reference point, and step 5.2 compares against
it.

### 1.4 Confirm RLS still refuses a member self-publish

```bash
node scripts/db-query.mjs --sql "select policyname, cmd, with_check from pg_policies where tablename='listings' order by policyname"
```

`Members create own listings` must permit only `draft`/`submitted`.
`Members submit own drafts` must permit only `draft`/`submitted`/`withdrawn`.
`Members withdraw own live listings` must permit only `approved`/`withdrawn`.
No member policy may permit `approved` as a new value from any other state,
`flagged`, `suspended`, `validating` or `needs_information`.

This is the security half of automated publication. If any of it is wrong,
**stop and roll back**: a member who can write their own status can publish
unverified.

---

## 2. Generated database types

The repository does not commit a generated Supabase types file; `types/` holds
hand-written contracts. Nothing regenerates automatically.

After the migration:

```bash
npx tsc --noEmit --incremental false
```

Expect zero errors. If a type error appears that references a listing column,
the hand-written contract in `types/` needs the new column added. Do this
**before** deploying.

---

## 3. Environment variables

No new variable is introduced by this PR. Confirm the existing ones are set in
the hosting dashboard, because the new code depends on two of them more visibly
than the old code did.

**Which dashboard changed on 31 July 2026.** Production moved from Netlify to
Vercel (`docs/operations/OPERATIONS_LOG.md`), so the variables that matter are
the ones Vercel holds. Whether each variable below was carried across at cutover
is **not recorded** — do not assume it was. Read the list before deploying, not
after.

| Variable | Required | Consequence if missing |
|---|---|---|
| `RESEND_API_KEY` | yes | Every email is skipped. Publication still works; members are never told. Logged as `email skipped (Resend not configured)`. |
| `RESEND_FROM_EMAIL` | defaults to `hello@ponte.trade` | Sends from the default. |
| `ADMIN_ALERT_EMAIL` | yes | **Flagged-listing alerts go nowhere.** A held listing sits unseen. This is the highest-consequence missing variable in this release. |
| `NEXT_PUBLIC_APP_URL` | yes | Every email CTA points at `https://ponte.trade` by default. If the deploy is not on that host, buttons lead off-environment. |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | Publication cannot write. Submission saves the listing and the outcome silently fails to `submitted`. |
| `ANTHROPIC_API_KEY` | optional | AI vetting on the exception console does not run. Publication is unaffected. |

Verify against the production project in the Vercel dashboard, under Settings →
Environment Variables. The previous instruction here was `netlify env:list`,
which now reads the environment of a host that no longer serves production.

---

## 4. Application deployment

### 4.1 Order

1. Migration applied and verified (steps 1.2–1.4).
2. Merge the pull request carrying this branch to `main`.
3. **Deploy `main` deliberately through Vercel.** This step used to read
   "Netlify builds and deploys `main` automatically", and that is no longer
   true: since the 31 July 2026 cutover, merging to `main` does not deploy.
   Production releases are owner-controlled and explicit.
4. Confirm the deploy succeeded, **and that it is serving the commit you
   merged**, before running smoke tests.

Do not merge before step 1.4 passes.

Steps 2 and 3 are now two separate acts. A merged `main` means the code is on
the branch, not that any member is running it — so the smoke tests in section 5
prove nothing until step 3 has actually happened.

**Note on PR #74.** It was merged on 28 July 2026 at 14:40 UTC, carrying the
application code but **not** the exception console, this runbook, the
verification audit, or the migration rename. `main` therefore holds the feature
with two files named `20260728a`, a `lib/listings/safety.ts` that git reads as
binary, and `/admin/listings` still presenting the old queue. The remaining
work is on `fix/automated-listings-email-system`, ahead of `main`, and needs
its own pull request. Deploy from the branch that carries the rename, not from
the state PR #74 left.

### 4.2 Supabase Auth email templates

**These are not deployed by the merge.** They are pasted into the Supabase
dashboard by hand, and until that is done the five authentication emails remain
Supabase defaults. Sign-in keeps working; it just looks unbranded.

Follow `docs/email-provider-template-configuration.md` exactly. Order does not
matter and it can be done before or after the deploy. Five templates: Confirm
signup, Magic Link, Reset Password, Change Email Address, Invite user.

After pasting each one, confirm `{{ .Token }}`, `{{ .ConfirmationURL }}` and
`{{ .SiteURL }}` survived. Removing one breaks sign-in for everybody.

Then send one test of each to a real inbox and open it on a phone. There is no
automated test on the far side of the dashboard: a broken auth template is
otherwise discovered by a member who cannot sign in.

Record the date applied in `docs/codex/CURRENT-STATE.md`.

---

## 5. Smoke tests

Run these against production, in order, immediately after the deploy.

### 5.1 A listing publishes without an administrator

Requires a test account **with a passing member-business verification**. If no
such account exists, this test cannot run — see §7.

1. Sign in, go to `/structure`, build a complete product listing.
2. Submit.
3. Expect the completion screen to say **"Your offer is live."** with a
   `View your listing` button, not "submitted for review".
4. Open the listing URL. It must render publicly.
5. Check the inbox: `Your Ponte offer is now live`.
6. Check the operator inbox: **there must be NO email.** A routine publication
   that alerts an operator means the queue is back.

### 5.2 Nothing was bulk-published by the migration

```bash
node scripts/db-query.mjs --sql "select status, count(*) from listings group by status order by 2 desc"
```

Compare with the counts recorded in step 1.3. The only differences must be
listings you created during smoke testing.

### 5.3 An incomplete listing does not publish, and says why

Submit a listing missing payment terms. Expect the completion screen to name
that exact field, and an email subject `Complete your Ponte offer to publish it`.

### 5.4 Verification-only blocking routes to /verify

With an **unverified** account, submit an otherwise complete listing. Expect:

- the screen to say "Your offer is ready. Your business is not verified yet.";
- the primary button to be **Verify your business**, going to `/verify?for=business`,
  NOT to the listing composer;
- the email subject `Verify your business to publish your Ponte offer`.

### 5.5 A flagged listing alerts an operator

Submit a listing whose description contains the word `ammunition`.

1. It must NOT publish.
2. The member sees the neutral "additional check" wording, with no accusation.
3. The operator inbox receives `Ponte listing PT-XXXX requires review`, carrying
   the flag code, severity, member, company, email and reference in separate
   fields, and a `Review flagged listing` link to `/admin/listings?ref=PT-XXXX`.
4. That link must require an admin session. Open it signed out and confirm you
   are redirected to login, not shown the listing.

### 5.6 The quantity persists exactly as displayed

1. In the composer, choose quantity mode **Exactly**, type `1250.75`, pick a unit.
2. Do not touch it again. Submit.
3. The stored quantity must be `1250.75`, not `125075` and not null.

```bash
node scripts/db-query.mjs --sql "select ref, quantity_mode, quantity, quantity_min, quantity_max, unit from listings order by created_at desc limit 5"
```

Repeat with `Approximately`, a range `500`–`1000`, and `On request`. The last
must publish with a null quantity and a `on_request` mode.

### 5.7 The exception console leads with exceptions

Open `/admin/listings`. Expect:

- the heading **Listing exceptions**, and the sentence stating that listings
  publish automatically;
- flagged and reported items first, each printing a machine-readable reason
  code, a human sentence, severity and the automated findings;
- published listings in their own section, explicitly **not** described as
  awaiting approval;
- the filters returning shareable URLs (`?reason=flagged`, `?severity=high`).

### 5.8 Every operator action is audited

Suspend a test listing with a reason, then reinstate it.

```bash
node scripts/db-query.mjs --sql "select event, from_status, to_status, actor_type, reason_code, created_at from listing_events order by created_at desc limit 10"
```

Both transitions must appear with `actor_type='admin'` and a non-null
`actor_id`. Clearing a flag must record `reason_code='operator_cleared_flag'`.

---

## 6. Rollback

### 6.1 Application only (the common case)

If publication misbehaves but the schema is sound:

```bash
git revert -m 1 <merge-commit-sha>
git push origin main
```

**The revert is not the rollback.** Pushing the revert only changes `main`;
since 31 July 2026 it triggers no deploy. Production keeps serving the faulty
build until someone deploys the reverted commit through Vercel. Treat the
rollback as incomplete until production is confirmed to be serving it.

Once it is deployed, the added columns and `listing_events` rows remain and are
simply unread by the reverted code. **No data is lost and no listing changes
state.** This is the expected rollback and is safe at any time.

One consequence to accept: listings that automated publication moved to
`approved` stay public. That is correct — they were validated, and un-publishing
them would be a second unreviewed bulk action.

### 6.2 Listings stuck in a new status

If the revert leaves rows in `flagged`, `needs_information`, `suspended` or
`validating`, the old code does not understand them and they disappear from the
old queue. Move them back to a status it does:

```bash
node scripts/db-query.mjs --sql "update listings set status='submitted' where status in ('flagged','needs_information','validating')"
```

Do **not** move `suspended` rows to `submitted`: a suspension was a deliberate
human act, and reversing it in bulk republishes something somebody took down.
Leave those and handle them individually.

### 6.3 Schema rollback (last resort)

Only if the status constraint itself is the problem. This narrows the
constraint back and will **fail** if any row still holds a new status, which is
the intended safety behaviour — resolve 6.2 first.

```sql
alter table listings drop constraint if exists listings_status_check;
alter table listings add constraint listings_status_check check (
  status in ('draft','submitted','approved','rejected','closed',
             'expired','closed_done','withdrawn','archived')
);
```

Leave the added columns in place. Dropping them destroys the declaration
timestamps and the audit trail, and they are inert to the old code anyway.

### 6.4 Supabase Auth templates

Not covered by a git revert. To roll back, paste the Supabase defaults back in
from the dashboard's "Reset to default" control per template.

---

## 7. Known risk to accept before deploying

**This release may publish nothing.**

Verification remains a blocking requirement by owner decision (ADR-0013). At
the 26 July probe, `CURRENT-STATE.md` recorded **zero** listings with a passing
bound member-business verification. Automated publication removes the
administrator from the path; it does not remove verification from it.

So the measurable effect on day one is likely to be: listings that previously
sat in `submitted` now sit in `needs_information` with "verify your business"
as the named blocker, and members are told so clearly instead of waiting in
silence. That is an improvement in honesty, not in volume.

Before declaring the release successful, confirm smoke test 5.1 can actually be
run. If no account in production holds a passing member-business verification,
5.1 is untestable and the primary path of this release is unproven in
production. Say so in the deployment record rather than marking it passed.

**The publication gate has four working checks, not five.**

`profiles.verification_level` is `text` in production, not the `int` its
migration declares, so the `verification_level >= 2` floor evaluates
`Number("company_verified") < 2`, which is `NaN < 2`, which is `false`. The
floor never fires for any value the legacy text enum wrote, `unverified`
included. The live column state and the full analysis are in
`docs/codex/audits/verification-publication-gate-audit.md` §4.1.

This does **not** let an unverified member publish: the bound-verification,
`member_business` purpose and passing-status checks all still refuse them, and
both currently approved listings are held back by the status check alone. It
does mean this release ships with one layer of its only gate inert, and that
layer is not repaired here because the fix is a schema-and-code change with an
owner decision inside it (`int` versus `text` canonical).

Nothing else in this runbook depends on repairing it first. Deploying is
defensible; describing the gate as five working checks is not.

---

## 8. Record afterwards

Update, in one commit:

- `docs/codex/CURRENT-STATE.md` — move the ADR-0013 rows from
  "Implemented on branch" to "Deployed", with the date and what was verified.
- `docs/codex/DATABASE-STATE.md` — move `20260728b` from "Written but NOT
  applied" to the applied section, with the probe output from step 1.3.
- The date the Supabase Auth templates were applied, or that they were not.
- Which smoke tests passed, which failed, and which could not be run.

A feature is production-verified only when code, database state, deployment,
user journey and known limitations are all recorded.
