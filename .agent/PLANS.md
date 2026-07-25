# Ponte Trade ExecPlans

Use an ExecPlan for work that spans multiple routes, services, schemas, lifecycle states or more than one reviewable implementation step.

Create active plans under `docs/plans/active/` and move completed plans to `docs/plans/completed/`.

Each plan must remain understandable without the original chat and contain:

1. **Purpose and user outcome** — what becomes possible and why it matters.
2. **Authority consulted** — exact product, brand, copy, lifecycle and route sources.
3. **Current implementation discovered** — reusable code, seams, flags, data and constraints.
4. **Scope** — included Route Atlas IDs and explicit exclusions.
5. **Product rules** — factual classes, permissions, privacy, approval and failure behaviour.
6. **Technical design** — routes, components, services, APIs and data changes.
7. **Migration plan** — production reconciliation, forward path, rollback and backfill when applicable.
8. **Experience states** — mobile, desktop, loading, empty, incomplete, ambiguous, error, blocked, resumed, complete, reduced motion and accessibility.
9. **Validation** — tests, `npm run verify`, preview checks and production acceptance.
10. **Rollout and safe-disable** — flags, sequencing, monitoring and rollback.
11. **Progress log** — dated completed and remaining work.
12. **Decisions and discoveries** — contradictions, surprises and owner decisions.
13. **Final evidence** — commits, PR, checks, deployment and limitations.

A plan is not approval to perform production actions. Production migrations, secret changes, hosting changes, flag changes, deployments and merges still require explicit owner authority.
