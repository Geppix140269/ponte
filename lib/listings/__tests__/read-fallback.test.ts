// Reading a listing from a database that is one migration behind the code.
//
// Run: npx tsx lib/listings/__tests__/read-fallback.test.ts
//
// The schema these fixtures reproduce is the CURRENT PRODUCTION one. Two
// migrations are written and unapplied, so production has none of:
//
//   20260728c  quantity_mode, quantity_min, quantity_max, quantity_extracted,
//              quantity_confirmed_at, declaration_accepted_at,
//              declaration_version
//   20260728e  service_terms, distribution_terms
//
// Both public listing readers name columns from both. PostgREST refuses a
// select naming an absent column outright - nothing partial comes back - so the
// marketplace reader returned null and called notFound(), and the Qualified
// Opportunity reader threw into its own catch and answered "missing". A live,
// approved, correctly classified listing 404ed on both public surfaces.
//
// The first attempt at a fix dropped a fixed GROUP, service_terms and
// distribution_terms, and retried. Against this schema the retry still named
// quantity_mode, so it failed exactly as the first attempt did. That is the
// case the sequential test below pins.

import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

import {
  readWithMissingColumnFallback,
  ESSENTIAL_LISTING_READ_COLUMNS,
} from "../read-fallback";

/** PostgREST's refusal, as it actually arrives. */
const missing = (column: string) => ({
  code: "PGRST204",
  message: `Could not find the '${column}' column of 'listings' in the schema cache`,
});

/** Every column the two public readers ask for. */
const READER_COLUMNS = [
  "id", "user_id", "ref", "type", "product", "hs_code", "origin", "destination",
  "volume", "quantity", "quantity_mode", "quantity_min", "quantity_max", "unit",
  "frequency", "incoterm", "payment_terms", "submitter_role", "chain_depth",
  "mandate_sighted", "validity_type", "valid_until", "reconfirmed_at",
  "decided_at", "desk_version", "details", "created_at", "status",
  "market_family", "market_intent", "service_category_key",
  "service_subcategory_keys", "distribution_partner_type_key",
  "distribution_relationship_terms", "coverage_scope_key", "territory_codes",
  "product_sector_key", "custom_category_label",
  "service_terms", "distribution_terms",
];

/** Exactly what production has today: everything except the two migrations. */
const PRODUCTION_ABSENT = [
  "quantity_mode", "quantity_min", "quantity_max",
  "quantity_extracted", "quantity_confirmed_at",
  "declaration_accepted_at", "declaration_version",
  "service_terms", "distribution_terms",
];

/**
 * A database with exactly the columns it is told it has.
 *
 * It refuses on the FIRST absent column it finds, one at a time, which is what
 * PostgREST does: a select naming three absent columns is refused three times,
 * not once with a list.
 */
function fakeTable(absent: readonly string[]) {
  const selects: string[] = [];
  const attempt = async (columns: string) => {
    selects.push(columns);
    const asked = columns.split(",").map((c) => c.trim());
    const gone = asked.find((c) => absent.includes(c));
    if (gone) return { data: null, error: missing(gone) };
    return { data: { id: "l1", ref: "PT-0001", asked }, error: null };
  };
  return { attempt, selects };
}

// ---------------------------------------------------------------------------
// One absent column at a time
// ---------------------------------------------------------------------------

for (const column of ["quantity_mode", "quantity_min", "quantity_max", "service_terms", "distribution_terms"]) {
  test(`a listing still reads when ${column} is absent`, async () => {
    const table = fakeTable([column]);
    const result = await readWithMissingColumnFallback(table.attempt, READER_COLUMNS);

    assert.equal(result.error, null, `the read still failed with ${column} absent`);
    assert.ok(result.data, "no record came back");
    assert.deepEqual(result.dropped, [column]);

    // Only the unavailable column went. Everything else was still asked for.
    const asked = (result.data as { asked: string[] }).asked;
    assert.ok(!asked.includes(column));
    for (const kept of ["ref", "product", "market_family", "market_intent", "service_category_key"]) {
      assert.ok(asked.includes(kept), `${kept} was dropped along with ${column}`);
    }
  });
}

// ---------------------------------------------------------------------------
// The real production schema: several absent, discovered one at a time
// ---------------------------------------------------------------------------

test("a listing reads against the current production schema, dropping only what is unavailable", async () => {
  const table = fakeTable(PRODUCTION_ABSENT);
  const result = await readWithMissingColumnFallback(table.attempt, READER_COLUMNS);

  assert.equal(result.error, null, "the public readers would still 404 this listing");
  assert.ok(result.data, "no record came back");

  // Every unavailable column the select asked for, and nothing else.
  assert.deepEqual(
    result.dropped.slice().sort(),
    ["distribution_terms", "quantity_max", "quantity_min", "quantity_mode", "service_terms"],
  );

  // The classification survived, which is the whole point: this is the
  // difference between a published trade service and a 404.
  const asked = (result.data as { asked: string[] }).asked;
  for (const kept of [
    "id", "ref", "type", "product", "details", "user_id", "status",
    "market_family", "market_intent", "service_category_key",
    "service_subcategory_keys", "coverage_scope_key", "territory_codes",
    "quantity", "unit", "incoterm", "hs_code",
  ]) {
    assert.ok(asked.includes(kept), `${kept} was dropped and should not have been`);
  }
});

