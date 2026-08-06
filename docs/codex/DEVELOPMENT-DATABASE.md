# The development database, and how to open a signed-in page

**Issue #84.** Written 2 August 2026.

Until this existed there was no development database. No database meant no
session, and no session meant that **every signed-in page in the product was
unreachable and unverifiable**. Everything anyone ever verified was the
signed-out half.

---

## Three commands

```bash
npm run dev:db      # start the local stack, restore the schema, seed the account
npm run dev:local   # run the app against it
npm run dev:code    # the six-digit sign-in code
```

Then sign in at <http://localhost:3000/login> as **`dev@ponte.local`**, and run
`npm run dev:code` for the code.

**There is no password.** Ponte authenticates by email OTP and has no password
field anywhere in the product. An earlier version of this page listed one,
which was a ten-minute detour for everybody who tried it.

Nothing here is a secret. The account exists only in a database that lives on
one machine and is destroyed by `npm run dev:db -- reset`.

### One-off prerequisite

`dev:db` needs Docker. From an **administrator** PowerShell, once:

```
wsl --install
winget install -e --id Docker.DockerDesktop
```

Reboot, start Docker Desktop, wait for "Running". `npm run dev:db` says all of
this itself if Docker is missing, so nobody has to find this page first.

---

## Where the schema comes from, and why it is not the migrations

**`supabase/schema-snapshots/production-public-20260801.sql`.** A schema-only
dump of production's `public` schema, restored into an empty local database
exactly as CI's `deal-room-migration-replay.yml` phase 0 has done since PR #203.

It is not built from `supabase/migrations/`, because that does not work:

```
45 of 55 migrations skipped: filename pattern mismatch
failed:  01_catalogue_fields.sql
error:   relation "products" does not exist
```

That is **FINDING-01** of the WO-2 reconciliation, severity SEVERE. The CLI
reads a version from the characters before the first underscore and requires
them to be digits, so most of the history is silently ignored; and what remains
is not self-contained, because it begins by altering tables no migration
creates. The WO-2 report of 2 August confirms it from production's own
catalogue: the applied lineage is sound — 52 of 53 files checksum-match the
repository — but there is **no genesis**, and the repository cannot rebuild the
schema from nothing.

`[db.migrations] enabled = false` in `supabase/config.toml` turns off the CLI's
replay so the stack cannot pretend otherwise. **Nothing renames or edits a
migration.** The remedy for FINDING-01 belongs to the reconciliation, not to the
development loop.

`npm run dev:db` prints the baseline it restored, the number of files the CLI
would not read, and the fact that the history is still unresolved — every run.

### A migration you write today

Applied automatically. Anything whose filename sorts after the snapshot's date
is applied on top of the baseline, one file at a time, by `dev:db` itself rather
than by the CLI — which is what sidesteps the filename-pattern trap without
renaming anything. If it fails, `dev:db` fails and names the file. That is worth
knowing before it reaches production, and it is free here.

---

## What you get

| Surface | Where |
| --- | --- |
| Supabase API | <http://127.0.0.1:54321> |
| Studio, to look at the data | <http://localhost:54323> |
| Mailpit, where **every** dev email lands | <http://localhost:54324> |
| Postgres | `postgresql://postgres:postgres@127.0.0.1:54322/postgres` |

Mailpit matters more than it looks. Ponte's transactional email is a launch
surface and it has never been openable locally; every message the app sends now
arrives there, in full, with its HTML. The sign-in email is the repository's own
`supabase/templates/auth-otp.html`, wired up in `config.toml`, not a Supabase
default — so what you read locally is the file under review.

### The seeded records

Five listings on the test account, one per journey and one deliberately
incomplete:

| Record | Why it is there |
| --- | --- |
| Olive oil, supply | products, offer |
| Cane sugar, requirement | products, source |
| Freight forwarding | services, which asks different questions |
| Distribution partner sought | distribution, which asks different ones again |
| **A record with no `market_family`** | **Opening a Deal Room from it must refuse, and say why** |

The last one is the point. A fixture set of only well-formed rows is a fixture
set that agrees with your assumptions.

It used to carry `market_family = 'goods'` — the unrecognised family that
crashed `/deal-rooms/propose`. Restoring production's real schema showed that
row can never exist:

```sql
listings_market_family_check
  CHECK (market_family IS NULL
         OR market_family IN ('products','services','distribution'))
```

The constraint is validated, so no production row violates it either, and the
WO-2 report confirms the same CHECK on `deal_rooms`. The defensive
`unknown_family` branch in `lib/deal-room/interest.ts` stays — it guards a cast,
and a cast is a claim rather than a check — but the fixture now reproduces the
failure that can actually happen: a NULL family, which the column permits.

### Storage

All seven production buckets are created, with production's own public flags,
size limits and MIME types, taken from the WO-2 export of 2 August.

**Not the policies on `storage.objects`.** They are not in that export and are
not reconstructed, so an upload succeeds through the service role and is
unauthorised for anyone else. `dev:db` says so on every run.

