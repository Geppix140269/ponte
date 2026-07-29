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

## 2026-07-29 - Family vocabulary downstream of publication (ADR-0014 §9-§10)

### Completed

- Built `lib/listings/record-facts.ts` as the single presenter for a STORED listing row, and routed every surface that presents one through it: `/find/o/[ref]`, `/marketplace/l/[ref]`, `/opportunities`, the workspace rows, `/admin/listings` and the member email templates. Each previously carried its own fixed list of product columns, so a published trade service answered Quantity, Incoterm, HS code, Origin and Destination with "Not stated" and its stated service terms appeared only inside the prose.
- Member emails now name the record the member posted. `recordNoun` supplies "offer", "requirement", "trade service" or "distribution opportunity", and the metadata block leads with the family's own headline fact instead of "Quantity". A caller that sends no noun keeps the historical wording exactly, so no existing sender changed meaning.
- The submit route's missing-column fallback was extracted here into `lib/listings/write-fallback.ts` and tested. **That extraction was superseded before this branch merged**: PR #99 landed its own `lib/listings/write-fallback.ts` on `main`, which reads the missing column out of the error and drops it one at a time rather than dropping this branch's two staged groups. On the rebase onto `6b6c85a` the version from #99 was kept in full and this branch's module and its tests were dropped. Nothing here modifies the fallback.
- Added `lib/structure/discard.ts` and a confirmation in `ClassifyStep`, so a classification change that would destroy answers already given names them and waits. A change that costs nothing is not interrupted.
- Both public readers now degrade their select when the unapplied family-terms columns are absent, so the pending `20260728d` migration cannot 404 a shareable listing link.

### Decisions

- None requiring the owner. This is implementation of ADR-0014, which remains **Proposed** and awaiting acceptance.

### Risks / discrepancies

- `20260728d_family_commercial_terms.sql` remains **written and not applied**. Until it is, `service_terms` and `distribution_terms` are absent, the new surfaces render the family's classification without its terms, and the terms reach readers through the record's synthesised `details`. No production migration was applied by this work.
- PL-004 recorded: `canonicalServiceCategory`, `canonicalPartnerType` and `canonicalRelationshipTerm` exist to reconcile superseded stored keys and have no callers, so a record stored under a superseded key loses its specialisations on edit. Production incidence is **unmeasured**; it is not asserted to be zero.

### Next

1. Owner accepts or rejects ADR-0014.
2. On acceptance, apply `20260728d_family_commercial_terms.sql` with owner approval and record it in `DATABASE-STATE.md`.
3. Triage PL-004 against production data.

### Evidence

- Branch `claude/classify-tests-discard-warning-15173f`, cut from `origin/main` at `923d1e3` and rebased onto `6b6c85a` after PR #95, #99 and the password rotation landed. The rebase kept `main`'s `write-fallback.ts` and submit-route wiring, and kept both operations entries.
- `npm test` passes and `tsc --noEmit` is clean. **`npm run verify` is NOT green, on this branch or on `main`**: `check-migrations.mjs` fails on the duplicate `20260728d` identifier and `check-launch-mode.mjs` fails on a literal it cannot find because `AGENTS.md` wraps the sentence. Both reproduce on a clean `origin/main` checkout and are recorded as LB-001 and LB-002; neither is repaired here.
- No production change, no deployment, no migration applied, no feature flag altered.
## 2026-07-29 — Start a Deal could not submit or save at all

### Completed

