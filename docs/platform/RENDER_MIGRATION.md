# Render production migration runbook

Status: prepared, not cut over

Owner decision: move Ponte production away from Netlify's per-production-deploy credit model without creating a new single-action outage risk.

## Non-negotiable migration rules

1. Netlify remains the live origin until the Render service has passed the acceptance checklist below.
2. No DNS record changes are made during initial deployment and testing.
3. No database migration or production data change is part of this hosting move.
4. Render automatic deployment stays off. A production release is a deliberate manual action against an identified commit.
5. Do not copy `SUPABASE_ACCESS_TOKEN` or `DATABASE_URL` into Render. The web application does not need the account-wide Management API token or a direct production database password.
6. Do not remove the current Netlify site immediately after cutover. Keep it intact as a rollback target until Render has been stable for at least seven days.
7. The temporary Basic-auth site gate remains unchanged throughout the migration.

## Repository preparation

`render.yaml` defines one paid Node web service:

- service: `ponte-trade-production`
- region: Frankfurt
- branch: `main`
- install/build: `npm ci && npm run build`
- start: `npm start`
- automatic deploys: disabled
- instance: Starter

An HTTP health-check path is intentionally not configured during the first migration. The current temporary private-site middleware challenges every HTTP path with Basic authentication, including API paths. Render's default TCP readiness check can verify that the Next.js process is listening without weakening that gate. An authenticated application-level health endpoint can be designed separately if required.

## Create the parallel Render service

1. Sign in to Render using the GitHub account that can access `Geppix140269/ponte`.
2. Choose **New > Blueprint**.
3. Select the private `Geppix140269/ponte` repository.
4. Select the `ops/render-production-migration` branch while this work is under review, and use `/render.yaml` as the Blueprint file.
5. Confirm that the resulting service is in **Frankfurt**, uses the **Starter** instance, and shows **Auto-Deploy: Off**.
6. Enter the requested environment variables by copying their current values from the Netlify production environment. Never copy values into chat, a GitHub issue, a commit, or a screenshot.
7. For variables that are currently unused and blank in Netlify, leave them blank unless Render requires a value. `DATA_OPENSANCTIONS_ENABLED` should retain its current explicit value.
8. Create the service and allow the first build to finish. Do not attach `ponte.trade` yet.

## Environment-variable handling

The authoritative names are in `.env.example`. The Blueprint requests runtime variables used by the application and deliberately excludes privileged operational variables used only by database-maintenance scripts.

Particular care:

- `NEXT_PUBLIC_*` values are embedded during `next build`; changing one requires a new build.
- `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `RESEND_API_KEY`, and `ANTHROPIC_API_KEY` are server-only secrets.
- `NEXT_PUBLIC_APP_URL` should remain `https://ponte.trade` for the final production build.
- Do not expose `SUPABASE_SERVICE_ROLE_KEY` with a `NEXT_PUBLIC_` prefix.
- Do not add `SUPABASE_ACCESS_TOKEN` or `DATABASE_URL` to the service.

## Acceptance checklist on the Render subdomain

The migration is not ready for DNS cutover until all applicable checks pass.

### Platform and rendering

- The Render deploy is green and the service remains running for at least 30 minutes.
- The temporary Basic-auth challenge is present.
- The landing page matches the approved production design at desktop and mobile widths.
- English and Spanish routing work without loops.
- Static assets, fonts, images, icons, PDFs and downloadable files load correctly.
- No unexpected 404, 500, hydration, middleware or image-optimization errors appear in browser or Render logs.

### Core journeys

- Product intake opens and progresses.
- Trade-service and distribution journeys open their family-specific flow.
- Market Signals load and search.
- Sign-in, session refresh and sign-out work.
- Account, opportunities, workspace and Deal Room surfaces load for an authorised test account.
- A harmless test record can be created, read and removed without affecting unrelated production records.

### Integrations

- Supabase reads and writes succeed under the correct RLS context.
- Resend sends a test email from an existing safe operator action.
- Stripe pages can be opened without changing production prices or creating a live charge.
- Company-verification integrations fail safely when optional keys are absent.
- Server routes that create PDFs or ZIP files complete successfully.

### Authentication callback warning

The final public hostname remains `https://ponte.trade`, so existing production callback URLs should continue to work after DNS cutover. Testing OAuth directly on the temporary `onrender.com` hostname may require temporarily adding that exact callback origin to Supabase and Google. Remove temporary callback entries after the custom-domain cutover.

## Cutover procedure

1. Record the current DNS records and the current Netlify production deploy ID/commit before changing anything.
2. Add `ponte.trade` as a custom domain on the Render service.
3. Follow Render's displayed DNS instructions exactly. Remove conflicting `AAAA` records only if Render requires it and only after recording them.
4. Verify the domain and wait for Render's TLS certificate to become active.
5. Change DNS to Render during a quiet period. Do not delete or modify the Netlify project.
6. Verify `https://ponte.trade` from a fresh browser session and from a second network.
7. Repeat the critical acceptance checks against the custom domain.
8. Confirm that inbound email actions, authentication callbacks and Stripe webhook delivery still reach the same canonical hostname.

## Rollback

Rollback is DNS-only unless a database change was made outside this runbook.

1. Restore the exact DNS values recorded before cutover.
2. Verify that the known-good Netlify deployment answers again.
3. Leave the failed Render service intact for log inspection; do not redeploy blindly.
4. Record the failure and its evidence before attempting another cutover.

## Post-cutover release policy

- Keep Render Auto-Deploy off.
- Deploy only a named commit that has passed repository verification and the release gate.
- Batch approved features into controlled releases instead of publishing every merge.
- Keep Netlify intact for seven stable days, then remove the Ponte custom domain from Netlify before considering project deletion.
- Do not place unrelated sites in Ponte's Render workspace if a shared spending limit could create another common failure boundary.
