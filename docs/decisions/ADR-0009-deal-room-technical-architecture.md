# ADR-0009 — Deal Room technical architecture

- **Status:** Proposed for owner approval
- **Decision date:** 27 July 2026
- **Owner:** Giuseppe Funaro
- **Implementation status:** Not started

## Context

The Deal Room product definition and Experience Design v1 are accepted. Ponte now requires a technical architecture and implementation plan that preserves private sub-room boundaries, deterministic workflow, entitlement safety, evidence provenance, auditability and the existing Next.js/Supabase operating model.

The repository already uses Next.js 14, React 18, Supabase, Stripe and Resend. The historical Supabase migration chain is not reliable and must not be treated as an automatic deployment mechanism.

## Decision

Ponte will implement the Deal Room as a modular domain inside the existing application, using:

- Next.js server components and route handlers for product surfaces and controlled commands;
- Supabase Postgres as the source of truth;
- Row Level Security as a mandatory enforcement boundary;
- private Supabase Storage buckets for evidence;
- Stripe for Ponte entitlement and billing only, not trade settlement;
- an append-only domain-event and audit model;
- deterministic command handlers for all material state changes;
- asynchronous outbox processing for email, AI summaries, Passport projection and webhook side effects;
- permission-filtered AI context assembled server-side;
- feature flags and organisation-level allowlists for staged rollout.

The master Deal Room is the aggregate root. Sub-rooms are separate private permission scopes beneath it. No cross-sub-room access may depend only on UI filtering.

## Architectural boundaries

1. **Domain state** is stored in normalised Deal Room tables.
2. **Evidence bytes** are private objects; database rows hold metadata, versioning and disclosure rules.
3. **Audit events** are append-only and attributable.
4. **Entitlement state** is separate from room lifecycle state.
5. **Stripe events** are idempotently ingested before entitlement projection.
6. **AI output** is advisory and permission-scoped; it cannot mutate durable state without an explicit authorised command.
7. **Deal Passport facts** are projections from attributable accepted domain events and evidence, never manually invented scores.

## Delivery strategy

Implementation proceeds through gated vertical slices:

1. read-only domain skeleton and permission tests;
2. proposed room, invitation and admission;
3. procedure, tasks and progress;
4. evidence, decisions and blockers;
5. Starter entitlement and read-only expiry;
6. paid entitlement and Stripe;
7. Deal Passport projections;
8. hardening, observability and controlled rollout.

Each slice requires tests, privacy review, current-state update and explicit deployment approval.

## Migration constraint

No SQL may be applied to production under this ADR. Before any Deal Room migration, the required pre-migration report must inspect current production schema, RLS, functions, indexes, storage policies and migration drift. The existing broken migration chain must be handled under its dedicated reconciliation plan.

## Consequences

- The architecture fits the existing stack and avoids premature microservices.
- Privacy is enforced in the database and storage layer, not only the interface.
- Entitlement failure cannot erase Deal history.
- Stripe replay cannot double-consume credits or room capacity.
- AI cannot summarise inaccessible content.
- Implementation can be released incrementally behind flags.

## Non-scope

This ADR does not authorise code, SQL, migrations, Stripe configuration, production credentials, deployment, charging or production activation.

## Related authority

- `docs/ponte-authority/PT-TECH-2026-07-27-01-DEAL-ROOM-TECHNICAL-ARCHITECTURE-AND-IMPLEMENTATION-PLAN-V1.md`
- `docs/ponte-authority/PT-DESIGN-2026-07-27-01-DEAL-ROOM-EXPERIENCE-DESIGN-V1.md`
- `docs/ponte-authority/PT-PRODUCT-2026-07-27-04-DEAL-ROOM-DETAILED-PRODUCT-DEFINITION-V1.md`
- `docs/codex/DATABASE-STATE.md`
- Issues #52, #57 and #58
