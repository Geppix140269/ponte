import { expect, test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";

/**
 * Visual and behavioural evidence for Market Signals search.
 *
 * Captured at desktop and at 390 x 844 against a production build, as
 * Constitution section 21 requires.
 *
 * ---------------------------------------------------------------------------
 * Two surfaces, and why
 * ---------------------------------------------------------------------------
 * `/market-signals` is the live route and reads the database. In an evidence
 * run there is none, so it renders truthfully as an empty board: that is real
 * evidence for the search FORM, for URL restoration, for the mobile layout and
 * for keyboard focus, and no evidence at all for a result list.
 *
 * `/dev/market-signals-search` renders the same `SignalBoard` component, the
 * same ordering and the same paging over a controlled fixture inventory. It
 * 404s in production. That is where the result-bearing frames come from,
 * because the requirement says the suite must not depend on unpredictable live
 * production records and this repository has no test database (PL-002).
 *
 * Each capture sits beside an assertion, so a frame showing a ranked list is a
 * frame that has been proved to be ranked rather than one that looks ranked.
 */

const EVIDENCE = "docs/codex/audits/constitution-rebuild/evidence/market-signals-search";

/** The live route: the form, the URL and the layout. Served by the build. */
const LIVE = "/market-signals";

/**
 * The fixture board, on the development server.
 *
 * `/dev/*` routes 404 in a production build by design, exactly like the Ponte
 * Flow specimen sheet and the product-intake gallery, so this one capture
 * target is absolute and points at the dev server the config already starts on
 * 3101. The markup is the same in both modes; only the dev overlay differs,
 * and it is outside every capture.
 */
const DEV_BASE = process.env.PONTE_EVIDENCE_BASE_URL ?? "http://127.0.0.1:3101";
// Unprefixed: English keeps its bare URLs (`localePrefix: "as-needed"`), so
// `/en/...` answers 307 to `/...` and a capture would photograph a redirect.
const FIXTURE = `${DEV_BASE}/dev/market-signals-search`;

const MOBILE = { width: 390, height: 844 };
const DESKTOP = { width: 1280, height: 900 };

/**
 * The temporary private-site gate.
 *
 * `middleware.ts` answers 401 to every request without HTTP Basic credentials
 * while Ponte is hidden from public view. Without the shared password every
 * navigation here answers 401 and the run produces a folder of screenshots of
 * an error page, which is worse than no evidence because it looks like
 * evidence. Same handling as `e2e/deal-room-bridge.spec.ts`:
 *
 *     PONTE_SITE_PASSWORD=... npx playwright test e2e/market-signals-search.spec.ts
 */
const password = process.env.PONTE_SITE_PASSWORD;

test.use(password ? { httpCredentials: { username: "ponte", password } } : {});

test.beforeAll(() => {
  if (!password) {
    throw new Error(
      "PONTE_SITE_PASSWORD is not set. The private-site gate answers 401 to " +
        "every request, so this run would capture error pages. Set it and re-run.",
    );
  }
  mkdirSync(EVIDENCE, { recursive: true });
});


async function shot(page: Page, name: string): Promise<void> {
  await page.screenshot({ path: `${EVIDENCE}/${name}.png`, fullPage: true, animations: "disabled" });
}

async function open(page: Page, href: string): Promise<void> {
  await page.goto(href, { waitUntil: "domcontentloaded" });
  await page.locator("#signal-q").waitFor({ state: "visible" });
}

/** The register rows, or the record cards, whichever this density renders. */
function records(page: Page) {
  return page.locator(".reg__row, .rec");
}

// ---------------------------------------------------------------------------
// The control itself, on the live route
// ---------------------------------------------------------------------------

test("the board opens with a prominent, labelled, keyboard-reachable search", async ({ page }) => {
  await page.setViewportSize(DESKTOP);
  await open(page, LIVE);

  const field = page.locator("#signal-q");
  await expect(field).toBeVisible();
  await expect(field).toHaveAttribute("type", "search");
  await expect(field).toHaveAttribute(
    "placeholder",
    "Search products, HS codes, countries or requirements",
  );
  // Labelled, and the label is bound rather than merely nearby.
  await expect(page.locator('label[for="signal-q"]')).toBeVisible();
  await expect(page.locator(".sigsearch__go")).toBeVisible();

  // Above the results, not below them: the field must be reachable before the
  // filters a member would otherwise have to learn the taxonomy to use.
  const searchBox = await field.boundingBox();
  const filters = await page.locator(".sigfilters").boundingBox();
  expect(searchBox!.y).toBeLessThan(filters!.y);

  // Keyboard: focusable, and the focus is visible rather than removed.
  await field.focus();
  await expect(field).toBeFocused();
  const outline = await field.evaluate((el) => {
    const s = getComputedStyle(el);
    return { shadow: s.boxShadow, border: s.borderColor };
  });
  expect(outline.shadow === "none" && outline.border === "").toBeFalsy();

  await shot(page, "01-desktop-search-empty");
});

test("Enter submits the search and the state lands in the URL", async ({ page }) => {
  await page.setViewportSize(DESKTOP);
  await open(page, LIVE);
  await page.locator("#signal-q").fill("gas oil");
  await page.locator("#signal-q").press("Enter");
  await page.waitForURL(/[?&]q=gas\+oil/);
  // And it comes back out of the URL into the field, so a shared link reopens
  // the same search rather than an empty box over filtered results.
  await expect(page.locator("#signal-q")).toHaveValue("gas oil");
  await expect(page.locator(".sigsearch__active")).toContainText("gas oil");
});

test("a search works as a plain GET, with JavaScript disabled", async ({ browser }) => {
  // The primary way into a commercial inventory must not depend on a bundle
  // having loaded. This is the assertion behind "no JavaScript-only search".
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(`${LIVE}?q=gas+oil`, { waitUntil: "domcontentloaded" });
  await expect(page.locator("#signal-q")).toHaveValue("gas oil");
  await expect(page.locator(".sigsearch__active")).toContainText("gas oil");
  const form = page.locator("form.sigsearch__f");
  await expect(form).toHaveAttribute("method", "get");
  await expect(form).toHaveAttribute("action", LIVE);
  await context.close();
});

test("the search survives a filter, and the filter survives a search", async ({ page }) => {
  await page.setViewportSize(DESKTOP);
  await open(page, `${LIVE}?q=freight+forwarding`);
  // Every filter link carries the query. This is the defect the shared URL
  // builder exists to prevent: choosing a category used to discard the search.
  const links = await page.locator(".sigfilters a").evaluateAll((els) =>
    els.map((el) => (el as HTMLAnchorElement).getAttribute("href") ?? ""),
  );
  expect(links.length).toBeGreaterThan(0);
  for (const href of links) expect(href).toContain("q=freight+forwarding");
});

test("the search is usable at 390 x 844 with nothing clipped", async ({ page }) => {
  await page.setViewportSize(MOBILE);
  await open(page, LIVE);

  const field = page.locator("#signal-q");
  const button = page.locator(".sigsearch__go");
  const fieldBox = (await field.boundingBox())!;
  const buttonBox = (await button.boundingBox())!;

  // Stacked, not squeezed: the action sits below the field at this width.
  expect(buttonBox.y).toBeGreaterThanOrEqual(fieldBox.y + fieldBox.height - 1);
  // Both inside the viewport, both comfortably tappable.
  expect(fieldBox.x).toBeGreaterThanOrEqual(0);
  expect(fieldBox.x + fieldBox.width).toBeLessThanOrEqual(MOBILE.width);
  expect(fieldBox.height).toBeGreaterThanOrEqual(40);
  expect(buttonBox.height).toBeGreaterThanOrEqual(40);

  // The page itself does not scroll sideways.
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);

  await shot(page, "02-mobile-390-search-empty");
});

