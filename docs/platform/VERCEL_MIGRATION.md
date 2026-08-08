# Vercel production migration runbook

Status: prepared, not cut over

Owner decision: move Ponte's Next.js production application from Netlify to Vercel without changing product behaviour, database state, DNS, or the live origin until the parallel deployment has passed explicit acceptance checks.

## Intended target architecture

- Vercel: Next.js application, middleware, route handlers, server rendering, static assets, image optimisation and deployment rollback
- Supabase: database, authentication, storage and realtime
- GitHub Actions: sanctions refresh and other long-running scheduled operations already kept outside web functions
- Resend: transactional email
- Stripe: payments and webhooks
- Netlify: retained unchanged as the live origin and rollback target during migration

No Supabase data migration is part of this work.

## Non-negotiable migration rules

1. `ponte.trade` stays on Netlify until the Vercel deployment has passed every applicable acceptance check.
2. No DNS change, Supabase migration, product change, taxonomy change or design change belongs in this migration.
3. Vercel automatic Git deployments remain disabled. `vercel.json` sets `git.deploymentEnabled` to `false` so branch pushes and merges do not publish automatically.
4. Deploy only an identified commit, deliberately, from the Vercel dashboard or CLI.
5. Do not copy secrets into GitHub, chat, screenshots, issues or pull-request comments.
6. Do not copy `SUPABASE_ACCESS_TOKEN`, `DATABASE_URL` or `SUPABASE_PROJECT_REF` into Vercel. They are privileged operational credentials, not web-runtime requirements.
7. Keep the current Netlify project and its last known-good deploy intact for at least seven stable days after cutover.
8. The temporary Basic-auth site gate remains unchanged during migration.
9. A failed Vercel validation is not repaired by changing production DNS. Diagnose it on the Vercel hostname while Netlify remains live.

## Why automatic deployments are disabled

Ponte currently has no separate development Supabase project. The repository's `.env.example` records that local and preview environments have historically pointed at production, including a service-role key that bypasses RLS. Some application surfaces can write to production merely by being opened.

Therefore:

- do not create routine preview deployments for every branch;
- do not expose an unprotected preview URL;
- create one controlled validation deployment from this migration branch;
- use the existing Basic-auth gate and Vercel Deployment Protection where available;
- do not open `/admin/listings` during casual visual testing;
- treat every validation action as production-data capable.

A separate non-production Supabase project should be created later as an independent security and development task. It is not required for the hosting cutover, but it is required before normal preview deployments become safe.

## Repository preparation

`vercel.json` deliberately contains only the deployment-control policy:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "git": {
    "deploymentEnabled": false
  }
}
```

No framework overrides are necessary. Vercel should detect the existing Next.js application and use:

- install: `npm install` or `npm ci` as selected by Vercel from the lockfile
- build: `npm run build`
- output: Next.js default
- Node.js: 20.x
- root directory: repository root

Do not configure `.next` as a static output directory. Ponte is a dynamic Next.js application with middleware and route handlers, not a static export.

## Create the parallel Vercel project

1. Sign in to Vercel with the account authorised for `Geppix140269/ponte`.
2. Create a new project and import the private GitHub repository.
3. Name the project `ponte-trade` unless that name is already occupied by an unrelated project.
4. Set the framework preset to **Next.js**.
5. Set the root directory to the repository root.
6. Set Node.js to **20.x**.
7. Do not add `ponte.trade` or `www.ponte.trade` yet.
8. Copy the required runtime environment variables from the current Netlify production environment into Vercel.
9. Apply server secrets to Production and to the one controlled validation environment only. Do not make them available to arbitrary branch previews.
10. Import the repository. The initial import may create one deployment; `vercel.json` prevents subsequent Git pushes and merges from automatically deploying.
11. If the import does not create the required branch deployment, use **Deployments > Create Deployment** and specify the exact migration branch or commit SHA.
12. Keep the Vercel hostname protected and do not advertise or index it.

## Environment-variable inventory

The authoritative descriptions and safe defaults remain in `.env.example`. Copy values from the current Netlify production environment or the password manager; never infer or recreate them during migration.

### Required application and integration variables

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `ADMIN_ALERT_EMAIL`
- `DEALS_TO_EMAIL`
- `NEXT_PUBLIC_APP_URL`
- `ANTHROPIC_API_KEY`
- `NEXT_PUBLIC_AI_PAYMENT_LINK`
- `NEXT_PUBLIC_CHECK_JOURNEY`
- `COMPANIES_HOUSE_API_KEY`
- `OPENCORPORATES_API_KEY`
- `DATASOURCE_CONTACT_EMAIL`
- `FREECURRENCYAPI_KEY`
- `WTO_API_KEY`
- `SAM_GOV_API_KEY`
- `DATA_OPENSANCTIONS_ENABLED`
- `OPENSANCTIONS_API_KEY`
- `FIRMS_MAP_KEY`
- `AISSTREAM_API_KEY`
- `ECONDB_API_KEY`
- `GFW_API_TOKEN`
- `OPENAQ_API_KEY`
- `COPERNICUS_CLIENT_ID`
- `COPERNICUS_CLIENT_SECRET`
- `SANCTIONS_REFRESH_SECRET`

### Platform values

- `NEXT_TELEMETRY_DISABLED=1`
- `NEXT_PUBLIC_APP_URL=https://ponte.trade` for the final production build

