// The commercial quantity: parsing, validation, formatting and storage.
//
// Run: npx tsx lib/listings/__tests__/quantity.test.ts
//
// The parsing tests are the ones that matter most. The reader this replaces was
// `Number(String(v).replace(/[, ]/g, ""))`, which silently turned a European
// member's "1,25" into 125 — a hundredfold error on a commercial quantity, with
// no warning anywhere.

import assert from "node:assert/strict";
import {
  parseQuantityInput,
  validateQuantity,
  formatQuantity,
  formatQuantityNumber,
  quantityFromRow,
  quantityToColumns,
  normaliseFrequency,
  type ListingQuantity,
} from "../quantity";

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

// ---- parsing ---------------------------------------------------------------

test("a plain integer parses", () => {
  assert.equal(parseQuantityInput("25000"), 25000);
  assert.equal(parseQuantityInput(25000), 25000);
});

test("a thousands separator is a grouping, not a decimal point", () => {
  assert.equal(parseQuantityInput("1,250"), 1250);
  assert.equal(parseQuantityInput("25,000"), 25000);
  assert.equal(parseQuantityInput("1,250,000"), 1250000);
});

test("a decimal point survives", () => {
  assert.equal(parseQuantityInput("1.25"), 1.25);
  assert.equal(parseQuantityInput("12.5"), 12.5);
});

test("the European decimal comma is not multiplied by a hundred", () => {
  // The defect this pins: the retired reader stripped every comma, so "1,25"
  // became 125.
  assert.equal(parseQuantityInput("1,25"), 1.25);
  assert.equal(parseQuantityInput("12,5"), 12.5);
});

test("mixed separators resolve to the rightmost as the decimal", () => {
  assert.equal(parseQuantityInput("1.250,75"), 1250.75);
  assert.equal(parseQuantityInput("1,250.75"), 1250.75);
});

test("whitespace is tolerated, letters are not", () => {
  assert.equal(parseQuantityInput(" 1 250 "), 1250);
  assert.equal(parseQuantityInput("12abc"), null);
  assert.equal(parseQuantityInput("about 500"), null);
});

test("an empty or absent value parses to null, not zero", () => {
  // Returning 0 here would make "no quantity stated" indistinguishable from a
  // stated quantity of zero.
  assert.equal(parseQuantityInput(""), null);
  assert.equal(parseQuantityInput(null), null);
  assert.equal(parseQuantityInput(undefined), null);
});

// ---- validation ------------------------------------------------------------

const q = (over: Partial<ListingQuantity>): ListingQuantity =>
  ({ mode: "exact", unit: "MT", ...over }) as ListingQuantity;

test("an exact quantity needs a value and a unit", () => {
  assert.deepEqual(validateQuantity(q({ value: 1000 })), []);
  assert.ok(validateQuantity(q({ value: null })).includes("value_required"));
  assert.ok(validateQuantity(q({ value: 1000, unit: null })).includes("unit_required"));
});

test("a decimal quantity is valid", () => {
  assert.deepEqual(validateQuantity(q({ mode: "exact", value: 1.25 })), []);
});

test("a negative or zero quantity is refused", () => {
  assert.ok(validateQuantity(q({ value: -5 })).includes("value_not_positive"));
  assert.ok(validateQuantity(q({ value: 0 })).includes("value_not_positive"));
});

test("a range needs both bounds, ordered", () => {
  assert.deepEqual(validateQuantity(q({ mode: "range", minValue: 500, maxValue: 1000 })), []);
  assert.ok(
    validateQuantity(q({ mode: "range", minValue: 1000, maxValue: 500 }))
      .includes("range_min_not_below_max"),
  );
  // Equal bounds are an exact quantity wearing the wrong mode; letting them
  // through prints "500 to 500 MT".
  assert.ok(
    validateQuantity(q({ mode: "range", minValue: 500, maxValue: 500 }))
      .includes("range_min_not_below_max"),
  );
  assert.ok(
    validateQuantity(q({ mode: "range", minValue: 500, maxValue: null }))
      .includes("range_bounds_required"),
  );
});

test("on_request is a complete answer carrying no number", () => {
  assert.deepEqual(validateQuantity({ mode: "on_request" }), []);
});

