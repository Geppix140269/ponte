// Does any numeric coercion or numeric comparison of a verification level
// survive anywhere in the tree?
//
// Kept as its own file, and out of the TypeScript test, for one reason: a test
// that greps for a pattern will match the pattern it greps for. Holding the
// pattern here, and excluding this file, is simpler and more honest than
// escaping a regex so that it fails to match itself.
//
// The defect this guards was never one bad line. It was one bad idea in twelve
// places: `Number(profile.verification_level)`, which is NaN for every value
// production actually stores, so `NaN < 2` was false and the publication floor
// never fired. Two later shapes of the same idea survived the first sweep and
// were caught by the type checker rather than by a grep:
// `s.verificationLevel >= 2` and `deal.verificationLevel > 0`.
//
// So this matches the idea in all three shapes.

import { execSync } from "node:child_process";

const PATTERNS = [
  // Number(...) applied to a level, in either naming.
  String.raw`Number\([^)]*verification_?[Ll]evel`,
  // A bare numeric comparison against a level, in either naming.
  String.raw`verification_?[Ll]evel[^,;)]*[<>]=?[[:space:]]*[0-9]`,
  // The interim helper this model replaced.
  String.raw`meetsMemberLevel`,
];

const SEARCH = ["app", "lib", "components", "scripts"];
const EXCLUDE = [":(exclude)lib/verification/__tests__/guard.mjs"];

// --untracked, because a file added but not yet committed is exactly where a
// reintroduced coercion would sit when this runs as a pre-commit or local
// check. Without it the guard passes on the very change that breaks the rule.
const cmd =
  `git grep -n --untracked -E "${PATTERNS.join("|")}" -- ` +
  SEARCH.map((s) => `"${s}"`).join(" ") +
  " " +
  EXCLUDE.map((s) => `"${s}"`).join(" ") +
  " || true";

const out = execSync(cmd, { encoding: "utf8" }).trim();

if (out) {
  console.error(
    "Numeric handling of a verification level reappeared:\n\n" +
      out
        .split("\n")
        .map((l) => `  ${l}`)
        .join("\n") +
      "\n\nA verification level is a semantic value. Use levelRank(),\n" +
      "meetsMemberBusinessFloor() or hasEstablishedLevel() from\n" +
      "lib/verification/level.ts. An unrecognised value ranks -1 and fails closed.\n",
  );
  process.exit(1);
}

console.log("ok   no numeric coercion or comparison of a verification level");
