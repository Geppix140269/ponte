// Direct bridge entrances: destination and analytics for a deliberate click.
//
// Run: npx tsx lib/landing/__tests__/direct-route.test.ts
//
// Proves that a clicked route is a real entrance: it resolves to the same
// destination the objective path would use, needs no objective text, never
// reports a submitted objective when none was supplied, and keeps the journey
// feature flags -- including their fallbacks -- authoritative.

import assert from "node:assert/strict";
import { directRouteNavigation } from "../direct-route";
import { destinationFor } from "../routing";
import { inferIntent } from "../intent";
import type { RouteKey } from "../intent";

const tests: { name: string; fn: () => void }[] = [];
function test(name: string, fn: () => void): void {
  tests.push({ name, fn });
}

const ROUTES: RouteKey[] = ["find", "structure", "check", "investigate"];

/** Run `fn` with the journey flags set, restoring the environment after. */
function withFlags(flags: Record<string, string | undefined>, fn: () => void): void {
  const previous = new Map<string, string | undefined>();
  for (const [key, value] of Object.entries(flags)) {
    previous.set(key, process.env[key]);
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  try {
    fn();
  } finally {
    previous.forEach((value, key) => {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    });
  }
}

const FLAGS_OFF = {
  NEXT_PUBLIC_FIND_JOURNEY: undefined,
  NEXT_PUBLIC_STRUCTURE_JOURNEY: undefined,
  NEXT_PUBLIC_CHECK_JOURNEY: undefined,
};
const FLAGS_ON = {
  NEXT_PUBLIC_FIND_JOURNEY: "on",
  NEXT_PUBLIC_STRUCTURE_JOURNEY: "on",
  NEXT_PUBLIC_CHECK_JOURNEY: "on",
};

// ---- a click needs nothing else -------------------------------------------

test("a direct click on any route needs no objective text", () => {
  for (const route of ROUTES) {
    const nav = directRouteNavigation(route);
    assert.ok(nav.destination.startsWith("/"), route);
    assert.ok(!nav.destination.includes("intent="), `${route} carries no invented objective`);
    assert.ok(!nav.destination.includes("product="), `${route} demands no product`);
    assert.ok(!nav.destination.includes("company="), `${route} demands no company`);
  }
});

test("the destination is never restated: it is exactly destinationFor's", () => {
  for (const flags of [FLAGS_OFF, FLAGS_ON]) {
    withFlags(flags, () => {
      for (const route of ROUTES) {
        assert.equal(directRouteNavigation(route).destination, destinationFor(route), route);
      }
    });
  }
});

// ---- each route opens its journey -----------------------------------------

test("with the journey flags off, each route opens its fallback where one remains", () => {
  withFlags(FLAGS_OFF, () => {
    // Find and Structure have no fallback left to open. Find's seam was the
    // obsidian board (retired in cutover PR 5) and Structure's was the legacy
    // editor (a redirect to the composer since LB-013, closed in cutover PR 3),
    // so both open their own journey in BOTH flag states and neither
    // NEXT_PUBLIC_FIND_JOURNEY nor NEXT_PUBLIC_STRUCTURE_JOURNEY governs a
    // destination any more. These two lines are the guard: if either branch
    // ever reads its flag again, the off state stops matching the on state
    // asserted below and this test fails.
    assert.equal(directRouteNavigation("find").destination, "/find");
    assert.equal(directRouteNavigation("structure").destination, "/structure");
    assert.equal(directRouteNavigation("check").destination, "/verify?for=counterparty");
    assert.equal(directRouteNavigation("investigate").destination, "/market-signals");
  });
});

test("with the journey flags on, each route opens its own journey", () => {
  withFlags(FLAGS_ON, () => {
    assert.equal(directRouteNavigation("find").destination, "/find");
    assert.equal(directRouteNavigation("structure").destination, "/structure");
    assert.equal(directRouteNavigation("check").destination, "/check");
    // Market Signals has no flag: Investigate always opens the signals board.
    assert.equal(directRouteNavigation("investigate").destination, "/market-signals");
  });
});

// ---- analytics -------------------------------------------------------------

test("a bare route click confirms the route and reports no objective", () => {
  for (const route of ROUTES) {
    const names = directRouteNavigation(route).events.map((e) => e.name);
    assert.deepEqual(names, ["route_suggested", "route_confirmed"], route);
    assert.ok(!names.includes("intent_submitted"), `${route} must not claim a submitted objective`);
    for (const event of directRouteNavigation(route).events) {
      assert.deepEqual(event.meta, { route });
    }
  }
});

test("blank or whitespace text is not an objective", () => {
  const names = directRouteNavigation("check", { raw: "   " }).events.map((e) => e.name);
  assert.deepEqual(names, ["route_suggested", "route_confirmed"]);
});

test("an objective already given rides along and is reported as submitted", () => {
  const text = "Please check Acme Trading SRL before we ship.";
  const facts = inferIntent(text, "check").facts;
  const nav = directRouteNavigation("check", facts);

  assert.deepEqual(
    nav.events.map((e) => e.name),
    ["route_suggested", "route_confirmed", "intent_submitted"],
  );
  assert.ok(nav.destination.includes("intent="), "the visitor's own words ride along");
  assert.ok(nav.destination.includes("company=Acme"));
  assert.equal(nav.destination, destinationFor("check", facts));
});

// ---- run -------------------------------------------------------------------

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
