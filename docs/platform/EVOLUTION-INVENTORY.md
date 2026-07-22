# Evolution inventory — every module classified

Date: 2026-07-22. Produced under the Evolution Protocol Part A
(`Ponte_ClaudeCode_Evolution_and_Input_Doctrine_2026-07-22.md`) before any
implementation starts.

Classification buckets:

- **KEEP** — untouched. Deleting one of these is treated as a bug.
- **RESKIN** — logic stays, presentation swapped to the new brand book.
- **REFACTOR** — logic evolves per the briefs.
- **RETIRE** — removed, with 301/308 where a URL existed.

Method: `git log`, full route walk of `app/`, every file in `lib/` and
`components/`, all 26 files in `supabase/migrations/`, import-graph checks for
dead modules, and a repo-wide grep for ADAMftd/ICTTM. Everything below was read,
not inferred.

---

## 1. Public routes

| Route | File | Class | Note |
|---|---|---|---|
| `/` | `app/[locale]/page.tsx` | RESKIN | Story is already correct (free vetted board, desk optional). Dark gold/navy skin, `lucide-react` icons, three static "format example" cards. Needs new tokens + the real board below the fold + the write-up demo strip. |
| `/marketplace` | `app/[locale]/marketplace/page.tsx` | REFACTOR | The board exists but is a 5-column table, has **no filters at all**, hides itself below `BOARD_MIN=3`, and mixes hero + rules + how-it-works + board + "my listings" + CTA on one page. Needs card layout, filter bar, URL-encoded state, and the member area split out. |
| `/marketplace/l/[ref]` | `.../l/[ref]/page.tsx` | REFACTOR | Public listing detail, already wall-free, already has WhatsApp share and per-listing OG meta and 10-language AI translation. Needs Description / Deal notes / provenance chip / Fixed-Neg tags / chain line / validity tag / media gallery. |
| `/marketplace/new` | `.../new/page.tsx` + `components/ListingForm.tsx` | REFACTOR | The single biggest piece of work. See §5. |
| `/pricing` | `app/[locale]/pricing/page.tsx` | REFACTOR | Four cards: free marketplace, Ponte AI $19/mo, desk success fee, retainer. Contradicts the blueprint's credit-bundle model. See flag F1. |
| `/verification` | `app/[locale]/verification/page.tsx` | RESKIN | Public explainer of the levels, sources named, careful non-guarantee copy. This is the `/verify` wedge page the blueprint asks for, under a different URL. See flag F7. |
| `/verify` | `app/[locale]/verify/page.tsx` + `components/VerifyForm.tsx` | REFACTOR | Member-facing L2 request form with server-read credit balance. Works, but no member can ever pay for it. See flag F2. |
| `/login` | `app/[locale]/login/page.tsx` | REFACTOR | Supabase magic-**link** OTP + Google One Tap. Brief wants a magic-**code** box inside a gate modal, plus a two-field profile step. See flag F5. |
| `/account` | `app/[locale]/account/page.tsx` | RESKIN | Thin. Becomes M1 Dashboard. Hardcoded English strings, not i18n. |
| `/about` | `app/[locale]/about/page.tsx` | REFACTOR | Describes Ponte as "an independent trade brokerage… success fee only". Fourth competing story. Not i18n. See flag F3. |
| `/contact` | `app/[locale]/contact/page.tsx` | RESKIN | Add the WhatsApp desk click-to-chat per addendum §7.4. |
| `/learn/duties`, `/learn/trade-data` | `app/[locale]/learn/*` | KEEP | SEO content, indexed, no conflict with the new story. Reskin later, Priority 3. |
| `/privacy`, `/terms` | `app/[locale]/*` | KEEP | Legal. `LegalOriginalNotice` handles the English-original rule. |
| `/offline` | `app/[locale]/offline/page.tsx` | KEEP | PWA offline fallback. |
| `/advisory` | `app/[locale]/advisory/page.tsx` | **RETIRE** | $500 analyst call / $2,000 intensive / $2,500 retainer, Calendly link, hardcoded English, mojibake (`Â·`). This is the Deal Desk generation still live **and still in `sitemap.ts` at priority 0.8**. See flag F3. |
| `/methodology` | `app/[locale]/methodology/page.tsx` | **RETIRE** | Already 308s in `middleware.ts`. The page file is unreachable dead code. |
| `/why-ponte` | `app/[locale]/why-ponte/page.tsx` | **RETIRE** | Same: 308 exists, file is dead. |
| `/brokerage` | `app/[locale]/brokerage/page.tsx` | **RETIRE** | Same: 308 exists, file is dead. |
| `/network` | `app/[locale]/network/page.tsx` | **RETIRE** | Same: 308 exists, file is dead. Its comment says the digest API stays; the API does stay, the page does not. |
| `/admin`, `/admin/listings`, `/admin/users`, `/admin/verifications` | `app/[locale]/admin/**` | KEEP (logic) + RESKIN | Vetting queue, decision notes, verification review. Density over polish, Priority 3. Extend with the write-up editor (AD2) additively. |

