// Privileged Supabase client (service-role key). Bypasses RLS, never expose
// this to the browser.
//
// This module exists separately from server.ts for one reason: it must import
// nothing from Next. server.ts imports next/headers at module scope for the
// cookie-backed session client, which makes the whole module unloadable
// outside a Next request. The sanctions refresh runs as a plain Node script on
// a schedule (scripts/sanctions-refresh.ts), so every module in that chain has
// to import the admin client from here rather than from server.ts.
//
// If you add an import to this file, it must work under bare `node`.

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * SUPABASE_URL is accepted alongside NEXT_PUBLIC_SUPABASE_URL because the
 * scheduled job runs outside Next, where the NEXT_PUBLIC_ prefix means nothing
 * and only advertises a value that is not a secret.
 */
export function supabaseUrl(): string {
  const url =
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  if (!url) {
    throw new Error(
      "Supabase URL is not set. Provide SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL.",
    );
  }
  return url;
}

export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    // Named, never printed. A missing key is a configuration fault and the
    // message must not become a place a key could be logged.
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set.");
  }
  return createSupabaseClient(supabaseUrl(), key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
