#!/usr/bin/env node
/**
 * `npm run dev:db` - the whole development database, in one command.
 *
 * Starts the local Supabase stack, restores the committed baseline snapshot of
 * production's schema, seeds a signed-in test account with real records, and
 * prints the credentials.
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
 * ## Why the schema comes from a snapshot and not from the migrations
 *
 * The first version of this file ran `supabase db reset`, which replays
 * `supabase/migrations/`. It does not work, and the way it fails is worse than
 * failing:
 *
 *   45 of 55 migrations skipped: filename pattern mismatch
 *   failed:  01_catalogue_fields.sql
 *   error:   relation "products" does not exist
 *
 * That is `FINDING-01` of the WO-2 reconciliation, and it is SEVERE. The CLI
 * reads a version from the characters before the first underscore and requires
 * them to be digits, so most of the history is silently ignored; and what is
 * left is not self-contained, because it begins by altering tables no migration
 * creates.
 *
 * `supabase/schema-snapshots/` already holds the answer, and CI has been using
 * it since PR #203: a schema-only dump of production's `public` schema, taken
 * once, on the owner's machine. `deal-room-migration-replay.yml` restores it as
 * phase 0 of every migration proof. This file now does exactly what that
 * workflow does, so the database a developer runs against and the database CI
 * proves against are built the same way from the same bytes.
 *
 * **Nothing here renames, reorders or edits a migration.** The remedy for
 * FINDING-01 belongs to the WO-2 reconciliation report. This is a way to work
 * while that is outstanding, and it says so on every run rather than quietly
 * making the problem look solved.
 *
 * ## Nothing here can reach production
 *
 * The stack is loopback only. `supabase link` is never run, so the CLI holds no
 * project reference. Every statement is executed by the `psql` inside the local
 * Docker container, which has no route to anything else. The seeder refuses to
 * write unless the Supabase URL is a loopback address, with no override flag.
 * The keys the local stack prints are the CLI's fixed development keys,
 * identical on every machine, and are not secrets.
 *
 *   npm run dev:db          start, restore, seed
 *   npm run dev:db -- reset drop everything and rebuild from the baseline
 *   npm run dev:db -- stop  stop the stack
 */

import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, readdirSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const SNAPSHOT_DIR = "supabase/schema-snapshots";
const MIGRATIONS_DIR = "supabase/migrations";
const PENDING_DIR = "supabase/pending";

const argument = process.argv[2] ?? "start";

/**
 * Pending migrations to apply on top, named explicitly.
 *
 *   npm run dev:db -- with 20260731e_deal_room_paid_room_periods.sql
 *
 * Default: none. The development database builds the schema that actually
 * launches, and anything ahead of production has to be asked for by name.
 */
const requestedPending = argument === "with" ? process.argv.slice(3) : [];

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

/* ------------------------------------------------------------------ *
 * Talking to the database
 *
 * Through `docker exec`, not through a psql on the host. Two reasons, and the
 * second is the one that matters:
 *
 *   1. Windows has no psql unless somebody installed one, and Docker is
 *      already a hard prerequisite of this command.
 *   2. The snapshot is produced by pg_dump 17 and is wrapped in `\restrict` /
 *      `\unrestrict`, which older psql clients do not understand and fail on at
 *      line 5. The client inside the container is the same 17.6 as production,
 *      so the file restores as written rather than as edited to suit a client.
 * ------------------------------------------------------------------ */

/** The container name follows `project_id` in config.toml, so read it there
 *  rather than hard-coding a string that can drift out of agreement. */
function dbContainer() {
  const config = readFileSync("supabase/config.toml", "utf8");
  const match = config.match(/^\s*project_id\s*=\s*"([^"]+)"/m);
  if (!match) fail("supabase/config.toml does not declare a project_id.");
  const name = `supabase_db_${match[1]}`;

  const ps = run("docker", ["ps", "--filter", `name=^${name}$`, "--format", "{{.Names}}"], { capture: true });
  if ((ps.stdout ?? "").trim() !== name) {
    fail(
      `The database container ${name} is not running.`,
      "The stack reported that it started, but its database is not up. `npx supabase stop` then try again.",
    );
  }
  return name;
}

/**
 * Run SQL. ALWAYS from a file copied into the container, never from `-c`.
 *
 * `-c "..."` has to survive `cmd.exe`, and this SQL contains quotes, dollar
 * quoting and 290 kB of dump. Shell quoting mangled a regex twice already
 * during this work; a file cannot be mangled by a shell it never passes
 * through. Copied rather than piped for the same reason - Windows stdin has an
 * encoding, and a file copy does not.
 */
