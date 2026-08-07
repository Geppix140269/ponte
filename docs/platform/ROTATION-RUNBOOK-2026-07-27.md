# Secret hygiene actions — 27 July 2026

## Owner decision

**Giuseppe decided on 27 July 2026 that no API key will be rotated.** The
existing values stay in place. This was an explicit owner call made with the
exposure history in front of him. It is recorded here so it reads as a decision
and not as an oversight, and so no future session reopens it.

What is still being done: removal of the stale copies, two factor authentication
on the accounts that matter, and correcting the secrets inventory.

---

## Context, for the record

`.env.local` sat inside OneDrive until 22 July 2026. Every populated value in it
was uploaded to Microsoft and is retained in that account's version history and
recycle bin. Moving the repo to `C:\dev\ponte` stopped new writes syncing.

The inventory in `SECRETS.md` was incomplete. The real populated secret list is
ten, and three were missing from the record: `DATABASE_URL` (holds the Postgres
password), `COMPANIES_HOUSE_API_KEY`, and `SANCTIONS_REFRESH_SECRET`. Those
three have been added to the inventory.

Read by key name and value length only. No value was read or handled.

---

## Phase 3 — remove the stale copies

Run in **PowerShell as your normal user**. Backups of all three retired clones
already exist as git bundles in `C:\Users\gfuna\ponte-backups`, so nothing here
is unrecoverable.

```powershell
# 1. The OneDrive clone. Still present as of 27 July, still syncing.
Remove-Item -LiteralPath "C:\Users\gfuna\OneDrive\Documents\GitHub\ponte" -Recurse -Force

# 2. The second retired clone. Holds its own .env.local with 18 populated keys.
Remove-Item -LiteralPath "C:\Users\gfuna\GitHub\ponte" -Recurse -Force

# 3. The Supabase personal access token sitting in plain text.
Remove-Item -LiteralPath "C:\Users\gfuna\supabase_pat.txt" -Force

# 4. Third retired clone, if it still exists.
Remove-Item -LiteralPath "C:\Users\gfuna\ponte" -Recurse -Force -ErrorAction SilentlyContinue

# 5. Confirm nothing is left.
Get-ChildItem -Path "C:\Users\gfuna" -Filter ".env*" -Recurse -Force -ErrorAction SilentlyContinue |
  Select-Object FullName, LastWriteTime
```

The last command should return nothing outside `C:\dev\ponte`. If it returns a
path under OneDrive, that copy is still syncing.

### Then clear the cloud side

Deleting the local folder does not remove the cloud copy. Both of these are
browser steps, they cannot be scripted.

1. **OneDrive recycle bin** — onedrive.live.com → Recycle bin → Empty recycle
   bin. Then check the second-stage recycle bin at the bottom of that same page
   and empty it too.
2. **Version history** — for any file OneDrive still shows under
   `Documents/GitHub/ponte`, open the item menu and choose Version history, then
   delete prior versions. If the folder is fully gone from the recycle bin this
   step is already done.

---

## Phase 4 — two factor authentication

Four accounts where a takeover ends the business rather than inconveniencing it.
Turn 2FA on for each, using an authenticator app rather than SMS.

| Account | Where |
|---|---|
| GitHub | github.com → Settings → Password and authentication |
| Domain registrar (ponte.trade) | registrar account security settings |
| Stripe | dashboard.stripe.com → Settings → Team and security |
| Supabase | supabase.com → Account settings → Security |

Add Resend as a fifth if it offers it. That is the account that can send mail as
your domain.

Save the recovery codes for all four into the password manager at the time you
enable each one. Recovery codes are the part everyone skips and then needs.

---

## Phase 5 — correct the record

Done in this session:

- `docs/platform/SECRETS.md` inventory corrected. `DATABASE_URL`,
  `COMPANIES_HOUSE_API_KEY` and `SANCTIONS_REFRESH_SECRET` added.
- Open action 4, "rotate the high blast radius keys", closed as a deliberate
  owner decision rather than left hanging as an unmet action.
- Open actions 1 to 3 remain open until the Phase 3 deletions are run.

Once Phase 3 and Phase 4 are done, mark actions 1, 2, 3 and 5 complete in
`SECRETS.md` and this file can be archived.
