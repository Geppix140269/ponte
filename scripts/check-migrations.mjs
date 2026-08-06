// Guards the migration directory against the two faults found on 28 July 2026.
//
//   node scripts/check-migrations.mjs
//
// 1. A DEPRECATED migration reappearing under supabase/migrations/.
//    `20260725a_verification_needs_selection.sql` cannot be applied to
//    production at all: it drops `verified` and `rejected` from the
//    verifications status constraint, production holds rows in both, and
//    removing `verified` would make the publication gate unpassable. It was
//    moved to supabase/deprecated/ by owner direction. Moving it back, or
//    re-creating a file by that name, would put it in front of any chain that
//    ever walks that directory. See supabase/deprecated/README.md.
//
// 2. A DUPLICATE migration identifier. Two files sharing a prefix is how
//    `20260728a_market_classification.sql` (applied to production) came to sit
//    beside `20260728a_automated_listing_publication.sql` (not applied). A
//    filename is how an operator says which migration they mean, and how the
//    ledger records it, so two files answering to one identifier makes both the
//    conversation and the record ambiguous.
//
// Exits non-zero on either, so it can gate a build.

import { readdirSync, existsSync } from "node:fs";

const MIGRATIONS = "supabase/migrations";
const DEPRECATED = "supabase/deprecated";
const PENDING = "supabase/pending";
const ARCHIVE = "supabase/archive";

/** Filenames that must never appear under supabase/migrations/. */
const NEVER_APPLY = new Set([
  "20260725a_verification_needs_selection.sql",
]);

const problems = [];

const sqlIn = (dir) =>
  existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith(".sql")) : [];

const migrations = sqlIn(MIGRATIONS);

// 1. Deprecated files must not be in the applied directory.
for (const file of migrations) {
  if (NEVER_APPLY.has(file)) {
    problems.push(
      `${MIGRATIONS}/${file} is DEPRECATED and must never be applied.\n` +
        `    It belongs in ${DEPRECATED}/. See ${DEPRECATED}/README.md for why.`,
    );
  }
}

// Every name on the never-apply list should still be on disk in deprecated/, so
// the reason it is banned travels with the ban.
const deprecated = new Set(sqlIn(DEPRECATED));
for (const file of NEVER_APPLY) {
  if (!deprecated.has(file) && !migrations.includes(file)) {
    problems.push(
      `${file} is on the never-apply list but is in neither ${MIGRATIONS} nor ` +
        `${DEPRECATED}.\n    If it was deleted on purpose, remove it from ` +
        `NEVER_APPLY in this script and say why in ${DEPRECATED}/README.md.`,
    );
  }
}

/*
  1b. A file may never be in BOTH `migrations/` and `pending/` or `archive/`.

  `WO-8` section 3.1 asked that unapplied-by-design files be held so a replay
  cannot pick them up, and that the distinction be "visible in the folder rather
  than kept in someone's head". A folder convention is kept in someone's head.
  This is the part that is not.

  The failure it guards against is ordinary and quiet: somebody copies a pending
  file into `migrations/` to test it, the copy is committed, and a folder whose
  entire purpose is "these do not run" now contains a file that does. Under the
  auto-apply integration described in `pending/README.md`, that is a production
  schema write nobody decided on.
*/
const pending = new Set(sqlIn(PENDING));
const archived = new Set(sqlIn(ARCHIVE));
for (const file of migrations) {
  if (pending.has(file)) {
    problems.push(
      `${MIGRATIONS}/${file} is ALSO in ${PENDING}/.\n` +
        `    ${PENDING}/ means "written and deliberately not applied". A copy in\n` +
        `    ${MIGRATIONS}/ is on the apply path and cancels that. Keep one.`,
    );
  }
  if (archived.has(file)) {
    problems.push(
      `${MIGRATIONS}/${file} is ALSO in ${ARCHIVE}/.\n` +
        `    ${ARCHIVE}/ holds files already applied before the genesis snapshot.\n` +
        `    Replaying one collides with an object that already exists.`,
    );
  }
}

// 2. No two migrations may share a date-and-letter identifier.
//
//    Two conventions exist in this directory. The current one stamps a date and
//    a discriminating letter (`20260728a_`), where the letter exists precisely
//    to order same-day migrations. The older one used the date alone
//    (`20260526_capacity_queue.sql`), and three May files legitimately share a
//    date because that convention had nothing to distinguish them with.
//
//    So a shared date is only a defect under the current convention, where the
//    letter is supposed to be the discriminator and two files answering to one
//    letter means it failed at its only job. Date-only files are reported as a
//    note and do not fail the build: they are all long applied, renaming them
//    would rewrite recorded history, and nothing is going to reorder May.
const byIdentifier = new Map();
for (const file of migrations) {
  const m = file.match(/^(\d{8}[a-z]?)/);
  const id = m ? m[1] : file.split("_")[0];
  if (!byIdentifier.has(id)) byIdentifier.set(id, []);
  byIdentifier.get(id).push(file);
}

const legacyShared = [];
for (const [id, files] of byIdentifier) {
  if (files.length < 2) continue;
  if (/[a-z]$/.test(id)) {
    problems.push(
      `migration identifier "${id}" is used by ${files.length} files:\n` +
        files.map((f) => `      ${f}`).join("\n") +
        `\n    Rename all but one. The letter suffix exists to order same-day` +
        `\n    migrations, and two files sharing it makes the ledger entry and` +
        `\n    any operator instruction ambiguous about which file is meant.`,
    );
  } else {
    legacyShared.push(`${id} (${files.length} files)`);
  }
}

if (problems.length) {
  console.error(`Migration check failed, ${problems.length} problem(s):\n`);
  for (const p of problems) console.error(`  ${p}\n`);
  process.exit(1);
}

if (legacyShared.length) {
  console.log(
    `note shared date-only identifiers, pre-dating the letter convention: ` +
      legacyShared.join(", "),
  );
}

console.log(
  `ok   ${migrations.length} migration(s) on the apply path; ` +
    `${archived.size} archived, ${pending.size} pending, ` +
    `${NEVER_APPLY.size} deprecated. No overlap, no duplicate identifiers.`,
);
