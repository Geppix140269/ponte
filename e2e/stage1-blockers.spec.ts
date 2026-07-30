/**
 * LB-002 and LB-003 closure evidence.
 *
 *   PONTE_EVIDENCE_BASE_URL=http://127.0.0.1:3100 \
 *     npx playwright test e2e/stage1-blockers.spec.ts
 *
 * ADR-0015 section S-5 forbids closing either blocker from token calculations
 * alone, and the ExecPlan section 11.1 fixes four criteria. This spec answers the
 * first three; the fourth is a read-through and stays with the owner.
 *
 * ## Why this is a separate spec from stage1-contrast.spec.ts
 *
 * That spec samples whatever the four named screens happen to render, which is the
 * right instrument for "did the palette move" and the wrong one for "is this
 * blocker closed". The first attempt at closure used it and the selectors returned
 * nothing: `.qfield__i`, `.snote`, `.sigsheet__i` and `.vcp__input` are each behind
 * several steps of a journey, and an empty sample reads exactly like a pass.
 *
 * So every target here is REACHED by a written-down journey and then ASSERTED
 * present. If an element cannot be reached, this spec fails. It cannot report
 * closure on an empty set, which is the failure mode the owner's instruction was
 * written against.
 *
 * ## What is measured, and against what
 *
 * Contrast is read out of the rendered page with `getComputedStyle`, composited
 * over the first opaque ancestor fill. A border has TWO adjacent colours — the
 * control's own fill inside it and the page ground outside it — and WCAG 1.4.11
 * is about the boundary being discernible, so both are measured and the WORSE of
 * the two is what has to clear 3:1. The audit measured against the page ground
 * only; that number is kept so the before and after are comparable, and the
 * stricter pair is reported beside it rather than replacing it.
 *
 * ## The journey creates nothing
 *
 * The composer is driven as far as the question steps and no further. "Complete
 * the record" is never pressed, so no listing is written. The one thing that does
 * leave the machine is the product identification call the intake makes, which is
 * how the real journey reaches the quantity question at all.
 */
import { test, expect, type Page, type Browser } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";

const OUT = "e2e/evidence/stage1/blockers";
mkdirSync(OUT, { recursive: true });

const DESKTOP = { width: 1280, height: 900 } as const;
const MOBILE = { width: 390, height: 844 } as const;

type Row = Record<string, unknown>;
const measured: Row[] = [];

/**
 * The viewport is set on the CONTEXT, never with setViewportSize after load.
 * The Bridge picks its horizontal or elevation drawing from `matchMedia` at
 * hydration, so a page created at 1280 and narrowed to 390 hydrates against the
 * wide media state and captures a squeezed deck that is not what a phone shows.
 */
async function open(browser: Browser, viewport: { width: number; height: number }): Promise<Page> {
  const ctx = await browser.newContext({ viewport });
  const page = await ctx.newPage();
  await page.addInitScript(() => {
    // Motion off from the first frame, so nothing is captured mid-transition.
    const s = document.createElement("style");
    s.textContent = "*,*::before,*::after{animation:none!important;transition:none!important}";
    document.addEventListener("DOMContentLoaded", () => document.head.appendChild(s));
  });
  return page;
}

/** In-page colour maths. Injected once per measurement call. */
const MEASURE = `(() => {
  const srgb = (c) => { const n = c / 255; return n <= 0.03928 ? n / 12.92 : Math.pow((n + 0.055) / 1.055, 2.4); };
  const parse = (s) => { const m = String(s).match(/[\\d.]+/g); return m && m.length >= 3 ? [+m[0], +m[1], +m[2]] : null; };
  const alpha = (s) => { const m = String(s).match(/[\\d.]+/g); return m && m.length >= 4 ? +m[3] : 1; };
  const lum = (c) => 0.2126 * srgb(c[0]) + 0.7152 * srgb(c[1]) + 0.0722 * srgb(c[2]);
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  /** First ancestor fill that is effectively opaque. */
  const bgOf = (el) => {
    let n = el;
    while (n) {
      const cs = getComputedStyle(n);
      const c = parse(cs.backgroundColor);
      if (c && alpha(cs.backgroundColor) > 0.95) return c;
      n = n.parentElement;
    }
    return [255, 255, 255];
  };
  const over = (fg, bg) => {
    const c = parse(fg); if (!c) return bg;
    const a = alpha(fg);
    return [0,1,2].map((i) => c[i] * a + bg[i] * (1 - a));
  };
  const hex = (c) => "#" + c.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("").toUpperCase();
  return { srgb, parse, alpha, lum, ratio, bgOf, over, hex };
})()`;

