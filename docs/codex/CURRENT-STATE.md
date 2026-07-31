# Current state

**Reconciled:** 28 July 2026  
**Entry authority:** `docs/ponte-authority/00-NORTH-STAR-ENTRY-ARCHITECTURE.md`, amended 26 July 2026 (Ponte Desk selected)  
**Design authority:** `design/authority/PONTE_DESIGN_CONSTITUTION_v1.md` **v1.1**, ADR-0002, ADR-0010 (complete-interface scope) and ADR-0015 (contrast and colour remediation, amends sections 6, 15, 18 and 22)  
**Contrast baseline:** `docs/codex/audits/contrast-remediation/CONTRAST-AUDIT-2026-07-29.md`. 163 pairs measured, 96 short. Remediation is **Designed, not started**; see `docs/plans/active/contrast-and-colour-remediation.md`  
**Bridge authority:** `design/authority/bridge/v1/` (merged; production primitives incomplete. `components/ponte/bridge/BridgeRoute.tsx` is the Family and Action Bridge and is the only one built)  
**Language authority:** `docs/ponte-authority/PT-PRODUCT-2026-07-26-02-ENGLISH-ONLY-INTERFACE-POLICY.md`  
**Market discoverability authority:** `docs/ponte-authority/PT-PRODUCT-2026-07-28-01-COMPLETE-MARKET-DISCOVERABILITY-AND-CATEGORY-FIRST-JOURNEYS.md`  
**Deal Room authority:** `docs/ponte-authority/PT-PRODUCT-2026-07-27-01-DEAL-ROOM-PRODUCT-CONTRACT-V1.md`  
**Deal-to-Room hierarchy:** `docs/ponte-authority/PT-PRODUCT-2026-07-27-02-DEAL-TO-ROOM-BRANCHING-MODEL.md`  
**Deal Room commercial authority:** `docs/ponte-authority/PT-COMMERCIAL-2026-07-31-01-DEAL-ROOM-TRANSACTION-INFRASTRUCTURE-PRICING-AUTHORITY.md` (Deal Room-Only Pricing Authority, accepted 31 July 2026, recorded by ADR-0020, **delivered by open PR #155**)  
**Superseded commercial records (history only):** `PT-COMMERCIAL-2026-07-27-01-DEAL-ROOM-MONETISATION-POLICY.md`, `PT-COMMERCIAL-2026-07-27-02-DEAL-ROOM-LAUNCH-PRICING-V1.md`, `PT-COMMERCIAL-2026-07-27-03-STARTER-DEAL-ROOM-ACCESS.md`, `PT-COMMERCIAL-2026-07-27-04-DEAL-ROOM-LAUNCH-MODEL-V2.md`  
**Repository:** `Geppix140269/ponte`  
**Canonical branch:** `main`  
**Unified market decision:** `docs/decisions/ADR-0001-unified-trade-market.md`  
**Product intake decision:** `docs/decisions/ADR-0012-ai-product-intake-and-document-to-deal-flow.md` (accepted; on branch `product/ai-document-product-intake`, not yet merged)  
**Market discoverability decision:** `docs/decisions/ADR-0011-complete-market-discoverability-and-category-first-journeys.md`  
**Deal Room product decision:** `docs/decisions/ADR-0003-deal-room-product-contract.md`  
**Deal Room detailed definition decision:** `docs/decisions/ADR-0008-detailed-deal-room-product-definition.md`  
**Deal Room technical decision:** `docs/decisions/ADR-0009-deal-room-technical-architecture.md` (accepted as amended, 29 July 2026)  
**Deal Room pricing decision:** `docs/decisions/ADR-0020-deal-room-only-pricing-authority.md` (accepted 31 July 2026; supersedes ADR-0004, ADR-0005 and ADR-0006 within their commercial scope)  
**Deal Room monetisation decision:** `docs/decisions/ADR-0004-deal-room-monetisation-boundary.md` (partly superseded by ADR-0020)  
**Master-room hierarchy decision:** `docs/decisions/ADR-0005-free-deals-and-counterparty-room-branches.md` (partly superseded by ADR-0020)  
**Starter Deal Room decision:** `docs/decisions/ADR-0006-starter-deal-room-access.md` (**superseded** by ADR-0020; there is no Starter Deal Room)  
**Phase A evidence:** `docs/codex/audits/issue-42-phase-a/PHASE-A-FINAL-REPORT.md`

## Status vocabulary

Use only these labels:

- Not started
- Designed
- Partially implemented
- Implemented on branch
- On `main`
- Deployed
- Production-verified
- Blocked
- Deprecated

Code on `main` is not automatically deployed, enabled or production-verified. An accepted ADR is not proof that its implementation is complete.

## Implementation summary

| Area | Repository status | Production status | Notes |
|---|---|---|---|
| Source-of-truth operating procedure | On `main` | Operating rule | `AGENTS.md`, `CLAUDE.md`, SOP, ADRs and governance checks are canonical. |
| Single-generation product cutover — route authority (PR 1) | Implemented on branch `claude/ponte-single-generation-cutover-479321` | Not merged; no production action | Owner-authorised 30 July 2026 (see DECISION-LOG). `lib/navigation/route-manifest.ts` classifies every route (`canonical`/`redirect`/`internal`/`feature_gated`/`development_only`); `lib/navigation/__tests__/route-manifest.test.ts` (in `npm test`) enforces manifest integrity, filesystem coverage and three shrink-only cutover ratchets. **Additive: no route retired, no flag flipped, no runtime change.** Programme plan and remaining PRs 2-8: `docs/plans/active/single-generation-cutover.md`. Owner provisions staging; `member_business` verification to be decoupled from credits (ADR, PR 6). |
| Single-generation product cutover — authentication and account (PR 2) | Implemented on branch `claude/ponte-issue-130-stage-1-77ca3b` | Not merged; no production action | Issue #130 Stage 1 (controller-amended). Generic post-sign-in destination is `/opportunities` in all three sign-in exits; a journey-specific same-site `next`/`redirect_to` is preserved and wins. Sanitisation is one shared, unit-tested helper `lib/auth/next-destination.ts` (`safeNextPath`/`safeRedirectTo`: default `/opportunities`; preserve same-site path/query/hash; reject protocol-relative/backslash/external/scheme/control-char; accept same-origin absolute `redirect_to` for confirm only). The signed-in Desk account control (`DeskAccount`) opens `/account` (rebuilt settings), not `/opportunities`. `/account` rebuilt on the Desk shell (`components/desk/DeskShell.tsx`) carrying profile, company, member-business status and sign-out only — the marketplace/listings block and its `/marketplace` link are gone, and it now renders `PonteIcon` keys instead of `lucide-react`. `/join` renders no UI: `middleware.ts` captures the referral cookie (first-touch, `<code>.<issuedAt>`) and forwards to `/login`; the legacy `/join` page and `CaptureReferral` component are deleted and the manifest's `/join` is `retirementImplemented: true`. AccountGate reads a credit balance and prints cost copy only in the paid counterparty context (`context === "verify"`); ordinary sign-up, publish and interest show no credit/cost/top-up language. The pending action still runs exactly once (`ran` guard). Two cutover ratchets tightened: `RETIRED_LINK_BASELINE` and `LUCIDE_BASELINE` drop the account page. `npm run verify` green. **Not deployed, not production-verified.** The deeper `member_business` verify-page/pipeline credit decoupling remains PR 6 (ADR required). |
| Single-generation product cutover — public market and detail (PR 4) | **On `main`** via PR #166, merge commit `1006208` | Not deployed; deployed commit unrecorded | Issue #130 cutover PR 4. `/find/o/[ref]` is the one public Member Opportunity record page. `lib/board/qualified-opportunity.ts` is the single reader behind it and applies the same publication contract the retired obsidian detail page applied (`isPubliclyCurrent`, `isPubliclyEligibleVerification`, `truthfulLabels`), so the two surfaces could not disagree while both existed. Every in-product link to the obsidian listing detail was repointed to `/find/o/[ref]`. The obsidian page itself was left rendering; retiring it is PR 5. |
| Single-generation product cutover — member operations and board retirement (PR 5) | Implemented on branch `claude/ponte-issue-130-cutover-pr5` | Not merged; no production action | Issue #130 cutover PR 5, the retirement of the obsidian `/marketplace` board. `app/[locale]/marketplace/page.tsx` and `app/[locale]/marketplace/l/[ref]/page.tsx` are **deleted**; both paths are permanent (308) redirects in `middleware.ts`, the second carrying the reference across so a forwarded link still opens its own record at `/find/o/<ref>`. `/api/marketplace/*` is untouched and is not a retirement target. The `/cart`, `/checkout`, `/order-success`, `/brokerage` and `/network` legacy entries now name `/find` directly, removing a double hop. Every public entrance (PWA shortcut, sitemap, contact, both learn pages, `SiteHeader`, `SiteFooter`, `BottomNav`, the homepage showcase) names `/find`; the five PL-029 owner-action emails name `/opportunities` (manage/withdraw, open your listing, let it expire) or `/workspace` (review the request, open in Ponte). The board's server actions moved to `app/[locale]/_actions/listings.ts`, a private folder that can never be a route, and their `RETURN_PATHS` allowlist no longer admits the retired path. `lib/landing/routing.ts` sends the Find intent to `/find` unconditionally: `NEXT_PUBLIC_FIND_JOURNEY` no longer governs a destination because the surface it fell back to no longer exists (`NEXT_PUBLIC_STRUCTURE_JOURNEY` is untouched and remains PR 3's decision). Three cutover ratchets emptied: `RETIRED_LINK_BASELINE`, `REDIRECT_CHAIN_BASELINE` and the marketplace half of `LUCIDE_BASELINE`. **A fourth capability was found on the board with no home and is recorded as OD/PL follow-up in the ExecPlan progress log:** handing in a saved draft (`submitDraftAction`) and the only in-product link that reopens a member's own record (`/structure?edit=<id>`) existed nowhere but the board, so both were carried to `/opportunities` alongside the returned-record reason. `npm run verify` green. **Not deployed, not production-verified; the carried-across controls await owner acceptance.** |
| `/admin` migrated to the Desk generation (#134) | Implemented on branch `claude/ponte-issue-134-admin-desk`; PR #137 | Not merged; no production action | Closes the P0 the owner observed on 30 July 2026, a Restricted screen inside the retired obsidian Marketplace generation. `components/ChromeGate.tsx` bares `/admin` and `/admin/*`, so the legacy `SiteHeader`/`SiteFooter`/`BottomNav` no longer wrap it; `app/[locale]/admin/layout.tsx` supplies `DeskShell` once and renders the unconfigured, unauthenticated-redirect and permission-denied states in the Desk generation; the overview, users, signals, verifications and listings pages are migrated to desk classes and tokens, with status on `--pos`/`--neg`/`--review` and never gold. Icons are `PonteIcon` registry keys (no `lucide-react`, no raw `<svg>`). Removed the retired-shop counters "Legacy orders" and "Legacy products" and the "Seed the catalogue" copy; "Awaiting vetting" became "Submitted" and "Approved listings" became "Reviewed"; the `nav-glass` Admin lockup is gone. Behaviour, data reads, server actions and forms are unchanged. `npm run verify` green; local DOM evidence confirms the cream Desk shell and no legacy chrome at desktop and 390x844. **Signed-in admin states (authorised overview, permission denied) are not locally renderable and await owner visual acceptance on the preview.** |
| Member-business verification is free (#135, ADR-0018) | Implemented on branch `claude/ponte-issue-135-verify-credit-free`; PR #138 | Not merged; no production action | Closes the P0 commercial defect the owner observed on 30 July 2026. `member_business` verification performs no balance lookup, no cost display, no top-up link, no HTTP 402, no credit spend, no ledger entry and no refund: the single `spendCredits` call in `lib/verification/pipeline.ts`, and the balance read plus the 402 reply in `app/api/verification/route.ts`, are guarded by a `paidPurpose` derived from the already-normalised purpose, so a free run leaves `credit_ledger_id` null. `app/[locale]/verify/page.tsx` reads a balance only for the paid path and passes `cost=null` otherwise; `components/VerifyForm.tsx` renders no balance, cost, shortfall or top-up when the check is free and states plainly that it is free. Signed-out gate copy is purpose-aware (`bodyBusiness`/`bodyCounterparty`), a defect caught by browser evidence rather than source review. `counterparty_check` keeps its paid rule and stays commercially separate. ADR-0018 records the durable decision; `lib/verification/__tests__/member-business-free.test.ts` (8 checks in `npm test`) fails if any guard is lost. `npm run verify` green. **Still open on #135: the route renders the intermediate `PonteShell`, not `DeskShell`** (required outcome 3, separate follow-up PR). **Not deployed; signed-in acceptance outstanding.** |
| Contrast and colour remediation | Designed | Not started | ADR-0015 accepted 29 July 2026, with owner sign-off S-1 to S-5 the same day; Constitution v1.1. Governance records only. **No production token, stylesheet or component has changed.** Stage 0 is the governance PR and is the only prerequisite; the two validation failures previously listed here were already fixed on `main` in PR #98, corrected in ADR-0015 S-2. Stage 1 covers structural tokens, the value-neutral alias conversion of four duplicated stylesheets, Bridge deck and passive pier contrast, the 11px mobile caption floor and the Bridge manifest decoupling as step 0. Stage 2 (the `--pf-interact-*` family) follows, journey by journey. LB-002 and LB-003 open with fixed closure criteria; `main` already holds LB-001 for the Deal Room loop. OD-006, OD-007 and OD-008 decided. |
| Complete Market Signal discoverability and category-first journeys | Designed and owner-accepted on branch `agent/record-market-discoverability`; development brief issued to Claude Code | Not implemented or production-verified | ADR-0011 makes every eligible signal discoverable and requires Trade Services and Distribution to begin with structured categories. The current 60-record board, generic non-product subject field and approximately 160-row upload remain implementation/reconciliation work. |
| Deal Room Product Contract v1 | Designed and owner-accepted on branch `decision/deal-room-product-contract-v1` | Not started | Product foundation only: formal admission, Deal Room-ready Business Passport, agreed procedure, evidence, decisions, blockers, stable progress and closure. No design, code, schema, migration, deployment or production action. |
| Deal-to-Room and Sub-Room Model | Designed and owner-accepted on branch | Not started | Structured Deals may be published free. One paid master Deal Room corresponds to one Deal and may contain any number of private related sub-rooms. Five room slots mean five concurrent master Deals, not five conversations. |
| **Deal Room-Only Pricing Authority (ADR-0020)** | **Recorded on branch `claude/deal-room-only-pricing-reconciliation`. The authority file itself is delivered by open PR #155 and is not yet on `main`** | **Not started. No production action of any kind** | Owner decision of 31 July 2026: the Deal Room is Ponte's only paid product, **$79 USD for 30 active days**, five concurrently active private principal-counterparty Deal Branches included, **$15 USD** per additional concurrent branch, capped at **$199 USD** per Master Deal Room per 30-day period, **USD only**, five languages included. Supersedes Starter access, Portfolio subscriptions, Ponte Credits, credit-funded rooms, paid verification, paid verification badges, public Ponte Desk packages, retainers, success fees, commissions, percentage-of-transaction pricing, euro Deal Room prices and unlimited free principal-counterparty branches. **Recording the decision is not implementing it.** There is no pricing engine, no branch-counting predicate, no billing record, no `paid` entitlement kind, no Stripe object and no charge. `deal_room_entitlements.kind` still admits only `starter`, `sponsored` and `waived`, and the table holds no price, currency or payment reference. Programme: `docs/plans/active/deal-room-transaction-pricing.md`. Inventory: `docs/codex/audits/deal-room-pricing/INVENTORY-2026-07-31.md`. Open owner decision on paid `counterparty_check`: **OD-011**. |
| Deal Room monetisation policy | Designed and owner-accepted on branch; **partly superseded 31 July 2026** | Not started | The upstream market creates liquidity and the master Deal Room captures value: still true, and strengthened. Its Starter exception, Portfolio/Credits entitlement sources, paid verification, Ponte Desk packages, retainers, success fees and commissions are superseded by ADR-0020. |
| Starter Deal Room principle | **Superseded 31 July 2026. Will not be implemented** | Not started, and now never will be | ADR-0020 retires the Starter Deal Room. The entire pre-activation journey is free for everyone instead, without an entitlement or an organisation limit. `deal_room_entitlements.kind = 'starter'` and `STARTER_LIMITS_PROPOSED` in `lib/deal-room/entitlement.ts` are legacy values awaiting retirement (PL-036). |
| Deal Room Launch Model v2 and Launch Pricing v1 | **Superseded 31 July 2026, never approved** | Not started, and now never will be | The €149/€1,490 Portfolio subscription, the €100–€400 credit packs, the 60-credit 90-day activation and the four-level ladder are all retired by ADR-0020. Preserved as history. |
| **The public `/pricing` page contradicts binding commercial authority** | **On `main`, unchanged by this work** | **Deployed state unknown; the deployed commit is unrecorded (see the note below this table)** | `/pricing` publishes four engagements — a free marketplace, **Credits at 2 per counterparty check**, a **Desk success fee** and a **Desk monthly retainer** — and never names the Deal Room. Three of the four are prohibited by authority §15. The site-wide footer blurb repeats "success fee or retainer" on every page, and `/about` repeats credits and success fees three times, including in the legal-entity paragraph. Recorded as **proposed LB-014** for owner classification. **Deliberately not changed by this PR**, which is authority reconciliation only. |
| Ponte Design Constitution v1 | Implemented on branch `governance/ponte-design-constitution-v1` | Not deployed; authority only | Owner approved 27 July 2026. Becomes binding when merged. Includes ADR-0002, CODEOWNERS, PR design gate and governance enforcement. |
| Ponte Bridge System v1 | Implemented on the authority branch | Not implemented in production | Approved for Family, Action, Completion, Journey, Counterparty and Deal Room bridges, mobile, reduced motion and gold italic landing emphasis. |
| Ponte Desk and commercial journey repair | On `main` via PR #49, merge commit `85f0338d251e68cea583793adaea2379d77ddc03` | Deployed; production baseline visually inspected | Landing actions, services/distribution composer paths, signal actions, sign-in and Your records are restored. The current family/action card grid is temporary. |
| Landing bridge implementation | On `main` via PR #63, mobile overlap corrected by PR #65 | Not independently production-verified | The temporary family/action card grid is replaced by the approved Family Bridge and Action Bridge, drawn from the recovered engine's own cubic Bezier geometry. Product sectors and all HS copy removed from the landing by owner decision. All nine destinations preserved and asserted. Evidence: `docs/codex/audits/constitution-rebuild/evidence/landing-bridges/`. |
| English-only interface policy | On `main` | Operating rule | Interface and Ponte-controlled content are English only; multilingual input remains supported. |
| Unified three-family market contract | On `main` via ADR-0001 | Not fully implemented as a production data contract | Products, Trade services, and Distribution and representation are equal families, each supporting Market Signals and Member Opportunities. |
| Issue #42 Phase A reconciliation | Complete evidence package | Production-verified for market-record scope | No runtime or database change. |
| Product Market Signals | On `main`; category filtering and complete-inventory counting on branch `feature/category-first-market-taxonomy` (PR #70) | 3,517 eligible at 26 July probe; 3,491 eligible at 28 July capture (the public window is a rolling 90 days, so the total falls on its own); board reads one page of 60 | Public signals have source category but no HS code, and **no signal carries a canonical category**. PR #70 moves approval and public expiry into the query, so the printed total is eligible records rather than stored approved rows, and adds structured filters. The classification columns are live in production as of 28 July 2026, and **no record carries one**: applying the SQL created columns and classified nothing. **Free-text search and pagination are implemented** (LB-007, this PR): `/market-signals` carries a labelled GET search form, `?q=` searches every public column across the complete eligible table through a governed commercial alias vocabulary, results are ranked by relevance when a query is present and by `spotted_at desc, id desc` otherwise, and Previous/Next pages reach every matching record with the whole search state in the URL. **Classification of the existing inventory is still NOT implemented**, so a search reaches a record through its public text and not through a canonical key (PL-017), and the coverage states continue to say so. The approximately 160-row upload has not been reconciled (PL-018). The `pg_trgm` index migration `20260730a` is written and **not applied**; the search is correct without it (PL-016). The predicate was **executed read-only against production PostgREST on 30 July 2026** (`scripts/verify-signal-search.ts`, evidence `docs/codex/audits/market-signals-search/2026-07-30-postgrest-verification.txt`): 3,458 eligible signals, the nested predicate parses, `gas oil` reaches 59 records including EN590-titled ones and zero diesel-equipment records, and qualifiers are mandatory on live data. **The three counts behind the family filters were also executed** and are **0 Products, 0 Trade services, 0 Distribution** of those 3,458: no eligible record carries a canonical `market_family` at all. The records are product-oriented in substance and every one of them is live and reachable by search; they are simply not reachable by the family filter, which reads that column and nothing else. So the board offers no family selector, and that absence is a measurement rather than a design choice. Both halves of the gap - classifying the existing product inventory, and sourcing genuine service and distribution inventory - are PL-020. Accent handling is asymmetric and documented as such (PL-019). **Not deployed and not exercised by a member**, so LB-007 stays open. |
| Native Member Opportunities | On `main` | 0 exact public records under the current eligibility contract at 26 July probe | Four listing rows existed; two approved/current, zero with passing bound member-business verification. |
| Trade services inventory and entry | Category-first entry implemented on branch `feature/category-first-market-taxonomy` (PR #70) | 0 legacy service rows at 26 July probe | Eleven canonical categories and about 120 subcategories in `lib/taxonomy/services.ts`. The composer opens on clickable categories rather than a generic subject field, and Find can be walked by category without naming a product. Canonical family and intent are first-class columns in production: `20260728a_market_classification.sql` was applied by hand on 28 July 2026 with owner authorisation. No record is classified yet. |
| Distribution and representation inventory and entry | Category-first entry implemented on branch `feature/category-first-market-taxonomy` (PR #70) | No canonical external inventory at 26 July probe | Partner type, product sector, territory and relationship structure are now four separate accepted concepts rather than one flat list. Every legacy `DISTRIBUTION_MODES` value is mapped; `route` is preserved as the compatibility value `route_to_market` and **not** consolidated, pending explicit owner confirmation. |
| Automated listing publication (ADR-0013) | Implemented on branch `fix/automated-listings-email-system` | Not merged, not deployed, migration not applied | A structurally valid listing from a verified member publishes without an administrator. Human review is exception-based. Verification remains blocking by owner decision, so this changes latency for verified members and does not by itself increase the number of published listings — the 26 July probe recorded zero members with a passing bound verification. |
| Unified transactional email system (ADR-0013) | **Merged to `main`** in PR #74 at `b378ad2` on 28 July 2026 | Deployment state unrecorded — see the note below this table | All 13 application-generated templates render through one shell derived from `design-system/ponte-flow/tokens/`. Every email has HTML and plain text. The retired `#0F1E3C`/`#E8A020` palette and the "verified network" tagline are gone. **This row said "Implemented on branch, not merged, not deployed" until 30 July 2026, which was wrong for two days** — the same stale-status class PL-009 records. Supabase Auth templates are provider-side; see the row below. |
| Authentication and operational email (ADR-0017, **LB-012**) | Implemented on this branch | **Nothing applied to production, and the deployed commit is unknown** | The Supabase Auth OTP template is now a generated, committed, checksummed file (`supabase/templates/auth-otp.html`) built through the same shell as the 13 application templates, replacing prose fragments a person had to reassemble by hand — which is where a fused `padding:24px 32border-bottom` can come from, and that string exists in no revision of this repository. `lib/email/audit.ts` reads every generated email as a document (tag structure, attribute well-formedness, fused declarations) and is proved to fail on the reintroduced defect. One template for both Confirm signup and Magic Link; a code and never a link; ten minutes from one constant; `Ponte Trade <auth@ponte.trade>` and `Ponte Trade <hello@ponte.trade>`, the second corrected here from a bare address; open and click tracking disabled. **The dashboard templates, SMTP sender name, OTP expiry and Resend tracking toggles are all unapplied**, and whether `ponte.trade` publishes DKIM, SPF and DMARC is unrecorded (**OD-010**). LB-012 closes only on fresh Gmail, Yahoo and Outlook sends that render correctly and arrive outside spam. |
| Structured listing quantity (ADR-0013) | Implemented on branch | Not merged; migration not applied | Adds mode (exact/approximate/minimum/maximum/range/negotiable/on request), decimal support and separator-safe parsing. Fixes the composer defect where a displayed `10,000` was a render-time fallback the form state never held, so an unedited quantity submitted as null. |
| Listing exception console (ADR-0013) | Implemented on branch | Not merged, not deployed | `/admin/listings` leads with reported, flagged, suspended, unverified-submitter and incomplete cases, ordered by reason then severity then oldest. Each prints a machine-readable reason code, a human sentence, the severity and the automated findings verbatim. Filters cover status, reason, severity, listing type, date range and a member/business/reference search, all as shareable URLs. Published listings appear in their own section and are explicitly not described as awaiting approval. Suspend, reinstate and return-to-member actions were added; every operator status change writes a `listing_events` row with an `admin` actor. |
| Verification/publication eligibility | On `main` | Production defect confirmed | Stored verification vocabulary and numeric code comparison require separate integrity work. |
| AI product intake and document-to-deal (ADR-0012) | Implemented on branch `claude/ai-product-intake-flow-4bcd56`, PR #71 | Not deployed | Both product intents (`offer_product`, `source_product`) now enter through one shared intake: describe, upload or browse, on the approved Bridge. `lib/products/` holds the curated catalogue, a six-stage resolution cascade (exact, fuzzy, model identification, HS 2022 fallback, sector mapping, clarification), the document scan, the extraction and the intake state machine. The curated catalogue is depth, not a ceiling: a product outside it is identified, marked `ai_identified` and confirmed by the member before any draft is created. HS classification is a suggested downstream field, not the gate. Trade services and Distribution keep their own ADR-0011 category-first journey: since PR #70 merged, `IntentStep` routes on `needsHsCode()` so Products reach the intake and those two families reach `ClassifyStep`, and neither is ever asked for a customs code. One composer, one submit path; the family decides only which question opens it. A resolved product now also carries its ADR-0011 `productSector` key, derived from the customs chapter rather than asked for a second time. **No migration, no feature flag, no deployment.** The uploaded document is held for the session and not stored. Plan: `docs/plans/active/ai-product-intake-and-document-to-deal.md`. Evidence: `docs/codex/audits/ai-product-intake/evidence/`. Durable document storage is deferred by owner decision to issue #72. **Platform UX audit, 30 July 2026 (branch `claude/platform-ux-audit-0094f9`):** two launch blockers fixed. LB-010 - the fuzzy stage now corrects a single mistyped word against catalogue words, not only whole terms, so `cementt` resolves for free instead of dead-ending. LB-011 - the review screen no longer prints all thirteen commercial terms as empty rows with per-row Add controls and a "still unstated" warning; stated terms show, optional terms collapse behind one grouped control, and contract-level fields are no longer demanded before a draft exists. Audit: `docs/codex/audits/2026-07-30-platform-ux-audit/`. |
| Family-specific downstream composer (ADR-0014 §1-§8) | **Merged to `main`** in PR #89 (`923d1e3`). ADR-0014 accepted 29 July 2026 | **`20260728c` and `20260728e` APPLIED to production on 29 July 2026** at 15:42:54 and 15:44:45 UTC, both probe-verified; see `DATABASE-STATE.md`. Not yet deployed | Completes the family architecture after classification. `lib/structure/procedures/` holds one commercial procedure per family behind a central registry, and the shared composer now renders the model each procedure supplies instead of one product-shaped set of questions. Before this, `COMPLETION_QUEUE` was a fixed list of eight product fields for every family, `bucketize()` counted quantity, route and Incoterm as universal facts, `blockers()` demanded a quantity and an Incoterm from every record, and the preview printed HS code, quantity, frequency, route and Incoterm unconditionally: a freight forwarder was told an Incoterm was blocking publication and shown five product rows reading "Not stated". Trade services now answer scope, coverage, specialisation, capability, engagement basis and availability; Distribution answers objective, product or sector scope, channels, capabilities, commercial expectations and timing. Service capacity is stored as a capability and a distribution opening order as a commercial expectation, never as a product quantity. Cross-family sanitisation now covers the commercial fields as well as the classification, and the API refuses a product-only field or another family's terms rather than ignoring them. Products behaviour is unchanged, including the quantity fix. `service_terms` and `distribution_terms` are additive jsonb in `20260728e_family_commercial_terms.sql` (renamed from `20260728d_` on 29 July 2026, PL-004), **written and not applied**; the route already retries the write without them and the terms also travel in `details`. Two `main` defects were repaired in passing: a duplicate `"test"` key in `package.json` whose winning copy silently dropped the eligibility, quantity and email-system suites, and `familyOf()` in `lib/listings/eligibility.ts` not recognising the canonical `services` family value. |
| Family-aware published record, and consented discards (ADR-0014 §9-§10) | **Merged to `main`** in PR #100. ADR-0014 accepted 29 July 2026 | **`20260728e_family_commercial_terms.sql` APPLIED to production on 29 July 2026** at 15:44:45 UTC, SHA-256 `4224fa27...de9f18fa8` matching the ledger byte for byte, probe-verified. Not yet deployed | The follow-up to PR #89, which fixed the composer and stopped at its edge. `lib/listings/record-facts.ts` is now the one presenter for a STORED record, and the public detail page (`/find/o/[ref]`), the shareable marketplace page (`/marketplace/l/[ref]`), the member's own records (`/opportunities`), the workspace rows, the admin exception console and the member emails all read through it. Before this, each printed its own fixed list of product columns, so a published freight-forwarding record answered Quantity, Incoterm, HS code, Origin and Destination with "Not stated" and its eight stated service terms appeared nowhere but the prose; every member email called every record an "offer" and printed a "Quantity" row. `FACT_LABELS` is pinned against `structure.field.*` by test, so a published record cannot name a fact differently from the composer that collected it. `lib/structure/discard.ts` computes what a classification change would destroy and `ClassifyStep` asks before writing — only when something real would be lost, and naming only what would actually be lost. The submit route's missing-column fallback moved out of an untested closure into `lib/listings/write-fallback.ts`: an absent `service_terms` or `distribution_terms` now provably costs a record its family terms and none of its live classification columns. Both public readers degrade the select when the unapplied family-terms columns are absent, so a pending migration cannot 404 a shareable link. Discovered and NOT fixed: PL-013, the canonical key resolvers having no callers. |
| Deal Room launch slice (issue #97, ADR-0009) | **Merged to `main` at `42a9d22`** on 29 July 2026 (PR #98), after Gate A preflight, Gate B implementation and three rounds of owner trust corrections, with technical and design approval | **Gate C Approval 1, 30 July 2026: `20260729a` and `20260729b` applied to production. Approval 1 is still incomplete.** 15 tables, RLS on all 15, **14 policies - one SELECT per member-facing table, all scoped to `authenticated`, zero INSERT/UPDATE/DELETE anywhere**, 23 functions (21 SECURITY DEFINER, all with a pinned `search_path`); ledger 43 to 45, both checksums matching byte for byte. `20260729b` was refused at first attempt (**LB-005**, since corrected and applied cleanly at 05:59:43 UTC on 30 July); `20260729c` not attempted - the bucket is Approval 2. **Corrective migration `20260730b` applied 30 July 2026 at 07:59:45.928 UTC; ledger 45 to 46. The anonymous execution path is CLOSED:** `anon` holds EXECUTE on **0 of 23** `deal_room_*` functions (from 23), `PUBLIC` holds 0, and an anon-key RPC to `deal_room_log_event` returns `42501 permission denied` where it previously returned the `23503` FK violation that proved the body was executing. Nothing else moved - nine before/after md5 fingerprints identical across bodies, policies, triggers, indexes, constraints, columns, RLS state and project-wide default privileges. **LB-008 is RESOLVED.** `20260730c` (applied 08:26:17.995 UTC, ledger 46 to 47) removed `authenticated` EXECUTE from the three functions `20260730b` had left, so production now reports the intended contract exactly: `anon` **0 of 23**, `PUBLIC` **0**, `authenticated` **exactly 19 matched by name**, `service_role` **23 unchanged**, all four internal functions reachable by `service_role` alone. **The previously pending real-authenticated direct-RPC probe passed** on 30 July 2026 as the dedicated QA member `deals@ponte.trade` (`profiles.role = customer`, no admin or service-role privilege): 19 of 19 intended functions usable, 4 of 4 internal denied, `deal_room_log_event` returning PostgreSQL `permission denied for function`. No existing account or profile was modified. `npm run deal-room:acl-verify` is the standing catalogue witness and exits 0. **Of the earlier fourteen required verifications the result was 11 / 1 / 2: eleven passed, one failed, two pending and unproved.** That failure was requirement 11: `anon` holds EXECUTE on all 23 `deal_room_*` functions, including `deal_room_log_event()`, which by design has no authorisation check of its own. **That is LB-008.** The two pending are requirements 12 and 13, entitlement fail-closed and cross-room isolation, which need real member sessions against a real room and belong to Approval 3; the policy predicates encode them, which is not the same as proof. The file's `revoke ... from public` removed the PUBLIC grant but not Supabase's explicit default-privilege grants to `anon` and `authenticated`. Fail-closed today - `deal_room_activity_events.room_id` references `deal_rooms` and there are zero rooms, so the FK rejects every forged row, proved by an anon-key RPC returning `23503` - but it must be fixed **before any room is created**, because the activity record is append-only and a forged row could never be removed. **Gate C Approval 2 applied 31 July 2026:** `20260731a` then `20260729c`, ledger 47 to 49. The private `deal-room-evidence` bucket exists with its two `authenticated` policies (SELECT and INSERT, no UPDATE or DELETE); the other six buckets and twelve storage policies are unchanged. `authenticated` EXECUTE is now 21, `anon` and `PUBLIC` still 0. A real member upload into a sub-room they do not participate in is refused by row-level security - the policy evaluates rather than failing on a missing grant. **`NEXT_PUBLIC_DEAL_ROOM` unset. Nothing deployed. Unreachable by any member.** **Gate C Approval 3, 31 July 2026. The loop now runs: 92 of 94 assertions pass** (2 of 3 before the fix). The first run stopped at step one - `deal_room_propose` admitted the initiator with neither an `org_id` nor a `declared_capacity`, so the identity CHECK rejected every room, for every member, because all 10 production profiles have no organisation. **`20260731b` applied 05:01:48.553 UTC, ledger 49 to 50**, seeding the initiator's `declared_capacity` as `'Deal owner'`; replaced in place, oid unchanged at 92112, still exactly one `deal_room_propose`, ACL unchanged at anon 0 / authenticated 21. **Requirement 13 - cross-room and cross-sub-room isolation - is now proved against real rows**, along with the four-agreement admission gate, the invitation identity binding, evidence versioning and `own_org` visibility, append-only activity including for the service role, blockers, read-only continuity and the Storage byte refusals. **What still fails: no procedure can ever be approved.** `deal_room_propose_procedure` seeds one pending approval per *participant row* holding `is_required_approver`, and `deal_room_propose` gives the initiator two such rows in one room, while `deal_room_approve_procedure` resolves the caller with `limit 1` - so the initiator's second row stays pending for ever. Separately, `deal_room_admit_participant` never marks an admitted counterparty principal as a required approver, so they are refused outright. **Requirement 12 (entitlement fail-closed) therefore still cannot be tested**, because entitlements are granted through that gate. The correction is a product decision and was not made. **The fixture could not tear itself down**: the append-only trigger it verifies refuses the cascade DELETE, which blocks the listings on their FK and the users after them, and `teardown()` discards the error. Production holds 4 `@example.invalid` users, 2 fixture listings, 2 rooms and their history, 0 Storage objects; no real member account, listing or commercial row was touched. Both fixture listings were seeded `approved` and so were on the live board - they were moved to `archived` by a primary-key-scoped update, nothing deleted. **Corrective migration `20260731c`, APPLIED 31 July 2026 (ledger 50 -> 51):** `20260731c_deal_room_procedure_approver_gate.sql`, `7e60f2dfbaad3d27ff6165a0a5f6d4ff5bc872be7c5bf228b702be920c9971ba`. Owner decision: **every admitted principal is a required approver, and each person approves once** - the reading the Deal Room Product Contract section 8 requires, where a procedure "becomes agreed only after approval by every designated principal approver". Three `create or replace function` on identical signatures: `deal_room_admit_participant` sets `is_required_approver` when the participant is a principal (`or`-ed, so it only ever promotes); `deal_room_propose_procedure` seeds `distinct on (p.profile_id)`, one row per person, choosing the master-level row where one exists; and `deal_room_approve_procedure` approves by joining on `profile_id = auth.uid()` instead of on whichever row a `limit 1` found, and refuses a caller who holds no approval row on that version. No table, constraint, policy, trigger, index, grant or row is altered and no existing row is backfilled. **Approval 3 then passed 94 of 94** - 2 on the first run, 92 on the second. A procedure version can be proposed, approved by both principals and made to govern, and the two admission steps complete to the 22% baseline. **Requirement 12 is PROVED as of 31 July 2026, and requirement 13 with it: Approval 3 is 109 of 109.** Twelve assertions drive an expired entitlement and no entitlement row at all, and under each a blocker, evidence, an invitation and a new procedure version are refused while the history stays readable to the admitted; restoring the entitlement then makes the very same command succeed, which is what attributes the refusals to the entitlement rather than to anything else. The room stays in a writable state throughout. **The last thing unestablished for this slice is that nobody has rendered the pages**; `e2e/deal-room-surfaces.spec.ts` is written and needs only `PONTE_SITE_PASSWORD`. **The fixture teardown was fixed the same day and the stranded rows removed.** `scripts/deal-room-negative-access.mjs` now deletes a room through the Management API as the table owner, suspending `deal_room_activity_append_only` inside one transaction scoped to a single room id and re-enabling it in the same transaction - a capability deliberately outside the application, held only by whoever holds the management token, and refused unless the room's listing still carries the fixture marker. The credentials are demanded at startup so it never creates a room it cannot remove, and teardown now verifies afterwards and exits non-zero if anything is left. Applied to the stranded rows: **users back to 10, listings back to 7 with 2 approved and 0 archived, every `deal_room_*` table at 0**, the four canonical agreement documents untouched, ledger 50. Production is back to its pre-fixture state. Record: `docs/codex/audits/deal-room/GATE-C-APPROVAL-1-2026-07-30.md` sections 6 to 10 |The first launch-usable protected progression loop, and it is operable: fifteen server actions in `app/[locale]/deal-rooms/actions.ts` call the `deal_room_*` commands through the caller's own session, and every surface is wired to one. Credible interest, Integrity pre-flight, master room and first private sub-room, protected invitation, admission, one agreed procedure, evidence with clarification and correction, acceptance for procedure, one blocker and its resolution, deterministic progress, Professional Momentum, attributable history and read-only continuity. Twelve surfaces under `/deal-rooms`, behind `NEXT_PUBLIC_DEAL_ROOM` and a server-side `DEAL_ROOM_ALLOWLIST`. **Members hold SELECT and nothing else on all fourteen member-facing tables**; every material change runs through a SECURITY DEFINER command that writes its activity event in the same transaction. **Six trust boundaries closed after the follow-up and final reviews of 29 July 2026:** the agreement version and checksum are read from `deal_room_agreement_documents`, which no member can reach, and the acceptance command has no version or checksum parameter at all; the invitation preview and Integrity pre-flight are derived inside `deal_room_invite()` from `profiles`, `organizations` and `verifications` rather than accepted as caller JSON; the intended counterparty is proved to exist, persisted on the room, and the invitation is addressed from that record so it cannot be redirected; and accepting an invitation records `invitation_accepted`, with `participant_admitted` written in exactly one place, by the command that verified identity, capacity, role, authority and every current agreement. The final review closed two more: acceptance is bound to the persisted intended identity, so a member target must be `intended_counterparty_profile_id` and an external target must hold the invited address as a **confirmed** email, checked before any write so a refusal changes nothing; and the participant role and class are read from the room's own proposal rather than supplied, with `p_role` and `p_class` removed from `deal_room_invite()` and both superseded overloads dropped. Room creation also proves listing ownership, publication and family facts and builds the Deal snapshot rather than accepting one; a missing entitlement fails closed; `selected` evidence visibility is out of launch scope. Fifteen additive `deal_room_*` tables in three migration files, **written and executed nowhere**; the legacy Deal-era cluster and the orphan `ponte-deal-docs` bucket are untouched. The commissioned **Multi-party Deal Room Bridge v1** is `components/ponte/bridge/DealRoomBridge.tsx`, transcribed from `PB.dealroom` in the approved engine. Progress reuses `assertWeights` from `lib/ponte/progress.ts` and applies the product definition's own scale, in which earned weight **is** the percentage (22% at procedure agreement, inside the approved 18-25 band). **Visual evidence captured 29 July 2026**: 17 frames in `docs/codex/audits/deal-room/evidence/` (8 desktop, 8 at 390 x 844, reduced motion), all 20 checks passing twice in succession. It found two defects in this slice, both fixed: every surface rendered ink-on-obsidian because nothing painted the Ponte paper surface, and a blocked room printed "Blocked" twice. **Not yet proved against a database**: the executable negative-access fixture (`npm run deal-room:negative-access`) is unrun because no database has the schema. That is the first Gate C step, per `docs/codex/audits/deal-room/GATE-C-TEST-PLAN.md`. |
| Check and verify journey, request surfaces | On `main` via PR #45 | Not yet independently production-verified | `/verify`, `VerifyForm` and the `/verification` explainer mount PonteShell in heritage-light and are bared in ChromeGate, so reaching business verification from the Start a deal blockers no longer drops the member into the obsidian application mid-task. Every line of copy is unchanged. Plan: `docs/plans/active/verification-journey-brand-v5.md`. |
| Persistent navigation and unsaved-work protection (Slices 1-3) | On `main` | Not deployed | Owner authorised the full brief on 30 July 2026, and authorised the merge. Slice 1 merged via PR #118; Slices 2-3 via PR #150 (31 July 2026, merge commit `e4d2178`). On `main`, not yet deployed or production-verified. **Slice 3** gave `useUnsavedGuard` an opt-in `interceptLinks` mode (a dirty-gated capture-phase click listener for the exits a surface does not render), replaced the inert `find/o/[ref]` breadcrumb with a labelled `JourneyBack` to the results and guarded the `RequestIntroduction` composer, fixed the `/learn/*` double `<main>` and the `not-found.tsx` CTA (was "Browse the Catalogue" -> `/pricing`, now "Explore the market" -> `/explore`). `marketplace/new` and `ListingForm` were found already RETIRED (the route redirects to the Structure composer, LB-009), so no guard is needed there. **Slice 2** adds `components/ponte/nav/UnsavedFormGuard.tsx` for the server-action form pages, which hold no React state to interrogate: it reads dirtiness from the form DOM (via the pure `lib/nav/form-dirty.ts`), attaches `beforeunload` while dirty, and intercepts leave-navigation with a capture-phase click listener that opens the shared dialog; a real submission clears the guard so the action's own redirect is never caught. Wired into Deal Room `propose`, `invitation/[token]/admission` (the authority declaration), `blockers`, `evidence`, `evidence/[evidenceId]`, and admin `listings` / `verifications`; the two missing "Back to the room" controls were added to `[roomId]/activity` and the workspace hub. 7 more assertions in `lib/nav/__tests__/form-dirty.test.ts`. Slice 1 adds the shared cross-journey primitives — `components/ponte/nav/JourneyBack.tsx` (labelled Back, no icon: the Ponte Flow registry has no arrow key, so the mark is decorative CSS and the word is mandatory), `UnsavedChangesDialog.tsx` (alertdialog, focus trap, focus return, the brief's three actions, honest anonymous "Sign in to save"), `useUnsavedGuard.tsx` (`beforeunload` while dirty plus a guarded in-app navigation), `lib/nav/dirty.ts` and `components/ponte/nav/nav.css` (all `--pf-*` tokens, imported once via `globals.css`). It replaces the two icon-only chevron Back controls (`StructureComposer`, `CheckComposer`) with the labelled control, guards the Structure composer's exit-to-home against losing a part-built draft, and adds the first branded error boundaries (`app/[locale]/error.tsx`, `app/global-error.tsx`) so a runtime error is no longer the dead-end the brief forbids. The shared components extend the existing `ClassifyStep` `DiscardWarning` precedent by owner choice, and take translations as props so the project renderer can test them: 23 new assertions across `lib/nav/__tests__/dirty.test.ts` and `components/ponte/nav/__tests__/nav-ui.test.tsx`. Audit: `docs/codex/audits/navigation-unsaved-work/AUDIT-2026-07-30.md`; plan: `docs/plans/active/persistent-navigation-and-unsaved-work.md`; remaining journey wiring indexed as PL-031. `npm run verify` passes end to end. No migration, no feature flag, no deployment. |

### The deployed commit is not recorded anywhere, including here

Recorded 30 July 2026 while auditing email (LB-012). Every "Not yet deployed" and
"Not deployed" in the table above states what nobody has verified rather than what
anybody has checked, and this is why:

- Netlify writes no GitHub deployment, so `gh api repos/Geppix140269/ponte/deployments`
  returns `[]`.
- `https://ponte.trade/` answers `401` behind the temporary Basic-auth wall, so no
  build identifier can be read from production.
- The last deployment named in `docs/operations/OPERATIONS_LOG.md` is the 28 July
  hotfix of `b378ad2`, and its own recorded next action — confirm the deployment
  succeeded and production is serving — has no recorded outcome.

`main` is `23637d3`. Which commit Netlify is serving is an owner-held fact, and no
claim about production behaviour in this document should be read as verified until
it is recorded. Establishing it needs the Netlify dashboard, a deploy log, or the
site password.

## Design authority truth

The approved design system is not advisory.

The authority branch currently establishes:

- `design/authority/PONTE_DESIGN_CONSTITUTION_v1.md`;
- `design/authority/bridge/v1/README.md`;
- `design/authority/bridge/v1/APPROVAL.md`;
- approved Bridge CSS and implementation notes;
- ADR-0002;
- mandatory contributor instructions;
- owner review for design authorities and shared design-system paths;
- a mandatory PR Design Constitution checklist;
- governance checks requiring the authority files and references.

Until the authority PR is merged, these files are implemented on branch and are not yet binding repository authority.

After merge, any UI contributor must stop rather than improvise when the Constitution is silent or conflicting.

### Shared foundation implemented (Phase 2 slice 2, 27 July 2026)

The approved system now has production plumbing. What exists, and what does not:

| Layer | State |
|---|---|
| **Tokens** | Ponte Flow is the production token authority. `app/globals.css` imports the bundle above the Tailwind directives; `--pf-*` is declared on `:root`. The Desk's 21 duplicated properties are now aliases and hold no values of their own. |
| **Icons** | `PonteIcon` is the sole renderer: semantic keys only, `currentColor` preserved, reduced variants below each key's own threshold, and an unknown key throws rather than rendering a hole. `check-governance.mjs` ratchets the legacy lucide and authored-SVG lists so they can only shrink. |
| **Brand lockup** | One shared component, `components/ponte/brand/PonteLockup.tsx`, serving all four surfaces. The owner ruled it an identity asset, not an interface icon; the Constitution's icon law is unchanged for interface icons. |
| **Motion** | The Flow motion CSS and the reduced-motion contract are live in production and were already imported (see the correction below). `lib/ponte/motion.ts` reads the approved specification rather than restating it. No component is activated on any journey yet. |
| **Progress** | `lib/ponte/progress.ts`: pure, deterministic, weights summing to 100, floor 20, never 0, irregular increments, 100 only when the procedure completes. Approved band copy included. |
| **Lifecycle states** | `components/ponte/state/LifecycleState.tsx`: loading, waiting, blocked, active, under review, completed, error. Distinct in words, marker geometry and colour, in that order. **No route has been retrofitted.** |
| **Bridge primitives** | `components/ponte/bridge/BridgeRoute.tsx` is the Family and Action Bridge as a React primitive, translated from the recovered engine without changing its geometry. It is live on the landing and, from 28 July 2026, on the Products intake. The remaining Bridge System components (Task Completion, Commercial Journey, Counterparty Connection, Deal Room) are still unbuilt. |

**Correction to the Phase 1 audit.** Its finding 0.3, that the Flow tokens and
motion CSS were "imported nowhere", was wrong. They have been imported since
commit `0bb84fa`; the audit's grep looked for the leaf filenames under `app/` and
`components/` and missed the bundle file in `design-system/`. Verified at runtime.
The genuine defect was the duplication the audit identified itself at A.2.
Recorded in `docs/codex/audits/constitution-rebuild/GAP-REGISTER.md` section 4.

**Open gaps** are registered in that same file: three icon commissions (G6a to
G6c), the Bridge primitives (G1), the journey and connection state vocabulary
(G5), and four design-system gaps (DS-1 to DS-4). A gap is a stop-and-escalate
condition, not permission to improvise.

**`/marketplace` is not a straightforward retirement.** It carries the owner-side
decision on an inbound introduction, listing reconfirmation and the account
brief, none of which exists elsewhere. Escalated in
`docs/codex/audits/constitution-rebuild/MARKETPLACE-DEPENDENCY-FINDING.md`.
Separately, `/api/marketplace/*` is current infrastructure: Start a Deal and Find
both post to it.

**`/marketplace/new` (the legacy `ListingForm` editor) is quarantined (LB-013).**
It renders nothing: the page redirects through `lib/marketplace/legacy-redirect.ts`
to the constitutional composer at `/structure` (a saved record resumes at
`/structure?edit=<uuid>`). The transactional-email edit CTA and every in-app link
were repointed there; a `check-governance.mjs` ratchet keeps new source from
linking the retired editor. The legacy `ListingForm` and its orphaned
`tradeCategories.ts` have been **deleted** (PL-030), and the route-audit baseline
is empty. The five email links to the `/marketplace` **board** were
deliberately left — the board has no approved constitutional home yet (PL-029).

## Landing visual baseline

The current production landing has:

- production navigation and session-aware Sign in / Your records;
- a scrolling strip of real Market Signals;
- the concise headline `Global trade, from signal to deal.`;
- a temporary three-column family/action card grid;
- the Market Signals section below;
- real restored commercial routes.

**Superseded by ADR-0010 (27 July 2026).** The narrow boundary below was the
first-implementation limit recorded after PR #58. ADR-0010 widens the
Constitution's scope to the complete interface, delivered through controlled
journey PRs. The delivery discipline is unchanged: one journey per PR, each
complete at desktop and mobile, each with its own evidence and owner approval.

The first two items remain the first two slices:

1. render `Global trade, from <em>signal to deal.</em>` using the approved gold italic emphasis (PR #60);
2. replace the temporary family/action grid with the approved Family and Action Bridges;
3. preserve all current production navigation, authentication, data, actions and destinations.

Programme sequencing is governed by `docs/plans/active/constitution-led-interface-rebuild.md`.

## Deal Room product truth

The owner accepted the Deal Room foundation, commercial boundary and master-room hierarchy on 27 July 2026, and on **31 July 2026** decided the commercial model outright (`PT-COMMERCIAL-2026-07-31-01`, ADR-0020), replacing the ladder that had stood since 27 July.

The accepted commercial model is:

```text
Everything upstream of protected Deal Room progression — FREE, no limit
  browse, publish, prepare a Master Deal Room, create draft branches,
  invite, accept, prepare for activation
-> Activate the Master Deal Room — $79 USD for 30 active days,
   including 5 concurrently active private principal-counterparty branches
-> Each additional concurrently active branch — $15 USD for that room period
-> Maximum $199 USD per Master Deal Room per 30-day period
-> Expiry — read-only continuity; nothing deleted; reactivation is a new period
```

USD only. English, Spanish, Russian, Simplified Chinese and Modern Standard Arabic included. **The Deal Room is Ponte's only paid product.**

There is no membership, plan, Starter room, Portfolio subscription, credit pack, paid verification, public Ponte Desk package, retainer, commission, success fee or percentage-of-transaction charge.

The master-room hierarchy remains:

```text
One master Deal Room — one Deal and one room entitlement
-> private counterparty sub-rooms
-> private provider and adviser sub-rooms
-> private internal workstreams
```

Provider, adviser and internal workspaces remain unlimited and free under one Master Deal Room. Concurrently active **principal-counterparty** branches are what the price counts: five included, $15 USD each thereafter, to the $199 USD cap.

### What the price counts, and what it never counts

A Deal Branch is billable only when it is a **principal-counterparty** branch, the counterparty has accepted the invitation, admission and required participation agreements are complete, the branch is write-enabled for protected progression, and it is not closed, declined, withdrawn, expired or archived (authority §7).

Never billable: draft branches; invitations prepared, sent or awaiting acceptance; declined or expired invitations; failed admissions; closed or archived read-only branches; and **all provider, adviser and internal workspaces**. Closing a branch releases a slot for reuse in the same period and refunds nothing.

**A billing amount must never reveal branch count** to a participant not authorised to see the branch structure. Only authorised Master Deal Room administrators may see the active-branch count, purchased capacity and billing breakdown.

### Superseded on 31 July 2026

The €0 Starter Deal Room (one per verified organisation, 3 sub-rooms, 2 guest organisations, 2 internal users), the €149/month or €1,490/year Portfolio subscription with 5 concurrent master rooms and 25 guest organisations, and the Ponte Credits scheme (100/250/500 packs, 60 credits for a 90-day room, 20-credit extension, 5-credit guest organisation) are **all retired** by ADR-0020. They are recorded in the superseded authorities and are not to be implemented.

### Implementation status: nothing

**No price, pricing engine, branch-counting predicate, billing record, entitlement kind, Stripe object, tax treatment or production charging exists.** The Deal Room launch slice carries `starter`, `sponsored` and `waived` entitlement kinds only; `deal_room_entitlements` has no `paid` value in its CHECK constraint and contains no price, currency, period price, purchased branch capacity or payment reference, and its migrations contain no price, currency, invoice or Stripe identifier of any kind. The only Stripe checkout in the repository sells credit packs.

Recording ADR-0020 changed none of that. The staged programme is `docs/plans/active/deal-room-transaction-pricing.md` and every production-changing stage in it needs separate owner approval.

**Corrected 29 July 2026.** This section previously read "This entire Deal Room capability is Designed, not implemented." That is no longer true. The protected progression loop authorised by issue #97 is implemented on `agent/deal-room-launch-slice`, behind a feature flag that has never been set, against a schema that has never been applied. Everything beyond that slice — Portfolio subscriptions, credits, multi-room capacity, the Deal Passport, closure packs and the remaining DR surfaces — remains Designed and not implemented.

## Production inventory truth

The 26 July 2026 production probe established:

| Measure | Result |
|---|---:|
| Total Market Signal rows | 6,735 |
| Approved signal rows | 3,543 |
| Approved and unexpired public signals | 3,517 |
| Public signal requirements | 2,526 |
| Public signal offers | 991 |
| Total listings | 4 |
| Approved listings | 2 |
| Approved/current with bound passing member-business verification | 0 |
| Desk-managed listings | 2 |
| Legacy service listings | 0 |
| Signal investigations | 1 |

Twenty-six rows remained stored as `approved_signal` after public expiry. Current readers excluded them correctly, but stored status and public-active lifecycle were not identical.

The approximately 160-row signal batch discussed on 28 July has not yet been reconciled in this production truth. The final stored and public-active totals must be updated only after exact import evidence exists.

## Current market-model truth

```text
Market family: Products | Trade services | Distribution and representation
Record origin: Market Signal | Member Opportunity
Intent: one family-valid seeking or offering intent
```

Production does not yet persist the complete accepted `market_family` and canonical intent contract across current tables. At the 26 July probe, neither `listings` nor `desk_radar` persisted `market_family` or canonical `intent` as first-class fields.

Current production vocabularies were:

```text
listings.type: offer | requirement | service
desk_radar.side: offer | requirement
```

These values cannot prove all accepted intents. PR #49 carries canonical family/intent through member journeys but does not authorise or apply a database migration.

## Market discoverability and category-first journey truth

The owner accepted ADR-0011 on 28 July 2026.

The accepted target is:

```text
Every eligible Market Signal is reachable
-> full-dataset server-side search and facets
-> stable URL state and pagination
-> product hierarchy where classification is supported
-> truthful Unclassified access where it is not
```

and for new or searched non-product activity:

```text
Family and intent
-> clickable canonical category
-> relevant subcategory or partner type
-> family-specific commercial details
-> optional prose
```

Trade Services uses structured service categories and subcategories. Distribution separates partner/channel type, product/sector, territory and relationship structure. Other remains the final escape route to targeted manual wording.

This target is **partly implemented**. The search and pagination half is done (LB-007, this PR): the public board no longer reads only the newest 60, it carries a free-text search over the complete eligible inventory, and every matching record is reachable through a shared, restorable URL. The category-first Structure path is implemented on the branch recorded above.

Still outstanding within this target: classification of the existing inventory, so search and filters reach records through canonical keys rather than only through public text (PL-017); exact reconciliation of the new batch (PL-018); and application of the search index migration (PL-016). No production migration or deployment has been verified for any of it.

## Verification and security findings

Production profile levels were text values while application code performed a numeric conversion before threshold comparison. No passing `member_business` verification existed at the 26 July probe. This requires separate corrective security and integrity work.

RLS was enabled on inspected core tables. Investigation and connection policies preserved ownership boundaries. The approved-listing direct-read policy and verification type mismatch remain separate security and integrity work, distinct from canonical publication eligibility.

## Immediate next actions

1. Review and merge the ADR-0011/source-of-truth documentation pull request so Claude Code and future contributors can treat the decision as binding repository authority.
2. Deploy and production-verify the Market Signals search and pagination delivered for LB-007, then classify the existing inventory (PL-017) and reconcile the new batch (PL-018), which are the parts of ADR-0011 that remain.
3. Require exact before-and-after counts, classification coverage, privacy-contract evidence, tests and desktop/390 × 844 screenshots before implementation approval.
4. Do not apply a production migration, deploy, change a production feature flag or merge the implementation without the later approval required by `AGENTS.md`.
5. Merge PR #155 so the Deal Room-Only Pricing Authority reaches `main`, then merge the ADR-0020 reconciliation PR that depends on it. **In that order** — the reconciliation cites the authority path and must not land first.
6. Complete issue #51's detailed Deal Room journey, screen register, domain model, permissions, state machine, progress model and delivery plan.
7. Classify proposed **LB-014** — the public `/pricing` page, footer blurb and `/about` copy publishing Credits, a success fee and a retainer against binding authority. Only the owner may make that call.
8. Decide **OD-011** — whether authority §15's prohibition on "paid verification" retires the paid `counterparty_check`, or whether a check on a third party is outside it. Stage 8 of the pricing programme is blocked on this.
9. Complete issue #52's legal, billing, tax, refund, Stripe, entitlement and unit-economics requirements against the **new** model, not the retired one.
10. No production schema, pricing, Stripe or charging action without the required later approvals.
9. Review and merge the Design Constitution authority PR after checks pass.
10. Open a separate landing bridge implementation PR using the merged authorities.
11. Verify that PR at desktop and 390 × 844, including keyboard and reduced motion, before merge.
12. Continue market-data, verification and schema work only through their existing explicit plans; do not hide them inside design implementation.
13. Do not start an uncontrolled app-wide repaint. Apply the Constitution through scoped journey-level PRs.
