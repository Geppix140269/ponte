# Versions

Newest first. One entry per meaningful change to what is live. Update this in
the same pull request as the change.

Format: date, what changed, why, and anything that needs watching afterwards.

---

# Open items

State as at 21 July 2026. Written down so it does not live in one person's
head or one chat session. Delete an item when it is genuinely done, not when
it is started.

## In flight as at 21 July 2026

**Front door rework, professional trade positioning.** The owner's diagnosis,
and it is correct: the data model is trade grade but the surface reads as
consumer classifieds, "like eBay or Milanuncios". The listing form captures HS
code, quantity and unit, incoterms, origin, destination and payment terms,
while the homepage said "Post it in 3 clicks. Photos, videos, done."

Two agents were working on this when the session ended:

1. `app/[locale]/page.tsx`. Hero states the category in trade language rather
   than a slogan. The verification proof strip moves high on the page, naming
   the real sources (Companies House, VIES, GLEIF, OFAC, EU, UN, UK OFSI),
   because that is the differentiator no classifieds portal can claim and it
   was buried at /verification.
2. The board and listing detail. Cards lead with the trade line, quantity and
   unit in tabular numerals, then incoterm, then corridor. Photos demoted.
   Dense rows rather than a grid of large cards.

**Check both landed and CI is green before assuming this is done.**

**The constraint that must not be relaxed:** the platform has very few
listings. No invented volume, no member counts, no "X traders online", no
urgency. Where the board is thin the page shows the FORMAT of a deal, clearly
labelled as an example. A fake liquidity signal loses exactly the professional
trader this is meant to attract, because they spot it immediately.

**Earlier instruction this partly reverses:** commits such as "Landing page v2:
two doors, three clicks, almost no words" optimised for simplicity, and that is
what produced the consumer feel. Simplicity and institutional credibility pull
against each other here. The three click flow stays, the language around it
changes.

## Do these first

**1. Set the GitHub Actions secrets, or the nightly sanctions refresh never
runs.** The scheduled refresh moved from a Netlify function to GitHub Actions
(see the entry below for why). It needs, under Settings, Secrets and variables,
Actions: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`,
`RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `ADMIN_ALERT_EMAIL`. Until these exist
the workflow fails on its first run. The lists currently hold roughly 30,000
rows from a manual load, so screening works today and will simply go stale.

**2. Copy `C:\Users\gfuna\ponte-backups` off the machine.** A backup on the
same disk as the original is not a backup. See [BACKUP.md](BACKUP.md).

**Closed 21 July: the Supabase personal access token was rotated.** A PAT had
been pasted into a chat transcript to apply migrations, which exposed account
level access permanently. The old token is confirmed rejected with HTTP 401 and
appears nowhere on disk. Recorded here rather than deleted, because the lesson
outlives the incident: **never paste a credential into a chat, a ticket or a
commit message.** Put it in the environment and hand over a reference to it.
See [SECRETS.md](SECRETS.md).

## Measured, and not yet measured

**Cost of one Level 2 verification, measured on a real run:** 1 model call,
`claude-sonnet-4-6`, about **2,560 input and 480 output tokens**, 8 to 10
seconds. Roughly $0.015 to $0.02. Against a 2 credit charge that is comfortable.

**Not yet measured:** the fuller path. That run stopped early because the
company name was ambiguous, so **no sanctions triage calls fired**. A case that
reaches screening adds a Haiku call per batch of 8 candidates. Haiku is far
cheaper than Sonnet so it should stay well inside 2 credits, but that is
reasoning, not a measurement. To get it, run a check with a registration
number supplied, then:

```sql
select feature, model, input_tokens, output_tokens
from ai_calls where ref = '<verification id>';
```

**Deliberate deviation:** reconciliation runs on Sonnet, where the brief
specified Haiku. Sonnet is the better judgement for reconciling a whole case
and the cost difference at 3,000 tokens is immaterial.

## For counsel, not for engineering

- **The verification disclaimer renders in English on all ten locales.** It is
  a TypeScript constant, not a message string. Consistent with Terms and
  Privacy staying English, but a limitation of liability a reader cannot read
  arguably protects nobody. Legal judgement, not a technical one.
- **The terms page has not been updated** with the verification disclaimer.
  The exact text is `VERIFICATION_DISCLAIMER` in
  `lib/verification/pipeline.ts`. Inserting liability language into a live
  contract was deliberately left for a person.

## Built but not yet exercised

