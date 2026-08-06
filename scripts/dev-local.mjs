#!/usr/bin/env node
/**
 * `npm run dev:local` - the app, against the local development database.
 *
 * The counterpart to `npm run dev:audit`. That one points at a synthetic
 * Supabase reference with no project behind it, so every list renders its
 * honest empty state and nothing signed-in can be reached. This one points at
 * the real local stack from `npm run dev:db`, so a session exists, the test
 * account can sign in, and the signed-in half of the product can actually be
 * opened.
 *
 * ## The one thing this guarantees
 *
 * It reads the connection details from the running stack rather than from
 * `.env.local`. That is not tidiness: `.env.local` points at PRODUCTION, and a
 * dev runner that inherits it would quietly develop against real member data.
 * The values are taken from `supabase status` and the production ones are
 * overwritten in the child process, so there is no path from this command to
 * the hosted project even if the file says otherwise.
 */

import { spawn, spawnSync } from "node:child_process";

function readStatus() {
  const status = spawnSync("npx", ["supabase", "status", "-o", "env"], {
    encoding: "utf8",
    shell: process.platform === "win32",
  });
  if (status.status !== 0) return null;
  const values = {};
  for (const line of (status.stdout ?? "").split(/\r?\n/)) {
    const match = line.match(/^([A-Z_]+)="?([^"]*)"?$/);
    if (match) values[match[1]] = match[2];
  }
  return values.API_URL ? values : null;
}

const status = readStatus();
if (!status) {
  console.error(
    [
      "",
      "The local Supabase stack is not running, so there is nothing to develop against.",
      "",
      "    npm run dev:db",
      "",
      "starts it, restores the baseline schema and seeds the test account.",
      "",
    ].join("\n"),
  );
  process.exit(1);
}

const host = new URL(status.API_URL).hostname;
if (!["127.0.0.1", "localhost", "::1"].includes(host)) {
  console.error(`\nRefusing to start: ${host} is not a local stack.\n`);
  process.exit(1);
}

const env = {
  ...process.env,
  NEXT_PUBLIC_SUPABASE_URL: status.API_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: status.ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: status.SERVICE_ROLE_KEY,
  SUPABASE_URL: status.API_URL,
  // Cleared rather than pointed somewhere. Any value here is a direct Postgres
  // connection, and this process should hold none.
  DATABASE_URL: "",
  PONTE_SCHEMA_SOURCE_DATABASE_URL: "",
  // The Deal Room routes are on for development regardless of what the
  // machine's environment happens to carry.
  NEXT_PUBLIC_DEAL_ROOM: "on",
};

console.log(`dev:local - Supabase ${status.API_URL} (local stack)`);
console.log("            production is unreachable from this server, by construction");
console.log("            sign in at http://localhost:3000/login as dev@ponte.local,");
console.log("            then `npm run dev:code` for the six digits (Ponte is OTP only)\n");

const child = spawn("npx", ["next", "dev"], { env, stdio: "inherit", shell: process.platform === "win32" });
child.on("exit", (code) => process.exit(code ?? 0));
