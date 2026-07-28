// The exception console's rules: what is an exception, why, how urgent, and
// what an operator can filter it by.
//
// Run: npx tsx lib/listings/__tests__/exceptions.test.ts
//
// The load-bearing test in this file is the one asserting a published listing
// is NOT an exception. That is the whole difference between this screen and the
// queue it replaces: the old screen listed everything and sorted it into
// "Awaiting vetting" and "Decided", so a listing that needed a person looked
// exactly like a listing that merely existed. If `exceptionReason` ever starts
// returning a reason for `approved`, the queue is back.

import assert from "node:assert/strict";
import {
  exceptionReason,
  isException,
  rowSeverity,
  compareExceptions,
  applyFilters,
  summarise,
  reasonCode,
  REASON_LABEL,
  REASON_ACTION,
  type ExceptionRow,
} from "../exceptions";
import { EXCEPTION_STATUSES } from "../status";
import {
  resolutionRoute,
  isVerificationIssue,
  VERIFICATION_ISSUE_CODES,
  type ValidationIssue,
} from "../eligibility";

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

function row(over: Partial<ExceptionRow> = {}): ExceptionRow {
  return {
    id: "l-1",
    ref: "PT-0001",
    status: "approved",
    type: "offer",
    product: "Refined sugar ICUMSA 45",
    created_at: "2026-07-20T10:00:00Z",
    flag_reason: null,
    flag_severity: null,
    safety_flags: null,
    completeness_score: 70,
    user_id: "u-1",
    ...over,
  };
}

/* -------------------------------------------------------------- */
/* What is, and is not, an exception                               */
/* -------------------------------------------------------------- */

test("a published listing is not an exception and is never shown as waiting", () => {
  assert.equal(exceptionReason(row({ status: "approved" })), null);
  assert.equal(isException(row({ status: "approved" })), false);
});

test("draft, withdrawn, expired and rejected are not exceptions either", () => {
  for (const status of ["draft", "withdrawn", "expired", "rejected", "closed", "archived"]) {
    assert.equal(exceptionReason(row({ status })), null, `${status} should not be an exception`);
  }
});

test("flagged, suspended and needs_information are exceptions", () => {
  assert.equal(exceptionReason(row({ status: "flagged" })), "flagged");
  assert.equal(exceptionReason(row({ status: "suspended" })), "suspended");
  assert.equal(
    exceptionReason(row({ status: "needs_information", submitterVerified: true })),
    "incomplete",
  );
});

test("a submitted or validating listing is an exception: nothing resolved it", () => {
  // Under automated publication `submitted` is measured in milliseconds. A row
  // still sitting in it is a legacy record or a failed validation run, and
  // either way it needs someone to notice.
  assert.equal(exceptionReason(row({ status: "submitted" })), "awaiting_validation");
  assert.equal(exceptionReason(row({ status: "validating" })), "awaiting_validation");
});

test("a report outranks the status it arrives on", () => {
  // A person complained. That is evidence no automated check produces, so it
  // takes precedence even over a published listing.
  assert.equal(exceptionReason(row({ status: "approved", reportCount: 1 })), "reported");
  assert.equal(exceptionReason(row({ status: "flagged", reportCount: 2 })), "reported");
});

test("an unverified submitter is separated from an incomplete listing", () => {
  // Operationally different: one is a conversation about verification, the
  // other is a form the member has to finish, and an operator can act on
  // neither. Collapsing them makes the console read as a to-do list of things
  // nobody there can do.
  assert.equal(
    exceptionReason(row({ status: "needs_information", submitterVerified: false })),
    "unverified_submitter",
  );
  assert.equal(
    exceptionReason(row({ status: "needs_information", submitterVerified: true })),
    "incomplete",
  );
});

test("every exception status has a reason, and the two lists agree", () => {
  for (const status of EXCEPTION_STATUSES) {
    assert.notEqual(
      exceptionReason(row({ status })),
      null,
      `${status} is an EXCEPTION_STATUS but produces no reason`,
    );
  }
});

/* -------------------------------------------------------------- */
/* Every item carries a readable and a machine-readable reason      */
/* -------------------------------------------------------------- */

