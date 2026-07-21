# Source of truth

## The rule

**`main` on `github.com/Geppix140269/ponte` is the only real copy of Ponte
Trade.** Everything on any laptop is a working copy. Everything in a backup
folder is a snapshot. If it is not on `main`, it does not exist.

## Why this document exists

On 21 July 2026 the live site was serving pages from three different eras of
the product at once. The cause was found: **three separate clones on the same
machine, each frozen at a different point in time, and all three configured to
push to the same GitHub repository.**

| Clone | Last commit | Era |
|---|---|---|
| `OneDrive\Documents\GitHub\ponte` | 21 Jul 2026 | Current marketplace |
| `C:\Users\gfuna\ponte` | 22 May 2026 | Report shop |
| `C:\Users\gfuna\GitHub\ponte` | Jun 2026 | Advisory |

Whichever one was open at the time pushed its version of reality. That is how a
retired shop page and a current marketplace page ended up live together.

## Current state

- **Canonical working copy:** `C:\Users\gfuna\OneDrive\Documents\GitHub\ponte`
- **Retired:** the two clones above. Their `origin` push URL has been disabled
  so they physically cannot publish, and they are renamed so they are not
  opened by accident.
- **Backups:** full history bundles in `C:\Users\gfuna\ponte-backups`, one per
  clone, taken before anything was retired. A bundle restores with
  `git clone <file>.bundle`.

## Known problem with the current location

The canonical working copy is inside OneDrive. That causes real damage:

- Git cannot create its own lock files from a Bash shell there, so `git add`
  and `git commit` fail with `Unable to create .git/index.lock`. Native
  PowerShell works, Bash does not.
- `npm install` and `next build` are extremely slow, because every file write
  is intercepted by the sync client.
- `.env.local`, holding live production secrets, is uploaded to Microsoft's
  cloud as a side effect. See [SECRETS.md](SECRETS.md).

**Recommendation:** move the working copy out of OneDrive, for example to
`C:\Users\gfuna\Dev\ponte`, and re-point GitHub Desktop at the new location.
Nothing is lost, because the source of truth is GitHub. OneDrive is not needed
as a backup for source code: that is what the remote is for.

## Adding a machine or a person

Clone from GitHub. Never copy a working folder from one machine to another, and
never restore a clone from a backup and keep using it. A copied folder becomes
a fourth era within a week.

```
git clone https://github.com/Geppix140269/ponte.git
cd ponte
npm install
copy .env.example .env.local   # then fill values from the password manager
```
