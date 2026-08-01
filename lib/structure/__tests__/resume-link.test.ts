// Resuming a record from an email link.
//
// Run: npx tsx lib/structure/__tests__/resume-link.test.ts
//
// ## The defect this pins
//
// On 1 August 2026 the owner followed "Complete your listing" from an email
// that named PT-0112 and the one detail it still needed. The button led to
// `/structure?edit=<uuid>`, and the composer said "Nothing started yet".
//
// Two faults, and the second is the one that made it invisible:
//
//   1. `loadDraft` named its columns explicitly and retried EXACTLY ONCE,
//      dropping only the two family-terms columns. Any other column absent
//      from the deployed schema failed both reads.
//
//   2. A failed read returned null and the page opened a fresh composer. A
//      resume that failed was indistinguishable from a member who had never
//      started anything, so nothing anywhere reported it.
//
// These assertions are on the SOURCE rather than on a live database, for the
// same reason the route-manifest and action-gate tests are: the property is
// structural, and a test that needs production to run is a test that does not
// run.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

let passed = 0;
function test(name: string, fn: () => void): void {
  try {
    fn();
    passed++;
  } catch (err) {
    console.error(`FAIL  ${name}\n      ${(err as Error).message}`);
    process.exitCode = 1;
  }
}

const PAGE = readFileSync("app/[locale]/structure/page.tsx", "utf8");
const NOTICE = readFileSync("components/structure/ResumeNotice.tsx", "utf8");
const TEMPLATES = readFileSync("lib/email/templates.ts", "utf8");

// ---------------------------------------------------------------------------
// The two ends of the link agree
// ---------------------------------------------------------------------------

test("the email and the composer use the same parameter", () => {
  // They did agree, which is why the mismatch theory was wrong and the read
  // was the real fault. Pinned so a rename of one end fails here rather than
  // in somebody's inbox.
  assert.match(TEMPLATES, /\/structure\?edit=/, "the email no longer links to ?edit=");
  assert.match(PAGE, /searchParams\?\.edit/, "the composer no longer reads ?edit=");
});

// ---------------------------------------------------------------------------
// The read degrades, and only for the reason that earns it
// ---------------------------------------------------------------------------

test("the column read is a ladder, not a single retry", () => {
  const ladder = PAGE.slice(PAGE.indexOf("const LADDER"), PAGE.indexOf("const read ="));
  const rungs = ladder.split("\n").filter((line) => line.includes("join(\", \")") || line.trim() === "CORE,");
  assert.ok(
    rungs.length >= 4,
    `the read degrades in ${rungs.length} steps; a single retry is what let one missing column empty the composer`,
  );
});

test("the last rung is a core that has existed since the table did", () => {
  const core = PAGE.slice(PAGE.indexOf("const CORE ="), PAGE.indexOf("const QUANTITY ="));
  for (const column of ["id", "status", "product", "payment_terms", "validity_type"]) {
    assert.ok(core.includes(column), `the core rung does not select ${column}`);
  }
  // The family-terms columns must NOT be in the core, or the last rung fails
  // on exactly the schema it exists to survive.
  for (const late of ["service_terms", "distribution_terms", "market_family"]) {
    assert.ok(!core.includes(late), `${late} is in the core rung, so the last resort can still fail`);
  }
});

test("only a missing column earns the next rung", () => {
  // Any other failure is a real failure. Retrying it down the ladder would
  // turn one broken read into five and still end in silence.
  assert.match(
    PAGE,
    /if \(!isMissingColumnError\(result\.error\)\) break;/,
    "the ladder retries on errors that are not a missing column",
  );
});

// ---------------------------------------------------------------------------
// A failure is reported, and reported carefully
// ---------------------------------------------------------------------------

test("a failed resume is surfaced rather than opening a blank composer", () => {
  assert.match(PAGE, /resumeFailure/, "the page no longer tracks why a resume failed");
  assert.match(PAGE, /<ResumeNotice/, "a failed resume is not shown to the member");
});

test("the three failures are distinguished, because they need different answers", () => {
  for (const failure of ["signed_out", "not_found", "unreadable"]) {
    assert.ok(PAGE.includes(`"${failure}"`), `${failure} is not a distinct outcome`);
    assert.ok(NOTICE.includes(failure), `${failure} has no message`);
  }
});

test("not_found never confirms whether the record exists", () => {
  // The row is absent OR it belongs to somebody else, and those are one answer
  // on purpose: distinguishing them tells a stranger whether a guessed id is
  // real. The copy has to be capable of meaning both.
  const message = NOTICE.slice(NOTICE.indexOf("not_found:"), NOTICE.indexOf("unreadable:"));
  for (const word of ["does not exist", "no such", "was deleted", "never existed"]) {
    assert.ok(!message.toLowerCase().includes(word), `not_found claims "${word}", which it cannot know`);
  }
  assert.ok(
    message.includes("different account") || message.includes("out of date"),
    "not_found does not offer the two honest explanations",
  );
});

test("an unreadable record does not blame the member", () => {
  const message = NOTICE.slice(NOTICE.indexOf("unreadable:"));
  assert.ok(
    message.includes("fault on our side") || message.includes("not a problem with your listing"),
    "a fault on our side is not owned as one",
  );
  assert.ok(
    message.includes("Nothing has been lost"),
    "the member is not told their work survived, which is the thing they are afraid of",
  );
});

test("the notice does not block the composer", () => {
  // It is a notice, not a wall: the composer renders after it, unconditionally.
  const after = PAGE.slice(PAGE.indexOf("<ResumeNotice"));
  assert.match(after, /<StructureComposer/, "the composer no longer renders when a resume fails");
});

console.log(`ok   structure resume link: ${passed} assertions passed`);
