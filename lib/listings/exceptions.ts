// The exception console's rules.
//
// `/admin/listings` was the publication queue: everything landed there, sorted
// into "Awaiting vetting" and "Decided", and a listing that needed a person
// looked exactly like a listing that merely existed. Reviewing everything is
// indistinguishable from reviewing nothing.
//
// Under automated publication the screen has a different job. It shows the
// cases the validator could not resolve, says why each one is there, and orders
// them so the most urgent is first. Ordinary published listings are still
// reachable, but they are NOT presented as waiting for anything, because they
// are not.
//
// The sorting, filtering and reason derivation live here rather than in the
// page so they can be unit-tested without a database or a renderer. The page
// reads rows and paints; this module decides what any of it means.

import type { SafetyFlag, SafetySeverity } from "./safety";
import { memberStatusLabel } from "./status";

/* ------------------------------------------------------------------ */
/* Why an item is on the console                                       */
/* ------------------------------------------------------------------ */

/**
 * The reason categories, most urgent first.
 *
 * `reported` outranks `flagged` because a human being has complained, which is
 * evidence of a kind no automated check produces. `unverified_submitter`
 * outranks `incomplete` because it is the one gap the member cannot close on
 * the listing form, so it needs a different conversation.
 */
export type ExceptionReason =
  | "reported"
  | "flagged"
  | "suspended"
  | "unverified_submitter"
  | "incomplete"
  | "awaiting_validation";

const REASON_RANK: Record<ExceptionReason, number> = {
  reported: 0,
  flagged: 1,
  suspended: 2,
  unverified_submitter: 3,
  incomplete: 4,
  awaiting_validation: 5,
};

/** The human sentence for each reason. Shown next to the machine-readable code. */
export const REASON_LABEL: Record<ExceptionReason, string> = {
  reported: "A member reported this listing.",
  flagged: "An automated safety check raised an exception.",
  suspended: "Publication was paused by an operator.",
  unverified_submitter: "The submitter has no current member-business verification.",
  incomplete: "Required information is missing.",
  awaiting_validation: "Submitted but never validated. Predates automated publication, or a validation run failed.",
};

/** What an operator can actually do about each reason. */
export const REASON_ACTION: Record<ExceptionReason, string> = {
  reported: "Read the report, then reinstate or suspend.",
  flagged: "Read the findings below. Clear the flag to publish, or reject.",
  suspended: "Reinstate if resolved, or reject.",
  unverified_submitter: "Nothing to decide here. The member resolves this at /verify.",
  incomplete: "Nothing to decide here. The member completes the listing.",
  awaiting_validation: "Re-run validation. It will publish, ask the member for more, or flag.",
};

/** The row shape the console reasons about. Deliberately minimal. */
export type ExceptionRow = {
  id: string;
  ref: string;
  status: string;
  type: string | null;
  product: string | null;
  created_at: string;
  flag_reason: string | null;
  flag_severity: string | null;
  safety_flags: SafetyFlag[] | null;
  completeness_score: number | null;
  user_id: string;
  /** Open reports against this listing, counted by the caller. */
  reportCount?: number;
  /** Whether the submitter currently holds a passing member-business check. */
  submitterVerified?: boolean;
};

/**
 * Why this row is on the console, or null if it is not an exception at all.
 *
 * A published listing returns null. That is the point: it is not waiting for
 * anybody and must not be rendered as though it were.
 */
export function exceptionReason(row: ExceptionRow): ExceptionReason | null {
  if ((row.reportCount ?? 0) > 0) return "reported";
  switch (row.status) {
    case "flagged": return "flagged";
    case "suspended": return "suspended";
    case "needs_information":
      // The distinction matters operationally: one of these is a conversation
      // about verification, the other is a form the member has to finish, and
      // an operator can act on neither. Separating them stops the console
      // reading as a to-do list of things nobody there can do.
      return row.submitterVerified === false ? "unverified_submitter" : "incomplete";
    case "submitted":
    case "validating":
      return "awaiting_validation";
    default:
      return null;
  }
}

export function isException(row: ExceptionRow): boolean {
  return exceptionReason(row) !== null;
}

/* ------------------------------------------------------------------ */
/* Severity                                                            */
/* ------------------------------------------------------------------ */

const SEVERITY_RANK: Record<SafetySeverity, number> = { high: 0, medium: 1, low: 2 };

/**
 * The severity of an item.
 *
 * A stored `flag_severity` wins, because that is what the validator decided at
 * the time and re-deriving it from today's rules would rewrite history. Falling
 * back to the flag list covers rows written before the column, and a reported
 * listing is high by definition: a person complained.
 */
