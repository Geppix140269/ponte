// The classification a record may be stored with.
//
// Run: npx tsx lib/listings/__tests__/classification.test.ts
//
// Requirements 9 and 10 are the reason this file exists: a Trade Service
// category must not be storable under Distribution, and a Distribution type
// must not be storable under Trade Services. Both journeys share one draft
// object and one submit route, so this is easy to get wrong by accident, and a
// mis-filed key is worse than a missing one because every filter, count and
// match downstream trusts it.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  readClassification,
  isMissingColumnError,
  missingColumnFrom,
} from "../classification";
import {
  emptyDraft,
  toSubmitPayload,
  crossFamilyClassification,
  clearForeignClassification,
  subjectFor,
  type StructureDraft,
} from "../../structure/draft";

const NOW = "2026-07-28T09:00:00.000Z";

function draft(over: Partial<StructureDraft>): StructureDraft {
  return { ...emptyDraft(), ...over };
}

function services(over: Partial<StructureDraft> = {}): StructureDraft {
  return draft({
    canonical: { family: "services", intent: "seek_trade_service" },
    serviceCategory: "freight",
    serviceSubcategories: ["freight.ocean"],
    ...over,
  });
}

function distribution(over: Partial<StructureDraft> = {}): StructureDraft {
  return draft({
    canonical: { family: "distribution", intent: "seek_distribution_partner" },
    distributionPartnerType: "distributor",
    ...over,
  });
}

// ---------------------------------------------------------------------------
// 9 and 10. A category cannot cross a family boundary
// ---------------------------------------------------------------------------

test("a trade service category cannot be stored on a distribution record", () => {
  const result = readClassification({
    market_family: "distribution",
    market_intent: "seek_distribution_partner",
    service_category_key: "freight",
  });
  assert.equal(result.ok, false);
  assert.equal(result.ok === false && result.field, "service_category_key");
});

test("a distribution partner type cannot be stored on a services record", () => {
  const result = readClassification({
    market_family: "services",
    market_intent: "seek_trade_service",
    distribution_partner_type_key: "distributor",
  });
  assert.equal(result.ok, false);
  assert.equal(result.ok === false && result.field, "distribution_partner_type_key");
});

test("neither can be stored on a products record", () => {
  for (const key of ["service_category_key", "distribution_partner_type_key"]) {
    const result = readClassification({
      market_family: "products",
      market_intent: "source_product",
      [key]: key === "service_category_key" ? "freight" : "distributor",
    });
    assert.equal(result.ok, false, `${key} was accepted on a products record`);
  }
});

test("a relationship term or coverage scope is refused outside distribution too", () => {
  const relationship = readClassification({
    market_family: "services",
    distribution_relationship_terms: ["exclusive"],
  });
  assert.equal(relationship.ok, false);
  const coverage = readClassification({
    market_family: "services",
    coverage_scope_key: "worldwide",
  });
  assert.equal(coverage.ok, false);
});

test("the draft refuses to send a foreign classification at all", () => {
  // The same rule, one layer earlier. A back-navigation between families would
  // otherwise leave the previous family's answer attached to the new record.
  const contaminated = distribution({ serviceCategory: "freight", serviceSubcategories: ["freight.ocean"] });
  assert.deepEqual(crossFamilyClassification(contaminated), [
    "serviceCategory",
    "serviceSubcategories",
  ]);

  const cleaned = clearForeignClassification(contaminated);
  assert.equal(cleaned.serviceCategory, null);
  assert.deepEqual(cleaned.serviceSubcategories, []);
  assert.equal(cleaned.distributionPartnerType, "distributor");

  const payload = toSubmitPayload(contaminated, { draft: false, nowIso: NOW });
  assert.equal(payload.service_category_key, null);
  assert.equal(payload.distribution_partner_type_key, "distributor");
});

test("a services record cannot carry an HS code", () => {
  // A trade service has no HS classification, and pushing one onto it puts a
  // false classification on a real record.
  const withCode = services({ hsCode: "100590" });
  assert.ok(crossFamilyClassification(withCode).indexOf("hsCode") >= 0);
  assert.equal(clearForeignClassification(withCode).hsCode, null);
});

// ---------------------------------------------------------------------------
// Every key names something real
// ---------------------------------------------------------------------------

test("an invented key is refused, not stored", () => {
  const bad = readClassification({ market_family: "services", service_category_key: "banana" });
  assert.equal(bad.ok, false);
});

test("a subcategory from another category is refused", () => {
  const bad = readClassification({
    market_family: "services",
    service_category_key: "customs",
    service_subcategory_keys: ["freight.ocean"],
  });
  assert.equal(bad.ok, false);
  assert.equal(bad.ok === false && bad.field, "service_subcategory_keys");
});

