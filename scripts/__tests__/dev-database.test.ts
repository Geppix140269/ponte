// The development database is built from the BASELINE, and says so.
//
// Run: npx tsx scripts/__tests__/dev-database.test.ts
//
// ## Why a test
//
// `npm run dev:db` used to run `supabase db reset`, which replays
// `supabase/migrations/`. That does not work and never did: the CLI silently
// skips 45 of the 55 files for a filename pattern, and the ten it reads begin
// by altering tables no migration creates. FINDING-01, severe.
//
// The schema now comes from `supabase/schema-snapshots/`, exactly as CI's
// `deal-room-migration-replay.yml` phase 0 has since PR #203. These assertions
// exist because every one of them is a decision somebody could undo by writing
// something that looks more obvious:
//
//   - re-enabling `[db.migrations]`, which would make the local stack pretend
//     to have applied a history it cannot apply;
//   - deleting the FINDING-01 notice, which is the only thing between "this
//     works" and "the migrations work";
//   - reconstructing storage from the migration files, which was tried and was
//     wrong in the dangerous direction;
//   - pointing the sign-in email back at a Supabase default, which sends a link
//     to a product that only accepts a code.
//
// Structural assertions on the source, like the route-manifest and action-gate
// tests, because a test that needs Docker and four minutes is a test nobody
// runs.

import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";

let passed = 0;
function test(name: string, fn: () => void): void {
  try {
    fn();
    passed++;
  } catch (err) {
    console.error(`FAIL  ${name}\n      ${(err as Error).message}`);
    process.exitCode = 1;
  }
}

const CONFIG = readFileSync("supabase/config.toml", "utf8");
const RUNNER = readFileSync("scripts/dev-db.mjs", "utf8");
const SEEDER = readFileSync("scripts/seed-dev.mjs", "utf8");

/** `config.toml` with comments stripped, so a comment explaining a setting is
 *  never mistaken for the setting. */
const SETTINGS = CONFIG.split("\n")
  .filter((line) => !line.trimStart().startsWith("#"))
  .join("\n");

// ---------------------------------------------------------------------------
// The schema does not come from the migrations
// ---------------------------------------------------------------------------