// ---------------------------------------------------------------------------
// The results, over the fixture inventory
// ---------------------------------------------------------------------------

test("gas oil finds diesel, gasoil and EN590, and ranks the title matches first", async ({ page }) => {
  await page.setViewportSize(DESKTOP);
  await open(page, `${FIXTURE}?q=gas+oil`);

  const rows = records(page);
  await expect(rows.first()).toBeVisible();
  const text = await page.locator(".sec").first().innerText();

  // The alias set. None of these three shares a word with the other two.
  expect(text).toContain("Gas oil EN590");
  expect(text).toContain("Diesel fuel");
  expect(text).toContain("Automotive gasoil");
  // The widening is disclosed rather than silent, and it names the terms that
  // were ADDED rather than the member's own words back at them.
  const also = page.locator(".sigsearch__also");
  await expect(also).toContainText("diesel");
  await expect(also).toContainText("en590");

  // Ranking: the record matched only through its description comes last.
  const order = await rows.allInnerTexts();
  const positionOf = (needle: string) => order.findIndex((t) => t.includes(needle));
  expect(positionOf("Marine bunker fuel")).toBeGreaterThan(positionOf("Gas oil EN590"));
  expect(positionOf("Marine bunker fuel")).toBeGreaterThan(positionOf("Diesel fuel"));

  // Relevance is the default order while searching, and is marked as current.
  await expect(page.locator('.sortlinks__o--on')).toHaveText("Relevance");

  await shot(page, "03-desktop-q-gas-oil");
});

