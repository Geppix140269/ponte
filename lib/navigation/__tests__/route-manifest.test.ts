// The route-audit test for the single-generation product cutover.
//
// Run: npx tsx lib/navigation/__tests__/route-manifest.test.ts
//
// lib/navigation/route-manifest.ts is the one route authority. This test holds
// three things against it:
//
//   A. Manifest integrity   - every route is classified once, every redirect
//                             resolves, feature-gated routes name a flag, and
//                             the North Star canonical set is what the manifest
//                             says it is.
//   B. Filesystem coverage  - every page route on disk appears in the manifest,
//                             so a new route cannot ship unclassified.
//   C. Cutover ratchets     - the "must fail when" conditions the cutover
//                             brief lists, encoded as baselines that MAY SHRINK
//                             BUT MAY NEVER GROW, exactly like the icon-law and
//                             LB-013 ratchets in scripts/check-governance.mjs.
//
// The ratchets are green today by pinning the current violations. Each later
// cutover PR deletes the entries it fixes and the ratchet tightens. When the
// programme completes, every baseline below is empty.

import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import {
  ROUTE_MANIFEST,
  ROUTE_CLASSIFICATIONS,
  findRoute,
  normalizePath,
  type RouteClassification,
} from "../route-manifest";

const tests: { name: string; fn: () => void }[] = [];
function test(name: string, fn: () => void) {
  tests.push({ name, fn });
}

// ---------------------------------------------------------------------------
// Baselines. Each list MAY SHRINK, never grow. A cutover PR that fixes a file
// deletes it here in the same diff, so the decision is always in review.
// ---------------------------------------------------------------------------

// C1. Source files that still link a member to a retired route (/marketplace*
// or /join). Scanned across app + components (lib is out of scope, as the
// LB-013 ratchet also documents: the flag-off seam in lib/landing lives with
// its own redirect). Cache-only revalidatePath() calls are not violations.
//
// EMPTY as of cutover PR 5. The twelve files recorded when this ratchet was
// written are all repointed: /join went in PR 2 along with the account page;
// the public entrances (PWA shortcut, sitemap, contact, both learn pages, the
// header, the footer, the bottom bar and the homepage showcase) now name /find;
// the composer's "complete your listing" control names /opportunities; and the
// five owner-action emails name /opportunities or /workspace. NO source file
// under app/ or components/ may link a retired route at all.
const RETIRED_LINK_BASELINE: string[] = [];

// C2. Redirect entries that still point at another redirect (a double hop).
//
// EMPTY as of cutover PR 5. All five rode the /cart|/checkout|... ->
// /marketplace legacy chain; each now names /find directly in middleware.ts, so
// one hop reaches the destination and the ranking signal transfers once.
const REDIRECT_CHAIN_BASELINE: string[] = [];

// C3. Files on the verification path that import the credit library.
//
// ADR-0018 (Issue #135) landed the commercial boundary: `member_business`
// verification is FREE and cannot reach a credit function, while
// `counterparty_check` keeps its paid rule. These four files still import
// `@/lib/credits`, and that is now correct rather than pending: each one uses it
// ONLY on the paid counterparty path, behind an explicit purpose guard. The
// guards themselves are pinned by
// lib/verification/__tests__/member-business-free.test.ts, which is the test
// that actually protects the member from being charged; this list only records
// which files are permitted to reach the credit library at all.
// The credits balance route is credit INFRASTRUCTURE, not verification.
const VERIFICATION_CREDIT_COUPLING = [
  "lib/verification/pipeline.ts",
  "app/[locale]/verify/page.tsx",
  "app/api/verification/route.ts",
  "app/[locale]/check/page.tsx",
];
const CREDIT_INFRASTRUCTURE = ["app/api/credits/balance/route.ts"];

