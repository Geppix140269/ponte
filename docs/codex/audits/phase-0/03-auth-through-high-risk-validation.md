**13. Authentication Boundaries That Can Lose Or Duplicate Work**
- `ListingForm` preserves text in `sessionStorage`; file inputs are lost through redirect login.
- `AccountGate` resumes once; failed post-auth material actions may require reopening.
- Listing creation has no idempotency key.
- Signal investigation can insert then fail email, making retry appear duplicate.
- Connection acceptance persists status before contact emails complete.
- Full-page `/login` preserves URL only, not modal or draft state.

**14. External Or Material Actions Lacking Deterministic Approval, Audit Or Idempotency**
- Listing create/edit lacks idempotency.
- Listing media/docs upload after listing insert can partially fail.
- Connection acceptance lacks exact disclosure preview, approval request, execution record and T01 thread.
- Signal investigation lacks scoped Ponte Desk thread and deterministic notification recovery.
- Stripe credit fulfilment is not atomic.
- Market Signal import can publish based on workbook flags when manually run.
- Seed/import/migration scripts are powerful service-role actions and require explicit production approval.

**15. Routes Reached From The Merged Homepage**
Evidence: [lib/landing/routing.ts](C:/dev/ponte/lib/landing/routing.ts:28).

- Find: `/find` if `NEXT_PUBLIC_FIND_JOURNEY=on`, else `/marketplace`.
- Structure: `/structure` if `NEXT_PUBLIC_STRUCTURE_JOURNEY=on`, else `/marketplace/new?type=requirement`.
- Check: `/verify?for=counterparty`.
- Investigate: `/market-signals`.

Production flag values are not verified.

**16. Homepage Assessment**
Retain and revise. The homepage is useful as J01/E01-E04 infrastructure, but it does not yet persist original words into a Mission, ask only the governing decisive clarification, or move into M/D/X/H states. It should become the entry into Phase 1, not be replaced by a static page or global repaint.

**17. Documentation Contradictions And Stale Status Records**
- `docs/platform/VERSIONS.md` contains stale branch/deploy and production-status records.
- `docs/platform` includes repo-reported production migration statements that were not independently verified here.
- `terms` and `privacy` do not match the current product behavior.
- `lib/ai.ts` claims every Anthropic call goes through the central wrapper, contradicted by `lib/ai-vet.ts`.
- Signal admin helper comments contradict server-action behavior around confirmed signals and linked listings.
- `verification_level` is represented as both numeric and text in repo evidence.

**18. High-Risk Claim Validation**
1. `profiles.verification_level` numeric-versus-text contradiction: supported by exact repository evidence, but production type is not verified. Numeric evidence: migration adds `verification_level int` at [20260721g_verification.sql](C:/dev/ponte/supabase/migrations/20260721g_verification.sql:172), pipeline writes `2` at [pipeline.ts](C:/dev/ponte/lib/verification/pipeline.ts:445), publication gate requires numeric level `>= 2` at [publication-gate.ts](C:/dev/ponte/lib/listings/publication-gate.ts:41) and [publication-gate.ts](C:/dev/ponte/lib/listings/publication-gate.ts:104). Text evidence: seed script says `verification_level is a TEXT enum` and writes `"company_verified"` at [seed-ponte-managed-qos.ts](C:/dev/ponte/scripts/seed-ponte-managed-qos.ts:117) and [seed-ponte-managed-qos.ts](C:/dev/ponte/scripts/seed-ponte-managed-qos.ts:128). Additional risk: `Number(p.verification_level)` appears in QO/live-deal paths, for example [live-deals.ts](C:/dev/ponte/lib/board/live-deals.ts:168).

