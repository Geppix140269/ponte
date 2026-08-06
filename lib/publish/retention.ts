/**
 * How long an unpublished draft is kept, and what does and does not extend it.
 *
 * ## The part the brief says is most likely to be got wrong by accident
 *
 *   > Signed in: 90 days from last meaningful edit, warnings at 14 and 3 days.
 *   > **Opening a draft must not reset the clock.** Only a meaningful edit or
 *   > an explicit "Keep draft" does. That is the part most likely to be
 *   > implemented wrongly by accident.
 *
 * It is right that it is the likely accident. The natural implementation is to
 * stamp `savedAt` on every write, and every screen writes on mount: the step
 * stack changes, so the draft is persisted, so the clock resets. A member could
 * then open a draft once a month forever and it would never expire, which
 * sounds harmless until the member who was told "kept for 90 days" plans around
 * a date the product has quietly moved.
 *
 * So there are TWO timestamps here and they are not interchangeable.
 * `touchedAt` moves whenever anything is persisted, including navigation.
 * `meaningfulAt` moves only on a real change to the record or an explicit act
 * of keeping. The horizon is computed from `meaningfulAt` and nothing else, and
 * `openDraft` is the proof: it returns a clock with `meaningfulAt` unchanged.
 */

const DAY_MS = 86_400_000;

/** Signed out: this browser, seven days, and the copy says exactly that. */
export const ANONYMOUS_DAYS = 7;
/** Signed in: ninety days from the last MEANINGFUL edit. */
export const SIGNED_IN_DAYS = 90;
/** Warnings, in days remaining. Descending, because that is the order they fire. */
export const WARNING_DAYS: readonly number[] = [14, 3];

/**
 * Retention copy, verbatim from the brief. Not paraphrased and not shortened:
 * it is a promise about where a member's work lives and for how long, and a
 * shortened promise is a different promise.
 */
export const SAVED_ANONYMOUS =
  "Saved only in this browser for up to 7 days. Sign in to keep it longer and continue on another device.";
export const SAVED_SIGNED_IN = "Saved to your account. Kept for 90 days from your last edit.";

export function retentionSentence(signedIn: boolean): string {
  return signedIn ? SAVED_SIGNED_IN : SAVED_ANONYMOUS;
}

export interface RetentionClock {
  /** Epoch ms of the last persist of any kind, navigation included. */
  touchedAt: number;
  /** Epoch ms of the last MEANINGFUL edit. The only input to the horizon. */
  meaningfulAt: number;
}

export function startClock(now: number): RetentionClock {
  return { touchedAt: now, meaningfulAt: now };
}

/**
 * The draft was persisted, but nothing about the record changed.
 *
 * Moving between screens, restoring a stack, re-rendering. The horizon does not
 * move. This is the function the accident would have skipped.
 */
export function touch(clock: RetentionClock, now: number): RetentionClock {
  return { touchedAt: now, meaningfulAt: clock.meaningfulAt };
}

/**
 * Opening a draft.
 *
 * Named separately from `touch` even though it does the same thing, because the
 * brief names this case specifically and a function called `openDraft` that
 * visibly does not move `meaningfulAt` is harder to get wrong later than a
 * general-purpose `touch` whose call site has to be reasoned about.
 */
export function openDraft(clock: RetentionClock, now: number): RetentionClock {
  return touch(clock, now);
}

/**
 * A meaningful edit, or an explicit "Keep draft". The horizon moves.
 *
 * Both go through one function because they have the same effect and a member
 * pressing "Keep draft" is entitled to exactly what an edit would have given
 * them: another full period, from now.
 */
export function keep(_clock: RetentionClock, now: number): RetentionClock {
  return { touchedAt: now, meaningfulAt: now };
}

/** Epoch ms at which the draft stops being offered back. */
export function expiresAt(clock: RetentionClock, signedIn: boolean): number {
  const days = signedIn ? SIGNED_IN_DAYS : ANONYMOUS_DAYS;
  return clock.meaningfulAt + days * DAY_MS;
}

/** Whole days left, floored, never negative. */
export function daysRemaining(clock: RetentionClock, signedIn: boolean, now: number): number {
  return Math.max(0, Math.floor((expiresAt(clock, signedIn) - now) / DAY_MS));
}

export function expired(clock: RetentionClock, signedIn: boolean, now: number): boolean {
  return now >= expiresAt(clock, signedIn);
}

/**
 * The warning to show, or null.
 *
 * Fires at 14 and at 3 days remaining and at everything below them, so a member
 * who does not open the draft for a fortnight still sees a warning rather than
 * having missed the one day it was displayed.
 */
export function warningAt(clock: RetentionClock, signedIn: boolean, now: number): number | null {
  if (!signedIn) return null;
  const left = daysRemaining(clock, signedIn, now);
  /*
    Tightest threshold wins, so the thresholds are read ASCENDING.

    Read descending, a draft with two days left matched 14 first and was
    reported as the fourteen-day warning: the member is told they have a
    fortnight on the day before it expires. `WARNING_DAYS` is declared in firing
    order, which is descending, so the sort is here rather than in the constant.
  */
  for (const threshold of [...WARNING_DAYS].sort((a, b) => a - b)) {
    if (left <= threshold) return threshold;
  }
  return null;
}
