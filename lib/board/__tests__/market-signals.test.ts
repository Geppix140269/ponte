// Tests for Block A: Qualified Opportunities and Market Signals are separate,
// and a Market Signal is anonymised, private until approved, and expiring.
//
// Run: npx tsx lib/board/__tests__/market-signals.test.ts
//
// Same shape as the completeness test: node:assert, non-zero exit on failure,
// no test runner. The logic under test is pure (lib/market-signals/logic.ts),
// so nothing here touches a database.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  isPubliclyVisible,
  mapSignalRow,
  chapterOf,
  PUBLIC_SIGNAL_COLUMNS,
  INTERNAL_SIGNAL_COLUMNS,
  type SignalRow,
  type MarketSignal,
} from "../../market-signals/logic";

const LOCALES = ["en", "zh", "es", "ar", "fr", "pt", "ru", "de", "hi", "it"];
function locale(loc: string): Record<string, any> {
  return JSON.parse(readFileSync(`messages/${loc}.json`, "utf8"));
}

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

const DAY = 86400000;
const NOW = Date.parse("2026-07-23T00:00:00Z");

function row(over: Partial<SignalRow> = {}): SignalRow {
  return {
    id: "s1",
    side: "requirement",
    product: "Refined white sugar ICUMSA 45",
    hs_code: "1701.99",
    qty: 25000,
    unit: "MT",
    incoterms: "CIF",
    payment: "LC at sight",
    origin: null,
    destination: "Netherlands",
    spotted_at: "2026-07-10T00:00:00Z",
    public_expires_at: new Date(NOW + 30 * DAY).toISOString(),
    status: "approved_signal",
    ai_description: "A buyer is seeking refined white sugar into the Netherlands.",
    summary_line: "Sugar into NL",
    ...over,
  };
}

// --- Public visibility: approved and unexpired only -------------------------

test("an approved, unexpired signal is publicly visible", () => {
  assert.equal(isPubliclyVisible(row(), NOW), true);
});

test("an approved signal with no expiry is still visible", () => {
  assert.equal(isPubliclyVisible(row({ public_expires_at: null }), NOW), true);
});

test("an approved signal past its public expiry is not visible", () => {
  assert.equal(
    isPubliclyVisible(row({ public_expires_at: new Date(NOW - DAY).toISOString() }), NOW),
    false,
  );
});

test("a private (imported, unapproved) signal is not public", () => {
  assert.equal(isPubliclyVisible(row({ status: "private" }), NOW), false);
});

test("withdrawn, unavailable, expired and under_investigation are all excluded", () => {
  for (const status of ["withdrawn", "unavailable", "expired", "under_investigation", "confirmed"] as const) {
    assert.equal(
      isPubliclyVisible(row({ status }), NOW),
      false,
      `${status} must not be public`,
    );
  }
});

test("only 'approved_signal' can ever be public", () => {
  // Every status except approved_signal is invisible, even with a live expiry.
  const statuses: SignalRow["status"][] = [
    "private", "approved_signal", "under_investigation",
    "confirmed", "unavailable", "expired", "withdrawn",
  ];
  const visible = statuses.filter((status) =>
    isPubliclyVisible(row({ status, public_expires_at: new Date(NOW + DAY).toISOString() }), NOW),
  );
  assert.deepEqual(visible, ["approved_signal"]);
});

// --- Anonymity: no internal provenance in the public shape ------------------

test("the public column list names none of the internal columns", () => {
  const selected = PUBLIC_SIGNAL_COLUMNS.split(",").map((c) => c.trim());
  for (const internal of INTERNAL_SIGNAL_COLUMNS) {
    assert.ok(
      !selected.includes(internal),
      `public read must not select internal column "${internal}"`,
    );
  }
});

test("the mapped signal carries no provenance, identity or contact field", () => {
  const signal = mapSignalRow(row());
  const keys = Object.keys(signal);
  for (const internal of INTERNAL_SIGNAL_COLUMNS) {
    assert.ok(!keys.includes(internal), `mapped signal leaked "${internal}"`);
  }
  // Nor any obvious camelCase equivalent.
  for (const banned of ["sourceUrl", "sourcePlatform", "counterparty", "rawDescription", "notes"]) {
    assert.ok(!keys.includes(banned), `mapped signal leaked "${banned}"`);
  }
});

test("the mapped signal keeps the structured facts and the paraphrase, not the source", () => {
  const signal: MarketSignal = mapSignalRow(row());
  assert.equal(signal.side, "requirement");
  assert.equal(signal.quantity, "25000");
  assert.equal(signal.unit, "MT");
  assert.equal(signal.description, "A buyer is seeking refined white sugar into the Netherlands.");
  assert.equal(signal.chapter, "17");
});

test("a missing quantity maps to null, never a guessed zero", () => {
  assert.equal(mapSignalRow(row({ qty: null })).quantity, null);
});

test("chapterOf reads the two-digit HS chapter from any code shape", () => {
  assert.equal(chapterOf("1701.99"), "17");
  assert.equal(chapterOf("170199"), "17");
  assert.equal(chapterOf(null), null);
  assert.equal(chapterOf("7"), null);
});

// --- The mandatory badge and disclaimer -------------------------------------
// Brief 1.2 requires every Market Signal to show the badge and the disclaimer,
// and preserves their meaning; it does not require them to stay in English, so
// they live in the "marketSignals" message namespace and are localised. The
// badge's original em dash becomes a colon here because check-messages bans the
// em dash in message values; the substantive wording is unchanged.

test("the English badge is the brief's unverified label", () => {
  assert.equal(
    locale("en").marketSignals.badge,
    "External market signal: not yet verified by Ponte",
  );
});

test("the English disclaimer is the brief's exact wording", () => {
  assert.equal(
    locale("en").marketSignals.disclaimer,
    "This information was identified through external market research. Ponte has not yet verified the participant, the continuing availability of the requirement or offer, or their authority to transact.",
  );
});

test("every locale carries a non-empty badge and disclaimer (mandatory presence)", () => {
  for (const loc of LOCALES) {
    const ms = locale(loc).marketSignals;
    assert.ok(
      ms && typeof ms.badge === "string" && ms.badge.trim().length > 0,
      `${loc} is missing marketSignals.badge`,
    );
    assert.ok(
      typeof ms.disclaimer === "string" && ms.disclaimer.trim().length > 0,
      `${loc} is missing marketSignals.disclaimer`,
    );
  }
});

// --- Structural separation from Qualified Opportunities ----------------------

test("getLiveDeals no longer queries desk_radar", () => {
  const src = readFileSync("lib/board/live-deals.ts", "utf8");
  // The prose may explain the split; the code must not read the table. A query
  // is `.from("desk_radar")`, so that is what a leak looks like.
  assert.ok(
    !src.includes('from("desk_radar")'),
    "lib/board/live-deals.ts still queries desk_radar; the feeds are not separated",
  );
});

test("getLiveDeals drops expired member listings", () => {
  const src = readFileSync("lib/board/live-deals.ts", "utf8");
  assert.ok(
    src.includes("valid_until"),
    "lib/board/live-deals.ts does not filter on valid_until; expired opportunities can still show",
  );
});

test("imports still default a signal to private, not public", () => {
  const src = readFileSync("scripts/import-desk-radar.mjs", "utf8");
  assert.ok(src.includes('status: "private"'), "the importer must land rows private");
  assert.ok(!src.includes('status: "live"'), "the importer must not land rows live");
});

if (process.exitCode) console.error(`\n${passed} passed, some failed.`);
else console.log(`ok   ${passed} market-signals tests passed`);
