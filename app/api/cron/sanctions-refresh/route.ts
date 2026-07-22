import { NextResponse } from "next/server";
import { runRefreshAndRescreen } from "@/lib/sanctions/refresh-run";

export const dynamic = "force-dynamic";

// Manual trigger for the sanctions rebuild. NOT the scheduler.
//
// THIS ROUTE WILL TIME OUT. A full five source refresh takes minutes and the
// host caps a synchronous function at roughly 10 to 26 seconds, so a caller
// gets HTTP 504 while the work carries on server side, or does not, with no
// way to tell which from the response. That is exactly what happened in
// production: a manual trigger returned 504, the load happened to finish, and
// the result looked like a failure.
//
// There used to be an `export const maxDuration = 300` here. It is a Vercel
// setting and this app is on Netlify, where it does nothing at all. It has
// been removed rather than corrected, because no per-route number makes a
// minutes long job fit in a request.
//
// The scheduled run is .github/workflows/sanctions-refresh.yml, which runs
// scripts/sanctions-refresh.ts on a GitHub Actions runner with no serverless
// timeout. To trigger a refresh by hand, run that workflow: Actions tab,
// "Sanctions refresh", "Run workflow". See docs/platform/RUNBOOK.md.
//
// This route is kept for the case where an operator has no GitHub access and
// needs to kick a rebuild from a shell. Treat a 504 from it as "no result",
// not as "failed", and confirm the outcome in sanctions_refresh_log.
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

  const result = await runRefreshAndRescreen();

  if (result.fatalError) {
    return NextResponse.json({ error: "refresh_failed" }, { status: 500 });
  }

  return NextResponse.json({
    ok: result.ok,
    lists: result.lists,
    persistentFailures: result.persistentFailures,
    rescreen: result.rescreen,
    rescreenError: result.rescreenError,
  });
}