### Do not add to the Vercel web project

- `SUPABASE_ACCESS_TOKEN`: account-wide Supabase Management API credential
- `DATABASE_URL`: direct production database password
- `SUPABASE_PROJECT_REF`: migration and maintenance script input
- `SUPABASE_URL`: required by the GitHub Actions refresh workflow, while the web route can use the existing public URL fallback

The GitHub Actions sanctions-refresh secrets remain where they are. The hosting migration must not move that long-running job back into a web function.

## Environment-scope rules

- `NEXT_PUBLIC_*` values are embedded during `next build`; changing them requires a new deployment.
- Server-only secrets must never have a `NEXT_PUBLIC_` prefix.
- Production values apply only to deliberate production deployments.
- Because there is no development Supabase project, do not enable unrestricted Preview environment secrets for all branches.
- If a temporary Vercel hostname must be used in an OAuth callback, add that exact callback temporarily in Supabase and Google, then remove it after the custom-domain cutover.
- Keep the canonical application URL as `https://ponte.trade` for the final production deployment so generated links, metadata and email links remain canonical.

## Function and scheduled-work policy

Ponte's full sanctions refresh already runs in GitHub Actions because it takes minutes and should not depend on a request/response function lifecycle. Keep it there.

The manual `POST /api/cron/sanctions-refresh` route may carry a Vercel `maxDuration` setting, but it is not the supported scheduled path. A successful migration does not require moving scheduled refreshes into Vercel Cron.

Before cutover, review Vercel logs for any route that approaches its configured duration or memory limit, particularly:

- PDF generation;
- ZIP creation;
- document ingestion and classification;
- company-registry aggregation;
- AI-assisted vetting;
- manual sanctions refresh.

Move genuinely long-running work to GitHub Actions or a dedicated worker rather than increasing web-request duration without limit.

## Acceptance checklist on the Vercel hostname

Do not attach the production domain until all applicable checks pass.

### Build and platform

- The exact target commit builds successfully on Vercel.
- The deployment stays healthy for at least 30 minutes.
- No unexpected build warnings indicate missing server files, unsupported Node modules or oversized functions.
- The current Basic-auth challenge is present.
- Vercel Deployment Protection is enabled where the plan permits it.
- No automatic deployment is created after a subsequent harmless branch push.
- Logs contain no repeated 500, middleware, image, cache or function-timeout failures.

### Routing, middleware and static assets

- `/` loads correctly after authentication.
- English and Spanish routes work without redirect loops.
- `/api/*`, `/auth/*`, `/_next/*`, `robots.txt`, `sitemap.xml`, `manifest.webmanifest` and `sw.js` retain their intended routing behaviour.
- Legacy redirects such as `/cart` remain permanent and land on the correct live destination.
- Fonts, icons, images, uploaded listing media, PDFs and downloads load.
- Open Graph metadata and social-card images render correctly.
- The service worker installs and the offline page behaves as documented in `docs/platform/RUNBOOK.md`.

### Core journeys

- Landing-page family actions route correctly.
- Product intake opens, saves and progresses.
- Trade-service and distribution journeys enter their family-specific flow.
- Market Signals load, search and open details.
- Login, session refresh, callback and logout work.
- Account, verification, opportunities, workspace and Deal Room surfaces load for an authorised test account.
- Navigation back controls and unsaved-work protection continue to behave correctly.

### Data and security

- Supabase reads operate under the expected RLS context.
- A deliberately selected harmless write succeeds and can be removed without changing unrelated production data.
- Signed-out views do not reveal member-only listing details or identity.
- The service-role key is never present in browser-delivered JavaScript or network responses.
- The temporary validation hostname is not indexed and is not publicly discoverable.

