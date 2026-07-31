// Test double for @/lib/supabase/admin.
//
// The real module is a second entry point to the same service-role client,
// kept separate only so it can be loaded outside Next. Sanctions screening and
// the trust score reach the database through it, so a route or pipeline test
// needs both doors to open onto the same fake database. This file therefore
// re-exports the supabase-server double rather than building a second one:
// one recorded-calls list, one scenario, whichever import a module used.

export {
  calls,
  rpcCalls,
  callsFor,
  rpcCallsFor,
  createClient,
  createAdminClient,
  __reset,
} from "./supabase-server";
export type { Call, RpcCall, Scenario } from "./supabase-server";

export function supabaseUrl(): string {
  return "https://supabase.test.invalid";
}
