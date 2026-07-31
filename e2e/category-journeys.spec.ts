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

/**
 * Choose a station on a selection Bridge.
 *
 * Issue #130 Stage 2 moved two categorical choices, the market family and the
 * coverage scope, onto the Bridge, where an option carries `data-id` and the
 * whole node and label block is the target.
 */
async function crossTo(page: Page, key: string): Promise<void> {
  await page.locator(`.brst[data-id="${key}"]`).click();
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
  // Seven scopes fit a Bridge deck, so Issue #130 Stage 2 asks this one on the
  // Bridge: the count is of stations now, and there is no boxed list beside it.
  await expect(page.locator(".brst")).toHaveCount(7);
  await expect(page.locator(".pcat__opt")).toHaveCount(0);
  await crossTo(page, "countries");
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
// Products keep a journey of their own
// ---------------------------------------------------------------------------

/*
 * This assertion changed when ADR-0012 landed, and the change is the point.
 *
 * It used to read "products still open on the HS category journey", and the
 * frame it captured (desktop-13-products-hs-unchanged.png) showed the HS
 * chapter grid. That was true of products when this file was written and is
 * not true of them now: ADR-0012 replaced the customs drill-down as the way IN
 * with the AI intake, on the owner's instruction that an HS code must not be
 * required before Ponte understands the product.
 *
 * What this file is actually for is unchanged and still holds: a product record
 * is not routed through the SERVICE AND DISTRIBUTION category pickers. That is
 * asserted below, alongside the browse route staying reachable, so the
 * catalogue is a third way in rather than a removed one.
 */
test("products open on their own intake, not on either category picker", async ({ page }) => {
  // Not `open()`: that helper waits for one of the two category grids, and the
  // whole of this assertion is that a product record shows neither.
  await page.goto(ENTRANCES.productSource, { waitUntil: "domcontentloaded" });
  await expect(page.locator(".pintake")).toBeVisible({ timeout: 20_000 });
  // No ADR-0011 category picker is mounted for a product record at all.
  await expect(page.locator(".pcat__grid")).toHaveCount(0);
  // And no customs code is demanded before the member has said anything.
  await expect(page.locator(".hs__grid")).toHaveCount(0);
  await shot(page, "desktop-13-products-open-on-intake");
});

// ---------------------------------------------------------------------------
// Find, category first
// ---------------------------------------------------------------------------

test("Find opens on the three market families, as a Bridge", async ({ page }) => {
  await page.goto("/find", { waitUntil: "domcontentloaded" });
  // Issue #130 Stage 2. The three families were three boxed rows; they are a
  // navigate-mode Bridge now, so each is still a real link with its own URL.
  const stations = page.locator(".brst");
  await expect(stations).toHaveCount(3);
  await expect(page.locator(".pcat__opt")).toHaveCount(0);
  await expect(stations.first()).toHaveAttribute("href", /family=products/);
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
  /*
   * This asserted four options, drawn from the taxonomy. It now asserts the rule
   * that replaced it: a family filter exists only where the live eligible
   * inventory carries classified signals for it, and a selector with one usable
   * option is not a filter.
   *
   * Against production today that means NO panel, because every eligible signal
   * is a product signal. The panel returns on its own when the desk classifies
   * genuine service or distribution inventory. The two- and three-family shapes
   * are captured over fixtures in e2e/market-signals-search.spec.ts, because a
   * live board cannot be made to hold inventory it does not have.
   */
  await page.goto("/market-signals", { waitUntil: "domcontentloaded" });
  const options = await page.locator(".sigfilters .pcat__opt").count();
  expect(options === 0 || options >= 3).toBeTruthy();
  await expect(page.locator("#signal-q")).toBeVisible();
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
  /*
   * This asserted the technical box was VISIBLE, which was right for the
   * previous decision and is wrong now.
   *
   * A member holding this URL still has to be answered, and the answer is about
   * the board: nothing of that kind is live, here is everything else, here is
   * how to publish one. The box explaining canonical category columns and
   * historical rows is gone from the public journey.
   *
   * The claim about the whole board must still not appear, which was the point
   * of the original test and is preserved.
   */
  await page.goto("/market-signals?family=services", { waitUntil: "domcontentloaded" });
  const body = await page.locator(".sec").first().innerText();
  expect(body).toContain("Trade services filtering is not currently available.");
  // Never that the family is empty. The count behind this state counts records
  // carrying a canonical family, so zero means nothing is classified.
  expect(body).not.toContain("No live");
  expect(body).not.toContain("Ponte cannot filter signals by this category yet");
  expect(body).not.toContain("No signal is currently live on the public board");
  expect(body).not.toContain("taxonomy");
  expect(body).not.toContain("classified");
  await shot(page, "desktop-21-market-signals-unavailable-family");
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
  // The board used to say the rest of the inventory was unreachable. It is
  // reachable now, through the pager, so the sentence is gone and the pager is
  // the assertion in its place.
  await expect(page.getByText(/are counted but not yet reachable/)).toHaveCount(0);
  await expect(page.locator(".pager")).toBeVisible();
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