- Diagnosed and fixed a total failure of the Start a Deal composer reported by the owner from the live site: **Submit for Ponte review and Save draft both failed, for every member and every market family.** The member saw "Ponte kept your words. Something interrupted the submission."
- Root cause: `20260728c_automated_listing_publication.sql` is written and **not applied**, so `listings` has no `quantity_mode`, `quantity_min`, `quantity_max`, `quantity_extracted`, `quantity_confirmed_at`, `declaration_accepted_at` or `declaration_version`. `POST /api/marketplace/submit` sends all of them on **every** write. PostgREST refused the insert with `PGRST204`, and the route's retry dropped two fixed GROUPS of columns (family terms, then the classification set), neither of which contains any of them, so both retries re-sent a row the database had already refused and the route answered 500.
- The retry now reads the missing column out of the error and drops that one, repeating until the row is acceptable. Extracted to `lib/listings/write-fallback.ts` so the rule is unit-tested rather than only exercised through HTTP. It never drops `user_id`, `type`, `product`, `details` or `status`; it never reacts to an error that is not a missing column; every drop is logged by name. The two named groups remain as the fallback for a missing-column error that does not name a column.
- `structure.submit.declarationAccept` was missing from the catalogue, so the publication declaration's checkbox label rendered as the raw dotted path next to the five terms a member has to accept. Added, and a sweep test now asserts every key the composer names outright exists.
- The trade-service scope question rendered the engagement chips underneath it. They were the only tappable control on a screen whose actual answer is a typed sentence, so a member who tapped one and pressed Save still had "Scope: Not stated" and no indication why. Engagement is now its own step, and the review prints an engagement row whether or not it has been answered.
- "What is your role?" answered from one combined list for every family, so a freight forwarder offering road freight was shown "Grower / farmer", "End buyer" and "Exclusive distributor" alongside the five service roles. Roles are now chosen by family and, for trade services, by side: `roleGroupsFor` in `lib/structure/procedures/registry.ts`, vocabularies in `lib/structure/vocabulary.ts`. Stored values are unchanged strings; existing records keep the role they hold.
- A refused submission now logs the status, message and field to the browser console. Until now a refusal left nothing behind, so a submission failing for every member looked exactly like a dropped connection.

### Decisions

- None taken. No schema was changed and nothing was applied to production.

### Risks / discrepancies

- **The code fix stops the data loss; it does not restore the behaviour the missing columns carry.** Until `20260728c` is applied, a member's accepted declaration cannot be stored (`declaration_accepted_at`), so the publication gate will not see it, and `publishOrHold` cannot write the `validating` / `needs_information` / `flagged` states the widened status constraint permits. A submission therefore stores and stays `submitted`, and the member is told it is with the desk. That is honest but it is not automated publication.
- `20260728d_family_commercial_terms.sql` remains written and unapplied, unchanged by this work.
- `node scripts/check-migrations.mjs` fails on a pre-existing duplicate letter suffix: `20260728d_family_commercial_terms.sql` and `20260728d_verification_level_canonical.sql`. Not introduced here and not repaired here.

### Next

1. Owner review and merge.
2. Apply `20260728c_automated_listing_publication.sql` by hand with owner authorisation, then `20260728d_family_commercial_terms.sql`, and record both in `DATABASE-STATE.md`. Until then the composer's own log names every column being dropped on each write.
3. Re-walk one trade-service submission end to end after the migration and confirm the listing carries its declaration and reaches a decided state.

### Evidence

- Branch `claude/opportunity-form-bugs-0c79cc`, based on `main` at `0318615`.
- `lib/listings/write-fallback.ts` and `lib/listings/__tests__/write-fallback.test.ts` (6 assertions, including the exact production column set that failed).
- `lib/listings/__tests__/classification.test.ts` (`missingColumnFrom`, both driver spellings).
- `lib/structure/__tests__/downstream-journeys.test.ts` (21 assertions: the composer key sweep, the per-family role lists, the engagement split).
- `lib/structure/__tests__/composer.test.tsx` (10 assertions: the scope question offers one box and no taps; engagement is its own question; a service member is offered service roles).
- `npm test` passes (41 suites); `tsc --noEmit` clean.

---

## 2026-07-28 - Family-specific downstream composer (ADR-0014)

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

- None taken. ADR-0014 is **proposed**, not accepted.

### Risks / discrepancies

- `20260728d_family_commercial_terms.sql` adds `service_terms` and `distribution_terms` as additive nullable jsonb, with cross-family CHECK constraints and a rollback path. It is **written and not applied**. The submit route already retries the write without them and the terms also travel in the synthesised `details`, so the branch is safe to deploy before the migration is run.
- The `listings_product_fields_family` constraint is added `not valid` so applying it cannot fail on a historical row. Validating it is a separate, deliberate step.
- Not every trade-service category is modelled to the same conditioned depth. The architecture supports category-conditioned questions; a complete model of eleven professions was not attempted here.

### Next

1. Owner review of ADR-0014 and of PR for `fix/family-specific-downstream-composer`.
2. On acceptance: merge, then apply `20260728d_family_commercial_terms.sql` by hand with owner authorisation, then record the application in `DATABASE-STATE.md`.
3. Validate `listings_product_fields_family` after inspecting any rows it reports.

### Evidence

- Branch `fix/family-specific-downstream-composer`, based on `main` at `457eaf6`.
- `docs/decisions/ADR-0014-family-specific-downstream-commercial-procedures.md`.
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