### Integrations

- Resend sends a controlled test email from an existing safe operator action.
- Inbound Ponte notification paths reach the expected mailbox.
- Stripe checkout or payment-link surfaces open without changing prices or creating an unintended live charge.
- Stripe webhook delivery can reach the Vercel deployment when tested deliberately.
- Companies House, OpenCorporates, VIES, GLEIF and other configured data providers fail safely when an optional key is absent.
- Server routes that generate PDFs or ZIP files complete successfully.
- AI-assisted routes work with the configured Anthropic key and fail safely without exposing prompts or credentials.

### Performance observations

Record, rather than guess:

- landing-page response time;
- authenticated account response time;
- Market Signals search response time;
- cold and warm API route duration;
- function memory and duration for PDF/ZIP/document operations;
- Supabase latency from the selected Vercel region.

Do not pin a Vercel function region until the Supabase project region is confirmed and measured. The database and server functions should be kept geographically close where practical.

## Controlled production deployment

1. Confirm the target commit on `main` has passed repository CI and `npm run verify` in its development lane.
2. In Vercel, create a deployment from that exact commit SHA.
3. Apply Production environment variables.
4. Verify the resulting deployment on its protected Vercel URL.
5. Promote or designate that verified deployment as the production candidate without assigning `ponte.trade` yet.
6. Record:
   - target commit SHA;
   - Vercel deployment ID and URL;
   - current Netlify production deploy ID and commit;
   - current DNS records and TTL values;
   - date and operator.

## DNS cutover

1. Add `ponte.trade` and, if used, `www.ponte.trade` to the Vercel project.
2. Follow the exact DNS records displayed by Vercel. Do not rely on copied historical IP addresses.
3. Preserve a written copy of the existing Netlify DNS values before editing anything.
4. Lowering TTL in advance is optional; do not delay an urgent migration solely for that if the current TTL is acceptable.
5. Wait for Vercel domain verification and TLS certificate readiness.
6. Change only the records required to direct web traffic to Vercel.
7. Do not delete the Netlify project, deployment or environment variables.
8. Verify `https://ponte.trade` from:
   - a fresh private browser session;
   - a second network or mobile connection;
   - desktop and mobile widths.
9. Repeat the critical routing, authentication, Market Signals, email and Stripe checks against the custom domain.
10. Confirm that Supabase and Google OAuth callback allowlists still contain the canonical production URLs.
11. Confirm Stripe webhook delivery to the canonical production endpoint.

## Rollback

A hosting-only failure should remain reversible without a database change.

1. Use Vercel Instant Rollback if the failure is isolated to the latest Vercel deployment and an earlier verified Vercel deployment exists.
2. If the Vercel platform or project configuration is the problem, restore the exact DNS values recorded before cutover so traffic returns to Netlify.
3. Verify the known-good Netlify deployment from a clean browser and second network.
4. Leave the failed Vercel deployment intact for logs and evidence; do not overwrite it with repeated blind redeployments.
5. Record the incident and evidence in the existing platform operations documentation.

No database rollback belongs in this procedure unless a separate application change modified data. Hosting cutover itself does not modify the database.

## Seven-day post-cutover hold

For at least seven stable days:

- keep Netlify intact as a rollback target;
- deploy Vercel manually by identified commit only;
- review Vercel usage, build minutes, function duration, bandwidth and image optimisation daily;
- verify critical emails and Stripe webhook delivery;
- inspect server logs for recurrent cold-start, timeout, memory or middleware errors;
- do not enable automatic preview or production deployments.

After seven stable days, remove the Ponte custom domain from Netlify before considering cancellation or deletion. Export any deployment or configuration evidence needed for the operations record first.

## Release policy after migration

The initial policy is controlled release, not deploy-on-merge:

1. Merge only verified application changes to `main`.
2. Batch approved changes into a named release candidate where practical.
3. Create a Vercel deployment manually from the chosen commit SHA.
4. Validate it on a protected deployment URL.
5. Promote the verified deployment deliberately.
6. Use Instant Rollback to restore a known-good deployment when application behaviour regresses.

Automatic Git deployments may be reconsidered only after:

- Ponte has a separate non-production Supabase project;
- preview environments cannot write to production;
- deployment spending alerts and limits are configured;
- the release process has been stable long enough that automation reduces risk rather than multiplying it.