test("the CLI's migration replay is off", () => {
  /*
    Read from the [db.migrations] section specifically. A bare search for
    `enabled = false` would match any of the dozen other sections in this file
    and pass while migrations were on.
  */
  const section = SETTINGS.split(/^\[/m).find((s) => s.startsWith("db.migrations]"));
  assert.ok(section, "[db.migrations] is no longer in config.toml");
  assert.match(
    section,
    /^enabled\s*=\s*false/m,
    "migration replay is enabled again; the local stack will apply 10 of 55 files and report success",
  );
});

test("a baseline snapshot exists to restore instead", () => {
  const snapshots = readdirSync("supabase/schema-snapshots").filter((n) => n.endsWith(".sql"));
  assert.ok(snapshots.length > 0, "there is no baseline snapshot, so nothing can build the schema");
});

test("the runner restores that snapshot, and refuses one carrying rows", () => {
  assert.match(RUNNER, /schema-snapshots/, "the runner no longer reads the snapshot directory");
  // The same four data markers CI refuses. A snapshot with rows is a snapshot
  // that leaked production data into the repository.
  for (const marker of ["COPY ", "INSERT INTO", "Data for Name:"]) {
    assert.ok(RUNNER.includes(marker), `the runner no longer refuses a snapshot containing ${marker}`);
  }
});

test("it does not silently skip a migration written after the snapshot", () => {
  // A new migration has to be applied for the local database to be current,
  // and the CLI would skip it for the same filename reason. The runner applies
  // it itself, and fails loudly if it does not apply.
  assert.match(RUNNER, /applyNewerMigrations/, "migrations newer than the baseline are no longer applied");
  assert.match(RUNNER, /does not apply on top of the baseline/, "a failing new migration no longer fails the run");
});

test("FINDING-01 is still reported on every run", () => {
  /*
    The single most important line in the file. Everything above makes the
    development database work; this is what stops that being mistaken for the
    migration history working. Remove it and the next person concludes the
    problem was fixed in August.
  */
  assert.match(RUNNER, /FINDING-01/, "the runner no longer names the unresolved finding");
  assert.match(
    RUNNER,
    /NOT from supabase\/migrations/,
    "the runner no longer says where the schema actually came from",
  );
});

// ---------------------------------------------------------------------------
// Storage: from production's catalogue, not from the migration files
// ---------------------------------------------------------------------------

test("all seven production buckets are created", () => {
  /*
    From the WO-2 export of 2 August 2026, section 3.5.

    `deal-room-evidence` is the one that matters. Its migration,
    20260729c_deal_room_storage.sql, declares itself NOT APPLIED, and an earlier
    version of this work read that header and deliberately did not create the
    bucket - reasoning that development must not claim a capability production
    lacks. Production has it. The header was stale and the caution was exactly
    backwards, which is why this list is pinned against the export and not
    against the migrations.
  */
  for (const bucket of [
    "listing-media",
    "ponte-previews",
    "deal-room-evidence",
    "listing-docs",
    "verification-docs",
    "ponte-deal-docs",
    "ponte-verification",
  ]) {
    assert.ok(RUNNER.includes(`"${bucket}"`), `the ${bucket} bucket is no longer created locally`);
  }
});

test("the two public buckets are the two that are public in production", () => {
  const publicOnes = [...RUNNER.matchAll(/\{ id: "([a-z-]+)", public: true/g)].map((m) => m[1]);
  assert.deepEqual(
    publicOnes.sort(),
    ["listing-media", "ponte-previews"],
    "the set of public buckets no longer matches production",
  );
});

test("the storage.objects policy gap is stated, not papered over", () => {
  // The buckets exist locally; their access rules do not, because they are not
  // in the export. A gap somebody can read beats a reconstruction nobody can
  // check - which is the lesson from deal-room-evidence, again.
  assert.match(RUNNER, /storage\.objects/, "the runner no longer says which part of storage is missing");
});

// ---------------------------------------------------------------------------
// Sign-in: a code, from the repository's own template
// ---------------------------------------------------------------------------

test("the local stack sends the repository's OTP template, for both cases", () => {
  /*
    Ponte sends a six-digit code and never a link. Supabase's default templates
    send `{{ .ConfirmationURL }}`, and a link cannot be typed into a six-box OTP
    field - so before this, local sign-in was impossible rather than awkward.

    BOTH templates, because `signInWithOtp()` picks between Magic Link and
    Confirm signup on whether Supabase has seen the address, which is
    bookkeeping the member cannot observe.
  */
  for (const template of ["magic_link", "confirmation"]) {
    const section = SETTINGS.split(/^\[/m).find((s) => s.startsWith(`auth.email.template.${template}]`));
    assert.ok(section, `[auth.email.template.${template}] is not configured`);
    assert.match(
      section,
      /content_path\s*=\s*"\.\/supabase\/templates\/auth-otp\.html"/,
      `the ${template} template no longer points at the repository's own file`,
    );
  }
});

test("the OTP template carries a token and not a link", () => {
  const template = readFileSync("supabase/templates/auth-otp.html", "utf8");
  assert.match(template, /\{\{\s*\.Token\s*\}\}/, "the sign-in email no longer contains a code");
  assert.ok(
    !template.includes("ConfirmationURL"),
    "the sign-in email contains a link; Ponte sends a code and never a link",
  );
});

test("nothing tells anybody to sign in with a password", () => {
  /*
    There is no password field anywhere in the product. `npm run dev:db` used to
    print "password ponte-dev-password" as though there were, which is a
    ten-minute detour for every person who tries it once.
  */
  assert.ok(
    !/password\s+\$\{?TEST_ACCOUNT\.password/.test(SEEDER),
    "the seeder prints a password as the way to sign in",
  );
  assert.match(SEEDER, /dev:code/, "the seeder does not say how to actually get in");
});

// ---------------------------------------------------------------------------
// The safety property that everything else rests on
// ---------------------------------------------------------------------------

test("the seeder still refuses any host that is not loopback, with no override", () => {
  assert.match(SEEDER, /REFUSING TO SEED/, "the loopback guard is gone");
  assert.ok(
    !/PONTE_ALLOW|--force|FORCE_SEED/i.test(SEEDER),
    "an override flag was added to the seeder; there is deliberately no way to point it at production",
  );
});

test("the local stack is never linked to a hosted project", () => {
  /*
    Match the INVOCATION, not the word.

    The first version of this searched for "supabase" near "link" and failed on
    the runner's own header comment, which says `supabase link` is never run.
    A rule that its own explanation violates is not a rule, it is a spellcheck.

    Every CLI call in this file is `run("npx", ["supabase", <verb>, ...])`, so
    the verb position is what to assert on.
  */
  const verbs = [...RUNNER.matchAll(/"supabase",\s*"([a-z]+)"/g)].map((m) => m[1]);
  assert.ok(verbs.length > 0, "the runner no longer calls the Supabase CLI at all; this check is not testing anything");
  assert.ok(
    !verbs.includes("link"),
    `the runner runs \`supabase link\`, which would give the CLI a production project reference (verbs: ${verbs.join(", ")})`,
  );
});

console.log(`ok   development database: ${passed} assertions passed`);
