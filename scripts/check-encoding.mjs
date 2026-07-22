// Guards the three text faults that have actually reached production here.
//
//   node scripts/check-encoding.mjs
//
// 1. UTF-8 BOM. Six files carried one. A BOM is the fingerprint of an editor
//    that read a UTF-8 file as cp1252 and saved it back, which is what
//    produced fault 2. Catching the BOM catches the cause, not the symptom.
//
// 2. Mojibake. UTF-8 bytes rendered as cp1252 and re-encoded, so an em dash
//    becomes "a EUR-sign quote" and a middle dot becomes "A-circumflex dot".
//    A member saw one of these on their account page.
//
// 3. Em dashes, in app/ and components/. Banned in Ponte copy. Every mojibake
//    instance found on 2026-07-22 was a double-encoded em dash, so the
//    encoding fault and the style rule are the same fault twice.
//
// messages/ is already covered for em dashes by check-messages.mjs, and is
// checked here for BOM and mojibake only, so the two scripts do not disagree.
// lib/, scripts/, docs/ and supabase/ are engineering prose that never renders,
// and are checked for BOM and mojibake but not for em dashes.
//
// Exits non-zero on any failure, so it can gate a build.
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const EM_DASH = "—";
const BOM = "﻿";

// Only where copy lives. Widening this to the whole repo would fail on SQL
// comments and brief documents that no reader ever sees.
const EM_DASH_DIRS = ["app/", "components/"];

const TEXT = /\.(ts|tsx|js|mjs|cjs|json|md|css|html|sql|yml|yaml)$/;

// A mojibake run starts with the lead byte of a UTF-8 sequence seen as cp1252.
// Checking for the lead character alone would fire on legitimate French or
// Portuguese text, so it must be followed by a continuation-byte character,
// which is what a real multi-byte sequence always produces.
const MOJIBAKE = /[Â-ßà-ïð-ô][- -¿€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ]/;

// Walked from disk rather than asked of `git ls-files`, so the check runs the
// same way in CI, in a hook, and on a machine where git is not on PATH.
const SKIP = new Set([".git", "node_modules", ".next", "out", "build", ".netlify"]);

function walk(dir, acc = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(entry.name)) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) walk(path, acc);
    else if (TEXT.test(entry.name)) acc.push(path.split("\\").join("/"));
  }
  return acc;
}

const files = walk(".").map((f) => f.replace(/^\.\//, ""));

const problems = [];

for (const file of files) {
  let text;
  try {
    text = readFileSync(file, "utf8");
  } catch {
    continue;
  }

  if (text.startsWith(BOM)) {
    problems.push(`${file}:1  starts with a UTF-8 BOM`);
  }

  const lines = text.split("\n");
  lines.forEach((line, i) => {
    const m = line.match(MOJIBAKE);
    if (m) {
      problems.push(
        `${file}:${i + 1}  mojibake ${JSON.stringify(m[0])} in: ${line.trim().slice(0, 70)}`,
      );
    }
    if (EM_DASH_DIRS.some((d) => file.startsWith(d)) && line.includes(EM_DASH)) {
      problems.push(
        `${file}:${i + 1}  em dash in: ${line.trim().slice(0, 70)}`,
      );
    }
  });
}

if (problems.length) {
  console.error(`Encoding check failed, ${problems.length} problem(s):\n`);
  for (const p of problems) console.error(`  ${p}`);
  console.error(
    "\nBOM: re-save the file as UTF-8 without a signature." +
      "\nMojibake: the file was saved through a cp1252 round trip; repair the characters." +
      "\nEm dash: rewrite the sentence. Use a comma, a colon, or two sentences.",
  );
  process.exit(1);
}

console.log(`ok   ${files.length} text files: no BOM, no mojibake, no em dashes in app/ or components/`);
