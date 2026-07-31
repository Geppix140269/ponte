import { expect, test, type Locator, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";

/**
 * Visual evidence and behavioural verification for the landing Family Bridge
 * and Action Bridge.
 *
 * Two jobs, deliberately in one file.
 *
 * The first is **evidence**: the nine states Constitution section 21 and the
 * slice instruction require, written to a fixed path so a reviewer can open them
 * beside the approved reference renders. They are captured against a production
 * build, not a dev server.
 *
 * The second is **verification of the things a screenshot cannot show**: that
 * every destination is unchanged, that the keyboard model is the radiogroup the
 * Bridge notes require, that nothing overflows at four narrow widths, and that
 * reduced motion removes movement without removing information.
 *
 * They belong together because the evidence is only worth looking at if the
 * behaviour behind it is what it appears to be. A screenshot of a bridge whose
 * links point at the wrong routes would pass any visual review.
 */

const EVIDENCE = "docs/codex/audits/constitution-rebuild/evidence/landing-bridges";

/** The nine destinations the replaced card grid carried, in reading order. */
const DESTINATIONS = {
  products: [
    "/market-signals",
    "/structure?family=products&intent=source_product",
    "/structure?family=products&intent=offer_product",
  ],
  services: [
    "/structure?family=services&intent=seek_trade_service",
    "/structure?family=services&intent=offer_trade_service",
  ],
  distribution: [
    "/structure?family=distribution&intent=seek_distribution_partner",
    "/structure?family=distribution&intent=offer_distribution_or_representation",
    "/structure?family=distribution&intent=seek_brands_or_products_to_represent",
  ],
} as const;

const FAMILY_LABELS = {
  products: "Products",
  services: "Trade services",
  distribution: "Distribution and representation",
} as const;

test.beforeAll(() => {
  mkdirSync(EVIDENCE, { recursive: true });
});

/**
 * The landing, loaded and ready to interact with.
 *
 * `domcontentloaded` rather than `networkidle`: against a deploy preview the
 * network never goes idle, so the stricter wait times out on a page that is
 * perfectly ready. Waiting for the bridge itself to be visible is both the
 * stronger condition and the one that actually matters here.
 */
async function landing(page: Page): Promise<Locator> {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const bridge = page.locator(".pbridge > .br");
  await expect(bridge).toBeVisible();
  // The stations are interactive only once the client component has hydrated.
  await expect(page.locator(".pbridge > .br .brst").first()).toHaveAttribute("tabindex", "0");
  return bridge;
}

/** The block holding both bridges, which is what the evidence frames. */
function block(page: Page): Locator {
  return page.locator(".pbridge");
}

async function shot(target: Locator | Page, name: string): Promise<void> {
  await target.screenshot({ path: `${EVIDENCE}/${name}.png`, animations: "disabled" });
}

/**
 * Wait until the bridge has stopped resizing itself.
 *
 * The engine sizes the stage from its lowest child, then does it again on the
 * next frame, then again once `document.fonts.ready` resolves, because a label
 * that reflows after a webfont loads would otherwise overlap the section
 * beneath the bridge. `BridgeRoute` keeps all three passes.
 *
 * A capture that lands between passes gets a different height, and since these
 * frames are clipped to the block's box, a different image. Waiting for fonts
 * and then for two consecutive identical heights makes the frame the settled
 * one every time.
 */
async function settled(page: Page): Promise<void> {
  await page.evaluate(() => document.fonts?.ready);
  let previous = "";
  for (let i = 0; i < 25; i++) {
    // Height alone is not enough. In elevation the curve is redrawn on the next
    // frame and again once fonts resolve, which moves the nodes and the live
    // segment without changing the block's height at all. The signature covers
    // both, so a frame is only taken once the drawing has stopped moving too.
    const signature = await page.evaluate(() => {
      const el = document.querySelector(".pbridge");
      // Both modes: `.br__vsvg` is the elevation svg and `.br__deck` the
      // horizontal one. Reading only the elevation missed the desktop live deck
      // changing as the selection moved, which is what left the settled-runner
      // frame varying between runs.
      const track = document.querySelector(".pbridge .br .d-track");
      const live = document.querySelector(".pbridge .br .d-live");
      return [
        Math.round(el?.getBoundingClientRect().height ?? -1),
        // The document offset too: `reveal` scrolls to the bridge, so anything
        // above it reflowing by a pixel after fonts load moves the frame.
        Math.round((el?.getBoundingClientRect().top ?? 0) + window.scrollY),
        track?.getAttribute("d")?.length ?? 0,
        live?.getAttribute("d")?.length ?? 0,
        document.querySelectorAll(".pbridge .brst").length,
        // The Desk command bar is in every viewport frame and its account
        // control sits behind `<Suspense fallback={null}>`, so "Sign in" pops
        // in after hydration. A frame taken before that shows a bar with a gap
        // in it, which is what left the neutral mobile frame varying while the
        // bridge below it was provably identical.
        document.querySelector(".cmd")?.textContent?.length ?? 0,
      ].join("|");
    });
    if (!signature.startsWith("-1") && signature === previous) return;
    previous = signature;
    await page.waitForTimeout(60);
  }
}

/**
 * Frame the bridge with breathing room around it.
 *
 * A tight element crop cuts the composition exactly at its own bounds, and the
 * abutments sit flush against those bounds by design: the crossing starts where
 * the block starts. "INTENT" then loses its first letter to the crop edge and
 * the frame reads as a layout fault that the measurements say is not there.
 *
 * The approved reference renders are page-level for the same reason, so these
 * clip the page to the bridge plus a margin instead.
 */
async function shotFramed(page: Page, name: string, pad = 28): Promise<void> {
  await settled(page);
  const box = await block(page).boundingBox();
  if (!box) throw new Error("the bridge block has no box to frame");
  const viewport = page.viewportSize();
  // Less room above than around: the bridge's own heading already separates it
  // from the hero, and a full pad at the top catches the tail of the paragraph
  // above, which reads as a stray fragment in the frame.
  const top = 10;
  await page.screenshot({
    path: `${EVIDENCE}/${name}.png`,
    animations: "disabled",
    // `clip` alone is bound by the viewport, and the two bridges together are
    // taller than 900px, so the action bridge was being cut off at the fold.
    fullPage: true,
    clip: {
      x: Math.max(0, box.x - pad),
      y: Math.max(0, box.y - top),
      width: Math.min(box.width + pad * 2, (viewport?.width ?? box.width + pad * 2) - Math.max(0, box.x - pad)),
      height: box.height + top + pad,
    },
  });
}

/**
 * Move the pointer off the bridge, so each frame records the settled state
 * rather than a hover state.
 *
 * Clicking a station leaves the pointer on it. Since DS-8 was fixed the
 * selected node no longer changes under the cursor, but hover still lifts the
 * pier and the description colour on whichever station the mouse happens to
 * rest on, and a frame that captured that would be recording where the mouse
 * was rather than what the interface does.
 */
async function unhover(page: Page): Promise<void> {
  await page.mouse.move(0, 0);
  await expect(page.locator(".pbridge > .br .brst:hover")).toHaveCount(0);
}

/** The family stations, in order. */
function stations(page: Page): Locator {
  return page.locator(".pbridge > .br .brst");
}

/**
 * Wait until the revealed Action Bridge has measured itself.
 *
 * The three action bridges are all rendered and the unselected ones are
 * `hidden`, which is what keeps every destination in the document without
 * JavaScript. A hidden element has no height, so a bridge cannot measure its
 * stations until it is shown: on reveal it lays out once at the CSS fallback
 * height and again at the measured one.
 *
 * A member never sees that, because the reveal animation is longer than the
 * extra pass. A screenshot can land between the two, which is what made one
 * frame differ between otherwise identical runs.
 */
async function measured(page: Page): Promise<void> {
  await expect
    .poll(
      () =>
        page.evaluate(() => {
          const stage = document.querySelector<HTMLElement>(".pbridge .brx:not([hidden]) .br__stage");
          if (!stage) return false;
          // The engine sizes the stage from its lowest child and places every
          // station from the measured curve. Both are done when the stage has a
          // height and the first station has been given a left.
          const station = stage.querySelector<HTMLElement>(".brst");
          return stage.offsetHeight > 0 && !!station && station.style.left !== "";
        }),
      { message: "the revealed action bridge never measured its stations" },
    )
    .toBe(true);
}

/**
 * Scroll so the bridge sits just below the sticky command bar.
 *
 * An element screenshot scrolls the element into view and then captures it, but
 * the Desk's command bar is `position: sticky` and stays over the top of
 * whatever is beneath it. On a 390px frame the bridge is taller than the
 * viewport, so the first station ends up underneath the bar in the capture.
 *
 * The mobile frames are therefore taken as **viewport screenshots** after this
 * scroll, not element crops: a 390 x 844 frame is what Constitution section 17
 * asks to review, and it should show the page as a member sees it, chrome
 * included, rather than a component lifted out of it.
 */
async function reveal(page: Page): Promise<void> {
  await settled(page);
  await page.evaluate(() => {
    const bridge = document.querySelector(".pbridge");
    if (!bridge) return;
    const bar = document.querySelector(".cmd");
    const clearance = Math.round(bar ? bar.getBoundingClientRect().height : 0) + 14;
    // Rounded. The landing's boxes have sub-pixel heights, so an unrounded
    // target lands on a fractional scroll offset and the browser resolves the
    // sub-pixel rendering differently between runs. That was enough to make the
    // neutral mobile frame differ while nothing about the page had changed.
    const target = Math.round(window.scrollY + bridge.getBoundingClientRect().top - clearance);
    window.scrollTo({ top: target, behavior: "instant" as ScrollBehavior });
  });
}

// ---------------------------------------------------------------------------
// 1-4. Desktop: the neutral state and each family selected
// ---------------------------------------------------------------------------

test("desktop evidence: default and each family selected", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await landing(page);

  // The approved package's own reference set includes a family-neutral frame,
  // so the opening state is evidence in its own right rather than a step on the
  // way to something.
  await expect(page.locator(".pbridge .brx:not([hidden])")).toHaveCount(0);
  await shotFramed(page, "desktop-1-family-neutral");

  const families = ["products", "services", "distribution"] as const;
  const fileFor = {
    products: "desktop-2-products-selected",
    services: "desktop-3-trade-services-selected",
    distribution: "desktop-4-distribution-selected",
  } as const;

  for (let index = 0; index < families.length; index++) {
    const family = families[index];
    await stations(page).nth(index).click();
    await unhover(page);

    const chosen = page.locator(".pbridge > .br .brst--on");
    await expect(chosen).toHaveCount(1);
    await expect(chosen.locator(".brst__t")).toHaveText(FAMILY_LABELS[family]);
    await expect(stations(page).nth(index)).toHaveAttribute("aria-checked", "true");

    // Exactly one action bridge is revealed, and it is this family's.
    const open = page.locator(".pbridge .brx:not([hidden])");
    await expect(open).toHaveCount(1);
    await expect(open).toHaveAttribute("aria-label", new RegExp(`^${FAMILY_LABELS[family]}:`));
    await measured(page);

    await shotFramed(page, fileFor[family]);
  }
});