- **Certificate PDF** (`lib/verification/certificate.ts`) has never been
  rendered end to end. No verification has reached a verified state yet.
- **Level 3 activity verification.** The `verification-docs` private bucket
  exists, the schema exists, the upload flow does not.
- **Guest certificate checkout**, deferred on purpose. The pipeline already
  supports a guest by email plus a ledger id; the Stripe product is unbuilt.
  Price is USD, not EUR.

## Decided, so nobody re-opens them by accident

- **OpenCorporates: not purchased.** Cheapest tier is £2,250 a year, about
  £4.50 a lookup at full use. Non-UK companies route to human review instead,
  which never falsely passes. UK is covered by Companies House, the EU by VIES
  (a valid VAT number returns the registered name and address), and anyone with
  an LEI by GLEIF. Revisit only when the review queue costs real hours, and
  price a free national registry adapter such as France's INSEE Sirene first.
- **Phone OTP: dropped.** An SMS cost and a second signup step, on a free
  marketplace with 3 members. The Level 1 queue sits behind an interface so
  Stripe Identity drops in later without a rewrite.

## Known weaknesses

- **The working copy is inside OneDrive.** The Bash tool cannot create files
  there at all, so git and npm must be run from PowerShell, and builds crawl.
  Moving the clone out removes the problem entirely. See
  [SOURCE-OF-TRUTH.md](SOURCE-OF-TRUTH.md).
- **No independent export of the database exists beyond `npm run backup`**,
  which writes to the same machine. See item 3 above.
- **CI is on deprecated action versions.** GitHub is forcing
  `actions/checkout@v4` and `actions/setup-node@v4` onto Node 24. They still
  run. Bump before it becomes an error.

---

## 22 July 2026, the migration nobody checked

**The bug.** Picking a company from the ambiguous match list always answered
"that check is no longer waiting for a company to be chosen". Every time, for
every member, since the picker shipped.

**The cause.** Migration `20260721i` adds `needs_selection` to the
`verifications` status check constraint. It was never applied: the Supabase
token was rotated mid session and the migration was written down as done
without being run. Postgres rejected every write of that status with 23514.
Because the failing update set the status AND stored the candidate list in one
statement, the row stayed at `pending` with no candidates saved.

**Why it looked like it worked.** The candidates in the API response come from
the object in memory, not from the row, so the picker rendered perfectly from a
write that had not happened. The error was sitting in the return value and
nothing read it.

**Fixed.** Both migrations are now applied and verified by probe rather than by
assertion: `needs_selection` is accepted and read back, `data_sources` and
`data_source_cache` exist and round trip a row. The pipeline now reads the
error from that update, and a pause the database refuses falls back to the
review queue instead of offering a picker guaranteed to fail.

**The rule this earns:** a migration is applied when a query proves it, not
when the tool says 200 and not when this file says so. `alter table` through
the Management API returns success for a statement inside a `do $$` block that
did nothing. Probe the behaviour afterwards, every time.

**Second lesson, cheaper:** an unchecked `.update()` on a table with a check
constraint is a silent failure waiting for a schema drift. Read the error, or
do not write the row.

## 21 July 2026, CI fixed

CI failed on its first three runs, in about 14 seconds each, before it reached
the build. Two defects, both introduced with the i18n work:

1. **`package-lock.json` did not contain `next-intl`.** The dependency was
   added to `package.json` by hand after the original `npm install` timed out,
   so the lock was never regenerated. `npm ci` refuses to install when the two
   disagree, which is exactly what it is for. Fixed with
   `npm install --package-lock-only`.
2. **The `prepare` script could fail an install.** It ran `git config
   core.hooksPath`, which cannot create its lock file inside OneDrive, so every
   `npm install` here exited 255. It now runs `scripts/install-hooks.mjs`,
   which warns and continues. A guard that breaks the build it is meant to
   protect is worse than no guard.

Production was never affected: Netlify installs differently from `npm ci`, so
the deploy kept working while CI was red.

**Known warning, not yet failing:** GitHub is deprecating Node 20 for
`actions/checkout@v4` and `actions/setup-node@v4`. They still run. Bump the
action versions before that becomes an error.

## 21 July 2026, database and storage backup

**Status:** shipped and running.

Code was safe on GitHub, the data was not. Supabase keeps its own backups, but
inside the same project, so losing the project or the account loses them too.

