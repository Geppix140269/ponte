# Netlify to Vercel

Started 22 July 2026. **Status: repository ready, not yet cut over.**
`ponte.trade` still resolves to Netlify until step 6 below.

## Why the code needed almost nothing

The platform was never coupled to Netlify. There is no `_headers` or
`_redirects` file, no Netlify Function, no build plugin beyond the framework
one, and no code that branches on a Netlify environment variable. Four things
were checked rather than assumed, and all four hold:

| Concern | Finding |
|---|---|
| Edge middleware ordering | Middleware runs ahead of the origin on both hosts, so the 308 legacy redirects in `middleware.ts` keep working and stay the single authority |
| Client IP | Vercel populates `x-forwarded-for` with the real IP first, the same shape Netlify used, so `lib/rate-limit.ts` is unchanged |
| Image optimisation | No `next/image` anywhere in the codebase, so there is nothing to port |
| Scheduled work | The nightly sanctions refresh runs on a GitHub Actions runner and never touched the host |

The repository changes were `netlify.toml` out, `vercel.json` in, a Node
version pin, and documentation.

## Two things that now behave differently

**`maxDuration` starts working.** `/api/verification` and
`/api/verification/select` both declare `maxDuration = 120`. On Netlify that
export was inert, so those routes ran under the platform default and a slow
registry lookup was cut off early. On Vercel the number takes effect, which
means behaviour changes without any code changing. **120 seconds requires a Pro
plan.** On Hobby the ceiling is 60 and the deployment is rejected or clamped,
so confirm the plan before the first deploy rather than after.

**Environment variables no longer trigger a rebuild.** Netlify redeployed when
you saved a variable. Vercel does not: the running deployment keeps the old
values until something else causes a deploy. After every env change, redeploy
by hand. This is the single most likely cause of "I set it and nothing
happened".

## Environment variables

The authoritative list is what the code reads, not `.env.example`, which had
drifted. Six variables in use were missing from it on 22 July 2026 and have
been added.

### Set these in the Vercel project

Tick Production, Preview and Development unless noted. `NEXT_PUBLIC_` values
are compiled into the browser bundle at build time, so they must be present
before the build, not just at runtime.

**Public, inlined at build time**

`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_GOOGLE_CLIENT_ID`,
`NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_AI_PAYMENT_LINK`

`NEXT_PUBLIC_APP_URL` is the one to get wrong. On a preview deployment it must
be that deployment's own URL. Leave it as `https://ponte.trade` and the preview
will mint links and emails pointing at the old host, so a broken preview looks
healthy and a healthy one looks broken.

**Server side**

`SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`, `STRIPE_SECRET_KEY`,
`STRIPE_WEBHOOK_SECRET`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`,
`ADMIN_ALERT_EMAIL`, `DEALS_TO_EMAIL`, `ANTHROPIC_API_KEY`,
`SANCTIONS_REFRESH_SECRET`, `DATASOURCE_CONTACT_EMAIL`

**Optional, each degrades a feature rather than breaking the build**

`AI_VET_MODEL`, `COMPANIES_HOUSE_API_KEY`, `OPENCORPORATES_API_KEY`,
`FREECURRENCYAPI_KEY`, `WTO_API_KEY`, `SAM_GOV_API_KEY`,
`DATA_OPENSANCTIONS_ENABLED`, `OPENSANCTIONS_API_KEY`, `FIRMS_MAP_KEY`,
`AISSTREAM_API_KEY`, `ECONDB_API_KEY`, `GFW_API_TOKEN`, `OPENAQ_API_KEY`,
`COPERNICUS_CLIENT_ID`, `COPERNICUS_CLIENT_SECRET`

**Easy to lose, because losing them is silent**

`TELEGRAM_BOT_TOKEN` and `TELEGRAM_OPS_CHAT_ID`. With either missing,
`lib/telegram.ts` is a deliberate no-op: no error, no log, no alert. The only
symptom is that brokerage submissions stop pinging ops and nobody is told. Set
both, then post a real submission and confirm the ping arrives.

`BOARD_MIN_LISTINGS` and `DESK_RADAR_PUBLIC` are feature flags. Both have
defaults that hide things, so forgetting them makes the site quietly emptier
rather than broken.

### Never set these in Vercel

`DATABASE_URL`, `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_REF`.

Nothing the site serves reads them. They belong to scripts run from a
developer machine. `DATABASE_URL` is a direct Postgres connection and the
access token is account level rather than project level, so it reaches every
Supabase project on the account. Putting either in the hosting dashboard would
hand that reach to every function the site runs, for no gain.

`OPENAI_API_KEY` is not needed either. No shipped code has read it since the
vetting co-pilot moved to Anthropic. Revoke it rather than migrating it.

## Secret rotation, and the trap in it

Eighteen keys sat in `.env.local` inside a OneDrive synced folder until
22 July 2026 and must be treated as exposed. See `SECRETS.md`. The migration is
the natural moment to replace them, but the obvious order is wrong.

**The trap.** Netlify is the rollback plan, and Netlify holds copies of those
keys. Revoke an old key and Netlify's copy dies with it, so production breaks
the moment you roll back to it. Rotating before cutover therefore destroys the
very thing that makes cutover safe.

**The way through** is to issue a second credential rather than replacing one,
wherever the provider allows two to be live at once:

| Credential | Two live at once? | Plan |
|---|---|---|
| `STRIPE_SECRET_KEY` | Yes | New key for Vercel. Revoke the old at decommission. |
| `STRIPE_WEBHOOK_SECRET` | Yes, per endpoint | Second endpoint for Vercel, its own signing secret. |
| `RESEND_API_KEY` | Yes | New key for Vercel. Revoke the old at decommission. |
| `ANTHROPIC_API_KEY` | Yes | New key for Vercel. Revoke the old at decommission. |
| `COMPANIES_HOUSE_API_KEY` | Yes | New key for Vercel. |
| `SANCTIONS_REFRESH_SECRET` | Ours to choose | Generate a new one, set it on both hosts at the same time. |
| `SUPABASE_SERVICE_ROLE_KEY` | **Check first** | Legacy JWT keys are single valued: rotating the JWT secret invalidates the anon key too **and signs out every logged-in member**. Newer projects have secret keys that roll independently. Confirm which this project uses before touching it, and do it last, after Netlify is gone. |
| `DATABASE_URL` password | No | Single Postgres password. Local only, so it does not affect either host. Rotate whenever. |
| `SUPABASE_ACCESS_TOKEN` | Yes, multiple PATs | Local only. Revoke the old one now. |
| `OPENAI_API_KEY` | n/a | Unused. Revoke, do not replace. |

Public by design and needing no rotation: `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_GOOGLE_CLIENT_ID`.

**Three places hold secrets, not two.** Vercel, Netlify until it is
decommissioned, and GitHub Actions, which needs `SUPABASE_URL`,
`SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`, `RESEND_API_KEY`,
`RESEND_FROM_EMAIL` and `ADMIN_ALERT_EMAIL` for the nightly refresh. Miss the
third and the site stays green while sanctions screening runs against a stale
list, which is the worst of the three failures because nothing reports it.

## Callback URLs

A DNS-only cutover keeps `https://ponte.trade`, so Stripe, Supabase Auth and
Google OAuth need **no change at cutover**. They do need temporary additions to
test anything on a preview URL, because a preview is a different origin:

- **Supabase Auth**, Redirect URLs: add the preview origin, or sign in fails on
  the preview and looks like a migration fault when it is an allow list.
- **Google OAuth**, Authorized redirect URIs: same.
- **Stripe webhooks**: a preview cannot receive the production webhook. To test
  credit purchase end to end, add a second endpoint pointing at the preview and
  give the preview its own `STRIPE_WEBHOOK_SECRET`. Delete that endpoint
  afterwards.

Remove every temporary entry once cutover is signed off. A stale redirect URI
pointing at a deployment nobody watches is a real hole.

## Function region

Not pinned, deliberately. Vercel defaults to US East, which is where Netlify
was also running the app, so today's latency to Supabase is carried over
unchanged and the move alters hosting without also altering performance.

If the Supabase project turns out to be in Europe, pinning
`"regions": ["fra1"]` in `vercel.json` is a one line win, and if it is in the
US it would be a loss. Check the region in the Supabase dashboard, then decide
as a separate change with its own before and after measurement.

## Node version

Pinned to 22 in `package.json` `engines` and in the CI workflow.

Unpinned, CI validated on Node 20 while Vercel built new projects on whatever
it currently defaults to, and that gap is exactly how a green CI ships a broken
deploy. Node 20 also reached end of life in April 2026, and GitHub had already
started warning about it for `actions/checkout@v4`, so pinning back to it would
have meant pinning to a dead runtime. Both now say 22, which is also the
version on the development machine.

## Cutover

1. Confirm the plan is Pro, or lower the two `maxDuration = 120` exports.
2. Create the Vercel project against `Geppix140269/ponte`, production branch
   `main`. Set the environment variables above.
3. Deploy. Nothing points at it yet.
4. Verify on the preview URL, with the checks in the next section.
5. Set the new secrets on **both** hosts where a second key was issued, so
   Netlify is still a working rollback.
6. Add `ponte.trade` and `www.ponte.trade` in Vercel, then change the records at
   the registrar. Lower the TTL a day beforehand so a rollback propagates in
   minutes rather than hours.
7. Watch. Netlify stays untouched and remains the rollback.
8. Sign off, then decommission: revoke the old keys, delete the Netlify site,
   remove the temporary callback URLs, and close this document.

## Verify a deploy

Beyond the standard checks in `RUNBOOK.md`, these are the ones specific to
having changed host:

```
curl -sI https://ponte.trade/cart           | findstr /i "HTTP location"
curl -sI https://ponte.trade/es/cart        | findstr /i "HTTP location"
curl -sI https://ponte.trade/manifest.webmanifest | findstr /i "HTTP"
curl -sI https://ponte.trade/sw.js          | findstr /i "HTTP"
```

`/cart` and `/es/cart` must return 308, to their English and Spanish targets
respectively. That proves middleware still runs ahead of the origin, which is
the one Netlify behaviour the redirect design depends on.

`manifest.webmanifest` and `sw.js` must return 200 and not be locale
prefixed. Both are excluded by name in the `middleware.ts` matcher, and a
matcher that behaves differently would show up here first.

Then, by hand: sign in with a six digit code, submit a brokerage enquiry and
confirm the Telegram ping, and buy credits with a live card to confirm the
Stripe webhook signature verifies against whichever secret the deployment
holds.

## Rollback

Change the DNS records back. That is the whole procedure, and it is why
Netlify must not be deleted or have its variables cleared until step 8.

Rollback stops being free the moment an old key is revoked. Revoking is the
last step for exactly that reason.
