import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/auth";
import { safeAuthRedirectDestination } from "@/lib/auth/next-destination";

export const dynamic = "force-dynamic";

// Email link verification via token_hash.
//
// Sign-in moved to six digit codes on 2026-07-22, so nothing sends links to
// this route any more. It remains for links already in inboxes and any future
// recovery flow. Redirect destinations are same-site only.

const TYPES = new Set(["signup", "invite", "magiclink", "recovery", "email_change", "email"]);

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") ?? "";
  const next = safeAuthRedirectDestination(searchParams.get("redirect_to"), origin);

  if (tokenHash && TYPES.has(type) && isSupabaseConfigured()) {
    try {
      const supabase = createClient();
      // Whoever was signed in on this browser does not get to survive somebody
      // else confirming their email on it.
      await supabase.auth.signOut();
      const { error } = await supabase.auth.verifyOtp({
        type: type as EmailOtpType,
        token_hash: tokenHash,
      });
      if (!error) {
        return NextResponse.redirect(`${origin}${next}`);
      }
      console.error("[ponte] auth confirm failed:", error.message);
    } catch (e) {
      console.error("[ponte] auth confirm crashed:", e);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
