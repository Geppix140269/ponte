// The market entrances: every family is genuinely actionable, and only
// products are classified.
//
// Run: npx tsx lib/desk/__tests__/entrances.test.ts
//
// The defect this suite exists to prevent is a family card that states a
// market exists and then does nothing, so the central assertion is derived
// rather than listed: for EVERY family in the accepted taxonomy, at least one
// entrance must resolve to a real route carrying a canonical pair. Adding a
// fourth family without giving it an action fails here.

import assert from "node:assert/strict";
import {
  FAMILY_LAUNCH_BEHAVIOUR,
  composerHref,
  creationEntrancesFor,
  discoveryFor,
  entranceFromParams,
  marketEntrances,
  requiresHsClassification,
} from "../entrances";
import {
  MARKET_FAMILIES,
  MARKET_INTENTS,
  intentsForFamily,
  type MarketFamily,
} from "../../taxonomy/market";

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

const FAMILIES = MARKET_FAMILIES.map((f) => f.key);

// ---- every family is actionable ---------------------------------------------

test("every family in the taxonomy has at least one real creation entrance", () => {
  for (const family of FAMILIES) {
    const entrances = creationEntrancesFor(family);
    assert.ok(
      entrances.length > 0,
      `${family} has no way in. A family with no external inventory is still actionable through member creation.`,
    );
    for (const e of entrances) {
      assert.ok(e.href.startsWith("/structure?"), `${family}/${e.intent} does not reach the composer`);
      assert.ok(e.label.trim().length > 0, `${family}/${e.intent} has no label`);
      assert.ok(e.note.trim().length > 0, `${family}/${e.intent} has no note`);
    }
  }
});

test("the six entrances the corrective order names all exist and carry canonical ids", () => {
  const required: [MarketFamily, string][] = [
    ["products", "source_product"],
    ["products", "offer_product"],
    ["services", "seek_trade_service"],
    ["services", "offer_trade_service"],
    ["distribution", "seek_distribution_partner"],
    ["distribution", "offer_distribution_or_representation"],
  ];
  for (const [family, intent] of required) {
    const hit = creationEntrancesFor(family).find((e) => e.intent === intent);
    assert.ok(hit, `no entrance for ${family} + ${intent}`);
    assert.equal(hit.href, `/structure?family=${family}&intent=${intent}`);
  }
});

test("every entrance is derived from the taxonomy, so none is an invented intent", () => {
  const canonical = new Set(MARKET_INTENTS.map((i) => i.key));
  for (const family of FAMILIES) {
    for (const e of creationEntrancesFor(family)) {
      assert.ok(canonical.has(e.intent), `${e.intent} is not a canonical intent`);
      assert.ok(
        intentsForFamily(family).some((i) => i.key === e.intent),
        `${e.intent} does not belong to ${family}`,
      );
    }
  }
});

test("an entrance count matches the taxonomy exactly, so none is dropped or duplicated", () => {
  for (const family of FAMILIES) {
    assert.equal(creationEntrancesFor(family).length, intentsForFamily(family).length);
  }
  const total = FAMILIES.reduce((n, f) => n + creationEntrancesFor(f).length, 0);
  assert.equal(total, MARKET_INTENTS.length);
});

// ---- HS classification -------------------------------------------------------

test("only products are HS-classified; services and distribution never are", () => {
  assert.equal(requiresHsClassification("products"), true);
  assert.equal(requiresHsClassification("services"), false);
  assert.equal(requiresHsClassification("distribution"), false);
});

test("every non-product entrance says in its own note that no HS code is asked for", () => {
  // The promise is made to the member on the landing, so it has to be kept by
  // the composer. This asserts the promise is actually printed.
  for (const e of creationEntrancesFor("services")) {
    assert.match(e.note, /No HS code/i, `services/${e.intent} does not state that HS is not required`);
  }
});

// ---- discovery ----------------------------------------------------------------

test("discovery is offered only where external inventory genuinely exists", () => {
  assert.ok(discoveryFor("products"), "products has 3,517 public signals and must offer discovery");
  assert.equal(discoveryFor("products")?.href, "/market-signals");
  // No service or distribution record has ever been observed externally.
  // Offering a discovery link would open an empty result and claim a market
  // Ponte has not read.
  assert.equal(discoveryFor("services"), null);
  assert.equal(discoveryFor("distribution"), null);
});

test("no entrance or discovery route enters legacy chrome", () => {
  const LEGACY = ["/explore", "/marketplace", "/find", "/workspace"];
  for (const family of FAMILIES) {
    const routes = [
      ...creationEntrancesFor(family).map((e) => e.href),
      discoveryFor(family)?.href,
    ].filter(Boolean) as string[];
    for (const route of routes) {
      for (const legacy of LEGACY) {
        assert.ok(!route.startsWith(legacy), `${family} routes into legacy ${legacy}`);
      }
    }
  }
});

test("every family declares its accepted launch behaviour", () => {
  assert.equal(FAMILY_LAUNCH_BEHAVIOUR.products, "Discovery-led and participation-enabled");
  assert.equal(FAMILY_LAUNCH_BEHAVIOUR.services, "Participation-led");
  assert.equal(FAMILY_LAUNCH_BEHAVIOUR.distribution, "Matching-led");
  for (const family of FAMILIES) {
    assert.ok(FAMILY_LAUNCH_BEHAVIOUR[family], `${family} declares no launch behaviour`);
  }
});

// ---- the round trip -----------------------------------------------------------

test("a canonical pair survives the round trip through the URL", () => {
  for (const family of FAMILIES) {
    for (const e of creationEntrancesFor(family)) {
      const query = e.href.split("?")[1];
      const params = Object.fromEntries(new URLSearchParams(query));
      assert.deepEqual(entranceFromParams(params), { family: e.family, intent: e.intent });
    }
  }
});

test("a half-valid or mismatched pair is refused rather than partly applied", () => {
  assert.equal(entranceFromParams({ family: "products" }), null);
  assert.equal(entranceFromParams({ intent: "offer_product" }), null);
  assert.equal(entranceFromParams({ family: "nope", intent: "offer_product" }), null);
  assert.equal(entranceFromParams({ family: "products", intent: "nope" }), null);
  // The intent is real, but belongs to another family. Starting a member in a
  // family they did not choose is worse than starting them at step one.
  assert.equal(entranceFromParams({ family: "products", intent: "offer_trade_service" }), null);
  assert.equal(entranceFromParams({ family: "services", intent: "offer_product" }), null);
  assert.equal(entranceFromParams({}), null);
});

test("composerHref refuses to build a route for a mismatched pair", () => {
  assert.throws(() => composerHref("products", "offer_trade_service"), /does not belong/);
});

test("marketEntrances renders all three families with their behaviour and actions", () => {
  const all = marketEntrances();
  assert.equal(all.length, 3);
  for (const family of all) {
    assert.ok(family.create.length > 0, `${family.key} is inert`);
    assert.ok(family.behaviour, `${family.key} has no stated behaviour`);
    assert.equal(family.requiresHs, family.key === "products");
  }
});

console.log(`ok  ${passed} passed`);
