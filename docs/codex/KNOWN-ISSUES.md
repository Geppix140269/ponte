# Known issues and unresolved evidence

## `docs/codex/00-START-HERE.md` carries committed merge-conflict markers

Lines 48 to 67 of `docs/codex/00-START-HERE.md` on `main` contain literal
`<<<<<<< HEAD`, `=======` and `>>>>>>> origin/main` markers. The file is a
binding governance record, and the section they interrupt is the **authority
order** every new contributor and agent is told to read first, so it currently
prints two different versions of that order with a conflict marker between them.

The two sides differ in substance, not only in wording:

- one names `design/authority/PONTE_DESIGN_CONSTITUTION_v1.md` with ADR-0002 and
  ADR-0010 as the binding design authority;
- the other names it with ADR-0002 alone, and adds five Deal Room authority
  entries (1c to 1g) the first side omits.

Choosing between them is an owner decision about what the authority order is,
not a formatting repair, which is why the 28 July 2026 product-intake change
reported it rather than resolving it in passing. The same defect in
`docs/codex/CURRENT-STATE.md` was resolved by that change, because that file had
to be updated anyway and its two sides were reconcilable without choosing.

Do not treat either side as settled until the owner has reconciled the file.

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
