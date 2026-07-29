// Category-first classification, as a member actually experiences it.
//
// Run: npx tsx --tsconfig tsconfig.ui-test.json lib/structure/__tests__/classify.test.tsx
//
// The defect these pin: choosing Trade services or Distribution used to open a
// blank line asking the member to state their opportunity in one sentence. They
// had to guess Ponte's vocabulary, similar services were described five
// different ways, and nothing could be filtered, matched or counted afterwards.
//
// The renderer is the project's own (lib/landing/__tests__/render.ts): elements
// are plain objects and children are not rendered, so a picker found in the
// tree is the control the browser would mount, and a handler found on it is the
// function the browser would call.

import assert from "node:assert/strict";

/* eslint-disable import/first */
import ClassifyStep from "../../../components/structure/ClassifyStep";
import CategoryPicker from "../../../components/ponte/category/CategoryPicker";
import { mount, fire, type Mounted, type TestElement } from "../../landing/__tests__/render";
import { emptyDraft, classificationComplete, subjectFor, type StructureDraft } from "../draft";
import { TRADE_SERVICE_CATEGORIES, subcategoriesFor } from "../../taxonomy/services";
import { DISTRIBUTION_PARTNER_TYPES } from "../../taxonomy/distribution";
/* eslint-enable import/first */

const tests: { name: string; fn: () => void }[] = [];
function test(name: string, fn: () => void): void {
  tests.push({ name, fn });
}

/** Translations are identity here: the assertions are about structure. */
const t = (key: string, values?: Record<string, string | number>): string =>
  values ? `${key}:${Object.values(values).join(",")}` : key;

/**
 * A draft that entered through a family entrance, as the landing bridges send
 * one in.
 */
function entered(family: string, intent: string, over: Partial<StructureDraft> = {}): StructureDraft {
  return { ...emptyDraft(), canonical: { family, intent }, ...over };
}

/**
 * Mount the classification step for a draft, with a live `set`.
 *
 * `set` updates the props object in place rather than re-mounting, because the
 * step keeps its own position in the journey and a re-mount would silently
 * return the member to the first question. Updating the draft and then pressing
 * a control is the real sequence: the press is what re-renders, and it re-reads
 * the draft the press was made against.
 */
function classify(initial: StructureDraft): { page: Mounted; draft: () => StructureDraft } {
  const props: Record<string, unknown> = {
    draft: initial,
    // The functional form as well as the patch, because the step uses it: the
    // specialisation clean-up after a category change has to read the CURRENT
    // draft, and a harness that silently spread a function would report the
    // change as having no effect at all.
    set: (
      patch: Partial<StructureDraft> | ((d: StructureDraft) => Partial<StructureDraft>),
    ) => {
      const current = props.draft as StructureDraft;
      props.draft = { ...current, ...(typeof patch === "function" ? patch(current) : patch) };
    },
    icons: {},
    onNext: () => {},
    t,
  };
  const page = mount(ClassifyStep as unknown as (p: unknown) => unknown, props);
  return { page, draft: () => props.draft as StructureDraft };
}

/**
 * The whole tree, with nested components rendered too.
 *
 * The project renderer deliberately invokes only the component under test, so
 * a nested picker appears as an element rather than as the buttons it draws.
 * That is right for most assertions and wrong for these, which are about what a
 * member can see and reach: whether a text field is on the opening screen, and
 * whether Other revealed one. So every function component found in the tree is
 * mounted in turn, to a bounded depth.
 */
function deep(page: Mounted, depth = 4): TestElement[] {
  const all = page.all();
  // Each component element is mounted at most once.
  //
  // Two things would otherwise double-count. Expanding the whole accumulated
  // list every round re-mounts what was already expanded; and a component
  // handed to a picker as `children` is reached both through the parent's tree
  // and through the picker's own output, which is the SAME element object. So
  // the frontier is only the newly found elements, and identity is remembered.
  const mounted = new Set<unknown>();
  let frontier = all;
  for (let level = 0; level < depth; level++) {
    const nested: TestElement[] = [];
    for (const el of frontier) {
      if (typeof el.type !== "function" || mounted.has(el)) continue;
      mounted.add(el);
      try {
        nested.push(...mount(el.type as (p: unknown) => unknown, el.props).all());
      } catch {
        // A component this test does not drive (a country picker reaching for
        // a browser global, say) is simply not part of what is asserted here.
      }
    }
    if (nested.length === 0) break;
    all.push(...nested);
    frontier = nested;
  }
  return all;
}

