// Refuse to start a development server against the production database.
//
//   node scripts/check-dev-env.mjs        (runs automatically from `npm run dev`)
//
// WHY THIS EXISTS
//
// `.env.local` has always pointed at the PRODUCTION Supabase project
// (cptglsmjmzcfpjndqfmc) while NEXT_PUBLIC_APP_URL pointed at localhost. So
// `npm run dev` was a live production client holding a service-role key, which
// bypasses every RLS policy in the database. Nothing announced this.
//
// It is sharper than it sounds, because at least one page writes on a GET:
// /admin/listings runs AI vetting on load and persists ai_review to listing
// rows. Merely opening it locally wrote to production listings.
//
// This does NOT fix the underlying problem, which is that there is no
// development project to point at, because the repository cannot yet build a
// database (see docs/proposals/baseline-phase-1-classification.md). It converts
// a silent default into a deliberate act, which is the whole of the improvement
// available before a second project exists.
//
// It runs ONLY from `npm run dev`. It is deliberately not wired into
// next.config.mjs, so it can never affect `next build`, `npm run verify`, CI or
// a Netlify deploy.

import { existsSync, readFileSync } from "node:fs";

/** The production project ref. Not a secret: it is in the public API URL. */
const PRODUCTION_REF = "cptglsmjmzcfpjndqfmc";

/** Set this to exactly this value to start anyway. */
const OVERRIDE_VAR = "PONTE_ALLOW_PRODUCTION_DB";
const OVERRIDE_VALUE = "i-understand";

/**
 * Read the env the dev server will actually see.
 *
 * Next loads .env.local itself, after this script has run, so process.env does
 * not have it yet. Parsed rather than sourced: on 28 July 2026 an unquoted
 * DATABASE_URL made a shell `source` fail and print a production password.
 */
function envFromFiles() {
  const out = {};
  for (const file of [".env", ".env.local"]) {
    if (!existsSync(file)) continue;
    // utf-8-sig equivalent: .env.local carries a BOM, which would otherwise
    // become part of the first key's name.
    const text = readFileSync(file, "utf8").replace(/^﻿/, "");
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq < 1) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      out[key] = value;
    }
  }
  return { ...out, ...process.env };
}

const env = envFromFiles();

const pointsAtProduction = [
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_URL,
  env.SUPABASE_PROJECT_REF,
  env.DATABASE_URL,
]
  .filter(Boolean)
  .some((v) => v.includes(PRODUCTION_REF));

if (!pointsAtProduction) {
  console.log("ok   dev environment does not target the production project");
  process.exit(0);
}

if (env[OVERRIDE_VAR] === OVERRIDE_VALUE) {
  console.warn(
    `\n  !!  Starting a DEV server against PRODUCTION (${PRODUCTION_REF}).\n` +
      `      ${OVERRIDE_VAR} is set, so this is deliberate.\n` +
      `      Reads and writes hit live member data. /admin/listings writes on load.\n`,
  );
  process.exit(0);
}

console.error(
  `\nRefusing to start: this environment targets the PRODUCTION database.\n\n` +
    `  Project ref: ${PRODUCTION_REF}\n` +
    `  Found in:    ` +
    ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_URL", "SUPABASE_PROJECT_REF", "DATABASE_URL"]
      .filter((k) => env[k]?.includes(PRODUCTION_REF))
      .join(", ") +
    `\n\n` +
    `A dev server here holds a service-role key, which bypasses every RLS\n` +
    `policy. /admin/listings writes to listing rows on page load, so simply\n` +
    `opening it would modify production data.\n\n` +
    `Fix it, best first:\n\n` +
    `  1. Point .env.local at a development Supabase project.\n` +
    `     There is not one yet; that work is tracked in issue #84 and\n` +
    `     docs/proposals/baseline-phase-1-classification.md.\n\n` +
    `  2. If you genuinely need production, say so explicitly:\n\n` +
    `       ${OVERRIDE_VAR}=${OVERRIDE_VALUE} npm run dev\n\n` +
    `Build, verify and CI are unaffected by this check; it guards ` +
    `\`npm run dev\` only.\n`,
);
process.exit(1);
