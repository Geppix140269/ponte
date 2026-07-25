// The two bridge routes as genuine direct entrances (North Star entry
// architecture, section 5.1).
//
// Run: npx tsx --tsconfig tsconfig.ui-test.json lib/landing/__tests__/bridge-navigation.test.tsx
//
// Proves the PR 1 landing acceptance points:
//   - only two primary routes render, and they are Explore and Start a deal;
//   - clicking a route button, or its bridge marker, navigates at once;
//   - a direct click needs no objective, product or company, and never focuses
//     or waits for the search field;
//   - the route controls are real buttons, so keyboard activation navigates;
//   - the destination comes from lib/landing/bridge, never from the component;
//   - the voice control is gone;
//   - search still resolves a typed objective, and never answers with nothing.

import assert from "node:assert/strict";

// A browser-shaped global the landing page can call into. Installed before the
// components are mounted; analytics reads `window` at call time.
const emitted: { event: string; route?: string }[] = [];
let rafCount = 0;
let focusCount = 0;

class TestCustomEvent<T> {
  readonly type: string;
  readonly detail: T;
  constructor(type: string, init?: { detail?: T }) {
    this.type = type;
    this.detail = init?.detail as T;
  }
}

(globalThis as Record<string, unknown>).CustomEvent = TestCustomEvent;
(globalThis as Record<string, unknown>).window = {
  setTimeout: (fn: () => void, ms?: number) => setTimeout(fn, ms),
  clearTimeout: (id: unknown) => clearTimeout(id as ReturnType<typeof setTimeout>),
  setInterval: (fn: () => void, ms?: number) => setInterval(fn, ms),
  clearInterval: (id: unknown) => clearInterval(id as ReturnType<typeof setInterval>),
  requestAnimationFrame: (fn: () => void) => {
    rafCount += 1;
    void fn;
    return 0;
  },
  matchMedia: () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} }),
  dispatchEvent: (event: { detail?: { event: string; route?: string } }) => {
    if (event.detail) emitted.push(event.detail);
    return true;
  },
};

/* eslint-disable import/first */
import PonteBridge from "../../../components/home/landing/PonteBridge";
import PonteLanding from "../../../components/home/landing/PonteLanding";
import { pushed, resetRouter } from "../../__mocks__/i18n-navigation";
import { bridgeDestination, BRIDGE_ROUTES, type BridgeRoute } from "../bridge";
import { destinationFor } from "../routing";
import { fire, mount, type Mounted, type TestElement } from "./render";
/* eslint-enable import/first */

const tests: { name: string; fn: () => void | Promise<void> }[] = [];
function test(name: string, fn: () => void | Promise<void>): void {
  tests.push({ name, fn });
}

const NUM_TO_ROUTE: Record<string, BridgeRoute> = {
  "01": "explore",
  "02": "deal",
};

// A stand-in for the landing search field, so an unwanted focus is observable.
const field = { focus: () => { focusCount += 1; } };

function mountLanding(): Mounted {
  resetRouter();
  emitted.length = 0;
  rafCount = 0;
  focusCount = 0;
  const page = mount(PonteLanding as unknown as (p: unknown) => unknown, {
    rtl: false,
    activity: [],
    popular: [],
  });
  const search = page.find((el) => el.type === "input", "search field");
  if (search.ref) search.ref.current = field;
  return page;
}

/** The bridge element as the landing page configures it. */
function bridgeOf(page: Mounted): TestElement {
  return page.find((el) => typeof el.props.onOpen === "function", "bridge");
}

/** The bridge, mounted with the landing page's own handler: the real wiring. */
function mountBridge(page: Mounted): Mounted {
  return mount(PonteBridge as unknown as (p: unknown) => unknown, bridgeOf(page).props);
}

function routeButtons(bridge: Mounted): Map<BridgeRoute, TestElement> {
  const found = new Map<BridgeRoute, TestElement>();
  for (const el of bridge.all()) {
    if (el.type !== "button") continue;
    const num = el.props["data-num"];
    if (typeof num !== "string" || !NUM_TO_ROUTE[num]) continue;
    found.set(NUM_TO_ROUTE[num], el);
  }
  return found;
}

function markerGroups(bridge: Mounted): Map<BridgeRoute, TestElement> {
  const found = new Map<BridgeRoute, TestElement>();
  for (const el of bridge.all()) {
    if (el.type !== "g" || typeof el.props.onClick !== "function") continue;
    const text = (Array.isArray(el.props.children) ? el.props.children : []).find(
      (child): child is TestElement =>
        !!child && typeof child === "object" && (child as TestElement).type === "text",
    );
    const num = text?.props.children;
    if (typeof num !== "string" || !NUM_TO_ROUTE[num]) continue;
    found.set(NUM_TO_ROUTE[num], el);
  }
  return found;
}

