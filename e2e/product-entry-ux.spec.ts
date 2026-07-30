import { expect, test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";

/**
 * The platform UX launch-gate checks for the product-entry review screen.
 *
 * The review screen was the surface the owner's audit named: a member who typed
 * "cement, 10,000 tonnes" reached a wall of thirteen empty commercial-term rows,
 * each with its own Add control, and a line telling them thirteen terms were
 * "still unstated" — the schema-as-interface pattern the North Star forbids,
 * asking for contract-level detail before any draft exists.
 *
 * This suite proves the remediation behaviourally, not just visually:
 *
 *   1. the review opens on what Ponte understood, NOT on a bank of empty fields;
 *   2. the optional terms are collapsed behind ONE control, so thirteen Add
 *      actions never appear at once;
 *   3. opening that control reveals the optional terms GROUPED into clear
 *      sections, so adding them is an improvement, not a prerequisite.
 *
 * Rendered from the real reducer value at `/dev/product-intake?only=review`, so
 * a state that drifts out of the journey drifts out of this check with it.
 * Captured at desktop and at 390 x 844.
 */

const EVIDENCE = "docs/codex/audits/2026-07-30-platform-ux-audit/evidence";

/** The development server the state gallery is served from. See the config. */
const GALLERY = process.env.PONTE_EVIDENCE_BASE_URL ?? "http://127.0.0.1:3101";

const DESKTOP = { width: 1280, height: 900 } as const;
const MOBILE = { width: 390, height: 844 } as const;

// The temporary private-site gate (middleware.ts) answers 401 without Basic
// auth. The same convention the Deal Room evidence suite uses: supply
// PONTE_SITE_PASSWORD and the wall is passed, never removed or weakened.
const password = process.env.PONTE_SITE_PASSWORD;
test.use(password ? { httpCredentials: { username: "ponte", password } } : {});

test.beforeAll(() => {
  mkdirSync(`${EVIDENCE}/desktop`, { recursive: true });
  mkdirSync(`${EVIDENCE}/mobile-390x844`, { recursive: true });
});

async function openReview(page: Page): Promise<void> {
  const response = await page.goto(`${GALLERY}/en/dev/product-intake?only=review`, {
    waitUntil: "domcontentloaded",
  });
  if (response?.status() === 401) {
    throw new Error(
      "The site is behind the temporary access wall. Set PONTE_SITE_PASSWORD and run again. " +
        "Do not remove or weaken the wall to capture evidence.",
    );
  }
  await page.locator(".pintake").first().waitFor({ state: "visible" });
}

test("the review opens on understanding, not a wall of empty fields", async ({ page }) => {
  await page.setViewportSize(DESKTOP);
  await openReview(page);

  // What Ponte understood is present.
  await expect(page.getByText("Check what Ponte understood", { exact: false })).toBeVisible();

  // The forbidden framing is gone: optional terms are never announced as a
  // problem to be resolved before the draft exists.
  await expect(page.getByText(/terms are still unstated/i)).toHaveCount(0);
  await expect(page.getByText(/Ponte will not guess them/i)).toHaveCount(0);

  // No bank of simultaneous Add actions. The optional terms exist in the DOM but
  // are collapsed, so none of their per-row Add controls is visible; the only
  // Add-style control on screen is the single disclosure toggle.
  await expect(page.locator(".pintake__optbody")).toBeHidden();
  await expect(page.locator(".pintake__optional > button")).toBeVisible();
  const visibleAddRows = page.locator(".prow__e:visible", { hasText: "Add" });
  await expect(visibleAddRows).toHaveCount(0);

  await page.screenshot({
    path: `${EVIDENCE}/desktop/review-collapsed.png`,
    fullPage: true,
    animations: "disabled",
  });
});

test("the optional terms open into clear grouped sections on demand", async ({ page }) => {
  await page.setViewportSize(DESKTOP);
  await openReview(page);

  // A stable locator: the button's label flips to "Hide optional terms" once
  // open, so it is found by position rather than by name.
  const toggle = page.locator(".pintake__optional > button");
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await toggle.click();

  await expect(page.locator(".pintake__optbody")).toBeVisible();
  // Grouped into clear sections, contract detail last.
  await expect(page.getByText("Quantity and delivery", { exact: true })).toBeVisible();
  await expect(page.getByText("Pricing and payment", { exact: true })).toBeVisible();
  await expect(page.getByText("Contract detail", { exact: true })).toBeVisible();
  // And they are optional, stated plainly rather than as a warning.
  await expect(page.getByText(/These are optional/i)).toBeVisible();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");

  await page.screenshot({
    path: `${EVIDENCE}/desktop/review-expanded.png`,
    fullPage: true,
    animations: "disabled",
  });
});

test("the collapsed review holds at 390 x 844 with no horizontal overflow", async ({ page }) => {
  await page.setViewportSize(MOBILE);
  await openReview(page);

  await expect(page.locator(".pintake__optbody")).toBeHidden();
  await expect(page.locator(".pintake__optional > button")).toBeVisible();

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  );
  expect(overflow, "the review overflowed horizontally at 390px").toBe(false);

  await page.screenshot({
    path: `${EVIDENCE}/mobile-390x844/review-collapsed.png`,
    fullPage: true,
    animations: "disabled",
  });
});
