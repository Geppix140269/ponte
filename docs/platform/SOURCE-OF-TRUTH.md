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

- **Canonical working copy:** `C:\dev\ponte`
- **Retired:** the two clones above, plus the OneDrive copy (see below). Their
  `origin` push URL has been disabled so they physically cannot publish.
- **Backups:** full history bundles in `C:\Users\gfuna\ponte-backups`, one per
  clone, taken before anything was retired. A bundle restores with
  `git clone <file>.bundle`.

## The OneDrive move, 22 July 2026

The canonical copy lived at `C:\Users\gfuna\OneDrive\Documents\GitHub\ponte`
until 22 July 2026. It was moved to `C:\dev\ponte`, by fresh clone, because
OneDrive was doing real damage:

- Git could not create its own lock files from a Bash shell there, so `git add`
  and `git commit` failed with `Unable to create .git/index.lock`. Native
  PowerShell worked, Bash did not.
- `npm install` and `next build` were extremely slow, because every file write
  was intercepted by the sync client. The measurement that ended the argument:
  `npm run verify` never completed in OneDrive, killed after 25 minutes with
  no output. The same command in `C:\dev\ponte` takes **52 seconds**.
- `.env.local`, holding live production secrets, was uploaded to Microsoft's
  cloud as a side effect. See [SECRETS.md](SECRETS.md).

Nothing was lost, because the source of truth is GitHub. `.env.local` was the
only untracked file worth carrying and it was copied across by hand.

**The OneDrive copy still exists on disk and its push URL is disabled.** Delete
it once you are satisfied the new location is working. Do not re-enable its
remote: a second clone that can push is exactly what caused the July 21
incident described above. Re-point GitHub Desktop at `C:\dev\ponte`.

Bash and PowerShell both work for git in the new location. The PowerShell-only
rule was a OneDrive symptom and no longer applies.

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
