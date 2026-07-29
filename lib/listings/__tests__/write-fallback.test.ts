// Writing a listing to a database that is one migration behind the code.
//
// Run: npx tsx lib/listings/__tests__/write-fallback.test.ts
//
// The defect this file exists for was total, not partial. On 29 July 2026 every
// Start a Deal submission and every saved draft failed: `20260728c` is written
// and unapplied, so production has no `quantity_mode`, `quantity_min`,
// `quantity_max`, `quantity_extracted`, `quantity_confirmed_at`,
// `declaration_accepted_at` or `declaration_version`, and the submit route sends
// all of them on every write, for every family. The retry dropped two fixed
// GROUPS of columns, neither of which contained any of those, so it re-sent a
// row the database had already refused and answered 500. The member was shown
// "Ponte kept your words" and had no way to file anything at all.

import assert from "node:assert/strict";
import test from "node:test";

import {
  writeWithMissingColumnFallback,
  ESSENTIAL_LISTING_COLUMNS,
} from "../write-fallback";

/** PostgREST's refusal, as it actually arrives. */
const missing = (column: string) => ({
  code: "PGRST204",
  message: `Could not find the '${column}' column of 'listings' in the schema cache`,
});

/**
 * A database that has exactly the columns it is told it has, and records every
 * row it was offered.
 */
function fakeTable(present: readonly string[]) {
  const seen: Record<string, unknown>[] = [];
  const columns = new Set(present);
  const attempt = async (row: Record<string, unknown>) => {
    seen.push(row);
    const absent = Object.keys(row).find((k) => !columns.has(k));
    if (absent) return { data: null, error: missing(absent) };
    return { data: { id: "1", ref: "PT-0001" }, error: null };
  };
  return { attempt, seen };
}

test("the unapplied publication migration no longer costs the whole submission", async () => {
  const live = [
    "user_id", "type", "product", "details", "status",
    "market_family", "market_intent", "service_category_key",
  ];
  const table = fakeTable(live);

  const result = await writeWithMissingColumnFallback(table.attempt, {
    user_id: "u", type: "service", product: "Road freight", details: "…", status: "submitted",
    market_family: "services", market_intent: "offer_trade_service",
    service_category_key: "freight",
    // Every column 20260728c adds and production does not have.
    quantity_mode: null, quantity_min: null, quantity_max: null,
    quantity_extracted: false, quantity_confirmed_at: null,
    declaration_accepted_at: "2026-07-29T00:00:00.000Z", declaration_version: "2026-07-28.1",
  });

  assert.equal(result.error, null, "the listing still could not be stored");
  assert.deepEqual(result.data, { id: "1", ref: "PT-0001" });

  // And what DID store is the classified record, not a stripped one: the
  // staged retry used to drop the market family and the service category to
  // work around an unrelated absent column.
  const stored = table.seen[table.seen.length - 1];
  assert.equal(stored.market_family, "services");
  assert.equal(stored.service_category_key, "freight");
  assert.equal(stored.product, "Road freight");
  assert.ok(!("quantity_mode" in stored));
});

test("every dropped column is named, because it is a migration still owed", async () => {
  const table = fakeTable(["user_id", "type", "product", "details", "status"]);
  const dropped: string[] = [];
  await writeWithMissingColumnFallback(
    table.attempt,
    { user_id: "u", type: "offer", product: "Sugar", details: "…", status: "submitted", quantity_mode: "exact" },
    { onDrop: (c) => dropped.push(c) },
  );
  assert.deepEqual(dropped, ["quantity_mode"]);
});

test("a column the listing cannot lose is never dropped to make a write succeed", async () => {
  // A row stored without its owner or its text is not a repaired submission,
  // it is a corrupt one. If the database says one of these is missing, that is
  // a real fault and the write fails with it.
  for (const essential of ESSENTIAL_LISTING_COLUMNS) {
    const attempt = async () => ({ data: null, error: missing(essential) });
    const result = await writeWithMissingColumnFallback(attempt, {
      user_id: "u", type: "offer", product: "Sugar", details: "…", status: "submitted",
    });
    assert.ok(result.error, `${essential} was dropped rather than reported`);
  }
});

test("an ordinary failure is returned as itself, never retried into a smaller row", async () => {
  // Silently storing less than the member wrote because of a duplicate key or
  // an RLS refusal would hide a real error behind a lossy write.
  const seen: Record<string, unknown>[] = [];
  const attempt = async (row: Record<string, unknown>) => {
    seen.push(row);
    return { data: null, error: { code: "23505", message: "duplicate key" } };
  };
  const result = await writeWithMissingColumnFallback(attempt, { user_id: "u", extra: 1 });
  assert.equal((result.error as { code: string }).code, "23505");
  assert.equal(seen.length, 1, "an unrelated error was retried");
});

test("a missing column the database will not name falls through the staged groups", async () => {
  // The one case a fixed list was ever the right answer to.
  const rows: Record<string, unknown>[] = [];
  const attempt = async (row: Record<string, unknown>) => {
    rows.push(row);
    if ("service_terms" in row) return { data: null, error: { code: "PGRST204" } };
    return { data: { ok: true }, error: null };
  };
  const result = await writeWithMissingColumnFallback(
    attempt,
    { user_id: "u", type: "service", service_terms: { scope: "x" }, market_family: "services" },
    { fallbackGroups: [["service_terms", "distribution_terms"]] },
  );
  assert.equal(result.error, null);
  // The family it belongs to survived: the group that ran was the narrow one.
  assert.equal(rows[rows.length - 1].market_family, "services");
});

test("the retry terminates on a database that refuses every column", async () => {
  let calls = 0;
  const attempt = async (row: Record<string, unknown>) => {
    calls += 1;
    const first = Object.keys(row)[0];
    return first
      ? { data: null, error: missing(first) }
      : { data: null, error: missing("nothing") };
  };
  const row: Record<string, unknown> = {};
  for (let i = 0; i < 20; i += 1) row[`c${i}`] = i;
  const result = await writeWithMissingColumnFallback(attempt, row);
  assert.ok(result.error, "an impossible write reported success");
  assert.ok(calls <= 25, `the retry ran ${calls} times`);
});
