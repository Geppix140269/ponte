// The four bridge routes as genuine direct entrances.
//
// Run: npx tsx --tsconfig tsconfig.ui-test.json lib/landing/__tests__/bridge-navigation.test.tsx
//
// Proves the acceptance points of the direct-entrance task:
//   - clicking a route label, or its bridge marker, navigates at once to that
//     route's current destination;
//   - a direct click needs no objective, no product, no company and no second
//     step, and never focuses or waits for the landing field;
//   - the route controls are real buttons, so keyboard activation navigates;
//   - the typed and spoken objective path is unchanged and still carries the
//     facts read from the objective;
//   - the destination always comes from lib/landing/routing, never from the
//     bridge.

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
import { destinationFor } from "../routing";
import type { RouteKey } from "../intent";
import { fire, mount, type Mounted, type TestElement } from "./render";
/* eslint-enable import/first */

const tests: { name: string; fn: () => void | Promise<void> }[] = [];
function test(name: string, fn: () => void | Promise<void>): void {
  tests.push({ name, fn });
}

const ROUTES: RouteKey[] = ["find", "structure", "check", "investigate"];
const NUM_TO_ROUTE: Record<string, RouteKey> = {
  "01": "find",
  "02": "structure",
  "03": "check",
  "04": "investigate",
};

// A stand-in for the landing textarea, so an unwanted focus is observable.
const field = {
  focus: () => {
    focusCount += 1;
  },
  style: { height: "" },
  scrollHeight: 44,
};

function mountLanding(): Mounted {
  resetRouter();
  emitted.length = 0;
  rafCount = 0;
  focusCount = 0;
  const page = mount(PonteLanding as unknown as (p: unknown) => unknown, {
    locale: "en",
    rtl: false,
  });
  const textarea = page.find((el) => el.type === "textarea", "landing textarea");
  if (textarea.ref) textarea.ref.current = field;
  return page;
}

/** The bridge element as the landing page configures it. */
function bridgeOf(page: Mounted): TestElement {
  return page.find((el) => typeof el.props.onOpen === "function", "bridge");
}

/** The bridge, mounted with the landing page's own handler: the real wiring. */
function mountBridge(page: Mounted): Mounted {
  const bridge = bridgeOf(page);
  return mount(PonteBridge as unknown as (p: unknown) => unknown, bridge.props);
}

function labelButtons(bridge: Mounted): Map<RouteKey, TestElement> {
  const found = new Map<RouteKey, TestElement>();
  for (const el of bridge.all()) {
    if (el.type !== "button") continue;
    const num = el.props["data-num"];
    if (typeof num !== "string" || !NUM_TO_ROUTE[num]) continue;
    found.set(NUM_TO_ROUTE[num], el);
  }
  return found;
}

