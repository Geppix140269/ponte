# Known issues and unresolved evidence

## Production deployment state is not yet reconciled

The repository's canonical source is `main`, but Stage One has not yet recorded the exact host project, deployed commit, production branch or public journey-flag values currently serving `ponte.trade`.

Required evidence:

- hosting provider and site/project name;
- connected repository;
- production branch;
- build and publish settings;
- deployed commit SHA;
- `NEXT_PUBLIC_FIND_JOURNEY` value;
- `NEXT_PUBLIC_STRUCTURE_JOURNEY` value;
- direct checks of `/`, `/find`, `/structure`, authentication resumption and submission/introduction outcomes.

Do not call a surface production-verified until this is recorded.

## Production schema and repository migration history are not guaranteed to be identical

Several recent migrations were applied and probe-verified against production, while the repository also has a known interrupted or broken numbered migration chain that causes Supabase Preview failures. The governing brief requires a live-schema inspection before any new migration.

Do not infer production schema solely from migration files.

## Existing product documentation contains stale status statements

`docs/platform/VERSIONS.md` includes historical entries that correctly described work before PRs #14-#20 merged, but some statements now read as if those branches were still undeployed. The Phase 0 audit must distinguish historical log entries from current status and recommend targeted documentation corrections without erasing history.

## Find and Structure exist but may be disabled

`lib/landing/routing.ts` selects `/find` and `/structure` only when the corresponding public environment variable is exactly `on`. Otherwise the gateway hands off to the older marketplace seams.

Production values are not recorded in the repository.

## The programme sequence and implementation history are out of order

The governing programme places the Phase 0 gap report and Phase 1 agentic Mission slice before the complete discovery and structure journeys. The repository already includes substantial Journey 1 and Journey 2 work. Phase 0 must assess and reuse that work rather than rebuild it or assume it fully satisfies the newer authority.

## Full agentic product spine is not yet demonstrated

The repository contains significant truth, verification, publication, authentication and controlled-introduction infrastructure. It does not yet have a recorded production-verified vertical slice covering Mission setup, threshold-triggered Commercial Development, evidence chain, recommended action, exact preview, approval, idempotent execution and Workspace outcome.

## Environment-dependent integrations cannot be assumed

The application references Supabase, Stripe, Resend, Anthropic, registry and data-source credentials. A successful repository build does not prove live external integrations are configured or working.

## No production changes are authorised by Stage One

PR #21 is documentation and agent operating instructions only. It does not authorise feature-flag changes, migrations, deployment changes, data imports, secret access or implementation of Phase 1.