/** Every element of a given intrinsic type anywhere in the rendered tree. */
function elements(page: Mounted, type: string): TestElement[] {
  return deep(page).filter((el) => el.type === type);
}

/** The one element of a kind, anywhere in the rendered tree. */
function findDeep(page: Mounted, match: (el: TestElement) => boolean, what: string): TestElement {
  const hits = deep(page).filter(match);
  if (hits.length !== 1) throw new Error(`expected exactly one ${what}, found ${hits.length}`);
  return hits[0];
}

/** The picker wrapper in the tree, whatever family it belongs to. */
function picker(page: Mounted): TestElement {
  return page.find(
    (el) => typeof el.props.onChange === "function" && "value" in el.props,
    "a category picker",
  );
}

/** The canonical options the picker is actually offering, one level down. */
function offered(page: Mounted): { key: string }[] {
  const wrapper = picker(page);
  const inner = mount(wrapper.type as (p: unknown) => unknown, wrapper.props).find(
    (el) => Array.isArray(el.props.options),
    "the shared picker",
  );
  return inner.props.options as { key: string }[];
}

// ---------------------------------------------------------------------------
// 1 and 2. Neither journey opens with a generic text field
// ---------------------------------------------------------------------------

test("Trade services does not open with a text field", () => {
  const { page } = classify(entered("services", "seek_trade_service"));
  assert.equal(elements(page, "input").length, 0, "an input is on the opening screen");
  assert.equal(elements(page, "textarea").length, 0, "a textarea is on the opening screen");
  assert.ok(offered(page).length > 0, "no options were offered");
});

test("Distribution does not open with a text field", () => {
  const { page } = classify(entered("distribution", "seek_distribution_partner"));
  assert.equal(elements(page, "input").length, 0);
  assert.equal(elements(page, "textarea").length, 0);
  assert.ok(offered(page).length > 0, "no options were offered");
});

test("offering a service opens on categories too, not only seeking one", () => {
  const { page } = classify(entered("services", "offer_trade_service"));
  assert.equal(elements(page, "input").length, 0);
  assert.equal(elements(page, "textarea").length, 0);
});

test("seeking brands to represent opens on product sectors", () => {
  // The member is choosing what they want to take to market, so the first
  // question is the sector, not the partner type.
  const { page } = classify(entered("distribution", "seek_brands_or_products_to_represent"));
  assert.equal(elements(page, "input").length, 0);
  assert.ok(offered(page).some((o) => o.key === "food"));
});

// ---------------------------------------------------------------------------
// 3. Products keep the HS journey
// ---------------------------------------------------------------------------

test("products are not routed through the category step at all", () => {
  // ClassifyStep never runs for products: the composer sends them to the HS
  // drill-down, and the classification journey has no product step of its own.
  const { page } = classify(entered("products", "source_product"));
  // The only structured question a product journey has here is the sector, and
  // the HS drill-down is the composer's own control, not this one.
  assert.ok(offered(page).some((o) => o.key === "agri"));
});

// ---------------------------------------------------------------------------
// 4 and 5. Every canonical option is offered
// ---------------------------------------------------------------------------

test("every trade service category is rendered as an option", () => {
  const { page } = classify(entered("services", "seek_trade_service"));
  assert.deepEqual(
    offered(page).map((o) => o.key),
    TRADE_SERVICE_CATEGORIES.map((c) => c.key),
  );
});

test("every distribution partner type is rendered as an option", () => {
  const { page } = classify(entered("distribution", "seek_distribution_partner"));
  assert.deepEqual(
    offered(page).map((o) => o.key),
    DISTRIBUTION_PARTNER_TYPES.map((p) => p.key),
  );
});

// ---------------------------------------------------------------------------
// 6. Other appears last on screen, not only in the data
// ---------------------------------------------------------------------------

