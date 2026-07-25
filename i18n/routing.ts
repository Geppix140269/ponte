import { defineRouting } from "next-intl/routing";

// Ponte is English-first. English is the canonical product and operational
// language; Spanish is the one additional fully supported interface language.
// Multilingual *input* (typed or spoken in any language) is a separate,
// preserved capability handled by the landing intent/interpret layer, not by
// this interface-locale list. See LANGUAGES.md.
//
// Adding a language back is a content task: move its file out of
// messages/_deferred/ into messages/, add the code here (plus localeNames and
// hreflangFor), and it ships.
export const locales = ["en", "es"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

// Interface languages deferred until real market demand justifies reactivation.
// Their translations are retained in messages/_deferred/ and their old URLs are
// permanently redirected to English by middleware.ts. This is the single
// authority for that list; check-messages and the middleware redirect read the
// same set through lib/i18n/removed-locales.ts.
export const deferredLocales = [
  "zh",
  "ar",
  "fr",
  "pt",
  "ru",
  "de",
  "hi",
  "it",
] as const;

// Right to left scripts. Used for <html dir> and logical CSS. No active locale
// is RTL today (Arabic is deferred), but the plumbing stays so reactivating a
// RTL language is a one-line change.
export const rtlLocales: Locale[] = [];

export function isRtl(locale: string): boolean {
  return rtlLocales.includes(locale as Locale);
}

// Map an incoming/candidate locale to a supported one. Anything not actively
// supported (a deferred language, an unsupported browser locale such as "ja")
// falls back to English, the canonical language.
export function resolveLocale(candidate: string | undefined | null): Locale {
  return locales.includes(candidate as Locale)
    ? (candidate as Locale)
    : defaultLocale;
}

// Native names for the switcher. Shown in the language itself, which is what
// a non-English speaker scans for.
export const localeNames: Record<Locale, string> = {
  en: "English",
  es: "Español",
};

// hreflang values. Search engines want a language or language-region tag.
export const hreflangFor: Record<Locale, string> = {
  en: "en",
  es: "es",
};

export const routing = defineRouting({
  locales,
  defaultLocale,
  // English keeps its bare URLs, so every link already indexed still resolves.
  // Spanish is prefixed, for example /es/marketplace.
  localePrefix: "as-needed",
  // First visit is matched on Accept-Language, then persisted in a cookie.
  // Once a visitor picks a language the cookie wins, so we never override
  // an explicit choice. An unsupported browser locale falls back to English.
  localeDetection: true,
});
