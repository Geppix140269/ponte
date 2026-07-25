// The canonical market taxonomy, and the Flow product-authority findings it
// exists to satisfy.
//
// Run: npx tsx lib/taxonomy/__tests__/market.test.ts
//
// F3 single source · F4 the chapter gap stays detectable · F5 typed constants
// for Trade Services and Distribution. Plus the rule that every icon reference
// in the taxonomy resolves to a real delivered asset.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  DISTRIBUTION_MODES,
  MARKET_FAMILIES,
  PRODUCT_SECTORS,
  TRADE_SERVICES,
  UNASSIGNED_CHAPTERS,
  sectorForChapter,
  uncoveredChapters,
} from "../market";

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

const registry = JSON.parse(
  readFileSync("design-system/ponte-flow/registry/ponte-flow-registry.json", "utf8"),
);
const registryKeys = new Set<string>(registry.icons.map((i: { key: string }) => i.key));

// ---- F4: the gap is detectable, not hidden -----------------------------------

test("the uncovered HS chapters are exactly the three recorded as unassigned", () => {
  assert.deepEqual(
    uncoveredChapters(),
    UNASSIGNED_CHAPTERS.map((c) => c.chapter),
  );
});

test("an unassigned chapter resolves to no sector rather than the nearest one", () => {
  for (const { chapter } of UNASSIGNED_CHAPTERS) {
    assert.equal(sectorForChapter(chapter), null, `chapter ${chapter} was filed under a family`);
  }
  // The neighbours still resolve, so the gap is a gap and not a broken lookup.
  assert.equal(sectorForChapter(70)?.key, "stone");
  assert.equal(sectorForChapter(72)?.key, "metal");
  assert.equal(sectorForChapter(90)?.key, "inst");
  assert.equal(sectorForChapter(93)?.key, "misc");
});

test("no sector has been widened to swallow an unassigned chapter", () => {
  for (const { chapter } of UNASSIGNED_CHAPTERS) {
    for (const s of PRODUCT_SECTORS) {
      assert.ok(
        chapter < s.min || chapter > s.max,
        `${s.key} now covers chapter ${chapter}, which requires a taxonomy decision, not a range edit`,
      );
    }
  }
});

test("no icon is drawn for an unassigned chapter", () => {
  for (const { chapter } of UNASSIGNED_CHAPTERS) {
    assert.ok(!registryKeys.has(`hs.${chapter}`), `an asset exists for unassigned chapter ${chapter}`);
  }
});

// ---- F3: one source, imported ------------------------------------------------

test("the HS picker derives its categories rather than restating them", () => {
  const src = readFileSync("components/hs/hsCategories.tsx", "utf8");
  assert.ok(src.includes("PRODUCT_SECTORS"), "hsCategories must import the canonical taxonomy");
  // A restated label is the defect F3 names, whether or not it currently matches.
  for (const sector of PRODUCT_SECTORS) {
    assert.ok(
      !src.includes(`label: "${sector.label}"`),
      `hsCategories restates the label for ${sector.key}`,
    );
  }
});

test("Explore and Find read the same 15 sectors", () => {
  assert.equal(PRODUCT_SECTORS.length, 15);
  assert.equal(new Set(PRODUCT_SECTORS.map((s) => s.key)).size, 15);
});

// ---- F5: typed constants exist ------------------------------------------------

test("Trade Services and Distribution are typed constants, not component copy", () => {
  assert.equal(TRADE_SERVICES.length, 10);
  assert.equal(DISTRIBUTION_MODES.length, 10);
  assert.equal(new Set(TRADE_SERVICES.map((s) => s.key)).size, 10);
  assert.equal(new Set(DISTRIBUTION_MODES.map((d) => d.key)).size, 10);
});

test("sort orders are unique and stable within each family", () => {
  for (const set of [PRODUCT_SECTORS, TRADE_SERVICES, DISTRIBUTION_MODES, MARKET_FAMILIES]) {
    const sorts = set.map((e) => e.sort);
    assert.equal(new Set(sorts).size, sorts.length);
  }
});

// ---- every icon reference resolves --------------------------------------------

test("every taxonomy icon reference is a real registered Flow key", () => {
  const all = [...MARKET_FAMILIES, ...PRODUCT_SECTORS, ...TRADE_SERVICES, ...DISTRIBUTION_MODES];
  for (const entry of all) {
    assert.ok(registryKeys.has(entry.icon), `${entry.key} references unknown icon ${entry.icon}`);
  }
});

test("the taxonomy claims no trust state", () => {
  const all = [...MARKET_FAMILIES, ...PRODUCT_SECTORS, ...TRADE_SERVICES, ...DISTRIBUTION_MODES];
  for (const entry of all) {
    assert.ok(
      !/verified|trusted|safe|score/i.test(`${entry.key} ${entry.label} ${entry.icon}`),
      `${entry.key} carries a trust claim`,
    );
  }
});

if (process.exitCode) console.error(`\n${passed} passed, some failed.`);
else console.log(`ok   ${passed} taxonomy tests passed`);
