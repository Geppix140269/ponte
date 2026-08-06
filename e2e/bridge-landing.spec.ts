import { expect, test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";

/**
 * The entrance, on the bridge, at all three shells.
 *
 * ## What this asserts that a screenshot cannot
 *
 * **That the arch is an arch.** The rise is measured off the rendered path and
 * divided by the chord, at every width. That is the property the fixed 126px
 * rise failed at 2560 and passed at 1440, which is why it survived every proof
 * we had: the shape was only ever photographed where it happened to work.
 *
 * A ratio floor of 0.12 is not a taste threshold. Below it the curve stops
 * reading as a span and starts reading as a wire between two poles, which is
 * the thing the owner saw and named.
 */

const OUT = "e2e/evidence/bridge-landing";

const SHELLS = [
  { name: "phone", width: 390, height: 844 },
  { name: "desktop", width: 1440, height: 900 },
  { name: "wide", width: 2560, height: 1440 },
];

test.beforeAll(() => mkdirSync(OUT, { recursive: true }));

/** The chord and the rise, read off the path the browser actually drew. */
async function archOf(page: Page) {
  return page.evaluate(() => {
    const path = document.querySelector(".brg-arc__ghost") as SVGPathElement | null;
    if (!path) return null;
    // The A command carries the radius; the M and the end point carry the
    // chord. Reading the geometry back out of the DOM rather than recomputing
    // it is the point: this is what was rendered, not what was intended.
    const d = path.getAttribute("d") ?? "";
    const nums = d.match(/-?[\d.]+/g)?.map(Number) ?? [];
    const [x0, y0, r] = [nums[0], nums[1], nums[2]];
    const x1 = nums[nums.length - 2];
    const chord = x1 - x0;
    // Rise from the chord and the radius: h = R - sqrt(R^2 - (c/2)^2).
    const rise = r - Math.sqrt(Math.max(r * r - (chord / 2) * (chord / 2), 0));
    const box = path.getBoundingClientRect();
    return { chord, rise, ratio: rise / chord, drawnHeight: Math.round(box.height), y0 };
  });
}

for (const shell of SHELLS) {
  test(`the entrance, ${shell.name}`, async ({ page }) => {
    await page.setViewportSize({ width: shell.width, height: shell.height });
    await page.goto("/");

    await expect(page.locator(".brg[data-screen='LANDING']")).toBeVisible();
    await expect(page.locator(".brg-arc svg")).toBeVisible();

    // One chrome, not two. A rebuilt route leaves the bared list at the moment
    // it adopts the masthead, and never carries both.
    await expect(page.locator(".brg-mast")).toHaveCount(1);
    await expect(page.locator(".ponte-desk")).toHaveCount(0);

    // The headline is painted the bridge cream, not the retired chrome's ink.
    const painted = await page.evaluate(() => {
      const h1 = document.querySelector(".brg-headline");
      const em = document.querySelector(".brg-headline em");
      return {
        headline: h1 ? getComputedStyle(h1).color : null,
        size: h1 ? Math.round(Number.parseFloat(getComputedStyle(h1).fontSize)) : null,
        accent: em ? getComputedStyle(em).color : null,
      };
    });
    expect(painted.headline, "the headline is not the bridge cream").toBe("rgb(242, 239, 230)");
    expect(painted.accent, "the accent is not the bridge bronze").toBe("rgb(199, 154, 76)");

    // THE ARCH. Measured, at every width, off what was drawn.
    const arch = await archOf(page);
    expect(arch, "no arch was drawn").not.toBeNull();
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const { chord, rise, ratio } = arch!;
    expect(
      ratio,
      `${shell.name}: a chord of ${Math.round(chord)} rises ${Math.round(rise)}, a ratio of ${ratio.toFixed(3)}. That is a wire, not an arch.`,
    ).toBeGreaterThanOrEqual(0.12);
    expect(ratio, `${shell.name}: ratio ${ratio.toFixed(3)} is an aqueduct`).toBeLessThanOrEqual(
      0.32,
    );

    // Display type scales with the viewport rather than staying at its 1440 size.
    if (shell.width >= 1920) {
      expect(painted.size ?? 0, "the headline did not grow at 2560").toBeGreaterThan(60);
    }

    await page.mouse.move(0, 0);
    // The deck draws over --brg-draw; let the opening crossing arrive.
    await page.waitForTimeout(2400);
    await page.screenshot({
      path: `${OUT}/${shell.name}-landing.png`,
      fullPage: true,
      animations: "disabled",
    });
  });
}
