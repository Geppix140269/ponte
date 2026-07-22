// Apply a migration to the database, over a direct Postgres connection.
//
//   node scripts/apply-migration.mjs supabase/migrations/20260722b_hs_codes.sql
//   node scripts/apply-migration.mjs --check <file>     parse and refuse, write nothing
//   node scripts/apply-migration.mjs --list             what has been applied
//
// Env: DATABASE_URL, from .env.local. Never commit it.
//
// ---------------------------------------------------------------------------
// The rule this file enforces
// ---------------------------------------------------------------------------
// Additive migrations are applied here, without ceremony. Anything that can
// lose data is refused outright and has to go to supabase/pending/, be looked
// at by a person, and be run after a fresh backup.
//
// That rule is enforced in code rather than trusted to whoever is typing,
// because on 2026-07-22 a deferred `drop table` migration reached main inside
// the folder that auto-applied to production, and the only thing that stopped
// it running was an unrelated migration failing first. Judgement was not what
// saved it. A refusal that cannot be talked round is.
//
// ---------------------------------------------------------------------------
// Why there is a ledger
// ---------------------------------------------------------------------------
// This project had no record of which migrations had run, which is why nobody
// could say whether the schema in the repository matched production, and why
// seventeen columns exist on `profiles` that no migration creates. Every apply
// from here records its file, its hash and its time.

import { readFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { basename } from "node:path";
import pg from "pg";

function loadEnvLocal() {
  if (!existsSync(".env.local")) return;
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (!m) continue;
    const value = m[2].trim().replace(/^["']|["']$/g, "");
    if (value && !process.env[m[1]]) process.env[m[1]] = value;
  }
}

// Matched against SQL with comments and string literals stripped, so a `drop`
// inside an explanatory comment does not trip it and a `drop` hidden after one
// on the same line does not slip past.
const DESTRUCTIVE = [
  [/\bdrop\s+(table|column|schema|database|type|view|materialized\s+view|sequence)\b/i, "drop"],
  [/\btruncate\b/i, "truncate"],
  [/\bdelete\s+from\b/i, "delete"],
  [/\balter\s+table\s+\S+\s+drop\b/i, "alter table drop"],
  [/\balter\s+column\s+\S+\s+type\b/i, "column type change"],
];

// `drop policy if exists` and `drop trigger if exists` immediately before a
// create are how this codebase writes idempotent migrations. They destroy no
// data. Same for `drop function`, which is replaced in the next breath.
const ALLOWED = [
  /\bdrop\s+policy\s+if\s+exists\b/i,
  /\bdrop\s+trigger\s+if\s+exists\b/i,
  /\bdrop\s+function\s+if\s+exists\b/i,
  /\bdrop\s+index\s+if\s+exists\b/i,
  /\bdrop\s+constraint\b/i,
];

function stripSqlNoise(sql) {
  return sql
    .replace(/--[^\n]*/g, " ")
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/\$\$[\s\S]*?\$\$/g, " $tag$ ")
    .replace(/'(?:[^']|'')*'/g, " 'str' ");
}

function findDestructive(sql) {
  const cleaned = stripSqlNoise(sql);
  const hits = [];
  for (const [re, label] of DESTRUCTIVE) {
    const m = cleaned.match(re);
    if (!m) continue;
    if (ALLOWED.some((ok) => ok.test(m[0]))) continue;
    // Re-check the exact match against the allow list in context: `drop table`
    // is never allowed, `drop policy if exists` always is.
    const idx = cleaned.search(re);
    const context = cleaned.slice(Math.max(0, idx - 40), idx + 80).replace(/\s+/g, " ");
    if (ALLOWED.some((ok) => ok.test(context))) continue;
    hits.push({ label, context: context.trim() });
  }
  return hits;
}

async function ensureLedger(client) {
  await client.query(`
    create table if not exists schema_migrations (
      filename    text primary key,
      sha256      text not null,
      applied_at  timestamptz not null default now()
    )
  `);
}

async function main() {
  loadEnvLocal();
  const args = process.argv.slice(2);
  const checkOnly = args.includes("--check");
  const list = args.includes("--list");
  const file = args.find((a) => !a.startsWith("--"));

  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is not set. It belongs in .env.local, which is gitignored.");
    process.exit(1);
  }

  const client = new pg.Client({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
  });

  if (list) {
    await client.connect();
    await ensureLedger(client);
    const { rows } = await client.query(
      "select filename, applied_at from schema_migrations order by applied_at",
    );
    if (!rows.length) console.log("No migrations recorded by this tool yet.");
    for (const r of rows) {
      console.log(`  ${r.applied_at.toISOString().slice(0, 19)}  ${r.filename}`);
    }
    await client.end();
    return;
  }

  if (!file || !existsSync(file)) {
    console.error("Usage: node scripts/apply-migration.mjs <file.sql> [--check]");
    process.exit(1);
  }

  const sql = readFileSync(file, "utf8");
  const name = basename(file);
  const sha = createHash("sha256").update(sql).digest("hex");

  const destructive = findDestructive(sql);
  if (destructive.length) {
    console.error(`REFUSED: ${name} contains data-losing statements.\n`);
    for (const d of destructive) {
      console.error(`  ${d.label}:  ...${d.context}...`);
    }
    console.error(
      "\nThis tool applies additive migrations only. Move this file to" +
        "\nsupabase/pending/, take a fresh backup with `npm run backup`, and have" +
        "\na person run it in the SQL editor deliberately.",
    );
    process.exit(2);
  }

  if (checkOnly) {
    console.log(`ok   ${name} is additive. ${sql.length} bytes, sha ${sha.slice(0, 12)}`);
    return;
  }

  await client.connect();
  await ensureLedger(client);

  const { rows: already } = await client.query(
    "select sha256, applied_at from schema_migrations where filename = $1",
    [name],
  );
  if (already.length) {
    if (already[0].sha256 === sha) {
      console.log(`already applied ${name} at ${already[0].applied_at.toISOString()}`);
      await client.end();
      return;
    }
    console.warn(
      `${name} was applied at ${already[0].applied_at.toISOString()} with different contents.`,
    );
    console.warn("Re-applying. These migrations are written to be safe to re-run.");
  }

  // One transaction: a migration that half applies is worse than one that does
  // not apply, because the next run starts from a state nobody described.
  try {
    await client.query("begin");
    await client.query(sql);
    await client.query(
      `insert into schema_migrations (filename, sha256) values ($1, $2)
       on conflict (filename) do update set sha256 = excluded.sha256, applied_at = now()`,
      [name, sha],
    );
    await client.query("commit");
    console.log(`applied ${name}`);
  } catch (err) {
    await client.query("rollback").catch(() => {});
    console.error(`FAILED, rolled back: ${err.message}`);
    if (err.position) {
      const pos = Number(err.position);
      console.error(`  near: ...${sql.slice(Math.max(0, pos - 80), pos + 80).replace(/\s+/g, " ")}...`);
    }
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
