/**
 * Writing a listing to a database that is one migration behind the code.
 *
 * A merge to `main` applies no migration in this repository: the historical
 * chain aborts on its first file, so every schema change is run by hand with
 * owner approval (see `docs/codex/DATABASE-STATE.md`). A window therefore always
 * exists in which the code sends a column the database does not have, and a
 * member submitting a correct record must not lose it to that window.
 *
 * The submit route used to bridge that window by dropping two NAMED GROUPS of
 * columns: the family commercial terms, then the wider classification set. That
 * only ever worked for a column somebody had remembered to put in a group.
 *
 * On 29 July 2026 it failed completely. `20260728c_automated_listing_publication`
 * is written and unapplied, so production has no `quantity_mode`,
 * `quantity_min`, `quantity_max`, `quantity_extracted`, `quantity_confirmed_at`,
 * `declaration_accepted_at` or `declaration_version`; the route sends all of
 * them on every write, for every family. PostgREST refused the insert and named
 * one of them, neither group contained it, and both retries re-sent a row the
 * database had already refused. Every Start a Deal submission and every saved
 * draft ended on the composer's error screen.
 *
 * So the column is read out of the error and dropped, one at a time, until the
 * row is acceptable. Pure and injectable, so the behaviour is tested here rather
 * than only through an HTTP route against a live database.
 *
 * This is a bridge, not a design. The fix is applying the migration.
 */

import { isMissingColumnError, missingColumnFrom } from "./classification";

/** The result shape both Supabase insert and update calls return. */
export type WriteResult<T> = { data: T | null; error: unknown };

export type WriteAttempt<T> = (row: Record<string, unknown>) => Promise<WriteResult<T>>;

/**
 * The values a listing is not a listing without.
 *
 * The retry drops whatever the database says it does not have. These are never
 * dropped to make a write succeed: a row stored without its owner, its type or
 * its text is not a repaired submission, it is a corrupt one. If one of these is
 * ever reported missing, the write fails and says so.
 */
export const ESSENTIAL_LISTING_COLUMNS: readonly string[] = [
  "user_id",
  "type",
  "product",
  "details",
  "status",
];

export type WriteWithFallbackOptions = {
  /**
   * Tried in order when the database reports a missing column WITHOUT naming
   * one that can be dropped. The route passes the family-terms group and then
   * the whole classification set, which is what it did before this existed.
   */
  fallbackGroups?: readonly (readonly string[])[];
  /** Every column dropped, in the order they were dropped. For the log. */
  onDrop?: (column: string) => void;
};

const without = (
  row: Record<string, unknown>,
  columns: readonly string[],
): Record<string, unknown> => {
  const copy = { ...row };
  for (const column of columns) delete copy[column];
  return copy;
};

/**
 * Write the row, dropping only what the database actually cannot take.
 *
 * Terminates: every drop shrinks the row, and the loop is bounded by the number
 * of keys in it. Never drops an essential column, and never drops anything for
 * an error that is not a missing column, so a constraint violation, a duplicate
 * key or an RLS refusal is returned as itself rather than hidden behind a
 * retry that stores less than the member wrote.
 */
export async function writeWithMissingColumnFallback<T>(
  attempt: WriteAttempt<T>,
  row: Record<string, unknown>,
  options: WriteWithFallbackOptions = {},
): Promise<WriteResult<T>> {
  const essential = new Set(ESSENTIAL_LISTING_COLUMNS);
  let current = row;
  let last: WriteResult<T> = { data: null, error: null };

  for (let i = 0; i <= Object.keys(row).length; i += 1) {
    last = await attempt(current);
    if (!last.error || !isMissingColumnError(last.error)) return last;

    const column = missingColumnFrom(last.error);
    if (!column || essential.has(column) || !(column in current)) break;

    options.onDrop?.(column);
    current = without(current, [column]);
  }

  // The database said a column was missing without naming one that can be
  // dropped. Fall through the named groups, which is the only case a fixed list
  // was ever the right answer to. The last failure is returned as it stands
  // rather than re-sending a row the database has already refused.
  for (const group of options.fallbackGroups ?? []) {
    last = await attempt(without(current, group));
    if (!last.error || !isMissingColumnError(last.error)) return last;
  }

  return last;
}