// Files whose path begins with one of these are the retired surface itself; a
// link within the retired cluster would not be a canonical->retired violation.
//
// EMPTY as of cutover PR 5, which is a tightening rather than a formality.
// `app/[locale]/join` is gone and the only file left under
// `app/[locale]/marketplace` is the `new` quarantine page, which links nothing
// retired. With no exclusions the scan below covers every file under app/ and
// components/ without exception, so a retired link cannot hide inside the
// retired cluster and be re-exposed later.
const DEPRECATED_SURFACE_PREFIXES: string[] = [];

// ---------------------------------------------------------------------------
// Filesystem helpers.
// ---------------------------------------------------------------------------

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

const sourceFiles = (roots: string[]) =>
  roots.flatMap((root) => walk(root, (p) => /\.tsx?$/.test(p)));

/** Baseline ratchet: found set must equal baseline set, reported both ways. */
function ratchet(what: string, baseline: string[], found: string[], remedy: string) {
  for (const path of found) {
    assert.ok(
      baseline.includes(path),
      `${what} in ${path}, which is not in the recorded baseline. ${remedy}`,
    );
  }
  for (const path of baseline) {
    assert.ok(
      found.includes(path),
      `the ${what} baseline is stale: ${path} no longer matches. Remove it from the ` +
        `list in lib/navigation/__tests__/route-manifest.test.ts so the ratchet keeps the ground it gained.`,
    );
  }
}

// ===========================================================================
// A. Manifest integrity
// ===========================================================================

test("every entry has a known classification and appears once", () => {
  const seen = new Set<string>();
  for (const entry of ROUTE_MANIFEST) {
    assert.ok(
      (ROUTE_CLASSIFICATIONS as readonly string[]).includes(entry.classification),
      `${entry.path} has an unknown classification "${entry.classification}"`,
    );
    assert.ok(!seen.has(entry.path), `${entry.path} is listed more than once`);
    seen.add(entry.path);
  }
});

test("redirects name a target, feature-gated routes name a flag, and neither field leaks onto other classes", () => {
  for (const entry of ROUTE_MANIFEST) {
    if (entry.classification === "redirect") {
      assert.ok(entry.redirectsTo, `redirect ${entry.path} names no target`);
      assert.equal(entry.flag, undefined, `redirect ${entry.path} should not carry a flag`);
    } else if (entry.classification === "feature_gated") {
      assert.ok(entry.flag, `feature-gated ${entry.path} names no flag`);
      assert.equal(entry.redirectsTo, undefined, `feature-gated ${entry.path} should not redirect`);
    } else {
      assert.equal(entry.redirectsTo, undefined, `${entry.path} is ${entry.classification} but carries a redirect target`);
      assert.equal(entry.flag, undefined, `${entry.path} is ${entry.classification} but carries a flag`);
    }
  }
});

test("every redirect target resolves to a known route", () => {
  for (const entry of ROUTE_MANIFEST) {
    if (entry.classification !== "redirect") continue;
    const target = findRoute(entry.redirectsTo as string);
    assert.ok(target, `${entry.path} redirects to ${entry.redirectsTo}, which is not a known route`);
  }
});

test("a redirect points at a redirect only where the chain is baselined", () => {
  const chains = ROUTE_MANIFEST.filter(
    (e) => e.classification === "redirect" && findRoute(e.redirectsTo as string)?.classification === "redirect",
  ).map((e) => e.path);
  ratchet(
    "a redirect that chains through another redirect",
    REDIRECT_CHAIN_BASELINE,
    chains,
    "Repoint it at a canonical surface (e.g. /find) so a single hop reaches the destination.",
  );
});

test("the North Star canonical set is classified canonical", () => {
  const canonical = [
    "/", "/explore", "/market-signals", "/market-signals/[id]", "/find", "/find/o/[ref]",
    "/structure", "/opportunities", "/workspace", "/login", "/account", "/verify",
    "/verification", "/pricing", "/about", "/contact", "/privacy", "/terms",
    "/learn/duties", "/learn/trade-data",
  ];
  for (const path of canonical) {
    assert.equal(findRoute(path)?.classification, "canonical", `${path} must be canonical`);
  }
});

