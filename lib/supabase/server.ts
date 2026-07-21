import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Re-exported so the existing call sites keep working. The implementation
// lives in ./admin, which imports nothing from Next, because the scheduled
// sanctions refresh runs outside Next and cannot load this module: the
// next/headers import above is evaluated on import, not on call.
//
// Anything that has to run in the scheduled job must import createAdminClient
// from "@/lib/supabase/admin" directly, not from here.
export { createAdminClient } from "./admin";

// Server Supabase client (anon key + user session via cookies, respects RLS).
export function createClient() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component — safe to ignore; middleware refreshes the session.
          }
        },
      },
    },
  );
}
