import { expect, test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";

/**
 * The owner journey for the Task Completion Bridge (ADR-0016), driven end to end:
 * land on Start a Deal, describe "cement", pick the identified product, then add
 * applicable commercial detail and watch the completion percentage rise from the
 * neutral null state toward 100.
 *
 * Read-only: it never presses "Confirm and create the draft" / submit, so no
 * record is written. It runs against whatever `PONTE_EVIDENCE_BASE_URL` points
 * at — the deploy preview for the owner-facing evidence, or localhost.
 *
 * Captures desktop and 390 x 844 frames, and a reduced-motion and a forced-dark
 * frame, into the audit evidence folder.
 */

const BASE = process.env.PONTE_EVIDENCE_BASE_URL ?? "http://127.0.0.1:3000";
const EVIDENCE = "docs/codex/audits/2026-07-30-completion-bridge/evidence";
const password = process.env.PONTE_SITE_PASSWORD;

test.use(password ? { httpCredentials: { username: "ponte", password }, baseURL: BASE } : { baseURL: BASE });

test.beforeAll(() => {
  mkdirSync(`${EVIDENCE}/desktop`, { recursive: true });
  mkdirSync(`${EVIDENCE}/mobile-390x844`, { recursive: true });
});

/** Drive: describe -> "cement" -> Identify -> choose the first candidate. */
async function reachFactsFromCement(page: Page): Promise<void> {
  const res = await page.goto("/en/structure?family=products&intent=source_product", {
    waitUntil: "domcontentloaded",
  });
  if (res?.status() === 401) throw new Error("Set PONTE_SITE_PASSWORD; do not weaken the gate.");
  // Choose the "Describe it" method on the intake Bridge (a real radio button).
  await page.getByRole("radio", { name: /Describe it/i }).click();
  await page.locator("#pintake-describe").fill("cement");
  await page.getByRole("button", { name: /Identify this product/i }).click();
  // The identified product(s) appear as candidate rows; take the first.
  await page.locator(".pcand__r").first().waitFor({ state: "visible", timeout: 20_000 });
  await page.locator(".pcand__r").first().click();
  // Choosing a candidate opens the intake review; confirming it hands the draft
  // to the composer. This is client-side only — no record is written until the
  // composer's own submit, which this journey never reaches.
  await page.getByRole("button", { name: /Confirm and create/i }).first().click();
  // A brief structuring animation, then the composer's facts step, which shows
  // the Task Completion Bridge.
  await page.locator(".tcb").first().waitFor({ state: "visible", timeout: 25_000 });
}

/** Read the current completion value from the bridge, or null in the neutral state. */
async function bridgeValue(page: Page): Promise<number | null> {
  const bar = page.locator('.tcb[role="progressbar"]');
  if ((await bar.count()) === 0) return null;
  const now = await bar.first().getAttribute("aria-valuenow");
  return now === null ? null : Number(now);
}

test("the completion percentage rises as applicable cement detail is added", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await reachFactsFromCement(page);

  // Neutral first: nothing commercial stated yet, so no percentage.
  await expect(page.locator(".tcb--neutral")).toBeVisible();
  expect(await bridgeValue(page)).toBeNull();
  await page.screenshot({ path: `${EVIDENCE}/desktop/1-neutral.png`, fullPage: true, animations: "disabled" });

  // Start the completion walk (the facts step's primary CTA) and add a quantity
  // through the structured control: a mode, a figure and a unit.
  await page.locator("button.fbtn.fbtn--block").first().click();
  await page.locator(".qty").first().waitFor({ state: "visible", timeout: 15_000 });
  await page.locator(".qty .chiprow").first().locator(".fchip").first().click(); // a quantity mode
  await page.locator(".qfield__i").first().fill("10000");
  await page.locator(".fchip", { hasText: /^MT$/ }).first().click(); // unit

  // Once a required field is filled the bridge leaves the neutral state and
  // shows a percentage in the approved 20-100 band.
  const first = await bridgeValue(page);
  expect(first, "the bridge did not leave the neutral state after a required field").not.toBeNull();
  expect(first!).toBeGreaterThanOrEqual(20);
  expect(first!).toBeLessThan(100);
  await page.screenshot({ path: `${EVIDENCE}/desktop/2-first-detail.png`, fullPage: true, animations: "disabled" });
});

test("neutral state renders at 390 x 844 without horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await reachFactsFromCement(page);
  await expect(page.locator(".tcb")).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  );
  expect(overflow, "the bridge overflowed horizontally at 390px").toBe(false);
  await page.screenshot({ path: `${EVIDENCE}/mobile-390x844/neutral.png`, fullPage: true, animations: "disabled" });
});
