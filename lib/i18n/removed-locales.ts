// Old interface locales that were retired when Ponte became English-first.
// Their URLs (/fr/marketplace, /de, /zh/cart, ...) must never 404: they are
// permanently redirected to the canonical English path. This module holds the
// pure, side-effect-free logic so it can be unit tested without a request.
//
// Kept in sync with `deferredLocales` in i18n/routing.ts. It is duplicated here
// as a plain string set (rather than imported) so the edge middleware and the
// node test runner both load it without pulling in next-intl's routing object.

export const removedLocales = [
  "zh",
  "ar",
  "fr",
  "pt",
  "ru",
  "de",
  "hi",
  "it",
] as const;

const REMOVED = new Set<string>(removedLocales);

/**
 * If `pathname` begins with a removed-locale segment, return the pathname with
 * that segment stripped (the canonical English path). Otherwise return null.
 *
 *   /fr/marketplace -> /marketplace
 *   /de             -> /
 *   /zh/find/o/PT-1 -> /find/o/PT-1
 *   /es/marketplace -> null   (Spanish is still supported)
 *   /marketplace    -> null   (no locale prefix)
 */
export function stripRemovedLocale(pathname: string): string | null {
  const segments = pathname.split("/");
  // segments[0] is "" for an absolute path; segments[1] is the first segment.
  if (!REMOVED.has(segments[1])) return null;
  const rest = "/" + segments.slice(2).join("/");
  return rest === "/" ? "/" : rest.replace(/\/$/, "");
}
