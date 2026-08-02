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

/**
 * Is there a Supabase project to talk to at all?
 *
 * `NEXT_PUBLIC_*` values are INLINED AT BUILD TIME, not read at runtime. A
 * build produced without them bakes in `undefined`, and no amount of setting
 * them on the running server changes that. So this is a question about the
 * build, and it is why the failure below is invisible to every local test that
 * only varies the runtime environment.
 */
export function hasSupabaseConfig(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

/**
 * The session client, or null when this build has no Supabase configuration.
 *
 * ## Why this exists
 *
 * `createClient()` throws "Your project's URL and Key are required to create a
 * Supabase client!" when the values are absent. Three routes called it with no
 * guard, so on a deployment built without those variables they answered a hard
 * 500: `/opportunities`, `/deal-rooms` and `/deal-rooms/propose`. Every other
 * data surface survived, because `/find` and `/market-signals` reach the
 * database through `createAdminClient()` inside a try/catch and render their
 * honest "the sources could not be read" empty state instead.
 *
 * That asymmetry was the whole bug. The same missing configuration produced a
 * calm empty page on one route and a dead one on the next.
 *
 * Found on 2 August 2026, when a Vercel Preview built without the public
 * Supabase variables took down the entire Deal Room entrance. The environment
 * is the owner's to fix; answering a 500 to a configuration problem is ours.
 *
 * A caller that genuinely requires a client, such as a mutation, should keep
 * using `createClient()` and let it throw. This is for READS that have an
 * honest empty state, where a missing configuration means "nothing to show"
 * rather than "the page is broken".
 */
export function createClientOrNull(): ReturnType<typeof createClient> | null {
  if (!hasSupabaseConfig()) return null;
  return createClient();
}

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
            // Called from a Server Component, safe to ignore: middleware
            // refreshes the session.
          }
        },
      },
    },
  );
}
