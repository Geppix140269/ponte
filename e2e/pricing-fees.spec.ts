import { expect, test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";

/**
 * Visual evidence and behavioural verification for the Fees page.
 *
 * Authority: `PT-COMMERCIAL-2026-07-31-01` section 19, recorded by ADR-0020.
 * Stage 6 of `docs/plans/active/deal-room-transaction-pricing.md`. This is the
 * evidence LB-014 needs and that could not be captured on a workstation.
 *
 * ## Why this exists in CI rather than on somebody's machine
 *
 * `middleware.ts` gates the whole site behind Basic auth and only the SHA-256
 * verifier is committed, so the password cannot be recovered from the
 * repository and the page cannot be rendered locally. The `landing evidence`
 * job already solves this: it holds `PONTE_SITE_PASSWORD` as a repository
 * secret, passes it to Playwright as `httpCredentials`, and fails loudly if it
 * is absent. So the evidence is captured where the password already lives,
 * rather than by moving the password to where the evidence was wanted.
 *
 * ## Two jobs, deliberately in one file
 *
 * **Evidence:** desktop and 390 x 844, plus reduced motion, written to a fixed
 * path so a reviewer can open them.
 *
 * **Verification a screenshot cannot give:** that the page presents ONE product
 * and ONE formula and no comparison grid (section 19), that the retired
 * monetisation is absent in the rendered DOM rather than merely absent from the
 * fragment a developer happened to read, and that the required public statement
 * is actually on the page. A screenshot of a page that still said "success fee"
 * in a panel below the fold would pass any visual review.
 *
 * This spec needs no database and no feature flag - the page is translations and
 * static markup - which is the criterion the evidence job sets for what may be
 * added to it.
 */

const EVIDENCE = "docs/codex/audits/deal-room-pricing/evidence";

/** Every monetisation authority section 15 prohibits, as a member would read it. */
const RETIRED_MONETISATION = [
  "success fee",
  "retainer",
  "credit pack",
  "2 credits",
  "subscription",
  "Portfolio",
  "Starter Deal Room",
  "commission",
  "per seat",
];

test.beforeAll(() => {
  mkdirSync(EVIDENCE, { recursive: true });
});

/**
 * The Fees page, loaded and ready.
 *
 * `domcontentloaded` rather than `networkidle`, for the reason the landing spec
 * records: against a deploy preview the network never goes idle. Waiting for the
 * product panel is both stronger and the thing that matters.
 */
async function fees(page: Page): Promise<void> {
  await page.goto("/pricing", { waitUntil: "domcontentloaded" });
  await expect(page.locator(".panel").first()).toBeVisible();
}

/* ------------------------------------------------------------------ *
 * 1. One product, one formula - section 19
 * ------------------------------------------------------------------ */

test("the page presents exactly one product panel, not a comparison grid", async ({ page }) => {
  await fees(page);
  // The retired page had four `.panel` engagements in one auto-fit grid. Section
  // 19: "must not use a multi-plan comparison grid". One panel is the shape.
  await expect(page.locator(".panel")).toHaveCount(1);
});

test("the one product is the Deal Room, at $79 USD for 30 calendar days", async ({ page }) => {
  await fees(page);
  const panel = page.locator(".panel").first();
  await expect(panel).toContainText("Ponte Deal Room");
  await expect(panel).toContainText("$79 USD");
  /*
    "30 active days" until 2 August 2026, corrected on owner approval.

    The phrase implied a clock that stops. It never has: `periodEndFrom` is
    `start + 30 x 24h` of wall time and does not pause for a blocked step, a
    paused branch or an unanswered invitation. The fees page was advertising a
    more generous accounting model than the product implements, which is the
    direction of error that becomes a refund argument.

    So this is the copy being corrected to the code, not a repricing. The price
    and the period are unchanged. See ADR-0020 Amendment 3.
  */
  await expect(panel).toContainText("30 calendar days");
  await expect(panel).not.toContainText("30 active days");
});

test("the formula states the included five, the $15 branch and the $199 cap", async ({ page }) => {
  await fees(page);
  const body = page.locator("body");
  await expect(body).toContainText("five concurrently active");
  await expect(body).toContainText("$15 USD");
  await expect(body).toContainText("$199 USD");
});

test("the five included languages are named", async ({ page }) => {
  // Authority section 19's required statement ends on the languages, and section
  // 13 makes them part of the price rather than a plan.
  await fees(page);
  for (const language of [
    "English",
    "Spanish",
    "Russian",
    "Simplified Chinese",
    "Modern Standard Arabic",
  ]) {
    await expect(page.locator("body")).toContainText(language);
  }
});

/* ------------------------------------------------------------------ *
 * 2. The retired monetisation is gone from the rendered page
 * ------------------------------------------------------------------ */

test("retired monetisation appears only where the page disclaims it", async ({ page }) => {
  // This is the LB-014 assertion, and the first draft of it was wrong in a way
  // worth recording: it asserted these words appear NOWHERE, and would have
  // failed on correct copy. The page's "What Ponte does not charge for" section
  // legitimately names success fees, credit packs, subscriptions and
  // commissions - that is authority section 15's own list, stated to the member,
  // and a fees page that silently omitted it would be worse.
  //
  // The property that actually matters is that the page does not OFFER them. So
  // the disclaimer is removed from the text and the rest of the page is checked.
  await fees(page);
  const whole = ((await page.locator("body").innerText()) ?? "");
  const disclaimer = ((await page.getByTestId("never-charged").innerText()) ?? "");
  expect(disclaimer.length, "the disclaimer section must be findable").toBeGreaterThan(0);

  const offered = whole.replace(disclaimer, "").toLowerCase();
  const found = RETIRED_MONETISATION.filter((term) => offered.includes(term.toLowerCase()));
  expect(
    found,
    `retired monetisation is OFFERED on /pricing, outside the disclaimer: ${found.join(", ")}`,
  ).toEqual([]);
});

test("the site-wide footer no longer offers a success fee or a retainer", async ({ page }) => {
  // The footer blurb carried "on a success fee or retainer" onto every page, so
  // it is checked on the footer element rather than on a whole page: other
  // namespaces still hold that wording (see the Stage 6 record), and this
  // assertion is about the blurb that follows a member everywhere.
  await fees(page);
  const footer = page.locator("footer");
  if ((await footer.count()) === 0) return;
  const text = ((await footer.first().innerText()) ?? "").toLowerCase();
  for (const term of ["success fee", "retainer"]) {
    expect(text, `the site footer still renders "${term}"`).not.toContain(term);
  }
});

/* ------------------------------------------------------------------ *
 * 3. What is free is still said plainly
 * ------------------------------------------------------------------ */

test("the page states what carries no charge", async ({ page }) => {
  await fees(page);
  const body = page.locator("body");
  await expect(body).toContainText("Browsing");
  await expect(body).toContainText("read-only history");
  await expect(body).toContainText("Verifying your own business is free");
});

/* ------------------------------------------------------------------ *
 * 4. Evidence
 * ------------------------------------------------------------------ */

test("evidence: desktop", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await fees(page);
  await page.screenshot({
    path: `${EVIDENCE}/pricing-desktop.png`,
    animations: "disabled",
    fullPage: true,
  });
});

test("evidence: 390 x 844", async ({ page }) => {
  // The Constitution requires mobile to be reviewed before desktop approval.
  await page.setViewportSize({ width: 390, height: 844 });
  await fees(page);
  await page.screenshot({
    path: `${EVIDENCE}/pricing-390x844.png`,
    animations: "disabled",
    fullPage: true,
  });
});

test("evidence: reduced motion, and nothing is lost with it", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 1280, height: 900 });
  await fees(page);
  // Reduced motion must remove movement without removing information: the
  // product, its price and the formula are all still readable.
  await expect(page.locator(".panel").first()).toContainText("$79 USD");
  await expect(page.locator("body")).toContainText("$199 USD");
  await page.screenshot({
    path: `${EVIDENCE}/pricing-reduced-motion.png`,
    animations: "disabled",
    fullPage: true,
  });
});

/* ------------------------------------------------------------------ *
 * 5. Nothing overflows
 * ------------------------------------------------------------------ */

test("the page does not scroll horizontally at four narrow widths", async ({ page }) => {
  for (const width of [320, 360, 390, 414]) {
    await page.setViewportSize({ width, height: 844 });
    await fees(page);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow, `horizontal overflow at ${width}px`).toBeLessThanOrEqual(1);
  }
});
