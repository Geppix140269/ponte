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

## 2026-07-29 - Deal Room: four trust boundaries closed (no production change)

### Completed

- The owner follow-up review of PR #98 found four defects that let the durable Deal Room record state something the database had not proved. All four are closed on the same branch, each with direct-RPC negative tests, because the server action is not the boundary: every command is granted to `authenticated`, so anything the action does can be skipped.
  - **Agreement acceptance was forgeable.** `deal_room_accept_agreement()` took the version and checksum from its caller. It now takes neither: the canonical values are read from a new `deal_room_agreement_documents` table that no member holds a policy on, the old four-argument signature is dropped, and admission joins acceptances to that authority on version **and** checksum, so a forged or retired acceptance no longer satisfies the gate.
  - **The Integrity pre-flight and invitation preview were caller-authored.** `deal_room_invite()` took `p_preview` and `p_preflight` as JSON. Both are now derived inside the command from `profiles`, `organizations` and `verifications`; the stored pre-flight carries the command's own `derivedAt` and reports sanctions as unscreened when nothing was screened. The sanctions refusal moved into the command too. The eight-argument signature is dropped.
  - **The counterparty was not durable.** `deal_room_propose()` now proves the named member exists and has a reachable address, or requires a named external principal, and persists them on the room. `deal_room_invite()` has no email parameter: the address comes from that record, so the invitation cannot be redirected.
  - **Acceptance was written to history as admission.** `deal_room_accept_invitation()` recorded `participant_admitted` while the participant was still outside the gate. It now records `invitation_accepted`, and `participant_admitted` is written in exactly one place, by the command that verified identity, capacity, role, authority and every current agreement.
- New `lib/deal-room/__tests__/agreements.test.ts` recomputes each agreement's SHA-256 from the shipped text and asserts it against the literal seeded in the migration, so the retrievable source and the database authority cannot drift.

### Decisions

- The agreement authority is a table rather than a hard-coded list in the function, so publishing a new version is a reviewed migration and old acceptances stay explicable against the version they named.
- The pre-flight stores attributable **source facts**, not a rendered report. The wording stays in `lib/deal-room/integrity.ts` and renders those facts, so there is one copy of the wording and one copy of the facts.

### Risks / discrepancies

- Still executed nowhere. The four boundaries are enforced in SQL that no database has run, so they are reviewed and not proven. `npm run deal-room:negative-access` is the first Gate C step and now covers all four.

### Next

1. Owner review of the four corrections and the embedded frames.
2. Gate C, unchanged in order: apply the three migrations; create the bucket and policies; run the negative-access fixture; only on a clean pass, set the flag and deploy.

### Evidence

- Branch `agent/deal-room-launch-slice`, reconciled with `main` at `6b6c85a`. `npm run verify` clean.

---

## 2026-07-29 - Deal Room Gate B corrections after owner review (no production change)

### Completed

- The owner review of PR #98 did not accept Gate B. Five findings, all correct. Fixed on the same branch:
  - **The loop is now operable.** `app/[locale]/deal-rooms/actions.ts` holds fifteen server actions, each calling one `deal_room_*` command through the caller's own session client. Every surface is wired to them with real inputs. Previously the controls existed and nothing joined them to the commands.
  - **The invented sanctions check is gone.** `IntegrityInput` now takes a `SanctionsPosition` union that cannot express a screening without its date, source and result, and `sanctionsPositionFrom()` derives it from `verifications.sanctions_hits`. Absence reports under Unproved. A latent defect surfaced in the same code: the query filtered on `profile_id`, which is not a column on `verifications`, so it had been reading nothing.
  - **Five RLS fail-open paths closed.** No member INSERT, UPDATE or DELETE policy remains on any of the fourteen tables. Room creation proves listing ownership, publication, family facts and Starter bounds, and builds the Deal snapshot rather than accepting one. Entitlement is created only by that command and only as a bounded Starter. `deal_room_is_writable()` joins the entitlement, so a missing row fails closed. `selected` evidence visibility is removed from launch scope.
  - **An executable negative-access fixture.** `scripts/deal-room-negative-access.mjs` drives the loop with three real member sessions and asserts every property the review listed, including that even the service role cannot rewrite the activity history. Plan: `docs/codex/audits/deal-room/GATE-C-TEST-PLAN.md`.
- `npm run verify` passes end to end. The contract test now carries the blanket "no member write policy" assertion that would have caught the original defect.

### Decisions

- `selected` visibility removed rather than given an ACL. Implementing an exact recipient relation is real work with its own negative tests and the launch loop does not need it; a label that overstates its own protection is worse than no label.
- Server actions redirect with the command's own sentence on refusal, rather than returning a result. The whole slice stays server-rendered and no surface becomes a client component for the sake of one error string.

- **Visual evidence captured**, after the owner supplied `PONTE_SITE_PASSWORD`. The value was verified against the SHA-256 in `middleware.ts` before use; the wall was not altered, and no page or route was exempted from it. 17 frames in `docs/codex/audits/deal-room/evidence/`, all 20 checks passing twice in succession.

  The gate did its job. Two defects in this slice were visible only in the frames:
  - every Deal Room surface was rendering ink-on-obsidian and was close to illegible, because nothing painted the Ponte paper surface behind the room. Fixed with the room's own surface container plus `body:has(.dr-page)` to reach the canvas, scoped so no adjacent page is repainted.
  - a blocked room printed "Blocked" twice, as the condition chip and again as the momentum chip. The momentum chip is now suppressed when it would repeat the condition.

  A third finding was in the harness: the 390 overflow assertion raced the bridge's post-webfont re-fit and passed only on a re-run. The capture now waits on `document.fonts.ready` and a measured stage height.

