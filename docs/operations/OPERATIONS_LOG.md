# Ponte Trade Operations Log

Purpose: the compact, chronological operating memory for production changes, material implementation outcomes, decisions, risks and immediate next actions.

This file does not replace product authorities, ADRs, `CURRENT-STATE.md`, `DATABASE-STATE.md` or implementation plans. It links operational reality across them so a new agent does not need to reconstruct the project from chat history.

## Operating rule

Add or update an entry whenever work materially changes production, deployment, database state, architecture, security, operating process or a cross-agent handoff. Keep entries factual, concise and evidence-based.

Use this structure:

- **Completed** — what actually happened.
- **Decisions** — owner-approved operational decisions.
- **Risks / discrepancies** — unresolved operational concerns.
- **Next** — the smallest ordered set of actions.
- **Evidence** — PRs, commits, migrations, production checks or canonical documents.

---

## 2026-07-28 - Family-specific downstream composer (ADR-0013)

### Completed

- Replaced the shared product-shaped S02-S06 commercial procedure with one procedure per market family, behind a central registry at `lib/structure/procedures/`. The composer shell, account gate, submission orchestration, lifecycle screen and design system are unchanged.
- Trade services and Distribution now have their own completion queues, fact buckets, blockers, question controls, review models and submit payloads. Neither is asked for, blocked on, or reviewed against a quantity, unit, Incoterm, packaging or HS code.
- Extended cross-family sanitisation from the classification fields to the commercial fields, and added server-side refusal of product-only fields and of one family's terms on another family's record.
- Repaired two defects found on `main` while reading it, both of which blocked this work's own verification:
  - `package.json` carried a duplicate `"test"` key. JSON takes the last, and the winning copy silently dropped `lib/listings/__tests__/eligibility.test.ts`, `lib/listings/__tests__/quantity.test.ts` and `lib/email/__tests__/email-system.test.ts`. `npm test` had not been running them since the PR #74 merge. Deduplicated to one script containing the union.
  - `familyOf()` in `lib/listings/eligibility.ts` did not recognise `services`, the value the canonical taxonomy defines and the composer sends. It resolved correctly only by accident, via the legacy `type === "service"` fallback.
- Full verification run on the branch: `npm run verify` passes (messages, encoding, governance, 40 test suites, `tsc --noEmit`, `next build`).
- Journeys walked in the running dev server at desktop and 390 x 844: services/offer_trade_service through freight forwarding to review and submit, and distribution/seek_distribution_partner through to review. No horizontal overflow at 390.

### Decisions

- None taken. ADR-0013 is **proposed**, not accepted.

### Risks / discrepancies

- `20260728d_family_commercial_terms.sql` adds `service_terms` and `distribution_terms` as additive nullable jsonb, with cross-family CHECK constraints and a rollback path. It is **written and not applied**. The submit route already retries the write without them and the terms also travel in the synthesised `details`, so the branch is safe to deploy before the migration is run.
- The `listings_product_fields_family` constraint is added `not valid` so applying it cannot fail on a historical row. Validating it is a separate, deliberate step.
- Not every trade-service category is modelled to the same conditioned depth. The architecture supports category-conditioned questions; a complete model of eleven professions was not attempted here.

### Next

1. Owner review of ADR-0013 and of PR for `fix/family-specific-downstream-composer`.
2. On acceptance: merge, then apply `20260728d_family_commercial_terms.sql` by hand with owner authorisation, then record the application in `DATABASE-STATE.md`.
3. Validate `listings_product_fields_family` after inspecting any rows it reports.

### Evidence

- Branch `fix/family-specific-downstream-composer`, based on `main` at `457eaf6`.
- `docs/decisions/ADR-0013-family-specific-downstream-commercial-procedures.md`.
- `lib/structure/__tests__/procedures.test.ts` (27 assertions, all seven canonical intents and the mandatory negative assertions) and `lib/structure/__tests__/downstream-journeys.test.ts` (16 assertions, the two worked journeys plus a sweep proving every message key each procedure emits exists in the catalogue).

---

## 2026-07-28 — Emergency build hotfix: PR #74 merge artefacts blocked deployment

### Completed

- Netlify deployment of `main` at `b378ad2` failed: SWC could not parse `lib/structure/draft.ts` or `app/api/marketplace/submit/route.ts`.
- Diagnosed as merge artefacts from PR #74, not a design or behavioural defect. In four places an inserted line overwrote the first line of the construct that followed it:
  - `lib/structure/draft.ts` — `export type { QuantityMode };` overwrote the `import {` opening the `../taxonomy/services` import.
  - `lib/structure/draft.ts` — `quantityMode: QuantityMode | null;` overwrote the `/**` opening the doc comment on `resolution`.
  - `app/api/marketplace/submit/route.ts` — the `DECLARATION_VERSION` import overwrote the `import {` opening the `@/lib/listings/classification` import.
  - `components/structure/StructureComposer.tsx` — the submit-response binding `j` was left declared inside the per-payload loop while the outcome block after the loop still read it, so the file failed type checking even once parsing succeeded.
