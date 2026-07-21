# Languages

Ponte's interface ships in ten languages. Adding another is a content task: no
routing, middleware or component changes are required.

Current locales: `en` (default), `zh`, `es`, `ar`, `fr`, `pt`, `ru`, `de`, `hi`, `it`.

## How it works

| Piece | File | What it does |
|---|---|---|
| Locale list | `i18n/routing.ts` | Locales, default, RTL set, native names, hreflang tags |
| Message loading | `i18n/request.ts` | Loads `messages/<locale>.json` per request |
| Locale aware links | `i18n/navigation.ts` | `Link`, `useRouter`, `usePathname` that keep the active language |
| Routing and session | `middleware.ts` | Detects locale, then refreshes the Supabase session |
| SEO helpers | `lib/seo.ts` | Canonical URLs and hreflang alternates |
| Switcher | `components/LanguageSwitcher.tsx` | Globe menu in the header |

English keeps bare URLs (`/marketplace`). Other languages are prefixed
(`/zh/marketplace`), so links already indexed keep resolving.

### Detection order

1. An explicit choice, stored in the `NEXT_LOCALE` cookie. This always wins.
2. The browser `Accept-Language` header, on a first visit.
3. English.

A visitor who picks a language is never redirected away from it.

## Add a language

1. Add the code to `locales` in `i18n/routing.ts`.
2. Add its native name to `localeNames`, for example `ja: "日本語"`.
3. Add its hreflang tag to `hreflangFor`. Use a script subtag only where it
   matters, as with `zh-Hans`.
4. If the script runs right to left, add the code to `rtlLocales`.
5. Copy `messages/en.json` to `messages/<code>.json` and translate the values.
   Keep every key, and keep the key names in English.
6. Add the code to `NON_DEFAULT_LOCALES` in `next.config.mjs`, so the legacy
   redirects resolve in that language too.
7. Run `npx next build`. A missing key fails loudly rather than silently
   rendering English.

## Writing rules

These apply to every language, not just English.

- Never use em dashes. Use commas, colons or full stops.
- Short sentences. Concrete trade language. No hype, no emoji.
- Keep untranslated: **Ponte**, **Ponte AI**, **NCNDA**, incoterms (FOB, CIF,
  EXW, DAP), unit and container codes (MT, KG, FCL, TEU), currency codes and
  amounts, listing references such as `PT-1234`, HS codes, company names,
  `1402 Celsius Ltd` and its registration numbers.
- Trade professional register. Address the reader directly.

## What is deliberately not translated

- **Terms and Privacy** stay in English. The legal originals are English, and a
  translated contract would be a second, unreviewed instrument.
- **Admin** (`app/[locale]/admin/**`) stays English. It is internal.
- **JSON-LD structured data** stays English. It is read by machines and the
  entity names are proper nouns.
- **Listing content** is a separate mechanism. Member submitted listings are
  translated through the `listing_translations` table and surfaced by the
  "Read in" bar on a listing page. On a prefixed URL that bar defaults to the
  current interface language. Interface messages and listing content are not
  the same system, do not merge them.

## Review status

Machine translation in a trade professional register was used for the nine
non-English files as a starting point.

- [ ] `zh` needs native review
- [ ] `ar` needs native review, including the right to left layout
- [ ] Remaining locales would benefit from a native pass before any paid campaign
