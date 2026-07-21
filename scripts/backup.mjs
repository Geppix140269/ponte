// Independent backup of everything Supabase holds: every table, and every file
// in every storage bucket.
//
//   node scripts/backup.mjs
//
// Why this exists: Supabase takes its own backups, but they live inside the
// same project. If the project or the account is lost, they go with it. This
// writes a copy somewhere you control, which is the only kind that survives
// losing the provider.
//
// Credentials come from the environment and are never written to disk or
// logged. Reads .env.local when present, so it works without extra setup.
//
//   SUPABASE_URL                (or NEXT_PUBLIC_SUPABASE_URL)
//   SUPABASE_SERVICE_ROLE_KEY   service role, needed to read every row
//   BACKUP_DIR                  optional, default C:\Users\gfuna\ponte-backups
//   BACKUP_KEEP                 optional, how many runs to retain, default 14
//
// WARNING: output contains member personal data. Treat a backup folder with
// the same care as the database itself. See docs/platform/BACKUP.md.

import { createClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";
import {
  mkdirSync,
  writeFileSync,
  appendFileSync,
  createWriteStream,
  readFileSync,
  existsSync,
  readdirSync,
  rmSync,
  statSync,
} from "node:fs";
import { join, dirname } from "node:path";

// Keep in sync with supabase/migrations. A table listed here that does not
// exist is a hard failure, so a rename is caught instead of silently
// producing an incomplete backup.
const TABLES = [
  "account_briefs",
  "ai_usage",
  "bundle_items",
  "categories",
  "listing_connections",
  "listing_documents",
  "listing_media",
  "listing_translations",
  "listings",
  "newsletter_subscribers",
  "order_items",
  "order_notes",
  "orders",
  "products",
  "profiles",
];

const BUCKETS = [
  "listing-media",
  "listing-docs",
  "ponte-previews",
  "ponte-reports",
];

const PAGE = 1000;

function loadEnvLocal() {
  const path = ".env.local";
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (!m) continue;
    const value = m[2].trim().replace(/^["']|["']$/g, "");
    if (value && !process.env[m[1]]) process.env[m[1]] = value;
  }
}

function stamp() {
  // Local time, sortable, filename safe.
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}`;
}

async function withRetry(label, fn, attempts = 3) {
  let lastErr;
  for (let i = 1; i <= attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (i < attempts) {
        const wait = i * 2000;
        console.warn(`  retry ${i} of ${attempts - 1} for ${label}: ${err.message}`);
        await new Promise((r) => setTimeout(r, wait));
      }
    }
  }
  throw new Error(`${label} failed after ${attempts} attempts: ${lastErr.message}`);
}

// Export one table as newline delimited JSON, paged so a large table does not
// have to fit in memory.
async function dumpTable(sb, table, outDir) {
  const file = join(outDir, "tables", `${table}.ndjson`);
  mkdirSync(dirname(file), { recursive: true });
  const stream = createWriteStream(file, { encoding: "utf8" });
  const hash = createHash("sha256");
  let rows = 0;
  let from = 0;

  for (;;) {
    const { data, error } = await withRetry(`table ${table}`, async () => {
      const res = await sb.from(table).select("*").range(from, from + PAGE - 1);
      if (res.error) throw new Error(res.error.message);
      return res;
    });
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) break;

    for (const row of data) {
      const line = JSON.stringify(row) + "\n";
      stream.write(line);
      hash.update(line);
      rows++;
    }
    if (data.length < PAGE) break;
    from += PAGE;
  }

  await new Promise((res, rej) => stream.end(res).on?.("error", rej));
  return { rows, sha256: hash.digest("hex"), bytes: statSync(file).size };
}

// Storage buckets can nest folders, so walk them.
async function listAll(sb, bucket, prefix = "") {
  const out = [];
  const { data, error } = await withRetry(`list ${bucket}/${prefix}`, async () => {
    const res = await sb.storage.from(bucket).list(prefix, { limit: PAGE });
    if (res.error) throw new Error(res.error.message);
    return res;
  });
  if (error) throw new Error(error.message);

  for (const entry of data ?? []) {
    const path = prefix ? `${prefix}/${entry.name}` : entry.name;
    // A folder has no id in the Supabase listing.
    if (entry.id === null) out.push(...(await listAll(sb, bucket, path)));
    else out.push(path);
  }
  return out;
}

async function dumpBucket(sb, bucket, outDir) {
  let objects;
  try {
    objects = await listAll(sb, bucket);
  } catch (err) {
    // A bucket that does not exist is reported, not fatal: buckets are added
    // and removed more freely than tables.
    console.warn(`  bucket ${bucket}: skipped (${err.message})`);
    return { objects: 0, bytes: 0, skipped: true };
  }

  let bytes = 0;
  for (const path of objects) {
    const blob = await withRetry(`download ${bucket}/${path}`, async () => {
      const res = await sb.storage.from(bucket).download(path);
      if (res.error) throw new Error(res.error.message);
      return res.data;
    });
    const buf = Buffer.from(await blob.arrayBuffer());
    const dest = join(outDir, "storage", bucket, path);
    mkdirSync(dirname(dest), { recursive: true });
    writeFileSync(dest, buf);
    bytes += buf.length;
  }
  return { objects: objects.length, bytes, skipped: false };
}

function prune(root, keep) {
  if (!existsSync(root)) return [];
  const runs = readdirSync(root)
    .filter((n) => /^\d{4}-\d{2}-\d{2}_\d{4}$/.test(n))
    .sort()
    .reverse();
  const drop = runs.slice(keep);
  for (const name of drop) rmSync(join(root, name), { recursive: true, force: true });
  return drop;
}

async function main() {
  loadEnvLocal();

  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error(
      "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.\n" +
        "Set them in the environment or in .env.local. Never pass a key on the command line:\n" +
        "it ends up in your shell history.",
    );
    process.exit(1);
  }

  const backupRoot = process.env.BACKUP_DIR || "C:\\Users\\gfuna\\ponte-backups";
  const keep = Number(process.env.BACKUP_KEEP || 14);
  const runDir = join(backupRoot, "supabase", stamp());
  mkdirSync(runDir, { recursive: true });

  const sb = createClient(url, key, { auth: { persistSession: false } });

  console.log(`Backing up ${url.replace(/https:\/\/([^.]+).*/, "$1")} to ${runDir}`);

  const manifest = {
    startedAt: new Date().toISOString(),
    project: url.replace(/https:\/\/([^.]+).*/, "$1"),
    tables: {},
    storage: {},
    ok: false,
  };

  let failures = 0;

  for (const table of TABLES) {
    try {
      const res = await dumpTable(sb, table, runDir);
      manifest.tables[table] = res;
      console.log(`  table ${table.padEnd(22)} ${String(res.rows).padStart(7)} rows`);
    } catch (err) {
      failures++;
      manifest.tables[table] = { error: err.message };
      console.error(`  table ${table}: FAILED, ${err.message}`);
    }
  }

  for (const bucket of BUCKETS) {
    try {
      const res = await dumpBucket(sb, bucket, runDir);
      manifest.storage[bucket] = res;
      if (!res.skipped) {
        console.log(
          `  bucket ${bucket.padEnd(21)} ${String(res.objects).padStart(7)} files, ${(res.bytes / 1024 / 1024).toFixed(1)} MB`,
        );
      }
    } catch (err) {
      failures++;
      manifest.storage[bucket] = { error: err.message };
      console.error(`  bucket ${bucket}: FAILED, ${err.message}`);
    }
  }

  manifest.finishedAt = new Date().toISOString();
  manifest.ok = failures === 0;
  writeFileSync(join(runDir, "manifest.json"), JSON.stringify(manifest, null, 2));

  const dropped = prune(join(backupRoot, "supabase"), keep);
  if (dropped.length) console.log(`  pruned ${dropped.length} run(s) beyond the last ${keep}`);

  const totalRows = Object.values(manifest.tables).reduce((n, t) => n + (t.rows || 0), 0);
  const totalFiles = Object.values(manifest.storage).reduce((n, b) => n + (b.objects || 0), 0);

  // A one line history, so a silent failure is visible without opening a run.
  appendFileSync(
    join(backupRoot, "supabase", "history.log"),
    `${manifest.finishedAt}\t${manifest.ok ? "OK " : "FAIL"}\trows=${totalRows}\tfiles=${totalFiles}\t${runDir}\n`,
  );

  console.log(`\n${manifest.ok ? "Backup OK" : "BACKUP INCOMPLETE"}: ${totalRows} rows, ${totalFiles} files`);
  if (!manifest.ok) {
    console.error("One or more items failed. This backup cannot be trusted for restore.");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(`Backup aborted: ${err.message}`);
  process.exit(1);
});