// ---- exactly two routes, and they are the approved two ----------------------

test("the bridge offers two routes and no more", () => {
  const page = mountLanding();
  const bridge = mountBridge(page);
  assert.equal(routeButtons(bridge).size, 2);
  assert.equal(markerGroups(bridge).size, 2);
  assert.deepEqual([...BRIDGE_ROUTES], ["explore", "deal"]);
});

test("no superseded route survives on the bridge", () => {
  const page = mountLanding();
  const bridge = mountBridge(page);
  const text = bridge
    .all()
    .flatMap((el) => Object.values(el.props))
    .filter((v): v is string => typeof v === "string")
    .join(" ");
  for (const gone of ["check", "investigate", "03", "04"]) {
    assert.ok(!text.includes(gone), `the bridge still carries "${gone}"`);
  }
});

for (const route of BRIDGE_ROUTES) {
  test(`clicking the ${route} button navigates to its current destination`, () => {
    const page = mountLanding();
    const bridge = mountBridge(page);
    fire(routeButtons(bridge).get(route)!, "onClick");
    assert.deepEqual(pushed, [bridgeDestination(route)]);
  });

  test(`clicking the ${route} bridge marker navigates to the same destination`, () => {
    const page = mountLanding();
    const bridge = mountBridge(page);
    fire(markerGroups(bridge).get(route)!, "onClick");
    assert.deepEqual(pushed, [bridgeDestination(route)]);
  });
}

test("Explore opens the market universe, not the old opportunity result", () => {
  assert.equal(bridgeDestination("explore"), "/explore");
});

test("Start a deal opens the composer the structure flag selects", () => {
  assert.equal(bridgeDestination("deal"), destinationFor("structure"));
});

test("each route opens its own destination, never the landing page", () => {
  const page = mountLanding();
  const bridge = mountBridge(page);
  const buttons = routeButtons(bridge);
  const seen: string[] = [];
  for (const route of BRIDGE_ROUTES) {
    resetRouter();
    fire(buttons.get(route)!, "onClick");
    seen.push(pushed[0]);
  }
  assert.equal(seen.length, new Set(seen).size);
  assert.ok(seen.every((href) => href.startsWith("/") && href !== "/"));
});

// ---- nothing else is required ----------------------------------------------

test("a direct click needs no objective, product or company", () => {
  const page = mountLanding();
  const bridge = mountBridge(page);
  fire(routeButtons(bridge).get("explore")!, "onClick");

  assert.equal(pushed.length, 1);
  const href = pushed[0];
  assert.ok(!href.includes("q="), "no objective is invented");
  assert.ok(!href.includes("product="), "no product is demanded first");
  assert.ok(!href.includes("company="), "no company is demanded first");
});

test("a direct click does not focus or wait for the search field", () => {
  const page = mountLanding();
  const bridge = mountBridge(page);
  fire(routeButtons(bridge).get("deal")!, "onClick");

  assert.equal(focusCount, 0, "the field is never focused");
  assert.equal(rafCount, 0, "navigation is not deferred to a frame");
  assert.equal(pushed.length, 1, "navigation happened on the click itself");

  const search = page.find((el) => el.type === "input", "search field");
  assert.equal(search.props.value, "");
});

test("the route controls are real buttons, so keyboard activation navigates", () => {
  const page = mountLanding();
  const bridge = mountBridge(page);
  const buttons = routeButtons(bridge);

  for (const route of BRIDGE_ROUTES) {
    const button = buttons.get(route)!;
    assert.equal(button.type, "button", `${route} is a real button element`);
    assert.equal(button.props.type, "button");
    resetRouter();
    fire(button, "onClick");
    assert.deepEqual(pushed, [bridgeDestination(route)], route);
  }
});

test("each route carries a text name and a supporting line, never a number alone", () => {
  const page = mountLanding();
  const bridge = mountBridge(page);
  const buttons = routeButtons(bridge);
  for (const route of BRIDGE_ROUTES) {
    const button = buttons.get(route)!;
    const text = mount(() => button.props.children, {})
      .all()
      .map((el) => el.props.children)
      .filter((c): c is string => typeof c === "string");
    assert.ok(
      text.some((s) => s.includes(`routes.${route}.label`)),
      `${route} has no text name`,
    );
    assert.ok(
      text.some((s) => s.includes(`routes.${route}.support`)),
      `${route} has no supporting line`,
    );
  }
});