/**
 * LB-002. A control boundary, measured against BOTH adjacent colours.
 * Returns one row; the binding number is `ratio` (the worse of the two).
 */
async function measureBoundary(
  page: Page,
  selector: string,
  viewport: string,
  where: string,
  state: string,
): Promise<Row> {
  const row = await page.evaluate(
    ({ selector, viewport, where, state, src }) => {
      const M = eval(src);
      const els = Array.from(document.querySelectorAll(selector));
      if (!els.length) return null;
      /*
       * Pick an element that is genuinely IN the state being recorded.
       *
       * The investigate sheet moves focus into its first input when it opens, and
       * calling blur() does not hold because the sheet puts it back. So the first
       * run measured `--pf-focus` on the sheet and labelled it neutral. Blurring
       * was the wrong fix; choosing the right element is the right one.
       */
      const active = document.activeElement;
      const el =
        state === "focus"
          ? (els.find((e) => e === active) ?? els[0])
          : (els.find((e) => e !== active) ?? els[0]);
      const cs = getComputedStyle(el);
      // Whichever edge is actually drawn. A zero-width border is not a boundary.
      const edges = ["borderTopWidth", "borderBottomWidth", "borderLeftWidth", "borderRightWidth"] as const;
      const drawn = edges.find((e) => parseFloat(cs[e]) > 0);
      const colourProp =
        drawn === "borderTopWidth" ? "borderTopColor"
        : drawn === "borderBottomWidth" ? "borderBottomColor"
        : drawn === "borderLeftWidth" ? "borderLeftColor"
        : "borderRightColor";
      // No border at all: report the outline, which is what focus draws.
      const usingOutline = !drawn && parseFloat(cs.outlineWidth) > 0;
      const raw = usingOutline ? cs.outlineColor : drawn ? (cs as any)[colourProp] : null;
      if (!raw) return { skipped: "no drawn boundary", selector, viewport, where, state };

      const outside = M.bgOf(el.parentElement ?? el);
      const ownFill = M.parse(cs.backgroundColor);
      const inside = ownFill && M.alpha(cs.backgroundColor) > 0.95 ? ownFill : outside;
      const boundary = M.over(raw, outside);
      const vsGround = M.ratio(boundary, outside);
      const vsFill = M.ratio(boundary, inside);
      const worst = Math.min(vsGround, vsFill);
      return {
        blocker: "LB-002",
        selector, viewport, where, state,
        property: usingOutline ? "outlineColor" : colourProp,
        width: usingOutline ? cs.outlineWidth : (cs as any)[drawn!],
        boundary: M.hex(boundary),
        pageGround: M.hex(outside),
        controlFill: M.hex(inside),
        ratioVsGround: +vsGround.toFixed(2),
        ratioVsFill: +vsFill.toFixed(2),
        ratio: +worst.toFixed(2),
        target: 3,
        meets: worst >= 3,
      };
    },
    { selector, viewport, where, state, src: MEASURE },
  );
  expect(row, `${selector} not found on ${where} at ${viewport}`).not.toBeNull();
  return row as Row;
}

/**
 * LB-003. Missing-data text against its real background, plus the greyscale
 * question: is it still distinguishable from a STATED value when hue is removed?
 *
 * WCAG contrast is computed from relative luminance, so greyscaling does not
 * change the text-to-background ratio at all. The thing worth proving is the one
 * Constitution section 6 actually asks about: that missing and stated values are
 * not separated by hue alone. So the stated sibling's colour is measured too and
 * the two are compared. A ratio of 1.0 would mean the distinction is invisible
 * without colour.
 */
