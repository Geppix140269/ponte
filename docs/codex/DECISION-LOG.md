# Decision log

Newest entries should be added at the top with date, decision, rationale and affected areas.

## 27 July 2026 — Deal Room adopted as the controlled PROGRESS layer

**Decision:** Ponte Trade adopts the Deal Room as a controlled multi-party workspace used after credible commercial interest to progress a cross-border transaction through an agreed procedure. The procedure is the central product object. Admission requires a Deal Room-ready Business Passport, declared organisation or capacity and role, and versioned acceptance of the Deal Room Participation Agreement, confidentiality/NDA obligations and room-specific rules.

**Progress and engagement:** The Deal Room may use named commercial stages, stable weighted procedural completion, meaningful milestones and momentum to make genuine transaction progress visible and motivating. Procedural completion is never a Trust Score, risk score, value score or probability of closing. Points, coins, public leaderboards, popularity badges, random rewards, artificial countdowns and penalties for legitimate due diligence are excluded.

**Authority effect:** ADR-0003 and `PT-PRODUCT-2026-07-27-01-DEAL-ROOM-PRODUCT-CONTRACT-V1.md` provide the separate approval contemplated by the North Star for Business Passport, only for Deal Room admission product definition. They supersede the Master Implementation Brief's blanket Deal Room deferral only for product definition. Ponte remains a wider commercial-intelligence and controlled-execution product, not primarily a Deal Room.

**Implementation boundary:** Product definition is accepted; implementation is not started or authorised. No screen design, technical architecture, schema, migration, runtime code, production action, deployment, electronic-signature platform, payment, escrow, trade-finance execution or autonomous negotiation is included. Issue #51 tracks the remaining product-definition outputs required before Design.

**Affected areas:** `docs/ponte-authority/PT-PRODUCT-2026-07-27-01-DEAL-ROOM-PRODUCT-CONTRACT-V1.md`, `docs/decisions/ADR-0003-deal-room-product-contract.md`, `docs/decisions/README.md`, `docs/codex/00-START-HERE.md`, `docs/codex/AUTHORITY-MANIFEST.md`, `docs/codex/CURRENT-STATE.md`, issues #50 and #51.

## 26 July 2026 — Ponte Desk is the selected interface implementation

