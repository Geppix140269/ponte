// Every route that renders a stylesheet-dependent component imports its
// stylesheet.
//
// Run: npx tsx components/ponte/bridge/__tests__/stylesheet-pairing.test.ts
//
// ## The defect this pins
//
// `TaskCompletionBridge` was rendered on the landing entrance, by
// `DealRoomPreview`, on a route that never imported `completion-bridge.css`.
// The component does not fail without it. It falls back to the user agent's
// defaults, and on 2 August 2026 the design director reported the result as
// three separate content bugs:
//
//   "58%of the approved procedure"  `.tcb__top` is a flex row with a gap. As
//                                   `display: block` the value and the band abut.
//   "Procedure agreedReady"         `.tcb__abut` is `space-between`. As block,
//                                   two adjacent inline spans.
//   a stray dot                     `.tcb__node` takes its fill from CSS, so it
//                                   painted in the UA default black; the deck
//                                   takes its stroke from CSS, so the arch it
//                                   sits on painted not at all.
//
// Nothing in the build, the type check or the test suite noticed, because
// nothing was wrong with the component and nothing was wrong with the route.
// The fault was only in the pair.
//
// ## Why this is a source test
//
// Because the pairing IS a source property. A runtime test would need a browser
// with the route's real CSS chunk loaded, which is the one thing the unit suite
// cannot have - and a test that needs the thing it is testing to already work
// is not a test.
//
// ## Adding a component here
//
// Add an entry to PAIRS. The walk is over `app/`, so a new route that renders
// the component without its stylesheet fails on the next run.

import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

let passed = 0;
function test(name: string, fn: () => void): void {
  try {
    fn();
    passed++;
  } catch (err) {
    console.error(`FAIL  ${name}\n      ${(err as Error).message}`);
    process.exitCode = 1;
  }
}

/**
 * A component whose correctness depends on a stylesheet, and that stylesheet.
 *
 * `crossWorld` marks a primitive that renders in more than one of the product's
 * style worlds (`.ponte-desk`, `.ponte-find`, `.ponte-landing`). Its stylesheet
 * may not prefix itself with any of them: importing the file on a route whose
 * world it does not name is the SAME failure as not importing it, and it is
 * harder to see, because the file is right there in the document.
 */
const PAIRS: { component: string; stylesheet: string; crossWorld: boolean }[] = [
  {
    component: "TaskCompletionBridge",
    stylesheet: "@/components/ponte/bridge/completion-bridge.css",
    crossWorld: true,
  },
];

/** The world prefixes a route can be wrapped in. */
const WORLDS = [".ponte-desk", ".ponte-find", ".ponte-landing"];

/** Every .tsx under a directory, recursively. */
function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      if (entry === "node_modules" || entry === "__tests__") continue;
      out.push(...walk(path));
    } else if (entry.endsWith(".tsx")) {
      out.push(path);
    }
  }
  return out;
}

const ROUTES = walk("app").filter((f) => /(page|layout|loading|error|template)\.tsx$/.test(f));
const COMPONENTS = walk("components");

// ---------------------------------------------------------------------------
// The walk itself is checked before anything is concluded from it
// ---------------------------------------------------------------------------

test("the walk finds the routes it is supposed to be checking", () => {
  // A silent zero here would make every assertion below pass by finding
  // nothing, which is how the first version of the pricing-boundary guard
  // passed while checking absolutely nothing.
  assert.ok(ROUTES.length > 20, `only ${ROUTES.length} route files found; the walk is not reaching app/`);
  assert.ok(
    ROUTES.some((f) => f.replace(/\\/g, "/").endsWith("app/[locale]/page.tsx")),
    "the landing route is not in the walk, and it is the route this test exists for",
  );
});

// ---------------------------------------------------------------------------
// The pairing
// ---------------------------------------------------------------------------

/**
 * The components that render `name`, transitively, starting from the route.
 *
 * A route rarely renders the component itself: the landing renders
 * `DealRoomPreview`, which renders `TaskCompletionBridge`. So the reachable set
 * is followed through local imports rather than assumed to be one hop.
 */
function rendersTransitively(routeSource: string, name: string): boolean {
  if (routeSource.includes(name)) return true;

  const seen = new Set<string>();
  // The local components a file imports, by their symbol name.
  const localImports = (source: string): string[] =>
    Array.from(source.matchAll(/import\s+(\w+)[^;]*?from\s+"@\/components\/[^"]+"/g), (m) => m[1]);

  let frontier = localImports(routeSource);
  while (frontier.length > 0) {
    const next: string[] = [];
    for (const symbol of frontier) {
      if (seen.has(symbol)) continue;
      seen.add(symbol);
      // Find the file that defines it, by its default export.
      const file = COMPONENTS.find((f) => {
        const source = readFileSync(f, "utf8");
        return new RegExp(`export default function ${symbol}\\b`).test(source);
      });
      if (!file) continue;
      const source = readFileSync(file, "utf8");
      if (source.includes(name)) return true;
      next.push(...localImports(source));
    }
    frontier = next;
  }
  return false;
}

for (const { component, stylesheet, crossWorld } of PAIRS) {
  test(`every route rendering ${component} imports its stylesheet`, () => {
    const offenders: string[] = [];
    for (const route of ROUTES) {
      const source = readFileSync(route, "utf8");
      if (!rendersTransitively(source, component)) continue;
      // The stylesheet may be imported by the route or by a layout above it.
      const layout = route.replace(/[^\\/]+\.tsx$/, "layout.tsx");
      const covering = [source, ROUTES.includes(layout) ? readFileSync(layout, "utf8") : ""];
      if (!covering.some((s) => s.includes(stylesheet))) offenders.push(route);
    }
    assert.deepEqual(
      offenders,
      [],
      `${component} renders on these routes without ${stylesheet}, so it will paint in the user agent's defaults:\n  ${offenders.join("\n  ")}`,
    );
  });

  if (crossWorld) {
    test(`${component}'s stylesheet is not scoped to one style world`, () => {
      /*
        The second half of the same defect, and the half that survived the
        first fix.

        Adding the import to the landing route did not repair anything, because
        every rule in the file began `.ponte-find .tcb` and the landing is
        `.ponte-desk`. The stylesheet was in the document, matching nothing.
        That is strictly worse than a missing import: the file is right there,
        so the obvious check says the pairing is fine.
      */
      const css = readFileSync(stylesheet.replace("@/", ""), "utf8")
        // Comments explain the rule; they are not the rule.
        .replace(/\/\*[\s\S]*?\*\//g, "");
      for (const world of WORLDS) {
        assert.ok(
          !css.includes(world),
          `${stylesheet} scopes itself to ${world}, so it is inert on every route in another world`,
        );
      }
    });
  }

  test(`${component}'s stylesheet actually declares the classes it renders`, () => {
    const source = readFileSync(
      COMPONENTS.find((f) => f.endsWith(`${component}.tsx`)) ?? "",
      "utf8",
    );
    const css = readFileSync(stylesheet.replace("@/", ""), "utf8");
    // The classes the component puts in the DOM, from its own className literals.
    const used = new Set(
      Array.from(source.matchAll(/className="([^"{]+)"/g), (m) => m[1])
        .flatMap((value) => value.split(/\s+/))
        .filter(Boolean),
    );
    for (const cls of Array.from(used)) {
      assert.ok(css.includes(`.${cls}`), `'${cls}' is rendered but never declared in ${stylesheet}`);
    }
  });
}

console.log(`ok   bridge stylesheet pairing: ${passed} assertions passed`);
