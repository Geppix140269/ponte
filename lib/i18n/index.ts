import { DEFAULT_LOCALE, isLocale, type Locale } from "./locales";
import { DICTIONARIES, EN, type MessageKey } from "./dictionaries";

export type { Locale } from "./locales";
export type { MessageKey } from "./dictionaries";
export { SUPPORTED_LOCALES, DEFAULT_LOCALE, LOCALE_LABEL, isLocale, isRtl, dir } from "./locales";

// Translate a key for a locale. Falls back to English, then to the key itself,
// so a missing translation degrades gracefully instead of throwing.
export function t(key: MessageKey, locale: Locale = DEFAULT_LOCALE): string {
  const dict = DICTIONARIES[locale] ?? {};
  return (dict as Partial<Record<MessageKey, string>>)[key] ?? EN[key] ?? key;
}

// Bind a translator to a locale (handy in a component/layout).
export function translator(locale: Locale): (key: MessageKey) => string {
  return (key) => t(key, locale);
}

// Resolve the best supported locale from an Accept-Language header and/or a
// locale cookie. Cookie wins when present and supported.
export function resolveLocale(opts?: { cookie?: string | null; acceptLanguage?: string | null }): Locale {
  const cookie = opts?.cookie?.trim();
  if (cookie && isLocale(cookie)) return cookie;
  const header = opts?.acceptLanguage;
  if (header) {
    const langs = header.split(",").map((p) => p.split(";")[0]?.trim().toLowerCase().split("-")[0]).filter(Boolean);
    for (const l of langs) if (l && isLocale(l)) return l as Locale;
  }
  return DEFAULT_LOCALE;
}
