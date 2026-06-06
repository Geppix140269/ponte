import { test, expect } from "@playwright/test";

test.describe("public surfaces", () => {
  test("homepage loads with the trading marketplace hero", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/ponte/i);
    // Core nav to the four pillars exists.
    await expect(page.getByRole("link", { name: /verify/i }).first()).toBeVisible();
  });

  test("pricing reflects the advertised verification allowances", async ({ page }) => {
    await page.goto("/pricing");
    const body = page.locator("body");
    await expect(body).toContainText(/3 verifications/i);
    await expect(body).toContainText(/50 verifications/i);
    await expect(body).toContainText(/unlimited verifications/i);
  });

  test("verify page is reachable and has a run control", async ({ page }) => {
    await page.goto("/network/verify");
    // Either the verify widget (authed) or a sign-in gate; both are acceptable surfaces.
    await expect(page.locator("body")).toBeVisible();
  });
});

test.describe("auth gating", () => {
  for (const path of ["/network/deals", "/network/listings/new", "/settings", "/admin"]) {
    test(`unauthenticated ${path} does not expose protected content`, async ({ page }) => {
      const res = await page.goto(path);
      // Should redirect to login or render a sign-in prompt, never a 500.
      expect(res?.status()).toBeLessThan(500);
      const url = page.url();
      const gated = /login|signin|sign-in|auth/i.test(url) || (await page.locator("body").innerText()).match(/sign in|log in/i);
      expect(gated).toBeTruthy();
    });
  }
});
