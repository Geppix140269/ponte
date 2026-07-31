# Connections

Every third party the platform depends on. No credential values: see
[SECRETS.md](SECRETS.md).

## Map

```
Domain registrar  ->  DNS for ponte.trade
                          |
GitHub (source of truth)  |
    push to main          v
        ->  Host (build and serve)  ->  ponte.trade
                 |
                 +-> Supabase   database, auth, file storage
                 +-> Stripe     payments
                 +-> Resend     transactional email
                 +-> OpenAI     listing vetting and translation
                 +-> Google     OAuth sign in
```

## Services

| Service | Used for | Identifier | Owner account |
|---|---|---|---|
| GitHub | Source of truth, CI | `Geppix140269/ponte` | Giuseppe |
| Host | Build and serve the site | see open question below | Giuseppe |
| Domain registrar | `ponte.trade` DNS | ponte.trade | Giuseppe |
| Supabase | Postgres, auth, storage | project `cptglsmjmzcfpjndqfmc` | Giuseppe |
| Stripe | Payments for Ponte AI | live account | 1402 Celsius Ltd |
| Resend | Transactional email | sends as the Ponte domain | Giuseppe |
| OpenAI | AI listing checks, translation | API account | Giuseppe |
| Google Cloud | OAuth client for sign in | OAuth client ID | Giuseppe |

## Hosting

**Vercel, since 31 July 2026.** `ponte.trade` and `www.ponte.trade` are served
by Vercel. **Netlify is no longer the production origin.** Owner-reported at the
completion of a controlled cutover; the migration is on branch
`ops/vercel-production-migration` and PR #168.

**This section had it the other way round until today**, and said so in as many
words: "Any older note saying the site moved to Vercel is out of date." That
sentence was correct on 21 July 2026 and is now exactly inverted. It is quoted
rather than deleted because it is the reason to date a hosting claim and to say
who confirmed it.

- **Deployment is explicitly controlled and owner-held.** Until the Vercel
  procedure is confirmed and recorded, **merging to `main` does not deploy
  production.** Do not describe a merged change as live without evidence.
- **Environment variables live in the hosting dashboard, not the repository.**
  Which dashboard is now Vercel's. `NEXT_PUBLIC_*` flags are still evaluated at
  build time, so changing one still requires a new build.
- The new build command, output settings, cache behaviour and rollback path are
  **unrecorded**. Record them when the procedure is confirmed.

**The repository still contains Netlify configuration, and it is deliberately
untouched:** `netlify.toml`, `@netlify/plugin-nextjs` in `next.config.mjs`, and
Netlify-specific reasoning in `middleware.ts`, `lib/rate-limit.ts` and
`scripts/check-dev-env.mjs`. Changing any of it is a hosting-configuration
change and was not authorised by the instruction that reconciled these
documents. **The documentation and the configuration disagree on purpose.**

**Netlify checks still run on every pull request** - `Header rules`,
`Redirect rules`, `Pages changed`, `netlify/ponte-trade/deploy-preview`. **They
are no longer a production signal**, and a deploy preview they publish is not a
preview of what production serves.

**None of this was verified from here.** No production fetch, no DNS lookup, no
dashboard. It is the owner's report, dated.

## Data and storage

| Where | What |
|---|---|
| Supabase Postgres | Members, listings, listing translations, connections, drafts |
| Supabase Storage | Listing photos, videos and documents |
| Supabase Auth | Magic link and Google sign in |

Database schema changes live in `supabase/migrations`, applied in filename
order. Migrations are additive: no destructive change to a table that holds
real data.

## Legal entities

Ponte is a trading name of 1402 Celsius Ltd.

| Entity | Registration |
|---|---|
| 1402 Celsius Ltd (Bulgaria) | Reg. 207314767, VAT BG207314767 |
| 1402 Celsius Ltd (United Kingdom) | Reg. 12475013, VAT GB 343 1702 32 |
