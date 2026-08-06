import { test } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { walk } from "./bridge-walk";

/**
 * Phase 1, recorded at 390px.
 *
 * Video must be configured at the top level: Playwright binds it to the worker,
 * so it cannot be set inside a describe. Hence one spec per shell rather than
 * one spec with two viewports.
 */
test.use({
  viewport: { width: 390, height: 844 },
  video: { mode: "on", size: { width: 390, height: 844 } },
});

test.beforeAll(() => mkdirSync("e2e/evidence/bridge-system", { recursive: true }));

test("the system, phone", async ({ page }) => {
  await walk(page);
  await page.screenshot({
    path: "e2e/evidence/bridge-system/phone.png",
    fullPage: true,
    animations: "disabled",
  });
});