let handle = 0;
function psql(container, sql, { extra = [], label = "a statement" } = {}) {
  const name = `ponte-dev-db-${process.pid}-${handle++}.sql`;
  const host = join(tmpdir(), name);
  const inside = `/tmp/${name}`;
  writeFileSync(host, sql, "utf8");
  try {
    const copied = run("docker", ["cp", host, `${container}:${inside}`], { capture: true });
    if (copied.status !== 0) fail(`Could not copy ${label} into the container.`, copied.stderr);

    const applied = run(
      "docker",
      ["exec", container, "psql", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-q", ...extra, "-f", inside],
      { capture: true },
    );
    run("docker", ["exec", container, "rm", "-f", inside], { capture: true });
    return applied;
  } finally {
    rmSync(host, { force: true });
  }
}

/** Run SQL that must succeed. */
function must(container, sql, { allowFailure = false } = {}) {
  const result = psql(container, sql);
  if (result.status !== 0 && !allowFailure) {
    fail("A database statement failed.", `${sql}\n\n${result.stderr ?? ""}`);
  }
  return result;
}

/** Ask the database a question and get one value back. */
function ask(container, sql) {
  return (psql(container, sql, { extra: ["-t", "-A"] }).stdout ?? "").trim();
}

/* ------------------------------------------------------------------ *
 * Phase 0: restore the committed baseline
 *
 * Deliberately the same sequence as `deal-room-migration-replay.yml`, step by
 * step, including the refusals. Two ways of restoring the same file that drift
 * apart would mean CI proves a schema nobody develops against.
 * ------------------------------------------------------------------ */

function newestSnapshot() {
  const files = readdirSync(SNAPSHOT_DIR)
    .filter((name) => name.endsWith(".sql"))
    .sort();
  if (files.length === 0) {
    fail(
      `No baseline snapshot in ${SNAPSHOT_DIR}.`,
      [
        "The migration history cannot rebuild this database on its own - see",
        "docs/codex/audits/reconciliation/FINDING-01-migration-lineage-2026-08-02.md",
        "- so the schema comes from a schema-only dump of production instead.",
        "",
        "Producing one needs a connection string exactly once, on the owner's own",
        `machine. ${SNAPSHOT_DIR}/README.md has the command.`,
      ].join("\n"),
    );
  }
  return files[files.length - 1];
}

/**
 * A snapshot carrying rows is a snapshot that leaked production data into the
 * repository. Refused here as well as in CI, because a developer's laptop is
 * the place a leaked dump is least likely to be noticed.
 *
 * `\.` is anchored to a line that is exactly backslash-dot, which is what ends
 * a COPY block. Unanchored it also matches the `\restrict` meta-command that
 * pg_dump 17.6+ wraps every dump in, and would reject a perfectly clean file.
 */
const DATA_MARKERS = [/^COPY /m, /^INSERT INTO/m, /^\\\.$/m, /^-- Data for Name:/m];

function assertStructureOnly(text, file) {
  for (const marker of DATA_MARKERS) {
    const hit = text.match(marker);
    if (hit) {
      fail(
        `${file} contains data (${hit[0]}), not just structure.`,
        "A schema snapshot must carry no rows. Refusing to restore it.",
      );
    }
  }
}

function restoreBaseline(container) {
  const file = newestSnapshot();
  const path = join(SNAPSHOT_DIR, file);
  const raw = readFileSync(path, "utf8");

  console.log(`  snapshot   ${file}  (${Math.round(raw.length / 1024)} kB)`);
  assertStructureOnly(raw, file);

  /*
    A schema-only dump of ONE schema carries no CREATE EXTENSION, but
    production's public schema depends on three: `vector` (public.vector columns
    and match_hs_codes), `pg_trgm` (gin_trgm_ops indexes and similarity()) and
    `pgcrypto` (digest()). They have to exist before the first statement that
    uses one, so the schema is built here rather than by the dump.
  */
  must(container, "drop schema if exists public cascade; create schema public;");
  for (const extension of ["vector", "pg_trgm", "pgcrypto"]) {
    must(container, `create extension if not exists ${extension} with schema public;`);
  }

  /*
    Production sets default privileges for `supabase_admin` as well as for
    `postgres`. Changing another role's default privileges requires membership
    in it. Ask for it; if the stack allows it the snapshot restores in full, and
    if not, the twelve statements are dropped explicitly and reported rather
    than silently.
  */
  must(container, "grant supabase_admin to postgres;", { allowFailure: true });
  const member = ask(container, "select pg_has_role('postgres','supabase_admin','MEMBER');") === "t";

  const lines = raw.split("\n");
  let prepared = lines.filter((line) => line !== "CREATE SCHEMA public;");
  let expected = 1;
  if (!member) {
    prepared = prepared.filter((line) => !line.startsWith("ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin "));
    expected = 13;
    console.log("  note       postgres cannot join supabase_admin here, so 12 ALTER DEFAULT PRIVILEGES");
    console.log("             statements are dropped. They govern objects that role creates later;");
    console.log("             nothing local is created by it.");
  }

  // Counted and asserted, so this can never quietly become a broader edit of a
  // file that is supposed to be restored exactly as it was dumped.
  const removed = lines.length - prepared.length;
  if (removed !== expected) {
    fail(`Expected to drop exactly ${expected} line(s) from the snapshot, dropped ${removed}.`);
  }

  const applied = psql(container, prepared.join("\n"), { label: "the baseline snapshot" });
  if (applied.status !== 0) {
    fail("The baseline snapshot did not restore.", applied.stderr);
  }

  const tables = ask(container, "select count(*) from information_schema.tables where table_schema='public';");
  console.log(`  restored   ${tables} tables in public`);
  return file;
}

/* ------------------------------------------------------------------ *
 * Phase 1: migrations written after the genesis
 * ------------------------------------------------------------------ */

/**
 * Everything in `supabase/migrations/` is applied, in filename order.
 *
 * There is no cut-line rule any more, and no exception list. `WO-8` adopted the
 * committed snapshot as the genesis, so the folder holds only files written
 * AFTER it, and every one of them belongs on the apply path by definition. That
 * is the whole benefit of the change: the question "is this file already in the
 * baseline?" no longer has to be answered, because the folder answers it.
 *
 * The previous version guessed from the filename date, and the guess was wrong
 * in a knowable way - it assumed every migration older than the snapshot had
 * been applied to production, and WO-2 proved two had not. The exception list
 * that patched it is gone with the thing it was patching.
 *
 * Applied one at a time by this file rather than by the CLI, which is what
 * sidesteps FINDING-01's filename-pattern trap without renaming anything.
 */
function applyMigrations(container) {
  const files = readdirSync(MIGRATIONS_DIR).filter((n) => n.endsWith(".sql")).sort();
  if (files.length === 0) {
    console.log("  genesis    the snapshot IS the schema; no migrations written since");
    return;
  }
  for (const name of files) {
    const applied = psql(container, readFileSync(join(MIGRATIONS_DIR, name), "utf8"), { label: name });
    if (applied.status !== 0) {
      fail(
        `Migration ${name} does not apply on top of the genesis.`,
        [
          "This is a real finding about that migration, not a setup problem: the",
          "genesis is production's own schema, so a migration that cannot be",
          "applied to it cannot be applied to production either.",
          "",
          (applied.stderr ?? "").split("\n").slice(-20).join("\n"),
        ].join("\n"),
      );
    }
    console.log(`  applied    ${name}`);
  }
}

/**
 * Files from `supabase/pending/`, applied ONLY when asked for by name.
 *
 * `npm run dev:db -- with 20260731e_deal_room_paid_room_periods.sql`
 *
 * Pending means written and deliberately not applied, so the default is to
 * build the schema that actually launches and nothing else. Opting in is for
 * developing against a migration before it is approved - which is the only way
 * to find out it does not work, and how `20260730a` was demonstrated broken.
 *
 * Each one is named on the way in, so a local database is never quietly ahead
 * of production without saying so.
 */
function applyPending(container, requested) {
  for (const name of requested) {
    const path = join(PENDING_DIR, name);
    if (!existsSync(path)) {
      const available = readdirSync(PENDING_DIR).filter((n) => n.endsWith(".sql"));
      fail(`${name} is not in ${PENDING_DIR}.`, `Available:\n  ${available.join("\n  ")}`);
    }
    const applied = psql(container, readFileSync(path, "utf8"), { label: name });
    if (applied.status !== 0) {
      fail(
        `Pending migration ${name} does not apply.`,
        (applied.stderr ?? "").split("\n").slice(-20).join("\n"),
      );
    }
    console.log(`  pending    ${name}  (NOT in production)`);
  }
}

/* ------------------------------------------------------------------ *
 * Phase 2: the one thing a `--schema=public` dump cannot carry
 * ------------------------------------------------------------------ */

/**
 * Reattach the signup trigger.
 *
 * `public.handle_new_user()` is in the snapshot, because it lives in public.
 * The trigger that calls it is on `auth.users`, which a `--schema=public` dump
 * does not include - so without this, creating an account locally produces a
 * user with no profile row and no signup credit grant.
 *
 * That is not a difference between local and production. It is an artefact of
 * the dump's schema filter, and reattaching the trigger makes local MORE like
 * production, not less. `20260722e_handle_new_user_search_path.sql` creates
 * exactly this trigger and says so in its own words: "The trigger, for a
 * database that does not already have it. Production does."
 *
 * Nothing else non-public is reconstructed. See `reportNonPublicGap`.
 */
function reattachSignupTrigger(container) {
  const hasFunction = ask(
    container,
    "select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname='public' and p.proname='handle_new_user';",
  );
  if (hasFunction === "0") {
    console.log("  signup     public.handle_new_user() is not in the baseline; trigger not attached");
    return;
  }
  must(
    container,
    "drop trigger if exists on_auth_user_created on auth.users; " +
      "create trigger on_auth_user_created after insert on auth.users " +
      "for each row execute function public.handle_new_user();",
  );
  console.log("  signup     on_auth_user_created reattached to auth.users");
}

/**
 * The seven storage buckets, exactly as production has them.
 *
 * ## Where these numbers come from
 *
 * The WO-2 reconciliation export, run by the owner by hand in the Supabase SQL
 * editor at 2026-08-02 16:40:37 UTC, section 3.5. Production's own catalogue,
 * not a reading of the migrations - which matters, because the migrations are
 * WRONG about this.
 *
 * `supabase/archive/20260729c_deal_room_storage.sql` states in its header
 * that it is "NOT APPLIED" and that creating `deal-room-evidence` is a separate
 * owner decision. The bucket EXISTS in production: private, 25 MB, pdf/png/
 * jpeg/webp. An earlier version of this file read that header, believed it, and
 * refused to create the bucket locally on the grounds that doing so would give
 * development a capability production lacks. The opposite was true.
 *
 * That is the argument for preferring a production-derived artefact over a
 * migration file, with a concrete casualty attached.
 *
 * ## Written as SQL, not through the storage API
 *
 * `storage.buckets` is an ordinary table and this is configuration, not member
 * data. Going through the REST API meant depending on Kong reaching the storage
 * container moments after `db reset` restarted it, which answered 502 and
 * failed the whole seed. The database is up by definition at this point.
 */
const MB = 1024 * 1024;
const DOCUMENTS = "{application/pdf,image/png,image/jpeg,image/webp}";

const BUCKETS = [
  // The export records this one as "images, mp4, webm, quicktime" rather than
  // as exact MIME strings, so the image entries are the common set and are
  // APPROXIMATE. The other six are recorded exactly.
  { id: "listing-media", public: true, limit: 50 * MB, types: "{image/png,image/jpeg,image/webp,video/mp4,video/webm,video/quicktime}" },
  { id: "ponte-previews", public: true, limit: 50 * MB, types: "{application/pdf}" },
  { id: "deal-room-evidence", public: false, limit: 25 * MB, types: DOCUMENTS },
  { id: "listing-docs", public: false, limit: 10 * MB, types: DOCUMENTS },
  { id: "verification-docs", public: false, limit: 25 * MB, types: DOCUMENTS },
  // No size limit and no MIME restriction in production. Reproduced as found,
  // not tidied: a development database that quietly imposes limits production
  // does not have would hide exactly the uploads that fail there.
  { id: "ponte-deal-docs", public: false, limit: null, types: null },
  { id: "ponte-verification", public: false, limit: null, types: null },
];

function createBuckets(container) {
  const values = BUCKETS.map(
    (b) =>
      `('${b.id}', '${b.id}', ${b.public}, ${b.limit ?? "null"}, ` +
      `${b.types ? `'${b.types}'::text[]` : "null"})`,
  ).join(",\n    ");

  must(
    container,
    `insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
     values ${values}
     on conflict (id) do update set
       public = excluded.public,
       file_size_limit = excluded.file_size_limit,
       allowed_mime_types = excluded.allowed_mime_types;`,
  );
  const count = ask(container, "select count(*) from storage.buckets;");
  console.log(`  buckets    ${count} from production's catalogue (WO-2 export, 2026-08-02)`);
}

/**
 * Say what is still missing, every run.
 *
 * The baseline is `--schema=public`, so nothing in `storage` or `auth` comes
 * with it. Two of those three holes are now filled from production-derived
 * evidence - the signup trigger above, and the seven buckets in
 * `scripts/seed-dev.mjs`, taken from the WO-2 export's own catalogue.
 *
 * The third is not. The policies on `storage.objects` are not in that export
 * and are not reconstructed, so a non-service-role upload will not be
 * authorised here even though the bucket it targets exists.
 *
 * ## Why this is stated and not quietly reconstructed from the migrations
 *
 * Because reading the migrations for this got it WRONG, in the direction that
 * matters. `20260729c_deal_room_storage.sql` declares itself NOT APPLIED, so an
 * earlier version of this file refused to create `deal-room-evidence` on the
 * reasoning that development must not claim a capability production lacks. The
 * WO-2 export then showed the bucket exists in production: private, 25 MB,
 * pdf/png/jpeg/webp. The header was stale and the caution was backwards.
 *
 * A gap somebody can read is worth more than a reconstruction nobody can check.
 */
function reportNonPublicGap() {
  console.log("");
  console.log("  This database is production PLUS two written-but-unapplied migrations,");
  console.log("    named above. It is the schema you are BUILDING against, not production's.");
  console.log("");
  console.log("  Still missing: the policies on storage.objects.");
  console.log("    The seven buckets are seeded from production's own catalogue (WO-2 export,");
  console.log("    2026-08-02), but their access rules are not in that export. Uploads and");
  console.log("    downloads work through the service role and are unauthorised for anyone else.");
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

const container = dbContainer();

/*
  `db reset` returns the stack to a known state: auth, storage and the rest of
  Supabase's own schemas as the CLI creates them, and nothing of ours.

  It replays no migrations, because `[db.migrations] enabled = false` in
  config.toml - see the comment there for why. What follows rebuilds `public`
  from the baseline regardless, so this is belt and braces rather than the load
  bearing step: it is what clears a previous run's auth users and storage rows.

  Run every time, not only on `reset`. A development database that has drifted
  from its stated source is the exact problem this exercise exists to stop
  reproducing. Cheap to rebuild, expensive to mistrust.
*/
console.log("\nresetting to a clean stack");
const reset = run("npx", ["supabase", "db", "reset"], { capture: true });
if (reset.status !== 0) {
  fail("`supabase db reset` failed.", `${reset.stdout ?? ""}\n${reset.stderr ?? ""}`);
}

/*
  Captured rather than streamed, and then COUNTED.

  The CLI prints one line per file it will not read - forty-five of them, every
  run, identical. Forty-five lines of scrollback is not evidence, it is
  wallpaper: it appears whether or not anybody has looked at it, and the ten
  lines that matter scroll away above it.

  So the count is reported instead. This is not hiding FINDING-01; it is the
  finding stated as a number, on every run, next to the fact that the schema
  came from somewhere else entirely.
*/
const skipped = ((reset.stdout ?? "") + (reset.stderr ?? "")).split(/\r?\n/)
  .filter((line) => line.includes("Skipping migration")).length;
if (skipped > 0) {
  console.log(`  ${skipped} migration(s) the CLI will not read: filename pattern. FINDING-01.`);
}

console.log("\nbuilding the schema\n");
restoreBaseline(container);
applyMigrations(container);
applyPending(container, requestedPending);
reattachSignupTrigger(container);
createBuckets(container);

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

reportNonPublicGap();

console.log("");
console.log("  Supabase   " + status.API_URL);
console.log("  Studio     " + (status.STUDIO_URL ?? "http://localhost:54323"));
// MAILPIT_URL on current CLIs; INBUCKET_URL is the older name and is still
// reported alongside it. Both read, so this line survives either.
console.log("  Mailpit    " + (status.MAILPIT_URL ?? status.INBUCKET_URL ?? "http://localhost:54324") + "   (every dev email lands here)");
console.log("");
console.log("  The schema came from a snapshot, NOT from supabase/migrations/.");
console.log("  The history still cannot rebuild itself: FINDING-01, unresolved.");
console.log("");
console.log("  Now run:   npm run dev:local");
console.log("  Sign in:   dev@ponte.local, then `npm run dev:code` for the six digits");
console.log("");
