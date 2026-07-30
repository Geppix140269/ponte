/**
 * Bridge geometry invariance, measured in the browser.
 *
 *   PONTE_EVIDENCE_BASE_URL=http://127.0.0.1:3211 PONTE_EVIDENCE_LABEL=before \
 *     npx playwright test e2e/stage1-bridge-geometry.spec.ts
 *
 * ADR-0015 section S-3 permits contrast changes to the Bridge and requires
 * geometry, station fractions and node sizes to be preserved exactly, verified
 * against re-taken reference evidence.
 *
 * `check-bridge-invariance.mjs` already proves the stylesheet only changed colour.
 * That is necessary and not sufficient: a token change could still move geometry
 * through a computed value, and the deck is drawn by `BridgeRoute.tsx` from a
 * measured curve rather than by CSS. So this reads the RENDERED geometry out of the
 * DOM and writes it to a file, and the two files are compared afterwards.
 *
 * A pixel diff would be the wrong instrument here: the colours are supposed to
 * differ, so an image comparison would report a difference on every changed pixel
 * and prove nothing about the shape.
 */
import { test } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";

const LABEL = process.env.PONTE_EVIDENCE_LABEL ?? "after";
const OUT = `e2e/evidence/stage1/${LABEL}`;
mkdirSync(OUT, { recursive: true });

const VIEWS = [
  { id: "desktop-0-full-composition", w: 1280, h: 900, select: null },
  { id: "desktop-1-family-neutral", w: 1280, h: 900, select: null },
  { id: "desktop-2-products-selected", w: 1280, h: 900, select: 0 },
  { id: "desktop-3-trade-services-selected", w: 1280, h: 900, select: 1 },
  { id: "desktop-4-distribution-selected", w: 1280, h: 900, select: 2 },
  { id: "mobile-1-family-neutral-390x844", w: 390, h: 844, select: null },
  { id: "mobile-2-family-selected-390x844", w: 390, h: 844, select: 0 },
  { id: "mobile-3-action-revealed-390x844", w: 390, h: 844, select: 1 },
];

const geometry: Record<string, unknown> = {};

for (const view of VIEWS) {
  test(`bridge ${view.id} [${LABEL}]`, async ({ page }) => {
    await page.setViewportSize({ width: view.w, height: view.h });
    await page.goto("/", { waitUntil: "networkidle" });
    await page.addStyleTag({
      content: "*,*::before,*::after{animation:none!important;transition:none!important}",
    });
    await page.waitForTimeout(250);

    if (view.select !== null) {
      const stations = page.locator(".brst");
      if ((await stations.count()) > view.select) {
        await stations.nth(view.select).click().catch(() => {});
        // The reveal is deliberate at 420ms; wait past it rather than racing.
        await page.waitForTimeout(900);
      }
    }

    geometry[view.id] = await page.evaluate(() => {
      const round = (n: number) => Math.round(n * 100) / 100;
      const deck = Array.from(document.querySelectorAll(".br__deck path")).map((p) => ({
        cls: p.getAttribute("class"),
        d: p.getAttribute("d"),
        strokeWidth: getComputedStyle(p).strokeWidth,
        dasharray: getComputedStyle(p).strokeDasharray,
      }));
      const svg = document.querySelector(".br__deck");
      const stations = Array.from(document.querySelectorAll(".brst")).map((el) => {
        const r = el.getBoundingClientRect();
        const node = el.querySelector(".brst__n");
        const pier = el.querySelector(".brst__p");
        const nr = node?.getBoundingClientRect();
        const pr = pier?.getBoundingClientRect();
        return {
          left: round(r.left), top: round(r.top), width: round(r.width), height: round(r.height),
          inlineStyleLeft: (el as HTMLElement).style.left || null,
          node: nr ? { w: round(nr.width), h: round(nr.height), left: round(nr.left), top: round(nr.top) } : null,
          pier: pr ? { w: round(pr.width), h: round(pr.height) } : null,
          label: (el.querySelector(".brst__t")?.textContent ?? "").trim(),
        };
      });
      return {
        viewBox: svg?.getAttribute("viewBox") ?? null,
        svgBox: svg ? (() => { const r = svg.getBoundingClientRect(); return { w: round(r.width), h: round(r.height) }; })() : null,
        deck,
        stations,
        runner: (() => {
          const r = document.querySelector(".br__runner") as HTMLElement | null;
          return r ? { offsetPath: getComputedStyle(r).offsetPath, w: r.getBoundingClientRect().width } : null;
        })(),
      };
    });

    await page.screenshot({
      path: `${OUT}/bridge-${view.id}.png`,
      fullPage: false,
      animations: "disabled",
    });
  });
}

test.afterAll(() => {
  writeFileSync(`${OUT}/bridge-geometry.json`, JSON.stringify(geometry, null, 2));
  console.log(`[${LABEL}] bridge geometry written for ${Object.keys(geometry).length} views`);
});