test("a subcategory with no category at all is refused", () => {
  const bad = readClassification({
    market_family: "services",
    service_subcategory_keys: ["freight.ocean"],
  });
  assert.equal(bad.ok, false);
});

test("an intent that does not belong to its family is refused", () => {
  const bad = readClassification({
    market_family: "services",
    market_intent: "source_product",
  });
  assert.equal(bad.ok, false);
  assert.equal(bad.ok === false && bad.field, "market_intent");
});

test("a valid services classification is accepted whole", () => {
  const good = readClassification({
    market_family: "services",
    market_intent: "offer_trade_service",
    service_category_key: "freight",
    service_subcategory_keys: ["freight.ocean", "freight.forwarding"],
  });
  assert.equal(good.ok, true);
  if (!good.ok) return;
  assert.equal(good.columns.service_category_key, "freight");
  assert.deepEqual(good.columns.service_subcategory_keys, ["freight.ocean", "freight.forwarding"]);
  assert.equal(good.columns.distribution_partner_type_key, null);
});

// ---------------------------------------------------------------------------
// Custom wording never replaces a key
// ---------------------------------------------------------------------------

test("choosing Other keeps the canonical key and stores the wording apart", () => {
  const result = readClassification({
    market_family: "services",
    service_category_key: "unlisted",
    custom_category_label: "Livestock transport coordination",
  });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.columns.service_category_key, "unlisted");
  assert.equal(result.columns.custom_category_label, "Livestock transport coordination");
});

test("the record still names itself from the tiles, with nothing typed", () => {
  assert.equal(subjectFor(services()), "Ocean freight");
  assert.equal(
    subjectFor(distribution({ productSector: "food" })),
    "Distributor, Food, beverages & tobacco",
  );
});

// ---------------------------------------------------------------------------
// Territories
// ---------------------------------------------------------------------------

test("territory codes are kept only where the scope can hold them", () => {
  const named = readClassification({
    market_family: "distribution",
    distribution_partner_type_key: "distributor",
    coverage_scope_key: "countries",
    territory_codes: ["IT", "ES", "not-a-code"],
  });
  assert.equal(named.ok, true);
  assert.deepEqual(named.ok && named.columns.territory_codes, ["IT", "ES"]);

  // Worldwide has no territories to name. They are dropped rather than
  // refused: the member changed their mind, they did not submit something bad.
  const worldwide = readClassification({
    market_family: "distribution",
    distribution_partner_type_key: "distributor",
    coverage_scope_key: "worldwide",
    territory_codes: ["IT"],
  });
  assert.equal(worldwide.ok, true);
  assert.equal(worldwide.ok && worldwide.columns.territory_codes, null);
});

test("a duplicated territory is stored once", () => {
  const result = readClassification({
    market_family: "distribution",
    coverage_scope_key: "countries",
    territory_codes: ["IT", "IT", "ES"],
  });
  assert.deepEqual(result.ok && result.columns.territory_codes, ["IT", "ES"]);
});

// ---------------------------------------------------------------------------
// 15. Existing records stay readable
// ---------------------------------------------------------------------------

test("a payload carrying no classification at all is still valid", () => {
  // Every existing record, and every record submitted through a path that has
  // not been migrated, has none of these fields. That must remain storable.
  const result = readClassification({ type: "offer", product: "Maize" });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  for (const value of Object.values(result.columns)) assert.equal(value, null);
});

test("a legacy product draft still submits exactly as it did", () => {
  const legacy = draft({ intent: "offer", product: "Maize (corn)", hsCode: "100590" });
  const payload = toSubmitPayload(legacy, { draft: false, nowIso: NOW });
  assert.equal(payload.type, "offer");
  assert.equal(payload.product, "Maize (corn)");
  assert.equal(payload.hs_code, "100590");
  assert.equal(payload.market_family, null);
});

// ---------------------------------------------------------------------------
// The window before the migration is applied
// ---------------------------------------------------------------------------

test("a missing column is recognised however the driver reports it", () => {
  // A merge applies no migration in this repository, so between this code
  // shipping and the SQL being run by hand the columns are absent. A member
  // must not lose a correctly classified submission to that gap.
  assert.equal(isMissingColumnError({ code: "PGRST204" }), true);
  assert.equal(isMissingColumnError({ code: "42703" }), true);
  assert.equal(
    isMissingColumnError({
      message: "Could not find the 'service_category_key' column of 'listings' in the schema cache",
    }),
    true,
  );
  // And an ordinary failure is not mistaken for one, which would hide a real
  // error behind a silent retry.
  assert.equal(isMissingColumnError({ code: "23505", message: "duplicate key" }), false);
  assert.equal(isMissingColumnError(null), false);
  assert.equal(isMissingColumnError("boom"), false);
});

