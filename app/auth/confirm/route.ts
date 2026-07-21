import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Email link verification via token_hash. Unlike the PKCE `code` flow,
// this works even when the link is opened in a different browser or
// device than the one that requested it (webmail, phones, scanners).
//
// Supabase email templates must link to:
//   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=magiclink&redirect_to={{ .RedirectTo }}

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