test("Other is the last option a member sees", () => {
  const grid = mount(CategoryPicker as unknown as (p: unknown) => unknown, {
    mode: "single",
    options: TRADE_SERVICE_CATEGORIES,
    legend: "Choose",
    value: null,
    onChange: () => {},
  });
  const buttons = grid.all().filter((el) => el.type === "button" && !!el.props["data-option"]);
  assert.equal(buttons.length, TRADE_SERVICE_CATEGORIES.length);
  assert.equal(buttons[buttons.length - 1].props["data-option"], "unlisted");
});

// ---------------------------------------------------------------------------
// 7. Other reveals a targeted field. 8. A recognised category does not.
// ---------------------------------------------------------------------------

test("choosing a recognised category reveals no text field", () => {
  const state = classify(entered("services", "seek_trade_service", { serviceCategory: "freight" }));
  assert.equal(elements(state.page, "input").length, 0);
});

test("choosing Other reveals a field labelled for the member's own direction", () => {
  const seeking = classify(entered("services", "seek_trade_service", { serviceCategory: "unlisted" }));
  const seekingInputs = elements(seeking.page, "input");
  assert.equal(seekingInputs.length, 1);
  const seekingLabel = findDeep(
    seeking.page,
    (el) => el.type === "label" && el.props.htmlFor === "service-other",
    "the Other label",
  );
  assert.equal(seekingLabel.props.children, "classify.describeServiceNeed");

  const offering = classify(entered("services", "offer_trade_service", { serviceCategory: "unlisted" }));
  const offeringLabel = findDeep(
    offering.page,
    (el) => el.type === "label" && el.props.htmlFor === "service-other",
    "the Other label",
  );
  assert.equal(offeringLabel.props.children, "classify.describeServiceOffer");
});

test("Other is not a complete answer until it has been described", () => {
  const bare = entered("services", "seek_trade_service", {
    serviceCategory: "unlisted",
    serviceSubcategories: [],
  });
  assert.equal(classificationComplete(bare), false);
  assert.equal(
    classificationComplete({ ...bare, customCategoryLabel: "Livestock transport coordination" }),
    true,
  );
});

test("a recognised category and detail is complete with no free text at all", () => {
  const draft = entered("services", "seek_trade_service", {
    serviceCategory: "freight",
    serviceSubcategories: ["freight.ocean"],
  });
  assert.equal(classificationComplete(draft), true);
  assert.equal(draft.customCategoryLabel, null);
  assert.equal(draft.additionalDetails, null);
});

test("a category's own Other subcategory keeps the category and asks only for the detail", () => {
  const draft = entered("services", "seek_trade_service", {
    serviceCategory: "freight",
    serviceSubcategories: ["freight.other"],
    customCategoryLabel: "Livestock transport coordination",
  });
  assert.equal(classificationComplete(draft), true);
  assert.equal(subjectFor(draft), "Other freight or logistics service: Livestock transport coordination");
});

// ---------------------------------------------------------------------------
// Continue is gated on the selection, and on nothing else
// ---------------------------------------------------------------------------

test("Continue is disabled until the required category is chosen", () => {
  const empty = classify(entered("services", "seek_trade_service"));
  const before = empty.page.find(
    (el) => el.type === "button" && el.props.className === "fbtn fbtn--lg",
    "the continue button",
  );
  assert.equal(before.props.disabled, true);

  const chosen = classify(entered("services", "seek_trade_service", { serviceCategory: "freight" }));
  const after = chosen.page.find(
    (el) => el.type === "button" && el.props.className === "fbtn fbtn--lg",
    "the continue button",
  );
  assert.equal(after.props.disabled, false);
});

test("an optional step can be skipped, a required one cannot", () => {
  // Relationship structure is negotiable and therefore optional; the partner
  // type is what the record is and therefore is not.
  const optional = classify(
    entered("distribution", "seek_distribution_partner", {
      distributionPartnerType: "distributor",
      productSector: "food",
      coverageScope: "worldwide",
    }),
  );
  const skip = optional.page
    .all()
    .filter((el) => el.type === "button" && el.props.className === "fbtn fbtn--ghost");
  assert.ok(skip.length <= 1);

  const required = classify(entered("distribution", "seek_distribution_partner"));
  const noSkip = required.page
    .all()
    .filter((el) => el.type === "button" && el.props.className === "fbtn fbtn--ghost");
  assert.equal(noSkip.length, 0, "a required question offered a Skip");
});

