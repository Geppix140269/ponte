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
  /**
   * Two servers, for two different jobs.
   *
   * 3100 is the production build, which is what the landing evidence is
   * captured against and must stay that way.
   *
   * 3101 is a development server, and it exists for one reason: the product
   * intake state gallery at `/dev/product-intake` 404s in production, exactly
   * like the Ponte Flow specimen sheet, and several of that journey's states
   * (a blocked file format, an extraction failure, a resumed session) cannot be
   * produced on demand in a browser any other way. Constitution section 21 asks
   * for evidence of the states a change touches, so the evidence run reaches
   * them through the route that renders them rather than by weakening the
   * production gate with an environment escape hatch.
   *
   * The markup is the same in both modes; only the dev overlay differs, and it
   * is outside every capture's clip.
   */
  webServer: process.env.PONTE_EVIDENCE_BASE_URL
    ? undefined
    : [
        {
          command: "npx next start --port 3100",
          url: "http://127.0.0.1:3100",
          reuseExistingServer: true,
          timeout: 120_000,
        },
        {
          command: "npx next dev --port 3101",
          url: "http://127.0.0.1:3101/en/dev/product-intake?only=initial",
          reuseExistingServer: true,
          timeout: 180_000,
          // Its own build directory. Both servers write to `distDir`, so
          // sharing `.next` meant the dev server cleared the production build
          // out from under `next start` and every capture failed on a missing
          // build id. `next.config.mjs` reads this and defaults to `.next`
          // everywhere else.
          env: { PONTE_DIST_DIR: ".next-evidence" },
        },
      ],
});
