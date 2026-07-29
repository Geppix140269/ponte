import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];

function read(relativePath) {
  const absolutePath = path.join(root, relativePath);
  if (!fs.existsSync(absolutePath)) {
    failures.push(`missing required launch-mode file: ${relativePath}`);
    return "";
  }
  return fs.readFileSync(absolutePath, "utf8");
}

/**
 * Whitespace as Markdown itself treats it: any run of it is one space.
 *
 * The required sentences below are prose in wrapped Markdown, and a literal
 * `includes()` made this check depend on where the line breaks fell. It broke
 * on exactly that: AGENTS.md wraps "No additional cleanup, refactoring or
 * adjacent improvement is authorised" after the comma, so the sentence WAS
 * present, at AGENTS.md:128-129, and the check reported it missing. Because
 * this is the sixth step of `npm run verify`, the mandatory gate could not
 * complete for any task on `main` until a governance document was re-wrapped to
 * suit a string comparison.
 *
 * Normalising both sides makes the check assert what it means - that the
 * sentence is there - rather than how the file happens to be laid out. It only
 * ever widens what matches: every snippet that matched before still matches,
 * because collapsing whitespace cannot separate text that was already adjacent.
 */
const flattenWhitespace = (text) => text.replace(/\s+/g, " ");

function requireText(relativePath, content, snippets) {
  const flattened = flattenWhitespace(content);
  for (const snippet of snippets) {
    if (!flattened.includes(flattenWhitespace(snippet))) {
      failures.push(`${relativePath} is missing required text: ${snippet}`);
    }
  }
}

const agents = read("AGENTS.md");
const blockers = read("docs/launch/LAUNCH-BLOCKERS.md");
const backlog = read("docs/launch/POST-LAUNCH-BACKLOG.md");
const launchReadme = read("docs/launch/README.md");
const prTemplate = read(".github/pull_request_template.md");

requireText("AGENTS.md", agents, [
  "## Launch Mode — mandatory delivery policy",
  "Discovery is not approval.",
  "docs/launch/LAUNCH-BLOCKERS.md",
  "docs/launch/POST-LAUNCH-BACKLOG.md",
  "No additional cleanup, refactoring or adjacent improvement is authorised",
]);

requireText("docs/launch/LAUNCH-BLOCKERS.md", blockers, [
  "## Active blockers",
  "## Resolved blockers",
  "Resolution PR",
  "Verification",
]);

requireText("docs/launch/POST-LAUNCH-BACKLOG.md", backlog, [
  "## Open tickets",
  "## Completed tickets",
  "GitHub issue",
  "Risk if deferred",
]);

requireText("docs/launch/README.md", launchReadme, [
  "## Mandatory decision rule",
  "## Required task opening",
  "## Required task closing",
  "## Prohibited behaviour",
]);

requireText(".github/pull_request_template.md", prTemplate, [
  "## Launch Mode classification",
  "## Launch Blockers discovered",
  "## Post-Launch Tickets created or updated",
  "## Production changes",
  "## Scope confirmation",
  "No non-blocking discovery was implemented without explicit owner authorisation",
]);

if (failures.length > 0) {
  console.error("Launch Mode governance check failed:\n");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Launch Mode governance check passed.");
