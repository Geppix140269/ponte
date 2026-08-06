import { expect, test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";

/** B01 on the bridge system, both shells, so the pattern is agreed once. */
const OUT = "e2e/evidence/b01-bridge";
test.beforeAll(() => mkdirSync(OUT, { recursive: true }));

async function settle(page: Page) {
  await expect(page.locator(".brg[data-screen='B01']")).toBeVisible();
  await expect(page.locator(".brg-arc svg")).toBeVisible();
  await page.waitForTimeout(1900);
}

for (const shell of [
  { name: "phone", width: 390, height: 844 },
  { name: "desktop", width: 1440, height: 900 },
]) {
  test(`B01, ${shell.name}`, async ({ page }) => {
    await page.setViewportSize({ width: shell.width, height: shell.height });
    await page.goto("/publish");
    await page.evaluate(() => localStorage.removeItem("ponte.structure.draft.v1"));
    await page.goto("/publish");
    await settle(page);
    await page.screenshot({ path: `${OUT}/${shell.name}-1-direction.png`, fullPage: true, animations: "disabled" });

    // Answer, so the ledger appears and the deck advances.
    await page.locator(".brg-zone").first().click();
    await page.waitForTimeout(900);
    await settle(page);
    await page.screenshot({ path: `${OUT}/${shell.name}-2-family.png`, fullPage: true, animations: "disabled" });

    // Distribution, so the position question and the third ledger line show.
    await page.locator(".brg-zone").nth(2).click();
    await page.waitForTimeout(900);
    await settle(page);
    await page.screenshot({ path: `${OUT}/${shell.name}-3-position.png`, fullPage: true, animations: "disabled" });
  });
}
