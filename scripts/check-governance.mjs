import { existsSync, readFileSync, readdirSync } from "node:fs";

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
 * `components/ponte/brand/PonteLockup.tsx` is the one permanent entry: the owner
 * ruled the brand lockup an identity asset rather than an interface icon, so it
 * stays an authored SVG. It is listed here rather than exempted so that the
 * count of authored drawings in the product is always visible in one place.
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
  "components/signals/SignalCard.tsx",
  "components/structure/StructureComposer.tsx",
];

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

if (failures.length > 0) {
  console.error("Governance contract check failed:\n");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`ok   governance contract (${requiredFiles.length} required files)`);
console.log(`ok   icon law ratchet (${lucideCount} lucide, ${rawSvgCount} authored svg, 1 shared lockup)`);