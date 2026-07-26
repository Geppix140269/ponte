## Outcome

<!-- What user, business or operational outcome does this change produce? -->

## Authority and decision

- Governing authority consulted:
- Accepted ADR or owner decision implemented:
- New or superseded ADR required: Yes / No
- Conflicts discovered:

## Existing implementation inspected

<!-- Record the routes, components, services, schemas, flags and production evidence inspected before changing behaviour. -->

## Change set

- Product or journey behaviour:
- Domain model or schema contract:
- Routes and copy:
- Data, migration or backfill:
- Permissions, privacy or lifecycle:
- Explicitly out of scope:

## Source-of-truth updates

- [ ] `docs/codex/CURRENT-STATE.md` is accurate after this change.
- [ ] `docs/codex/DECISION-LOG.md` is updated when a durable decision changed.
- [ ] Relevant ADRs under `docs/decisions/` are created or updated.
- [ ] Relevant authorities under `docs/ponte-authority/` are updated or confirmed unaffected.
- [ ] Relevant contracts under `lib/taxonomy/` or `docs/schemas/` are updated or confirmed unaffected.
- [ ] The active ExecPlan is updated when `.agent/PLANS.md` requires one.
- [ ] Feature-flag and database-state records are updated when applicable.

## Validation and evidence

- [ ] Targeted tests pass.
- [ ] `npm run verify` passes, or an environment failure is recorded separately.
- [ ] Mobile behaviour at 390 × 844 was reviewed when UI changed.
- [ ] Loading, empty, incomplete, ambiguous, error, blocked, resumed and completed states were considered when the journey changed.
- [ ] No deployment, migration, production check or external action is claimed without evidence.

Evidence:

## Rollout, rollback and approval

- Safe-disable or rollback:
- Production actions still required:
- Owner approvals still required:
- Merge status: Awaiting owner approval / Approved