test("the fixed-group retry this replaces would still have failed", async () => {
  // The regression, stated directly. Dropping only the family terms leaves
  // quantity_mode in the select, and production does not have it.
  const table = fakeTable(PRODUCTION_ABSENT);
  const withoutFamilyTermsOnly = READER_COLUMNS.filter(
    (c) => c !== "service_terms" && c !== "distribution_terms",
  );
  const staged = await table.attempt(withoutFamilyTermsOnly.join(", "));
  assert.ok(staged.error, "the old fixed-group retry is not actually broken");
  assert.match(String((staged.error as { message: string }).message), /quantity_mode/);
});

test("columns are dropped one at a time, not in a guessed batch", async () => {
  const table = fakeTable(["quantity_mode", "quantity_min", "quantity_max"]);
  const result = await readWithMissingColumnFallback(table.attempt, READER_COLUMNS);
  assert.equal(result.error, null);
  // Four selects: the first, then one per dropped column.
  assert.equal(table.selects.length, 4, `expected 4 attempts, made ${table.selects.length}`);
  assert.equal(result.dropped.length, 3);
});

// ---------------------------------------------------------------------------
// What must NOT be dropped, and what must NOT be hidden
// ---------------------------------------------------------------------------

test("a missing essential column fails visibly rather than degrading the record", async () => {
  for (const essential of ESSENTIAL_LISTING_READ_COLUMNS) {
    const table = fakeTable([essential]);
    const result = await readWithMissingColumnFallback(table.attempt, READER_COLUMNS);
    assert.ok(result.error, `${essential} was dropped to make the read succeed`);
    assert.equal(result.data, null);
    assert.ok(!result.dropped.includes(essential), `${essential} was dropped`);
  }
});

test("a non-missing-column error is returned as itself, never retried away", async () => {
  // An RLS refusal or a network fault must not be answered by quietly asking
  // for less. That would hide a real error behind a lossy record.
  const selects: string[] = [];
  const denied = { code: "42501", message: "permission denied for table listings" };
  const result = await readWithMissingColumnFallback(async (columns) => {
    selects.push(columns);
    return { data: null, error: denied };
  }, READER_COLUMNS);

  assert.equal(result.error, denied);
  assert.equal(selects.length, 1, "an unrelated error was retried");
  assert.deepEqual(result.dropped, []);
});

test("a missing-column error the database will not name is reported, not guessed at", async () => {
  const selects: string[] = [];
  const unnamed = { code: "PGRST204", message: "schema cache mismatch" };
  const result = await readWithMissingColumnFallback(async (columns) => {
    selects.push(columns);
    return { data: null, error: unnamed };
  }, READER_COLUMNS);

  assert.equal(result.error, unnamed);
  assert.equal(selects.length, 1, "a column was dropped at random");
});

test("a column the select never asked for ends the retry rather than looping", async () => {
  let calls = 0;
  const result = await readWithMissingColumnFallback(async () => {
    calls += 1;
    return { data: null, error: missing("some_other_table_column") };
  }, ["id", "ref", "product", "hs_code"]);

  assert.ok(result.error);
  assert.equal(calls, 1);
});

test("every dropped column is reported, because each is a migration still owed", async () => {
  const table = fakeTable(["quantity_mode", "service_terms"]);
  const dropped: string[] = [];
  await readWithMissingColumnFallback(table.attempt, READER_COLUMNS, {
    onDrop: (c) => dropped.push(c),
  });
  assert.deepEqual(dropped.slice().sort(), ["quantity_mode", "service_terms"]);

  const clean = fakeTable([]);
  const quiet: string[] = [];
  await readWithMissingColumnFallback(clean.attempt, READER_COLUMNS, {
    onDrop: (c) => quiet.push(c),
  });
  assert.deepEqual(quiet, [], "a fully applied schema reported a drop");
});

test("a fully migrated database is read once, with every column", async () => {
  const table = fakeTable([]);
  const result = await readWithMissingColumnFallback(table.attempt, READER_COLUMNS);
  assert.equal(table.selects.length, 1, "an unnecessary retry ran");
  assert.deepEqual(result.dropped, []);
  const asked = (result.data as { asked: string[] }).asked;
  assert.equal(asked.length, READER_COLUMNS.length);
});

// ---------------------------------------------------------------------------
// The two public readers, by their REAL column lists
// ---------------------------------------------------------------------------
//
// The lists are parsed out of the source rather than restated here. A copy
// would pass forever while the reader it claims to cover drifted away from it,
// and drift is exactly what caused this defect: a fixed group written once and
// never revisited when `20260728c` added seven more columns.

