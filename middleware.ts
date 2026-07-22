import createIntlMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { locales, defaultLocale, routing } from "@/i18n/routing";
import { updateSession, applySession } from "@/lib/supabase/middleware";

const intlMiddleware = createIntlMiddleware(routing);

// Routes that must never be locale routed: auth callbacks carry one-time
// tokens and API routes are consumed by code, not people. They keep exactly
// the session-refresh behaviour they had before i18n.
function isUnlocalized(pathname: string): boolean {
  return (
    pathname.startsWith("/api") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/_vercel")
  );
}

// Legacy routes from the shop and Deal Desk eras, mapped to their nearest live
// equivalent. This is the single authority for those redirects.
//
// It lives in middleware rather than in next.config redirects() because on
// Netlify the middleware runs at the edge, ahead of the origin. A bare
// "/cart" was being rewritten to "/en/cart" by the locale middleware before
// the origin's redirect could ever match, so it answered 307 instead of a
// permanent 308 and the ranking signal was not transferring.
const LEGACY_EXACT: Record<string, string> = {
  "/catalogue": "/pricing",
  "/cart": "/marketplace",
  "/checkout": "/marketplace",
  "/order-success": "/marketplace",
  "/methodology": "/about",
  "/why-ponte": "/about",
  "/brokerage": "/marketplace",
  "/network": "/marketplace",
};

const LEGACY_PREFIX: { test: RegExp; to: string }[] = [
  { test: /^\/category\/[^/]+\/?$/, to: "/pricing" },
  { test: /^\/product\/[^/]+\/?$/, to: "/pricing" },
];

function legacyTarget(pathname: string): string | null {
  const clean = pathname.length > 1 ? pathname.replace(/\/$/, "") : pathname;
  if (LEGACY_EXACT[clean]) return LEGACY_EXACT[clean];
  for (const rule of LEGACY_PREFIX) {
    if (rule.test.test(clean)) return rule.to;
  }
  return null;
}

// Split "/es/cart" into ["/es", "/cart"], and "/cart" into ["", "/cart"].
function splitLocale(pathname: string): [string, string] {
  const segments = pathname.split("/");
  const first = segments[1];
  if (locales.includes(first as (typeof locales)[number]) && first !== defaultLocale) {
    const rest = "/" + segments.slice(2).join("/");
    return [`/${first}`, rest === "/" ? "/" : rest.replace(/\/$/, "")];
  }
  return ["", pathname];
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isUnlocalized(pathname)) {
    return await updateSession(request);
  }

  // Retired URLs answer with a permanent redirect, keeping the reader's
  // language. A Spanish reader hitting a dead shop URL lands on the Spanish
  // page, not back in English.
  const [prefix, rest] = splitLocale(pathname);
  const target = legacyTarget(rest);
  if (target) {
    const url = request.nextUrl.clone();
    url.pathname = `${prefix}${target}`;
    return NextResponse.redirect(url, 308);
  }

  // next-intl decides the locale and owns the response, then the Supabase
  // session cookies are attached to that same response.
  const response = intlMiddleware(request) ?? NextResponse.next({ request });
  return await applySession(request, response);
}

export const config = {
  matcher: [
    // Run on app routes, skipping static assets and image files.
    //
    // manifest.webmanifest and sw.js are excluded by name because neither is
    // a page: the locale middleware would rewrite /manifest.webmanifest to
    // /en/manifest.webmanifest, which is a 404, and the install prompt would
    // never appear. A service worker also has to be served from the root to
    // control the whole origin, so it must not be moved or prefixed.
    // html is in the extension list because a static file served straight out
    // of public/ is not a page and must not be locale routed. Without it,
    // /preview/a.html was rewritten to /en/preview/a.html and answered 404,
    // the same fault that would have silently killed the manifest. No App
    // Router route ends in .html, so nothing real is excluded by adding it.
    // Deliberately NOT adding xml or json here: sitemap.xml and robots.txt are
    // generated routes, and excluding a route to fix a static file is how you
    // trade one silent 404 for another.
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|html)$).*)",
  ],
};
