import { NextResponse, type NextRequest } from "next/server";
import { defaultLocale } from "@/i18n/routing";
import {
  FOUNDING_CODE,
  REFERRAL_COOKIE,
  REFERRAL_MAX_AGE_DAYS,
  normalizeReferral,
} from "@/lib/founding/referral";

export const dynamic = "force-dynamic";

/**
 * The founding invitation is attribution, not a product screen. First touch
 * captures the allowlisted referral code, then the request continues directly
 * to the canonical sign-in door. No legacy join UI is rendered.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { locale: string } },
) {
  const target = request.nextUrl.clone();
  target.pathname = params.locale === defaultLocale ? "/login" : `/${params.locale}/login`;
  target.search = "";

  const response = NextResponse.redirect(target, 307);
  if (!request.cookies.has(REFERRAL_COOKIE)) {
    const code = normalizeReferral(request.nextUrl.searchParams.get("ref")) ?? FOUNDING_CODE;
    response.cookies.set({
      name: REFERRAL_COOKIE,
      value: `${code}.${Date.now()}`,
      path: "/",
      maxAge: REFERRAL_MAX_AGE_DAYS * 24 * 60 * 60,
      sameSite: "lax",
      secure: request.nextUrl.protocol === "https:",
    });
  }

  return response;
}
