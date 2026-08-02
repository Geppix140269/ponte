/**
 * A Deal Room activation or expiry instant, written so two people in two
 * countries read the same deadline.
 *
 * ## Why this exists
 *
 * P1-3, approved by the owner on 2 August 2026: every display of a Deal Room
 * activation or expiry moment carries the date, the time AND the timezone.
 *
 *   1 September 2026 at 14:32 CEST
 *
 * The rule has teeth because of what it forbids. A warning that says only
 * "three days remaining" is not acceptable: three days from when, ending at
 * what hour, in whose morning? A buyer in Hamburg and a seller in Singapore
 * reading "3 days" are reading two different deadlines, and the one who is
 * wrong finds out when the room goes read-only.
 *
 * ## Scope
 *
 * Deal Room activation and expiry ONLY. Listing validity is a date and needs no
 * time or zone (DECISION-12), and putting one on it would imply a precision the
 * validity model does not have.
 *
 * ## The timezone is the VIEWER's
 *
 * Not the room's, not the server's, not the counterparty's. Each party reads
 * the same instant in their own zone with the zone named, so neither has to do
 * arithmetic and neither can do it wrong.
 *
 * A server render does not know the viewer's zone. It renders UTC, LABELLED as
 * UTC, which is complete and honest rather than ambiguous; `RoomMoment` then
 * re-formats in the browser's own zone once it has one. A visitor with no
 * JavaScript keeps a fully qualified UTC instant, which is a worse experience
 * and not a wrong one.
 */

/** The one format. Changing it changes every deadline in the product. */
export interface RoomMomentParts {
  /** "1 September 2026" */
  date: string;
  /** "14:32" */
  time: string;
  /** "CEST", "GMT+8", "UTC" */
  zone: string;
  /** The whole thing: "1 September 2026 at 14:32 CEST" */
  full: string;
}

/**
 * Format an instant for a Deal Room deadline.
 *
 * `timeZone` is an IANA name. Omitted means UTC, which is what a server render
 * has before it knows anything about the reader.
 *
 * Never throws. An unparseable date or an unknown zone falls back rather than
 * taking down a room screen over a caption, and the fallback still says what it
 * does not know instead of inventing it.
 */
export function formatRoomMoment(at: Date | string | number, timeZone?: string): RoomMomentParts | null {
  const instant = at instanceof Date ? at : new Date(at);
  if (Number.isNaN(instant.getTime())) return null;

  const zone = timeZone ?? "UTC";
  try {
    // en-GB gives "1 September 2026" and a 24-hour clock, which is the
    // product's existing convention everywhere a date is written out.
    const date = new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: zone,
    }).format(instant);

    const time = new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: zone,
    }).format(instant);

    // `timeZoneName: "short"` is the only thing that produces "CEST" rather
    // than "Europe/Rome". Read out of the parts rather than by slicing a
    // formatted string, which breaks the moment a locale reorders anything.
    const named = new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: zone,
      timeZoneName: "short",
    }).formatToParts(instant);
    const abbreviation = named.find((part) => part.type === "timeZoneName")?.value ?? "UTC";

    return { date, time, zone: abbreviation, full: `${date} at ${time} ${abbreviation}` };
  } catch {
    // An unknown IANA zone. Fall back to UTC rather than to nothing, and say
    // UTC, so the reader is never shown a bare time with no zone on it.
    return timeZone === undefined ? null : formatRoomMoment(instant);
  }
}

/**
 * Whole days between now and an expiry, floored, never negative.
 *
 * Exported so a caller can say "3 days" AND the instant, never one without the
 * other. There is deliberately no function here that returns only the count in
 * a member-facing sentence: the count is context for the deadline, not a
 * substitute for it.
 */
export function wholeDaysUntil(expiry: Date | string | number, now: Date): number | null {
  const instant = expiry instanceof Date ? expiry : new Date(expiry);
  if (Number.isNaN(instant.getTime())) return null;
  const ms = instant.getTime() - now.getTime();
  if (ms <= 0) return 0;
  return Math.floor(ms / (24 * 60 * 60 * 1000));
}

/**
 * The sentence a countdown is allowed to be.
 *
 * Both halves, always, in one string: how long is left AND the moment it ends.
 * This is the function the 7, 3 and 1 day warnings (DECISION-02) must use when
 * they are built, so that the rule is satisfied by construction rather than by
 * whoever writes the notification remembering it.
 */
export function expiryLine(expiry: Date | string | number, now: Date, timeZone?: string): string | null {
  const moment = formatRoomMoment(expiry, timeZone);
  if (moment === null) return null;
  const days = wholeDaysUntil(expiry, now);
  if (days === null) return null;
  if (days === 0) {
    // Not "0 days remaining", which reads as expired when it is not.
    return `Ends today, ${moment.full}`;
  }
  return `${days === 1 ? "1 day" : `${days} days`} remaining, until ${moment.full}`;
}
