import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { refreshAll } from "@/lib/sanctions/refresh";
import { rescreenVerified } from "@/lib/verification/rescreen";
import { sendAdminNotice } from "@/lib/email";

export const dynamic = "force-dynamic";
// Fetching and parsing four national lists is slow. Netlify allows a longer
// budget on a background invocation than on a page request.
export const maxDuration = 300;

// Rebuilds the sanctions tables, then re-screens everyone already verified
// against what changed. Triggered daily by the scheduled function in
// netlify/functions/sanctions-refresh.mts.
//
// Protected by a shared secret rather than an admin session, because it is
// called by a machine. Without the secret this endpoint refuses, so a rebuild
// cannot be triggered by a stranger.
export async function POST(request: Request) {
  const secret = process.env.SANCTIONS_REFRESH_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }
  const provided =
    request.headers.get("x-refresh-secret") ??
    new URL(request.url).searchParams.get("secret");
  if (provided !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const startedAt = new Date();

  let results;
  try {
    results = await refreshAll();
  } catch (err) {
    await sendAdminNotice({
      subject: "Sanctions refresh failed outright",
      body: `The refresh did not complete: ${(err as Error).message}. Screening is running against the previous copy of the lists.`,
      actionPath: "/admin/verifications",
      actionLabel: "Open the review queue",
    });
    return NextResponse.json({ error: "refresh_failed" }, { status: 500 });
  }

  const failed = results.filter((r) => r.status !== "ok");

  // Alert only on a second consecutive failure for the same list. A single
  // blip in a national feed is normal and does not need a human at 2am.
  if (failed.length > 0) {
    const sb = createAdminClient();
    const persistent: string[] = [];

    for (const item of failed) {
      const { data: recent } = await sb
        .from("sanctions_refresh_log")
        .select("status")
        .eq("source_list", item.source)
        .order("fetched_at", { ascending: false })
        .limit(2);
      // The row for this run is already written by refreshAll, so two failures
      // here means it also failed the time before.
      if ((recent ?? []).length === 2 && recent!.every((r: any) => r.status !== "ok")) {
        persistent.push(item.source);
      }
    }

    if (persistent.length > 0) {
      await sendAdminNotice({
        subject: `Sanctions list refresh failing: ${persistent.join(", ")}`,
        body:
          `These lists have now failed twice in a row, so screening is running ` +
          `against a stale copy of them: <strong>${persistent.join(", ")}</strong>.` +
          `<br><br>Errors: ${failed.map((f) => `${f.source}: ${f.error}`).join("<br>")}`,
      });
    }
  }

  // Re-screen everyone already verified, against entries this run touched.
  let rescreen = null;
  try {
    rescreen = await rescreenVerified(startedAt);
  } catch (err) {
    await sendAdminNotice({
      subject: "Sanctions re-screen failed",
      body: `Lists refreshed, but re-screening existing members failed: ${(err as Error).message}`,
    });
  }

  return NextResponse.json({
    ok: failed.length === 0,
    lists: results,
    rescreen,
  });
}