### Risks / discrepancies

- The migrations are still executed nowhere, so the negative-access fixture is unrun. It is the first Gate C step.

### Next

1. Owner reviews the 17 frames and records design approval.
2. Gate C, in order: apply the three migrations; create the bucket and policies; run `npm run deal-room:negative-access`; only on a clean pass, set the flag and deploy.

### Evidence

- Branch `agent/deal-room-launch-slice`. `npm run verify` clean. `next build` emits all twelve surfaces plus the dev harness.

---

## 2026-07-29 - Deal Room launch slice, Gate B (no production change)

### Completed

- Gate A preflight approved by the owner at `35d2071`. Gate B implemented on `agent/deal-room-launch-slice`: the protected progression loop of issue #97, behind `NEXT_PUBLIC_DEAL_ROOM` and a server-side `DEAL_ROOM_ALLOWLIST`, both unset.
- `lib/deal-room/` holds the domain: states, procedure, progress, momentum, permissions, integrity, credible interest, invitation, entitlement, activity, bridge model, flags and the server query layer. 264 assertions across nine suites, plus 16 markup assertions for the Bridge, all in `npm test`.
- Twelve surfaces under `app/[locale]/deal-rooms/`, plus one API route that issues short-lived signed URLs for evidence after re-checking permission through the caller's own session.
- **Multi-party Deal Room Bridge v1** built as commissioned: `components/ponte/bridge/DealRoomBridge.tsx`, transcribed from `PB.dealroom` in the approved engine (deck height 104, rise 46, station fractions, participant block cap 140, shared elevation drawer below a 460px container). Its wrapper rules are the only new CSS, in `bridge-integration.css`, tokens only.
- Three additive migration files written: 14 `deal_room_*` tables, four RLS helper predicates, every policy, five authorised command functions, and one private storage bucket.
- The two separately authorised repairs (issue #97, decision 3): `20260728d_family_commercial_terms.sql` renamed to `20260728e_`, and `check-launch-mode.mjs` made whitespace-tolerant. Both now pass. PL-004 and PL-005 moved to Completed.

### Decisions

- ADR-0009 accepted as amended (issue #97, decision 1). Recorded in `DECISION-LOG.md`.
- `components/ponte/bridge/DealRoomBridge.tsx` added to the `RAW_SVG_BASELINE` ratchet in `check-governance.mjs`, with its argument written beside the two existing entries. The check refused the file first; the entry was written because of that, not to get past it. A bridge deck is structural interaction geometry from the approved package, not an interface icon.

### Risks / discrepancies

- **The migrations have been executed nowhere.** There is no non-production database to run them against (PL-002) and applying SQL to production is a Gate C decision. They are reviewed, not proven: treat their runtime behaviour as unverified until Gate C.
- **No visual evidence was captured.** Ponte is behind the temporary Basic-auth wall, whose password exists only as a SHA-256 in `middleware.ts`, and modifying the wall is prohibited. The evidence harness (`/en/dev/deal-room`, which 404s in production) and the capture spec (`npm run evidence:deal-room`) are both committed and unrun. One command with `PONTE_SITE_PASSWORD` set produces desktop, 390 x 844 and reduced-motion captures of all eight states.
- **Live negative RLS tests are outstanding** for the same reason: they need a running Postgres and two real member sessions. `lib/deal-room/__tests__/rls-contract.test.ts` asserts the policy contract textually in the meantime, including that no policy names `anon`, that the activity table has only a SELECT policy, that evidence versions and acceptances have no UPDATE or DELETE path, and that no statement touches the legacy cluster.
- `npm run verify` fails on Windows at `lib/verification/__tests__/guard.mjs`, which uses the POSIX `|| true`. Environment failure, not a repository failure: the file is untouched by this branch and the guard passes under bash and in CI.

### Next

1. Owner review of the Gate B pull request, and design approval of the Bridge.
2. Capture the visual evidence with the site-wall password, or authorise it to be captured against a deploy preview.
3. Gate C, as four separate approvals: apply the three migrations by hand and record them in `schema_migrations`; create the bucket and its policies; run the live negative-access tests against production before activation; then set the flag and the allowlist and deploy.

### Evidence

- Branch `agent/deal-room-launch-slice`, based on `main` at `0318615`.
- `docs/codex/audits/2026-07-29-deal-room-preflight.md`, `docs/plans/active/deal-room-launch-slice.md`.
- `npm test`: all suites pass, including the ten new ones. `tsc --noEmit`: clean. `next build`: all twelve Deal Room routes and the API route emitted.
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

- `20260728e_family_commercial_terms.sql` adds `service_terms` and `distribution_terms` as additive nullable jsonb, with cross-family CHECK constraints and a rollback path. It is **written and not applied**. The submit route already retries the write without them and the terms also travel in the synthesised `details`, so the branch is safe to deploy before the migration is run.
- The `listings_product_fields_family` constraint is added `not valid` so applying it cannot fail on a historical row. Validating it is a separate, deliberate step.
- Not every trade-service category is modelled to the same conditioned depth. The architecture supports category-conditioned questions; a complete model of eleven professions was not attempted here.

### Next

1. Owner review of ADR-0014 and of PR for `fix/family-specific-downstream-composer`.
2. On acceptance: merge, then apply `20260728e_family_commercial_terms.sql` by hand with owner authorisation, then record the application in `DATABASE-STATE.md`.
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
