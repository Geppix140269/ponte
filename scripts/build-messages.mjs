// Merges messages/_fragments/*.json into messages/en.json.
// Each fragment owns exactly one top-level namespace, so agents and humans can
// work on different areas of the UI without fighting over one large file.
//
//   node scripts/build-messages.mjs
//
import { readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const FRAGMENT_DIR = join("messages", "_fragments");
const OUT = join("messages", "en.json");

if (!existsSync(FRAGMENT_DIR)) {
  console.error(`No fragment directory at ${FRAGMENT_DIR}`);
  process.exit(1);
}

const files = readdirSync(FRAGMENT_DIR)
  .filter((f) => f.endsWith(".json"))
  .sort();

const merged = {};
const owners = {};

for (const file of files) {
  const raw = readFileSync(join(FRAGMENT_DIR, file), "utf8");
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    console.error(`${file} is not valid JSON: ${err.message}`);
    process.exit(1);
  }

  for (const [namespace, value] of Object.entries(parsed)) {
    if (namespace in merged) {
      console.error(
        `Namespace "${namespace}" is claimed by both ${owners[namespace]} and ${file}.`,
      );
      process.exit(1);
    }
    merged[namespace] = value;
    owners[namespace] = file;
  }
}

// Stable key order keeps diffs readable and translation files comparable.
const sorted = Object.fromEntries(
  Object.keys(merged)
    .sort()
    .map((k) => [k, merged[k]]),
);

writeFileSync(OUT, JSON.stringify(sorted, null, 2) + "\n", "utf8");

function countLeaves(node) {
  if (typeof node === "string") return 1;
  return Object.values(node).reduce((n, v) => n + countLeaves(v), 0);
}

console.log(
  `Wrote ${OUT}: ${Object.keys(sorted).length} namespaces, ${countLeaves(sorted)} strings, from ${files.length} fragments.`,
);