test("the bridge holds no destination or feature-flag knowledge", () => {
  const bridge = mount(PonteBridge as unknown as (p: unknown) => unknown, {
    center: { eyebrow: "", title: "", titleEm: "", hint: "" },
    labels: {
      explore: { title: "1", support: "a" },
      deal: { title: "2", support: "b" },
    },
    onOpen: () => {},
  });
  for (const el of bridge.all()) {
    for (const value of Object.values(el.props)) {
      if (typeof value !== "string") continue;
      assert.ok(!value.startsWith("/explore"), "no destination is restated in the bridge");
      assert.ok(!value.startsWith("/structure"), "no destination is restated in the bridge");
      assert.ok(!value.startsWith("/marketplace"), "no destination is restated in the bridge");
    }
  }
});

// ---- the voice control is gone ---------------------------------------------

test("the landing mounts no voice control and reserves no space for one", () => {
  const page = mountLanding();
  const markup = page
    .all()
    .flatMap((el) => [el.type, ...Object.values(el.props)])
    .filter((v): v is string => typeof v === "string")
    .join(" ");
  for (const gone of ["mic", "talk", "voice"]) {
    assert.ok(!markup.includes(gone), `the landing still carries "${gone}"`);
  }
});

// ---- analytics -------------------------------------------------------------

test("a direct click confirms the route and reports no submitted objective", () => {
  const page = mountLanding();
  const bridge = mountBridge(page);
  fire(routeButtons(bridge).get("explore")!, "onClick");

  assert.deepEqual(emitted, [
    { event: "route_suggested", route: "explore" },
    { event: "route_confirmed", route: "explore" },
  ]);
});

// ---- search ----------------------------------------------------------------

test("a typed search still opens the market it names, with the facts read from it", async () => {
  const page = mountLanding();
  const search = page.find((el) => el.type === "input", "search field");
  fire(search, "onChange", { target: { value: "Find buyers in India for 500 MT of almonds." } });

  const go = page.find(
    (el) => el.type === "button" && String(el.props.className ?? "").includes("obj__go"),
    "search button",
  );
  await fire(go, "onClick");

  assert.equal(pushed.length, 1);
  assert.ok(pushed[0].startsWith(destinationFor("find").split("?")[0]));
  assert.ok(pushed[0].includes("product=almonds"), pushed[0]);
  assert.ok(pushed[0].includes("intent="), "the visitor's own words ride along");
  assert.ok(emitted.some((e) => e.event === "intent_submitted"));
});

test("a company search still opens the company check", async () => {
  const page = mountLanding();
  const search = page.find((el) => el.type === "input", "search field");
  fire(search, "onChange", { target: { value: "Please check Acme Trading SRL before we sign." } });
  const go = page.find(
    (el) => el.type === "button" && String(el.props.className ?? "").includes("obj__go"),
    "search button",
  );
  await fire(go, "onClick");

  assert.equal(pushed.length, 1);
  assert.ok(pushed[0].startsWith(destinationFor("check").split("?")[0]));
  assert.ok(pushed[0].includes("company=Acme"), pushed[0]);
});

test("a direct click carries a search already typed, and reports it", () => {
  const page = mountLanding();
  const search = page.find((el) => el.type === "input", "search field");
  fire(search, "onChange", { target: { value: "500 MT of almonds for India" } });

  const bridge = mountBridge(page);
  fire(routeButtons(bridge).get("explore")!, "onClick");

  assert.equal(pushed.length, 1);
  assert.ok(pushed[0].includes("q="), "words already typed are not lost");
  assert.ok(emitted.some((e) => e.event === "intent_submitted" && e.route === "explore"));
});

test("an empty search asks rather than navigating nowhere", async () => {
  const page = mountLanding();
  const go = page.find(
    (el) => el.type === "button" && String(el.props.className ?? "").includes("obj__go"),
    "search button",
  );
  await fire(go, "onClick");
  assert.equal(pushed.length, 0);
  assert.equal(focusCount, 1, "the field is focused so the visitor can answer");
});

// ---- run -------------------------------------------------------------------

async function run(): Promise<void> {
  let passed = 0;
  for (const t of tests) {
    try {
      await t.fn();
      passed++;
    } catch (err) {
      console.error(`FAIL  ${t.name}`);
      console.error(`      ${(err as Error).message}`);
      process.exitCode = 1;
    }
  }
  console.log(`\n${passed}/${tests.length} passed`);
}

void run();