test("EN590 reaches the same vocabulary", async ({ page }) => {
  await page.setViewportSize(DESKTOP);
  await open(page, `${FIXTURE}?q=EN590`);
  const text = await page.locator(".sec").first().innerText();
  expect(text).toContain("Gas oil EN590");
  expect(text).toContain("Diesel fuel");
  await shot(page, "04-desktop-q-en590");
});

test("a search combines with a territory filter", async ({ page }) => {
  await page.setViewportSize(DESKTOP);
  await open(page, `${FIXTURE}?q=olive+oil&territory=DE`);
  const text = await page.locator(".sec").first().innerText();
  expect(text).toContain("olive oil");
  // AND, not OR: the sunflower record is in the search's family but not in DE.
  expect(text).not.toContain("Sunflower oil");
  await shot(page, "05-desktop-q-olive-oil-territory-de");
});

test("a search combines with the services family", async ({ page }) => {
  await page.setViewportSize(DESKTOP);
  await open(page, `${FIXTURE}?q=freight+forwarding&family=services`);
  const text = await page.locator(".sec").first().innerText();
  expect(text).toContain("Freight forwarding");
  expect(text).not.toContain("Refined white sugar");
  await shot(page, "06-desktop-q-freight-forwarding-services");
});

test("a search combines with the distribution family", async ({ page }) => {
  await page.setViewportSize(DESKTOP);
  await open(page, `${FIXTURE}?q=distributor&family=distribution`);
  const text = await page.locator(".sec").first().innerText();
  expect(text).toContain("Distributor sought");
  await shot(page, "07-desktop-q-distributor-distribution");
});

test("an HS code search finds the record carrying it", async ({ page }) => {
  await page.setViewportSize(DESKTOP);
  await open(page, `${FIXTURE}?q=170199`);
  const text = await page.locator(".sec").first().innerText();
  expect(text).toContain("Refined white sugar");
  await shot(page, "08-desktop-q-hs-170199");
});

test("a search with no match says so, and never says the board is empty", async ({ page }) => {
  await page.setViewportSize(DESKTOP);
  await open(page, `${FIXTURE}?q=99999999`);

  const body = await page.locator(".sec").first().innerText();
  expect(body).toContain("No signal matches this search");
  // The claim that must never appear over a zero-result search. It is a
  // statement about the market, and a member reads it as "this market is dead".
  expect(body).not.toContain("No signal is currently live on the public board");
  expect(body).not.toContain("No signal matches these filters");
  // And the actions are ones the member can take from where they stand.
  await expect(page.locator(".empty__a a").first()).toContainText("Clear the search");

  await shot(page, "09-desktop-q-no-match");
  await page.setViewportSize(MOBILE);
  await shot(page, "10-mobile-390-q-no-match");
});

