import createIntlMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { locales, defaultLocale, routing } from "@/i18n/routing";
import { stripRemovedLocale } from "@/lib/i18n/removed-locales";
import { updateSession, applySession } from "@/lib/supabase/middleware";
import {
  FOUNDING_CODE,
  REFERRAL_COOKIE,
  REFERRAL_MAX_AGE_DAYS,
  normalizeReferral,
} from "@/lib/founding/referral";

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
/**
 * Paths that must reach their route with no locale prefix.
 *
 * `/robots.txt` and `/sitemap.xml` are here because both were **404 in
 * production**, and silently so. They are generated App Router routes at the
 * origin root, but they are not pages: the locale middleware rewrote them to
 * `/en/robots.txt` and `/en/sitemap.xml`, which no route serves.
 *
 * This is the same fault the matcher comment below describes for
 * `manifest.webmanifest`, and it was reasoned about there and then left
 * unfixed — correctly refusing to exclude `xml` from the matcher (that would
 * break every future generated XML route to fix a static file), but not
 * following through to the other half, which is that a generated root route
 * still has to be exempted from LOCALE ROUTING somewhere. That somewhere is
 * here, by exact path, so nothing else is affected.
 *
 * Both must keep passing through the site gate above: exempting them from
 * locale routing is not exempting them from authentication.
 *
 * A crawler cannot discover anything without these two. Every other piece of
 * SEO work on this site is downstream of them answering 200.
 */
const ROOT_ROUTES = new Set(["/robots.txt", "/sitemap.xml"]);

function isUnlocalized(pathname: string): boolean {
  return (
    ROOT_ROUTES.has(pathname) ||
    pathname.startsWith("/sitemap/") || // split sitemaps, if generateSitemaps is used
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
// These five landed on `/marketplace` until the obsidian board retired
// (cutover PR 5). A redirect whose target is itself a redirect costs a second
// round trip and dilutes the ranking signal it exists to transfer, so each one
// names the canonical board directly.
const LEGACY_EXACT: Record<string, string> = {
  "/catalogue": "/pricing",
  "/cart": "/find",
  "/checkout": "/find",
  "/order-success": "/find",
  "/methodology": "/about",
  "/why-ponte": "/about",
  "/brokerage": "/find",
  "/network": "/find",
  // The obsidian board. Its public half is `/find` and its owner half moved to
  // /opportunities, /workspace and /account (cutover PR 5), so the URL that was
  // indexed and bookmarked as "the Ponte board" resolves to the board.
  // Permanent, like every other entry here: the page is not coming back and the
  // ranking signal has to transfer.
  "/marketplace": "/find",
  // The Analyst Desk generation. Its three engagements (analyst call, strategy
  // intensive, retainer) priced the platform as consultancy, which is the
  // opposite of what the board now says. The desk itself survives as the
  // success-fee option on /pricing, so that is where the URL lands.
  "/advisory": "/pricing",
};

// A pattern rule may name a fixed destination or derive one from the match, so
// a retired URL that identifies a RECORD can carry that record across the hop
// instead of dropping every reader on a board and making them find it again.
const LEGACY_PREFIX: { test: RegExp; to: string | ((match: RegExpMatchArray) => string) }[] = [
  { test: /^\/category\/[^/]+\/?$/, to: "/pricing" },
  { test: /^\/product\/[^/]+\/?$/, to: "/pricing" },
  // The retired public listing detail (cutover PR 4 built its replacement).
  // The reference is the record's identity, so it survives: a link forwarded on
  // WhatsApp two years ago still opens the same opportunity.
  { test: /^\/marketplace\/l\/([^/]+)\/?$/, to: (match) => `/find/o/${match[1]}` },
];

function legacyTarget(pathname: string): string | null {
  const clean = pathname.length > 1 ? pathname.replace(/\/$/, "") : pathname;
  if (LEGACY_EXACT[clean]) return LEGACY_EXACT[clean];
  for (const rule of LEGACY_PREFIX) {
    const match = clean.match(rule.test);
    if (match) return typeof rule.to === "function" ? rule.to(match) : rule.to;
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
  // Spanish remain). A URL under a removed locale, e.g. /fr/find or a bare /de,
  // is permanently redirected to the canonical English path so an old bookmark
  // or indexed link never 404s. Any legacy shop/desk mapping is applied in the
  // same hop, so /zh/cart lands directly on /find, never looping.
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

  // /join is the single general Founding Network invitation URL. It renders no
  // UI of its own (cutover PR 2): it captures the referral attribution, once,
  // and forwards to the sign-in door. The capture is a first-party cookie
  // carrying an allowlisted code and the moment of capture, `<code>.<issuedAt>`,
  // which the account page later persists to the profile exactly once and only
  // for a genuinely new signup. First touch wins, so an existing cookie is left
  // untouched and a later /join visit cannot overwrite an earlier capture. A
  // non-allowlisted or absent `?ref` falls back to the general founding code
  // rather than storing an arbitrary value. The code is attribution only and
  // never grants anything. This is a temporary (307) forward, not a permanent
  // move: the destination is the same for every visitor and the `ref` varies.
  if (rest === "/join") {
    const url = request.nextUrl.clone();
    url.pathname = `${prefix}/login`;
    url.search = "";
    const response = NextResponse.redirect(url);
    if (!request.cookies.get(REFERRAL_COOKIE)) {
      const code = normalizeReferral(request.nextUrl.searchParams.get("ref")) ?? FOUNDING_CODE;
      response.cookies.set(REFERRAL_COOKIE, `${code}.${Date.now()}`, {
        path: "/",
        maxAge: REFERRAL_MAX_AGE_DAYS * 24 * 60 * 60,
        sameSite: "lax",
      });
    }
    return response;
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