test("the missing column is read out of the error, not guessed from a list", () => {
  // The retry used to drop two NAMED GROUPS of columns, which only works for a
  // column somebody remembered to put in a group. `20260728c` is written and
  // unapplied, so production has no `quantity_mode`, `quantity_extracted`,
  // `declaration_accepted_at` and four more. This route sends all of them on
  // every write, for every family. Neither group contained any of them, so both
  // retries re-sent a row the database had already refused and every Start a
  // Deal submission and every saved draft failed with "Could not save your
  // listing".
  assert.equal(
    missingColumnFrom({
      code: "PGRST204",
      message: "Could not find the 'quantity_mode' column of 'listings' in the schema cache",
    }),
    "quantity_mode",
  );
  assert.equal(
    missingColumnFrom({
      code: "42703",
      message: 'column "declaration_accepted_at" of relation "listings" does not exist',
    }),
    "declaration_accepted_at",
  );
  // A missing-column error that names nothing droppable leaves the older staged
  // fallback to run, which is the only reason that list is still worth having.
  assert.equal(missingColumnFrom({ code: "PGRST204" }), null);
  // And an ordinary failure never yields a column to drop: silently removing a
  // value because of an unrelated error would store a record the member did not
  // write.
  assert.equal(missingColumnFrom({ code: "23505", message: "duplicate key" }), null);
});

test("no submit payload key is dropped for a column the listing cannot lose", () => {
  // The retry refuses to drop user_id, type, product, details or status. A row
  // stored without one of those is not a repaired submission, it is a corrupt
  // one, and `product` and `details` are exactly what the route requires.
  const payload = toSubmitPayload(services(), { draft: false, nowIso: NOW });
  for (const essential of ["type", "product", "details"]) {
    assert.ok(payload[essential], `the payload no longer carries ${essential}`);
  }
});

// ---------------------------------------------------------------------------
// The database says the same thing, to every writer
// ---------------------------------------------------------------------------

const MIGRATION = readFileSync("supabase/archive/20260728a_market_classification.sql", "utf8");

/** The body of one named CHECK constraint, whitespace collapsed. */
function constraintBody(name: string): string {
  const at = MIGRATION.indexOf(`add constraint ${name} check (`);
  assert.ok(at >= 0, `constraint ${name} is not in the migration`);
  const open = MIGRATION.indexOf("(", at + `add constraint ${name} check`.length);
  let depth = 0;
  for (let i = open; i < MIGRATION.length; i++) {
    if (MIGRATION[i] === "(") depth++;
    else if (MIGRATION[i] === ")") {
      depth--;
      if (depth === 0) return MIGRATION.slice(open + 1, i).replace(/\s+/g, " ").trim();
    }
  }
  throw new Error(`constraint ${name} is unterminated`);
}

/**
 * A three-valued evaluator for the constraint expressions in this migration.
 *
 * Reading the SQL is what missed the bug twice. The first draft opened
 * `market_family is null or ...`, which exempted the row outright. The second
 * removed that and let the same row through anyway, because SQL is three-valued
 * and a CHECK accepts TRUE **and NULL**: with a service category set and no
 * family, `(false) or market_family = 'services'` is `false or null`, which is
 * NULL, which passes. The text read as a correct implication and behaved as an
 * exemption.
 *
 * So these tests evaluate the expressions rather than pattern-match them, under
 * the same logic Postgres uses. The grammar covers what the migration writes:
 * identifiers, `is null`, `is not null`, `= 'literal'`, `and`, `or`, and
 * parentheses. Anything outside it throws rather than guessing.
 */
type Sql = true | false | null;

function sqlAnd(a: Sql, b: Sql): Sql {
  if (a === false || b === false) return false;
  if (a === null || b === null) return null;
  return true;
}

function sqlOr(a: Sql, b: Sql): Sql {
  if (a === true || b === true) return true;
  if (a === null || b === null) return null;
  return false;
}

