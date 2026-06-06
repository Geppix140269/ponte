// Supported locales for ponte.trade. English is the source of truth; others fall
// back to English per-key, so partial translations are safe to ship incrementally.
export const SUPPORTED_LOCALES = ["en", "it", "es", "pt", "fr", "de", "zh", "ar"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";

const RTL: ReadonlySet<Locale> = new Set<Locale>(["ar"]);
export function isRtl(locale: Locale): boolean { return RTL.has(locale); }
export function dir(locale: Locale): "ltr" | "rtl" { return isRtl(locale) ? "rtl" : "ltr"; }

export const LOCALE_LABEL: Record<Locale, string> = {
  en: "English", it: "Italiano", es: "Español", pt: "Português",
  fr: "Français", de: "Deutsch", zh: "中文", ar: "العربية",
};

export function isLocale(x: string): x is Locale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(x);
}