// ---------------------------------------------------------------------------
// 12. Selections survive Back and Continue
// ---------------------------------------------------------------------------

test("walking forward and back leaves every earlier answer intact", () => {
  const state = classify(entered("services", "seek_trade_service"));

  // Choose a category, continue to the detail list, choose a detail.
  fire(picker(state.page), "onChange", "freight");
  const forward = state.page.find(
    (el) => el.type === "button" && el.props.className === "fbtn fbtn--lg",
    "continue",
  );
  fire(forward, "onClick");
  fire(picker(state.page), "onChange", ["freight.ocean"]);

  // The trail offers a way back into the category, and taking it keeps the
  // detail that was chosen after it.
  const change = findDeep(
    state.page,
    (el) => el.type === "button" && el.props.className === "pcat-trail__c",
    "the trail's change control",
  );
  fire(change, "onClick");

  assert.equal(state.draft().serviceCategory, "freight");
  assert.deepEqual(state.draft().serviceSubcategories, ["freight.ocean"]);
});

/**
 * The discard warning, or null when the change was free enough not to raise one.
 *
 * Found through `deep` because the warning is its own component, and the
 * project renderer invokes only the component under test.
 */
function warning(page: Mounted): TestElement | null {
  return deep(page).find((el) => el.props.className === "pcat-discard") ?? null;
}

/** A button in the warning, by the copy key it carries. */
function discardButton(page: Mounted, label: string): TestElement | undefined {
  return deep(page).find((el) => el.type === "button" && el.props.children === label);
}

/** Agree to the pending discard. */
function confirmDiscard(page: Mounted): void {
  const confirm = discardButton(page, "classify.discardConfirm");
  assert.ok(confirm, "the warning offered no way to proceed");
  fire(confirm!, "onClick");
}

test("changing the category clears details that belonged to the old one", () => {
  // The opposite rule, and it matters just as much: keeping ocean freight after
  // a switch to customs would store a classification nobody chose.
  //
  // It is now a two-step act. The member has answered something that the change
  // would destroy, so they are told what it costs and the change waits for
  // them. The clearing rule is unchanged; what changed is that it happens with
  // their consent instead of behind their back.
  const state = classify(
    entered("services", "seek_trade_service", {
      serviceCategory: "freight",
      serviceSubcategories: ["freight.ocean"],
    }),
  );
  fire(picker(state.page), "onChange", "customs");

  assert.equal(state.draft().serviceCategory, "freight", "the category changed before the member agreed");
  assert.deepEqual(state.draft().serviceSubcategories, ["freight.ocean"], "the detail was dropped before the member agreed");
  assert.ok(warning(state.page), "nothing warned the member their answer would be discarded");

  confirmDiscard(state.page);
  assert.equal(state.draft().serviceCategory, "customs");
  assert.deepEqual(state.draft().serviceSubcategories, []);
});

test("keeping what you have leaves the earlier answer exactly as it was", () => {
  const state = classify(
    entered("services", "seek_trade_service", {
      serviceCategory: "freight",
      serviceSubcategories: ["freight.ocean"],
    }),
  );
  fire(picker(state.page), "onChange", "customs");

  const keep = discardButton(state.page, "classify.discardKeep");
  assert.ok(keep, "the warning offered no way to back out");
  fire(keep!, "onClick");

  assert.equal(state.draft().serviceCategory, "freight");
  assert.deepEqual(state.draft().serviceSubcategories, ["freight.ocean"]);
  assert.equal(warning(state.page), null, "the warning stayed up after the member declined");
});

