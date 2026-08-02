#!/usr/bin/env node
/**
 * `npm run dev:db` - the whole development database, in one command.
 *
 * Starts the local Supabase stack, applies every migration, seeds a signed-in
 * test account with real records, and prints the credentials.
 *
 * ## Why this exists (issue #84)
 *
 * There was no development database. No database meant no session, and no
 * session meant that every signed-in page in the product was unreachable and
 * unverifiable. Everything anyone verified was the signed-out half.
 *
 * That is not a theoretical cost. On 2 August 2026 `/deal-rooms/propose`
 * answered a 500 on a deployment, and finding out why took three wrong
 * diagnoses and most of a day, because the failing branch could not be run.
 *
 * ## Nothing here can reach production
 *
 * The stack is loopback only. `supabase link` is never run, so the CLI holds no
 * project reference. The seeder refuses to write unless the Supabase URL is a
 * loopback address, with no override flag. The keys the local stack prints are
 * the CLI's fixed development keys, identical on every machine, and are not
 * secrets.
 *
 *   npm run dev:db          start, migrate, seed
 *   npm run dev:db -- reset drop everything and rebuild from migrations
 *   npm run dev:db -- stop  stop the stack
 */

import { spawnSync } from "node:child_process";

const argument = process.argv[2] ?? "start";

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    stdio: options.capture ? "pipe" : "inherit",
    shell: process.platform === "win32",
    encoding: "utf8",
    ...options,
  });
  return result;
}

function fail(message, detail) {
  console.error(`\n${message}\n`);
  if (detail) console.error(`${detail}\n`);
  process.exit(1);
}

/* ------------------------------------------------------------------ *
 * Docker has to be there, and the message when it is not has to be useful
 * ------------------------------------------------------------------ */

function requireDocker() {
  const version = run("docker", ["--version"], { capture: true });
  if (version.status !== 0) {
    fail(
      "Docker is not installed, so the local Supabase stack cannot start.",
      [
        "Install it once, from an ADMINISTRATOR PowerShell:",
        "",
        "    wsl --install",
        "    winget install -e --id Docker.DockerDesktop",
        "",
        "Reboot, start Docker Desktop, wait for it to say Running, then re-run",
        "this command. Nothing else about the setup changes.",
      ].join("\n"),
    );
  }
  const info = run("docker", ["info"], { capture: true });
  if (info.status !== 0) {
    fail(
      "Docker is installed but the daemon is not running.",
      "Start Docker Desktop, wait until it reports Running, then try again.",
    );
  }
}

/* ------------------------------------------------------------------ *
 * The local stack's own connection details, read rather than assumed
 * ------------------------------------------------------------------ */

function readStatus() {
  const status = run("npx", ["supabase", "status", "-o", "env"], { capture: true });
  if (status.status !== 0) return null;
  const values = {};
  for (const line of (status.stdout ?? "").split(/\r?\n/)) {
    const match = line.match(/^([A-Z_]+)="?([^"]*)"?$/);
    if (match) values[match[1]] = match[2];
  }
  return values.API_URL ? values : null;
}

/* ------------------------------------------------------------------ */

if (argument === "stop") {
  requireDocker();
  run("npx", ["supabase", "stop"]);
  process.exit(0);
}

requireDocker();

console.log("starting the local Supabase stack (first run pulls images, several minutes)\n");
const started = run("npx", ["supabase", "start"]);
if (started.status !== 0 && !readStatus()) {
  fail("The local Supabase stack did not start.", "The CLI output above says why.");
}

/*
  `db reset` drops the local database and replays supabase/migrations in order.

  It is run on every invocation, not only on `reset`, and that is deliberate:
  a development database that has drifted from the migrations is the exact
  problem this whole exercise exists to stop reproducing. Cheap to rebuild,
  expensive to mistrust.
*/
console.log("\napplying migrations\n");
const reset = run("npx", ["supabase", "db", "reset"]);
if (reset.status !== 0) {
  fail(
    "The migrations did not apply cleanly to an empty database.",
    [
      "This is a real finding, not a setup problem: it means supabase/migrations",
      "cannot rebuild the schema from nothing. Record which migration failed.",
      "It is direct evidence for the WO-2 reconciliation.",
    ].join("\n"),
  );
}

const status = readStatus();
if (!status) fail("The stack started but did not report its connection details.");

console.log("\nseeding the test account\n");
const seed = run("node", ["scripts/seed-dev.mjs"], {
  env: {
    ...process.env,
    NEXT_PUBLIC_SUPABASE_URL: status.API_URL,
    SUPABASE_SERVICE_ROLE_KEY: status.SERVICE_ROLE_KEY,
  },
});
if (seed.status !== 0) fail("Seeding failed. The message above says why.");

console.log("");
console.log("  Supabase   " + status.API_URL);
console.log("  Studio     " + (status.STUDIO_URL ?? "http://localhost:54323"));
console.log("  Inbucket   " + (status.INBUCKET_URL ?? "http://localhost:54324") + "   (every dev email lands here)");
console.log("");
console.log("  Now run:   npm run dev:local");
console.log("");
