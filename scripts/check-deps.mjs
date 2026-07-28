// Are the declared dependencies actually installed?
//
// `npm run verify` type-checks the whole repository, e2e specs and the
// Playwright config included. That is deliberate: an e2e spec that no longer
// compiles is broken, and finding out at evidence time is finding out late.
//
// The cost is that a STALE node_modules produces failures that look like code
// faults. On 28 July 2026 a worktree whose node_modules predated the Playwright
// devDependency emitted 23 TypeScript errors across `e2e/` and
// `playwright.config.ts`, none of which had anything to do with the change
// being verified. The repository was correct; `@playwright/test` was in both
// package.json and package-lock.json. The install was simply old.
//
// So this runs first and says the one true thing: run npm ci. It compares
// declared dependencies against what is present on disk rather than resolving
// versions, because the failure being caught is absence, not drift.

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const pkg = JSON.parse(readFileSync("package.json", "utf8"));
const declared = {
  ...(pkg.dependencies ?? {}),
  ...(pkg.devDependencies ?? {}),
};

const missing = Object.keys(declared).filter(
  (name) => !existsSync(join("node_modules", ...name.split("/"))),
);

if (missing.length > 0) {
  console.error(`Dependency check failed, ${missing.length} declared package(s) not installed:\n`);
  for (const name of missing) {
    console.error(`  ${name}  (declared as ${declared[name]})`);
  }
  console.error(
    "\nnode_modules is out of date with package.json. Run:\n" +
      "\n  npm ci\n" +
      "\nThis is an environment problem, not a repository failure. Type errors in" +
      "\ne2e/ or playwright.config.ts that follow a message like this one are a" +
      "\nconsequence of the missing install and not of the code being verified.",
  );
  process.exit(1);
}

console.log(`ok   dependencies: ${Object.keys(declared).length} declared packages present`);
