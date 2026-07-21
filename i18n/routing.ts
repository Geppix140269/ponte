import { defineRouting } from "next-intl/routing";

// Adding a language is a content task: add the code here, drop a matching
// messages/<code>.json next to the others, and it ships. See LANGUAGES.md.
export const locales = [
  "en",
  "zh",
  "es",
  "ar",
  "fr",
  "pt",
  "ru",
  "de",
  "hi",
  "it",
] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

// Right to left scripts. Used for <html dir> and logical CSS.
export const rtlLocales: Locale[] = ["ar"];

export function isRtl(locale: string): boolean {
  return rtlLocales.includes(locale as Locale);
}

// Native names for the switcher. Shown in the language itself, which is what
// a non-English speaker scans for.
export const localeNames: Record<Locale, string> = {
  en: "English",
  zh: "中文",
  es: "Español",
  ar: "العربية",
  fr: "Français",
  pt: "Português",
  ru: "Русский",
  de: "Deutsch",
  hi: "हिन्दी",
  it: "Italiano",
};

// hreflang values. Search engines want a language or language-region tag.
export const hreflangFor: Record<Locale, string> = {
  en: "en",
  zh: "zh-Hans",
  es: "es",
  ar: "ar",
  fr: "fr",
  pt: "pt",
  ru: "ru",
  de: "de",
  hi: "hi",
  it: "it",
};

export const routing = defineRouting({
  locales,
  defaultLocale,
  // English keeps its bare URLs, so every link already indexed still resolves.
  // Other languages are prefixed, for example /zh/marketplace.
  localePrefix: "as-needed",
  // First visit is matched on Accept-Language, then persisted in a cookie.
  // Once a visitor picks a language the cookie wins, so we never override
  // an explicit choice.
  localeDetection: true,
});
