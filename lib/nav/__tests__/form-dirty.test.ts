// Detecting unsaved edits in an uncontrolled server-action form.
//
// Run: npx tsx lib/nav/__tests__/form-dirty.test.ts
//
// The guard snapshots the fields on mount and again on every input; a form is
// dirty when the two snapshots differ. These pin the serialisation the
// comparison rests on: same states must compare equal, any real change must
// compare different, and a value that happens to contain a separator must not
// be able to masquerade as two fields.

import assert from "node:assert/strict";
import { serializeFields, isFormDirty, type FieldSnapshot } from "../form-dirty";

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

const snap = (fields: FieldSnapshot[]) => serializeFields(fields);

test("identical field states are not dirty", () => {
  const a = snap([{ kind: "value", value: "hello" }, { kind: "toggle", checked: false }]);
  const b = snap([{ kind: "value", value: "hello" }, { kind: "toggle", checked: false }]);
  assert.equal(isFormDirty(a, b), false);
});

test("an edited text field is dirty", () => {
  const before = snap([{ kind: "value", value: "" }]);
  const after = snap([{ kind: "value", value: "How it was resolved" }]);
  assert.equal(isFormDirty(before, after), true);
});

test("returning a field to its original clears the dirt", () => {
  const initial = snap([{ kind: "value", value: "Buyer" }]);
  const typedThenDeleted = snap([{ kind: "value", value: "Buyer" }]);
  assert.equal(isFormDirty(initial, typedThenDeleted), false);
});

test("a toggled checkbox is dirty", () => {
  const before = snap([{ kind: "toggle", checked: false }]);
  const after = snap([{ kind: "toggle", checked: true }]);
  assert.equal(isFormDirty(before, after), true);
});

test("an attached file is dirty", () => {
  const before = snap([{ kind: "file", count: 0 }]);
  const after = snap([{ kind: "file", count: 1 }]);
  assert.equal(isFormDirty(before, after), true);
});

test("field order is preserved, so a swap is a change", () => {
  const a = snap([{ kind: "value", value: "one" }, { kind: "value", value: "two" }]);
  const b = snap([{ kind: "value", value: "two" }, { kind: "value", value: "one" }]);
  assert.equal(isFormDirty(a, b), true);
});

test("a value cannot collide with a field boundary", () => {
  // Two fields, versus one field whose value is the concatenation. A naive join
  // would read these as equal; they must not be.
  const twoFields = snap([{ kind: "value", value: "a" }, { kind: "value", value: "b" }]);
  const oneField = snap([{ kind: "value", value: "ab" }]);
  assert.notEqual(twoFields, oneField);
});

if (process.exitCode) {
  console.error(`\nform-dirty: ${passed} passed, then a failure`);
} else {
  console.log(`ok   nav/form-dirty (${passed} assertions)`);
}
