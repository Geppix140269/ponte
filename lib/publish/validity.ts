/**
 * How long a listing stays findable, and the exact date it stops.
 *
 * ## Why the date is computed here and not printed by the surface
 *
 * The brief requires "Validity 30, 60 or 90 days with 60 the default, and the
 * exact expiry date shown". A member choosing "90 DAYS" and reading "expires in
 * 90 days" has learned nothing they did not already know. They need the date,
 * because that is what they will diary and what a counterparty will see.
 *
 * "now" is a parameter on every function here. Not for tidiness: a date derived
 * from an ambient clock cannot be tested, and an off-by-one in a horizon a
 * member is relying on is exactly the sort of defect that only ever appears in
 * production, once, on the day it matters.
 *
 * ## The pair the database will accept
 *
 * `listings_validity_coherent` admits only two shapes: `dated` WITH a
 * `valid_until`, or `standing` WITH `valid_until` null. `validityColumns`
 * returns one of those two and cannot return anything else, so a surface cannot
 * assemble an incoherent pair by forgetting a field.
 */

/** The three offered horizons. 60 is the default, and is first for that reason. */
export const VALIDITY_DAYS: readonly number[] = [60, 30, 90];

export const DEFAULT_VALIDITY_DAYS = 60;

const DAY_MS = 86_400_000;

/**
 * The exact calendar day this listing stops appearing in results.
 *
 * Whole days from the instant of publication, in UTC. UTC because the stored
 * `valid_until` is a date column and a member in Ho Chi Minh City and a reader
 * in Lagos must see the record expire on the same day, not on whichever day
 * their own clock happened to be on when the page rendered.
 */
export function expiryDate(days: number, now: Date): Date {
  return new Date(now.getTime() + days * DAY_MS);
}

/** The `date` a `valid_until` column takes: `YYYY-MM-DD`, never a timestamp. */
export function expiryIsoDate(days: number, now: Date): string {
  return expiryDate(days, now).toISOString().slice(0, 10);
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/**
 * The date as a member reads it: "1 October 2026".
 *
 * Written out rather than localised through `Intl`, because the reference's
 * copy is a sentence with the date inside it and a locale-shifted numeric date
 * ("10/1/2026") is ambiguous between two continents in the one place where
 * ambiguity costs a member a live listing.
 */
export function expiryLongDate(days: number, now: Date): string {
  const date = expiryDate(days, now);
  return `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

/**
 * The sentence the surface shows under the pills.
 *
 * The date, and what happens after it. "Expires on 1 October 2026" alone leaves
 * a member guessing whether the record is deleted; it is not, and saying so is
 * the difference between a horizon and a threat.
 */
export function expirySentence(days: number, now: Date): string {
  return `This listing expires on ${expiryLongDate(days, now)}. After that it stops appearing in results, and you can republish it.`;
}

export type ValidityChoice = number | "standing";

export function isValidityChoice(value: unknown): value is ValidityChoice {
  if (value === "standing") return true;
  return typeof value === "number" && VALIDITY_DAYS.includes(value);
}

/** The coherent `(validity_type, valid_until)` pair. Never anything else. */
export function validityColumns(
  choice: ValidityChoice,
  now: Date,
): { validity_type: "dated" | "standing"; valid_until: string | null } {
  if (choice === "standing") return { validity_type: "standing", valid_until: null };
  return { validity_type: "dated", valid_until: expiryIsoDate(choice, now) };
}
