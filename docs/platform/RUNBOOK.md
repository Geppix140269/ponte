# Runbook

## Daily development

The working copy is `C:\dev\ponte`. It was moved out of OneDrive on
22 July 2026; see [SOURCE-OF-TRUTH.md](SOURCE-OF-TRUTH.md).

Bash and PowerShell both work for git, `npm install` and anything else that
writes files. The old PowerShell-only rule, and the `.git/index.lock` dance
that went with it, were OneDrive symptoms and no longer apply. If you find
yourself renaming lock files, check you are not working in the retired
OneDrive folder by mistake.

```
git checkout -b <branch>
npm run dev
node scripts/build-messages.mjs     # after editing messages/_fragments
node scripts/check-messages.mjs     # validates all locales
npx next build                      # must pass before a pull request
```

## Ship a change

1. Branch. Never commit to `main` directly.
2. Build green locally, and `node scripts/check-messages.mjs` clean.
3. Open a pull request. CI runs build, locale validation and a secret scan.
4. Merge to `main`. The host deploys automatically.
5. Update the matching document in `docs/platform` in the same pull request.

**First deploy after a routing change:** use the host's "clear cache and
deploy" option. The durable cache has served stale prerenders before.

## Verify a deploy

Check the live site rather than trusting the dashboard.

```
curl -sI https://ponte.trade | findstr /i "HTTP location"
curl -s  https://ponte.trade/marketplace | findstr /i "vetted"
```

Confirm at least: `/`, `/marketplace`, `/pricing`, `/about`. After an i18n
change also check a prefixed locale, for example `/es/marketplace`, and that
`/cart` still returns a permanent redirect rather than a page.

## The service worker

`public/sw.js`. Registered only in production, by
`components/ServiceWorkerRegistrar.tsx`. It is not active under `npm run dev`,
where it would fight hot reload, so test it with `npx next build && npx next
start` and open the site over `localhost`, which browsers treat as a secure
origin.

**Check it is doing its job.** Chrome DevTools, Application, Service Workers:
the worker should be activated and running. Then Network, tick Offline, and
reload. You should get the Ponte offline page in the language you were reading,
not the browser's dinosaur.

**A service worker is the one deploy that can outlive a rollback.** Reverting a
bad commit does not remove a worker already installed on someone's phone. That
is why `sw.js` never caches a page, and it is why the kill switch exists.

**Kill switch.** If the worker misbehaves in the wild, replace the body of
`public/sw.js` with the self unregistering snippet written at the top of that
file, and deploy. It reaches every browser because `sw.js` is excluded from the
worker's own caches and is registered with `updateViaCache: "none"`, so it is
revalidated on every visit. Do not simply delete the file: a 404 leaves the
installed worker in place.

**After changing what is cached,** bump `VERSION` in `sw.js`. Activation
deletes every `ponte-` cache that is not on the current list, so a bump is how
old entries are cleared.

**Two paths that must never be locale prefixed:** `/manifest.webmanifest` and
`/sw.js`. Both are named in the `middleware.ts` matcher. A worker served from
anywhere other than the root cannot control the whole origin, and a manifest
redirected to `/en/manifest.webmanifest` is a 404, which kills the install
prompt silently.

## Sanctions list refresh

The five published lists (OFAC SDN, OFAC consolidated, EU CFSL, UN Security
Council, UK OFSI) are rebuilt nightly, and every subject holding a clean
verdict is re-screened against the result.

**Where it runs.** GitHub Actions, workflow `Sanctions refresh`
(`.github/workflows/sanctions-refresh.yml`), at 02:00 UTC. It runs
`npm run sanctions:refresh`, which is `scripts/sanctions-refresh.ts`, which
calls `runRefreshAndRescreen()` in `lib/sanctions/refresh-run.ts`.

**Why not a function.** A full refresh takes minutes. A synchronous function is
capped well below that on any host, so the old scheduled function returned HTTP
504 while the work carried on server side, or did not, with no way to tell
which. A GitHub Actions runner has a six hour ceiling, so the timeout is gone
rather than raised.

This survived the move to Vercel unchanged, and deliberately. Vercel's function
ceiling is higher than Netlify's was, and `maxDuration` now works where it used
to be inert, so it is tempting to move this back into a Vercel Cron job. Do
not: the ceiling is still minutes, so a job that grows slightly starts failing
intermittently, which is worse to operate than a job that cannot fail this way
at all. The runner also keeps the nightly rebuild independent of the host, so a
hosting incident does not stop sanctions screening from being refreshed.

