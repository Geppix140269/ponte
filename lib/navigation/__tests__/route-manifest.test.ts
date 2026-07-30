// Route authority and single-generation cutover ratchets.

import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import "../../auth/__tests__/stage1-cutover.test";
import {
  ROUTE_MANIFEST,
  ROUTE_CLASSIFICATIONS,
  findRoute,
  normalizePath,
} from "../route-manifest";

const tests: { name: string; fn: () => void }[] = [];
const test = (name: string, fn: () => void) => tests.push({ name, fn });

// These baselines may shrink but never grow. Stage 1 removes the old account
// page from the retired-link baseline.
const RETIRED_LINK_BASELINE = [
  "app/manifest.ts",
  "app/sitemap.ts",
  "app/[locale]/contact/page.tsx",
  "app/[locale]/learn/duties/page.tsx",
  "app/[locale]/learn/trade-data/page.tsx",
  "components/BottomNav.tsx",
  "components/SiteHeader.tsx",
  "components/SiteFooter.tsx",
  "components/home/LiveDealsGrid.tsx",
  "components/structure/StructureComposer.tsx",
  "components/ListingForm.tsx",
];

const REDIRECT_CHAIN_BASELINE = ["/cart", "/checkout", "/order-success", "/brokerage", "/network"];

const VERIFICATION_CREDIT_COUPLING = [
  "lib/verification/pipeline.ts",
  "app/[locale]/verify/page.tsx",
  "app/api/verification/route.ts",
  "app/[locale]/check/page.tsx",
];
const CREDIT_INFRASTRUCTURE = ["app/api/credits/balance/route.ts"];
const DEPRECATED_SURFACE_PREFIXES = ["app/[locale]/marketplace", "app/[locale]/join"];

function walk(dir: string, match: (path: string) => boolean, out: string[] = []): string[] {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const path = `${dir}/${entry.name}`;
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === "__tests__") continue;
      walk(path, match, out);
    } else if (match(path)) {
      out.push(path);
    }
  }
  return out;
}

const sourceFiles = (roots: string[]) => roots.flatMap((root) => walk(root, (path) => /\.tsx?$/.test(path)));

function ratchet(what: string, baseline: string[], found: string[], remedy: string) {
  for (const path of found) {
    assert.ok(baseline.includes(path), `${what} in ${path}, outside the recorded baseline. ${remedy}`);
  }
  for (const path of baseline) {
    assert.ok(
      found.includes(path),
      `${what} baseline is stale: ${path}. Remove it so the ratchet keeps the ground gained.`,
    );
  }
}

test("every route is classified once", () => {
  const seen = new Set<string>();
  for (const entry of ROUTE_MANIFEST) {
    assert.ok(ROUTE_CLASSIFICATIONS.includes(entry.classification));
    assert.ok(!seen.has(entry.path), `${entry.path} is listed more than once`);
    seen.add(entry.path);
  }
});

test("classification fields are valid", () => {
  for (const entry of ROUTE_MANIFEST) {
    if (entry.classification === "redirect") {
      assert.ok(entry.redirectsTo, `redirect ${entry.path} names no target`);
      assert.equal(entry.flag, undefined);
    } else if (entry.classification === "feature_gated") {
      assert.ok(entry.flag, `feature-gated ${entry.path} names no flag`);
      assert.equal(entry.redirectsTo, undefined);
    } else {
      assert.equal(entry.redirectsTo, undefined);
      assert.equal(entry.flag, undefined);
    }
  }
});

test("every redirect target resolves", () => {
  for (const entry of ROUTE_MANIFEST) {
    if (entry.classification !== "redirect") continue;
    assert.ok(findRoute(entry.redirectsTo as string), `${entry.path} has an unknown target`);
  }
});

test("redirect chains only exist in the shrinking baseline", () => {
  const found = ROUTE_MANIFEST.filter(
    (entry) => entry.classification === "redirect" && findRoute(entry.redirectsTo as string)?.classification === "redirect",
  ).map((entry) => entry.path);
  ratchet("redirect chain", REDIRECT_CHAIN_BASELINE, found, "Point directly at a canonical route.");
});

