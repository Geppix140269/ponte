import "server-only";
import { createAdminClient } from "@/lib/supabase/server";
import type { EventName } from "./events";

// Fire-and-forget analytics. Writes to analytics_events (best-effort; no-op if the
// table is not migrated). An external provider (PostHog/GA) can be added here.
export async function track(
  event: EventName,
  props?: Record<string, unknown>,
  opts?: { profileId?: string; sessionId?: string },
): Promise<void> {
  try {
    const sb = createAdminClient();
    await sb.from("analytics_events").insert({
      event,
      props: props ?? null,
      profile_id: opts?.profileId ?? null,
      session_id: opts?.sessionId ?? null,
    });
  } catch { /* best-effort */ }
}