**Missing entirely** (must be built, not reskinned): `/company/[slug]` (P5),
category pages (P4), `/credits` (M10), inbox (M4), deal rooms (M5), alerts (M9),
settings (M11), certificate order (P8), sample report (P7), the expiry decision
screen, and the `/api/og/[id]` snapshot route.

## 2. API routes

| Route | Class | Note |
|---|---|---|
| `/api/verification` | KEEP | L2 pipeline entry. Balance check, rate limit, atomic spend. Solid. |
| `/api/verification/select` | KEEP | Resumes a `needs_selection` case without double-charging. Good design. |
| `/api/cron/sanctions-refresh` | KEEP | Guarded trigger for the nightly refresh. |
| `/api/webhooks/stripe` | KEEP (as stub) | Verifies signature, fulfils nothing, logs loudly if a checkout completes. Credit purchase fulfilment lands here. |
| `/api/data/fx`, `/api/data/health` | KEEP | Datasource layer + health probe. |
| `/api/marketplace/submit` | REFACTOR | Hard 401 for anonymous. Must accept an anonymous draft and claim it on OTP. Also writes only the legacy column set. |
| `/api/marketplace/assess` | REFACTOR | Closest existing thing to the write-up endpoint, but it is a *score + coaching* payload, and it is **gated at 3 free checks then $19/mo**. See flag F4. |
| `/api/marketplace/interest` | REFACTOR | Becomes the inquiry/connection composer endpoint under the trigger map. |
| `/api/brokerage/submit` | KEEP | Still the desk notification path; `NetworkForm` is its only orphaned caller. |
| `/api/test-email` | RETIRE | Dev-only send probe on a public path. |
| `/auth/callback`, `/auth/confirm`, `/auth/signout` | KEEP | `token_hash` confirm route fixed a real 500. Do not touch. |

## 3. Library modules

**KEEP, untouched:**

| Module | Why |
|---|---|
| `lib/registry/{companies-house,opencorporates,vies,gleif,index}.ts` | 44 kB of working registry clients. Explicitly named KEEP in the doctrine. |
| `lib/sanctions/{refresh,refresh-run,screen,normalize}.ts` + `__tests__` | OFAC/EU/UN/UK OFSI ingestion and screening, with the repo's only unit tests. |
| `lib/verification/{pipeline,reconcile,rescreen,trust-score,decision-notes}.ts` | Levels 1-3, human-decision doctrine, "not checked" never "clean". |
| `lib/ai.ts` | Metered Anthropic entry point. Every call attributable and token-costed. This is the foundation the write-up endpoint will use. |
| `lib/credits.ts` + `credit_ledger` / `spend_credits` | Append-only ledger, atomic spend under a row lock. Correct. |
| `lib/supabase/{client,server,admin,middleware}.ts` | Admin client is deliberately split out so non-Next jobs can use it. |
| `lib/email.ts` (marketplace + verification senders) | Resend plumbing, awaited sends. |
| `lib/datasources/**` | Registry + fallback cache + licence flag. |
| `lib/{rate-limit,seo,stripe,telegram,countries,listing-terms}.ts` | All live and used. |
| `i18n/**`, `messages/**` (10 languages, 940 lines each) + `scripts/check-messages.mjs` | i18n infrastructure and its validator gate. |

