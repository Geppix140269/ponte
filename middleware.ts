import createIntlMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { locales, defaultLocale, routing } from "@/i18n/routing";
import { stripRemovedLocale } from "@/lib/i18n/removed-locales";
import { updateSession, applySession } from "@/lib/supabase/middleware";

const intlMiddleware = createIntlMiddleware(routing);

// TEMPORARY PRIVATE-SITE GATE (2026-07-29)
//
// Ponte is intentionally hidden from public view while the founder resolves an
// external commercial situation. The shared password itself is never committed:
// only its SHA-256 verifier is stored here. Remove this block and the guard at
// the start of middleware() when public access is restored.
const SITE_GATE_USERNAME = "ponte";
const SITE_GATE_PASSWORD_SHA256 =
  "18739404615ffa3a2fc149fd013d38af6ba19ecc9227a83d9ac0516a869db07a";

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );

  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

function constantTimeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false;

  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }

  return difference === 0;
}

async function passesSiteGate(request: NextRequest): Promise<boolean> {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Basic ")) return false;

  let credentials: string;
  try {
    credentials = atob(authorization.slice("Basic ".length));
  } catch {
    return false;
  }

  const separator = credentials.indexOf(":");
  if (separator < 0) return false;

  const username = credentials.slice(0, separator);
  const password = credentials.slice(separator + 1);
  if (username !== SITE_GATE_USERNAME) return false;

  return constantTimeEqual(
    await sha256(password),
    SITE_GATE_PASSWORD_SHA256,
  );
}

function siteGateChallenge(): NextResponse {
  return new NextResponse("Ponte Trade is temporarily private.", {
    status: 401,
    headers: {
      "Cache-Control": "no-store",
      "WWW-Authenticate": 'Basic realm="Ponte Trade", charset="UTF-8"',
    },
  });
}

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
  // The Analyst Desk generation. Its three engagements (analyst call, strategy
  // intensive, retainer) priced the platform as consultancy, which is the
  // opposite of what the board now says. The desk itself survives as the
  // success-fee option on /pricing, so that is where the URL lands.
  "/advisory": "/pricing",
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
  if (!(await passesSiteGate(request))) {
    return siteGateChallenge();
  }

  const { pathname } = request.nextUrl;

  if (isUnlocalized(pathname)) {
    return await updateSession(request);
  }

  // Retired interface languages (Ponte is now English-first: only English and
  // Spanish remain). A URL under a removed locale, e.g. /fr/marketplace or a
  // bare /de, is permanently redirected to the canonical English path so an old
  // bookmark or indexed link never 404s. Any legacy shop/desk mapping is applied
  // in the same hop, so /zh/cart lands directly on /marketplace, never looping.
  const englishPath = stripRemovedLocale(pathname);
  if (englishPath !== null) {
    const url = request.nextUrl.clone();
    url.pathname = legacyTarget(englishPath) ?? englishPath;
    return NextResponse.redirect(url, 308);
  }

  // Retired shop/Deal Desk URLs answer with a permanent redirect, keeping the
  // reader's language. A Spanish reader hitting a dead shop URL lands on the
  // Spanish page, not back in English.
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