// ---------------------------------------------------------------------------
// DS-8: a chosen station must not shrink when it is pointed at
// ---------------------------------------------------------------------------

test("DS-8: hovering the chosen station does not demote it", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await landing(page);

  const chosen = stations(page).nth(0);
  await chosen.click();
  await unhover(page);

  const node = page.locator(".pbridge > .br .brst--on .brst__n");
  const pier = page.locator(".pbridge > .br .brst--on .brst__p");

  /*
    Auto-retrying assertions throughout, because `.brst__n` transitions width,
    height, background and border-colour over `--pf-dur-micro`. A plain read
    straight after the click samples the transition in flight and gets a value
    between the two states, which is how the first version of this test
    reported 12.77px for a node that settles at 15.
  */
  const expectSelectedNode = async () => {
    await expect(node).toHaveCSS("width", "15px");
    await expect(node).toHaveCSS("height", "15px");
    await expect(node).toHaveCSS("background-color", "rgb(126, 89, 20)"); // --pf-gold-ink (#7E5914)
    await expect(node).toHaveCSS("border-top-color", "rgb(126, 89, 20)");
    await expect(pier).toHaveCSS("opacity", "1");
    await expect(pier).toHaveCSS("width", "2px");
  };

  await expectSelectedNode();

  // Now point at it. Every one of these was different before the fix: the node
  // fell to 13px and the sunken grey, and the pier faded to .8.
  await chosen.hover();
  await expect(page.locator(".pbridge > .br .brst--on:hover")).toHaveCount(1);
  await expectSelectedNode();
  await measured(page);

  // Captured while the pointer is still on the chosen station: this frame is
  // the proof for DS-8, so it has to be a hover frame.
  await shotFramed(page, "desktop-9-selected-hover");

  // The approved hover treatment for an UNSELECTED station is untouched: it
  // still grows from 11px to 13px and takes the sunken fill.
  const other = stations(page).nth(1);
  await other.hover();
  await expect(other.locator(".brst__n")).toHaveCSS("width", "13px");
  await expect(other.locator(".brst__n")).toHaveCSS("background-color", "rgb(226, 219, 196)"); // --pf-sunken (#E2DBC4, ADR-0015 Stage 1)
});

