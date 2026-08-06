/**
 * `B09s` Screening: what Ponte checks before a listing goes public, and the
 * only words it is allowed to use about the result.
 *
 * ## The label is `Checked`
 *
 * Never `Approved`, `Vetted`, `Reviewed`, `Verified` or `Safe`. `DECISION-19`,
 * and it is not a style preference. Publication is automated (`ADR-0013`): no
 * person looks at an ordinary submission. Every one of those other words tells
 * a reader that somebody examined this and found it acceptable, and a member who
 * believes a counterparty was vetted takes a risk they would not otherwise take.
 * `Checked` says what happened: three automated tests ran and passed.
 *
 * `FORBIDDEN_VERDICT_WORDS` is exported so a test can hold the strings AND the
 * generated copy to it. The brief is explicit that the strings alone were not
 * enough: `lib/ai-vet.ts` was regenerating a claim the templates did not
 * contain, so a prompt is member-facing copy and is checked as such.
 *
 * ## The perimeter is stated, not implied
 *
 * `PERIMETER` names what Ponte checked and, in the same breath, what it did
 * not. It is a required part of the screening surface rather than an optional
 * footnote, because "3 of 3 checked" with nothing beside it reads as a clean
 * bill of health on the counterparty. It is not one. It is a statement about
 * this submission's own fields.
 */

export type CheckKey = "fields" | "sanctions" | "duplicate";

export type CheckVerdict = "waiting" | "running" | "checked" | "attention" | "refused" | "not_run";

export interface ScreeningCheck {
  key: CheckKey;
  label: string;
  verdict: CheckVerdict;
  /** What was actually found. Absent while the check has not run. */
  finding?: string;
}

export const CHECK_LABELS: Readonly<Record<CheckKey, string>> = {
  fields: "Fields complete and consistent",
  sanctions: "Sanctions and prohibited goods",
  duplicate: "Duplicate listing",
};

/** The order they run in, and the order they are shown in. */
export const CHECK_ORDER: readonly CheckKey[] = ["fields", "sanctions", "duplicate"];

/**
 * The status word for each verdict.
 *
 * One place. A surface that wrote its own would eventually write "Approved" on
 * a Tuesday, and no test that reads this table would notice.
 */
export const VERDICT_LABEL: Readonly<Record<CheckVerdict, string>> = {
  waiting: "Waiting",
  running: "Running",
  checked: "Checked",
  attention: "Your call",
  refused: "Refused",
  not_run: "Did not run",
};

/**
 * Words that must never appear as a verdict on a screened listing.
 *
 * Each one claims a human judgement Ponte did not make. Held by test against
 * `VERDICT_LABEL`, against the member-facing copy in this module, and against
 * the prompts in `lib/ai-vet.ts`, because a model asked to "confirm the listing
 * is approved" will write the word whatever the templates say.
 */
export const FORBIDDEN_VERDICT_WORDS: readonly string[] = [
  "approved",
  "vetted",
  "reviewed",
  "verified",
  "certified",
  "endorsed",
  "guaranteed",
];

/**
 * The perimeter statement. Required on every screening surface.
 *
 * Two sentences that must stay together: what ran, and what did not. Splitting
 * them so the second lands on another screen would leave the first standing
 * alone as a claim about safety.
 */
export const PERIMETER =
  "Ponte runs sanctions and prohibited-goods lists and tests the submission for completeness and internal consistency. It does not verify your counterparty, inspect your goods, or confirm that anything a document claims is true. A checked listing is a complete one, not a safe one.";

export const PERIMETER_HEADING = "What Ponte checked, and only that.";

/** The line the confirmation surface carries, for the same reason. */
export const CONFIRMATION_PERIMETER =
  "Ponte checked this submission against its sanctions and prohibited-goods lists and confirmed the fields are complete and internally consistent. That is what was checked. It is not a check of your counterparty, and it is not a guarantee about anyone who contacts you.";

/**
 * The honest statement about what publishing does and does not buy.
 *
 * "Ponte can make you findable, not wanted." It belongs on the R2 surface,
 * where the temptation to imply that a published listing will attract responses
 * is at its highest and where the disappointment of believing it is worst.
 */
/*
  No em dash, even though `check-encoding.mjs` only enforces that under `app/`
  and `components/`. This string is member-facing copy that renders inside a
  component; the fact that the constant happens to live in `lib/` is where it
  is declared, not where it is read.
*/
export const NO_RESPONSE_PROMISE =
  "Nothing about publishing guarantees a response. Ponte can make you findable, not wanted.";

/**
 * Does this set of checks permit publication?
 *
 * Every check `checked`. A single `attention` holds the record, because the
 * member has a decision to make; a `refused` ends it; a `not_run` also holds
 * it, because Ponte does not publish on an incomplete check and saying so is
 * the difference between a service failure and a silent pass.
 */
export function mayPublish(checks: readonly ScreeningCheck[]): boolean {
  if (checks.length !== CHECK_ORDER.length) return false;
  return checks.every((check) => check.verdict === "checked");
}

/** Have all three finished, whatever they found? */
export function screeningSettled(checks: readonly ScreeningCheck[]): boolean {
  return checks.every(
    (check) => check.verdict !== "waiting" && check.verdict !== "running",
  );
}

/** The count line: "3 of 3". Never a percentage, and never a grade. */
export function checkedCount(checks: readonly ScreeningCheck[]): string {
  const done = checks.filter((c) => c.verdict === "checked").length;
  return `${done} of ${checks.length}`;
}

/** Every check in its starting state, before anything has run. */
export function pendingChecks(): ScreeningCheck[] {
  return CHECK_ORDER.map((key) => ({ key, label: CHECK_LABELS[key], verdict: "waiting" }));
}
