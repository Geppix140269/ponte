// The Desk fact authority and the production adapter.
//
// Run: npx tsx lib/desk/__tests__/facts.test.ts
//
// Every assertion here states the full property the sentence in the handoff
// claims, and derives it rather than listing it. A check that verified
// something narrower than its own description is the exact fault the C1 to C10
// correction log records ten times, so:
//
//   - the prefix property is asserted for EVERY classification and EVERY
//     context pair, not for one sampled row;
//   - "no arbitrary fallback" is asserted by handing the engine a record whose
//     bag is full of keys outside the documented order and proving none of them
//     is reachable, not by reading the source;
//   - "Not stated" is asserted to be record-sensitive by mapping a fully
//     populated production signal and proving no mapped field reports absence.

import assert from "node:assert/strict";
import {
  FACT_CONTEXT,
  FACT_LABEL,
  FACT_PRIORITY,
  NOT_STATED,
  factsFor,
  type DeskClassification,
  type FactBag,
  type FactContext,
  type FactKey,
} from "../facts";
import { corridorOf, quantityOf, readLabelFor, toDeskRecord } from "../adapter";
import type { MarketSignal } from "../../market-signals/logic";

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

const CLASSIFICATIONS = Object.keys(FACT_PRIORITY) as DeskClassification[];
const CONTEXTS = Object.keys(FACT_CONTEXT) as FactContext[];

/** A record that states every fact its classification knows about. */
function fullyStated(cls: DeskClassification): { cls: DeskClassification; facts: FactBag } {
  const facts: FactBag = {};
  for (const key of FACT_PRIORITY[cls].order) facts[key] = `value:${key}`;
  return { cls, facts };
}

/** A record that states nothing at all. */
function statesNothing(cls: DeskClassification) {
  return { cls, facts: {} as FactBag };
}

// ---- the priority order is complete and well formed -------------------------

test("every classification's order is unique and every key has a label", () => {
  for (const cls of CLASSIFICATIONS) {
    const { order, notStated } = FACT_PRIORITY[cls];
    assert.equal(new Set(order).size, order.length, `${cls} repeats a fact in its order`);
    for (const key of order) {
      assert.ok(FACT_LABEL[key], `${cls} orders ${key}, which has no label`);
    }
    for (const key of notStated) {
      assert.ok(
        order.includes(key),
        `${cls} marks ${key} commercially meaningful but never orders it, so it can never render`,
      );
    }
  }
});

// ---- the prefix property, for every classification and every context pair ----

test("a shorter context is always a strict prefix of a longer one", () => {
  const ordered = [...CONTEXTS].sort((a, b) => FACT_CONTEXT[a] - FACT_CONTEXT[b]);

  for (const cls of CLASSIFICATIONS) {
    // Both extremes matter: a record that states everything exercises the
    // present branch, and one that states nothing exercises the "Not stated"
    // branch, which is where a drifting list would show up.
    for (const record of [fullyStated(cls), statesNothing(cls)]) {
      for (let i = 0; i < ordered.length; i++) {
        for (let j = i + 1; j < ordered.length; j++) {
          const shorter = factsFor(record, { context: ordered[i] });
          const longer = factsFor(record, { context: ordered[j] });

          assert.ok(
            shorter.length <= longer.length,
            `${cls}/${ordered[i]} returned more facts than ${ordered[j]}`,
          );
          for (let k = 0; k < shorter.length; k++) {
            assert.equal(
              shorter[k].key,
              longer[k].key,
              `${cls}: ${ordered[i]} fact ${k} is ${shorter[k].key} but ${ordered[j]} fact ${k} is ${longer[k].key}`,
            );
            assert.equal(shorter[k].value, longer[k].value, `${cls}: fact ${k} value drifted`);
            assert.equal(shorter[k].missing, longer[k].missing, `${cls}: fact ${k} state drifted`);
          }
        }
      }
    }
  }
});

