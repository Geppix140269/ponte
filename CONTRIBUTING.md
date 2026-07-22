# How changes reach ponte.trade

## The one rule

**One repository, one branch, one deploy path.** `main` on
`github.com/Geppix140269/ponte` is the only real copy, and Vercel deploys from
it. The failure this project actually had was three stale clones on one machine
each pushing a different version of the site, so the live site served three eras
at once. The fix is that only one working copy can publish, not that changes
have to take a slow route.

## Change control

By the owner's decision, work commits straight to `main` and deploys. There is
no branch and pull request step.

1. Commit to `main`.
2. Push. Vercel builds and deploys.
3. Update the matching file in `docs/platform` in the same commit.

Before pushing anything substantial, run the same gates CI runs:

```
npm run verify        # locale validation, typecheck, production build
```

A failed Vercel build does not take the site down: the last successful
deployment keeps serving. A broken push costs a deploy, not an outage.

CI still runs on every push to `main`, so a break is reported rather than
discovered later. The pre-commit hook still refuses secrets, env files and
stray working files, because those cannot be undone once they are in history.

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

## Where the working copy lives

`C:\dev\ponte`. It was moved out of OneDrive on 22 July 2026, which removed
the `.git/index.lock` failures and took `npm run verify` from not finishing at
all to 52 seconds. If you are in an OneDrive folder, you are in a retired
clone that cannot push. See
[docs/platform/SOURCE-OF-TRUTH.md](docs/platform/SOURCE-OF-TRUTH.md).
