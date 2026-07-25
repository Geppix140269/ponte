# Localisation simplification — impact report

**Date:** 25 July 2026
**Branch:** `claude/ponte-localisation-simplify-9b7b10`
**Author:** Codex (agent)
**Governing authority:** `docs/ponte-authority/00-MASTER-IMPLEMENTATION-BRIEF.md`

## Product decision being implemented

Ponte becomes an **English-first** platform.

- **English** is the canonical product and operational language, and the source of truth for terminology, prompts, admin, and stored structured commercial objects.
- **Spanish** remains the only additional fully supported *interface* language.
- Users may still speak or type commercial intent in any language; Ponte detects, interprets and normalises that into the canonical English commercial object, and may show a translated rendering back.

This reduces localisation complexity without a redesign and without touching Supabase schema or production configuration.

## Pre-implementation safety confirmation (the gate)

The task requires that, before implementation begins, this report confirms three things. All three are confirmed from direct code inspection:

### 1. No user data is deleted

- No database schema, migration, or Supabase change is involved. The `listing_translations` table and every stored row are untouched.
- User-entered listing content and its cached translations remain intact and reachable through the listing "Read in" bar (`?lang=…` query parameter, decoupled from interface routing — see [`app/[locale]/marketplace/l/[ref]/page.tsx`](../../app/[locale]/marketplace/l/[ref]/page.tsx)).
- The eight removed-locale interface message files are **preserved** (moved to `messages/_deferred/`), not deleted, so any interface language can be reactivated.

**Confirmed: reducing active locales deletes no user data.**

### 2. No stored URL breaks

- English keeps its bare, unprefixed URLs exactly as today (`localePrefix: "as-needed"`, `defaultLocale: "en"`). Every English URL already indexed is unchanged.
- Spanish keeps its `/es/…` prefix. Every Spanish URL is unchanged.
- Old removed-locale URLs (`/fr/…`, `/de/…`, `/zh/…`, `/ar/…`, `/pt/…`, `/ru/…`, `/hi/…`, `/it/…`) are caught in middleware and **308-redirected** to the canonical English equivalent (the same path with the dead locale prefix stripped), then any legacy shop/desk mapping is applied in the same hop. `/fr` → `/`, `/de/marketplace` → `/marketplace`, `/zh/cart` → `/marketplace`.
- The redirect target is always an unprefixed (English) path, which is not itself a removed-locale prefix, so there is **no redirect loop** and **no 404**.

**Confirmed: no stored URL breaks; removed-locale URLs are permanently redirected, not 404'd.**

### 3. Multilingual intent input is not disabled

The three language concerns are kept strictly separate:

| Concern | Mechanism | Effect of this change |
|---|---|---|
| **Interface language** | `next-intl` locale routing + `messages/<locale>.json` | Reduced to `en`, `es` |
| **User input language** | Free-text/voice objective in any language | **Unchanged** |
| **Canonical structured output** | English trade object from AI normalisation | **Unchanged** (already English) |

- Deterministic intent inference ([`lib/landing/intent.ts`](../../lib/landing/intent.ts)) takes **no locale parameter**; it reads objectives independently of the interface language and already includes some Spanish/Italian tokens.
- AI interpretation ([`lib/landing/interpret.ts`](../../lib/landing/interpret.ts)) reads an objective in **any** language, detects the language, and returns the product as an English trade name for the downstream HS lookup. Untouched.
- Voice input ([`components/home/landing/VoiceSheet.tsx`](../../components/home/landing/VoiceSheet.tsx)) uses the browser Web Speech API where supported. Untouched.
- The rotating multilingual placeholder examples ([`lib/landing/examples.ts`](../../lib/landing/examples.ts)) — English, Italian, Chinese, Arabic, Spanish — are a **deliberate demonstration that Ponte reads objectives in the user's own words** and are explicitly *not* tied to interface locale. **Kept as-is.**

**Confirmed: multilingual natural-language and voice intent input remain fully available.**

## Current localisation inventory (before)

