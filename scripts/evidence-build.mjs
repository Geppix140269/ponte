// Builds the app for a local visual-evidence run, with the private-site gate
// bypassed, WITHOUT the bypass ever existing in the repository.
//
//   node scripts/evidence-build.mjs
//
// Why this shape rather than a flag in middleware.ts.
//
// Stage 1 of ADR-0015 has to produce rendered desktop and 390 x 844 evidence,
// because the owner required that LB-002 and LB-003 not be closed from token
// calculations alone. The gate stands in front of every route and only its
// SHA-256 verifier is committed, so a local run cannot get past it. The owner
// authorised a bypass in the test environment only, and required that the
// production gate not be changed or exposed.
//
// The first attempt added an env-var-guarded branch to middleware.ts. That was
// wrong, and testing showed why: the sentinel string survived into a plain
// `next build`, which proves `process.env` is read at RUNTIME in the middleware
// bundle, not inlined at build time. A deployed artifact could therefore have been
// talked into bypassing its own gate by setting one variable. The Netlify and
// Vercel markers were only a partial guard, since neither is guaranteed to be
// present in a function runtime.
//
// So the bypass is not committed at all. This script patches middleware.ts on
// disk, builds, and restores the file in a `finally`, then asserts the restored
// content is byte-identical to what it started with. The repository always holds
// the unmodified gate; the bypass exists only inside .next/ on this machine, and
// .next/ is not what Netlify deploys.
//
// If this script is interrupted hard enough to skip the `finally`, the backup is
// left beside the file and the next run refuses to start until it is resolved,
// rather than silently building on a patched gate.

import { readFileSync, writeFileSync, existsSync, unlinkSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";

const FILE = "middleware.ts";
const BACKUP = "middleware.ts.evidence-backup";

const GUARD = "  if (!(await passesSiteGate(request))) {";
const PATCHED = `  // EVIDENCE RUN ONLY. Injected by scripts/evidence-build.mjs and removed before
  // that script exits. This must never be committed: the check below is the
  // production gate and it is not modified, only skipped, and only in a build
  // produced on a developer machine for screenshots.
  if (false && !(await passesSiteGate(request))) {`;

const sha = (s) => createHash("sha256").update(s).digest("hex");

if (existsSync(BACKUP)) {
  console.error(
    `A previous evidence build left ${BACKUP} behind, which means it did not restore\n` +
      `${FILE}. Compare the two by hand, restore the backup if ${FILE} is patched, and\n` +
      `delete the backup. Refusing to build on a possibly patched gate.`,
  );
  process.exit(1);
}

const original = readFileSync(FILE, "utf8");
const originalHash = sha(original);

if (!original.includes(GUARD)) {
  console.error(
    `Could not find the site-gate guard in ${FILE}. It reads:\n\n  ${GUARD}\n\n` +
      `If the gate has been removed because public access was restored, delete this\n` +
      `script and build normally. If it was only reformatted, update GUARD here.`,
  );
  process.exit(1);
}
if (original.includes("if (false &&")) {
  console.error(`${FILE} already contains a bypass. Refusing to patch a patched file.`);
  process.exit(1);
}

let exitCode = 0;
try {
  writeFileSync(BACKUP, original, "utf8");
  writeFileSync(FILE, original.replace(GUARD, PATCHED), "utf8");
  console.log(`patched ${FILE} for the evidence build (gate skipped, not changed)`);

  const build = spawnSync("npx", ["next", "build"], {
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  exitCode = build.status ?? 1;
} finally {
  writeFileSync(FILE, original, "utf8");
  const restoredHash = sha(readFileSync(FILE, "utf8"));
  if (restoredHash !== originalHash) {
    console.error(
      `RESTORE FAILED. ${FILE} does not match what this script started with.\n` +
        `  expected ${originalHash}\n  found    ${restoredHash}\n` +
        `The backup is at ${BACKUP}. Do not commit.`,
    );
    process.exit(1);
  }
  if (existsSync(BACKUP)) unlinkSync(BACKUP);
  console.log(`restored ${FILE}, sha256 ${restoredHash} verified identical`);
}

process.exit(exitCode);