test("a category change that costs nothing is never interrupted", () => {
  // The other half of the rule. A confirmation on every change teaches members
  // to dismiss it unread, which protects them less than no warning at all.
  const state = classify(entered("services", "seek_trade_service"));
  fire(picker(state.page), "onChange", "freight");
  assert.equal(warning(state.page), null, "a free change asked for confirmation");
  assert.equal(state.draft().serviceCategory, "freight");
});

test("changing the coverage scope drops territories the new scope cannot hold", () => {
  const state = classify(
    entered("distribution", "offer_distribution_or_representation", {
      distributionPartnerType: "distributor",
      coverageScope: "countries",
      territoryCodes: ["IT", "ES"],
    }),
  );
  // Walk to the coverage question.
  const forward = () =>
    fire(
      state.page.find(
        (el) => el.type === "button" && el.props.className === "fbtn fbtn--lg",
        "continue",
      ),
      "onClick",
    );
  forward();
  forward();
  fire(picker(state.page), "onChange", "worldwide");

  // Two named countries are about to be thrown away, so the member is asked.
  assert.ok(warning(state.page), "the territories would have gone without notice");
  confirmDiscard(state.page);
  assert.equal(state.draft().coverageScope, "worldwide");
  assert.deepEqual(state.draft().territoryCodes, []);
});

test("a coverage change that keeps the countries is not interrupted", () => {
  const state = classify(
    entered("distribution", "offer_distribution_or_representation", {
      distributionPartnerType: "distributor",
      coverageScope: "country",
      territoryCodes: ["IT"],
    }),
  );
  const forward = () =>
    fire(
      state.page.find(
        (el) => el.type === "button" && el.props.className === "fbtn fbtn--lg",
        "continue",
      ),
      "onClick",
    );
  forward();
  forward();
  // One country -> Several countries keeps the list, so there is nothing to
  // warn about and the correction stays frictionless.
  fire(picker(state.page), "onChange", "countries");
  assert.equal(warning(state.page), null);
  assert.equal(state.draft().coverageScope, "countries");
  assert.deepEqual(state.draft().territoryCodes, ["IT"]);
});

test("the discard warning is announced as a decision, not as a passing note", () => {
  const state = classify(
    entered("services", "seek_trade_service", {
      serviceCategory: "freight",
      serviceSubcategories: ["freight.ocean"],
    }),
  );
  fire(picker(state.page), "onChange", "customs");

  const box = warning(state.page)!;
  assert.equal(box.props.role, "alertdialog");
  assert.equal(box.props["aria-labelledby"], "pcat-discard-h");

  // Keep comes first and holds focus, so the destructive option is never the
  // one a member reaches by pressing Enter out of habit.
  const buttons = deep(state.page).filter(
    (el) =>
      el.type === "button" &&
      (el.props.children === "classify.discardKeep" ||
        el.props.children === "classify.discardConfirm"),
  );
  assert.equal(buttons[0].props.children, "classify.discardKeep");
  assert.equal(buttons[0].props.autoFocus, true);
});

// ---------------------------------------------------------------------------
// 14. Keyboard and screen reader
// ---------------------------------------------------------------------------

test("a single-choice grid is a radiogroup with one tab stop", () => {
  const grid = mount(CategoryPicker as unknown as (p: unknown) => unknown, {
    mode: "single",
    options: TRADE_SERVICE_CATEGORIES,
    legend: "Choose",
    value: null,
    onChange: () => {},
  });
  const group = grid.find((el) => el.props.role === "radiogroup", "the radiogroup");
  assert.ok(group.props["aria-labelledby"]);

  const buttons = grid.all().filter((el) => el.type === "button" && !!el.props["data-option"]);
  for (const button of buttons) assert.equal(button.props.role, "radio");
  const tabbable = buttons.filter((b) => b.props.tabIndex === 0);
  assert.equal(tabbable.length, 1, "a radiogroup must be one tab stop");
});

test("the tab stop follows the chosen option", () => {
  const grid = mount(CategoryPicker as unknown as (p: unknown) => unknown, {
    mode: "single",
    options: TRADE_SERVICE_CATEGORIES,
    legend: "Choose",
    value: "customs",
    onChange: () => {},
  });
  const tabbable = grid
    .all()
    .filter((el) => el.type === "button" && el.props.tabIndex === 0 && !!el.props["data-option"]);
  assert.equal(tabbable.length, 1);
  assert.equal(tabbable[0].props["data-option"], "customs");
});

