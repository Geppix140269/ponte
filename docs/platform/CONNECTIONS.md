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

**Netlify.** Confirmed by the owner on 21 July 2026: the account was suspended
for a period and has since been restored, and Netlify serves ponte.trade today.
Any older note saying the site moved to Vercel is out of date.

- Build config: `netlify.toml`, using `@netlify/plugin-nextjs`
- Build command: `npm run build`, publish directory `.next`
- Deploys automatically on push to `main`
- Environment variables are set in the Netlify dashboard, not in the repository

**After a routing change, deploy without cache.** The durable cache has served
stale prerenders before. This applies to the locale routing change in
particular.

A failed build does not take the site down: Netlify keeps serving the last
successful deploy. So a broken push costs a deploy, not an outage.

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
