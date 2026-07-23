// Tests for Block B: only verification of a member's own business may grant the
// member badge, level or trust score.
//
// Run: npx tsx lib/verification/__tests__/purpose.test.ts
//
// The pure rule (lib/verification/purpose.ts) is unit-tested directly. The
// enforcement is then pinned by structural assertions that the pipeline, the
// admin queue and the re-screen all gate their profile writes on it, so the
// gate cannot be quietly removed from one path.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  normalizePurpose,
  grantsMemberStatus,
  VERIFICATION_PURPOSES,
} from "../purpose";

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

// --- normalizePurpose --------------------------------------------------------

test("member_business is the only value that survives as itself", () => {
  assert.equal(normalizePurpose("member_business"), "member_business");
});

test("everything else normalises to counterparty_check", () => {
  for (const v of [
    "counterparty_check",
    "",
    null,
    undefined,
    "MEMBER_BUSINESS", // wrong case does NOT count
    " member_business ",
    "business",
    "member",
    0,
    {},
    ["member_business"],
  ]) {
    assert.equal(
      normalizePurpose(v),
      "counterparty_check",
      `${JSON.stringify(v)} must normalise to counterparty_check`,
    );
  }
});

// --- grantsMemberStatus: the one gate ---------------------------------------

test("only member_business grants member status", () => {
  assert.equal(grantsMemberStatus("member_business"), true);
});

test("counterparty_check never grants member status", () => {
  assert.equal(grantsMemberStatus("counterparty_check"), false);
});

test("a null/unknown (legacy) purpose grants nothing", () => {
  for (const v of [null, undefined, "", "foo", "MEMBER_BUSINESS"]) {
    assert.equal(grantsMemberStatus(v), false, `${JSON.stringify(v)} must not grant`);
  }
});

test("there are exactly two purposes", () => {
  assert.deepEqual([...VERIFICATION_PURPOSES].sort(), [
    "counterparty_check",
    "member_business",
  ]);
});

// --- Structural: every badge write is gated on the purpose ------------------

function src(path: string): string {
  return readFileSync(path, "utf8");
}

test("the pipeline grant is gated on the purpose and binds the badge", () => {
  const s = src("lib/verification/pipeline.ts");
  assert.ok(
    s.includes("grantsMemberStatus(opts.purpose)"),
    "pipeline must gate the profile grant on grantsMemberStatus(opts.purpose)",
  );
  assert.ok(
    s.includes("business_verification_id: id"),
    "pipeline must bind the badge to the verification record",
  );
});

test("admin approval grants a member badge only for a member_business case", () => {
  const s = src("app/[locale]/admin/verifications/actions.ts");
  assert.ok(
    s.includes("grantsMemberStatus(row.purpose)"),
    "admin grantLevel must gate on grantsMemberStatus(row.purpose)",
  );
});

test("re-screen suspends the badge only for member_business cases", () => {
  const s = src("lib/verification/rescreen.ts");
  assert.ok(
    s.includes("grantsMemberStatus(row.purpose)"),
    "rescreen must gate the badge pull on grantsMemberStatus(row.purpose)",
  );
});

test("the API route records the declared purpose, normalised", () => {
  const s = src("app/api/verification/route.ts");
  assert.ok(
    s.includes("normalizePurpose(body.purpose)"),
    "the verification route must normalise and pass the request purpose",
  );
});

if (process.exitCode) console.error(`\n${passed} passed, some failed.`);
else console.log(`ok   ${passed} verification-purpose tests passed`);
