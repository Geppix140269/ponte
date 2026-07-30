import { existsSync, readFileSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";

const requiredFiles = [
  "AGENTS.md",
  "CLAUDE.md",
  "docs/codex/00-START-HERE.md",
  "docs/codex/SOURCE-OF-TRUTH-SOP.md",
  "docs/codex/CURRENT-STATE.md",
  "docs/codex/DECISION-LOG.md",
  "docs/decisions/README.md",
  "docs/decisions/ADR-0001-unified-trade-market.md",
  "docs/decisions/ADR-0002-ponte-design-constitution.md",
  "docs/schemas/market-taxonomy.yaml",
  "docs/schemas/market-record.schema.json",
  "design/authority/PONTE_DESIGN_CONSTITUTION_v1.md",
  "design/authority/bridge/v1/README.md",
  "design/authority/bridge/v1/APPROVAL.md",
  ".github/pull_request_template.md",
  ".github/ISSUE_TEMPLATE/product-decision.yml",
  ".github/CODEOWNERS",
  "lib/taxonomy/market.ts",
];

const failures = [];

for (const path of requiredFiles) {
  if (!existsSync(path)) failures.push(`missing required governance file: ${path}`);
}

function requireText(path, fragments) {
  if (!existsSync(path)) return;
  const text = readFileSync(path, "utf8");
  for (const fragment of fragments) {
    if (!text.includes(fragment)) failures.push(`${path} must reference ${fragment}`);
  }
}

requireText("AGENTS.md", [
  "docs/codex/SOURCE-OF-TRUTH-SOP.md",
  "docs/decisions/",
  "lib/taxonomy/market.ts",
  "design/authority/PONTE_DESIGN_CONSTITUTION_v1.md",
]);
requireText("CLAUDE.md", ["AGENTS.md", "docs/codex/SOURCE-OF-TRUTH-SOP.md"]);
requireText("docs/codex/00-START-HERE.md", [
  "SOURCE-OF-TRUTH-SOP.md",
  "docs/decisions/",
]);
requireText("docs/codex/DECISION-LOG.md", [
  "One trade market, three equal primary families",
  "Repository source-of-truth operating procedure",
]);
requireText(".github/pull_request_template.md", [
  "Design Constitution check",
  "design/authority/PONTE_DESIGN_CONSTITUTION_v1.md",
]);
requireText(".github/CODEOWNERS", [
  "/design/authority/",
  "/design-system/",
]);
requireText("design/authority/PONTE_DESIGN_CONSTITUTION_v1.md", [
  "Functional correctness does not override design correctness",
  "Ponte must never display 0%",
  "Stop and request owner approval",
]);
requireText("design/authority/bridge/v1/README.md", [
  "APPROVED — AUTHORITATIVE",
  "Ponte Family Bridge",
  "Ponte Action Bridge",
]);

if (existsSync("docs/schemas/market-record.schema.json")) {
  try {
    const schema = JSON.parse(readFileSync("docs/schemas/market-record.schema.json", "utf8"));
    const families = schema?.properties?.market_family?.enum;
    const origins = schema?.properties?.record_origin?.enum;
    const expectedFamilies = ["products", "services", "distribution"];
    const expectedOrigins = ["market_signal", "member_opportunity"];
    if (JSON.stringify(families) !== JSON.stringify(expectedFamilies)) {
      failures.push("market-record schema must define the three canonical market families");
    }
    if (JSON.stringify(origins) !== JSON.stringify(expectedOrigins)) {
      failures.push("market-record schema must define the two canonical record origins");
    }
  } catch (error) {
    failures.push(`market-record schema is not valid JSON: ${error.message}`);
  }
}

// ---------------------------------------------------------------------------
// Icon law (Constitution section 7) — a ratchet, not a gate.
//
// Every production interface icon must come from the approved Ponte Flow
// registry, rendered through `PonteIcon`. The Phase 1 audit found 11 files
// importing lucide-react and 18 containing raw <svg>, all of them on routes the
// Constitution-led rebuild has not reached yet. Failing the build on those today
// would only mean the check gets disabled.
//
// So the rule enforced here is the one that can hold from today: the lists may
// SHRINK but may never grow. A new file reaching for lucide, or hand-drawing an
// icon, fails the check. A journey slice that migrates a route deletes its entry
// and the ratchet tightens by one notch. Phase 4 empties both lists.
//
// This is the mechanism behind "prevent raw page-level SVG icon creation": there
// is no way to add one without editing this file, which puts the decision in the
// diff where a reviewer will see it.
// ---------------------------------------------------------------------------

/** Files that still import a third-party icon set. May shrink, never grow. */
const LUCIDE_BASELINE = [
  "app/[locale]/account/page.tsx",
  "app/[locale]/contact/page.tsx",
  "app/[locale]/marketplace/l/[ref]/page.tsx",
  "app/[locale]/marketplace/page.tsx",
  "app/[locale]/offline/page.tsx",
  "app/[locale]/pricing/page.tsx",
  "components/InstallPrompt.tsx",
  "components/LanguageSwitcher.tsx",
  "components/ListingForm.tsx",
  "components/NetworkForm.tsx",
  "components/tradeCategories.ts",
];

/**
 * Files that still contain hand-authored <svg>. May shrink, never grow.
 *
 * Three entries are permanent, and none is an interface icon:
 *
 * - `components/ponte/brand/PonteLockup.tsx` draws the brand lockup. The owner
 *   ruled it an identity asset rather than an interface icon, so it stays an
 *   authored SVG.
 * - `components/ponte/bridge/BridgeRoute.tsx` draws the Bridge deck. It is
 *   structural interaction geometry from the approved Bridge System, whose own
 *   stylesheet defines `.br__deck path` and its stroke classes. Constitution
 *   section 8 makes that package authoritative and section 7's prohibition is
 *   on ad hoc *icons*; a deck is not one, and there is no registry key that
 *   could express it.
 * - `components/ponte/bridge/DealRoomBridge.tsx` draws the same deck, for the
 *   Multi-party Deal Room Bridge the owner commissioned on 29 July 2026 (issue
 *   #97, decision 2). Section 8 names that bridge as authoritative in the same
 *   sentence as the Family and Action bridges above, and the drawing is
 *   transcribed from `PB.dealroom` in the approved engine, using the same
 *   `.br__deck`, `.d-track`, `.d-live`, `.d-fwd` and `.d-blocked` classes that
 *   the approved stylesheet already defines. Nothing in it is an icon, and
 *   `components/ponte/bridge/__tests__/deal-room-bridge.test.tsx` asserts that
 *   every class it emits is either declared in an approved stylesheet or
 *   created by the approved engine.
 *
 * - `components/ponte/bridge/TaskCompletionBridge.tsx` draws the completion deck
 *   for the universal Task Completion Bridge (ADR-0016, Bridge System v1
 *   component #3). Same argument as the two above: section 8 makes the Bridge
 *   System authoritative, a shallow deck with a travelled gold segment is
 *   structural crossing geometry rather than an ad hoc icon, and no Flow
 *   registry key expresses a progress deck. The signal node is a `<circle>` on
 *   that deck, not an icon.
 *
 * All four are listed rather than exempted, so the number of hand-authored
 * drawings in the product stays visible in one place and each new one has to be
 * argued for here. This is the ratchet working as intended: the entry above was
 * written because the check refused the file, not to get past it.
 */
const RAW_SVG_BASELINE = [
  "app/[locale]/dev/design/page.tsx",
  "app/[locale]/find/o/[ref]/page.tsx",
  "components/Logo.tsx",
  "components/check/CheckComposer.tsx",
  "components/find/RequestIntroduction.tsx",
  "components/find/SignalRow.tsx",
  "components/home/HeroBridge.tsx",
  "components/home/LiveDealCard.tsx",
  "components/home/TradeRouteMap.tsx",
  "components/home/landing/PonteFlow.tsx",
  "components/home/landing/PonteLanding.tsx",
  "components/hs/hsCategories.tsx",
  "components/icons/index.tsx",
  "components/ponte/brand/PonteLockup.tsx",
  "components/ponte/bridge/BridgeRoute.tsx",
  "components/ponte/bridge/DealRoomBridge.tsx",
  "components/ponte/bridge/TaskCompletionBridge.tsx",
  "components/signals/SignalCard.tsx",
  "components/structure/StructureComposer.tsx",
];

/**
 * Files that still hold a link to the retired `/marketplace/new` editor.
 * May shrink, never grow (LB-013).
 *
 * That route no longer renders the legacy `ListingForm`; it redirects to the
 * current composer at `/structure`. Every member-facing link was repointed, and
 * every transactional email now resumes at `/structure?edit=<id>`. The one entry
 * that remains is `components/ListingForm.tsx` itself: the legacy composer is now
 * unreachable — nothing renders it — and its own internal sign-in redirect still
 * names the old path. Its physical removal is logged as a follow-up in
 * docs/launch/POST-LAUNCH-BACKLOG.md; until then it is pinned here so no NEW file
 * can reach for the retired editor without editing this list in the diff.
 *
 * The landing seam in `lib/landing/routing.ts` is the flag-off fallback and is
 * out of this scan's scope (lib is not walked); it rides the quarantine redirect
 * and is documented there.
 */
const LEGACY_EDITOR_LINK_BASELINE = ["components/ListingForm.tsx"];

function sourceFiles(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = `${dir}/${entry.name}`;
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === "__tests__") continue;
      sourceFiles(path, out);
    } else if (/\.tsx?$/.test(entry.name)) {
      out.push(path);
    }
  }
  return out;
}

