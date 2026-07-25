**Corrected Phase 0 Report**

**0. Audit Baseline**
The previous application-code audit was performed against the local checkout at `9fa0aa63d82cdaa3f34251e8ca526677647680ff`, PR #20. GitHub `main` is now at the PR #21 merge commit `f2e4ba68c8c972c44b0830c8acbb11bf736ff055`. PR #21 changed documentation and agent instructions only: `.agent/PLANS.md`, `AGENTS.md`, `docs/codex/*`, and `docs/ponte-authority/00-MASTER-IMPLEMENTATION-BRIEF.md`. Therefore the application-code audit remains applicable, but the prior report must not be read as a local inspection of the PR #21 application tree.

Governing corrections are from [Master Brief section 9](C:/dev/ponte/docs/ponte-authority/00-MASTER-IMPLEMENTATION-BRIEF.md:721), [section 10](C:/dev/ponte/docs/ponte-authority/00-MASTER-IMPLEMENTATION-BRIEF.md:908), and [section 13](C:/dev/ponte/docs/ponte-authority/00-MASTER-IMPLEMENTATION-BRIEF.md:1223).

**1. Executive Summary**
The repository contains useful infrastructure for intelligent entry, Find, Structure, verification, QO listing review, Market Signal handling, account gating, admin review, credits, Stripe, AI writeups, localisation and CI. It does not yet implement the Master Brief’s core architecture: Commercial Missions, Commercial Developments, Evidence Chains, Prepared Actions, Approval Requests, Executions, Mission Memory or Workspace outcomes as first-class objects.

The most reusable current areas are homepage intent parsing, `AccountGate`, HS search, Find/QO services, Market Signal public/private separation, verification purpose controls, listing publication gates and reviewer surfaces. The highest-risk gaps remain production schema drift, the `profiles.verification_level` type contradiction, Stripe webhook fulfilment non-atomicity, stale legal copy, direct AI calls outside the central wrapper, and missing exact approval/disclosure workflow for controlled introductions.

Production deployment, Netlify flags, Supabase production schema and live migration state are not verified.

**2. Current Route Inventory**
Localized routes build for `en`, `zh`, `es`, `ar`, `fr`, `pt`, `ru`, `de`, `hi`, `it`.

User routes: `/`, `/find`, `/find/o/[ref]`, `/structure`, `/market-signals`, `/market-signals/[id]`, `/marketplace`, `/marketplace/new`, `/marketplace/l/[ref]`, `/verification`, `/verify`, `/login`, `/account`, `/workspace`, `/admin`, `/admin/listings`, `/admin/signals`, `/admin/users`, `/admin/verifications`, `/about`, `/contact`, `/pricing`, `/privacy`, `/terms`, `/join`, `/learn/duties`, `/learn/trade-data`, `/offline`, `/dev/design`.

API/auth routes: `/api/brokerage/submit`, `/api/credits/balance`, `/api/credits/checkout`, `/api/cron/sanctions-refresh`, `/api/data/fx`, `/api/data/health`, `/api/founding/claim`, `/api/hs/search`, `/api/market-signals/investigate`, `/api/marketplace/assess`, `/api/marketplace/interest`, `/api/marketplace/submit`, `/api/me`, `/api/verification`, `/api/verification/select`, `/api/webhooks/stripe`, `/api/writeup`, `/auth/callback`, `/auth/confirm`, `/auth/signout`.

**3. Major Component And Service Inventory**
Reusable components/services include:

- Intelligent entry: `components/home/landing/PonteLanding.tsx`, `lib/landing/intent.ts`, `lib/landing/routing.ts`.
- Find/QO/MS: `components/find/*`, `lib/find/query.ts`, `lib/board/qualified-opportunity.ts`, `lib/board/live-deals.ts`, `lib/board/market-signals.ts`.
- Structure: `components/structure/StructureComposer.tsx`, `lib/structure/draft.ts`.
- Account boundary: `components/AccountGate.tsx`, `components/OtpInput.tsx`, `lib/auth/use-otp.ts`.
- Verification: `components/VerifyForm.tsx`, `lib/verification/pipeline.ts`, `purpose.ts`, `trust-score.ts`, `reconcile.ts`, `rescreen.ts`, `certificate.ts`.
- Listings and introductions: `components/ListingForm.tsx`, `components/InterestButton.tsx`, `components/find/RequestIntroduction.tsx`, `lib/interest/expression.ts`.
- Market Signals: `lib/market-signals/logic.ts`, `import-map.ts`, `lib/signals/investigation.ts`, admin signal actions.
- Credits/Stripe: `lib/credits.ts`, `lib/credits/packs.ts`, checkout and webhook routes.
- AI: central metered wrapper `lib/ai.ts`; older direct Anthropic helper `lib/ai-vet.ts`.
- Admin/reviewer: listing, signal, user and verification admin routes/actions.
- Platform: `middleware.ts`, `i18n/routing.ts`, `.github/workflows/*`, `netlify.toml`.

