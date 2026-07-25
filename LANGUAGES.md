# Languages

Ponte is **English-first**. English is the canonical product and operational
language; **Spanish** is the one additional fully supported interface language.
Everything else is a deferred interface language, retained but not built.

Keep three concerns separate. They are not the same system.

1. **Interface language** — the language the UI chrome renders in. Two active:
   `en` (default, canonical) and `es`.
2. **User input language** — a member may type or speak a commercial objective
   in **any** language. Ponte detects and interprets it. This is never
   restricted by the interface language.
3. **Canonical structured output** — the normalised commercial object is always
   English (product as an English trade name, English HS lookup, English stored
   fields). Database object names and workflow states stay English.

Current interface locales: `en` (default), `es`.
Deferred interface locales: `zh`, `ar`, `fr`, `pt`, `ru`, `de`, `hi`, `it`
(translations frozen in `messages/_deferred/`).

## How it works

| Piece | File | What it does |
|---|---|---|
| Locale list | `i18n/routing.ts` | Active locales, default, deferred list, RTL set, native names, hreflang, `resolveLocale` fallback |
| Message loading | `i18n/request.ts` | Loads `messages/<locale>.json` per request; unsupported locales fall back to English |
| Locale aware links | `i18n/navigation.ts` | `Link`, `useRouter`, `usePathname` that keep the active language |
| Routing, session, redirects | `middleware.ts` | Detects locale, refreshes the Supabase session, and 308-redirects removed-locale URLs to English |
| Removed-locale redirects | `lib/i18n/removed-locales.ts` | Pure, unit-tested logic that maps `/fr/…` to the English path |
| SEO helpers | `lib/seo.ts` | Canonical URLs and hreflang alternates (active locales only) |
| Switcher | `components/LanguageSwitcher.tsx` | Globe menu in the header, lists active locales |

English keeps bare URLs (`/marketplace`). Spanish is prefixed
(`/es/marketplace`), so links already indexed keep resolving.

### Detection order

1. An explicit choice, stored in the `NEXT_LOCALE` cookie. This always wins.
2. The browser `Accept-Language` header, on a first visit, matched against the
   active locales.
3. English, for anything unmatched (including a deferred or unshipped locale
   such as `ja`).

A visitor who picks a language is never redirected away from it.

### Removed-locale URLs

An old link under a retired interface language never 404s. `middleware.ts`
permanently redirects it to the canonical English path, applying any legacy
shop/desk mapping in the same hop:

- `/fr/marketplace` → `/marketplace`
- `/de` → `/`
- `/zh/cart` → `/marketplace`

The target is always an unprefixed English path, so there is no redirect loop.

## Multilingual capabilities that remain (input, not interface)

These are deliberately preserved and are independent of the interface locale:

- Natural-language typed input in any language — `lib/landing/intent.ts`
  (deterministic, takes no locale) and `lib/landing/interpret.ts` (AI, any
  language, returns an English trade name).
- Voice input where the browser supports it — `components/home/landing/VoiceSheet.tsx`.
- AI language detection and normalisation into the canonical English object.
- Optional translated display of member-entered listing content — the "Read in"
  bar on a listing page, cached in the `listing_translations` table. This is a
  separate system from interface messages; do not merge them.
- The rotating multilingual placeholder examples on the landing
  (`lib/landing/examples.ts`) demonstrate that Ponte reads objectives in the
  user's own words. They are fixed and are not tied to the site locale.

## Reactivate a deferred interface language

Additional full interface languages are deferred until real market demand
justifies them. To bring one back (for example Italian):

1. Move its file back: `messages/_deferred/it.json` → `messages/it.json`.
2. Add the code to `locales` in `i18n/routing.ts` and remove it from
   `deferredLocales`.
3. Add its native name to `localeNames` (e.g. `it: "Italiano"`) and its hreflang
   tag to `hreflangFor`.
4. Remove it from `removedLocales` in `lib/i18n/removed-locales.ts` and from
   `DEFERRED_LOCALES` in `scripts/check-messages.mjs` (so it is gated for full
   parity again).
5. If the script runs right to left, add the code to `rtlLocales` and add a
   BCP-47 tag to `SPEECH_LANG` in `components/home/landing/PonteLanding.tsx`.
6. Run `npm run verify`. A missing key fails loudly rather than silently
   rendering English.

Everything downstream of `locales` (the switcher, static params, the sitemap and
hreflang alternates) is data-driven, so no further wiring is needed.

## Add a brand-new language

Same as reactivation, but instead of moving a file, copy `messages/en.json` to
`messages/<code>.json` and translate the values. Keep every key, and keep the
key names in English.

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
- **Stored structured commercial objects, database object names and workflow
  states** stay English. English is the source of truth.
- **Listing content** is a separate mechanism (see above). Interface messages
  and listing content are not the same system, do not merge them.

## Review status

The Spanish interface file was reviewed as part of the two active locales. The
eight deferred files in `messages/_deferred/` are machine-translated starting
points from the earlier ten-locale build and would need a native pass before any
are reactivated for a paid campaign.
