import createIntlMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "@/i18n/routing";
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

export async function middleware(request: NextRequest) {
  if (isUnlocalized(request.nextUrl.pathname)) {
    return await updateSession(request);
  }

  // next-intl decides the locale and owns the response, then the Supabase
  // session cookies are attached to that same response.
  const response = intlMiddleware(request) ?? NextResponse.next({ request });
  return await applySession(request, response);
}

export const config = {
  matcher: [
    // Run on app routes, skipping static assets and image files.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
