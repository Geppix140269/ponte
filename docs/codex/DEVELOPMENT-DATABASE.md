# The development database, and how to open a signed-in page

**Issue #84.** Written 2 August 2026.

Until this existed there was no development database. No database meant no
session, and no session meant that **every signed-in page in the product was
unreachable and unverifiable**. Everything anyone ever verified was the
signed-out half.

---

## Two commands

```bash
npm run dev:db      # start the local Supabase stack, migrate, seed
npm run dev:local   # run the app against it
```

Then sign in at <http://localhost:3000/login>:

| | |
| --- | --- |
| email | `dev@ponte.local` |
| password | `ponte-dev-password` |

These are not secrets. The account exists only in a database that lives on one
machine and is destroyed by `npm run dev:db -- reset`.

### One-off prerequisite

`dev:db` needs Docker. From an **administrator** PowerShell, once:

```
wsl --install
winget install -e --id Docker.DockerDesktop
```

Reboot, start Docker Desktop, wait for "Running". `npm run dev:db` says all of
this itself if Docker is missing, so nobody has to find this page first.

---

## What you get

| Surface | Where |
| --- | --- |
| Supabase API | <http://127.0.0.1:54321> |
| Studio, to look at the data | <http://localhost:54323> |
| Inbucket, where **every** dev email lands | <http://localhost:54324> |
| Postgres | `postgresql://postgres:postgres@127.0.0.1:54322/postgres` |

Inbucket matters more than it looks. Ponte's transactional email is a launch
surface and it has never been openable locally; every message the app sends now
arrives there, in full, with its HTML.

### The seeded records

Five listings on the test account, one per journey and one deliberate landmine:

| Record | Why it is there |
| --- | --- |
| Olive oil, supply | products, offer |
| Cane sugar, requirement | products, source |
| Freight forwarding | services, which asks different questions |
| Distribution partner sought | distribution, which asks different ones again |
| **A record with `market_family = 'goods'`** | **The shape that crashed `/deal-rooms/propose`** |

The last one is the point. A fixture set of only well-formed rows is a fixture
set that agrees with your assumptions. An unrecognised family is what a real
database contains after two taxonomy changes, and it is what took a working day
to find on 2 August 2026.

---

## Nothing here can reach production

Stated precisely, because the value of a development database is exactly the
confidence that it is not the other one.

1. **The stack is loopback only.** `supabase link` is never run, so the CLI
   holds no project reference.
2. **`scripts/seed-dev.mjs` refuses to write** unless the Supabase URL is a
   loopback address. There is no override flag, deliberately: a seeder that can
   be pointed at production by an environment variable is one typo from being an
   incident, and this one creates users.
3. **`dev:local` reads its connection from the running stack, not from
   `.env.local`.** That file points at production. A runner that inherited it
   would quietly develop against real member data.
4. **`supabase/config.toml` does not load `supabase/seed.sql`.** That file is
   auto-generated shop-era catalogue data from a retired generation.

The keys the stack prints are the Supabase CLI's fixed development keys,
identical on every machine in the world. They are not secrets.

---

## Signed-in browsing, for a person or for Playwright

**By hand:** `npm run dev:local`, then sign in with the credentials above. Every
signed-in surface then opens: `/opportunities`, `/deal-rooms`,
`/deal-rooms/propose`, `/workspace`, `/account`.

**In Playwright:** sign in once and reuse the session.

```ts
// e2e/support/signed-in.ts
import { test as base } from "@playwright/test";

export const test = base.extend({
  storageState: async ({ browser }, use) => {
    const page = await browser.newPage();
    await page.goto("/en/login");
    await page.getByLabel(/email/i).fill("dev@ponte.local");
    await page.getByLabel(/password/i).fill("ponte-dev-password");
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForURL(/\/(en\/)?(opportunities|workspace)/);
    const state = await page.context().storageState();
    await page.close();
    await use(state);
  },
});
```

The site gate is separate and still applies:
`test.use({ httpCredentials: { username: "ponte", password: process.env.PONTE_SITE_PASSWORD } })`.

---

## Which runner to use

| Command | Database | Use it for |
| --- | --- | --- |
| `npm run dev:local` | the local stack, real data | **anything signed in.** The default. |
| `npm run dev:audit` | a synthetic ref with no project | empty and error states, and only those |
| `npm run dev` | whatever `.env.local` says | almost never; the guard exists for a reason |

`dev:audit` is not obsolete. It is the only way to see what a member sees when
a source cannot be read, and that is a real state with real copy. It is no
longer the *only* thing that can be run, which is the whole change.

---

## If the migrations do not apply

`dev:db` runs `supabase db reset`, which replays `supabase/migrations` against
an empty database. If that fails, **it is a finding, not a setup problem**: it
means the repository cannot rebuild its own schema from nothing.

Record which migration failed. It is direct evidence for the WO-2
reconciliation and for issues #48 and #49.
