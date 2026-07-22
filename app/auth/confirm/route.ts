import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Email link verification via token_hash.
//
// Sign-in moved to six digit codes on 2026-07-22, so nothing sends links to
// this route any more. It stays for two reasons: links already sitting in
// inboxes, and password recovery, which is still a link flow if it is ever
// switched on.
//
// Supabase email templates that DO use it must link to:
//   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=magiclink&redirect_to={{ .RedirectTo }}
//
// A template pointing anywhere else is how the wrong-account bug happened: the
// default template sent members to /account carrying the session in a URL
// fragment, /account is a Server Component with no browser client on it, the
// fragment was never read, and the browser's previous session rendered instead.

const TYPES = new Set(["signup", "invite", "magiclink", "recovery", "email_change", "email"]);

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") ?? "";
  const redirectTo = searchParams.get("redirect_to") ?? "";

  // Destination after verification: only same-site targets are honored.
  let next = "/account";
  try {
    if (redirectTo.startsWith("/") && !redirectTo.startsWith("//")) {
      next = redirectTo;
    } else if (redirectTo) {
      const u = new URL(redirectTo);
      if (u.origin === origin) next = u.pathname + u.search;
    }
  } catch {
    // keep default
  }

  if (tokenHash && TYPES.has(type) && isSupabaseConfigured()) {
    try {
      const supabase = createClient();
      // Whoever was signed in on this browser does not get to survive somebody
      // else confirming their email on it. Verifying on top of a live session
      // is what let a new member land on the previous member's account.
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
