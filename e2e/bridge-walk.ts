import { expect, type Page } from "@playwright/test";

/**
 * The walk both recordings take.
 *
 * Shared because the phone and the desktop must record the SAME journey: a
 * recording of two different walks proves the two shells look different, which
 * nobody doubted, rather than that they carry the same content, which is the
 * actual claim.
 */
export async function settle(page: Page): Promise<void> {
  await expect(page.locator(".brg")).toBeVisible();
  await expect(page.locator(".brg-arc svg").first()).toBeVisible();
  // The deck draws over --brg-draw. Let the opening crossing arrive.
  await page.waitForTimeout(1900);
}

export async function walk(page: Page): Promise<void> {
  await page.goto("/dev/bridge");
  await settle(page);

  // The deck drawing itself is the one thing a still cannot show, and it is why
  // a recording was asked for. Move the crossing back and forth so the span
  // extends and retracts on camera.
  for (const step of [4, 1, 3, 0, 2]) {
    await page.getByRole("button", { name: new RegExp(`^0${step}`) }).click();
    await page.waitForTimeout(900);
  }

  // Then the scripts, so the Arabic mirroring is on the recording too: the
  // shell, the tape and the span all turn together.
  for (const script of ["Русский", "中文", "العربية", "English"]) {
    await page.getByRole("button", { name: script }).click();
    await page.waitForTimeout(1200);
  }
}