test("/check and the Deal Room tree stay feature-gated, not canonical", () => {
  assert.equal(findRoute("/check")?.classification, "feature_gated");
  assert.equal(findRoute("/deal-rooms")?.classification, "feature_gated");
  assert.equal(findRoute("/deal-rooms/abc/activity")?.classification, "feature_gated");
});

test("the retire targets are classified as redirects", () => {
  for (const path of ["/marketplace", "/marketplace/new", "/marketplace/l/[ref]", "/join"]) {
    assert.equal(findRoute(path)?.classification, "redirect", `${path} must be a redirect`);
  }
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

// ===========================================================================
// B. Filesystem coverage
// ===========================================================================

test("every page route on disk is classified in the manifest", () => {
  const pages = walk("app/[locale]", (p) => /\/page\.tsx$/.test(p));
  const missing: string[] = [];
  for (const file of pages) {
    const route = file.replace(/^app\/\[locale\]/, "").replace(/\/page\.tsx$/, "") || "/";
    if (!findRoute(route)) missing.push(`${route}  (${file})`);
  }
  assert.equal(
    missing.length,
    0,
    `page routes absent from lib/navigation/route-manifest.ts:\n  ${missing.join("\n  ")}`,
  );
});

// ===========================================================================
// C. Cutover ratchets (the brief's "must fail when" conditions)
// ===========================================================================

test("no source file links a retired route, beyond the recorded baseline", () => {
  const retiredLink = /["'`]\/(?:marketplace|join)(?:[/?"'`]|$)/m;
  const found = sourceFiles(["app", "components"])
    .filter((path) => !DEPRECATED_SURFACE_PREFIXES.some((prefix) => path.startsWith(prefix)))
    .filter((path) => {
      // Cache invalidation is not navigation.
      const text = readFileSync(path, "utf8").replace(/revalidatePath\([^)]*\)/g, "");
      return retiredLink.test(text);
    });
  ratchet(
    "a link to a retired route (/marketplace* or /join)",
    RETIRED_LINK_BASELINE,
    found,
    "Point it at the canonical destination the manifest records (e.g. /find, /find/o/[ref], /opportunities, /login).",
  );
});

test("the business-verification path imports no credit function, beyond the recorded baseline", () => {
  const importsCredits = /from\s+["']@\/lib\/credits["']/;
  const found = sourceFiles(["app", "components", "lib"]).filter((path) =>
    importsCredits.test(readFileSync(path, "utf8")),
  );
  const allowed = new Set([...VERIFICATION_CREDIT_COUPLING, ...CREDIT_INFRASTRUCTURE]);
  // No file outside the recorded union may import credits.
  for (const path of found) {
    assert.ok(
      allowed.has(path),
      `${path} imports @/lib/credits but is neither recorded credit infrastructure nor a ` +
        `baselined verification-path file. A business-verification path must not reach a credit function.`,
    );
  }
  // The verification-path baseline may shrink, never grow, and must not go stale.
  ratchet(
    "the business-verification path importing @/lib/credits",
    VERIFICATION_CREDIT_COUPLING,
    found.filter((path) => !CREDIT_INFRASTRUCTURE.includes(path)),
    "member_business verification is credit-free (cutover PR 6): remove the credit import from this path.",
  );
});

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------

let failed = 0;
for (const { name, fn } of tests) {
  try {
    fn();
    console.log(`ok   ${name}`);
  } catch (err) {
    failed++;
    console.error(`FAIL ${name}`);
    console.error(`     ${(err as Error).message}`);
  }
}
if (failed) {
  console.error(`\n${failed} of ${tests.length} route-manifest tests failed.`);
  process.exit(1);
}
console.log(`\nAll ${tests.length} route-manifest tests passed.`);