This gap is stated rather than filled because filling it from the migrations was
tried and was wrong in the dangerous direction.
`supabase/migrations/20260729c_deal_room_storage.sql` declares itself
**NOT APPLIED**, so the first version of this work deliberately did not create
`deal-room-evidence`, reasoning that development must never claim a capability
production lacks. Production has that bucket. The header was stale and the
caution was backwards. Prefer the production-derived artefact.

---

## Nothing here can reach production

Stated precisely, because the value of a development database is exactly the
confidence that it is not the other one.

1. **The stack is loopback only.** `supabase link` is never run, so the CLI
   holds no project reference. Pinned by test.
2. **`scripts/seed-dev.mjs` refuses to write** unless the Supabase URL is a
   loopback address. There is no override flag, deliberately: a seeder that can
   be pointed at production by an environment variable is one typo from being an
   incident, and this one creates users.
3. **Every statement runs inside the local Docker container**, through
   `docker exec … psql`. No connection string is held by anything.
4. **`dev:local` reads its connection from the running stack, not from
   `.env.local`.** That file points at production. A runner that inherited it
   would quietly develop against real member data.
5. **`supabase/config.toml` does not load `supabase/seed.sql`.** That file is
   auto-generated shop-era catalogue data from a retired generation.

The keys the stack prints are the Supabase CLI's fixed development keys,
identical on every machine in the world. They are not secrets.

---

## The site gate is off on loopback, in development only

`middleware.ts` challenges every request with Basic auth while Ponte is private.
It does not apply to a `next dev` server addressed as `localhost` or `127.0.0.1`,
because a gate cannot hide a server that is only listening on this machine — and
challenging one meant a 401 on every local page, which defeats the entire point
of a seeded account.

Both conditions are required and neither is sufficient alone:

- `NODE_ENV === "development"`, set by `next dev` and by nothing else.
  `next build`, `next start`, CI's Playwright server and every Vercel deployment
  run as `production` and are **unaffected**.
- a loopback **`Host` header**. A dev server bound to `0.0.0.0` and reached
  across the network is still challenged.

Verified: `curl -H 'Host: ponte.trade' http://localhost:3000/login` → 401.

---

## Signed-in browsing, for a person or for Playwright

**By hand:** `npm run dev:local`, then sign in as above. Every signed-in surface
opens: `/opportunities`, `/deal-rooms`, `/deal-rooms/propose`, `/workspace`,
`/account`.

**In Playwright:** sign in once and reuse the session. The code has to come from
Mailpit, because it is genuinely emailed — the Supabase CLI has no fixed-code
option for email (`[auth.email.test_otp]` is rejected as an invalid key; only
the SMS one exists).

```ts
// e2e/support/signed-in.ts
import { test as base } from "@playwright/test";

const MAILPIT = "http://127.0.0.1:54324";

export const test = base.extend({
  storageState: async ({ browser }, use) => {
    const page = await browser.newPage();
    await page.goto("/en/login");
    await page.getByPlaceholder("you@company.com").fill("dev@ponte.local");
    await page.getByRole("button", { name: /email me a code/i }).click();

    // The newest message is the only valid code: each request invalidates the
    // last. Poll, because the mail is delivered asynchronously.
    const code = await expect
      .poll(async () => {
        const list = await (await fetch(`${MAILPIT}/api/v1/messages?limit=1`)).json();
        if (!list.messages?.length) return null;
        const body = await (await fetch(`${MAILPIT}/api/v1/message/${list.messages[0].ID}`)).json();
        return `${body.Text ?? ""}${body.HTML ?? ""}`.match(/\b(\d{6})\b/)?.[1] ?? null;
      })
      .toMatch(/^\d{6}$/);

    await page.getByLabel("Digit 1").fill(code);
    await page.waitForURL(/\/(en\/)?(opportunities|workspace)/);
    const state = await page.context().storageState();
    await page.close();
    await use(state);
  },
});
```

The site gate does not apply to `next dev` on loopback. It **does** apply to a
built server, which is what CI runs, so evidence specs still need
`test.use({ httpCredentials: { username: "ponte", password: process.env.PONTE_SITE_PASSWORD } })`.

---

## Which runner to use

| Command | Database | Use it for |
| --- | --- | --- |
| `npm run dev:local` | the local stack, real data | **anything signed in.** The default. |
| `npm run dev:audit` | a synthetic ref with no project | empty and error states, and only those |
| `npm run dev` | whatever `.env.local` says | almost never; the guard exists for a reason |

`dev:audit` is not obsolete. It is the only way to see what a member sees when a
source cannot be read, and that is a real state with real copy. It is no longer
the *only* thing that can be run, which is the whole change.

---

## What this does not do

**It is not a staging environment.** The WO-2 report records that `DECISION-20`
step 4 — a rehearsal with demonstrated rollback before any production migration
— cannot be satisfied today, because no environment can be built from the
repository.

This narrows that gap and does not close it. What now exists is a repeatable way
to stand up **production's schema** from committed bytes, on demand, with no
credential. What is still missing for a rehearsal is data, and a rehearsed
rollback. Whether this mechanism is the basis of a staging environment is an
owner decision under `DECISION-20`, not a claim this page makes.