test("the desktop register shows one more fact than the mobile row, never a different one", () => {
  for (const cls of CLASSIFICATIONS) {
    const record = fullyStated(cls);
    const mobile = factsFor(record, { context: "mobile-row" });
    const desktop = factsFor(record, { context: "desktop-register" });
    assert.ok(
      desktop.length - mobile.length <= 1,
      `${cls}: the desktop register added ${desktop.length - mobile.length} facts over mobile`,
    );
    assert.deepEqual(
      desktop.slice(0, mobile.length).map((f) => f.key),
      mobile.map((f) => f.key),
      `${cls}: the desktop register reordered the mobile facts`,
    );
  }
});

// ---- no arbitrary fallback --------------------------------------------------

test("a fact outside the documented order is unreachable, whatever the record carries", () => {
  for (const cls of CLASSIFICATIONS) {
    const order = FACT_PRIORITY[cls].order;
    const outside = (Object.keys(FACT_LABEL) as FactKey[]).filter((k) => !order.includes(k));

    // A bag whose FIRST enumerable keys are all off-order. Object-key order
    // would surface them; the documented order cannot.
    const facts: FactBag = {};
    for (const key of outside) facts[key] = `off-order:${key}`;
    for (const key of order) facts[key] = `on-order:${key}`;

    const got = factsFor({ cls, facts }, { count: 99 });
    for (const fact of got) {
      assert.ok(order.includes(fact.key), `${cls} surfaced ${fact.key}, which it does not order`);
      assert.ok(!fact.value.startsWith("off-order:"), `${cls} read a value off its order`);
    }
    assert.deepEqual(
      got.map((f) => f.key),
      [...order],
      `${cls} did not return its documented order exactly`,
    );
  }
});

test("an unknown classification shows nothing rather than guessing", () => {
  const got = factsFor(
    { cls: "not-a-classification", facts: { quantity: "12,000 MT", origin: "Brazil" } },
    { count: 8 },
  );
  assert.deepEqual(got, []);
});

test("an absent fact that is not commercially meaningful is skipped, never blanked", () => {
  // `offer` orders quantity, origin, delivery, timing, priceBasis, payment.
  // `origin` and `delivery` are absent and NOT in notStated, so they vanish;
  // `quantity`, `priceBasis` and `paymentInstrument` are, so they print.
  const got = factsFor({ cls: "offer", facts: {} }, { count: 6 });
  assert.deepEqual(
    got.map((f) => f.key),
    ["quantity", "priceBasis", "paymentInstrument"],
  );
  assert.ok(got.every((f) => f.missing && f.value === NOT_STATED));
});

test("an empty string is an absence, not a value", () => {
  const got = factsFor({ cls: "offer", facts: { quantity: "   " } }, { count: 1 });
  assert.equal(got[0].missing, true);
  assert.equal(got[0].value, NOT_STATED);
});

// ---- the production adapter -------------------------------------------------

function signal(over: Partial<MarketSignal> = {}): MarketSignal {
  return {
    id: "1f0b8b1e-0000-4000-8000-000000000001",
    canonicalId: "EXT-G4WB-000123",
    side: "requirement",
    product: "Refined cane sugar, ICUMSA 45",
    hsCode: null,
    chapter: null,
    chapterTitle: null,
    quantity: "12000",
    unit: "MT",
    incoterm: "CFR",
    payment: "Letter of credit at sight",
    originText: "Brazil",
    destinationText: "Sri Lanka",
    originCode: "BR",
    destinationCode: "LK",
    spottedAt: "2026-07-22",
    publicExpiresAt: "2026-10-20",
    status: "approved_signal",
    description: null,
    summaryLine: null,
    category: null,
    ...over,
  };
}

test("side is the only classification adapted, and it is adapted both ways", () => {
  assert.equal(toDeskRecord(signal({ side: "requirement" })).cls, "requirement");
  assert.equal(toDeskRecord(signal({ side: "offer" })).cls, "offer");
  // Anything else is a buyer requirement rather than an invented classification.
  assert.equal(toDeskRecord(signal({ side: "unknown" })).cls, "requirement");
});

