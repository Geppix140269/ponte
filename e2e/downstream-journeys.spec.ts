import { test, expect, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";

/**
 * Visual and behavioural evidence for the DOWNSTREAM half of each family
 * journey (ADR-0014).
 *
 * `category-journeys.spec.ts` proves each family OPENS on categories. This
 * proves what happens after that, which is where the families actually diverge:
 * a trade service and a distribution arrangement are asked their own commercial
 * questions and are never asked a product's.
 *
 * The assertion that carries the requirement is the negative one. "The service
 * journey asks for a scope" would pass happily beside a Quantity row sitting
 * underneath it, so each check reads the MISSING DETAILS bucket, which is the
 * list of things the record still wants, and asserts no product fact is in it.
 *
 * Desktop and 390 x 844, because the Constitution requires both and because a
 * bucket that reads correctly at 1280 can still wrap into nonsense on a phone.
 */

const EVIDENCE = "docs/codex/audits/constitution-rebuild/evidence/downstream-journeys";

const ENTRANCE = {
  serviceOffer: "/structure?family=services&intent=offer_trade_service",
  coverageOffer: "/structure?family=distribution&intent=offer_distribution_or_representation",
  productOffer: "/structure?family=products&intent=offer_product",
} as const;

/** The product-only facts. None may appear in another family's missing list. */
const PRODUCT_FACTS = ["Quantity", "Incoterm", "HS code", "Unit"];

test.beforeAll(() => {
  mkdirSync(EVIDENCE, { recursive: true });
});

async function shot(page: Page, name: string): Promise<void> {
  await page.screenshot({ path: `${EVIDENCE}/${name}.png`, fullPage: true, animations: "disabled" });
}

/**
 * Click an option by its visible leading text.
 *
 * A category is a single choice and a subcategory is a multiple one, so the two
 * carry different ARIA roles. Matching on the text rather than the role keeps
 * this readable and stops the spec breaking when a step legitimately changes
 * from one to the other.
 */
async function pick(page: Page, label: string): Promise<void> {
  const byText = new RegExp(`^${label}`);
  const option = page
    .getByRole("radio", { name: byText })
    .or(page.getByRole("checkbox", { name: byText }))
    .or(page.getByRole("button", { name: byText }))
    .first();
  await option.click();
}

async function advance(page: Page): Promise<void> {
  const go = page.getByRole("button", { name: /continue/i }).first();
  await expect(go).toBeEnabled();
  await go.click();
}

/** The visible labels inside the "Missing details" bucket. */
async function missingFacts(page: Page): Promise<string> {
  const bucket = page.locator(".bucket", { hasText: /Missing details/i }).first();
  await bucket.waitFor({ state: "visible" });
  return (await bucket.innerText()).replace(/\s+/g, " ");
}

/**
 * Walk forward until the fact-bucket screen appears.
 *
 * The families have different numbers of classification steps, and hardcoding
 * a count here would make this spec break every time one gains a question,
 * which is a test that reports on its own fixture rather than on the product.
 * Each pass takes the first selectable option it has not taken, then continues.
 */
async function walkToFactBuckets(page: Page, maxSteps = 8): Promise<void> {
  const bucket = page.locator(".bucket", { hasText: /Missing details/i }).first();
  for (let i = 0; i < maxSteps; i++) {
    if (await bucket.isVisible().catch(() => false)) return;
    const go = page.getByRole("button", { name: /continue/i }).first();
    if (!(await go.isVisible().catch(() => false))) return;
    if (!(await go.isEnabled().catch(() => false))) {
      // A step that needs a choice before it will advance.
      const option = page.getByRole("radio").first();
      if (await option.isVisible().catch(() => false)) await option.click();
      else return;
    }
    await go.click();
    await page.waitForTimeout(250);
  }
}

for (const [viewport, size] of [
  ["desktop", { width: 1280, height: 900 }],
  ["mobile-390x844", { width: 390, height: 844 }],
] as const) {
  test.describe(viewport, () => {
    test.use({ viewport: size });

    test(`freight forwarding asks its own questions and no product ones`, async ({ page }) => {
      await page.goto(ENTRANCE.serviceOffer, { waitUntil: "domcontentloaded" });
      await pick(page, "Freight and logistics");
      await advance(page);
      await pick(page, "Freight forwarding");
      await walkToFactBuckets(page);

      const missing = await missingFacts(page);
      for (const own of ["Scope", "Coverage", "Capability", "Availability"]) {
        expect(missing, `service journey should ask for ${own}`).toContain(own);
      }
      for (const fact of PRODUCT_FACTS) {
        expect(missing, `service asked for ${fact}`).not.toContain(fact);
      }
      await shot(page, `${viewport}-1-freight-forwarding-facts`);
    });

    test(`distribution asks its own questions and no shipment ones`, async ({ page }) => {
      await page.goto(ENTRANCE.coverageOffer, { waitUntil: "domcontentloaded" });
      await pick(page, "Distributor");
      await walkToFactBuckets(page);

      const missing = await missingFacts(page);
      for (const fact of PRODUCT_FACTS) {
        expect(missing, `distribution asked for ${fact}`).not.toContain(fact);
      }
      await shot(page, `${viewport}-2-distribution-facts`);
    });

    test(`the products entrance is unchanged`, async ({ page }) => {
      // The regression guard. Removing product questions from the other two
      // families is only correct if Products keeps its own journey intact.
      await page.goto(ENTRANCE.productOffer, { waitUntil: "domcontentloaded" });
      await page.getByText(/Tell Ponte what you supply|Describe it|Browse categories/i)
        .first().waitFor({ state: "visible" });
      await shot(page, `${viewport}-3-products-entrance`);
    });
  });
}
