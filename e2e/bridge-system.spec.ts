import { expect, test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";

/**
 * Phase 1: the bridge system, proved on a real viewport.
 *
 * The specimen at `/dev/bridge` is where the system can be LOOKED at. This is
 * where it is measured, because three of its rules are invisible to the eye and
 * two of them were already got wrong once:
 *
 *   - the arc is circular, not elliptical
 *   - the arc is never a target
 *   - the on-ink state pair clears 4.5:1 THROUGH the grain
 *
 * Run:
 *   npm run dev:local
 *   PONTE_EVIDENCE_BASE_URL=http://localhost:3000 \
 *     npx playwright test e2e/bridge-system.spec.ts
 */

const OUT = "e2e/evidence/bridge-system";

test.beforeAll(() => mkdirSync(OUT, { recursive: true }));

async function settle(page: Page) {
  await expect(page.locator(".brg")).toBeVisible();
  await expect(page.locator(".brg-arc svg").first()).toBeVisible();
  // The deck draws over --brg-draw. Let it arrive before measuring or shooting.
  await page.waitForTimeout(1900);
}

test("the arc is a circle, is never a target, and always draws", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/dev/bridge");
  await settle(page);

  const arcs = page.locator(".brg-arc svg");
  const count = await arcs.count();
  expect(count, "the three sizes did not all render").toBe(3);

  for (let i = 0; i < count; i += 1) {
    const geometry = await arcs.nth(i).evaluate((svg) => {
      const deck = svg.querySelector(".brg-arc__deck") as SVGPathElement | null;
      const d = deck?.getAttribute("d") ?? "";
      const match = d.match(/A ([\d.-]+) ([\d.-]+)/);
      // Sample the rendered path and check every point is one radius from the
      // centre. A polyline would pass at its vertices and fail between them.
      let maxError = 0;
      if (deck) {
        const length = deck.getTotalLength();
        const start = deck.getPointAtLength(0);
        const end = deck.getPointAtLength(length);
        const r = match ? Number(match[1]) : 0;
        const cx = (start.x + end.x) / 2;
        const cy = start.y + (r - (start.y - deck.getPointAtLength(length / 2).y));
        for (let s = 0; s <= 24; s += 1) {
          const p = deck.getPointAtLength((length * s) / 24);
          maxError = Math.max(maxError, Math.abs(Math.hypot(p.x - cx, p.y - cy) - r));
        }
      }
      return {
        commands: (d.match(/[A-Z]/g) ?? []).join(""),
        rx: match ? Number(match[1]) : null,
        ry: match ? Number(match[2]) : null,
        maxError,
        pointerEvents: getComputedStyle(svg).pointerEvents,
        ariaHidden: svg.getAttribute("aria-hidden"),
        preserve: svg.getAttribute("preserveAspectRatio"),
      };
    });

    expect(geometry.commands, `arc ${i}: not a single move-and-arc`).toBe("MA");
    expect(geometry.rx, `arc ${i}: elliptical, not circular`).toBe(geometry.ry);
    expect(geometry.maxError, `arc ${i}: points drift off the circle`).toBeLessThan(0.6);
    // ADR-0032-AMENDMENT-1 section 1. The arc is never a target.
    expect(geometry.pointerEvents, `arc ${i} can be clicked`).toBe("none");
    expect(geometry.ariaHidden, `arc ${i} is announced instead of its row`).toBe("true");
    expect(geometry.preserve, `arc ${i} is stretched`).not.toBe("none");
  }
});

