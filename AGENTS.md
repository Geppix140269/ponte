# Ponte Trade agent instructions

Read `docs/codex/00-START-HERE.md` before changing code.

## Source of truth

- `main` in `Geppix140269/ponte` is the canonical code source.
- Do not treat a local clone, chat transcript, design export, deployed page or stale document as more authoritative than the reconciled repository record.
- The product authority order is defined in `docs/codex/00-START-HERE.md`.

## Non-negotiable product rules

- Ponte Trade is a commercial intelligence and controlled-execution layer for cross-border trade, not a consumer classifieds marketplace.
- Keep Qualified Opportunities and Market Signals separate in data, language, presentation and actions.
- Never invent users, demand, supply, liquidity, urgency, transaction volume, mandates, verification or commercial success.
- Public Market Signals must not expose third-party identity, contacts, source URLs, copied prose or private provenance.
- Commercial fit precedes contact disclosure. Introductions must remain controlled and recorded.
- Show useful value before authentication. Authenticate only when Ponte must save, submit, disclose, spend or perform a material action.
- Preserve and resume the user's work across authentication.
- AI may structure, compare, explain, recommend and draft. It must not silently publish, verify, disclose, pay, contact a third party or make a commercial commitment.
- Existing L1-L4 fields may remain for compatibility, but numbered tiers or a Trust Score must not become the primary user-facing trust model.
- Gold is a brand signal, not a verification, warning, approval or review status.

## Engineering rules

- Never commit directly to `main`; use a dedicated branch and pull request.
- Inspect existing behaviour before replacing it. Reuse proven services and lifecycle gates.
- Do not alter production schemas, RLS, secrets, hosting settings or production feature flags without explicit owner approval.
- Database migrations must be additive, idempotent where practical, based on the recorded production state, and documented in `docs/codex/DATABASE-STATE.md`.
- Do not claim a migration, deployment or production test occurred without evidence.
- Preserve ten-locale support and accessibility states.
- Review mobile at 390 x 844 before desktop approval.
- Every meaningful journey must account for loading, empty, incomplete, ambiguous, error, blocked, resumed and completed states.

## Required validation

Run `npm run verify` before declaring implementation complete. Record any environment failure separately from a repository failure.

For a behavioural change, update in the same pull request:

- `docs/codex/CURRENT-STATE.md`
- `docs/codex/DECISION-LOG.md` when a durable decision changes
- `docs/codex/FEATURE-FLAGS.md` when a flag changes
- the relevant active or completed plan

## Substantial work

For work spanning multiple routes, schemas, services or user journeys, create and maintain an ExecPlan using `.agent/PLANS.md` before implementation.