export function rowSeverity(row: ExceptionRow): SafetySeverity | null {
  if ((row.reportCount ?? 0) > 0) return "high";
  if (row.flag_severity === "high" || row.flag_severity === "medium" || row.flag_severity === "low") {
    return row.flag_severity;
  }
  const flags = row.safety_flags ?? [];
  for (const level of ["high", "medium", "low"] as const) {
    if (flags.some((f) => f.severity === level)) return level;
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* Ordering                                                            */
/* ------------------------------------------------------------------ */

/**
 * Most urgent first: reason, then severity, then oldest.
 *
 * Oldest rather than newest within a bucket, deliberately. A queue sorted
 * newest-first starves its own tail, and the listing that has been waiting
 * longest is the one whose member is most likely to have given up.
 */
export function compareExceptions(a: ExceptionRow, b: ExceptionRow): number {
  const ra = exceptionReason(a);
  const rb = exceptionReason(b);
  if (ra !== rb) {
    if (ra === null) return 1;
    if (rb === null) return -1;
    const d = REASON_RANK[ra] - REASON_RANK[rb];
    if (d !== 0) return d;
  }
  const sa = rowSeverity(a);
  const sb = rowSeverity(b);
  if (sa !== sb) {
    if (sa === null) return 1;
    if (sb === null) return -1;
    const d = SEVERITY_RANK[sa] - SEVERITY_RANK[sb];
    if (d !== 0) return d;
  }
  return Date.parse(a.created_at) - Date.parse(b.created_at);
}

/* ------------------------------------------------------------------ */
/* Filtering                                                           */
/* ------------------------------------------------------------------ */

export type ExceptionFilters = {
  status?: string;
  reason?: string;
  severity?: string;
  type?: string;
  /** ISO date. Rows created on or after it. */
  from?: string;
  /** ISO date. Rows created on or before it, inclusive of that whole day. */
  to?: string;
  /** Free text over member email, business name and listing reference. */
  q?: string;
};

/** What the caller resolved about the member, for the text search. */
export type RowIdentity = { email?: string | null; company?: string | null };

const norm = (v: unknown): string => String(v ?? "").trim().toLowerCase();

/**
 * Apply the filters. An absent or empty filter matches everything, so a bare
 * console URL is the unfiltered view rather than an empty one.
 */
export function applyFilters(
  rows: readonly ExceptionRow[],
  filters: ExceptionFilters,
  identityFor: (row: ExceptionRow) => RowIdentity = () => ({}),
): ExceptionRow[] {
  const q = norm(filters.q);
  const from = filters.from ? Date.parse(filters.from) : null;
  // `to` is inclusive of the whole day, so filtering "to 28 July" includes
  // listings created at 23:59 on 28 July rather than silently excluding them.
  const to = filters.to ? Date.parse(filters.to) + 86_399_999 : null;

  return rows.filter((row) => {
    if (filters.status && row.status !== filters.status) return false;
    if (filters.reason && exceptionReason(row) !== filters.reason) return false;
    if (filters.severity && rowSeverity(row) !== filters.severity) return false;
    if (filters.type && row.type !== filters.type) return false;

    const created = Date.parse(row.created_at);
    if (from !== null && Number.isFinite(created) && created < from) return false;
    if (to !== null && Number.isFinite(created) && created > to) return false;

    if (q) {
      const id = identityFor(row);
      const haystack = [row.ref, row.product, id.email, id.company].map(norm).join(" ");
      if (!haystack.includes(q)) return false;
    }
    return true;
  });
}

/* ------------------------------------------------------------------ */
/* Presentation                                                        */
/* ------------------------------------------------------------------ */

/** Counts for the console header, so an operator sees the shape at a glance. */
export function summarise(rows: readonly ExceptionRow[]): {
  total: number;
  byReason: Record<ExceptionReason, number>;
  highSeverity: number;
} {
  const byReason = {
    reported: 0, flagged: 0, suspended: 0,
    unverified_submitter: 0, incomplete: 0, awaiting_validation: 0,
  } as Record<ExceptionReason, number>;
  let highSeverity = 0;
  let total = 0;

  for (const row of rows) {
    const reason = exceptionReason(row);
    if (!reason) continue;
    total++;
    byReason[reason]++;
    if (rowSeverity(row) === "high") highSeverity++;
  }
  return { total, byReason, highSeverity };
}

/**
 * The machine-readable reason code for an item.
 *
 * The console shows this next to the human sentence. An operator who has to
 * describe a case in a ticket, a query or a conversation needs the stable token,
 * not a paraphrase of it, and the flag code is more specific than the category
 * whenever there is one.
 */
export function reasonCode(row: ExceptionRow): string {
  if ((row.reportCount ?? 0) > 0) return "reported";
  if (row.flag_reason) return row.flag_reason;
  return exceptionReason(row) ?? "none";
}

/** The status as an operator should read it, reusing the member vocabulary. */
export function statusLabel(status: string): string {
  return memberStatusLabel(status);
}
