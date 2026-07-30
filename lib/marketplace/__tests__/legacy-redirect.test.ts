// The quarantine contract for the retired listing composer (LB-013).
//
// Run: npx tsx lib/marketplace/__tests__/legacy-redirect.test.ts
//
// `/marketplace/new` no longer renders the legacy `ListingForm`; it redirects
// through `legacyNewListingTarget`. These pin the exact rules an old email or an
// old bookmark depends on, so a regression that reopened the retired editor —
// the production failure this change exists to remove — fails here first.

import assert from "node:assert/strict";
import { legacyNewListingTarget } from "../legacy-redirect";

let passed = 0;
function test(name: string, fn: () => void): void {
  try {
    fn();
    passed++;
  } catch (err) {
    console.error(`FAIL  ${name}`);
    console.error(`      ${(err as Error).message}`);
    process.exitCode = 1;
  }
}

const UUID = "6f9619ff-8b86-d011-b42d-00cf4fc964ff";

test("the email parameter (id) resumes the exact record in the composer", () => {
  // This is the whole defect: the email sent `id=`, the retired page read
  // `edit`. Both now reach the same current composer.
  assert.equal(legacyNewListingTarget({ id: UUID }), `/structure?edit=${UUID}`);
});

test("the board and composer parameter (edit) resumes the same record", () => {
  assert.equal(legacyNewListingTarget({ edit: UUID }), `/structure?edit=${UUID}`);
});

test("edit wins when both are present and valid", () => {
  const other = "00000000-0000-4000-8000-000000000000";
  assert.equal(legacyNewListingTarget({ id: other, edit: UUID }), `/structure?edit=${UUID}`);
});

test("no identifier opens the Structure entrance fresh", () => {
  assert.equal(legacyNewListingTarget({}), "/structure");
});

test("a malformed identifier is discarded, never forwarded into a query", () => {
  for (const bad of ["not-a-uuid", "123", "6f9619ff8b86d011b42d00cf4fc964ff", `${UUID} OR 1=1`, "../admin"]) {
    assert.equal(legacyNewListingTarget({ id: bad }), "/structure", `forwarded a bad id: ${bad}`);
    assert.equal(legacyNewListingTarget({ edit: bad }), "/structure", `forwarded a bad edit: ${bad}`);
  }
});

test("a repeated parameter is treated as absent rather than guessed", () => {
  assert.equal(legacyNewListingTarget({ id: [UUID, UUID] }), "/structure");
});

test("an empty or whitespace value opens the entrance fresh", () => {
  assert.equal(legacyNewListingTarget({ edit: "" }), "/structure");
  assert.equal(legacyNewListingTarget({ edit: "   " }), "/structure");
});

test("the destination never reaches the retired editor", () => {
  for (const params of [{ id: UUID }, { edit: UUID }, {}, { id: "bad" }]) {
    assert.ok(!legacyNewListingTarget(params).includes("/marketplace/new"),
      `a request resolved back to the retired editor: ${JSON.stringify(params)}`);
  }
});

console.log(`marketplace/legacy-redirect: ${passed} passed`);