// ---------------------------------------------------------------------------
// DS-9: one deliberate focus treatment, not the Bridge's plus the Desk's
// ---------------------------------------------------------------------------

test("DS-9: a focused station carries one focus treatment, and it is strong", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await landing(page);

  await stations(page).nth(0).focus();
  const focus = await page.evaluate(() => {
    const el = document.querySelectorAll(".pbridge > .br .brst")[0] as HTMLElement;
    const c = getComputedStyle;
    return {
      stationShadow: c(el).boxShadow,
      stationOutlineWidth: c(el).outlineWidth,
      nodeShadow: c(el.querySelector(".brst__n")!).boxShadow,
      titleDecoration: c(el.querySelector(".brst__t")!).textDecorationLine,
      titleDecorationColour: c(el.querySelector(".brst__t")!).textDecorationColor,
    };
  });

  // The duplicate is gone: the Desk's blanket ring no longer draws a rectangle
  // around the whole station block.
  expect(focus.stationShadow, "the blanket Desk focus ring is still on the station").toBe("none");

  // And what remains is the approved Bridge treatment, still two carriers: a
  // ring on the node and an underline on the title, both in --pf-focus.
  expect(focus.nodeShadow).toContain("rgb(30, 95, 168)"); // --pf-focus
  expect(focus.titleDecoration).toBe("underline");
  expect(focus.titleDecorationColour).toBe("rgb(30, 95, 168)");
});

test("DS-9: no other Desk control lost its focus ring", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await landing(page);

  // The fix is scoped to `.br .brst`. The command bar's own links sit in the
  // same `.ponte-desk` scope and must still take the blanket ring.
  const navShadow = await page.evaluate(() => {
    const link = document.querySelector(".cmd__nav a, .cmd a[href='/market-signals']") as HTMLElement | null;
    if (!link) return null;
    link.focus();
    return getComputedStyle(link).boxShadow;
  });
  expect(navShadow, "no command-bar link found to check").not.toBeNull();
  expect(navShadow, "a Desk control outside the bridge lost its focus ring").toContain("rgb(30, 95, 168)");
});

// ---------------------------------------------------------------------------
// 5-6. Mobile 390 x 844
// ---------------------------------------------------------------------------

test("mobile evidence at 390 x 844: default and selected", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const bridge = await landing(page);

  // Below a 460px container the approved vertical treatment is used.
  await expect(bridge).toHaveClass(/br--v/);
  await reveal(page);
  await shot(page, "mobile-1-family-neutral-390x844");

  await stations(page).nth(0).click();
  await unhover(page);
  await expect(page.locator(".pbridge > .br .brst--on .brst__t")).toHaveText("Products");
  await expect(page.locator(".pbridge .brx:not([hidden])")).toHaveCount(1);
  await reveal(page);
  await shot(page, "mobile-2-products-selected-390x844");

  // The whole page, so the bridge can be seen in its place rather than only as
  // a frame lifted out of it.
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: `${EVIDENCE}/mobile-3-page-390x844.png`, fullPage: true, animations: "disabled" });
});

// ---------------------------------------------------------------------------
// 7. Keyboard focus
// ---------------------------------------------------------------------------

