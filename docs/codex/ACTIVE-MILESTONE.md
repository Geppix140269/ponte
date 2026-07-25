# Active milestone — Phase 0 Codex onboarding and gap report

## Objective

Make the repository self-contained enough for Codex to understand the product, current implementation, production constraints and roadmap, then complete the governing brief's Phase 0 repository-to-architecture gap report before any new implementation.

## In scope

- Merge the repository agent instructions and reconciled Codex operating layer.
- Use `docs/ponte-authority/00-MASTER-IMPLEMENTATION-BRIEF.md` as the governing implementation authority.
- Audit `main`, recent merged PRs, routes, components, APIs, database-facing services, migrations, CI, deployment configuration, localisation and tests.
- Map current implementation to the Route Atlas IDs, conceptual domain objects and named end-to-end journeys.
- Separate reusable engineering infrastructure, visual debt, product-flow debt, data-model gaps, security/migration risk and obsolete surfaces.
- Identify stale or contradictory repository documentation.
- Assess the merged homepage as retain, revise or replace within connected journeys without modifying it.
- Propose the smallest truthful Phase 1 vertical slice and stop for owner approval.

## Out of scope

- No product UI or behaviour changes.
- No database migration.
- No route changes.
- No production deployment or feature-flag change.
- No secret access or rotation.
- No global Brand v5 repaint.
- No L1-L4, Trust Score, verification-data or user-facing trust-model changes.

## Phase 0 deliverables

1. Current route inventory.
2. Current major component inventory.
3. Current database and API inventory.
4. Mapping to every route family and conceptual domain object.
5. Classification of each relevant item as aligned, partially aligned, reusable infrastructure, obsolete, missing, or unsafe/contradictory.
6. Visual debt separated from workflow and data debt.
7. Every L1-L4 and Trust Score dependency.
8. Assessment of the merged landing implementation.
9. Schema drift and migration hazards.
10. All places where Qualified Opportunities and Market Signals are blended or confused.
11. Authentication boundaries that lose user work.
12. External actions lacking deterministic approval or idempotency.
13. Routes currently receiving handoff from the gateway.
14. Conflicts between repository documentation and the governing brief.
15. The smallest proposed Phase 1 vertical slice, including exact route/state IDs, files to reuse, files likely to change, possible schema/API additions, eventual migration needs, test plan, risks, rollback/safe-disable and unresolved decisions.
16. Assumptions and owner questions.

## Definition of done

1. `AGENTS.md`, the governing brief and this Codex layer are merged.
2. Codex has read the governing brief in full.
3. Codex returns the complete Phase 0 report without implementing application behaviour.
4. The report distinguishes code on `main`, deployed code, enabled flags and production-tested behaviour.
5. `npm run verify` is run and its exact result recorded, or an environment-specific inability is reported precisely.
6. The production host, branch and feature-flag state are resolved or left as explicit owner actions.
7. Giuseppe approves the next milestone before implementation begins.

## Codex audit instruction

Read `AGENTS.md` and `docs/ponte-authority/00-MASTER-IMPLEMENTATION-BRIEF.md` in full before taking any action. Then read every status, decision and roadmap file linked from `docs/codex/00-START-HERE.md`.

Do not implement the app-wide rebrand. Do not change L1-L4, the Trust Score, global tokens, migrations, routes, production settings or application behaviour.

Inspect the current `main`, including merged PRs #14-#20, and produce the Phase 0 repository-to-architecture gap report defined above and in section 13 of the governing brief.

Run `npm run verify` and record the exact result. Return the report for Giuseppe's review. Do not begin Phase 1, create a migration, change a production flag or deploy anything.