test("every reason has both a human sentence and an operator action", () => {
  const reasons = [
    "reported", "flagged", "suspended",
    "unverified_submitter", "incomplete", "awaiting_validation",
  ] as const;
  for (const r of reasons) {
    assert.ok(REASON_LABEL[r]?.length > 10, `${r} has no human sentence`);
    assert.ok(REASON_ACTION[r]?.length > 10, `${r} has no operator action`);
  }
});

test("no reason label says only that validation failed", () => {
  // "Failed validation" tells an operator nothing they can act on, which is the
  // exact fault this console exists to correct.
  for (const [reason, label] of Object.entries(REASON_LABEL)) {
    assert.ok(
      !/^(failed|invalid|error)\b/i.test(label.trim()),
      `${reason} label is a bare failure: ${label}`,
    );
  }
});

test("the machine-readable code prefers the specific flag over the category", () => {
  // An operator describing a case in a ticket needs the stable token, and the
  // flag code is more specific than the bucket it falls into.
  assert.equal(reasonCode(row({ status: "flagged", flag_reason: "restricted_term" })), "restricted_term");
  assert.equal(reasonCode(row({ status: "flagged", flag_reason: null })), "flagged");
  assert.equal(reasonCode(row({ status: "approved", reportCount: 3 })), "reported");
});

/* -------------------------------------------------------------- */
/* Severity                                                        */
/* -------------------------------------------------------------- */

test("a stored severity wins over one re-derived from today's rules", () => {
  // Re-deriving would rewrite history: the validator decided this at the time.
  const r = row({
    status: "flagged",
    flag_severity: "low",
    safety_flags: [{ code: "x", severity: "high", reason: "r" } as never],
  });
  assert.equal(rowSeverity(r), "low");
});

test("severity falls back to the flag list for rows written before the column", () => {
  const r = row({
    status: "flagged",
    flag_severity: null,
    safety_flags: [
      { code: "a", severity: "low", reason: "r" },
      { code: "b", severity: "high", reason: "r" },
    ] as never,
  });
  assert.equal(rowSeverity(r), "high");
});

test("a reported listing is high severity by definition", () => {
  assert.equal(rowSeverity(row({ status: "approved", reportCount: 1 })), "high");
});

test("an ordinary incomplete listing has no severity rather than a low one", () => {
  // Giving everything a severity makes the column meaningless.
  assert.equal(rowSeverity(row({ status: "needs_information" })), null);
});

/* -------------------------------------------------------------- */
/* Ordering                                                        */
/* -------------------------------------------------------------- */

test("reports sort above flags, and flags above incomplete listings", () => {
  const reported = row({ id: "a", status: "approved", reportCount: 1 });
  const flagged = row({ id: "b", status: "flagged" });
  const incomplete = row({ id: "c", status: "needs_information", submitterVerified: true });
  const sorted = [incomplete, flagged, reported].sort(compareExceptions).map((r) => r.id);
  assert.deepEqual(sorted, ["a", "b", "c"]);
});

test("within a reason, higher severity comes first", () => {
  const low = row({ id: "low", status: "flagged", flag_severity: "low" });
  const high = row({ id: "high", status: "flagged", flag_severity: "high" });
  assert.deepEqual([low, high].sort(compareExceptions).map((r) => r.id), ["high", "low"]);
});

test("within a severity, the oldest is first so the tail is never starved", () => {
  const older = row({ id: "older", status: "flagged", flag_severity: "high", created_at: "2026-07-01T00:00:00Z" });
  const newer = row({ id: "newer", status: "flagged", flag_severity: "high", created_at: "2026-07-27T00:00:00Z" });
  assert.deepEqual([newer, older].sort(compareExceptions).map((r) => r.id), ["older", "newer"]);
});

test("a non-exception sorts last rather than throwing", () => {
  const published = row({ id: "pub", status: "approved" });
  const flagged = row({ id: "flag", status: "flagged" });
  assert.deepEqual([published, flagged].sort(compareExceptions).map((r) => r.id), ["flag", "pub"]);
});

/* -------------------------------------------------------------- */
/* Filters                                                         */
/* -------------------------------------------------------------- */

