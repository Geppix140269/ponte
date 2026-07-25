# Localisation simplification — impact report

**Date:** 25 July 2026
**Branch:** `claude/ponte-localisation-simplify-9b7b10`
**Author:** Codex (agent)
**Governing authority:** `docs/ponte-authority/00-MASTER-IMPLEMENTATION-BRIEF.md`

## Product decision being implemented

Ponte's interface becomes **English-only**.

- **English** is the canonical product and operational language, the sole
  interface language, and the source of truth for terminology, prompts, admin,
  and stored structured commercial objects.
- Every other interface language, **including Spanish**, is deferred until real
  market demand justifies it. Their translations are retained for reactivation.
- Users may still speak or type commercial intent in any language; Ponte
  detects, interprets and normalises that into the canonical English commercial
  object, and may show a translated rendering back.

This reduces localisation complexity without a redesign and without touching
Supabase schema or production configuration.

> Note: this English-only scope narrows an earlier same-day step that had kept
> Spanish as a second interface language. See the DECISION-LOG for both entries.

## Pre-implementation safety confirmation (the gate)

The task requires that, before implementation begins, this report confirms three
things. All three are confirmed from direct code inspection:

### 1. No user data is deleted

- No database schema, migration, or Supabase change is involved. The
  `listing_translations` table and every stored row are untouched.
- User-entered listing content and its cached translations remain intact and
  reachable through the listing "Read in" bar (`?lang=…` query parameter,
  decoupled from interface routing).
- The deferred interface message files (Spanish and the other eight) are
  **preserved** in `messages/_deferred/`, not deleted, so any interface language
  can be reactivated.

**Confirmed: reducing to English deletes no user data.**

### 2. No stored URL breaks

- English keeps its bare, unprefixed URLs exactly as today (`localePrefix:
  "as-needed"`, `defaultLocale: "en"`). Every English URL already indexed is
  unchanged.
- Every old locale-prefixed URL (`/es/…`, `/fr/…`, `/de/…`, `/zh/…`, `/ar/…`,
  `/pt/…`, `/ru/…`, `/hi/…`, `/it/…`) is caught in middleware and
  **308-redirected** to the canonical English equivalent (the same path with the
  dead locale prefix stripped), then any legacy shop/desk mapping is applied in
  the same hop. `/es/marketplace` → `/marketplace`, `/de` → `/`, `/zh/cart` →
  `/marketplace`.
- The redirect target is always an unprefixed (English) path, which is not
  itself a removed-locale prefix, so there is **no redirect loop** and **no
  404**.

**Confirmed: no stored URL breaks; old locale-prefixed URLs are permanently
redirected, not 404'd.**

### 3. Multilingual intent input is not disabled

The three language concerns are kept strictly separate:

| Concern | Mechanism | Effect of this change |
|---|---|---|
| **Interface language** | `next-intl` locale routing + `messages/<locale>.json` | Reduced to `en` only |
| **User input language** | Free-text/voice objective in any language | **Unchanged** |
| **Canonical structured output** | English trade object from AI normalisation | **Unchanged** (already English) |

- Deterministic intent inference (`lib/landing/intent.ts`) takes **no locale
  parameter**; it reads objectives independently of the interface language.
- AI interpretation (`lib/landing/interpret.ts`) reads an objective in **any**
  language, detects the language, and returns the product as an English trade
  name for the downstream HS lookup. Untouched.
- Voice input (`components/home/landing/VoiceSheet.tsx`) uses the browser Web
  Speech API where supported. Untouched.
- The rotating multilingual placeholder examples (`lib/landing/examples.ts`) —
  English, Italian, Chinese, Arabic, Spanish — demonstrate that Ponte reads
  objectives in the user's own words and are explicitly *not* tied to interface
  locale. **Kept as-is.**

**Confirmed: multilingual natural-language and voice intent input remain fully
available.** A regression test asserts that Spanish and Italian input still
classify even though neither is an interface language.

## Change set

Everything downstream of `i18n/routing.ts` (`LanguageSwitcher`,
`generateStaticParams`, `sitemap`, `lib/seo` alternates) is **driven by the
`locales` array**, so reducing that array to `["en"]` automatically:

- builds only English static pages;
- emits only English in the sitemap and hreflang alternates;
- leaves the language selector with a single entry — which now **hides itself**
  (nothing to switch to).

Explicit edits:

1. `i18n/routing.ts` — active `locales = ["en"]`; `deferredLocales` (now 9,
   including `es`); `rtlLocales = []`; `localeNames`/`hreflangFor` reduced to
   English; `resolveLocale()` fallback.
2. `i18n/request.ts` — use `resolveLocale()` so any unsupported/deferred browser
   locale falls back to English.
3. `middleware.ts` + `lib/i18n/removed-locales.ts` — 308-redirect any old
   locale-prefixed URL (including `/es/…`) to the English path, composing with
   the legacy map; pure logic unit-tested.
4. `components/LanguageSwitcher.tsx` — renders nothing while only one interface
   language is active (guard placed after all hooks, so the Rules of Hooks
   hold).
5. `messages/_deferred/` — the 9 deferred locale files (Spanish + eight others)
   held here, preserved for reactivation. Only `en.json` stays in `messages/`.
6. `scripts/check-messages.mjs` — gate parity on English only; deferred files
   are checked for JSON validity only.
7. Tests — `market-signals` and `block-d` copy tests iterate English only; new
   `lib/i18n/__tests__/routing.test.ts` covers the active list, fallback,
   removed-locale redirects (incl. `/es/…`), selector data, and
   locale-independent intent input.
8. Docs — `LANGUAGES.md`, `CURRENT-STATE.md`, `DECISION-LOG.md`, `AGENTS.md`
   updated to English-only.

## Deferred interface locales (9)

Spanish `es`, Chinese `zh`, Arabic `ar`, French `fr`, Portuguese `pt`, Russian
`ru`, German `de`, Hindi `hi`, Italian `it`.

Their translation files are **retained** in `messages/_deferred/`. RTL support
(`ar`) is dormant but the `isRtl`/`rtlLocales`/`dir` plumbing stays in place for
reactivation.

## Preserved multilingual capabilities

- Natural-language typed input in any language (deterministic + AI paths).
- Voice input in any language where the browser supports it.
- AI language detection and normalisation into the canonical English commercial
  object.
- Optional translated display of user-entered content (listing "Read in" bar +
  `listing_translations`).
- Multilingual placeholder demonstration on the landing.
- Future language expansion by moving a file back and adding one code —
  documented in `LANGUAGES.md`.

## Redirect behaviour summary

| Requested | Result |
|---|---|
| `/marketplace` (English) | Unchanged (200) |
| `/es/marketplace` (deferred Spanish) | 308 → `/marketplace` |
| `/fr/marketplace` and other deferred locales | 308 → `/marketplace` |
| `/de` (bare deferred locale) | 308 → `/` |
| `/zh/cart` (deferred locale + legacy shop URL) | 308 → `/marketplace` |
| Unsupported `Accept-Language` (e.g. `ja`) | Served in English |

## Governance conflict noted

`AGENTS.md` previously stated "Preserve ten-locale support". This task is an
explicit owner product decision that supersedes it. `AGENTS.md` and
`DECISION-LOG.md` are updated in the same change so the repository record is
consistent. No other authority document depends on the locale count.

## Explicitly out of scope

No Supabase schema change or migration; no production environment variable
change; no visual redesign; no product copy rewrite; no change to database object
names or workflow states; no change to L1–L4 / Trust Score.