**Trigger it by hand.** GitHub, Actions tab, `Sanctions refresh`, `Run
workflow`. That is the supported manual path and it is the same code as the
scheduled run.

There is also `POST /api/cron/sanctions-refresh` with the
`x-refresh-secret` header, kept for an operator with a shell but no GitHub
access. **It will return 504 on a full refresh.** Read that as "no result",
never as "failed", and confirm the outcome in `sanctions_refresh_log`.

**Check it worked.**

| Question | Where |
|---|---|
| Did last night's run pass? | Actions tab, `Sanctions refresh`, last run |
| What did each list load? | `sanctions_refresh_log`, one row per source per run |
| How many rows are live? | `select source_list, count(*) from sanctions_entries group by 1` |

Roughly 30,000 rows across the five lists is the normal total.

**When it fails.**

- A single source failing once is normal, a national feed blips. The run is
  marked failed, that list keeps its previous copy, and the other four still
  reload.
- A source failing **twice in a row** emails `ADMIN_ALERT_EMAIL`. That means
  screening is running against a stale copy of that list, usually because the
  feed changed shape and the parser in `lib/sanctions/refresh.ts` needs
  adjusting.
- A red workflow run also emails whoever owns the repository, through GitHub's
  own notifications. That is the backstop if the job cannot even start, for
  example a missing secret, when no code of ours runs to send an email.

A partial run is safe. Loading is upsert then sweep, and the sweep only runs
after every chunk has landed, so a run that dies half way leaves a superset of
the correct list and never a subset. **Do not change this to delete then
insert.** That leaves a window where a concurrent screening sees an empty
table and reports a subject clean, which is silent and looks identical to a
real result.

**Secrets the workflow needs**, set under Settings, Secrets and variables,
Actions: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`,
`RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `ADMIN_ALERT_EMAIL`. Rotating any of
these means updating both Vercel and here, or the nightly run starts failing
while the site stays up. This is the failure mode that hides: the site is
green, screening is refreshing against a stale list, and nothing says so except
the Actions tab.

**Two GitHub scheduling caveats.** Scheduled runs can be delayed by several
minutes at peak, which does not matter for a daily rebuild. And GitHub
disables scheduled workflows in a repository with no activity for 60 days, so
if the refresh silently stops, check that the workflow is still enabled before
looking at the code.

## Back up

The source of truth is GitHub. Local bundles are a second line, useful if the
GitHub account is ever lost.

```
cd C:\dev\ponte
git bundle create C:\Users\gfuna\ponte-backups\<date>-ponte.bundle --all
```

A bundle contains the full history of every branch in one file. Copy it
somewhere off this machine. Existing bundles are in
`C:\Users\gfuna\ponte-backups`.

**What a bundle does not contain:** the database, uploaded listing media, and
secrets. Those are not in git.

| Asset | Backed up by | Frequency |
|---|---|---|
| Code and history | GitHub, plus local bundles | Every push |
| Database, all 15 tables | `npm run backup`, scheduled task `PonteTradeBackup` | Daily, 02:00 |
| Storage, all buckets | Same run | Daily, 02:00 |
| Secrets | Password manager | On rotation |

Full detail, including how to restore and how to test that a restore works,
is in [BACKUP.md](BACKUP.md).

**Remaining gap:** the backups are written to this machine. Copy
`C:\Users\gfuna\ponte-backups` somewhere off it. A backup on the same disk as
the original is not a backup.

## Restore

**A bad deploy.** Revert the merge commit on `main` and let the host rebuild.
Do not hand edit files on the server.

```
git revert -m 1 <merge-commit>
```

**A lost working copy.** Clone from GitHub. That is the whole recovery.

**A lost GitHub account.** Restore from a bundle, then push to a new remote.

```
git clone C:\Users\gfuna\ponte-backups\<date>-ponte.bundle ponte-restored
```

**A leaked credential.** Rotate at the provider first, update the password
manager, update the host's environment variables, redeploy. Then record the
date in [SECRETS.md](SECRETS.md). Rotate before investigating: the
investigation can wait, the open key cannot.

## Incident checklist

1. Is it the site, the database, or a third party? Check the host's status page
   and Supabase's before assuming it is the code.
2. If it is the code, revert first and diagnose after.
3. If it is a credential, rotate first and diagnose after.
4. Write what happened into [VERSIONS.md](VERSIONS.md). An incident nobody
   recorded happens twice.
