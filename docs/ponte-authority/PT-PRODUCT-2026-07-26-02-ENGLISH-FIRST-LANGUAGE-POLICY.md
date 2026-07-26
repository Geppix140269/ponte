# PT-PRODUCT-2026-07-26-02 — English-First Language and Localisation Policy

**Status:** Approved
**Status date:** 26 July 2026
**Repository:** `Geppix140269/ponte`
**Product owner:** Giuseppe Funaro
**Scope:** every interface surface, present and future

---

## The policy

Ponte Trade is an **English-first, single-interface-language platform**.

English is the canonical and sole interface language. This is a product
decision, not a temporary state pending translation work, and it is not
conditional on demand.

## Why this document exists

`i18n/routing.ts`, the `[locale]` route segment, `next-intl` and the
`messages/` tree are all still present in the repository. A future contributor
reading them reasonably concludes that Ponte is a multilingual product with one
language currently enabled, and then acts on that conclusion: adds a locale,
adds a translation key "for parity", widens a component to take a locale it does
not need, or treats the removal of a locale abstraction as a regression.

That conclusion is wrong. This document exists so the repository states the
intent, rather than leaving it to be inferred from infrastructure.

> **The `next-intl` and `[locale]` structure is repository reality. It is not
> future product architecture. Treat it as legacy compatibility infrastructure.**

## Binding rules

For any current or future work:

1. **Preserve the existing canonical English URLs.** They are the addressable
   product and are linked from email, search and elsewhere.
2. **Do not undertake a routing-framework removal unless it is necessary for the
   work in hand.** Ripping out `next-intl` is a migration with its own risk
   surface, not a cleanup to fold into a feature branch.
3. **Do not add new locale abstractions.** No new locale-aware wrappers, no new
   locale parameters threaded through components that do not need them.
4. **Do not add translation keys solely to preserve multilingual capability.**
   New interface copy may be authored directly in English in the component that
   renders it. A key earns its place only when something other than
   multilingualism justifies it, such as reuse across surfaces.
5. **Do not create language selectors, locale routes or parallel language copy.**
6. **Record the eventual simplification or removal of the i18n wrapper as a
   separate, deliberate migration**, with its own plan, its own URL-preservation
   evidence and its own owner approval. It is not incidental cleanup.

## What this policy does not touch

Natural-language **input** may still be interpreted in any language. A member may
type or speak an objective in Portuguese, Arabic or Mandarin; AI may detect the
language and normalise it into the canonical English commercial object; and
member-entered content may still be displayed translated where that capability
exists (`listing_translations`).

**Input language is not interface language.** Nothing in this policy reduces
Ponte's ability to receive the world's languages. It fixes only the language
Ponte's own interface speaks.

Accessibility states, the reactivation path documented in `LANGUAGES.md`, and
the deferred translation snapshots in `messages/_deferred/` are all preserved as
they stand. Preserving them is not evidence of an intention to use them.

## Relationship to earlier decisions

This supersedes and hardens the 25 July 2026 decision-log entry **"English-only
interface"**, which established English as the sole interface language but left
it framed as a deferral: nine languages "deferred until real market demand
justifies reactivation". That framing is what allows the i18n scaffolding to be
read as a roadmap.

What changes: single-language is now the stated product architecture, and the
scaffolding is explicitly named legacy. What is retained: every operational
consequence of the 25 July decision, including the permanent redirects from old
locale-prefixed URLs, the fallback of unsupported browser locales to English,
the self-hiding language switcher, and the retained deferred snapshots.

## Affected records

- `docs/codex/00-START-HERE.md` (authority order)
- `docs/codex/AUTHORITY-MANIFEST.md`
- `docs/codex/DECISION-LOG.md`
- `docs/codex/CURRENT-STATE.md`
- `AGENTS.md` (English-only engineering rule; unchanged in substance)
- `LANGUAGES.md` (reactivation path; retained)
- `i18n/routing.ts`, `middleware.ts`, `lib/i18n/removed-locales.ts` (legacy
  compatibility infrastructure; unchanged by this document)
