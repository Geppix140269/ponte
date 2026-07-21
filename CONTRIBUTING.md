# How changes reach ponte.trade

## The one rule

**Nothing reaches `main` except through a pull request that passed CI.**

That single rule is what prevents the failure this project actually had, where
three stale clones on one machine each pushed a different version of the site
and the live site served three eras at once.

## Change control

1. Work on a branch. Never commit to `main`.
2. Open a pull request. CI must be green: build, typecheck, locale validation,
   no committed secrets, no committed env or stray files.
3. Merge. The host deploys from `main` automatically.
4. Update the matching file in `docs/platform` in the same pull request.

## About "only Claude Code may change the code"

Worth being precise, because the difference matters for your safety.

**What is not achievable:** there is no switch that makes one tool the only
thing able to edit a git repository. Anyone with write access, using any
editor, on any machine, can commit. A rule that claims otherwise gives false
confidence, and false confidence is worse than a known gap. It would also mean
that if the tool were unavailable, nobody could fix a production incident.

**What is achievable, and is what has been set up:**

- **CI gates every merge.** A change that does not build, breaks a locale, or
  carries a secret cannot land, no matter what produced it.
- **`main` is protected.** Direct pushes are refused, so a stale clone
  physically cannot publish. This is the actual fix for the three eras problem.
  Enable it under Settings, Branches, on GitHub.
- **Retired clones cannot push.** Their remote URL has been disabled.
- **Local hooks catch mistakes before they are committed.** Run
  `npm install` once and the hooks install themselves.
- **Review is required.** See `.github/CODEOWNERS`.

The practical result is the one you want: changes arrive one way, through a
reviewed pull request that had to pass the same checks every time. The
enforcement is on the path, not on the tool, which is what makes it hold even
when a person is in a hurry.

## Local setup

```
git clone https://github.com/Geppix140269/ponte.git
cd ponte
npm install                    # also installs the git hooks
copy .env.example .env.local   # fill from the password manager, never from a chat
```

## Working in this repository

- Never commit a real credential. Not once, not temporarily. Git history is
  permanent, and the repository is cloned and backed up.
- Messages: edit `messages/_fragments/<namespace>.json`, then run
  `node scripts/build-messages.mjs`. Do not hand edit `messages/en.json`.
- Migrations are additive. No destructive change to a table holding real data.
- No em dashes in any copy, in any language. Use commas, colons or full stops.
- Keep untranslated: Ponte, Ponte AI, NCNDA, incoterms, unit codes, prices,
  listing references, HS codes, and the legal entity names and numbers.

## If the working copy is still inside OneDrive

Use PowerShell for git and for `npm install`. A Bash shell cannot create files
there, so every git write fails on `.git/index.lock`. See
[docs/platform/RUNBOOK.md](docs/platform/RUNBOOK.md). Moving the working copy
out of OneDrive removes the problem entirely and is recommended.
