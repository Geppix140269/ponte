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

## Design Constitution check

Complete for every UI, component, icon, motion, copy-composition or visual change. Mark not applicable only when the change cannot affect a rendered interface.

- [ ] `design/authority/PONTE_DESIGN_CONSTITUTION_v1.md` was consulted.
- [ ] Approved Ponte components are used.
- [ ] Approved tokens are used; no hard-coded visual values were introduced.
- [ ] Approved Ponte Flow icons are used; no ad hoc interface SVG was introduced.
- [ ] No generic substitute replaced an approved Ponte treatment.
- [ ] Editorial typography and approved gold emphasis are preserved where applicable.
- [ ] Bridge language is preserved where applicable.
- [ ] Desktop reference was reviewed.
- [ ] Mobile at 390 × 844 was reviewed.
- [ ] Reduced-motion behaviour was reviewed.
- [ ] Keyboard, focus and non-colour state carriers were reviewed.
- [ ] No page-specific visual convention or silent simplification was introduced.
- [ ] Visual evidence is attached or linked.
- [ ] Explicit design approval is recorded for any authority amendment or exception.

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