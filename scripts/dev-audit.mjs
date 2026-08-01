#!/usr/bin/env node
/**
 * `npm run dev:audit` - a local dev server that CANNOT reach production.
 *
 * ## Why this exists
 *
 * `npm run dev` is guarded by `scripts/check-dev-env.mjs`, which refuses to
 * start when the environment points at the production Supabase project. The
 * guard is right: a dev server holds a service-role key that bypasses every RLS
 * policy, and `/admin/listings` writes on GET, so merely opening a page could
 * modify real records.
 *
 * The awkward part is that the guard reads `process.env` LAST, so it wins over
 * `.env.local`. On a machine whose user environment already carries
 * `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_PROJECT_REF` or `DATABASE_URL` for
 * production - which is normal for anyone who has ever run a script against it
 * - editing `.env.local` cannot clear them, and the guard fires no matter what
 * the file says. The usual escape hatch is `PONTE_ALLOW_PRODUCTION_DB`, which
 * is precisely the wrong answer for looking at a page.
 *
 * So this overrides those variables in the child process itself, at a synthetic
 * project reference that does not exist. Nothing can be read from or written to
 * production because there is nothing behind the URL. Lists render their honest
 * "the sources could not be read" states, which is the correct surface for
 * checking layout, copy and empty/error behaviour.
 *
 * What it is NOT for: checking populated-data states. Those need a real
 * development project, which is tracked in issue #84.
 */

import { spawn } from "node:child_process";

/** A ref that is deliberately not a real project. */
const SYNTHETIC_REF = "ponteuxauditlocal000";

const overrides = {
  NEXT_PUBLIC_SUPABASE_URL: `https://${SYNTHETIC_REF}.supabase.co`,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "local-audit-no-project-behind-this",
  SUPABASE_SERVICE_ROLE_KEY: "local-audit-no-project-behind-this",
  SUPABASE_PROJECT_REF: SYNTHETIC_REF,
  // Cleared rather than pointed somewhere: any value here is a direct Postgres
  // connection, and the point is that this process holds none.
  DATABASE_URL: "",
  PONTE_SCHEMA_SOURCE_DATABASE_URL: "",
};

const env = { ...process.env, ...overrides };

const replaced = Object.keys(overrides).filter(
  (k) => process.env[k] && process.env[k] !== overrides[k],
);

console.log(`dev:audit - Supabase ref forced to ${SYNTHETIC_REF} (no project behind it)`);
if (replaced.length > 0) {
  console.log(`           overrode from the machine environment: ${replaced.join(", ")}`);
}
console.log("           production is unreachable from this server, by construction\n");

const child = spawn("npx", ["next", "dev"], {
  env,
  stdio: "inherit",
  shell: process.platform === "win32",
});

child.on("exit", (code) => process.exit(code ?? 0));
