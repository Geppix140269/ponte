import { expect, test, type Browser, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";

/**
 * Visual evidence and behavioural verification for the AI product intake.
 *
 * Two jobs in one file, on the same reasoning as the landing bridge suite: the
 * evidence is only worth looking at if the behaviour behind it is what it
 * appears to be. A screenshot of an ambiguity screen whose rows do nothing
 * would pass any visual review.
 *
 * **Evidence.** Every state issue #67 names, captured at desktop and at
 * 390 x 844, plus reduced motion, written to a fixed path so a reviewer can
 * open them beside the approved Bridge references. They come from
 * `/dev/product-intake`, which renders each state from a real reducer value:
 * an extraction failure and a blocked file format cannot be produced on demand
 * in a browser, and a screenshot from somebody's machine on a good day is not
 * reproducible evidence.
 *
 * **Verification.** The live journey at `/structure?family=products&intent=...`
 * is exercised for the things a screenshot cannot show: that both product
 * intents open the same intake, that `gas oil` is never a no-op, that browse
 * still reaches the HS drill-down, that no page overflows at four narrow widths,
 * and that reduced motion removes movement without removing information.
 */

const EVIDENCE = "docs/codex/audits/ai-product-intake/evidence";

/** The development server the state gallery is served from. See the config. */
const GALLERY = process.env.PONTE_EVIDENCE_BASE_URL ?? "http://127.0.0.1:3101";

const MOBILE = { width: 390, height: 844 } as const;
const DESKTOP = { width: 1280, height: 900 } as const;

/** Every state, in journey order. Matches the ids in `states.ts`. */
const STATES = [
  "initial",
  "typing",
  "voice",
  "upload",
  "analysing",
  "analysing-document",
  "resolved",
  "candidates",
  "ambiguous",
  "identified",
  "corrected",
  "low-confidence",
  "identified-review",
  "unmatched",
  "browse",
  "extracted",
  "multi-product",
  "multi-product-chosen",
  "extraction-failed",
  "upload-failed",
  "blocked",
  "review",
  "review-document",
  "edited",
  "incomplete",
  "confirmed",
  "draft-created",
  "completed",
  "auth-interrupted",
  "resumed",
] as const;

test.beforeAll(() => {
  mkdirSync(`${EVIDENCE}/desktop`, { recursive: true });
  mkdirSync(`${EVIDENCE}/mobile-390x844`, { recursive: true });
  mkdirSync(`${EVIDENCE}/reduced-motion`, { recursive: true });
});

async function openState(page: Page, id: string): Promise<void> {
  await page.goto(`${GALLERY}/en/dev/product-intake?only=${id}`, { waitUntil: "domcontentloaded" });
  // `section[...]`, not `[...]`: the lifecycle primitive carries its own
  // `data-state`, so the bare attribute selector matches two elements.
  await expect(page.locator(`section[data-state="${id}"]`)).toBeVisible();
  await page.locator(".pintake").first().waitFor({ state: "visible" });
  await settled(page);
}

/**
 * Wait until the Bridge has actually measured itself.
 *
 * The deck is a cubic Bezier and the stations sit at measured fractions of its
 * arc length, so `BridgeRoute` positions them from a layout effect after the
 * ResizeObserver reports a width. Between hydration and that effect the
 * stations are unpositioned and pile up at the left edge.
 *
 * Screenshotting in that window produced a frame that looked exactly like a
 * broken bridge and was nothing of the kind. Waiting for the inline geometry is
 * the difference between evidence and a race: horizontal decks get a `left` on
 * every station, elevation decks get the drawn `.br__vsvg`, and a state with no
 * Bridge at all (the review screens) is settled as soon as it renders.
 */
async function settled(page: Page): Promise<void> {
  await page.waitForFunction(() => {
    const bridges = Array.from(document.querySelectorAll(".pintake .br"));
    if (bridges.length === 0) return true;
    return bridges.every((bridge) => {
      const stations = Array.from(bridge.querySelectorAll<HTMLElement>(".brst"));
      if (stations.length === 0) return true;
      if (bridge.classList.contains("br--v")) return Boolean(bridge.querySelector(".br__vsvg"));
      return stations.every((s) => s.style.left !== "" && s.style.width !== "");
    });
  }, undefined, { timeout: 20_000 });
  // One more frame, so the fitted stage height is applied before the capture.
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
}

// ---------------------------------------------------------------------------
// Evidence
// ---------------------------------------------------------------------------

/*
 * The viewport is set on the CONTEXT, not with `setViewportSize` after the page
 * exists.
 *
 * The Bridge chooses its elevation drawing from `matchMedia` at hydration, and
 * a page created at 1280 and resized to 390 before navigating still hydrated
 * against the wide media state: the first mobile evidence run captured the
 * horizontal deck squeezed into 390px, with the station blocks overlapping. The
 * component was right and the capture was wrong, which is the more dangerous of
 * the two failures because the screenshot looks like a design defect.
 */
async function capture(
  browser: Browser,
  viewport: { width: number; height: number },
  id: string,
): Promise<Page> {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  await openState(page, id);
  return page;
}

test.describe("evidence", () => {
  for (const id of STATES) {
    test(`desktop: ${id}`, async ({ browser }) => {
      const page = await capture(browser, DESKTOP, id);
      await page.locator(".pintake").first().screenshot({
        path: `${EVIDENCE}/desktop/${id}.png`,
        animations: "disabled",
      });
      await page.context().close();
    });

    test(`mobile 390x844: ${id}`, async ({ browser }) => {
      const page = await capture(browser, MOBILE, id);
      // Where the state renders a Bridge, the approved mobile treatment is the
      // Bridge's own elevation drawing, not a narrowed horizontal deck.
      // Asserted, so a capture that silently loses it fails instead of
      // producing a misleading screenshot. The review states carry no Bridge,
      // which is why this is conditional rather than unconditional.
      const bridge = page.locator(".pintake > .br");
      if ((await bridge.count()) > 0) {
        await expect(bridge.first()).toContainClass("br--v");
      }
      // Constitution 16 and 17: mobile must not create horizontal page overflow.
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, `${id} overflows horizontally at 390px by ${overflow}px`).toBeLessThanOrEqual(1);
      await page.screenshot({
        path: `${EVIDENCE}/mobile-390x844/${id}.png`,
        animations: "disabled",
      });
      await page.context().close();
    });
  }
});