**4. Current API Inventory**
The current APIs support HS lookup, listing submission, interest requests, AI listing assessment/writeup, signal investigation, L2 verification and candidate selection, credit balance/checkout, Stripe webhook fulfilment, brokerage contact, sanctions refresh, FX/data health, founding referral claim and current-user lookup. They are reusable infrastructure, but they do not yet form the Phase 1 agentic workflow of Mission -> Development -> Prepared Action -> Approval -> Execution -> Workspace outcome.

**5. Current Database And Migration Inventory**
Repository migrations represent legacy shop tables, marketplace listings/media/docs, listing connections, translations, account briefs, AI usage/calls, credit ledger/purchases, verification cases/documents/trust components, sanctions entries/functions, HS catalog, desk radar/Market Signals, signal investigations and referral attribution.

Key hazards:

- `supabase/schema.sql` is incomplete and explicitly not a production restore source.
- `02_ponte_previews_bucket.sql` is documented as the auto-migration abort point.
- `supabase/pending/20260722a_drop_legacy_shop.sql` is intentionally pending.
- Several migrations mutate live auth/profile/credit state if applied.
- Production schema and migration ledger are not verified.

**6. Corrected Route Atlas Mapping**
- `E01-E04`: partially implemented by homepage intent capture and route choice. `E05` is unsupported or unsafe request, and is missing as a governed state. Evidence: [E05 definition](C:/dev/ponte/docs/ponte-authority/00-MASTER-IMPLEMENTATION-BRIEF.md:729).
- `F01-F06`: partially implemented by `/find`, QO detail and separate signal lane. Saved/watch is missing.
- `S01-S06`: partially implemented by `/structure`; persists into legacy listing submission, not the Master Brief mission/development model.
- `K01-K09`: partially implemented for L2 business/counterparty verification; L3/L4 and complete evidence receipt are incomplete.
- `I01-I07`: corrected family is Market Signal investigation. Current signal detail, `InvestigateButton`, `/api/market-signals/investigate` and admin signal statuses cover pieces of I01-I04/I07, but scope proposal, progress thread and complete investigation outcome are missing. Evidence: [I01-I07 definitions](C:/dev/ponte/docs/ponte-authority/00-MASTER-IMPLEMENTATION-BRIEF.md:767).
- `M01-M07`: missing as first-class Commercial Mission states.
- `D01-D05`: missing as first-class Commercial Development states.
- `X01-X07`: missing as a governed prepared-action, exact-preview, approval, idempotent execution and outcome system.
- `G01-G06`: partially implemented by `AccountGate`; `G05` is resuming your action, not E05. Evidence: [G05 definition](C:/dev/ponte/docs/ponte-authority/00-MASTER-IMPLEMENTATION-BRIEF.md:821).
- `H01-H07`: `/workspace` is only a lightweight current surface; H01-H03 and H07 are not implemented as the governed Workspace return.
- `B01-B08`: mostly missing; verification docs and listing docs are reusable infrastructure, not a Business Passport/Vault.
- `O01-O07`: corrected family is owned opportunities and controlled introductions. Current marketplace owner list, reconfirm action, pending requests, owner accept/decline, RequestIntroduction and InterestButton partially cover O01-O05; O06 blockers and O07 completed introduction with recorded disclosure/thread are incomplete. Evidence: [O01-O07 definitions](C:/dev/ponte/docs/ponte-authority/00-MASTER-IMPLEMENTATION-BRIEF.md:849).
- `T/P`: `T01` is opportunity-specific thread after introduction, `T02` is Ponte Desk/investigation thread, `T03` is deliberate document sharing. All three are missing as governed states. Evidence: [T01-T03 definitions](C:/dev/ponte/docs/ponte-authority/00-MASTER-IMPLEMENTATION-BRIEF.md:861).
- `A01-A09`: admin listing, signal, user and verification surfaces partially cover A02-A04 and some A09-like decisions. A01 priority operations, A05 investigation case, A06 introduction blocker, A07 agent/action exception and A08 source/notification failure are incomplete.
- `SYS`: partial through middleware, no-data/partial-failure patterns, CI and offline route; not consistently governed across all families.

