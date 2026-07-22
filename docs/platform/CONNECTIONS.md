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
| Vercel | Build and serve the site | scope `giuseppes-projects-210a18c5` | Giuseppe |
| Domain registrar | `ponte.trade` DNS | ponte.trade | Giuseppe |
| Supabase | Postgres, auth, storage | project `cptglsmjmzcfpjndqfmc` | Giuseppe |
| Stripe | Payments for Ponte AI | live account | 1402 Celsius Ltd |
| Resend | Transactional email | sends as the Ponte domain | Giuseppe |
| Anthropic | AI listing vetting, deal write-up | API account | Giuseppe |
| Google Cloud | OAuth client for sign in | OAuth client ID | Giuseppe |

**OpenAI is not a dependency.** It was one, and three documents still named it
on 22 July 2026, but no shipped code reads `OPENAI_API_KEY`: the vetting
co-pilot moved to Anthropic in `lib/ai-vet.ts` and nothing replaced the other
uses. The key was never carried to Vercel. Revoke it at the provider rather
than rotating it, and stop paying for it.

## Hosting

**Vercel**, since the migration of 22 July 2026. Netlify served ponte.trade
before that. The move and its checklist are in
[VERCEL-MIGRATION.md](VERCEL-MIGRATION.md).

- Build config: `vercel.json`. Next.js is a first party framework there, so
  there is no plugin to install and no publish directory to declare.
- Install `npm ci`, build `next build`
- Deploys automatically on push to `main`
- Environment variables are set in the Vercel project, not in the repository

**Netlify stays configured but is not authoritative** until the migration is
signed off. It is the rollback: a DNS change puts the last known good deploy
back. Do not delete the Netlify site or its environment variables until this
document says the migration is closed.

**After a routing change, redeploy without the build cache.** The durable cache
has served stale prerenders before. This applies to the locale routing change
in particular.

A failed build does not take the site down: Vercel keeps serving the last
successful deployment, exactly as Netlify did. So a broken push costs a deploy,
not an outage.

**What did not change in the move.** Worth recording, because each was checked
rather than assumed: the middleware still runs at the edge ahead of the origin,
so the legacy redirects in `middleware.ts` keep their 308s and stay the single
authority. `x-forwarded-for` carries the real client IP as its first value, so
`lib/rate-limit.ts` is untouched. There is no `next/image` usage anywhere, so
no image optimisation behaviour to port. The nightly sanctions refresh runs on
a GitHub Actions runner and never touched the host at all.

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
