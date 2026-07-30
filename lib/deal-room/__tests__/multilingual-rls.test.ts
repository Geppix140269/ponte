// The RLS and structural contract of the multilingual migration.
//
// Run: npx tsx lib/deal-room/__tests__/multilingual-rls.test.ts
//
// ## Why this file exists
//
// There is no non-production database (PL-002), so the migration's security
// properties are proved by reading its text, exactly as rls-contract.test.ts and
// grant-signatures.test.ts prove the base slice. This asserts: RLS on every new
// table, SELECT-only member policies scoped through the existing sub-room
// predicate, no member write policy anywhere, the append-only guards, the
// translation honesty check, the cache identity and the source-evidence check.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const sql = readFileSync(
  join(__dirname, "../../../supabase/migrations/20260730b_deal_room_multilingual.sql"),
  "utf8",
);

let passed = 0;
function test(name: string, fn: () => void): void {
  try {
    fn();
    passed++;
  } catch (err) {
    console.error(`FAIL  ${name}`);
    console.error(`      ${(err as Error).message}`);
    process.exitCode = 1;
  }
}

const NEW_TABLES = [
  "deal_room_messages",
  "deal_room_message_corrections",
  "deal_room_message_translations",
  "deal_room_interpretation_proposals",
  "deal_room_terms",
  "deal_room_term_decisions",
];

const SUB_ROOM_SCOPED = [
  "deal_room_messages",
  "deal_room_message_corrections",
  "deal_room_message_translations",
  "deal_room_interpretation_proposals",
  "deal_room_term_decisions",
];

test("the migration declares itself NOT APPLIED", () => {
  assert.match(sql, /NOT APPLIED/);
});

test("RLS is enabled on every new table", () => {
  for (const table of NEW_TABLES) {
    const re = new RegExp(`alter table public\\.${table} enable row level security`);
    assert.match(sql, re, `RLS must be enabled on ${table}`);
  }
});

test("every new table has exactly one SELECT policy, scoped to authenticated", () => {
  for (const table of NEW_TABLES) {
    const selects = Array.from(
      sql.matchAll(new RegExp(`create policy\\s+"[^"]+"\\s+on\\s+public\\.${table}\\s+for select to authenticated`, "g")),
    );
    assert.equal(selects.length, 1, `${table} must have one SELECT/authenticated policy`);
  }
});

test("no new table has any member INSERT, UPDATE or DELETE policy", () => {
  const policyBlocks = Array.from(sql.matchAll(/create policy[\s\S]*?;/g)).map((m) => m[0]);
  for (const block of policyBlocks) {
    assert.doesNotMatch(block, /for\s+(insert|update|delete)/i, `a write policy appeared: ${block.slice(0, 80)}`);
  }
});

test("no policy names anon", () => {
  const policyBlocks = Array.from(sql.matchAll(/create policy[\s\S]*?;/g)).map((m) => m[0]);
  for (const block of policyBlocks) {
    assert.doesNotMatch(block, /\bto\s+anon\b/, "a policy must not name anon");
  }
});

test("sub-room-scoped tables read through the existing sub-room participant predicate", () => {
  for (const table of SUB_ROOM_SCOPED) {
    const policy = new RegExp(
      `create policy\\s+"[^"]+"\\s+on\\s+public\\.${table}\\s+for select to authenticated\\s+using \\([^;]*deal_room_is_sub_room_participant\\(sub_room_id\\)`,
    );
    assert.match(sql, policy, `${table} must scope reads by sub-room membership`);
  }
});

test("canonical terms read as room-level deal state, not a fabricated new predicate", () => {
  assert.match(
    sql,
    /create policy\s+"term read"\s+on\s+public\.deal_room_terms\s+for select to authenticated\s+using \([\s\S]*deal_room_is_master_participant\(room_id\)/,
  );
});

test("messages, corrections and decisions are append-only", () => {
  for (const table of ["deal_room_messages", "deal_room_message_corrections", "deal_room_term_decisions"]) {
    const trg = new RegExp(
      `create trigger ${table}_append_only\\s+before update or delete on public\\.${table}\\s+for each row execute function public\\.deal_room_row_append_only\\(\\)`,
    );
    assert.match(sql, trg, `${table} must be append-only`);
  }
});

test("the immutable original stores source language, hash and non-empty text", () => {
  assert.match(sql, /original_text\s+text not null check \(length\(btrim\(original_text\)\) > 0\)/);
  assert.match(sql, /content_sha256\s+text not null check \(content_sha256 ~ '\^\[0-9a-f\]\{64\}\$'\)/);
  assert.match(sql, /source_language\s+text not null check \(source_language in \('en','es','ru','zh-CN','ar'\)\)/);
});

test("a translation carries text if and only if its status is a with-text status", () => {
  assert.match(
    sql,
    /check \(\(status in \('completed','low_confidence','ambiguous'\)\) = \(translated_text is not null\)\)/,
  );
});

test("translation cache identity is one row per message per target language", () => {
  assert.match(sql, /constraint deal_room_translation_identity unique \(message_id, target_language\)/);
});

test("an interpretation proposal must cite a non-empty array of source references", () => {
  assert.match(
    sql,
    /check \(jsonb_typeof\(source_message_refs\) = 'array'\s*and jsonb_array_length\(source_message_refs\) >= 1\)/,
  );
});

test("the participant language column is constrained to the supported set and defaults to en", () => {
  assert.match(sql, /add column if not exists preferred_language text not null default 'en'/);
  assert.match(sql, /check \(preferred_language in \('en','es','ru','zh-CN','ar'\)\)/);
});

test("canonical terms are English and keep one current value per field with history", () => {
  assert.match(sql, /language\s+text not null default 'en' check \(language = 'en'\)/);
  assert.match(sql, /create unique index if not exists deal_room_terms_current_field\s+on public\.deal_room_terms \(room_id, field\) where current/);
});

console.log(`ok   deal-room multilingual RLS contract: ${passed} assertions passed`);