2. Stripe webhook can double-grant credits after partial failure: supported. `fulfilCredits` inserts into `credit_ledger` before marking `credit_purchases` fulfilled at [stripe webhook](C:/dev/ponte/app/api/webhooks/stripe/route.ts:106) and [stripe webhook](C:/dev/ponte/app/api/webhooks/stripe/route.ts:119). The code comment explicitly states that a mark failure would make retry grant again at [stripe webhook](C:/dev/ponte/app/api/webhooks/stripe/route.ts:128). `credit_ledger` has an index on `ref`, not a unique constraint, at [20260721f_credits_and_ai_metering.sql](C:/dev/ponte/supabase/migrations/20260721f_credits_and_ai_metering.sql:33). `credit_purchases.stripe_session_id` is unique, but the ledger write is not transactionally tied to the status update at [20260722d_signup_credits.sql](C:/dev/ponte/supabase/migrations/20260722d_signup_credits.sql:70).

3. Market Signal import can automatically publish workbook-marked signals without individual human approval: supported, scoped to the manual service-role import script. `mapImportRow` sets `approved_signal` when `publishable && !review_required` at [import-map.ts](C:/dev/ponte/lib/market-signals/import-map.ts:139). It also sets `published_at` and `public_expires_at` for approved rows at [import-map.ts](C:/dev/ponte/lib/market-signals/import-map.ts:202). The script comment states the same rule at [import-market-signals.ts](C:/dev/ponte/scripts/import-market-signals.ts:5), then upserts rows into `desk_radar` at [import-market-signals.ts](C:/dev/ponte/scripts/import-market-signals.ts:186). This is not evidence it ran in production.

4. Owner acceptance can disclose contact details without the exact approval/disclosure workflow required by the brief: supported for the current legacy controlled-introduction path. Owner UI has direct accept/decline buttons at [marketplace page](<C:/dev/ponte/app/[locale]/marketplace/page.tsx:778>). `connectDecisionAction` accepts only `id` and `decision`, updates status, then sends both parties contact emails at [marketplace actions](<C:/dev/ponte/app/[locale]/marketplace/actions.ts:122>) and [marketplace actions](<C:/dev/ponte/app/[locale]/marketplace/actions.ts:153>). `sendConnectAccepted` renders counterparty email as `mailto:` at [email.ts](C:/dev/ponte/lib/email.ts:316). Repository search found no implemented `approval_requests`, `prepared_actions`, `executions` or exact disclosure preview outside docs.

5. Terms and Privacy materially contradict current product behaviour: supported. Terms says introductions are made only after NCNDA and written fee terms at [terms page](<C:/dev/ponte/app/[locale]/terms/page.tsx:71>), while the current connection email says parties can reach out directly and connecting is free at [email.ts](C:/dev/ponte/lib/email.ts:333). Privacy still references products, orders, reports, cart and Terms of Sale at [privacy page](<C:/dev/ponte/app/[locale]/privacy/page.tsx:60>), [privacy page](<C:/dev/ponte/app/[locale]/privacy/page.tsx:69>), [privacy page](<C:/dev/ponte/app/[locale]/privacy/page.tsx:88>) and [privacy page](<C:/dev/ponte/app/[locale]/privacy/page.tsx:122>). Middleware redirects `/cart`, `/checkout` and `/order-success` to `/marketplace`, showing those are legacy surfaces at [middleware.ts](C:/dev/ponte/middleware.ts:28).

6. `lib/ai-vet.ts` bypasses the central metering/audit wrapper: supported. Central wrapper says all Anthropic calls should go through `lib/ai.ts` and records `ai_calls` at [ai.ts](C:/dev/ponte/lib/ai.ts:1) and [ai.ts](C:/dev/ponte/lib/ai.ts:112). `lib/ai-vet.ts` directly calls `fetch("https://api.anthropic.com/v1/messages")` with `ANTHROPIC_API_KEY` in `vetListing`, assessment, translation and account brief paths at [ai-vet.ts](C:/dev/ponte/lib/ai-vet.ts:103), [ai-vet.ts](C:/dev/ponte/lib/ai-vet.ts:226) and [ai-vet.ts](C:/dev/ponte/lib/ai-vet.ts:310).

