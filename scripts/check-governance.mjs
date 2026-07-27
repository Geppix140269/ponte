import { existsSync, readFileSync } from "node:fs";

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

if (failures.length > 0) {
  console.error("Governance contract check failed:\n");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`ok   governance contract (${requiredFiles.length} required files)`);