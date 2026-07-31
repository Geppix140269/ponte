/**
 * Whether a form still holds unsaved edits, reduced to a comparable string.
 *
 * The server-action pages (Deal Room commands, the admin decision console) are
 * plain uncontrolled `<form>`s with no client state to read, so "dirty" has to
 * be observed from the fields themselves: snapshot them on mount, snapshot them
 * again on every input, and compare. This module is the pure half of that --
 * the serialisation and the comparison -- kept free of the DOM so it is unit
 * tested standalone under tsx. `UnsavedFormGuard` supplies the DOM reading.
 */

export type FieldSnapshot =
  | { kind: "value"; value: string }
  | { kind: "toggle"; checked: boolean }
  | { kind: "file"; count: number };

/**
 * A stable, order-preserving, collision-free string for a set of field states.
 *
 * JSON, rather than a delimiter join, because a field value can contain any
 * character including whatever delimiter we might pick; a text field holding the
 * literal separator must not be able to read as two fields.
 */
export function serializeFields(fields: readonly FieldSnapshot[]): string {
  return JSON.stringify(
    fields.map((f) =>
      f.kind === "toggle" ? ["t", f.checked] : f.kind === "file" ? ["f", f.count] : ["v", f.value],
    ),
  );
}

/** True when the current field states differ from the snapshot taken on mount. */
export function isFormDirty(initial: string, current: string): boolean {
  return initial !== current;
}
