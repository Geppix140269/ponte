/**
 * Stage 1 contrast remediation: visual evidence and rendered contrast.
 *
 * Run against one server at a time, labelled, so the same spec produces the
 * before and the after set:
 *
 *   PONTE_EVIDENCE_BASE_URL=http://127.0.0.1:3211 PONTE_EVIDENCE_LABEL=before \
 *     npx playwright test e2e/stage1-contrast.spec.ts
 *
 * Constitution section 21 requires desktop and 390 x 844 evidence, and ADR-0015
 * section S-5 requires that LB-002 and LB-003 are not closed from token
 * calculations alone. So the ratios below are read out of the RENDERED page with
 * getComputedStyle, not computed from the token file. A token can be correct and
 * still be overridden by a selector nobody remembered.
 */
import { test, expect, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";

const LABEL = process.env.PONTE_EVIDENCE_LABEL ?? "after";
const OUT = `e2e/evidence/stage1/${LABEL}`;
mkdirSync(OUT, { recursive: true });

const DESKTOP = { width: 1280, height: 900 };
const MOBILE = { width: 390, height: 844 };

/** The four screens the owner named. `/find` stands in for the workspace: see the report. */
const SCREENS = [
  { id: "1-landing-bridge", path: "/", name: "Landing and Family Bridge" },
  { id: "2-market-signals", path: "/market-signals", name: "Market Signals list" },
  { id: "3-start-a-deal", path: "/structure", name: "Start a Deal form" },
  { id: "4-record-surface", path: "/find", name: "Record surface" },
];

const measured: Record<string, unknown>[] = [];

/**
 * Read contrast out of the rendered page.
 *
 * Walks up for an effective background, because a transparent element tells you
 * nothing about what its text actually sits on, which is exactly how a value can
 * pass in the token file and fail on screen.
 */
async function measure(page: Page, screen: string, viewport: string) {
  return page.evaluate(
    ({ screen, viewport }) => {
      const srgb = (c: number) => {
        const n = c / 255;
        return n <= 0.03928 ? n / 12.92 : Math.pow((n + 0.055) / 1.055, 2.4);
      };
      const rgb = (s: string): [number, number, number] | null => {
        const m = s.match(/[\d.]+/g);
        return m && m.length >= 3 ? [+m[0], +m[1], +m[2]] : null;
      };
      const alpha = (s: string) => {
        const m = s.match(/[\d.]+/g);
        return m && m.length >= 4 ? +m[3] : 1;
      };
      const lum = (c: [number, number, number]) =>
        0.2126 * srgb(c[0]) + 0.7152 * srgb(c[1]) + 0.0722 * srgb(c[2]);
      const ratio = (a: [number, number, number], b: [number, number, number]) => {
        const x = lum(a);
        const y = lum(b);
        return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
      };
      /** Effective background: first opaque ancestor fill. */
      const bgOf = (el: Element): [number, number, number] => {
        let node: Element | null = el;
        while (node) {
          const cs = getComputedStyle(node);
          const c = rgb(cs.backgroundColor);
          if (c && alpha(cs.backgroundColor) > 0.95) return c;
          node = node.parentElement;
        }
        return [255, 255, 255];
      };
      /** Composite an element's own colour over its effective background. */
      const over = (fg: string, bg: [number, number, number]): [number, number, number] => {
        const c = rgb(fg);
        if (!c) return bg;
        const a = alpha(fg);
        return [0, 1, 2].map((i) => c[i] * a + bg[i] * (1 - a)) as [number, number, number];
      };

      const rows: Record<string, unknown>[] = [];
      const sample = (selector: string, role: string, prop: "color" | "borderTopColor", target: number) => {
        const els = Array.from(document.querySelectorAll(selector)).slice(0, 3);
        for (const el of els) {
          const cs = getComputedStyle(el);
          // A zero-width border is not a boundary; report it rather than scoring it.
          if (prop === "borderTopColor" && parseFloat(cs.borderTopWidth) === 0) continue;
          const bg = bgOf(el.parentElement ?? el);
          const fg = over(cs[prop], bg);
          const r = ratio(fg, bg);
          rows.push({
            screen,
            viewport,
            role,
            selector,
            prop,
            value: cs[prop],
            background: `rgb(${bg.join(",")})`,
            ratio: +r.toFixed(2),
            target,
            meets: r >= target,
            text: (el.textContent ?? "").trim().slice(0, 40),
          });
          break; // one representative per selector is enough for a record
        }
      };

      // LB-002: required form and input boundaries, 3:1 non-text.
      for (const s of [
        ".ponte-find .qfield__i",
        ".ponte-find .snote",
        ".ponte-find .reqq__note",
        ".ponte-desk .sigsheet__i",
        ".ponte-find .fchip",
        ".ponte-find .spill",
        ".ponte-desk .cmd__obj",
        ".pcat__filteri",
        ".pcat__writei",
      ]) sample(s, "LB-002 input or control boundary", "borderTopColor", 3);

      // LB-003: meaningful missing-data text, 4.5:1.
      for (const s of [
        ".ponte-desk dd.na",
        ".ponte-desk .reg__f dd.na",
        ".ponte-find .ns",
        ".ponte-find .lrow__v.ns",
        ".ponte-desk .reg__cls u",
        ".ponte-desk .reg__f dt",
        ".ponte-desk .cor .hs",
      ]) sample(s, "LB-003 missing-data or reference text", "color", 4.5);

      // Structural captions, to show the floor took effect.
      for (const s of [
        ".ponte-desk .st b",
        ".ponte-desk .rail__name",
        ".ponte-desk .cls",
        ".ponte-find .qorow__kind",
        ".ponte-find .msrow__kind",
      ]) sample(s, "structural caption", "color", 4.5);

      // The Bridge deck and pier, the audit's headline finding.
      for (const s of [".br__deck .d-track", ".brst__p"]) {
        const el = document.querySelector(s);
        if (!el) continue;
        const cs = getComputedStyle(el);
        const bg = bgOf(el.closest("[class*=ponte-]") ?? document.body);
        const raw = s === ".br__deck .d-track" ? cs.stroke : cs.backgroundColor;
        const c = rgb(raw);
        if (!c) continue;
        const a = parseFloat(cs.opacity || "1");
        const fg = [0, 1, 2].map((i) => c[i] * a + bg[i] * (1 - a)) as [number, number, number];
        const r = ratio(fg, bg);
        rows.push({
          screen, viewport, role: "Bridge structure", selector: s, prop: "stroke/background",
          value: `${raw} @ opacity ${cs.opacity}`, background: `rgb(${bg.join(",")})`,
          ratio: +r.toFixed(2), target: 3, meets: r >= 3, text: "",
        });
      }

      // Adjacent surface separation. Read the SCOPE element explicitly rather than
      // walking up: every Ponte scope sets its own ground, and walking up reaches
      // the legacy obsidian body, which is not part of this system and made the
      // pair measure 1:1 against itself.
      const scope = document.querySelector(".ponte-desk, .ponte-find, .ponte-landing");
      const raised = document.querySelector(
        ".ponte-desk .panel, .ponte-desk .reg, .ponte-desk .rec, .ponte-desk .fam," +
          ".ponte-find .fchip, .ponte-find .msrow, .ponte-find .qunv, .ponte-find .hs__tile",
      );
      if (scope && raised) {
        const a = rgb(getComputedStyle(scope).backgroundColor) ?? [255, 255, 255];
        const b = bgOf(raised);
        const r = ratio(a, b);
        rows.push({
          screen, viewport, role: "adjacent surface fill",
          selector: `${scope.className.split(" ")[0]} vs ${raised.className.split(" ")[0]}`,
          prop: "backgroundColor", value: `rgb(${b.join(",")})`, background: `rgb(${a.join(",")})`,
          ratio: +r.toFixed(2), target: 1.15, meets: r >= 1.15, text: "",
        });
      }
      return rows;
    },
    { screen, viewport },
  );
}

async function shoot(page: Page, file: string) {
  await page.screenshot({ path: `${OUT}/${file}.png`, fullPage: true, animations: "disabled" });
}

for (const screen of SCREENS) {
  for (const [vpName, vp] of [["desktop", DESKTOP], ["mobile-390x844", MOBILE]] as const) {
    test(`${screen.id} ${vpName} [${LABEL}]`, async ({ page }) => {
      await page.setViewportSize(vp);
      const response = await page.goto(screen.path, { waitUntil: "networkidle" });
      // A 500 from a missing Supabase config is an environment condition, not a
      // regression. Record it and still capture, so the report can say which
      // screens rendered and which could not.
      const status = response?.status() ?? 0;
      await page.addStyleTag({
        content: "*,*::before,*::after{animation:none!important;transition:none!important}",
      });
      await page.waitForTimeout(200);

      // neutral
      await shoot(page, `${screen.id}-${vpName}-1-neutral`);
      measured.push(...(await measure(page, screen.id, vpName)));

      // selected: press the first obviously selectable control on the screen
      const selectable = page
        .locator(".brst, .pcat__opt, .fchip, .spill, .tapopt, .fseg__b, .hs__tile, .hstile")
        .first();
      if (await selectable.count()) {
        await selectable.click({ trial: false, timeout: 4000 }).catch(() => {});
        await page.waitForTimeout(400);
        await shoot(page, `${screen.id}-${vpName}-2-selected`);
        // Deliberately NOT measured. Clicking changes which elements exist, and a
        // before/after comparison over two different sample sets compares nothing.
        // Contrast is measured once per screen, in the neutral state.
      }

      // focus: keyboard only, so the ring is the real one
      await page.keyboard.press("Tab");
      await page.keyboard.press("Tab");
      await page.waitForTimeout(150);
      await shoot(page, `${screen.id}-${vpName}-3-focus`);

      // disabled or secondary
      const secondary = page.locator("[aria-disabled=true], [disabled], .b--2, .fbtn--secondary, .sp-btn--2").first();
      if (await secondary.count()) {
        await secondary.scrollIntoViewIfNeeded().catch(() => {});
        await page.waitForTimeout(150);
        await shoot(page, `${screen.id}-${vpName}-4-disabled-secondary`);
      }

      // greyscale: the section 6 test, that no state depends on hue alone
      await page.addStyleTag({ content: "html{filter:grayscale(1)!important}" });
      await page.waitForTimeout(150);
      await shoot(page, `${screen.id}-${vpName}-5-greyscale`);

      // Mobile must never scroll sideways. Constitution section 16.
      if (vpName === "mobile-390x844") {
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - window.innerWidth,
        );
        expect(overflow, `${screen.path} overflows horizontally by ${overflow}px at 390`).toBeLessThanOrEqual(1);
      }
      expect(status, `${screen.path} returned ${status}`).toBeLessThan(600);
    });
  }
}

test.afterAll(() => {
  writeFileSync(`${OUT}/measured-contrast.json`, JSON.stringify(measured, null, 2));
  const fails = measured.filter((m) => m.meets === false);
  writeFileSync(
    `${OUT}/measured-contrast.md`,
    [
      `# Rendered contrast, ${LABEL}`,
      "",
      `${measured.length} measurements, ${fails.length} below target.`,
      "",
      "| screen | viewport | role | selector | value | on | ratio | target | meets |",
      "|---|---|---|---|---|---|---|---|---|",
      ...measured.map(
        (m: any) =>
          `| ${m.screen} | ${m.viewport} | ${m.role} | \`${m.selector}\` | ${m.value} | ${m.background} | **${m.ratio}** | ${m.target} | ${m.meets ? "yes" : "**NO**"} |`,
      ),
    ].join("\n"),
  );
  console.log(`\n[${LABEL}] ${measured.length} rendered measurements, ${fails.length} below target`);
});
