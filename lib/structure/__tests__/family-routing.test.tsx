// The family boundary between the two accepted journeys.
//
// Run: npx tsx --tsconfig tsconfig.ui-test.json lib/structure/__tests__/family-routing.test.tsx
//
// Ponte has two accepted ways of learning what a record is, and they are
// complementary rather than competing:
//
//   Products                     ADR-0012. The member describes or uploads what
//                                they trade and Ponte identifies, structures and
//                                classifies it. Browsing categories stays
//                                available and is not the default.
//   Trade services               ADR-0011. The member chooses from the canonical
//   Distribution & representation service or distribution taxonomy first.
//
// The two decisions met on one screen when they merged, and the risk is not
// that either is wrong: it is that one silently becomes the other. So the
// routing is asserted from the member's side, by mounting the real composer at
// a real entrance and reading which step it put on the screen.
//
// The renderer is the project's own, so a component found in the tree is the
// component the browser would mount.

import assert from "node:assert/strict";

(globalThis as Record<string, unknown>).window = {
  setTimeout: (fn: () => void, ms?: number) => setTimeout(fn, ms),
  clearTimeout: (id: unknown) => clearTimeout(id as ReturnType<typeof setTimeout>),
  setInterval: (fn: () => void, ms?: number) => setInterval(fn, ms),
  clearInterval: (id: unknown) => clearInterval(id as ReturnType<typeof setInterval>),
  matchMedia: () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} }),
};
(globalThis as Record<string, unknown>).fetch = () =>
  Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({}) });

/* eslint-disable import/first */
import StructureComposer from "../../../components/structure/StructureComposer";
import ProductIntake from "../../../components/products/intake/ProductIntake";
import ClassifyStep from "../../../components/structure/ClassifyStep";
import { mount, type Mounted, type TestElement } from "../../landing/__tests__/render";
import { emptyDraft, needsHsCode, subjectFor, type StructureDraft } from "../draft";
import { MARKET_INTENTS, type MarketFamily, type MarketIntent } from "../../taxonomy/market";
/* eslint-enable import/first */

const tests: { name: string; fn: () => void }[] = [];
function test(name: string, fn: () => void): void {
  tests.push({ name, fn });
}

/**
 * The composer, opened at a canonical family entrance, as a member arrives.
 *
 * The renderer invokes only the component under test, so the composer's first
 * step arrives as an unrendered element. Mounting it is what puts the journey
 * the member actually sees on the screen, and it is the screen this file is
 * about.
 */
function enter(family: MarketFamily, intent: MarketIntent): Mounted {
  const page = mount(StructureComposer as unknown as (p: unknown) => unknown, {
    entrance: { family, intent },
  });
  return openFirstStep(page);
}

/** Render the composer's currently mounted step. */
function openFirstStep(page: Mounted): Mounted {
  const step = page.find(
    (el) => typeof el.props.onNext === "function" && !!el.props.draft,
    "the composer's first step",
  );
  return mount(step.type as (p: unknown) => unknown, step.props);
}

/** Every element of one component type currently on the screen. */
function mounted(page: Mounted, component: unknown): TestElement[] {
  return page.all().filter((el) => el.type === component);
}

const PRODUCT_INTENTS: MarketIntent[] = ["offer_product", "source_product"];
const SERVICE_INTENTS: MarketIntent[] = ["seek_trade_service", "offer_trade_service"];
const DISTRIBUTION_INTENTS: MarketIntent[] = [
  "seek_distribution_partner",
  "offer_distribution_or_representation",
  "seek_brands_or_products_to_represent",
];

// ---- Products: ADR-0012 ----------------------------------------------------

test("both product intents open on the AI intake, not on a category grid", () => {
  for (const intent of PRODUCT_INTENTS) {
    const page = enter("products", intent);
    assert.equal(
      mounted(page, ProductIntake).length,
      1,
      `${intent} did not open on the product intake`,
    );
    assert.equal(
      mounted(page, ClassifyStep).length,
      0,
      `${intent} was routed through the category step`,
    );
  }
});

test("the intake is told which direction the member is trading in", () => {
  for (const intent of PRODUCT_INTENTS) {
    const intake = mounted(enter("products", intent), ProductIntake)[0];
    assert.equal(intake.props.intent, intent, `${intent} reached the intake as something else`);
  }
});

test("the intake carries the catalogue as a third way in, not as the first", () => {
  const intake = mounted(enter("products", "offer_product"), ProductIntake)[0];
  assert.equal(
    typeof intake.props.renderBrowse,
    "function",
    "browsing categories is no longer reachable from the product intake",
  );
});

test("no HS code is required before the product is identified", () => {
  // The gate the decision record removed: a member had to drill six digits of
  // customs nomenclature before Ponte would admit it knew what they traded.
  // The intake is mounted with no product and no code on the draft at all.
  const page = enter("products", "offer_product");
  const intake = mounted(page, ProductIntake)[0];
  assert.equal(
    intake.props.draft,
    undefined,
    "the intake was handed a draft, which is not how it identifies a product",
  );

  const fresh = { ...emptyDraft(), canonical: { family: "products", intent: "offer_product" } };
  assert.equal(fresh.hsCode, null, "a product draft starts with a customs code already on it");
  assert.equal(
    mounted(page, ClassifyStep).length + mounted(page, ProductIntake).length,
    1,
    "the product entrance mounted more than one classification journey",
  );
});