const FLEET: ExceptionRow[] = [
  row({ id: "1", ref: "PT-1001", status: "flagged", flag_severity: "high", type: "offer", created_at: "2026-07-10T00:00:00Z" }),
  row({ id: "2", ref: "PT-1002", status: "needs_information", submitterVerified: false, type: "service", created_at: "2026-07-20T00:00:00Z" }),
  row({ id: "3", ref: "PT-1003", status: "suspended", flag_severity: "medium", type: "requirement", created_at: "2026-07-25T00:00:00Z" }),
  row({ id: "4", ref: "PT-1004", status: "approved", type: "offer", created_at: "2026-07-26T00:00:00Z" }),
];

test("an empty filter set is the unfiltered view, not an empty one", () => {
  assert.equal(applyFilters(FLEET, {}).length, FLEET.length);
  assert.equal(applyFilters(FLEET, { status: "", reason: "", q: "" }).length, FLEET.length);
});

test("filters by status, reason, severity and listing type", () => {
  assert.deepEqual(applyFilters(FLEET, { status: "flagged" }).map((r) => r.id), ["1"]);
  assert.deepEqual(applyFilters(FLEET, { reason: "unverified_submitter" }).map((r) => r.id), ["2"]);
  assert.deepEqual(applyFilters(FLEET, { severity: "medium" }).map((r) => r.id), ["3"]);
  assert.deepEqual(applyFilters(FLEET, { type: "service" }).map((r) => r.id), ["2"]);
});

test("the date filter includes the whole of its closing day", () => {
  // Filtering "to 25 July" must include a listing created at 23:59 on 25 July.
  const late = row({ id: "late", status: "flagged", created_at: "2026-07-25T23:59:00Z" });
  const kept = applyFilters([late], { to: "2026-07-25" });
  assert.equal(kept.length, 1, "a listing created late on the closing day was dropped");
});

test("the date filter excludes what falls outside the range", () => {
  assert.deepEqual(applyFilters(FLEET, { from: "2026-07-24" }).map((r) => r.id), ["3", "4"]);
});

test("free text searches the member and business, not only the reference", () => {
  const identity = (r: ExceptionRow) =>
    r.id === "2"
      ? { email: "maria@sucrestrade.example", company: "Sucres Trade SARL" }
      : {};
  assert.deepEqual(applyFilters(FLEET, { q: "sucres" }, identity).map((r) => r.id), ["2"]);
  assert.deepEqual(applyFilters(FLEET, { q: "maria@" }, identity).map((r) => r.id), ["2"]);
  assert.deepEqual(applyFilters(FLEET, { q: "PT-1003" }).map((r) => r.id), ["3"]);
});

test("filters combine rather than replacing each other", () => {
  assert.equal(applyFilters(FLEET, { status: "flagged", severity: "medium" }).length, 0);
  assert.equal(applyFilters(FLEET, { status: "flagged", severity: "high" }).length, 1);
});

/* -------------------------------------------------------------- */
/* Summary                                                         */
/* -------------------------------------------------------------- */

test("the header counts exceptions only, so published work is not in the total", () => {
  const s = summarise(FLEET);
  assert.equal(s.total, 3, "a published listing was counted as an exception");
  assert.equal(s.byReason.flagged, 1);
  assert.equal(s.byReason.unverified_submitter, 1);
  assert.equal(s.byReason.suspended, 1);
  assert.equal(s.highSeverity, 1);
});

/* -------------------------------------------------------------- */
/* The verification route, which this console has to agree with     */
/* -------------------------------------------------------------- */

const issue = (code: string): ValidationIssue => ({ code, message: `${code} message` });

test("a verification-only blocker routes to verification, not the listing form", () => {
  assert.equal(resolutionRoute([issue("business_verification_required")]), "verification");
  assert.equal(
    resolutionRoute([issue("business_verification_required"), issue("sanctions_unresolved")]),
    "verification",
  );
});

test("a mixed blocker set leads with the listing but still names verification", () => {
  assert.equal(
    resolutionRoute([issue("business_verification_required"), issue("product_missing")]),
    "both",
  );
});

test("an ordinary incomplete listing routes to the listing form", () => {
  assert.equal(resolutionRoute([issue("product_missing")]), "listing");
  assert.equal(resolutionRoute([]), "listing");
});

test("every verification issue code is recognised as one", () => {
  for (const code of VERIFICATION_ISSUE_CODES) {
    assert.equal(isVerificationIssue(issue(code)), true, `${code} not recognised`);
  }
  assert.equal(isVerificationIssue(issue("quantity_missing")), false);
});

console.log(`listings/exceptions: ${passed} passed`);
