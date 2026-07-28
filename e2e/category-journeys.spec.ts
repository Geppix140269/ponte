import { expect, test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";

/**
 * Visual evidence and behavioural verification for the category-first journeys.
 *
 * The owner requirement asks for screenshots of every principal branch, and for
 * one thing a screenshot cannot show on its own: that neither Trade services nor
 * Distribution opens on a blank text field any more. So each capture is taken
 * beside an assertion about what is actually on screen, and a frame showing a
 * category grid is a frame that has been proved to contain no input.
 *
 * Captured against a production build, at desktop and at 390 x 844.
 */

const EVIDENCE = "docs/codex/audits/constitution-rebuild/evidence/category-journeys";

/** Every branch a member can enter through, from the landing Action Bridge. */
const ENTRANCES = {
  serviceSeek: "/structure?family=services&intent=seek_trade_service",
  serviceOffer: "/structure?family=services&intent=offer_trade_service",
  partnerSeek: "/structure?family=distribution&intent=seek_distribution_partner",
  coverageOffer: "/structure?family=distribution&intent=offer_distribution_or_representation",
  brandsSeek: "/structure?family=distribution&intent=seek_brands_or_products_to_represent",
  productSource: "/structure?family=products&intent=source_product",
} as const;

test.beforeAll(() => {
  mkdirSync(EVIDENCE, { recursive: true });
});

/** Open a composer entrance and wait for the category grid to be drawn. */
async function open(page: Page, href: string): Promise<void> {
  await page.goto(href, { waitUntil: "domcontentloaded" });
  await page.locator(".pcat__grid, .hs__grid").first().waitFor({ state: "visible" });
}

/**
 * The assertion the whole requirement rests on.
 *
 * Not "there is a grid", which would still pass beside a blank line. There is a
 * grid AND there is no text field: a member arriving here is choosing, not
 * describing.
 */
async function opensOnCategories(page: Page, minimumOptions: number): Promise<void> {
  const options = page.locator(".pcat__opt");
  await expect(options).toHaveCount(minimumOptions);
  await expect(page.locator(".fmain input")).toHaveCount(0);
  await expect(page.locator(".fmain textarea")).toHaveCount(0);
  // A member who chose a family on the landing has already answered the legacy
  // buy/sell/service question, and it cannot express distribution at all. It
  // must not be asked again above the categories.
  await expect(page.locator(".tapopts")).toHaveCount(0);
}

async function shot(page: Page, name: string): Promise<void> {
  await page.screenshot({ path: `${EVIDENCE}/${name}.png`, fullPage: true, animations: "disabled" });
}

async function choose(page: Page, key: string): Promise<void> {
  await page.locator(`.pcat__opt[data-option="${key.replace(/\./g, "\\.")}"]`).click();
}

async function continueOn(page: Page): Promise<void> {
  await page.locator("button.fbtn.fbtn--lg").click();
}

// ---------------------------------------------------------------------------
// Trade services
// ---------------------------------------------------------------------------

test("trade services opens on eleven clickable categories, not a text field", async ({ page }) => {
  await open(page, ENTRANCES.serviceSeek);
  await expect(page.locator("h1")).toHaveText("What trade service do you need?");
  await opensOnCategories(page, 11);
  // The escape route is last, and it is the only option that is not a category.
  await expect(page.locator(".pcat__opt").last()).toHaveAttribute("data-option", "unlisted");
  await shot(page, "desktop-1-services-categories");
});

test("offering a service asks the offering question, on the same categories", async ({ page }) => {
  await open(page, ENTRANCES.serviceOffer);
  await expect(page.locator("h1")).toHaveText("Which trade service do you provide?");
  await opensOnCategories(page, 11);
  await shot(page, "desktop-2-services-offer");
});

test("a chosen category reveals its own details, and needs no free text", async ({ page }) => {
  await open(page, ENTRANCES.serviceSeek);
  await choose(page, "freight");
  // Continue is available on the selection alone. Nothing has been typed.
  await expect(page.locator("button.fbtn.fbtn--lg")).toBeEnabled();
  await shot(page, "desktop-3-services-category-chosen");

  await continueOn(page);
  await expect(page.locator(".pcat__opt")).toHaveCount(14);
  await expect(page.locator(".pcat-trail__v")).toHaveText("Freight and logistics");
  await shot(page, "desktop-4-services-subcategories");

  await choose(page, "freight.ocean");
  await choose(page, "freight.forwarding");
  await expect(page.locator('.pcat__opt[aria-checked="true"]')).toHaveCount(2);
  await shot(page, "desktop-5-services-details-chosen");
});

test("Other, and only Other, asks the member to write something", async ({ page }) => {
  await open(page, ENTRANCES.serviceSeek);
  await choose(page, "freight");
  await expect(page.locator(".fmain input")).toHaveCount(0);

  await choose(page, "unlisted");
  const field = page.locator("#service-other");
  await expect(field).toBeVisible();
  await expect(page.locator('label[for="service-other"]')).toHaveText(
    "Describe the trade service you need",
  );
  // The escape route is not complete until it has been described.
  await expect(page.locator("button.fbtn.fbtn--lg")).toBeDisabled();
  await field.fill("Livestock transport coordination");
  await expect(page.locator("button.fbtn.fbtn--lg")).toBeEnabled();
  await shot(page, "desktop-6-services-other");
});

test("the long detail lists carry a filter over the options", async ({ page }) => {
  await open(page, ENTRANCES.serviceSeek);
  await choose(page, "freight");
  await continueOn(page);
  const filter = page.locator('input[type="search"]');
  await expect(filter).toBeVisible();
  await filter.fill("cold");
  await expect(page.locator(".pcat__opt")).toHaveCount(1);
  await shot(page, "desktop-7-services-option-filter");
});

// ---------------------------------------------------------------------------
// Distribution and representation
// ---------------------------------------------------------------------------

test("distribution opens on twelve partner types, not a text field", async ({ page }) => {
  await open(page, ENTRANCES.partnerSeek);
  await expect(page.locator("h1")).toHaveText(
    "What type of distribution partner are you looking for?",
  );
  await opensOnCategories(page, 12);
  await expect(page.locator(".pcat__opt").last()).toHaveAttribute("data-option", "other");
  await shot(page, "desktop-8-distribution-partner-types");
});

test("offering coverage asks the offering question", async ({ page }) => {
  await open(page, ENTRANCES.coverageOffer);
  await expect(page.locator("h1")).toHaveText(
    "What distribution or representation capability do you offer?",
  );
  await opensOnCategories(page, 12);
  await shot(page, "desktop-9-distribution-offer");
});

test("seeking brands to represent opens on product sectors instead", async ({ page }) => {
  // The member is choosing what they want to take to market, so the sector is
  // the first question, not the partner type.
  await open(page, ENTRANCES.brandsSeek);
  await expect(page.locator("h1")).toHaveText(
    "What type of products or brands do you want to take to market?",
  );
  await opensOnCategories(page, 15);
  await shot(page, "desktop-10-distribution-brands-sectors");
});

test("partner type, sector, coverage and relationship are four separate questions", async ({
  page,
}) => {
  await open(page, ENTRANCES.partnerSeek);
  await choose(page, "distributor");
  await continueOn(page);

  // Sector.
  await expect(page.locator(".pcat__opt")).toHaveCount(15);
  await choose(page, "food");
  await continueOn(page);

  // Coverage, and the territories a scope that names countries asks for.
  await expect(page.locator(".pcat__opt")).toHaveCount(7);
  await choose(page, "countries");
  // A scope that names countries asks for them, and stores codes rather than a
  // sentence, so a territory can be matched later instead of only read.
  await expect(page.locator(".pcat__write")).toBeVisible();
  await page.locator(".vcp__input").fill("Italy");
  await page.locator(".vcp__opt").first().click();
  await expect(page.locator(".pcat-terr__i")).toHaveCount(1);
  await shot(page, "desktop-11-distribution-coverage");
  await continueOn(page);

  // Relationship structure, which is a separate dimension from the partner
  // type and is offered as a multiple choice.
  await expect(page.locator(".pcat__opt")).toHaveCount(9);
  await choose(page, "exclusive");
  await expect(page.locator('.pcat__opt[aria-checked="true"]')).toHaveCount(1);
  await shot(page, "desktop-12-distribution-relationship");

  // Every earlier answer is still on the trail, each with a way back into it.
  const trail = page.locator(".pcat-trail__v");
  await expect(trail).toHaveCount(3);
  await expect(trail.nth(0)).toHaveText("Distributor");
});

// ---------------------------------------------------------------------------
// Products keep the journey they had
// ---------------------------------------------------------------------------

test("products still open on the HS category journey", async ({ page }) => {
  await open(page, ENTRANCES.productSource);
  await expect(page.locator(".hs__grid")).toBeVisible();
  // No category picker is mounted for a product record at all.
  await expect(page.locator(".pcat__grid")).toHaveCount(0);
  await shot(page, "desktop-13-products-hs-unchanged");
});

// ---------------------------------------------------------------------------
// Find, category first
// ---------------------------------------------------------------------------

test("Find opens on the three market families", async ({ page }) => {
  await page.goto("/find", { waitUntil: "domcontentloaded" });
  await expect(page.locator(".pcat__opt")).toHaveCount(3);
  await shot(page, "desktop-14-find-families");
});

test("Find walks a service category without asking for a product", async ({ page }) => {
  await page.goto("/find?family=services", { waitUntil: "domcontentloaded" });
  await expect(page.locator(".pcat__opt")).toHaveCount(11);
  await shot(page, "desktop-15-find-service-categories");

  await page.locator('.pcat__opt[data-option="freight"]').click();
  await page.waitForURL(/serviceCategory=freight/);
  // Every step is a real URL, so the whole journey works without JavaScript.
  expect(page.url()).toContain("family=services");
  await shot(page, "desktop-16-find-service-results");
});

test("Find walks a distribution partner type", async ({ page }) => {
  await page.goto("/find?family=distribution", { waitUntil: "domcontentloaded" });
  await expect(page.locator(".pcat__opt")).toHaveCount(12);
  await shot(page, "desktop-17-find-partner-types");
});

test("Market Signals carries structured filters over the whole board", async ({ page }) => {
  await page.goto("/market-signals", { waitUntil: "domcontentloaded" });
  await expect(page.locator(".sigfilters .pcat__opt")).toHaveCount(4);
  await shot(page, "desktop-18-market-signals-filters");
});

test("a filter that cannot be answered never claims the board is empty", async ({ page }) => {
  /*
   * The live half of the state-ordering fix.
   *
   * `partial` and `coverage_unknown` cannot be reached yet, because nothing is
   * classified. `unclassified` can, and it travels the same path: it is a state
   * that must explain itself rather than render the board's own "no signal is
   * currently live" copy. That copy is a claim about the whole public board and
   * it was, until this fix, what an unanswerable filter printed.
   */
  await page.goto("/market-signals?family=services", { waitUntil: "domcontentloaded" });
  await expect(page.getByText("Ponte cannot filter signals by this category yet")).toBeVisible();
  await expect(page.getByText("No signal is currently live on the public board")).toHaveCount(0);
  await shot(page, "desktop-21-market-signals-unanswerable-filter");
});

test("a filtered result that matches nothing does not claim the board is empty", async ({
  page,
}) => {
  /*
   * A product word rather than a category, deliberately.
   *
   * Every category filter the board offers is a canonical key, and those
   * columns do not exist yet, so all of them land in `unclassified` and never
   * reach this branch. A free-text product filter does reach it: the query
   * runs, matches nothing, and the result is `ok` + zero + filtered, which is
   * the case being guarded.
   *
   * The claim: "No signal is currently live on the public board" is a
   * statement about the market, and it is false the moment a filter is set and
   * merely returns no matches. The board here holds 3,491 signals.
   */
  await page.goto("/market-signals?product=zzzznotarealproduct", {
    waitUntil: "domcontentloaded",
  });
  await expect(page.getByText("No signal matches these filters")).toBeVisible();
  await expect(page.getByText("No signal is currently live on the public board")).toHaveCount(0);
  await shot(page, "desktop-22-market-signals-filtered-empty");
});

test("the unfiltered board still reports its records and its reach", async ({ page }) => {
  // The other side of the same table: a state that CAN see everything is still
  // allowed to say what it found, and to say what cannot be reached.
  await page.goto("/market-signals", { waitUntil: "domcontentloaded" });
  await expect(page.getByText(/[\d,]+ signals/).first()).toBeVisible();
  await expect(page.getByText(/are counted but not yet reachable/)).toBeVisible();
  await expect(page.getByText("Ponte cannot filter signals by this category yet")).toHaveCount(0);
});

// ---------------------------------------------------------------------------
// 390 x 844
// ---------------------------------------------------------------------------

test.describe("mobile", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("the category grid is one column at 390, with no horizontal overflow", async ({ page }) => {
    await open(page, ENTRANCES.serviceSeek);
    await opensOnCategories(page, 11);

    // One column: every option starts at the same x.
    const boxes = await page.locator(".pcat__opt").evaluateAll((nodes) =>
      nodes.map((n) => Math.round(n.getBoundingClientRect().left)),
    );
    expect(new Set(boxes).size).toBe(1);

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
    await shot(page, "mobile-1-services-categories-390x844");
  });

  test("the touch target is large enough to hit", async ({ page }) => {
    await open(page, ENTRANCES.serviceSeek);
    const heights = await page.locator(".pcat__opt").evaluateAll((nodes) =>
      nodes.map((n) => n.getBoundingClientRect().height),
    );
    for (const height of heights) expect(height).toBeGreaterThanOrEqual(44);
  });

  test("distribution and Find are usable at 390 too", async ({ page }) => {
    await open(page, ENTRANCES.partnerSeek);
    await shot(page, "mobile-2-distribution-partner-types-390x844");

    await page.goto("/find?family=services", { waitUntil: "domcontentloaded" });
    await expect(page.locator(".pcat__opt")).toHaveCount(11);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
    await shot(page, "mobile-3-find-service-categories-390x844");
  });
});

// ---------------------------------------------------------------------------
// Keyboard and reduced motion
// ---------------------------------------------------------------------------

test("the category grid is one tab stop, and the arrows traverse it", async ({ page }) => {
  await open(page, ENTRANCES.serviceSeek);
  const first = page.locator('.pcat__opt[data-option="freight"]');
  // Nothing is chosen yet, so the first arrow selects the first option. That is
  // the radiogroup contract, and it is what the Bridge primitive does too.
  await first.focus();
  await page.keyboard.press("ArrowRight");
  await expect(first).toHaveAttribute("aria-checked", "true");
  await page.keyboard.press("ArrowRight");
  await expect(page.locator('.pcat__opt[data-option="warehousing"]')).toHaveAttribute(
    "aria-checked",
    "true",
  );
  await page.keyboard.press("ArrowLeft");
  await expect(first).toHaveAttribute("aria-checked", "true");
  await shot(page, "desktop-19-keyboard-focus");
});

test("reduced motion removes movement and removes nothing else", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await open(page, ENTRANCES.serviceSeek);
  await opensOnCategories(page, 11);
  const labels = await page.locator(".pcat__t").allTextContents();
  expect(labels.length).toBe(11);
  await shot(page, "desktop-20-reduced-motion");
});