test("the North Star route set remains canonical", () => {
  const canonical = [
    "/", "/explore", "/market-signals", "/market-signals/[id]", "/find", "/find/o/[ref]",
    "/structure", "/opportunities", "/workspace", "/login", "/account", "/verify",
    "/verification", "/pricing", "/about", "/contact", "/privacy", "/terms",
    "/learn/duties", "/learn/trade-data",
  ];
  for (const path of canonical) assert.equal(findRoute(path)?.classification, "canonical", path);
});

test("check and Deal Rooms remain gated", () => {
  assert.equal(findRoute("/check")?.classification, "feature_gated");
  assert.equal(findRoute("/deal-rooms/abc/activity")?.classification, "feature_gated");
});

test("retired page routes are redirects", () => {
  for (const path of ["/marketplace", "/marketplace/new", "/marketplace/l/[ref]", "/join"]) {
    assert.equal(findRoute(path)?.classification, "redirect", path);
  }
  assert.equal(findRoute("/join")?.retirementImplemented, true);
});

test("resolution handles locale prefixes, dynamic segments and subtrees", () => {
  assert.equal(findRoute("/en/find")?.path, "/find");
  assert.equal(findRoute("/find/o/PT-1234")?.path, "/find/o/[ref]");
  assert.equal(findRoute("/market-signals/42")?.path, "/market-signals/[id]");
  assert.equal(findRoute("/admin/users")?.classification, "internal");
  assert.equal(findRoute("/dev/flow")?.classification, "development_only");
  assert.equal(normalizePath("/en/find/?x=1#y"), "/find");
  assert.equal(findRoute("/nonsense/path"), undefined);
});

test("every page route on disk is classified", () => {
  const pages = walk("app/[locale]", (path) => /\/page\.tsx$/.test(path));
  const missing = pages
    .map((file) => ({ file, route: file.replace(/^app\/\[locale\]/, "").replace(/\/page\.tsx$/, "") || "/" }))
    .filter(({ route }) => !findRoute(route));
  assert.equal(missing.length, 0, `unclassified pages:\n${missing.map(({ file, route }) => `${route} (${file})`).join("\n")}`);
});

test("canonical sources do not regain retired links", () => {
  const retiredLink = /["'`]\/(?:marketplace|join)(?:[/?"'`]|$)/m;
  const found = sourceFiles(["app", "components"])
    .filter((path) => !DEPRECATED_SURFACE_PREFIXES.some((prefix) => path.startsWith(prefix)))
    .filter((path) => retiredLink.test(readFileSync(path, "utf8").replace(/revalidatePath\([^)]*\)/g, "")));
  ratchet(
    "link to a retired route",
    RETIRED_LINK_BASELINE,
    found,
    "Point it at the canonical destination recorded in the manifest.",
  );
});

test("business verification credit imports only exist in the shrinking baseline", () => {
  const importsCredits = /from\s+["']@\/lib\/credits["']/;
  const found = sourceFiles(["app", "components", "lib"]).filter((path) => importsCredits.test(readFileSync(path, "utf8")));
  const allowed = new Set([...VERIFICATION_CREDIT_COUPLING, ...CREDIT_INFRASTRUCTURE]);
  for (const path of found) assert.ok(allowed.has(path), `${path} is an unrecorded credit import`);
  ratchet(
    "business-verification credit import",
    VERIFICATION_CREDIT_COUPLING,
    found.filter((path) => !CREDIT_INFRASTRUCTURE.includes(path)),
    "Remove the credit dependency from the member-business path.",
  );
});

let failed = 0;
for (const { name, fn } of tests) {
  try {
    fn();
    console.log(`ok   ${name}`);
  } catch (error) {
    failed += 1;
    console.error(`FAIL ${name}`);
    console.error(`     ${(error as Error).message}`);
  }
}
if (failed) {
  console.error(`\n${failed} of ${tests.length} route-manifest tests failed.`);
  process.exit(1);
}
console.log(`\nAll ${tests.length} route-manifest tests passed.`);
