import { test } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { walk } from "./bridge-walk";

/**
 * Phase 1, recorded at desktop width.
 *
 * Video must be configured at the top level: Playwright binds it to the worker,
 * so it cannot be set inside a describe. Hence one spec per shell rather than
 * one spec with two viewports.
 */
test.use({
  viewport: { width: 1440, height: 900 },
  video: { mode: "on", size: { width: 1440, height: 900 } },
});

test.beforeAll(() => mkdirSync("e2e/evidence/bridge-system", { recursive: true }));

test("the system, desktop", async ({ page }) => {
  await walk(page);
  await page.screenshot({
    path: "e2e/evidence/bridge-system/desktop.png",
    fullPage: true,
    animations: "disabled",
  });
});