// ---- Trade services and Distribution: ADR-0011 -----------------------------

test("every trade service intent opens on the category step", () => {
  for (const intent of SERVICE_INTENTS) {
    const page = enter("services", intent);
    assert.equal(mounted(page, ClassifyStep).length, 1, `${intent} did not open on categories`);
    assert.equal(mounted(page, ProductIntake).length, 0, `${intent} rendered the product intake`);
  }
});

test("every distribution intent opens on the category step", () => {
  for (const intent of DISTRIBUTION_INTENTS) {
    const page = enter("distribution", intent);
    assert.equal(mounted(page, ClassifyStep).length, 1, `${intent} did not open on categories`);
    assert.equal(mounted(page, ProductIntake).length, 0, `${intent} rendered the product intake`);
  }
});

test("neither family is ever asked for a customs code", () => {
  for (const [family, intents] of [
    ["services", SERVICE_INTENTS],
    ["distribution", DISTRIBUTION_INTENTS],
  ] as const) {
    for (const intent of intents) {
      const draft: StructureDraft = { ...emptyDraft(), canonical: { family, intent } };
      assert.equal(needsHsCode(draft), false, `${intent} is being asked for an HS code`);
    }
  }
});

test("the category step is handed the icons it renders with", () => {
  // PonteIcon is a server component; the registry's markup must not reach the
  // browser bundle, so the icons arrive as props. A step mounted without them
  // would silently fall back to nothing.
  const step = mounted(enter("services", "seek_trade_service"), ClassifyStep)[0];
  assert.ok("icons" in step.props, "the category step lost its icon map in the merge");
});

// ---- One composer, not two -------------------------------------------------

test("every canonical intent reaches exactly one classification journey", () => {
  for (const entry of MARKET_INTENTS) {
    const page = enter(entry.family as MarketFamily, entry.key as MarketIntent);
    const journeys =
      mounted(page, ProductIntake).length + mounted(page, ClassifyStep).length;
    assert.equal(journeys, 1, `${entry.key} reached ${journeys} classification journeys`);
  }
});

test("the downstream composer is shared, not forked per family", () => {
  // The proof that the two journeys meet again: whatever a member classified,
  // the record's subject is read by the same function and the same submit path.
  const service: StructureDraft = {
    ...emptyDraft(),
    canonical: { family: "services", intent: "offer_trade_service" },
    serviceCategory: "freight",
    serviceSubcategories: [],
  };
  const product: StructureDraft = {
    ...emptyDraft(),
    canonical: { family: "products", intent: "offer_product" },
    product: "Gasoil 10 ppm (ULSD, EN 590)",
  };
  assert.ok(subjectFor(service), "a classified service has no subject");
  assert.equal(subjectFor(product), "Gasoil 10 ppm (ULSD, EN 590)");
});

// ---- Drafts that predate either decision -----------------------------------

test("a draft saved before either decision still opens", () => {
  // What a resumed draft from before this release actually looks like: no
  // canonical pair, no classification keys, no resolution. It must open on
  // something rather than throwing, and the product-shaped legacy path is the
  // only honest reading of it.
  const legacy = {
    intent: "offer",
    product: "Yellow maize",
    hsCode: "100590",
    quantity: 25000,
    unit: "MT",
  } as unknown as StructureDraft;

  assert.equal(needsHsCode(legacy), true, "a legacy product draft stopped being a product draft");
  assert.equal(subjectFor(legacy), "Yellow maize", "a legacy draft lost its subject");

  const page = openFirstStep(mount(StructureComposer as unknown as (p: unknown) => unknown, {}));
  assert.equal(
    mounted(page, ProductIntake).length + mounted(page, ClassifyStep).length,
    1,
    "a member with no entrance at all reached no classification journey",
  );
});

test("a draft missing the fields either decision added fails safely", () => {
  const partial = {
    canonical: { family: "distribution", intent: "seek_distribution_partner" },
    intent: "requirement",
    product: null,
    // Every Classification key and every resolution field absent, as an
    // older serialised draft would be.
  } as unknown as StructureDraft;

  assert.doesNotThrow(() => subjectFor(partial), "an incomplete draft threw on read");
  assert.equal(needsHsCode(partial), false, "an incomplete distribution draft asked for a code");
  assert.equal(subjectFor(partial), null, "an incomplete draft invented a subject");
});

let failed = 0;
for (const { name, fn } of tests) {
  try {
    fn();
    console.log(`  ok   ${name}`);
  } catch (error) {
    failed += 1;
    console.error(`  FAIL ${name}`);
    console.error(`       ${(error as Error).message}`);
  }
}
console.log(failed === 0 ? `ok   ${tests.length} family routing tests passed` : `FAILED ${failed}`);
process.exit(failed === 0 ? 0 : 1);