test("keyboard evidence: focus is visible and the group is one tab stop", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await landing(page);

  // Reach the bridge by tabbing, which is the only honest way to prove it is a
  // single tab stop: if it were three, this count would be wrong.
  let guard = 0;
  while (guard++ < 40) {
    await page.keyboard.press("Tab");
    const onBridge = await page.evaluate(() => !!document.activeElement?.closest(".pbridge"));
    if (onBridge) break;
  }
  expect(guard, "never reached the bridge by tabbing").toBeLessThan(40);

  const focused = page.locator(".pbridge > .br .brst:focus");
  await expect(focused).toHaveCount(1);

  /*
    One more Tab must leave the bridge entirely: a radiogroup is one stop, and
    arrow keys move within it.

    Asserted BEFORE the evidence frame, not after. `shotFramed` takes a
    full-page capture, which scrolls and resizes the page, and a Tab pressed
    immediately afterwards is swallowed - focus stays exactly where it was.
    That read as a focus trap the product does not have: isolating the capture
    shows this same assertion passing with the screenshot removed and failing
    with it, and a raw tab trace of the landing puts focus on the station at
    stop 6 and out of `.pbridge` at stop 7.
  */
  await page.keyboard.press("Tab");
  expect(await page.evaluate(() => !!document.activeElement?.closest(".pbridge"))).toBe(false);

  // Back onto the station, so the frame records the focused state it is for.
  await page.keyboard.press("Shift+Tab");
  await expect(focused).toHaveCount(1);
  await shotFramed(page, "desktop-5-keyboard-focus");
});

test("keyboard selection: arrows traverse and select, and focus follows", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await landing(page);

  await stations(page).nth(0).focus();
  await stations(page).nth(0).press("ArrowRight");
  await expect(stations(page).nth(1)).toHaveAttribute("aria-checked", "true");
  await expect(stations(page).nth(1)).toBeFocused();
  await expect(page.locator(".pbridge .brx:not([hidden])")).toHaveAttribute("aria-label", /^Trade services:/);

  await stations(page).nth(1).press("ArrowRight");
  await expect(stations(page).nth(2)).toBeFocused();
  await expect(stations(page).nth(2)).toHaveAttribute("aria-checked", "true");

  // Wraps at the end, which is the platform behaviour for a radiogroup.
  await stations(page).nth(2).press("ArrowRight");
  await expect(stations(page).nth(0)).toBeFocused();

  // Home and End are deliberately absent: the approved engine binds only the
  // four arrows, and this is a translation of it rather than an improvement on
  // it. Asserted so their absence is a recorded decision, not a gap.
  await stations(page).nth(0).press("End");
  await expect(stations(page).nth(0)).toBeFocused();

  // Space and Enter activate a button; the selection must survive them.
  await stations(page).nth(0).press("Enter");
  await expect(stations(page).nth(0)).toHaveAttribute("aria-checked", "true");
  await expect(stations(page).nth(0)).toBeFocused();
});

// ---------------------------------------------------------------------------
// 8. Reduced motion
// ---------------------------------------------------------------------------

test("reduced motion evidence: movement removed, settled state complete", async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: "reduce", viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  await landing(page);
  await stations(page).nth(0).click();
  await unhover(page);

  // The runner is the moving mark. Under reduced motion the approved stylesheet
  // removes it outright rather than slowing it.
  await expect(page.locator(".pbridge .br__runner")).toHaveCount(0);

  const settled = await page.evaluate(() => {
    const on = document.querySelector(".pbridge > .br .brst--on")!;
    const node = on.querySelector(".brst__n")!;
    const mark = on.querySelector(".brst__mk")!;
    const live = document.querySelector(".pbridge > .br .d-live");
    const c = getComputedStyle;
    return {
      selected: on.querySelector(".brst__t")!.textContent,
      nodeWidth: c(node).width,
      nodeBackground: c(node).backgroundColor,
      markOpacity: c(mark).opacity,
      markText: mark.textContent,
      liveDeckDrawn: !!live && c(live).strokeDasharray === "none",
      actionsVisible: document.querySelectorAll(".pbridge .brx:not([hidden]) a").length,
      anyRunningAnimation: document
        .querySelectorAll(".pbridge *")
        .length > 0 &&
        Array.from(document.querySelectorAll(".pbridge *")).some((el) =>
          (el as HTMLElement).getAnimations?.().some((a) => a.playState === "running"),
        ),
    };
  });

  // Every piece of information the animated version conveys is present without
  // it: the chosen family, the gold node at its selected size, the "Selected"
  // word, the drawn deck, and all three destinations.
  expect(settled.selected).toBe("Products");
  expect(settled.nodeWidth).toBe("15px");
  expect(settled.nodeBackground).toBe("rgb(126, 89, 20)"); // --pf-gold-ink (#7E5914)
  expect(settled.markOpacity).toBe("1");
  expect(settled.markText).toBe("Selected route");
  expect(settled.liveDeckDrawn).toBe(true);
  expect(settled.actionsVisible).toBe(3);
  expect(settled.anyRunningAnimation).toBe(false);

  await shotFramed(page, "desktop-6-reduced-motion");
  await context.close();
});

// ---------------------------------------------------------------------------
// 9. The gold runner, as a deterministic stepped sequence
// ---------------------------------------------------------------------------