test("no populated production value is ever reported as Not stated", () => {
  // The full record: every column production can carry is set.
  for (const side of ["requirement", "offer"]) {
    const record = toDeskRecord(signal({ side }));
    const facts = factsFor(record, { count: 99 });

    const printed = new Map(facts.map((f) => [f.key, f]));

    // Each mapped production column, and the Desk fact it must satisfy.
    const mapped: [FactKey, string][] = [
      ["quantity", "12000 MT"],
      ["delivery", "CFR"],
      ["paymentInstrument", "Letter of credit at sight"],
      [side === "offer" ? "origin" : "destination", side === "offer" ? "Brazil" : "Sri Lanka"],
    ];

    for (const [key, value] of mapped) {
      const fact = printed.get(key);
      assert.ok(fact, `${side}: ${key} was not rendered at all`);
      assert.equal(fact.missing, false, `${side}: ${key} is populated but rendered as an absence`);
      assert.equal(fact.value, value, `${side}: ${key} rendered the wrong value`);
    }
    // Anything still reporting an absence must be a fact production genuinely
    // does not carry. `desk_radar` has no price basis and no shipment window,
    // so those are true absences; a mapped column appearing here would be the
    // adapter lying about the record.
    const trulyAbsent = new Set<FactKey>(["priceBasis", "timing", "value"]);
    for (const fact of facts.filter((f) => f.missing)) {
      assert.ok(
        trulyAbsent.has(fact.key),
        `${side}: ${fact.key} is mapped from production but rendered "${NOT_STATED}"`,
      );
    }
  }
});

test("a genuinely empty column is the only thing that reports Not stated", () => {
  const record = toDeskRecord(signal({ payment: null, quantity: null, unit: null }));
  const printed = new Map(factsFor(record, { count: 99 }).map((f) => [f.key, f]));
  assert.equal(printed.get("paymentInstrument")?.missing, true);
  assert.equal(printed.get("quantity")?.missing, true);
  // Delivery is still stated, and stays stated.
  assert.equal(printed.get("delivery")?.missing, false);
});

test("either half of a quantity is a real answer", () => {
  assert.equal(quantityOf({ quantity: "12000", unit: "MT" }), "12000 MT");
  assert.equal(quantityOf({ quantity: "12000", unit: null }), "12000");
  assert.equal(quantityOf({ quantity: null, unit: "MT" }), "MT");
  assert.equal(quantityOf({ quantity: null, unit: null }), undefined);
});

test("a half-stated route is written as the half it is", () => {
  assert.equal(corridorOf({ originText: "Brazil", destinationText: "Sri Lanka" }), "Brazil to Sri Lanka");
  assert.equal(corridorOf({ originText: "Brazil", destinationText: null }), "Brazil");
  assert.equal(corridorOf({ originText: null, destinationText: "Sri Lanka" }), "Sri Lanka");
  assert.equal(corridorOf({ originText: null, destinationText: null }), null);
});

test("a read date is formatted once, in English, and never by the runtime locale", () => {
  // The production column is a timestamptz, so the raw value is not showable.
  assert.equal(readLabelFor("2026-07-24T00:00:00+00:00"), "24 Jul 2026");
  assert.equal(readLabelFor("2026-01-05"), "05 Jan 2026");
  // A value that is not a date is returned as it stands, not as "Invalid Date".
  assert.equal(readLabelFor("not a date"), "not a date");
});

test("a Desk record carries a read date and never a source name", () => {
  const record = toDeskRecord(signal());
  assert.equal(record.readAt, "2026-07-22");
  assert.equal(record.readLabel, "22 Jul 2026");
  const serialised = JSON.stringify(record);
  for (const internal of ["source_platform", "source_url", "raw_description", "counterparty"]) {
    assert.ok(!serialised.includes(internal), `a Desk record leaked ${internal}`);
  }
});

test("the reference prefers the canonical id and falls back to the row id", () => {
  assert.equal(toDeskRecord(signal()).ref, "EXT-G4WB-000123");
  assert.equal(toDeskRecord(signal({ canonicalId: null })).ref, signal().id);
});

console.log(`ok  ${passed} passed`);