function ratchet(what, baseline, matches, remedy) {
  const found = sourceFiles("app").concat(sourceFiles("components")).filter(matches);
  for (const path of found) {
    if (!baseline.includes(path)) {
      failures.push(`${what} in ${path}, which is not in the recorded baseline. ${remedy}`);
    }
  }
  for (const path of baseline) {
    if (!found.includes(path)) {
      failures.push(
        `the ${what} baseline is stale: ${path} no longer matches. Remove it from the list in ` +
          `scripts/check-governance.mjs so the ratchet keeps the ground it just gained.`,
      );
    }
  }
  return found.length;
}

const lucideCount = ratchet(
  "unapproved icon set imported",
  LUCIDE_BASELINE,
  (path) => /\bfrom\s+["']lucide-react["']/.test(readFileSync(path, "utf8")),
  "Constitution section 7: use PonteIcon with an approved registry key. A missing icon is a gap to escalate, not permission to substitute one.",
);

const rawSvgCount = ratchet(
  "hand-authored <svg>",
  RAW_SVG_BASELINE,
  (path) => /<svg[\s>]/.test(readFileSync(path, "utf8")),
  "Constitution section 7 prohibits ad hoc SVG interface icons. Use PonteIcon; the brand lockup is the single ruled exception and already has a shared component.",
);

// LB-013 route audit: no source file may link the retired listing editor. The
// matcher looks for `/marketplace/new` immediately behind a quote or backtick,
// so it catches an href, a url or a template literal but not a comment or the
// redirect helper's prose.
const legacyEditorLinkCount = ratchet(
  "a link to the retired /marketplace/new editor",
  LEGACY_EDITOR_LINK_BASELINE,
  (path) => /["'`]\/marketplace\/new\b/.test(readFileSync(path, "utf8")),
  "LB-013 retired that editor. Link to the current composer at /structure, resuming a saved record with ?edit=<id>.",
);

// The lockup itself: one drawing, one component. The arch path is the mark's
// signature, so a second copy of it anywhere is a local redraw by definition —
// which is the specific thing the owner's ruling forbids.
const ARCH_PATH = "M22 98 L22 60 C22 35 98 35 98 60 L98 98";
const lockupCopies = sourceFiles("app")
  .concat(sourceFiles("components"))
  .filter((path) => readFileSync(path, "utf8").includes(ARCH_PATH));
if (lockupCopies.length !== 1 || lockupCopies[0] !== "components/ponte/brand/PonteLockup.tsx") {
  failures.push(
    `the Ponte brand lockup must be drawn in exactly one shared component, found in: ` +
      `${lockupCopies.join(", ") || "no file at all"}. Render components/ponte/brand/PonteLockup.tsx instead of copying the mark.`,
  );
}

// ---------------------------------------------------------------------------
// The approved Bridge package must match its own manifest.
//
// `design/authority/bridge/v1/SOURCE-MANIFEST.md` records a SHA-256 for every
// file of the owner-approved delivery. For a while the repository did not hold
// what the manifest described: `ponte-bridge.js` and the nine reference renders
// were absent, and the vendored CSS had had its section comments stripped, so it
// failed its own checksum. Nothing caught any of that, and a landing bridge was
// built against a guess as a result.
//
// This is the check that would have caught it on the first commit.
// ---------------------------------------------------------------------------

const BRIDGE = "design/authority/bridge/v1";

if (existsSync(`${BRIDGE}/SOURCE-MANIFEST.md`)) {
  const manifest = readFileSync(`${BRIDGE}/SOURCE-MANIFEST.md`, "utf8");
  // Rows look like: | `ponte-bridge.css` | `90e20b41...` |
  const rows = [...manifest.matchAll(/\|\s*`([^`]+)`\s*\|\s*`([0-9a-f]{64})`\s*\|/g)];
  if (rows.length === 0) failures.push("SOURCE-MANIFEST.md records no checksums at all");

  // Where each manifest name lives in the repository. The manifest names files
  // as the delivered package laid them out; the repository groups them.
  //
  // `ponte-flow/tokens/ponte-flow-tokens.css` used to resolve to the LIVE
  // `design-system/ponte-flow/tokens/ponte-flow-tokens.css`, which made this
  // manifest checksum a shared file the Bridge package does not own. Every
  // authorised palette decision would then have had to edit a record of an
  // owner-approved delivery, and the only way to keep the check green would have
  // been to re-hash the live file after each change: a manifest that moves with
  // the thing it is supposed to pin verifies nothing.
  //
  // ADR-0015 section S-1 decoupled them. The package now carries its own
  // byte-identical snapshot of the token file as delivered on 27 July 2026, at
  // `source/ponte-flow/tokens/ponte-flow-tokens.css`, and the row below verifies
  // that. No special case is needed any more: the default branch already resolves
  // a manifest name inside the package, which is where an approved delivery's
  // files belong. The live token set is governed separately, by the Constitution
  // and ADR-0015.
  const locate = (name) => {
    if (name.endsWith(".md")) return `${BRIDGE}/implementation/${name}`;
    if (name.startsWith("reference/")) return `${BRIDGE}/${name}`;
    return `${BRIDGE}/source/${name}`;
  };

  // The demo driver and the two review documents are deliberately not vendored:
  // the implementation notes say "the demo driver is specification-only and must
  // not ship", and the HTML documents are review artefacts.
  const notVendored = new Set(["ponte-bridge-demos.js", "Ponte Bridge System.html", "Ponte Landing - Bridge.html"]);

  let verified = 0;
  for (const [, name, expected] of rows) {
    if (notVendored.has(name)) continue;
    const path = locate(name);
    if (!existsSync(path)) {
      failures.push(
        `the approved Bridge package is incomplete: ${name} is in SOURCE-MANIFEST.md but ${path} does not exist`,
      );
      continue;
    }
    const actual = createHash("sha256").update(readFileSync(path)).digest("hex");
    if (actual !== expected) {
      failures.push(`${path} does not match its approved checksum (expected ${expected.slice(0, 12)}, got ${actual.slice(0, 12)})`);
    } else {
      verified++;
    }
  }
  if (failures.length === 0) console.log(`ok   approved Bridge package (${verified} files match SOURCE-MANIFEST.md)`);
}

if (failures.length > 0) {
  console.error("Governance contract check failed:\n");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`ok   governance contract (${requiredFiles.length} required files)`);
console.log(`ok   icon law ratchet (${lucideCount} lucide, ${rawSvgCount} authored svg, 1 shared lockup)`);
console.log(`ok   LB-013 route audit (${legacyEditorLinkCount} legacy editor link remaining, baseline pinned)`);