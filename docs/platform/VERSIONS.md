# Versions

Newest first. One entry per meaningful change to what is live. Update this in
the same pull request as the change.

Format: date, what changed, why, and anything that needs watching afterwards.

---

## 21 July 2026, platform hygiene

**Status:** shipped to `main` and live.

- One branch. Ten stale remote branches were removed after confirming each had
  zero commits not already in `main`, so nothing was lost. `main` is now the
  only branch on the remote.
- Legacy redirects moved out of `next.config.mjs` and into `middleware.ts`.
  On Netlify the middleware runs at the edge, ahead of the origin, so a
  redirect declared in the config never saw an unprefixed URL: the locale
  middleware had already rewritten it. The same URL was answering 307 in
  English and 308 in Spanish. One authority now, verified live: `/cart`,
  `/network`, `/catalogue`, `/brokerage`, `/why-ponte`, `/methodology`,
  `/product/*` and `/category/*` all return 308, and a prefixed URL keeps its
  language, so `/es/cart` lands on `/es/marketplace`.
- Commits go straight to `main` by the owner's decision. The pre-commit guard
  against secrets, env files and stray files stays.

- Backed up all three local clones as full history bundles before any cleanup.
- Established one source of truth and retired two stale clones that had been
  publishing competing versions of the site. See
  [SOURCE-OF-TRUTH.md](SOURCE-OF-TRUTH.md).
- Added this documentation set.
- Audit found no credential has ever been committed to the repository. Live
  exposures are local: see the open actions in [SECRETS.md](SECRETS.md).

## 21 July 2026, ten language interface

**Status:** shipped to `main` and live on ponte.trade. Verified after deploy:
`/`, `/marketplace` and `/pricing` serve English on their original URLs, and
`/es/marketplace`, `/zh/marketplace` and `/ar/marketplace` all serve.

- next-intl with `app/[locale]` routing. English keeps bare URLs, other
  languages are prefixed, so indexed URLs do not move.
- Languages: en, zh, es, ar, fr, pt, ru, de, hi, it. 419 strings each.
- Locale from an explicit cookie choice first, then `Accept-Language`. An
  explicit choice is never overridden.
- Arabic renders right to left.
- Per locale metadata, hreflang alternates, and a sitemap covering every
  language.
- Listing content translation was left alone and integrated with: on a
  prefixed URL the "Read in" bar defaults to the reader's language when that
  translation already exists.
- Terms and Privacy stay English behind a translated notice. Admin stays
  English.
- `scripts/check-messages.mjs` gates all locales on key parity, ICU
  placeholders, rich text tags and a ban on em dashes.

**Fixed on the way:** the incoterm select had no `value` attribute, so its
option value was its own label. The initial state matched nothing and the first
option submitted the literal label text. Once translated, a French user would
have written French into the database.

**Also fixed:** `package.json` was missing `next-intl` entirely, which would
have failed a clean install on the host, and listed `openai` twice.

## 21 July 2026, one story

- Legacy shop and Deal Desk routes now return permanent redirects from
  `next.config.mjs` instead of temporary ones from page level stubs, so search
  ranking transfers. Locale prefixed variants redirect too.
- The Deal Sheet page is retired into the one door Marketplace. The digest form
  and its submit type stay, for the alerts work.
- The header no longer shows a cart icon. A stale browser cart from the shop
  era made it reappear for returning visitors.
- Deleted ten `.clean` backup files that had been committed.

## Earlier, from git history

- Phase 2 AI account manager, and Ponte AI at $19 per month.
- Free vetted marketplace with direct connect, desk optional on a success fee
  or retainer.
- AI vetting co-pilot: the model reviews every listing for the desk.
- Listing translation, drafts, guest building and WhatsApp share pages.
- Counterparty role and chain depth on listings.
- Auth links that work anywhere, via a token hash confirm route.
- Profiles role locked against self promotion.