async function measureMissing(
  page: Page,
  selector: string,
  statedSelector: string,
  viewport: string,
  where: string,
  state = "neutral",
): Promise<Row> {
  const row = await page.evaluate(
    ({ selector, statedSelector, viewport, where, state, src }) => {
      const M = eval(src);
      const els = Array.from(document.querySelectorAll(selector)) as HTMLElement[];
      const el = els.find((e) => (e.textContent ?? "").trim().length > 0);
      if (!el) return null;
      const cs = getComputedStyle(el);
      const bg = M.bgOf(el.parentElement ?? el);
      const fg = M.over(cs.color, bg);
      const r = M.ratio(fg, bg);

      // A stated value on the same surface, for the greyscale comparison.
      const stated = (Array.from(document.querySelectorAll(statedSelector)) as HTMLElement[]).find(
        (e) => (e.textContent ?? "").trim() && !(e.className ?? "").match(/\b(ns|na)\b/),
      );
      let greyscale: Record<string, unknown> = { statedFound: false };
      if (stated) {
        const scs = getComputedStyle(stated);
        const sfg = M.over(scs.color, M.bgOf(stated.parentElement ?? stated));
        greyscale = {
          statedFound: true,
          statedColour: M.hex(sfg),
          statedText: (stated.textContent ?? "").trim().slice(0, 28),
          // Luminance-only, so this is exactly what survives grayscale(1).
          missingVsStated: +M.ratio(fg, sfg).toFixed(2),
          distinctWithoutHue: M.ratio(fg, sfg) >= 1.2,
          alsoDiffers: [
            scs.fontStyle !== cs.fontStyle ? "font-style" : null,
            scs.fontWeight !== cs.fontWeight ? "font-weight" : null,
            scs.textDecorationLine !== cs.textDecorationLine ? "text-decoration" : null,
          ].filter(Boolean),
        };
      }
      return {
        blocker: "LB-003",
        selector, viewport, where, state,
        text: (el.textContent ?? "").trim().slice(0, 28),
        colour: M.hex(fg),
        background: M.hex(bg),
        fontSize: cs.fontSize,
        ratio: +r.toFixed(2),
        target: 4.5,
        meets: r >= 4.5,
        ...greyscale,
      };
    },
    { selector, statedSelector, viewport, where, state, src: MEASURE },
  );
  expect(row, `${selector} with text not found on ${where} at ${viewport}`).not.toBeNull();
  return row as Row;
}

/**
 * The sunken well, reached the way the product actually reaches it.
 *
 * `.reg__row:hover` paints on `--pf-sunken`, so a register row under the pointer
 * is where missing-data text genuinely sits on the darkest of the three surfaces
 * the closure criterion names. Hovering the row is not a contrivance; it is the
 * state a member is in while reading down a register.
 *
 * Returns null when the surface has no hoverable register row, which is recorded
 * rather than substituted.
 */
async function measureMissingOnHover(
  page: Page,
  selector: string,
  statedSelector: string,
  viewport: string,
  where: string,
): Promise<Row | null> {
  const target = page.locator(`.reg__row:has(${selector}), tr:has(${selector})`).first();
  if (!(await target.count())) return null;
  await target.scrollIntoViewIfNeeded().catch(() => {});
  await target.hover().catch(() => {});
  await page.waitForTimeout(250);
  const row = await measureMissing(page, selector, statedSelector, viewport, where, "row hover");
  // Only worth reporting as the well if the hover actually changed the surface.
  return row;
}

async function shoot(page: Page, name: string) {
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: false, animations: "disabled" });
}

/**
 * Drop focus before measuring a neutral state.
 *
 * The investigate sheet moves focus into its first input when it opens, which is
 * correct behaviour and made the first run measure a FOCUSED border and label it
 * neutral: it reported #1E5FA8 (`--pf-focus`) where the neutral token is
 * `--pf-rule-strong`. The number was real and the name on it was wrong, which is
 * worse than a missing number.
 */
async function blur(page: Page) {
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await page.waitForTimeout(150);
}

/**
 * Every rendered missing-data element on the page, with the background each one
 * actually sits on.
 *
 * The closure criterion names three backgrounds — white, the page ground and the
 * sunken well — so which of them are genuinely reachable is a question to answer
 * from the DOM rather than to assume.
 */
