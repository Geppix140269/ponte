// Points git at the tracked hooks in .githooks. Run automatically by the
// package.json "prepare" script on npm install.
//
// Deliberately never fails the install. It runs inside `npm ci` on the build
// server, where a hook is pointless, and inside OneDrive folders where
// `git config` cannot create its lock file. A guard that breaks the build it
// is meant to protect is worse than no guard, so a failure here is a warning.
import { execSync } from "node:child_process";

try {
  execSync("git config core.hooksPath .githooks", { stdio: "ignore" });
  console.log("git hooks enabled from .githooks");
} catch {
  console.warn(
    "could not set core.hooksPath, skipping. Local commit guards are off. " +
      "Run `git config core.hooksPath .githooks` by hand to enable them.",
  );
}