test("the whole inventory is reachable, and the pager carries the search", async ({ page }) => {
  await page.setViewportSize(DESKTOP);
  await open(page, `${FIXTURE}?q=wheat`);

  const pager = page.locator(".pager");
  await expect(pager).toBeVisible();
  // The count is the matching inventory; the range is what is on screen. The
  // two must not be the same number, or the page size is being read as a total.
  await expect(page.locator(".pager__at")).toContainText("Showing 1");
  await expect(page.locator(".pager__at")).toContainText("page 1 of 2");
  await expect(records(page)).toHaveCount(60);

  await shot(page, "11-desktop-pager-page-1");

  /*
   * The Next link is asserted rather than clicked.
   *
   * `BoardPager` builds its hrefs with the shared builder, which targets the
   * live `/market-signals` route because that is where a member is. The
   * fixture gallery renders the same component, so its Next link points at the
   * live board too. Following it here would navigate away from the fixtures
   * and photograph an empty production board.
   *
   * What the click was ever evidence FOR is that the whole search state
   * travels in the link, and that is exactly what the href says. So the href
   * is checked, and page two is then opened on the gallery to be photographed.
   */
  const next = await page.locator('.pager a[rel="next"]').getAttribute("href");
  expect(next).toContain("q=wheat");
  expect(next).toContain("page=2");

  await open(page, `${FIXTURE}?q=wheat&page=2`);
  await expect(page.locator("#signal-q")).toHaveValue("wheat");
  await expect(page.locator(".pager__at")).toContainText("page 2 of 2");
  // The remainder, not another full page: 75 records over a page size of 60.
  await expect(records(page)).toHaveCount(15);
  // And page two offers a way back that still carries the search.
  const prev = await page.locator('.pager a[rel="prev"]').getAttribute("href");
  expect(prev).toContain("q=wheat");
  expect(prev).not.toContain("page=");

  await shot(page, "12-desktop-pager-page-2");

  await page.setViewportSize(MOBILE);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
  await shot(page, "13-mobile-390-pager");
});

test("a page beyond the end lands on the last page that exists", async ({ page }) => {
  await page.setViewportSize(DESKTOP);
  await open(page, `${FIXTURE}?q=wheat&page=40`);
  // A shared link outlives the result set that produced it. The answer is the
  // last real page, not an empty list under a count saying 75 records matched.
  await expect(page.locator(".pager__at")).toContainText("page 2 of 2");
  await expect(records(page).first()).toBeVisible();
});

test("changing the order keeps the search and returns to page one", async ({ page }) => {
  await page.setViewportSize(DESKTOP);
  await open(page, `${FIXTURE}?q=wheat&page=2`);
  // Same reason as the pager: the link targets the live board, so the rule it
  // encodes is asserted on the href and the resulting state is then rendered.
  const oldest = await page
    .locator(".sortlinks a", { hasText: "Oldest" })
    .getAttribute("href");
  expect(oldest).toContain("q=wheat");
  expect(oldest).toContain("sort=oldest");
  expect(oldest).not.toContain("page=");

  await open(page, `${FIXTURE}?q=wheat&sort=oldest`);
  await expect(page.locator("#signal-q")).toHaveValue("wheat");
  await expect(page.locator(".sortlinks__o--on")).toHaveText("Oldest");
  await shot(page, "14-desktop-sort-oldest");
});

test("clearing the search keeps the filters, and clear all keeps nothing", async ({ page }) => {
  await page.setViewportSize(DESKTOP);
  await open(page, `${FIXTURE}?q=freight+forwarding&family=services`);

  const clearAll = page.locator(".sigsearch__clear", { hasText: "Clear all" });
  const clearSearch = page.locator(".sigsearch__clear", { hasText: "Clear search" });
  await expect(clearSearch).toBeVisible();
  await expect(clearAll).toBeVisible();
  expect(await clearSearch.getAttribute("href")).toContain("family=services");
  expect(await clearSearch.getAttribute("href")).not.toContain("q=");

  await open(page, `${FIXTURE}?family=services`);
  await expect(page.locator("#signal-q")).toHaveValue("");
  await expect(page.locator(".sigsearch__active")).toHaveCount(0);
});

test("an incomplete classification stays visible under a search", async ({ page }) => {
  // The states the board already drew carefully must survive the addition of a
  // search: a partial coverage explains its own blind spot, and it does so
  // whether or not any record came back.
  await page.setViewportSize(DESKTOP);
  await open(page, `${FIXTURE}?q=wheat&state=partial`);
  const body = await page.locator(".sec").first().innerText();
  expect(body).toContain("This filter can see");
  expect(body).not.toContain("No signal is currently live on the public board");
  await shot(page, "15-desktop-partial-coverage-with-search");

  await open(page, `${FIXTURE}?q=99999999&state=unavailable`);
  const failed = await page.locator(".sec").first().innerText();
  expect(failed).toContain("The sources could not be read");
  // A failed read is a technical failure, never a finding about a search.
  expect(failed).not.toContain("No signal matches this search");
  await shot(page, "16-desktop-unavailable-with-search");
});