test.describe("reduced motion", () => {
  // The states where motion would otherwise be present: a bridge that has just
  // been crossed, and the ones that report work happening now.
  for (const id of ["initial", "ambiguous", "analysing", "multi-product-chosen", "review"] as const) {
    test(`reduced motion: ${id}`, async ({ browser }) => {
      const context = await browser.newContext({ reducedMotion: "reduce", viewport: DESKTOP });
      const page = await context.newPage();
      await openState(page, id);
      await page.locator(".pintake").first().screenshot({
        path: `${EVIDENCE}/reduced-motion/${id}.png`,
        animations: "disabled",
      });
      await context.close();
    });
  }

  test("reduced motion removes movement without removing information", async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: "reduce", viewport: DESKTOP });
    const page = await context.newPage();
    await openState(page, "analysing");
    // The state's words survive: nothing meaningful depended on the animation.
    await expect(page.getByText("Identifying your product")).toBeVisible();
    // Reduced motion is a removal, never a substitution.
    const animated = await page.evaluate(() => {
      const point = document.querySelector(".pst--active .pst__point");
      if (!point) return "no point";
      return getComputedStyle(point).animationName;
    });
    expect(["none", "no point"]).toContain(animated);
    await context.close();
  });

  test("the bridge keeps its stations and its abutments with motion removed", async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: "reduce", viewport: DESKTOP });
    const page = await context.newPage();
    await openState(page, "initial");
    await expect(page.locator(".pintake .br .brst")).toHaveCount(3);
    await expect(page.locator(".pintake .br__ab--l")).toBeVisible();
    await expect(page.locator(".pintake .br__ab--r")).toBeVisible();
    await context.close();
  });
});

// ---------------------------------------------------------------------------
// Verification of the live journey
// ---------------------------------------------------------------------------

async function openIntake(page: Page, intent: "offer_product" | "source_product"): Promise<void> {
  await page.goto(`/en/structure?family=products&intent=${intent}`, { waitUntil: "domcontentloaded" });
  await expect(page.locator(".pintake")).toBeVisible();
  await expect(page.locator(".pintake .br .brst").first()).toHaveAttribute("tabindex", "0");
  await settled(page);
}