/** Evaluate one constraint body against a row. Absent column means NULL. */
function evaluate(expression: string, row: Record<string, string | null>): Sql {
  const tokens = expression.match(/\(|\)|'[^']*'|[A-Za-z_][A-Za-z_0-9]*/g) ?? [];
  let at = 0;
  const peek = (): string | undefined => tokens[at];
  const take = (): string => {
    const token = tokens[at];
    if (token === undefined) throw new Error(`unexpected end of ${expression}`);
    at++;
    return token;
  };

  function primary(): Sql {
    if (peek() === "(") {
      take();
      const value = orExpr();
      if (take() !== ")") throw new Error(`unbalanced parentheses in ${expression}`);
      return value;
    }
    const column = take();
    const value = Object.prototype.hasOwnProperty.call(row, column) ? row[column] : null;
    const next = take();
    if (next.toLowerCase() === "is") {
      if (peek()?.toLowerCase() === "not") {
        take();
        if (take().toLowerCase() !== "null") throw new Error(`expected NULL in ${expression}`);
        return value !== null;
      }
      if (take().toLowerCase() !== "null") throw new Error(`expected NULL in ${expression}`);
      return value === null;
    }
    throw new Error(`unsupported operator "${next}" in ${expression}`);
  }

  function comparison(): Sql {
    // `ident = 'literal'` is tokenised without the operator, so it is handled
    // by look-ahead on the raw text rather than by the token stream.
    const start = at;
    const column = peek();
    if (column && /^[A-Za-z_]/.test(column)) {
      const after = expression.slice(indexOfToken(expression, tokens, at) + column.length).trimStart();
      if (after.startsWith("=")) {
        take();
        const literal = take();
        const value = Object.prototype.hasOwnProperty.call(row, column) ? row[column] : null;
        if (value === null) return null; // NULL = anything is NULL
        return value === literal.slice(1, -1);
      }
    }
    at = start;
    return primary();
  }

  function andExpr(): Sql {
    let value = comparison();
    while (peek()?.toLowerCase() === "and") {
      take();
      value = sqlAnd(value, comparison());
    }
    return value;
  }

  function orExpr(): Sql {
    let value = andExpr();
    while (peek()?.toLowerCase() === "or") {
      take();
      value = sqlOr(value, andExpr());
    }
    return value;
  }

  const result = orExpr();
  if (at !== tokens.length) throw new Error(`trailing tokens in ${expression}`);
  return result;
}

/** Character offset of token `index`, so `=` can be seen after an identifier. */
function indexOfToken(expression: string, tokens: string[], index: number): number {
  let offset = 0;
  for (let i = 0; i <= index; i++) {
    offset = expression.indexOf(tokens[i], offset);
    if (i < index) offset += tokens[i].length;
  }
  return offset;
}

test("the evaluator reproduces SQL three-valued logic", () => {
  // The evaluator is the instrument, so it is calibrated before it is trusted.
  assert.equal(evaluate("a is null", { a: null }), true);
  assert.equal(evaluate("a is not null", { a: null }), false);
  assert.equal(evaluate("a = 'x'", { a: null }), null, "NULL = 'x' must be NULL");
  assert.equal(evaluate("a = 'x'", { a: "x" }), true);
  assert.equal(evaluate("a = 'x'", { a: "y" }), false);
  // The exact shape that passed a CHECK it should have failed.
  assert.equal(evaluate("(b is null) or a = 'x'", { a: null, b: "set" }), null);
  // And the corrected shape.
  assert.equal(
    evaluate("(b is null) or (a is not null and a = 'x')", { a: null, b: "set" }),
    false,
  );
});

test("a classification field cannot be stored without its family", () => {
  // Evaluated, not read. A CHECK accepts TRUE and NULL, so the row that must be
  // refused has to evaluate to exactly FALSE.
  const cases: { constraint: string; field: string; family: string }[] = [
    { constraint: "listings_service_family_coherent", field: "service_category_key", family: "services" },
    {
      constraint: "listings_distribution_family_coherent",
      field: "distribution_partner_type_key",
      family: "distribution",
    },
    { constraint: "desk_radar_service_family_coherent", field: "service_category_key", family: "services" },
    {
      constraint: "desk_radar_distribution_family_coherent",
      field: "distribution_partner_type_key",
      family: "distribution",
    },
  ];

  for (const { constraint, field, family } of cases) {
    const body = constraintBody(constraint);
    const columns = Array.from(body.matchAll(/[a-z_]+_(key|keys|terms|family)\b/g)).map((m) => m[0]);
    const blank: Record<string, string | null> = {};
    for (const column of columns) blank[column] = null;

    // The row this exists to refuse: a classification with no family at all.
    assert.equal(
      evaluate(body, { ...blank, [field]: "some_key", market_family: null }),
      false,
      `${constraint} does not refuse a classification with no family`,
    );

    // The row it exists to refuse for the other reason: the wrong family.
    assert.equal(
      evaluate(body, { ...blank, [field]: "some_key", market_family: "products" }),
      false,
      `${constraint} does not refuse a classification under the wrong family`,
    );

    // And the two it must accept.
    assert.equal(
      evaluate(body, { ...blank, [field]: "some_key", market_family: family }),
      true,
      `${constraint} refuses a correctly filed record`,
    );
    assert.equal(
      evaluate(body, { ...blank, market_family: null }),
      true,
      `${constraint} invalidates an existing unclassified row`,
    );
  }
});