async function surveyMissing(page: Page, where: string, viewport: string) {
  return page.evaluate(
    ({ where, viewport, src }) => {
      const M = eval(src);
      const seen = new Map<string, Record<string, unknown>>();
      for (const el of Array.from(document.querySelectorAll("dd.na, .ns, .prow__v.ns")) as HTMLElement[]) {
        if (!(el.textContent ?? "").trim()) continue;
        const cs = getComputedStyle(el);
        const bg = M.bgOf(el.parentElement ?? el);
        const fg = M.over(cs.color, bg);
        const key = `${M.hex(fg)}|${M.hex(bg)}|${cs.fontSize}`;
        if (seen.has(key)) continue;
        seen.set(key, {
          where, viewport,
          selector: el.tagName.toLowerCase() + "." + (el.getAttribute("class") ?? "").trim().split(/\s+/).join("."),
          colour: M.hex(fg), background: M.hex(bg), fontSize: cs.fontSize,
          ratio: +M.ratio(fg, bg).toFixed(2),
          text: (el.textContent ?? "").trim().slice(0, 24),
        });
      }
      return Array.from(seen.values());
    },
    { where, viewport, src: MEASURE },
  );
}

const surveyed: Row[] = [];

// ---------------------------------------------------------------------------
// Journeys. Each one ends with the target element on screen.
// ---------------------------------------------------------------------------

