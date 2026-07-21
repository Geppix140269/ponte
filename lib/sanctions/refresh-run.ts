// The nightly sanctions job, in one place.
//
// Refresh the five published lists, alert on a list that has now failed twice
// running, then re-screen everyone currently holding a clean verdict against
// the lists as they now stand.
//
// This lives here rather than in the API route because it has two callers and
// the alerting rule must not be written twice:
//
//   scripts/sanctions-refresh.ts   the scheduled run, a plain Node process
//   app/api/cron/sanctions-refresh the manual trigger for an operator
//
// It imports nothing from Next. Keep it that way, or the scheduled run stops
// being able to load it. See the note in lib/supabase/admin.ts.

import { createAdminClient } from "@/lib/supabase/admin";
import { refreshAll, type RefreshSummary, type SourceList } from "./refresh";
import { rescreenVerified, type RescreenSummary } from "@/lib/verification/rescreen";
import { sendAdminNotice } from "@/lib/email";

export type RefreshRunSummary = {
  /** Every list refreshed and the re-screen completed. */
  ok: boolean;
  /** Set when the refresh could not run at all. Null on a normal run. */
  fatalError: string | null;
  lists: RefreshSummary[];
  /** Lists that have now failed twice consecutively. A human was emailed. */
  persistentFailures: SourceList[];
  rescreen: RescreenSummary | null;
  /** Set when the lists loaded but the re-screen threw. */
  rescreenError: string | null;
};

/**
 * Which of this run's failures have now failed twice consecutively.
 *
 * A single blip in a national feed is normal and does not need a human at 2am.
 * Two in a row means the feed has moved or the parser has rotted, and
 * screening is running against a stale copy of that list.
 *
 * The row for this run is already written by refreshAll, so two failing rows
 * at the head of the log means it also failed the time before.
 */
async function findPersistentFailures(
  failed: RefreshSummary[],
): Promise<SourceList[]> {
  const sb = createAdminClient();
  const persistent: SourceList[] = [];

  for (const item of failed) {
    const { data: recent, error } = await sb
      .from("sanctions_refresh_log")
      .select("status")
      .eq("source_list", item.source)
      .order("fetched_at", { ascending: false })
      .limit(2);

    if (error) {
      // Cannot tell first failure from second. Treat it as persistent: an
      // extra email is cheap, a missed one is not.
      console.error(
        `[ponte] could not read the refresh log for ${item.source}: ${error.message}`,
      );
      persistent.push(item.source);
      continue;
    }

    const rows = recent ?? [];
    if (rows.length === 2 && rows.every((r) => r.status !== "ok")) {
      persistent.push(item.source);
    }
  }

  return persistent;
}

export async function runRefreshAndRescreen(): Promise<RefreshRunSummary> {
  const startedAt = new Date();

  let lists: RefreshSummary[];
  try {
    lists = await refreshAll();
  } catch (err) {
    const message = (err as Error).message;
    await sendAdminNotice({
      subject: "Sanctions refresh failed outright",
      body: `The refresh did not complete: ${message}. Screening is running against the previous copy of the lists.`,
      actionPath: "/admin/verifications",
      actionLabel: "Open the review queue",
    });
    return {
      ok: false,
      fatalError: message,
      lists: [],
      persistentFailures: [],
      rescreen: null,
      rescreenError: null,
    };
  }

  for (const list of lists) {
    // Counts and timings only. Never a record: these lists name people.
    console.log(
      `[ponte] ${list.source}: ${list.status}, ${list.entryCount} entries, ${list.durationMs} ms`,
    );
  }

  const failed = lists.filter((r) => r.status !== "ok");
  let persistentFailures: SourceList[] = [];

  if (failed.length > 0) {
    persistentFailures = await findPersistentFailures(failed);

    if (persistentFailures.length > 0) {
      await sendAdminNotice({
        subject: `Sanctions list refresh failing: ${persistentFailures.join(", ")}`,
        body:
          `These lists have now failed twice in a row, so screening is running ` +
          `against a stale copy of them: <strong>${persistentFailures.join(", ")}</strong>.` +
          `<br><br>Errors: ${failed.map((f) => `${f.source}: ${f.error}`).join("<br>")}`,
      });
    }
  }

  // Re-screen everyone already verified. Awaited, including the email it
  // sends: a send left dangling is a send that never happens.
  let rescreen: RescreenSummary | null = null;
  let rescreenError: string | null = null;
  try {
    rescreen = await rescreenVerified(startedAt);
  } catch (err) {
    rescreenError = (err as Error).message;
    await sendAdminNotice({
      subject: "Sanctions re-screen failed",
      body: `Lists refreshed, but re-screening existing members failed: ${rescreenError}`,
      actionPath: "/admin/verifications",
      actionLabel: "Open the review queue",
    });
  }

  return {
    ok: failed.length === 0 && rescreenError === null,
    fatalError: null,
    lists,
    persistentFailures,
    rescreen,
    rescreenError,
  };
}