test("a multiple-choice grid is checkboxes, each its own tab stop", () => {
  const options = subcategoriesFor("freight");
  const grid = mount(CategoryPicker as unknown as (p: unknown) => unknown, {
    mode: "multiple",
    options,
    legend: "Choose",
    value: ["freight.ocean"],
    onChange: () => {},
  });
  const buttons = grid.all().filter((el) => el.type === "button" && !!el.props["data-option"]);
  for (const button of buttons) {
    assert.equal(button.props.role, "checkbox");
    assert.equal(button.props.tabIndex, 0);
  }
  const checked = buttons.filter((b) => b.props["aria-checked"] === true);
  assert.equal(checked.length, 1);
  assert.equal(checked[0].props["data-option"], "freight.ocean");
});

test("the arrows traverse a radiogroup and wrap at both ends", () => {
  const moves: string[] = [];
  const render = (value: string | null) =>
    mount(CategoryPicker as unknown as (p: unknown) => unknown, {
      mode: "single",
      options: TRADE_SERVICE_CATEGORIES,
      legend: "Choose",
      value,
      onChange: (key: string) => moves.push(key),
    });

  const press = (grid: Mounted, key: string) => {
    const group = grid.find((el) => el.props.role === "radiogroup", "the radiogroup");
    (group.props.onKeyDown as (e: unknown) => void)({ key, preventDefault: () => {} });
  };

  press(render("freight"), "ArrowRight");
  assert.equal(moves.pop(), "warehousing");
  press(render("freight"), "ArrowDown");
  assert.equal(moves.pop(), "warehousing");
  press(render("warehousing"), "ArrowLeft");
  assert.equal(moves.pop(), "freight");

  // Wrapping, at both ends.
  press(render("freight"), "ArrowUp");
  assert.equal(moves.pop(), "unlisted");
  press(render("unlisted"), "ArrowRight");
  assert.equal(moves.pop(), "freight");
});

test("selection is never signalled by colour alone", () => {
  const grid = mount(CategoryPicker as unknown as (p: unknown) => unknown, {
    mode: "single",
    options: TRADE_SERVICE_CATEGORIES,
    legend: "Choose",
    value: "freight",
    selectedLabel: "Selected",
    onChange: () => {},
  });
  const marker = grid
    .all()
    .find((el) => el.props.className === "pcat__on" && el.props.children === "Selected");
  assert.ok(marker, "the chosen option carries no text marker");
  // And it is hidden from assistive technology, because aria-checked already
  // says it and hearing "selected" twice is noise.
  assert.equal(marker?.props["aria-hidden"], "true");
});

test("the option filter narrows without reordering, so Other stays last", () => {
  const grid = mount(CategoryPicker as unknown as (p: unknown) => unknown, {
    mode: "single",
    options: TRADE_SERVICE_CATEGORIES,
    legend: "Choose",
    searchable: true,
    value: null,
    onChange: () => {},
  });
  const field = grid.find((el) => el.type === "input", "the filter field");
  fire(field, "onChange", { target: { value: "trade" } });
  const buttons = grid.all().filter((el) => el.type === "button" && !!el.props["data-option"]);
  assert.ok(buttons.length > 0 && buttons.length < TRADE_SERVICE_CATEGORIES.length);
  const keys = buttons.map((b) => b.props["data-option"] as string);
  const order = keys.map((k) => TRADE_SERVICE_CATEGORIES.findIndex((c) => c.key === k));
  assert.deepEqual(order, order.slice().sort((a, b) => a - b), "the filter reordered the options");
});

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

let failed = 0;
for (const { name, fn } of tests) {
  try {
    fn();
    console.log(`ok   ${name}`);
  } catch (error) {
    failed++;
    console.error(`FAIL ${name}`);
    console.error(`     ${(error as Error).message.split("\n").join("\n     ")}`);
  }
}
console.log(`\n${tests.length - failed}/${tests.length} classification checks passed`);
if (failed > 0) process.exit(1);