**Decision:** Direction 02, "The Desk", from the Ponte Trade interface-redesign handoff is the selected visual and behavioural implementation for the entry surfaces and for the R-FIND and R-SUBMIT journeys, with exactly two borrowings: The Ledger fact register on dense result sets, and the Atlas ink knowledge boundary on Market Signal detail. Ponte Flow (PR #38) remains the semantic icon and motion implementation; no second design-system layer is created.

**What it supersedes:** the entry composition in §5 of `docs/ponte-authority/00-NORTH-STAR-ENTRY-ARCHITECTURE.md` as first issued on 25 July 2026, recorded below as "North Star entry reset: two primary routes". Superseded specifically: the two-route bridge as the landing's central device, the search field beneath it, the counts-derived "popular areas" row, and the trust and evidence block as the landing's composition. The North Star document is amended in place; no competing landing specification exists.

**What is retained:** every product principle in §3 of that document, the separation of Market Signals and Member Opportunities in data, status, language and actions, `lib/landing/routing.ts` as the sole destination authority, and every journey feature flag. No flag, destination or schema changed.

**Three rules the implementation must hold, and does:** the journey rail carries journey stations only and is never navigation, so the landing has no rail at all (`lib/desk/journey.ts`); one authority decides which commercial facts a record shows at every width and in every context, and contexts differ in count only (`lib/desk/facts.ts`, with the production boundary in `lib/desk/adapter.ts`); and nothing is inferred, so a fact the record does not state reads "Not stated" and is never filled.

**Honesty constraints applied against the prototype:** the prototype's market-pulse strip is omitted because no production query backs any of its four values; the sector grid is headed "Browse by sector" and prints no count, because all 3,517 public signals currently carry a null HS code and an HS-derived count would read zero (Issue #42); no prototype record, reference or date ships as data; and the Qualified Opportunities section is omitted rather than shown empty, per §3.2.

**Scope of the first slice:** landing, Market Signals listing, Market Signal detail, and their loading, empty, error and invalid states, desktop and 390px. Explicitly excluded and deferred to later slices: action-aware authentication, investigation and watch workflows, the Start a Deal redesign, the saved and submitted routes, and legacy-route retirement.

**Affected areas:** `docs/ponte-authority/00-NORTH-STAR-ENTRY-ARCHITECTURE.md` (amended §5, §15 and a new supersession section), `lib/desk/*` (new), `components/desk/*` (new), `app/[locale]/page.tsx`, `app/[locale]/market-signals/page.tsx`, `app/[locale]/market-signals/loading.tsx` (new), `app/[locale]/market-signals/[id]/page.tsx`, `lib/board/market-signals.ts` (`readMarketSignals` added so a failed read stays distinguishable from an empty one).

## 26 July 2026 — English-only interface with multilingual input is the product architecture, not a deferral

**Decision:** `docs/ponte-authority/PT-PRODUCT-2026-07-26-02-ENGLISH-ONLY-INTERFACE-POLICY.md`, the English-Only Interface and Multilingual Input Policy, is approved. The interface and every piece of content Ponte itself controls are English only. Multilingual natural-language input remains supported, AI may interpret and translate it, and no i18n-level parallel interface is maintained. English as the sole interface language is a product decision, not a state pending translation work.

**Why:** the 25 July "English-only interface" decision achieved the operational outcome but framed it as a deferral, with nine languages awaiting demand. Meanwhile `i18n/routing.ts`, the `[locale]` segment, `next-intl` and `messages/` all remain in the repository. A contributor reading that infrastructure reasonably concludes Ponte intends to become multilingual, and then adds a locale abstraction or a translation key to preserve a capability nobody plans to use. The repository has to state the intent rather than leave it to be inferred.

**Binding rules:** preserve the existing canonical English URLs; do not undertake a risky routing-framework removal unless necessary; add no new locale abstractions; add no translation keys solely to preserve multilingual capability; create no language selectors, locale routes or parallel language copy; treat the current English-only i18n wrapper as legacy compatibility infrastructure; and record its eventual simplification or removal as a separate, deliberate migration with its own approval.

**What is untouched:** natural-language input in any language, AI language detection and normalisation, translated display of member content, accessibility states, the reactivation path in `LANGUAGES.md`, the deferred snapshots in `messages/_deferred/`, and the permanent redirects from old locale-prefixed URLs. Input language is not interface language.

**Affected areas:** `docs/ponte-authority/PT-PRODUCT-2026-07-26-02-ENGLISH-ONLY-INTERFACE-POLICY.md` (new), `docs/codex/00-START-HERE.md`, `docs/codex/AUTHORITY-MANIFEST.md`, `docs/codex/CURRENT-STATE.md`. No code change; the policy governs future work.

## 26 July 2026 — Repository source-of-truth operating procedure

**Decision:** Conversations with ChatGPT, Codex, Claude, humans, meetings and research are working inputs. The merged `Geppix140269/ponte` repository is the only canonical operating memory. `docs/codex/SOURCE-OF-TRUTH-SOP.md` governs proposal intake, owner decisions, ADRs, implementation, cross-agent handover and current-state updates. The procedure applies equally to every agent and contributor.

**Why:** Product knowledge and decisions were being fragmented across separate conversations and tools. A decision could be understood in one chat but absent from the repository, leaving the next agent to guess, repeat work or implement an older interpretation.

**Enforcement:** `AGENTS.md` is the common mandatory entry point; `CLAUDE.md` delegates to it rather than creating a parallel authority; GitHub receives a Product Decision proposal form and a source-of-truth pull-request checklist; accepted durable decisions are recorded under `docs/decisions/`; machine-readable contracts live under `docs/schemas/` and `lib/taxonomy/`; current implementation truth remains in `CURRENT-STATE.md`.

**Affected areas:** `AGENTS.md`, `CLAUDE.md`, `docs/codex/SOURCE-OF-TRUTH-SOP.md`, `docs/codex/00-START-HERE.md`, `docs/decisions/*`, `.github/pull_request_template.md`, `.github/ISSUE_TEMPLATE/product-decision.yml`.

## 26 July 2026 — One trade market, three equal primary families

**Decision:** Ponte Trade is one global trade market organised around exactly three equal primary families: Products, Trade services, and Distribution and representation. Every market record has exactly one family, one origin (Market Signal or Member Opportunity), and one intent valid for its family. Each family supports both externally observed signals and opportunities created directly by Ponte Trade members.

**Why:** Trade services and Distribution and representation are genuine forms of cross-border commercial intent, not secondary directories or decorative categories. The architecture must support companies seeking and offering services, distribution, representation, products and brands, using the same market, discovery, creation, matching and lifecycle principles while preserving the factual distinction between external signals and member-created opportunities.

**Consequences:** Explore, Start a deal, ingestion, search, matching, filters, alerts and analytics must derive from the shared contract. The stable logical definitions are in ADR-0001, `lib/taxonomy/market.ts` and `docs/schemas/`. This decision does not by itself authorise a production migration, backfill or scraping operation; those require a reconciled ExecPlan and owner approval.

**Affected areas:** `docs/decisions/ADR-0001-unified-trade-market.md`, `lib/taxonomy/market.ts`, `lib/explore/families.ts`, `lib/taxonomy/__tests__/market.test.ts`, `docs/schemas/market-taxonomy.yaml`, `docs/schemas/market-record.schema.json`, future database, ingestion, creation and Explore implementation.

## 25 July 2026 — North Star entry reset: two primary routes

**Decision:** The Ponte Trade entrance has exactly two primary journeys, Explore the market and Start a deal. `docs/ponte-authority/00-NORTH-STAR-ENTRY-ARCHITECTURE.md` is the governing authority for the entry experience and supersedes all earlier landing, gateway and primary-entry instructions, including the four-route bridge decision recorded below (25 July 2026, "The four bridge routes are direct entrances"), which is retained for history.

**Why:** The entrance was organised around the wrong hierarchy. Four routes split a decision that is really two; the voice control drew more attention than its reliability across browsers and accents justifies; and a visitor searching a product could be met with "No Qualified Opportunity matches yet" while many relevant Market Signals existed. That reads as "Ponte has nothing for me". Ponte has one chance to establish relevance and must give value immediately.

**What changed:** Two bridge routes, both navigating directly; the voice control and its bottom sheet removed with no reserved layout space; a recent market activity band above the masthead built from real public records; the search field beneath the bridge; popular areas derived from real counts; a trust and evidence explanation; and a new `/explore` market universe over Products, Trade services, and Distribution and representation.

**What is preserved:** Check a company and Investigate a signal remain reachable downstream and through search, which still resolves the older `RouteKey` vocabulary through `lib/landing/routing.ts`; that file remains the sole destination authority, so `NEXT_PUBLIC_STRUCTURE_JOURNEY` still decides where Start a deal lands. Market Signals and member records stay separate in data, status, language and actions; only the presentation hierarchy is unified, and every record prints its own true class. Voice input inside journeys (the Find picker, the Check composer, the introduction request) is untouched. Structure keeps its composer, preview, AccountGate, submission payload and Workspace continuation; only its S01 copy changed, to Source a product / Supply a product / Offer a trade service.

**What was deliberately not done:** No migration, no flag change, no monetisation, no verification work, no rewrite of `/find` (PR 3), and no sector drill-down below one level (PR 2). `Reviewed Opportunity` and `Distribution Opportunity` are not used as classifications, because no field in the current schema proves them.

**Affected areas:** `docs/ponte-authority/00-NORTH-STAR-ENTRY-ARCHITECTURE.md` (new), `app/[locale]/page.tsx`, `app/[locale]/explore/page.tsx` (new), `components/home/landing/*` (`VoiceSheet.tsx` deleted), `components/explore/*` (new), `components/ChromeGate.tsx`, `lib/board/activity-logic.ts`, `lib/board/activity-view.ts`, `lib/board/market-activity.ts`, `lib/explore/families.ts`, `lib/landing/bridge.ts` (all new), `lib/landing/analytics.ts`, `lib/landing/examples.ts` (deleted), `messages/_fragments/home.json`, `messages/_fragments/explore.json` (new), `messages/_fragments/structure.json`, and the tests in `lib/board/__tests__/market-activity.test.ts` (new) and `lib/landing/__tests__/bridge-navigation.test.tsx` (rewritten).

## 25 July 2026 — The four bridge routes are direct entrances (superseded by the North Star entry reset above)

**Decision:** A click on one of the four named routes across the gateway bridge — the label or its bridge marker — navigates immediately to that route's journey. It no longer only selects the route, changes the centre copy and focuses the objective field. No objective text, product, company or Continue press is required first; the destination journey collects whatever it still needs.

**Why:** Find, Structure and Check are built journeys. Selecting a route without going anywhere made the application look stuck on the landing page and turned a deliberate decision into a second, avoidable step.

**What is preserved:** The natural-language path is unchanged — an objective may still be typed or spoken, Ponte still reads the route and the facts, still asks when the input is ambiguous or a Find objective names no product, and still carries `intent`, `product` and `company` to the destination. Words already typed ride along with a direct click. `lib/landing/routing.ts` remains the sole destination authority, so the journey feature flags keep deciding between each journey and its fallback. The bridge component knows nothing about routing or flags.

**Analytics:** A direct click emits `route_suggested` then `route_confirmed`. It emits `intent_submitted` only when an objective was actually supplied, so a bare route click is never reported as a submitted objective.

**Affected areas:** `components/home/landing/PonteBridge.tsx` (`onSelect` → `onOpen`), `components/home/landing/PonteLanding.tsx`, `lib/landing/direct-route.ts` (new), `lib/landing/routing.ts` (flags read per call so both states are testable; inlining behaviour unchanged), `lib/landing/__tests__/direct-route.test.ts` and `lib/landing/__tests__/bridge-navigation.test.tsx` (new).

## 25 July 2026 — English-only interface

**Decision:** Ponte's interface is English-only. English is the canonical product and operational language and the sole interface language. Spanish, Chinese, Arabic, French, Portuguese, Russian, German, Hindi and Italian are all deferred until real market demand justifies reactivation. (This supersedes the same-day "English-first" step below, which had kept Spanish as a second interface language; the owner narrowed the scope to English-only.)

**Why:** Maintaining multiple fully localised interfaces was disproportionate complexity for the current stage. A single interface language cuts all translation-parity, review and CI burden without a redesign or any schema change.

**What is preserved:** Multilingual natural-language and voice *input* in any language, AI language detection and normalisation into the canonical English commercial object, optional translated display of member-entered content (`listing_translations`), and the reactivation path. Deferred translations (including Spanish) are retained in `messages/_deferred/`. Old locale-prefixed URLs (including `/es/…`) are permanently (308) redirected to their canonical English path, so no bookmark 404s. Unsupported browser locales fall back to English. The language switcher hides itself while only one interface language is active.

**Affected areas:** `i18n/routing.ts`, `i18n/request.ts`, `middleware.ts`, `lib/i18n/removed-locales.ts`, `components/LanguageSwitcher.tsx`, `app/sitemap.ts` and `lib/seo.ts` (data-driven), `messages/_deferred/*`, `scripts/check-messages.mjs`, locale tests, `LANGUAGES.md`, `AGENTS.md`. Supersedes the earlier "Preserve ten-locale support" instruction. Impact report: `docs/codex/LOCALISATION-SIMPLIFICATION-IMPACT.md`.

## 25 July 2026 — English-first localisation (superseded same day by English-only)

**Decision:** Ponte is an English-first platform. English is the canonical product and operational language; Spanish is the only additional fully supported interface language. Chinese, Arabic, French, Portuguese, Russian, German, Hindi and Italian are removed from the active interface build and deferred until real market demand justifies reactivation.

**Why:** Maintaining ten fully localised interfaces was disproportionate complexity for the current stage. Reducing to two actively supported interface languages cuts translation-parity, review and CI burden without a redesign or any schema change.

**Status:** Superseded the same day by the English-only decision above. Retained for history.

## 25 July 2026 — Governing implementation authority

**Decision:** `docs/ponte-authority/00-MASTER-IMPLEMENTATION-BRIEF.md` is the single self-contained governing implementation authority for the current development cycle.

**Why:** It consolidates the product architecture, Brand v5, messaging and copy, route register, experience blueprints, technical boundaries, implementation programme and acceptance suite. It governs conflicts with older material unless a verified live technical or legal constraint is discovered and reported.

## 25 July 2026 — Phase 0 before new implementation

**Decision:** Codex must complete the repository-to-architecture gap report defined in section 13 of the governing brief before implementing new product behaviour.

**Why:** The repository already contains substantial Journey 1 and Journey 2 work, but the programme sequence, deployment state, feature flags, schema state and newer agentic architecture are not yet fully reconciled.

## 25 July 2026 — Phase 1 direction

**Decision:** After Phase 0 and Giuseppe's approval, the governing programme's next target is the smallest truthful agentic vertical slice:

> Mission setup → meaningful Commercial Development → evidence chain → recommended action → prepared response or investigation → exact preview → human approval → recorded Workspace outcome

**Why:** This is the first complete proof of Ponte as a commercial intelligence and controlled-execution layer rather than a marketplace surface.

## 25 July 2026 — Codex handover model

**Decision:** The repository, not a chat transcript, is the operating memory for future agents. Codex receives `AGENTS.md`, the governing authority, reconciled status, flags, database guardrails, roadmap and versioned ExecPlans.

**Why:** Code was ahead of the visible site and knowledge was fragmented across chats, File Library documents, PR descriptions and stale repository notes.

## 24 July 2026 — Journey-level implementation

**Decision:** Apply Brand v5 while implementing complete connected journeys. Do not repaint the legacy application globally before correcting the product flow.

**Why:** A global repaint would preserve the obsolete marketplace-first information architecture under new styling.

## 24 July 2026 — Product category

**Decision:** Ponte is a commercial intelligence and controlled-execution layer for cross-border trade.

**Not:** a consumer buy/sell marketplace, public lead directory, generic CRM, chatbot, trade-data terminal or consultancy brochure.

## 24 July 2026 — Truth model

**Decision:** Qualified Opportunities, Market Signals, Trade Movements, Price Observations, Business Evidence, Ponte Inference and Commercial Developments are materially different objects and must not be blended.

## 24 July 2026 — Authentication boundary

**Decision:** Let visitors receive useful value first. Authenticate only when Ponte must save, submit, disclose, spend or perform a material external action. Preserve and resume the pending work.

## 24 July 2026 — Trust presentation

**Decision:** Preserve L1-L4 storage temporarily for compatibility, but do not use numbered tiers or a Trust Score as the principal user-facing trust representation. Show evidence type, source, date, result, limitations and expiry instead.

## 24 July 2026 — Human control

**Decision:** AI may observe, structure, analyse, recommend and prepare. Publication, verification, disclosure, payment, third-party contact and commercial commitments require the relevant deterministic workflow and human approval.

## 23 July 2026 — No fabricated traction

**Decision:** Never manufacture member counts, live traders, transaction volume, opportunity volume, urgency or marketplace activity. Thin inventory must be described honestly.
