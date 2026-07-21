import {
  defaultLocale,
  hreflangFor,
  locales,
  type Locale,
} from "@/i18n/routing";

export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://ponte.trade";

// Build the absolute URL for a path in a given language. English stays
// unprefixed so URLs already indexed keep resolving.
export function localeUrl(pathname: string, locale: Locale): string {
  const clean = pathname === "/" ? "" : pathname;
  return locale === defaultLocale
    ? `${APP_URL}${clean || "/"}`
    : `${APP_URL}/${locale}${clean}`;
}

// hreflang map for one page across every language, plus x-default pointing at
// English. Search engines use this to serve the right language and to avoid
// treating the translations as duplicate content.
export function localeAlternates(pathname: string) {
  const languages: Record<string, string> = {};
  for (const locale of locales) {
    languages[hreflangFor[locale]] = localeUrl(pathname, locale);
  }
  languages["x-default"] = localeUrl(pathname, defaultLocale);
  return languages;
}

// Drop straight into a page's `alternates`.
export function alternatesFor(pathname: string, locale: Locale) {
  return {
    canonical: localeUrl(pathname, locale),
    languages: localeAlternates(pathname),
  };
}
