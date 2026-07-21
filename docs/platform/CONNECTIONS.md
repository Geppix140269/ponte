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

## Open question to confirm

The repository contains `netlify.toml` and the `@netlify/plugin-nextjs` plugin,
and the current working brief says the site deploys to Netlify on push to
`main`. A separate note in the operator's records says the Netlify account was
suspended and sites were moved to Vercel.

**Both cannot be true.** Confirm which host actually serves ponte.trade today,
then correct this file and delete the config for the host that is not used.
Until then, a deploy can silently go to a service nobody is watching.

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