**REFACTOR:** `lib/ai-vet.ts` — holds `assessListing` (score/fix/improve/passed)
and `accountBrief`. The write-up needs a *different* JSON shape
(description / strengths / open_points / non_negotiables / summary_line /
share_text). New module `lib/writeup/*` alongside it; `vetListing` stays for the desk.

**KEEP but currently unwired:** `lib/verification/certificate.ts` — the EUR 49
certificate generator, zero importers. The briefs want this product. Wire it, do
not delete it.

**RETIRE:** `lib/watermark.ts` (0 importers, report-shop PDF watermarking).
Dependencies `react-pdf`, `zustand`, `openai` are declared and imported nowhere.

## 4. Components

| Component | Class | Note |
|---|---|---|
| `Logo.tsx` (`BridgeMark`) | REFACTOR | Bridge mark exists. Must be rebuilt to the handoff's lime-pier / cyan-pier / gradient-span construction with the full variant set. |
| `SiteHeader`, `SiteFooter`, `BottomNav` | RESKIN | Add the credit balance chip to the header. |
| `LanguageSwitcher` | KEEP | i18n surface, works. |
| `ListingForm.tsx` (1029 lines) | REFACTOR | See §5. |
| `VerifyForm.tsx` | RESKIN | Includes the `needs_selection` candidate picker. Logic is good. |
| `tradeCategories.ts` | REFACTOR | 208 lines of hand-rolled categories with `lucide` icons. Blueprint mandates HS 2022 catalog only. See flag F6. |
| `InterestButton` | REFACTOR | Becomes C6 inquiry composer + C7 gate. |
| `ProcessFlow`, `Reveal`, `ServiceWorkerRegistrar`, `InstallPrompt`, `OfflineRetry`, `LegalOriginalNotice` | RESKIN / KEEP | Motion utilities get replaced by the handoff's motion spec. |
| `TradeFlow.tsx`, `NewsletterSignup.tsx` | RETIRE | Zero importers. |
| `NetworkForm.tsx` | KEEP (relocate) | Only caller of `/api/brokerage/submit`; its page is retired, so it needs a new home or the API gets a new caller. |

**Not present, all of C1-C25 to build:** teaser card, tier badges, stage chips,
trust dial, filter bar, gate modal + OTP boxes, credit chip, empty states,
skeletons, steppers, toasts, HS picker, flag select, doc tiles, write-up panel,
completeness meter, provenance chip, flexibility chips, chain line, share action,
OG template, media gallery, validity picker, lifecycle tags. Plus the entire
proprietary icon set (system `ic-*` and 17 trade profile `ic-pf-*`).

## 5. The composer, in detail

`ListingForm.tsx` is a 4-step wizard. Against the input doctrine it is **already
partly right**: category is an icon tile grid, subcategories are chips, roles are
chips, units and frequencies are selects. Keyboard is used for product name,
quantity, price, description and free-text terms.

What it does not have: server-side draft (uses `sessionStorage`), a live preview
that updates as you type (preview is step 4 of 4), payment terms as a field at
all, flexibility flags, validity, key notes, HS code (the column exists and the
board renders it, but **the form never sets it**), country pickers (free-text
inputs), voice input, and a gate modal (it does a full-page redirect to `/login`).

It also **requires at least one photo to publish an offer**, which the addendum
explicitly contradicts. See flag F8.

## 6. Database

**KEEP (16 live tables):** `listings`, `listing_documents`, `listing_media`,
`listing_connections`, `listing_translations`, `account_briefs`, `ai_usage`,
`credit_ledger`, `ai_calls`, `sanctions_entries`, `sanctions_refresh_log`,
`verifications`, `verification_documents`, `trust_score_components`,
`data_sources`, `data_source_cache`, plus `profiles` and the `is_admin()` /
`spend_credits` / `credit_balance` functions. Storage buckets `listing-docs`
(private), `listing-media` (public), `ponte-previews` (legacy).