/** The composer's "N details still needed" screen for a non-product family. */
async function toServiceNeeds(page: Page) {
  await page.goto("/en/structure?family=services&intent=offer_trade_service", { waitUntil: "domcontentloaded" });
  await expect(page.locator(".pcat__grid, .pcat__opt").first()).toBeVisible({ timeout: 20_000 });
  for (let i = 0; i < 8; i++) {
    const opt = page.locator(".pcat__opt, .tapopt").first();
    if (await opt.count()) await opt.click({ timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(300);
    const next = page.getByRole("button", { name: /continue|next|confirm|save/i }).first();
    if (await next.count()) await next.click({ timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(700);
    if (await page.locator("button.sval--add").count()) return;
  }
  throw new Error("could not reach the services needs screen");
}

/** Open the Nth "Add" detail step. */
async function openAdd(page: Page, index: number) {
  const adds = page.locator("button.sval--add");
  await expect(adds.nth(index)).toBeVisible({ timeout: 10_000 });
  await adds.nth(index).click();
  await page.waitForTimeout(900);
}

/** The products quantity question, reached the way a member reaches it. */
async function toProductQuantity(page: Page) {
  await page.goto("/en/structure?family=products&intent=offer_product", { waitUntil: "domcontentloaded" });
  await expect(page.locator(".pintake")).toBeVisible({ timeout: 20_000 });
  await page.locator(".pintake > .br .brst").nth(0).click({ timeout: 10_000 });
  await page.locator("#pintake-describe").fill("EN 590 diesel, 5000 MT per month");
  await page.getByRole("button", { name: "Identify this product" }).click();
  // The identification is a real call; it is the only thing here that leaves the
  // machine, and without it this question is unreachable.
  await expect(page.locator(".pcand__r").first()).toBeVisible({ timeout: 45_000 });
  await page.locator(".pcand__r").first().click();
  await page.getByRole("button", { name: /confirm and create the draft/i }).click();
  await expect(page.locator("button.sval--add").first()).toBeVisible({ timeout: 20_000 });

  // The Quantity row, found by its own label rather than by position.
  const adds = page.locator("button.sval--add");
  const n = await adds.count();
  for (let i = 0; i < n; i++) {
    const row = await adds.nth(i).evaluate((el) => (el.closest("li,tr,.srow,div")?.textContent ?? "").toLowerCase());
    if (row.includes("quantity")) { await adds.nth(i).click(); break; }
  }
  await page.waitForTimeout(900);
  // The basis is asked for before the figure, so the field only exists once a
  // basis is chosen. That is deliberate product behaviour, not a quirk.
  await page.locator(".chiprow button").first().click();
  await expect(page.locator(".qfield__i").first()).toBeVisible({ timeout: 10_000 });
}

/** The investigate sheet on a real Market Signal. */
async function toInvestigateSheet(page: Page) {
  await page.goto("/en/market-signals", { waitUntil: "domcontentloaded" });
  const href = await page.evaluate(() =>
    Array.from(document.querySelectorAll("a[href]"))
      .map((a) => a.getAttribute("href"))
      .find((h) => h && h.includes("/market-signals/")),
  );
  expect(href, "no signal detail link on /market-signals").toBeTruthy();
  await page.goto(href!, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /investigate/i }).first().click({ timeout: 10_000 });
  await expect(page.locator(".sigsheet__i").first()).toBeVisible({ timeout: 10_000 });
}

// ---------------------------------------------------------------------------
// LB-002
// ---------------------------------------------------------------------------

for (const [vpName, vp] of [["desktop", DESKTOP], ["mobile-390x844", MOBILE]] as const) {
  test(`LB-002 service scope note and coverage inputs [${vpName}]`, async ({ browser }) => {
    const page = await open(browser, vp);
    await toServiceNeeds(page);

    // Scope: a required free-text note.
    await openAdd(page, 0);
    await expect(page.locator(".snote")).toBeVisible();
    await blur(page);
    await shoot(page, `lb002-snote-${vpName}-1-neutral`);
    measured.push(await measureBoundary(page, ".snote", vpName, "Start a Deal / services / Scope", "neutral"));

    await page.locator(".snote").focus();
    await page.waitForTimeout(200);
    await shoot(page, `lb002-snote-${vpName}-2-focus`);
    measured.push(await measureBoundary(page, ".snote", vpName, "Start a Deal / services / Scope", "focus"));

    // Coverage: the country picker and the lanes note on one step.
    await page.locator(".sbar__back").first().click();
    await page.waitForTimeout(700);
    await openAdd(page, 2);
    await expect(page.locator(".vcp__input")).toBeVisible();
    await blur(page);
    await shoot(page, `lb002-vcp-${vpName}-1-neutral`);
    measured.push(await measureBoundary(page, ".vcp__input", vpName, "Start a Deal / services / Coverage", "neutral"));

    await page.locator(".vcp__input").focus();
    await page.waitForTimeout(200);
    await shoot(page, `lb002-vcp-${vpName}-2-focus`);
    measured.push(await measureBoundary(page, ".vcp__input", vpName, "Start a Deal / services / Coverage", "focus"));

    await page.context().close();
  });

  test(`LB-002 product quantity field [${vpName}]`, async ({ browser }) => {
    const page = await open(browser, vp);
    await toProductQuantity(page);
    await blur(page);
    await shoot(page, `lb002-qfield-${vpName}-1-neutral`);
    measured.push(await measureBoundary(page, ".qfield__i", vpName, "Start a Deal / products / Quantity", "neutral"));

    await page.locator(".qfield__i").first().focus();
    await page.waitForTimeout(200);
    await shoot(page, `lb002-qfield-${vpName}-2-focus`);
    measured.push(await measureBoundary(page, ".qfield__i", vpName, "Start a Deal / products / Quantity", "focus"));

    // The pill vocabulary on the same screen family, which shares the boundary token.
    const spill = page.locator(".spill").first();
    if (await spill.count()) {
      measured.push(await measureBoundary(page, ".spill", vpName, "Start a Deal / products / Quantity basis", "neutral"));
    }
    await page.context().close();
  });

  test(`LB-002 investigate sheet inputs [${vpName}]`, async ({ browser }) => {
    const page = await open(browser, vp);
    await toInvestigateSheet(page);
    // The sheet autofocuses its first input, so neutral has to be made neutral.
    await blur(page);
    await shoot(page, `lb002-sigsheet-${vpName}-1-neutral`);
    measured.push(await measureBoundary(page, ".sigsheet__i", vpName, "Market Signal / investigate sheet", "neutral"));

    await page.locator(".sigsheet__i").first().focus();
    await page.waitForTimeout(200);
    await shoot(page, `lb002-sigsheet-${vpName}-2-focus`);
    measured.push(await measureBoundary(page, ".sigsheet__i", vpName, "Market Signal / investigate sheet", "focus"));

    // Disabled, where the journey actually has one: the sheet's submit before it
    // is answerable. Recorded as absent rather than invented if there is none.
    const dis = page.locator("[disabled], [aria-disabled=true]").first();
    if (await dis.count()) {
      await dis.scrollIntoViewIfNeeded().catch(() => {});
      await shoot(page, `lb002-sigsheet-${vpName}-3-disabled`);
      const row = await page.evaluate(
        ({ src }) => {
          const M = eval(src);
          const el = document.querySelector("[disabled], [aria-disabled=true]") as HTMLElement | null;
          if (!el) return null;
          const cs = getComputedStyle(el);
          const bg = M.bgOf(el.parentElement ?? el);
          const fg = M.over(cs.color, bg);
          return {
            blocker: "LB-002", selector: "[disabled] label", viewport: "", where: "", state: "disabled",
            colour: M.hex(fg), background: M.hex(bg), ratio: +M.ratio(fg, bg).toFixed(2),
            target: 4.5, meets: M.ratio(fg, bg) >= 4.5, opacity: cs.opacity,
            text: (el.textContent ?? "").trim().slice(0, 30),
          };
        },
        { src: MEASURE },
      );
      if (row) measured.push({ ...row, viewport: vpName, where: "Market Signal / investigate sheet" });
    }
    await page.context().close();
  });
}

// ---------------------------------------------------------------------------
// LB-003
// ---------------------------------------------------------------------------

/**
 * Three surfaces, because the closure criterion names three backgrounds: the
 * white raised card, the page ground and the sunken well. Which token each of
 * these resolves to is READ, not assumed, and recorded in the output.
 */
const MISSING_SURFACES = [
  { id: "landing", path: "/en", missing: "dd.na", stated: "dd:not(.na)", name: "Landing fact block" },
  { id: "signals-list", path: "/en/market-signals", missing: ".reg__f dd.na", stated: ".reg__f dd:not(.na)", name: "Market Signals register" },
] as const;

for (const [vpName, vp] of [["desktop", DESKTOP], ["mobile-390x844", MOBILE]] as const) {
  for (const s of MISSING_SURFACES) {
    test(`LB-003 ${s.id} [${vpName}]`, async ({ browser }) => {
      const page = await open(browser, vp);
      await page.goto(s.path, { waitUntil: "domcontentloaded" });
      await expect(page.locator(s.missing).first()).toBeVisible({ timeout: 20_000 });
      await page.locator(s.missing).first().scrollIntoViewIfNeeded();
      await page.waitForTimeout(300);
      await shoot(page, `lb003-${s.id}-${vpName}-1-neutral`);
      measured.push(await measureMissing(page, s.missing, s.stated, vpName, s.name));
      surveyed.push(...(await surveyMissing(page, s.name, vpName)));

      // The same text with its row under the pointer, which is where the sunken
      // well is reachable.
      const hovered = await measureMissingOnHover(page, s.missing, s.stated, vpName, s.name);
      if (hovered) {
        measured.push(hovered);
        surveyed.push(...(await surveyMissing(page, `${s.name} (row hover)`, vpName)));
        await shoot(page, `lb003-${s.id}-${vpName}-3-row-hover`);
      }

      // The greyscale frame. Colour removed, so a reviewer can see that the
      // missing value is still the fainter of the two by lightness alone.
      await page.addStyleTag({ content: "html{filter:grayscale(1)!important}" });
      await page.waitForTimeout(200);
      await shoot(page, `lb003-${s.id}-${vpName}-2-greyscale`);
      await page.context().close();
    });
  }

  test(`LB-003 signal detail [${vpName}]`, async ({ browser }) => {
    const page = await open(browser, vp);
    await page.goto("/en/market-signals", { waitUntil: "domcontentloaded" });
    const href = await page.evaluate(() =>
      Array.from(document.querySelectorAll("a[href]"))
        .map((a) => a.getAttribute("href"))
        .find((h) => h && h.includes("/market-signals/")),
    );
    expect(href, "no signal detail link").toBeTruthy();
    await page.goto(href!, { waitUntil: "domcontentloaded" });
    await expect(page.locator("dd.na").first()).toBeVisible({ timeout: 20_000 });
    await page.locator("dd.na").first().scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    await shoot(page, `lb003-signal-detail-${vpName}-1-neutral`);
    measured.push(await measureMissing(page, "dd.na", "dd:not(.na)", vpName, "Market Signal detail facts"));
    surveyed.push(...(await surveyMissing(page, "Market Signal detail facts", vpName)));
    await page.addStyleTag({ content: "html{filter:grayscale(1)!important}" });
    await page.waitForTimeout(200);
    await shoot(page, `lb003-signal-detail-${vpName}-2-greyscale`);
    await page.context().close();
  });
}

// ---------------------------------------------------------------------------

test.afterAll(() => {
  const rows = measured.filter((m) => m && !m.skipped);
  const fails = rows.filter((m) => m.meets === false);
  const lb002 = rows.filter((m) => m.blocker === "LB-002");
  const lb003 = rows.filter((m) => m.blocker === "LB-003");
  const hueOnly = lb003.filter((m) => m.statedFound === true && m.distinctWithoutHue === false);

  // Deduplicate the survey across viewports and pages: the same colour on the
  // same background at the same size is one fact, however many times it renders.
  const uniqueSurvey = Array.from(
    new Map(surveyed.map((m: any) => [`${m.where}|${m.viewport}|${m.colour}|${m.background}|${m.fontSize}`, m])).values(),
  );
  const backgrounds = Array.from(new Set(uniqueSurvey.map((m: any) => m.background))).sort();

  writeFileSync(`${OUT}/blocker-evidence.json`, JSON.stringify(rows, null, 2));
  writeFileSync(
    `${OUT}/blocker-evidence.md`,
    [
      "# LB-002 and LB-003, measured on rendered pages",
      "",
      `${rows.length} measurements, ${fails.length} below target.`,
      "",
      "Read with `getComputedStyle` on a local production build, composited over the",
      "first opaque ancestor fill. Not derived from the token file.",
      "",
      "## LB-002 — control boundaries, 3:1 (WCAG 1.4.11)",
      "",
      "`ratio` is the worse of the boundary against the page ground and against the",
      "control's own fill, because a border has two adjacent colours and both have to",
      "let you see it.",
      "",
      "| where | selector | state | viewport | boundary | vs ground | vs fill | worst | meets |",
      "|---|---|---|---|---|---|---|---|---|",
      ...lb002.map(
        (m: any) =>
          `| ${m.where} | \`${m.selector}\` | ${m.state} | ${m.viewport} | ${m.boundary ?? m.colour} | ${m.ratioVsGround ?? "-"} | ${m.ratioVsFill ?? "-"} | **${m.ratio}** | ${m.meets ? "yes" : "**NO**"} |`,
      ),
      "",
      "## LB-003 — missing-data text, 4.5:1 (WCAG 1.4.3)",
      "",
      "| where | state | viewport | text | colour | on | size | ratio | meets | vs stated value | distinct without hue |",
      "|---|---|---|---|---|---|---|---|---|---|---|",
      ...lb003.map(
        (m: any) =>
          `| ${m.where} | ${m.state ?? "neutral"} | ${m.viewport} | ${m.text} | ${m.colour} | ${m.background} | ${m.fontSize} | **${m.ratio}** | ${m.meets ? "yes" : "**NO**"} | ${m.statedFound ? `${m.missingVsStated}:1 vs ${m.statedColour}` : "no stated sibling found"} | ${m.statedFound ? (m.distinctWithoutHue ? "yes" : "**NO**") : "-"} |`,
      ),
      "",
      "## Greyscale",
      "",
      "WCAG contrast is luminance-only, so greyscale does not change any ratio above.",
      "What greyscale tests is Constitution section 6: that a missing value is not",
      "separated from a stated one by hue alone. The `vs stated value` column is that",
      "measurement, and it is a lightness ratio, so it is exactly what survives",
      "`grayscale(1)`. The `-2-greyscale` frames show the same thing to the eye.",
      "",
      hueOnly.length
        ? `**${hueOnly.length} surface(s) rely on hue alone.**`
        : "No surface relies on hue alone.",
      "",
      "## Which backgrounds missing-data text was actually found on",
      "",
      "The closure criterion names three: white, the page ground and the sunken well.",
      "This is every distinct combination found in the rendered pages reachable",
      "without a member session, deduplicated by colour, background and size.",
      "",
      "| where | viewport | selector | colour | background | size | ratio |",
      "|---|---|---|---|---|---|---|",
      ...uniqueSurvey.map(
        (m: any) => `| ${m.where} | ${m.viewport} | \`${m.selector}\` | ${m.colour} | ${m.background} | ${m.fontSize} | **${m.ratio}** |`,
      ),
      "",
      `Distinct backgrounds reached: ${backgrounds.join(", ") || "none"}.`,
    ].join("\n"),
  );
  writeFileSync(`${OUT}/missing-data-survey.json`, JSON.stringify(uniqueSurvey, null, 2));
  console.log(
    `\nLB-002/LB-003 evidence: ${rows.length} measurements, ${fails.length} below target, ` +
      `${hueOnly.length} hue-only`,
  );
});