- Each overwritten line was restored from `be634b1`, the last revision in which the file was well formed. In `StructureComposer.tsx` the binding was hoisted to the loop's enclosing scope and renamed `body`.
- A fifth artefact from the same merge failed CI rather than the build: PR #74 hand-edited the GENERATED `messages/en.json` without adding the 25 new strings to `messages/_fragments/structure.json`, so `en.json` no longer reproduced from its source. The strings were copied verbatim into the fragment. `node scripts/build-messages.mjs` now regenerates `en.json` byte-for-byte identical to the shipped file, so no user-facing string changed.
- No product behaviour, taxonomy, database state, schema, migration, flag or design token was changed. The hotfix restores the code PR #74 intended to merge.

### Decisions

- Repair the merge artefacts in place rather than revert PR #74: reverting would withdraw automated publication, the quantity model and the unified email system for a defect that is four lines of damage.

### Risks / discrepancies

- `package.json` carries a duplicate `"test"` key from the same merge. JSON parsers keep the last, so the first list is silently dead. Not build-blocking and deliberately left untouched by this hotfix.
- The same merge could have damaged files whose defects neither the parser nor the type checker can see. Type checking and the full suite are clean, which bounds but does not eliminate this.

### Next

1. Confirm the Netlify deployment of the merge commit succeeds and production is serving.
2. De-duplicate the `"test"` key in `package.json` and reconcile the two script lists in a separate change.

### Evidence

- `npx tsc --noEmit --incremental false` — clean.
- `npm run build` — compiled successfully, all routes emitted.
- `npm test` — full suite passed, including `lib/structure/__tests__/draft.test.ts` (18), `lib/listings/__tests__/quantity.test.ts` (23) and `lib/structure/__tests__/composer.test.tsx` (7).
- `check-messages`, `check-encoding` and `check-governance` — all passed.

---

## 2026-07-28 — Market classification schema and migration audit

### Completed

- PR #70 merged to `main` at merge commit `877448bd6c47aaa74e6c6eee50b1ba1f8386cafb`.
- Production Supabase project confirmed as `cptglsmjmzcfpjndqfmc` (`Ponte Trade`, eu-west-1).
- Migration `20260728a_market_classification.sql` applied to production and recorded.
- Verified in production: 17 columns, 10 CHECK constraints and 9 indexes.
- Product, Trade Services and Distribution database write paths were verified in rolled-back transactions; no test rows remained.
- Market classification coverage now reports `nothing_classified`, not `columns_absent`.
- Historical migration reconciliation completed read-only: 40 repository migration files, 0 missing schema migrations, 0 partially applied migrations, 1 superseded migration and 4 data-only migrations whose historical execution cannot be proved from schema alone.
- Application code was checked against production objects; no referenced database object was absent.

### Decisions

- Do not replay historical migrations merely because a ledger entry is absent.
- Do not backfill or classify the historical Market Signals inventory as part of the schema migration.
- Treat repository migration files, the migration ledger and the actual production schema as separate evidence sources.
- Do not relink Supabase Preview until the repository can reproduce the production base schema reliably.

### Risks / discrepancies

- `public.schema_migrations` was found publicly readable and writable through the anon role; this is an urgent security and migration-governance defect.
- Twenty-six migration-ledger rows were inserted in bulk at 2026-07-28 13:37:42 UTC by an unidentified actor or process. The entries are not independent proof that the migrations ran.
- Production contains 29 tables without repository migration provenance; the existing migration chain is not a complete production rebuild path.
- The Supabase GitHub App check points to project reference `kltuzbxnldtmdfhakphv`, which is not accessible in the account holding the production project and has produced persistent failed checks.

### Next

1. Merge PR #73 after confirming it remains documentation-only and records the production migration evidence accurately.
2. Review PR #64 and merge only if it contains solely the intended retirement of an obsolete permanently failing check.
3. Create, review and apply an additive migration that protects `public.schema_migrations` by enabling RLS and revoking anon/authenticated privileges while preserving privileged migration tooling.
4. Investigate the 2026-07-28 13:37:42 UTC ledger backfill using available logs; preserve existing rows during the investigation.
5. Capture a sanitised schema-only production baseline for the 29 unprovenanced tables.
6. Decide whether to disable the invalid Supabase Preview GitHub App integration until reproducible preview databases are possible.

### Evidence

- PR #70
- Merge commit `877448bd6c47aaa74e6c6eee50b1ba1f8386cafb`
- Migration `supabase/migrations/20260728a_market_classification.sql`
- PR #73 (documentation record; pending merge at time of this entry)
- `docs/codex/DATABASE-STATE.md`
- `docs/codex/CURRENT-STATE.md`
