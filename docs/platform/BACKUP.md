# Backup and restore

## What is protected, and by what

| Asset | Protected by | Runs |
|---|---|---|
| Code and full history | GitHub, plus local bundles in `ponte-backups` | Every push |
| Database, all 15 tables | `npm run backup` | Daily, 02:00, scheduled task |
| Storage, all buckets | `npm run backup` | Same run |
| Secrets | Password manager | On rotation |

Supabase takes its own backups, but they live inside the same project. If the
project or the account is lost, they go with it. This writes a copy you
control, which is the only kind that survives losing the provider.

## Taking a backup

```
npm run backup
```

Reads `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` from the environment,
falling back to `.env.local`. Credentials are never written to disk or logged.

Output goes to `C:\Users\gfuna\ponte-backups\supabase\<date>_<time>` with:

- `tables/<name>.ndjson`, one JSON object per line, paged so a large table
  never has to fit in memory
- `storage/<bucket>/...`, every file, folder structure preserved
- `manifest.json`, row counts, byte counts and a SHA-256 per table
- `history.log` in the parent, one line per run, so a silent failure is visible
  without opening anything

The last 14 runs are kept. Change with `BACKUP_KEEP`, or the destination with
`BACKUP_DIR`.

**A run that fails any table exits non-zero and marks the manifest `ok: false`.
A backup marked incomplete cannot be restored: `restore.mjs` refuses it.**

## Restoring

Dry run first. Always.

```
npm run restore -- "C:\Users\gfuna\ponte-backups\supabase\<run>"
```

That writes nothing and prints exactly what would be restored. To apply, name
the target project explicitly:

```
npm run restore -- "C:\...\<run>" --confirm cptglsmjmzcfpjndqfmc
```

Four guards, in order:

1. Dry run unless `--confirm` is passed.
2. The project ref you type must match the one the environment points at. This
   is what stops a restore into the wrong project.
3. The backup's own project must match the target. Restoring across projects
   moves member personal data between environments, so it is refused.
4. Rows are upserted by primary key. Existing rows are updated, not
   duplicated, and **nothing is ever deleted**. A restore only adds back what
   the backup holds.

## Test it before you need it

A backup nobody has ever restored is a guess. Once a quarter, run the dry run
against the newest backup and confirm the row counts look like the live
system. It takes a minute.

Last verified: 21 July 2026. 15 tables, 103 rows, 2 files, 36.7 MB. Every
NDJSON parsed and every row count matched the manifest.

## The scheduled task

Registered as **PonteTradeBackup**, daily at 02:00, running as the current
user.

```powershell
Get-ScheduledTask  -TaskName PonteTradeBackup           # confirm it exists
Start-ScheduledTask -TaskName PonteTradeBackup          # run it now
Get-ScheduledTaskInfo -TaskName PonteTradeBackup        # last result, 0 is success
Unregister-ScheduledTask -TaskName PonteTradeBackup     # remove it
```

The task points at the repository path. **If the working copy moves, for
example out of OneDrive, re-register the task** or it will silently stop
backing anything up. Check `history.log` if you are ever unsure.

## Handle these files carefully

A backup contains member personal data: names, companies, emails, and uploaded
documents. It deserves the same care as the database.

- Keep backups **outside** the repository. They are, and `.gitignore` blocks
  them regardless.
- Keep them **out of any cloud synced folder** unless that sync is encrypted.
- Copy them somewhere off this machine. A backup on the same disk as the
  original is not a backup. An external drive or an encrypted archive both
  work.
- Under GDPR this is personal data at rest. If you delete a member's account,
  remember the backups still hold their record until those runs age out.
