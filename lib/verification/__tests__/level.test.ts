// The verification level model: can an invalid value ever pass the gate?
//
// Run: npx tsx lib/verification/__tests__/level.test.ts
//
// Every test in the first section exists because a real defect passed through
// this comparison. The original code was `Number(level ?? 0) < 2`, and
// `Number("company_verified")` is `NaN`, so `NaN < 2` was `false` and the floor
// never fired for ANY value production actually stored. The interim repair
// required a finite number, which closed that hole but rejected the real
// values. Both were symptoms of comparing a semantic value numerically.
//
// So the load-bearing assertions here are the negative ones: the table of
// things that must NOT pass is longer than the list of things that may.

import assert from "node:assert/strict";
import {
  VERIFICATION_LEVELS,
  isVerificationLevel,
  levelRank,
  meetsMemberBusinessFloor,
  MEMBER_BUSINESS_MIN_LEVEL,
  LEVEL_ON_COMPANY_VERIFIED,
  LEVEL_ON_SUSPENSION,
  higherLevel,
  levelForRequestedTier,
  nextLevel,
} from "../level";
import { checkPublicationGate, isPubliclyEligibleVerification } from "../../listings/publication-gate";

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

/* ---------------------------------------------------------------- */
/* Nothing invalid may pass                                          */
/* ---------------------------------------------------------------- */

/** Everything that must fail the floor. Each entry is a real failure mode. */
const MUST_FAIL: [string, unknown][] = [
  ["null", null],
  ["undefined", undefined],
  ["empty string", ""],
  ["whitespace", "   "],
  ["wrong case", "COMPANY_VERIFIED"],
  ["retired email_verified", "email_verified"],
  ["retired phone_verified", "phone_verified"],
  ["retired fully_verified", "fully_verified"],
  ["unknown string", "totally_bogus"],
  ["legacy integer 0", 0],
  ["legacy integer 1", 1],
  ["legacy integer 2", 2],
  ["legacy integer 3", 3],
  ['legacy numeric string "0"', "0"],
  ['legacy numeric string "1"', "1"],
  ['legacy numeric string "2"', "2"],
  ["NaN", NaN],
  ["Infinity", Infinity],
  ["true", true],
  ["object", {}],
  ["array", []],
  ["level below the floor", "unverified"],
  ["level below the floor", "identity_verified"],
];

test("no invalid, legacy or below-floor value meets the member-business floor", () => {
  for (const [label, value] of MUST_FAIL) {
    assert.equal(
      meetsMemberBusinessFloor(value),
      false,
      `${label} must NOT meet the floor`,
    );
  }
});

test("company_verified is the ONLY value that meets the floor", () => {
  assert.equal(meetsMemberBusinessFloor("company_verified"), true);
  const passing = VERIFICATION_LEVELS.filter((l) => meetsMemberBusinessFloor(l));
  assert.deepEqual(passing, ["company_verified"]);
});

test("unknown and null rank -1, BELOW unverified rather than equal to it", () => {
  // The distinction is the whole design. `unverified` is a claim; an
  // unrecognised value is the absence of one, and no default may promote it.
  assert.equal(levelRank("unverified"), 0);
  for (const [label, value] of MUST_FAIL) {
    if (value === "unverified" || value === "identity_verified") continue;
    assert.equal(levelRank(value), -1, `${label} must rank -1`);
  }
});

test("the three canonical levels rank 0, 1, 2 in order", () => {
  assert.deepEqual(
    VERIFICATION_LEVELS.map(levelRank),
    [0, 1, 2],
  );
  assert.equal(levelRank("unverified"), 0);
  assert.equal(levelRank("identity_verified"), 1);
  assert.equal(levelRank("company_verified"), 2);
});

test("email and phone verification are not levels", () => {
  // They are independent account attributes and belong in their own columns.
  assert.equal(isVerificationLevel("email_verified"), false);
  assert.equal(isVerificationLevel("phone_verified"), false);
  assert.equal((VERIFICATION_LEVELS as readonly string[]).length, 3);
});

/* ---------------------------------------------------------------- */
/* The gate itself, with everything else satisfied                   */
/* ---------------------------------------------------------------- */

const PASSING_VERIFICATION = {
  purpose: "member_business",
  status: "verified",
  sanctions_hits: { clean: true, strongCount: 0 },
};

/** A listing that satisfies every gate condition EXCEPT possibly the level. */
function completeListing() {
  return {
    submitter_role: "seller",
    desk_version: { qualification: "Checked.", limitations: "Not advice." },
    validity_type: "standing" as const,
    valid_until: null,
    product: "Refined sugar ICUMSA 45",
    type: "offer",
    details: "A complete listing.",
    hs_code: "170199",
    origin: "Brazil",
    destination: "Italy",
    quantity: 2500,
    unit: "MT",
    incoterm: "FOB",
    frequency: "Monthly",
    payment_terms: "30% deposit, balance against documents",
  };
}