**RETIRE (legacy shop, in `supabase/schema.sql` and migrations 01, `20260526*`,
`20260527*`, `20260528*`, `20260610_adamftd_catalogue`):** `products`,
`categories`, `orders`, `order_items`, `order_notes`, `bundle_items`,
`newsletter_subscribers`. The code that used them is gone as of commit `97fdb6b`;
`schema.sql` still documents them as current. Drop by migration, not by editing
history.

**REFACTOR — `listings` needs an additive migration set.** Current columns vs.
what the briefs specify:

| Brief field | Repo today | Action |
|---|---|---|
| `listing_type` | `type` (`offer`\|`requirement`\|`service`) | Keep `type`. Repo wins on the name and on `service` being a third type. |
| `product_name` | `product` | Keep `product`. |
| `hs_code` FK to catalog | `hs_code text`, never populated | Add `hs_codes` catalog table + FK. |
| `quantity` + `unit` | `volume text` (`"12000 MT per month"`) | Add `quantity numeric`, `unit text`, `frequency text`; backfill from `volume`; keep `volume` as the legacy display string. |
| `incoterms` | `incoterm` | Keep singular. |
| `payment_terms` | absent | Add. |
| `origin_country` / `destination_country` | `origin` / `destination` free text | Add ISO-2 columns alongside. |
| `poster_role` enum | `submitter_role text` | Keep column, constrain values. |
| `chain_declaration` enum | `chain_depth text` | Keep column, constrain values. |
| `flexibility` jsonb, `deal_team_note`, `key_notes`, `mandate_sighted` | absent | Add. |
| `validity_type`, `valid_until` | absent | Add. |
| `status` enum | `draft/submitted/approved/rejected/closed` | See flag F9. |
| `ai_version`, `desk_version`, `prompt_version`, `model` | `ai_review jsonb`, `ai_reviewed_at` | Add the four; keep `ai_review` for the desk co-pilot. |
| `share_text`, `og_version` | absent | Add. |
| `anonymous_drafts` table | absent | Add. |
| `tombstones` table | absent | Add. |
| `hs_codes` catalog | **absent entirely** | See flag F6. |

---

## 7. Contradictions between the briefs and repo reality

The repo wins on all of these. Each needs a decision before the affected track
starts.

