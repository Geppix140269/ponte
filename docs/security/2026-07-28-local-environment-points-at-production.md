# Security — local development runs against production

**Raised:** 28 July 2026, during the production migration reconciliation.
**Severity:** high, on blast radius rather than on exposure.
**Status:** documented. No credential has been changed. Rotation is an owner
action.

---

## 1. What was found

`C:\dev\ponte\.env.local` — the file `next dev` reads — configures the
**production** Supabase project:

| Variable | Points at |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://cptglsmjmzcfpjndqfmc.supabase.co` (production) |
| `SUPABASE_PROJECT_REF` | `cptglsmjmzcfpjndqfmc` (production) |
| `SUPABASE_SERVICE_ROLE_KEY` | production, RLS-bypassing |
| `SUPABASE_ACCESS_TOKEN` | Management API, account-wide |
| `DATABASE_URL` | production Postgres, **with a plaintext password** |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` |

The last row is the tell. The application URL is local; everything it talks to
is production. So `npm run dev` on any developer machine is a live production
client holding a service-role key, which bypasses every RLS policy in the
database.

### Two findings, of different kinds

**(a) There is no development database.** Not "the wrong one is configured" —
there is no separate project to point at. Every local run, every script, every
experiment reads and writes production. The reconciliation work in this same
session had to be careful about this repeatedly: a probe that would be
unremarkable against a dev database had to be wrapped in a rolled-back
transaction because there is nowhere else to run it.

This also makes one already-recorded hazard sharper. `/admin/listings` performs
**writes on a GET**: loading the page runs AI vetting and persists `ai_review`
to listing rows. Opening that page locally writes to production listings.

**(b) A plaintext production database password sits in a working file**, and was
printed to a terminal during this session when a shell tried to `source` the
file and failed on the unquoted URL.

---

## 2. What was checked, and what is not at risk

**The password has never been committed.** Verified two ways:

```bash
git log --all --diff-filter=A -- .env.local        # no results
git log --all -p -S"<the password>" --oneline      # no results across every ref
```

`.env.local` is ignored by `.gitignore:29` (`.env*.local`), and always has been.

**So no history rewrite is required.** That part of the concern is closed: there
is nothing in the repository to purge, and running a history-rewrite tool would
be disruptive work against a clean history.

---

## 3. Rotation

**Recommended, and the reason is narrow.**

The password is not in git and not in any artefact this repository publishes.
But it was printed in cleartext to a terminal during this session, and terminal
output can reach scrollback, a shell history file, a session transcript or a log
aggregator. Exposure to those cannot be positively ruled out from here, and
"cannot be ruled out" is the standard that should trigger rotation for a
production database credential.

Rotating also costs almost nothing here, because of a fact already recorded in
`docs/codex/DATABASE-STATE.md`: **`DATABASE_URL` does not currently work.**
`scripts/apply-migration.mjs` fails against it with
`FATAL 28P01, password authentication failed`, which is why every migration is
applied through `scripts/db-query.mjs` and the Management API instead. Nothing
in the working toolchain depends on that password today.

Also worth rotating on the same pass, and higher-value than the database
password: `SUPABASE_ACCESS_TOKEN` is an **account-wide Management API token**.
It can read and modify every project the owner can reach, which this session
confirmed is four, not one. It is the most powerful secret in the file.

**Owner actions, in order:**

1. Supabase dashboard → Settings → Database → reset the database password.
2. Supabase dashboard → Account → Access Tokens → revoke and reissue
   `SUPABASE_ACCESS_TOKEN`.
3. Update `.env.local` and any Netlify environment variable that carries either.
4. Consider whether `SUPABASE_SERVICE_ROLE_KEY` should also be rotated. It has
   not been observed exposed, but it is the key that makes a local dev server a
   privileged production client.

---

## 4. Separating development from production

The real fix is not a rotated password. It is that a developer should be unable
to reach production by accident.

### Recommended: a second Supabase project

Create `ponte-dev` and point `.env.local` at it. `.env.production.local`, or
Netlify's environment, carries production. The cost is one free-tier project and
seeding it, and the seed is a solved problem once the baseline workstream
(`docs/proposals/production-baseline-workstream.md`) produces a schema the
repository can actually build.

Until that exists, the two are coupled: **there is no dev database to point at
because the repository cannot create one.** That is the strongest practical
argument for approving Phase 1 of the baseline proposal.

### Immediately available, without a second project

A guard that refuses to start a dev server against production, and makes the
override explicit:

```js
// next.config.mjs, or a preflight in the dev script
const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const isProd = url.includes("cptglsmjmzcfpjndqfmc");
const allowed = process.env.PONTE_ALLOW_PRODUCTION_DB === "i-understand";

if (process.env.NODE_ENV !== "production" && isProd && !allowed) {
  throw new Error(
    "Refusing to start: NEXT_PUBLIC_SUPABASE_URL points at the production " +
    "project. Point it at a development project, or set " +
    "PONTE_ALLOW_PRODUCTION_DB=i-understand to override deliberately.",
  );
}
```

This is not a substitute for a dev database. It converts a silent default into a
deliberate act, which is the whole of the improvement available before one
exists.

### Fix the file itself

`.env.local` contains an unquoted `DATABASE_URL`, which is why `source` broke on
it and printed the password. Quote it:

```
DATABASE_URL="postgresql://postgres:...@db.<ref>.supabase.co:5432/postgres"
```

The file also carries a UTF-8 BOM, which is the second reason shell sourcing
fails on line 1.

---

## 5. Not done here

- No credential rotated, revoked or changed.
- No production configuration altered.
- No git history rewritten; none needs to be.
- The `next.config.mjs` guard above is a proposal, not applied, because it
  changes how every developer's dev server starts and that should be a decision
  rather than a surprise.
