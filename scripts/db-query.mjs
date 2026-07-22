// Run SQL against the project database through the Supabase Management API.
//
//   node scripts/db-query.mjs --file supabase/migrations/20260722b_hs_codes.sql
//   node scripts/db-query.mjs --sql "select count(*) from hs_codes"
//
// Exists because the direct Postgres host is IPv6 only and this machine has no
// IPv6 route, so pg cannot reach it. The Management API is HTTPS and can.
//
// Env: SUPABASE_ACCESS_TOKEN and SUPABASE_PROJECT_REF, from .env.local.
//
// The destructive-statement refusal from apply-migration.mjs applies here too:
// data-losing SQL belongs in supabase/pending/, run by a person after a backup.

import { readFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { basename } from "node:path";

function loadEnvLocal() {
  if (!existsSync(".env.local")) return;
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (!m) continue;
    const value = m[2].trim().replace(/^["']|["']$/g, "");
    if (value && !process.env[m[1]]) process.env[m[1]] = value;
  }
}

const DESTRUCTIVE = [
  [/\bdrop\s+(table|column|schema|database|type|view|materialized\s+view|sequence)\b/i, "drop"],
  [/\btruncate\b/i, "truncate"],
  [/\bdelete\s+from\b/i, "delete"],
  [/\balter\s+table\s+\S+\s+drop\b/i, "alter table drop"],
];
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

function destructiveHits(sql) {
  const cleaned = stripSqlNoise(sql);
  const hits = [];
  for (const [re, label] of DESTRUCTIVE) {
    const idx = cleaned.search(re);
    if (idx < 0) continue;
    const context = cleaned.slice(Math.max(0, idx - 40), idx + 80).replace(/\s+/g, " ");
    if (ALLOWED.some((ok) => ok.test(context))) continue;
    hits.push({ label, context: context.trim() });
  }
  return hits;
}

async function query(sql) {
  const token = process.env.SUPABASE_ACCESS_TOKEN;
  const ref = process.env.SUPABASE_PROJECT_REF;
  if (!token || !ref) {
    console.error("SUPABASE_ACCESS_TOKEN and SUPABASE_PROJECT_REF must be in .env.local");
    process.exit(1);
  }

  const res = await fetch(
    `https://api.supabase.com/v1/projects/${ref}/database/query`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ query: sql }),
    },
  );

  const text = await res.text();
  if (!res.ok) {
    console.error(`HTTP ${res.status}: ${text.slice(0, 600)}`);
    process.exit(1);
  }
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function main() {
  loadEnvLocal();
  const args = process.argv.slice(2);
  const fileIdx = args.indexOf("--file");
  const sqlIdx = args.indexOf("--sql");

  let sql;
  let label;
  if (fileIdx >= 0) {
    const path = args[fileIdx + 1];
    if (!existsSync(path)) {
      console.error(`No such file: ${path}`);
      process.exit(1);
    }
    sql = readFileSync(path, "utf8");
    label = basename(path);
  } else if (sqlIdx >= 0) {
    sql = args[sqlIdx + 1];
    label = "inline";
  } else {
    console.error('Usage: --file <path.sql> | --sql "select 1"');
    process.exit(1);
  }

  const hits = destructiveHits(sql);
  if (hits.length) {
    console.error(`REFUSED: ${label} contains data-losing statements.\n`);
    for (const h of hits) console.error(`  ${h.label}:  ...${h.context}...`);
    console.error("\nMove it to supabase/pending/ and run it deliberately after a backup.");
    process.exit(2);
  }

  const out = await query(sql);

  if (fileIdx >= 0) {
    // Record it, so this project finally has a ledger of what has been run.
    const sha = createHash("sha256").update(sql).digest("hex");
    await query(`
      create table if not exists schema_migrations (
        filename text primary key,
        sha256 text not null,
        applied_at timestamptz not null default now()
      )
    `);
    await query(`
      insert into schema_migrations (filename, sha256)
      values ('${label.replace(/'/g, "''")}', '${sha}')
      on conflict (filename) do update
        set sha256 = excluded.sha256, applied_at = now()
    `);
    console.log(`applied ${label}`);
  }

  if (Array.isArray(out) && out.length) console.table(out);
  else if (Array.isArray(out)) console.log("(no rows)");
  else console.log(out);
}

main();
