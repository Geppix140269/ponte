# Decision log

Newest entries should be added at the top with date, decision, rationale and affected areas.

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
