# Runbook

## Daily development

The working copy is inside OneDrive, which breaks some tooling. Until it is
moved out (see [SOURCE-OF-TRUTH.md](SOURCE-OF-TRUTH.md)):

- **Use PowerShell for git, `npm install`, and anything that creates files.**
  A Bash shell cannot create files in this folder and every git write fails
  with `Unable to create .git/index.lock`. This is a OneDrive artifact, not
  repository corruption.
- If git reports `unable to unlink .git/index.lock` or `HEAD.lock`, do not
  force. Rename the lock out of the way and retry the same command:
  `ren .git\index.lock _to_delete_lock1`. Never commit a `_to_delete*` file.
- `unable to unlink tmp_obj_...` warnings during a commit are harmless.

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

## Back up

The source of truth is GitHub. Local bundles are a second line, useful if the
GitHub account is ever lost.

```
cd C:\Users\gfuna\OneDrive\Documents\GitHub\ponte
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