test("motion evidence: the gold runner crosses, then stops", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await landing(page);

  // Start from the far station, so the crossing that follows is the longest one
  // available and the runner's position is unambiguous in every frame.
  await stations(page).nth(2).click();
  await unhover(page);
  await page.waitForTimeout(1000);

  /*
    Two things have to be held still to make this a sequence rather than five
    lucky samples.

    The animation itself: paused, and its `currentTime` set by hand. Sampling a
    live animation would give different frames on every run.

    And the runner's lifetime: the component removes it about 900ms after a
    selection, because a moving point must not outlive the work it represents.
    That is correct behaviour and it is asserted at the end of this test, but it
    also means the element would vanish part-way through the capture. So the
    cleanup timer alone is suspended first. Nothing else is stubbed, and the
    real timer is restored before the settling assertion.
  */
  await page.evaluate(() => {
    const real = window.setTimeout;
    (window as unknown as { __realTimeout: typeof setTimeout }).__realTimeout = real;
    window.setTimeout = ((fn: TimerHandler, ms?: number, ...rest: unknown[]) =>
      typeof ms === "number" && ms >= 800 ? 0 : real(fn, ms, ...(rest as []))) as typeof setTimeout;
  });

  await stations(page).nth(0).click();
  await unhover(page);
  await expect(page.locator(".pbridge .br__runner")).toHaveCount(1);

  const RUNNER_MS = 620; // .br__runner--go { animation: br-travel 620ms ... }
  const steps = [0, 0.25, 0.5, 0.75, 1];

  const positions: number[] = [];
  for (let index = 0; index < steps.length; index++) {
    const fraction = steps[index];
    const x = await page.evaluate((time) => {
      const runner = document.querySelector(".pbridge .br__runner");

      /*
        Step the runner, and settle everything else.

        The first version stepped every animation in the bridge to the same
        `currentTime`, which put the revealed action section's `br-reveal`
        translate at a fractional pixel offset. Its text then anti-aliased
        differently from run to run, so two of the five frames were never
        byte-identical twice. The sequence is about the runner; every other
        animation is finished so it contributes a stable, settled frame.
      */
      document.querySelectorAll(".pbridge *").forEach((el) => {
        if (el === runner) return;
        (el as HTMLElement).getAnimations?.().forEach((a) => a.finish());
      });

      (runner as HTMLElement | null)?.getAnimations?.().forEach((a) => {
        a.pause();
        a.currentTime = time;
      });

      return runner ? Math.round(runner.getBoundingClientRect().x) : -1;
    }, RUNNER_MS * fraction);
    positions.push(x);

    // No `animations: "disabled"` here, deliberately: that option finishes every
    // animation at its end state, which would overwrite the frame just posed and
    // produce five identical images.
    await shotFramed(page, `desktop-7-runner-step-${index + 1}-of-5`);
  }

  // The frames are only evidence of movement if the runner actually moved.
  //
  // It travels LEFT TO RIGHT regardless of which station was chosen before,
  // because the engine builds the runner's offset-path as the live deck itself:
  // `seg(m, 0, ts[selIx])`, always from the near abutment to the chosen station.
  // The signal crosses the bridge; it does not slide between two stations.
  expect(new Set(positions).size, `the runner did not move: ${positions.join(", ")}`).toBe(steps.length);
  for (let i = 1; i < positions.length; i++) {
    expect(positions[i], `frame ${i + 1} did not advance`).toBeGreaterThan(positions[i - 1]);
  }

  // And the point of the sequence: once the state settles the gold signal is
  // gone. A moving point means work is happening now, so one that kept moving
  // after the choice was made would be a false claim.
  await page.evaluate(() => {
    window.setTimeout = (window as unknown as { __realTimeout: typeof setTimeout }).__realTimeout;
    document.querySelectorAll(".pbridge .br *").forEach((el) => {
      (el as HTMLElement).getAnimations?.().forEach((a) => a.play());
    });
  });
  await stations(page).nth(1).click();
  await unhover(page);
  await expect(page.locator(".pbridge .br__runner")).toHaveCount(0, { timeout: 5000 });
});

/*
  The settled frame is captured on its own page, not at the end of the stepped
  sequence above.

  That test pauses every animation and rewinds their `currentTime` by hand. Even
  after playing them again the animations are resumed from arbitrary offsets, and
  the frame taken afterwards was not byte-stable between runs, while the DOM,
  the live deck and every measured position provably were. Rather than chase an
  animation-frame difference, the frame is taken from a clean load where the
  selection is made normally. That is also what the frame claims to show.
*/
test("motion evidence: the settled bridge, from a clean load", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await landing(page);

  await stations(page).nth(0).click();
  await unhover(page);
  await expect(page.locator(".pbridge .br__runner")).toHaveCount(0, { timeout: 5000 });
  await measured(page);
  await shotFramed(page, "desktop-8-runner-settled");
});

// ---------------------------------------------------------------------------
// Destinations: the part that must not have changed
// ---------------------------------------------------------------------------

test("all nine action destinations are preserved exactly", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await landing(page);

  const order = ["products", "services", "distribution"] as const;
  for (let index = 0; index < order.length; index++) {
    const family = order[index];
    await stations(page).nth(index).click();
    const links = page.locator(".pbridge .brx:not([hidden]) a");
    await expect(links).toHaveCount(DESTINATIONS[family].length);

    const hrefs = await links.evaluateAll((nodes) =>
      nodes.map((n) => (n as HTMLAnchorElement).getAttribute("href")),
    );
    expect(hrefs, `${family} destinations changed`).toEqual([...DESTINATIONS[family]]);
  }
});

test("every destination is reachable and none of them 404s", async ({ page }) => {
  // A correct href that leads nowhere is still a broken journey, so each one is
  // actually followed. Business logic is untouched by this PR; this asserts the
  // routes it points at still answer.
  const all = [...DESTINATIONS.products, ...DESTINATIONS.services, ...DESTINATIONS.distribution];
  for (const href of all) {
    const response = await page.goto(href, { waitUntil: "domcontentloaded" });
    expect(response?.status(), `${href} did not answer`).toBeLessThan(400);
  }
});

