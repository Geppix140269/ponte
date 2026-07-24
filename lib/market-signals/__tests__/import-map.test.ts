// Tests for the market-signal import mapping: booleans flatten, Excel dates
// convert, publication follows the flags, and no provenance reaches a public
// column.
//
// Run: npx tsx lib/market-signals/__tests__/import-map.test.ts
//
// Pure logic (lib/market-signals/import-map.ts), so nothing here touches the
// workbook or a database. Same shape as the other suites: node:assert, non-zero
// exit on failure, no runner.

import assert from "node:assert/strict";
import {
  flattenBool,
  excelSerialToISODate,
  sideFromSignalType,
  publicExpiry,
  mapImportRow,
  PUBLIC_INSERT_KEYS,
} from "../import-map";
import { PUBLIC_SIGNAL_COLUMNS } from "../logic";

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

// A minimal publishable row, as the workbook presents it (formula booleans have
// already been read to their cached "1"/"0" by the xlsx reader).
function raw(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    canonical_signal_id: "EXT-G4WB-000001",
    signal_type: "buyer_requirement",
    product: "Waste Paper",
    clean_title: "Buyer seeking Waste Paper",
    clean_description: "Buyer requirement for Waste Paper.",
    raw_description: "Contact Muhammad on +1 555 111 2222, muhammad@example.com",
    quantity_min: "2",
    quantity_unit: "Twenty-Foot Container",
    incoterm: "CIF",
    payment_terms: "L/C",
    destination_country: "United Arab Emirates",
    canonical_category: "Industrial Equipment & Supplies (Other)",
    signal_date: "46227",
    expires_date: "46317",
    source_name: "Go4WorldBusiness",
    source_url: "https://www.go4worldbusiness.com/buylead/view/1312948",
    publishable: "1",
    indexable: "0",
    review_required: "0",
    ...over,
  };
}

const OPTS = { batch: "test", nowIso: "2026-07-24T00:00:00.000Z" };

// ---- flattenBool -----------------------------------------------------------
test("flattenBool reads every cell shape the sheet uses", () => {
  assert.equal(flattenBool("1"), true);
  assert.equal(flattenBool("0"), false);
  assert.equal(flattenBool("TRUE()"), true);
  assert.equal(flattenBool("FALSE()"), false);
  assert.equal(flattenBool("TRUE"), true);
  assert.equal(flattenBool(true), true);
  assert.equal(flattenBool(1), true);
  assert.equal(flattenBool(""), false);
  assert.equal(flattenBool(undefined), false);
});

// ---- excelSerialToISODate --------------------------------------------------
test("excelSerialToISODate converts serials and passes ISO through", () => {
  assert.equal(excelSerialToISODate("46227"), "2026-07-24");
  assert.equal(excelSerialToISODate(46317), "2026-10-22");
  assert.equal(excelSerialToISODate("2026-05-01"), "2026-05-01");
  assert.equal(excelSerialToISODate(""), null);
  assert.equal(excelSerialToISODate("0"), null);
  assert.equal(excelSerialToISODate(null), null);
});

// ---- sideFromSignalType ----------------------------------------------------
test("sideFromSignalType maps buyer/supplier to requirement/offer", () => {
  assert.equal(sideFromSignalType("buyer_requirement"), "requirement");
  assert.equal(sideFromSignalType("supplier_offer"), "offer");
  assert.equal(sideFromSignalType("seller"), "offer");
  assert.equal(sideFromSignalType("anything else"), "requirement");
});

// ---- publicExpiry ----------------------------------------------------------
test("publicExpiry takes the earlier of +90 days and the source expiry", () => {
  // Source expires before +90 days -> use the source expiry.
  assert.equal(publicExpiry("2026-07-24", "2026-10-22"), "2026-10-22");
  // Source expires after +90 days -> cap at +90.
  assert.equal(publicExpiry("2026-07-24", "2027-01-01"), "2026-10-22");
  // No source expiry -> +90 days.
  assert.equal(publicExpiry("2026-07-24", null), "2026-10-22");
});

// ---- mapImportRow: publication follows the flags ---------------------------
test("publishable && !review_required becomes public with a published date", () => {
  const res = mapImportRow(raw(), OPTS);
  assert.ok(res.ok);
  if (!res.ok) return;
  assert.equal(res.insert.status, "approved_signal");
  assert.equal(res.insert.published_at, OPTS.nowIso);
  assert.equal(res.insert.public_expires_at, "2026-10-22");
  assert.equal(res.insert.side, "requirement");
  assert.equal(res.insert.product, "Waste Paper");
  assert.equal(res.insert.qty, 2);
  // Our paraphrase leads, never the source prose.
  assert.equal(res.insert.ai_description, "Buyer requirement for Waste Paper.");
});

test("review_required stays private, unpublished", () => {
  const res = mapImportRow(raw({ review_required: "1" }), OPTS);
  assert.ok(res.ok);
  if (!res.ok) return;
  assert.equal(res.insert.status, "private");
  assert.equal(res.insert.published_at, null);
  assert.equal(res.insert.public_expires_at, null);
});

test("not publishable stays private", () => {
  const res = mapImportRow(raw({ publishable: "0" }), OPTS);
  assert.ok(res.ok);
  if (!res.ok) return;
  assert.equal(res.insert.status, "private");
});

test("a row without canonical id or product is rejected, not guessed", () => {
  assert.equal(mapImportRow(raw({ canonical_signal_id: "" }), OPTS).ok, false);
  assert.equal(mapImportRow(raw({ product: "", source_product: "" }), OPTS).ok, false);
});

// ---- the leak invariant ----------------------------------------------------
test("no provenance field is a public column", () => {
  const publicCols = new Set(PUBLIC_SIGNAL_COLUMNS.split(",").map((c) => c.trim()));
  const provenance = [
    "source_platform", "source_url", "raw_description", "import_meta",
    "dedupe_key", "import_batch", "source_name", "source_ids", "source_files",
    "match_method", "match_confidence", "provenance_status", "quality_score",
    "dup_count", "review_reason",
  ];
  for (const col of provenance) {
    assert.equal(publicCols.has(col), false, `${col} must never be a public column`);
  }
  // Every safe key the import writes is genuinely in the public contract.
  for (const key of PUBLIC_INSERT_KEYS) {
    assert.ok(publicCols.has(key), `${key} is written as public but not in PUBLIC_SIGNAL_COLUMNS`);
  }
});

test("provenance is captured internally, not dropped", () => {
  const res = mapImportRow(raw(), OPTS);
  assert.ok(res.ok);
  if (!res.ok) return;
  // The source is retained on internal columns / import_meta...
  assert.equal(res.insert.source_platform, "Go4WorldBusiness");
  assert.equal(res.insert.source_url, "https://www.go4worldbusiness.com/buylead/view/1312948");
  assert.ok(res.insert.raw_description);
  assert.ok(res.insert.import_meta);
  // ...but none of those keys is part of the public contract.
  const publicCols = new Set(PUBLIC_SIGNAL_COLUMNS.split(",").map((c) => c.trim()));
  for (const key of ["source_platform", "source_url", "raw_description", "import_meta"]) {
    assert.equal(publicCols.has(key), false);
  }
});

console.log(`import-map: ${passed} passed`);
