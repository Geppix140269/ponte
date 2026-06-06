import { defineConfig, devices } from "@playwright/test";

// E2E target: set PONTE_E2E_BASE_URL to a deployed preview/prod URL, or run
// `next build && next start` locally and point at http://localhost:3000.
const baseURL = process.env.PONTE_E2E_BASE_URL || "http://localhost:3000";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: { baseURL, trace: "on-first-retry" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  // Optional: start the app locally when PONTE_E2E_LOCAL=1.
  webServer: process.env.PONTE_E2E_LOCAL
    ? { command: "npm run start", url: "http://localhost:3000", reuseExistingServer: !process.env.CI, timeout: 120_000 }
    : undefined,
});