test("without JavaScript every destination is still a link", async ({ browser }) => {
  // The grid this replaced was nine plain server-rendered links. The bridge is a
  // selection and needs a client, so the fallback has to be real rather than
  // asserted in a comment.
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  await page.goto("/", { waitUntil: "domcontentloaded" });

  const hrefs = await page.locator(".pbridge .brx a").evaluateAll((nodes) =>
    nodes.map((n) => (n as HTMLAnchorElement).getAttribute("href")),
  );
  expect(hrefs).toEqual([
    ...DESTINATIONS.products,
    ...DESTINATIONS.services,
    ...DESTINATIONS.distribution,
  ]);
  await context.close();
});

// ---------------------------------------------------------------------------
// The bridge is readable when the JS positioning has not run
// ---------------------------------------------------------------------------

/**
 * Measure a bridge that has not been positioned.
 *
 * The horizontal bridge is placed entirely by a layout effect: an inline
 * `left`, `top` and `width` on every station, then the stage's height from its
 * lowest child. The approved stylesheet gives `.brst` `position: absolute` and
 * no coordinates, correctly, because the coordinates come from the measured
 * curve. So without that effect every station lands on the same static
 * position and the stage keeps zero height. The result is a pile of overprinted
 * text with the next section drawn over it, which is what the landing looked
 * like in Chrome on 31 July 2026 after the deploy of `f26718a`.
 *
 * There are two ways to arrive in that state and they are NOT the same DOM.
 *
 * `javaScriptEnabled: false` is a browser with scripting turned off. The
 * `<noscript>` rule in `LandingBridges.tsx` fires, so all three action bridges
 * are unhidden and every destination is on the page as a link.
 *
 * A client chunk that fails to arrive is a browser with scripting ON. The
 * `<noscript>` rule does **not** fire, React never hydrates, and the action
 * bridges stay `hidden`. This is what actually happened on 31 July 2026, and
 * the earlier version of this file could not reproduce it: it tested the first
 * case and described it as the second.
 *
 * The fallback has to hold in both, so both are run, and `actionBridgesVisible`
 * below records which state each one is. If that number ever matches across the
 * two modes, one of them has stopped being the case it was written for.
 */
async function unpositioned(page: Page) {
  return page.evaluate(() => {
    const rects = (nodes: Element[]) => nodes.map((n) => n.getBoundingClientRect());
    const overlapping = (boxes: DOMRect[]) => {
      const pairs: string[] = [];
      for (let i = 0; i < boxes.length; i++) {
        for (let j = i + 1; j < boxes.length; j++) {
          const a = boxes[i];
          const b = boxes[j];
          // A half-pixel of tolerance: sub-pixel layout must not read as an
          // overlap, but the failure this guards against is total, not marginal.
          const hit = a.left < b.right - 0.5 && b.left < a.right - 0.5 && a.top < b.bottom - 0.5 && b.top < a.bottom - 0.5;
          if (hit) pairs.push(`${i}/${j}`);
        }
      }
      return pairs;
    };

    const de = document.documentElement;
    const stages = Array.from(document.querySelectorAll<HTMLElement>(".pbridge .br__stage"));
    const family = Array.from(document.querySelectorAll(".pbridge > .br .brst"));
    const familyBoxes = rects(family);
    const below = document.querySelector("section.sec");
    const lowest = [...familyBoxes].sort((a, b) => b.bottom - a.bottom)[0];

    return {
      stages: stages.length,
      // If any stage carries this, the measurement DID run and the test would
      // be asserting the measured layout rather than the fallback.
      measured: stages.filter((s) => s.hasAttribute("data-measured")).length,
      /*
        Only the stages that are actually displayed.

        A stage inside a `hidden` action bridge is `display: none` and has no
        box, correctly: with the bundle missing the noscript rule does not fire,
        so the three action bridges stay hidden and only the family bridge is
        on the page. Measuring those as "a stage that collapsed to 0px" would
        report the designed behaviour as the defect.
      */
      stageHeights: stages
        .filter((s) => s.offsetParent !== null)
        .map((s) => Math.round(s.getBoundingClientRect().height)),
      stations: family.length,
      // Every station must have a box of its own, and no two of them may
      // occupy the same one.
      empty: familyBoxes.filter((b) => b.width < 1 || b.height < 1).length,
      overlaps: overlapping(familyBoxes),
      // In the fallback the stations wrap, so the lowest one is not always the
      // last in the document.
      gapToSectionBelow: below && lowest ? Math.round(below.getBoundingClientRect().top - lowest.bottom) : null,
      // Every action destination is still a link, and each of those bridges has
      // an unmeasured stage of its own.
      actionLinks: document.querySelectorAll(".pbridge .brx a").length,
      // Which of the two unpositioned states this is. The `<noscript>` rule
      // unhides all three action bridges, so scripting-off shows 3 and a
      // missing bundle shows 0. Measured as a box rather than by the `hidden`
      // attribute, which stays put in both: the noscript rule overrides it with
      // `display: block !important` without removing it.
      actionBridgesVisible: Array.from(document.querySelectorAll(".pbridge .brx")).filter(
        (section) => section.getBoundingClientRect().height > 0,
      ).length,
      actionOverlaps: Array.from(document.querySelectorAll(".pbridge .brx")).map((section) =>
        overlapping(rects(Array.from(section.querySelectorAll(".brst")))).length,
      ),
      scrolls: de.scrollWidth > de.clientWidth,
      scrollWidth: de.scrollWidth,
      clientWidth: de.clientWidth,
    };
  });
}

/**
 * The two ways the positioning does not run.
 *
 * `slug` names the evidence frame. `actionBridgesVisible` is the expected
 * discriminator, asserted rather than assumed, so neither mode can quietly
 * become the other.
 */
