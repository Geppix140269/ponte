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

## 2026-07-28 — LAUNCH BLOCKER RESOLVED: canonical verification level applied to production

### Completed

- Applied `supabase/migrations/20260728d_verification_level_canonical.sql` to production (`cptglsmjmzcfpjndqfmc`) at **17:04:50 UTC**, with explicit owner authorisation, using `node scripts/db-query.mjs --file`.
- SHA-256 `262e96b7dc4cdef1a91d493994cfd4fc9f6e705af149147b0bfa1261714a9930`, matching the file on `main` byte for byte.

**Why this was a Launch Blocker.** Production already carried a five-value CHECK constraint on `profiles.verification_level` (`unverified, email_verified, phone_verified, company_verified, fully_verified`). The verification pipeline wrote the integer `2`, which Postgres coerced to the text `'2'` and the constraint rejected with SQLSTATE 23514. The update result was never checked, so **the write failed silently every time**: no member could reach `company_verified` through the intended pipeline. The only profile holding that value was written by the seed script. The same defect is recorded for the seed in commit `9fa0aa6`.

**What the migration changed, exactly:**

- One row backfilled: the single `NULL` `verification_level` became `'unverified'`.
- The five-value constraint replaced with the three canonical values: `unverified`, `identity_verified`, `company_verified`. Safe as a narrowing because zero rows held any of the three retired values.
- Default `'unverified'` restated (it was already the default).
- Column set `NOT NULL`, possible only once the null was gone.
- `set lock_timeout = '5s'` inside the transaction, so contention fails fast rather than blocking every write to `profiles`.

Nothing else. `verifications` is not referenced by the file; no verification record was re-evaluated, promoted, demoted, approved or rejected.

### Verified in production, after applying

| Check | Result |
|---|---|
| `unverified` | **8** |
| `company_verified` | **1** |
| Null values | **0** |
| Invalid values | **0** |
| Column nullability | **`NO`**, default `'unverified'::text` |
| Constraint | `CHECK (verification_level = ANY (ARRAY['unverified','identity_verified','company_verified']))` |
| `verifications` | review 4, rejected 2, pending 2, verified 1 — **unchanged** |
| Migration ledger | **40 → 41**, exactly this migration, sha matching |
| publication-gate tests | 45 passed |
| verification/level tests | 13 passed |
| eligibility tests | 25 passed |
| Production build | `✓ Compiled successfully` |
| Smoke tests | `/`, `/market-signals`, `/find`, `/marketplace`, `/structure`, `/verify`, `/login` all 200 |
| RLS on `profiles` | anon read still returns `[]` |

### Decisions

- Owner authorised the application, including the `NOT NULL` step, which was outside the originally enumerated change list and raised before applying.
- Owner authorised the `lock_timeout` addition, merged as PR #92 so the applied file and the recorded file are identical.

### Risks / discrepancies

- None arising from this migration.

### Next

- None. This workstream is closed.

### Evidence

- PR #91 (application model, merged `f4bfde6`), PR #92 (`lock_timeout`, merged `3b09e4a`).
- Issue #86 — the agreed value set, ranking and legacy-writer mapping.
- `supabase/migrations/20260728d_verification_level_canonical.sql`, which carries its own probe, verify and rollback blocks.
- `docs/proposals/verification-level-remediation.md`.

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