/** The `const NAME: readonly string[] = [...]` array in a source file. */
function columnListFrom(file: string, name: string): string[] {
  const source = readFileSync(file, "utf8");
  const start = source.indexOf(`const ${name}: readonly string[] = [`);
  assert.ok(start >= 0, `${name} not found in ${file}`);
  const open = source.indexOf("[", start);
  const close = source.indexOf("];", open);
  return Array.from(source.slice(open, close).matchAll(/"([a-z0-9_]+)"/g)).map((m) => m[1]);
}

const READERS: [string, string, string][] = [
  ["Qualified Opportunity", "lib/board/qualified-opportunity.ts", "QO_COLUMNS"],
  ["shareable marketplace detail", "app/[locale]/marketplace/l/[ref]/page.tsx", "DEAL_COLUMNS"],
  ["the member's own records", "app/[locale]/opportunities/page.tsx", "OWN_COLUMNS"],
];

for (const [label, file, name] of READERS) {
  test(`${label} returns the listing against the current production schema`, async () => {
    const columns = columnListFrom(file, name);
    assert.ok(columns.length > 10, `${name} parsed as only ${columns.length} columns`);

    const table = fakeTable(PRODUCTION_ABSENT);
    const result = await readWithMissingColumnFallback(table.attempt, columns);

    assert.equal(result.error, null, `${label} still fails against production`);
    assert.ok(result.data, `${label} returned no record`);

    // Only columns this reader actually asked for, and that production lacks.
    for (const c of result.dropped) {
      assert.ok(PRODUCTION_ABSENT.includes(c), `${label} dropped ${c}, which production has`);
      assert.ok(columns.includes(c), `${label} dropped ${c}, which it never asked for`);
    }

    // Everything production does have survived, including the classification
    // that decides whether the record reads as a trade service or a shipment.
    const asked = (result.data as { asked: string[] }).asked;
    for (const kept of columns.filter((c) => !PRODUCTION_ABSENT.includes(c))) {
      assert.ok(asked.includes(kept), `${label} lost ${kept}`);
    }
  });

  test(`${label} names quantity_mode, quantity_min and quantity_max, so the regression is real`, () => {
    // If a reader stops asking for these the test above becomes vacuous. This
    // keeps it honest.
    const columns = columnListFrom(file, name);
    for (const c of ["quantity_mode", "quantity_min", "quantity_max"]) {
      assert.ok(columns.includes(c), `${label} no longer asks for ${c}`);
    }
  });
}

// ---------------------------------------------------------------------------
// The canonical pair is never dropped
// ---------------------------------------------------------------------------
//
// These two are protected for a different reason from the rest. Dropping `ref`
// or `details` loses a fact, and the page renders visibly incomplete. Dropping
// the canonical pair CHANGES a fact, and the page renders confidently wrong:
//
//   market_family absent -> familyOfRow falls through to the legacy reading,
//   and listings.type stores a distribution record as "offer"/"requirement", so
//   the record is presented as a product with a quantity, a route and an
//   Incoterm it does not have.
//
//   market_intent absent -> presentRecord cannot tell whose channels and
//   capabilities these are, so a member offering representation has their own
//   capabilities labelled as demands on a counterparty, and vice versa.
//
// A misrepresented record is worse than a missing one, so these fail loudly.

for (const column of ["market_family", "market_intent"]) {
  test(`a missing ${column} returns the original error and is never retried`, async () => {
    const original = missing(column);
    const selects: string[] = [];
    const result = await readWithMissingColumnFallback(async (columns) => {
      selects.push(columns);
      return { data: null, error: original };
    }, READER_COLUMNS);

    // The caller gets the database's own error, not a repaired record.
    assert.equal(result.error, original, `${column} did not surface the original error`);
    assert.equal(result.data, null);

    // And it was attempted exactly once: no retry with the column removed.
    assert.equal(selects.length, 1, `${column} was retried ${selects.length} times`);
    assert.ok(selects[0].includes(column), `the one attempt did not ask for ${column}`);
    assert.deepEqual(result.dropped, [], `${column} was recorded as dropped`);
  });

  test(`${column} is protected on every reader, not just in the default list`, async () => {
    // The readers pass no `essential` override, so they inherit the default.
    // This asserts the protection reaches them rather than only the constant.
    assert.ok(
      ESSENTIAL_LISTING_READ_COLUMNS.includes(column),
      `${column} is not in ESSENTIAL_LISTING_READ_COLUMNS`,
    );
    for (const [label, file, name] of READERS) {
      const columns = columnListFrom(file, name);
      assert.ok(columns.includes(column), `${label} does not select ${column}`);

      const table = fakeTable([column]);
      const result = await readWithMissingColumnFallback(table.attempt, columns);
      assert.ok(result.error, `${label} degraded rather than failing on a missing ${column}`);
      assert.equal(result.data, null);
    }
  });
}

test("a record is never presented after the canonical pair has been dropped", async () => {
  // The end state the two rules above exist to prevent: a successful read whose
  // family or intent is absent, which presentRecord would then guess at.
  for (const column of ["market_family", "market_intent"]) {
    const table = fakeTable([column]);
    const result = await readWithMissingColumnFallback(table.attempt, READER_COLUMNS);
    assert.equal(result.data, null, `a record came back without ${column}`);
  }
});