function markerGroups(bridge: Mounted): Map<RouteKey, TestElement> {
  const found = new Map<RouteKey, TestElement>();
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

// ---- each route is a direct entrance ---------------------------------------

for (const route of ROUTES) {
  test(`clicking the ${route} label navigates to its current destination`, () => {
    const page = mountLanding();
    const bridge = mountBridge(page);
    fire(labelButtons(bridge).get(route)!, "onClick");
    assert.deepEqual(pushed, [destinationFor(route)]);
  });

  test(`clicking the ${route} bridge marker navigates to the same destination`, () => {
    const page = mountLanding();
    const bridge = mountBridge(page);
    fire(markerGroups(bridge).get(route)!, "onClick");
    assert.deepEqual(pushed, [destinationFor(route)]);
  });
}

test("the four destinations are the four journeys, not the landing page", () => {
  const page = mountLanding();
  const bridge = mountBridge(page);
  const buttons = labelButtons(bridge);
  const seen: string[] = [];
  for (const route of ROUTES) {
    resetRouter();
    fire(buttons.get(route)!, "onClick");
    seen.push(pushed[0]);
  }
  assert.equal(seen.length, new Set(seen).size, "each route opens its own destination");
  assert.ok(seen.every((href) => href.startsWith("/") && href !== "/"));
  assert.ok(seen[3].startsWith("/market-signals"), "Investigate opens Market Signals");
});

// ---- nothing else is required ----------------------------------------------

test("a direct click needs no objective, product or company", () => {
  const page = mountLanding();
  const bridge = mountBridge(page);
  fire(labelButtons(bridge).get("find")!, "onClick");

  assert.equal(pushed.length, 1);
  const href = pushed[0];
  assert.ok(!href.includes("intent="), "no objective is invented");
  assert.ok(!href.includes("product="), "no product is demanded first");
  assert.ok(!href.includes("company="), "no company is demanded first");
});

test("a direct click does not focus or wait for the landing field", () => {
  const page = mountLanding();
  const bridge = mountBridge(page);
  fire(labelButtons(bridge).get("structure")!, "onClick");

  assert.equal(focusCount, 0, "the textarea is never focused");
  assert.equal(rafCount, 0, "navigation is not deferred to a frame");
  assert.equal(pushed.length, 1, "navigation happened on the click itself");

  // Nothing on the page asks for a second step: the field is still empty and
  // the page did not switch to its clarify / missing-product support text.
  const textarea = page.find((el) => el.type === "textarea", "landing textarea");
  assert.equal(textarea.props.value, "");
});

test("the route controls are real buttons, so keyboard activation navigates", () => {
  const page = mountLanding();
  const bridge = mountBridge(page);
  const buttons = labelButtons(bridge);
  assert.equal(buttons.size, 4);

  for (const route of ROUTES) {
    const button = buttons.get(route)!;
    assert.equal(button.type, "button", `${route} is a real button element`);
    assert.equal(button.props.type, "button");
    // A keyboard Enter / Space on a button dispatches the same click event.
    resetRouter();
    fire(button, "onClick");
    assert.deepEqual(pushed, [destinationFor(route)], route);
  }
});

test("the bridge holds no destination or feature-flag knowledge", () => {
  const bridge = mount(PonteBridge as unknown as (p: unknown) => unknown, {
    active: null,
    center: { eyebrow: "", title: "", titleEm: "", hint: "" },
    labels: { find: "1", structure: "2", check: "3", investigate: "4" },
    onOpen: () => {},
  });
  for (const el of bridge.all()) {
    for (const value of Object.values(el.props)) {
      if (typeof value !== "string") continue;
      assert.ok(!value.startsWith("/find"), "no destination is restated in the bridge");
      assert.ok(!value.startsWith("/marketplace"), "no destination is restated in the bridge");
    }
  }
});

// ---- analytics -------------------------------------------------------------

test("a direct click confirms the route and reports no submitted objective", () => {
  const page = mountLanding();
  const bridge = mountBridge(page);
  fire(labelButtons(bridge).get("check")!, "onClick");

  assert.deepEqual(emitted, [
    { event: "route_suggested", route: "check" },
    { event: "route_confirmed", route: "check" },
  ]);
});

// ---- the objective path is unchanged ---------------------------------------

test("a typed objective still submits with the facts read from it", async () => {
  const page = mountLanding();
  const textarea = page.find((el) => el.type === "textarea", "landing textarea");
  fire(textarea, "onChange", { target: { value: "Find buyers in India for 500 MT of almonds." } });

  const go = page.find(
    (el) => el.type === "button" && String(el.props.className ?? "").includes("obj__go"),
    "continue button",
  );
  await fire(go, "onClick");

  assert.equal(pushed.length, 1);
  assert.ok(pushed[0].startsWith(destinationFor("find").split("?")[0]));
  assert.ok(pushed[0].includes("product=almonds"), pushed[0]);
  assert.ok(pushed[0].includes("intent="), "the visitor's own words ride along");
  assert.ok(
    emitted.some((e) => e.event === "intent_submitted" && e.route === "find"),
    "a real objective is reported as submitted",
  );
});

test("a spoken objective still submits with the facts read from it", async () => {
  const page = mountLanding();
  const sheet = page.find((el) => typeof el.props.onUse === "function", "voice sheet");
  fire(sheet, "onUse", "Please check Acme Trading SRL before we sign.");
  await Promise.resolve();

  assert.equal(pushed.length, 1);
  assert.ok(pushed[0].startsWith(destinationFor("check").split("?")[0]));
  assert.ok(pushed[0].includes("company=Acme"), pushed[0]);
});

test("a direct click carries an objective already given, and reports it", () => {
  const page = mountLanding();
  const textarea = page.find((el) => el.type === "textarea", "landing textarea");
  fire(textarea, "onChange", { target: { value: "500 MT of almonds for India" } });

  const bridge = mountBridge(page);
  fire(labelButtons(bridge).get("find")!, "onClick");

  assert.equal(pushed.length, 1);
  assert.ok(pushed[0].includes("intent="), "words already typed are not lost");
  assert.ok(
    emitted.some((e) => e.event === "intent_submitted" && e.route === "find"),
    "an objective that was supplied is reported as submitted",
  );
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
