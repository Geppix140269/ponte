// Entry point for the scheduled sanctions refresh.
//
// Run by .github/workflows/sanctions-refresh.yml on a GitHub Actions runner,
// which has no serverless timeout, because a five source refresh takes minutes
// and a Netlify function is capped in seconds.
//
// Deliberately thin. Everything it does lives in lib/sanctions/refresh-run.ts,
// which is inside the tsconfig include and therefore typechecked by CI. This
// file is in scripts/, which tsconfig excludes, so anything written here is
// unchecked. Keep it to wiring and an exit code.
//
//   npm run sanctions:refresh
//
// Env: SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL), SUPABASE_SERVICE_ROLE_KEY,
//      ANTHROPIC_API_KEY, RESEND_API_KEY, ADMIN_ALERT_EMAIL.

import { runRefreshAndRescreen } from "@/lib/sanctions/refresh-run";

async function main(): Promise<void> {
  const started = Date.now();
  console.log("[ponte] sanctions refresh starting");

  const result = await runRefreshAndRescreen();
  const seconds = Math.round((Date.now() - started) / 1000);

  if (result.fatalError) {
    console.error(`[ponte] refresh failed outright after ${seconds}s`);
    process.exitCode = 1;
    return;
  }

  // Counts only. These lists name people, so no record is ever printed into a
  // build log that is retained and readable by anyone with repository access.
  for (const list of result.lists) {
    console.log(
      `[ponte] ${list.source.padEnd(10)} ${list.status.padEnd(6)} ${list.entryCount} entries`,
    );
  }
  if (result.rescreen) {
    console.log(
      `[ponte] re-screened ${result.rescreen.screened} verified subject(s), ${result.rescreen.newHits} now need review`,
    );
  }

  if (result.persistentFailures.length > 0) {
    console.error(
      `[ponte] failing twice in a row, the desk has been emailed: ${result.persistentFailures.join(", ")}`,
    );
  }

  console.log(`[ponte] sanctions refresh finished in ${seconds}s, ok=${result.ok}`);

  // A failed source, or a failed re-screen, fails the run. A red workflow is
  // the point: the old design failed silently behind a 504.
  if (!result.ok) process.exitCode = 1;
}

main().catch((err) => {
  // Message only. An error object can carry a request body, and a request body
  // here can carry a name from a sanctions list or a member record.
  console.error(`[ponte] sanctions refresh crashed: ${(err as Error).message}`);
  process.exitCode = 1;
});
