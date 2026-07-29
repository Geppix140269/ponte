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

// A required rule is a sentence, and a sentence in a Markdown file is wrapped
// wherever the line happened to run out. `includes()` compares bytes, so it reads
// a line break as a difference in the prose.
//
// That is not hypothetical. This check failed on `main` because AGENTS.md wraps
//
//   "Use `None` explicitly when a section has no entries. No additional cleanup,
//    refactoring or adjacent improvement is authorised merely because ..."
//
// after "No additional cleanup,", so the required snippet spanned a newline and
// never matched. `npm run verify` could not pass, and the rule the check exists to
// enforce was fully present and correctly worded the whole time.
//
// The fix belongs here rather than in AGENTS.md. Reflowing the paragraph would
// have made this pass today and broken again the next time anyone re-wrapped a
// governance document, which is exactly the kind of silent breakage a governance
// check should not have. So both sides are compared with runs of whitespace
// collapsed to a single space: the rule has to be present and worded exactly, and
// it no longer has to be laid out exactly.
//
// Only whitespace is normalised. Wording, punctuation and case are still compared
// byte for byte, so this cannot make a missing or altered rule pass.
const flatten = (text) => text.replace(/\s+/g, " ").trim();

function requireText(relativePath, content, snippets) {
  const flatContent = flatten(content);
  for (const snippet of snippets) {
    if (!flatContent.includes(flatten(snippet))) {
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