**F1 — The pricing model in the repo is not the one in the blueprint.**
The blueprint specifies Starter/Pro/Enterprise at EUR 49/149/499 repositioned as
credit bundles, credits at EUR 1, packs at 25/60/150. `/pricing` ships: free
marketplace, **Ponte AI at $19/month**, desk success fee, and a retainer. Commit
`c1c8ec0` ("Business model: free vetted marketplace with direct connect, desk
optional on fee or retainer") made this deliberately, three days ago. The
EUR 49/149/499 tiers do not exist anywhere in the codebase. Currency is USD, not
EUR. **The briefs are describing a model the repo has already moved past.**

**F2 — The verification product cannot be bought.** `lib/credits.ts` exports
`grantCredits`, and `grant_signup` is a declared reason, but **nothing calls
either**. The Stripe webhook fulfils nothing. So every member has a balance of 0,
and `/api/verification` returns 402 to all of them. The flagship credit product
is unreachable in production today. This is launch-blocking and is not mentioned
in any brief.

Confirmed against the live ledger on 2026-07-22. All nine `credit_ledger` rows
are two hand-written `admin_adjust` grants (20 then 100) and seven
`spend_verification` rows against them. The only way a credit has ever existed
on Ponte is somebody editing the ledger in the SQL editor.

**F3 — Phase 0 is ~80% done, and the brief's description of what is left is
wrong.** The Foundations brief says "`/` serves the desk-services story while
`/pricing` serves the four gated tiers". Neither is true: `/` and `/pricing` now
tell a consistent free-marketplace story, and the four gated tiers do not exist.
What *is* still live and contradictory: **`/advisory`** (Deal Desk pricing,
Calendly, hardcoded English, encoding damage, and **listed in `sitemap.ts`**), and
`/about` calling Ponte "an independent trade brokerage… success fee only".
Four page files (`/methodology`, `/why-ponte`, `/brokerage`, `/network`) are
already 308'd in middleware but their source still ships.

**F4 — The repo gates the AI the briefs insist must be free.**
`/api/marketplace/assess` allows 3 free checks per member, then 402s with
`upgrade: true` and sells Ponte AI at $19/month. Addendum v4 §5: "Credits: NOT a
credit action. This is the free hook… gating it would kill the whole point."
Either the write-up ships ungated alongside the gated assess, or the freemium
meter comes off. This is a business decision, not a code one.

**F5 — OTP is a magic link, not a code.** The briefs and the design bundle both
show a 6-box code entry inside a gate modal, returning the user to the exact
context. The repo sends an email link that navigates away and back. The
`token_hash` confirm route was a real bug fix (`b51d6ec`) and must not be
regressed. Also absent: the two-field profile step (A3) and the "You have 3
credits" line.

**F6 — There is no HS catalog.** The blueprint requires board filters driven by
"the official HS 2022 catalog only", and the HS Catalog Brief is listed as "in
force". The repo has **no `hs_codes` table**, no import script, and no 5,613-code
dataset. `listings.hs_code` is a bare `text` column that the composer never
writes. Categories come from a hand-rolled 208-line `tradeCategories.ts`. The
doctrine lists "HS catalog data and import" under KEEP; there is nothing to keep.

Resolved 2026-07-22. The dataset exists outside the repo at
`…\1402 Celsius\hs-codes.csv` (5,613 HS2022 rows, with chapter, heading,
official description and WCO unit). Supabase was probed directly: `hs_codes`,
`hs_codes_catalog` and `hs_catalog` all return PGRST205, so **no previous import
ran**. This is net-new build work with the data already in hand.

**F19 — The HS Catalog Brief was written against a different codebase.** Its
problem statement describes 2,303 catalog entries of which 204 are invalid, an
admin catalog UI with Seed / AI cached labels and Edit buttons, an AI
classification endpoint that caches codes, and a `/data/hs-codes.json`. **None of
those exist in this repository.** There is no HS table, no classifier route, no
catalog UI, no static HS file, and `listings.hs_code` has never been written to
by any code path. The brief is almost certainly aimed at the ADAMftd Marketplace
tree in Dropbox, not `github.com/Geppix140269/ponte`.

Consequence: of that brief's four phases, only Phase 1 (load the master catalog)
applies here. Phase 2 (purge 204 invalid codes and remap the records referencing
them) has nothing to act on. Phase 3 (classifier guardrails) has no classifier to
guard. Phase 4's acceptance tests referencing invalid codes and the admin catalog
UI cannot be run. Scope is much smaller than the brief implies, and the
`hs-invalid-codes.csv` companion file is not needed.

**F7 — The wedge page is at `/verification`, not `/verify`.** Both URLs exist and
both are live with different jobs: `/verification` is the public explainer,
`/verify` is the member request form. The blueprint assumes one page at `/verify`.
`/verification` is in `sitemap.ts` at priority 0.9 and is indexed. Recommendation:
keep both, put the sample report on `/verification`, and do not move the URL.

**F8 — Photos are mandatory to publish an offer; the addendum says they must not
be.** `ListingForm.publish()` refuses an offer with no image. Addendum §2: "A
listing with no photos still renders beautifully… media is upside, not a
requirement." The repo rule was a deliberate quality choice. Flagging, not
changing, until you decide.

**F9 — The status vocabulary differs.** Repo:
`draft / submitted / approved / rejected / closed`, wired through RLS policies,
the admin queue, decision emails, and the member's own listing list. Briefs:
`draft / in_review / live / expired / closed_done / withdrawn / archived`.
Renaming three live states would touch RLS, the desk, and the emails.
Recommendation: **keep `submitted`/`approved`/`rejected`** and add only the
genuinely new states (`expired`, `closed_done`, `withdrawn`, `archived`), mapping
`approved` → "live" in presentation only.

**F10 — The design handoff path in the UI brief is wrong.** The brief points at
`…\Ponte\brand\Rebranding 21st July\design_handoff_ponte\`. The bundle is actually
at `…\Ponte\Marketing\Brand\Rebranding 21st July\design_handoff_ponte\`. Read and
verified there; no other copy exists.

**F11 — ADAMftd / ICTTM: 93 mentions, all inert.** Every one is in `docs/` (8
files) or in legacy-shop SQL migrations (3 files). **Zero** in `app/`,
`components/`, `lib/`, or `messages/`. Nothing is expanded, nothing is user-facing.
No action beyond this record, per the standing rule.

**F12 — The repo's font and colour stack is a third direction.** Live:
Playfair Display + Inter + JetBrains Mono, navy `#0D1B2A` / gold `#C9973A` /
cream. Handoff: Space Grotesk + Inter, obsidian `#0A0C11` / lime `#CBFB5E` /
violet / cyan. This is a full token replacement in `tailwind.config.ts` and
`app/globals.css` (587 lines), touching every page. It is the largest single
mechanical change in the UI track and it is not a "component swap".

**F13 — `lucide-react` is used in 10+ files; the UI brief bans third-party
icons.** Removing it is a prerequisite for U0, not a detail.

**F14 — No test runner.** `lib/sanctions/__tests__/normalize.test.ts` exists but
`package.json` has no `test` script and no test dependency. The Foundations brief
requires unit tests on the completeness score. A runner must be added.

**F16 — The live database has drifted ahead of the migrations.** `profiles` in
production carries seventeen columns that **no file in this repository creates**:
`account_type`, `verified_trader`, `organization_id`, `risk_category`,
`completed_deals`, `title`, `languages`, `commodities`, `regions_served`,
`years_active`, `typical_deal_size`, `bio`, `plan`, `plan_status`,
`plan_renews_at`, `stripe_subscription_id`, `verification_tier`. They were added
straight to the database. Applying `supabase/migrations` to an empty project
therefore does not reproduce production, which makes the migration set unusable
as a rebuild path and makes any new migration risky if written from the files
rather than from the live schema. Every migration in track C must be written
against a fresh probe of the live database.

**F17 — The backup was silently incomplete.** `scripts/backup.mjs` listed
fifteen tables against a database with twenty-four. A listed-but-missing table is
a hard failure by design; an existing-but-unlisted table was skipped in silence
and the run still printed "Backup OK". The nine unbacked-up since `20260721f`
included `credit_ledger` (the only record of what anyone paid) and
`verifications` (the only record of what the desk decided). Fixed in commit
`11171e9`; the first complete backup is `2026-07-22_1204`, 31,957 rows.

**F18 — `npm run lint` has never worked.** The script is `next lint`, there is no
`eslint.config.*` or `.eslintrc.*` anywhere, and `eslint` is not a declared
dependency. CI does not lint either: `.github/workflows/ci.yml` runs a secret
scan, env and stray-file checks, message validation, `tsc --noEmit` and
`next build`. Typecheck and build are the real gate; treat the lint script as
decorative until a config is added.

**F15 — Prompt caching needs a payload change `lib/ai.ts` does not support.**
The cost note requires an explicit `cache_control` breakpoint on the last static
block. `callAi` sends `system` as a plain string, which cannot carry one. It
needs to accept a block array. Small change, but it is a change to a KEEP module,
so it is called out here.

---

## 8. Operational constraints confirmed in-repo

- The working copy is inside OneDrive. `git commit` from Bash fails with
  `Unable to create .git/index.lock`; **PowerShell works**. All commits will use
  PowerShell (`docs/platform/SOURCE-OF-TRUTH.md`).
- `.env.local` holds live secrets and is inside OneDrive. Recorded, not touched.
- Working tree is clean; `main` is level with `origin/main`. Nothing unpushed.
- CI: `.github/workflows/ci.yml`; nightly sanctions refresh:
  `.github/workflows/sanctions-refresh.yml`.