const UNPOSITIONED_MODES = [
  {
    name: "with scripting off",
    slug: "no-positioning",
    javaScriptEnabled: false,
    blockChunks: false,
    // The noscript rule fires and reveals all three.
    actionBridgesVisible: 3,
  },
  {
    name: "with the client chunks missing",
    slug: "no-chunks",
    javaScriptEnabled: true,
    blockChunks: true,
    // Scripting is on, so the noscript rule does not fire and they stay hidden.
    actionBridgesVisible: 0,
  },
] as const;

for (const viewport of [
  { width: 1280, height: 900 },
  { width: 390, height: 844 },
]) {
  for (const mode of UNPOSITIONED_MODES) {
    test(`the bridge is readable ${mode.name} at ${viewport.width}px`, async ({ browser }) => {
      const context = await browser.newContext({ javaScriptEnabled: mode.javaScriptEnabled, viewport });
      const page = await context.newPage();
      /*
        Aborting the chunks is the only way to reach the state that reached
        production: a live document, scripting enabled, and no client. Nothing
        else in the request is touched - the HTML, the CSS and the fonts all
        arrive exactly as they do in a working load, which is what made the
        failure look like a design change rather than a delivery one.
      */
      if (mode.blockChunks) await page.route("**/_next/static/chunks/**", (route) => route.abort());
      await page.goto("/", { waitUntil: "domcontentloaded" });
      await expect(page.locator(".pbridge .br__stage").first()).toBeVisible();

      const state = await unpositioned(page);

      // This mode really is the state it claims to be, and not the other one.
      expect(
        state.actionBridgesVisible,
        `expected ${mode.actionBridgesVisible} visible action bridges ${mode.name}`,
      ).toBe(mode.actionBridgesVisible);

      // The premise: this really is the unmeasured state.
      expect(state.measured, "a stage was measured, so this is not the fallback").toBe(0);
      expect(state.stations, "the family bridge did not server-render its stations").toBe(3);

      // The stage has a height, so whatever follows the bridge starts below it.
      for (const height of state.stageHeights) {
        expect(height, `an unmeasured stage collapsed to ${height}px`).toBeGreaterThan(0);
      }

      // And the stations are three separate blocks rather than one overprinted
      // one. This is the assertion that would have failed on 31 July.
      expect(state.empty, "a station has no box of its own").toBe(0);
      expect(state.overlaps, `family stations overlap each other: ${state.overlaps.join(", ")}`).toEqual([]);
      expect(state.actionOverlaps, "action stations overlap each other").toEqual([0, 0, 0]);

      // The section beneath the bridge is not drawn over it.
      expect(state.gapToSectionBelow, "no section was found below the bridge").not.toBeNull();
      expect(
        state.gapToSectionBelow!,
        "the section below the bridge overlaps the unpositioned stations",
      ).toBeGreaterThan(0);

      // The fallback must not trade one failure for another.
      expect(state.scrolls, `page scrolls horizontally: ${state.scrollWidth} > ${state.clientWidth}`).toBe(false);

      /*
        Every destination is still in the document, in both modes and for two
        different reasons: with scripting off the noscript rule reveals them,
        and with the bundle missing they are present but `hidden`. The count is
        the same either way, which is the point - the markup does not depend on
        the client, only its visibility does.
      */
      expect(state.actionLinks, "an action destination left the document").toBe(8);

      await page.screenshot({
        path: `${EVIDENCE}/fallback-${mode.slug}-${viewport.width}x${viewport.height}.png`,
        fullPage: true,
        animations: "disabled",
      });
      await context.close();
    });
  }
}

test("the measurement retires the fallback, and the settled bridge is the measured one", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await landing(page);
  await settled(page);

  // The other half of the contract. If the attribute were never set, the
  // fallback's flex row would still be laying out the settled bridge and every
  // approved reference frame would be wrong.
  const measured = await page.evaluate(() => {
    const stage = document.querySelector<HTMLElement>(".pbridge > .br .br__stage");
    const station = stage?.querySelector<HTMLElement>(".brst");
    if (!stage || !station) return null;
    return {
      attribute: stage.hasAttribute("data-measured"),
      stagePosition: getComputedStyle(stage).display,
      stationPosition: getComputedStyle(station).position,
      inlineLeft: station.style.left,
      inlineHeight: stage.style.height,
    };
  });

  expect(measured, "the measured stage was not found").not.toBeNull();
  expect(measured!.attribute, "the measurement never retired the fallback").toBe(true);
  expect(measured!.stagePosition, "the fallback flex layout survived the measurement").toBe("block");
  expect(measured!.stationPosition, "a measured station is not absolutely positioned").toBe("absolute");
  expect(measured!.inlineLeft, "a measured station carries no measured left").not.toBe("");
  expect(measured!.inlineHeight, "the stage was never sized from its lowest child").not.toBe("");
});