test("negotiable is complete with or without an indicative figure", () => {
  assert.deepEqual(validateQuantity({ mode: "negotiable" }), []);
  assert.deepEqual(validateQuantity({ mode: "negotiable", value: 500, unit: "MT" }), []);
  assert.ok(
    validateQuantity({ mode: "negotiable", value: 500 }).includes("unit_required"),
    "an indicative figure still needs a unit",
  );
});

test("minimum and maximum carry a single figure", () => {
  assert.deepEqual(validateQuantity(q({ mode: "minimum", value: 20, unit: "pallets" })), []);
  assert.deepEqual(validateQuantity(q({ mode: "maximum", value: 5000 })), []);
});

test("an unknown mode is refused outright", () => {
  assert.deepEqual(validateQuantity({ mode: "whenever" } as never), ["mode_invalid"]);
  assert.deepEqual(validateQuantity(null), ["mode_invalid"]);
});

// ---- formatting ------------------------------------------------------------

test("a whole number prints whole and a decimal keeps its digits", () => {
  assert.equal(formatQuantityNumber(25000), "25,000");
  assert.equal(formatQuantityNumber(1.25), "1.25");
  assert.equal(formatQuantityNumber(12.5), "12.5");
});

test("the mode is carried into the sentence", () => {
  assert.equal(formatQuantity(q({ value: 1250 })), "1,250 MT");
  assert.equal(
    formatQuantity(q({ mode: "approximate", value: 2500, frequency: "monthly" })),
    "Approximately 2,500 MT per month",
  );
  assert.equal(formatQuantity(q({ mode: "minimum", value: 20, unit: "pallets" })), "Minimum 20 pallets");
  assert.equal(
    formatQuantity(q({ mode: "range", minValue: 500, maxValue: 1000 })),
    "500–1,000 MT",
  );
  assert.equal(formatQuantity({ mode: "on_request" }), "Quantity on request");
  assert.equal(formatQuantity({ mode: "negotiable" }), "Quantity negotiable");
});

test("a one-off quantity carries no recurrence phrase", () => {
  assert.equal(formatQuantity(q({ value: 500, frequency: "one_off" })), "500 MT");
});

// ---- storage ---------------------------------------------------------------

test("a legacy row with a number and no mode reads as exact", () => {
  // Reading it as `approximate` would soften a claim the member made firmly.
  const read = quantityFromRow({ quantity: 25000, unit: "MT", frequency: "Monthly" });
  assert.equal(read?.mode, "exact");
  assert.equal(read?.value, 25000);
  assert.equal(read?.frequency, "monthly");
});

test("a row with neither a mode nor a number carries no quantity", () => {
  assert.equal(quantityFromRow({ quantity: null }), null);
});

test("postgres numeric arriving as a string is read, not re-parsed", () => {
  const read = quantityFromRow({ quantity_mode: "exact", quantity: "1250.75", unit: "MT" });
  assert.equal(read?.value, 1250.75);
});

test("columns null the fields the mode does not own", () => {
  const cols = quantityToColumns({ mode: "on_request", value: 999, minValue: 1, maxValue: 2 });
  assert.equal(cols.quantity, null);
  assert.equal(cols.quantity_min, null);
  assert.equal(cols.quantity_max, null);
  assert.equal(cols.quantity_mode, "on_request");

  const range = quantityToColumns({ mode: "range", value: 999, minValue: 500, maxValue: 1000, unit: "MT" });
  assert.equal(range.quantity, null, "a range does not keep a stray single value");
  assert.equal(range.quantity_min, 500);
  assert.equal(range.quantity_max, 1000);
});

test("the free-text frequency column is normalised on read, never rewritten", () => {
  assert.equal(normaliseFrequency("One-off"), "one_off");
  assert.equal(normaliseFrequency("Monthly"), "monthly");
  assert.equal(normaliseFrequency("Per quarter"), "quarterly");
  assert.equal(normaliseFrequency("whenever"), null, "an unrecognised label is not guessed");
  assert.equal(
    (quantityToColumns({ mode: "exact", value: 1, unit: "MT" }) as Record<string, unknown>).frequency,
    undefined,
    "the quantity writer must not own the free-text frequency column",
  );
});

console.log(`listings/quantity: ${passed} passed`);
