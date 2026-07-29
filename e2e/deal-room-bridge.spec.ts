import { expect, test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";

/**
 * Visual evidence for the Multi-party Deal Room Bridge and the Deal Room states.
 *
 * Constitution section 21 requires desktop and 390 x 844 evidence of the states
 * a change touches, and section 18 requires reduced motion to be reviewed. This
 * captures all three for every state of the launch slice.
 *
 * ## Why it runs against the state gallery rather than a real room
 *
 * At Gate B the `deal_room_*` tables exist in no database: applying the
 * migration is a separate Gate C owner decision, and there is no non-production
 * project to apply it to (PL-002). So there is no real room to photograph.
 *
 * `/en/dev/deal-room` renders each state from the real domain - `bridgeModel()`
 * over a step table from `templateFor()`, percentages from
 * `procedureProgress()` - so the evidence is produced by the same code the
 * product runs, and drifts when the rules drift. It 404s in production.
 *
 * ## The site access wall
 *
 * Ponte is behind a temporary Basic-auth wall (`middleware.ts`, 29 July 2026).
 * Only its SHA-256 is committed, so this spec cannot know the password and does
 * not try to. Supply it and the captures run:
 *
 *   PONTE_SITE_PASSWORD=... npx playwright test e2e/deal-room-bridge.spec.ts
 *
 * Without it every request answers 401 and the spec fails fast with that
 * message rather than producing a folder of screenshots of an error page.
 */

const DEV = process.env.PONTE_EVIDENCE_DEV_URL ?? "http://127.0.0.1:3101";
const OUT = "docs/codex/audits/deal-room/evidence";

const STATES = [
  "credible-interest",
  "awaiting-admission",
  "procedure-proposed",
  "procedure-agreed",
  "evidence-in-progress",
  "blocked",
  "ready-to-proceed",
  "read-only",
];

const password = process.env.PONTE_SITE_PASSWORD;

test.use(
  password
    ? { httpCredentials: { username: "ponte", password }, baseURL: DEV }
    : { baseURL: DEV },
);

test.beforeAll(() => {
  mkdirSync(OUT, { recursive: true });
});

async function open(page: Page, state: string): Promise<void> {
  const response = await page.goto(`/en/dev/deal-room?only=${state}`, { waitUntil: "networkidle" });
  if (response?.status() === 401) {
    throw new Error(
      "The site is behind the temporary access wall. Set PONTE_SITE_PASSWORD and run again. " +
        "Do not remove or weaken the wall to capture evidence.",
    );
  }
  // The bridge measures its container and draws in a layout effect, so wait for
  // the deck rather than for a timeout.
  await page.waitForSelector(".br__deck path.d-live", { timeout: 15_000 });
}

test.describe("Deal Room bridge evidence", () => {
  for (const state of STATES) {
    test(`desktop 1280 - ${state}`, async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 900 });
      await open(page, state);
      await page.screenshot({
        path: `${OUT}/desktop-${state}.png`,
        animations: "disabled",
        fullPage: true,
      });
    });

    test(`mobile 390x844 - ${state}`, async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await open(page, state);

      // Constitution section 16: mobile must not create horizontal overflow.
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
      );
      expect(overflow, `${state} overflows horizontally at 390`).toBe(false);

      await page.screenshot({
        path: `${OUT}/mobile-390-${state}.png`,
        animations: "disabled",
        fullPage: true,
      });
    });
  }

  test("reduced motion removes movement rather than slowing it", async ({ browser }) => {
    const context = await browser.newContext({
      reducedMotion: "reduce",
      viewport: { width: 1280, height: 900 },
      baseURL: DEV,
      ...(password ? { httpCredentials: { username: "ponte", password } } : {}),
    });
    const page = await context.newPage();
    await open(page, "evidence-in-progress");

    // `.br--still` is the approved hook: the stylesheet turns every animation
    // off and hides the runner under it.
    await expect(page.locator(".br.brd.br--still")).toHaveCount(1);
    await expect(page.locator(".br__runner")).toHaveCount(0);

    await page.screenshot({ path: `${OUT}/reduced-motion-evidence-in-progress.png`, fullPage: true });
    await context.close();
  });

  test("the accessible name carries the stage, the next stage and the caveat", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await open(page, "evidence-in-progress");

    const label = await page.locator('[role="img"]').first().getAttribute("aria-label");
    expect(label).toContain("Current stage: Evidence and conditions");
    expect(label).toContain("Next stage: Ready to proceed");
    expect(label).toContain("Later stages are not guaranteed");
  });

  test("no percentage is rendered before the procedure is approved", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await open(page, "procedure-proposed");

    const text = await page.locator(".dr").innerText();
    expect(text).toContain("No completion value until the procedure is agreed");
    expect(text).not.toMatch(/\b\d{1,3}%/);
  });

  test("keyboard focus never lands inside the bridge, because it is not interactive", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await open(page, "evidence-in-progress");

    // A non-interactive bridge is a single role="img". Tabbing must skip it
    // entirely rather than trapping a keyboard user among decorative nodes.
    await page.keyboard.press("Tab");
    const insideBridge = await page.evaluate(() => Boolean(document.activeElement?.closest(".br")));
    expect(insideBridge).toBe(false);
  });
});