test("no family-coherence constraint can evaluate to NULL for any row", () => {
  // NULL passes a CHECK, so a constraint that can return NULL has a hole in it
  // wherever it does. Exhaustive over the shapes these constraints see.
  const families = [null, "products", "services", "distribution"];
  const values = [null, "some_key"];
  for (const constraint of [
    "listings_service_family_coherent",
    "listings_distribution_family_coherent",
    "desk_radar_service_family_coherent",
    "desk_radar_distribution_family_coherent",
  ]) {
    const body = constraintBody(constraint);
    const columns = Array.from(body.matchAll(/[a-z_]+_(key|keys|terms)\b/g)).map((m) => m[0]);
    for (const family of families) {
      // Every combination of the classification columns being set or not.
      for (let mask = 0; mask < 1 << columns.length; mask++) {
        const row: Record<string, string | null> = { market_family: family };
        columns.forEach((column, i) => {
          row[column] = values[(mask >> i) & 1];
        });
        assert.notEqual(
          evaluate(body, row),
          null,
          `${constraint} evaluates to NULL, and therefore passes, for ${JSON.stringify(row)}`,
        );
      }
    }
  }
});

test("an intent cannot be stored without a family either", () => {
  const body = constraintBody("listings_intent_needs_family");
  assert.equal(body, "market_intent is null or market_family is not null");
});

test("Market Signals carry the same family-coherence rule as listings", () => {
  // desk_radar is written by an importer, an admin action and any future
  // backfill, none of which passes through the member API's validation. The
  // database is the only place that sees every writer.
  assert.ok(MIGRATION.includes("alter table desk_radar add constraint desk_radar_service_family_coherent"));
  assert.ok(
    MIGRATION.includes("alter table desk_radar add constraint desk_radar_distribution_family_coherent"),
  );
});

test("every constraint and index added is also written into the rollback", () => {
  // "Additive so it is safe" is only true if undoing it has actually been
  // worked out. A constraint added and not listed in the rollback is one that
  // would survive a revert and refuse rows the reverted code still writes.
  const rollback = MIGRATION.slice(MIGRATION.indexOf("-- Rollback"));
  const added = Array.from(MIGRATION.matchAll(/add constraint (\w+) check/g)).map((m) => m[1]);
  const indexes = Array.from(MIGRATION.matchAll(/create index if not exists (\w+)/g)).map((m) => m[1]);
  assert.ok(added.length > 0 && indexes.length > 0);
  for (const name of added) {
    assert.ok(rollback.includes(`drop constraint if exists ${name}`), `${name} has no rollback`);
  }
  for (const name of indexes) {
    assert.ok(rollback.includes(`drop index if exists ${name}`), `${name} has no rollback`);
  }
});

test("nothing existing is renamed, dropped or rewritten", () => {
  // Additive means additive. The one `drop constraint` allowed is the
  // idempotent guard immediately before each `add constraint`.
  const statements = MIGRATION.split("\n").filter((l) => !l.trim().startsWith("--"));
  const body = statements.join("\n");
  assert.ok(!/alter table \w+ drop column/i.test(body), "the migration drops a column");
  assert.ok(!/alter table \w+ rename/i.test(body), "the migration renames something");
  assert.ok(!/^\s*(update|delete|truncate)\s/im.test(body), "the migration writes to existing rows");
  for (const column of Array.from(MIGRATION.matchAll(/add column (if not exists )?(\w+)/g))) {
    assert.ok(column[1], `${column[2]} is added without "if not exists"`);
  }
});

test("the migration documents the escape-route keys it actually stores", () => {
  // The comments contradicted the code once: they said the services escape
  // route is stored as `other`, and it is `unlisted`.
  assert.ok(MIGRATION.includes("`unlisted` for a trade service"), "the comment is stale again");
});

test("the classification reaches the record in words as well as in keys", () => {
  // This is what survives the window above: the details text names the
  // category the member chose even where the column for it does not exist yet.
  const payload = toSubmitPayload(services(), { draft: false, nowIso: NOW });
  const details = String(payload.details);
  assert.ok(details.indexOf("Freight and logistics") >= 0, details);
  assert.ok(details.indexOf("Ocean freight") >= 0, details);
});
