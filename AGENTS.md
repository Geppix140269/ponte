# Ponte Trade agent instructions

These instructions apply equally to Codex, Claude, ChatGPT, human developers and
future agents. Tool choice does not create a separate operating process.

Before changing code, read these files in order:

1. `docs/ponte-authority/00-NORTH-STAR-ENTRY-ARCHITECTURE.md` in full. It is the
   current authority for the entry experience and supersedes all earlier
   landing, gateway and primary-entry instructions.
2. `docs/ponte-authority/00-MASTER-IMPLEMENTATION-BRIEF.md` in full.
3. `docs/codex/00-START-HERE.md`.
4. `docs/codex/SOURCE-OF-TRUTH-SOP.md`.
5. Relevant accepted ADRs under `docs/decisions/`.
6. Every status, decision and roadmap file linked from the start page.

## Source of truth

- `main` in `Geppix140269/ponte` is the canonical code and operating-memory source.
- Conversations, prompts, meeting notes, local clones, private handovers and AI
  Project instructions are proposal inputs, not product authority.
- A material decision becomes binding only after the owner accepts it, the
  affected canonical records are updated and the change is merged to `main`.
- Follow `docs/codex/SOURCE-OF-TRUTH-SOP.md` for decision intake, ADRs,
  cross-agent handover, implementation and current-state updates.
- The North Star Entry Architecture governs the entry experience: the landing,
  the two primary routes (Explore the market, Start a deal), Explore, market
  activity presentation and the Start a Deal entry.
- The Master Implementation Brief is the governing product and implementation
  authority for everything downstream of entry that the North Star does not
  restate.
- Do not treat a local clone, chat transcript, design export, deployed page or
  stale document as more authoritative than the reconciled repository record.
- The complete authority order is defined in `docs/codex/00-START-HERE.md`.
- `CLAUDE.md` is a tool entry point only; it delegates to these common rules and
  must never evolve into a second product authority.

## Non-negotiable product rules

- Ponte Trade is a commercial intelligence and controlled-execution layer for cross-border trade, not a consumer classifieds marketplace.
- Ponte Trade has exactly three equal primary market families: Products, Trade
  services, and Distribution and representation.
- Every market record has one family, one origin (Market Signal or Member
  Opportunity), and one intent valid for its family. The canonical contract is
  `lib/taxonomy/market.ts`; ADR-0001 and `docs/schemas/` record the decision and
  logical schema.
- Each family supports externally observed Market Signals and opportunities
  created directly by Ponte Trade members. Trade services and Distribution and
  representation are active two-sided markets, not ancillary directories.
- Keep Member Opportunities and Market Signals separate in data, status,
  language and actions. They may appear in one market-activity stream on entry
  surfaces, where each record must print its own true classification; unifying a
  presentation is not blending the record classes, and an unconfirmed Market
  Signal is never called a Member Opportunity or Qualified Opportunity.
- Never answer commercial curiosity with a large empty Qualified Opportunities
  state. When no reviewed opportunity exists, show the market activity that
  does exist and a route to create a related deal.
- Never invent users, demand, supply, liquidity, urgency, transaction volume,
  mandates, verification or commercial success.
- Public Market Signals must not expose third-party identity, contacts, source
  URLs, copied prose or private provenance.
- Commercial fit precedes contact disclosure. Introductions must remain
  controlled and recorded.
- Show useful value before authentication. Authenticate only when Ponte must
  save, submit, disclose, spend or perform a material action.
- Preserve and resume the user's work across authentication.
- AI may structure, compare, explain, recommend and draft. It must not silently
  publish, verify, disclose, pay, contact a third party or make a commercial
  commitment.
- Existing L1-L4 fields may remain for compatibility, but numbered tiers or a
  Trust Score must not become the primary user-facing trust model.
- Gold is a brand signal, not a verification, warning, approval or review status.
- Apply Brand v5 journey by journey. Do not begin an app-wide repaint.

## Engineering rules

- Never commit directly to `main`; use a dedicated branch and pull request.
- Inspect existing behaviour before replacing it. Reuse proven services and lifecycle gates.
- Do not alter production schemas, RLS, secrets, hosting settings or production feature flags without explicit owner approval.
- Database migrations must be additive, idempotent where practical, based on the recorded production state, and documented in `docs/codex/DATABASE-STATE.md`.
- Inspect the live production schema before proposing or applying a migration.
- Do not claim a migration, deployment or production test occurred without evidence.
- Ponte is English-only: English is the canonical and sole interface language.
  All other interface languages (including Spanish) are deferred, with their
  translations retained in `messages/_deferred/` and their old URLs permanently
  redirected to English. Preserve accessibility states, the reactivation path
  (see `LANGUAGES.md`), and all multilingual *input* and translation
  capabilities (typed/voice objectives in any language, AI language detection
  and normalisation, translated display of member content). See the 25 July 2026
  decision-log entries.
- Review mobile at 390 x 844 before desktop approval.
- Every meaningful journey must account for loading, empty, incomplete,
  ambiguous, error, blocked, resumed and completed states.

## Required validation

Run `npm run verify` before declaring implementation complete. Record any environment failure separately from a repository failure.

For a behavioural change, update in the same pull request:

- `docs/codex/CURRENT-STATE.md`
- `docs/codex/DECISION-LOG.md` when a durable decision changes
- the relevant ADR under `docs/decisions/`
- relevant machine-readable or code-level contracts in `docs/schemas/` and
  `lib/taxonomy/`
- `docs/codex/FEATURE-FLAGS.md` when a flag changes
- the relevant active or completed plan

## Substantial work

For work spanning multiple routes, schemas, services or user journeys, create and maintain an ExecPlan using `.agent/PLANS.md` before implementation.

## Stop conditions

Stop and request owner approval before:

- implementing beyond the approved milestone;
- applying a production migration;
- changing production feature flags or hosting;
- merging a pull request;
- changing verification data, L1-L4 compatibility or user-facing trust representation;
- executing an external or commercial action not already covered by a recorded approval policy.
