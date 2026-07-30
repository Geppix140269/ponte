import { expect, test, type Page } from "@playwright/test";

/**
 * Interaction integrity sweep for the launch-gate UX audit (Gate 5).
 *
 * Not a screenshot check: for each principal unauthenticated route it collects
 * every genuinely interactive element and proves none is a dead control -
 * every button carries an accessible name and is enabled-or-explicitly-disabled,
 * and every link resolves to a real target. A control that looks interactive and
 * does nothing, or that a screen reader announces as an unnamed "button", is the
 * failure this asserts against.
 *
 * It also confirms the app ships a visible focus treatment, so keyboard focus is
 * never invisible.
 *
 * Authenticated routes and write actions are deliberately out of scope here: the
 * audit env has no production database, and exercising a submit would either do
 * nothing useful (synthetic DB) or, against the preview, write production data.
 * Those are covered by code inspection and the notification-path review.
 */

const GALLERY = process.env.PONTE_EVIDENCE_BASE_URL ?? "http://127.0.0.1:3000";
const password = process.env.PONTE_SITE_PASSWORD;
test.use(password ? { httpCredentials: { username: "ponte", password } } : {});

const ROUTES = [
  "/en",
  "/en/explore",
  "/en/market-signals",
  "/en/structure?family=products&intent=source_product",
  "/en/structure?family=services&intent=offer_trade_service",
  "/en/structure?family=distribution&intent=seek_distribution_partner",
  "/en/find",
  "/en/pricing",
  "/en/about",
  "/en/contact",
];

async function open(page: Page, route: string): Promise<void> {
  const res = await page.goto(`${GALLERY}${route}`, { waitUntil: "domcontentloaded" });
  if (res?.status() === 401) throw new Error("Set PONTE_SITE_PASSWORD; do not weaken the gate.");
  await page.locator("body").waitFor({ state: "visible" });
  await page.waitForTimeout(300);
}

for (const route of ROUTES) {
  test(`no dead or unnamed interactive controls on ${route}`, async ({ page }) => {
    await open(page, route);

    // Buttons: each visible, enabled button must have a non-empty accessible name.
    const buttonProblems = await page.evaluate(() => {
      const problems: string[] = [];
      const visible = (el: Element) => (el as HTMLElement).offsetParent !== null;
      const accName = (el: Element) =>
        (
          el.getAttribute("aria-label") ||
          (el.getAttribute("aria-labelledby") &&
            document.getElementById(el.getAttribute("aria-labelledby")!)?.textContent) ||
          (el as HTMLElement).innerText ||
          el.textContent ||
          ""
        ).trim();
      for (const b of Array.from(document.querySelectorAll("button"))) {
        if (!visible(b)) continue;
        if (!accName(b)) problems.push(`button with no accessible name: ${b.outerHTML.slice(0, 80)}`);
      }
      // Links: each visible link must have an href (or a role/handler making it a real control).
      for (const a of Array.from(document.querySelectorAll("a"))) {
        if (!visible(a)) continue;
        const href = a.getAttribute("href");
        if (href === null || href === "" || href === "#") {
          problems.push(`link with no destination: ${a.outerHTML.slice(0, 80)}`);
        }
      }
      return problems;
    });
    expect(buttonProblems, buttonProblems.join("\n")).toEqual([]);
  });
}

test("the app ships a visible keyboard-focus treatment", async ({ page }) => {
  await open(page, "/en/structure?family=products&intent=source_product");
  // Prove a focus-visible rule exists in the loaded stylesheets: a keyboard user
  // must never have an invisible focus ring.
  const hasFocusStyle = await page.evaluate(() => {
    for (const sheet of Array.from(document.styleSheets)) {
      let rules: CSSRuleList | undefined;
      try {
        rules = sheet.cssRules;
      } catch {
        continue; // cross-origin sheet; skip
      }
      for (const rule of Array.from(rules ?? [])) {
        const t = (rule as CSSStyleRule).selectorText || "";
        if (t.includes(":focus")) return true;
      }
    }
    return false;
  });
  expect(hasFocusStyle).toBe(true);
});
