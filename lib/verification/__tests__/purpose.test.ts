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
  checkAttestation,
  attestationAccepted,
  requiresAttestation,
  MEMBER_BUSINESS_ATTESTATION,
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

// --- Attestation gate (Block B acceptance correction) -----------------------

// 1. member-business with attestation true is accepted.
test("member-business with attestation true is accepted", () => {
  assert.deepEqual(checkAttestation("member_business", true), { ok: true });
});

// 2. member-business with attestation missing is rejected.
test("member-business with attestation missing is rejected", () => {
  assert.equal(checkAttestation("member_business", undefined).ok, false);
});

// 3. member-business with attestation false is rejected.
test("member-business with attestation false is rejected", () => {
  assert.equal(checkAttestation("member_business", false).ok, false);
});

test("only a strict boolean true is an attestation; look-alikes are rejected", () => {
  for (const v of ["true", 1, "yes", {}, [true], null, undefined, 0, false]) {
    assert.equal(
      attestationAccepted(v),
      false,
      `${JSON.stringify(v)} must not count as an attestation`,
    );
    assert.equal(
      checkAttestation("member_business", v).ok,
      false,
      `member-business must reject attestation ${JSON.stringify(v)}`,
    );
  }
  assert.equal(attestationAccepted(true), true);
});

// 4. malformed / unknown purpose is treated as counterparty and is never
//    badge-eligible, and needs no attestation.
test("a malformed purpose is a counterparty check, never badge-eligible", () => {
  for (const p of ["business", "MEMBER_BUSINESS", "", null, undefined, 42, {}]) {
    assert.equal(normalizePurpose(p), "counterparty_check");
    assert.equal(grantsMemberStatus(p), false, "must not be badge-eligible");
    assert.equal(requiresAttestation(p), false);
    assert.equal(checkAttestation(p, undefined).ok, true, "no attestation needed");
  }
});

// 5. counterparty request is accepted without an attestation and never
//    badge-eligible.
test("a counterparty check needs no attestation and grants nothing", () => {
  assert.deepEqual(checkAttestation("counterparty_check", undefined), { ok: true });
  assert.deepEqual(checkAttestation("counterparty_check", false), { ok: true });
  assert.equal(grantsMemberStatus("counterparty_check"), false);
  assert.equal(requiresAttestation("counterparty_check"), false);
});

test("the attestation has a stable version and the exact displayed text", () => {
  assert.equal(typeof MEMBER_BUSINESS_ATTESTATION.version, "string");
  assert.ok(MEMBER_BUSINESS_ATTESTATION.version.length > 0);
  assert.equal(
    MEMBER_BUSINESS_ATTESTATION.text,
    "This is the business I represent on Ponte.",
  );
});

// --- Structural: the server enforces and records the attestation ------------

test("the route refuses a request that fails the attestation gate", () => {
  const s = src("app/api/verification/route.ts");
  assert.ok(
    s.includes("checkAttestation(purpose, body.attestation)"),
    "route must run the attestation gate on the request",
  );
  assert.ok(
    /if \(!attestation\.ok\)[\s\S]*status: 400/.test(s),
    "route must return 400 when the attestation gate fails",
  );
});

test("the pipeline refuses to open a member-business case without the attestation", () => {
  const s = src("lib/verification/pipeline.ts");
  assert.ok(
    s.includes('purpose === "member_business" && !attestationAccepted(req.attested)'),
    "runLevel2 must guard on the attestation before creating a row",
  );
});

// 6. a resumed selection cannot change the stored purpose or attestation.
test("resume derives purpose from the row, and the attestation is written once", () => {
  const s = src("lib/verification/pipeline.ts");
  assert.ok(
    s.includes("purpose: normalizePurpose(row.purpose)"),
    "resume must take the purpose from the stored row, not from input",
  );
  // attested_at is written by the insert and never by an update, so a resume
  // (or any later write) cannot change the recorded attestation. Count the
  // object-key form so a mention of the column in a comment does not register.
  const writes = (s.match(/attested_at:/g) || []).length;
  assert.equal(writes, 1, `attested_at must be written exactly once (insert), found ${writes}`);
  assert.ok(
    s.includes("attestation_version:"),
    "the pipeline must record which attestation version was accepted",
  );
});

// 7. admin approval of a counterparty case cannot grant member status
//    (covered above by the grantsMemberStatus(row.purpose) gate in the admin
//    queue); asserted again here as an attestation-suite invariant.
test("admin approval still cannot badge a counterparty case", () => {
  const s = src("app/[locale]/admin/verifications/actions.ts");
  assert.ok(s.includes("grantsMemberStatus(row.purpose)"));
});

if (process.exitCode) console.error(`\n${passed} passed, some failed.`);
else console.log(`ok   ${passed} verification-purpose tests passed`);