test("the gate refuses every invalid level, with the level as the stated reason", () => {
  for (const [label, value] of MUST_FAIL) {
    const result = checkPublicationGate(completeListing() as never, {
      verificationLevel: value as never,
      business_verification_id: "v-1",
      verification: PASSING_VERIFICATION,
    });
    assert.equal(result.ok, false, `${label} must not pass the gate`);
    if (!result.ok) {
      assert.ok(
        result.failures.includes("verification_not_current"),
        `${label} must fail specifically on the level, got: ${result.failures.join(", ")}`,
      );
    }
  }
});

test("the gate passes when the level is company_verified and all else holds", () => {
  const result = checkPublicationGate(completeListing() as never, {
    verificationLevel: "company_verified",
    business_verification_id: "v-1",
    verification: PASSING_VERIFICATION,
  });
  assert.equal(result.ok, true, `expected pass, got ${JSON.stringify(result)}`);
});

test("public eligibility refuses every invalid level too", () => {
  for (const [label, value] of MUST_FAIL) {
    assert.equal(
      isPubliclyEligibleVerification({
        verificationLevel: value as never,
        business_verification_id: "v-1",
        verification: PASSING_VERIFICATION,
      }),
      false,
      `${label} must not be publicly eligible`,
    );
  }
  assert.equal(
    isPubliclyEligibleVerification({
      verificationLevel: "company_verified",
      business_verification_id: "v-1",
      verification: PASSING_VERIFICATION,
    }),
    true,
  );
});

/* ---------------------------------------------------------------- */
/* Writers                                                           */
/* ---------------------------------------------------------------- */

test("the pipeline grants exactly the floor, and the constant tracks it", () => {
  assert.equal(LEVEL_ON_COMPANY_VERIFIED, "company_verified");
  assert.equal(LEVEL_ON_COMPANY_VERIFIED, MEMBER_BUSINESS_MIN_LEVEL);
  assert.equal(meetsMemberBusinessFloor(LEVEL_ON_COMPANY_VERIFIED), true);
});

test("a re-screen suspension lands below the floor, not at zero", () => {
  // The intent is "drop below the floor", not "erase what was established".
  assert.equal(LEVEL_ON_SUSPENSION, "identity_verified");
  assert.equal(meetsMemberBusinessFloor(LEVEL_ON_SUSPENSION), false);
  assert.ok(levelRank(LEVEL_ON_SUSPENSION) > levelRank("unverified"));
});

test("the requested DEPTH tier maps onto a level, and never past the top", () => {
  assert.equal(levelForRequestedTier(1), "identity_verified");
  assert.equal(levelForRequestedTier(2), "company_verified");
  assert.equal(levelForRequestedTier(3), "company_verified");
  assert.equal(levelForRequestedTier(99), "company_verified");
  assert.equal(levelForRequestedTier(0), "unverified");
  assert.equal(levelForRequestedTier(null), "unverified");
  assert.equal(levelForRequestedTier("nonsense"), "unverified");
});

test("an approval never lowers a level, and an unknown current never wins", () => {
  assert.equal(higherLevel("company_verified", "identity_verified"), "company_verified");
  assert.equal(higherLevel("identity_verified", "company_verified"), "company_verified");
  assert.equal(higherLevel("bogus", "identity_verified"), "identity_verified");
  assert.equal(higherLevel(null, null), "unverified");
  assert.equal(higherLevel(2, "unverified"), "unverified");
});

test("nextLevel steps up and clamps at the top", () => {
  assert.equal(nextLevel("unverified"), "identity_verified");
  assert.equal(nextLevel("identity_verified"), "company_verified");
  assert.equal(nextLevel("company_verified"), "company_verified");
  assert.equal(nextLevel("bogus"), "unverified");
  assert.equal(nextLevel(null), "unverified");
});

/* ---------------------------------------------------------------- */
/* The coercion must not come back                                   */
/* ---------------------------------------------------------------- */

test("no numeric coercion of a verification level survives anywhere", () => {
  // The defect was not one bad line; it was one bad idea repeated in twelve
  // places. This asserts the idea is gone, not just the lines.
  const { execSync } = require("node:child_process") as typeof import("node:child_process");
  const out = execSync(
    'git grep -n -E "Number\\([^)]*verification_?[Ll]evel|meetsMemberLevel" -- ' +
      '"app" "lib" "components" "scripts" || true',
    { encoding: "utf8" },
  ).trim();
  assert.equal(
    out,
    "",
    `numeric coercion of a verification level reappeared:\n${out}`,
  );
});

console.log(`verification/level: ${passed} passed`);