test("an unmeasurable deck keeps the fallback rather than collapsing onto one point", async ({ page }) => {
  /*
    The third way the positioning can fail, and the only one that is silent.

    `BridgeRoute` measures the deck with `getTotalLength()` and multiplies that
    length by each station's fraction of the curve. A length of 0 or NaN returns
    the same point for every station - so all three would be written to one
    coordinate, `data-measured` would still be set, and the readable fallback
    would be retired in favour of the exact pile it exists to prevent. Worse
    than not measuring at all, because the fallback would have handled it.

    No supported engine returns 0 here: Firefox 153 and Chromium 151 both agree
    with each other to three decimal places on the same deck. So the failure is
    injected rather than waited for. `addInitScript` runs before any page script,
    which is the only way to have the stub in place before the layout effect.
  */
  await page.addInitScript(() => {
    // Only the length. `getPointAtLength` is left alone deliberately: the guard
    // must key on the measurement it actually uses, not on a wholesale removal
    // of SVG geometry that would fail for a dozen other reasons.
    Object.defineProperty(SVGPathElement.prototype, "getTotalLength", {
      configurable: true,
      value: () => 0,
    });
  });

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.locator(".pbridge > .br .br__stage")).toBeVisible();
  // Hydration has to have happened, or this proves nothing: the assertions
  // below would pass on a page whose client never ran at all.
  await expect(page.locator(".pbridge > .br .brst").first()).toHaveAttribute("tabindex", "0");

  const state = await page.evaluate(() => {
    const stage = document.querySelector<HTMLElement>(".pbridge > .br .br__stage");
    const stations = Array.from(document.querySelectorAll<HTMLElement>(".pbridge > .br .brst"));
    if (!stage || stations.length !== 3) return null;
    const boxes = stations.map((s) => s.getBoundingClientRect());
    const overlaps: string[] = [];
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i];
        const b = boxes[j];
        if (a.left < b.right - 0.5 && b.left < a.right - 0.5 && a.top < b.bottom - 0.5 && b.top < a.bottom - 0.5) {
          overlaps.push(`${i}/${j}`);
        }
      }
    }
    const below = document.querySelector("section.sec");
    return {
      measured: stage.hasAttribute("data-measured"),
      // No station may carry a written coordinate: the effect must have stopped
      // before it positioned anything, not after positioning against zero.
      written: stations.filter((s) => s.style.left !== "").length,
      overlaps,
      stageHeight: Math.round(stage.getBoundingClientRect().height),
      gapToSectionBelow: below
        ? Math.round(below.getBoundingClientRect().top - Math.max(...boxes.map((b) => b.bottom)))
        : null,
      titles: stations.map((s) => s.querySelector(".brst__t")?.textContent ?? ""),
    };
  });

  expect(state, "the family bridge did not render").not.toBeNull();
  expect(state!.measured, "the fallback was retired against an unmeasurable deck").toBe(false);
  expect(state!.written, "a station was positioned against a zero-length deck").toBe(0);
  expect(state!.overlaps, "stations collapsed onto one point").toEqual([]);
  expect(state!.stageHeight, "the stage has no height").toBeGreaterThan(0);
  expect(state!.gapToSectionBelow!, "the bridge overlaps the section below it").toBeGreaterThan(0);
  expect(state!.titles).toEqual(["Products", "Trade services", "Distribution and representation"]);
});

// ---------------------------------------------------------------------------
// Layout: no horizontal overflow at the widths the Bridge notes name
// ---------------------------------------------------------------------------

for (const width of [320, 360, 390, 430]) {
  test(`no horizontal overflow at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await landing(page);
    await stations(page).nth(2).click(); // the longest family name, and 3 actions

    const overflow = await page.evaluate(() => {
      const de = document.documentElement;
      const offenders: string[] = [];
      document.querySelectorAll(".pbridge *").forEach((el) => {
        const box = el.getBoundingClientRect();
        if (box.width > 0 && box.right > de.clientWidth + 0.5) {
          offenders.push(`${el.className || el.tagName} -> ${Math.round(box.right)}`);
        }
      });
      return { page: de.scrollWidth > de.clientWidth, scrollWidth: de.scrollWidth, client: de.clientWidth, offenders };
    });

    expect(overflow.page, `page scrolls horizontally: ${overflow.scrollWidth} > ${overflow.client}`).toBe(false);
    expect(overflow.offenders, "a bridge element extends past the viewport").toEqual([]);

    /*
      And vertically, which is the failure that actually shipped: the elevation
      rows box kept an inline height left behind by the horizontal stage's `fit`,
      because React reused the same div for both modes. The box stopped 44px
      short of its own content and the last station's description ran over the
      Market Signals section beneath it.

      Two independent checks, because either alone would have missed it: the
      rows box must contain its own stations, and the bridge must not reach the
      section below it.
    */
    const vertical = await page.evaluate(() => {
      const rows = document.querySelector(".pbridge > .br .br__rows") as HTMLElement | null;
      const stations = Array.from(document.querySelectorAll(".pbridge > .br .brst"));
      const last = stations[stations.length - 1];
      const below = document.querySelectorAll("section.sec")[0];
      if (!rows || !last || !below) return null;
      return {
        rowsInlineHeight: rows.style.height || null,
        overflowsOwnBox: rows.scrollHeight > rows.offsetHeight,
        gapToSectionBelow: Math.round(below.getBoundingClientRect().top - last.getBoundingClientRect().bottom),
      };
    });

    expect(vertical, "the elevation rows were not found").not.toBeNull();
    expect(vertical!.rowsInlineHeight, "the rows box has an inline height, which will clip its stations").toBeNull();
    expect(vertical!.overflowsOwnBox, "the rows box is shorter than the stations inside it").toBe(false);
    expect(
      vertical!.gapToSectionBelow,
      "the last station overlaps the section below the bridge",
    ).toBeGreaterThan(0);
  });
}

// ---------------------------------------------------------------------------
// The headline, which this slice must not touch
// ---------------------------------------------------------------------------

test("the approved gold italic headline emphasis is intact", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await landing(page);

  const emphasis = page.locator("h1 em");
  await expect(emphasis).toHaveText("signal to deal.");
  const style = await emphasis.evaluate((el) => {
    const c = getComputedStyle(el);
    return { colour: c.color, style: c.fontStyle, family: c.fontFamily };
  });
  expect(style.style).toBe("italic");
  expect(style.colour).toBe("rgb(126, 89, 20)"); // --pf-gold-ink (#7E5914, ADR-0015 Stage 1), AA on cream
  expect(style.family.toLowerCase()).toContain("playfair");
});
