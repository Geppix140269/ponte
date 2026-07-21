// Restore a backup produced by scripts/backup.mjs.
//
//   node scripts/restore.mjs <backup-dir>                      dry run, default
//   node scripts/restore.mjs <backup-dir> --confirm <project>   actually write
//
// A backup nobody has ever restored is a guess, not a backup. Run the dry run
// against a real backup occasionally so you know this works before you need it.
//
// Safety, in order:
//   1. Dry run unless --confirm is passed.
//   2. --confirm requires the target project ref spelled out, and it must match
//      the SUPABASE_URL in the environment. That is what stops a restore of
//      production data into the wrong project, or the reverse.
//   3. Rows are upserted by primary key, so an existing row is updated rather
//      than duplicated. Nothing is deleted. A restore never removes data that
//      is not in the backup.
//   4. Storage uploads use upsert, so a re-run is safe.
//
// Credentials come from the environment, same as backup.mjs.

import { createClient } from "@supabase/supabase-js";
import {
  readFileSync,
  existsSync,
  readdirSync,
  statSync,
} from "node:fs";
import { join, relative } from "node:path";

const PAGE = 500;

function loadEnvLocal() {
  if (!existsSync(".env.local")) return;
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (!m) continue;
    const value = m[2].trim().replace(/^["']|["']$/g, "");
    if (value && !process.env[m[1]]) process.env[m[1]] = value;
  }
}

function walk(dir, base = dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, base, out);
    else out.push(relative(base, full).split("\\").join("/"));
  }
  return out;
}

async function main() {
  loadEnvLocal();

  const args = process.argv.slice(2);
  const runDir = args[0];
  const confirmIdx = args.indexOf("--confirm");
  const confirmed = confirmIdx !== -1;
  const targetRef = confirmed ? args[confirmIdx + 1] : null;

  if (!runDir || !existsSync(runDir)) {
    console.error("Usage: node scripts/restore.mjs <backup-dir> [--confirm <project-ref>]");
    process.exit(1);
  }

  const manifestPath = join(runDir, "manifest.json");
  if (!existsSync(manifestPath)) {
    console.error(`No manifest.json in ${runDir}. That is not a backup produced by backup.mjs.`);
    process.exit(1);
  }
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));

  if (!manifest.ok) {
    console.error(
      "This backup is marked incomplete. Restoring it would give you a partial database.\n" +
        "Pick a run whose manifest says ok: true.",
    );
    process.exit(1);
  }

  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
    process.exit(1);
  }
  const currentRef = url.replace(/https:\/\/([^.]+).*/, "$1");

  console.log(`Backup taken from : ${manifest.project}  (${manifest.finishedAt})`);
  console.log(`Environment points: ${currentRef}`);

  if (confirmed) {
    if (targetRef !== currentRef) {
      console.error(
        `\nRefusing to write.\n` +
          `You passed --confirm ${targetRef ?? "(nothing)"} but the environment points at ${currentRef}.\n` +
          `Spell out the project you actually mean.`,
      );
      process.exit(1);
    }
    if (manifest.project !== currentRef) {
      console.error(
        `\nRefusing to write.\n` +
          `This backup came from ${manifest.project} and you are pointed at ${currentRef}.\n` +
          `Restoring across projects moves member personal data between environments. If you\n` +
          `genuinely intend that, copy the backup folder and edit its manifest deliberately.`,
      );
      process.exit(1);
    }
  } else {
    console.log("\nDRY RUN. Nothing will be written. Add --confirm <project-ref> to apply.\n");
  }

  const sb = createClient(url, key, { auth: { persistSession: false } });
  let failures = 0;

  // Tables
  const tablesDir = join(runDir, "tables");
  for (const file of existsSync(tablesDir) ? readdirSync(tablesDir) : []) {
    const table = file.replace(/\.ndjson$/, "");
    const rows = readFileSync(join(tablesDir, file), "utf8")
      .split("\n")
      .filter(Boolean)
      .map((l) => JSON.parse(l));

    if (rows.length === 0) {
      console.log(`  table ${table.padEnd(22)} empty, nothing to do`);
      continue;
    }
    if (!confirmed) {
      console.log(`  table ${table.padEnd(22)} would upsert ${String(rows.length).padStart(6)} rows`);
      continue;
    }

    let done = 0;
    try {
      for (let i = 0; i < rows.length; i += PAGE) {
        const chunk = rows.slice(i, i + PAGE);
        const { error } = await sb.from(table).upsert(chunk, { onConflict: "id" });
        if (error) throw new Error(error.message);
        done += chunk.length;
      }
      console.log(`  table ${table.padEnd(22)} restored ${String(done).padStart(6)} rows`);
    } catch (err) {
      failures++;
      console.error(`  table ${table}: FAILED after ${done} rows, ${err.message}`);
    }
  }

  // Storage
  const storageDir = join(runDir, "storage");
  for (const bucket of existsSync(storageDir) ? readdirSync(storageDir) : []) {
    const files = walk(join(storageDir, bucket));
    if (files.length === 0) continue;
    if (!confirmed) {
      console.log(`  bucket ${bucket.padEnd(21)} would upload ${String(files.length).padStart(5)} files`);
      continue;
    }
    let done = 0;
    for (const path of files) {
      try {
        const body = readFileSync(join(storageDir, bucket, path));
        const { error } = await sb.storage.from(bucket).upload(path, body, { upsert: true });
        if (error) throw new Error(error.message);
        done++;
      } catch (err) {
        failures++;
        console.error(`  ${bucket}/${path}: FAILED, ${err.message}`);
      }
    }
    console.log(`  bucket ${bucket.padEnd(21)} restored ${String(done).padStart(5)} files`);
  }

  if (failures) {
    console.error(`\n${failures} item(s) failed. The restore is incomplete.`);
    process.exit(1);
  }
  console.log(confirmed ? "\nRestore complete." : "\nDry run complete. Nothing was written.");
}

main().catch((err) => {
  console.error(`Restore aborted: ${err.message}`);
  process.exit(1);
});