test.describe("the live product journey", () => {
  for (const intent of ["offer_product", "source_product"] as const) {
    test(`${intent} opens the same three-station intake`, async ({ page }) => {
      await openIntake(page, intent);
      const stations = page.locator(".pintake > .br .brst");
      await expect(stations).toHaveCount(3);
      await expect(stations.nth(0)).toContainText("Describe it");
      await expect(stations.nth(1)).toContainText("Upload a document");
      await expect(stations.nth(2)).toContainText("Browse categories");
      // No customs code is asked for before anything is understood.
      await expect(page.getByText("No customs code needed to begin")).toBeVisible();
    });
  }

  test("gas oil returns ranked candidates, never a silent no-op", async ({ page }) => {
    await openIntake(page, "offer_product");
    await page.locator(".pintake > .br .brst").nth(0).click();
    await page.locator("#pintake-describe").fill("gas oil");
    await page.getByRole("button", { name: "Identify this product" }).click();

    const rows = page.locator(".pcand__r");
    await expect(rows.first()).toBeVisible({ timeout: 20_000 });
    await expect(rows).toHaveCount(3);
    // Acceptance criterion 3: EN 590 / ULSD leads.
    await expect(rows.first()).toContainText("EN 590");
    // Acceptance criterion 2 and the rejected approach: a question, no guess.
    await expect(page.getByText(/They differ in sulphur content/)).toBeVisible();
    for (let i = 0; i < 3; i++) {
      await expect(rows.nth(i)).not.toHaveAttribute("aria-checked", "true");
    }
    // The suggested classification is marked as downstream, not as settled.
    await expect(rows.first()).toContainText("You confirm it later");
  });

  test("browse still reaches the HS category drill-down", async ({ page }) => {
    await openIntake(page, "offer_product");
    await page.locator(".pintake > .br .brst").nth(2).click();
    await expect(page.locator(".hs__grid").first()).toBeVisible({ timeout: 20_000 });
    await expect(page.locator(".hs__tile").first()).toBeVisible();
  });

  test("the intake is a radiogroup with one tab stop, as the Bridge notes require", async ({ page }) => {
    await openIntake(page, "offer_product");
    const group = page.locator(".pintake > .br");
    await expect(group).toHaveAttribute("role", "radiogroup");
    const tabbable = page.locator('.pintake > .br .brst[tabindex="0"]');
    await expect(tabbable).toHaveCount(1);

    await tabbable.focus();
    await page.keyboard.press("ArrowRight");
    await expect(page.locator('.pintake > .br .brst[aria-checked="true"]')).toContainText("Upload a document");
  });

  test("no horizontal overflow at four narrow widths", async ({ page }) => {
    for (const width of [320, 360, 390, 430]) {
      await page.setViewportSize({ width, height: 844 });
      await openIntake(page, "offer_product");
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, `the intake overflows at ${width}px by ${overflow}px`).toBeLessThanOrEqual(1);
    }
  });

  test("trade services and distribution reach categories, and never the product intake", async ({ page }) => {
    /*
     * The family boundary, asserted from both sides.
     *
     * When this test was first written, ADR-0011 was accepted and unbuilt, so
     * it could only assert the negative: neither family reaches the product
     * intake. ADR-0011 has since merged, and the positive half is now real and
     * checkable. Both halves matter, and for different reasons.
     *
     * The negative is this change's scope boundary: ADR-0012 was authorised for
     * Products only, and a services record acquiring an AI-identified product
     * would be a classification nobody chose.
     *
     * The positive is the reconciliation itself: the two decisions are
     * complementary journeys, and a services member must land on the canonical
     * category taxonomy rather than on nothing at all.
     */
    for (const [family, intent] of [
      ["services", "offer_trade_service"],
      ["distribution", "offer_distribution_or_representation"],
    ] as const) {
      await page.goto(`/en/structure?family=${family}&intent=${intent}`, { waitUntil: "domcontentloaded" });
      await expect(page.locator(".sstep").first()).toBeVisible();
      // ADR-0011: the category-first classification, on the canonical taxonomy.
      await expect(page.locator(".pcat__grid").first()).toBeVisible({ timeout: 20_000 });
      // ADR-0012: not here, and not asked for.
      await expect(page.locator(".pintake")).toHaveCount(0);
      await expect(page.locator(".hs__grid")).toHaveCount(0);
      await expect(page.getByText("Identify this product")).toHaveCount(0);
    }
  });

  test("products reach the intake, and never either category picker", async ({ page }) => {
    // The mirror of the test above. Between them they are the whole routing
    // rule: three families, two journeys, and no family in both.
    await openIntake(page, "offer_product");
    await expect(page.locator(".pcat__grid")).toHaveCount(0);
    await expect(page.locator(".hs__grid")).toHaveCount(0);
  });
});

// ---------------------------------------------------------------------------
// Evidence: the family boundary, one frame per family, at both viewports
// ---------------------------------------------------------------------------

/*
 * Three families side by side, captured from the SAME screen of the SAME
 * composer. What a reviewer is checking here is not that each screen is well
 * made — the two suites either side of this already do that — but that a member
 * arriving at each entrance is asked the question their family's accepted
 * decision says they should be asked, and only that one.
 */
const FAMILY_FRAMES = [
  { id: "products-offer", href: "/en/structure?family=products&intent=offer_product", wait: ".pintake" },
  { id: "products-source", href: "/en/structure?family=products&intent=source_product", wait: ".pintake" },
  { id: "services-offer", href: "/en/structure?family=services&intent=offer_trade_service", wait: ".pcat__grid" },
  { id: "services-seek", href: "/en/structure?family=services&intent=seek_trade_service", wait: ".pcat__grid" },
  {
    id: "distribution-offer",
    href: "/en/structure?family=distribution&intent=offer_distribution_or_representation",
    wait: ".pcat__grid",
  },
  {
    id: "distribution-brands",
    href: "/en/structure?family=distribution&intent=seek_brands_or_products_to_represent",
    wait: ".pcat__grid",
  },
] as const;

test.describe("family routing evidence", () => {
  for (const frame of FAMILY_FRAMES) {
    for (const [label, viewport] of [
        ["desktop", DESKTOP],
        ["mobile-390x844", MOBILE],
      ] as const) {
      test(`${label}: ${frame.id}`, async ({ browser }) => {
        const context = await browser.newContext({ viewport });
        const page = await context.newPage();
        await page.goto(frame.href, { waitUntil: "domcontentloaded" });
        await expect(page.locator(frame.wait).first()).toBeVisible({ timeout: 20_000 });
        await settled(page);
        await page.screenshot({
          path: `${EVIDENCE}/${label}/family-${frame.id}.png`,
          fullPage: true,
          animations: "disabled",
        });
        await context.close();
      });
    }
  }
});