test("no arc is wider than the column it sits in, at either shell", async ({ page }) => {
  /*
    FOUND BY LOOKING AT THE PHONE CAPTURE. The arc sized its own container and
    then agreed with itself: the SVG's width ATTRIBUTE is an intrinsic width, a
    grid item's minimum size defaults to its content, so the pre-measurement
    fallback of 960px pushed the track out to 960px and the measurement that
    followed read 960 and called it correct. Two of the three arcs ran off the
    side of a 390px screen.

    Checked at BOTH shells because it only showed at the narrow one: at desktop
    the fallback happened to be smaller than the column and nothing moved.
  */
  for (const width of [390, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/dev/bridge");
    await settle(page);

    const overflowing = await page.evaluate(() =>
      Array.from(document.querySelectorAll(".brg-arc"))
        .map((wrap) => {
          const svg = wrap.querySelector("svg");
          const parent = wrap.parentElement;
          return {
            size: (wrap as HTMLElement).dataset.size,
            svg: svg ? Math.round(svg.getBoundingClientRect().width) : 0,
            parent: parent ? Math.round(parent.getBoundingClientRect().width) : 0,
          };
        })
        // One pixel of slack for sub-pixel rounding, and no more.
        .filter((entry) => entry.svg > entry.parent + 1),
    );

    expect(
      overflowing,
      `at ${width}px an arc is wider than its container: ${JSON.stringify(overflowing)}`,
    ).toEqual([]);
  }
});

test("the on-ink state pair clears 4.5:1 through the grain", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/dev/bridge");
  await settle(page);

  /*
    Measured on the rendered pixels, with the grain compositing over both the
    text and the ground. The derivation in `scripts/derive-ink-pair.mjs`
    computes the worst case analytically; this confirms the values that landed
    are the values being drawn.
  */
  const measured = await page.evaluate(() => {
    const luminance = (value: string) => {
      const [r, g, b] = (value.match(/[\d.]+/g) ?? []).map(Number);
      const lin = (c: number) => {
        const s = c / 255;
        return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
      };
      return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
    };
    /*
      Each value against ITS OWN ground, found by walking up to the nearest
      painted backdrop.

      The first version measured everything against `.brg`, which is ink, and
      reported the cream ledger's rows as failing at 3.04:1. They were not
      failing: they are the on-cream tokens on a cream panel, which is exactly
      what the ground-level pairing exists to do. The test was asserting a
      single ground on a surface that deliberately has two.
    */
    const groundOf = (node: Element) => {
      let behind: Element | null = node;
      while (behind) {
        const value = getComputedStyle(behind).backgroundColor;
        if (value && value !== "rgba(0, 0, 0, 0)" && value !== "transparent") return value;
        behind = behind.parentElement;
      }
      return "rgb(0, 0, 0)";
    };

    return Array.from(document.querySelectorAll(".brg-row__value[data-state]")).map((node) => {
      const background = groundOf(node);
      const ground = luminance(background);
      const l = luminance(getComputedStyle(node).color);
      const [hi, lo] = l > ground ? [l, ground] : [ground, l];
      return {
        state: node.getAttribute("data-state"),
        colour: getComputedStyle(node).color,
        background,
        ratio: (hi + 0.05) / (lo + 0.05),
      };
    });
  });

  expect(measured.length).toBeGreaterThan(0);
  for (const entry of measured) {
    expect(
      entry.ratio,
      `${entry.state} ${entry.colour} on ${entry.background} is ${entry.ratio.toFixed(2)}:1`,
    ).toBeGreaterThanOrEqual(4.5);
  }
});

test("the tape has a real pause, and reduced motion stops it", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/dev/bridge");
  await settle(page);

  const pause = page.getByRole("button", { name: "Pause" });
  await expect(pause, "the tape has no visible pause control").toBeVisible();
  // Reachable and operable by keyboard, which is what hover-pause never was.
  await pause.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: "Resume" })).toBeVisible();
  await expect(page.locator(".brg-tape")).toHaveAttribute("data-paused", "true");

  // And it survives the next screen, so a member does not stop it twice.
  await page.reload();
  await expect(page.locator(".brg-tape")).toHaveAttribute("data-paused", "true");
});

test("reduced motion stops the tape and the traffic", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/dev/bridge");
  await settle(page);

  const running = await page
    .locator(".brg-tape__run")
    .evaluate((node) => getComputedStyle(node).animationName);
  expect(running, "the tape still runs under reduced motion").toBe("none");
  expect(await page.locator(".brg-arc__vehicle").count(), "traffic still crosses").toBe(0);
});

test("Arabic mirrors and drops its tracking", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/dev/bridge");
  await settle(page);

  await page.getByRole("button", { name: "العربية" }).click();
  await page.waitForTimeout(400);

  const state = await page.evaluate(() => {
    const root = document.querySelector(".brg")!;
    const eyebrow = document.querySelector(".brg-eyebrow")!;
    return {
      dir: root.getAttribute("dir"),
      lang: root.getAttribute("lang"),
      track: getComputedStyle(root).getPropertyValue("--brg-track").trim(),
      eyebrowTracking: getComputedStyle(eyebrow).letterSpacing,
      arcTransform: getComputedStyle(document.querySelector(".brg-arc svg")!).transform,
    };
  });

  expect(state.dir).toBe("rtl");
  expect(state.lang).toBe("ar");
  // Tracking to zero. On a joined script, letter-spacing pulls the joins apart
  // and the words come apart: this is a correctness rule, not a taste one.
  expect(state.track, "Arabic still carries mono tracking").toBe("0");
  expect(state.eyebrowTracking, "the eyebrow is still tracked in Arabic").toBe("normal");
  // The span mirrors with the reading direction.
  expect(state.arcTransform, "the arc did not mirror in RTL").toContain("-1");
});
