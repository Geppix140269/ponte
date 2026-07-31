import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/auth";
import { safeNextPath } from "@/lib/auth/next-destination";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // The generic destination is /opportunities; a journey-specific same-site
  // `next` still wins. Sanitisation is the shared helper, unit tested in
  // lib/auth/__tests__/next-destination.test.ts.
  const next = safeNextPath(searchParams.get("next"));

  if (code && isSupabaseConfigured()) {
    try {
      const supabase = createClient();
      // Clear any session already on this browser before establishing the new
      // one, so an OAuth return cannot land on top of somebody else's cookie.
      await supabase.auth.signOut();
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) {
        return NextResponse.redirect(`${origin}${next}`);
      }
      console.error("[ponte] auth callback failed:", error.message);
    } catch (e) {
      // Never 500 on a bad or reused link: send the member back to login.
      console.error("[ponte] auth callback crashed:", e);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