- `npm run backup` exports all 15 tables as paged NDJSON and downloads every
  file from every storage bucket, with a manifest carrying row counts, byte
  counts and a SHA-256 per table. Built on the Supabase client, because this
  machine has no `pg_dump`, `psql`, Supabase CLI or Docker.
- `npm run restore` is a dry run unless confirmed, refuses a backup marked
  incomplete, requires the target project spelled out and matching the
  environment, refuses to move data between projects, and never deletes.
- Scheduled task `PonteTradeBackup`, daily at 02:00. Verified end to end: run
  through the Task Scheduler returned 0 and produced a complete run.
- Verified on the first run: 15 tables, 103 rows, 2 files, 36.7 MB. Every
  NDJSON parsed and every row count matched the manifest.
- Backups are git ignored. They hold member personal data.

**Still open:** the backups live on the same machine as the working copy. They
need copying somewhere else.

## 21 July 2026, platform hygiene

**Status:** shipped to `main` and live.

- One branch. Ten stale remote branches were removed after confirming each had
  zero commits not already in `main`, so nothing was lost. `main` is now the
  only branch on the remote.
- Legacy redirects moved out of `next.config.mjs` and into `middleware.ts`.
  On Netlify the middleware runs at the edge, ahead of the origin, so a
  redirect declared in the config never saw an unprefixed URL: the locale
  middleware had already rewritten it. The same URL was answering 307 in
  English and 308 in Spanish. One authority now, verified live: `/cart`,
  `/network`, `/catalogue`, `/brokerage`, `/why-ponte`, `/methodology`,
  `/product/*` and `/category/*` all return 308, and a prefixed URL keeps its
  language, so `/es/cart` lands on `/es/marketplace`.
- Commits go straight to `main` by the owner's decision. The pre-commit guard
  against secrets, env files and stray files stays.

- Backed up all three local clones as full history bundles before any cleanup.
- Established one source of truth and retired two stale clones that had been
  publishing competing versions of the site. See
  [SOURCE-OF-TRUTH.md](SOURCE-OF-TRUTH.md).
- Added this documentation set.
- Audit found no credential has ever been committed to the repository. Live
  exposures are local: see the open actions in [SECRETS.md](SECRETS.md).

## 21 July 2026, ten language interface

**Status:** shipped to `main` and live on ponte.trade. Verified after deploy:
`/`, `/marketplace` and `/pricing` serve English on their original URLs, and
`/es/marketplace`, `/zh/marketplace` and `/ar/marketplace` all serve.

- next-intl with `app/[locale]` routing. English keeps bare URLs, other
  languages are prefixed, so indexed URLs do not move.
- Languages: en, zh, es, ar, fr, pt, ru, de, hi, it. 419 strings each.
- Locale from an explicit cookie choice first, then `Accept-Language`. An
  explicit choice is never overridden.
- Arabic renders right to left.
- Per locale metadata, hreflang alternates, and a sitemap covering every
  language.
- Listing content translation was left alone and integrated with: on a
  prefixed URL the "Read in" bar defaults to the reader's language when that
  translation already exists.
- Terms and Privacy stay English behind a translated notice. Admin stays
  English.
- `scripts/check-messages.mjs` gates all locales on key parity, ICU
  placeholders, rich text tags and a ban on em dashes.

**Fixed on the way:** the incoterm select had no `value` attribute, so its
option value was its own label. The initial state matched nothing and the first
option submitted the literal label text. Once translated, a French user would
have written French into the database.

**Also fixed:** `package.json` was missing `next-intl` entirely, which would
have failed a clean install on the host, and listed `openai` twice.

## 21 July 2026, one story

- Legacy shop and Deal Desk routes now return permanent redirects from
  `next.config.mjs` instead of temporary ones from page level stubs, so search
  ranking transfers. Locale prefixed variants redirect too.
- The Deal Sheet page is retired into the one door Marketplace. The digest form
  and its submit type stay, for the alerts work.
- The header no longer shows a cart icon. A stale browser cart from the shop
  era made it reappear for returning visitors.
- Deleted ten `.clean` backup files that had been committed.

## Earlier, from git history

- Phase 2 AI account manager, and Ponte AI at $19 per month.
- Free vetted marketplace with direct connect, desk optional on a success fee
  or retainer.
- AI vetting co-pilot: the model reviews every listing for the desk.
- Listing translation, drafts, guest building and WhatsApp share pages.
- Counterparty role and chain depth on listings.
- Auth links that work anywhere, via a token hash confirm route.
- Profiles role locked against self promotion.
