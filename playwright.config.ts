import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright, scoped to visual evidence for the landing Bridge slice.
 *
 * This is deliberately **not** a test-framework migration. The repository's unit
 * tests are plain `tsx` scripts run by `npm test`, and they stay exactly as they
 * are: this config's `testDir` is one directory containing one spec, and nothing
 * outside it is discovered.
 *
 * It exists because Constitution section 21 requires desktop and 390 x 844
 * evidence on relevant UI pull requests and says technical tests alone are
 * insufficient, and the repository had no way to produce that. A screenshot
 * pasted from someone's machine is not reproducible; this is.
 *
 * ## Why the browser is started here rather than assumed
 *
 * `webServer` builds and serves the app, so the evidence is captured against a
 * production build rather than a dev server with its overlays and Fast Refresh
 * noise. Set `PONTE_EVIDENCE_BASE_URL` to point at a deploy preview instead,
 * which is how the same suite can be run against Netlify.
 *
 * ## Determinism
 *
 * `animations: "disabled"` on every screenshot. Playwright finishes CSS
 * animations and transitions at their end state rather than sampling them
 * mid-flight, which is exactly what the Bridge's authored-end-state contract
 * says the settled frame should be. The one place movement genuinely matters,
 * the gold runner, is captured as an explicit stepped sequence instead.
 */

const baseURL = process.env.PONTE_EVIDENCE_BASE_URL ?? "http://127.0.0.1:3100";

export default defineConfig({
  testDir: "./e2e",
  outputDir: "./e2e/.playwright",
  // Evidence has to be deterministic to be evidence. One worker, no retries: a
  // screenshot that only passes on the second attempt is not a record of
  // anything.
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  timeout: 60_000,
  use: {
    baseURL,
    ...devices["Desktop Chrome"],
    // The captures set their own viewports; this is only the default.
    viewport: { width: 1280, height: 900 },
    deviceScaleFactor: 1,
  },
  webServer: process.env.PONTE_EVIDENCE_BASE_URL
    ? undefined
    : {
        command: "npx next start --port 3100",
        url: "http://127.0.0.1:3100",
        reuseExistingServer: true,
        timeout: 120_000,
      },
});