| Area | File | Role |
|---|---|---|
| Locale list, RTL set, native names, hreflang | `i18n/routing.ts` | 10 locales: en, zh, es, ar, fr, pt, ru, de, hi, it |
| Per-request message loading | `i18n/request.ts` | Loads `messages/<locale>.json`, falls back to default |
| Locale-aware navigation | `i18n/navigation.ts` | `Link`, `useRouter`, `usePathname` |
| Routing + session + legacy redirects | `middleware.ts` | Locale detection, Supabase session, legacy 308s |
| Interface language selector | `components/LanguageSwitcher.tsx` | Globe menu, maps over `locales` |
| Static params | `app/[locale]/layout.tsx` | `generateStaticParams` maps over `locales` |
| Sitemap | `app/sitemap.ts` | One entry per path per locale + hreflang alternates |
| SEO alternates | `lib/seo.ts` | Canonical + hreflang from `locales` |
| Message files | `messages/{10 locales}.json` | Interface strings; `_fragments/` builds `en.json` |
| Message validation | `scripts/check-messages.mjs`, CI `ci.yml` | Parity of all 10 against English |
| Listing content translation | `app/[locale]/marketplace/l/[ref]/page.tsx`, `listing_translations` | AI translation of member listings (separate system) |
| Speech recognition tags | `components/home/landing/PonteLanding.tsx` (`SPEECH_LANG`) | BCP-47 per locale |

## Change set (after)

Everything downstream of `i18n/routing.ts` (`LanguageSwitcher`, `generateStaticParams`, `sitemap`, `lib/seo` alternates) is **driven by the `locales` array**, so reducing that array automatically:

- shows only English + Spanish in the language selector;
- builds only English + Spanish static pages;
- emits only English + Spanish in the sitemap and hreflang alternates.

Explicit edits:

1. `i18n/routing.ts` — active `locales = ["en", "es"]`; `rtlLocales = []`; `localeNames`/`hreflangFor` reduced to active; documented `DEFERRED_LOCALES` for reactivation; new `resolveLocale()` helper for fallback.
2. `i18n/request.ts` — use `resolveLocale()` so any unsupported browser locale falls back to English.
3. `middleware.ts` — add removed-locale detection that 308-redirects `/xx/…` (removed) to the English path, composing with the existing legacy map. Pure logic extracted to `lib/i18n/removed-locales.ts` for unit testing.
4. `messages/_deferred/` — the 8 removed-locale JSON files moved here, preserved for reactivation. `en.json` and `es.json` stay in `messages/`.
5. `scripts/check-messages.mjs` — gate parity on active locales only; deferred files are not gated (they are frozen snapshots).
6. Tests — `lib/board/__tests__/market-signals.test.ts` and `lib/signals/__tests__/block-d.test.ts` iterate active locales; new `lib/i18n/__tests__/routing.test.ts` covers active list, fallback, removed-locale redirects, selector contents, and locale-independent intent input.
7. Docs — `LANGUAGES.md` rewritten (active vs deferred + reactivation steps); `CURRENT-STATE.md`, `DECISION-LOG.md` updated; `AGENTS.md` "Preserve ten-locale support" line reconciled with this decision.

## Removed active interface locales (8)

Chinese `zh`, Arabic `ar`, French `fr`, Portuguese `pt`, Russian `ru`, German `de`, Hindi `hi`, Italian `it`.

Their translation files are **retained** in `messages/_deferred/`. RTL support (`ar`) is dormant but the `isRtl`/`rtlLocales`/`dir` plumbing stays in place for reactivation.

## Preserved multilingual capabilities

- Natural-language typed input in any language (deterministic + AI paths).
- Voice input in any language where the browser supports it.
- AI language detection and normalisation into the canonical English commercial object.
- Optional translated display of user-entered content (listing "Read in" bar + `listing_translations`).
- Multilingual placeholder demonstration on the landing.
- Future language expansion by moving a file back and adding one code — documented in `LANGUAGES.md`.

## Redirect behaviour summary

| Requested | Result |
|---|---|
| `/marketplace` (English) | Unchanged (200) |
| `/es/marketplace` (Spanish) | Unchanged (200) |
| `/fr/marketplace` and other removed locales | 308 → `/marketplace` |
| `/de` (bare removed locale) | 308 → `/` |
| `/zh/cart` (removed locale + legacy shop URL) | 308 → `/marketplace` |
| Unsupported `Accept-Language` (e.g. `ja`) | Served in English |

## Governance conflict noted

`AGENTS.md` currently states "Preserve ten-locale support". This task is an explicit owner product decision that supersedes it. `AGENTS.md` and `DECISION-LOG.md` are updated in the same change so the repository record is consistent. No other authority document depends on the ten-locale count.

## Explicitly out of scope

No Supabase schema change or migration; no production environment variable change; no visual redesign; no product copy rewrite; no change to database object names or workflow states; no change to L1–L4 / Trust Score.
