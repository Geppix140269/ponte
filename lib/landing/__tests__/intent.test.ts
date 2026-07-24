// Landing intent inference and route mapping.
//
// Run: npx tsx lib/landing/__tests__/intent.test.ts
//
// Proves the brief's intent-mapping acceptance points: each commercial family
// resolves to the right route, shipping carries a logistics flag into Structure,
// ambiguous text asks rather than guesses, Find without a product asks for one,
// a pre-chosen route is respected, the user's words are never lost, and each
// route maps to its production destination.

import assert from "node:assert/strict";
import { inferIntent, readProduct } from "../intent";
import { destinationFor } from "../routing";

const tests: { name: string; fn: () => void }[] = [];
function test(name: string, fn: () => void): void {
  tests.push({ name, fn });
}

// ---- route classification -------------------------------------------------

test("buyer / importer / demand language maps to Find demand", () => {
  for (const t of [
    "Find buyers in India for 500 MT of almonds.",
    "I want importers for my olive oil.",
    "Who has demand for cashews in Europe?",
    "Looking for an export market for our steel.",
  ]) {
    assert.equal(inferIntent(t).route, "find", t);
  }
});

test("sourcing / procurement / requirement language maps to Structure", () => {
  for (const t of [
    "I need to source 200 tons of urea.",
    "Help me structure a procurement requirement.",
    "Draft a requirement to buy refined sugar.",
    "Necesito estructurar una solicitud de compra de azucar.",
  ]) {
    assert.equal(inferIntent(t).route, "structure", t);
  }
});

test("company-check language maps to Check a company", () => {
  for (const t of [
    "Check a company before I deal with them.",
    "I want to verify a supplier in Turkey.",
    "Run due diligence on Delta Foods Ltd.",
    "Is Acme Trading legit?",
  ]) {
    assert.equal(inferIntent(t).route, "check", t);
  }
});

test("signal language maps to Investigate a signal", () => {
  for (const t of [
    "Investigate a market signal I saw.",
    "I saw a reported tender and want to look into it.",
    "This opportunity looks too good to be true, can you investigate?",
  ]) {
    assert.equal(inferIntent(t).route, "investigate", t);
  }
});

test("shipping / freight / container language maps to Structure with logistics", () => {
  for (const t of [
    "I need to ship two containers of tiles to Spain.",
    "Arrange freight for 500 MT from Brazil.",
    "Move goods across borders, full container load.",
  ]) {
    const r = inferIntent(t);
    assert.equal(r.route, "structure", t);
    assert.equal(r.logistics, true, `${t} should carry logistics context`);
  }
});

test("ambiguous intent asks for clarification instead of guessing", () => {
  for (const t of ["Hello there", "I have a business question", "trade"]) {
    const r = inferIntent(t);
    assert.equal(r.route, null, t);
    assert.equal(r.needsClarification, true, t);
  }
});

// ---- decisive facts and honesty ------------------------------------------

test("Find without a product asks for the product, never invents one", () => {
  const r = inferIntent("Find buyers for my products.");
  assert.equal(r.route, "find");
  assert.equal(r.needsClarification, true);
  assert.equal(r.missingFact, "product");
  assert.equal(r.facts.product, undefined);
});

test("Find with a product is decisive", () => {
  const r = inferIntent("Find buyers for pistachios.");
  assert.equal(r.route, "find");
  assert.equal(r.needsClarification, false);
  assert.equal(r.facts.product, "pistachios");
});

test("readProduct reads only what the text says", () => {
  assert.equal(readProduct("500 MT of almonds"), "almonds");
  assert.equal(readProduct("find me a buyer"), undefined);
  assert.equal(readProduct("i sell something"), undefined);
});

test("a pre-chosen route is respected (the user changed the route on the bridge)", () => {
  // Text reads like Find, but the user selected Check on the bridge.
  const r = inferIntent("buyers for almonds", "check");
  assert.equal(r.route, "check");
  assert.equal(r.needsClarification, false);
});

test("the user's own words are always preserved", () => {
  const words = "Find buyers in India for 500 MT of almonds.";
  assert.equal(inferIntent(words).facts.raw, words);
});

test("facts are extracted only when present", () => {
  const r = inferIntent("Find buyers in India for 500 MT of almonds from Spain.");
  assert.equal(r.facts.product, "almonds");
  assert.equal(r.facts.quantity, "500 MT");
  assert.equal(r.facts.destination, "India");
  assert.equal(r.facts.origin, "Spain");
});

// ---- route -> production destination --------------------------------------

test("each route maps to its production destination, carrying context", () => {
  const facts = { raw: "check acme", company: "Acme" };
  assert.ok(destinationFor("find", { raw: "" }).startsWith("/marketplace"));
  assert.ok(
    destinationFor("structure", { raw: "" }).startsWith("/marketplace/new?type=requirement"),
  );
  assert.ok(destinationFor("check", facts).startsWith("/verify?for=counterparty"));
  assert.ok(destinationFor("investigate", { raw: "" }).startsWith("/market-signals"));
  // Context rides along as query params so nothing is lost across the jump.
  const url = destinationFor("check", facts);
  assert.ok(url.includes("company=Acme"));
  assert.ok(url.includes("intent=check+acme") || url.includes("intent=check%20acme"));
});

test("destination with no facts has no trailing query noise", () => {
  assert.equal(destinationFor("find", { raw: "" }), "/marketplace");
  assert.equal(destinationFor("investigate"), "/market-signals");
});

let passed = 0;
for (const t of tests) {
  try {
    t.fn();
    passed++;
  } catch (err) {
    console.error(`FAIL  ${t.name}`);
    console.error(`      ${(err as Error).message}`);
    process.exitCode = 1;
  }
}
console.log(`\n${passed}/${tests.length} passed`);
