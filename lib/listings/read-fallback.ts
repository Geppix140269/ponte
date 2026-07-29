/**
 * Reading a listing from a database that is one migration behind the code.
 *
 * The mirror of `write-fallback.ts`, and it exists for the same reason: a merge
 * to `main` applies no migration in this repository, so a window always exists
 * in which the code names a column the database does not have. On the write
 * side that window costs a submission. On the READ side it costs the whole
 * record, because PostgREST refuses a select naming an absent column outright:
 * nothing partial comes back, an error does.
 *
 * That is worse than it sounds on a public surface. The two readers below serve
 * anonymous visitors:
 *
 *   - `app/[locale]/marketplace/l/[ref]` gets `data === null` and calls
 *     `notFound()`, so a live, approved, correctly-classified listing 404s.
 *   - `lib/board/qualified-opportunity.ts` throws into its own catch and
 *     returns `{ state: "missing" }`, which 404s the Find detail page too.
 *
 * Both were introduced by a first attempt that dropped a FIXED GROUP of columns
 * - `service_terms` and `distribution_terms` - and retried. Against the current
 * production schema that retry still names `quantity_mode`, `quantity_min` and
 * `quantity_max`, none of which exists because `20260728c` is unapplied, so the
 * second attempt failed exactly as the first did. A fixed group can only ever
 * cover the columns somebody remembered to put in it.
 *
 * So the column is read out of the error and dropped, one at a time, until the
 * select is acceptable. Pure and injectable, so this is tested here rather than
 * only against a live database.
 *
 * This is a bridge, not a design. The fix is applying the migration.
 */

import { isMissingColumnError, missingColumnFrom } from "./classification";

/** The result shape a Supabase select returns. */
export type ReadResult<T> = { data: T | null; error: unknown };

/** One attempt at the read, given the column list to select. */
export type ReadAttempt<T> = (columns: string) => Promise<ReadResult<T>>;

/**
 * The columns a listing cannot be presented without.
 *
 * The retry drops whatever the database says it does not have. These are never
 * dropped to make a read succeed. A record rendered without its reference, its
 * family or its owner is not a degraded record, it is a misleading one: the
 * public page would show a listing it cannot identify, and the eligibility gate
 * reads `user_id` and `status` to decide whether it may be shown at all.
 *
 * If one of these is ever reported missing, that is a real fault in the
 * database rather than a pending migration, and the read fails visibly with it.
 */
export const ESSENTIAL_LISTING_READ_COLUMNS: readonly string[] = [
  "id",
  "user_id",
  "ref",
  "type",
  "product",
  "details",
  "status",
  "validity_type",
  "valid_until",
];

export type ReadWithFallbackOptions = {
  /** Columns that must never be dropped. Defaults to the list above. */
  essential?: readonly string[];
  /** Every column dropped, in order. For the log: each is a migration owed. */
  onDrop?: (column: string) => void;
};

export type ReadWithFallbackResult<T> = ReadResult<T> & {
  /** The columns the database turned out not to have. */
  dropped: string[];
};

/**
 * Select the columns, dropping only the ones the database actually lacks.
 *
 * Every other failure is returned as itself. A read is not retried into a
 * smaller select because of an RLS refusal or a network fault: silently
 * returning less than was asked for would hide a real error behind a lossy
 * result, and on these surfaces the "lossy result" is a member's published
 * record missing facts they did state.
 *
 * The loop is bounded by the column list itself: every iteration either drops
 * one column from a finite list or returns. A database that names a column not
 * in the list, or names none at all, ends the loop rather than spinning.
 */
export async function readWithMissingColumnFallback<T>(
  attempt: ReadAttempt<T>,
  columns: readonly string[],
  options: ReadWithFallbackOptions = {},
): Promise<ReadWithFallbackResult<T>> {
  const essential = new Set(options.essential ?? ESSENTIAL_LISTING_READ_COLUMNS);
  let remaining = columns.slice();
  const dropped: string[] = [];

  // One pass per droppable column, plus the first attempt.
  for (let guard = 0; guard <= columns.length; guard += 1) {
    const result = await attempt(remaining.join(", "));
    if (!result.error || !isMissingColumnError(result.error)) {
      return { ...result, dropped };
    }

    const column = missingColumnFrom(result.error);
    // A missing-column error the database will not name cannot be repaired by
    // dropping something at random. Report it rather than guess.
    if (!column) return { ...result, dropped };

    // An essential column, or one this select never asked for, is a real fault.
    // Retrying would either misrepresent the record or loop forever.
    if (essential.has(column) || remaining.indexOf(column) < 0) {
      return { ...result, dropped };
    }

    remaining = remaining.filter((c) => c !== column);
    dropped.push(column);
    options.onDrop?.(column);
  }

  // Unreachable while the list shrinks every pass; returned so the contract
  // holds rather than falling off the end.
  const final = await attempt(remaining.join(", "));
  return { ...final, dropped };
}
